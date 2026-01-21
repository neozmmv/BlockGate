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

export default function InactiveTable() {
  const router = useRouter();
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [serverToDelete, setServerToDelete] = useState<string | null>(null);
  const [deleteInput, setDeleteInput] = useState("");

  const keepStopped = (s: Server) =>
    typeof s.status === "string" ? s.status === "STOPPED" : !Boolean(s.status);

  const fetchServers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get("/api/servers");
      const list: Server[] = data?.servers ?? [];
      setServers(list.filter(keepStopped));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServers();
    
    // Set up interval to sync status every 10 seconds
    const syncInterval = setInterval(async () => {
      try {
        await axios.post('/api/sync-status');
        await fetchServers();
      } catch (error) {
        console.error("Error syncing status:", error);
      }
    }, 10000);

    return () => clearInterval(syncInterval);
  }, [fetchServers]);

  async function handleDeleteServer(serverId: string) {
    setServerToDelete(serverId);
    setDeleteConfirmOpen(true);
    setDeleteInput("");
  }

  async function confirmDelete() {
    if (deleteInput === "DELETE" && serverToDelete) {
      await axios.delete(`/api/servers?id=${serverToDelete}`);
      setDeleteConfirmOpen(false);
      setServerToDelete(null);
      setDeleteInput("");
      await fetchServers();
    }
  }

  async function handleStartServer(serverId: string) {
    await axios.post(`/api/start`, { serverId });
    await fetchServers();
    // Force refresh to update status
    window.location.reload();
  }

  if (loading) {
    return <div className="text-zinc-400 p-4">Loading...</div>;
  }

  return (
    <>
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
            <td className="p-4 text-red-400">
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
                  onClick={() => handleStartServer(server.id)}
                  className="cursor-pointer px-3 py-1 bg-green-700 rounded-md hover:bg-green-700/80 transition-all"
                >
                  Start
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
              No stopped servers.
            </td>
          </tr>
        )}
      </tbody>
    </table>
    {deleteConfirmOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div
          className="absolute inset-0 bg-black/50"
          onClick={() => {
            setDeleteConfirmOpen(false);
            setServerToDelete(null);
            setDeleteInput("");
          }}
        />
        <div className="relative z-10 w-full max-w-md rounded-xl bg-[#0c1320] p-6 shadow-xl">
          <h3 className="text-white text-lg mb-4">Confirm Server Deletion</h3>
          <p className="text-zinc-400 text-sm mb-4">
            This action cannot be undone. All server data will be permanently deleted.
          </p>
          <p className="text-zinc-300 text-sm mb-2">
            Type <span className="font-bold text-red-500">DELETE</span> to confirm:
          </p>
          <input
            type="text"
            value={deleteInput}
            onChange={(e) => setDeleteInput(e.target.value)}
            className="w-full rounded-md bg-[#0b1624] text-white p-2 outline-none mb-4"
            placeholder="Type DELETE"
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => {
                setDeleteConfirmOpen(false);
                setServerToDelete(null);
                setDeleteInput("");
              }}
              className="px-4 py-2 bg-zinc-700 rounded-md hover:bg-zinc-600 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              disabled={deleteInput !== "DELETE"}
              className="px-4 py-2 bg-red-500 rounded-md hover:bg-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Delete Server
            </button>
          </div>
        </div>
      </div>
    )}
  </>
  );
}
