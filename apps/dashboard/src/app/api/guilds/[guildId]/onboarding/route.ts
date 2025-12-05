import {
  accounts,
  db,
  guilds,
  onboardingConfig,
  welcomeMessages,
} from "@cozycore/db";
import type { OnboardingConfig, WelcomeMessage } from "@cozycore/types";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchUserGuilds, hasManageGuildPermission } from "@/lib/discord";

type Params = Promise<{ guildId: string }>;

// GET - Fetch onboarding config and messages
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

    // Get onboarding config
    const [config] = await db
      .select()
      .from(onboardingConfig)
      .where(eq(onboardingConfig.guildId, guildId))
      .limit(1);

    // Get welcome messages ordered by position
    const messages = await db
      .select()
      .from(welcomeMessages)
      .where(eq(welcomeMessages.guildId, guildId))
      .orderBy(welcomeMessages.order);

    const responseConfig: OnboardingConfig = config
      ? {
          guildId: config.guildId,
          enabled: config.enabled,
          welcomeChannelId: config.welcomeChannelId,
          rolesOnJoin: config.rolesOnJoin ?? [],
          threadAutoDelete: (config.threadAutoDelete as "1d" | "7d") || "1d",
          typingDelay: config.typingDelay ?? 1500,
          showTypingIndicator: config.showTypingIndicator ?? true,
          threadNameTemplate: config.threadNameTemplate ?? "Welcome {username}",
        }
      : {
          guildId,
          enabled: false,
          welcomeChannelId: null,
          rolesOnJoin: [],
          threadAutoDelete: "1d",
          typingDelay: 1500,
          showTypingIndicator: true,
          threadNameTemplate: "Welcome {username}",
        };

    const responseMessages: WelcomeMessage[] = messages.map((m) => ({
      id: m.id,
      guildId: m.guildId,
      content: m.content,
      order: m.order,
      selectableRoles: m.selectableRoles ?? [],
    }));

    return NextResponse.json({
      success: true,
      data: {
        config: responseConfig,
        messages: responseMessages,
      },
    });
  } catch (error) {
    console.error("Error fetching onboarding:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch onboarding config" },
      { status: 500 }
    );
  }
}

// PATCH - Update onboarding config
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
    const {
      enabled,
      welcomeChannelId,
      rolesOnJoin,
      threadAutoDelete,
      typingDelay,
      showTypingIndicator,
      threadNameTemplate,
    } = body;

    // Upsert onboarding config
    const [updatedConfig] = await db
      .insert(onboardingConfig)
      .values({
        guildId,
        enabled: enabled ?? false,
        welcomeChannelId: welcomeChannelId ?? null,
        rolesOnJoin: rolesOnJoin ?? [],
        threadAutoDelete: threadAutoDelete ?? "1d",
        typingDelay: typingDelay ?? 1500,
        showTypingIndicator: showTypingIndicator ?? true,
        threadNameTemplate: threadNameTemplate ?? "Welcome {username}",
      })
      .onConflictDoUpdate({
        target: onboardingConfig.guildId,
        set: {
          enabled: enabled ?? false,
          welcomeChannelId: welcomeChannelId ?? null,
          rolesOnJoin: rolesOnJoin ?? [],
          threadAutoDelete: threadAutoDelete ?? "1d",
          typingDelay: typingDelay ?? 1500,
          showTypingIndicator: showTypingIndicator ?? true,
          threadNameTemplate: threadNameTemplate ?? "Welcome {username}",
          updatedAt: new Date(),
        },
      })
      .returning();

    return NextResponse.json({ success: true, data: updatedConfig });
  } catch (error) {
    console.error("Error updating onboarding:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update onboarding config" },
      { status: 500 }
    );
  }
}
