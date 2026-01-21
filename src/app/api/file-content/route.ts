import { NextRequest, NextResponse } from "next/server";
import { getDockerClient } from "@/lib/docker";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";

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
  const filePath = req.nextUrl.searchParams.get("path");

  if (!serverId || !filePath) {
    return NextResponse.json(
      { ok: false, error: "Missing server ID or file path" },
      { status: 400 }
    );
  }

  // Security: Ensure path is within /data directory
  if (!filePath.startsWith("/data/")) {
    return NextResponse.json(
      { ok: false, error: "Access denied: Path must be within /data directory" },
      { status: 403 }
    );
  }

  // Security: Only allow .json and .txt files
  if (!filePath.endsWith(".json") && !filePath.endsWith(".txt")) {
    return NextResponse.json(
      { ok: false, error: "Only .json and .txt files can be read" },
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

    // Read file content
    const exec = await container.exec({
      Cmd: ["sh", "-c", `cat "${filePath}" 2>/dev/null || echo ""`],
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
      path: filePath,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Error reading file" },
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
    const { serverId, filePath, content } = body;

    if (!serverId || !filePath || content === undefined) {
      return NextResponse.json(
        { ok: false, error: "Missing serverId, filePath, or content" },
        { status: 400 }
      );
    }

    // Security: Ensure path is within /data directory
    if (!filePath.startsWith("/data/")) {
      return NextResponse.json(
        { ok: false, error: "Access denied: Path must be within /data directory" },
        { status: 403 }
      );
    }

    // Security: Only allow .json and .txt files
    if (!filePath.endsWith(".json") && !filePath.endsWith(".txt")) {
      return NextResponse.json(
        { ok: false, error: "Only .json and .txt files can be edited" },
        { status: 403 }
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

    // Write file using base64 encoding to avoid shell escaping issues
    const base64Content = Buffer.from(content).toString('base64');
    
    const exec = await container.exec({
      Cmd: ["sh", "-c", `echo '${base64Content}' | base64 -d > "${filePath}"`],
      AttachStdout: true,
      AttachStderr: true,
    });

    await exec.start({ Detach: false });

    return NextResponse.json({
      ok: true,
      message: "File updated successfully",
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Error writing file" },
      { status: 500 }
    );
  }
}
