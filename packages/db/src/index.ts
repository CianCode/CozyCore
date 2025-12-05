import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
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

const schema = {
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
};

// Lazy initialization to avoid errors during Next.js build
let _db: NodePgDatabase<typeof schema> | null = null;

export const db = new Proxy({} as NodePgDatabase<typeof schema>, {
  get(_target, prop) {
    if (!_db) {
      if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL environment variable is required");
      }
      _db = drizzle(process.env.DATABASE_URL, { schema });
    }
    return (_db as Record<string | symbol, unknown>)[prop];
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
