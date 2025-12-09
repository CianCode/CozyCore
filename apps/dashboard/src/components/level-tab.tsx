"use client";

import type {
  DiscordChannel,
  DiscordRole,
  LevelConfig,
  LevelRole,
  SimilaritySeverity,
} from "@cozycore/types";
import {
  AlertCircle,
  ArrowDownUp,
  Bell,
  Calendar,
  Check,
  Clock,
  Crown,
  FileText,
  Gem,
  Hash,
  HelpCircle,
  Loader2,
  MessageCircle,
  MessageSquare,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  Star,
  Timer,
  Trash2,
  TrendingUp,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { getRoleColorHex } from "@/components/discord-markdown-preview";
import { LeaderboardTab } from "@/components/leaderboard-tab";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getRandomPastelHex, parseEmbedTemplate } from "@/lib/embed-utils";

type LevelTabProps = {
  guildId: string;
};

type SaveStatus = "idle" | "saving" | "saved" | "error";

const DEFAULT_CONFIG: Omit<LevelConfig, "guildId"> = {
  enabled: false,
  minXpPerMessage: 4,
  maxXpPerMessage: 10,
  cooldownSeconds: 60,
  maxXpPerHour: 100,
  maxXpPerHourEnabled: false,
  maxXpPerDay: 500,
  maxXpPerDayEnabled: false,
  minMessageLength: 5,
  similaritySeverity: "medium",
  whitelistedChannels: [],
  forumXpEnabled: false,
  xpOnThreadClose: 25,
  helperBonusXp: 15,
  autoArchiveHours: 24,
  fastResolutionEnabled: false,
  fastResolutionThresholdHours: 2,
  fastResolutionBonusXp: 10,
  whitelistedForums: [],
  autoRemovePreviousRole: true,
  congratsChannelId: null,
  demotionChannelId: null,
  logChannelId: null,
  promotionEmbedTitle: "🎉 Level Up!",
  promotionEmbedDescription:
    "Félicitations à {user}, il a obtenu le rôle {role}!",
  promotionEmbedDescriptions: [],
  demotionEmbedTitle: "⚠️ Role Change",
  demotionEmbedDescription: "{user} a été rétrogradé de {oldRole} à {newRole}!",
  demotionEmbedDescriptions: [],
  roleLossEmbedTitle: "📉 Role Removed",
  roleLossEmbedDescription: "{user} a perdu son rôle {role}!",
  roleLossEmbedDescriptions: [],
  rolesEmbedChannelId: null,
  rolesEmbedMessageId: null,
  rolesEmbedTitle: "🏆 Level Roles",
  rolesEmbedDescription: "Earn XP by chatting to unlock these roles!",
  // Helper Recognition
  helperRecognitionChannelId: null,
  helperRecognitionEmbedTitle: "🌟 Helpful Member!",
  helperRecognitionEmbedDescription:
    "{helper} was marked as the most helpful by {asker}!",
  helperRecognitionEmbedDescriptions: [],
  // Fast Resolution
  fastResolutionChannelId: null,
  fastResolutionEmbedTitle: "⚡ Quick Helper!",
  fastResolutionEmbedDescription:
    "{helper} solved this issue in under {hours} hours! (+{xp} XP)",
  fastResolutionEmbedDescriptions: [],
  // Booster
  boosterEnabled: false,
  boosterChannelId: null,
  boosterXpMultiplier: 1.5,
  boosterBonusXpPerMessage: 5,
  boosterHelperBonusMultiplier: 1.25,
  boosterEmbedTitle: "💎 Thank You, Booster!",
  boosterEmbedDescription:
    "Thanks {user} for boosting the server! Enjoy your XP bonuses!",
  boosterEmbedDescriptions: [],
  // Monthly Top Helper
  monthlyTopHelperEnabled: false,
  monthlyTopHelperChannelId: null,
  monthlyTopHelperDay: 1,
  monthlyTopHelperHour: 12,
  monthlyTopHelperFirst: null,
  monthlyTopHelperSecond: null,
  monthlyTopHelperThird: null,
  monthlyTopHelperEmbedTitle: "🏆 Monthly Top Helpers!",
  monthlyTopHelperEmbedDescription:
    "Congratulations to our top helpers this month!\n\n🥇 {first}\n🥈 {second}\n🥉 {third}",
  monthlyTopHelperEmbedDescriptions: [],
  lastMonthlyTopHelperRun: null,
};

export function LevelTab({ guildId }: LevelTabProps) {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<LevelConfig | null>(null);
  const [levelRoles, setLevelRoles] = useState<LevelRole[]>([]);
  const [channels, setChannels] = useState<DiscordChannel[]>([]);
  const [roles, setRoles] = useState<DiscordRole[]>([]);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    roleId: string | null;
  }>({ open: false, roleId: null });

  // Fetch level data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [levelRes, resourcesRes] = await Promise.all([
          fetch(`/api/guilds/${guildId}/level`),
          fetch(`/api/guilds/${guildId}/resources`),
        ]);

        const levelData = await levelRes.json();
        const resourcesData = await resourcesRes.json();

        if (levelData.success) {
          setConfig(levelData.data.config);
          setLevelRoles(levelData.data.roles || []);
        } else {
          // Initialize with defaults if no config exists
          setConfig({ guildId, ...DEFAULT_CONFIG });
          setLevelRoles([]);
        }

        if (resourcesData.success) {
          setChannels(resourcesData.data.channels);
          setRoles(resourcesData.data.roles);
        }
      } catch (error) {
        console.error("Failed to fetch level data:", error);
        setConfig({ guildId, ...DEFAULT_CONFIG });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [guildId]);

  // Save config
  const saveConfig = useCallback(
    async (updates: Partial<LevelConfig>) => {
      if (!config) {
        return;
      }

      setSaveStatus("saving");
      try {
        const response = await fetch(`/api/guilds/${guildId}/level`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...config, ...updates }),
        });

        if (response.ok) {
          setConfig((prev) => (prev ? { ...prev, ...updates } : null));
          setSaveStatus("saved");
          setTimeout(() => setSaveStatus("idle"), 2000);
        } else {
          setSaveStatus("error");
        }
      } catch {
        setSaveStatus("error");
      }
    },
    [guildId, config]
  );

  // Auto-update roles embed if it exists
  const updateRolesEmbed = useCallback(async () => {
    if (!config?.rolesEmbedMessageId) {
      return;
    }
    try {
      await fetch(`/api/guilds/${guildId}/level/roles-embed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: config.rolesEmbedChannelId }),
      });
    } catch (error) {
      console.error("Failed to auto-update roles embed:", error);
    }
  }, [guildId, config?.rolesEmbedMessageId, config?.rolesEmbedChannelId]);

  // Add level role
  const addLevelRole = async () => {
    setSaveStatus("saving");
    try {
      const response = await fetch(`/api/guilds/${guildId}/level/roles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleId: roles[0]?.id || "",
          xpRequired: (levelRoles.length + 1) * 100,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setLevelRoles((prev) => [...prev, data.data]);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
        // Auto-update embed
        updateRolesEmbed();
      }
    } catch {
      setSaveStatus("error");
    }
  };

  // Update level role
  const updateLevelRole = useCallback(
    async (roleId: string, updates: Partial<LevelRole>) => {
      setSaveStatus("saving");
      try {
        const response = await fetch(
          `/api/guilds/${guildId}/level/roles/${roleId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updates),
          }
        );

        if (response.ok) {
          setLevelRoles((prev) =>
            prev.map((r) => (r.id === roleId ? { ...r, ...updates } : r))
          );
          setSaveStatus("saved");
          setTimeout(() => setSaveStatus("idle"), 2000);
          // Auto-update embed
          updateRolesEmbed();
        }
      } catch {
        setSaveStatus("error");
      }
    },
    [guildId, updateRolesEmbed]
  );

  // Delete level role
  const deleteLevelRole = async (roleId: string) => {
    setSaveStatus("saving");
    try {
      const response = await fetch(
        `/api/guilds/${guildId}/level/roles/${roleId}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        setLevelRoles((prev) => prev.filter((r) => r.id !== roleId));
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
        // Auto-update embed
        updateRolesEmbed();
      }
    } catch {
      setSaveStatus("error");
    }
    setDeleteDialog({ open: false, roleId: null });
  };

  // Toggle channel whitelist
  const toggleChannelWhitelist = (channelId: string) => {
    if (!config) {
      return;
    }
    const current = config.whitelistedChannels || [];
    const updated = current.includes(channelId)
      ? current.filter((id) => id !== channelId)
      : [...current, channelId];
    saveConfig({ whitelistedChannels: updated });
  };

  // Toggle forum whitelist
  const toggleForumWhitelist = (channelId: string) => {
    if (!config) {
      return;
    }
    const current = config.whitelistedForums || [];
    const updated = current.includes(channelId)
      ? current.filter((id) => id !== channelId)
      : [...current, channelId];
    saveConfig({ whitelistedForums: updated });
  };

  if (loading) {
    return <LevelTabSkeleton />;
  }

  if (!config) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="rounded-full bg-destructive/10 p-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <p className="mt-4 text-muted-foreground">
            Failed to load level configuration.
          </p>
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

  // Filter text and forum channels
  const textChannels = channels.filter((c) => c.type === 0 || c.type === 5);
  const forumChannels = channels.filter((c) => c.type === 15);

  return (
    <div className="space-y-8">
      {/* Save Status Toast */}
      <SaveStatusIndicator status={saveStatus} />

      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl border bg-linear-to-br from-amber-500/10 via-yellow-500/5 to-orange-500/10 p-8">
        <div className="absolute top-0 right-0 opacity-20">
          <Trophy className="h-32 w-32 text-amber-500" />
        </div>
        <div className="relative flex items-start justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-amber-500/20 p-3">
                <TrendingUp className="h-6 w-6 text-amber-400" />
              </div>
              <div>
                <h2 className="font-bold text-2xl tracking-tight">
                  Level & XP System
                </h2>
                <p className="text-muted-foreground">
                  Reward active members with XP and role progression
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 pt-2">
              <StatusBadge
                active={config.enabled}
                activeLabel="Active"
                inactiveLabel="Paused"
              />
              <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                <Star className="h-4 w-4" />
                {levelRoles.length} level role
                {levelRoles.length !== 1 ? "s" : ""}
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                <Zap className="h-4 w-4" />
                {config.minXpPerMessage}-{config.maxXpPerMessage} XP/msg
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground text-sm">
              {config.enabled ? "Enabled" : "Disabled"}
            </span>
            <Switch
              checked={config.enabled}
              onCheckedChange={(enabled) => saveConfig({ enabled })}
            />
          </div>
        </div>
      </div>

      {/* Main Configuration Tabs */}
      <Tabs className="space-y-6" defaultValue="message-xp">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger className="gap-2" value="message-xp">
            <MessageCircle className="h-4 w-4" />
            Message XP
          </TabsTrigger>
          <TabsTrigger className="gap-2" value="forum-xp">
            <MessageSquare className="h-4 w-4" />
            Forum XP
          </TabsTrigger>
          <TabsTrigger className="gap-2" value="roles">
            <Users className="h-4 w-4" />
            Level Roles
          </TabsTrigger>
          <TabsTrigger className="gap-2" value="notifications">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger className="gap-2" value="leaderboard">
            <Trophy className="h-4 w-4" />
            Leaderboard
          </TabsTrigger>
        </TabsList>

        {/* Message XP Settings Tab */}
        <TabsContent className="space-y-6" value="message-xp">
          <MessageXPSettings
            channels={textChannels}
            config={config}
            onSave={saveConfig}
            onToggleChannel={toggleChannelWhitelist}
          />
        </TabsContent>

        {/* Forum XP Settings Tab */}
        <TabsContent className="space-y-6" value="forum-xp">
          <ForumXPSettings
            channels={forumChannels}
            config={config}
            onSave={saveConfig}
            onToggleChannel={toggleForumWhitelist}
          />
        </TabsContent>

        {/* Level Roles Tab */}
        <TabsContent className="space-y-6" value="roles">
          <LevelRolesSettings
            channels={textChannels}
            config={config}
            discordRoles={roles}
            guildId={guildId}
            levelRoles={levelRoles}
            onAddRole={addLevelRole}
            onDeleteRole={(id) => setDeleteDialog({ open: true, roleId: id })}
            onSave={saveConfig}
            onUpdateRole={updateLevelRole}
          />
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent className="space-y-6" value="notifications">
          <NotificationSettings
            channels={textChannels}
            config={config}
            onSave={saveConfig}
            roles={roles}
          />
        </TabsContent>

        {/* Leaderboard Tab */}
        <TabsContent className="space-y-6" value="leaderboard">
          <LeaderboardTab
            discordRoles={roles}
            guildId={guildId}
            levelRoles={levelRoles}
          />
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <Dialog
        onOpenChange={(open) =>
          setDeleteDialog({
            open,
            roleId: open ? deleteDialog.roleId : null,
          })
        }
        open={deleteDialog.open}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-destructive/10 p-2">
                <Trash2 className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <DialogTitle>Delete Level Role</DialogTitle>
                <DialogDescription>
                  This action cannot be undone
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground text-sm">
              Are you sure you want to delete this level role? Members will no
              longer progress to this role.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              onClick={() => setDeleteDialog({ open: false, roleId: null })}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (deleteDialog.roleId) {
                  deleteLevelRole(deleteDialog.roleId);
                }
              }}
              variant="destructive"
            >
              Delete Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Message XP Settings Component
function MessageXPSettings({
  config,
  onSave,
  channels,
  onToggleChannel,
}: {
  config: LevelConfig;
  onSave: (updates: Partial<LevelConfig>) => void;
  channels: DiscordChannel[];
  onToggleChannel: (channelId: string) => void;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* XP Range Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-500/10 p-2">
              <Zap className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <CardTitle className="text-lg">XP per Message</CardTitle>
              <CardDescription>
                Random XP awarded for each message
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Min/Max XP */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Minimum XP
                <TooltipIcon text="Minimum XP earned per qualifying message" />
              </Label>
              <NumberInput
                min={1}
                onChange={(value) => onSave({ minXpPerMessage: value })}
                value={config.minXpPerMessage}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Maximum XP
                <TooltipIcon text="Maximum XP earned per qualifying message" />
              </Label>
              <NumberInput
                min={config.minXpPerMessage}
                onChange={(value) => onSave({ maxXpPerMessage: value })}
                value={config.maxXpPerMessage}
              />
            </div>
          </div>

          {/* Cooldown */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Cooldown (seconds)
              <TooltipIcon text="Time between XP-earning messages" />
            </Label>
            <NumberInput
              max={3600}
              min={0}
              onChange={(value) => onSave({ cooldownSeconds: value })}
              value={config.cooldownSeconds}
            />
            <p className="text-muted-foreground text-xs">
              {config.cooldownSeconds === 0
                ? "No cooldown"
                : `Members must wait ${config.cooldownSeconds}s between XP gains`}
            </p>
          </div>

          {/* Minimum Message Length */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Minimum Characters
              <TooltipIcon text="Messages shorter than this won't earn XP" />
            </Label>
            <NumberInput
              max={500}
              min={0}
              onChange={(value) => onSave({ minMessageLength: value })}
              value={config.minMessageLength}
            />
          </div>
        </CardContent>
      </Card>

      {/* Limits & Anti-Spam Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-500/10 p-2">
              <Timer className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-lg">Limits & Anti-Spam</CardTitle>
              <CardDescription>Prevent XP farming and abuse</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Max XP per Hour */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                Max XP per Hour
                <TooltipIcon text="Limit total XP earned in an hour" />
              </Label>
              <Switch
                checked={config.maxXpPerHourEnabled}
                onCheckedChange={(enabled) =>
                  onSave({ maxXpPerHourEnabled: enabled })
                }
              />
            </div>
            {config.maxXpPerHourEnabled && (
              <NumberInput
                min={1}
                onChange={(value) => onSave({ maxXpPerHour: value })}
                value={config.maxXpPerHour ?? 100}
              />
            )}
          </div>

          {/* Max XP per Day */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                Max XP per Day
                <TooltipIcon text="Limit total XP earned in a day" />
              </Label>
              <Switch
                checked={config.maxXpPerDayEnabled}
                onCheckedChange={(enabled) =>
                  onSave({ maxXpPerDayEnabled: enabled })
                }
              />
            </div>
            {config.maxXpPerDayEnabled && (
              <NumberInput
                min={1}
                onChange={(value) => onSave({ maxXpPerDay: value })}
                value={config.maxXpPerDay ?? 500}
              />
            )}
          </div>

          {/* Similarity Detection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <ArrowDownUp className="h-4 w-4 text-muted-foreground" />
              Similarity Detection
              <TooltipIcon text="Detect and prevent XP from repeated/similar messages" />
            </Label>
            <Select
              onValueChange={(value: SimilaritySeverity) =>
                onSave({ similaritySeverity: value })
              }
              value={config.similaritySeverity}
            >
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="off">Off</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="strict">Strict</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Whitelisted Channels Card */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-500/10 p-2">
              <Hash className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <CardTitle className="text-lg">Whitelisted Channels</CardTitle>
              <CardDescription>
                Only these channels will award XP (leave empty for all channels)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ChannelMultiSelect
            channels={channels}
            onToggle={onToggleChannel}
            selected={config.whitelistedChannels}
          />
        </CardContent>
      </Card>
    </div>
  );
}

// Forum XP Settings Component
function ForumXPSettings({
  config,
  onSave,
  channels,
  onToggleChannel,
}: {
  config: LevelConfig;
  onSave: (updates: Partial<LevelConfig>) => void;
  channels: DiscordChannel[];
  onToggleChannel: (channelId: string) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Enable Forum XP */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-cyan-500/10 p-2">
                <MessageSquare className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <CardTitle className="text-lg">Forum Thread XP</CardTitle>
                <CardDescription>
                  Award XP for forum thread activity and helping others
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={config.forumXpEnabled}
              onCheckedChange={(enabled) => onSave({ forumXpEnabled: enabled })}
            />
          </div>
        </CardHeader>
      </Card>

      {config.forumXpEnabled && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Thread Close XP */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-green-500/10 p-2">
                  <Check className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">Thread Resolution</CardTitle>
                  <CardDescription>
                    XP awarded when threads are closed
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* XP on Thread Close */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  XP on Thread Close
                  <TooltipIcon text="XP given to thread author when closed" />
                </Label>
                <NumberInput
                  min={0}
                  onChange={(value) => onSave({ xpOnThreadClose: value })}
                  value={config.xpOnThreadClose}
                />
              </div>

              {/* Auto Archive Timer */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Auto-Archive (hours)
                  <TooltipIcon text="Automatically archive inactive threads" />
                </Label>
                <NumberInput
                  max={168}
                  min={1}
                  onChange={(value) => onSave({ autoArchiveHours: value })}
                  value={config.autoArchiveHours}
                />
              </div>
            </CardContent>
          </Card>

          {/* Helper Recognition */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-yellow-500/10 p-2">
                  <Star className="h-5 w-5 text-yellow-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">Helper Recognition</CardTitle>
                  <CardDescription>
                    Reward members who help in threads
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-muted-foreground text-sm">
                  When closing a thread with{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                    /close thread
                  </code>
                  , a dropdown appears to select the most helpful member.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  Helper Bonus XP
                  <TooltipIcon text="Extra XP given to the selected helper" />
                </Label>
                <NumberInput
                  min={0}
                  onChange={(value) => onSave({ helperBonusXp: value })}
                  value={config.helperBonusXp}
                />
              </div>
            </CardContent>
          </Card>

          {/* Fast Resolution Bonus */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-orange-500/10 p-2">
                    <Zap className="h-5 w-5 text-orange-400" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      Fast Resolution Bonus
                    </CardTitle>
                    <CardDescription>
                      Bonus XP for quickly resolved threads
                    </CardDescription>
                  </div>
                </div>
                <Switch
                  checked={config.fastResolutionEnabled}
                  onCheckedChange={(enabled) =>
                    onSave({ fastResolutionEnabled: enabled })
                  }
                />
              </div>
            </CardHeader>
            {config.fastResolutionEnabled && (
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Time Threshold (hours)</Label>
                    <NumberInput
                      max={48}
                      min={1}
                      onChange={(value) =>
                        onSave({ fastResolutionThresholdHours: value })
                      }
                      value={config.fastResolutionThresholdHours}
                    />
                    <p className="text-muted-foreground text-xs">
                      Threads resolved within this time get bonus XP
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Bonus XP</Label>
                    <NumberInput
                      min={0}
                      onChange={(value) =>
                        onSave({ fastResolutionBonusXp: value })
                      }
                      value={config.fastResolutionBonusXp}
                    />
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Whitelisted Forums */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-purple-500/10 p-2">
                  <Hash className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">Whitelisted Forums</CardTitle>
                  <CardDescription>
                    Only these forums will award XP (leave empty for all forums)
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {channels.length === 0 ? (
                <div className="flex items-center gap-3 rounded-lg border border-dashed bg-muted/30 p-4">
                  <MessageSquare className="h-5 w-5 text-muted-foreground" />
                  <p className="text-muted-foreground text-sm">
                    No forum channels found in this server
                  </p>
                </div>
              ) : (
                <ChannelMultiSelect
                  channels={channels}
                  onToggle={onToggleChannel}
                  selected={config.whitelistedForums}
                />
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// Level Roles Settings Component
function LevelRolesSettings({
  guildId,
  config,
  levelRoles,
  discordRoles,
  channels,
  onSave,
  onAddRole,
  onUpdateRole,
  onDeleteRole,
}: {
  guildId: string;
  config: LevelConfig;
  levelRoles: LevelRole[];
  discordRoles: DiscordRole[];
  channels: DiscordChannel[];
  onSave: (updates: Partial<LevelConfig>) => void;
  onAddRole: () => void;
  onUpdateRole: (roleId: string, updates: Partial<LevelRole>) => void;
  onDeleteRole: (roleId: string) => void;
}) {
  const [sendingEmbed, setSendingEmbed] = useState(false);
  const [selectedEmbedChannel, setSelectedEmbedChannel] = useState<string>(
    config.rolesEmbedChannelId ?? ""
  );

  const sortedRoles = [...levelRoles].sort(
    (a, b) => a.xpRequired - b.xpRequired
  );
  const assignableRoles = discordRoles.filter(
    (r) => r.name !== "@everyone" && !r.managed
  );

  const handleSendEmbed = async () => {
    if (!selectedEmbedChannel) {
      return;
    }

    setSendingEmbed(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/level/roles-embed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: selectedEmbedChannel }),
      });

      const json = await res.json();
      if (json.success) {
        onSave({
          rolesEmbedChannelId: json.data.channelId,
          rolesEmbedMessageId: json.data.messageId,
        });
      }
    } catch (error) {
      console.error("Failed to send roles embed:", error);
    } finally {
      setSendingEmbed(false);
    }
  };

  const handleUpdateEmbed = async () => {
    if (!config.rolesEmbedMessageId) {
      return;
    }

    setSendingEmbed(true);
    try {
      await fetch(`/api/guilds/${guildId}/level/roles-embed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: config.rolesEmbedChannelId }),
      });
    } catch (error) {
      console.error("Failed to update roles embed:", error);
    } finally {
      setSendingEmbed(false);
    }
  };

  const handleUnlinkEmbed = async () => {
    try {
      await fetch(`/api/guilds/${guildId}/level/roles-embed`, {
        method: "DELETE",
      });
      onSave({
        rolesEmbedChannelId: null,
        rolesEmbedMessageId: null,
      });
    } catch (error) {
      console.error("Failed to unlink roles embed:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Auto-remove Previous Role Toggle */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="flex items-center gap-2 font-medium">
                <ArrowDownUp className="h-4 w-4 text-muted-foreground" />
                Auto-Remove Previous Role
              </Label>
              <p className="text-muted-foreground text-xs">
                When a member ranks up, remove their previous level role
              </p>
            </div>
            <Switch
              checked={config.autoRemovePreviousRole}
              onCheckedChange={(enabled) =>
                onSave({ autoRemovePreviousRole: enabled })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Level Roles List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-500/10 p-2">
                <Trophy className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <CardTitle className="text-lg">Level Roles</CardTitle>
                <CardDescription>
                  Roles awarded at specific XP thresholds
                </CardDescription>
              </div>
            </div>
            <Button className="gap-2" onClick={onAddRole} size="sm">
              <Plus className="h-4 w-4" />
              Add Level Role
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {sortedRoles.length === 0 ? (
            <EmptyRolesState onAdd={onAddRole} />
          ) : (
            <div className="space-y-3">
              {sortedRoles.map((levelRole, index) => (
                <LevelRoleCard
                  availableRoles={assignableRoles}
                  index={index}
                  key={levelRole.id}
                  levelRole={levelRole}
                  onDelete={() => onDeleteRole(levelRole.id)}
                  onUpdate={(updates) => onUpdateRole(levelRole.id, updates)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Roles Embed Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-500/10 p-2">
              <Send className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-lg">Roles Embed</CardTitle>
              <CardDescription>
                Post an embed showing all level roles to a channel. It
                auto-updates when you modify roles.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Embed Title & Description */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Embed Title</Label>
              <input
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                onChange={(e) => onSave({ rolesEmbedTitle: e.target.value })}
                placeholder="🏆 Level Roles"
                type="text"
                value={config.rolesEmbedTitle}
              />
            </div>
            <div className="space-y-2">
              <Label>Embed Description</Label>
              <input
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                onChange={(e) =>
                  onSave({ rolesEmbedDescription: e.target.value })
                }
                placeholder="Earn XP by chatting to unlock these roles!"
                type="text"
                value={config.rolesEmbedDescription}
              />
            </div>
          </div>

          {/* Channel Selection and Actions */}
          {config.rolesEmbedMessageId ? (
            <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="font-medium text-sm">Embed Active</Label>
                  <p className="text-muted-foreground text-xs">
                    Posted in{" "}
                    <span className="font-medium">
                      #
                      {channels.find((c) => c.id === config.rolesEmbedChannelId)
                        ?.name ?? "unknown"}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    disabled={sendingEmbed}
                    onClick={handleUpdateEmbed}
                    size="sm"
                    variant="outline"
                  >
                    {sendingEmbed ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    <span className="ml-2">Update Now</span>
                  </Button>
                  <Button
                    className="text-muted-foreground hover:text-destructive"
                    onClick={handleUnlinkEmbed}
                    size="sm"
                    variant="ghost"
                  >
                    Unlink
                  </Button>
                </div>
              </div>
              <p className="text-muted-foreground text-xs">
                The embed will automatically update when you add, edit, or
                remove roles.
              </p>
            </div>
          ) : (
            <div className="flex items-end gap-3">
              <div className="flex-1 space-y-2">
                <Label>Select Channel</Label>
                <Select
                  onValueChange={setSelectedEmbedChannel}
                  value={selectedEmbedChannel}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a channel..." />
                  </SelectTrigger>
                  <SelectContent>
                    {channels.map((channel) => (
                      <SelectItem key={channel.id} value={channel.id}>
                        <span className="flex items-center gap-2">
                          <Hash className="h-4 w-4 text-muted-foreground" />
                          {channel.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                disabled={
                  !selectedEmbedChannel ||
                  sendingEmbed ||
                  levelRoles.length === 0
                }
                onClick={handleSendEmbed}
              >
                {sendingEmbed ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Send Embed
              </Button>
            </div>
          )}

          {levelRoles.length === 0 && (
            <p className="text-amber-500 text-xs">
              Add at least one level role before sending the embed.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Level Role Card Component
function LevelRoleCard({
  levelRole,
  index,
  availableRoles,
  onUpdate,
  onDelete,
}: {
  levelRole: LevelRole;
  index: number;
  availableRoles: DiscordRole[];
  onUpdate: (updates: Partial<LevelRole>) => void;
  onDelete: () => void;
}) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [localXp, setLocalXp] = useState(levelRole.xpRequired);

  const selectedRole = availableRoles.find((r) => r.id === levelRole.roleId);
  const roleColor = selectedRole
    ? getRoleColorHex(selectedRole.color)
    : "#99aab5";

  const handleXpChange = (value: number) => {
    setLocalXp(value);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      onUpdate({ xpRequired: value });
    }, 500);
  };

  return (
    <div
      className="group relative flex items-center gap-4 rounded-xl border bg-card p-4 transition-all hover:shadow-sm"
      style={{ borderLeftColor: roleColor, borderLeftWidth: "4px" }}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted font-medium text-muted-foreground text-sm">
        {index + 1}
      </div>

      <div className="flex flex-1 items-center gap-4">
        {/* Role Selector */}
        <div className="min-w-[180px]">
          <Select
            onValueChange={(value) => onUpdate({ roleId: value })}
            value={levelRole.roleId}
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Select role..." />
            </SelectTrigger>
            <SelectContent>
              {availableRoles.map((role) => {
                const color = getRoleColorHex(role.color);
                return (
                  <SelectItem key={role.id} value={role.id}>
                    <span className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      {role.name}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* XP Requirement */}
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-400" />
          <NumberInput
            className="w-28"
            min={1}
            onChange={handleXpChange}
            value={localXp}
          />
          <span className="text-muted-foreground text-sm">XP</span>
        </div>
      </div>

      {/* Delete Button */}
      <button
        className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
        onClick={onDelete}
        type="button"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

// Empty Roles State
function EmptyRolesState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 py-16">
      <div className="rounded-2xl bg-linear-to-br from-purple-500/20 to-pink-500/20 p-4">
        <Trophy className="h-10 w-10 text-purple-400" />
      </div>
      <h3 className="mt-6 font-semibold text-lg">No level roles yet</h3>
      <p className="mt-2 max-w-sm text-center text-muted-foreground text-sm">
        Add roles that members will earn as they gain XP and progress through
        levels
      </p>
      <Button className="mt-6 gap-2" onClick={onAdd}>
        <Plus className="h-4 w-4" />
        Add First Level Role
      </Button>
    </div>
  );
}

// Notification Settings Component
function NotificationSettings({
  config,
  channels,
  roles,
  onSave,
}: {
  config: LevelConfig;
  channels: DiscordChannel[];
  roles: DiscordRole[];
  onSave: (updates: Partial<LevelConfig>) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Channel Selectors */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Congratulations Channel */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-500/10 p-2">
                <Sparkles className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <CardTitle className="text-lg">Congrats Channel</CardTitle>
                <CardDescription>
                  Where level up messages appear
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ChannelSelect
              channels={channels}
              onChange={(value) => onSave({ congratsChannelId: value })}
              value={config.congratsChannelId}
            />
          </CardContent>
        </Card>

        {/* Demotion Channel */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-orange-500/10 p-2">
                <ArrowDownUp className="h-5 w-5 text-orange-400" />
              </div>
              <div>
                <CardTitle className="text-lg">Demotion Channel</CardTitle>
                <CardDescription>
                  Where demotion messages appear
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ChannelSelect
              channels={channels}
              onChange={(value) => onSave({ demotionChannelId: value })}
              value={config.demotionChannelId}
            />
          </CardContent>
        </Card>

        {/* Log Channel */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-500/10 p-2">
                <FileText className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-lg">Log Channel</CardTitle>
                <CardDescription>XP event logging</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ChannelSelect
              channels={channels}
              onChange={(value) => onSave({ logChannelId: value })}
              value={config.logChannelId}
            />
          </CardContent>
        </Card>
      </div>

      {/* Embed Customization */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-violet-500/10 p-2">
              <MessageCircle className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <CardTitle className="text-lg">Embed Messages</CardTitle>
              <CardDescription>
                Customize notification embed messages
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs className="space-y-4" defaultValue="promotion">
            <TabsList className="flex-wrap">
              <TabsTrigger value="promotion">🎉 Promotion</TabsTrigger>
              <TabsTrigger value="demotion">⚠️ Demotion</TabsTrigger>
              <TabsTrigger value="loss">📉 Role Loss</TabsTrigger>
              <TabsTrigger value="helper">🌟 Helper</TabsTrigger>
              <TabsTrigger value="fast">⚡ Fast Fix</TabsTrigger>
            </TabsList>

            <TabsContent className="space-y-4" value="promotion">
              <EmbedEditor
                description={config.promotionEmbedDescription}
                descriptions={config.promotionEmbedDescriptions}
                onDescriptionChange={(value) =>
                  onSave({ promotionEmbedDescription: value })
                }
                onDescriptionsChange={(value) =>
                  onSave({ promotionEmbedDescriptions: value })
                }
                onTitleChange={(value) =>
                  onSave({ promotionEmbedTitle: value })
                }
                roles={roles}
                title={config.promotionEmbedTitle}
                variables={["user", "role", "oldRole"]}
              />
            </TabsContent>

            <TabsContent className="space-y-4" value="demotion">
              <EmbedEditor
                description={config.demotionEmbedDescription}
                descriptions={config.demotionEmbedDescriptions}
                onDescriptionChange={(value) =>
                  onSave({ demotionEmbedDescription: value })
                }
                onDescriptionsChange={(value) =>
                  onSave({ demotionEmbedDescriptions: value })
                }
                onTitleChange={(value) => onSave({ demotionEmbedTitle: value })}
                roles={roles}
                title={config.demotionEmbedTitle}
                variables={["user", "newRole", "oldRole"]}
              />
            </TabsContent>

            <TabsContent className="space-y-4" value="loss">
              <EmbedEditor
                description={config.roleLossEmbedDescription}
                descriptions={config.roleLossEmbedDescriptions}
                onDescriptionChange={(value) =>
                  onSave({ roleLossEmbedDescription: value })
                }
                onDescriptionsChange={(value) =>
                  onSave({ roleLossEmbedDescriptions: value })
                }
                onTitleChange={(value) => onSave({ roleLossEmbedTitle: value })}
                roles={roles}
                title={config.roleLossEmbedTitle}
                variables={["user", "role"]}
              />
            </TabsContent>

            <TabsContent className="space-y-4" value="helper">
              <p className="mb-4 text-muted-foreground text-sm">
                This message is sent directly in the thread when it&apos;s
                closed with a marked helper.
              </p>
              <EmbedEditor
                description={config.helperRecognitionEmbedDescription}
                descriptions={config.helperRecognitionEmbedDescriptions}
                onDescriptionChange={(value) =>
                  onSave({ helperRecognitionEmbedDescription: value })
                }
                onDescriptionsChange={(value) =>
                  onSave({ helperRecognitionEmbedDescriptions: value })
                }
                onTitleChange={(value) =>
                  onSave({ helperRecognitionEmbedTitle: value })
                }
                roles={roles}
                title={config.helperRecognitionEmbedTitle}
                variables={["helper", "asker", "thread"]}
              />
            </TabsContent>

            <TabsContent className="space-y-4" value="fast">
              <p className="mb-4 text-muted-foreground text-sm">
                This message is sent directly in the thread when it&apos;s
                resolved within the fast resolution time limit.
              </p>
              <EmbedEditor
                description={config.fastResolutionEmbedDescription}
                descriptions={config.fastResolutionEmbedDescriptions}
                onDescriptionChange={(value) =>
                  onSave({ fastResolutionEmbedDescription: value })
                }
                onDescriptionsChange={(value) =>
                  onSave({ fastResolutionEmbedDescriptions: value })
                }
                onTitleChange={(value) =>
                  onSave({ fastResolutionEmbedTitle: value })
                }
                roles={roles}
                title={config.fastResolutionEmbedTitle}
                variables={["helper", "asker", "hours", "xp", "thread"]}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Booster Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-pink-500/10 p-2">
                <Gem className="h-5 w-5 text-pink-400" />
              </div>
              <div>
                <CardTitle className="text-lg">Booster Perks</CardTitle>
                <CardDescription>
                  Reward server boosters with XP bonuses
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={config.boosterEnabled}
              onCheckedChange={(checked) => onSave({ boosterEnabled: checked })}
            />
          </div>
        </CardHeader>
        {config.boosterEnabled && (
          <CardContent className="space-y-6">
            {/* Booster Channel */}
            <div className="space-y-2">
              <Label>Thank You Channel</Label>
              <ChannelSelect
                channels={channels}
                onChange={(value) => onSave({ boosterChannelId: value })}
                value={config.boosterChannelId}
              />
              <p className="text-muted-foreground text-xs">
                Send a thank you message when someone boosts the server.
              </p>
            </div>

            {/* Booster Bonuses */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  XP Multiplier
                  <TooltipIcon text="Multiplier applied to all XP gains" />
                </Label>
                <div className="flex items-center gap-3">
                  <Slider
                    className="flex-1"
                    max={3}
                    min={1}
                    onValueChange={(value) =>
                      onSave({ boosterXpMultiplier: value[0] })
                    }
                    step={0.1}
                    value={[config.boosterXpMultiplier]}
                  />
                  <span className="w-12 text-center font-mono text-sm">
                    {config.boosterXpMultiplier}x
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  Bonus XP/Message
                  <TooltipIcon text="Extra XP per message for boosters" />
                </Label>
                <div className="flex items-center gap-3">
                  <Slider
                    className="flex-1"
                    max={20}
                    min={0}
                    onValueChange={(value) =>
                      onSave({ boosterBonusXpPerMessage: value[0] })
                    }
                    step={1}
                    value={[config.boosterBonusXpPerMessage]}
                  />
                  <span className="w-12 text-center font-mono text-sm">
                    +{config.boosterBonusXpPerMessage}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  Helper Bonus
                  <TooltipIcon text="Multiplier for helper XP rewards" />
                </Label>
                <div className="flex items-center gap-3">
                  <Slider
                    className="flex-1"
                    max={2}
                    min={1}
                    onValueChange={(value) =>
                      onSave({ boosterHelperBonusMultiplier: value[0] })
                    }
                    step={0.05}
                    value={[config.boosterHelperBonusMultiplier]}
                  />
                  <span className="w-12 text-center font-mono text-sm">
                    {config.boosterHelperBonusMultiplier}x
                  </span>
                </div>
              </div>
            </div>

            {/* Booster Embed */}
            <div className="space-y-2">
              <Label>Thank You Message</Label>
              <EmbedEditor
                description={config.boosterEmbedDescription}
                descriptions={config.boosterEmbedDescriptions}
                onDescriptionChange={(value) =>
                  onSave({ boosterEmbedDescription: value })
                }
                onDescriptionsChange={(value) =>
                  onSave({ boosterEmbedDescriptions: value })
                }
                onTitleChange={(value) => onSave({ boosterEmbedTitle: value })}
                roles={roles}
                title={config.boosterEmbedTitle}
                variables={["user", "multiplier", "bonusXp", "helperBonus"]}
              />
            </div>
          </CardContent>
        )}
      </Card>

      {/* Monthly Top Helper */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-500/10 p-2">
                <Crown className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <CardTitle className="text-lg">Monthly Top Helpers</CardTitle>
                <CardDescription>
                  Announce the top helpers each month
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={config.monthlyTopHelperEnabled}
              onCheckedChange={(checked) =>
                onSave({ monthlyTopHelperEnabled: checked })
              }
            />
          </div>
        </CardHeader>
        {config.monthlyTopHelperEnabled && (
          <CardContent className="space-y-6">
            {/* Channel and Schedule */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Announcement Channel</Label>
                <ChannelSelect
                  channels={channels}
                  onChange={(value) =>
                    onSave({ monthlyTopHelperChannelId: value })
                  }
                  value={config.monthlyTopHelperChannelId}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Day of Month
                  </Label>
                  <Select
                    onValueChange={(value) =>
                      onSave({
                        monthlyTopHelperDay: Number.parseInt(value, 10),
                      })
                    }
                    value={config.monthlyTopHelperDay.toString()}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 28 }, (_, i) => i + 1).map(
                        (day) => (
                          <SelectItem key={day} value={day.toString()}>
                            {day}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Hour (UTC)
                  </Label>
                  <Select
                    onValueChange={(value) =>
                      onSave({
                        monthlyTopHelperHour: Number.parseInt(value, 10),
                      })
                    }
                    value={config.monthlyTopHelperHour.toString()}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                        <SelectItem key={hour} value={hour.toString()}>
                          {hour.toString().padStart(2, "0")}:00
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Rewards */}
            <div className="space-y-2">
              <Label>Rewards (XP)</Label>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-amber-500">
                    <Trophy className="h-4 w-4" />
                    <span className="font-medium text-sm">🥇 1st Place</span>
                  </div>
                  <input
                    className="h-11 w-full rounded-md border bg-background px-3 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    min={0}
                    onChange={(e) =>
                      onSave({
                        monthlyTopHelperFirst: e.target.value
                          ? Number.parseInt(e.target.value, 10)
                          : null,
                      })
                    }
                    placeholder="XP reward"
                    type="number"
                    value={config.monthlyTopHelperFirst ?? ""}
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <Trophy className="h-4 w-4" />
                    <span className="font-medium text-sm">🥈 2nd Place</span>
                  </div>
                  <input
                    className="h-11 w-full rounded-md border bg-background px-3 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    min={0}
                    onChange={(e) =>
                      onSave({
                        monthlyTopHelperSecond: e.target.value
                          ? Number.parseInt(e.target.value, 10)
                          : null,
                      })
                    }
                    placeholder="XP reward"
                    type="number"
                    value={config.monthlyTopHelperSecond ?? ""}
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-orange-700">
                    <Trophy className="h-4 w-4" />
                    <span className="font-medium text-sm">🥉 3rd Place</span>
                  </div>
                  <input
                    className="h-11 w-full rounded-md border bg-background px-3 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    min={0}
                    onChange={(e) =>
                      onSave({
                        monthlyTopHelperThird: e.target.value
                          ? Number.parseInt(e.target.value, 10)
                          : null,
                      })
                    }
                    placeholder="XP reward"
                    type="number"
                    value={config.monthlyTopHelperThird ?? ""}
                  />
                </div>
              </div>
            </div>

            {/* Embed */}
            <div className="space-y-2">
              <Label>Announcement Message</Label>
              <EmbedEditor
                description={config.monthlyTopHelperEmbedDescription}
                descriptions={config.monthlyTopHelperEmbedDescriptions}
                onDescriptionChange={(value) =>
                  onSave({ monthlyTopHelperEmbedDescription: value })
                }
                onDescriptionsChange={(value) =>
                  onSave({ monthlyTopHelperEmbedDescriptions: value })
                }
                onTitleChange={(value) =>
                  onSave({ monthlyTopHelperEmbedTitle: value })
                }
                roles={roles}
                title={config.monthlyTopHelperEmbedTitle}
                variables={[
                  "first",
                  "second",
                  "third",
                  "firstXp",
                  "secondXp",
                  "thirdXp",
                  "month",
                ]}
              />
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

// Embed Editor Component
function EmbedEditor({
  title,
  description,
  descriptions,
  variables,
  roles,
  onTitleChange,
  onDescriptionChange,
  onDescriptionsChange,
}: {
  title: string;
  description: string;
  descriptions: string[];
  variables: string[];
  roles: DiscordRole[];
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onDescriptionsChange: (value: string[]) => void;
}) {
  const [localTitle, setLocalTitle] = useState(title);
  const [localDescription, setLocalDescription] = useState(description);
  const [localDescriptions, setLocalDescriptions] =
    useState<string[]>(descriptions);
  const [showPreview, setShowPreview] = useState(true);
  const [previewIndex, setPreviewIndex] = useState(-1); // -1 = main description
  const [previewColor] = useState(getRandomPastelHex());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync with props when they change
  useEffect(() => {
    setLocalDescriptions(descriptions);
  }, [descriptions]);

  const handleTitleChange = (value: string) => {
    setLocalTitle(value);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => onTitleChange(value), 500);
  };

  const handleDescriptionChange = (value: string) => {
    setLocalDescription(value);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => onDescriptionChange(value), 500);
  };

  const handleAdditionalDescriptionChange = (index: number, value: string) => {
    const newDescriptions = [...localDescriptions];
    newDescriptions[index] = value;
    setLocalDescriptions(newDescriptions);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(
      () => onDescriptionsChange(newDescriptions),
      500
    );
  };

  const addDescription = () => {
    const newDescriptions = [...localDescriptions, ""];
    setLocalDescriptions(newDescriptions);
    onDescriptionsChange(newDescriptions);
  };

  const removeDescription = (index: number) => {
    const newDescriptions = localDescriptions.filter((_, i) => i !== index);
    setLocalDescriptions(newDescriptions);
    onDescriptionsChange(newDescriptions);
    // Adjust preview index if needed
    if (previewIndex >= newDescriptions.length) {
      setPreviewIndex(
        newDescriptions.length > 0 ? newDescriptions.length - 1 : -1
      );
    }
  };

  const insertVariable = (variable: string, targetIndex: number) => {
    if (targetIndex === -1) {
      const newDescription = `${localDescription}{${variable}}`;
      setLocalDescription(newDescription);
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(
        () => onDescriptionChange(newDescription),
        500
      );
    } else {
      const newDescriptions = [...localDescriptions];
      newDescriptions[targetIndex] =
        `${newDescriptions[targetIndex] ?? ""}{${variable}}`;
      setLocalDescriptions(newDescriptions);
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(
        () => onDescriptionsChange(newDescriptions),
        500
      );
    }
  };

  // Get current preview description
  const currentPreviewDescription =
    previewIndex === -1
      ? localDescription
      : (localDescriptions[previewIndex] ?? localDescription);

  // Sample data for preview - includes all possible variables
  const sampleRole = roles[0];
  const previewDescription = parseEmbedTemplate(currentPreviewDescription, {
    user: "@SampleUser",
    role: sampleRole ? `@${sampleRole.name}` : "@NewRole",
    newRole: sampleRole ? `@${sampleRole.name}` : "@NewRole",
    oldRole: "@OldRole",
    helper: "@HelperUser",
    asker: "@AskerUser",
    thread: "#sample-thread",
    hours: "2",
    xp: "25",
    multiplier: "1.5x",
    bonusXp: "5",
    helperBonus: "1.25x",
    first: "@TopHelper1",
    second: "@TopHelper2",
    third: "@TopHelper3",
    firstXp: "500",
    secondXp: "300",
    thirdXp: "150",
    month: "January",
  });

  const totalMessages = 1 + localDescriptions.length;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Editor */}
        <div className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label>Embed Title</Label>
            <input
              className="h-11 w-full rounded-md border bg-background px-3 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Enter embed title..."
              type="text"
              value={localTitle}
            />
          </div>

          {/* Main Description */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Default Message</Label>
              {totalMessages > 1 && (
                <Badge
                  className="bg-blue-500/10 text-blue-400"
                  variant="outline"
                >
                  Random selection enabled
                </Badge>
              )}
            </div>
            <textarea
              className="min-h-20 w-full resize-none rounded-lg border bg-background px-4 py-3 font-mono text-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              onChange={(e) => handleDescriptionChange(e.target.value)}
              placeholder="Enter description template..."
              value={localDescription}
            />
            <div className="flex flex-wrap gap-2">
              {variables.map((variable) => (
                <Button
                  className="h-7 gap-1 bg-blue-500/10 text-blue-500 text-xs hover:bg-blue-500/20"
                  key={variable}
                  onClick={() => insertVariable(variable, -1)}
                  size="sm"
                  variant="ghost"
                >
                  {`{${variable}}`}
                </Button>
              ))}
            </div>
          </div>

          {/* Additional Descriptions */}
          {localDescriptions.map((desc, index) => (
            <div className="space-y-2" key={index}>
              <div className="flex items-center justify-between">
                <Label>Alternative Message {index + 1}</Label>
                <Button
                  className="h-7 w-7 text-destructive hover:bg-destructive/10"
                  onClick={() => removeDescription(index)}
                  size="icon"
                  variant="ghost"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <textarea
                className="min-h-20 w-full resize-none rounded-lg border bg-background px-4 py-3 font-mono text-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                onChange={(e) =>
                  handleAdditionalDescriptionChange(index, e.target.value)
                }
                placeholder="Enter alternative description template..."
                value={desc}
              />
              <div className="flex flex-wrap gap-2">
                {variables.map((variable) => (
                  <Button
                    className="h-7 gap-1 bg-blue-500/10 text-blue-500 text-xs hover:bg-blue-500/20"
                    key={variable}
                    onClick={() => insertVariable(variable, index)}
                    size="sm"
                    variant="ghost"
                  >
                    {`{${variable}}`}
                  </Button>
                ))}
              </div>
            </div>
          ))}

          {/* Add Alternative Button */}
          <Button
            className="w-full gap-2"
            onClick={addDescription}
            variant="outline"
          >
            <Plus className="h-4 w-4" />
            Add Alternative Message
          </Button>
          {localDescriptions.length > 0 && (
            <p className="text-center text-muted-foreground text-xs">
              A random message will be selected each time a notification is sent
            </p>
          )}
        </div>

        {/* Preview */}
        {showPreview && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                Preview
              </Label>
              <div className="flex items-center gap-2">
                {totalMessages > 1 && (
                  <Select
                    onValueChange={(v) =>
                      setPreviewIndex(Number.parseInt(v, 10))
                    }
                    value={previewIndex.toString()}
                  >
                    <SelectTrigger className="h-7 w-[140px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="-1">Default</SelectItem>
                      {localDescriptions.map((_, i) => (
                        <SelectItem key={i} value={i.toString()}>
                          Alternative {i + 1}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button
                  className="h-7 px-2 text-xs"
                  onClick={() => setShowPreview(!showPreview)}
                  size="sm"
                  variant="ghost"
                >
                  Hide
                </Button>
              </div>
            </div>
            <div
              className="rounded-lg border bg-[#313338] p-4"
              style={{ borderLeftColor: previewColor, borderLeftWidth: "4px" }}
            >
              <div className="mb-2 flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-blue-500" />
                <span className="font-medium text-sm text-white">
                  SampleUser
                </span>
              </div>
              <div className="font-semibold text-white">{localTitle}</div>
              <div className="mt-1 text-sm text-zinc-300">
                {previewDescription}
              </div>
              <div className="mt-3 text-muted-foreground text-xs">
                {new Date().toLocaleString()}
              </div>
            </div>
          </div>
        )}
      </div>

      {!showPreview && (
        <Button
          className="w-full"
          onClick={() => setShowPreview(true)}
          variant="outline"
        >
          Show Preview
        </Button>
      )}
    </div>
  );
}

// Utility Components
function StatusBadge({
  active,
  activeLabel,
  inactiveLabel,
}: {
  active: boolean;
  activeLabel: string;
  inactiveLabel: string;
}) {
  return (
    <Badge
      className={`gap-1.5 ${
        active
          ? "border-green-500/30 bg-green-500/10 text-green-500"
          : "border-muted-foreground/30 bg-muted text-muted-foreground"
      }`}
      variant="outline"
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${active ? "animate-pulse bg-green-500" : "bg-muted-foreground"}`}
      />
      {active ? activeLabel : inactiveLabel}
    </Badge>
  );
}

function SaveStatusIndicator({ status }: { status: SaveStatus }) {
  if (status === "idle") {
    return null;
  }

  const statusConfig = {
    saving: {
      icon: <Loader2 className="h-4 w-4 animate-spin" />,
      text: "Saving changes...",
      className: "border-yellow-500/30 bg-yellow-500/10 text-yellow-500",
    },
    saved: {
      icon: <Check className="h-4 w-4" />,
      text: "Changes saved",
      className: "border-green-500/30 bg-green-500/10 text-green-500",
    },
    error: {
      icon: <AlertCircle className="h-4 w-4" />,
      text: "Failed to save",
      className: "border-red-500/30 bg-red-500/10 text-red-500",
    },
  }[status];

  return (
    <div
      className={`fixed right-6 bottom-6 z-50 flex items-center gap-2 rounded-lg border px-4 py-2.5 shadow-lg backdrop-blur-sm ${statusConfig.className}`}
    >
      {statusConfig.icon}
      <span className="font-medium text-sm">{statusConfig.text}</span>
    </div>
  );
}

function TooltipIcon({ text }: { text: string }) {
  return (
    <span className="group relative">
      <HelpCircle className="h-3.5 w-3.5 cursor-help text-muted-foreground" />
      <span className="-translate-x-1/2 pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 whitespace-nowrap rounded-md bg-popover px-2 py-1 text-popover-foreground text-xs opacity-0 shadow-md transition-opacity group-hover:opacity-100">
        {text}
      </span>
    </span>
  );
}

function NumberInput({
  value,
  onChange,
  min = 0,
  max,
  className = "",
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  className?: string;
}) {
  const [localValue, setLocalValue] = useState(value);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local value when prop changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number.parseInt(e.target.value, 10);
    if (!Number.isNaN(val)) {
      const clampedVal = Math.max(
        min,
        max !== undefined ? Math.min(max, val) : val
      );
      setLocalValue(clampedVal);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        onChange(clampedVal);
      }, 500);
    }
  };

  const handleBlur = () => {
    // Save immediately on blur
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (localValue !== value) {
      onChange(localValue);
    }
  };

  return (
    <input
      className={`h-11 w-full rounded-md border bg-background px-3 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 ${className}`}
      max={max}
      min={min}
      onBlur={handleBlur}
      onChange={handleChange}
      type="number"
      value={localValue}
    />
  );
}

function ChannelSelect({
  value,
  onChange,
  channels,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  channels: DiscordChannel[];
}) {
  return (
    <Select
      onValueChange={(v) => onChange(v === "none" ? null : v)}
      value={value || "none"}
    >
      <SelectTrigger className="h-11">
        <SelectValue placeholder="Select a channel..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">
          <span className="text-muted-foreground">None</span>
        </SelectItem>
        {channels.map((channel) => (
          <SelectItem key={channel.id} value={channel.id}>
            <span className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-muted-foreground" />
              {channel.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ChannelMultiSelect({
  selected,
  channels,
  onToggle,
}: {
  selected: string[];
  channels: DiscordChannel[];
  onToggle: (channelId: string) => void;
}) {
  if (channels.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-dashed bg-muted/30 p-4">
        <Hash className="h-5 w-5 text-muted-foreground" />
        <p className="text-muted-foreground text-sm">
          No channels found in this server
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {channels.map((channel) => {
          const isSelected = selected.includes(channel.id);
          return (
            <button
              className={`group flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all hover:scale-[1.02] active:scale-[0.98] ${
                isSelected
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border hover:border-muted-foreground/30"
              }`}
              key={channel.id}
              onClick={() => onToggle(channel.id)}
              type="button"
            >
              <Hash className="h-4 w-4" />
              <span className="font-medium">{channel.name}</span>
              {isSelected && <Check className="h-4 w-4" />}
            </button>
          );
        })}
      </div>
      <p className="text-muted-foreground text-xs">
        {selected.length === 0
          ? "All channels are enabled (no whitelist)"
          : `${selected.length} channel${selected.length !== 1 ? "s" : ""} selected`}
      </p>
    </div>
  );
}

function LevelTabSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-40 w-full rounded-2xl" />
      <Skeleton className="h-12 w-full rounded-lg" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}
