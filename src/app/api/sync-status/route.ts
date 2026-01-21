import { NextRequest, NextResponse } from "next/server";
import { getDockerClient } from "@/lib/docker";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const docker = getDockerClient();

export async function POST(req: NextRequest) {
  try {
    // Get all servers from the database
    const servers = await prisma.server.findMany();

    const updates = [];

    for (const server of servers) {
      try {
        const container = docker.getContainer(server.containerName);
        const inspect = await container.inspect();

        let newStatus = server.status;

        if (inspect.State.Running) {
          newStatus = "RUNNING";
        } else if (inspect.State.Status === "exited") {
          newStatus = "STOPPED";
        } else if (inspect.State.Status === "restarting") {
          newStatus = "RUNNING";
        } else if (inspect.State.Status === "paused") {
          newStatus = "STOPPED";
        }

        // Only update if status has changed
        if (newStatus !== server.status) {
          await prisma.server.update({
            where: { id: server.id },
            data: { status: newStatus },
          });
          updates.push({ id: server.id, oldStatus: server.status, newStatus });
        }
      } catch (error) {
        // Container not found or other error, skip this server
        console.error(`Error checking container ${server.containerName}:`, error);
      }
    }

    return NextResponse.json({
      ok: true,
      message: `Synced ${updates.length} server statuses`,
      updates,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Error syncing statuses" },
      { status: 500 }
    );
  }
}
