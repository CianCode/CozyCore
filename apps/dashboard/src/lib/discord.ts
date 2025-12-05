import { db, guilds } from "@cozycore/db";
import type {
  DiscordGuild,
  DiscordGuildDetails,
  GuildWithStatus,
} from "@cozycore/types";
import { inArray } from "drizzle-orm";
import { hasManageGuildPermission } from "./discord-utils";

// Re-export for convenience
export { hasManageGuildPermission } from "./discord-utils";

const DISCORD_API_BASE = "https://discord.com/api/v10";

// Simple in-memory cache for guilds (per access token)
const guildsCache = new Map<
  string,
  { data: DiscordGuild[]; expiresAt: number }
>();
const CACHE_TTL = 60 * 1000; // 1 minute cache

export async function fetchUserGuilds(
  accessToken: string
): Promise<DiscordGuild[]> {
  // Check cache first
  const cached = guildsCache.get(accessToken);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const response = await fetch(`${DISCORD_API_BASE}/users/@me/guilds`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (response.status === 429) {
    // Rate limited - check for cached data even if expired
    if (cached) {
      return cached.data;
    }
    const retryAfter = response.headers.get("Retry-After") || "60";
    throw new Error(
      `Rate limited by Discord. Try again in ${retryAfter} seconds.`
    );
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch guilds: ${response.statusText}`);
  }

  const data: DiscordGuild[] = await response.json();

  // Cache the result
  guildsCache.set(accessToken, {
    data,
    expiresAt: Date.now() + CACHE_TTL,
  });

  return data;
}

export async function getGuildsWithBotStatus(
  userGuilds: DiscordGuild[]
): Promise<GuildWithStatus[]> {
  const guildIds = userGuilds.map((g) => g.id);

  // Get guilds where bot is installed from database
  const installedGuilds = await db
    .select({ id: guilds.id })
    .from(guilds)
    .where(inArray(guilds.id, guildIds));

  const installedGuildIds = new Set(installedGuilds.map((g) => g.id));

  return userGuilds.map((guild) => ({
    ...guild,
    botInstalled: installedGuildIds.has(guild.id),
  }));
}

export function filterManageableGuilds(
  guildList: DiscordGuild[]
): DiscordGuild[] {
  return guildList.filter((guild) =>
    hasManageGuildPermission(guild.permissions)
  );
}

// Cache for guild details (fetched via bot token)
const guildDetailsCache = new Map<
  string,
  { data: DiscordGuildDetails; expiresAt: number }
>();

export async function fetchGuildDetails(
  guildId: string
): Promise<DiscordGuildDetails | null> {
  // Check cache first
  const cached = guildDetailsCache.get(guildId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    return null;
  }

  try {
    const response = await fetch(
      `${DISCORD_API_BASE}/guilds/${guildId}?with_counts=true`,
      {
        headers: {
          Authorization: `Bot ${botToken}`,
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data: DiscordGuildDetails = await response.json();

    // Cache for 5 minutes
    guildDetailsCache.set(guildId, {
      data,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    return data;
  } catch {
    return null;
  }
}
