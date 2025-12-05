"use client";

import type {
  DiscordChannel,
  DiscordRole,
  OnboardingConfig,
  WelcomeMessage,
} from "@cozycore/types";
import {
  AlertCircle,
  Bot,
  Check,
  ChevronDown,
  Clock,
  GripVertical,
  Hash,
  KeyRound,
  Loader2,
  MessageCircle,
  MessageSquarePlus,
  Plus,
  Settings2,
  Sparkles,
  Timer,
  Trash2,
  User,
  Users,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  DiscordMarkdownPreview,
  getRoleColorHex,
} from "@/components/discord-markdown-preview";
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

type OnboardingTabProps = {
  guildId: string;
};

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function OnboardingTab({ guildId }: OnboardingTabProps) {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<OnboardingConfig | null>(null);
  const [messages, setMessages] = useState<WelcomeMessage[]>([]);
  const [channels, setChannels] = useState<DiscordChannel[]>([]);
  const [roles, setRoles] = useState<DiscordRole[]>([]);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    messageId: string | null;
  }>({ open: false, messageId: null });
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // Fetch onboarding data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [onboardingRes, resourcesRes] = await Promise.all([
          fetch(`/api/guilds/${guildId}/onboarding`),
          fetch(`/api/guilds/${guildId}/resources`),
        ]);

        const onboardingData = await onboardingRes.json();
        const resourcesData = await resourcesRes.json();

        if (onboardingData.success) {
          setConfig(onboardingData.data.config);
          setMessages(onboardingData.data.messages);
        }

        if (resourcesData.success) {
          setChannels(resourcesData.data.channels);
          setRoles(resourcesData.data.roles);
        }
      } catch (error) {
        console.error("Failed to fetch onboarding data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [guildId]);

  // Save config
  const saveConfig = useCallback(
    async (updates: Partial<OnboardingConfig>) => {
      if (!config) {
        return;
      }

      setSaveStatus("saving");
      try {
        const response = await fetch(`/api/guilds/${guildId}/onboarding`, {
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

  // Add new message
  const addMessage = async () => {
    setSaveStatus("saving");
    try {
      const response = await fetch(
        `/api/guilds/${guildId}/onboarding/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: "Welcome to the server, {user}!" }),
        }
      );

      const data = await response.json();
      if (data.success) {
        setMessages((prev) => [...prev, data.data]);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      }
    } catch {
      setSaveStatus("error");
    }
  };

  // Update message content
  const updateMessage = useCallback(
    async (messageId: string, content: string) => {
      setSaveStatus("saving");
      try {
        const response = await fetch(
          `/api/guilds/${guildId}/onboarding/messages/${messageId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content }),
          }
        );

        if (response.ok) {
          setMessages((prev) =>
            prev.map((m) => (m.id === messageId ? { ...m, content } : m))
          );
          setSaveStatus("saved");
          setTimeout(() => setSaveStatus("idle"), 2000);
        }
      } catch {
        setSaveStatus("error");
      }
    },
    [guildId]
  );

  // Update message selectable roles (Discord select menu)
  const updateMessageSelectableRoles = useCallback(
    async (messageId: string, selectableRoles: string[]) => {
      setSaveStatus("saving");
      try {
        const response = await fetch(
          `/api/guilds/${guildId}/onboarding/messages/${messageId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ selectableRoles }),
          }
        );

        if (response.ok) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === messageId ? { ...m, selectableRoles } : m
            )
          );
          setSaveStatus("saved");
          setTimeout(() => setSaveStatus("idle"), 2000);
        }
      } catch {
        setSaveStatus("error");
      }
    },
    [guildId]
  );

  // Delete message
  const deleteMessage = async (messageId: string) => {
    setSaveStatus("saving");
    try {
      const response = await fetch(
        `/api/guilds/${guildId}/onboarding/messages/${messageId}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      }
    } catch {
      setSaveStatus("error");
    }
    setDeleteDialog({ open: false, messageId: null });
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, messageId: string) => {
    setDraggingId(messageId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, messageId: string) => {
    e.preventDefault();
    if (messageId !== draggingId) {
      setDragOverId(messageId);
    }
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null);
      setDragOverId(null);
      return;
    }

    const dragIndex = messages.findIndex((m) => m.id === draggingId);
    const dropIndex = messages.findIndex((m) => m.id === targetId);

    const newMessages = [...messages];
    const [removed] = newMessages.splice(dragIndex, 1);
    newMessages.splice(dropIndex, 0, removed);

    const reorderedMessages = newMessages.map((m, index) => ({
      ...m,
      order: index,
    }));

    setMessages(reorderedMessages);
    setDraggingId(null);
    setDragOverId(null);

    setSaveStatus("saving");
    try {
      await fetch(`/api/guilds/${guildId}/onboarding/messages`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: reorderedMessages.map((m) => ({
            id: m.id,
            order: m.order,
          })),
        }),
      });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("error");
    }
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverId(null);
  };

  // Toggle role selection
  const toggleRole = (roleId: string) => {
    if (!config) {
      return;
    }
    const currentRoles = config.rolesOnJoin || [];
    const newRoles = currentRoles.includes(roleId)
      ? currentRoles.filter((id) => id !== roleId)
      : [...currentRoles, roleId];
    saveConfig({ rolesOnJoin: newRoles });
  };

  if (loading) {
    return <OnboardingTabSkeleton />;
  }

  if (!config) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="rounded-full bg-destructive/10 p-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <p className="mt-4 text-muted-foreground">
            Failed to load onboarding configuration.
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

  const selectedChannel = channels.find(
    (c) => c.id === config.welcomeChannelId
  );

  return (
    <div className="space-y-8">
      {/* Save Status Toast */}
      <SaveStatusIndicator status={saveStatus} />

      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl border bg-linear-to-br from-violet-500/10 via-purple-500/5 to-fuchsia-500/10 p-8">
        <div className="absolute top-0 right-0 opacity-20">
          <Sparkles className="h-32 w-32 text-violet-500" />
        </div>
        <div className="relative flex items-start justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-violet-500/20 p-3">
                <MessageSquarePlus className="h-6 w-6 text-violet-400" />
              </div>
              <div>
                <h2 className="font-bold text-2xl tracking-tight">
                  Member Onboarding
                </h2>
                <p className="text-muted-foreground">
                  Create personalized welcome experiences for new members
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 pt-2">
              <StatusBadge
                active={config.enabled}
                activeLabel="Active"
                inactiveLabel="Paused"
              />
              {selectedChannel ? (
                <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                  <Hash className="h-4 w-4" />
                  {selectedChannel.name}
                </div>
              ) : null}
              <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                <MessageCircle className="h-4 w-4" />
                {messages.length} message{messages.length !== 1 ? "s" : ""}
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

      {/* Configuration Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Channel & Timing Settings */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-500/10 p-2">
                <Settings2 className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-lg">Channel Settings</CardTitle>
                <CardDescription>
                  Configure where threads are created
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Welcome Channel */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-muted-foreground" />
                Welcome Channel
              </Label>
              <Select
                onValueChange={(value) =>
                  saveConfig({ welcomeChannelId: value || null })
                }
                value={config.welcomeChannelId || ""}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select a channel..." />
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
              <p className="text-muted-foreground text-xs">
                New member threads will be created in this channel
              </p>
            </div>

            {/* Thread Auto-Delete */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Auto-Delete Threads
              </Label>
              <Select
                onValueChange={(value: "1d" | "7d") =>
                  saveConfig({ threadAutoDelete: value })
                }
                value={config.threadAutoDelete}
              >
                <SelectTrigger className="h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1d">
                    <span className="flex items-center gap-2">
                      <Timer className="h-4 w-4" />
                      After 24 hours
                    </span>
                  </SelectItem>
                  <SelectItem value="7d">
                    <span className="flex items-center gap-2">
                      <Timer className="h-4 w-4" />
                      After 7 days
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                Welcome threads are automatically cleaned up after this time
              </p>
            </div>

            {/* Thread Name Template */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MessageSquarePlus className="h-4 w-4 text-muted-foreground" />
                Thread Name
              </Label>
              <ThreadNameInput
                onSave={(value) => saveConfig({ threadNameTemplate: value })}
                value={config.threadNameTemplate || "Welcome {username}"}
              />
              <p className="text-muted-foreground text-xs">
                Use {"{username}"}, {"{server}"}, or {"{memberCount}"} as
                placeholders
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Bot Behavior Settings */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-500/10 p-2">
                <Bot className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <CardTitle className="text-lg">Bot Behavior</CardTitle>
                <CardDescription>
                  Make the bot feel more natural
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Typing Indicator */}
            <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
              <div className="space-y-1">
                <Label className="flex items-center gap-2 font-medium">
                  <MessageCircle className="h-4 w-4 text-muted-foreground" />
                  Show Typing Indicator
                </Label>
                <p className="text-muted-foreground text-xs">
                  Bot shows "typing..." before each message
                </p>
              </div>
              <Switch
                checked={config.showTypingIndicator}
                onCheckedChange={(showTypingIndicator) =>
                  saveConfig({ showTypingIndicator })
                }
              />
            </div>

            {/* Typing Delay */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-muted-foreground" />
                  Message Delay
                </Label>
                <span className="rounded-md bg-muted px-2 py-1 font-mono text-muted-foreground text-sm">
                  {((config.typingDelay || 1500) / 1000).toFixed(1)}s
                </span>
              </div>
              <Slider
                defaultValue={[config.typingDelay || 1500]}
                disabled={!config.showTypingIndicator}
                max={5000}
                min={500}
                onValueCommit={(value) => saveConfig({ typingDelay: value[0] })}
                step={100}
              />
              <div className="flex justify-between text-muted-foreground text-xs">
                <span>Fast (0.5s)</span>
                <span>Slow (5s)</span>
              </div>
              <p className="text-muted-foreground text-xs">
                Time between messages when typing indicator is shown
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Roles Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-500/10 p-2">
              <KeyRound className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <CardTitle className="text-lg">Auto-Assign Roles</CardTitle>
              <CardDescription>
                Roles that are automatically given to new members
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {roles.length === 0 ? (
            <div className="flex items-center gap-3 rounded-lg border border-dashed bg-muted/30 p-4">
              <Users className="h-5 w-5 text-muted-foreground" />
              <p className="text-muted-foreground text-sm">
                No assignable roles found in this server
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {roles.map((role) => {
                  const isSelected = config.rolesOnJoin?.includes(role.id);
                  const roleColor = getRoleColorHex(role.color);
                  return (
                    <button
                      className={`group relative flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all hover:scale-[1.02] active:scale-[0.98] ${
                        isSelected
                          ? "border-transparent shadow-sm"
                          : "border-border hover:border-muted-foreground/30"
                      }`}
                      key={role.id}
                      onClick={() => toggleRole(role.id)}
                      style={
                        isSelected
                          ? {
                              backgroundColor: `${roleColor}15`,
                              borderColor: `${roleColor}40`,
                            }
                          : undefined
                      }
                      type="button"
                    >
                      <span
                        className={`h-3 w-3 rounded-full ${isSelected ? "ring-2 ring-offset-1 ring-offset-background" : ""}`}
                        style={{
                          backgroundColor: roleColor,
                          boxShadow: isSelected
                            ? `0 0 0 2px var(--background), 0 0 0 4px ${roleColor}`
                            : undefined,
                        }}
                      />
                      <span
                        className="font-medium"
                        style={{ color: isSelected ? roleColor : undefined }}
                      >
                        {role.name}
                      </span>
                      {isSelected ? (
                        <Check
                          className="h-4 w-4"
                          style={{ color: roleColor }}
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
              <p className="text-muted-foreground text-xs">
                {config.rolesOnJoin?.length || 0} role
                {(config.rolesOnJoin?.length || 0) !== 1 ? "s" : ""} selected
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Welcome Messages */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-orange-500/10 p-2">
                <MessageCircle className="h-5 w-5 text-orange-400" />
              </div>
              <div>
                <CardTitle className="text-lg">Welcome Messages</CardTitle>
                <CardDescription>
                  Messages sent to new members in their welcome thread
                </CardDescription>
              </div>
            </div>
            <Button className="gap-2" onClick={addMessage} size="sm">
              <Plus className="h-4 w-4" />
              Add Message
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {messages.length === 0 ? (
            <EmptyMessagesState onAdd={addMessage} />
          ) : (
            <div className="space-y-4">
              {messages
                .sort((a, b) => a.order - b.order)
                .map((message, index) => (
                  <MessageCard
                    channels={channels}
                    configRoles={config.rolesOnJoin || []}
                    draggingId={draggingId}
                    dragOverId={dragOverId}
                    index={index}
                    key={message.id}
                    message={message}
                    onDelete={() =>
                      setDeleteDialog({ open: true, messageId: message.id })
                    }
                    onDragEnd={handleDragEnd}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDragStart={handleDragStart}
                    onDrop={handleDrop}
                    onUpdate={updateMessage}
                    onUpdateRoles={updateMessageSelectableRoles}
                    roles={roles}
                  />
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog
        onOpenChange={(open) =>
          setDeleteDialog({
            open,
            messageId: open ? deleteDialog.messageId : null,
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
                <DialogTitle>Delete Message</DialogTitle>
                <DialogDescription>
                  This action cannot be undone
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground text-sm">
              Are you sure you want to delete this welcome message? New members
              will no longer receive this message.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              onClick={() => setDeleteDialog({ open: false, messageId: null })}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (deleteDialog.messageId) {
                  deleteMessage(deleteDialog.messageId);
                }
              }}
              variant="destructive"
            >
              Delete Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Status Badge Component
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

// Save Status Indicator
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

// Empty Messages State
function EmptyMessagesState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 py-16">
      <div className="rounded-2xl bg-linear-to-br from-orange-500/20 to-amber-500/20 p-4">
        <MessageSquarePlus className="h-10 w-10 text-orange-400" />
      </div>
      <h3 className="mt-6 font-semibold text-lg">No welcome messages yet</h3>
      <p className="mt-2 max-w-sm text-center text-muted-foreground text-sm">
        Create your first message to greet new members when they join your
        server
      </p>
      <Button className="mt-6 gap-2" onClick={onAdd}>
        <Plus className="h-4 w-4" />
        Create First Message
      </Button>
    </div>
  );
}

// Message Card Component
type MessageCardProps = {
  message: WelcomeMessage;
  index: number;
  channels: DiscordChannel[];
  roles: DiscordRole[];
  configRoles: string[];
  draggingId: string | null;
  dragOverId: string | null;
  onUpdate: (id: string, content: string) => void;
  onUpdateRoles: (id: string, selectableRoles: string[]) => void;
  onDelete: () => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
};

function MessageCard({
  message,
  index,
  channels,
  roles,
  configRoles,
  draggingId,
  dragOverId,
  onUpdate,
  onUpdateRoles,
  onDelete,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}: MessageCardProps) {
  const [localContent, setLocalContent] = useState(message.content);
  const [showPreview, setShowPreview] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleContentChange = (value: string) => {
    setLocalContent(value);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      onUpdate(message.id, value);
    }, 500);
  };

  const insertPlaceholder = (placeholder: string) => {
    const newContent = localContent + placeholder;
    setLocalContent(newContent);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      onUpdate(message.id, newContent);
    }, 500);
  };

  const toggleMessageRole = (roleId: string) => {
    const currentRoles = message.selectableRoles || [];
    const newRoles = currentRoles.includes(roleId)
      ? currentRoles.filter((id) => id !== roleId)
      : [...currentRoles, roleId];
    onUpdateRoles(message.id, newRoles);
  };

  const isDragging = draggingId === message.id;
  const isDragOver = dragOverId === message.id;

  // Filter out @everyone role and sort by position (highest first)
  const availableRoles = roles
    .filter((role) => role.name !== "@everyone")
    .sort((a, b) => b.position - a.position);

  return (
    /* biome-ignore lint: draggable div required for drag-and-drop functionality */
    <div
      className={`group relative rounded-xl border bg-card transition-all ${
        isDragging ? "scale-[1.01] opacity-60 shadow-xl" : ""
      } ${isDragOver ? "ring-2 ring-primary ring-offset-2" : ""}`}
      draggable
      onDragEnd={onDragEnd}
      onDragLeave={onDragLeave}
      onDragOver={(e) => onDragOver(e, message.id)}
      onDragStart={(e) => onDragStart(e, message.id)}
      onDrop={(e) => onDrop(e, message.id)}
    >
      {/* Header */}
      <div className="flex items-center gap-3 border-b bg-muted/30 px-4 py-3">
        <div className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing">
          <GripVertical className="h-5 w-5" />
        </div>
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 font-medium text-primary text-sm">
            {index + 1}
          </span>
          <span className="font-medium text-sm">Message {index + 1}</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button
            className="h-8 px-2 text-xs"
            onClick={() => setShowPreview(!showPreview)}
            size="sm"
            variant="ghost"
          >
            {showPreview ? "Hide" : "Show"} Preview
          </Button>
          <button
            className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
            onClick={onDelete}
            type="button"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className={`grid gap-4 ${showPreview ? "lg:grid-cols-2" : ""}`}>
          {/* Editor */}
          <div className="space-y-3">
            <textarea
              className="min-h-[140px] w-full resize-none rounded-lg border bg-background px-4 py-3 font-mono text-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="Type your welcome message here..."
              value={localContent}
            />

            {/* Insert Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button
                className="h-8 gap-1.5 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20"
                onClick={() => insertPlaceholder("{user}")}
                size="sm"
                variant="ghost"
              >
                <User className="h-3.5 w-3.5" />
                @User
              </Button>
              <ChannelPickerDropdown
                channels={channels}
                onSelect={(channelId) => insertPlaceholder(`<#${channelId}>`)}
              />
              <RolePickerDropdown
                onSelect={(roleId) => insertPlaceholder(`<@&${roleId}>`)}
                roles={roles}
              />
            </div>
          </div>

          {/* Preview */}
          {showPreview ? (
            <div className="space-y-2">
              <p className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
                Preview
              </p>
              <div className="rounded-lg border bg-[#313338] p-4">
                <DiscordMarkdownPreview
                  channels={channels}
                  content={localContent}
                  roles={roles}
                />
              </div>
            </div>
          ) : null}
        </div>

        {/* Role Selection Menu */}
        <div className="rounded-lg border bg-muted/20 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">Role Selection Menu</span>
            {message.selectableRoles?.length === 0 ? (
              <Badge className="ml-auto" variant="secondary">
                No selector
              </Badge>
            ) : (
              <Badge
                className="ml-auto bg-purple-500/10 text-purple-400"
                variant="outline"
              >
                {message.selectableRoles?.length} role
                {message.selectableRoles?.length !== 1 ? "s" : ""} in menu
              </Badge>
            )}
          </div>
          {availableRoles.length === 0 ? (
            <p className="text-muted-foreground text-xs">
              No roles available in this server
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {availableRoles.map((role) => {
                  const isSelected =
                    message.selectableRoles?.includes(role.id) ?? false;
                  const roleColor = getRoleColorHex(role.color);
                  return (
                    <button
                      className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-all hover:scale-[1.02] active:scale-[0.98] ${
                        isSelected
                          ? "border-transparent shadow-sm"
                          : "border-border hover:border-muted-foreground/30"
                      }`}
                      key={role.id}
                      onClick={() => toggleMessageRole(role.id)}
                      style={
                        isSelected
                          ? {
                              backgroundColor: `${roleColor}15`,
                              borderColor: `${roleColor}40`,
                            }
                          : undefined
                      }
                      type="button"
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: roleColor }}
                      />
                      <span
                        className="font-medium"
                        style={{ color: isSelected ? roleColor : undefined }}
                      >
                        {role.name}
                      </span>
                      {isSelected ? (
                        <Check
                          className="h-3 w-3"
                          style={{ color: roleColor }}
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-muted-foreground text-xs">
                {message.selectableRoles?.length === 0
                  ? "No Discord select menu will be shown with this message"
                  : "A Discord select menu will appear below this message, allowing users to pick these roles"}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Channel Picker Dropdown
function ChannelPickerDropdown({
  channels,
  onSelect,
}: {
  channels: DiscordChannel[];
  onSelect: (channelId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        className="h-8 gap-1.5 bg-zinc-500/10 text-zinc-400 hover:bg-zinc-500/20"
        onClick={() => setOpen(!open)}
        size="sm"
        variant="ghost"
      >
        <Hash className="h-3.5 w-3.5" />
        #Channel
        <ChevronDown className="h-3 w-3" />
      </Button>
      {open ? (
        <div className="absolute top-full left-0 z-50 mt-1 max-h-56 w-56 overflow-auto rounded-lg border bg-popover p-1 shadow-lg">
          {channels.map((channel) => (
            <button
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
              key={channel.id}
              onClick={() => {
                onSelect(channel.id);
                setOpen(false);
              }}
              type="button"
            >
              <Hash className="h-4 w-4 text-muted-foreground" />
              {channel.name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// Role Picker Dropdown
function RolePickerDropdown({
  roles,
  onSelect,
}: {
  roles: DiscordRole[];
  onSelect: (roleId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        className="h-8 gap-1.5 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20"
        onClick={() => setOpen(!open)}
        size="sm"
        variant="ghost"
      >
        @Role
        <ChevronDown className="h-3 w-3" />
      </Button>
      {open ? (
        <div className="absolute top-full left-0 z-50 mt-1 max-h-56 w-56 overflow-auto rounded-lg border bg-popover p-1 shadow-lg">
          {roles.map((role) => {
            const roleColor = getRoleColorHex(role.color);
            return (
              <button
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                key={role.id}
                onClick={() => {
                  onSelect(role.id);
                  setOpen(false);
                }}
                type="button"
              >
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: roleColor }}
                />
                {role.name}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

// Thread Name Input with debounce
function ThreadNameInput({
  value,
  onSave,
}: {
  value: string;
  onSave: (value: string) => void;
}) {
  const [localValue, setLocalValue] = useState(value);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = (newValue: string) => {
    setLocalValue(newValue);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      onSave(newValue);
    }, 500);
  };

  return (
    <input
      className="h-11 w-full rounded-md border bg-background px-3 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      onChange={(e) => handleChange(e.target.value)}
      placeholder="Welcome {username}"
      type="text"
      value={localValue}
    />
  );
}

// Loading Skeleton
function OnboardingTabSkeleton() {
  return (
    <div className="space-y-8">
      {/* Hero Skeleton */}
      <Skeleton className="h-40 w-full rounded-2xl" />

      {/* Grid Skeleton */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>

      {/* Roles Skeleton */}
      <Skeleton className="h-40 w-full rounded-xl" />

      {/* Messages Skeleton */}
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  );
}
