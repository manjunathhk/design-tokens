import type { Token, TokenSet } from "./tokens.js";

export const banner = (version: string) => `/*! @manjunathhk/design-tokens v${version} */`;

const declarations = (tokens: Token[], indent: string) =>
  tokens.map((t) => `${indent}--${t.name}: ${t.value};`).join("\n");

/**
 * Light values on :root; dark values when the OS prefers dark unless the page
 * forces light, and whenever the page forces dark with data-theme="dark".
 */
export function tokensCss(set: TokenSet): string {
  return `${banner(set.version)}\n${tokenRules(set)}`;
}

function tokenRules(set: TokenSet): string {
  const dark = declarations(set.modes.dark, "    ");
  return `:root {
${declarations([...set.modes.light, ...set.shared], "  ")}
  color-scheme: light;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
${dark}
    color-scheme: dark;
  }
}

:root[data-theme="dark"] {
${declarations(set.modes.dark, "  ")}
  color-scheme: dark;
}
`;
}

/** The hand-written base (src/base.css) with the banner. */
export const baseCss = (set: TokenSet, base: string) => `${banner(set.version)}\n${base}`;

/** Tokens then base in one file, no @import chain (D8). Fonts join when they land. */
export const indexCss = (set: TokenSet, base: string) =>
  `${banner(set.version)}\n${tokenRules(set)}\n${base}`;

/** $mk-* variables pointing at the custom properties, plus raw breakpoints and mk-media(). */
export function tokensScss(set: TokenSet): string {
  const vars = [...set.modes.light, ...set.shared]
    .sort((a, b) => a.name.localeCompare(b.name, "en", { numeric: true }))
    .map((t) => `$${t.name}: var(--${t.name});`);
  const bps = set.breakpoints.map((t) => `$${t.name}: ${t.value};`);
  const map = set.breakpoints.map((t) => `  "${t.path.split(".").at(-1)}": $${t.name},`);
  return `${banner(set.version)}
@use "sass:map";

${vars.join("\n")}

// Breakpoints hold raw values: custom properties do not work in media queries.
${bps.join("\n")}

$mk-breakpoints: (
${map.join("\n")}
);

@mixin mk-media($bp) {
  @if not map.has-key($mk-breakpoints, $bp) {
    @error 'mk-media: unknown breakpoint "#{$bp}"; use one of #{map.keys($mk-breakpoints)}.';
  }
  @media (min-width: map.get($mk-breakpoints, $bp)) {
    @content;
  }
}
`;
}
