import { NextRequest, NextResponse } from "next/server";
import { getDockerClient } from "@/lib/docker";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const docker = getDockerClient();

// GET: Retrieve server.properties content
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

  const serverId = req.nextUrl.searchParams.get("serverId");
  if (!serverId) {
    return NextResponse.json(
      { ok: false, error: "Missing serverId" },
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
    
    // Execute command to read server.properties
    const exec = await container.exec({
      Cmd: ["cat", "/data/server.properties"],
      AttachStdout: true,
      AttachStderr: true,
    });

    const stream = await exec.start({ Detach: false });
    
    let output = "";
    stream.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });

    await new Promise((resolve, reject) => {
      stream.on("end", resolve);
      stream.on("error", reject);
    });

    // Remove Docker stream header bytes (first 8 bytes of each chunk)
    const cleanOutput = output.replace(/[\x00-\x08]/g, "");

    return NextResponse.json({
      ok: true,
      content: cleanOutput,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Error reading server.properties" },
      { status: 500 }
    );
  }
}

// PUT: Update server.properties content
export async function PUT(req: NextRequest) {
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

    // Write the content to server.properties
    const exec = await container.exec({
      Cmd: ["sh", "-c", `cat > /data/server.properties << 'EOF'\n${content}\nEOF`],
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
      { ok: false, error: err?.message ?? "Error updating server.properties" },
      { status: 500 }
    );
  }
}
