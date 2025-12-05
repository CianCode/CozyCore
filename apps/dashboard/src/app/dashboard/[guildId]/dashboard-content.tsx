"use client";

import type { GuildSettings } from "@cozycore/types";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type DashboardContentProps = {
  guildId: string;
  settings: GuildSettings;
};

export function DashboardContent({ guildId, settings }: DashboardContentProps) {
  const [currentSettings, setCurrentSettings] =
    useState<GuildSettings>(settings);
  const [saving, setSaving] = useState(false);

  const handleSave = async (newSettings: Partial<GuildSettings>) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/guilds/${guildId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: newSettings }),
      });

      const data = await response.json();
      if (data.success) {
        setCurrentSettings({ ...currentSettings, ...newSettings });
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {/* Overview Card */}
      <Card className="md:col-span-2 lg:col-span-3">
        <CardHeader>
          <CardTitle>Dashboard Overview</CardTitle>
          <CardDescription>
            Quick overview of your server&apos;s CozyCore configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              description="Command prefix"
              title="Prefix"
              value={currentSettings.prefix || "!"}
            />
            <StatCard
              description="New member greetings"
              title="Welcome Channel"
              value={
                currentSettings.welcomeChannelId ? "Configured" : "Not Set"
              }
            />
            <StatCard
              description="Server logging"
              title="Log Channel"
              value={currentSettings.logChannelId ? "Configured" : "Not Set"}
            />
            <StatCard
              description="Moderator access"
              title="Mod Roles"
              value={`${currentSettings.modRoleIds?.length || 0} roles`}
            />
          </div>
        </CardContent>
      </Card>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>Basic bot configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="font-medium text-sm" htmlFor="prefix">
              Command Prefix
            </label>
            <div className="mt-1 flex gap-2">
              <input
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                defaultValue={currentSettings.prefix || "!"}
                id="prefix"
                maxLength={5}
                type="text"
              />
              <Button
                disabled={saving}
                onClick={() => {
                  const input = document.getElementById(
                    "prefix"
                  ) as HTMLInputElement;
                  handleSave({ prefix: input.value });
                }}
                size="sm"
              >
                Save
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Welcome Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Welcome Messages</CardTitle>
          <CardDescription>Greet new members</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="font-medium text-sm" htmlFor="welcomeMessage">
              Welcome Message
            </label>
            <textarea
              className="mt-1 flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              defaultValue={
                currentSettings.welcomeMessage ||
                "Welcome to the server, {user}!"
              }
              id="welcomeMessage"
              placeholder="Welcome to the server, {user}!"
            />
            <p className="mt-1 text-muted-foreground text-xs">
              Use {"{user}"} to mention the new member
            </p>
          </div>
          <Button
            disabled={saving}
            onClick={() => {
              const textarea = document.getElementById(
                "welcomeMessage"
              ) as HTMLTextAreaElement;
              handleSave({ welcomeMessage: textarea.value });
            }}
            size="sm"
          >
            Save Message
          </Button>
        </CardContent>
      </Card>

      {/* Moderation Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Moderation</CardTitle>
          <CardDescription>Server moderation settings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Badge variant="outline">Coming Soon</Badge>
            <p className="mt-2 text-muted-foreground text-sm">
              Advanced moderation features are being developed.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border p-4">
      <p className="font-medium text-muted-foreground text-sm">{title}</p>
      <p className="mt-1 font-bold text-2xl">{value}</p>
      <p className="text-muted-foreground text-xs">{description}</p>
    </div>
  );
}
