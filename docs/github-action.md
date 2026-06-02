# GitHub Action

```yaml
name: EnvLint
on: [pull_request]

jobs:
  envlint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: envlint/action@v1
        with:
          config: envlint.config.yaml
          comment-pr: true
          fail-on-error: true
          annotations: true
          format: markdown
          output: envlint-report.md
```

Action features:

- PR comments when `comment-pr: true` and the GitHub CLI is available.
- Inline workflow annotations when `annotations: true`.
- SARIF, JSON, Markdown, table, and JUnit reports.
- Artifact upload for the generated report.
- Diff mode with `diff: true`, `base`, and `head`.
- Exit-code policy through `fail-on-error`.
