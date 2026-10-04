import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { banner } from "./css.js";

type FontFace = {
  readonly packageName: "@fontsource/inter" | "@fontsource/jetbrains-mono";
  readonly family: "Inter" | "JetBrains Mono";
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
    packageName: "@fontsource/inter",
    family: "Inter",
    style: "normal",
    weight: 400,
    localNames: ["Inter", "Inter Regular"],
    file: "inter-latin-400-normal.woff2",
    unicodeRange: LATIN1,
  },
  {
    packageName: "@fontsource/inter",
    family: "Inter",
    style: "normal",
    weight: 500,
    localNames: ["Inter Medium", "Inter-Medium"],
    file: "inter-latin-500-normal.woff2",
    unicodeRange: LATIN1,
  },
  {
    packageName: "@fontsource/inter",
    family: "Inter",
    style: "normal",
    weight: 600,
    localNames: ["Inter SemiBold", "Inter-SemiBold"],
    file: "inter-latin-600-normal.woff2",
    unicodeRange: LATIN1,
  },
  {
    packageName: "@fontsource/inter",
    family: "Inter",
    style: "normal",
    weight: 700,
    localNames: ["Inter Bold", "Inter-Bold"],
    file: "inter-latin-700-normal.woff2",
    unicodeRange: LATIN1,
  },
  {
    packageName: "@fontsource/inter",
    family: "Inter",
    style: "italic",
    weight: 400,
    localNames: ["Inter Italic", "Inter-Italic"],
    file: "inter-latin-400-italic.woff2",
    unicodeRange: LATIN1,
  },
  {
    packageName: "@fontsource/jetbrains-mono",
    family: "JetBrains Mono",
    style: "normal",
    weight: 400,
    localNames: ["JetBrains Mono", "JetBrainsMono-Regular"],
    file: "jetbrains-mono-latin-400-normal.woff2",
    unicodeRange: LATIN1,
  },
  {
    packageName: "@fontsource/jetbrains-mono",
    family: "JetBrains Mono",
    style: "normal",
    weight: 500,
    localNames: ["JetBrains Mono Medium", "JetBrainsMono-Medium"],
    file: "jetbrains-mono-latin-500-normal.woff2",
    unicodeRange: LATIN1,
  },
  {
    packageName: "@fontsource/jetbrains-mono",
    family: "JetBrains Mono",
    style: "normal",
    weight: 700,
    localNames: ["JetBrains Mono Bold", "JetBrainsMono-Bold"],
    file: "jetbrains-mono-latin-700-normal.woff2",
    unicodeRange: LATIN1,
  },
  {
    packageName: "@fontsource/jetbrains-mono",
    family: "JetBrains Mono",
    style: "italic",
    weight: 400,
    localNames: ["JetBrains Mono Italic", "JetBrainsMono-Italic"],
    file: "jetbrains-mono-latin-400-italic.woff2",
    unicodeRange: LATIN1,
  },
];

const licenses = [
  { packageName: "@fontsource/inter", file: "Inter-OFL.txt" },
  { packageName: "@fontsource/jetbrains-mono", file: "JetBrainsMono-OFL.txt" },
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

/**
 * Replace each relative font url() with a base64 data URI read from distDir,
 * so the specimen is one self-contained file (D34, D50).
 */
export const inlineFontUrls = (css: string, distDir: string): string =>
  css.replace(/url\("(fonts\/[^"]+\.woff2)"\)/g, (_match, file: string) => {
    const data = readFileSync(join(distDir, file)).toString("base64");
    return `url("data:font/woff2;base64,${data}")`;
  });
