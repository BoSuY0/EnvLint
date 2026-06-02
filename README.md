# EnvLint

EnvLint is a local-first CLI, library API, and GitHub Action for finding environment variable contract drift before staging or production.

It scans code, env example files, runtime validation schemas, and deployment configuration to catch missing variables, unused variables, unsafe defaults, public frontend secret exposure, dynamic access, duplicate definitions, and other env contract problems.

## Quickstart

```bash
npm install --save-dev envlint
npx envlint init
npx envlint scan . --format table
```

Update `.env.example` safely:

```bash
npx envlint fix . --update-example --sort --preserve-comments
```

Generate a starter runtime schema:

```bash
npx envlint schema --from .env.example --format zod
```

## CLI

- `envlint init` creates `envlint.config.yaml`.
- `envlint scan [path] --format table|json|markdown|sarif|junit --strict --ci` scans the project.
- `envlint fix [path] --update-example --sort --preserve-comments` updates env examples without touching real `.env` files.
- `envlint explain NAME [path]` shows references and findings for one variable.
- `envlint schema --from .env.example --format zod|json-schema|pydantic` generates starter validation schemas.
- `envlint diff [path] --base origin/main --head HEAD` reports findings tied to changed files.

## Library API

```ts
import { scanProject, formatFindings } from 'envlint';

const result = await scanProject(process.cwd());
console.log(formatFindings(result.findings, result, { format: 'markdown' }));
```

## Security Defaults

EnvLint reads only variable names from real `.env` files by default. Example values are read so unsafe defaults can be detected. Real values are only read when `files.readRealValues: true` or the equivalent API option is enabled.

Enable `report.redactSecretNames: true` when report artifacts should hide secret-like variable names.

## Release Checks

```bash
npm run release:check
npm run publish:dry-run
```

See `RELEASE.md` before publishing to npm or tagging `v1`.

See `docs/` for CLI, configuration, GitHub Action, supported language, rule, autofix, and security details.
