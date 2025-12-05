import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth";
import type { NextRequest } from "next/server";

// Lazy handler creation to avoid build-time initialization
let handler: ReturnType<typeof toNextJsHandler> | null = null;

function getHandler() {
  if (!handler) {
    handler = toNextJsHandler(getAuth());
  }
  return handler;
}

export async function GET(request: NextRequest) {
  return getHandler().GET(request);
}

export async function POST(request: NextRequest) {
  return getHandler().POST(request);
}
