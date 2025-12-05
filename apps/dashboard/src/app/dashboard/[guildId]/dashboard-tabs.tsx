"use client";

import type { GuildSettings } from "@cozycore/types";
import { MessageSquare, Settings, Shield, Star, UserPlus } from "lucide-react";
import { useState } from "react";
import { EmbedsTab } from "@/components/embeds-tab";
import { LevelTab } from "@/components/level-tab";
import { OnboardingTab } from "@/components/onboarding-tab";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type DashboardTabsProps = {
  guildId: string;
  settings: GuildSettings;
};

export function DashboardTabs({ guildId, settings }: DashboardTabsProps) {
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
    <Tabs className="w-full" defaultValue="settings">
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger className="flex items-center gap-2" value="settings">
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">Settings</span>
        </TabsTrigger>
        <TabsTrigger className="flex items-center gap-2" value="onboarding">
          <UserPlus className="h-4 w-4" />
          <span className="hidden sm:inline">Onboarding</span>
        </TabsTrigger>
        <TabsTrigger className="flex items-center gap-2" value="level">
          <Star className="h-4 w-4" />
          <span className="hidden sm:inline">Level</span>
        </TabsTrigger>
        <TabsTrigger className="flex items-center gap-2" value="embeds">
          <MessageSquare className="h-4 w-4" />
          <span className="hidden sm:inline">Embeds</span>
        </TabsTrigger>
        <TabsTrigger className="flex items-center gap-2" value="moderation">
          <Shield className="h-4 w-4" />
          <span className="hidden sm:inline">Moderation</span>
        </TabsTrigger>
      </TabsList>

      {/* Settings Tab */}
      <TabsContent className="mt-6 space-y-6" value="settings">
        <Card>
          <CardHeader>
            <CardTitle>Bot Settings</CardTitle>
            <CardDescription>
              Configure general bot settings for this server
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="prefix">Command Prefix</Label>
              <div className="flex gap-2">
                <input
                  className="flex h-10 w-full max-w-[100px] rounded-md border border-input bg-background px-3 py-2 font-mono text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  defaultValue={currentSettings.prefix || "!"}
                  disabled={saving}
                  id="prefix"
                  maxLength={5}
                  type="text"
                />
                <button
                  className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 font-medium text-primary-foreground text-sm hover:bg-primary/90 disabled:opacity-50"
                  disabled={saving}
                  onClick={() => {
                    const input = document.getElementById(
                      "prefix"
                    ) as HTMLInputElement;
                    handleSave({ prefix: input.value });
                  }}
                  type="button"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
              <p className="text-muted-foreground text-xs">
                The prefix used to trigger bot commands (e.g., !help)
              </p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Onboarding Tab */}
      <TabsContent className="mt-6" value="onboarding">
        <OnboardingTab guildId={guildId} />
      </TabsContent>

      {/* Level Tab */}
      <TabsContent className="mt-6" value="level">
        <LevelTab guildId={guildId} />
      </TabsContent>

      {/* Embeds Tab */}
      <TabsContent className="mt-6" value="embeds">
        <EmbedsTab guildId={guildId} />
      </TabsContent>

      {/* Moderation Tab */}
      <TabsContent className="mt-6" value="moderation">
        <EmptyState
          description="Auto-moderation and moderation tools are currently being developed."
          title="Moderation"
        />
      </TabsContent>
    </Tabs>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16">
        <div className="rounded-full bg-muted p-4">
          <Settings className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="mt-4 font-semibold text-lg">{title}</h3>
        <p className="mt-2 text-center text-muted-foreground">{description}</p>
        <div className="mt-4 rounded-full bg-yellow-500/10 px-3 py-1 text-sm text-yellow-600">
          In progress
        </div>
      </CardContent>
    </Card>
  );
}
