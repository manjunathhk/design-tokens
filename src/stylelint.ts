import { banner } from "./css.js";

export const stylelintConfigMjs = (version: string) => `${banner(version)}
export default {
  rules: {
    "color-no-hex": true,
    "color-named": "never",
    "function-disallowed-list": ["rgb", "rgba", "hsl", "hsla", "hwb", "lab", "lch", "oklab", "oklch", "color", "color-mix"]
  }
};
`;

export const stylelintConfigDts = (version: string) => `${banner(version)}
import type { Config } from "stylelint";

declare const config: Config;
export default config;
`;
