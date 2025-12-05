import { drizzle } from "drizzle-orm/node-postgres";
import {
  accounts,
  guilds,
  levelConfig,
  levelRoles,
  memberXp,
  onboardingConfig,
  onboardingThreads,
  savedEmbedMessages,
  sessions,
  users,
  verifications,
  welcomeMessages,
} from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

export const db = drizzle(process.env.DATABASE_URL, {
  schema: {
    accounts,
    guilds,
    levelConfig,
    levelRoles,
    memberXp,
    onboardingConfig,
    onboardingThreads,
    savedEmbedMessages,
    sessions,
    users,
    verifications,
    welcomeMessages,
  },
});

export type { InferInsertModel, InferSelectModel } from "drizzle-orm";
// biome-ignore lint/performance/noBarrelFile: This is a shared package that needs to re-export schema types
export {
  type Account,
  accounts,
  type EmbedAuthor,
  type EmbedData,
  type EmbedField,
  type EmbedFooter,
  type Guild,
  type GuildSettings,
  guilds,
  type LevelConfigDb,
  type LevelRoleDb,
  levelConfig,
  levelRoles,
  type MemberXp,
  memberXp,
  type NewAccount,
  type NewGuild,
  type NewLevelConfig,
  type NewLevelRole,
  type NewMemberXp,
  type NewOnboardingConfig,
  type NewOnboardingThread,
  type NewSavedEmbedMessage,
  type NewSession,
  type NewUser,
  type NewWelcomeMessage,
  type OnboardingConfig,
  type OnboardingThread,
  onboardingConfig,
  onboardingThreads,
  type SavedEmbedMessage,
  type Session,
  savedEmbedMessages,
  sessions,
  type User,
  users,
  verifications,
  type WelcomeMessage,
  welcomeMessages,
} from "./schema";
