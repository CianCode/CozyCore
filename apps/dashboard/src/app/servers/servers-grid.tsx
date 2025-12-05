"use client";

import type { GuildWithStatus } from "@cozycore/types";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { generateBotInviteUrl, getGuildIconUrl } from "@/lib/discord-utils";

export function ServersGrid() {
  const [guilds, setGuilds] = useState<GuildWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchGuilds() {
      try {
        const response = await fetch("/api/guilds");
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error);
        }

        setGuilds(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load servers");
      } finally {
        setLoading(false);
      }
    }

    fetchGuilds();
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton items
          <Card key={`skeleton-${i}`}>
            <CardContent className="flex flex-col items-center gap-4 p-6">
              <Skeleton className="h-16 w-16 rounded-full" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-8 text-center">
          <p className="text-destructive">{error}</p>
          <Button
            className="mt-4"
            onClick={() => window.location.reload()}
            variant="outline"
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (guilds.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-8 text-center">
          <p className="text-muted-foreground">
            No servers found. You need the "Manage Server" permission to manage
            a server.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {guilds.map((guild) => (
        <ServerCard guild={guild} key={guild.id} />
      ))}
    </div>
  );
}

function ServerCard({ guild }: { guild: GuildWithStatus }) {
  const iconUrl = getGuildIconUrl(guild.id, guild.icon);

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="flex flex-col items-center gap-4 p-6">
        <Avatar className="h-16 w-16">
          <AvatarImage alt={guild.name} src={iconUrl} />
          <AvatarFallback className="text-xl">
            {guild.name.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <p className="max-w-full truncate text-center font-medium">
          {guild.name}
        </p>
        {guild.botInstalled ? (
          <Button asChild size="sm">
            <Link href={`/dashboard/${guild.id}`}>Manage</Link>
          </Button>
        ) : (
          <Button asChild size="sm" variant="outline">
            <a
              href={generateBotInviteUrl(guild.id)}
              rel="noopener noreferrer"
              target="_blank"
            >
              Invite Bot
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
