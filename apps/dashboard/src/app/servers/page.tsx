import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { UserNav } from "@/components/user-nav";
import { getAuth } from "@/lib/auth";
import { ServersGrid } from "./servers-grid";

// Force dynamic rendering to avoid build-time auth initialization
export const dynamic = "force-dynamic";

export default async function ServersPage() {
  console.log("[ServersPage] ===== PAGE LOAD START =====");
  
  let headersList;
  try {
    headersList = await headers();
    console.log("[ServersPage] Headers retrieved");
  } catch (error) {
    console.error("[ServersPage] Headers error:", error);
    throw error;
  }
  
  // Debug: log cookies being sent
  const cookies = headersList.get("cookie");
  console.log("[ServersPage] Cookies present:", cookies ? "yes" : "no");
  
  let session = null;
  try {
    session = await getAuth().api.getSession({
      headers: headersList,
    });
    console.log("[ServersPage] Session:", session ? `found (user: ${session.user?.email})` : "not found");
  } catch (error) {
    console.error("[ServersPage] Session error:", error);
    redirect("/");
  }

  if (!session) {
    console.log("[ServersPage] No session, redirecting to /");
    redirect("/");
  }
  
  console.log("[ServersPage] Rendering page for user:", session.user?.email);

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <svg
              aria-hidden="true"
              className="h-8 w-8 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M13 10V3L4 14h7v7l9-11h-7z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
            <span className="font-bold text-xl">CozyCore</span>
          </div>
          <UserNav user={session.user} />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="font-bold text-3xl">Select a Server</h1>
          <p className="text-muted-foreground">
            Choose a server to manage or invite the bot to a new server.
          </p>
        </div>

        <ServersGrid />
      </main>
    </div>
  );
}
