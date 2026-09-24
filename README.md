# @manjunathhk/design-tokens

Design tokens and a small, opt-in base stylesheet shared by all of Manjunath's
websites. Tokens and base only, never UI components.

Work in progress: consumption, versioning and release docs land with 1.0.0.
Contributors and coding agents: read [AGENTS.md](AGENTS.md) first.

## Outputs

Each file in `dist/` has a subpath export (`@manjunathhk/design-tokens/<file>`).

| File           | Contents                                                                              |
| -------------- | ------------------------------------------------------------------------------------- |
| `index.css`    | Tokens and base in one file (the package `style` entry)                               |
| `tokens.css`   | `--mk-*` custom properties, light and dark                                            |
| `base.css`     | Opt-in reset and base styles, zero specificity, plus `.mk-grid-bg`                    |
| `tokens.json`  | `{ version, light, dark, shared, breakpoints }`, flat, keyed by token path            |
| `tokens.mjs`   | The same five groups as typed constants (`tokens.d.ts`); also the package root import |
| `_tokens.scss` | `$mk-*: var(--mk-*)`, raw `$mk-breakpoint-*` values and `@include mk-media(md)`       |

Breakpoints are never CSS custom properties (they do not work in media
queries); they live under `breakpoints` in JSON and JS, and as raw values in
SCSS.

## Development

Node 24 LTS (`.nvmrc`).

```sh
npm ci
npm run lint
npm run typecheck
npm test
```
