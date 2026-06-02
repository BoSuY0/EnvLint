# Security And Privacy

EnvLint is local-first. It does not send source code or env files to external services.

Defaults:

- Real `.env` files are parsed for keys only.
- Example values may be read to detect unsafe defaults.
- Reports include variable names and locations, not real secret values.
- Autofix targets env example files only.
- `report.redactSecretNames: true` masks secret-like variable names in JSON, Markdown, SARIF, JUnit, and table reports.

If `files.readRealValues: true` or `envlint scan --allow-read-values` is enabled, EnvLint may use real values internally for local checks, but reports replace read real env values with `<redacted-env-value>`. Treat raw process output and local workspaces with care, and use this only for checks that need empty/default validation.
