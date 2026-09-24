import { existsSync, readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { tokenNames } from "../scripts/api-diff.js";

const CSS_FILE = "dist/tokens.css";
const NAME = /^--mk-[a-z0-9]+(-[a-z0-9]+)*$/;

// Primitive group names (paper, ink, navy, ...) straight from the primitive tier,
// so a new primitive group is covered without editing this test.
const primitive = JSON.parse(readFileSync("tokens/primitive/color.json", "utf8")) as {
  color: Record<string, unknown>;
};
const PRIMITIVE_SEGMENTS = Object.keys(primitive.color).filter((k) => !k.startsWith("$"));

describe(`naming contract (${CSS_FILE})`, () => {
  let names: string[];

  beforeAll(() => {
    if (!existsSync(CSS_FILE)) throw new Error(`${CSS_FILE} not found. Run npm run build first.`);
    names = tokenNames(readFileSync(CSS_FILE, "utf8"));
  });

  it("emits custom properties", () => {
    expect(names.length).toBeGreaterThan(0);
  });

  it("every custom property is --mk- prefixed kebab-case", () => {
    const bad = names.filter((n) => !NAME.test(n));
    expect(bad, `Custom properties not matching ${NAME}: ${bad.join(", ")}`).toEqual([]);
  });

  it("no primitive name leaks into the CSS", () => {
    const leaks = names.flatMap((n) =>
      n
        .slice(2)
        .split("-")
        .filter((s) => PRIMITIVE_SEGMENTS.includes(s))
        .map((s) => `${n} (primitive "${s}")`),
    );
    expect(leaks, `Primitive names in ${CSS_FILE}: ${leaks.join(", ")}`).toEqual([]);
  });

  it("no breakpoint is emitted as a custom property", () => {
    const leaks = names.filter((n) => n.split("-").includes("breakpoint"));
    expect(leaks, `Breakpoints in ${CSS_FILE}: ${leaks.join(", ")}`).toEqual([]);
  });
});
