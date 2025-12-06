import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  // Use relative URL so it works on any domain
  baseURL: typeof window !== "undefined" ? window.location.origin : "",
});

export const { signIn, signOut, useSession } = authClient;
