import { db, levelConfig, levelRoles, memberXp } from "@cozycore/db";
import { EmbedBuilder, type Guild, type TextChannel } from "discord.js";
import { and, eq } from "drizzle-orm";
import { getRandomPastelDecimal } from "./embed-colors";

type LevelConfig = typeof levelConfig.$inferSelect;
type LevelRole = typeof levelRoles.$inferSelect;

/**
 * Award XP to a user and handle role progression + notifications
 */
export async function awardXp(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  guild: any,
  userId: string,
  amount: number,
  source: "message" | "thread" | "helper" | "dashboard"
): Promise<{ oldXp: number; newXp: number; roleChanged: boolean }> {
  const guildId = guild.id as string;

  // Get config
  const [config] = await db
    .select()
    .from(levelConfig)
    .where(eq(levelConfig.guildId, guildId))
    .limit(1);

  // Get or create member record
  let [member] = await db
    .select()
    .from(memberXp)
    .where(and(eq(memberXp.guildId, guildId), eq(memberXp.userId, userId)))
    .limit(1);

  const oldXp = member?.totalXp ?? 0;
  const newXp = oldXp + amount;

  if (member) {
    await db
      .update(memberXp)
      .set({ totalXp: newXp, updatedAt: new Date() })
      .where(eq(memberXp.id, member.id));
  } else {
    const newMember = {
      id: crypto.randomUUID(),
      guildId,
      userId,
      totalXp: newXp,
      xpEarnedToday: 0,
      xpEarnedThisHour: 0,
    };
    await db.insert(memberXp).values(newMember);
    member = {
      ...newMember,
      currentRoleId: null,
      lastMessageAt: null,
      lastHourReset: null,
      lastDayReset: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  // Log to channel
  if (config?.logChannelId) {
    await sendLog(
      guild,
      config.logChannelId,
      userId,
      amount,
      oldXp,
      newXp,
      source
    );
  }

  // Check for role changes
  const roleChanged = await checkRoleProgression(
    guild,
    config,
    userId,
    member.currentRoleId,
    newXp
  );

  return { oldXp, newXp, roleChanged };
}

/**
 * Check and update role progression based on XP
 */
async function checkRoleProgression(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  guild: any,
  config: LevelConfig | undefined,
  userId: string,
  currentRoleId: string | null,
  totalXp: number
): Promise<boolean> {
  if (!config) return false;

  // Get all level roles ordered by XP
  const roles = await db
    .select()
    .from(levelRoles)
    .where(eq(levelRoles.guildId, guild.id))
    .orderBy(levelRoles.xpRequired);

  if (roles.length === 0) return false;

  // Find highest qualified role
  const qualified = roles.filter((r: LevelRole) => r.xpRequired <= totalXp);
  const newRole = qualified.at(-1);

  if (!newRole || newRole.roleId === currentRoleId) return false;

  // Get Discord member
  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member) return false;

  // Determine if promotion or demotion
  const oldRoleXp = currentRoleId
    ? (roles.find((r: LevelRole) => r.roleId === currentRoleId)?.xpRequired ??
      0)
    : 0;
  const isPromotion = newRole.xpRequired > oldRoleXp;

  try {
    // Assign new role
    await member.roles.add(newRole.roleId);
    console.log(
      `[Level] Assigned role ${newRole.roleId} to ${member.user.tag}`
    );

    // Remove old role if configured
    if (config.autoRemovePreviousRole && currentRoleId) {
      await member.roles.remove(currentRoleId).catch(() => {});
    }

    // Update database
    await db
      .update(memberXp)
      .set({ currentRoleId: newRole.roleId, updatedAt: new Date() })
      .where(and(eq(memberXp.guildId, guild.id), eq(memberXp.userId, userId)));

    // Send notification
    const channelId = isPromotion
      ? config.congratsChannelId
      : config.demotionChannelId;
    if (channelId) {
      await sendRoleNotification(
        guild,
        channelId,
        config,
        userId,
        newRole.roleId,
        currentRoleId,
        isPromotion
      );
    }

    return true;
  } catch (error) {
    console.error("[Level] Error assigning role:", error);
    return false;
  }
}

/**
 * Send XP log to log channel
 */
async function sendLog(
  guild: Guild,
  channelId: string,
  userId: string,
  amount: number,
  oldXp: number,
  newXp: number,
  source: string
): Promise<void> {
  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel?.isTextBased()) return;

  const sourceText =
    {
      message: "via message",
      thread: "via thread close",
      helper: "via helper bonus",
      dashboard: "via dashboard",
    }[source] ?? source;

  const embed = new EmbedBuilder()
    .setColor(getRandomPastelDecimal())
    .setTitle("Logs Level")
    .setDescription(
      `<@${userId}> earned **+${amount} XP** ${sourceText} (${oldXp} → ${newXp})`
    )
    .setTimestamp();

  await (channel as TextChannel).send({ embeds: [embed] }).catch(() => {});
}

/**
 * Send role change notification
 */
async function sendRoleNotification(
  guild: Guild,
  channelId: string,
  config: LevelConfig,
  userId: string,
  newRoleId: string,
  oldRoleId: string | null,
  isPromotion: boolean
): Promise<void> {
  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel?.isTextBased()) return;

  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member) return;

  const title = isPromotion
    ? config.promotionEmbedTitle
    : config.demotionEmbedTitle;
  const template =
    (isPromotion
      ? config.promotionEmbedDescription
      : config.demotionEmbedDescription) || "{user} earned {role}!";

  const description = template
    .replace(/{user}/g, `<@${userId}>`)
    .replace(/{role}/g, `<@&${newRoleId}>`)
    .replace(/{newRole}/g, `<@&${newRoleId}>`)
    .replace(/{oldRole}/g, oldRoleId ? `<@&${oldRoleId}>` : "none");

  const embed = new EmbedBuilder()
    .setColor(getRandomPastelDecimal())
    .setAuthor({
      name: member.user.displayName,
      iconURL: member.user.displayAvatarURL(),
    })
    .setDescription(description)
    .setTimestamp();

  // Only set title if it's not empty
  if (title) {
    embed.setTitle(title);
  }

  await (channel as TextChannel).send({ embeds: [embed] }).catch(() => {});
}

/**
 * Get level config for a guild
 */
export async function getLevelConfig(
  guildId: string
): Promise<LevelConfig | null> {
  const [config] = await db
    .select()
    .from(levelConfig)
    .where(eq(levelConfig.guildId, guildId))
    .limit(1);
  return config ?? null;
}

/**
 * Check message similarity using Jaccard index
 */
export function checkSimilarity(
  content: string,
  history: string[],
  severity: string
): boolean {
  if (history.length === 0 || severity === "off") return false;

  const thresholds: Record<string, number> = {
    low: 0.9,
    medium: 0.7,
    high: 0.5,
    strict: 0.3,
  };
  const threshold = thresholds[severity] ?? 0.7;
  const normalized = content.toLowerCase().trim();

  for (const prev of history) {
    const wordsA = new Set(normalized.split(/\s+/));
    const wordsB = new Set(prev.toLowerCase().trim().split(/\s+/));
    const intersection = [...wordsA].filter((x) => wordsB.has(x)).length;
    const union = new Set([...wordsA, ...wordsB]).size;
    if (union > 0 && intersection / union >= threshold) return true;
  }
  return false;
}
