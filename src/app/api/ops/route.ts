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

    // Read ops.json file
    const exec = await container.exec({
      Cmd: ["sh", "-c", "cat /data/ops.json 2>/dev/null || echo '[]'"],
      AttachStdout: true,
      AttachStderr: true,
    });

    const stream = await exec.start({ Detach: false });
    let output = "";
    for await (const chunk of stream) {
      output += chunk.toString('utf8');
    }
    // Remove Docker stream headers
    const cleanOutput = output.replace(/^.{8}/gm, '').trim();
    let ops = [];
    try {
      ops = JSON.parse(cleanOutput);
    } catch (e) {
      try {
        ops = JSON.parse(output.trim());
      } catch (e2) {
        ops = [];
      }
    }

    return NextResponse.json({
      ok: true,
      ops,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Error reading ops" },
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
    const { serverId, action, name, uuid, level } = body;

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

      // Read ops.json
      const readExec = await container.exec({
        Cmd: ["sh", "-c", "cat /data/ops.json 2>/dev/null || echo '[]'"],
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
      let ops = [];
      try {
        ops = JSON.parse(cleanOutput);
      } catch (e) {
        try {
          ops = JSON.parse(output.trim());
        } catch (e2) {
          ops = [];
        }
      }

      // Check if player already exists
      const exists = ops.some((p: any) => p.name === name);
      if (!exists) {
        ops.push({ 
          name, 
          uuid: uuid || "", 
          level: level || 4,
          bypassesPlayerLimit: false
        });
        
        // Use base64 encoding to avoid shell escaping issues
        const base64Content = Buffer.from(JSON.stringify(ops, null, 2)).toString('base64');
        const writeExec = await container.exec({
          Cmd: ["sh", "-c", `echo '${base64Content}' | base64 -d > /data/ops.json`],
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

      // Remove player from ops
      const readExec = await container.exec({
        Cmd: ["sh", "-c", "cat /data/ops.json 2>/dev/null || echo '[]'"],
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
      let ops = [];
      try {
        ops = JSON.parse(cleanOutput);
      } catch (e) {
        try {
          ops = JSON.parse(output.trim());
        } catch (e2) {
          ops = [];
        }
      }

      ops = ops.filter((p: any) => p.name !== name);
      
      // Use base64 encoding to avoid shell escaping issues
      const base64Content = Buffer.from(JSON.stringify(ops, null, 2)).toString('base64');
      const writeExec = await container.exec({
        Cmd: ["sh", "-c", `echo '${base64Content}' | base64 -d > /data/ops.json`],
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
      message: `OPs ${action} successful`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Error updating ops" },
      { status: 500 }
    );
  }
}
