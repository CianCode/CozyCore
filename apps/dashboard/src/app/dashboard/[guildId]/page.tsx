import { accounts, db, guilds } from "@cozycore/db";
import { eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { fetchGuildDetails, fetchUserGuilds } from "@/lib/discord";
import { getGuildIconUrl, hasManageGuildPermission } from "@/lib/discord-utils";
import { DashboardTabs } from "./dashboard-tabs";

type Props = {
  params: Promise<{ guildId: string }>;
};

export default async function DashboardPage({ params }: Props) {
  const { guildId } = await params;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/");
  }

  // Get the Discord account for the user
  const [account] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, session.user.id))
    .limit(1);

  if (!account?.accessToken) {
    redirect("/");
  }

  // Verify user has access to this guild
  let userGuilds: Awaited<ReturnType<typeof fetchUserGuilds>> | undefined;
  try {
    userGuilds = await fetchUserGuilds(account.accessToken);
  } catch {
    redirect("/servers");
  }

  if (!userGuilds) {
    redirect("/servers");
  }

  const targetGuild = userGuilds.find((g) => g.id === guildId);

  if (!(targetGuild && hasManageGuildPermission(targetGuild.permissions))) {
    notFound();
  }

  // Get guild from database (if bot is installed)
  const [guildData] = await db
    .select()
    .from(guilds)
    .where(eq(guilds.id, guildId))
    .limit(1);

  // Fetch full guild details (description, member count, etc.) via bot token
  const guildDetails = guildData ? await fetchGuildDetails(guildId) : null;

  const iconUrl = getGuildIconUrl(guildId, targetGuild.icon, 256);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-bold text-3xl">Server Dashboard</h1>
            <p className="mt-1 text-muted-foreground">
              Manage your bot settings and view server information
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/servers">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Servers
            </Link>
          </Button>
        </div>

        {/* Server Info Card */}
        <div className="mt-8 rounded-lg border bg-card p-6">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16 rounded-lg">
              <AvatarImage alt={targetGuild.name} src={iconUrl} />
              <AvatarFallback className="rounded-lg text-xl">
                {targetGuild.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-xl">{targetGuild.name}</h2>
                {targetGuild.owner ? (
                  <Badge>Owner</Badge>
                ) : (
                  <Badge variant="secondary">Admin</Badge>
                )}
                {guildData ? (
                  <Badge variant="outline">Bot Active</Badge>
                ) : (
                  <Badge variant="destructive">Bot Not Installed</Badge>
                )}
              </div>
              {guildDetails?.description ? (
                <p className="mt-2 text-muted-foreground">
                  {guildDetails.description}
                </p>
              ) : null}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard
              icon="members"
              label="Members"
              value={
                guildDetails?.approximate_member_count?.toLocaleString() || "—"
              }
            />
            <StatCard
              icon="online"
              label="Online"
              value={
                guildDetails?.approximate_presence_count?.toLocaleString() ||
                "—"
              }
            />
            <StatCard
              icon="verification"
              label="Verification"
              value={getVerificationLevel(targetGuild.features)}
            />
            <StatCard
              icon="boost"
              label={`${guildDetails?.premium_subscription_count || 0} Boosts`}
              value={`Level ${guildDetails?.premium_tier || 0}`}
            />
          </div>
        </div>

        {/* Tabs Content */}
        <div className="mt-8">
          {guildData ? (
            <DashboardTabs
              guildId={guildId}
              settings={guildData.settings || {}}
            />
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border bg-card py-16 text-center">
              <h2 className="font-semibold text-xl">Bot Not Installed</h2>
              <p className="mt-2 text-muted-foreground">
                The bot needs to be installed in this server before you can
                manage it.
              </p>
              <Button asChild className="mt-4">
                <a
                  href={`https://discord.com/api/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}&permissions=8&scope=bot%20applications.commands&guild_id=${guildId}&disable_guild_select=true`}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Invite Bot
                </a>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getVerificationLevel(features: string[]): string {
  if (features.includes("VERIFIED")) {
    return "Verified";
  }
  if (features.includes("COMMUNITY")) {
    return "Community";
  }
  return "Low";
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: "members" | "online" | "verification" | "boost";
  value: string;
  label: string;
}) {
  const icons = {
    members: (
      <svg
        aria-hidden="true"
        className="h-5 w-5 text-muted-foreground"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
        />
        <circle cx="9" cy="7" r="4" strokeWidth={2} />
        <path
          d="M23 21v-2a4 4 0 0 0-3-3.87"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
        />
        <path
          d="M16 3.13a4 4 0 0 1 0 7.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
        />
      </svg>
    ),
    online: (
      <div className="flex items-center gap-1">
        <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
      </div>
    ),
    verification: (
      <svg
        aria-hidden="true"
        className="h-5 w-5 text-muted-foreground"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <circle cx="12" cy="12" r="10" strokeWidth={2} />
      </svg>
    ),
    boost: (
      <svg
        aria-hidden="true"
        className="h-5 w-5 text-muted-foreground"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <polygon
          points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
        />
      </svg>
    ),
  };

  return (
    <div className="flex flex-col items-center rounded-lg border bg-background p-4">
      {icons[icon]}
      <span className="mt-2 font-semibold text-lg">{value}</span>
      <span className="text-muted-foreground text-sm">{label}</span>
    </div>
  );
}
