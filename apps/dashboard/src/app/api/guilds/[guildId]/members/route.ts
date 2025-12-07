import { accounts, db } from "@cozycore/db";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchUserGuilds, hasManageGuildPermission } from "@/lib/discord";

type Params = Promise<{ guildId: string }>;

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

type DiscordMember = {
  user?: {
    id: string;
    username: string;
    global_name?: string;
    avatar?: string;
  };
  nick?: string;
};

// GET - Search guild members
export async function GET(request: Request, { params }: { params: Params }) {
  try {
    const { guildId } = await params;
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.toLowerCase() ?? "";

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

    // Search guild members via Discord API
    const res = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/members/search?query=${encodeURIComponent(search)}&limit=25`,
      {
        headers: { Authorization: `Bot ${BOT_TOKEN}` },
      }
    );

    if (!res.ok) {
      console.error("Discord API error:", await res.text());
      return NextResponse.json(
        { success: false, error: "Failed to search members" },
        { status: 500 }
      );
    }

    const members: DiscordMember[] = await res.json();

    // Filter out bots and format response
    const data = members
      .filter((m) => m.user)
      .map((m) => ({
        id: m.user?.id ?? "",
        username: m.user?.username ?? "Unknown",
        displayName:
          m.nick ?? m.user?.global_name ?? m.user?.username ?? "Unknown",
        avatar: m.user?.avatar ?? null,
      }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Search members error:", error);
    return NextResponse.json(
      { success: false, error: "Internal error" },
      { status: 500 }
    );
  }
}
