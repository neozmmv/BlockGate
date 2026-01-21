"use client";
import Navbar from "@/components/Navbar";
import { Input } from "@/components/ui/input";
import Footer from "@/components/Footer";
import { useState } from "react";
import { z } from "zod";
import { signIn } from "@/lib/actions/auth-actions";
import { redirect } from "next/navigation";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const userSchema = z.object({
    email: z.email(),
    password: z.string().min(3, "Password must be at least 3 characters long"),
  });

  const handleInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const userInfo = userSchema.parse({ email, password });
      const result = await signIn(userInfo.email, userInfo.password);
      if (!result.user) {
        alert("Login failed!");
      }
    } catch (e) {
      // validating input
      if (e instanceof z.ZodError && e.issues && e.issues.length > 0) {
        alert(e.issues[0]?.message);
      } else {
        alert("An unexpected error occurred");
      }
    }
    redirect("/panel");
  };

  return (
    <>
      <Navbar />
      <div className={`bg-[#141b2a] h-screen w-full md:pt-24`}>
        <div className="mx-auto md:w-7xl">
          <p className="text-4xl text-center mt-28 text-white">Login</p>
          <p className="text-center text-zinc-400 pt-2 mb-12">
            To start hosting your Minecraft server
          </p>
          <div className="flex justify-center items-center">
            <div className="border border-zinc-700 h-48 w-96 md:h-72 md:w-172 bg-[#1c2536] rounded-2xl drop-shadow-xl flex flex-col justify-between">
              <form onSubmit={handleInfo}>
                <div className="px-8 pt-8">
                  User
                  <Input
                    className="border-zinc-500 mt-2 mb-4"
                    placeholder="admin@example.com"
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  Password
                  <Input
                    className="border-zinc-500 mt-2"
                    type="password"
                    placeholder="**********"
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div className="gap-8 rounded-b-xl h-28 flex items-center justify-center">
                  <button
                    type="submit"
                    className="px-8 py-4 text-xl bg-blue-500 rounded-xl text-md cursor-pointer hover:bg-blue-600 transition-all"
                  >
                    Log In
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
