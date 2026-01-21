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

    // Read server.properties file
    const exec = await container.exec({
      Cmd: ["sh", "-c", "cat /data/server.properties"],
      AttachStdout: true,
      AttachStderr: true,
    });

    const stream = await exec.start({ Detach: false });
    
    let output = "";
    stream.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });
    
    await new Promise((resolve) => stream.on("end", resolve));

    return NextResponse.json({
      ok: true,
      content: output,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Error reading server.properties" },
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
    const { serverId, content } = body;

    if (!serverId || content === undefined) {
      return NextResponse.json(
        { ok: false, error: "Missing serverId or content" },
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

    // Write server.properties file using base64 encoding to avoid shell escaping issues
    const base64Content = Buffer.from(content).toString('base64');
    
    const exec = await container.exec({
      Cmd: ["sh", "-c", `echo '${base64Content}' | base64 -d > /data/server.properties`],
      AttachStdout: true,
      AttachStderr: true,
    });

    await exec.start({ Detach: false });

    return NextResponse.json({
      ok: true,
      message: "server.properties updated successfully",
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Error writing server.properties" },
      { status: 500 }
    );
  }
}
