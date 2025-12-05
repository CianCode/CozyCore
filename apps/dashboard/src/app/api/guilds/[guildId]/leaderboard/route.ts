import { accounts, db, guilds, memberXp } from "@cozycore/db";
import type { LeaderboardUser } from "@cozycore/types";
import { desc, eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchUserGuilds, hasManageGuildPermission } from "@/lib/discord";

type Params = Promise<{ guildId: string }>;

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

// GET - Fetch leaderboard with pagination
export async function GET(request: Request, { params }: { params: Params }) {
  try {
    const { guildId } = await params;
    const { searchParams } = new URL(request.url);
    const page = Number.parseInt(searchParams.get("page") || "1", 10);
    const pageSize = Number.parseInt(searchParams.get("pageSize") || "25", 10);
    const search = searchParams.get("search") || "";

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

    const [existingGuild] = await db
      .select()
      .from(guilds)
      .where(eq(guilds.id, guildId))
      .limit(1);

    if (!existingGuild) {
      return NextResponse.json(
        { success: false, error: "Bot not installed" },
        { status: 400 }
      );
    }

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(memberXp)
      .where(eq(memberXp.guildId, guildId));

    const total = countResult?.count ?? 0;

    // Get paginated members ordered by XP
    const offset = (page - 1) * pageSize;
    const members = await db
      .select()
      .from(memberXp)
      .where(eq(memberXp.guildId, guildId))
      .orderBy(desc(memberXp.totalXp))
      .limit(pageSize)
      .offset(offset);

    // Fetch Discord user data for each member
    const users: LeaderboardUser[] = await Promise.all(
      members.map(async (member, index) => {
        const discordUser = await fetchDiscordUser(member.userId);
        return {
          rank: offset + index + 1,
          userId: member.userId,
          username: discordUser?.username ?? "Unknown",
          displayName:
            discordUser?.global_name ?? discordUser?.username ?? "Unknown",
          avatar: discordUser?.avatar ?? null,
          currentRoleId: member.currentRoleId,
          totalXp: member.totalXp,
        };
      })
    );

    // Filter by search if provided
    const filteredUsers = search
      ? users.filter(
          (u) =>
            u.username.toLowerCase().includes(search.toLowerCase()) ||
            u.displayName.toLowerCase().includes(search.toLowerCase())
        )
      : users;

    return NextResponse.json({
      success: true,
      data: {
        users: filteredUsers,
        total,
        page,
        pageSize,
      },
    });
  } catch (error) {
    console.error("Leaderboard error:", error);
    return NextResponse.json(
      { success: false, error: "Internal error" },
      { status: 500 }
    );
  }
}

async function fetchDiscordUser(userId: string): Promise<{
  username: string;
  global_name: string | null;
  avatar: string | null;
} | null> {
  if (!BOT_TOKEN) return null;

  try {
    const response = await fetch(
      `https://discord.com/api/v10/users/${userId}`,
      {
        headers: { Authorization: `Bot ${BOT_TOKEN}` },
      }
    );

    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}
