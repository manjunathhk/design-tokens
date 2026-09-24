import { MODES, type Mode, type Token, type TokenSet } from "./tokens.js";

const BACKGROUNDS = ["bg", "bg-subtle", "surface"] as const;
const TEXT = [
  "text",
  "text-secondary",
  "text-muted",
  "accent",
  "danger",
  "success",
  "warning",
] as const;
// D2: border-control, not border-strong, carries the 3:1 non-text rule.
const NON_TEXT = ["border-control", "focus-ring"] as const;

export interface ContrastPair {
  fg: string;
  bg: string;
  min: number;
}

export const CONTRAST_PAIRS: ContrastPair[] = [
  ...TEXT.flatMap((fg) => BACKGROUNDS.map((bg) => ({ fg, bg, min: 4.5 }))),
  { fg: "on-accent", bg: "accent", min: 4.5 },
  ...NON_TEXT.flatMap((fg) => BACKGROUNDS.map((bg) => ({ fg, bg, min: 3 }))),
];

function luminance(hex: string, token: string, mode: Mode): number {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!match) {
    throw new Error(`color.${token} (${mode}) is "${hex}"; contrast needs a 6-digit hex colour.`);
  }
  const [r = 0, g = 0, b = 0] = match.slice(1).map((c) => {
    const s = parseInt(c, 16) / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function colour(tokens: Token[], name: string, mode: Mode): string {
  const token = tokens.find((t) => t.path === `color.${name}`);
  if (!token) throw new Error(`color.${name} is missing from the ${mode} token set.`);
  return String(token.value);
}

export interface ContrastResult extends ContrastPair {
  mode: Mode;
  fgValue: string;
  bgValue: string;
  ratio: number;
}

export function measureContrast(set: TokenSet): ContrastResult[] {
  return MODES.flatMap((mode) =>
    CONTRAST_PAIRS.map((pair) => {
      const fgValue = colour(set.modes[mode], pair.fg, mode);
      const bgValue = colour(set.modes[mode], pair.bg, mode);
      const a = luminance(fgValue, pair.fg, mode);
      const b = luminance(bgValue, pair.bg, mode);
      const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      return { ...pair, mode, fgValue, bgValue, ratio };
    }),
  );
}
