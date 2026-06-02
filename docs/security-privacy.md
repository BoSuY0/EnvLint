# Security And Privacy

EnvLint is local-first. It does not send source code or env files to external services.

Defaults:

- Real `.env` files are parsed for keys only.
- Example values may be read to detect unsafe defaults.
- Reports include variable names and locations, not real secret values.
- Autofix targets env example files only.
- `report.redactSecretNames: true` masks secret-like variable names in JSON, Markdown, SARIF, JUnit, and table reports.

If `files.readRealValues: true` is enabled, treat reports as sensitive. Use this only for local checks that need empty/default validation.
