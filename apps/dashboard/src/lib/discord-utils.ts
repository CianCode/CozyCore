import { DiscordPermissions } from "@cozycore/types";

export function hasManageGuildPermission(permissions: string): boolean {
  const perms = BigInt(permissions);
  const hasManageGuild =
    // biome-ignore lint/suspicious/noBitwiseOperators: Discord permissions require bitwise operations
    (perms & DiscordPermissions.MANAGE_GUILD) ===
    DiscordPermissions.MANAGE_GUILD;
  const hasAdmin =
    // biome-ignore lint/suspicious/noBitwiseOperators: Discord permissions require bitwise operations
    (perms & DiscordPermissions.ADMINISTRATOR) ===
    DiscordPermissions.ADMINISTRATOR;
  return hasManageGuild || hasAdmin;
}

export function generateBotInviteUrl(guildId: string): string {
  const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
  const permissions = "8"; // Administrator permission (for simplicity)
  const scopes = "bot%20applications.commands";

  return `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=${permissions}&scope=${scopes}&guild_id=${guildId}&disable_guild_select=true`;
}

export function getGuildIconUrl(
  guildId: string,
  iconHash: string | null,
  size = 128
): string {
  if (!iconHash) {
    return `https://cdn.discordapp.com/embed/avatars/${Number(guildId) % 5}.png`;
  }

  const extension = iconHash.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/icons/${guildId}/${iconHash}.${extension}?size=${size}`;
}
