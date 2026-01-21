import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import { Rcon } from "rcon-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    const rcon = await Rcon.connect({
      host: "localhost",
      port: rconPort,
      password: rconPassword,
    });

    // Send command
    const response = await rcon.send(command);
    
    // Close connection
    await rcon.end();

    return NextResponse.json({
      ok: true,
      response,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Error executing RCON command" },
      { status: 500 }
    );
  }
}
