---
name: release
description: Draft and validate a design-tokens release end to end — the Release PR, rc validation, the Finalize PR, final validation, and rollback dispatch — stopping at the two tag pushes, npm publish and any R2/Cloudflare credential, which stay yours. Use when starting, continuing, or rolling back a release.
argument-hint: <version> [finalize|rollback] | verify
---

Follow `docs/workflow/release.md` exactly for every step below; it is the
single source of the procedure and the automation boundary (D30). Do not
work from memory of it or of this file.

`$ARGUMENTS`:

- `<version>` alone (e.g. `1.3.0`): steps 1-2. Check that version's bump
  (MAJOR/MINOR/PATCH) against the diff since the last tag using AGENTS.md's
  rules before using it. On a mismatch, stop, say why, and propose the
  correct version — never silently override the number given, and never
  silently proceed with a bump you believe is wrong. If there is no prior
  tag (first release), skip that check — there's nothing to diff — and
  take the given version as-is; write the CHANGELOG section as a plain
  "Initial release" heading instead of drafting it from merged PRs, since
  there is no last tag to draft since. Once validated, draft the Release
  PR.
- `verify`: step 4 or step 7, whichever the current tag/package state
  matches. Read-only: pulls from npm, hits CDN URLs, reports pass/fail.
  Touches no credential.
- `<version> finalize`: step 5. Draft the Finalize PR dropping the `-rc.N`
  suffix.
- `<version> rollback`: step 8. Dispatch `promote.yml`'s
  `workflow_dispatch` with that version, poll it to completion, report the
  result.

Never push a tag, run `npm publish`, or handle an R2 or Cloudflare
credential directly, per AGENTS.md. Where `release.md` marks a step
human-only, stop and hand back the exact command for the human to run
instead of attempting it yourself.
