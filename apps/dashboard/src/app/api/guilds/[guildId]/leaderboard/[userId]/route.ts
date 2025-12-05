import { accounts, db, levelConfig, levelRoles, memberXp } from "@cozycore/db";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchUserGuilds, hasManageGuildPermission } from "@/lib/discord";

type Params = Promise<{ guildId: string; userId: string }>;

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

// GET - Get user XP details
export async function GET(_request: Request, { params }: { params: Params }) {
  try {
    const { guildId, userId } = await params;

    const session = await auth.api.getSession({ headers: await headers() });
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
        { success: false, error: "No access" },
        { status: 403 }
      );
    }

    const [member] = await db
      .select()
      .from(memberXp)
      .where(and(eq(memberXp.guildId, guildId), eq(memberXp.userId, userId)))
      .limit(1);

    if (!member) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: member });
  } catch (error) {
    console.error("Get user XP error:", error);
    return NextResponse.json(
      { success: false, error: "Internal error" },
      { status: 500 }
    );
  }
}

// PATCH - Adjust user XP
export async function PATCH(request: Request, { params }: { params: Params }) {
  try {
    const { guildId, userId } = await params;
    const body = await request.json();
    const { amount, reason } = body as { amount: number; reason?: string };

    const session = await auth.api.getSession({ headers: await headers() });
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
        { success: false, error: "No access" },
        { status: 403 }
      );
    }

    // Get or create member
    let [member] = await db
      .select()
      .from(memberXp)
      .where(and(eq(memberXp.guildId, guildId), eq(memberXp.userId, userId)))
      .limit(1);

    const oldXp = member?.totalXp ?? 0;
    const newXp = Math.max(0, oldXp + amount); // Prevent negative XP

    if (member) {
      await db
        .update(memberXp)
        .set({ totalXp: newXp, updatedAt: new Date() })
        .where(eq(memberXp.id, member.id));
    } else {
      const newMember = {
        id: crypto.randomUUID(),
        guildId,
        userId,
        totalXp: newXp,
        xpEarnedToday: 0,
        xpEarnedThisHour: 0,
      };
      await db.insert(memberXp).values(newMember);
      member = {
        ...newMember,
        currentRoleId: null,
        lastMessageAt: null,
        lastHourReset: null,
        lastDayReset: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    // Get config for notifications
    const [config] = await db
      .select()
      .from(levelConfig)
      .where(eq(levelConfig.guildId, guildId))
      .limit(1);

    // Get level roles
    const roles = await db
      .select()
      .from(levelRoles)
      .where(eq(levelRoles.guildId, guildId))
      .orderBy(levelRoles.xpRequired);

    // Check for role changes
    const oldRole = member.currentRoleId;
    const qualified = roles.filter((r) => r.xpRequired <= newXp);
    const newRole = qualified.at(-1);

    let roleChanged = false;
    if (newRole && newRole.roleId !== oldRole) {
      roleChanged = true;

      // Update current role in DB
      await db
        .update(memberXp)
        .set({ currentRoleId: newRole.roleId })
        .where(and(eq(memberXp.guildId, guildId), eq(memberXp.userId, userId)));

      // Assign/remove roles via Discord API
      await updateDiscordRoles(
        guildId,
        userId,
        oldRole,
        newRole.roleId,
        config?.autoRemovePreviousRole ?? true
      );

      // Send notification embed
      if (config) {
        const isPromotion =
          !oldRole ||
          (roles.find((r) => r.roleId === oldRole)?.xpRequired ?? 0) <
            newRole.xpRequired;
        await sendRoleNotification(
          guildId,
          config,
          userId,
          newRole.roleId,
          oldRole,
          isPromotion
        );
      }
    } else if (!newRole && oldRole) {
      // Lost all roles
      roleChanged = true;
      await db
        .update(memberXp)
        .set({ currentRoleId: null })
        .where(and(eq(memberXp.guildId, guildId), eq(memberXp.userId, userId)));

      if (config?.autoRemovePreviousRole) {
        await removeDiscordRole(guildId, userId, oldRole);
      }
    }

    // Send log message
    if (config?.logChannelId) {
      await sendLogMessage(guildId, config.logChannelId, {
        userId,
        adminId: session.user.id,
        adminName: session.user.name,
        oldXp,
        newXp,
        amount,
        reason,
        roleChanged,
        newRoleId: newRole?.roleId ?? null,
        oldRoleId: oldRole,
      });
    }

    return NextResponse.json({
      success: true,
      data: { oldXp, newXp, roleChanged },
    });
  } catch (error) {
    console.error("Adjust XP error:", error);
    return NextResponse.json(
      { success: false, error: "Internal error" },
      { status: 500 }
    );
  }
}

async function updateDiscordRoles(
  guildId: string,
  userId: string,
  oldRoleId: string | null,
  newRoleId: string,
  autoRemove: boolean
): Promise<void> {
  if (!BOT_TOKEN) return;

  // Add new role
  await fetch(
    `https://discord.com/api/v10/guilds/${guildId}/members/${userId}/roles/${newRoleId}`,
    {
      method: "PUT",
      headers: { Authorization: `Bot ${BOT_TOKEN}` },
    }
  ).catch(() => {});

  // Remove old role if configured
  if (autoRemove && oldRoleId) {
    await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/members/${userId}/roles/${oldRoleId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bot ${BOT_TOKEN}` },
      }
    ).catch(() => {});
  }
}

async function removeDiscordRole(
  guildId: string,
  userId: string,
  roleId: string
): Promise<void> {
  if (!BOT_TOKEN) return;

  await fetch(
    `https://discord.com/api/v10/guilds/${guildId}/members/${userId}/roles/${roleId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bot ${BOT_TOKEN}` },
    }
  ).catch(() => {});
}

async function sendRoleNotification(
  guildId: string,
  config: typeof levelConfig.$inferSelect,
  userId: string,
  newRoleId: string,
  oldRoleId: string | null,
  isPromotion: boolean
): Promise<void> {
  if (!BOT_TOKEN) return;

  const channelId = isPromotion
    ? config.congratsChannelId
    : config.demotionChannelId;
  if (!channelId) return;

  const title = isPromotion
    ? config.promotionEmbedTitle
    : config.demotionEmbedTitle;
  const template =
    (isPromotion
      ? config.promotionEmbedDescription
      : config.demotionEmbedDescription) || "{user} earned {role}!";

  const description = template
    .replace(/{user}/g, `<@${userId}>`)
    .replace(/{role}/g, `<@&${newRoleId}>`)
    .replace(/{newRole}/g, `<@&${newRoleId}>`)
    .replace(/{oldRole}/g, oldRoleId ? `<@&${oldRoleId}>` : "none");

  const embed: Record<string, unknown> = {
    color: getRandomPastelDecimal(),
    description,
    timestamp: new Date().toISOString(),
  };

  if (title) {
    embed.title = title;
  }

  await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ embeds: [embed] }),
  }).catch(() => {});
}

async function sendLogMessage(
  guildId: string,
  channelId: string,
  data: {
    userId: string;
    adminId: string;
    adminName: string;
    oldXp: number;
    newXp: number;
    amount: number;
    reason?: string;
    roleChanged: boolean;
    newRoleId: string | null;
    oldRoleId: string | null;
  }
): Promise<void> {
  if (!BOT_TOKEN) return;

  const action = data.amount > 0 ? "added" : "removed";
  const absAmount = Math.abs(data.amount);

  let description = `<@${data.userId}> had **${absAmount} XP** ${action} via dashboard (${data.oldXp} → ${data.newXp})`;

  if (data.reason) {
    description += `\n**Reason:** ${data.reason}`;
  }

  if (data.roleChanged) {
    if (data.newRoleId && data.oldRoleId) {
      description += `\n**Role changed:** <@&${data.oldRoleId}> → <@&${data.newRoleId}>`;
    } else if (data.newRoleId) {
      description += `\n**Role assigned:** <@&${data.newRoleId}>`;
    } else if (data.oldRoleId) {
      description += `\n**Role removed:** <@&${data.oldRoleId}>`;
    }
  }

  description += `\n**Admin:** ${data.adminName}`;

  const embed = {
    title: "Logs Level",
    color: getRandomPastelDecimal(),
    description,
    timestamp: new Date().toISOString(),
  };

  await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ embeds: [embed] }),
  }).catch(() => {});
}

function getRandomPastelDecimal(): number {
  const colors = [
    0xff_b3_ba, 0xff_df_ba, 0xff_ff_ba, 0xba_ff_c9, 0xba_e1_ff, 0xe0_bb_e4,
    0xd4_a5_a5, 0xa5_d4_d4, 0xd4_d4_a5, 0xc9_b1_ff,
  ];
  return colors[Math.floor(Math.random() * colors.length)] ?? 0xba_e1_ff;
}
