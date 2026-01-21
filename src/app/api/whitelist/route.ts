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

    const container = docker.getContainer(server.containerName);
    const inspect = await container.inspect();

    if (!inspect.State.Running) {
      return NextResponse.json(
        { ok: false, error: "Container is not running" },
        { status: 400 }
      );
    }

    // Read whitelist.json file
    const exec = await container.exec({
      Cmd: ["sh", "-c", "cat /data/whitelist.json 2>/dev/null || echo '[]'"],
      AttachStdout: true,
      AttachStderr: true,
    });

    const stream = await exec.start({ Detach: false });
    
    let output = "";
    for await (const chunk of stream) {
      output += chunk.toString('utf8');
    }

    // Remove Docker stream headers (8 bytes prefix on each chunk)
    const cleanOutput = output.replace(/^.{8}/gm, '').trim();

    let whitelist = [];
    try {
      whitelist = JSON.parse(cleanOutput);
    } catch (e) {
      // If parse fails, try the raw output
      try {
        whitelist = JSON.parse(output.trim());
      } catch (e2) {
        whitelist = [];
      }
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
    const { serverId, action, name, uuid } = body;

    if (!serverId || !action) {
      return NextResponse.json(
        { ok: false, error: "Missing serverId or action" },
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

    if (action === "add") {
      if (!name) {
        return NextResponse.json(
          { ok: false, error: "Missing name for add action" },
          { status: 400 }
        );
      }

      // Read whitelist.json
      const readExec = await container.exec({
        Cmd: ["sh", "-c", "cat /data/whitelist.json 2>/dev/null || echo '[]'"],
        AttachStdout: true,
        AttachStderr: true,
      });

      const readStream = await readExec.start({ Detach: false });
      let output = "";
      for await (const chunk of readStream) {
        output += chunk.toString('utf8');
      }

      // Remove Docker stream headers
      const cleanOutput = output.replace(/^.{8}/gm, '').trim();

      let whitelist = [];
      try {
        whitelist = JSON.parse(cleanOutput);
      } catch (e) {
        try {
          whitelist = JSON.parse(output.trim());
        } catch (e2) {
          whitelist = [];
        }
      }

      // Check if player already exists
      const exists = whitelist.some((p: any) => p.name === name);
      if (!exists) {
        whitelist.push({ name, uuid: uuid || "" });
        
        // Use base64 encoding to avoid shell escaping issues
        const base64Content = Buffer.from(JSON.stringify(whitelist, null, 2)).toString('base64');
        const writeExec = await container.exec({
          Cmd: ["sh", "-c", `echo '${base64Content}' | base64 -d > /data/whitelist.json`],
          AttachStdout: true,
          AttachStderr: true,
        });
        const writeStream = await writeExec.start({ Detach: false });
        for await (const chunk of writeStream) {
          // Consume stream
        }
      }
    } else if (action === "remove") {
      if (!name) {
        return NextResponse.json(
          { ok: false, error: "Missing name for remove action" },
          { status: 400 }
        );
      }

      // Remove player from whitelist
      const readExec = await container.exec({
        Cmd: ["sh", "-c", "cat /data/whitelist.json 2>/dev/null || echo '[]'"],
        AttachStdout: true,
        AttachStderr: true,
      });

      const readStream = await readExec.start({ Detach: false });
      let output = "";
      for await (const chunk of readStream) {
        output += chunk.toString('utf8');
      }

      // Remove Docker stream headers
      const cleanOutput = output.replace(/^.{8}/gm, '').trim();

      let whitelist = [];
      try {
        whitelist = JSON.parse(cleanOutput);
      } catch (e) {
        try {
          whitelist = JSON.parse(output.trim());
        } catch (e2) {
          whitelist = [];
        }
      }

      whitelist = whitelist.filter((p: any) => p.name !== name);
      
      // Use base64 encoding to avoid shell escaping issues
      const base64Content = Buffer.from(JSON.stringify(whitelist, null, 2)).toString('base64');
      const writeExec = await container.exec({
        Cmd: ["sh", "-c", `echo '${base64Content}' | base64 -d > /data/whitelist.json`],
        AttachStdout: true,
        AttachStderr: true,
      });
      const writeStream = await writeExec.start({ Detach: false });
      for await (const chunk of writeStream) {
        // Consume stream
      }
    }

    return NextResponse.json({
      ok: true,
      message: `Whitelist ${action} successful`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Error updating whitelist" },
      { status: 500 }
    );
  }
}
