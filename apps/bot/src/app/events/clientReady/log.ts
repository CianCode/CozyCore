import { db, guilds } from "@cozycore/db";
import type { EventHandler } from "commandkit";
import { Logger } from "commandkit/logger";
import { startMonthlyHelperScheduler } from "../../../utils/monthly-helper";
import { startOnboardingCleanup } from "../../../utils/onboarding-cleanup";

const handler: EventHandler<"clientReady"> = async (client) => {
  Logger.info(`Logged in as ${client.user.username}!`);

  // Start onboarding cleanup task
  startOnboardingCleanup(client);

  // Start monthly helper scheduler
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  startMonthlyHelperScheduler(client as any);

  // Sync all guilds to database on startup
  const guildCache = client.guilds.cache;
  Logger.info(`Syncing ${guildCache.size} guilds to database...`);

  for (const guild of guildCache.values()) {
    try {
      await db
        .insert(guilds)
        .values({
          id: guild.id,
          name: guild.name,
          icon: guild.icon,
          ownerId: guild.ownerId,
          botJoinedAt: new Date(),
          settings: {},
        })
        .onConflictDoUpdate({
          target: guilds.id,
          set: {
            name: guild.name,
            icon: guild.icon,
            ownerId: guild.ownerId,
            updatedAt: new Date(),
          },
        });
    } catch (error) {
      console.error(`Failed to sync guild ${guild.name}:`, error);
    }
  }

  Logger.info("Guild sync complete!");
};

export default handler;
