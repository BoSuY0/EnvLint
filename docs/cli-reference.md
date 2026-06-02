# CLI Reference

## `envlint init`

Creates `envlint.config.yaml`.

Options:

- `--force`: overwrite an existing config.

## `envlint scan [path]`

Scans source code, env examples, real env files, deployment config, and schema patterns.

Options:

- `--config <path>`
- `--format table|json|markdown|sarif|junit`
- `--output <path>`
- `--strict`: exit non-zero on warnings or errors.
- `--ci`: exit non-zero on errors.

## `envlint fix [path]`

Updates the primary env example file. Real `.env` files are not modified.

Options:

- `--update-example`
- `--sort`
- `--preserve-comments`
- `--remove-unused`
- `--dry-run`

## `envlint explain NAME [path]`

Shows where one env variable appears and which findings affect it.

## `envlint schema`

Generates starter validation schemas from env examples.

Options:

- `--from <path>`
- `--format zod|json-schema|pydantic`
- `--output <path>`

## `envlint diff [path]`

Filters findings to evidence files changed in a git diff.

Options:

- `--base <ref>`
- `--head <ref>`
- `--format table|json|markdown|sarif|junit`

