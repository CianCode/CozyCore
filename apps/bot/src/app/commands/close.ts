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

type LevelConfig = NonNullable<Awaited<ReturnType<typeof getLevelConfig>>>;

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

/**
 * Close and archive a thread
 */
async function closeThread(thread: {
  setLocked: (locked: boolean) => Promise<unknown>;
  setArchived: (archived: boolean) => Promise<unknown>;
}): Promise<void> {
  try {
    await thread.setLocked(true);
    await thread.setArchived(true);
  } catch {
    // Already closed or lacks permission
  }
}

/**
 * Get participants from thread messages (excluding owner and bots)
 */
async function getParticipants(thread: {
  ownerId: string | null;
  messages: { fetch: (options: { limit: number }) => Promise<Map<string, { author: { id: string; username: string; bot: boolean } }>> };
}): Promise<Map<string, string>> {
  const messages = await thread.messages.fetch({ limit: 100 });
  const participants = new Map<string, string>();

  for (const msg of messages.values()) {
    if (msg.author.id !== thread.ownerId && !msg.author.bot) {
      participants.set(msg.author.id, msg.author.username);
    }
  }

  return participants;
}

/**
 * Create embed for resolved thread
 */
function createResolvedEmbed(xpAmount: number, helperBonus: number): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(getRandomPastelDecimal())
    .setTitle("🎉 Thread Resolved!")
    .setDescription(
      `Thread owner received **${xpAmount} XP**.\n\n` +
        `Recognize a helpful member for **${helperBonus} bonus XP**?`
    )
    .setFooter({ text: "Select a member or wait 60s to skip" });
}

/**
 * Create helper selection menu
 */
function createHelperSelectMenu(
  threadId: string,
  participants: Map<string, string>,
  bonusXp: number
): StringSelectMenuBuilder {
  const options = Array.from(participants.entries())
    .slice(0, 25)
    .map(([id, name]) =>
      new StringSelectMenuOptionBuilder()
        .setLabel(name)
        .setValue(id)
        .setDescription(`Award ${bonusXp} bonus XP`)
    );

  return new StringSelectMenuBuilder()
    .setCustomId(`close_helper_${threadId}`)
    .setPlaceholder("Select helpful member (optional)")
    .setMinValues(0)
    .setMaxValues(1)
    .addOptions(options);
}

/**
 * Handle helper selection with collector
 */
function setupHelperCollector<
  TInteraction extends {
    channel: { createMessageComponentCollector: (options: unknown) => unknown } | null;
    user: { id: string };
    editReply: (options: unknown) => Promise<unknown>;
  },
  TThread extends { id: string; setLocked: (v: boolean) => Promise<unknown>; setArchived: (v: boolean) => Promise<unknown> },
  TGuild extends { id: string }
>(
  interaction: TInteraction,
  thread: TThread,
  guild: TGuild,
  config: LevelConfig
): void {
  const channel = interaction.channel as {
    createMessageComponentCollector: (options: {
      filter: (i: { customId: string; user: { id: string } }) => boolean;
      time: number;
      max: number;
    }) => {
      on: (event: string, handler: (arg: unknown) => void) => void;
    };
  } | null;
  
  const collector = channel?.createMessageComponentCollector({
    filter: (i: { customId: string; user: { id: string } }) =>
      i.customId === `close_helper_${thread.id}` &&
      i.user.id === interaction.user.id,
    time: 60_000,
    max: 1,
  });

  collector?.on("collect", async (i: unknown) => {
    const selectInteraction = i as {
      isStringSelectMenu: () => boolean;
      values: string[];
      update: (options: unknown) => Promise<unknown>;
    };
    
    if (selectInteraction.isStringSelectMenu() && selectInteraction.values[0]) {
      const helperId = selectInteraction.values[0];
      await awardXp({
        guild: guild as Parameters<typeof awardXp>[0]["guild"],
        userId: helperId,
        amount: config.helperBonusXp,
        source: "helper",
      });

      await selectInteraction.update({
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

  collector?.on("end", async (collected: { size: number }) => {
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
        .catch(() => {
          // Ignore edit failures
        });
      await closeThread(thread);
    }
  });
}

/**
 * Check if user has permission to close the thread
 */
function canCloseThread<
  TInteraction extends {
    member: { permissions: string | { has: (perm: string) => boolean } } | null;
    user: { id: string };
  },
  TThread extends { ownerId: string | null }
>(interaction: TInteraction, thread: TThread): boolean {
  const member = interaction.member;
  const isOwner = thread.ownerId === interaction.user.id;
  const canManage =
    member &&
    typeof member.permissions !== "string" &&
    member.permissions.has("ManageThreads");

  return isOwner || Boolean(canManage);
}

/**
 * Handle thread with no XP configuration or not in whitelist
 */
async function handleSimpleClose<
  TInteraction extends { reply: (options: unknown) => Promise<unknown> },
  TThread extends { setLocked: (v: boolean) => Promise<unknown>; setArchived: (v: boolean) => Promise<unknown> }
>(interaction: TInteraction, thread: TThread): Promise<void> {
  await closeThread(thread);
  await interaction.reply({ content: "✅ Thread closed.", ephemeral: true });
}

type XpCloseParams<TInteraction, TThread, TGuild> = {
  interaction: TInteraction;
  thread: TThread;
  guild: TGuild;
  config: LevelConfig;
  participants: Map<string, string>;
};

/**
 * Handle thread with participants and XP rewards
 */
async function handleXpClose<
  TInteraction extends {
    reply: (options: unknown) => Promise<unknown>;
    channel: { createMessageComponentCollector: (options: unknown) => unknown } | null;
    user: { id: string };
    editReply: (options: unknown) => Promise<unknown>;
  },
  TThread extends {
    id: string;
    ownerId: string | null;
    setLocked: (v: boolean) => Promise<unknown>;
    setArchived: (v: boolean) => Promise<unknown>;
  },
  TGuild extends { id: string }
>(params: XpCloseParams<TInteraction, TThread, TGuild>): Promise<void> {
  const { interaction, thread, guild, config, participants } = params;
  // Award XP to thread owner
  if (thread.ownerId) {
    await awardXp({
      guild: guild as Parameters<typeof awardXp>[0]["guild"],
      userId: thread.ownerId,
      amount: config.xpOnThreadClose,
      source: "thread",
    });
  }

  // If helper bonus enabled, show select menu
  if (config.helperBonusXp > 0) {
    const select = createHelperSelectMenu(
      thread.id,
      participants,
      config.helperBonusXp
    );
    const embed = createResolvedEmbed(config.xpOnThreadClose, config.helperBonusXp);

    await interaction.reply({
      embeds: [embed],
      components: [
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select),
      ],
    });

    setupHelperCollector(interaction, thread, guild, config);
  } else {
    // No helper bonus configured
    const embed = new EmbedBuilder()
      .setColor(getRandomPastelDecimal())
      .setTitle("✅ Thread Closed")
      .setDescription(
        `Thread owner received **${config.xpOnThreadClose} XP**.`
      );

    await interaction.reply({ embeds: [embed] });
    setTimeout(() => closeThread(thread), 2000);
  }
}

export const chatInput: ChatInputCommand = async ({ interaction }) => {
  if (interaction.options.getSubcommand() !== "thread") {
    return;
  }

  const channel = interaction.channel;
  if (!channel?.isThread()) {
    return interaction.reply({
      content: "❌ Use this in a forum thread.",
      ephemeral: true,
    });
  }

  const thread = channel;
  const parent = thread.parent;

  if (!parent || parent.type !== ChannelType.GuildForum) {
    return interaction.reply({
      content: "❌ Use this in a forum thread.",
      ephemeral: true,
    });
  }

  if (!canCloseThread(interaction, thread)) {
    return interaction.reply({
      content: "❌ Only the thread owner or moderators can close this.",
      ephemeral: true,
    });
  }

  const guild = interaction.guild;
  if (!guild) {
    return interaction.reply({ content: "❌ Server only.", ephemeral: true });
  }

  const config = await getLevelConfig(guild.id);

  // No forum XP - just close
  if (!config?.forumXpEnabled) {
    return handleSimpleClose(interaction, thread);
  }

  // Check forum whitelist
  const whitelist = config.whitelistedForums ?? [];
  if (whitelist.length > 0 && !whitelist.includes(parent.id)) {
    return handleSimpleClose(interaction, thread);
  }

  const participants = await getParticipants(thread);

  // No participants = no XP
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

  await handleXpClose({ interaction, thread, guild, config, participants });
};
