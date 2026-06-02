# Changelog

## 1.0.0 - 2026-06-02

Initial stable release candidate.

### Added

- EnvLint CLI with `init`, `scan`, `fix`, `explain`, `schema`, and `diff`.
- Library API for scanning, config loading, extraction, parsing, rule evaluation, reporting, fixing, and schema generation.
- JavaScript/TypeScript AST extraction for Node, frontend, Deno, Bun, dynamic access, and common schema object patterns.
- Python AST extraction for `os.environ`, `os.getenv`, `os.environ.get`, dynamic access, and Pydantic Settings fields.
- Dotenv parser with comment preservation and key-only real `.env` parsing by default.
- Deployment parsers for Dockerfile, docker-compose, Kubernetes, GitHub Actions, Vercel JSON, and Netlify TOML.
- Built-in rules for missing/unused env example variables, deployment drift, unsafe defaults, frontend secret exposure, missing validation, duplicates, dynamic access, naming, comments, and likely name mismatches.
- Table, JSON, Markdown, SARIF, and JUnit reporters.
- Safe `.env.example` autofix and starter schema generation for Zod, JSON Schema, and Pydantic.
- Composite GitHub Action with reports, artifacts, PR comments, annotations, diff mode, and exit policy.
- Documentation, fixtures, CI/release workflow scaffolding, security policy, contributing guide, and issue templates.
- Reproducible release preflight with `npm run release:check`, `npm run publish:dry-run`, and package linting through `publint`.

### Security

- Real `.env` values are not read by default.
- Secret-like names can be redacted from reports when `report.redactSecretNames` is enabled.
