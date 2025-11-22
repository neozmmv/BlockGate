// NEVER USE CLIENT ON THESE PAGES
import { Check } from "lucide-react";
import PanelSidebar from "@/components/PanelSidebar";
import { redirect } from "next/navigation";
import CFAPI from "@/components/CF_API";

export default function GeneralPage({ session }: { session: any }) {
  const handleModal = () => {};
  if (!session) {
    redirect("/login");
  }
  return (
    <div className="flex h-screen relative">
      <PanelSidebar session={session} />
      <div className="flex-1 bg-[#0b1019] h-full p-8">
        <div>
          <h1 className="text-2xl text-white">General Options</h1>
        </div>
        <div className="mt-8">
          <p className="my-1">CurseForge API Key</p>
          <p className="text-gray-500 my-1">
            Get your API key from the{" "}
            <a
              href="https://console.curseforge.com/#/api-keys"
              className="underline hover:text-gray-200"
            >
              CurseForge
            </a>{" "}
            website
          </p>
          <CFAPI />
        </div>
      </div>
    </div>
  );
}
