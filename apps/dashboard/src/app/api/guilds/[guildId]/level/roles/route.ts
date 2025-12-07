import { accounts, db, guilds, levelRoles } from "@cozycore/db";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchUserGuilds, hasManageGuildPermission } from "@/lib/discord";

type Params = Promise<{ guildId: string }>;

// POST - Add a new level role
export async function POST(request: Request, { params }: { params: Params }) {
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
    const { roleId, xpRequired } = body;

    if (!roleId) {
      return NextResponse.json(
        { success: false, error: "Role ID is required" },
        { status: 400 }
      );
    }

    // Get current max order
    const existingRoles = await db
      .select()
      .from(levelRoles)
      .where(eq(levelRoles.guildId, guildId));

    const maxOrder = existingRoles.reduce(
      (max, r) => Math.max(max, r.order),
      -1
    );

    // Create new level role
    const [newRole] = await db
      .insert(levelRoles)
      .values({
        id: crypto.randomUUID(),
        guildId,
        roleId,
        xpRequired: xpRequired ?? 100,
        order: maxOrder + 1,
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: {
        id: newRole.id,
        guildId: newRole.guildId,
        roleId: newRole.roleId,
        xpRequired: newRole.xpRequired,
        order: newRole.order,
      },
    });
  } catch (error) {
    console.error("Error creating level role:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create level role" },
      { status: 500 }
    );
  }
}
