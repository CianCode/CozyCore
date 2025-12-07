import { accounts, db, guilds, levelConfig, levelRoles } from "@cozycore/db";
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
          demotionEmbedTitle: config.demotionEmbedTitle,
          demotionEmbedDescription: config.demotionEmbedDescription,
          roleLossEmbedTitle: config.roleLossEmbedTitle,
          roleLossEmbedDescription: config.roleLossEmbedDescription,
          rolesEmbedChannelId: config.rolesEmbedChannelId,
          rolesEmbedMessageId: config.rolesEmbedMessageId,
          rolesEmbedTitle: config.rolesEmbedTitle,
          rolesEmbedDescription: config.rolesEmbedDescription,
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
          demotionEmbedTitle: "⚠️ Role Change",
          demotionEmbedDescription:
            "{user} a été rétrogradé de {oldRole} à {newRole}!",
          roleLossEmbedTitle: "📉 Role Removed",
          roleLossEmbedDescription: "{user} a perdu son rôle {role}!",
          rolesEmbedChannelId: null,
          rolesEmbedMessageId: null,
          rolesEmbedTitle: "🏆 Level Roles",
          rolesEmbedDescription: "Earn XP by chatting to unlock these roles!",
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
        demotionEmbedTitle: body.demotionEmbedTitle ?? "⚠️ Role Change",
        demotionEmbedDescription:
          body.demotionEmbedDescription ??
          "{user} a été rétrogradé de {oldRole} à {newRole}!",
        roleLossEmbedTitle: body.roleLossEmbedTitle ?? "📉 Role Removed",
        roleLossEmbedDescription:
          body.roleLossEmbedDescription ?? "{user} a perdu son rôle {role}!",
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
          demotionEmbedTitle: body.demotionEmbedTitle ?? "⚠️ Role Change",
          demotionEmbedDescription:
            body.demotionEmbedDescription ??
            "{user} a été rétrogradé de {oldRole} à {newRole}!",
          roleLossEmbedTitle: body.roleLossEmbedTitle ?? "📉 Role Removed",
          roleLossEmbedDescription:
            body.roleLossEmbedDescription ?? "{user} a perdu son rôle {role}!",
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
