# Attempts

Record meaningful implementation and verification attempts here.

- 2026-06-02 17:04: Repository inspection found an empty Git repository with no source files, no repo-local `AGENTS.md`, and no Graphify MCP tools available. Decision: implement EnvLint v1.0 from scratch using TypeScript, with Python `ast` extraction via local Python when available.
- 2026-06-02 17:09: RED run `npm test` failed as expected because `src/*` modules did not exist.
- 2026-06-02 17:22: Focused tests for dotenv, JS/TS extraction, Python extraction, and deployment parsing passed after fixing Python 3.14 `ast.Str` compatibility.
- 2026-06-02 17:27: Full verification passed: `npm test` 5 files/9 tests, `npm run build` exit 0, `npm run lint` exit 0, `npm run smoke` wrote `/tmp/envlint-smoke.json`, dogfood scan wrote `/tmp/envlint-dogfood.json` with status `passed`.
- 2026-06-02 17:28: `npm pack --dry-run` included `dist/cli.js`, `dist/index.js`, `action.yml`, README, LICENSE, SECURITY, and docs in the package tarball.
- 2026-06-02 17:30: Local emulation of the composite Action `Run EnvLint` step produced `/tmp/envlint-action-report.md`, `/tmp/envlint-annotations.json`, and GitHub workflow annotation commands for fixture findings.
- 2026-06-02 17:31: Release workflow corrected to `git add -f dist` because `dist/` is intentionally gitignored for normal development; YAML parse check passed for action, CI, and release workflow files.
- 2026-06-02 17:35: Public-release audit found no Git remote and empty package owner metadata; `npm view envlint name version description --json` returned E404 with "Unpublished on 2021-08-30T15:00:47.103Z", so maintainer account/name-policy verification is required before actual publish.
- 2026-06-02 17:37: Added reporter RED/GREEN coverage for `report.redactSecretNames`; secret-like names are now deep-redacted across report output.
- 2026-06-02 17:38: Added CLI RED/GREEN coverage so `envlint scan --format json` prints JSON to stdout when no `--output` is provided.
- 2026-06-02 17:41: Local release preflight passed: `npm run release:check`, YAML parse for action/CI/release workflows, `npm run publish:dry-run`, clean tarball consumer install, composite Action run-step smoke, and dogfood scan.
- 2026-06-02 17:44: Created local root release-baseline commit after `npm run release:check` passed; remaining release gates require a configured remote, maintainer npm auth/name confirmation, remote CI, actual npm publish, GitHub release, and `v1` tag.
- 2026-06-02 17:48: Created public GitHub repo `BoSuY0/EnvLint`, pushed `main`, and verified remote URL. GitHub CI run `26827647393` failed before job steps because the account is locked due to a billing issue.
- 2026-06-02 17:51: Verified `NPM_TOKEN=unset` and `npm whoami` returns `ENEEDAUTH`; created public tracking issue `https://github.com/BoSuY0/EnvLint/issues/1` for external release gates.
- 2026-06-02 17:53: Added labels `release-blocker` and `external`, milestone `v1.0.0`, and blocker-audit comment `https://github.com/BoSuY0/EnvLint/issues/1#issuecomment-4603655873` to issue #1.
- 2026-06-02 18:01: CAP-8 RED tests failed as expected for unknown `scan --redact-secret-names`, unknown `scan --allow-read-values`, missing scan config overrides, Dockerfile legacy `ENV KEY value` default loss, and JSON report leakage of read real env values.
- 2026-06-02 18:04: CAP-8 first GREEN passed: focused tests `npm test -- tests/cli.test.ts tests/scan.test.ts tests/deployment.test.ts tests/reporters.test.ts` reported 4 files/11 tests passed; `npm run lint` exited 0.
- 2026-06-02 18:04: Added ignore wildcard/expiry RED test; `npm test -- tests/scan.test.ts` failed because `FEATURE_*` did not suppress and expired exact ignores still suppressed findings. GREEN passed after adding wildcard matching and expiration checks.
- 2026-06-02 18:05: Added CLI fix safety RED test; `envlint fix` mutated `.env.example` without `--update-example`. GREEN passed after requiring explicit `--update-example` before CLI mutation.
- 2026-06-02 18:07: Added JS framework config RED test; extractor only found `code:SERVER_SECRET` and missed `deployment:NEXT_PUBLIC_API_URL`/`deployment:SERVER_SECRET` from `next.config.js` `env` object. GREEN passed after adding framework-config env extraction.
- 2026-06-02 18:09: Broad verification passed after excluding internal `docs/plans` from npm tarball: `npm run release:check` passed with 7 files/20 tests, lint, build, smoke, audit, publint, and pack dry-run; tarball listed 71 files and omitted `docs/plans`.
