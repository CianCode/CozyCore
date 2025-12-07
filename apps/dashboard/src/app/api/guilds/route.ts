import { accounts, db } from "@cozycore/db";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  fetchUserGuilds,
  filterManageableGuilds,
  getGuildsWithBotStatus,
} from "@/lib/discord";

export async function GET() {
  try {
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

    // Fetch guilds from Discord API
    const allGuilds = await fetchUserGuilds(account.accessToken);

    // Filter to guilds user can manage
    const manageableGuilds = filterManageableGuilds(allGuilds);

    // Add bot installation status
    const guildsWithStatus = await getGuildsWithBotStatus(manageableGuilds);

    return NextResponse.json({ success: true, data: guildsWithStatus });
  } catch (error) {
    console.error("Error fetching guilds:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch guilds" },
      { status: 500 }
    );
  }
}
