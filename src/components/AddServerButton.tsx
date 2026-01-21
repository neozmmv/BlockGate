"use client";
import { useState, useEffect } from "react";
import axios from "axios";

export default function AddServerButton({ session }: { session?: any }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [versions, setVersions] = useState([]);
  const [serverName, setServerName] = useState("");
  const [type, setType] = useState("VANILLA");
  const [version, setVersion] = useState("LATEST");
  const [eula, setEula] = useState(true);
  const [initMemory, setInitMemory] = useState("2G");
  const [maxMemory, setMaxMemory] = useState("4G");
  const [cfApi, setCfApi] = useState<string | null>(null);
  const [port, setPort] = useState("25565");
  const [cfPageUrl, setCfPageUrl] = useState("");
  const [javaVersion, setJavaVersion] = useState("17");

  useEffect(() => {
    const fetchVersions = async () => {
      try {
        const response = await axios.get(
          "https://mc-versions-api.net/api/java",
        );
        const cfApiResponse = await axios.get("/api/cfapi");
        if (cfApiResponse.data.ok) {
          setCfApi(cfApiResponse.data.apiKey);
        } else {
          setCfApi(null);
        }
        setVersions(response.data.result);
      } catch (error) {
        console.error("Error fetching versions:", error);
      }
    };
    fetchVersions();
  }, []);
  const handleOpenModal = () => setIsModalOpen((v) => !v);

  const handleServerCreate = async () => {
    const payload = {
      metadata: {
        serverName,
      },
      versioning: {
        type,
        version,
      },
      runtime: {
        eula,
        memory: {
          init: initMemory,
          max: maxMemory,
        },
        java: {
          version: javaVersion,
        },
      },
      network: {
        serverPort: parseInt(port),
      },
      ...(type === "AUTO_CURSEFORGE" && { CF_PAGE_URL: cfPageUrl }),
    };
    const res = await axios.post("/api/servers", payload);
    console.log(res.data);
    setIsModalOpen(false);

    // Trigger a page refresh to show the new server
    window.location.reload();
  };

  return (
    <>
      <button
        onClick={handleOpenModal}
        className="px-4 py-2 bg-blue-500 rounded-md cursor-pointer hover:bg-blue-500/50 transition-all"
      >
        Create New Server
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsModalOpen(false)}
          />

          {/* Modal Content */}
          <div className="relative z-10 w-full max-w-lg rounded-xl bg-[#0c1320] p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white text-lg">Create server</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-white cursor-pointer"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 flex flex-col">
              <label className="block text-sm text-zinc-300">
                Server name
                <input
                  value={serverName}
                  onChange={(e) => setServerName(e.target.value)}
                  className="mt-1 w-full rounded-md bg-[#0b1624] text-white p-2 outline-none"
                />
              </label>
              <div className="flex justify-between">
                <label className="block text-sm text-zinc-300">
                  Type
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="mt-1 w-full rounded-md bg-[#0b1624] text-white p-2 outline-none"
                  >
                    {/* NEED TO ADD OPTION TO SEARCH CURSEFORGE MODPACKS AND CREATE THE CONTAINER
                      DOCS: https://docs.curseforge.com/rest-api/
                      SEND x-api-key IN HEADERS (CF_API)
                    */}
                    <option value="VANILLA">Vanilla</option>
                    <option value="FORGE">Forge</option>
                    <option value="FABRIC">Fabric</option>
                    <option value="NEOFORGE">NeoForge</option>
                    <option value="SPIGOT">Spigot</option>
                    <option value="PAPER">Paper</option>
                    <option value="AUTO_CURSEFORGE">CurseForge Modpack</option>
                  </select>
                </label>
                {type !== "AUTO_CURSEFORGE" && (
                  <label className="block text-sm text-zinc-300">
                    Version
                    <select
                      value={version}
                      onChange={(e) => setVersion(e.target.value)}
                      className="mt-1 w-full rounded-md bg-[#0b1624] text-white p-2 outline-none"
                    >
                      <option value="LATEST">Latest</option>
                      {versions.map((ver) => (
                        <option key={ver} value={ver}>
                          {ver}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
              {type === "AUTO_CURSEFORGE" && (
                <div>
                  {!cfApi && (
                    <p className="text-red-500 text-sm mb-2">
                      You need to set your CurseForge API key in General
                    </p>
                  )}
                  <label className="block text-sm text-zinc-300">
                    Modpack URL
                  </label>
                  <input
                    value={cfPageUrl}
                    onChange={(e) => setCfPageUrl(e.target.value)}
                    placeholder="https://www.curseforge.com/minecraft/modpacks/..."
                    className="mt-1 w-full rounded-md bg-[#0b1624] text-white p-2 outline-none"
                  />
                </div>
              )}
              {(type === "FORGE" ||
                type === "NEOFORGE" ||
                type === "AUTO_CURSEFORGE") && (
                <label className="block text-sm text-zinc-300">
                  Java Version
                  <select
                    value={javaVersion}
                    onChange={(e) => setJavaVersion(e.target.value)}
                    className="mt-1 w-full rounded-md bg-[#0b1624] text-white p-2 outline-none"
                  >
                    <option value="8">
                      Java 8 (Legacy Forge 1.12 and older)
                    </option>
                    <option value="17">Java 17 (Modern versions 1.17+)</option>
                    <option value="21">Java 21 (Latest 1.20.5+)</option>
                  </select>
                  <p className="text-zinc-400 text-xs mt-1">
                    Select the correct Java version for your Minecraft/Forge
                    version
                  </p>
                </label>
              )}
              <label className="block text-sm text-zinc-300">
                Server Port
                <input
                  type="number"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  min="1024"
                  max="65535"
                  className="mt-1 w-full rounded-md bg-[#0b1624] text-white p-2 outline-none"
                />
              </label>
              <div className="flex gap-4">
                <label className="block text-sm text-zinc-300 flex-1">
                  Initial Memory
                  <input
                    type="text"
                    value={initMemory}
                    onChange={(e) => setInitMemory(e.target.value)}
                    placeholder="2G"
                    className="mt-1 w-full rounded-md bg-[#0b1624] text-white p-2 outline-none"
                  />
                  <p className="text-zinc-400 text-xs mt-1">
                    e.g., 1G, 2G, 512M
                  </p>
                </label>
                <label className="block text-sm text-zinc-300 flex-1">
                  Maximum Memory
                  <input
                    type="text"
                    value={maxMemory}
                    onChange={(e) => setMaxMemory(e.target.value)}
                    placeholder="4G"
                    className="mt-1 w-full rounded-md bg-[#0b1624] text-white p-2 outline-none"
                  />
                  <p className="text-zinc-400 text-xs mt-1">
                    e.g., 4G, 8G, 16G
                  </p>
                </label>
              </div>
              <div className="flex justify-end mt-4">
                <button
                  onClick={handleServerCreate}
                  className="cursor-pointer justify-end bg-blue-500 text-white px-4 py-2 rounded-md"
                  disabled={!cfApi && type === "AUTO_CURSEFORGE"}
                >
                  Create Server
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
