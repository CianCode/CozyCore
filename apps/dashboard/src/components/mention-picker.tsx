"use client";

import type { DiscordChannel, DiscordRole } from "@cozycore/types";
import { AtSign, Hash, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type MentionPickerProps = {
  channels: DiscordChannel[];
  roles: DiscordRole[];
  onInsert: (mention: string) => void;
};

// Convert Discord color integer to hex string for display
function roleColorToHex(color: number): string {
  if (color === 0) return "#99aab5"; // Default gray for no color
  return `#${color.toString(16).padStart(6, "0")}`;
}

export function MentionPicker({
  channels,
  roles,
  onInsert,
}: MentionPickerProps) {
  // Filter out @everyone (position 0) and managed/bot roles
  const selectableRoles = roles
    .filter((r) => r.position > 0 && !r.managed)
    .sort((a, b) => b.position - a.position);

  // Text channels for mentions
  const textChannels = channels
    .filter((c) => c.type === 0)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  return (
    <div className="flex gap-1">
      {/* Channel Mention Picker */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className="h-8 w-8"
            size="icon"
            title="Insert channel mention"
            type="button"
            variant="outline"
          >
            <Hash className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="max-h-64 overflow-y-auto"
        >
          <DropdownMenuLabel>Channels</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {textChannels.length === 0 ? (
            <DropdownMenuItem disabled>No channels available</DropdownMenuItem>
          ) : (
            textChannels.map((channel) => (
              <DropdownMenuItem
                key={channel.id}
                onClick={() => onInsert(`<#${channel.id}>`)}
              >
                <Hash className="mr-2 h-4 w-4 text-muted-foreground" />
                {channel.name}
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Role Mention Picker */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className="h-8 w-8"
            size="icon"
            title="Insert role mention"
            type="button"
            variant="outline"
          >
            <Users className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="max-h-64 overflow-y-auto"
        >
          <DropdownMenuLabel>Roles</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {selectableRoles.length === 0 ? (
            <DropdownMenuItem disabled>No roles available</DropdownMenuItem>
          ) : (
            selectableRoles.map((role) => (
              <DropdownMenuItem
                key={role.id}
                onClick={() => onInsert(`<@&${role.id}>`)}
              >
                <span
                  className="mr-2 h-3 w-3 rounded-full"
                  style={{ backgroundColor: roleColorToHex(role.color) }}
                />
                {role.name}
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* User ID Mention - manual entry since we don't have member list */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className="h-8 w-8"
            size="icon"
            title="Insert user mention"
            type="button"
            variant="outline"
          >
            <AtSign className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel>User Mention</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <div className="p-2">
            <p className="mb-2 text-xs text-muted-foreground">
              Enter a user ID to mention them. Right-click a user in Discord and
              copy their ID.
            </p>
            <UserIdInput onInsert={onInsert} />
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// Separate component for user ID input to manage its own state
function UserIdInput({ onInsert }: { onInsert: (mention: string) => void }) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const userId = formData.get("userId") as string;
    if (userId?.match(/^\d{17,20}$/)) {
      onInsert(`<@${userId}>`);
      e.currentTarget.reset();
    }
  };

  return (
    <form className="flex gap-2" onSubmit={handleSubmit}>
      <input
        className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        name="userId"
        pattern="\d{17,20}"
        placeholder="User ID (e.g., 123456789012345678)"
        type="text"
      />
      <Button className="h-8" size="sm" type="submit" variant="secondary">
        Add
      </Button>
    </form>
  );
}
