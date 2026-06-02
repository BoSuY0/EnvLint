# Notes

- Source plan: `/home/tetra/Downloads/06-envlint-plan.md`.
- Repository started empty except for `.git`.
- Runtime available at start: Node v22.22.2, npm 10.9.7, Python 3.14.4.
- Goal-forge config check: Codex `/goal` likely available, project trusted, `approval_policy=never`, `sandbox_mode=danger-full-access`; autonomous readiness gaps are unset context/auto-compact values and execution reasoning set to `xhigh`.
- Graphify MCP tools were requested by repo instructions when artifacts are available, but tool discovery found no callable `query_graph`, `get_neighbors`, or `shortest_path` tools and no local Graphify artifacts.
- Implementation uses TypeScript with `@babel/parser` for JS/TS AST extraction and local `python3 -c` with `ast` for Python extraction, falling back to regex only when parsing is unavailable.
- Dogfooding config scans EnvLint's own source and workflows, while fixture projects remain intentionally noisy test inputs.
- Public release cannot be truthfully marked complete from this environment alone because npm authentication/token is absent, package-name publishing rights still need maintainer confirmation, GitHub Actions cannot start while the account is locked due to a billing issue, and no actual npm/GitHub release or `v1` tag exists.
- `npm view envlint` currently returns an unpublished-package E404; this proves the package is not currently visible in the registry, but a maintainer still needs to confirm npm name reuse/policy from the publishing account before actual release.
- Public GitHub remote: `https://github.com/BoSuY0/EnvLint`.
- Public blocker issue: `https://github.com/BoSuY0/EnvLint/issues/1`.
- Public blocker audit comment: `https://github.com/BoSuY0/EnvLint/issues/1#issuecomment-4603655873`.
- CAP-8 hardening added scan-time overrides for `files.readRealValues` and `report.redactSecretNames`; safe defaults remain unchanged.
- Reports now replace values read from real env files with `<redacted-env-value>` even when value reading is explicitly enabled.
- CLI `fix` now requires explicit `--update-example` before mutating env example files; the library `updateEnvExample` remains an explicit API.
- Ignore entries now support `*` and `?` wildcards, and `expires` dates stop suppressing findings after the date passes.
- JS/TS extraction now treats framework config `env` object keys in `next/vite/nuxt/astro/svelte/remix.config.*` as deployment references.
- Internal design docs under `docs/plans` are kept in the repo but excluded from npm package tarballs.
