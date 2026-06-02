# Configuration Reference

EnvLint reads `envlint.config.yaml`.

```yaml
version: 1
project:
  type: auto
  root: .
scan:
  include:
    - src
    - Dockerfile
    - docker-compose.yml
    - k8s
    - .github/workflows
  exclude:
    - node_modules
    - dist
files:
  examples:
    - .env.example
  realEnv:
    - .env
  readRealValues: false
rules:
  missingInExample: error
  unusedInExample: warn
frontend:
  publicPrefixes:
    - VITE_
    - NEXT_PUBLIC_
  secretNamePatterns:
    - SECRET
    - TOKEN
production:
  unsafeDefaults:
    - localhost
    - changeme
ignore:
  - name: OPTIONAL_DEBUG_FLAG
    reason: Used only in local debugging
report:
  format: markdown
  output: envlint-report.md
  redactSecretNames: false
```

Rule settings are `off`, `info`, `warn`, or `error`.

Ignore entries match exact names by default and may use `*` or `?` wildcards, such as `FEATURE_*`. When `expires` is in the past, the ignore stops suppressing findings.

Set `report.redactSecretNames: true` or pass `envlint scan --redact-secret-names` to mask secret-like variable names in reports. This is useful for public CI artifacts where names such as `JWT_SECRET` or `NEXT_PUBLIC_API_SECRET` should not be displayed.

`files.readRealValues` stays `false` by default. For local-only checks that need real values, use `files.readRealValues: true` or `envlint scan --allow-read-values`; generated reports still replace those real values with `<redacted-env-value>`.
