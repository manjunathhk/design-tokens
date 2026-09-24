import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { banner } from "./css.js";

type FontFace = {
  readonly packageName: "@ibm/plex-sans" | "@ibm/plex-sans-condensed" | "@ibm/plex-mono";
  readonly family: "IBM Plex Sans" | "IBM Plex Sans Condensed" | "IBM Plex Mono";
  readonly style: "normal" | "italic";
  readonly weight: 400 | 500 | 600 | 700;
  readonly localNames: readonly [string, string];
  readonly file: string;
  readonly unicodeRange: string;
};

const SANS_LATIN1 =
  "U+0000, U+000D, U+0020-007E, U+00A0-00A3, U+00A4-00FF, U+0131, U+0152-0153, U+02C6, U+02DA, U+02DC, U+2013-2014, U+2018-201A, U+201C-201E, U+2020-2022, U+2026, U+2030, U+2039-203A, U+2044, U+2074, U+20AC, U+2122, U+2212, U+FB01-FB02";
const MONO_LATIN1 =
  "U+0020-007E, U+00A0-00FF, U+0131, U+0152-0153, U+02C6, U+02DA, U+02DC, U+2013-2014, U+2018-201A, U+201C-201E, U+2020-2022, U+2026, U+2030, U+2039-203A, U+2044, U+20AC, U+2122, U+2212, U+FB01-FB02";

const fontFaces: readonly FontFace[] = [
  {
    packageName: "@ibm/plex-sans",
    family: "IBM Plex Sans",
    style: "normal",
    weight: 400,
    localNames: ["IBM Plex Sans", "IBMPlexSans"],
    file: "IBMPlexSans-Regular-Latin1.woff2",
    unicodeRange: SANS_LATIN1,
  },
  {
    packageName: "@ibm/plex-sans",
    family: "IBM Plex Sans",
    style: "normal",
    weight: 500,
    localNames: ["IBM Plex Sans Medium", "IBMPlexSans-Medium"],
    file: "IBMPlexSans-Medium-Latin1.woff2",
    unicodeRange: SANS_LATIN1,
  },
  {
    packageName: "@ibm/plex-sans",
    family: "IBM Plex Sans",
    style: "normal",
    weight: 600,
    localNames: ["IBM Plex Sans SemiBold", "IBMPlexSans-SemiBold"],
    file: "IBMPlexSans-SemiBold-Latin1.woff2",
    unicodeRange: SANS_LATIN1,
  },
  {
    packageName: "@ibm/plex-sans",
    family: "IBM Plex Sans",
    style: "italic",
    weight: 400,
    localNames: ["IBM Plex Sans Italic", "IBMPlexSans-Italic"],
    file: "IBMPlexSans-Italic-Latin1.woff2",
    unicodeRange: SANS_LATIN1,
  },
  {
    packageName: "@ibm/plex-sans-condensed",
    family: "IBM Plex Sans Condensed",
    style: "normal",
    weight: 500,
    localNames: ["IBM Plex Sans Cond Medium", "IBMPlexSansCond-Medium"],
    file: "IBMPlexSansCondensed-Medium-Latin1.woff2",
    unicodeRange: SANS_LATIN1,
  },
  {
    packageName: "@ibm/plex-sans-condensed",
    family: "IBM Plex Sans Condensed",
    style: "normal",
    weight: 600,
    localNames: ["IBM Plex Sans Cond SemiBold", "IBMPlexSansCond-SemiBold"],
    file: "IBMPlexSansCondensed-SemiBold-Latin1.woff2",
    unicodeRange: SANS_LATIN1,
  },
  {
    packageName: "@ibm/plex-sans-condensed",
    family: "IBM Plex Sans Condensed",
    style: "normal",
    weight: 700,
    localNames: ["IBM Plex Sans Cond Bold", "IBMPlexSansCond-Bold"],
    file: "IBMPlexSansCondensed-Bold-Latin1.woff2",
    unicodeRange: SANS_LATIN1,
  },
  {
    packageName: "@ibm/plex-mono",
    family: "IBM Plex Mono",
    style: "normal",
    weight: 400,
    localNames: ["IBM Plex Mono", "IBMPlexMono"],
    file: "IBMPlexMono-Regular-Latin1.woff2",
    unicodeRange: MONO_LATIN1,
  },
  {
    packageName: "@ibm/plex-mono",
    family: "IBM Plex Mono",
    style: "normal",
    weight: 500,
    localNames: ["IBM Plex Mono Medium", "IBMPlexMono-Medium"],
    file: "IBMPlexMono-Medium-Latin1.woff2",
    unicodeRange: MONO_LATIN1,
  },
];

const licenses = [
  { packageName: "@ibm/plex-sans", file: "IBM-Plex-Sans-OFL-1.1.txt" },
  { packageName: "@ibm/plex-sans-condensed", file: "IBM-Plex-Sans-Condensed-OFL-1.1.txt" },
  { packageName: "@ibm/plex-mono", file: "IBM-Plex-Mono-OFL-1.1.txt" },
] as const;

const packagePath = (packageName: string, ...parts: string[]) =>
  join(process.cwd(), "node_modules", ...packageName.split("/"), ...parts);

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
    const source = requireFile(
      packagePath(face.packageName, "fonts", "split", "woff2", face.file),
      `Missing font asset ${face.file} in ${face.packageName}.`,
    );
    copyFileSync(source, join(fontsDir, face.file));
  }

  for (const license of licenses) {
    const source = requireFile(
      packagePath(license.packageName, "LICENSE.txt"),
      `Missing OFL licence for ${license.packageName}.`,
    );
    copyFileSync(source, join(licensesDir, license.file));
  }
}

export function fontsCss(version: string): string {
  const body = fontFaces
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
  return `${banner(version)}\n${body}\n`;
}
