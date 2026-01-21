import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Docker from "dockerode";

const docker = new Docker();

// Server-Sent Events endpoint for streaming container logs
export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Get serverId from query params
    const searchParams = request.nextUrl.searchParams;
    const serverId = searchParams.get("serverId");

    if (!serverId) {
      return new Response("Server ID required", { status: 400 });
    }

    // Authorization check - verify user owns this server
    const server = await prisma.server.findFirst({
      where: {
        id: serverId,
        owner: {
          email: session.user.email,
        },
      },
    });

    if (!server) {
      return new Response("Server not found or access denied", { status: 404 });
    }

    // Get the container
    const container = docker.getContainer(server.containerId);

    // Verify container exists
    try {
      await container.inspect();
    } catch (error) {
      return new Response("Container not found", { status: 404 });
    }

    // Create a readable stream for SSE
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let closed = false;

        // Send initial connection message
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`));

        // Heartbeat interval to keep connection alive
        const heartbeatInterval = setInterval(() => {
          if (!closed) {
            try {
              controller.enqueue(encoder.encode(`: heartbeat\n\n`));
            } catch (error) {
              clearInterval(heartbeatInterval);
            }
          }
        }, 30000); // Every 30 seconds

        try {
          // Attach to container logs with follow=true for streaming
          const logStream = await container.logs({
            follow: true,
            stdout: true,
            stderr: true,
            timestamps: true,
            tail: 100, // Start with last 100 lines
          });

          // Handle log stream data
          logStream.on("data", (chunk: Buffer) => {
            if (closed) return;

            try {
              // Docker stream format: 8-byte header + data
              // Header: [stream_type, 0, 0, 0, size1, size2, size3, size4]
              let offset = 0;
              while (offset < chunk.length) {
                if (chunk.length - offset < 8) break;

                // Read size from header (bytes 4-7, big-endian)
                const size = chunk.readUInt32BE(offset + 4);
                if (chunk.length - offset < 8 + size) break;

                // Extract log line
                const logLine = chunk.subarray(offset + 8, offset + 8 + size).toString("utf8");
                
                if (logLine.trim()) {
                  const message = {
                    type: "log",
                    data: logLine,
                    timestamp: new Date().toISOString(),
                  };
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(message)}\n\n`));
                }

                offset += 8 + size;
              }
            } catch (error) {
              console.error("Error processing log chunk:", error);
            }
          });

          // Handle stream end
          logStream.on("end", () => {
            if (!closed) {
              const message = {
                type: "end",
                data: "Stream ended",
              };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(message)}\n\n`));
              cleanup();
            }
          });

          // Handle stream errors
          logStream.on("error", (error: Error) => {
            if (!closed) {
              console.error("Log stream error:", error);
              const message = {
                type: "error",
                data: error.message,
              };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(message)}\n\n`));
              cleanup();
            }
          });

          // Cleanup function
          const cleanup = () => {
            if (!closed) {
              closed = true;
              clearInterval(heartbeatInterval);
              logStream.destroy();
              try {
                controller.close();
              } catch (e) {
                // Stream may already be closed
              }
            }
          };

          // Handle client disconnect
          request.signal.addEventListener("abort", () => {
            cleanup();
          });
        } catch (error: any) {
          console.error("Error starting log stream:", error);
          const message = {
            type: "error",
            data: error.message || "Failed to start log stream",
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(message)}\n\n`));
          clearInterval(heartbeatInterval);
          controller.close();
        }
      },
    });

    // Return SSE response
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no", // Disable nginx buffering
      },
    });
  } catch (error: any) {
    console.error("SSE endpoint error:", error);
    return new Response(error.message || "Internal server error", {
      status: 500,
    });
  }
}
