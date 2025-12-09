import { db, levelConfig, levelRoles, memberXp } from "@cozycore/db";
import {
  EmbedBuilder,
  type Guild,
  type TextChannel,
  type ThreadChannel,
} from "discord.js";
import { and, eq } from "drizzle-orm";
import { getRandomPastelDecimal } from "./embed-colors";

type LevelConfig = typeof levelConfig.$inferSelect;
type LevelRole = typeof levelRoles.$inferSelect;

export type { LevelConfig };

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
      monthlyHelperCount: 0,
    };
    await db.insert(memberXp).values(newMember);
    member = {
      ...newMember,
      currentRoleId: null,
      lastMessageAt: null,
      lastHourReset: null,
      lastDayReset: null,
      lastHelperCountReset: null,
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
  const roleChanged = member
    ? await checkRoleProgression(
        guild,
        config,
        userId,
        member.currentRoleId,
        newXp
      )
    : false;

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
  if (!config) {
    return false;
  }

  // Get all level roles ordered by XP
  const roles = await db
    .select()
    .from(levelRoles)
    .where(eq(levelRoles.guildId, guild.id))
    .orderBy(levelRoles.xpRequired);

  if (roles.length === 0) {
    return false;
  }

  // Find highest qualified role
  const qualified = roles.filter((r: LevelRole) => r.xpRequired <= totalXp);
  const newRole = qualified.at(-1);

  if (!newRole || newRole.roleId === currentRoleId) {
    return false;
  }

  // Get Discord member
  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member) {
    return false;
  }

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
  if (!channel?.isTextBased()) {
    return;
  }

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
  if (!channel?.isTextBased()) {
    return;
  }

  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member) {
    return;
  }

  const title = isPromotion
    ? config.promotionEmbedTitle
    : config.demotionEmbedTitle;

  // Get template from main description or random alternative
  const mainTemplate = isPromotion
    ? config.promotionEmbedDescription
    : config.demotionEmbedDescription;
  const alternativeTemplates = isPromotion
    ? (config.promotionEmbedDescriptions ?? [])
    : (config.demotionEmbedDescriptions ?? []);

  const template = getRandomTemplate(mainTemplate, alternativeTemplates);

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
  if (history.length === 0 || severity === "off") {
    return false;
  }

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
    if (union > 0 && intersection / union >= threshold) {
      return true;
    }
  }
  return false;
}

/**
 * Get a random template from the main description or alternatives
 */
function getRandomTemplate(
  mainTemplate: string,
  alternatives: string[]
): string {
  // Filter out empty alternatives
  const validAlternatives = alternatives.filter((t) => t.trim().length > 0);

  if (validAlternatives.length === 0) {
    return mainTemplate || "{user} earned {role}!";
  }

  // Combine main template with alternatives for random selection
  const allTemplates = [mainTemplate, ...validAlternatives];
  const randomIndex = Math.floor(Math.random() * allTemplates.length);
  return allTemplates[randomIndex] ?? mainTemplate;
}

/**
 * Send helper recognition notification
 */
export async function sendHelperRecognition(
  guild: Guild,
  config: LevelConfig,
  helperId: string,
  askerId: string,
  threadName: string,
  xpAwarded: number,
  targetChannel?: TextChannel | ThreadChannel
): Promise<void> {
  // Use provided target channel, or fall back to configured channel
  let channel = targetChannel;
  if (!channel) {
    const channelId = config.helperRecognitionChannelId;
    if (!channelId) {
      return;
    }
    const fetchedChannel = await guild.channels
      .fetch(channelId)
      .catch(() => null);
    if (!fetchedChannel?.isTextBased()) {
      return;
    }
    channel = fetchedChannel as TextChannel;
  }

  const helper = await guild.members.fetch(helperId).catch(() => null);

  const mainTemplate = config.helperRecognitionEmbedDescription;
  const alternatives = config.helperRecognitionEmbedDescriptions ?? [];
  const template = getRandomTemplate(mainTemplate, alternatives);

  const description = template
    .replace(/{helper}/g, `<@${helperId}>`)
    .replace(/{asker}/g, `<@${askerId}>`)
    .replace(/{thread}/g, threadName)
    .replace(/{xp}/g, xpAwarded.toString());

  const embed = new EmbedBuilder()
    .setColor(getRandomPastelDecimal())
    .setDescription(description)
    .setTimestamp();

  if (config.helperRecognitionEmbedTitle) {
    embed.setTitle(config.helperRecognitionEmbedTitle);
  }

  if (helper) {
    embed.setAuthor({
      name: helper.user.displayName,
      iconURL: helper.user.displayAvatarURL(),
    });
  }

  await channel.send({ embeds: [embed] }).catch(() => {});
}

/**
 * Send fast resolution bonus notification
 */
export async function sendFastResolutionNotification(
  guild: Guild,
  config: LevelConfig,
  helperId: string,
  askerId: string,
  threadName: string,
  hoursToResolve: number,
  xpAwarded: number,
  targetChannel?: TextChannel | ThreadChannel
): Promise<void> {
  // Use provided target channel, or fall back to configured channel
  let channel = targetChannel;
  if (!channel) {
    const channelId =
      config.fastResolutionChannelId ?? config.helperRecognitionChannelId;
    if (!channelId) {
      return;
    }
    const fetchedChannel = await guild.channels
      .fetch(channelId)
      .catch(() => null);
    if (!fetchedChannel?.isTextBased()) {
      return;
    }
    channel = fetchedChannel as TextChannel;
  }

  const helper = await guild.members.fetch(helperId).catch(() => null);

  const mainTemplate = config.fastResolutionEmbedDescription;
  const alternatives = config.fastResolutionEmbedDescriptions ?? [];
  const template = getRandomTemplate(mainTemplate, alternatives);

  const description = template
    .replace(/{helper}/g, `<@${helperId}>`)
    .replace(/{asker}/g, `<@${askerId}>`)
    .replace(/{thread}/g, threadName)
    .replace(/{hours}/g, hoursToResolve.toFixed(1))
    .replace(/{xp}/g, xpAwarded.toString());

  const embed = new EmbedBuilder()
    .setColor(getRandomPastelDecimal())
    .setDescription(description)
    .setTimestamp();

  if (config.fastResolutionEmbedTitle) {
    embed.setTitle(config.fastResolutionEmbedTitle);
  }

  if (helper) {
    embed.setAuthor({
      name: helper.user.displayName,
      iconURL: helper.user.displayAvatarURL(),
    });
  }

  await channel.send({ embeds: [embed] }).catch(() => {});
}

/**
 * Send booster thank you notification
 */
export async function sendBoosterThankYou(
  guild: Guild,
  config: LevelConfig,
  userId: string
): Promise<void> {
  if (!(config.boosterEnabled && config.boosterChannelId)) {
    return;
  }

  const channel = await guild.channels
    .fetch(config.boosterChannelId)
    .catch(() => null);
  if (!channel?.isTextBased()) {
    return;
  }

  const member = await guild.members.fetch(userId).catch(() => null);

  const mainTemplate = config.boosterEmbedDescription;
  const alternatives = config.boosterEmbedDescriptions ?? [];
  const template = getRandomTemplate(mainTemplate, alternatives);

  const description = template
    .replace(/{user}/g, `<@${userId}>`)
    .replace(/{multiplier}/g, `${config.boosterXpMultiplier}x`)
    .replace(/{bonusXp}/g, config.boosterBonusXpPerMessage.toString())
    .replace(/{helperBonus}/g, `${config.boosterHelperBonusMultiplier}x`);

  const embed = new EmbedBuilder()
    .setColor(0xf4_7f_ff) // Discord boost pink
    .setDescription(description)
    .setTimestamp();

  if (config.boosterEmbedTitle) {
    embed.setTitle(config.boosterEmbedTitle);
  }

  if (member) {
    embed.setAuthor({
      name: member.user.displayName,
      iconURL: member.user.displayAvatarURL(),
    });
  }

  await (channel as TextChannel).send({ embeds: [embed] }).catch(() => {});
}

/**
 * Increment monthly helper count for a user
 */
export async function incrementMonthlyHelperCount(
  guildId: string,
  userId: string
): Promise<void> {
  const [member] = await db
    .select()
    .from(memberXp)
    .where(and(eq(memberXp.guildId, guildId), eq(memberXp.userId, userId)))
    .limit(1);

  if (member) {
    await db
      .update(memberXp)
      .set({
        monthlyHelperCount: (member.monthlyHelperCount ?? 0) + 1,
        updatedAt: new Date(),
      })
      .where(eq(memberXp.id, member.id));
  }
}
