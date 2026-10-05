# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

Token values change; no token is added, removed or renamed (MINOR).

### Changed

- Colour palette is now amber on warm off-white (light) and navy-black
  (dark), replacing the brown/copper palette (D47). Light mode has a real
  text hierarchy (`text`, `text-secondary`, `text-muted` are distinct), and
  `border` is now a translucent tint in both modes.

## [1.2.0] - 2026-10-05

Token values change; no token is added, removed or renamed, so `@1` and
`/v1/` consumers receive this automatically.

### Changed

- Colour palette now follows the portfolio's light and dark themes (#59,
  D47). 17 light and 16 dark colour values change. In light mode, `text`,
  `text-secondary`, `text-muted`, `accent`, `border-control`, `focus-ring`,
  `success` and `warning` all use `#56453F` so every pair passes the
  contrast contract.
- Fonts: Inter (`font.family.sans`, `display`) and JetBrains Mono
  (`font.family.mono`) replace IBM Plex, self-hosted, Latin subset,
  `font-display: swap` (#60, D48). `fonts.css` no longer declares any
  IBM Plex face; a site that names "IBM Plex" directly instead of using the
  tokens falls back to its next font. Pinned older CDN versions are
  unchanged.

### Fixed

- `base.css`: the box-sizing reset and reduced-motion rules now also reach
  `::before` and `::after`, still with the lowest specificity (#49, D38).

### Release pipeline

- One final `vX.Y.Z` tag per release; release candidates and the npm
  `next` dist-tag are retired. A failed release run can be rerun on the
  same tag (#82, D50).
- CDN verification checks every font's CORS header and the Cache-Control
  policy on every file (#55, D43).
- The rollback workflow builds its manifest correctly (#50), accepts only
  final versions (#51), and never writes the alias concurrently with a
  release (#52).
- The API diff enforces MINOR for value changes and the stylelint config
  versioning policy (#53, D45).

### Repository

- Windows is a supported contributor environment (#54, D37).
- Simplified: the specimen deploy is a job in `release.yml`, alias
  promotion is one shared action, `docs/decisions.md` lists only the rules
  in force, and the Copilot files are removed (#84, D51).

## [1.1.0] - 2026-09-25

### Added

- Shareable stylelint config at `@manjunathhk/design-tokens/stylelint`
  that bans hex, named and functional colour values so consumers use
  `--mk-` tokens instead. `stylelint >=16` is an optional peer dependency
  (#45, D36).

### Fixed

- Release and promote workflows: pinned/alias CDN verification and the
  GitHub Release notes step now actually execute (#40, D32).

### Changed

- GitHub Pages publishes only the specimen page, not the whole `docs/`
  folder (#44, D34).

### Documentation

- First-ever npm publish bootstrap runbook (#41, D33).
- CI deprecation-warning closure and npm install-scripts policy (#46, D35).

## [1.0.0] - 2026-09-25

- Initial stable release.
