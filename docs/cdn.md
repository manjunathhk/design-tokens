# CDN and release setup

This runbook is for `design.manjunathhk.in` backed by the `mk-design-cdn` R2 bucket.
It covers Cloudflare setup, GitHub secrets, npm trusted publishing, and dry-runs.

## 1) Create and expose the public R2 bucket

1. Cloudflare Dashboard → **R2 Object Storage** → **Create bucket**.
2. Name: `mk-design-cdn`.
3. Keep this bucket public-only for design-token assets. Never store private files in it.
4. In the bucket, add custom domain `design.manjunathhk.in`.
5. Keep the `r2.dev` public URL disabled.

## 2) Apply R2 CORS policy

1. Open `mk-design-cdn` → **Settings** → **CORS policy**.
2. Paste `docs/r2-cors.json` exactly.
3. Save.

Why `*`: assets are public, credentials are never sent, and we avoid per-origin cache fragmentation.

## 3) Add Cloudflare cache behavior

1. Cloudflare Dashboard → **Rules** → **Cache Rules** → **Create rule**.
2. Match hostname `design.manjunathhk.in`.
3. Set cache eligibility to cache static files and respect origin `Cache-Control` headers.
4. Save and deploy.

Pinned paths (`/vX.Y.Z/`) use long immutable cache. Alias paths (`/vMAJOR/`) use short cache.

## 4) Create the two Cloudflare API tokens

Create scoped tokens:

- **R2 uploader token**: Object Read & Write on bucket `mk-design-cdn` only.
- **Cache purge token**: Zone > Cache Purge on zone `manjunathhk.in` only.

Add these repository secrets in GitHub (**Settings → Secrets and variables → Actions**):

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `CF_ZONE_ID`
- `CF_API_TOKEN`

These are the only remaining release secrets. Do not add `NPM_TOKEN`.

## 5) Configure npm trusted publishing (OIDC)

1. Ensure the repository is public.
2. npmjs.com → package `@manjunathhk/design-tokens` → **Settings** → **Trusted publishers**.
3. Add publisher:
   - Provider: GitHub Actions
   - Owner: `manjunathhk`
   - Repository: `design-tokens`
   - Workflow file: `.github/workflows/release.yml`
   - Environment: leave empty unless you intentionally gate publishes via env protection.
4. Save.

`release.yml` uses `id-token: write` and runs `npm publish`/`npm publish --tag next` with no token secret.

## 6) Release flow summary

- Push pre-release tag (`vX.Y.Z-rc.N`) on a `main` commit.
  - Workflow validates tag/version, tests, uploads pinned `/vX.Y.Z-rc.N/`, verifies HTTPS headers/banner/CORS, publishes npm with `--tag next`, and stops.
- Push final tag (`vX.Y.Z`) on a `main` commit.
  - Workflow uploads pinned `/vX.Y.Z/`, verifies it, promotes to alias `/vX/`, purges explicit alias URLs, verifies alias, publishes npm, and creates GitHub Release notes from `CHANGELOG.md`.

## 7) Rollback runbook

Use **Actions → promote → Run workflow** with input `version` (example `1.3.0`).

`promote.yml` re-runs alias promote + purge + alias verification for an already-published pinned version without republishing npm.

## 8) Emergency fallback

If CDN has an incident, switch consumer sites to jsDelivr temporarily:

`https://cdn.jsdelivr.net/npm/@manjunathhk/design-tokens@<major>/dist/index.css`

Use this only as fallback; default URL remains `design.manjunathhk.in`.

## 9) Dry-run paths without credentials

You can validate release inputs locally without Cloudflare/npm credentials:

```sh
npm ci
npm run build
npx tsx scripts/upload-manifest.ts --version 1.0.0
```

And validate workflow syntax with actionlint:

```sh
actionlint
```

## 10) Alias propagation note

Alias updates (`/vMAJOR/`) can briefly serve mixed files while edge caches update.
That is acceptable for tokens/base assets because files are version-bannered and quickly converged via purge + short alias TTL.
If strict atomicity is needed later, move `/vMAJOR/` to a small Worker that maps to the latest pinned path.
