"use client";

import type {
  DiscordChannel,
  DiscordRole,
  EmbedData,
  SavedEmbedMessage,
} from "@cozycore/types";
import {
  AlertCircle,
  Check,
  Loader2,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { EmbedEditor } from "@/components/embed-editor";
import { EmbedList } from "@/components/embed-list";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type EmbedsTabProps = {
  guildId: string;
};

type SaveStatus = "idle" | "saving" | "saved" | "error";
type ViewMode = "list" | "editor";

// Save status indicator component
function SaveStatusIndicator({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;

  return (
    <div className="fixed right-4 bottom-4 z-50">
      <div
        className={`flex items-center gap-2 rounded-lg px-4 py-2 shadow-lg ${
          status === "saving"
            ? "bg-blue-500/90 text-white"
            : status === "saved"
              ? "bg-green-500/90 text-white"
              : "bg-red-500/90 text-white"
        }`}
      >
        {status === "saving" && (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving...
          </>
        )}
        {status === "saved" && (
          <>
            <Check className="h-4 w-4" />
            Saved!
          </>
        )}
        {status === "error" && (
          <>
            <AlertCircle className="h-4 w-4" />
            Failed to save
          </>
        )}
      </div>
    </div>
  );
}

// Loading skeleton
function EmbedsTabSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="flex gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="grid gap-4">
        <Skeleton className="h-32 w-full" key="skeleton-1" />
        <Skeleton className="h-32 w-full" key="skeleton-2" />
        <Skeleton className="h-32 w-full" key="skeleton-3" />
      </div>
    </div>
  );
}

export function EmbedsTab({ guildId }: EmbedsTabProps) {
  // Data state
  const [loading, setLoading] = useState(true);
  const [embeds, setEmbeds] = useState<SavedEmbedMessage[]>([]);
  const [channels, setChannels] = useState<DiscordChannel[]>([]);
  const [roles, setRoles] = useState<DiscordRole[]>([]);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  // UI state
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [editingEmbed, setEditingEmbed] = useState<SavedEmbedMessage | null>(
    null
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Fetch embeds and channels
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [embedsRes, resourcesRes] = await Promise.all([
          fetch(`/api/guilds/${guildId}/embeds`),
          fetch(`/api/guilds/${guildId}/resources`),
        ]);

        const embedsData = await embedsRes.json();
        const resourcesData = await resourcesRes.json();

        if (embedsData.success) {
          setEmbeds(embedsData.data);
        }

        if (resourcesData.success) {
          setChannels(resourcesData.data.channels);
          setRoles(resourcesData.data.roles);
        }
      } catch (error) {
        console.error("Failed to fetch embeds data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [guildId]);

  // Create new embed
  const handleCreateNew = () => {
    setEditingEmbed(null);
    setViewMode("editor");
  };

  // Edit existing embed
  const handleEdit = (embed: SavedEmbedMessage) => {
    setEditingEmbed(embed);
    setViewMode("editor");
  };

  // Duplicate embed
  const handleDuplicate = async (embed: SavedEmbedMessage) => {
    setIsSaving(true);
    setSaveStatus("saving");
    try {
      const response = await fetch(`/api/guilds/${guildId}/embeds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${embed.name} (Copy)`,
          channelId: embed.channelId,
          content: embed.content,
          embeds: embed.embeds,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setEmbeds((prev) => [...prev, data.data]);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } else {
        setSaveStatus("error");
        setTimeout(() => setSaveStatus("idle"), 3000);
      }
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete embed
  const handleDelete = async (embedId: string) => {
    try {
      const response = await fetch(`/api/guilds/${guildId}/embeds/${embedId}`, {
        method: "DELETE",
      });

      const data = await response.json();
      if (data.success) {
        setEmbeds((prev) => prev.filter((e) => e.id !== embedId));
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } else {
        setSaveStatus("error");
        setTimeout(() => setSaveStatus("idle"), 3000);
      }
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  // Send embed to Discord
  const handleSend = async (embedId: string) => {
    try {
      const response = await fetch(
        `/api/guilds/${guildId}/embeds/${embedId}/send`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      const data = await response.json();
      if (data.success) {
        // Update the embed with the message ID
        setEmbeds((prev) =>
          prev.map((e) =>
            e.id === embedId
              ? { ...e, discordMessageId: data.data.messageId }
              : e
          )
        );
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
        return { success: true };
      }
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
      return { success: false, error: data.error };
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
      return { success: false, error: "Failed to send embed" };
    }
  };

  // Save embed (from editor)
  const handleSave = useCallback(
    async (data: {
      name: string;
      channelId: string | null;
      content: string | null;
      embeds: EmbedData[];
    }) => {
      setIsSaving(true);
      setSaveStatus("saving");

      try {
        const isEditing = editingEmbed !== null;
        const url = isEditing
          ? `/api/guilds/${guildId}/embeds/${editingEmbed.id}`
          : `/api/guilds/${guildId}/embeds`;

        const response = await fetch(url, {
          method: isEditing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        const result = await response.json();

        if (result.success) {
          if (isEditing) {
            setEmbeds((prev) =>
              prev.map((e) => (e.id === editingEmbed.id ? result.data : e))
            );
          } else {
            setEmbeds((prev) => [...prev, result.data]);
          }
          setEditingEmbed(result.data);
          setSaveStatus("saved");
          setTimeout(() => setSaveStatus("idle"), 2000);
          return { success: true };
        }
        setSaveStatus("error");
        setTimeout(() => setSaveStatus("idle"), 3000);
        return { success: false, error: result.error };
      } catch {
        setSaveStatus("error");
        setTimeout(() => setSaveStatus("idle"), 3000);
        return { success: false, error: "Failed to save embed" };
      } finally {
        setIsSaving(false);
      }
    },
    [guildId, editingEmbed]
  );

  // Helper to update embeds state
  const updateEmbedsState = useCallback(
    (savedEmbed: SavedEmbedMessage, isEditing: boolean) => {
      if (isEditing) {
        setEmbeds((prev) =>
          prev.map((e) => (e.id === savedEmbed.id ? savedEmbed : e))
        );
      } else {
        setEmbeds((prev) => [...prev, savedEmbed]);
      }
      setEditingEmbed(savedEmbed);
    },
    []
  );

  // Helper to show error status
  const showErrorStatus = useCallback(() => {
    setSaveStatus("error");
    setTimeout(() => setSaveStatus("idle"), 3000);
  }, []);

  // Helper to show success status
  const showSuccessStatus = useCallback(() => {
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2000);
  }, []);

  // Save and send embed (from editor)
  const handleSaveAndSend = useCallback(
    async (data: {
      name: string;
      channelId: string | null;
      content: string | null;
      embeds: EmbedData[];
    }) => {
      setIsSending(true);
      setSaveStatus("saving");

      try {
        const isEditing = editingEmbed !== null;
        const saveUrl = isEditing
          ? `/api/guilds/${guildId}/embeds/${editingEmbed.id}`
          : `/api/guilds/${guildId}/embeds`;

        const saveResponse = await fetch(saveUrl, {
          method: isEditing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        const saveResult = await saveResponse.json();

        if (!saveResult.success) {
          showErrorStatus();
          return { success: false, error: saveResult.error };
        }

        const savedEmbed = saveResult.data;
        const sendResponse = await fetch(
          `/api/guilds/${guildId}/embeds/${savedEmbed.id}/send`,
          { method: "POST", headers: { "Content-Type": "application/json" } }
        );

        const sendResult = await sendResponse.json();

        if (sendResult.success) {
          const updatedEmbed = {
            ...savedEmbed,
            discordMessageId: sendResult.data.messageId,
          };
          updateEmbedsState(updatedEmbed, isEditing);
          showSuccessStatus();
          setViewMode("list");
          return { success: true };
        }

        // Save succeeded but send failed - still update the list
        updateEmbedsState(savedEmbed, isEditing);
        showErrorStatus();
        return { success: false, error: sendResult.error || "Failed to send" };
      } catch {
        showErrorStatus();
        return { success: false, error: "Failed to save and send embed" };
      } finally {
        setIsSending(false);
      }
    },
    [guildId, editingEmbed, updateEmbedsState, showErrorStatus, showSuccessStatus]
  );

  // Cancel editing
  const handleCancel = () => {
    setViewMode("list");
    setEditingEmbed(null);
  };

  if (loading) {
    return <EmbedsTabSkeleton />;
  }

  return (
    <div className="space-y-8">
      {/* Save Status Toast */}
      <SaveStatusIndicator status={saveStatus} />

      {/* Hero Header */}
      {viewMode === "list" && (
        <div className="relative overflow-hidden rounded-2xl border bg-linear-to-br from-indigo-500/10 via-purple-500/5 to-pink-500/10 p-8">
          <div className="absolute top-0 right-0 opacity-20">
            <MessageSquare className="h-32 w-32 text-indigo-500" />
          </div>
          <div className="relative flex items-start justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-indigo-500/20 p-3">
                  <Sparkles className="h-6 w-6 text-indigo-400" />
                </div>
                <div>
                  <h2 className="font-bold text-2xl tracking-tight">
                    Embed Creator
                  </h2>
                  <p className="text-muted-foreground">
                    Create beautiful embeds for announcements, rules, and more
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 pt-2">
                <Badge variant="secondary">
                  <MessageSquare className="mr-1 h-3 w-3" />
                  {embeds.length} saved embed{embeds.length !== 1 ? "s" : ""}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      {viewMode === "list" ? (
        <EmbedList
          channels={channels}
          embeds={embeds}
          isLoading={false}
          onCreateNew={handleCreateNew}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
          onEdit={handleEdit}
          onSend={handleSend}
        />
      ) : (
        <EmbedEditor
          channels={channels}
          guildId={guildId}
          initialData={editingEmbed}
          isSaving={isSaving}
          isSending={isSending}
          onCancel={handleCancel}
          onSave={handleSave}
          onSaveAndSend={handleSaveAndSend}
          roles={roles}
        />
      )}
    </div>
  );
}
