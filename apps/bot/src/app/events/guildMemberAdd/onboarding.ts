import {
  db,
  onboardingConfig,
  onboardingThreads,
  welcomeMessages,
} from "@cozycore/db";
import type {
  GuildMember,
  TextChannel,
  ThreadAutoArchiveDuration,
  ThreadChannel,
} from "discord.js";
import {
  ActionRowBuilder,
  ChannelType,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import { eq } from "drizzle-orm";

const THREAD_AUTO_DELETE_MS = {
  "1d": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
};

const DEFAULT_TYPING_DELAY = 1500;

// Helper to simulate typing and send message with optional role select menu
async function sendWithTyping(
  thread: ThreadChannel,
  content: string,
  showTyping: boolean,
  delay: number,
  selectableRoles?: { id: string; name: string }[]
): Promise<void> {
  if (showTyping) {
    await thread.sendTyping();
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  // If there are selectable roles, add a select menu component
  if (selectableRoles && selectableRoles.length > 0) {
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`onboarding_role_select_${thread.id}`)
      .setPlaceholder("Select your roles...")
      .setMinValues(0)
      .setMaxValues(selectableRoles.length)
      .addOptions(
        selectableRoles.map((role) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(role.name)
            .setValue(role.id)
            .setDescription(`Get the ${role.name} role`)
        )
      );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      selectMenu
    );

    await thread.send({
      content,
      components: [row],
    });
  } else {
    await thread.send(content);
  }
}

export default async function guildMemberAdd(member: GuildMember) {
  console.log(
    `[Onboarding] New member: ${member.user.tag} in ${member.guild.name}`
  );

  try {
    // Get onboarding config for this guild
    const [config] = await db
      .select()
      .from(onboardingConfig)
      .where(eq(onboardingConfig.guildId, member.guild.id))
      .limit(1);

    // If onboarding is not enabled or not configured, skip
    if (!(config?.enabled && config.welcomeChannelId)) {
      console.log(`[Onboarding] Not enabled for guild ${member.guild.name}`);
      return;
    }

    // Get welcome channel
    const welcomeChannel = await member.guild.channels.fetch(
      config.welcomeChannelId
    );

    if (!welcomeChannel || welcomeChannel.type !== ChannelType.GuildText) {
      console.error(
        "[Onboarding] Welcome channel not found or not a text channel"
      );
      return;
    }

    const textChannel = welcomeChannel as TextChannel;

    // Get welcome messages
    const messages = await db
      .select()
      .from(welcomeMessages)
      .where(eq(welcomeMessages.guildId, member.guild.id))
      .orderBy(welcomeMessages.order);

    if (messages.length === 0) {
      console.log("[Onboarding] No welcome messages configured");
      return;
    }

    // Assign roles first so we can filter messages by assigned roles
    const assignedRoleIds: string[] = [];
    if (config.rolesOnJoin && config.rolesOnJoin.length > 0) {
      try {
        const rolesToAdd = config.rolesOnJoin.filter((roleId: string) =>
          member.guild.roles.cache.has(roleId)
        );

        if (rolesToAdd.length > 0) {
          await member.roles.add(rolesToAdd, "Onboarding auto-role assignment");
          assignedRoleIds.push(...rolesToAdd);
          console.log(
            `[Onboarding] Assigned ${rolesToAdd.length} roles to ${member.user.tag}`
          );
        }
      } catch (error) {
        console.error("[Onboarding] Failed to assign roles:", error);
      }
    }

    // Generate thread name from template
    const threadName = processMessageContent(
      config.threadNameTemplate || "Welcome {username}",
      member
    ).slice(0, 100); // Discord thread names max 100 chars

    // Create private thread for the new member
    const thread = await textChannel.threads.create({
      name: threadName,
      autoArchiveDuration: 1440 as ThreadAutoArchiveDuration, // 1 day
      type: ChannelType.PrivateThread,
      reason: `Onboarding thread for ${member.user.tag}`,
    });

    // Add the new member to the thread
    await thread.members.add(member.id);

    // Get typing settings
    const showTyping = config.showTypingIndicator ?? true;
    const typingDelay = config.typingDelay ?? DEFAULT_TYPING_DELAY;

    // Send welcome messages with optional role select menus
    for (const message of messages) {
      const content = processMessageContent(message.content, member);
      const selectableRoleIds = (message.selectableRoles as string[]) || [];

      // Get role info for selectable roles
      const selectableRoles = selectableRoleIds
        .map((roleId) => {
          const role = member.guild.roles.cache.get(roleId);
          return role ? { id: role.id, name: role.name } : null;
        })
        .filter((r): r is { id: string; name: string } => r !== null);

      await sendWithTyping(
        thread,
        content,
        showTyping,
        typingDelay,
        selectableRoles.length > 0 ? selectableRoles : undefined
      );
    }

    // Calculate when to delete the thread
    const deleteDelay =
      THREAD_AUTO_DELETE_MS[config.threadAutoDelete as "1d" | "7d"] ||
      THREAD_AUTO_DELETE_MS["1d"];
    const deleteAt = new Date(Date.now() + deleteDelay);

    // Store thread info for cleanup
    await db.insert(onboardingThreads).values({
      threadId: thread.id,
      guildId: member.guild.id,
      userId: member.id,
      deleteAt,
    });

    console.log(
      `[Onboarding] Created welcome thread for ${member.user.tag} in ${member.guild.name}`
    );
  } catch (error) {
    console.error(
      `[Onboarding] Error processing member ${member.user.tag}:`,
      error
    );
  }
}

// Process message content and replace placeholders
function processMessageContent(content: string, member: GuildMember): string {
  return content
    .replace(/{user}/g, `<@${member.id}>`)
    .replace(/{server}/g, member.guild.name)
    .replace(/{memberCount}/g, member.guild.memberCount.toString())
    .replace(/{username}/g, member.user.username);
}
