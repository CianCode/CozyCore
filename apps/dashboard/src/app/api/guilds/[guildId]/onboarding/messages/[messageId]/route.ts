import { accounts, db, guilds, welcomeMessages } from "@cozycore/db";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchUserGuilds, hasManageGuildPermission } from "@/lib/discord";

type Params = Promise<{ guildId: string; messageId: string }>;

// PATCH - Update a specific message
export async function PATCH(request: Request, { params }: { params: Params }) {
  try {
    const { guildId, messageId } = await params;
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
    const { content, selectableRoles } = body;

    const updateData: {
      content?: string;
      selectableRoles?: string[];
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };
    if (content !== undefined) {
      updateData.content = content;
    }
    if (selectableRoles !== undefined) {
      updateData.selectableRoles = selectableRoles;
    }

    const [updatedMessage] = await db
      .update(welcomeMessages)
      .set(updateData)
      .where(
        and(
          eq(welcomeMessages.id, messageId),
          eq(welcomeMessages.guildId, guildId)
        )
      )
      .returning();

    if (!updatedMessage) {
      return NextResponse.json(
        { success: false, error: "Message not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updatedMessage });
  } catch (error) {
    console.error("Error updating welcome message:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update welcome message" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a specific message
export async function DELETE(
  _request: Request,
  { params }: { params: Params }
) {
  try {
    const { guildId, messageId } = await params;
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

    const [deletedMessage] = await db
      .delete(welcomeMessages)
      .where(
        and(
          eq(welcomeMessages.id, messageId),
          eq(welcomeMessages.guildId, guildId)
        )
      )
      .returning();

    if (!deletedMessage) {
      return NextResponse.json(
        { success: false, error: "Message not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting welcome message:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete welcome message" },
      { status: 500 }
    );
  }
}
