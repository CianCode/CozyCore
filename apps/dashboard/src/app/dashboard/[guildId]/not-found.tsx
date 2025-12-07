import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DashboardNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <h1 className="font-bold text-4xl">404</h1>
      <p className="mt-2 text-lg text-muted-foreground">Server not found</p>
      <p className="mt-1 text-muted-foreground text-sm">
        You don&apos;t have access to this server or it doesn&apos;t exist.
      </p>
      <Button asChild className="mt-6">
        <Link href="/servers">Back to Servers</Link>
      </Button>
    </div>
  );
}
