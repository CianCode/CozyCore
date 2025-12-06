/**
 * Pastel color utilities for Discord embeds
 */

export type PastelColor = {
  hex: string;
  decimal: number;
  name: string;
};

// Default fallback color
const DEFAULT_PASTEL: PastelColor = {
  hex: "#FFB3BA",
  decimal: 0xff_b3_ba,
  name: "Soft Pink",
};

// Curated pastel color palette for Discord embeds
export const PASTEL_COLORS: PastelColor[] = [
  DEFAULT_PASTEL,
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
  return PASTEL_COLORS[index] ?? DEFAULT_PASTEL;
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
  return PASTEL_COLORS[index % PASTEL_COLORS.length] ?? DEFAULT_PASTEL;
}

/**
 * Generate hash from seed string for color selection
 */
function generateHash(seed: string): number {
  let hash = 0;
  for (const char of seed) {
    const charCode = char.charCodeAt(0);
    hash = Math.imul(hash, 31) + charCode;
  }
  return Math.abs(hash);
}

/**
 * Generate a pastel color from a seed string (deterministic)
 */
export function getPastelColorFromSeed(seed: string): PastelColor {
  const hash = generateHash(seed);
  return PASTEL_COLORS[hash % PASTEL_COLORS.length] ?? DEFAULT_PASTEL;
}
