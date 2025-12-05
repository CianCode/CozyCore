import { accounts, db, guilds } from "@cozycore/db";
import type { DiscordChannel, DiscordRole } from "@cozycore/types";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchUserGuilds, hasManageGuildPermission } from "@/lib/discord";

const DISCORD_API_BASE = "https://discord.com/api/v10";

type Params = Promise<{ guildId: string }>;

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

    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json(
        { success: false, error: "Bot token not configured" },
        { status: 500 }
      );
    }

    // Fetch channels and roles from Discord API using bot token
    const [channelsResponse, rolesResponse] = await Promise.all([
      fetch(`${DISCORD_API_BASE}/guilds/${guildId}/channels`, {
        headers: { Authorization: `Bot ${botToken}` },
      }),
      fetch(`${DISCORD_API_BASE}/guilds/${guildId}/roles`, {
        headers: { Authorization: `Bot ${botToken}` },
      }),
    ]);

    if (!(channelsResponse.ok && rolesResponse.ok)) {
      return NextResponse.json(
        { success: false, error: "Failed to fetch guild resources" },
        { status: 500 }
      );
    }

    const channelsData = await channelsResponse.json();
    const rolesData = await rolesResponse.json();

    // Filter and format channels (text channels: 0, announcement: 5, forum: 15)
    const channels: DiscordChannel[] = channelsData
      .filter(
        (c: DiscordChannel) => c.type === 0 || c.type === 5 || c.type === 15
      )
      .map((c: DiscordChannel) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        position: c.position,
      }))
      .sort((a: DiscordChannel, b: DiscordChannel) => a.position - b.position);

    // Filter and format roles (exclude @everyone and managed roles)
    const roles: DiscordRole[] = rolesData
      .filter((r: DiscordRole) => r.name !== "@everyone" && !r.managed)
      .map((r: DiscordRole) => ({
        id: r.id,
        name: r.name,
        color: r.color,
        position: r.position,
        managed: r.managed,
      }))
      .sort((a: DiscordRole, b: DiscordRole) => b.position - a.position);

    return NextResponse.json({
      success: true,
      data: { channels, roles },
    });
  } catch (error) {
    console.error("Error fetching guild resources:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch guild resources" },
      { status: 500 }
    );
  }
}
