import { banner } from "./css.js";
import type { Token, TokenSet } from "./tokens.js";

const flat = (tokens: Token[]) => Object.fromEntries(tokens.map((t) => [t.path, t.value]));

/** Flat, resolved values keyed by token path. Breakpoints get their own key (D22). */
export const tokensData = (set: TokenSet) => ({
  version: set.version,
  light: flat(set.modes.light),
  dark: flat(set.modes.dark),
  shared: flat(set.shared),
  breakpoints: flat(set.breakpoints),
});

export const tokensJson = (set: TokenSet) => `${JSON.stringify(tokensData(set), null, 2)}\n`;

export function tokensMjs(set: TokenSet): string {
  const data = tokensData(set);
  const constant = (name: keyof typeof data) =>
    `export const ${name} = ${JSON.stringify(data[name], null, 2)};`;
  return `${banner(set.version)}
${constant("version")}
${constant("light")}
${constant("dark")}
${constant("shared")}
${constant("breakpoints")}
`;
}

const shape = (tokens: Token[]) =>
  `{\n${tokens.map((t) => `  readonly ${JSON.stringify(t.path)}: ${typeof t.value};`).join("\n")}\n}`;

export function tokensDts(set: TokenSet): string {
  return `${banner(set.version)}
/** Colour tokens; light and dark share these keys. */
export interface ColorTokens ${shape(set.modes.light)}
export interface SharedTokens ${shape(set.shared)}
export interface Breakpoints ${shape(set.breakpoints)}

export declare const version: string;
export declare const light: ColorTokens;
export declare const dark: ColorTokens;
export declare const shared: SharedTokens;
export declare const breakpoints: Breakpoints;
`;
}
