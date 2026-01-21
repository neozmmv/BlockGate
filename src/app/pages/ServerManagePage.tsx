import PanelSidebar from "@/components/PanelSidebar";
import ServerManageClient from "@/components/ServerManageClient";
import { redirect } from "next/navigation";

export default function ServerManagePage({
  session,
  serverId,
}: {
  session: any;
  serverId: string;
}) {
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen relative">
      <PanelSidebar session={session} />
      <ServerManageClient serverId={serverId} />
    </div>
  );
}
