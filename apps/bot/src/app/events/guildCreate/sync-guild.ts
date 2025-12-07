import { db, guilds } from "@cozycore/db";
import type { Guild } from "discord.js";

export default async function guildCreate(guild: Guild) {
  console.log(`[Guild] Joined: ${guild.name} (${guild.id})`);

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
          botJoinedAt: new Date(),
          updatedAt: new Date(),
        },
      });

    console.log(`[Guild] Synced to database: ${guild.name}`);
  } catch (error) {
    console.error(`[Guild] Failed to sync: ${guild.name}`, error);
  }
}
