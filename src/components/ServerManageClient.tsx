"use client";
import { useState, useEffect } from "react";
import axios from "axios";

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

export default function ServerManageClient({
  serverId,
}: {
  serverId: string;
}) {
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [containerInfo, setContainerInfo] = useState<ContainerInfo | null>(null);
  const [playerCount, setPlayerCount] = useState(0);
  const [maxPlayers, setMaxPlayers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "files" | "properties" | "whitelist" | "ops" | "rcon" | "logs">("overview");
  
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

  // File editor state
  const [fileEditorOpen, setFileEditorOpen] = useState(false);
  const [editingFilePath, setEditingFilePath] = useState("");
  const [editingFileContent, setEditingFileContent] = useState("");
  const [savingFile, setSavingFile] = useState(false);

  // RCON state
  const [rconCommand, setRconCommand] = useState("");
  const [rconOutput, setRconOutput] = useState<string[]>([]);
  const [sendingRcon, setSendingRcon] = useState(false);
  const [rconLogsEnabled, setRconLogsEnabled] = useState(true);
  const [lastLogTimestamp, setLastLogTimestamp] = useState<string | null>(null);

  // Logs state
  const [logs, setLogs] = useState("");
  const [loadingLogs, setLoadingLogs] = useState(false);

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
    } else if (activeTab === "logs") {
      fetchLogs();
    } else if (activeTab === "rcon") {
      // Start streaming logs when RCON tab is active
      if (rconLogsEnabled) {
        const interval = setInterval(() => {
          fetchLogsForRcon();
        }, 2000); // Poll every 2 seconds
        return () => clearInterval(interval);
      }
    }
  }, [activeTab, rconLogsEnabled]);

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

  const openFileEditor = async (filePath: string) => {
    try {
      const { data } = await axios.get(`/api/file-content?id=${serverId}&path=${encodeURIComponent(filePath)}`);
      if (data.ok) {
        setEditingFilePath(filePath);
        setEditingFileContent(data.content);
        setFileEditorOpen(true);
      }
    } catch (error) {
      console.error("Error loading file:", error);
      alert("Failed to load file");
    }
  };

  const saveFile = async () => {
    setSavingFile(true);
    try {
      const { data } = await axios.post(`/api/file-content`, {
        serverId,
        filePath: editingFilePath,
        content: editingFileContent,
      });
      if (data.ok) {
        alert("File saved successfully!");
        setFileEditorOpen(false);
      }
    } catch (error) {
      console.error("Error saving file:", error);
      alert("Failed to save file");
    } finally {
      setSavingFile(false);
    }
  };

  const sendRconCommand = async () => {
    if (!rconCommand.trim()) return;
    
    setSendingRcon(true);
    try {
      const { data } = await axios.post(`/api/rcon`, {
        serverId,
        command: rconCommand.trim(),
      });
      if (data.ok) {
        setRconOutput(prev => [...prev, `> ${rconCommand}`, data.response]);
        setRconCommand("");
      } else {
        setRconOutput(prev => [...prev, `> ${rconCommand}`, `Error: ${data.error}`]);
      }
    } catch (error: any) {
      setRconOutput(prev => [...prev, `> ${rconCommand}`, `Error: ${error.message}`]);
    } finally {
      setSendingRcon(false);
    }
  };

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const { data } = await axios.get(`/api/logs?id=${serverId}&tail=200`);
      if (data.ok) {
        setLogs(data.logs);
      }
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoadingLogs(false);
    }
  };

  const fetchLogsForRcon = async () => {
    try {
      const { data } = await axios.get(`/api/logs?id=${serverId}&tail=50`);
      if (data.ok && data.logs) {
        // Parse log lines and append new ones to RCON output
        const logLines = data.logs.split('\n').filter((line: string) => line.trim());
        
        // Get the last few log lines that haven't been shown yet
        const newLines = logLines.slice(-10); // Show last 10 lines
        
        // Only add if there are new lines and they're different from what we have
        if (newLines.length > 0) {
          const lastOutputLine = rconOutput[rconOutput.length - 1];
          const lastLogLine = newLines[newLines.length - 1];
          
          // Only append if the last log line is different from our last output
          if (lastOutputLine !== lastLogLine) {
            setRconOutput(prev => {
              // Keep last 100 lines to prevent memory issues
              const combined = [...prev, ...newLines.map(line => `[LOG] ${line}`)];
              return combined.slice(-100);
            });
          }
        }
      }
    } catch (error) {
      // Silently fail for background polling
      console.error("Error fetching logs for RCON:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 bg-[#0b1019] h-full p-8">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!serverInfo) {
    return (
      <div className="flex-1 bg-[#0b1019] h-full p-8">
        <div className="text-white">Server not found</div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[#0b1019] h-full overflow-auto">
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-white text-2xl mb-2">{serverInfo.name}</h1>
          <p className="text-zinc-400 text-sm">{serverInfo.description || "No description"}</p>
        </div>

        {/* Restarting Alert */}
        {containerInfo?.status === "restarting" && (
          <div className="mb-6 bg-yellow-900/20 border border-yellow-500 rounded-md p-4">
            <div className="flex items-start gap-3">
              <span className="text-yellow-500 text-xl">⚠️</span>
              <div>
                <h3 className="text-yellow-500 font-semibold mb-1">Container is Restarting</h3>
                <p className="text-zinc-300 text-sm mb-2">
                  The server container is stuck in a restart loop. This is often caused by an incorrect Java version.
                </p>
                <p className="text-zinc-400 text-xs">
                  <strong>Common fixes:</strong>
                </p>
                <ul className="text-zinc-400 text-xs list-disc ml-4 mt-1">
                  <li>For Minecraft 1.12.2 and older Forge: Use Java 8</li>
                  <li>For Minecraft 1.17 - 1.20.4: Use Java 17</li>
                  <li>For Minecraft 1.20.5+: Use Java 21</li>
                </ul>
                <p className="text-zinc-400 text-xs mt-2">
                  You may need to recreate the server with the correct Java version.
                </p>
              </div>
            </div>
          </div>
        )}

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
          <button
            onClick={() => setActiveTab("rcon")}
            className={`px-4 py-2 ${
              activeTab === "rcon"
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            RCON
          </button>
          <button
            onClick={() => setActiveTab("logs")}
            className={`px-4 py-2 ${
              activeTab === "logs"
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Logs
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
                {currentPath !== "/data" && currentPath !== "/data/" && (
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
                {files.map((file, idx) => {
                  const isEditable = !file.isDirectory && (file.name.endsWith('.json') || file.name.endsWith('.txt'));
                  return (
                  <div
                    key={idx}
                    onClick={() => {
                      if (file.isDirectory) {
                        const newPath = `${currentPath}/${file.name}`.replace("//", "/");
                        fetchFiles(newPath);
                      } else if (isEditable) {
                        const filePath = `${currentPath}/${file.name}`.replace("//", "/");
                        openFileEditor(filePath);
                      }
                    }}
                    className={`flex items-center justify-between p-2 hover:bg-[#0b1624] rounded ${
                      file.isDirectory || isEditable ? 'cursor-pointer' : 'cursor-default'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{file.isDirectory ? "📁" : "📄"}</span>
                      <span className={`${isEditable ? 'text-blue-400' : 'text-white'}`}>
                        {file.name}
                      </span>
                      {isEditable && (
                        <span className="text-xs text-zinc-500">(editable)</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-zinc-400 text-sm">{file.size}</span>
                      <span className="text-zinc-400 text-sm font-mono">{file.permissions}</span>
                    </div>
                  </div>
                  );
                })}
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

        {/* RCON Tab */}
        {activeTab === "rcon" && (
          <div className="bg-[#0c1320] rounded-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white text-lg">RCON Console</h2>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="rcon-logs"
                  checked={rconLogsEnabled}
                  onChange={(e) => setRconLogsEnabled(e.target.checked)}
                  className="w-4 h-4 accent-blue-500"
                />
                <label htmlFor="rcon-logs" className="text-zinc-400 text-sm">
                  Stream logs in real-time
                </label>
              </div>
            </div>
            <p className="text-zinc-400 text-sm mb-4">
              Send commands to the server via RCON. Common commands: list, say, stop, whitelist, op
            </p>
            
            <div 
              className="bg-[#0b1624] rounded p-4 mb-4 h-96 overflow-y-auto"
              style={{ scrollBehavior: 'smooth' }}
              ref={(el) => {
                if (el && rconOutput.length > 0) {
                  el.scrollTop = el.scrollHeight;
                }
              }}
            >
              <div className="font-mono text-sm space-y-1">
                {rconOutput.map((line, idx) => (
                  <div 
                    key={idx} 
                    className={
                      line.startsWith('>') 
                        ? 'text-blue-400 font-bold' 
                        : line.startsWith('[LOG]')
                        ? 'text-zinc-500 text-xs'
                        : 'text-zinc-300'
                    }
                  >
                    {line}
                  </div>
                ))}
                {rconOutput.length === 0 && (
                  <div className="text-zinc-500">
                    No commands sent yet. Type a command below.
                    {rconLogsEnabled && <div className="mt-2">Container logs will stream here in real-time...</div>}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex gap-2">
              <input
                type="text"
                value={rconCommand}
                onChange={(e) => setRconCommand(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && sendRconCommand()}
                placeholder="Enter command (e.g., list, say Hello, whitelist add Steve)"
                className="flex-1 p-2 bg-[#0b1624] text-white rounded outline-none font-mono"
                disabled={sendingRcon}
              />
              <button
                onClick={sendRconCommand}
                disabled={sendingRcon || !rconCommand.trim()}
                className="px-6 py-2 bg-blue-500 rounded-md hover:bg-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sendingRcon ? "Sending..." : "Send"}
              </button>
              <button
                onClick={() => setRconOutput([])}
                className="px-4 py-2 bg-zinc-700 rounded-md hover:bg-zinc-600 transition-all"
                title="Clear console"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === "logs" && (
          <div className="bg-[#0c1320] rounded-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white text-lg">Container Logs</h2>
              <button
                onClick={fetchLogs}
                disabled={loadingLogs}
                className="px-4 py-2 bg-blue-500 rounded-md hover:bg-blue-600 transition-all disabled:opacity-50"
              >
                {loadingLogs ? "Refreshing..." : "Refresh"}
              </button>
            </div>
            
            <div className="bg-[#0b1624] rounded p-4 h-[600px] overflow-y-auto">
              <pre className="text-zinc-300 text-xs font-mono whitespace-pre-wrap">
                {logs || "No logs available"}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* File Editor Modal */}
      {fileEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setFileEditorOpen(false)}
          />
          <div className="relative z-10 w-full max-w-6xl h-[85vh] rounded-xl bg-[#0c1320] p-6 shadow-xl flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white text-lg">Editing: {editingFilePath.split('/').pop()}</h3>
              <button
                onClick={() => setFileEditorOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <p className="text-zinc-400 text-xs mb-2">Path: {editingFilePath}</p>
            <textarea
              value={editingFileContent}
              onChange={(e) => setEditingFileContent(e.target.value)}
              className="flex-1 w-full p-4 bg-[#0b1624] text-white text-sm rounded outline-none resize-none"
              style={{ fontFamily: 'ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, Consolas, "DejaVu Sans Mono", monospace' }}
              spellCheck={false}
            />
            <div className="flex gap-2 justify-end mt-4">
              <button
                onClick={() => setFileEditorOpen(false)}
                className="px-4 py-2 bg-zinc-700 rounded-md hover:bg-zinc-600 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={saveFile}
                disabled={savingFile}
                className="px-4 py-2 bg-blue-500 rounded-md hover:bg-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingFile ? "Saving..." : "Save File"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
