import { db, guilds } from "@cozycore/db";
import type { Guild } from "discord.js";
import { eq } from "drizzle-orm";

export default async function guildDelete(guild: Guild) {
  console.log(`[Guild] Left: ${guild.name} (${guild.id})`);

  try {
    await db.delete(guilds).where(eq(guilds.id, guild.id));
    console.log(`[Guild] Removed from database: ${guild.name}`);
  } catch (error) {
    console.error(`[Guild] Failed to remove: ${guild.name}`, error);
  }
}
