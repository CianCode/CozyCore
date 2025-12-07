import { accounts, db, guilds, savedEmbedMessages } from "@cozycore/db";
import type { EmbedData, SavedEmbedMessage } from "@cozycore/types";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchUserGuilds, hasManageGuildPermission } from "@/lib/discord";

type Params = Promise<{ guildId: string }>;

// GET - Fetch all saved embed messages for a guild
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

    // Get all saved embed messages
    const embeds = await db
      .select()
      .from(savedEmbedMessages)
      .where(eq(savedEmbedMessages.guildId, guildId))
      .orderBy(savedEmbedMessages.updatedAt);

    const responseEmbeds: SavedEmbedMessage[] = embeds.map((e) => ({
      id: e.id,
      guildId: e.guildId,
      name: e.name,
      channelId: e.channelId,
      discordMessageId: e.discordMessageId,
      content: e.content,
      embeds: (e.embeds as EmbedData[]) ?? [],
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      data: responseEmbeds,
    });
  } catch (error) {
    console.error("Error fetching embeds:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch embeds" },
      { status: 500 }
    );
  }
}

// POST - Create a new saved embed message
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
    const { name, channelId, content, embeds } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { success: false, error: "Name is required" },
        { status: 400 }
      );
    }

    const id = crypto.randomUUID();
    const now = new Date();

    const [newEmbed] = await db
      .insert(savedEmbedMessages)
      .values({
        id,
        guildId,
        name,
        channelId: channelId ?? null,
        content: content ?? null,
        embeds: embeds ?? [],
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    const responseEmbed: SavedEmbedMessage = {
      id: newEmbed.id,
      guildId: newEmbed.guildId,
      name: newEmbed.name,
      channelId: newEmbed.channelId,
      discordMessageId: newEmbed.discordMessageId,
      content: newEmbed.content,
      embeds: (newEmbed.embeds as EmbedData[]) ?? [],
      createdAt: newEmbed.createdAt,
      updatedAt: newEmbed.updatedAt,
    };

    return NextResponse.json({
      success: true,
      data: responseEmbed,
    });
  } catch (error) {
    console.error("Error creating embed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create embed" },
      { status: 500 }
    );
  }
}
