import type { GuildMember, StringSelectMenuInteraction } from "discord.js";

export default async function interactionCreate(
  interaction: StringSelectMenuInteraction
) {
  // Only handle our onboarding role select interactions
  if (!interaction.isStringSelectMenu()) {
    return;
  }

  if (!interaction.customId.startsWith("onboarding_role_select_")) {
    return;
  }

  // Defer the reply to prevent timeout
  await interaction.deferReply({ ephemeral: true });

  try {
    const member = interaction.member as GuildMember | null;
    if (!member?.roles) {
      await interaction.editReply({
        content: "❌ Could not find your member data.",
      });
      return;
    }

    const selectedRoleIds = interaction.values;
    const guild = interaction.guild;

    if (!guild) {
      await interaction.editReply({
        content: "❌ Could not find the server.",
      });
      return;
    }

    // Get all role options from the select menu to know which roles to manage
    const allRoleOptions = interaction.component.options.map(
      (opt) => opt.value
    );

    // Calculate roles to add and remove
    const rolesToAdd = selectedRoleIds.filter(
      (roleId) => !member.roles.cache.has(roleId)
    );
    const rolesToRemove = allRoleOptions.filter(
      (roleId) =>
        !selectedRoleIds.includes(roleId) && member.roles.cache.has(roleId)
    );

    // Apply role changes
    const addedRoles: string[] = [];
    const removedRoles: string[] = [];

    for (const roleId of rolesToAdd) {
      try {
        const role = guild.roles.cache.get(roleId);
        if (role) {
          await member.roles.add(role, "Onboarding role selection");
          addedRoles.push(role.name);
        }
      } catch (error) {
        console.error(`[Onboarding] Failed to add role ${roleId}:`, error);
      }
    }

    for (const roleId of rolesToRemove) {
      try {
        const role = guild.roles.cache.get(roleId);
        if (role) {
          await member.roles.remove(role, "Onboarding role deselection");
          removedRoles.push(role.name);
        }
      } catch (error) {
        console.error(`[Onboarding] Failed to remove role ${roleId}:`, error);
      }
    }

    // Build response message
    const parts: string[] = [];
    if (addedRoles.length > 0) {
      parts.push(`✅ Added: ${addedRoles.map((r) => `**${r}**`).join(", ")}`);
    }
    if (removedRoles.length > 0) {
      parts.push(
        `🔴 Removed: ${removedRoles.map((r) => `**${r}**`).join(", ")}`
      );
    }

    if (parts.length === 0) {
      await interaction.editReply({
        content: "✨ Your roles are already up to date!",
      });
    } else {
      await interaction.editReply({
        content: parts.join("\n"),
      });
    }

    console.log(
      `[Onboarding] ${interaction.user.tag} updated roles: +${addedRoles.length} -${removedRoles.length}`
    );
  } catch (error) {
    console.error("[Onboarding] Error handling role selection:", error);
    await interaction.editReply({
      content: "❌ Something went wrong while updating your roles.",
    });
  }
}
