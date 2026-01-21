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
  const tail = req.nextUrl.searchParams.get("tail") || "100";

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

    // Get container logs
    const logStream = await container.logs({
      stdout: true,
      stderr: true,
      follow: false,
      tail: parseInt(tail),
      timestamps: true,
    });

    let logs = "";
    for await (const chunk of logStream) {
      logs += chunk.toString('utf8');
    }

    // Clean up Docker stream headers
    const cleanLogs = logs.replace(/^.{8}/gm, '');

    return NextResponse.json({
      ok: true,
      logs: cleanLogs,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Error reading logs" },
      { status: 500 }
    );
  }
}
