"use client";

import type {
  DiscordChannel,
  DiscordRole,
  EmbedData,
  EmbedField,
  SavedEmbedMessage,
} from "@cozycore/types";
import { EMBED_LIMITS } from "@cozycore/types";
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Hash,
  Loader2,
  Plus,
  Save,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { MessagePreview } from "@/components/embed-preview";
import { MentionPicker } from "@/components/mention-picker";
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getRandomPastelHex } from "@/lib/embed-utils";

type EmbedEditorProps = {
  guildId: string;
  channels: DiscordChannel[];
  roles: DiscordRole[];
  initialData?: SavedEmbedMessage | null;
  onSave: (data: {
    name: string;
    channelId: string | null;
    content: string | null;
    embeds: EmbedData[];
  }) => Promise<{ success: boolean; error?: string }>;
  onSaveAndSend: (data: {
    name: string;
    channelId: string | null;
    content: string | null;
    embeds: EmbedData[];
  }) => Promise<{ success: boolean; error?: string }>;
  onCancel: () => void;
  isSaving: boolean;
  isSending: boolean;
};

// Character count indicator
function CharCount({
  current,
  max,
  className = "",
}: {
  current: number;
  max: number;
  className?: string;
}) {
  const isOver = current > max;
  const isNear = current > max * 0.9;

  return (
    <span
      className={`text-xs ${isOver ? "text-red-400" : isNear ? "text-yellow-400" : "text-muted-foreground"} ${className}`}
    >
      {current}/{max}
    </span>
  );
}

// Generate unique ID
function generateId(): string {
  return crypto.randomUUID();
}

// Create empty embed
function createEmptyEmbed(): EmbedData {
  return {
    id: generateId(),
    title: "",
    description: "",
    color: getRandomPastelHex(),
    fields: [],
    timestamp: false,
  };
}

// Create empty field
function createEmptyField(): EmbedField {
  return {
    id: generateId(),
    name: "",
    value: "",
    inline: false,
  };
}

export function EmbedEditor({
  guildId,
  channels,
  roles,
  initialData,
  onSave,
  onSaveAndSend,
  onCancel,
  isSaving,
  isSending,
}: EmbedEditorProps) {
  // Form state
  const [name, setName] = useState(initialData?.name ?? "");
  const [channelId, setChannelId] = useState<string | null>(
    initialData?.channelId ?? null
  );
  const [content, setContent] = useState(initialData?.content ?? "");
  const [embeds, setEmbeds] = useState<EmbedData[]>(() => {
    if (initialData?.embeds && initialData.embeds.length > 0) {
      // Ensure all embeds and fields have IDs
      return initialData.embeds.map((embed) => ({
        ...embed,
        id: embed.id || generateId(),
        fields: embed.fields?.map((field) => ({
          ...field,
          id: field.id || generateId(),
        })),
      }));
    }
    return [createEmptyEmbed()];
  });

  // UI state
  const [activeEmbedIndex, setActiveEmbedIndex] = useState(0);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Refs for mention insertion
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const descriptionTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Insert mention at cursor position
  const insertMentionAtCursor = useCallback(
    (
      textareaRef: React.RefObject<HTMLTextAreaElement | null>,
      mention: string,
      setter: (value: string) => void,
      currentValue: string
    ) => {
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newValue =
          currentValue.slice(0, start) + mention + currentValue.slice(end);
        setter(newValue);
        // Restore focus and cursor position after state update
        requestAnimationFrame(() => {
          textarea.focus();
          const newPos = start + mention.length;
          textarea.setSelectionRange(newPos, newPos);
        });
      } else {
        // No textarea ref, just append
        setter(currentValue + mention);
      }
    },
    []
  );

  // Track changes
  useEffect(() => {
    const hasChanges =
      name !== (initialData?.name ?? "") ||
      channelId !== (initialData?.channelId ?? null) ||
      content !== (initialData?.content ?? "") ||
      JSON.stringify(embeds) !== JSON.stringify(initialData?.embeds ?? []);
    setHasUnsavedChanges(hasChanges);
  }, [name, channelId, content, embeds, initialData]);

  // Validate embeds
  const validateEmbeds = useCallback(() => {
    const errors: string[] = [];

    if (!name.trim()) {
      errors.push("Embed name is required");
    }

    for (const [index, embed] of embeds.entries()) {
      const embedNum = index + 1;

      if (embed.title && embed.title.length > EMBED_LIMITS.TITLE_MAX) {
        errors.push(
          `Embed ${embedNum}: Title exceeds ${EMBED_LIMITS.TITLE_MAX} characters`
        );
      }

      if (
        embed.description &&
        embed.description.length > EMBED_LIMITS.DESCRIPTION_MAX
      ) {
        errors.push(
          `Embed ${embedNum}: Description exceeds ${EMBED_LIMITS.DESCRIPTION_MAX} characters`
        );
      }

      if (embed.fields && embed.fields.length > EMBED_LIMITS.FIELDS_MAX) {
        errors.push(
          `Embed ${embedNum}: Too many fields (max ${EMBED_LIMITS.FIELDS_MAX})`
        );
      }

      for (const [fieldIndex, field] of (embed.fields ?? []).entries()) {
        if (field.name && field.name.length > EMBED_LIMITS.FIELD_NAME_MAX) {
          errors.push(
            `Embed ${embedNum}, Field ${fieldIndex + 1}: Name exceeds ${EMBED_LIMITS.FIELD_NAME_MAX} characters`
          );
        }
        if (field.value && field.value.length > EMBED_LIMITS.FIELD_VALUE_MAX) {
          errors.push(
            `Embed ${embedNum}, Field ${fieldIndex + 1}: Value exceeds ${EMBED_LIMITS.FIELD_VALUE_MAX} characters`
          );
        }
      }

      if (
        embed.footer?.text &&
        embed.footer.text.length > EMBED_LIMITS.FOOTER_TEXT_MAX
      ) {
        errors.push(
          `Embed ${embedNum}: Footer text exceeds ${EMBED_LIMITS.FOOTER_TEXT_MAX} characters`
        );
      }

      if (
        embed.author?.name &&
        embed.author.name.length > EMBED_LIMITS.AUTHOR_NAME_MAX
      ) {
        errors.push(
          `Embed ${embedNum}: Author name exceeds ${EMBED_LIMITS.AUTHOR_NAME_MAX} characters`
        );
      }
    }

    setValidationErrors(errors);
    return errors.length === 0;
  }, [name, embeds]);

  // Update single embed
  const updateEmbed = (index: number, updates: Partial<EmbedData>) => {
    setEmbeds((prev) =>
      prev.map((embed, i) => (i === index ? { ...embed, ...updates } : embed))
    );
  };

  // Add new embed
  const addEmbed = () => {
    if (embeds.length >= EMBED_LIMITS.EMBEDS_MAX) return;
    const newEmbed = createEmptyEmbed();
    setEmbeds((prev) => [...prev, newEmbed]);
    setActiveEmbedIndex(embeds.length);
  };

  // Remove embed
  const removeEmbed = (index: number) => {
    if (embeds.length <= 1) return;
    setEmbeds((prev) => prev.filter((_, i) => i !== index));
    if (activeEmbedIndex >= index && activeEmbedIndex > 0) {
      setActiveEmbedIndex(activeEmbedIndex - 1);
    }
  };

  // Move embed up/down
  const moveEmbed = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= embeds.length) return;

    setEmbeds((prev) => {
      const newEmbeds = [...prev];
      [newEmbeds[index], newEmbeds[newIndex]] = [
        newEmbeds[newIndex],
        newEmbeds[index],
      ];
      return newEmbeds;
    });
    setActiveEmbedIndex(newIndex);
  };

  // Add field to embed
  const addField = (embedIndex: number) => {
    const embed = embeds[embedIndex];
    if ((embed.fields?.length ?? 0) >= EMBED_LIMITS.FIELDS_MAX) return;

    updateEmbed(embedIndex, {
      fields: [...(embed.fields ?? []), createEmptyField()],
    });
  };

  // Update field
  const updateField = (
    embedIndex: number,
    fieldIndex: number,
    updates: Partial<EmbedField>
  ) => {
    const embed = embeds[embedIndex];
    const newFields = embed.fields?.map((field, i) =>
      i === fieldIndex ? { ...field, ...updates } : field
    );
    updateEmbed(embedIndex, { fields: newFields });
  };

  // Remove field
  const removeField = (embedIndex: number, fieldIndex: number) => {
    const embed = embeds[embedIndex];
    const newFields = embed.fields?.filter((_, i) => i !== fieldIndex);
    updateEmbed(embedIndex, { fields: newFields });
  };

  // Move field
  const moveField = (
    embedIndex: number,
    fieldIndex: number,
    direction: "up" | "down"
  ) => {
    const embed = embeds[embedIndex];
    const fields = embed.fields ?? [];
    const newIndex = direction === "up" ? fieldIndex - 1 : fieldIndex + 1;
    if (newIndex < 0 || newIndex >= fields.length) return;

    const newFields = [...fields];
    [newFields[fieldIndex], newFields[newIndex]] = [
      newFields[newIndex],
      newFields[fieldIndex],
    ];
    updateEmbed(embedIndex, { fields: newFields });
  };

  // Handle save
  const handleSave = async () => {
    if (!validateEmbeds()) return;
    await onSave({
      name,
      channelId,
      content: content || null,
      embeds,
    });
  };

  // Handle save and send
  const handleSaveAndSend = async () => {
    if (!validateEmbeds()) return;
    if (!channelId) {
      setValidationErrors(["Please select a channel to send the embed to"]);
      return;
    }
    await onSaveAndSend({
      name,
      channelId,
      content: content || null,
      embeds,
    });
  };

  // Handle cancel
  const handleCancel = () => {
    if (hasUnsavedChanges) {
      setShowDiscardDialog(true);
    } else {
      onCancel();
    }
  };

  const activeEmbed = embeds[activeEmbedIndex];
  const textChannels = channels.filter((c) => c.type === 0 || c.type === 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-2xl tracking-tight">
            {initialData ? "Edit Embed" : "Create Embed"}
          </h2>
          <p className="text-muted-foreground">
            Design and customize your Discord embed message
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <Badge variant="secondary">Unsaved changes</Badge>
          )}
          <Button
            disabled={isSaving || isSending}
            onClick={handleCancel}
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            disabled={isSaving || isSending}
            onClick={handleSave}
            variant="outline"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save
              </>
            )}
          </Button>
          <Button
            disabled={isSaving || isSending || !channelId}
            onClick={handleSaveAndSend}
          >
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Save & Send
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <Card className="border-red-500/50 bg-red-500/10">
          <CardContent className="pt-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 text-red-400" />
              <div className="space-y-1">
                {validationErrors.map((error, i) => (
                  <p className="text-red-400 text-sm" key={i}>
                    {error}
                  </p>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Editor Panel */}
        <div className="space-y-4">
          {/* Message Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Message Settings</CardTitle>
              <CardDescription>
                Configure the basic message properties
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="embed-name">Embed Name *</Label>
                <input
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  id="embed-name"
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Embed"
                  type="text"
                  value={name}
                />
                <p className="text-muted-foreground text-xs">
                  Internal name for organization (not sent to Discord)
                </p>
              </div>

              <div className="space-y-2">
                <Label>Target Channel</Label>
                <Select
                  onValueChange={(v) => setChannelId(v === "none" ? null : v)}
                  value={channelId ?? "none"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a channel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No channel selected</SelectItem>
                    {textChannels.map((channel) => (
                      <SelectItem key={channel.id} value={channel.id}>
                        <div className="flex items-center gap-2">
                          <Hash className="h-4 w-4 text-muted-foreground" />
                          {channel.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="message-content">Message Content</Label>
                  <CharCount current={content.length} max={2000} />
                </div>
                <div className="flex gap-2">
                  <MentionPicker
                    channels={channels}
                    onInsert={(mention) =>
                      insertMentionAtCursor(
                        contentTextareaRef,
                        mention,
                        setContent,
                        content
                      )
                    }
                    roles={roles}
                  />
                </div>
                <textarea
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  id="message-content"
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Optional message above the embed..."
                  ref={contentTextareaRef}
                  rows={3}
                  value={content}
                />
              </div>
            </CardContent>
          </Card>

          {/* Embed List */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-lg">Embeds</CardTitle>
                <CardDescription>
                  {embeds.length}/{EMBED_LIMITS.EMBEDS_MAX} embeds
                </CardDescription>
              </div>
              <Button
                disabled={embeds.length >= EMBED_LIMITS.EMBEDS_MAX}
                onClick={addEmbed}
                size="sm"
              >
                <Plus className="mr-1 h-4 w-4" />
                Add Embed
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {embeds.map((embed, index) => (
                  <button
                    className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                      activeEmbedIndex === index
                        ? "border-primary bg-primary/10"
                        : "border-border hover:bg-muted"
                    }`}
                    key={embed.id}
                    onClick={() => setActiveEmbedIndex(index)}
                    type="button"
                  >
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: embed.color || "#5865f2" }}
                    />
                    <span>Embed {index + 1}</span>
                    {embeds.length > 1 && (
                      <button
                        className="ml-1 rounded p-0.5 hover:bg-red-500/20"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeEmbed(index);
                        }}
                        type="button"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Active Embed Editor */}
          {activeEmbed && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-lg">
                    Embed {activeEmbedIndex + 1} Settings
                  </CardTitle>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    disabled={activeEmbedIndex === 0}
                    onClick={() => moveEmbed(activeEmbedIndex, "up")}
                    size="icon"
                    variant="ghost"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    disabled={activeEmbedIndex === embeds.length - 1}
                    onClick={() => moveEmbed(activeEmbedIndex, "down")}
                    size="icon"
                    variant="ghost"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs className="w-full" defaultValue="content">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="content">Content</TabsTrigger>
                    <TabsTrigger value="author">Author</TabsTrigger>
                    <TabsTrigger value="fields">Fields</TabsTrigger>
                    <TabsTrigger value="images">Images</TabsTrigger>
                  </TabsList>

                  {/* Content Tab */}
                  <TabsContent className="space-y-4 pt-4" value="content">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor={`embed-${activeEmbedIndex}-title`}>
                          Title
                        </Label>
                        <CharCount
                          current={activeEmbed.title?.length ?? 0}
                          max={EMBED_LIMITS.TITLE_MAX}
                        />
                      </div>
                      <input
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        id={`embed-${activeEmbedIndex}-title`}
                        onChange={(e) =>
                          updateEmbed(activeEmbedIndex, {
                            title: e.target.value,
                          })
                        }
                        placeholder="Embed title"
                        type="text"
                        value={activeEmbed.title ?? ""}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`embed-${activeEmbedIndex}-title-url`}>
                        Title URL
                      </Label>
                      <input
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        id={`embed-${activeEmbedIndex}-title-url`}
                        onChange={(e) =>
                          updateEmbed(activeEmbedIndex, {
                            titleUrl: e.target.value || undefined,
                          })
                        }
                        placeholder="https://example.com"
                        type="url"
                        value={activeEmbed.titleUrl ?? ""}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label
                          htmlFor={`embed-${activeEmbedIndex}-description`}
                        >
                          Description
                        </Label>
                        <CharCount
                          current={activeEmbed.description?.length ?? 0}
                          max={EMBED_LIMITS.DESCRIPTION_MAX}
                        />
                      </div>
                      <div className="flex gap-2">
                        <MentionPicker
                          channels={channels}
                          onInsert={(mention) =>
                            insertMentionAtCursor(
                              descriptionTextareaRef,
                              mention,
                              (value) =>
                                updateEmbed(activeEmbedIndex, {
                                  description: value,
                                }),
                              activeEmbed.description ?? ""
                            )
                          }
                          roles={roles}
                        />
                      </div>
                      <textarea
                        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        id={`embed-${activeEmbedIndex}-description`}
                        onChange={(e) =>
                          updateEmbed(activeEmbedIndex, {
                            description: e.target.value,
                          })
                        }
                        placeholder="Embed description..."
                        ref={descriptionTextareaRef}
                        rows={4}
                        value={activeEmbed.description ?? ""}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`embed-${activeEmbedIndex}-color`}>
                          Color
                        </Label>
                        <div className="flex gap-2">
                          <input
                            className="h-10 w-14 cursor-pointer rounded-md border border-input"
                            id={`embed-${activeEmbedIndex}-color`}
                            onChange={(e) =>
                              updateEmbed(activeEmbedIndex, {
                                color: e.target.value,
                              })
                            }
                            type="color"
                            value={activeEmbed.color || "#5865f2"}
                          />
                          <input
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            onChange={(e) =>
                              updateEmbed(activeEmbedIndex, {
                                color: e.target.value,
                              })
                            }
                            placeholder="#5865f2"
                            type="text"
                            value={activeEmbed.color || "#5865f2"}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Timestamp</Label>
                        <div className="flex h-10 items-center gap-2">
                          <Switch
                            checked={activeEmbed.timestamp ?? false}
                            onCheckedChange={(checked) =>
                              updateEmbed(activeEmbedIndex, {
                                timestamp: checked,
                              })
                            }
                          />
                          <span className="text-muted-foreground text-sm">
                            Include timestamp
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="space-y-4 border-t pt-4">
                      <h4 className="font-medium text-sm">Footer</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label
                            htmlFor={`embed-${activeEmbedIndex}-footer-text`}
                          >
                            Footer Text
                          </Label>
                          <CharCount
                            current={activeEmbed.footer?.text?.length ?? 0}
                            max={EMBED_LIMITS.FOOTER_TEXT_MAX}
                          />
                        </div>
                        <input
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          id={`embed-${activeEmbedIndex}-footer-text`}
                          onChange={(e) =>
                            updateEmbed(activeEmbedIndex, {
                              footer: {
                                ...activeEmbed.footer,
                                text: e.target.value,
                              },
                            })
                          }
                          placeholder="Footer text"
                          type="text"
                          value={activeEmbed.footer?.text ?? ""}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor={`embed-${activeEmbedIndex}-footer-icon`}
                        >
                          Footer Icon URL
                        </Label>
                        <input
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          id={`embed-${activeEmbedIndex}-footer-icon`}
                          onChange={(e) =>
                            updateEmbed(activeEmbedIndex, {
                              footer: {
                                ...activeEmbed.footer,
                                text: activeEmbed.footer?.text ?? "",
                                iconUrl: e.target.value || undefined,
                              },
                            })
                          }
                          placeholder="https://example.com/icon.png"
                          type="url"
                          value={activeEmbed.footer?.iconUrl ?? ""}
                        />
                      </div>
                    </div>
                  </TabsContent>

                  {/* Author Tab */}
                  <TabsContent className="space-y-4 pt-4" value="author">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label
                          htmlFor={`embed-${activeEmbedIndex}-author-name`}
                        >
                          Author Name
                        </Label>
                        <CharCount
                          current={activeEmbed.author?.name?.length ?? 0}
                          max={EMBED_LIMITS.AUTHOR_NAME_MAX}
                        />
                      </div>
                      <input
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        id={`embed-${activeEmbedIndex}-author-name`}
                        onChange={(e) =>
                          updateEmbed(activeEmbedIndex, {
                            author: {
                              ...activeEmbed.author,
                              name: e.target.value,
                            },
                          })
                        }
                        placeholder="Author name"
                        type="text"
                        value={activeEmbed.author?.name ?? ""}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`embed-${activeEmbedIndex}-author-url`}>
                        Author URL
                      </Label>
                      <input
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        id={`embed-${activeEmbedIndex}-author-url`}
                        onChange={(e) =>
                          updateEmbed(activeEmbedIndex, {
                            author: {
                              ...activeEmbed.author,
                              name: activeEmbed.author?.name ?? "",
                              url: e.target.value || undefined,
                            },
                          })
                        }
                        placeholder="https://example.com"
                        type="url"
                        value={activeEmbed.author?.url ?? ""}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`embed-${activeEmbedIndex}-author-icon`}>
                        Author Icon URL
                      </Label>
                      <input
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        id={`embed-${activeEmbedIndex}-author-icon`}
                        onChange={(e) =>
                          updateEmbed(activeEmbedIndex, {
                            author: {
                              ...activeEmbed.author,
                              name: activeEmbed.author?.name ?? "",
                              iconUrl: e.target.value || undefined,
                            },
                          })
                        }
                        placeholder="https://example.com/icon.png"
                        type="url"
                        value={activeEmbed.author?.iconUrl ?? ""}
                      />
                    </div>
                  </TabsContent>

                  {/* Fields Tab */}
                  <TabsContent className="space-y-4 pt-4" value="fields">
                    <div className="flex items-center justify-between">
                      <p className="text-muted-foreground text-sm">
                        {activeEmbed.fields?.length ?? 0}/
                        {EMBED_LIMITS.FIELDS_MAX} fields
                      </p>
                      <Button
                        disabled={
                          (activeEmbed.fields?.length ?? 0) >=
                          EMBED_LIMITS.FIELDS_MAX
                        }
                        onClick={() => addField(activeEmbedIndex)}
                        size="sm"
                      >
                        <Plus className="mr-1 h-4 w-4" />
                        Add Field
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {activeEmbed.fields?.map((field, fieldIndex) => (
                        <div
                          className="rounded-lg border bg-muted/50 p-3"
                          key={field.id}
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <GripVertical className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium text-sm">
                                Field {fieldIndex + 1}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                className="h-8 w-8"
                                disabled={fieldIndex === 0}
                                onClick={() =>
                                  moveField(activeEmbedIndex, fieldIndex, "up")
                                }
                                size="icon"
                                variant="ghost"
                              >
                                <ChevronUp className="h-4 w-4" />
                              </Button>
                              <Button
                                className="h-8 w-8"
                                disabled={
                                  fieldIndex ===
                                  (activeEmbed.fields?.length ?? 0) - 1
                                }
                                onClick={() =>
                                  moveField(
                                    activeEmbedIndex,
                                    fieldIndex,
                                    "down"
                                  )
                                }
                                size="icon"
                                variant="ghost"
                              >
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                              <Button
                                className="h-8 w-8 text-red-400 hover:bg-red-500/20 hover:text-red-400"
                                onClick={() =>
                                  removeField(activeEmbedIndex, fieldIndex)
                                }
                                size="icon"
                                variant="ghost"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs">Name</Label>
                                <CharCount
                                  current={field.name.length}
                                  max={EMBED_LIMITS.FIELD_NAME_MAX}
                                />
                              </div>
                              <input
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                onChange={(e) =>
                                  updateField(activeEmbedIndex, fieldIndex, {
                                    name: e.target.value,
                                  })
                                }
                                placeholder="Field name"
                                type="text"
                                value={field.name}
                              />
                            </div>

                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs">Value</Label>
                                <CharCount
                                  current={field.value.length}
                                  max={EMBED_LIMITS.FIELD_VALUE_MAX}
                                />
                              </div>
                              <textarea
                                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                onChange={(e) =>
                                  updateField(activeEmbedIndex, fieldIndex, {
                                    value: e.target.value,
                                  })
                                }
                                placeholder="Field value"
                                rows={2}
                                value={field.value}
                              />
                            </div>

                            <div className="flex items-center gap-2">
                              <Switch
                                checked={field.inline ?? false}
                                onCheckedChange={(checked) =>
                                  updateField(activeEmbedIndex, fieldIndex, {
                                    inline: checked,
                                  })
                                }
                              />
                              <Label className="text-xs">Inline</Label>
                            </div>
                          </div>
                        </div>
                      ))}

                      {(!activeEmbed.fields ||
                        activeEmbed.fields.length === 0) && (
                        <div className="rounded-lg border border-dashed p-6 text-center">
                          <p className="text-muted-foreground text-sm">
                            No fields added yet
                          </p>
                          <Button
                            className="mt-2"
                            onClick={() => addField(activeEmbedIndex)}
                            size="sm"
                            variant="outline"
                          >
                            <Plus className="mr-1 h-4 w-4" />
                            Add Field
                          </Button>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* Images Tab */}
                  <TabsContent className="space-y-4 pt-4" value="images">
                    <div className="space-y-2">
                      <Label htmlFor={`embed-${activeEmbedIndex}-image`}>
                        Image URL
                      </Label>
                      <input
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        id={`embed-${activeEmbedIndex}-image`}
                        onChange={(e) =>
                          updateEmbed(activeEmbedIndex, {
                            imageUrl: e.target.value || undefined,
                          })
                        }
                        placeholder="https://example.com/image.png"
                        type="url"
                        value={activeEmbed.imageUrl ?? ""}
                      />
                      <p className="text-muted-foreground text-xs">
                        Large image displayed at the bottom of the embed
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`embed-${activeEmbedIndex}-thumbnail`}>
                        Thumbnail URL
                      </Label>
                      <input
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        id={`embed-${activeEmbedIndex}-thumbnail`}
                        onChange={(e) =>
                          updateEmbed(activeEmbedIndex, {
                            thumbnailUrl: e.target.value || undefined,
                          })
                        }
                        placeholder="https://example.com/thumbnail.png"
                        type="url"
                        value={activeEmbed.thumbnailUrl ?? ""}
                      />
                      <p className="text-muted-foreground text-xs">
                        Small image displayed in the top right corner
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Preview Panel */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Live Preview</CardTitle>
              <CardDescription>
                How your message will appear in Discord
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MessagePreview content={content} embeds={embeds} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Discard Changes Dialog */}
      <Dialog onOpenChange={setShowDiscardDialog} open={showDiscardDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard changes?</DialogTitle>
            <DialogDescription>
              You have unsaved changes. Are you sure you want to discard them?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => setShowDiscardDialog(false)}
              variant="outline"
            >
              Keep editing
            </Button>
            <Button
              onClick={() => {
                setShowDiscardDialog(false);
                onCancel();
              }}
              variant="destructive"
            >
              Discard changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
