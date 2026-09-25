import { readdirSync, readFileSync } from "node:fs";
import { basename } from "node:path";
import stylelint from "stylelint";
import { describe, expect, it } from "vitest";

const fixtureFiles = (kind: "pass" | "fail") =>
  readdirSync(`test/fixtures/stylelint/${kind}`)
    .filter((name) => name.endsWith(".css"))
    .map((name) => `test/fixtures/stylelint/${kind}/${name}`);

const lintFixture = async (file: string) =>
  stylelint.lint({
    code: readFileSync(file, "utf8"),
    codeFilename: file,
    configBasedir: process.cwd(),
    config: { extends: ["@manjunathhk/design-tokens/stylelint"] },
  });

const expectedRuleByFixture: Record<string, string> = {
  "hex.css": "color-no-hex",
  "hsl.css": "function-disallowed-list",
  "hsla.css": "function-disallowed-list",
  "named.css": "color-named",
  "rgb.css": "function-disallowed-list",
  "rgb-uppercase.css": "function-disallowed-list",
  "rgba.css": "function-disallowed-list",
  "color-mix.css": "function-disallowed-list",
  "var-fallback-hex.css": "color-no-hex",
};

describe("stylelint shareable config", () => {
  it("has expected-rule mappings for every fail fixture", () => {
    const failNames = fixtureFiles("fail").map((file) => basename(file));
    const mapped = Object.keys(expectedRuleByFixture);
    const missing = failNames.filter((name) => expectedRuleByFixture[name] === undefined);
    const stale = mapped.filter((name) => !failNames.includes(name));
    expect(missing, `Missing expected rule mapping for fixtures: ${missing.join(", ")}`).toEqual(
      [],
    );
    expect(stale, `Rule mappings with no fixture file: ${stale.join(", ")}`).toEqual([]);
  });

  it("passes all allowed fixtures", async () => {
    for (const file of fixtureFiles("pass")) {
      const result = await lintFixture(file);
      expect(result.errored, file).toBe(false);
    }
  });

  it("fails all disallowed fixtures", async () => {
    for (const file of fixtureFiles("fail")) {
      const result = await lintFixture(file);
      expect(result.errored, file).toBe(true);
      const warnings = result.results[0]?.warnings ?? [];
      const expectedRule = expectedRuleByFixture[basename(file)];
      expect(expectedRule, `missing expected rule mapping for ${file}`).toBeDefined();
      expect(
        warnings.some((warning) => warning.rule === expectedRule),
        `${file} did not report ${expectedRule}. Found: ${warnings.map((w) => w.rule).join(", ")}`,
      ).toBe(true);
    }
  });
});
