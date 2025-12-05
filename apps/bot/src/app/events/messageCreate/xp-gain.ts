import { db, memberXp } from "@cozycore/db";
import type { Message } from "discord.js";
import { and, eq } from "drizzle-orm";
import { awardXp, checkSimilarity, getLevelConfig } from "@/utils/level";

const cooldowns = new Map<string, number>();
const messageHistory = new Map<string, string[]>();

export default async function handleXpGain(message: Message): Promise<void> {
  if (message.author.bot || !message.guild) return;

  const guildId = message.guild.id;
  const userId = message.author.id;

  try {
    const config = await getLevelConfig(guildId);
    if (!config?.enabled) return;

    // Check channel whitelist
    const whitelist = config.whitelistedChannels ?? [];
    if (whitelist.length > 0 && !whitelist.includes(message.channel.id)) return;

    // Check message length
    if (message.content.length < config.minMessageLength) return;

    // Check cooldown
    const cooldownKey = `${guildId}:${userId}`;
    const now = Date.now();
    const lastMsg = cooldowns.get(cooldownKey);
    if (lastMsg && now - lastMsg < config.cooldownSeconds * 1000) return;

    // Check similarity
    if (config.similaritySeverity !== "off") {
      const history = messageHistory.get(cooldownKey) ?? [];
      if (checkSimilarity(message.content, history, config.similaritySeverity))
        return;
      history.push(message.content);
      if (history.length > 5) history.shift();
      messageHistory.set(cooldownKey, history);
    }

    // Get member XP record
    const [member] = await db
      .select()
      .from(memberXp)
      .where(and(eq(memberXp.guildId, guildId), eq(memberXp.userId, userId)))
      .limit(1);

    // Reset hourly/daily counters
    const currentHour = new Date();
    currentHour.setMinutes(0, 0, 0);
    const currentDay = new Date();
    currentDay.setHours(0, 0, 0, 0);

    let hourlyXp = member?.xpEarnedThisHour ?? 0;
    let dailyXp = member?.xpEarnedToday ?? 0;

    if (!member?.lastHourReset || member.lastHourReset < currentHour)
      hourlyXp = 0;
    if (!member?.lastDayReset || member.lastDayReset < currentDay) dailyXp = 0;

    // Check limits
    if (
      config.maxXpPerHourEnabled &&
      config.maxXpPerHour &&
      hourlyXp >= config.maxXpPerHour
    )
      return;
    if (
      config.maxXpPerDayEnabled &&
      config.maxXpPerDay &&
      dailyXp >= config.maxXpPerDay
    )
      return;

    // Calculate XP gain
    const xpGain = Math.floor(
      Math.random() * (config.maxXpPerMessage - config.minXpPerMessage + 1) +
        config.minXpPerMessage
    );

    // Award XP (handles role progression + notifications)
    const { oldXp, newXp } = await awardXp(
      message.guild,
      userId,
      xpGain,
      "message"
    );

    // Update hourly/daily tracking
    if (member) {
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
    cooldowns.set(cooldownKey, now);

    console.log(
      `[Level] ${message.author.tag} earned ${xpGain} XP (${oldXp} → ${newXp})`
    );
  } catch (error) {
    console.error("[Level] Error:", error);
  }
}
