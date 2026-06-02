# EnvLint Hardening Batch Design

Date: 2026-06-02

## Goal

Continue improving EnvLint while public release gates remain externally blocked. This batch should add low-risk, user-visible controls and tighten parser/rule regression coverage without changing safe defaults.

## Observed Architecture

- `scanProject` loads config, collects files, parses references, builds the contract, and evaluates rules.
- `envlint scan` already reads config and formats reports, but does not expose CLI overrides for `files.readRealValues` or `report.redactSecretNames`.
- Dockerfile parsing supports `ARG KEY` and `ENV KEY=value`, but the legacy `ENV KEY value` form does not preserve the default value.
- Rule severity and disabling are config-driven through `EnvLintConfig.rules`.

## Design

- Add scan-time config overrides for narrowly scoped options:
  - `files.readRealValues`
  - `report.redactSecretNames`
- Add CLI flags:
  - `envlint scan --allow-read-values`
  - `envlint scan --redact-secret-names`
- Keep real `.env` values unread by default and keep secret-name redaction opt-in.
- Fix Dockerfile `ENV KEY value` parsing so the key is reported as `defaulted` with the captured value.
- Add focused tests for CLI overrides, scan overrides, rule `off` behavior, rule severity override behavior, and Dockerfile legacy syntax.

## Verification

Fast checks:

- `npm test -- tests/cli.test.ts tests/scan.test.ts tests/deployment.test.ts`

Broad checks:

- `npm run release:check`

## Non-Goals

- No new dependency category.
- No external secret manager integrations.
- No release publish attempt until npm auth/name policy and GitHub billing blockers are resolved.
