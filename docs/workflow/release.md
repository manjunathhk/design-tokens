# Cutting a release

The procedure for releasing `@manjunathhk/design-tokens`: tagging `main`,
publishing to npm, and updating the CDN. Tool-agnostic like
`implement-issue.md`. Per `AGENTS.md`, three things are always human —
pushing a tag, running `npm publish`, and handling an R2 or Cloudflare
credential directly — and nothing below changes that. Everything else in
this procedure an agent can drive, as `/release` in Claude Code (D30); each
step says which.

## 1. Preconditions

- Everything you want released is merged to `main` and green.
- You give `/release` the target version (semver: MAJOR for
  removing/renaming an emitted token, MINOR for adding a token or changing
  a value, PATCH for build/doc fixes — see `AGENTS.md`). `/release` checks
  that number against the diff since the last tag before using it: on a
  mismatch it stops, says why, and proposes the version the diff actually
  calls for, rather than silently overriding you or silently proceeding
  with a bump it believes is wrong.
- **No prior tag** (this repo's first release, currently at `0.0.0`):
  there is nothing to diff against, so `/release` skips the bump-mismatch
  check entirely rather than forcing a MAJOR/MINOR/PATCH classification
  against an empty baseline. It takes the version you give as the initial
  release version as-is — it doesn't guess whether you mean `1.0.0` or a
  `0.x` pre-release, that call is yours. This matches `api-diff.ts`'s own
  behavior (D20): it already passes trivially when the package isn't on
  npm yet or has no `latest` dist-tag, so nothing here is a new gap in the
  contract, just `/release` following the same rule.
- **First-ever release only**: npm trusted publishing (the OIDC publish
  in step 3) can't be configured until the package has published at
  least once — its Settings page doesn't exist before that (`docs/cdn.md`
  §5a). If it isn't bootstrapped yet, step 3 still completes the R2/CDN
  side successfully and only fails at the npm-publish step. That's
  recoverable without a new rc number — see the note in step 3 — so it's
  fine to discover this the first time you push a tag rather than
  bootstrapping npm up front.

## 2. Land the Release PR

`/release <version>` opens this PR once the version above checks out:

- `package.json` `version` → the **rc** version, e.g. `1.3.0-rc.1`.
  `release.yml` requires the pushed tag (minus its `v`) to match this
  string exactly, so it has to carry the `-rc.N` suffix here, not the
  final `1.3.0`.
- `CHANGELOG.md` → add the `## [1.3.0]` section (final version, no `-rc`
  suffix in the heading), drafted from the PRs merged since the last tag.
  On the first release there is no last tag to draft from — the merged-PR
  list would be the whole repo history — so `/release` writes a plain
  `## [<version>] - Initial release` heading instead, using whichever
  version you gave it in step 1 (`1.0.0` or a `0.x` pre-release, your
  call), and leaves the notes for you to fill in before merging.
  `release.yml` only checks for this section on the **final** tag, not the
  rc, but write it now so it's ready.
- The `dist/tokens.css` version-banner snapshot, if the build produces one.

Normal PR, normal CI. `/release` proposes the bump and drafts the notes,
but nothing lands unattended (D18, refined by D30): you review and merge
this PR like any other.

**(Human only: this step.)**

## 3. Push the release-candidate tag

From a clean checkout of the merged commit:

```sh
git tag v1.3.0-rc.1
git push origin v1.3.0-rc.1
```

Triggers `release.yml`. For an `-rc.N` tag it:

- validates the tag matches `package.json` exactly and the tagged commit
  is on `main` — hard-fails otherwise, no drift possible;
- runs the full gate: lint, typecheck, build, unit tests, API-diff,
  Playwright e2e;
- uploads to the **pinned** `/v1.3.0-rc.1/` prefix only, refusing if that
  prefix already has objects (pinned paths are immutable);
- verifies the upload over HTTP (status, content-type, version banner,
  font CORS);
- publishes to npm under the `next` dist-tag via OIDC — no token secret.

An rc never touches the `/vMAJOR/` alias or npm's `latest` tag.

**Let this run to completion** — roughly 2-4 minutes for the full gate
plus R2 upload plus npm publish — before assuming something is wrong.
Cancelling mid-run, especially mid-upload, can leave partial,
unverifiable objects under the pinned prefix; because pinned prefixes
are immutable, a stranded tag can never be reused and you'd have to
bump to a new rc number to recover (step 4). If the run fails only at
the npm-publish step and R2/CDN already succeeded, that's very likely
the first-release npm bootstrap gap (`docs/cdn.md` §5a), not a reason to
retag — fix npm access for that same version instead.

**(Human only: this step and its command.)**

## 4. Validate the rc

Run `/release verify` after pushing the rc tag: it pulls `next` from npm
and hits the pinned CDN URLs (status, content-type, version banner, font
CORS), then reports pass/fail. Read-only, no credential involved — the
same checks `release.yml` already ran, confirmed from outside CI. Fix
forward with a new rc (`-rc.2`, ...) if anything's wrong — don't reuse a
pinned prefix.

A green "Verify pinned/alias CDN assets" step in `release.yml` itself is
necessary but was not, for a while, sufficient: D32 covers a bug where
those in-CI steps silently never executed their checks at all while still
reporting success. Fixed as of that decision, but it's exactly why an
independent, outside-CI `/release verify` earns its place as a separate
step rather than trusting the workflow's own green checkmark alone.

## 5. Land the Finalize PR

`/release <version> finalize` opens a small follow-up PR, on a new branch
off `main`: bump `package.json` `version` from `1.3.0-rc.1` to `1.3.0` —
dropping the `-rc.N` suffix is required, since the final tag's validation
needs an exact match against this new string. No CHANGELOG change needed;
the `## [1.3.0]` section already landed in step 2. Reviewed and merged
like any other PR.

## 6. Push the final tag

On the Finalize PR's merged commit:

```sh
git tag v1.3.0
git push origin v1.3.0
```

`release.yml` re-runs the full gate, uploads pinned `/v1.3.0/`, verifies
it, then:

- promotes it to alias `/v1/` (copies pinned objects to alias keys);
- purges those alias URLs on Cloudflare;
- verifies the alias resolves;
- publishes to npm as `latest`;
- creates the GitHub Release, body pulled from `CHANGELOG.md`'s
  `## [1.3.0]` section.

The tag push _is_ the release — there is no separate release button or
draft step.

**(Human only: this step and its command.)**

## 7. Verify

Run `/release verify` again after pushing the final tag: it checks the
alias URL (`design.manjunathhk.in/v1/...`) resolves post-purge, and that
npm shows the new version as `latest`. Read-only.

## 8. Roll back a bad alias promotion

If the alias promotion needs redoing but the pinned version is already
published and doesn't need republishing: run `/release <version>
rollback`. It dispatches **Actions → promote → Run workflow** with the
version input (without `v`, e.g. `1.3.0`) via the GitHub API, polls the run
to completion, and reports the result. `promote.yml` re-runs promote +
purge + alias verification against the existing pinned objects, refusing
if that pinned prefix has zero objects. It does not touch npm. Dispatching
this workflow is not the same as an agent handling an R2 or Cloudflare
credential: `promote.yml` authenticates with its own repository secrets,
exactly as it does when a human clicks the button in the Actions UI (D30).

## 9. What's manual, always

Per `AGENTS.md`, three things are never automated and never done by an
agent, whatever else drives the rest of this procedure:

- pushing the rc or final tag — and not just by policy: a tag pushed with
  an agent's default `GITHUB_TOKEN` wouldn't even trigger `release.yml`,
  since GitHub suppresses a workflow run triggered by another workflow's
  default token, so moving this to an agent would need a PAT or app-token
  workaround that reintroduces the exact credential problem this rule
  avoids;
- running `npm publish` directly (it still runs, but only inside
  `release.yml` as CI, authenticated via OIDC);
- handling an R2 or Cloudflare credential directly.

Deciding the version bump stays yours to state; `/release` checks it
against the diff and pushes back on a mismatch rather than deciding
unilaterally (step 1) — D18's objection was to _inferring_ a bump from
commit types without enforcing the emitted-token contract, which this
doesn't do. See D30 for the full automation boundary and why the earlier
release-please rejection doesn't reopen here.
