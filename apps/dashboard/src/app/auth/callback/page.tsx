"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check if there's an error from the OAuth flow
    const error = searchParams.get("error");
    if (error) {
      console.error("Auth error:", error);
      router.push("/?error=" + error);
      return;
    }

    // Redirect to servers page after a short delay
    const timer = setTimeout(() => {
      router.replace("/servers");
    }, 500);

    return () => clearTimeout(timer);
  }, [router, searchParams]);

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="font-bold text-2xl">
          Authenticating...
        </CardTitle>
        <CardDescription>
          Please wait while we connect your Discord account.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center justify-center gap-2">
          <Skeleton className="h-4 w-4 animate-pulse rounded-full" />
          <Skeleton className="h-4 w-4 animate-pulse rounded-full delay-150" />
          <Skeleton className="h-4 w-4 animate-pulse rounded-full delay-300" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function AuthCallbackPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <Suspense fallback={
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="font-bold text-2xl">Loading...</CardTitle>
          </CardHeader>
        </Card>
      }>
        <CallbackContent />
      </Suspense>
    </main>
  );
}
