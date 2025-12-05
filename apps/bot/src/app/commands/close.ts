import type { ChatInputCommand, CommandData } from "commandkit";
import {
  ActionRowBuilder,
  ChannelType,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import { getRandomPastelDecimal } from "@/utils/embed-colors";
import { awardXp, getLevelConfig } from "@/utils/level";

export const command: CommandData = {
  name: "close",
  description: "Close and manage forum threads",
  options: [
    {
      name: "thread",
      description: "Close the current forum thread and award XP",
      type: 1,
    },
  ],
};

export const chatInput: ChatInputCommand = async ({ interaction }) => {
  if (interaction.options.getSubcommand() !== "thread") return;

  const channel = interaction.channel;
  if (!channel?.isThread()) {
    return interaction.reply({
      content: "❌ Use this in a forum thread.",
      ephemeral: true,
    });
  }

  // channel is now narrowed to a thread type
  const thread = channel;
  const parent = thread.parent;

  if (!parent || parent.type !== ChannelType.GuildForum) {
    return interaction.reply({
      content: "❌ Use this in a forum thread.",
      ephemeral: true,
    });
  }

  // Permission check
  const member = interaction.member;
  const isOwner = thread.ownerId === interaction.user.id;
  const canManage =
    member &&
    typeof member.permissions !== "string" &&
    member.permissions.has("ManageThreads");

  if (!(isOwner || canManage)) {
    return interaction.reply({
      content: "❌ Only the thread owner or moderators can close this.",
      ephemeral: true,
    });
  }

  const guildId = interaction.guildId;
  if (!(guildId && interaction.guild)) {
    return interaction.reply({ content: "❌ Server only.", ephemeral: true });
  }

  const config = await getLevelConfig(guildId);

  // No forum XP - just close
  if (!config?.forumXpEnabled) {
    await closeThread(thread);
    return interaction.reply({ content: "✅ Thread closed.", ephemeral: true });
  }

  // Check forum whitelist
  const whitelist = config.whitelistedForums ?? [];
  if (whitelist.length > 0 && !whitelist.includes(parent.id)) {
    await closeThread(thread);
    return interaction.reply({ content: "✅ Thread closed.", ephemeral: true });
  }

  // Get participants (excluding owner and bots)
  const messages = await thread.messages.fetch({ limit: 100 });
  const participants = new Map<string, string>();

  for (const msg of messages.values()) {
    if (msg.author.id !== thread.ownerId && !msg.author.bot) {
      participants.set(msg.author.id, msg.author.username);
    }
  }

  // No participants = no XP (no one helped)
  if (participants.size === 0) {
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(getRandomPastelDecimal())
          .setTitle("✅ Thread Closed")
          .setDescription("No XP awarded (no other participants)."),
      ],
    });
    setTimeout(() => closeThread(thread), 2000);
    return;
  }

  // Award XP to thread owner (only if someone helped)
  if (thread.ownerId && interaction.guild) {
    await awardXp(
      interaction.guild,
      thread.ownerId,
      config.xpOnThreadClose,
      "thread"
    );
  }

  // If helper bonus enabled, show select menu
  if (config.helperBonusXp > 0) {
    const options = Array.from(participants.entries())
      .slice(0, 25)
      .map(([id, name]) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(name)
          .setValue(id)
          .setDescription(`Award ${config.helperBonusXp} bonus XP`)
      );

    const select = new StringSelectMenuBuilder()
      .setCustomId(`close_helper_${thread.id}`)
      .setPlaceholder("Select helpful member (optional)")
      .setMinValues(0)
      .setMaxValues(1)
      .addOptions(options);

    const embed = new EmbedBuilder()
      .setColor(getRandomPastelDecimal())
      .setTitle("🎉 Thread Resolved!")
      .setDescription(
        `Thread owner received **${config.xpOnThreadClose} XP**.\n\n` +
          `Recognize a helpful member for **${config.helperBonusXp} bonus XP**?`
      )
      .setFooter({ text: "Select a member or wait 60s to skip" });

    await interaction.reply({
      embeds: [embed],
      components: [
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select),
      ],
    });

    const collector = interaction.channel?.createMessageComponentCollector({
      filter: (i) =>
        i.customId === `close_helper_${thread.id}` &&
        i.user.id === interaction.user.id,
      time: 60_000,
      max: 1,
    });

    collector?.on("collect", async (i) => {
      if (i.isStringSelectMenu() && i.values[0]) {
        const helperId = i.values[0];
        await awardXp(
          interaction.guild!,
          helperId,
          config.helperBonusXp,
          "helper"
        );

        await i.update({
          embeds: [
            new EmbedBuilder()
              .setColor(getRandomPastelDecimal())
              .setTitle("✨ Helper Recognized!")
              .setDescription(
                `<@${helperId}> received **${config.helperBonusXp} bonus XP**!`
              ),
          ],
          components: [],
        });
      }
      setTimeout(() => closeThread(thread), 2000);
    });

    collector?.on("end", async (collected) => {
      if (collected.size === 0) {
        await interaction
          .editReply({
            embeds: [
              new EmbedBuilder()
                .setColor(getRandomPastelDecimal())
                .setTitle("✅ Thread Closed")
                .setDescription(
                  `Thread owner received **${config.xpOnThreadClose} XP**.`
                ),
            ],
            components: [],
          })
          .catch(() => {});
        await closeThread(thread);
      }
    });
  } else {
    // No helper bonus configured - just award thread owner and close
    const embed = new EmbedBuilder()
      .setColor(getRandomPastelDecimal())
      .setTitle("✅ Thread Closed")
      .setDescription(
        `Thread owner received **${config.xpOnThreadClose} XP**.`
      );

    await interaction.reply({ embeds: [embed] });
    setTimeout(() => closeThread(thread), 2000);
  }
};

async function closeThread(thread: {
  setLocked: (locked: boolean) => Promise<unknown>;
  setArchived: (archived: boolean) => Promise<unknown>;
}): Promise<void> {
  try {
    await thread.setLocked(true);
    await thread.setArchived(true);
  } catch {
    // Already closed
  }
}
