/**
 * Pastel color utilities for Discord embeds
 */

export type PastelColor = {
  hex: string;
  decimal: number;
  name: string;
};

// Curated pastel color palette for Discord embeds
export const PASTEL_COLORS: PastelColor[] = [
  { hex: "#FFB3BA", decimal: 0xff_b3_ba, name: "Soft Pink" },
  { hex: "#FFDFBA", decimal: 0xff_df_ba, name: "Peach" },
  { hex: "#FFFFBA", decimal: 0xff_ff_ba, name: "Soft Yellow" },
  { hex: "#BAFFC9", decimal: 0xba_ff_c9, name: "Mint Green" },
  { hex: "#BAE1FF", decimal: 0xba_e1_ff, name: "Baby Blue" },
  { hex: "#E0BBE4", decimal: 0xe0_bb_e4, name: "Lavender" },
  { hex: "#D4A5A5", decimal: 0xd4_a5_a5, name: "Dusty Rose" },
  { hex: "#A5D4D4", decimal: 0xa5_d4_d4, name: "Seafoam" },
  { hex: "#D4D4A5", decimal: 0xd4_d4_a5, name: "Sage" },
  { hex: "#C9B1FF", decimal: 0xc9_b1_ff, name: "Periwinkle" },
  { hex: "#FFB1E6", decimal: 0xff_b1_e6, name: "Bubblegum" },
  { hex: "#B1FFE0", decimal: 0xb1_ff_e0, name: "Aqua Mint" },
  { hex: "#FFC9B1", decimal: 0xff_c9_b1, name: "Coral" },
  { hex: "#B1D4FF", decimal: 0xb1_d4_ff, name: "Sky Blue" },
  { hex: "#E6B1FF", decimal: 0xe6_b1_ff, name: "Orchid" },
  { hex: "#B1FFB1", decimal: 0xb1_ff_b1, name: "Light Green" },
];

/**
 * Get a random pastel color
 */
export function getRandomPastelColor(): PastelColor {
  const index = Math.floor(Math.random() * PASTEL_COLORS.length);
  return PASTEL_COLORS[index];
}

/**
 * Get a random pastel color hex string
 */
export function getRandomPastelHex(): string {
  return getRandomPastelColor().hex;
}

/**
 * Get a random pastel color decimal (for Discord API)
 */
export function getRandomPastelDecimal(): number {
  return getRandomPastelColor().decimal;
}

/**
 * Get a pastel color by index (deterministic)
 */
export function getPastelColorByIndex(index: number): PastelColor {
  return PASTEL_COLORS[index % PASTEL_COLORS.length];
}

/**
 * Generate a pastel color from a seed string (deterministic)
 */
export function getPastelColorFromSeed(seed: string): PastelColor {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return PASTEL_COLORS[Math.abs(hash) % PASTEL_COLORS.length];
}

/**
 * Parse embed template variables
 */
export function parseEmbedTemplate(
  template: string,
  variables: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), value);
  }
  return result;
}

/**
 * Discord embed structure for type safety
 */
export type DiscordEmbed = {
  title?: string;
  description?: string;
  color?: number;
  author?: {
    name: string;
    icon_url?: string;
  };
  timestamp?: string;
  footer?: {
    text: string;
    icon_url?: string;
  };
  thumbnail?: {
    url: string;
  };
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
};

/**
 * Create a level up embed with pastel color
 */
export function createLevelUpEmbed(params: {
  userName: string;
  userAvatar?: string;
  newRole: string;
  oldRole?: string;
  title?: string;
  description?: string;
}): DiscordEmbed {
  const color = getRandomPastelColor();
  const description =
    params.description ?? "Félicitations à {user}, il a obtenu le rôle {role}!";

  const parsedDescription = parseEmbedTemplate(description, {
    user: `<@${params.userName}>`,
    role: `<@&${params.newRole}>`,
    oldRole: params.oldRole ? `<@&${params.oldRole}>` : "",
  });

  return {
    title: params.title ?? "🎉 Level Up!",
    description: parsedDescription,
    color: color.decimal,
    author: {
      name: params.userName,
      icon_url: params.userAvatar,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create a demotion embed with pastel color
 */
export function createDemotionEmbed(params: {
  userName: string;
  userAvatar?: string;
  newRole: string;
  oldRole: string;
  title?: string;
  description?: string;
}): DiscordEmbed {
  const color = getRandomPastelColor();
  const description =
    params.description ?? "{user} a été rétrogradé de {oldRole} à {newRole}!";

  const parsedDescription = parseEmbedTemplate(description, {
    user: `<@${params.userName}>`,
    newRole: `<@&${params.newRole}>`,
    oldRole: `<@&${params.oldRole}>`,
  });

  return {
    title: params.title ?? "⚠️ Role Change",
    description: parsedDescription,
    color: color.decimal,
    author: {
      name: params.userName,
      icon_url: params.userAvatar,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create a role loss embed with pastel color
 */
export function createRoleLossEmbed(params: {
  userName: string;
  userAvatar?: string;
  role: string;
  title?: string;
  description?: string;
}): DiscordEmbed {
  const color = getRandomPastelColor();
  const description = params.description ?? "{user} a perdu son rôle {role}!";

  const parsedDescription = parseEmbedTemplate(description, {
    user: `<@${params.userName}>`,
    role: `<@&${params.role}>`,
  });

  return {
    title: params.title ?? "📉 Role Removed",
    description: parsedDescription,
    color: color.decimal,
    author: {
      name: params.userName,
      icon_url: params.userAvatar,
    },
    timestamp: new Date().toISOString(),
  };
}
