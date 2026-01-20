import { NextRequest, NextResponse } from "next/server";
import { getDockerClient } from "@/lib/docker";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const docker = getDockerClient();

// GET: Retrieve whitelist
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
    
    // Execute command to read whitelist.json
    const exec = await container.exec({
      Cmd: ["sh", "-c", "cat /data/whitelist.json 2>/dev/null || echo '[]'"],
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

    // Remove Docker stream header bytes
    const cleanOutput = output.replace(/[\x00-\x08]/g, "").trim();

    let whitelist = [];
    try {
      whitelist = JSON.parse(cleanOutput);
    } catch {
      whitelist = [];
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

// POST: Add player to whitelist
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
    const { serverId, username } = body;

    if (!serverId || !username) {
      return NextResponse.json(
        { ok: false, error: "Missing serverId or username" },
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

    // Use rcon or execute whitelist command
    const exec = await container.exec({
      Cmd: ["rcon-cli", "whitelist", "add", username],
      AttachStdout: true,
      AttachStderr: true,
    });

    await exec.start({ Detach: false });

    return NextResponse.json({
      ok: true,
      message: `Player ${username} added to whitelist`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Error adding player to whitelist" },
      { status: 500 }
    );
  }
}

// DELETE: Remove player from whitelist
export async function DELETE(req: NextRequest) {
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
  const username = req.nextUrl.searchParams.get("username");

  if (!serverId || !username) {
    return NextResponse.json(
      { ok: false, error: "Missing serverId or username" },
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

    // Use rcon to remove player from whitelist
    const exec = await container.exec({
      Cmd: ["rcon-cli", "whitelist", "remove", username],
      AttachStdout: true,
      AttachStderr: true,
    });

    await exec.start({ Detach: false });

    return NextResponse.json({
      ok: true,
      message: `Player ${username} removed from whitelist`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Error removing player from whitelist" },
      { status: 500 }
    );
  }
}
