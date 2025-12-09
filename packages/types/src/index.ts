// Discord API Types
export type DiscordGuild = {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
  features: string[];
};

// Full guild details (from bot token)
export type DiscordGuildDetails = {
  id: string;
  name: string;
  icon: string | null;
  description: string | null;
  splash: string | null;
  banner: string | null;
  features: string[];
  premium_tier: number;
  premium_subscription_count: number;
  member_count?: number;
  approximate_member_count?: number;
  approximate_presence_count?: number;
  vanity_url_code: string | null;
  owner_id: string;
};

export type DiscordUser = {
  id: string;
  username: string;
  discriminator: string;
  global_name: string | null;
  avatar: string | null;
  email?: string;
};

// Permission flags
export const DiscordPermissions = {
  MANAGE_GUILD: BigInt(0x20),
  ADMINISTRATOR: BigInt(0x8),
} as const;

// Dashboard Types
export type GuildWithStatus = DiscordGuild & {
  botInstalled: boolean;
  memberCount?: number;
};

export type DashboardGuild = {
  id: string;
  name: string;
  icon: string | null;
  ownerId: string;
  memberCount: number;
  botInstalled: boolean;
  settings: GuildSettings;
};

export type GuildSettings = {
  prefix?: string;
  welcomeChannelId?: string;
  welcomeMessage?: string;
  logChannelId?: string;
  modRoleIds?: string[];
};

// API Response Types
export type ApiResponse<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: string;
    };

// Auth Types
export type AuthSession = {
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
  session: {
    id: string;
    expiresAt: Date;
  };
};

// Onboarding Types
export type OnboardingConfig = {
  guildId: string;
  enabled: boolean;
  welcomeChannelId: string | null;
  rolesOnJoin: string[];
  threadAutoDelete: "1d" | "7d";
  typingDelay: number;
  showTypingIndicator: boolean;
  threadNameTemplate: string;
};

export type WelcomeMessage = {
  id: string;
  guildId: string;
  content: string;
  order: number;
  selectableRoles: string[]; // Roles to show in Discord select menu component
};

export type OnboardingData = {
  config: OnboardingConfig;
  messages: WelcomeMessage[];
};

// Discord Channel/Role Types for UI
export type DiscordChannel = {
  id: string;
  name: string;
  type: number;
  position: number;
};

export type DiscordRole = {
  id: string;
  name: string;
  color: number;
  position: number;
  managed: boolean;
};

// Level System Types
export type SimilaritySeverity = "off" | "low" | "medium" | "high" | "strict";

export type LevelConfig = {
  guildId: string;
  enabled: boolean;
  // Message XP Settings
  minXpPerMessage: number;
  maxXpPerMessage: number;
  cooldownSeconds: number;
  maxXpPerHour: number | null;
  maxXpPerHourEnabled: boolean;
  maxXpPerDay: number | null;
  maxXpPerDayEnabled: boolean;
  minMessageLength: number;
  similaritySeverity: SimilaritySeverity;
  whitelistedChannels: string[];
  // Forum Thread XP Settings
  forumXpEnabled: boolean;
  xpOnThreadClose: number;
  helperBonusXp: number;
  autoArchiveHours: number;
  fastResolutionEnabled: boolean;
  fastResolutionThresholdHours: number;
  fastResolutionBonusXp: number;
  whitelistedForums: string[];
  // Role Progression
  autoRemovePreviousRole: boolean;
  // Notification Settings
  congratsChannelId: string | null;
  demotionChannelId: string | null;
  logChannelId: string | null;
  // Embed Templates
  promotionEmbedTitle: string;
  promotionEmbedDescription: string;
  promotionEmbedDescriptions: string[];
  demotionEmbedTitle: string;
  demotionEmbedDescription: string;
  demotionEmbedDescriptions: string[];
  roleLossEmbedTitle: string;
  roleLossEmbedDescription: string;
  roleLossEmbedDescriptions: string[];
  // Roles Embed Settings
  rolesEmbedChannelId: string | null;
  rolesEmbedMessageId: string | null;
  rolesEmbedTitle: string;
  rolesEmbedDescription: string;
  // Helper Recognition Settings
  helperRecognitionChannelId: string | null;
  helperRecognitionEmbedTitle: string;
  helperRecognitionEmbedDescription: string;
  helperRecognitionEmbedDescriptions: string[];
  // Fast Resolution Settings
  fastResolutionChannelId: string | null;
  fastResolutionEmbedTitle: string;
  fastResolutionEmbedDescription: string;
  fastResolutionEmbedDescriptions: string[];
  // Booster Settings
  boosterEnabled: boolean;
  boosterChannelId: string | null;
  boosterXpMultiplier: number;
  boosterBonusXpPerMessage: number;
  boosterHelperBonusMultiplier: number;
  boosterEmbedTitle: string;
  boosterEmbedDescription: string;
  boosterEmbedDescriptions: string[];
  // Monthly Top Helper Settings
  monthlyTopHelperEnabled: boolean;
  monthlyTopHelperChannelId: string | null;
  monthlyTopHelperDay: number;
  monthlyTopHelperHour: number;
  monthlyTopHelperFirst: number | null;
  monthlyTopHelperSecond: number | null;
  monthlyTopHelperThird: number | null;
  monthlyTopHelperEmbedTitle: string;
  monthlyTopHelperEmbedDescription: string;
  monthlyTopHelperEmbedDescriptions: string[];
  lastMonthlyTopHelperRun: Date | null;
};

export type LevelRole = {
  id: string;
  guildId: string;
  roleId: string;
  xpRequired: number;
  order: number;
};

export type LevelData = {
  config: LevelConfig;
  roles: LevelRole[];
};

// Leaderboard Types
export type LeaderboardUser = {
  rank: number;
  userId: string;
  username: string;
  displayName: string;
  avatar: string | null;
  currentRoleId: string | null;
  totalXp: number;
};

export type LeaderboardData = {
  users: LeaderboardUser[];
  total: number;
  page: number;
  pageSize: number;
};

export type XpAdjustment = {
  userId: string;
  amount: number;
  reason?: string;
};

// Embed Creator Types
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
  id: string; // For React key and reordering
  name: string;
  value: string;
  inline?: boolean;
};

export type EmbedData = {
  id: string; // For React key and reordering
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

export type SavedEmbedMessage = {
  id: string;
  guildId: string;
  name: string;
  channelId: string | null;
  discordMessageId: string | null;
  content: string | null;
  embeds: EmbedData[];
  createdAt: Date;
  updatedAt: Date;
};

export type SavedEmbedMessageInput = {
  name: string;
  channelId?: string | null;
  content?: string | null;
  embeds: EmbedData[];
};

export type EmbedSendResult = {
  messageId: string;
  channelId: string;
};

// Embed validation constants
export const EMBED_LIMITS = {
  TITLE_MAX: 256,
  DESCRIPTION_MAX: 4096,
  FIELD_NAME_MAX: 256,
  FIELD_VALUE_MAX: 1024,
  FOOTER_TEXT_MAX: 2048,
  AUTHOR_NAME_MAX: 256,
  FIELDS_MAX: 25,
  EMBEDS_MAX: 10,
  TOTAL_CHARS_MAX: 6000, // Total character limit per embed
} as const;
