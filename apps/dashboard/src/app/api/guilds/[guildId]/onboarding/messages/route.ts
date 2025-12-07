import { accounts, db, guilds, welcomeMessages } from "@cozycore/db";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchUserGuilds, hasManageGuildPermission } from "@/lib/discord";

type Params = Promise<{ guildId: string }>;

// POST - Create a new welcome message
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
    const { content, order, selectableRoles } = body;

    // Get max order if not specified
    let messageOrder = order;
    if (messageOrder === undefined) {
      const existingMessages = await db
        .select({ order: welcomeMessages.order })
        .from(welcomeMessages)
        .where(eq(welcomeMessages.guildId, guildId))
        .orderBy(welcomeMessages.order);

      messageOrder =
        existingMessages.length > 0
          ? existingMessages[existingMessages.length - 1].order + 1
          : 0;
    }

    const id = crypto.randomUUID();
    const [newMessage] = await db
      .insert(welcomeMessages)
      .values({
        id,
        guildId,
        content: content || "Welcome to the server!",
        order: messageOrder,
        selectableRoles: selectableRoles || [],
      })
      .returning();

    return NextResponse.json({ success: true, data: newMessage });
  } catch (error) {
    console.error("Error creating welcome message:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create welcome message" },
      { status: 500 }
    );
  }
}

// PATCH - Update message order (bulk reorder)
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

    const body = await request.json();
    const { messages } = body as { messages: { id: string; order: number }[] };

    // Update order for each message
    const updates = messages.map((msg) =>
      db
        .update(welcomeMessages)
        .set({ order: msg.order, updatedAt: new Date() })
        .where(
          and(
            eq(welcomeMessages.id, msg.id),
            eq(welcomeMessages.guildId, guildId)
          )
        )
    );

    await Promise.all(updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reordering messages:", error);
    return NextResponse.json(
      { success: false, error: "Failed to reorder messages" },
      { status: 500 }
    );
  }
}
