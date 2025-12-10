import {
  accounts,
  db,
  guilds,
  levelConfig,
  levelRoles,
  memberXp,
} from "@cozycore/db";
import type { LevelConfig, LevelRole } from "@cozycore/types";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchUserGuilds, hasManageGuildPermission } from "@/lib/discord";

type Params = Promise<{ guildId: string }>;

// GET - Fetch level config and roles
export async function GET(_request: Request, { params }: { params: Params }) {
  try {
    const { guildId } = await params;
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const [account] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.userId, session.user.id))
      .limit(1);

    if (!account?.accessToken) {
      return NextResponse.json(
        { success: false, error: "Discord account not linked" },
        { status: 400 }
      );
    }

    // Verify user has access to this guild
    const userGuilds = await fetchUserGuilds(account.accessToken);
    const targetGuild = userGuilds.find((g) => g.id === guildId);

    if (!(targetGuild && hasManageGuildPermission(targetGuild.permissions))) {
      return NextResponse.json(
        { success: false, error: "You don't have access to this server" },
        { status: 403 }
      );
    }

    // Check if bot is installed
    const [existingGuild] = await db
      .select()
      .from(guilds)
      .where(eq(guilds.id, guildId))
      .limit(1);

    if (!existingGuild) {
      return NextResponse.json(
        { success: false, error: "Bot is not installed in this server" },
        { status: 400 }
      );
    }

    // Get level config
    const [config] = await db
      .select()
      .from(levelConfig)
      .where(eq(levelConfig.guildId, guildId))
      .limit(1);

    // Get level roles ordered by XP requirement
    const roles = await db
      .select()
      .from(levelRoles)
      .where(eq(levelRoles.guildId, guildId))
      .orderBy(levelRoles.xpRequired);

    const responseConfig: LevelConfig = config
      ? {
          guildId: config.guildId,
          enabled: config.enabled,
          minXpPerMessage: config.minXpPerMessage,
          maxXpPerMessage: config.maxXpPerMessage,
          cooldownSeconds: config.cooldownSeconds,
          maxXpPerHour: config.maxXpPerHour,
          maxXpPerHourEnabled: config.maxXpPerHourEnabled,
          maxXpPerDay: config.maxXpPerDay,
          maxXpPerDayEnabled: config.maxXpPerDayEnabled,
          minMessageLength: config.minMessageLength,
          similaritySeverity:
            config.similaritySeverity as LevelConfig["similaritySeverity"],
          whitelistedChannels: config.whitelistedChannels ?? [],
          forumXpEnabled: config.forumXpEnabled,
          xpOnThreadClose: config.xpOnThreadClose,
          helperBonusXp: config.helperBonusXp,
          autoArchiveHours: config.autoArchiveHours,
          fastResolutionEnabled: config.fastResolutionEnabled,
          fastResolutionThresholdHours: config.fastResolutionThresholdHours,
          fastResolutionBonusXp: config.fastResolutionBonusXp,
          whitelistedForums: config.whitelistedForums ?? [],
          autoRemovePreviousRole: config.autoRemovePreviousRole,
          congratsChannelId: config.congratsChannelId,
          demotionChannelId: config.demotionChannelId,
          logChannelId: config.logChannelId,
          promotionEmbedTitle: config.promotionEmbedTitle,
          promotionEmbedDescription: config.promotionEmbedDescription,
          promotionEmbedDescriptions: config.promotionEmbedDescriptions ?? [],
          demotionEmbedTitle: config.demotionEmbedTitle,
          demotionEmbedDescription: config.demotionEmbedDescription,
          demotionEmbedDescriptions: config.demotionEmbedDescriptions ?? [],
          roleLossEmbedTitle: config.roleLossEmbedTitle,
          roleLossEmbedDescription: config.roleLossEmbedDescription,
          roleLossEmbedDescriptions: config.roleLossEmbedDescriptions ?? [],
          rolesEmbedChannelId: config.rolesEmbedChannelId,
          rolesEmbedMessageId: config.rolesEmbedMessageId,
          rolesEmbedTitle: config.rolesEmbedTitle,
          rolesEmbedDescription: config.rolesEmbedDescription,
          // Helper Recognition
          helperRecognitionChannelId: config.helperRecognitionChannelId,
          helperRecognitionEmbedTitle: config.helperRecognitionEmbedTitle,
          helperRecognitionEmbedDescription:
            config.helperRecognitionEmbedDescription,
          helperRecognitionEmbedDescriptions:
            config.helperRecognitionEmbedDescriptions ?? [],
          // Fast Resolution
          fastResolutionChannelId: config.fastResolutionChannelId,
          fastResolutionEmbedTitle: config.fastResolutionEmbedTitle,
          fastResolutionEmbedDescription: config.fastResolutionEmbedDescription,
          fastResolutionEmbedDescriptions:
            config.fastResolutionEmbedDescriptions ?? [],
          // Booster
          boosterEnabled: config.boosterEnabled,
          boosterChannelId: config.boosterChannelId,
          boosterXpMultiplier: config.boosterXpMultiplier,
          boosterBonusXpPerMessage: config.boosterBonusXpPerMessage,
          boosterHelperBonusMultiplier: config.boosterHelperBonusMultiplier,
          boosterEmbedTitle: config.boosterEmbedTitle,
          boosterEmbedDescription: config.boosterEmbedDescription,
          boosterEmbedDescriptions: config.boosterEmbedDescriptions ?? [],
          // Monthly Top Helper
          monthlyTopHelperEnabled: config.monthlyTopHelperEnabled,
          monthlyTopHelperChannelId: config.monthlyTopHelperChannelId,
          monthlyTopHelperDay: config.monthlyTopHelperDay,
          monthlyTopHelperHour: config.monthlyTopHelperHour,
          monthlyTopHelperFirst: config.monthlyTopHelperFirst,
          monthlyTopHelperSecond: config.monthlyTopHelperSecond,
          monthlyTopHelperThird: config.monthlyTopHelperThird,
          monthlyTopHelperEmbedTitle: config.monthlyTopHelperEmbedTitle,
          monthlyTopHelperEmbedDescription:
            config.monthlyTopHelperEmbedDescription,
          monthlyTopHelperEmbedDescriptions:
            config.monthlyTopHelperEmbedDescriptions ?? [],
          lastMonthlyTopHelperRun: config.lastMonthlyTopHelperRun,
        }
      : {
          guildId,
          enabled: false,
          minXpPerMessage: 4,
          maxXpPerMessage: 10,
          cooldownSeconds: 60,
          maxXpPerHour: null,
          maxXpPerHourEnabled: false,
          maxXpPerDay: null,
          maxXpPerDayEnabled: false,
          minMessageLength: 5,
          similaritySeverity: "medium",
          whitelistedChannels: [],
          forumXpEnabled: false,
          xpOnThreadClose: 25,
          helperBonusXp: 15,
          autoArchiveHours: 24,
          fastResolutionEnabled: false,
          fastResolutionThresholdHours: 2,
          fastResolutionBonusXp: 10,
          whitelistedForums: [],
          autoRemovePreviousRole: true,
          congratsChannelId: null,
          demotionChannelId: null,
          logChannelId: null,
          promotionEmbedTitle: "🎉 Level Up!",
          promotionEmbedDescription:
            "Félicitations à {user}, il a obtenu le rôle {role}!",
          promotionEmbedDescriptions: [],
          demotionEmbedTitle: "⚠️ Role Change",
          demotionEmbedDescription:
            "{user} a été rétrogradé de {oldRole} à {newRole}!",
          demotionEmbedDescriptions: [],
          roleLossEmbedTitle: "📉 Role Removed",
          roleLossEmbedDescription: "{user} a perdu son rôle {role}!",
          roleLossEmbedDescriptions: [],
          rolesEmbedChannelId: null,
          rolesEmbedMessageId: null,
          rolesEmbedTitle: "🏆 Level Roles",
          rolesEmbedDescription: "Earn XP by chatting to unlock these roles!",
          // Helper Recognition
          helperRecognitionChannelId: null,
          helperRecognitionEmbedTitle: "🌟 Helpful Member!",
          helperRecognitionEmbedDescription:
            "{helper} was marked as the most helpful by {asker}!",
          helperRecognitionEmbedDescriptions: [],
          // Fast Resolution
          fastResolutionChannelId: null,
          fastResolutionEmbedTitle: "⚡ Quick Helper!",
          fastResolutionEmbedDescription:
            "{helper} solved this issue in under {hours} hours! (+{xp} XP)",
          fastResolutionEmbedDescriptions: [],
          // Booster
          boosterEnabled: false,
          boosterChannelId: null,
          boosterXpMultiplier: 1.5,
          boosterBonusXpPerMessage: 5,
          boosterHelperBonusMultiplier: 1.25,
          boosterEmbedTitle: "💎 Thank You, Booster!",
          boosterEmbedDescription:
            "Thanks {user} for boosting the server! Enjoy your XP bonuses!",
          boosterEmbedDescriptions: [],
          // Monthly Top Helper
          monthlyTopHelperEnabled: false,
          monthlyTopHelperChannelId: null,
          monthlyTopHelperDay: 1,
          monthlyTopHelperHour: 12,
          monthlyTopHelperFirst: null,
          monthlyTopHelperSecond: null,
          monthlyTopHelperThird: null,
          monthlyTopHelperEmbedTitle: "🏆 Monthly Top Helpers!",
          monthlyTopHelperEmbedDescription:
            "Congratulations to our top helpers this month!\n\n🥇 {first}\n🥈 {second}\n🥉 {third}",
          monthlyTopHelperEmbedDescriptions: [],
          lastMonthlyTopHelperRun: null,
        };

    const responseRoles: LevelRole[] = roles.map((r) => ({
      id: r.id,
      guildId: r.guildId,
      roleId: r.roleId,
      xpRequired: r.xpRequired,
      order: r.order,
    }));

    return NextResponse.json({
      success: true,
      data: {
        config: responseConfig,
        roles: responseRoles,
      },
    });
  } catch (error) {
    console.error("Error fetching level config:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch level config" },
      { status: 500 }
    );
  }
}

// PATCH - Update level config
export async function PATCH(request: Request, { params }: { params: Params }) {
  try {
    const { guildId } = await params;
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const [account] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.userId, session.user.id))
      .limit(1);

    if (!account?.accessToken) {
      return NextResponse.json(
        { success: false, error: "Discord account not linked" },
        { status: 400 }
      );
    }

    const userGuilds = await fetchUserGuilds(account.accessToken);
    const targetGuild = userGuilds.find((g) => g.id === guildId);

    if (!(targetGuild && hasManageGuildPermission(targetGuild.permissions))) {
      return NextResponse.json(
        { success: false, error: "You don't have access to this server" },
        { status: 403 }
      );
    }

    const [existingGuild] = await db
      .select()
      .from(guilds)
      .where(eq(guilds.id, guildId))
      .limit(1);

    if (!existingGuild) {
      return NextResponse.json(
        { success: false, error: "Bot is not installed in this server" },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Upsert level config
    const [updatedConfig] = await db
      .insert(levelConfig)
      .values({
        guildId,
        enabled: body.enabled ?? false,
        minXpPerMessage: body.minXpPerMessage ?? 4,
        maxXpPerMessage: body.maxXpPerMessage ?? 10,
        cooldownSeconds: body.cooldownSeconds ?? 60,
        maxXpPerHour: body.maxXpPerHour ?? null,
        maxXpPerHourEnabled: body.maxXpPerHourEnabled ?? false,
        maxXpPerDay: body.maxXpPerDay ?? null,
        maxXpPerDayEnabled: body.maxXpPerDayEnabled ?? false,
        minMessageLength: body.minMessageLength ?? 5,
        similaritySeverity: body.similaritySeverity ?? "medium",
        whitelistedChannels: body.whitelistedChannels ?? [],
        forumXpEnabled: body.forumXpEnabled ?? false,
        xpOnThreadClose: body.xpOnThreadClose ?? 25,
        helperBonusXp: body.helperBonusXp ?? 15,
        autoArchiveHours: body.autoArchiveHours ?? 24,
        fastResolutionEnabled: body.fastResolutionEnabled ?? false,
        fastResolutionThresholdHours: body.fastResolutionThresholdHours ?? 2,
        fastResolutionBonusXp: body.fastResolutionBonusXp ?? 10,
        whitelistedForums: body.whitelistedForums ?? [],
        autoRemovePreviousRole: body.autoRemovePreviousRole ?? true,
        congratsChannelId: body.congratsChannelId ?? null,
        demotionChannelId: body.demotionChannelId ?? null,
        logChannelId: body.logChannelId ?? null,
        promotionEmbedTitle: body.promotionEmbedTitle ?? "🎉 Level Up!",
        promotionEmbedDescription:
          body.promotionEmbedDescription ??
          "Félicitations à {user}, il a obtenu le rôle {role}!",
        promotionEmbedDescriptions: body.promotionEmbedDescriptions ?? [],
        demotionEmbedTitle: body.demotionEmbedTitle ?? "⚠️ Role Change",
        demotionEmbedDescription:
          body.demotionEmbedDescription ??
          "{user} a été rétrogradé de {oldRole} à {newRole}!",
        demotionEmbedDescriptions: body.demotionEmbedDescriptions ?? [],
        roleLossEmbedTitle: body.roleLossEmbedTitle ?? "📉 Role Removed",
        roleLossEmbedDescription:
          body.roleLossEmbedDescription ?? "{user} a perdu son rôle {role}!",
        roleLossEmbedDescriptions: body.roleLossEmbedDescriptions ?? [],
        // Helper Recognition
        helperRecognitionChannelId: body.helperRecognitionChannelId ?? null,
        helperRecognitionEmbedTitle:
          body.helperRecognitionEmbedTitle ?? "🌟 Helpful Member!",
        helperRecognitionEmbedDescription:
          body.helperRecognitionEmbedDescription ??
          "{helper} was marked as the most helpful by {asker}!",
        helperRecognitionEmbedDescriptions:
          body.helperRecognitionEmbedDescriptions ?? [],
        // Fast Resolution
        fastResolutionChannelId: body.fastResolutionChannelId ?? null,
        fastResolutionEmbedTitle:
          body.fastResolutionEmbedTitle ?? "⚡ Quick Helper!",
        fastResolutionEmbedDescription:
          body.fastResolutionEmbedDescription ??
          "{helper} solved this issue in under {hours} hours! (+{xp} XP)",
        fastResolutionEmbedDescriptions:
          body.fastResolutionEmbedDescriptions ?? [],
        // Booster
        boosterEnabled: body.boosterEnabled ?? false,
        boosterChannelId: body.boosterChannelId ?? null,
        boosterXpMultiplier: body.boosterXpMultiplier ?? 1.5,
        boosterBonusXpPerMessage: body.boosterBonusXpPerMessage ?? 5,
        boosterHelperBonusMultiplier: body.boosterHelperBonusMultiplier ?? 1.25,
        boosterEmbedTitle: body.boosterEmbedTitle ?? "💎 Thank You, Booster!",
        boosterEmbedDescription:
          body.boosterEmbedDescription ??
          "Thanks {user} for boosting the server! Enjoy your XP bonuses!",
        boosterEmbedDescriptions: body.boosterEmbedDescriptions ?? [],
        // Monthly Top Helper
        monthlyTopHelperEnabled: body.monthlyTopHelperEnabled ?? false,
        monthlyTopHelperChannelId: body.monthlyTopHelperChannelId ?? null,
        monthlyTopHelperDay: body.monthlyTopHelperDay ?? 1,
        monthlyTopHelperHour: body.monthlyTopHelperHour ?? 12,
        monthlyTopHelperFirst: body.monthlyTopHelperFirst ?? null,
        monthlyTopHelperSecond: body.monthlyTopHelperSecond ?? null,
        monthlyTopHelperThird: body.monthlyTopHelperThird ?? null,
        monthlyTopHelperEmbedTitle:
          body.monthlyTopHelperEmbedTitle ?? "🏆 Monthly Top Helpers!",
        monthlyTopHelperEmbedDescription:
          body.monthlyTopHelperEmbedDescription ??
          "Congratulations to our top helpers this month!\n\n🥇 {first}\n🥈 {second}\n🥉 {third}",
        monthlyTopHelperEmbedDescriptions:
          body.monthlyTopHelperEmbedDescriptions ?? [],
      })
      .onConflictDoUpdate({
        target: levelConfig.guildId,
        set: {
          enabled: body.enabled ?? false,
          minXpPerMessage: body.minXpPerMessage ?? 4,
          maxXpPerMessage: body.maxXpPerMessage ?? 10,
          cooldownSeconds: body.cooldownSeconds ?? 60,
          maxXpPerHour: body.maxXpPerHour ?? null,
          maxXpPerHourEnabled: body.maxXpPerHourEnabled ?? false,
          maxXpPerDay: body.maxXpPerDay ?? null,
          maxXpPerDayEnabled: body.maxXpPerDayEnabled ?? false,
          minMessageLength: body.minMessageLength ?? 5,
          similaritySeverity: body.similaritySeverity ?? "medium",
          whitelistedChannels: body.whitelistedChannels ?? [],
          forumXpEnabled: body.forumXpEnabled ?? false,
          xpOnThreadClose: body.xpOnThreadClose ?? 25,
          helperBonusXp: body.helperBonusXp ?? 15,
          autoArchiveHours: body.autoArchiveHours ?? 24,
          fastResolutionEnabled: body.fastResolutionEnabled ?? false,
          fastResolutionThresholdHours: body.fastResolutionThresholdHours ?? 2,
          fastResolutionBonusXp: body.fastResolutionBonusXp ?? 10,
          whitelistedForums: body.whitelistedForums ?? [],
          autoRemovePreviousRole: body.autoRemovePreviousRole ?? true,
          congratsChannelId: body.congratsChannelId ?? null,
          demotionChannelId: body.demotionChannelId ?? null,
          logChannelId: body.logChannelId ?? null,
          promotionEmbedTitle: body.promotionEmbedTitle ?? "🎉 Level Up!",
          promotionEmbedDescription:
            body.promotionEmbedDescription ??
            "Félicitations à {user}, il a obtenu le rôle {role}!",
          promotionEmbedDescriptions: body.promotionEmbedDescriptions ?? [],
          demotionEmbedTitle: body.demotionEmbedTitle ?? "⚠️ Role Change",
          demotionEmbedDescription:
            body.demotionEmbedDescription ??
            "{user} a été rétrogradé de {oldRole} à {newRole}!",
          demotionEmbedDescriptions: body.demotionEmbedDescriptions ?? [],
          roleLossEmbedTitle: body.roleLossEmbedTitle ?? "📉 Role Removed",
          roleLossEmbedDescription:
            body.roleLossEmbedDescription ?? "{user} a perdu son rôle {role}!",
          roleLossEmbedDescriptions: body.roleLossEmbedDescriptions ?? [],
          // Helper Recognition
          helperRecognitionChannelId: body.helperRecognitionChannelId ?? null,
          helperRecognitionEmbedTitle:
            body.helperRecognitionEmbedTitle ?? "🌟 Helpful Member!",
          helperRecognitionEmbedDescription:
            body.helperRecognitionEmbedDescription ??
            "{helper} was marked as the most helpful by {asker}!",
          helperRecognitionEmbedDescriptions:
            body.helperRecognitionEmbedDescriptions ?? [],
          // Fast Resolution
          fastResolutionChannelId: body.fastResolutionChannelId ?? null,
          fastResolutionEmbedTitle:
            body.fastResolutionEmbedTitle ?? "⚡ Quick Helper!",
          fastResolutionEmbedDescription:
            body.fastResolutionEmbedDescription ??
            "{helper} solved this issue in under {hours} hours! (+{xp} XP)",
          fastResolutionEmbedDescriptions:
            body.fastResolutionEmbedDescriptions ?? [],
          // Booster
          boosterEnabled: body.boosterEnabled ?? false,
          boosterChannelId: body.boosterChannelId ?? null,
          boosterXpMultiplier: body.boosterXpMultiplier ?? 1.5,
          boosterBonusXpPerMessage: body.boosterBonusXpPerMessage ?? 5,
          boosterHelperBonusMultiplier:
            body.boosterHelperBonusMultiplier ?? 1.25,
          boosterEmbedTitle: body.boosterEmbedTitle ?? "💎 Thank You, Booster!",
          boosterEmbedDescription:
            body.boosterEmbedDescription ??
            "Thanks {user} for boosting the server! Enjoy your XP bonuses!",
          boosterEmbedDescriptions: body.boosterEmbedDescriptions ?? [],
          // Monthly Top Helper
          monthlyTopHelperEnabled: body.monthlyTopHelperEnabled ?? false,
          monthlyTopHelperChannelId: body.monthlyTopHelperChannelId ?? null,
          monthlyTopHelperDay: body.monthlyTopHelperDay ?? 1,
          monthlyTopHelperHour: body.monthlyTopHelperHour ?? 12,
          monthlyTopHelperFirst: body.monthlyTopHelperFirst ?? null,
          monthlyTopHelperSecond: body.monthlyTopHelperSecond ?? null,
          monthlyTopHelperThird: body.monthlyTopHelperThird ?? null,
          monthlyTopHelperEmbedTitle:
            body.monthlyTopHelperEmbedTitle ?? "🏆 Monthly Top Helpers!",
          monthlyTopHelperEmbedDescription:
            body.monthlyTopHelperEmbedDescription ??
            "Congratulations to our top helpers this month!\n\n🥇 {first}\n🥈 {second}\n🥉 {third}",
          monthlyTopHelperEmbedDescriptions:
            body.monthlyTopHelperEmbedDescriptions ?? [],
          updatedAt: new Date(),
        },
      })
      .returning();

    return NextResponse.json({ success: true, data: updatedConfig });
  } catch (error) {
    console.error("Error updating level config:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update level config" },
      { status: 500 }
    );
  }
}

// DELETE - Reset level system (clear all XP and notification channels)
export async function DELETE(
  _request: Request,
  { params }: { params: Params }
) {
  try {
    const { guildId } = await params;
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const [account] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.userId, session.user.id))
      .limit(1);

    if (!account?.accessToken) {
      return NextResponse.json(
        { success: false, error: "Discord account not linked" },
        { status: 400 }
      );
    }

    // Verify user has access to this guild
    const userGuilds = await fetchUserGuilds(account.accessToken);
    const targetGuild = userGuilds.find((g) => g.id === guildId);

    if (!(targetGuild && hasManageGuildPermission(targetGuild.permissions))) {
      return NextResponse.json(
        { success: false, error: "You don't have access to this server" },
        { status: 403 }
      );
    }

    // Delete all member XP records for this guild
    await db.delete(memberXp).where(eq(memberXp.guildId, guildId));

    // Delete all level roles for this guild
    await db.delete(levelRoles).where(eq(levelRoles.guildId, guildId));

    return NextResponse.json({
      success: true,
      message: "Level system reset successfully",
    });
  } catch (error) {
    console.error("Error resetting level system:", error);
    return NextResponse.json(
      { success: false, error: "Failed to reset level system" },
      { status: 500 }
    );
  }
}
