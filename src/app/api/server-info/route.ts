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

    let containerInfo = null;
    let playerCount = 0;
    let maxPlayers = 0;

    try {
      const container = docker.getContainer(server.containerName);
      const inspect = await container.inspect();
      
      containerInfo = {
        status: inspect.State.Status,
        running: inspect.State.Running,
        startedAt: inspect.State.StartedAt,
        finishedAt: inspect.State.FinishedAt,
      };

      // Try to get player count from server.properties if container is running
      if (inspect.State.Running) {
        try {
          // Execute command to read server.properties for max-players
          const exec = await container.exec({
            Cmd: ["sh", "-c", "grep 'max-players=' /data/server.properties | cut -d'=' -f2"],
            AttachStdout: true,
            AttachStderr: true,
          });
          const stream = await exec.start({ Detach: false });
          
          let output = "";
          stream.on("data", (chunk: Buffer) => {
            output += chunk.toString();
          });
          
          await new Promise((resolve) => stream.on("end", resolve));
          
          const maxPlayersMatch = output.trim();
          if (maxPlayersMatch) {
            maxPlayers = parseInt(maxPlayersMatch) || 20;
          }
        } catch (err) {
          console.error("Error reading max-players:", err);
          maxPlayers = 20; // default
        }

        // Try to count online players from logs (this is a simplified approach)
        // In a real scenario, you might want to use RCON or query protocol
        try {
          const logs = await container.logs({
            stdout: true,
            stderr: false,
            tail: 100,
          });
          
          const logStr = logs.toString();
          // Look for player join messages in recent logs
          const joinMatches = logStr.match(/joined the game/gi);
          const leaveMatches = logStr.match(/left the game/gi);
          
          playerCount = (joinMatches?.length || 0) - (leaveMatches?.length || 0);
          playerCount = Math.max(0, playerCount);
        } catch (err) {
          console.error("Error reading player count:", err);
        }
      }
    } catch (err) {
      console.error("Error inspecting container:", err);
    }

    return NextResponse.json({
      ok: true,
      server: {
        id: server.id,
        name: server.name,
        description: server.description,
        serverType: server.serverType,
        version: server.version,
        ipAddress: server.ipAddress,
        port: server.port,
        minMemoryMB: server.minMemoryMB,
        maxMemoryMB: server.maxMemoryMB,
        containerName: server.containerName,
        volumeName: server.volumeName,
        status: server.status,
        createdAt: server.createdAt,
        updatedAt: server.updatedAt,
      },
      containerInfo,
      playerCount,
      maxPlayers,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Error fetching server info" },
      { status: 500 }
    );
  }
}
