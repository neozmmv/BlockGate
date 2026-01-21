// NEVER USE CLIENT ON THESE PAGES
import ActiveTable from "@/components/ActiveTable";
import OfflineTable from "@/components/OfflineTable";
import AddServerButton from "@/components/AddServerButton";
import PanelSidebar from "@/components/PanelSidebar";
import { redirect } from "next/navigation";

export default function ServerPage({ session }: { session: any }) {
  const handleModal = () => {};
  if (!session) {
    redirect("/login");
  }
  return (
    <div className="flex h-screen relative">
      <PanelSidebar session={session} />
      <div className="flex-1 bg-[#0b1019] h-full p-8">
        <div className="flex justify-between mb-8">
          <h1 className="text-white text-2xl">Server Management</h1>
          <AddServerButton session={session} />
        </div>
        <div className="space-y-8">
          {/* Active servers table */}
          <div className=" bg-[#0c1320] rounded-md p-6">
            <h2 className="text-white text-lg mb-4">Active Servers</h2>
            <div className="overflow-x-auto">
              <ActiveTable />
            </div>
          </div>

          {/* Offline servers table */}
          <div className=" bg-[#0c1320] rounded-md p-6">
            <h2 className="text-white text-lg mb-4">Offline Servers</h2>
            <div className="overflow-x-auto">
              <OfflineTable />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
