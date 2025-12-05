import { accounts, db, guilds } from "@cozycore/db";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchUserGuilds, hasManageGuildPermission } from "@/lib/discord";

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

    // Get the Discord account for the user
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

    // Get guild from database (if bot is installed)
    const [guildData] = await db
      .select()
      .from(guilds)
      .where(eq(guilds.id, guildId))
      .limit(1);

    return NextResponse.json({
      success: true,
      data: {
        id: guildId,
        name: targetGuild.name,
        icon: targetGuild.icon,
        isOwner: targetGuild.owner,
        botInstalled: !!guildData,
        settings: guildData?.settings || {},
      },
    });
  } catch (error) {
    console.error("Error fetching guild:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch guild" },
      { status: 500 }
    );
  }
}

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

    // Get the Discord account for the user
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

    const body = await request.json();
    const { settings } = body;

    // Update guild settings
    const [updatedGuild] = await db
      .update(guilds)
      .set({
        settings: { ...existingGuild.settings, ...settings },
        updatedAt: new Date(),
      })
      .where(eq(guilds.id, guildId))
      .returning();

    return NextResponse.json({ success: true, data: updatedGuild });
  } catch (error) {
    console.error("Error updating guild:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update guild" },
      { status: 500 }
    );
  }
}
