# EnvLint v1.0 Implementation Checklist

Status markers: `[ ]` pending, `[~]` in progress, `[x]` verified with evidence in `GOAL.md`.

## CAP-1: Package, CLI, And Library Surface

- [x] CAP-1.1 Package metadata, TypeScript config, build/test/lint scripts, CLI binary, and library exports exist.
- [x] CAP-1.2 CLI implements `init`, `scan`, `fix`, `explain`, `schema`, and `diff` with documented flags.
- [x] CAP-1.3 Library API exposes scan, config, extractors/parsers, rules, reporters, fixer, and schema generation.

## CAP-2: Config, Collection, And Core Model

- [x] CAP-2.1 Config loader validates `envlint.config.yaml` and supplies safe defaults matching the v1.0 plan.
- [x] CAP-2.2 Source collection respects include/exclude, env file lists, deployment files, and custom paths.
- [x] CAP-2.3 Core data model supports env references, contracts, findings, severities, confidence, and autofix metadata.

## CAP-3: Extraction And Parsing

- [x] CAP-3.1 JS/TS AST extractor detects `process.env`, computed string access, `import.meta.env`, Deno, Bun, schemas, and dynamic access warnings.
- [x] CAP-3.2 Python AST extractor detects `os.environ`, `os.getenv`, `os.environ.get`, Pydantic Settings patterns, and dynamic access fallback.
- [x] CAP-3.3 Dotenv parser preserves comments, reads example values, and does not read real `.env` values by default.
- [x] CAP-3.4 Deployment parsers detect Dockerfile, docker-compose, Kubernetes, GitHub Actions, Vercel, and Netlify env references where locally available.

## CAP-4: Contract, Rules, Reports, Fixer

- [x] CAP-4.1 Contract builder compares code usage, env examples, schemas, and deployment config.
- [x] CAP-4.2 Built-in rules cover all ten v1.0 issue categories from the plan.
- [x] CAP-4.3 Reporters output table, JSON, Markdown, SARIF, and JUnit XML.
- [x] CAP-4.4 Fixer safely updates `.env.example`, preserves comments, supports sorting, and avoids real `.env` mutation by default.

## CAP-5: Action, CI, Docs, Release Surface

- [x] CAP-5.1 GitHub Action metadata supports PR comments, annotations, artifacts, diff mode, and exit-code policy inputs.
- [x] CAP-5.2 CI workflow runs tests, lint/typecheck, build, fixture smoke, and action metadata validation.
- [x] CAP-5.3 Release workflow scaffolds version/changelog/npm/GitHub release/v1 tag flow.
- [x] CAP-5.4 Docs cover quickstart, CLI, action, config, supported languages, rule catalog, autofix, security/privacy, examples, and FAQ.
- [x] CAP-5.5 `SECURITY.md`, `CONTRIBUTING.md`, issue templates, fixtures, and dogfooding config exist.

## CAP-6: Verification

- [x] CAP-6.1 Unit and integration tests cover dotenv, JS/TS extraction, Python extraction, deployment parsing, rules, reporters, fixer, config, schema generation, and security behavior.
- [x] CAP-6.2 `npm test` passes.
- [x] CAP-6.3 `npm run build` passes.
- [x] CAP-6.4 `npm run lint` passes.
- [x] CAP-6.5 Built CLI smoke commands run against fixtures and produce expected output.

## CAP-7: Public Stable Release Readiness

- [x] CAP-7.1 Package exports, `prepack`, `release:check`, `publish:dry-run`, `publint`, changelog, release checklist, and publishable file list exist.
- [x] CAP-7.2 Security reporting redacts secret-like variable names when `report.redactSecretNames` is enabled.
- [x] CAP-7.3 `npm run release:check` passes, including tests, lint, build, smoke, audit, package lint, and pack dry-run.
- [x] CAP-7.4 Clean tarball install in a fresh consumer project works with `npx envlint --version`, `envlint init`, and `envlint scan --format json`.
- [x] CAP-7.5 `npm run publish:dry-run` succeeds and prepares `envlint@1.0.0` for public npm publish.
- [x] CAP-7.6 Composite GitHub Action run-step smoke emits report files and inline annotations locally.
- [x] CAP-7.7 Real Git remote is configured and `package.json` has maintainer-owned `repository`, `bugs`, and `homepage` URLs.
- [ ] CAP-7.8 Maintainer confirms npm `envlint` package-name/account policy, authenticates npm, and configures `NPM_TOKEN`.
- [ ] CAP-7.9 Release commit is pushed and GitHub-hosted CI passes on the remote repository. Current remote CI cannot start because GitHub reports the account is locked due to a billing issue.
- [ ] CAP-7.10 Actual public release is complete: `npm publish --provenance` succeeds, GitHub release exists, and `v1` tag points at the release commit.
