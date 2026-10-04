import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Representative roles against the approved portfolio mapping (D46, D47):
 * source values from the portfolio where they pass the contrast contract, and
 * the owner-approved accessibility deviations where they do not.
 */
type Groups = Record<"light" | "dark" | "shared", Record<string, string | number>>;
const tokens = JSON.parse(readFileSync("dist/tokens.json", "utf8")) as Groups;

const PORTFOLIO_SOURCE = {
  light: {
    "color.bg": "#F1F0E5",
    "color.bg-subtle": "#EBD6CB",
    "color.surface": "#FFFFFF",
    "color.text": "#56453F",
    "color.border": "#E4C7B8",
    "color.border-strong": "#BAAB92",
    "color.danger": "#A93226",
    "color.on-accent": "#F1F0E5",
  },
  dark: {
    "color.bg": "#2D2521",
    "color.bg-subtle": "#1F1A17",
    "color.surface": "#3C332E",
    "color.text": "#F1F0E5",
    "color.accent": "#C39E88",
    "color.text-secondary": "#BAAB92",
    "color.danger": "#EF9A9A",
  },
} as const;

// Light roles that the portfolio renders in lighter browns fail 4.5:1 or 3:1,
// so the owner approved #56453F for them (D47).
const APPROVED_DEVIATIONS = [
  "color.text-secondary",
  "color.text-muted",
  "color.accent",
  "color.border-control",
  "color.focus-ring",
  "color.success",
  "color.warning",
] as const;

describe("portfolio foundation mapping", () => {
  for (const mode of ["light", "dark"] as const) {
    for (const [key, value] of Object.entries(PORTFOLIO_SOURCE[mode])) {
      it(`${mode} ${key} is the portfolio value ${value}`, () => {
        expect(tokens[mode][key], `${mode} ${key}`).toBe(value);
      });
    }
  }

  for (const key of APPROVED_DEVIATIONS) {
    it(`light ${key} is the approved accessible deviation #56453F`, () => {
      expect(tokens.light[key], `light ${key}`).toBe("#56453F");
    });
  }

  it("serves Inter and JetBrains Mono through the font family tokens", () => {
    expect(String(tokens.shared["font.family.sans"])).toMatch(/^["']?Inter\b/);
    expect(String(tokens.shared["font.family.display"])).toMatch(/^["']?Inter\b/);
    expect(String(tokens.shared["font.family.mono"])).toMatch(/^["']?JetBrains Mono\b/);
  });
});
