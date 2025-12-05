import { accounts, db, levelConfig, levelRoles } from "@cozycore/db";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchUserGuilds, hasManageGuildPermission } from "@/lib/discord";

type Params = Promise<{ guildId: string }>;

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

type DiscordRole = {
  id: string;
  name: string;
  color: number;
};

// POST - Send or update the roles embed
export async function POST(request: Request, { params }: { params: Params }) {
  try {
    const { guildId } = await params;

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

    if (!BOT_TOKEN) {
      return NextResponse.json(
        { success: false, error: "Bot token not configured" },
        { status: 500 }
      );
    }

    // Get config
    const [config] = await db
      .select()
      .from(levelConfig)
      .where(eq(levelConfig.guildId, guildId))
      .limit(1);

    if (!config) {
      return NextResponse.json(
        { success: false, error: "Level config not found" },
        { status: 404 }
      );
    }

    // Get level roles sorted by XP required
    const roles = await db
      .select()
      .from(levelRoles)
      .where(eq(levelRoles.guildId, guildId))
      .orderBy(levelRoles.xpRequired);

    // Fetch Discord roles for color info
    const guildRolesRes = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/roles`,
      {
        headers: { Authorization: `Bot ${BOT_TOKEN}` },
      }
    );

    let discordRoles: DiscordRole[] = [];
    if (guildRolesRes.ok) {
      discordRoles = await guildRolesRes.json();
    }

    // Build the embed
    const embed = buildRolesEmbed(config, roles, discordRoles);

    // Check if we should update existing message or send new one
    const body = await request.json().catch(() => ({}));
    const channelId = body.channelId || config.rolesEmbedChannelId;

    if (!channelId) {
      return NextResponse.json(
        { success: false, error: "No channel specified" },
        { status: 400 }
      );
    }

    let messageId = config.rolesEmbedMessageId;
    let success = false;

    // Try to edit existing message first
    if (messageId && config.rolesEmbedChannelId === channelId) {
      const editRes = await fetch(
        `https://discord.com/api/v10/channels/${channelId}/messages/${messageId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bot ${BOT_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ embeds: [embed] }),
        }
      );

      if (editRes.ok) {
        success = true;
      } else {
        // Message might have been deleted, send a new one
        messageId = null;
      }
    }

    // Send new message if edit failed or no existing message
    if (!success) {
      const sendRes = await fetch(
        `https://discord.com/api/v10/channels/${channelId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bot ${BOT_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ embeds: [embed] }),
        }
      );

      if (!sendRes.ok) {
        const errorText = await sendRes.text();
        console.error("Failed to send roles embed:", errorText);
        return NextResponse.json(
          { success: false, error: "Failed to send embed" },
          { status: 500 }
        );
      }

      const message = await sendRes.json();
      messageId = message.id;
    }

    // Update config with new message info
    await db
      .update(levelConfig)
      .set({
        rolesEmbedChannelId: channelId,
        rolesEmbedMessageId: messageId,
        updatedAt: new Date(),
      })
      .where(eq(levelConfig.guildId, guildId));

    return NextResponse.json({
      success: true,
      data: { channelId, messageId },
    });
  } catch (error) {
    console.error("Roles embed error:", error);
    return NextResponse.json(
      { success: false, error: "Internal error" },
      { status: 500 }
    );
  }
}

// DELETE - Remove the roles embed reference (doesn't delete the message)
export async function DELETE(
  _request: Request,
  { params }: { params: Params }
) {
  try {
    const { guildId } = await params;

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

    // Clear the embed reference
    await db
      .update(levelConfig)
      .set({
        rolesEmbedChannelId: null,
        rolesEmbedMessageId: null,
        updatedAt: new Date(),
      })
      .where(eq(levelConfig.guildId, guildId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete roles embed error:", error);
    return NextResponse.json(
      { success: false, error: "Internal error" },
      { status: 500 }
    );
  }
}

function buildRolesEmbed(
  config: typeof levelConfig.$inferSelect,
  roles: (typeof levelRoles.$inferSelect)[],
  discordRoles: DiscordRole[]
) {
  // Build vertical list of roles (highest XP first = best role)
  const sortedRoles = [...roles].sort((a, b) => b.xpRequired - a.xpRequired);

  const roleLines = sortedRoles.map((role, index) => {
    const roleMention = `<@&${role.roleId}>`;
    return `${roleMention} • **${role.xpRequired.toLocaleString()} XP**`;
  });

  const rolesDescription = roleLines.join("\n\n");
  const fullDescription = config.rolesEmbedDescription
    ? `${config.rolesEmbedDescription}\n\n${rolesDescription}`
    : rolesDescription;

  const embed: Record<string, unknown> = {
    color: getRandomPastelDecimal(),
    description: fullDescription || undefined,
    footer: {
      text: `${roles.length} level role${roles.length !== 1 ? "s" : ""} • Updated`,
    },
    timestamp: new Date().toISOString(),
  };

  if (config.rolesEmbedTitle) {
    embed.title = config.rolesEmbedTitle;
  }

  return embed;
}

function getRankEmoji(rank: number): string {
  switch (rank) {
    case 1:
      return "🥇";
    case 2:
      return "🥈";
    case 3:
      return "🥉";
    default:
      return "🏅";
  }
}

function getRandomPastelDecimal(): number {
  const colors = [
    0xff_b3_ba, 0xff_df_ba, 0xff_ff_ba, 0xba_ff_c9, 0xba_e1_ff, 0xe0_bb_e4,
    0xd4_a5_a5, 0xa5_d4_d4, 0xd4_d4_a5, 0xc9_b1_ff,
  ];
  return colors[Math.floor(Math.random() * colors.length)] ?? 0xba_e1_ff;
}
