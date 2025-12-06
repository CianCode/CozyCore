import { toNextJsHandler } from "better-auth/next-js";
import type { NextRequest } from "next/server";
import { getAuth } from "@/lib/auth";

// Force dynamic to ensure proper cookie handling
export const dynamic = "force-dynamic";

// Lazy handler creation to avoid build-time initialization
let handler: ReturnType<typeof toNextJsHandler> | null = null;

function getHandler() {
  if (!handler) {
    handler = toNextJsHandler(getAuth());
  }
  return handler;
}

export async function GET(request: NextRequest) {
  console.log("[Auth] GET request:", request.nextUrl.pathname);
  const response = await getHandler().GET(request);
  console.log("[Auth] Response status:", response.status);
  return response;
}

export async function POST(request: NextRequest) {
  console.log("[Auth] POST request:", request.nextUrl.pathname);
  const response = await getHandler().POST(request);
  console.log("[Auth] Response status:", response.status);
  return response;
}
