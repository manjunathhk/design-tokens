# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

- _No unreleased changes yet._

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
