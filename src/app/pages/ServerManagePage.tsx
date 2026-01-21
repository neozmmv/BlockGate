"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import PanelSidebar from "@/components/PanelSidebar";

type ServerInfo = {
  id: string;
  name: string;
  description?: string;
  serverType: string;
  version: string;
  ipAddress: string;
  port: number;
  minMemoryMB: string;
  maxMemoryMB: string;
  containerName: string;
  volumeName: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type ContainerInfo = {
  status: string;
  running: boolean;
  startedAt: string;
  finishedAt: string;
};

type FileEntry = {
  name: string;
  isDirectory: boolean;
  size: string;
  permissions: string;
};

export default function ServerManagePage({
  session,
  serverId,
}: {
  session: any;
  serverId: string;
}) {
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [containerInfo, setContainerInfo] = useState<ContainerInfo | null>(null);
  const [playerCount, setPlayerCount] = useState(0);
  const [maxPlayers, setMaxPlayers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "files" | "properties" | "whitelist" | "ops">("overview");
  
  // Files state
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [currentPath, setCurrentPath] = useState("/data");
  const [loadingFiles, setLoadingFiles] = useState(false);

  // Server properties state
  const [serverProperties, setServerProperties] = useState("");
  const [editedProperties, setEditedProperties] = useState("");
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [savingProperties, setSavingProperties] = useState(false);

  // Whitelist state
  const [whitelist, setWhitelist] = useState<any[]>([]);
  const [loadingWhitelist, setLoadingWhitelist] = useState(false);
  const [newWhitelistPlayer, setNewWhitelistPlayer] = useState("");

  // OPs state
  const [ops, setOps] = useState<any[]>([]);
  const [loadingOps, setLoadingOps] = useState(false);
  const [newOpPlayer, setNewOpPlayer] = useState("");
  const [newOpLevel, setNewOpLevel] = useState(4);

  useEffect(() => {
    fetchServerInfo();
  }, [serverId]);

  useEffect(() => {
    if (activeTab === "files") {
      fetchFiles(currentPath);
    } else if (activeTab === "properties") {
      fetchServerProperties();
    } else if (activeTab === "whitelist") {
      fetchWhitelist();
    } else if (activeTab === "ops") {
      fetchOps();
    }
  }, [activeTab]);

  const fetchServerInfo = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`/api/server-info?id=${serverId}`);
      if (data.ok) {
        setServerInfo(data.server);
        setContainerInfo(data.containerInfo);
        setPlayerCount(data.playerCount);
        setMaxPlayers(data.maxPlayers);
      }
    } catch (error) {
      console.error("Error fetching server info:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFiles = async (path: string) => {
    setLoadingFiles(true);
    try {
      const { data } = await axios.get(`/api/server-files?id=${serverId}&path=${encodeURIComponent(path)}`);
      if (data.ok) {
        setFiles(data.files);
        setCurrentPath(data.path);
      }
    } catch (error) {
      console.error("Error fetching files:", error);
    } finally {
      setLoadingFiles(false);
    }
  };

  const fetchServerProperties = async () => {
    setLoadingProperties(true);
    try {
      const { data } = await axios.get(`/api/server-properties?id=${serverId}`);
      if (data.ok) {
        setServerProperties(data.content);
        setEditedProperties(data.content);
      }
    } catch (error) {
      console.error("Error fetching server.properties:", error);
    } finally {
      setLoadingProperties(false);
    }
  };

  const saveServerProperties = async () => {
    setSavingProperties(true);
    try {
      const { data } = await axios.post(`/api/server-properties`, {
        serverId,
        content: editedProperties,
      });
      if (data.ok) {
        setServerProperties(editedProperties);
        alert("server.properties saved successfully! Restart the server for changes to take effect.");
      }
    } catch (error) {
      console.error("Error saving server.properties:", error);
      alert("Failed to save server.properties");
    } finally {
      setSavingProperties(false);
    }
  };

  const fetchWhitelist = async () => {
    setLoadingWhitelist(true);
    try {
      const { data } = await axios.get(`/api/whitelist?id=${serverId}`);
      if (data.ok) {
        setWhitelist(data.whitelist);
      }
    } catch (error) {
      console.error("Error fetching whitelist:", error);
    } finally {
      setLoadingWhitelist(false);
    }
  };

  const addToWhitelist = async () => {
    if (!newWhitelistPlayer.trim()) return;
    
    try {
      const { data } = await axios.post(`/api/whitelist`, {
        serverId,
        action: "add",
        name: newWhitelistPlayer.trim(),
      });
      if (data.ok) {
        setNewWhitelistPlayer("");
        fetchWhitelist();
      }
    } catch (error) {
      console.error("Error adding to whitelist:", error);
      alert("Failed to add player to whitelist");
    }
  };

  const removeFromWhitelist = async (name: string) => {
    try {
      const { data } = await axios.post(`/api/whitelist`, {
        serverId,
        action: "remove",
        name,
      });
      if (data.ok) {
        fetchWhitelist();
      }
    } catch (error) {
      console.error("Error removing from whitelist:", error);
      alert("Failed to remove player from whitelist");
    }
  };

  const fetchOps = async () => {
    setLoadingOps(true);
    try {
      const { data } = await axios.get(`/api/ops?id=${serverId}`);
      if (data.ok) {
        setOps(data.ops);
      }
    } catch (error) {
      console.error("Error fetching ops:", error);
    } finally {
      setLoadingOps(false);
    }
  };

  const addToOps = async () => {
    if (!newOpPlayer.trim()) return;
    
    try {
      const { data } = await axios.post(`/api/ops`, {
        serverId,
        action: "add",
        name: newOpPlayer.trim(),
        level: newOpLevel,
      });
      if (data.ok) {
        setNewOpPlayer("");
        fetchOps();
      }
    } catch (error) {
      console.error("Error adding to ops:", error);
      alert("Failed to add player to ops");
    }
  };

  const removeFromOps = async (name: string) => {
    try {
      const { data } = await axios.post(`/api/ops`, {
        serverId,
        action: "remove",
        name,
      });
      if (data.ok) {
        fetchOps();
      }
    } catch (error) {
      console.error("Error removing from ops:", error);
      alert("Failed to remove player from ops");
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen relative">
        <PanelSidebar session={session} />
        <div className="flex-1 bg-[#0b1019] h-full p-8">
          <div className="text-white">Loading...</div>
        </div>
      </div>
    );
  }

  if (!serverInfo) {
    return (
      <div className="flex h-screen relative">
        <PanelSidebar session={session} />
        <div className="flex-1 bg-[#0b1019] h-full p-8">
          <div className="text-white">Server not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen relative">
      <PanelSidebar session={session} />
      <div className="flex-1 bg-[#0b1019] h-full overflow-auto">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-white text-2xl mb-2">{serverInfo.name}</h1>
            <p className="text-zinc-400 text-sm">{serverInfo.description || "No description"}</p>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mb-6 border-b border-zinc-700">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-4 py-2 ${
                activeTab === "overview"
                  ? "text-blue-400 border-b-2 border-blue-400"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("files")}
              className={`px-4 py-2 ${
                activeTab === "files"
                  ? "text-blue-400 border-b-2 border-blue-400"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Files
            </button>
            <button
              onClick={() => setActiveTab("properties")}
              className={`px-4 py-2 ${
                activeTab === "properties"
                  ? "text-blue-400 border-b-2 border-blue-400"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Server Properties
            </button>
            <button
              onClick={() => setActiveTab("whitelist")}
              className={`px-4 py-2 ${
                activeTab === "whitelist"
                  ? "text-blue-400 border-b-2 border-blue-400"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Whitelist
            </button>
            <button
              onClick={() => setActiveTab("ops")}
              className={`px-4 py-2 ${
                activeTab === "ops"
                  ? "text-blue-400 border-b-2 border-blue-400"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              OPs
            </button>
          </div>

          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="bg-[#0c1320] rounded-md p-6">
                <h2 className="text-white text-lg mb-4">Server Information</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-zinc-400 text-sm">Server Type</p>
                    <p className="text-white">{serverInfo.serverType}</p>
                  </div>
                  <div>
                    <p className="text-zinc-400 text-sm">Version</p>
                    <p className="text-white">{serverInfo.version}</p>
                  </div>
                  <div>
                    <p className="text-zinc-400 text-sm">IP Address</p>
                    <p className="text-white">{serverInfo.ipAddress}:{serverInfo.port}</p>
                  </div>
                  <div>
                    <p className="text-zinc-400 text-sm">Status</p>
                    <p className={`${containerInfo?.running ? "text-green-400" : "text-red-400"}`}>
                      {containerInfo?.status || serverInfo.status}
                    </p>
                  </div>
                  <div>
                    <p className="text-zinc-400 text-sm">Memory</p>
                    <p className="text-white">
                      {serverInfo.minMemoryMB} - {serverInfo.maxMemoryMB}
                    </p>
                  </div>
                  <div>
                    <p className="text-zinc-400 text-sm">Players Online</p>
                    <p className="text-white">
                      {playerCount} / {maxPlayers}
                    </p>
                  </div>
                  <div>
                    <p className="text-zinc-400 text-sm">Container Name</p>
                    <p className="text-white">{serverInfo.containerName}</p>
                  </div>
                  <div>
                    <p className="text-zinc-400 text-sm">Volume Name</p>
                    <p className="text-white">{serverInfo.volumeName}</p>
                  </div>
                </div>
              </div>

              {containerInfo && (
                <div className="bg-[#0c1320] rounded-md p-6">
                  <h2 className="text-white text-lg mb-4">Container Status</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-zinc-400 text-sm">Running</p>
                      <p className="text-white">{containerInfo.running ? "Yes" : "No"}</p>
                    </div>
                    <div>
                      <p className="text-zinc-400 text-sm">Status</p>
                      <p className="text-white">{containerInfo.status}</p>
                    </div>
                    {containerInfo.running && (
                      <div>
                        <p className="text-zinc-400 text-sm">Started At</p>
                        <p className="text-white">{new Date(containerInfo.startedAt).toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Files Tab */}
          {activeTab === "files" && (
            <div className="bg-[#0c1320] rounded-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white text-lg">File Browser</h2>
                <div className="text-zinc-400 text-sm">{currentPath}</div>
              </div>
              
              {loadingFiles ? (
                <div className="text-zinc-400">Loading...</div>
              ) : (
                <div className="space-y-2">
                  {currentPath !== "/data" && (
                    <div
                      onClick={() => {
                        const parentPath = currentPath.split("/").slice(0, -1).join("/") || "/data";
                        fetchFiles(parentPath);
                      }}
                      className="flex items-center gap-2 p-2 hover:bg-[#0b1624] rounded cursor-pointer"
                    >
                      <span className="text-blue-400">📁</span>
                      <span className="text-white">..</span>
                    </div>
                  )}
                  {files.map((file, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        if (file.isDirectory) {
                          const newPath = `${currentPath}/${file.name}`.replace("//", "/");
                          fetchFiles(newPath);
                        }
                      }}
                      className="flex items-center justify-between p-2 hover:bg-[#0b1624] rounded cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span>{file.isDirectory ? "📁" : "📄"}</span>
                        <span className="text-white">{file.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-zinc-400 text-sm">{file.size}</span>
                        <span className="text-zinc-400 text-sm font-mono">{file.permissions}</span>
                      </div>
                    </div>
                  ))}
                  {files.length === 0 && (
                    <div className="text-zinc-400">No files found</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Properties Tab */}
          {activeTab === "properties" && (
            <div className="bg-[#0c1320] rounded-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white text-lg">Server Properties</h2>
                <button
                  onClick={saveServerProperties}
                  disabled={savingProperties || editedProperties === serverProperties}
                  className="px-4 py-2 bg-blue-500 rounded-md hover:bg-blue-500/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingProperties ? "Saving..." : "Save Changes"}
                </button>
              </div>
              
              {loadingProperties ? (
                <div className="text-zinc-400">Loading...</div>
              ) : (
                <textarea
                  value={editedProperties}
                  onChange={(e) => setEditedProperties(e.target.value)}
                  className="w-full h-96 p-4 bg-[#0b1624] text-white font-mono text-sm rounded outline-none"
                  spellCheck={false}
                />
              )}
              
              <p className="text-zinc-400 text-sm mt-2">
                Note: Changes will take effect after server restart
              </p>
            </div>
          )}

          {/* Whitelist Tab */}
          {activeTab === "whitelist" && (
            <div className="bg-[#0c1320] rounded-md p-6">
              <h2 className="text-white text-lg mb-4">Whitelist Management</h2>
              
              <div className="flex gap-2 mb-6">
                <input
                  type="text"
                  value={newWhitelistPlayer}
                  onChange={(e) => setNewWhitelistPlayer(e.target.value)}
                  placeholder="Player name"
                  className="flex-1 p-2 bg-[#0b1624] text-white rounded outline-none"
                  onKeyPress={(e) => e.key === "Enter" && addToWhitelist()}
                />
                <button
                  onClick={addToWhitelist}
                  className="px-4 py-2 bg-green-500 rounded-md hover:bg-green-500/80 transition-all"
                >
                  Add Player
                </button>
              </div>

              {loadingWhitelist ? (
                <div className="text-zinc-400">Loading...</div>
              ) : (
                <div className="space-y-2">
                  {whitelist.map((player, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-[#0b1624] rounded"
                    >
                      <div>
                        <p className="text-white">{player.name}</p>
                        {player.uuid && (
                          <p className="text-zinc-400 text-xs font-mono">{player.uuid}</p>
                        )}
                      </div>
                      <button
                        onClick={() => removeFromWhitelist(player.name)}
                        className="px-3 py-1 bg-red-500 rounded-md hover:bg-red-500/80 transition-all"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  {whitelist.length === 0 && (
                    <div className="text-zinc-400">No players in whitelist</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* OPs Tab */}
          {activeTab === "ops" && (
            <div className="bg-[#0c1320] rounded-md p-6">
              <h2 className="text-white text-lg mb-4">Server Operators (OPs)</h2>
              
              <div className="flex gap-2 mb-6">
                <input
                  type="text"
                  value={newOpPlayer}
                  onChange={(e) => setNewOpPlayer(e.target.value)}
                  placeholder="Player name"
                  className="flex-1 p-2 bg-[#0b1624] text-white rounded outline-none"
                  onKeyPress={(e) => e.key === "Enter" && addToOps()}
                />
                <select
                  value={newOpLevel}
                  onChange={(e) => setNewOpLevel(parseInt(e.target.value))}
                  className="p-2 bg-[#0b1624] text-white rounded outline-none"
                >
                  <option value={1}>Level 1</option>
                  <option value={2}>Level 2</option>
                  <option value={3}>Level 3</option>
                  <option value={4}>Level 4</option>
                </select>
                <button
                  onClick={addToOps}
                  className="px-4 py-2 bg-green-500 rounded-md hover:bg-green-500/80 transition-all"
                >
                  Add OP
                </button>
              </div>

              {loadingOps ? (
                <div className="text-zinc-400">Loading...</div>
              ) : (
                <div className="space-y-2">
                  {ops.map((player, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-[#0b1624] rounded"
                    >
                      <div>
                        <p className="text-white">{player.name}</p>
                        <div className="flex gap-4 mt-1">
                          {player.uuid && (
                            <p className="text-zinc-400 text-xs font-mono">{player.uuid}</p>
                          )}
                          <p className="text-zinc-400 text-xs">Level: {player.level}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFromOps(player.name)}
                        className="px-3 py-1 bg-red-500 rounded-md hover:bg-red-500/80 transition-all"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  {ops.length === 0 && (
                    <div className="text-zinc-400">No server operators</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
