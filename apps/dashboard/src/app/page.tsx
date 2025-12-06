import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SignInButton } from "@/components/sign-in-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAuth } from "@/lib/auth";

// Force dynamic rendering to avoid build-time auth initialization
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const headersList = await headers();
  
  // Debug: log cookies being sent
  const cookies = headersList.get("cookie");
  console.log("[HomePage] Cookies present:", cookies ? "yes" : "no");
  
  let session = null;
  try {
    session = await getAuth().api.getSession({
      headers: headersList,
    });
    console.log("[HomePage] Session:", session ? "found" : "not found");
  } catch (error) {
    console.error("[HomePage] Session error:", error);
  }

  if (session) {
    redirect("/servers");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
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
          </div>
          <CardTitle className="font-bold text-2xl">CozyCore</CardTitle>
          <CardDescription>
            The cozy Discord bot for your server. Manage settings, view stats,
            and more from your dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <SignInButton />
          <p className="text-center text-muted-foreground text-sm">
            By connecting, you agree to our Terms of Service and Privacy Policy.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
