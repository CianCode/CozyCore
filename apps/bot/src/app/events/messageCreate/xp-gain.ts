import { db, memberXp } from "@cozycore/db";
import type { Message } from "discord.js";
import { and, eq } from "drizzle-orm";
import { awardXp, checkSimilarity, getLevelConfig } from "@/utils/level";

type LevelConfig = Awaited<ReturnType<typeof getLevelConfig>>;
type MemberRecord = typeof memberXp.$inferSelect;

const cooldowns = new Map<string, number>();
const messageHistory = new Map<string, string[]>();

/**
 * Check if message should be skipped based on basic filters
 */
function shouldSkipMessage(
  message: Message,
  config: LevelConfig,
  cooldownKey: string
): boolean {
  if (!config?.enabled) {
    return true;
  }

  // Check channel whitelist
  const whitelist = config.whitelistedChannels ?? [];
  if (whitelist.length > 0 && !whitelist.includes(message.channel.id)) {
    return true;
  }

  // Check message length
  if (message.content.length < config.minMessageLength) {
    return true;
  }

  // Check cooldown
  const now = Date.now();
  const lastMsg = cooldowns.get(cooldownKey);
  if (lastMsg && now - lastMsg < config.cooldownSeconds * 1000) {
    return true;
  }

  return false;
}

/**
 * Check message similarity and update history
 */
function checkAndUpdateSimilarity(
  content: string,
  config: LevelConfig,
  cooldownKey: string
): boolean {
  if (!config || config.similaritySeverity === "off") {
    return false;
  }

  const history = messageHistory.get(cooldownKey) ?? [];
  if (checkSimilarity(content, history, config.similaritySeverity)) {
    return true;
  }

  history.push(content);
  if (history.length > 5) {
    history.shift();
  }
  messageHistory.set(cooldownKey, history);
  return false;
}

/**
 * Calculate XP counters and check limits
 */
function calculateXpCounters(
  config: NonNullable<LevelConfig>,
  member: MemberRecord | undefined
): { hourlyXp: number; dailyXp: number; exceedsLimit: boolean } {
  const currentHour = new Date();
  currentHour.setMinutes(0, 0, 0);
  const currentDay = new Date();
  currentDay.setHours(0, 0, 0, 0);

  let hourlyXp = member?.xpEarnedThisHour ?? 0;
  let dailyXp = member?.xpEarnedToday ?? 0;

  if (!member?.lastHourReset || member.lastHourReset < currentHour) {
    hourlyXp = 0;
  }
  if (!member?.lastDayReset || member.lastDayReset < currentDay) {
    dailyXp = 0;
  }

  // Check limits
  const hourlyLimitExceeded =
    config.maxXpPerHourEnabled &&
    config.maxXpPerHour &&
    hourlyXp >= config.maxXpPerHour;

  const dailyLimitExceeded =
    config.maxXpPerDayEnabled &&
    config.maxXpPerDay &&
    dailyXp >= config.maxXpPerDay;

  return {
    hourlyXp,
    dailyXp,
    exceedsLimit: Boolean(hourlyLimitExceeded || dailyLimitExceeded),
  };
}

export default async function handleXpGain(message: Message): Promise<void> {
  if (message.author.bot || !message.guild) {
    return;
  }

  const guildId = message.guild.id;
  const userId = message.author.id;
  const cooldownKey = `${guildId}:${userId}`;

  try {
    const config = await getLevelConfig(guildId);

    if (shouldSkipMessage(message, config, cooldownKey)) {
      return;
    }

    // Config is guaranteed non-null after shouldSkipMessage check
    if (!config) {
      return;
    }

    if (checkAndUpdateSimilarity(message.content, config, cooldownKey)) {
      return;
    }

    // Get member XP record
    const [member] = await db
      .select()
      .from(memberXp)
      .where(and(eq(memberXp.guildId, guildId), eq(memberXp.userId, userId)))
      .limit(1);

    const { hourlyXp, dailyXp, exceedsLimit } = calculateXpCounters(
      config,
      member
    );

    if (exceedsLimit) {
      return;
    }

    // Calculate XP gain
    const xpGain = Math.floor(
      Math.random() * (config.maxXpPerMessage - config.minXpPerMessage + 1) +
        config.minXpPerMessage
    );

    // Award XP (handles role progression + notifications)
    const { oldXp, newXp } = await awardXp({
      guild: message.guild,
      userId,
      amount: xpGain,
      source: "message",
    });

    // Update hourly/daily tracking
    if (member) {
      const currentHour = new Date();
      currentHour.setMinutes(0, 0, 0);
      const currentDay = new Date();
      currentDay.setHours(0, 0, 0, 0);

      await db
        .update(memberXp)
        .set({
          xpEarnedThisHour: hourlyXp + xpGain,
          xpEarnedToday: dailyXp + xpGain,
          lastMessageAt: new Date(),
          lastHourReset: currentHour,
          lastDayReset: currentDay,
        })
        .where(eq(memberXp.id, member.id));
    }

    // Update cooldown
    cooldowns.set(cooldownKey, Date.now());

    console.log(
      `[Level] ${message.author.tag} earned ${xpGain} XP (${oldXp} → ${newXp})`
    );
  } catch (error) {
    console.error("[Level] Error:", error);
  }
}
