// Temporarily simplified for debugging
export const dynamic = "force-dynamic";

export default async function ServersPage() {
  console.log("[ServersPage] ===== SIMPLE PAGE LOAD =====");

  return (
    <div className="min-h-screen p-8">
      <h1 className="font-bold text-2xl">Servers Page Works!</h1>
      <p>If you see this, the /servers route is working.</p>
    </div>
  );
}
