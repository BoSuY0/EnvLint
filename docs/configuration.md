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

Set `report.redactSecretNames: true` to mask secret-like variable names in reports. This is useful for public CI artifacts where names such as `JWT_SECRET` or `NEXT_PUBLIC_API_SECRET` should not be displayed.
