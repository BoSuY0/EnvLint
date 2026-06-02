<goal>
Build EnvLint v1.0 as an OSS TypeScript CLI, library API, and GitHub Action that statically detects environment variable contract problems across code, env files, deployment config, reports, and safe autofix workflows described in `/home/tetra/Downloads/06-envlint-plan.md`.
</goal>

<context>
Start from the empty Git repository at `/home/tetra/Documents/EnvLint`. The source implementation plan is `/home/tetra/Downloads/06-envlint-plan.md`. Read `AGENTS.md`, `PLAN.md`, `ATTEMPTS.md`, and `NOTES.md` at the start of each continuation. Use `rg --files` and `git status --short --branch` before edits.
</context>

<constraints>
Do not collapse EnvLint into a grep-only script. JavaScript/TypeScript extraction must use an AST parser where parsing succeeds; Python extraction must use Python `ast` where Python is available and fall back safely. Real `.env` values are key-only by default. Reports must not expose secret values. Autofix may update example files, but must not modify real `.env` files without an explicit option. Keep v1.0 scope bounded to local static analysis, CLI/library/action surfaces, documentation, tests, and release scaffolding; post-v1 plugin APIs and external secret-manager integrations are non-goals.
</constraints>

<scorecard>
Primary checklist: all Required Capabilities in `PLAN.md` have implementation, tests or fixture coverage, and documentation where applicable. Passing threshold: `npm test`, `npm run build`, and `npm run lint` all exit 0; core CLI smoke commands run against fixtures; `git status --short` only shows intentional project files. Regression checks: key-only real `.env` parsing, AST extraction, deployment parsing, rule findings, reporter output, safe autofix, and action metadata. Stop condition: ask the user only if the external v1.0 plan conflicts with local repository reality in a way that changes product intent; otherwise make conservative implementation choices.
</scorecard>

<done_when>
- `package.json`, TypeScript config, CLI entrypoint, library exports, and package metadata exist and support `envlint init`, `scan`, `fix`, `explain`, `schema`, and `diff`.
- Core model, config validation, source collection, JS/TS extractor, Python extractor, dotenv parser, deployment parsers, contract builder, rule engine, reporters, and fixer are implemented under `src/`.
- Built-in rules cover missing in example, unused in example, missing in deployment, unsafe default, frontend secret exposure, required without validation, duplicate definition, dynamic access, invalid name format, and missing description comment.
- Reports support table, JSON, Markdown, SARIF, and JUnit XML; schema generation supports zod, JSON Schema, and Pydantic output.
- GitHub Action metadata, CI workflow, release workflow, docs, security policy, contributing guide, issue templates, and fixture directories exist.
- Verification commands `npm test`, `npm run build`, and `npm run lint` pass in `/home/tetra/Documents/EnvLint`.
- Public stable release addendum: `npm run release:check`, `npm run publish:dry-run`, clean tarball install, dogfood scan, and composite Action smoke pass; a real Git remote and maintainer package metadata exist; maintainer npm auth/name policy is confirmed; GitHub-hosted CI passes on the pushed release commit; `npm publish --provenance`, GitHub release creation, and `v1` tag update succeed.
</done_when>

<feedback_loop>
Fast check: run focused Vitest files such as `npm test -- tests/extractors.test.ts` or `npm test -- tests/scan.test.ts` after each subsystem, expected under 10 seconds. Run `npm run build` after API shape changes. Final check: run `npm test`, `npm run build`, `npm run lint`, and at least one CLI smoke command against a fixture. This is representative because EnvLint is a local static analyzer and fixtures cover code, env, deployment, reporting, and autofix paths.
</feedback_loop>

<workflow>
1. Create goal-loop files and RED tests from the v1.0 plan.
2. Scaffold package metadata and TypeScript test/build tooling.
3. Implement core types, config, source collection, dotenv parsing, extractors, deployment parsers, and contract builder.
4. Implement rules, reporters, fixer, schema generation, diff support, CLI commands, and library exports.
5. Add GitHub Action, CI/release scaffolding, docs, security/contributing metadata, and fixtures.
6. Run focused tests while iterating, then broad verification. Update `GOAL.md`, `PLAN.md`, `ATTEMPTS.md`, and `NOTES.md` with evidence.
</workflow>

<working_memory>
Maintain `PLAN.md` as the current checklist, `ATTEMPTS.md` for meaningful implementation/test attempts and results, and `NOTES.md` for discoveries, decisions, and blockers. Update `GOAL.md` Progress when acceptance items gain verified evidence.
</working_memory>

<human_control_surface>
`CONTROL.md` holds phase/status, strictness knobs, and pivot gates. Re-read it before changing scope, weakening tests, dropping a v1.0 capability, adding a new dependency category, or marking completion.
</human_control_surface>

<verification_loop>
Focused: `npm test -- tests/<file>.test.ts`; subsystem build checks with `npm run build`. Broad: `npm test`, `npm run build`, `npm run lint`. Manual smoke: run built CLI against `fixtures/node-express` or another fixture with JSON/Markdown output. If a command cannot run, record the exact failure and do not mark completion.
</verification_loop>

<execution_rules>
- Check git status before edits.
- Preserve unrelated user changes.
- Prefer `rg` over `grep` when available.
- Use `apply_patch` for manual edits.
- Read context files before implementation.
- Batch independent file reads in parallel when available.
- Keep the scorecard current.
- Use the fastest representative feedback check while iterating; reserve slower checks for escalation points and final verification.
- Maintain `PLAN.md`, `ATTEMPTS.md`, and `NOTES.md`.
- Run focused tests before broad tests.
- Do not paper over failures.
- Do not widen scope.
- Keep final communication concise and in Ukrainian unless the user asks otherwise.
</execution_rules>

<output_contract>
Final response must summarize changed areas, exact verification commands and outcomes, any known limitations, and the active goal completion status. Call `update_goal complete` only after every done_when item is verified with evidence.
</output_contract>

## Progress

### Completed

- 2026-06-02 17:09, RED tests established before production modules. evidence: `npm test` failed on missing `src/*` imports.
- 2026-06-02 17:22, CAP-3.1/CAP-3.2/CAP-3.3/CAP-3.4 extraction and parsing behavior verified. evidence: `npm test -- tests/dotenv.test.ts tests/extractors.test.ts tests/deployment.test.ts` (3 files, 6 tests passed).
- 2026-06-02 17:22, CAP-2/CAP-4 config, schema, scan, rules, reporters, and fixer behavior verified. evidence: `npm test -- tests/config-schema.test.ts tests/scan.test.ts` (2 files, 3 tests passed).
- 2026-06-02 17:27, CAP-1/CAP-6 package, library, CLI build, and typecheck verified. evidence: `npm test` (5 files, 9 tests passed), `npm run build` (exit 0), `npm run lint` (exit 0).
- 2026-06-02 17:27, CAP-6.5 built CLI smoke verified against fixture. evidence: `npm run smoke` wrote `/tmp/envlint-smoke.json`; parsed summary status `failed` with expected fixture findings.
- 2026-06-02 17:27, CAP-5.5 dogfooding config verified on EnvLint repo. evidence: `node dist/cli.js scan . --config envlint.config.yaml --format json --output /tmp/envlint-dogfood.json` produced status `passed`, summary 0 errors/0 warnings/0 info.
- 2026-06-02 17:28, CAP-5 package/release surface verified. evidence: `npm pack --dry-run` included `dist/cli.js`, `dist/index.js`, `action.yml`, README, LICENSE, SECURITY, and docs.
- 2026-06-02 17:30, CAP-5.1 GitHub Action annotations verified. evidence: local execution of the `Run EnvLint` composite step produced `/tmp/envlint-action-report.md`, `/tmp/envlint-annotations.json`, and `::error`/`::warning` annotation commands.
- 2026-06-02 17:31, CAP-5.3 release workflow sanity verified. evidence: `node -e` YAML parse check passed for `action.yml`, `.github/workflows/ci.yml`, and `.github/workflows/release.yml`; release workflow uses `git add -f dist`.
- 2026-06-02 17:37, CAP-7.2 report secret-name redaction verified. evidence: `npm test -- tests/reporters.test.ts` passed after RED failure proved `NEXT_PUBLIC_API_SECRET` leaked before the fix.
- 2026-06-02 17:38, CAP-7 CLI stdout release UX verified. evidence: `npm test -- tests/cli.test.ts` passed after RED failure proved `scan --format json` wrote `envlint-report.md` instead of stdout.
- 2026-06-02 17:41, CAP-7.1/CAP-7.3/CAP-7.5 local release gates verified. evidence: `npm run release:check` passed; `npm run publish:dry-run` exited 0 and prepared `envlint@1.0.0` with public access dry-run.
- 2026-06-02 17:41, CAP-7.4 clean install verified. evidence: packed tarball installed into a fresh temp consumer; `npx envlint --version` printed `1.0.0`; `envlint init` created config; `envlint scan --format json` produced status `passed`.
- 2026-06-02 17:41, CAP-7.6 Action and dogfood verified. evidence: composite Action run-step smoke produced `/tmp/envlint-action-report.md`, `/tmp/envlint-annotations.json`, and annotations; dogfood scan produced status `passed`, summary 0/0/0.
- 2026-06-02 17:44, local release-baseline commit created. evidence: current root commit after `npm run release:check` passed.

### In Progress

- 2026-06-02 17:44, waiting on external public release gates after local commit. Bridge: feeds CAP-7.7 through CAP-7.10; output enters product state only after maintainer remote/npm credentials allow remote metadata, real CI, publish, GitHub release, and `v1` tag verification.

### Blockers / Open Questions

- Config readiness note: `/goal` is available and project is trusted, but read-only check reported unset `model_context_window` and `model_auto_compact_token_limit`; continue with file-backed state.
- Blocker: no Git remote is configured, so CAP-7.7/CAP-7.9/CAP-7.10 cannot be verified from current state.
- Blocker: npm publish requires maintainer auth/token and package-name policy confirmation for `envlint`; `npm view envlint` returns an unpublished-package E404, which is not sufficient proof that this account may publish it.

### Iteration Log

- 2026-06-02 17:04, inspected empty repo and source plan; next: add RED tests, package scaffold, and implementation checklist.
