"use client";

import type { DiscordChannel, DiscordRole } from "@cozycore/types";
import type { ReactElement } from "react";

type DiscordMarkdownPreviewProps = {
  content: string;
  channels?: DiscordChannel[];
  roles?: DiscordRole[];
  userName?: string;
};

// Convert Discord markdown to styled JSX
export function DiscordMarkdownPreview({
  content,
  channels = [],
  roles = [],
  userName = "NewUser",
}: DiscordMarkdownPreviewProps) {
  const renderContent = (text: string) => {
    // Replace placeholders first
    const processed = text
      .replace(/{user}/g, `<@${userName}>`)
      .replace(/{server}/g, "Server Name");

    // Process Discord-style formatting
    const parts: (string | ReactElement)[] = [];
    const remaining = processed;
    let keyIndex = 0;

    // Process the text character by character
    const elements: (string | ReactElement)[] = [];
    let currentText = "";
    let i = 0;

    while (i < remaining.length) {
      // User mentions: <@Username>
      if (remaining.slice(i).match(/^<@[^>]+>/)) {
        if (currentText) {
          elements.push(currentText);
          currentText = "";
        }
        const match = remaining.slice(i).match(/^<@([^>]+)>/);
        if (match) {
          elements.push(
            <span
              className="inline-flex items-center rounded bg-blue-500/20 px-1 text-blue-400"
              key={`user-${keyIndex++}`}
            >
              @{match[1]}
            </span>
          );
          i += match[0].length;
          continue;
        }
      }

      // Channel mentions: <#channel-id> or <#channel-name>
      if (remaining.slice(i).match(/^<#[^>]+>/)) {
        if (currentText) {
          elements.push(currentText);
          currentText = "";
        }
        const match = remaining.slice(i).match(/^<#([^>]+)>/);
        if (match) {
          const channelIdOrName = match[1];
          const channel = channels.find(
            (c) => c.id === channelIdOrName || c.name === channelIdOrName
          );
          const displayName = channel?.name || channelIdOrName;
          elements.push(
            <span
              className="inline-flex items-center rounded bg-zinc-500/20 px-1 text-zinc-300"
              key={`channel-${keyIndex++}`}
            >
              #{displayName}
            </span>
          );
          i += match[0].length;
          continue;
        }
      }

      // Role mentions: <@&role-id> or <@&role-name>
      if (remaining.slice(i).match(/^<@&[^>]+>/)) {
        if (currentText) {
          elements.push(currentText);
          currentText = "";
        }
        const match = remaining.slice(i).match(/^<@&([^>]+)>/);
        if (match) {
          const roleIdOrName = match[1];
          const role = roles.find(
            (r) => r.id === roleIdOrName || r.name === roleIdOrName
          );
          const displayName = role?.name || roleIdOrName;
          const roleColor = role?.color
            ? `#${role.color.toString(16).padStart(6, "0")}`
            : "#a855f7";
          elements.push(
            <span
              className="inline-flex items-center rounded px-1"
              key={`role-${keyIndex++}`}
              style={{
                backgroundColor: `${roleColor}20`,
                color: roleColor,
              }}
            >
              @{displayName}
            </span>
          );
          i += match[0].length;
          continue;
        }
      }

      // Bold: **text**
      if (remaining.slice(i).match(/^\*\*([^*]+)\*\*/)) {
        if (currentText) {
          elements.push(currentText);
          currentText = "";
        }
        const match = remaining.slice(i).match(/^\*\*([^*]+)\*\*/);
        if (match) {
          elements.push(
            <strong className="font-bold" key={`bold-${keyIndex++}`}>
              {match[1]}
            </strong>
          );
          i += match[0].length;
          continue;
        }
      }

      // Italic: *text* or _text_
      if (
        remaining.slice(i).match(/^\*([^*]+)\*/) &&
        !remaining.slice(i).startsWith("**")
      ) {
        if (currentText) {
          elements.push(currentText);
          currentText = "";
        }
        const match = remaining.slice(i).match(/^\*([^*]+)\*/);
        if (match) {
          elements.push(
            <em className="italic" key={`italic-${keyIndex++}`}>
              {match[1]}
            </em>
          );
          i += match[0].length;
          continue;
        }
      }

      if (remaining.slice(i).match(/^_([^_]+)_/)) {
        if (currentText) {
          elements.push(currentText);
          currentText = "";
        }
        const match = remaining.slice(i).match(/^_([^_]+)_/);
        if (match) {
          elements.push(
            <em className="italic" key={`italic-${keyIndex++}`}>
              {match[1]}
            </em>
          );
          i += match[0].length;
          continue;
        }
      }

      // Strikethrough: ~~text~~
      if (remaining.slice(i).match(/^~~([^~]+)~~/)) {
        if (currentText) {
          elements.push(currentText);
          currentText = "";
        }
        const match = remaining.slice(i).match(/^~~([^~]+)~~/);
        if (match) {
          elements.push(
            <span className="line-through" key={`strike-${keyIndex++}`}>
              {match[1]}
            </span>
          );
          i += match[0].length;
          continue;
        }
      }

      // Inline code: `code`
      if (remaining.slice(i).match(/^`([^`]+)`/)) {
        if (currentText) {
          elements.push(currentText);
          currentText = "";
        }
        const match = remaining.slice(i).match(/^`([^`]+)`/);
        if (match) {
          elements.push(
            <code
              className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-sm"
              key={`code-${keyIndex++}`}
            >
              {match[1]}
            </code>
          );
          i += match[0].length;
          continue;
        }
      }

      // Links: [text](url)
      if (remaining.slice(i).match(/^\[([^\]]+)\]\(([^)]+)\)/)) {
        if (currentText) {
          elements.push(currentText);
          currentText = "";
        }
        const match = remaining.slice(i).match(/^\[([^\]]+)\]\(([^)]+)\)/);
        if (match) {
          elements.push(
            <a
              className="text-blue-400 underline hover:text-blue-300"
              href={match[2]}
              key={`link-${keyIndex++}`}
              rel="noopener noreferrer"
              target="_blank"
            >
              {match[1]}
            </a>
          );
          i += match[0].length;
          continue;
        }
      }

      // Quote: > text (at start of line)
      if (
        (i === 0 || remaining[i - 1] === "\n") &&
        remaining.slice(i).startsWith("> ")
      ) {
        if (currentText) {
          elements.push(currentText);
          currentText = "";
        }
        const endOfLine = remaining.indexOf("\n", i);
        const quoteText =
          endOfLine === -1
            ? remaining.slice(i + 2)
            : remaining.slice(i + 2, endOfLine);
        elements.push(
          <span
            className="block border-zinc-500 border-l-4 pl-2 text-zinc-400"
            key={`quote-${keyIndex++}`}
          >
            {quoteText}
          </span>
        );
        i = endOfLine === -1 ? remaining.length : endOfLine + 1;
        continue;
      }

      // Newline
      if (remaining[i] === "\n") {
        if (currentText) {
          elements.push(currentText);
          currentText = "";
        }
        elements.push(<br key={`br-${keyIndex++}`} />);
        i++;
        continue;
      }

      currentText += remaining[i];
      i++;
    }

    if (currentText) {
      elements.push(currentText);
    }

    return elements;
  };

  return (
    <div className="whitespace-pre-wrap rounded-md bg-zinc-900/50 p-3 font-sans text-sm text-zinc-100">
      {renderContent(content)}
    </div>
  );
}

// Helper to get role color as hex string
export function getRoleColorHex(color: number): string {
  if (color === 0) return "#99aab5"; // Default Discord role color
  return `#${color.toString(16).padStart(6, "0")}`;
}
