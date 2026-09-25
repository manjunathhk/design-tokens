# Decisions

Decisions taken after [brief.md](brief.md) was written. Where the brief and
this file disagree, this file wins. [AGENTS.md](../AGENTS.md) overrides both.

Every session reads this file before starting. A PR that makes a new
decision adds it here in the same PR. Never rewrite an entry: supersede it
with a new one and mark the old one "Superseded by D-n".

Format: what was decided, why, and where it applies.

---

## D1. Light and dark live in separate files

2026-09-24. `tokens/semantic/color.light.json` and `color.dark.json`, same
keys in both. Style Dictionary runs once per mode, so no custom mode
transform is needed; the build fails naming the token and file if one mode
lacks a token the other has; palette diffs stay one file per mode.

## D2. `color.border-control` added; `border-strong` stays decorative

2026-09-24. The brief's `border-strong` (#BFBAAF / #334052) measures 1.70 and
1.76 against bg, below the brief's own 3:1 rule. It keeps those values as a
decorative rule (WCAG 1.4.11 does not require 3:1 for decoration). The new
`color.border-control` (#87816F light, #5E6D83 dark, at least 3.09:1 on bg,
bg-subtle and surface) is for control outlines. The 3:1 contrast test
targets `border-control` and `focus-ring` against all three backgrounds.

## D3. Success and warning values approved

2026-09-24. Success #1F6B45 light / #86C99A dark; warning #8C5300 light /
#F0B860 dark. Lowest ratio against bg, bg-subtle and surface: 5.14, 8.46,
4.98, 9.16. Approved in PR #2.

## D4. Token naming

2026-09-24. Approved in PR #2. Line height and letter spacing sit under
`font` (`--mk-font-line-height-*`, `--mk-font-letter-spacing-*`); spacing is
`--mk-spacing-N`; z-index is `--mk-z-index-*`. These are public API from
1.0.0.

## D5. Non-colour tokens have no primitive tier

2026-09-24. Spacing, radius, type, motion and similar tokens hold raw values
in the semantic tier. The brief asks for colour primitives only; a second
layer for 4px steps adds nothing.

## D6. Colours with alpha are derived, not duplicated

2026-09-24. `accent-subtle` and `grid-line` reference a primitive and carry
`$extensions["in.manjunathhk"].alpha`; a build transform emits `rgba()`.
`accent-subtle` therefore follows `accent` automatically.

## D7. Shadow: one value for both modes, revisit on the specimen page

2026-09-24. `shadow.raised` is shared. Whether dark mode needs its own value
is judged visually on the specimen page. Adding a dark variant later is
MINOR.

## D8. `index.css` is concatenated, not `@import`

2026-09-24. Supersedes brief section 5 on index.css. It contains fonts,
tokens and base in one file: one request instead of an `@import` chain of
four, and a smaller window for mixed versions during an alias update. Font
`url()` paths stay valid because index.css sits next to fonts.css.
fonts.css, tokens.css and base.css still ship as separate files.

## D9. Release candidates go to npm under the `next` dist-tag

2026-09-24. Supersedes brief section 8 step 7 for pre-releases. rc tags are
published to npm with `--tag next` so the npm and provenance leg is proven
before 1.0.0. They are still never promoted to the CDN alias.

## D10. npm trusted publishing (OIDC) instead of `NPM_TOKEN`

2026-09-24. Supersedes the `NPM_TOKEN` secret in brief section 8. The
release workflow authenticates to npm with GitHub OIDC; there is no
long-lived npm token. Provenance is automatic. Requires this repository to
be public and the package's trusted publisher configured on npmjs.com (a
human step, documented in docs/cdn.md or the README).

## D11. Licence: MIT

2026-09-24. The package's own code is MIT. IBM Plex fonts stay under the
SIL OFL 1.1, shipped in `dist/LICENSES/`.

## D12. Style Dictionary pinned to 4.4

Superseded by D21.

2026-09-24. The brief specifies v4. `npm audit` reports GHSA-vj5c-m527-mpff
(prototype pollution in `convertTokenData`, `>=4.3.0 <5.4.4`, no 4.x fix).
Accepted: it runs only at build time over committed token files, we do not
call that function, and nothing untrusted is parsed. Revisit when moving to
v5.

## D13. TypeScript pinned to 6.0

2026-09-24. TypeScript 7 is current, but typescript-eslint 8 supports only
`<6.1`. Move when typescript-eslint supports 7.

## D14. GitHub Flow, releases are tags on `main`

2026-09-24. `main` is the only long-lived branch. Work happens on
short-lived branches (Claude sessions use `claude/*`), merged by PR into
`main`; squash merges are fine. A release is a human-pushed tag on a `main`
commit: `vX.Y.Z-rc.N` first, then `vX.Y.Z`. The version bump and CHANGELOG
entry land in a "Release X.Y.Z" PR before tagging. A fix for an older major
after a new one ships goes on a `vN.x` branch cut from the last `vN` tag,
created only when needed. GitFlow was considered and rejected: one
maintainer, tag-gated releases and immutable pinned CDN versions leave
nothing for `develop` and `release/*` to protect, and its back-merges break
under squash merges.

## D15. Specimen page deploys on release tags

2026-09-24. pages.yml publishes the specimen on final release tags only, so
the public page always matches a released version. Every PR uploads the
built specimen as a CI artifact for previewing an unreleased change.

## D16. One GitHub issue per unit of work, one conversation per issue

2026-09-24. Each issue body stands alone (scope, acceptance criteria,
references to the brief and to these decisions). Its PR closes it. The
1.0.0 work is tracked in #3 to #11.

## D17. Release automation (release-please or similar): open

Superseded by D18.

2026-09-24. Under discussion. Until decided, versions are bumped by hand in
the release PR and a human pushes the tag. Tracked in #12.

## D18. No release automation for 1.0.0; Changesets preferred later

2026-09-24. Supersedes D17. Versions and CHANGELOG entries are bumped by
hand in a "Release X.Y.Z" PR and a human pushes the tag. release-please was
rejected: the bot creates the tag (against AGENTS.md), tags made with
`GITHUB_TOKEN` do not trigger release.yml, it publishes the GitHub Release
before the CDN is verified, rc-to-final needs config edits, and inferring
bumps from commit types does not enforce "value change = MINOR". If
automation is wanted after 1.0.0, evaluate Changesets: each PR declares its
bump explicitly, CI can enforce it, and a human still pushes the tag.

## D19. Agent workflow files are in scope as contributor tooling

2026-09-24. `docs/workflow/implement-issue.md` holds the tool-agnostic
procedure for implementing an issue. AGENTS.md points every agent at it, and
`.claude/skills/implement/SKILL.md` is a thin Claude Code wrapper that makes
it `/implement <n>`. These guide contributors; they are not shipped and do
not widen the package's scope. Keep the procedure in the workflow file only,
so it never drifts between tools.

## D20. Contract test details

2026-09-24. Issue #4. The API diff runs as its own CI step
(`npm run api-diff`), not inside `npm test`, because it needs the npm
registry; its comparison logic is unit-tested in `npm test`. It compares
against the `latest` dist-tag, so `next` pre-releases (D9) are never the
baseline. The naming test derives primitive names from
`tokens/primitive/color.json` rather than a hard-coded list. The
`dist/tokens.css` snapshot includes the version banner, so the release PR
updates it along with the version.

## D21. Style Dictionary 5

2026-09-24. Supersedes D12 and brief section 3's "Style Dictionary v4".
Issue #20. `style-dictionary` is `^5.5.5`, which fixes GHSA-vj5c-m527-mpff
(fixed in 5.4.4); `npm audit` is clean. The v4 API we use is unchanged in
v5 and `dist/tokens.css` is byte-identical. One behaviour change needed
handling: v5 catches errors thrown by transforms and, unless
`log.verbosity` is `"verbose"`, replaces them with a generic count. The
build now runs verbose so a failing D6 alpha transform still names the
token, its file (and so its mode) and the bad value. `warnings: "error"`
still makes any warning fatal, so verbose adds no output to a clean build.

## D22. Shape of the JS and JSON outputs

2026-09-24. Issue #5. `tokens.json` is
`{ version, light, dark, shared, breakpoints }`, each group flat and keyed
by dotted token path (`"color.accent"`, `"breakpoint.md"`). Breakpoints get
their own `breakpoints` key rather than sitting in `shared`, so `shared`
plus one mode is exactly what `tokens.css` emits. `tokens.mjs` exports the
same five constants; `tokens.d.ts` types values as `string` or `number`,
not literals, so a value change (MINOR) never changes a type. The package
root (`.`) resolves to `tokens.mjs` with a `types` condition and to
`index.css` under the `style` condition; every file also has its own
subpath export. The JS output is ESM only (Node 24 can `require()` it);
its types resolve under `moduleResolution` `node16`, `nodenext` or
`bundler`, not legacy `node10`. Flat keys were chosen over nested objects
because they map 1:1 to the CSS names; changing the shape after 1.0.0 is
MAJOR. The API diff guards only CSS names today; covering the JSON keys,
breakpoints included, is #24.

## D23. base.css selectors use `:where()`

2026-09-24. Issue #5. Every base.css selector except `::selection` (a
pseudo-element cannot sit in `:where()`) and `.mk-grid-bg` is wrapped in
`:where()`, so the base has zero specificity and any site rule wins without
`!important`. stylelint bans hex, named colours and colour functions in
`src/base.css`; the `transparent` keyword is allowed, for the grid's
gradient stops.

## D24. Output checks live in `npm test`

2026-09-24. Issue #5. The exports, banner, SCSS and `npm pack --dry-run`
checks run in Vitest (`test/outputs.test.ts`), so CI runs them in its test
step and a contributor runs them locally with `npm test`. `sass` is a dev
dependency only to compile `_tokens.scss` in that test.

## D25. IBM Telemetry disabled in CI

2026-09-24. Issue #6. The `@ibm/plex-sans`, `@ibm/plex-sans-condensed` and
`@ibm/plex-mono` devDependencies each run
`postinstall: ibmtelemetry --config=telemetry.yml`. By its own docs this
activates specifically in CI/container environments and reports anonymised
usage data to an IBM endpoint. `ci.yml` sets `IBM_TELEMETRY_DISABLED: "true"`
at the job level so `npm ci` never makes that call; these packages ship no
runtime code either way, so nothing else about the build changes. Anyone
installing inside a local container should export the same variable.

## D26. Cross-origin Playwright smoke test

2026-09-24. Issue #7. Two `node:http` servers start inside `test.beforeAll`:
port 7341 serves the fixture page (`test/e2e/fixture/index.html`), port 7342
serves `dist/` with `Access-Control-Allow-Origin: *` (mirroring R2's CORS
policy), and port 7343 serves `dist/` without CORS headers (used only in the
negative check). `<link rel="stylesheet">` carries no `crossorigin` attribute
because CSS is fetched as no-cors and applied regardless; CORS headers are
required only for fonts, which browsers always fetch in CORS mode when the
font origin differs from the page origin. `document.fonts.load()` is used
instead of DOM injection to force all three IBM Plex families to load, because
the browser otherwise lazy-loads only families used by visible text. The
negative CORS check uses `Promise.allSettled` so an unexpected rejection does
not hang the test. The Playwright job in CI runs separately from the vitest
job; it uses `npm run test:e2e` (`playwright test`) and installs the Chromium
browser with `--with-deps`.

## D27. Specimen generation and shadow review

2026-09-24. Issue #8. `docs/index.html` is generated at build time from the
token set and never committed; CI uploads that HTML as a PR artifact for
review, and `pages.yml` deploys it only for final release tags (`vX.Y.Z`,
never rc). The specimen includes a minimal `data-theme` toggle for review only
(not shipped runtime JS). Visual review of `shadow.raised` in dark mode keeps
the shared value from D7 for now; if a dark variant is needed later, that stays
a MINOR token addition.

## D28. Release procedure consolidated in docs/workflow/release.md

2026-09-25. The release checklist was scattered across cdn.md's flow summary,
decisions.md (D9, D14, D15, D18) and the release.yml/promote.yml mechanics.
`docs/workflow/release.md` consolidates it into one step-by-step procedure,
mirroring `implement-issue.md`'s format (D19); AGENTS.md points to it.
Written while first provisioning the R2 bucket by hand, which also surfaced
that Cloudflare's dashboard had moved since docs/cdn.md was written: bucket
public access is two separate toggles (Bucket Access vs Custom Domains) not
one, CORS is a form not a raw JSON paste, and Cache Rules moved from Rules to
Caching in the sidebar with Edge/Browser TTL now left unset rather than
explicitly set to respect the origin. docs/cdn.md §1-3 updated to match.

## D29. Release PR flow is two PRs, not one: refines D14

2026-09-25. `release.yml` requires the pushed tag (minus its `v`) to
exactly equal `package.json`'s `version` string. One PR can't cover both
tags: the rc tag needs `package.json` at `X.Y.Z-rc.N`, the final tag needs
it at plain `X.Y.Z`. In practice that is two PRs — a "Release X.Y.Z" PR
that bumps to the rc version and writes the CHANGELOG entry, then, once
the rc is validated, a small "Finalize X.Y.Z" PR that drops the `-rc.N`
suffix before the final tag. D14's "the version bump and CHANGELOG entry
land in a Release X.Y.Z PR" undersold this; it still holds for the rc PR,
just not as the whole story. Surfaced by a Copilot review comment on PR
#32; `docs/workflow/release.md` documents the corrected two-PR flow.

## D30. `/release` automation boundary: refines D18

2026-09-25. `/release` (`.claude/skills/release/SKILL.md`,
`docs/workflow/release.md`) automates the release procedure up to, but
never across, the boundary AGENTS.md already draws:

- Given a target version, it checks the requested bump against the diff
  since the last tag using AGENTS.md's rules (MAJOR: removed/renamed
  emitted token; MINOR: added token or changed value; PATCH: build/doc
  fix) before using it. On a mismatch it stops, says why, and proposes the
  version the diff calls for, rather than silently overriding the human or
  silently proceeding with a bump it believes is wrong. With no prior tag
  (this repo's first release, currently `0.0.0`) there is nothing to diff,
  so it skips this check and takes the given version as-is rather than
  guessing at `1.0.0` vs. a `0.x` pre-release; it also writes the
  CHANGELOG's first entry as a plain "Initial release" heading instead of
  drafting one from every PR ever merged. This mirrors `api-diff.ts`'s own
  pre-publish behavior (D20): it already no-ops when the package isn't on
  npm yet or has no `latest` dist-tag.
- It drafts the Release PR (rc bump, CHANGELOG section drafted from PRs
  merged since the last tag, snapshot refresh) and the Finalize PR (D29's
  two-PR flow). Both are reviewed and merged like any other PR — nothing
  lands unattended.
- It runs rc and final validation (pull npm `next`/`latest`, hit
  pinned/alias CDN URLs, check banner/content-type/font-CORS) as read-only
  checks that touch no credential.
- It can dispatch `promote.yml`'s `workflow_dispatch` for rollback: the
  workflow authenticates with its own repository secrets exactly as it
  does when a human clicks the button in the Actions UI, so this doesn't
  put an R2 or Cloudflare credential in an agent's hands.

Unchanged from AGENTS.md and D18, and not reopened by this decision:
pushing the rc or final tag, running `npm publish` directly, and any
direct handling of an R2 or Cloudflare credential. Tag-pushing specifically
can't move to an agent even if it were allowed to: a tag created with an
agent's default `GITHUB_TOKEN` does not trigger `release.yml` — GitHub
suppresses a workflow run triggered by another workflow's default token —
so moving it would need a PAT or app-token workaround that reintroduces the
exact credential-handling problem AGENTS.md avoids. D18's other objections
to release-please don't apply here either: the GitHub Release is still
created after CDN verification (ordering is unchanged from the human
procedure), and the bump is checked against the emitted-token contract in
AGENTS.md, never inferred from commit history.

## D31. R2's `list-objects-v2` omits `KeyCount` on an empty prefix

2026-09-25. `release.yml`'s pinned-prefix guard queried
`--query 'KeyCount' --output text` and refused to upload even against a
genuinely empty `v1.0.0-rc.1/` prefix (confirmed empty in the R2
dashboard: 0 B, no objects). Real AWS S3 always returns `KeyCount`, even
`0`, but Cloudflare R2's S3-compatible API omits the field entirely when
no objects match; the AWS CLI's JMESPath query then resolves to null,
which `--output text` prints as the literal string `None`, and
`"None" != "0"` wrongly trips the guard on every fresh prefix. Fixed by
querying ``length(Contents || `[]`)`` instead, which is null-safe by
construction and needs no assumption about which fields R2 chooses to
include. `promote.yml`'s existing-objects check already used this shape
(`Contents[].Key` parsed and `Array.isArray`-checked in Node) and did not
have the bug.

## D32. `node --input-type=module <<'NODE' args...` silently never ran the script

2026-09-25. Four steps across `release.yml` and `promote.yml` (pinned and
alias CDN verification, the GitHub Release notes builder) fed a script via
a heredoc on stdin while also passing shell arguments after the heredoc
delimiter: `node --input-type=module <<'NODE' "$ARG1" ...`. Node's CLI
treats the first non-flag positional argument as the entry-point script
path to load, not as `process.argv` for a script read from stdin, whether
or not a heredoc is also attached to stdin. For the two CDN-verification
steps, that first argument was always `/tmp/upload-manifest.json`, a real
file, so Node silently `require()`'d it as an inert JSON module and exited
0 — the HTTP status/content-type/banner/font-CORS checks never ran, in any
release so far, and every run still reported success. For the release-notes
step the lone argument was the bare version string (e.g. `1.0.0`), which
resolves to no real file, so that one failed loudly instead of silently.
Discovered when `v1.0.0`'s tag run failed at "Build GitHub Release notes";
the CDN-verification steps had been passing vacuously since the very first
release.yml run. Fixed by using Node's documented `-` stdin sentinel
(`node --input-type=module - "$ARG1" ... <<'NODE'`), which explicitly reads
the entry point from stdin and correctly populates `process.argv` from the
trailing arguments. The two heredocs with no trailing arguments (the
Cloudflare purge calls) were never affected. `release.yml`'s own CDN
verification for this fix must be trusted going forward only once a run
with this fix has actually shown the check executing (a thrown assertion
on a deliberately wrong banner/URL would prove it, not just a green step).

## D33. First-ever npm publish needs a one-time manual bootstrap

2026-09-25. D10's OIDC trusted-publishing setup (`docs/cdn.md` §5)
assumes the package already exists on npm: Trusted Publishers is
configured on a package's own Settings page, which npm does not create
until that package has published at least once. For the `v1.0.0-rc.1`
and `v1.0.0-rc.2` tags this meant `release.yml`'s `npm publish` step 404'd
(`PUT .../@manjunathhk%2Fdesign-tokens` not found) even though
`id-token: write` and the workflow were both correct — there was simply
nothing yet to attach trust to. npm's "Staged Packages" page looked like
a plausible bootstrap path and is not; it is an unrelated manual-approval
feature for packages that already exist.

Resolved with a one-time manual publish from a human's own machine using
a scoped, 2FA-protected Granular Access Token (deleted immediately after)
and `--no-provenance` (provenance generation needs a recognized CI OIDC
provider; a local machine has none). `v1.0.0-rc.2`'s R2/CDN upload had
already succeeded before the npm failure, so this published that exact
same version rather than burning a `v1.0.0-rc.3` — see `docs/cdn.md` §5a for the
full runbook, now folded into `docs/workflow/release.md` step 1 and 3 as
a documented, expected first-release speed bump rather than a surprise.
Once the package exists, Trusted Publishers configures normally and every
later release (rc or final) publishes via OIDC with no further manual
step. Also observed and not a bug: npm sets `dist-tags.latest` to a
package's first-ever published version regardless of `--tag`, since a
package must always have a `latest` tag; self-corrects on the next
normal (non-`next`) publish. And: the public `registry.npmjs.org` read
API can lag several minutes behind npm's own website immediately after a
brand-new package's first publish — a `404` there in that window is
propagation lag, not a failed publish (confirm on the website first).
