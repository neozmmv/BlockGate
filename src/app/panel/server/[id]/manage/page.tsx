import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import ServerManagePage from "@/app/pages/ServerManagePage";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ManageServerPage({ params }: Props) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const { id } = await params;

  return <ServerManagePage session={session} serverId={id} />;
}
