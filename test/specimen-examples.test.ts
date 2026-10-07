import { existsSync, readdirSync, readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import {
  EXAMPLES_DIR,
  GROUPS,
  forceHtml,
  forceStates,
  loadExamples,
  usedProperties,
} from "../src/specimen-examples.js";

const groups = loadExamples();
const classesIn = (text: string, pattern: RegExp) =>
  [...text.matchAll(pattern)].map((match) => match[1] ?? "");

describe("token-in-use examples (D53)", () => {
  it("lists every file under src/examples and nothing else", () => {
    const listed = GROUPS.flatMap((group) => [
      `${group.id}/${group.id}.css`,
      ...group.examples.map((example) => `${group.id}/${example.id}.html`),
    ]).sort();
    const onDisk = readdirSync(EXAMPLES_DIR, { recursive: true, encoding: "utf8" })
      .map((file) => file.replaceAll("\\", "/"))
      .filter((file) => /\.(css|html)$/.test(file))
      .sort();
    expect(onDisk, "every example file must be listed in GROUPS").toEqual(listed);
  });

  describe("CSS", () => {
    let emitted = new Set<string>();

    beforeAll(() => {
      if (!existsSync("dist/tokens.css"))
        throw new Error("dist/tokens.css not found. Run npm run build first.");
      emitted = new Set(classesIn(readFileSync("dist/tokens.css", "utf8"), /(--mk-[a-z0-9-]+):/g));
    });

    it("reads only emitted --mk-* custom properties", () => {
      const unknown = groups.flatMap((group) =>
        usedProperties(group.css)
          .filter((name) => !emitted.has(name))
          .map(
            (name) =>
              `${EXAMPLES_DIR}/${group.id}/${group.id}.css uses ${name}, which dist/tokens.css does not emit`,
          ),
      );
      expect(unknown).toEqual([]);
    });

    it("defines every ex- class the example HTML uses", () => {
      const missing = groups.flatMap((group) =>
        group.examples.flatMap((example) => {
          const css = [
            group.css,
            ...example.needs.map((id) => groups.find((g) => g.id === id)?.css ?? ""),
          ].join("\n");
          const defined = new Set(classesIn(css, /\.(ex-[a-z0-9-]+)/g));
          const used = classesIn(example.html, /class="([^"]*)"/g).flatMap((list) =>
            list.split(/\s+/),
          );
          return used
            .filter((name) => name.startsWith("ex-") && !defined.has(name))
            .map(
              (name) =>
                `${EXAMPLES_DIR}/${group.id}/${example.id}.html uses .${name}, which no CSS it loads defines`,
            );
        }),
      );
      expect(missing).toEqual([]);
    });
  });

  it("never leaks an ex- class into dist/", () => {
    const leaks = readdirSync("dist", { recursive: true, encoding: "utf8" })
      .map((file) => file.replaceAll("\\", "/"))
      .filter((file) => /\.(css|scss|json|mjs|ts)$/.test(file))
      .filter((file) => /(?<![\w-])ex-[a-z]/.test(readFileSync(`dist/${file}`, "utf8")))
      .map((file) => `dist/${file} contains an ex- example class`);
    expect(leaks).toEqual([]);
  });
});

describe("forceStates", () => {
  it("adds a [data-force] twin for each forced pseudo-class", () => {
    expect(forceStates(".a:hover,\n.b {\n  color: red;\n}")).toBe(
      '.a:hover, .b, .a[data-force="hover"] {\n  color: red;\n}',
    );
    expect(forceStates(".a:focus-visible { x: y; }")).toBe(
      '.a:focus-visible, .a[data-force="focus-visible"] { x: y; }',
    );
  });

  it("keeps commas inside :where() and leaves at-rule preludes alone", () => {
    expect(forceStates("@media (x: y) {\n  :where(a, :active) { z: 1; }\n}")).toBe(
      '@media (x: y) {\n  :where(a, :active), :where(a, [data-force="active"]) { z: 1; }\n}',
    );
  });

  it("does not touch lookalike pseudo-classes and drops comments", () => {
    expect(forceStates("/* :hover */\n.a:focus-within { x: y; }")).toBe(
      "\n.a:focus-within { x: y; }",
    );
  });
});

describe("forceHtml", () => {
  it("marks interactive elements and keeps ids, labels and radio groups unique", () => {
    expect(
      forceHtml(
        '<label for="n">N</label><input id="n" name="g" aria-describedby="h e"><abbr>A</abbr>',
        "focus-visible",
      ),
    ).toBe(
      '<label for="n--focus-visible">N</label><input data-force="focus-visible" id="n--focus-visible" name="g--focus-visible" aria-describedby="h--focus-visible e--focus-visible"><abbr>A</abbr>',
    );
  });
});
