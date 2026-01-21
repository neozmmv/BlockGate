import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import { Rcon } from "rcon-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function connectRconWithFallback(options: { hosts: string[]; port: number; password: string }) {
  let lastError: unknown;

  for (const host of options.hosts) {
    try {
      return await Rcon.connect({
        host,
        port: options.port,
        password: options.password,
      });
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError;
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
    const { serverId, command } = body;

    if (!serverId || !command) {
      return NextResponse.json(
        { ok: false, error: "Missing serverId or command" },
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

    // Extract slug from container name (mc-{slug})
    const slug = server.containerName.replace(/^mc-/, '');
    const rconPassword = `rcon-${slug}`;
    
    // Get server port and calculate RCON port
    const serverPort = server.port;
    const rconPort = serverPort + 10;

    // Connect to RCON
    const rcon = await connectRconWithFallback({
      hosts: [
        // Docker Compose: reach the Minecraft container over the shared network
        server.containerName,
        // If the app is containerized but connecting via published ports
        "host.docker.internal",
        // Local dev
        "127.0.0.1",
        "localhost",
      ],
      port: rconPort,
      password: rconPassword,
    });

    try {
      const response = await rcon.send(String(command).trim());

      return NextResponse.json({
        ok: true,
        response,
      });
    } finally {
      await rcon.end().catch(() => undefined);
    }
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || String(err) || "Error executing RCON command" },
      { status: 500 }
    );
  }
}
