"use client";
import axios from "axios";
import { useState, useEffect, useCallback } from "react";
import React from "react";
import { useRouter } from "next/navigation";

type Server = {
  id: string;
  name: string;
  description?: string;
  eula?: boolean;
  version: string;
  minMemoryMB?: string;
  maxMemoryMB?: string;
  serverType: string;
  status: string;
  ipAddress?: string;
  port?: number;
};

export default function OnlineTable() {
  const router = useRouter();
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);

  const keepOnline = (s: Server) =>
    typeof s.status === "string"
      ? s.status === "RUNNING" || s.status === "CREATING"
      : Boolean(s.status);

  const fetchServers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get("/api/servers");
      const list: Server[] = data?.servers ?? [];
      setServers(list.filter(keepOnline));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  async function handleDeleteServer(serverId: string) {
    await axios.delete(`/api/servers?id=${serverId}`);
    await fetchServers();
  }

  async function handleStopServer(serverId: string) {
    await axios.post(`/api/stop`, { serverId });
    await fetchServers();
  }

  if (loading) {
    return <div className="text-zinc-400 p-4">Loading...</div>;
  }

  return (
    <table className="w-full table-auto">
      <thead>
        <tr className="text-zinc-400 text-sm">
          <th className="text-left p-4">Server Name</th>
          <th className="text-left p-4">Server IP</th>
          <th className="text-left p-4">Status</th>
          <th className="text-left p-4">Version</th>
          <th className="text-left p-4">Type</th>
          <th className="text-left p-4">Actions</th>
        </tr>
      </thead>
      <tbody>
        {servers.map((server) => (
          <tr key={server.id} className="bg-[#0b1624]">
            <td className="p-4 text-white">{server.name}</td>
            <td className="p-4 text-white">
              {server.ipAddress ?? "0.0.0.0"}:{server.port ?? 25565}
            </td>
            <td className="p-4 text-green-400">
              {typeof server.status === "boolean"
                ? server.status
                  ? "RUNNING"
                  : "STOPPED"
                : server.status}
            </td>
            <td className="p-4 text-white">{server.version}</td>
            <td className="p-4 text-white">{server.serverType}</td>
            <td className="p-4">
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => router.push(`/panel/server/${server.id}/manage`)}
                  className="cursor-pointer px-3 py-1 bg-blue-500 rounded-md hover:bg-blue-500/80 transition-all"
                >
                  Manage
                </button>
                <button
                  onClick={() => handleStopServer(server.id)}
                  className="cursor-pointer px-3 py-1 bg-yellow-500 rounded-md hover:bg-yellow-500/80 transition-all"
                >
                  Stop
                </button>
                <button
                  onClick={() => handleDeleteServer(server.id)}
                  className="cursor-pointer px-3 py-1 bg-red-500 rounded-md hover:bg-red-500/80 transition-all"
                >
                  Delete
                </button>
              </div>
            </td>
          </tr>
        ))}

        {servers.length === 0 && (
          <tr>
            <td className="p-4 text-zinc-400" colSpan={6}>
              No running servers.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
