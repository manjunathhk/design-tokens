# Project brief: @manjunathhk/design-tokens

This is the original brief for the 1.0.0 build, kept word for word (formatted as Markdown) so every
session and contributor works from the same source. Where it and
[decisions.md](decisions.md) disagree, decisions.md wins: it records what
was decided after the brief was written. [AGENTS.md](../AGENTS.md) is the
contract and overrides both.

---

You are implementing a new repository: @manjunathhk/design-tokens.

Read AGENTS.md first and follow it for the whole session. It is the contract;
CI enforces it. Where this prompt and AGENTS.md disagree, stop and ask.

## 1. Goal

One source of truth for the colour scheme and core visual foundations of all my
websites. The sites run on different stacks (Angular, WordPress, static HTML,
.NET/Razor) and different hosts (Azure Static Web Apps, Docker on a VPS, Azure
VMs). A token change must reach every site from one place, safely.

Delivery is two-channel:

- npm package @manjunathhk/design-tokens, for sites with a build step (pinned
  version, updated through PRs).
- My own CDN: a Cloudflare R2 bucket (mk-design-cdn) served through the
  custom domain design.manjunathhk.in, for sites that link a stylesheet:
  https://design.manjunathhk.in/v1/index.css (alias, follows the latest 1.x)
  https://design.manjunathhk.in/v1.0.0/index.css (pinned, never changes)
  Owning the URL means I can change what serves it later without touching
  any site.
- Emergency fallback only: jsDelivr serves the npm package automatically
  (https://cdn.jsdelivr.net/npm/@manjunathhk/design-tokens@1/dist/index.css).
  Document it; do not make it the default anywhere.

Semantic versioning is what keeps "change once, reflect everywhere" safe:
consumers on @1 get every non-breaking change automatically and never get a
breaking one.

## 2. Scope

In scope:

- Design tokens: colour (light and dark), typography, spacing, radius, shadow,
  motion, layout, z-index, and a breakpoint reference.
- base.css: a small, opt-in, opinionated base (reset, body, links, selection,
  focus ring, reduced motion) built only on the tokens.
- fonts.css plus self-hosted IBM Plex woff2 files.
- Contract tests (contrast, naming, snapshot) and a specimen page.

Out of scope (do not build, do not "prepare for"):

- UI components of any kind (buttons, cards, nav). Components are
  framework-specific and live in each site.
- Utility-class frameworks, CSS-in-JS, runtime JavaScript, palette switchers.
- Anything served from a domain other than design.manjunathhk.in, npm, and
  the documented jsDelivr fallback.
- Cloudflare account setup itself (bucket, domain, CORS, cache rules,
  tokens): I do that by hand from docs/cdn.md, which you write.

## 3. Architecture

Source format: W3C Design Tokens Community Group (DTCG) JSON ($value, $type,
$description), under tokens/.

Two tiers:

- tokens/primitive/\*.json: raw values (for example color.denim.600). Never
  emitted as CSS custom properties.
- tokens/semantic/\*.json: meaning (for example color.accent) that references
  primitives. Only the semantic tier is emitted, with references resolved to
  values. This makes "sites use meanings, never raw values" impossible to
  break by accident.

Light and dark: semantic colour tokens have a light and a dark value (use
separate files, tokens/semantic/color.light.json and color.dark.json, or
$extensions with a mode key; pick one approach, document it in the README, and
keep it consistent).

Build: Style Dictionary v4 on Node 24 LTS, TypeScript build config. Every
emitted CSS custom property is prefixed --mk- so it cannot collide with host
themes (WordPress themes in particular).

Theme selection in the emitted CSS, exactly this pattern:

```css
:root { light values; color-scheme: light; }
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { dark values; color-scheme: dark; }
}
:root[data-theme="dark"] { dark values; color-scheme: dark; }
```

A site can force a theme with data-theme on `<html>`; with no attribute it
follows the OS.

## 4. Token values (source these exactly; do not invent colours)

Palette D1 = Paper & Denim. Semantic colour tokens and values:

| Semantic token       | Light                           | Dark                  | Role                                       |
| -------------------- | ------------------------------- | --------------------- | ------------------------------------------ |
| color.bg             | #F2F0EB                         | #0F141B               | page background                            |
| color.bg-subtle      | #E8E5DE                         | #141A23               | alternate section background               |
| color.surface        | #FBFAF7                         | #18202B               | cards, panels, form fields                 |
| color.text           | #16202E                         | #E7EBF1               | primary text, headings                     |
| color.text-secondary | #3A4556                         | #B3BCC9               | body copy on subtle backgrounds            |
| color.text-muted     | #5C6576                         | #8792A2               | labels, captions, metadata                 |
| color.border         | #D8D4CB                         | #242D3A               | hairlines, dividers                        |
| color.border-strong  | #BFBAAF                         | #334052               | control outlines, emphasised rules         |
| color.grid-line      | rgba(22,32,46,.05)              | rgba(255,255,255,.04) | drafting-grid background                   |
| color.accent         | #2A5AA8                         | #8DB2F2               | links, highlights, primary actions         |
| color.on-accent      | #FFFFFF                         | #0B1422               | text or icons on accent fills              |
| color.accent-subtle  | accent at 13% alpha, both modes |                       | tinted backgrounds                         |
| color.danger         | #B42318                         | #FF8A7A               | errors                                     |
| color.success        | choose                          | choose                | must pass contrast; harmonise with palette |
| color.warning        | choose                          | choose                | must pass contrast; harmonise with palette |
| color.focus-ring     | = accent                        | = accent              | focus outline                              |

Create primitives for these (denim, sand/paper, navy/ink scales) with sensible
names, then point the semantic tokens at them. For success and warning, propose
values in the PR description with their contrast ratios; do not merge without
my approval of those two.

Typography:

- font.family.display: "IBM Plex Sans Condensed", "IBM Plex Sans", "Arial Narrow", sans-serif
- font.family.sans: "IBM Plex Sans", system-ui, -apple-system, "Segoe UI", sans-serif
- font.family.mono: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace
- font.size: xs 12px, sm 14px, base 17px, md 18px, lg 21px,
  xl clamp(28px, 3vw, 40px), 2xl clamp(34px, 4vw, 64px),
  3xl clamp(42px, 5.6vw, 98px), display clamp(50px, 8.1vw, 148px)
- font.weight: regular 400, medium 500, semibold 600, bold 700
- line-height: tight 0.9, snug 1.15, normal 1.5, relaxed 1.6
- letter-spacing: display -0.028em, heading -0.022em, normal 0, label 0.07em

Spacing (4px base): 1=4, 2=8, 3=12, 4=16, 5=20, 6=24, 8=32, 10=40, 12=48,
16=64, 20=80, 24=96, 32=128 (px).
Layout: gutter clamp(16px, 4vw, 56px); container-max 1440px; grid-size 56px.
Radius: sm 4px, md 6px, lg 12px, xl 16px, pill 999px.
Shadow: raised 0 16px 40px -20px rgba(0,0,0,.4) (and a dark-mode variant if
it reads poorly; justify it in the PR).
Motion: ease cubic-bezier(.2,.7,.1,1); duration fast 150ms, base 300ms,
slow 500ms, slower 900ms.
Z-index: nav 50, overlay 80, toast 90.
Breakpoints (reference only, emitted to JSON/TS/SCSS, NOT as CSS custom
properties because custom properties do not work inside media queries):
sm 560px, md 900px, lg 1000px, xl 1440px.

## 5. Outputs (dist/)

Every CSS and JSON output starts with a version banner, for example
`/*! @manjunathhk/design-tokens v1.4.2 */` (JSON: a "version" field), so the
release verification can prove which version a URL is serving.

- tokens.css: custom properties only, light and dark, no selectors beyond :root
- base.css: opt-in base built only from var(--mk-\*); includes
  prefers-reduced-motion handling and a :focus-visible ring;
  one opt-in helper class .mk-grid-bg for the drafting grid
- fonts.css: @font-face for IBM Plex Sans (400,500,600,italic 400),
  Plex Sans Condensed (500,600,700), Plex Mono (400,500);
  woff2 only, latin subset, font-display: swap,
  url() paths RELATIVE to fonts.css, so the same files work
  from any version folder on the CDN, from npm and from jsDelivr
- index.css: @import of fonts.css, tokens.css, base.css (one-link consumption)
- tokens.json: flat, resolved, both modes: `{ "light": {...}, "dark": {...}, "shared": {...} }`
- tokens.mjs + tokens.d.ts: typed constants for TS consumers
- \_tokens.scss: SCSS variables that point at the CSS custom properties
  ($mk-color-accent: var(--mk-color-accent)), plus breakpoint
  variables and a media-query mixin
- LICENSES/: OFL text for the fonts

package.json: "files": ["dist"], an "exports" map for every file above,
"style": "dist/index.css", "sideEffects": ["*.css"], "publishConfig":
{ "access": "public", "provenance": true }.

## 6. Tests (all must pass in CI)

1. Contrast contract: compute WCAG 2.x contrast for these pairs in BOTH modes
   and fail below the threshold:
   - 4.5:1 text, text-secondary, text-muted, accent, danger, success, warning
     against bg, bg-subtle and surface
   - 4.5:1 on-accent against accent
   - 3:1 border-strong and focus-ring against bg (non-text UI)

   Print a table of every pair and ratio in the CI log.

2. Naming contract: every emitted custom property matches
   `^--mk-[a-z0-9]+(-[a-z0-9]+)*$` ; no primitive tier names leak into CSS.
3. Snapshot of dist/tokens.css and tokens.json, so value changes are visible
   in review.
4. API diff: a script compares the set of emitted token names against the last
   published version on npm and fails if any name was removed or renamed
   unless package.json has a new MAJOR version.
5. Consumption smoke test: a Playwright test loads a fixture HTML page that
   links dist/index.css through a local static server on a DIFFERENT origin
   from the page (so cross-origin font loading is exercised), and asserts that
   computed styles resolve (for example body background equals color.bg) in
   light, dark (emulated prefers-color-scheme) and both data-theme overrides,
   and that document.fonts reports the IBM Plex faces as loaded.
6. Upload manifest test: the script that maps dist/ files to R2 object keys,
   Content-Type and Cache-Control (see section 8) is unit-tested: every file
   gets an explicit type (text/css, application/json, font/woff2,
   text/javascript, text/plain), and pinned and alias keys get the right
   cache headers.

## 7. Specimen page

Generate docs/index.html from the tokens at build time: swatches with hex and
contrast ratios for both modes, the type scale, spacing, radius and motion
samples, and copy-paste consumption snippets. Deploy it to GitHub Pages from
CI. This is how I review a palette change before releasing it.

## 8. CI/CD (GitHub Actions)

- ci.yml on every PR and push to main: install, lint, build, all tests, and
  upload dist/ as an artifact. No Cloudflare credentials in this workflow.
- release.yml on tag push matching v*.*.\*, in this order, stopping at the
  first failure:
  1. Verify the tag equals package.json version. Build and run all tests.
  2. Upload dist/ to R2 under the PINNED prefix /vX.Y.Z/ using the S3-compatible
     API (AWS CLI with the R2 endpoint, or wrangler), one explicit
     --content-type per file type (never rely on guessing; woff2 is often
     guessed wrong) and Cache-Control "public, max-age=31536000, immutable".
     Refuse to run if any object already exists under that prefix: pinned
     versions are immutable and are never overwritten or deleted.
  3. Verify the pinned URLs over https://design.manjunathhk.in: HTTP 200,
     correct Content-Type, the version banner matches the tag, and a font
     request sent with an Origin header returns Access-Control-Allow-Origin.
  4. Promote: copy the same files to the ALIAS prefix /vMAJOR/ with
     Cache-Control "public, max-age=300, s-maxage=3600". Pre-release tags
     (v1.5.0-rc.1) stop after step 3 and are never promoted.
  5. Purge the alias URLs from Cloudflare's cache by explicit URL list
     generated from dist/ (purge-by-URL works on every Cloudflare plan).
  6. Verify the alias URLs the same way as step 3.
  7. npm publish with provenance (NPM_TOKEN), then create the GitHub Release
     with the changelog section.

  Secrets used: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY (an R2
  token with Object Read & Write on mk-design-cdn only), CF_ZONE_ID,
  CF_API_TOKEN (Zone > Cache Purge on manjunathhk.in only), NPM_TOKEN.
  Never echo them; mask anything derived from them.

- promote.yml (workflow_dispatch, input: version) for rollback: re-runs
  steps 4 to 6 for an already-published pinned version, so rolling /v1/ back
  to v1.3.0 is one click.
- pages.yml publishes the specimen page to GitHub Pages. (Not on R2: an R2
  custom domain does not serve index.html for "/" without extra rules, and
  the specimen does not need the CDN.)
- Branch protection is mine to configure; document the required checks in the
  README.

docs/cdn.md must give me exact, click-by-click steps for what I set up by
hand in Cloudflare:

- Create the bucket mk-design-cdn (separate from any backup bucket; never
  store anything private in it) and connect the custom domain
  design.manjunathhk.in. Do NOT enable the r2.dev public URL.
- CORS policy, committed as docs/r2-cors.json: AllowedOrigins ["_"],
  AllowedMethods ["GET", "HEAD"], AllowedHeaders ["_"], MaxAgeSeconds 86400.
  Explain why "\*" (public assets, no credentials, and no per-origin cache
  variation to manage).
- A Cache Rule for design.manjunathhk.in that makes files eligible for cache
  and respects origin Cache-Control.
- The two scoped API tokens and where each secret goes.
- The rollback runbook (promote.yml) and the emergency fallback (switch a
  site's link to the jsDelivr URL).
- A note that an alias update briefly mixes versions across files while it
  propagates, why that is acceptable for tokens, and that a small Worker
  mapping /v1/ to the latest pinned version is the upgrade path if it ever
  matters.

## 9. README must include

- What this is and is not (tokens and base, never components).
- Consumption, each with a copy-paste snippet:
  1. Plain `<link>` from design.manjunathhk.in (/v1/ alias and pinned), plus
     the jsDelivr URL as the documented emergency fallback
  2. Angular: angular.json "styles" entry, and SCSS @use
  3. WordPress: wp_enqueue_style in functions.php
  4. .NET Razor or Blazor: `<link>` in the layout
  5. Docker/NGINX static site: nothing special, same `<link>`
- Resilience pattern: bundle a pinned snapshot of tokens.css locally and load
  the CDN link AFTER it, so a CDN outage degrades to the last snapshot rather
  than an unstyled page.
- CSP: the exact style-src and font-src entries to add
  (https://design.manjunathhk.in; add https://cdn.jsdelivr.net only on a
  site that is actively using the fallback).
- Versioning policy: remove or rename a token = MAJOR; add a token or change a
  value = MINOR; fix a build or doc issue = PATCH. Value changes are minor on
  purpose: that is what lets @1 consumers receive a palette change.
- How to change the palette: which file, how to preview on the specimen page,
  how to release.
- Theme control: data-theme="light" | "dark" on `<html>`.
- Migration map from my current portfolio variable names:
  --paper -> --mk-color-bg, --paper-2 -> --mk-color-bg-subtle,
  --card -> --mk-color-surface, --ink -> --mk-color-text,
  --ink-2 -> --mk-color-text-secondary, --mut -> --mk-color-text-muted,
  --rule -> --mk-color-border, --rule-2 -> --mk-color-border-strong,
  --grid -> --mk-color-grid-line, --acc -> --mk-color-accent,
  --on-acc -> --mk-color-on-accent, --acc-soft -> --mk-color-accent-subtle,
  --err -> --mk-color-danger, --display/--sans/--mono -> --mk-font-family-\*,
  --gut -> --mk-layout-gutter, --ease -> --mk-motion-ease.

## 10. Optional deliverable (only after everything above is green)

A shareable stylelint config exported as
@manjunathhk/design-tokens/stylelint that consumer sites can extend: it
rejects hex, rgb() and hsl() colour literals and named colours in consumer
CSS, so sites cannot drift away from the tokens.

## 11. How to work

- Start with a short plan: file tree, token file layout, the light/dark
  approach you chose and why. Wait for my OK before writing code.
- Then build in small PRs in this order: scaffold and CI, tokens and
  tokens.css, contract tests, other outputs, fonts, specimen page, release
  workflow, README.
- Do not publish to npm or upload to R2 yourself. I push every tag myself,
  starting with a pre-release to test the pipeline.
- When something in this brief is ambiguous or seems wrong, say so and
  propose an alternative instead of guessing.

## 12. Definition of done for 1.0.0

- All CI checks green; contrast table printed with every pair passing.
- Specimen page live on GitHub Pages.
- docs/cdn.md and docs/r2-cors.json complete, so I can do the Cloudflare
  setup in one sitting.
- Release workflow proven end to end with a pre-release tag (for example
  v1.0.0-rc.1): pinned upload, verification including the CORS header, and
  no promotion. I push that tag; you prepare everything for it.
- promote.yml present and documented.
- The cross-origin Playwright fixture renders correctly in light, dark and
  both data-theme overrides, with the fonts loaded.
- README complete per section 9.
- `npm pack --dry-run` shows only dist/, LICENSE, README and package.json.
