import { NextRequest, NextResponse } from "next/server";
import { getDockerClient } from "@/lib/docker";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const docker = getDockerClient();
const IMAGE = "itzg/minecraft-server:latest";

enum versionType {
  VANILLA = "VANILLA",
  FORGE = "FORGE",
  FABRIC = "FABRIC",
  NEOFORGE = "NEOFORGE",
  SPIGOT = "SPIGOT",
  PAPER = "PAPER",
  CURSEFORGE = "AUTO_CURSEFORGE",
}

export interface Payload {
  metadata: { serverName: string; description?: string };
  versioning: { type: versionType; version?: string; build?: string | null };
  CF_API_KEY?: string; // for AUTO_CURSEFORGE
  CF_PAGE_URL?: string; // for AUTO_CURSEFORGE
  runtime: {
    eula: boolean;
    memory: { init: string; max: string };
    java?: { useAikarFlags?: boolean; jvmOpts?: string; jvmXXOpts?: string };
    timezone?: string;
  };
  network?: { serverPort?: number };
}

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "mc-server";
}

async function ensureImage(image: string) {
  try {
    await docker.getImage(image).inspect();
  } catch {
    await new Promise<void>((resolve, reject) => {
      docker.pull(image, (err: any, stream: any) => {
        if (err) return reject(err);
        docker.modem.followProgress(stream, (err2) => (err2 ? reject(err2) : resolve()));
      });
    });
  }
}

export async function POST(req: NextRequest) {
    const session  = await auth.api.getSession({
    headers : await headers(),
});
if(!session) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
}
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { cf_api: true }, // only select cf_api field since we only need that
  });
  
  const cfApiKey = user?.cf_api ?? ""; // get current user's curseforge api

  try {
    const body = (await req.json()) as Payload;

    // payload mapping
    const envObj: Record<string, string> = {
      EULA: body.runtime.eula ? "TRUE" : "FALSE",
      TYPE: body.versioning.type,
      VERSION: body.versioning.version ?? "", // version not required for curseforge, not sure
      INIT_MEMORY: body.runtime.memory.init,
      MAX_MEMORY: body.runtime.memory.max,
      TZ: body.runtime.timezone ?? "UTC",
      OVERRIDE_SERVER_PROPERTIES: "TRUE",
      REPLACE_ENV_VARIABLES: "TRUE",
    };
    if (body.runtime.java?.useAikarFlags) envObj.USE_AIKAR_FLAGS = "TRUE";
    if (body.runtime.java?.jvmOpts) envObj.JVM_OPTS = body.runtime.java.jvmOpts;
    if (body.runtime.java?.jvmXXOpts) envObj.JVM_XX_OPTS = body.runtime.java.jvmXXOpts;

    // for AUTO_CURSEFORGE

    if(body.versioning.type === versionType.CURSEFORGE) {
      // !! using stored api!!
      if(!cfApiKey) {
        return NextResponse.json({
          ok: false,
          error: "No CurseForge API key found for user. Please set it in your general settings.",
        }, { status: 400 });
      }
      if(!body.CF_PAGE_URL) {
        return NextResponse.json({
          ok: false,
          error: "Missing CF_PAGE_URL for server. Get the modpack page URL from CurseForge.",
        }, { status: 400 });
      }
      envObj.CF_API_KEY = cfApiKey;
      envObj.CF_PAGE_URL = body.CF_PAGE_URL;
    }

    const Env = Object.entries(envObj).map(([k, v]) => `${k}=${v}`);

    // Define name and volume based on server name
    const slug = toSlug(body.metadata.serverName);
    const containerName = `mc-${slug}`;
    const volumeName = `mc-data-${slug}`;
    const hostPort = body.network?.serverPort ?? 25565;

    // Guarantee image + volume
    await ensureImage(IMAGE);
    await docker.createVolume({ Name: volumeName }).catch(() => { /* se existir, reutiliza */ });

    // Port mapping
    // REMEMBER TO HANDLE THIS PORT SETUP CORRECTLY
    // might send via request, check if port is used on host, etc... idk
    const ExposedPorts: Record<string, {}> = { "25565/tcp": {} };
    const PortBindings: Record<string, Array<{ HostPort: string }>> = {
      "25565/tcp": [{ HostPort: String(hostPort) }],
    };

    // Container creation
    // i want to send PORT via request if possible later
    const container = await docker.createContainer({
      name: containerName,
      Image: IMAGE,
      Env,
      Tty: true,
      OpenStdin: true,
      ExposedPorts,
      HostConfig: {
        Mounts: [{ Target: "/data", Source: volumeName, Type: "volume" }],
        PortBindings,
        RestartPolicy: { Name: "unless-stopped" },
      },
      Labels: {
        "com.cubegate.server": slug,
        "com.cubegate.description": body.metadata.description ?? "",
      },
    });

    await container.start();

    const info = await container.inspect();

    const portInfo = info.NetworkSettings.Ports["25565/tcp"]?.[0];
    const hostIp   = portInfo?.HostIp ?? "0.0.0.0";

    const newServer = await prisma.server.create({
      data: {
        name: body.metadata.serverName,
        description: body.metadata.description ?? "",
        containerId: info.Id,
        eula: body.runtime.eula,
        serverType: body.versioning.type,
        version: body.versioning.version ?? "", // not required for curseforge, not sure if this is ok
        minMemoryMB: body.runtime.memory.init,
        maxMemoryMB: body.runtime.memory.max,
        ownerId: session.user.id,
        containerName: containerName,
        volumeName: volumeName,
        port: hostPort,
        ipAddress: hostIp,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        containerId: info.Id,
        containerName,
        volumeName,
        hostPort,
        type: body.versioning.type,
        version: body.versioning.version,
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Error on server creation" },
      { status: 400 }
    );
  }
}

export async function GET() {
    // Get user session
    const session  = await auth.api.getSession({
        headers : await headers(),
    });

    if(!session) {
        return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
    )}

    const servers = await prisma.server.findMany({
        where: { ownerId: session.user.id },
    });

    return NextResponse.json({ ok: true, servers }, { status: 200 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const serverId = req.nextUrl.searchParams.get("id");
  if (!serverId) {
    return NextResponse.json({ ok: false, error: "Missing server ID" }, { status: 400 });
  }

  try {
    const server = await prisma.server.findFirst({
      where: { id: serverId, ownerId: userId },
    });
    if (!server) {
      return NextResponse.json({ ok: false, error: "Server not found" }, { status: 404 });
    }

    const container = docker.getContainer(server.containerName);

    let mounts:
      | Array<{ Type: "bind" | "volume"; Name?: string; Source?: string; Destination: string }>
      | null = null;

    try {
      const inspect = await container.inspect();
      mounts = (inspect?.Mounts ?? []).map((m: any) => ({
        Type: m.Type,
        Name: m.Name,
        Source: m.Source,
        Destination: m.Destination,
      }));
    } catch {
      mounts = null;
    }

    await container.stop().catch(() => {});
    await container.remove({ force: true, v: true }).catch(() => {});

    // remove named volume if exists
    if (server.volumeName) {
      try {
        await docker.getVolume(server.volumeName).remove({ force: true });
      } catch {
        // ignore
      }
    } else if (mounts) {
      // fallback to remove /data volume
      for (const m of mounts) {
        const isData = m.Destination === "/data" || m.Destination?.startsWith("/data/");
        if (!isData) continue;

        if (m.Type === "volume" && m.Name) {
          try {
            await docker.getVolume(m.Name).remove({ force: true });
          } catch {}
        }
      }
    }

    const del = await prisma.server.deleteMany({
      where: { id: serverId, ownerId: userId },
    });

    if (del.count === 0) {
      return NextResponse.json({ ok: false, error: "Server not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        ok: true,
        message: `Server '${server.name}' (container ${server.containerName}) and data deleted.`,
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Error deleting server" },
      { status: 500 }
    );
  }
}
