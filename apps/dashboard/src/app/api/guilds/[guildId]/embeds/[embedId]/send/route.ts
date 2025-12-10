import { accounts, db, guilds, savedEmbedMessages } from "@cozycore/db";
import type { EmbedButton, EmbedData } from "@cozycore/types";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchUserGuilds, hasManageGuildPermission } from "@/lib/discord";

type Params = Promise<{ guildId: string; embedId: string }>;

// Discord button styles
const DISCORD_BUTTON_STYLES = {
  primary: 1,
  secondary: 2,
  success: 3,
  danger: 4,
  link: 5,
} as const;

// Convert our buttons to Discord components format
function convertToDiscordComponents(buttons: EmbedButton[]) {
  if (buttons.length === 0) return [];

  // Filter link buttons (only link buttons have URLs and can be sent)
  const linkButtons = buttons.filter(
    (btn) => btn.style === "link" && btn.url && btn.label
  );

  if (linkButtons.length === 0) return [];

  // Create an action row with the buttons (max 5 buttons per row)
  return [
    {
      type: 1, // Action Row
      components: linkButtons.slice(0, 5).map((btn) => ({
        type: 2, // Button
        style: DISCORD_BUTTON_STYLES[btn.style],
        label: btn.label,
        url: btn.url,
      })),
    },
  ];
}

// Convert our embed format to Discord API format
function convertToDiscordEmbed(embed: EmbedData) {
  const discordEmbed: Record<string, unknown> = {};

  if (embed.title) discordEmbed.title = embed.title;
  if (embed.titleUrl) discordEmbed.url = embed.titleUrl;
  if (embed.description) discordEmbed.description = embed.description;

  if (embed.color) {
    // Convert hex to integer
    const colorInt = Number.parseInt(embed.color.replace("#", ""), 16);
    discordEmbed.color = colorInt;
  }

  if (embed.author) {
    discordEmbed.author = {
      name: embed.author.name,
      icon_url: embed.author.iconUrl,
      url: embed.author.url,
    };
  }

  if (embed.footer) {
    discordEmbed.footer = {
      text: embed.footer.text,
      icon_url: embed.footer.iconUrl,
    };
  }

  if (embed.imageUrl) {
    discordEmbed.image = { url: embed.imageUrl };
  }

  if (embed.thumbnailUrl) {
    discordEmbed.thumbnail = { url: embed.thumbnailUrl };
  }

  if (embed.fields && embed.fields.length > 0) {
    discordEmbed.fields = embed.fields.map((field) => ({
      name: field.name,
      value: field.value,
      inline: field.inline ?? false,
    }));
  }

  if (embed.timestamp) {
    discordEmbed.timestamp = new Date().toISOString();
  }

  return discordEmbed;
}

// POST - Send or update embed message in Discord
export async function POST(request: Request, { params }: { params: Params }) {
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

    // Get the saved embed
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

    // Check for optional forceNew parameter
    const body = await request.json().catch(() => ({}));
    const forceNew = body.forceNew === true;

    if (!embed.channelId) {
      return NextResponse.json(
        { success: false, error: "No channel selected for this embed" },
        { status: 400 }
      );
    }

    const embeds = (embed.embeds as EmbedData[]) ?? [];
    const buttons = (embed.buttons as EmbedButton[]) ?? [];

    if (embeds.length === 0 && !embed.content && buttons.length === 0) {
      return NextResponse.json(
        { success: false, error: "No content, embeds, or buttons to send" },
        { status: 400 }
      );
    }

    // Convert embeds to Discord format
    const discordEmbeds = embeds.map(convertToDiscordEmbed);
    const discordComponents = convertToDiscordComponents(buttons);

    // Build message payload
    const messagePayload: Record<string, unknown> = {};

    if (discordEmbeds.length > 0) {
      messagePayload.embeds = discordEmbeds;
    }

    if (embed.content) {
      messagePayload.content = embed.content;
    }

    if (discordComponents.length > 0) {
      messagePayload.components = discordComponents;
    }

    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json(
        { success: false, error: "Bot token not configured" },
        { status: 500 }
      );
    }

    let discordResponse: Response;
    let messageId: string;

    // If we have an existing message ID and not forcing new, try to edit
    if (embed.discordMessageId && !forceNew) {
      discordResponse = await fetch(
        `https://discord.com/api/v10/channels/${embed.channelId}/messages/${embed.discordMessageId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bot ${botToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(messagePayload),
        }
      );

      // If message was deleted, send a new one
      if (discordResponse.status === 404) {
        discordResponse = await fetch(
          `https://discord.com/api/v10/channels/${embed.channelId}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bot ${botToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(messagePayload),
          }
        );
      }
    } else {
      // Send new message
      discordResponse = await fetch(
        `https://discord.com/api/v10/channels/${embed.channelId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bot ${botToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(messagePayload),
        }
      );
    }

    if (!discordResponse.ok) {
      const errorData = await discordResponse.json().catch(() => ({}));
      console.error("Discord API error:", errorData);

      // Handle specific Discord errors
      if (discordResponse.status === 403) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Bot doesn't have permission to send messages in this channel",
          },
          { status: 403 }
        );
      }

      if (discordResponse.status === 404) {
        return NextResponse.json(
          { success: false, error: "Channel not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { success: false, error: "Failed to send message to Discord" },
        { status: 500 }
      );
    }

    const messageData = await discordResponse.json();
    messageId = messageData.id;

    // Update the saved embed with the message ID
    await db
      .update(savedEmbedMessages)
      .set({
        discordMessageId: messageId,
        updatedAt: new Date(),
      })
      .where(eq(savedEmbedMessages.id, embedId));

    return NextResponse.json({
      success: true,
      data: {
        messageId,
        channelId: embed.channelId,
        updated: embed.discordMessageId !== null && !forceNew,
      },
    });
  } catch (error) {
    console.error("Error sending embed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to send embed" },
      { status: 500 }
    );
  }
}
