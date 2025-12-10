import { accounts, db, guilds, levelConfig } from "@cozycore/db";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchUserGuilds, hasManageGuildPermission } from "@/lib/discord";

type Params = Promise<{ guildId: string }>;

// POST - Trigger monthly helper announcement (sets lastRun to null so scheduler picks it up)
export async function POST(_request: Request, { params }: { params: Params }) {
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

    // Check if monthly helper is enabled
    const [config] = await db
      .select()
      .from(levelConfig)
      .where(eq(levelConfig.guildId, guildId))
      .limit(1);

    if (!config?.monthlyTopHelperEnabled) {
      return NextResponse.json(
        { success: false, error: "Monthly Top Helper is not enabled" },
        { status: 400 }
      );
    }

    if (!config.monthlyTopHelperChannelId) {
      return NextResponse.json(
        { success: false, error: "No announcement channel configured" },
        { status: 400 }
      );
    }

    // Set forceRun flag to trigger the announcement
    // We'll use a special date value (far in the past) to indicate forced run
    await db
      .update(levelConfig)
      .set({
        // Set to a date far in the past so the scheduler sees it needs to run
        lastMonthlyTopHelperRun: new Date("2000-01-01"),
        // Also set the day/hour to NOW so it triggers immediately
        monthlyTopHelperDay: new Date().getUTCDate(),
        monthlyTopHelperHour: new Date().getUTCHours(),
        updatedAt: new Date(),
      })
      .where(eq(levelConfig.guildId, guildId));

    return NextResponse.json({
      success: true,
      message:
        "Monthly helper announcement will run within the next hour when the bot checks",
    });
  } catch (error) {
    console.error("Error triggering monthly helper:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to trigger monthly helper announcement",
      },
      { status: 500 }
    );
  }
}
