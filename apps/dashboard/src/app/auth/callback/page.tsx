"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // The auth callback is handled by Better Auth automatically
    // This page just shows a loading state while redirecting
    const timer = setTimeout(() => {
      router.push("/servers");
    }, 1000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
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
    </main>
  );
}
