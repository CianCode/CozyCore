import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

// Better Auth tables
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Custom tables for Discord integration
export const guilds = pgTable("guilds", {
  id: text("id").primaryKey(), // Discord guild ID
  name: text("name").notNull(),
  icon: text("icon"),
  ownerId: text("owner_id").notNull(),
  botJoinedAt: timestamp("bot_joined_at"),
  settings: jsonb("settings").$type<GuildSettings>().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type GuildSettings = {
  prefix?: string;
  welcomeChannelId?: string;
  welcomeMessage?: string;
  logChannelId?: string;
  modRoleIds?: string[];
};

// Onboarding tables
export const onboardingConfig = pgTable("onboarding_config", {
  guildId: text("guild_id")
    .primaryKey()
    .references(() => guilds.id, { onDelete: "cascade" }),
  enabled: boolean("enabled").notNull().default(false),
  welcomeChannelId: text("welcome_channel_id"),
  rolesOnJoin: jsonb("roles_on_join").$type<string[]>().default([]),
  threadAutoDelete: text("thread_auto_delete").default("1d"), // "1d" or "7d"
  typingDelay: integer("typing_delay").notNull().default(1500), // ms delay between messages
  showTypingIndicator: boolean("show_typing_indicator").notNull().default(true),
  threadNameTemplate: text("thread_name_template")
    .notNull()
    .default("Welcome {username}"), // Thread name template
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const welcomeMessages = pgTable("welcome_messages", {
  id: text("id").primaryKey(),
  guildId: text("guild_id")
    .notNull()
    .references(() => guilds.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  order: integer("order").notNull().default(0),
  selectableRoles: jsonb("selectable_roles").$type<string[]>().default([]), // Roles shown in Discord select menu
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const onboardingThreads = pgTable("onboarding_threads", {
  threadId: text("thread_id").primaryKey(),
  guildId: text("guild_id")
    .notNull()
    .references(() => guilds.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  deleteAt: timestamp("delete_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Level System tables
export const levelConfig = pgTable("level_config", {
  guildId: text("guild_id")
    .primaryKey()
    .references(() => guilds.id, { onDelete: "cascade" }),
  enabled: boolean("enabled").notNull().default(false),
  // Message XP Settings
  minXpPerMessage: integer("min_xp_per_message").notNull().default(4),
  maxXpPerMessage: integer("max_xp_per_message").notNull().default(10),
  cooldownSeconds: integer("cooldown_seconds").notNull().default(60),
  maxXpPerHour: integer("max_xp_per_hour"),
  maxXpPerHourEnabled: boolean("max_xp_per_hour_enabled")
    .notNull()
    .default(false),
  maxXpPerDay: integer("max_xp_per_day"),
  maxXpPerDayEnabled: boolean("max_xp_per_day_enabled")
    .notNull()
    .default(false),
  minMessageLength: integer("min_message_length").notNull().default(5),
  similaritySeverity: text("similarity_severity").notNull().default("medium"), // "off" | "low" | "medium" | "high" | "strict"
  whitelistedChannels: jsonb("whitelisted_channels")
    .$type<string[]>()
    .default([]),
  // Forum Thread XP Settings
  forumXpEnabled: boolean("forum_xp_enabled").notNull().default(false),
  xpOnThreadClose: integer("xp_on_thread_close").notNull().default(25),
  helperBonusXp: integer("helper_bonus_xp").notNull().default(15),
  autoArchiveHours: integer("auto_archive_hours").notNull().default(24),
  fastResolutionEnabled: boolean("fast_resolution_enabled")
    .notNull()
    .default(false),
  fastResolutionThresholdHours: integer("fast_resolution_threshold_hours")
    .notNull()
    .default(2),
  fastResolutionBonusXp: integer("fast_resolution_bonus_xp")
    .notNull()
    .default(10),
  whitelistedForums: jsonb("whitelisted_forums").$type<string[]>().default([]),
  // Role Progression
  autoRemovePreviousRole: boolean("auto_remove_previous_role")
    .notNull()
    .default(true),
  // Notification Settings
  congratsChannelId: text("congrats_channel_id"),
  demotionChannelId: text("demotion_channel_id"),
  logChannelId: text("log_channel_id"),
  // Embed Templates
  promotionEmbedTitle: text("promotion_embed_title")
    .notNull()
    .default("🎉 Level Up!"),
  promotionEmbedDescription: text("promotion_embed_description")
    .notNull()
    .default("Félicitations à {user}, il a obtenu le rôle {role}!"),
  demotionEmbedTitle: text("demotion_embed_title")
    .notNull()
    .default("⚠️ Role Change"),
  demotionEmbedDescription: text("demotion_embed_description")
    .notNull()
    .default("{user} a été rétrogradé de {oldRole} à {newRole}!"),
  roleLossEmbedTitle: text("role_loss_embed_title")
    .notNull()
    .default("📉 Role Removed"),
  roleLossEmbedDescription: text("role_loss_embed_description")
    .notNull()
    .default("{user} a perdu son rôle {role}!"),
  // Roles Embed Settings
  rolesEmbedChannelId: text("roles_embed_channel_id"),
  rolesEmbedMessageId: text("roles_embed_message_id"),
  rolesEmbedTitle: text("roles_embed_title")
    .notNull()
    .default("🏆 Level Roles"),
  rolesEmbedDescription: text("roles_embed_description")
    .notNull()
    .default("Earn XP by chatting to unlock these roles!"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const levelRoles = pgTable("level_roles", {
  id: text("id").primaryKey(),
  guildId: text("guild_id")
    .notNull()
    .references(() => guilds.id, { onDelete: "cascade" }),
  roleId: text("role_id").notNull(), // Discord role ID
  xpRequired: integer("xp_required").notNull(),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const memberXp = pgTable("member_xp", {
  id: text("id").primaryKey(),
  guildId: text("guild_id")
    .notNull()
    .references(() => guilds.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(), // Discord user ID
  totalXp: integer("total_xp").notNull().default(0),
  currentRoleId: text("current_role_id"), // Current level role
  lastMessageAt: timestamp("last_message_at"),
  xpEarnedToday: integer("xp_earned_today").notNull().default(0),
  xpEarnedThisHour: integer("xp_earned_this_hour").notNull().default(0),
  lastHourReset: timestamp("last_hour_reset"),
  lastDayReset: timestamp("last_day_reset"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Embed Message Types
export type EmbedAuthor = {
  name: string;
  iconUrl?: string;
  url?: string;
};

export type EmbedFooter = {
  text: string;
  iconUrl?: string;
};

export type EmbedField = {
  name: string;
  value: string;
  inline?: boolean;
};

export type EmbedData = {
  author?: EmbedAuthor;
  title?: string;
  titleUrl?: string;
  description?: string;
  color?: string; // Hex color string
  fields?: EmbedField[];
  imageUrl?: string;
  thumbnailUrl?: string;
  footer?: EmbedFooter;
  timestamp?: boolean;
};

// Saved Embed Messages table
export const savedEmbedMessages = pgTable("saved_embed_messages", {
  id: text("id").primaryKey(),
  guildId: text("guild_id")
    .notNull()
    .references(() => guilds.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // Internal name for dashboard
  channelId: text("channel_id"), // Target Discord channel
  discordMessageId: text("discord_message_id"), // Message ID if sent to Discord
  content: text("content"), // Regular message content above embeds
  embeds: jsonb("embeds").$type<EmbedData[]>().notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
export type Guild = typeof guilds.$inferSelect;
export type NewGuild = typeof guilds.$inferInsert;
export type OnboardingConfig = typeof onboardingConfig.$inferSelect;
export type NewOnboardingConfig = typeof onboardingConfig.$inferInsert;
export type WelcomeMessage = typeof welcomeMessages.$inferSelect;
export type NewWelcomeMessage = typeof welcomeMessages.$inferInsert;
export type OnboardingThread = typeof onboardingThreads.$inferSelect;
export type NewOnboardingThread = typeof onboardingThreads.$inferInsert;
export type LevelConfigDb = typeof levelConfig.$inferSelect;
export type NewLevelConfig = typeof levelConfig.$inferInsert;
export type LevelRoleDb = typeof levelRoles.$inferSelect;
export type NewLevelRole = typeof levelRoles.$inferInsert;
export type MemberXp = typeof memberXp.$inferSelect;
export type NewMemberXp = typeof memberXp.$inferInsert;
export type SavedEmbedMessage = typeof savedEmbedMessages.$inferSelect;
export type NewSavedEmbedMessage = typeof savedEmbedMessages.$inferInsert;
