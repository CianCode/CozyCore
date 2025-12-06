export const dynamic = "force-dynamic";

export default function TestPage() {
  console.log("[TestPage] ===== LOADED =====");
  return (
    <div>
      <h1>Test Page Works!</h1>
      <p>If you see this, routing is working.</p>
    </div>
  );
}
