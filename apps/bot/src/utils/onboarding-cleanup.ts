import { db, onboardingThreads } from "@cozycore/db";
import type { Client } from "discord.js";
import { lt } from "drizzle-orm";

const CLEANUP_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes

async function cleanupExpiredThread(
  client: Client,
  threadRecord: { threadId: string; guildId: string }
) {
  try {
    const guild = await client.guilds.fetch(threadRecord.guildId);
    if (!guild) {
      return;
    }

    try {
      const thread = await guild.channels.fetch(threadRecord.threadId);
      if (thread?.isThread()) {
        await thread.delete("Onboarding thread auto-delete");
        console.log(
          `[Onboarding] Deleted thread ${threadRecord.threadId} in ${guild.name}`
        );
      }
    } catch {
      // Thread might already be deleted, that's fine
    }
  } catch (error) {
    console.error(
      `[Onboarding] Error cleaning up thread ${threadRecord.threadId}:`,
      error
    );
  }
}

export function startOnboardingCleanup(client: Client) {
  console.log("[Onboarding] Starting cleanup task");

  const cleanup = async () => {
    try {
      // Find threads that should be deleted
      const expiredThreads = await db
        .select()
        .from(onboardingThreads)
        .where(lt(onboardingThreads.deleteAt, new Date()));

      for (const threadRecord of expiredThreads) {
        await cleanupExpiredThread(client, threadRecord);
      }

      // Remove expired records from database
      if (expiredThreads.length > 0) {
        await db
          .delete(onboardingThreads)
          .where(lt(onboardingThreads.deleteAt, new Date()));
      }
    } catch (error) {
      console.error("[Onboarding] Error in cleanup task:", error);
    }
  };

  // Run cleanup immediately
  cleanup();

  // Then run periodically
  setInterval(cleanup, CLEANUP_INTERVAL);
}
