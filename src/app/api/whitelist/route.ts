import { NextRequest, NextResponse } from "next/server";
import { getDockerClient } from "@/lib/docker";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import { Rcon } from "rcon-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const docker = getDockerClient();

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const serverId = req.nextUrl.searchParams.get("id");

  if (!serverId) {
    return NextResponse.json(
      { ok: false, error: "Missing server ID" },
      { status: 400 }
    );
  }

  try {
    const server = await prisma.server.findFirst({
      where: { id: serverId, ownerId: session.user.id },
    });

    if (!server) {
      return NextResponse.json(
        { ok: false, error: "Server not found" },
        { status: 404 }
      );
    }

    const container = docker.getContainer(server.containerName);
    const inspect = await container.inspect();

    if (!inspect.State.Running) {
      return NextResponse.json(
        { ok: false, error: "Container is not running" },
        { status: 400 }
      );
    }

    // Read whitelist.json file
    const exec = await container.exec({
      Cmd: ["sh", "-c", "cat /data/whitelist.json 2>/dev/null || echo '[]'"],
      AttachStdout: true,
      AttachStderr: true,
    });

    const stream = await exec.start({ Detach: false });
    
    let output = "";
    for await (const chunk of stream) {
      output += chunk.toString('utf8');
    }

    // Remove Docker stream headers (8 bytes prefix on each chunk)
    const cleanOutput = output.replace(/^.{8}/gm, '').trim();

    let whitelist = [];
    try {
      whitelist = JSON.parse(cleanOutput);
    } catch (e) {
      // If parse fails, try the raw output
      try {
        whitelist = JSON.parse(output.trim());
      } catch (e2) {
        whitelist = [];
      }
    }

    return NextResponse.json({
      ok: true,
      whitelist,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Error reading whitelist" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { serverId, action, name, uuid } = body;

    if (!serverId || !action) {
      return NextResponse.json(
        { ok: false, error: "Missing serverId or action" },
        { status: 400 }
      );
    }

    const server = await prisma.server.findFirst({
      where: { id: serverId, ownerId: session.user.id },
    });

    if (!server) {
      return NextResponse.json(
        { ok: false, error: "Server not found" },
        { status: 404 }
      );
    }

    const container = docker.getContainer(server.containerName);
    const inspect = await container.inspect();

    if (!inspect.State.Running) {
      return NextResponse.json(
        { ok: false, error: "Container is not running" },
        { status: 400 }
      );
    }

    // Extract slug from container name for RCON password
    const slug = server.containerName.replace(/^mc-/, '');
    const rconPassword = `rcon-${slug}`;
    const rconPort = server.port + 10;

    if (action === "add") {
      if (!name) {
        return NextResponse.json(
          { ok: false, error: "Missing name for add action" },
          { status: 400 }
        );
      }

      // Use RCON to add player to whitelist
      try {
        const rcon = await Rcon.connect({
          host: "localhost",
          port: rconPort,
          password: rconPassword,
        });

        // Add player using RCON command
        await rcon.send(`whitelist add ${name}`);
        await rcon.end();
      } catch (rconErr: any) {
        return NextResponse.json(
          { ok: false, error: `RCON error: ${rconErr.message}` },
          { status: 500 }
        );
      }
    } else if (action === "remove") {
      if (!name) {
        return NextResponse.json(
          { ok: false, error: "Missing name for remove action" },
          { status: 400 }
        );
      }

      // Use RCON to remove player from whitelist
      try {
        const rcon = await Rcon.connect({
          host: "localhost",
          port: rconPort,
          password: rconPassword,
        });

        // Remove player using RCON command
        await rcon.send(`whitelist remove ${name}`);
        await rcon.end();
      } catch (rconErr: any) {
        return NextResponse.json(
          { ok: false, error: `RCON error: ${rconErr.message}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      ok: true,
      message: `Whitelist ${action} successful`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Error updating whitelist" },
      { status: 500 }
    );
  }
}
