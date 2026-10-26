import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { banner } from "./css.js";

type FontFace = {
  readonly packageName:
    | "@fontsource/ibm-plex-sans-condensed"
    | "@fontsource/atkinson-hyperlegible-next"
    | "@fontsource/commit-mono";
  readonly family: "IBM Plex Sans Condensed" | "Atkinson Hyperlegible Next" | "Commit Mono";
  readonly style: "normal" | "italic";
  readonly weight: 400 | 500 | 600 | 700;
  readonly localNames: readonly [string, string];
  readonly file: string;
  readonly unicodeRange: string;
};

const LATIN1 =
  "U+0000, U+000D, U+0020-007E, U+00A0-00A3, U+00A4-00FF, U+0131, U+0152-0153, U+02C6, U+02DA, U+02DC, U+2013-2014, U+2018-201A, U+201C-201E, U+2020-2022, U+2026, U+2030, U+2039-203A, U+2044, U+2074, U+20AC, U+2122, U+2212, U+FB01-FB02";

const fontFaces: readonly FontFace[] = [
  {
    packageName: "@fontsource/ibm-plex-sans-condensed",
    family: "IBM Plex Sans Condensed",
    style: "normal",
    weight: 500,
    localNames: ["IBM Plex Sans Condensed Medium", "IBMPlexSansCond-Medium"],
    file: "ibm-plex-sans-condensed-latin-500-normal.woff2",
    unicodeRange: LATIN1,
  },
  {
    packageName: "@fontsource/ibm-plex-sans-condensed",
    family: "IBM Plex Sans Condensed",
    style: "normal",
    weight: 600,
    localNames: ["IBM Plex Sans Condensed SemiBold", "IBMPlexSansCond-SemiBold"],
    file: "ibm-plex-sans-condensed-latin-600-normal.woff2",
    unicodeRange: LATIN1,
  },
  {
    packageName: "@fontsource/ibm-plex-sans-condensed",
    family: "IBM Plex Sans Condensed",
    style: "normal",
    weight: 700,
    localNames: ["IBM Plex Sans Condensed Bold", "IBMPlexSansCond-Bold"],
    file: "ibm-plex-sans-condensed-latin-700-normal.woff2",
    unicodeRange: LATIN1,
  },
  {
    packageName: "@fontsource/atkinson-hyperlegible-next",
    family: "Atkinson Hyperlegible Next",
    style: "normal",
    weight: 400,
    localNames: ["Atkinson Hyperlegible Next", "AtkinsonHyperlegibleNext-Regular"],
    file: "atkinson-hyperlegible-next-latin-400-normal.woff2",
    unicodeRange: LATIN1,
  },
  {
    packageName: "@fontsource/atkinson-hyperlegible-next",
    family: "Atkinson Hyperlegible Next",
    style: "normal",
    weight: 500,
    localNames: ["Atkinson Hyperlegible Next Medium", "AtkinsonHyperlegibleNext-Medium"],
    file: "atkinson-hyperlegible-next-latin-500-normal.woff2",
    unicodeRange: LATIN1,
  },
  {
    packageName: "@fontsource/atkinson-hyperlegible-next",
    family: "Atkinson Hyperlegible Next",
    style: "normal",
    weight: 600,
    localNames: ["Atkinson Hyperlegible Next SemiBold", "AtkinsonHyperlegibleNext-SemiBold"],
    file: "atkinson-hyperlegible-next-latin-600-normal.woff2",
    unicodeRange: LATIN1,
  },
  {
    packageName: "@fontsource/atkinson-hyperlegible-next",
    family: "Atkinson Hyperlegible Next",
    style: "normal",
    weight: 700,
    localNames: ["Atkinson Hyperlegible Next Bold", "AtkinsonHyperlegibleNext-Bold"],
    file: "atkinson-hyperlegible-next-latin-700-normal.woff2",
    unicodeRange: LATIN1,
  },
  {
    packageName: "@fontsource/atkinson-hyperlegible-next",
    family: "Atkinson Hyperlegible Next",
    style: "italic",
    weight: 400,
    localNames: ["Atkinson Hyperlegible Next Italic", "AtkinsonHyperlegibleNext-Italic"],
    file: "atkinson-hyperlegible-next-latin-400-italic.woff2",
    unicodeRange: LATIN1,
  },
  {
    packageName: "@fontsource/commit-mono",
    family: "Commit Mono",
    style: "normal",
    weight: 400,
    localNames: ["Commit Mono", "CommitMono-Regular"],
    file: "commit-mono-latin-400-normal.woff2",
    unicodeRange: LATIN1,
  },
  {
    packageName: "@fontsource/commit-mono",
    family: "Commit Mono",
    style: "normal",
    weight: 500,
    localNames: ["Commit Mono Medium", "CommitMono-Medium"],
    file: "commit-mono-latin-500-normal.woff2",
    unicodeRange: LATIN1,
  },
  {
    packageName: "@fontsource/commit-mono",
    family: "Commit Mono",
    style: "normal",
    weight: 700,
    localNames: ["Commit Mono Bold", "CommitMono-Bold"],
    file: "commit-mono-latin-700-normal.woff2",
    unicodeRange: LATIN1,
  },
  {
    packageName: "@fontsource/commit-mono",
    family: "Commit Mono",
    style: "italic",
    weight: 400,
    localNames: ["Commit Mono Italic", "CommitMono-Italic"],
    file: "commit-mono-latin-400-italic.woff2",
    unicodeRange: LATIN1,
  },
];

const licenses = [
  { packageName: "@fontsource/ibm-plex-sans-condensed", file: "IBMPlexSansCondensed-OFL.txt" },
  {
    packageName: "@fontsource/atkinson-hyperlegible-next",
    file: "AtkinsonHyperlegibleNext-OFL.txt",
  },
  { packageName: "@fontsource/commit-mono", file: "CommitMono-OFL.txt" },
] as const;

const packagePath = (packageName: string, ...parts: string[]) =>
  join(process.cwd(), "node_modules", packageName, ...parts);

const requireFile = (path: string, message: string) => {
  if (!existsSync(path)) throw new Error(message);
  return path;
};

export function copyFontAssets(distDir: string): void {
  const fontsDir = join(distDir, "fonts");
  const licensesDir = join(distDir, "LICENSES");
  mkdirSync(fontsDir, { recursive: true });
  mkdirSync(licensesDir, { recursive: true });

  for (const face of fontFaces) {
    const source = packagePath(face.packageName, "files", face.file);
    copyFileSync(
      requireFile(source, `Missing font asset ${face.file} in ${face.packageName}: ${source}.`),
      join(fontsDir, face.file),
    );
  }

  for (const license of licenses) {
    const source = packagePath(license.packageName, "LICENSE");
    copyFileSync(
      requireFile(source, `Missing OFL licence for ${license.packageName}: ${source}.`),
      join(licensesDir, license.file),
    );
  }
}

export function fontRules(): string {
  return fontFaces
    .map(
      (face) => `@font-face {
  font-family: "${face.family}";
  font-style: ${face.style};
  font-weight: ${face.weight};
  font-display: swap;
  src: local("${face.localNames[0]}"), local("${face.localNames[1]}"), url("fonts/${face.file}") format("woff2");
  unicode-range: ${face.unicodeRange};
}`,
    )
    .join("\n\n");
}

export function fontOutput(version: string): { body: string; css: string } {
  const body = fontRules();
  return {
    body,
    css: `${banner(version)}\n${body}\n`,
  };
}
