# EnvLint Goal Control

## Status

- Phase: public release readiness
- Current acceptance focus: CAP-7 external public release gates

## Knobs

- Keep implementation local-first and dependency-light unless a parser library is needed for correctness.
- Do not weaken secret-value privacy defaults.
- Keep GitHub Action implementation compatible with a built `dist/cli.js`.
- Treat docs as release-surface docs, not a marketing site.

## Pivot Gates

Ask before:

- Dropping a v1.0 command or report format.
- Replacing AST extraction with regex-only extraction.
- Reading real `.env` values by default.
- Adding a service dependency or network-backed behavior.
- Marking a capability complete without a test, fixture, or smoke-check artifact.
- Publishing to npm or creating a GitHub release without maintainer-owned remote metadata and credentials.
