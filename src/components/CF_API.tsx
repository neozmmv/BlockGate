"use client";
import { Check } from "lucide-react";
import { useState, useEffect } from "react";
import axios from "axios";
import { set } from "zod";

export default function CFAPI() {
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        const res = await axios.get("/api/cfapi");
        if (res.data.apiKey) {
          setApiKey(res.data.apiKey);
        }
      } catch (error) {
        console.error("Error fetching API key:", error);
      }
    };
    fetchApiKey();
  }, []);
  const handleApiKeySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey || apiKey.trim() === "" || apiKey.trim().length < 10) {
      setError(true);
      return;
    }
    const res = await axios.post("/api/cfapi", {
      apiKey,
    });
    setError(false);
    console.log(res.data);
  };
  return (
    <>
      {error && (
        <p className="text-red-500">CurseForge API is invalid or missing!</p>
      )}
      <form className="flex items-center">
        <input
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          type="text"
          placeholder="Your API Key"
          className="mt-2 p-2 rounded-md bg-[#1e1e2f] border border-[#444654] text-white"
        />
        <button
          onClick={(e) => handleApiKeySubmit(e)}
          className="ml-4 mt-2 p-2 rounded-sm bg-blue-500 hover:cursor-pointer hover:bg-blue-600 transition-all"
        >
          <Check className="hover:scale-110 transition-all" />
        </button>
      </form>
    </>
  );
}
