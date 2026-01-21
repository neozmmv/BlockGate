import { NextRequest, NextResponse } from "next/server";
import { getDockerClient } from "@/lib/docker";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import { Readable } from "stream";

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
  const path = req.nextUrl.searchParams.get("path") || "/data";

  if (!serverId) {
    return NextResponse.json(
      { ok: false, error: "Missing server ID" },
      { status: 400 }
    );
  }

  // Security: Ensure path is within /data directory
  if (!path.startsWith("/data")) {
    return NextResponse.json(
      { ok: false, error: "Access denied: Path must be within /data directory" },
      { status: 403 }
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

    // List files in the directory
    const exec = await container.exec({
      Cmd: ["sh", "-c", `ls -la "${path}"`],
      AttachStdout: true,
      AttachStderr: true,
    });

    const stream = await exec.start({ Detach: false });
    
    let output = "";
    stream.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });
    
    await new Promise((resolve) => stream.on("end", resolve));

    // Parse ls -la output
    const lines = output.trim().split("\n").slice(1); // Skip "total" line
    const files = lines.map((line) => {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 9) return null;
      
      const permissions = parts[0];
      const size = parts[4];
      const name = parts.slice(8).join(" ");
      
      const isDirectory = permissions.startsWith("d");
      
      return {
        name,
        isDirectory,
        size: isDirectory ? "-" : size,
        permissions,
      };
    }).filter(Boolean);

    return NextResponse.json({
      ok: true,
      path,
      files,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Error listing files" },
      { status: 500 }
    );
  }
}
