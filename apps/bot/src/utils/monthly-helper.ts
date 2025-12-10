import { db, levelConfig, memberXp } from "@cozycore/db";
import { type Client, EmbedBuilder, type TextChannel } from "discord.js";
import { and, desc, eq, gt } from "drizzle-orm";
import { getRandomPastelDecimal } from "./embed-colors";
import { awardXp } from "./level";

type LevelConfig = typeof levelConfig.$inferSelect;

const CHECK_INTERVAL_MS = 60 * 1000; // Check every minute for faster "Run Now" response

/**
 * Start the monthly top helper scheduler
 */
export function startMonthlyHelperScheduler(client: Client<true>): void {
  console.log("[MonthlyHelper] Starting scheduler (checking every minute)...");

  // Check immediately on startup
  checkAllGuilds(client);

  // Then check every hour
  setInterval(() => {
    checkAllGuilds(client);
  }, CHECK_INTERVAL_MS);
}

/**
 * Check all guilds for monthly helper announcements
 */
async function checkAllGuilds(client: Client<true>): Promise<void> {
  const configs = await db
    .select()
    .from(levelConfig)
    .where(eq(levelConfig.monthlyTopHelperEnabled, true));

  const now = new Date();
  const currentDay = now.getUTCDate();
  const currentHour = now.getUTCHours();

  for (const config of configs) {
    // Check if force run is requested from dashboard
    if (config.forceMonthlyTopHelperRun) {
      console.log(
        `[MonthlyHelper] Force run requested for guild ${config.guildId}`
      );
      await announceTopHelpers(client, config);
      continue;
    }

    // Check if it's time to run (correct day and hour)
    if (config.monthlyTopHelperDay !== currentDay) {
      continue;
    }
    if (config.monthlyTopHelperHour !== currentHour) {
      continue;
    }

    // Check if we already ran this month
    const lastRun = config.lastMonthlyTopHelperRun;
    if (lastRun) {
      const lastRunMonth = lastRun.getUTCMonth();
      const currentMonth = now.getUTCMonth();
      if (lastRunMonth === currentMonth) {
        continue;
      }
    }

    // Time to announce!
    await announceTopHelpers(client, config);
  }
}

/**
 * Announce top helpers for a guild
 */
async function announceTopHelpers(
  client: Client<true>,
  config: LevelConfig
): Promise<void> {
  const guildId = config.guildId;
  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) {
    return;
  }

  const channelId = config.monthlyTopHelperChannelId;
  if (!channelId) {
    return;
  }

  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel?.isTextBased()) {
    return;
  }

  console.log(`[MonthlyHelper] Announcing top helpers for ${guild.name}`);

  // Get top 3 helpers by monthly count
  const topHelpers = await db
    .select()
    .from(memberXp)
    .where(
      and(eq(memberXp.guildId, guildId), gt(memberXp.monthlyHelperCount, 0))
    )
    .orderBy(desc(memberXp.monthlyHelperCount))
    .limit(3);

  if (topHelpers.length === 0) {
    console.log(`[MonthlyHelper] No helpers found for ${guild.name}`);
    // Still update lastRun and reset force flag so we don't keep checking
    await db
      .update(levelConfig)
      .set({
        lastMonthlyTopHelperRun: new Date(),
        forceMonthlyTopHelperRun: false,
      })
      .where(eq(levelConfig.guildId, guildId));
    return;
  }

  // Award XP to top helpers
  const rewards = [
    config.monthlyTopHelperFirst,
    config.monthlyTopHelperSecond,
    config.monthlyTopHelperThird,
  ];

  for (let i = 0; i < topHelpers.length; i++) {
    const helper = topHelpers[i];
    const reward = rewards[i];
    if (helper && reward && reward > 0) {
      await awardXp(guild, helper.userId, reward, "helper");
    }
  }

  // Build the announcement embed
  const first = topHelpers[0];
  const second = topHelpers[1];
  const third = topHelpers[2];

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const currentMonth = monthNames[new Date().getUTCMonth()] ?? "This Month";

  // Get template
  const mainTemplate = config.monthlyTopHelperEmbedDescription;
  const alternatives = config.monthlyTopHelperEmbedDescriptions ?? [];
  const allTemplates = [mainTemplate, ...alternatives.filter((t) => t.trim())];
  const template =
    allTemplates[Math.floor(Math.random() * allTemplates.length)] ??
    mainTemplate;

  const description = template
    .replace(/{first}/g, first ? `<@${first.userId}>` : "N/A")
    .replace(/{second}/g, second ? `<@${second.userId}>` : "N/A")
    .replace(/{third}/g, third ? `<@${third.userId}>` : "N/A")
    .replace(/{firstXp}/g, rewards[0]?.toString() ?? "0")
    .replace(/{secondXp}/g, rewards[1]?.toString() ?? "0")
    .replace(/{thirdXp}/g, rewards[2]?.toString() ?? "0")
    .replace(/{month}/g, currentMonth);

  const embed = new EmbedBuilder()
    .setColor(getRandomPastelDecimal())
    .setDescription(description)
    .setTimestamp();

  if (config.monthlyTopHelperEmbedTitle) {
    embed.setTitle(config.monthlyTopHelperEmbedTitle);
  }

  await (channel as TextChannel).send({ embeds: [embed] }).catch((err) => {
    console.error("[MonthlyHelper] Failed to send announcement:", err);
  });

  // Reset monthly helper counts for all members in this guild
  await db
    .update(memberXp)
    .set({ monthlyHelperCount: 0, lastHelperCountReset: new Date() })
    .where(eq(memberXp.guildId, guildId));

  // Update last run timestamp and reset force flag
  await db
    .update(levelConfig)
    .set({
      lastMonthlyTopHelperRun: new Date(),
      forceMonthlyTopHelperRun: false,
    })
    .where(eq(levelConfig.guildId, guildId));

  console.log(`[MonthlyHelper] Completed announcement for ${guild.name}`);
}
