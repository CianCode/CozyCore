import { accounts, db, guilds, savedEmbedMessages } from "@cozycore/db";
import type { EmbedData, SavedEmbedMessage } from "@cozycore/types";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchUserGuilds, hasManageGuildPermission } from "@/lib/discord";

type Params = Promise<{ guildId: string; embedId: string }>;

// GET - Fetch a single saved embed message
export async function GET(_request: Request, { params }: { params: Params }) {
  try {
    const { guildId, embedId } = await params;
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

    const [embed] = await db
      .select()
      .from(savedEmbedMessages)
      .where(
        and(
          eq(savedEmbedMessages.id, embedId),
          eq(savedEmbedMessages.guildId, guildId)
        )
      )
      .limit(1);

    if (!embed) {
      return NextResponse.json(
        { success: false, error: "Embed not found" },
        { status: 404 }
      );
    }

    const responseEmbed: SavedEmbedMessage = {
      id: embed.id,
      guildId: embed.guildId,
      name: embed.name,
      channelId: embed.channelId,
      discordMessageId: embed.discordMessageId,
      content: embed.content,
      embeds: (embed.embeds as EmbedData[]) ?? [],
      createdAt: embed.createdAt,
      updatedAt: embed.updatedAt,
    };

    return NextResponse.json({
      success: true,
      data: responseEmbed,
    });
  } catch (error) {
    console.error("Error fetching embed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch embed" },
      { status: 500 }
    );
  }
}

// PATCH - Update a saved embed message
export async function PATCH(request: Request, { params }: { params: Params }) {
  try {
    const { guildId, embedId } = await params;
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
    const { name, channelId, content, embeds, discordMessageId } = body;

    const [updatedEmbed] = await db
      .update(savedEmbedMessages)
      .set({
        name: name ?? undefined,
        channelId: channelId !== undefined ? channelId : undefined,
        content: content !== undefined ? content : undefined,
        embeds: embeds ?? undefined,
        discordMessageId:
          discordMessageId !== undefined ? discordMessageId : undefined,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(savedEmbedMessages.id, embedId),
          eq(savedEmbedMessages.guildId, guildId)
        )
      )
      .returning();

    if (!updatedEmbed) {
      return NextResponse.json(
        { success: false, error: "Embed not found" },
        { status: 404 }
      );
    }

    const responseEmbed: SavedEmbedMessage = {
      id: updatedEmbed.id,
      guildId: updatedEmbed.guildId,
      name: updatedEmbed.name,
      channelId: updatedEmbed.channelId,
      discordMessageId: updatedEmbed.discordMessageId,
      content: updatedEmbed.content,
      embeds: (updatedEmbed.embeds as EmbedData[]) ?? [],
      createdAt: updatedEmbed.createdAt,
      updatedAt: updatedEmbed.updatedAt,
    };

    return NextResponse.json({
      success: true,
      data: responseEmbed,
    });
  } catch (error) {
    console.error("Error updating embed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update embed" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a saved embed message
export async function DELETE(
  _request: Request,
  { params }: { params: Params }
) {
  try {
    const { guildId, embedId } = await params;
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

    const deleted = await db
      .delete(savedEmbedMessages)
      .where(
        and(
          eq(savedEmbedMessages.id, embedId),
          eq(savedEmbedMessages.guildId, guildId)
        )
      )
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json(
        { success: false, error: "Embed not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { deleted: true },
    });
  } catch (error) {
    console.error("Error deleting embed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete embed" },
      { status: 500 }
    );
  }
}
