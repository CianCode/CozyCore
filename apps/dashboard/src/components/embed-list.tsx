"use client";

import type { DiscordChannel, SavedEmbedMessage } from "@cozycore/types";
import {
  Calendar,
  Copy,
  Edit,
  ExternalLink,
  Hash,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type EmbedListProps = {
  embeds: SavedEmbedMessage[];
  channels: DiscordChannel[];
  onCreateNew: () => void;
  onEdit: (embed: SavedEmbedMessage) => void;
  onDuplicate: (embed: SavedEmbedMessage) => void;
  onDelete: (embedId: string) => Promise<void>;
  onSend: (embedId: string) => Promise<{ success: boolean; error?: string }>;
  isLoading: boolean;
};

type SortOption = "name" | "updated" | "created" | "channel";

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getChannelName(
  channelId: string | null,
  channels: DiscordChannel[]
): string {
  if (!channelId) return "No channel";
  const channel = channels.find((c) => c.id === channelId);
  return channel?.name ?? "Unknown channel";
}

export function EmbedList({
  embeds,
  channels,
  onCreateNew,
  onEdit,
  onDuplicate,
  onDelete,
  onSend,
  isLoading,
}: EmbedListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("updated");
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    embedId: string | null;
    embedName: string;
  }>({ open: false, embedId: null, embedName: "" });
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filter and sort embeds
  const filteredEmbeds = embeds
    .filter((embed) =>
      embed.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "updated":
          return (
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
        case "created":
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        case "channel":
          return getChannelName(a.channelId, channels).localeCompare(
            getChannelName(b.channelId, channels)
          );
        default:
          return 0;
      }
    });

  const handleSend = async (embedId: string) => {
    setSendingId(embedId);
    try {
      await onSend(embedId);
    } finally {
      setSendingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.embedId) return;
    setDeletingId(deleteDialog.embedId);
    try {
      await onDelete(deleteDialog.embedId);
    } finally {
      setDeletingId(null);
      setDeleteDialog({ open: false, embedId: null, embedName: "" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-2xl tracking-tight">Saved Embeds</h2>
          <p className="text-muted-foreground">
            Manage your custom embed messages
          </p>
        </div>
        <Button onClick={onCreateNew}>
          <Plus className="mr-2 h-4 w-4" />
          Create New Embed
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
          <input
            className="flex h-10 w-full rounded-md border border-input bg-background py-2 pr-3 pl-9 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search embeds..."
            type="text"
            value={searchQuery}
          />
        </div>
        <Select
          onValueChange={(v) => setSortBy(v as SortOption)}
          value={sortBy}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="updated">Last updated</SelectItem>
            <SelectItem value="created">Date created</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="channel">Channel</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Embed List */}
      {filteredEmbeds.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-muted p-4">
              <Plus className="h-8 w-8 text-muted-foreground" />
            </div>
            {embeds.length === 0 ? (
              <>
                <h3 className="mt-4 font-semibold text-lg">No embeds yet</h3>
                <p className="mt-2 text-center text-muted-foreground">
                  Create your first embed to get started
                </p>
                <Button className="mt-4" onClick={onCreateNew}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Embed
                </Button>
              </>
            ) : (
              <>
                <h3 className="mt-4 font-semibold text-lg">No results found</h3>
                <p className="mt-2 text-center text-muted-foreground">
                  Try adjusting your search query
                </p>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredEmbeds.map((embed) => (
            <Card className="overflow-hidden" key={embed.id}>
              <div className="flex items-start justify-between p-4">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-semibold">{embed.name}</h3>
                    {embed.discordMessageId && (
                      <Badge className="shrink-0" variant="secondary">
                        <ExternalLink className="mr-1 h-3 w-3" />
                        Sent
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-muted-foreground text-sm">
                    <span className="flex items-center gap-1">
                      <Hash className="h-3.5 w-3.5" />
                      {getChannelName(embed.channelId, channels)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(embed.updatedAt)}
                    </span>
                    <span>
                      {embed.embeds.length} embed
                      {embed.embeds.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    onClick={() => onEdit(embed)}
                    size="sm"
                    variant="outline"
                  >
                    <Edit className="mr-1 h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    disabled={!embed.channelId || sendingId === embed.id}
                    onClick={() => handleSend(embed.id)}
                    size="sm"
                  >
                    {sendingId === embed.id ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-1 h-4 w-4" />
                    )}
                    {embed.discordMessageId ? "Update" : "Send"}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(embed)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDuplicate(embed)}>
                        <Copy className="mr-2 h-4 w-4" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-400 focus:text-red-400"
                        onClick={() =>
                          setDeleteDialog({
                            open: true,
                            embedId: embed.id,
                            embedName: embed.name,
                          })
                        }
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Preview of embeds */}
              {embed.embeds.length > 0 && (
                <div className="flex gap-2 border-t bg-muted/30 p-3">
                  {embed.embeds.slice(0, 3).map((embedData, index) => (
                    <div
                      className="flex min-w-0 flex-1 items-center gap-2 rounded bg-background p-2"
                      key={embedData.id || index}
                      style={{
                        borderLeft: `3px solid ${embedData.color || "#5865f2"}`,
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-sm">
                          {embedData.title || "Untitled embed"}
                        </p>
                        {embedData.description && (
                          <p className="truncate text-muted-foreground text-xs">
                            {embedData.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  {embed.embeds.length > 3 && (
                    <div className="flex items-center px-2 text-muted-foreground text-sm">
                      +{embed.embeds.length - 3} more
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
        open={deleteDialog.open}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete embed?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteDialog.embedName}"? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              disabled={deletingId !== null}
              onClick={() =>
                setDeleteDialog({ open: false, embedId: null, embedName: "" })
              }
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={deletingId !== null}
              onClick={handleDelete}
              variant="destructive"
            >
              {deletingId !== null ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
