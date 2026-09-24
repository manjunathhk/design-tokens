import { beforeAll, describe, expect, it } from "vitest";
import { CONTRAST_PAIRS, measureContrast, type ContrastResult } from "../src/contrast.js";
import { loadTokens, MODES } from "../src/tokens.js";

describe("contrast contract", () => {
  let results: ContrastResult[];

  beforeAll(async () => {
    results = measureContrast(await loadTokens());
    const rows = results.map(
      (r) =>
        `${r.mode.padEnd(5)}  ${`color.${r.fg}`.padEnd(20)} ${r.fgValue}  on  ${`color.${r.bg}`.padEnd(15)} ${r.bgValue}  ${r.ratio.toFixed(2).padStart(5)} >= ${r.min}  ${r.ratio >= r.min ? "pass" : "FAIL"}`,
    );
    console.log(["Contrast contract (WCAG 2.x)", ...rows].join("\n"));
  });

  it("measures every pair in both modes", () => {
    expect(results).toHaveLength(CONTRAST_PAIRS.length * MODES.length);
  });

  for (const mode of MODES) {
    for (const { fg, bg, min } of CONTRAST_PAIRS) {
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
