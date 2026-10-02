# @manjunathhk/design-tokens

One source of truth for the colour scheme and core visual foundations of
Manjunath's websites (Angular, WordPress, static HTML, .NET/Razor, on
different hosts). Change a token once, every site that consumes it picks it
up.

This package is tokens and a small opt-in base stylesheet, nothing else:

- design tokens for colour (light and dark), typography, spacing, radius,
  shadow, motion, layout, z-index and a breakpoint reference;
- `base.css`, a small opt-in base (reset, body, links, selection, focus ring,
  reduced motion) built only on the tokens;
- self-hosted IBM Plex fonts and `fonts.css`.

It is never a place for UI components (buttons, cards, nav — those are
framework-specific and live in each site), a utility-class framework,
CSS-in-JS, runtime JavaScript, or a palette switcher. See
[AGENTS.md](AGENTS.md) for the full contract; contributors and coding agents
read it first.

## Outputs

Each file in `dist/` has a subpath export (`@manjunathhk/design-tokens/<file>`).

| File           | Contents                                                                              |
| -------------- | ------------------------------------------------------------------------------------- |
| `index.css`    | Fonts, tokens and base in one file (the package `style` entry)                        |
| `tokens.css`   | `--mk-*` custom properties, light and dark                                            |
| `base.css`     | Opt-in reset and base styles, zero specificity, plus `.mk-grid-bg`                    |
| `fonts.css`    | Self-hosted IBM Plex Sans, Sans Condensed and Mono `@font-face` rules                 |
| `tokens.json`  | `{ version, light, dark, shared, breakpoints }`, flat, keyed by token path            |
| `tokens.mjs`   | The same five groups as typed constants (`tokens.d.ts`); also the package root import |
| `_tokens.scss` | `$mk-*: var(--mk-*)`, raw `$mk-breakpoint-*` values and `@include mk-media(md)`       |

Breakpoints are never CSS custom properties (they do not work in media
queries); they live under `breakpoints` in JSON and JS, and as raw values in
SCSS.

Every custom property is prefixed `--mk-` so it never collides with a host
theme (WordPress themes in particular).

## Light and dark

Semantic colour tokens are authored in two source files with the same keys,
`tokens/semantic/color.light.json` and `tokens/semantic/color.dark.json`; the
build fails, naming the token and the file, if one mode is missing a key a
token has in the other. The emitted CSS follows the OS by default and can be
forced:

```html
<html data-theme="dark">
  <!-- or data-theme="light" -->
</html>
```

With no `data-theme` attribute, the page follows `prefers-color-scheme`.
`color-scheme` is set to match on `:root` in both cases, so native form
controls and scrollbars also switch.

## Consumption

Prefer the CDN alias for sites without a build step; it always serves the
latest non-breaking release. Pin a version when you want to upgrade on your
own schedule.

### Plain `<link>`

```html
<!-- Alias: tracks the latest 1.x release -->
<link rel="stylesheet" href="https://design.manjunathhk.in/v1/index.css" />

<!-- Pinned: never changes -->
<link rel="stylesheet" href="https://design.manjunathhk.in/v1.0.0/index.css" />
```

Emergency fallback only, if `design.manjunathhk.in` itself is down — jsDelivr
mirrors the npm package automatically:

```html
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/@manjunathhk/design-tokens@1/dist/index.css"
/>
```

Do not use the jsDelivr URL as a site's default; it exists for the outage
case only.

### Angular

`angular.json`, in the project's `architect.build.options`:

```json
{
  "styles": ["node_modules/@manjunathhk/design-tokens/dist/index.css", "src/styles.scss"]
}
```

SCSS, via `@use` against the `_tokens.scss` subpath export:

```scss
@use "@manjunathhk/design-tokens/_tokens.scss" as mk;

.card {
  border-radius: mk.$mk-radius-md;
  padding: mk.$mk-spacing-6;

  @include mk.mk-media(md) {
    padding: mk.$mk-spacing-8;
  }
}
```

### WordPress

`functions.php`:

```php
function mk_design_tokens_enqueue() {
    wp_enqueue_style(
        'mk-design-tokens',
        'https://design.manjunathhk.in/v1/index.css',
        [],
        null
    );
}
add_action( 'wp_enqueue_scripts', 'mk_design_tokens_enqueue' );
```

### .NET Razor or Blazor

In the shared layout (`_Layout.cshtml` or `App.razor`), inside `<head>`:

```html
<link rel="stylesheet" href="https://design.manjunathhk.in/v1/index.css" />
```

### Docker / NGINX static site

Nothing special: the same `<link>` tag as above, since NGINX only serves the
site's own HTML and the stylesheet is fetched from the CDN at the client. If
the image instead bundles the package from npm, copy `dist/index.css` and
`dist/fonts/` into the image at build time and link the copied path.

## Resilience pattern

Bundle a pinned snapshot of `dist/index.css` (and `dist/fonts/`) into the
site's own static assets, and load the CDN link **after** it:

```html
<link rel="stylesheet" href="/assets/design-tokens/index.css" />
<link rel="stylesheet" href="https://design.manjunathhk.in/v1/index.css" />
```

Both stylesheets declare the same properties, so during normal operation the
CDN copy, loaded second, simply overrides the bundled one with whatever is
current. If the CDN request fails, the second `<link>` contributes nothing,
and the page keeps the bundled snapshot's styles instead of falling back to
unstyled content.

## Content Security Policy

```
style-src 'self' https://design.manjunathhk.in;
font-src 'self' https://design.manjunathhk.in;
```

Add `https://cdn.jsdelivr.net` to both directives only on a site that is
actively using the jsDelivr fallback above.

## Optional: shareable stylelint config

This package exports `@manjunathhk/design-tokens/stylelint` for consumer CSS.
Install `stylelint` in your own project, then extend this config:

```sh
npm install --save-dev stylelint
```

```json
{
  "extends": ["stylelint-config-standard", "@manjunathhk/design-tokens/stylelint"]
}
```

The shared rules reject:

- hex literals (`color-no-hex`);
- named colours (`color-named: "never"`);
- colour functions case-insensitively via `function-disallowed-list`:
  `rgb`, `rgba`, `hsl`, `hsla`, `hwb`, `lab`, `lch`, `oklab`, `oklch`,
  `color`, `color-mix`.

`color-mix()` is banned even with token arguments: derived colours belong in
tokens. `transparent`, `currentcolor` and system colours stay allowed.

## Versioning policy

Semantic versioning is what makes "change once, reflect everywhere" safe:

- removing or renaming an emitted token is **MAJOR** (the API-diff CI check
  enforces this);
- adding a token, or changing a value, is **MINOR** — value changes are
  minor on purpose, since that is what lets `@1` / `/v1/` consumers receive a
  palette change without asking for it;
- a build or doc fix is **PATCH**.

## How to change the palette

1. Edit `tokens/semantic/color.light.json` and
   `tokens/semantic/color.dark.json` (both files, same keys — see
   [Light and dark](#light-and-dark)). Never invent a colour
   value; it must come from the brief or from an approved PR description.
2. Run `npm run build` and open `docs/index.html` (generated, not committed)
   to preview swatches, contrast ratios and the type scale in both modes.
3. `npm test` must keep the contrast contract passing for every pair in both
   modes.
4. Open a PR; propose any new colour with its contrast ratios in the PR
   description for approval before merging.

## Release process

GitHub Flow: short-lived branches off `main`, merged by PR. A release is a
tag on a `main` commit, pushed by a human only — agents never push tags,
publish to npm, or upload to R2. The version bump and CHANGELOG entry land in
a "Release X.Y.Z" PR before tagging.

1. Push a pre-release tag first, `vX.Y.Z-rc.N`. It is built, tested,
   uploaded to the CDN under the pinned prefix `/vX.Y.Z-rc.N/`, verified over
   HTTPS, and published to npm under the `next` dist-tag
   (`npm install @manjunathhk/design-tokens@next`). It is never promoted to
   the CDN alias.
2. Once the pipeline is proven, push the final tag, `vX.Y.Z`. It repeats the
   above, then promotes the pinned files to the alias prefix `/vMAJOR/`,
   purges that alias from Cloudflare's cache, verifies it, publishes to npm
   under the default (`latest`) tag, and creates the GitHub Release.

Pinned CDN paths (`/vX.Y.Z/`) are immutable; only the alias (`/vMAJOR/`) is
ever rewritten. Rolling `/v1/` back to an earlier pinned version is one click
on the `promote` workflow, which accepts a final `X.Y.Z` version only:
pre-releases are rejected there because they are never promoted to the alias.

## Theme control

```html
<html data-theme="light">
  <!-- or data-theme="dark", or omit the attribute to follow the OS -->
</html>
```

## Migration map

From the portfolio's previous local variable names:

| Old variable                      | Token                                          |
| --------------------------------- | ---------------------------------------------- |
| `--paper`                         | `--mk-color-bg`                                |
| `--paper-2`                       | `--mk-color-bg-subtle`                         |
| `--card`                          | `--mk-color-surface`                           |
| `--ink`                           | `--mk-color-text`                              |
| `--ink-2`                         | `--mk-color-text-secondary`                    |
| `--mut`                           | `--mk-color-text-muted`                        |
| `--rule`                          | `--mk-color-border`                            |
| `--rule-2`                        | `--mk-color-border-strong`                     |
| `--grid`                          | `--mk-color-grid-line`                         |
| `--acc`                           | `--mk-color-accent`                            |
| `--on-acc`                        | `--mk-color-on-accent`                         |
| `--acc-soft`                      | `--mk-color-accent-subtle`                     |
| `--err`                           | `--mk-color-danger`                            |
| `--display` / `--sans` / `--mono` | `--mk-font-family-display` / `-sans` / `-mono` |
| `--gut`                           | `--mk-layout-gutter`                           |
| `--ease`                          | `--mk-motion-ease`                             |

`--mk-color-border-strong` keeps the old `--rule-2` role: a decorative
emphasised rule, not held to the 3:1 non-text contrast ratio. There is no old
variable for `--mk-color-border-control` — it is new in this package, for
control outlines (inputs, buttons) where 3:1 against `bg`, `bg-subtle` and
`surface` is required. Use `border-strong` for decoration, `border-control`
for anything a user interacts with.

### Portfolio adoption and consumer rollout

The package owns the tokens, the small shared base/reset, and the self-hosted
font declarations. Consumer applications keep their own site composition,
components, layout decisions, and any page-specific overrides. The migration
work is therefore a mapping and handoff exercise: replace duplicated
foundational variables and Google Fonts loading in each site while leaving the
site's structure and content in place.

Mapping from the old portfolio variables to the package's token roles:

| Portfolio variable                | Package role                                  |
| --------------------------------- | --------------------------------------------- |
| `--paper`, `--paper-2`            | page background / subtle section background   |
| `--card`                          | surface/card base                             |
| `--ink`, `--ink-2`, `--mut`       | text / secondary text / muted text            |
| `--rule`, `--rule-2`              | border / decorative emphasis border           |
| `--grid`                          | grid line                                     |
| `--acc`, `--on-acc`, `--acc-soft` | accent / on-accent / subtle accent background |
| `--err`                           | danger                                        |
| `--display`, `--sans`, `--mono`   | display / sans / mono font families           |
| `--gut`                           | layout gutter                                 |
| `--ease`                          | motion easing                                 |

Decorative-vs-accessible deviations remain intentional in the package:

- `--mk-color-border-strong` intentionally keeps the old decorative `--rule-2`
  role; it is not treated as a 3:1 accessible border token.
- `--mk-color-border-control` is the interactive/outlining token for controls
  and focusable UI; it is the one that meets the accessible 3:1 requirement for
  non-text UI against the work surfaces.
- `--mk-font-family-*` values remain a package-level contract; consumer CSS can
  still choose its own typography scale and local component styling around the
  shared foundations.

For consumer CSS, the exported stylelint config is the raw-colour guardrail. It
blocks hex values, named colours and the colour-function family in consumer
stylesheets so the design system remains the place where colour is defined and
component CSS stays token-driven.

### Consumer inventory and migration checklist

Known consumers as of this document:

- Portfolio: `https://manjunathhk.in` — adoption still required; duplicated
  foundational variables and Google Fonts usage must be removed while preserving
  the page structure and intended look.
- Social card app: `https://social-card.apps.manjunathhk.in` — adoption is
  required, but visual regression validation remains mandatory before the rollout
  is considered complete.
- All other apps/sites are not yet inventoried and are not marked complete.

For each additional consumer, use the same repeatable checklist before treating
adoption as done:

1. Inventory the site's current CSS variables, font imports, component spacing,
   and any raw colour declarations.
2. Map the old values to the package's `--mk-*` roles and identify any local
   composition that should remain consumer-owned.
3. Replace local foundational values and Google Fonts loading with the package's
   shared tokens and fonts, without changing the content structure.
4. Validate layout, cross-browser rendering, and any exported/rendered output in
   the real consumer environment.
5. Run a visual regression check for the specific page or card output affected,
   especially for generated images or exported assets.
6. Confirm the site still renders correctly when the CDN alias (`/v1/`) is used
   and pinning is not required for the default rollout path.

The package cannot claim a full multi-site unification from package tests alone;
consumer-specific migrations and visual checks remain the final gate for each
site.

## Development

Node 24 LTS (`.nvmrc`).

```sh
npm ci
npm run lint
npm run typecheck
npm run build
npm test
```

Linux and Windows are both supported contributor environments (D37). On
Windows, use Node 24 and Git for Windows. Line endings are pinned to LF by
`.gitattributes`, so no global Git configuration change is needed. Run
`npm run build` before `npm test`: the output tests read the generated `dist/`.
Browser tests need Chromium: `npx playwright install chromium`, then
`npm run test:e2e`.

### Required status checks

Branch protection on `main` requires a PR and these checks (squash merges are
allowed):

- `actionlint` — lints the workflow files;
- `ci` — install, lint, typecheck, build, test, API diff against the
  published package;
- `playwright` — the cross-origin consumption smoke test.
