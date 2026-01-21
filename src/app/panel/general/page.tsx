import PanelSidebar from "@/components/PanelSidebar";
import options from "../../../../SidebarPages";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import GeneralPage from "@/app/pages/GeneralPage";

export default async function General() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return (
    <>
      <GeneralPage session={session} />
    </>
  );
}
