// Temporarily simplified for debugging
export const dynamic = "force-dynamic";

export default async function ServersPage() {
  console.log("[ServersPage] ===== SIMPLE PAGE LOAD =====");
  
  return (
    <div className="min-h-screen p-8">
      <h1 className="text-2xl font-bold">Servers Page Works!</h1>
      <p>If you see this, the /servers route is working.</p>
    </div>
  );
}

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
