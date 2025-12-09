import type { GuildMember } from "discord.js";
import { getLevelConfig, sendBoosterThankYou } from "@/utils/level";

/**
 * Detect when a member starts boosting and send a thank you notification
 */
export default async function boosterDetection(
  oldMember: GuildMember,
  newMember: GuildMember
): Promise<void> {
  // Check if member just started boosting
  const wasBoosting = oldMember.premiumSince !== null;
  const isBoosting = newMember.premiumSince !== null;

  if (wasBoosting || !isBoosting) {
    // Either already was boosting or still isn't boosting
    return;
  }

  // Member just started boosting!
  const config = await getLevelConfig(newMember.guild.id);
  if (!config?.boosterEnabled) {
    return;
  }

  await sendBoosterThankYou(newMember.guild, config, newMember.id);
}
