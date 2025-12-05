import { accounts, db, guilds, levelRoles } from "@cozycore/db";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchUserGuilds, hasManageGuildPermission } from "@/lib/discord";

type Params = Promise<{ guildId: string; roleId: string }>;

// PATCH - Update a level role
export async function PATCH(request: Request, { params }: { params: Params }) {
  try {
    const { guildId, roleId } = await params;
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
    const updates: Partial<{
      roleId: string;
      xpRequired: number;
      order: number;
    }> = {};

    if (body.roleId !== undefined) updates.roleId = body.roleId;
    if (body.xpRequired !== undefined) updates.xpRequired = body.xpRequired;
    if (body.order !== undefined) updates.order = body.order;

    const [updatedRole] = await db
      .update(levelRoles)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(and(eq(levelRoles.id, roleId), eq(levelRoles.guildId, guildId)))
      .returning();

    if (!updatedRole) {
      return NextResponse.json(
        { success: false, error: "Level role not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: updatedRole.id,
        guildId: updatedRole.guildId,
        roleId: updatedRole.roleId,
        xpRequired: updatedRole.xpRequired,
        order: updatedRole.order,
      },
    });
  } catch (error) {
    console.error("Error updating level role:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update level role" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a level role
export async function DELETE(
  _request: Request,
  { params }: { params: Params }
) {
  try {
    const { guildId, roleId } = await params;
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

    const [deletedRole] = await db
      .delete(levelRoles)
      .where(and(eq(levelRoles.id, roleId), eq(levelRoles.guildId, guildId)))
      .returning();

    if (!deletedRole) {
      return NextResponse.json(
        { success: false, error: "Level role not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting level role:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete level role" },
      { status: 500 }
    );
  }
}
