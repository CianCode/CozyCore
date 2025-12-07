"use client";

import type { EmbedData } from "@cozycore/types";

type EmbedPreviewProps = {
  embed: EmbedData;
  className?: string;
};

type MessagePreviewProps = {
  content?: string | null;
  embeds: EmbedData[];
  className?: string;
};

// Parse Discord markdown for simple formatting
function parseDiscordMarkdown(text: string): React.ReactNode {
  const elements: (string | React.ReactElement)[] = [];
  let remaining = text;
  let keyIndex = 0;

  while (remaining.length > 0) {
    // Bold: **text**
    const boldMatch = remaining.match(/^\*\*(.+?)\*\*/);
    if (boldMatch) {
      elements.push(
        <strong className="font-bold" key={`bold-${keyIndex++}`}>
          {boldMatch[1]}
        </strong>
      );
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // Italic: *text* or _text_
    const italicMatch =
      remaining.match(/^\*([^*]+)\*/) || remaining.match(/^_([^_]+)_/);
    if (italicMatch && !remaining.startsWith("**")) {
      elements.push(
        <em className="italic" key={`italic-${keyIndex++}`}>
          {italicMatch[1]}
        </em>
      );
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // Strikethrough: ~~text~~
    const strikeMatch = remaining.match(/^~~(.+?)~~/);
    if (strikeMatch) {
      elements.push(
        <span className="line-through" key={`strike-${keyIndex++}`}>
          {strikeMatch[1]}
        </span>
      );
      remaining = remaining.slice(strikeMatch[0].length);
      continue;
    }

    // Inline code: `code`
    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      elements.push(
        <code
          className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-sm"
          key={`code-${keyIndex++}`}
        >
          {codeMatch[1]}
        </code>
      );
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    // Links: [text](url)
    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      elements.push(
        <a
          className="text-blue-400 underline hover:text-blue-300"
          href={linkMatch[2]}
          key={`link-${keyIndex++}`}
          rel="noopener noreferrer"
          target="_blank"
        >
          {linkMatch[1]}
        </a>
      );
      remaining = remaining.slice(linkMatch[0].length);
      continue;
    }

    // Newline
    if (remaining[0] === "\n") {
      elements.push(<br key={`br-${keyIndex++}`} />);
      remaining = remaining.slice(1);
      continue;
    }

    // Regular character
    const nextSpecial = remaining.slice(1).search(/\*\*|\*|_|~~|`|\[|\n/);
    if (nextSpecial === -1) {
      elements.push(remaining);
      break;
    }
    elements.push(remaining.slice(0, nextSpecial + 1));
    remaining = remaining.slice(nextSpecial + 1);
  }

  return elements;
}

// Validate URL
function isValidUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Single embed preview
export function EmbedPreview({ embed, className = "" }: EmbedPreviewProps) {
  const borderColor = embed.color || "#202225";

  return (
    <div
      className={`overflow-hidden rounded bg-[#2f3136] ${className}`}
      style={{ borderLeft: `4px solid ${borderColor}` }}
    >
      <div className="grid max-w-[516px] gap-2 p-4">
        {/* Author */}
        {embed.author?.name && (
          <div className="flex items-center gap-2">
            {isValidUrl(embed.author.iconUrl) && (
              <img
                alt=""
                className="h-6 w-6 rounded-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
                src={embed.author.iconUrl}
              />
            )}
            {embed.author.url && isValidUrl(embed.author.url) ? (
              <a
                className="text-sm text-white hover:underline"
                href={embed.author.url}
                rel="noopener noreferrer"
                target="_blank"
              >
                {embed.author.name}
              </a>
            ) : (
              <span className="text-sm text-white">{embed.author.name}</span>
            )}
          </div>
        )}

        {/* Title */}
        {embed.title && (
          <div className="font-semibold text-white">
            {embed.titleUrl && isValidUrl(embed.titleUrl) ? (
              <a
                className="text-[#00b0f4] hover:underline"
                href={embed.titleUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                {embed.title}
              </a>
            ) : (
              embed.title
            )}
          </div>
        )}

        {/* Description */}
        {embed.description && (
          <div className="whitespace-pre-wrap text-[#dcddde] text-sm">
            {parseDiscordMarkdown(embed.description)}
          </div>
        )}

        {/* Fields */}
        {embed.fields && embed.fields.length > 0 && (
          <div className="mt-2 grid gap-2">
            <div className="grid grid-cols-3 gap-2">
              {embed.fields.map((field, index) => (
                <div
                  className={field.inline ? "col-span-1" : "col-span-3"}
                  key={field.id || index}
                >
                  <div className="mb-0.5 font-semibold text-sm text-white">
                    {field.name}
                  </div>
                  <div className="whitespace-pre-wrap text-[#dcddde] text-sm">
                    {parseDiscordMarkdown(field.value)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Image */}
        {isValidUrl(embed.imageUrl) && (
          <div className="mt-2">
            <img
              alt=""
              className="max-h-[300px] max-w-full rounded object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
              src={embed.imageUrl}
            />
          </div>
        )}

        {/* Thumbnail - positioned absolutely in top right */}
        {isValidUrl(embed.thumbnailUrl) && (
          <div className="absolute top-4 right-4">
            <img
              alt=""
              className="max-h-20 max-w-20 rounded object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
              src={embed.thumbnailUrl}
            />
          </div>
        )}

        {/* Footer */}
        {(embed.footer?.text || embed.timestamp) && (
          <div className="mt-2 flex items-center gap-2 text-[#72767d] text-xs">
            {isValidUrl(embed.footer?.iconUrl) && (
              <img
                alt=""
                className="h-5 w-5 rounded-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
                src={embed.footer?.iconUrl}
              />
            )}
            {embed.footer?.text && <span>{embed.footer.text}</span>}
            {embed.footer?.text && embed.timestamp && <span>•</span>}
            {embed.timestamp && (
              <span>
                {new Date().toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Full message preview with content and multiple embeds
export function MessagePreview({
  content,
  embeds,
  className = "",
}: MessagePreviewProps) {
  return (
    <div className={`space-y-2 rounded-lg bg-[#36393f] p-4 ${className}`}>
      {/* Bot info */}
      <div className="flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#5865f2]">
          <span className="font-bold text-sm text-white">B</span>
        </div>
        <div>
          <div className="flex items-center gap-1">
            <span className="font-medium text-white">CozyCore</span>
            <span className="rounded bg-[#5865f2] px-1 py-0.5 font-medium text-[10px] text-white">
              BOT
            </span>
          </div>
          <span className="text-[#72767d] text-xs">Today at 12:00 PM</span>
        </div>
      </div>

      {/* Message content */}
      {content && (
        <div className="whitespace-pre-wrap pl-12 text-[#dcddde]">
          {parseDiscordMarkdown(content)}
        </div>
      )}

      {/* Embeds */}
      {embeds.length > 0 && (
        <div className="flex flex-col gap-1 pl-12">
          {embeds.map((embed, index) => (
            <EmbedPreview embed={embed} key={embed.id || index} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!content && embeds.length === 0 && (
        <div className="pl-12 text-[#72767d]">
          Your message preview will appear here...
        </div>
      )}
    </div>
  );
}

// Compact preview card for embed list
export function EmbedPreviewCard({
  embed,
  onClick,
}: {
  embed: EmbedData;
  onClick?: () => void;
}) {
  const borderColor = embed.color || "#5865f2";

  return (
    <button
      className="w-full rounded-md bg-[#2f3136] p-3 text-left transition-colors hover:bg-[#36393f]"
      onClick={onClick}
      style={{ borderLeft: `3px solid ${borderColor}` }}
      type="button"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {embed.title && (
            <div className="truncate font-medium text-sm text-white">
              {embed.title}
            </div>
          )}
          {embed.description && (
            <div className="mt-1 line-clamp-2 text-[#b9bbbe] text-xs">
              {embed.description}
            </div>
          )}
          {!(embed.title || embed.description) && (
            <div className="text-[#72767d] text-xs">Empty embed</div>
          )}
        </div>
        {isValidUrl(embed.thumbnailUrl) && (
          <img
            alt=""
            className="h-12 w-12 rounded object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
            src={embed.thumbnailUrl}
          />
        )}
      </div>
      {embed.fields && embed.fields.length > 0 && (
        <div className="mt-2 text-[#72767d] text-xs">
          {embed.fields.length} field{embed.fields.length !== 1 ? "s" : ""}
        </div>
      )}
    </button>
  );
}
