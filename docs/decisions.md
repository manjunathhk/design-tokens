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
