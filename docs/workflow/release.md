# Cutting a release

The procedure for releasing `@manjunathhk/design-tokens`: one PR, one tag.
Per `AGENTS.md`, three things are always human: pushing a tag, running
`npm publish`, and handling an R2 or Cloudflare credential directly.
Everything else an agent can drive, as `/release` in Claude Code (D30).

There are no release candidates (D50). Every release is a final `vX.Y.Z`
tag, and a failed release run is rerun on the same tag rather than retried
under a new version.

## 1. Pick the version

Everything you want released is merged to `main` and green. You give
`/release` the target version (MAJOR for removing or renaming an emitted
token, MINOR for adding a token or changing a value, PATCH for build or doc
fixes; see `AGENTS.md`). `/release` checks that number against the diff
since the last tag; on a mismatch it stops, says why, and proposes the
version the diff calls for.

## 2. Land the Release PR

`/release <version>` drafts it:

- `package.json` `version` → `X.Y.Z`. `release.yml` requires the tag (minus
  its `v`) to match this exactly.
- `CHANGELOG.md` → move the `Unreleased` entries into a new
  `## [X.Y.Z] - <date>` section, drafted from the PRs merged since the last
  tag. `release.yml` refuses to start without this section.
- The `dist/tokens.css` version-banner snapshot.

Review and merge it like any other PR. **(Human: the merge.)**

## 3. Push the tag

On the merged commit:

```sh
git checkout main && git pull
git tag vX.Y.Z
git push origin vX.Y.Z
```

**(Human only: this step.)** `release.yml` then:

1. validates the tag is a final `vX.Y.Z`, matches `package.json`, sits on
   `main`, and has a `CHANGELOG.md` section; nothing is uploaded or
   published if any of these fail;
2. runs the full gate: lint, typecheck, build, unit tests, API diff,
   Playwright;
3. uploads to the pinned `/vX.Y.Z/` prefix and verifies it over HTTPS
   (`scripts/verify-cdn.ts`: status, Content-Type, banner, font CORS,
   Cache-Control);
4. publishes to npm as `latest` via OIDC;
5. promotes the pinned files to the `/vMAJOR/` alias, purges those URLs on
   Cloudflare and verifies the alias;
6. creates the GitHub Release from the `CHANGELOG.md` section;
7. deploys the specimen to GitHub Pages (the `pages` job, which runs only
   after the release job succeeds).

### If the run fails

Fix the cause, then **Re-run failed jobs** on the same run. The workflow
is safe to rerun:

- pinned objects that already exist with identical content are skipped;
  one with different content fails the run, because pinned prefixes are
  immutable;
- a version already on npm is skipped.

You only need a new version if the fix changes what gets published (any
file under `dist/`). That needs a new PATCH version, from step 2.

If only the alias steps failed (5), you can also run the `promote` workflow
for this version instead (step 5 below).

Let a run finish before deciding it is stuck: the gate, upload and publish
take about 2–4 minutes.

## 4. Verify

Run `/release verify`. It reads npm's `latest` and the pinned and alias CDN
URLs, and reports pass or fail. It is read-only and needs no credential.
Also check that the `pages` job succeeded and
`https://manjunathhk.github.io/design-tokens/` shows the new version.

## 5. Roll back the alias

To point `/vMAJOR/` at an earlier final version, run `/release <version>
rollback`, or **Actions → promote → Run workflow** with the version without
`v` (for example `1.3.0`). `promote.yml` copies that pinned prefix to the
alias, purges and verifies it. It refuses pre-release and malformed
versions and never touches npm. Dispatching it does not hand an agent a
credential: the workflow uses its own repository secrets (D30).
