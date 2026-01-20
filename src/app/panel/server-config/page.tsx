import ServerConfigPage from "@/app/pages/ServerConfigPage";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export default async function ServerConfig() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return (
    <>
      <ServerConfigPage session={session} />
    </>
  );
}
