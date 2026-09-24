import type { Token, TokenSet } from "./tokens.js";

export const banner = (version: string) => `/*! @manjunathhk/design-tokens v${version} */`;

const declarations = (tokens: Token[], indent: string) =>
  tokens.map((t) => `${indent}--${t.name}: ${t.value};`).join("\n");

/**
 * Light values on :root; dark values when the OS prefers dark unless the page
 * forces light, and whenever the page forces dark with data-theme="dark".
 */
export function tokensCss(set: TokenSet): string {
  const dark = declarations(set.modes.dark, "    ");
  return `${banner(set.version)}
:root {
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
