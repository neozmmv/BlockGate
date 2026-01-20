"use client";
import { useState, useEffect } from "react";
import { useSearchParams, redirect } from "next/navigation";
import axios from "axios";
import PanelSidebar from "@/components/PanelSidebar";

export default function ServerConfigPage({ session }: { session: any }) {
  const searchParams = useSearchParams();
  const serverId = searchParams.get("id");
  
  const [activeTab, setActiveTab] = useState<"properties" | "whitelist">("properties");
  const [serverProperties, setServerProperties] = useState("");
  const [whitelist, setWhitelist] = useState<Array<{ name: string; uuid: string }>>([]);
  const [newPlayer, setNewPlayer] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  if (!session) {
    redirect("/login");
  }

  useEffect(() => {
    if (serverId) {
      fetchData();
    }
  }, [serverId, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === "properties") {
        const res = await axios.get(`/api/server-config?serverId=${serverId}`);
        setServerProperties(res.data.content || "");
      } else if (activeTab === "whitelist") {
        const res = await axios.get(`/api/whitelist?serverId=${serverId}`);
        setWhitelist(res.data.whitelist || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveServerProperties = async () => {
    setSaving(true);
    try {
      await axios.put("/api/server-config", {
        serverId,
        content: serverProperties,
      });
      alert("server.properties saved successfully!");
    } catch (error) {
      console.error("Error saving server.properties:", error);
      alert("Failed to save server.properties");
    } finally {
      setSaving(false);
    }
  };

  const addPlayerToWhitelist = async () => {
    if (!newPlayer.trim()) return;
    
    try {
      await axios.post("/api/whitelist", {
        serverId,
        username: newPlayer,
      });
      setNewPlayer("");
      fetchData();
    } catch (error) {
      console.error("Error adding player to whitelist:", error);
      alert("Failed to add player to whitelist");
    }
  };

  const removePlayerFromWhitelist = async (username: string) => {
    try {
      await axios.delete(`/api/whitelist?serverId=${serverId}&username=${username}`);
      fetchData();
    } catch (error) {
      console.error("Error removing player from whitelist:", error);
      alert("Failed to remove player from whitelist");
    }
  };

  return (
    <div className="flex h-screen relative">
      <PanelSidebar session={session} />
      <div className="flex-1 bg-[#0b1019] h-full p-8">
        <div className="flex justify-between mb-8">
          <h1 className="text-white text-2xl">Server Configuration</h1>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-gray-500 rounded-md cursor-pointer hover:bg-gray-500/50 transition-all"
          >
            Back
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab("properties")}
            className={`px-4 py-2 rounded-md transition-all ${
              activeTab === "properties"
                ? "bg-blue-500 text-white"
                : "bg-[#0c1320] text-zinc-400 hover:bg-[#0c1320]/80"
            }`}
          >
            Server Properties
          </button>
          <button
            onClick={() => setActiveTab("whitelist")}
            className={`px-4 py-2 rounded-md transition-all ${
              activeTab === "whitelist"
                ? "bg-blue-500 text-white"
                : "bg-[#0c1320] text-zinc-400 hover:bg-[#0c1320]/80"
            }`}
          >
            Whitelist
          </button>
        </div>

        {/* Content */}
        <div className="bg-[#0c1320] rounded-md p-6">
          {loading ? (
            <div className="text-zinc-400">Loading...</div>
          ) : activeTab === "properties" ? (
            <div>
              <h2 className="text-white text-lg mb-4">Edit server.properties</h2>
              <textarea
                value={serverProperties}
                onChange={(e) => setServerProperties(e.target.value)}
                className="w-full h-96 rounded-md bg-[#0b1624] text-white p-4 outline-none font-mono text-sm"
                placeholder="Server properties content..."
              />
              <div className="flex justify-end mt-4">
                <button
                  onClick={saveServerProperties}
                  disabled={saving}
                  className="px-4 py-2 bg-green-500 rounded-md cursor-pointer hover:bg-green-500/80 transition-all disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-white text-lg mb-4">Manage Whitelist</h2>
              
              {/* Add player form */}
              <div className="flex gap-4 mb-6">
                <input
                  type="text"
                  value={newPlayer}
                  onChange={(e) => setNewPlayer(e.target.value)}
                  placeholder="Enter player username"
                  className="flex-1 rounded-md bg-[#0b1624] text-white p-2 outline-none"
                  onKeyPress={(e) => e.key === "Enter" && addPlayerToWhitelist()}
                />
                <button
                  onClick={addPlayerToWhitelist}
                  className="px-4 py-2 bg-green-500 rounded-md cursor-pointer hover:bg-green-500/80 transition-all"
                >
                  Add Player
                </button>
              </div>

              {/* Whitelist table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-zinc-400 text-sm border-b border-zinc-700">
                      <th className="text-left p-4">Username</th>
                      <th className="text-left p-4">UUID</th>
                      <th className="text-left p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {whitelist.map((player) => (
                      <tr key={player.uuid} className="border-b border-zinc-800">
                        <td className="p-4 text-white">{player.name}</td>
                        <td className="p-4 text-zinc-400 font-mono text-sm">{player.uuid}</td>
                        <td className="p-4">
                          <button
                            onClick={() => removePlayerFromWhitelist(player.name)}
                            className="px-3 py-1 bg-red-500 rounded-md hover:bg-red-500/80 transition-all"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                    {whitelist.length === 0 && (
                      <tr>
                        <td colSpan={3} className="p-4 text-zinc-400 text-center">
                          No players in whitelist
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
