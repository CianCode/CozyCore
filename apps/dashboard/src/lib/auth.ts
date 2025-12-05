import { accounts, db, sessions, users, verifications } from "@cozycore/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

if (!(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET)) {
  throw new Error("Missing Discord OAuth environment variables");
}

export const auth = betterAuth({
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
});

export type Session = typeof auth.$Infer.Session;
