import { beforeAll, describe, expect, it } from "vitest";
import { loadTokens, MODES, type Mode, type Token, type TokenSet } from "../src/tokens.js";

const BACKGROUNDS = ["bg", "bg-subtle", "surface"];
const TEXT = ["text", "text-secondary", "text-muted", "accent", "danger", "success", "warning"];
// D2: border-control, not border-strong, carries the 3:1 non-text rule.
const NON_TEXT = ["border-control", "focus-ring"];

interface Pair {
  fg: string;
  bg: string;
  min: number;
}

const PAIRS: Pair[] = [
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

interface Result extends Pair {
  mode: Mode;
  fgValue: string;
  bgValue: string;
  ratio: number;
}

function measure(set: TokenSet): Result[] {
  return MODES.flatMap((mode) =>
    PAIRS.map((pair) => {
      const fgValue = colour(set.modes[mode], pair.fg, mode);
      const bgValue = colour(set.modes[mode], pair.bg, mode);
      const a = luminance(fgValue, pair.fg, mode);
      const b = luminance(bgValue, pair.bg, mode);
      const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      return { ...pair, mode, fgValue, bgValue, ratio };
    }),
  );
}

describe("contrast contract", () => {
  let results: Result[];

  beforeAll(async () => {
    results = measure(await loadTokens());
    const rows = results.map(
      (r) =>
        `${r.mode.padEnd(5)}  ${`color.${r.fg}`.padEnd(20)} ${r.fgValue}  on  ${`color.${r.bg}`.padEnd(15)} ${r.bgValue}  ${r.ratio.toFixed(2).padStart(5)} >= ${r.min}  ${r.ratio >= r.min ? "pass" : "FAIL"}`,
    );
    console.log(["Contrast contract (WCAG 2.x)", ...rows].join("\n"));
  });

  it("measures every pair in both modes", () => {
    expect(results).toHaveLength(PAIRS.length * MODES.length);
  });

  for (const mode of MODES) {
    for (const { fg, bg, min } of PAIRS) {
      it(`${mode}: color.${fg} on color.${bg} >= ${min}:1`, () => {
        const r = results.find((x) => x.mode === mode && x.fg === fg && x.bg === bg);
        if (!r) return expect.fail(`No result for color.${fg} on color.${bg} in ${mode} mode.`);
        if (r.ratio < min) {
          expect.fail(
            `color.${fg} (${r.fgValue}) on color.${bg} (${r.bgValue}) in ${mode} mode is ${r.ratio.toFixed(2)}:1, below ${min}:1.`,
          );
        }
      });
    }
  }
});
