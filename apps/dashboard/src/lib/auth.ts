import { accounts, db, sessions, users, verifications } from "@cozycore/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

// Lazy initialization to avoid errors during Next.js build
let _auth: ReturnType<typeof betterAuth> | null = null;

export function getAuth() {
  if (!_auth) {
    if (!(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET)) {
      throw new Error("Missing Discord OAuth environment variables");
    }

    const isProduction = process.env.NODE_ENV === "production";

    _auth = betterAuth({
      baseURL: process.env.BETTER_AUTH_URL,
      database: drizzleAdapter(db, {
        provider: "pg",
        schema: {
          user: users,
          session: sessions,
          account: accounts,
          verification: verifications,
        },
      }),
      socialProviders: {
        discord: {
          clientId: process.env.DISCORD_CLIENT_ID,
          clientSecret: process.env.DISCORD_CLIENT_SECRET,
          scope: ["identify", "email", "guilds"],
        },
      },
      session: {
        expiresIn: 60 * 60 * 24 * 7, // 7 days
        updateAge: 60 * 60 * 24, // 1 day
        cookieCache: {
          enabled: true,
          maxAge: 5 * 60, // 5 minutes
        },
      },
      advanced: {
        useSecureCookies: isProduction,
        crossSubDomainCookies: {
          enabled: false,
        },
      },
      trustedOrigins: [process.env.BETTER_AUTH_URL || "http://localhost:3000"],
    });
  }
  return _auth;
}

// Export auth for use in components that access properties
export const auth = new Proxy({} as ReturnType<typeof betterAuth>, {
  get(_target, prop) {
    return (getAuth() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export type Session = typeof auth.$Infer.Session;
