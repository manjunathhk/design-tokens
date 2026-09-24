import { readFileSync } from "node:fs";
import StyleDictionary from "style-dictionary";
import type { TransformedToken } from "style-dictionary/types";

export const MODES = ["light", "dark"] as const;
export type Mode = (typeof MODES)[number];

export interface Token {
  /** Dotted token path, e.g. "color.accent". */
  path: string;
  /** Emitted name without the leading dashes, e.g. "mk-color-accent". */
  name: string;
  value: string | number;
  type: string;
  description?: string;
}

export interface TokenSet {
  version: string;
  /** Mode-independent semantic tokens emitted as CSS custom properties. */
  shared: Token[];
  /** Semantic colours per mode, same paths in both. */
  modes: Record<Mode, Token[]>;
  /** Reference-only tokens, never emitted as CSS custom properties. */
  breakpoints: Token[];
}

const EXTENSION = "in.manjunathhk";
const SEMANTIC_DIR = "tokens/semantic/";
const BREAKPOINT_FILE = `${SEMANTIC_DIR}breakpoint.json`;
const modeFile = (mode: Mode) => `${SEMANTIC_DIR}color.${mode}.json`;

StyleDictionary.registerTransform({
  name: "mk/color/alpha",
  type: "value",
  transitive: true,
  filter: (token) => typeof token.$extensions?.[EXTENSION]?.alpha === "number",
  transform: (token) => {
    const alpha: number = token.$extensions[EXTENSION].alpha;
    const hex = String(token.$value);
    const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
    if (!match) {
      throw new Error(
        `Token ${token.path.join(".")}: alpha extension needs a 6-digit hex colour, got "${hex}".`,
      );
    }
    const [r, g, b] = match.slice(1).map((c) => parseInt(c, 16));
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  },
});

async function exportMode(mode: Mode): Promise<TransformedToken[]> {
  const sd = new StyleDictionary({
    usesDtcg: true,
    source: ["tokens/primitive/*.json", `${SEMANTIC_DIR}!(color.*).json`, modeFile(mode)],
    // v5 catches errors thrown by transforms; only "verbose" keeps the token,
    // file and our message in the error it throws (D21).
    log: { verbosity: "verbose", warnings: "error" },
    platforms: {
      css: {
        prefix: "mk",
        transforms: [
          "name/kebab",
          "fontFamily/css",
          "cubicBezier/css",
          "shadow/css/shorthand",
          "mk/color/alpha",
        ],
      },
    },
  });
  await sd.hasInitialized;
  return (await sd.getPlatformTokens("css")).allTokens;
}

function toToken(t: TransformedToken): Token {
  const token: Token = {
    path: t.path.join("."),
    name: t.name,
    value: t.$value as string | number,
    type: String(t.$type),
  };
  if (t.$description) token.description = t.$description;
  return token;
}

const byPath = (a: Token, b: Token) => a.path.localeCompare(b.path, "en", { numeric: true });

/** Throws, naming the token, its value and the file, if a mode lacks a token the other has. */
export function checkModeParity(modes: Record<Mode, Token[]>): void {
  for (const mode of MODES) {
    const other = mode === "light" ? "dark" : "light";
    const otherPaths = new Set(modes[other].map((t) => t.path));
    for (const t of modes[mode]) {
      if (!otherPaths.has(t.path)) {
        throw new Error(
          `Token ${t.path} has a ${mode} value (${t.value}) but no ${other} value in ${modeFile(other)}.`,
        );
      }
    }
  }
}

export async function loadTokens(): Promise<TokenSet> {
  const pkg = JSON.parse(readFileSync("package.json", "utf8")) as { version: string };
  const exported = { light: await exportMode("light"), dark: await exportMode("dark") };

  const semantic = (all: TransformedToken[]) =>
    all.filter((t) => t.filePath.startsWith(SEMANTIC_DIR));
  const lightSemantic = semantic(exported.light);

  const set: TokenSet = {
    version: pkg.version,
    shared: lightSemantic
      .filter((t) => t.filePath !== BREAKPOINT_FILE && t.filePath !== modeFile("light"))
      .map(toToken)
      .sort(byPath),
    modes: {
      light: lightSemantic
        .filter((t) => t.filePath === modeFile("light"))
        .map(toToken)
        .sort(byPath),
      dark: semantic(exported.dark)
        .filter((t) => t.filePath === modeFile("dark"))
        .map(toToken)
        .sort(byPath),
    },
    breakpoints: lightSemantic
      .filter((t) => t.filePath === BREAKPOINT_FILE)
      .map(toToken)
      .sort(byPath),
  };

  checkModeParity(set.modes);
  return set;
}
