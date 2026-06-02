# Autofix Behavior

`envlint fix --update-example` updates the primary example env file. The CLI refuses to mutate env example files without the explicit `--update-example` flag.

Allowed v1.0 fixes:

- Add missing vars to `.env.example`.
- Add placeholder values.
- Add comments with source file references.
- Sort newly added keys when `--sort` is set.
- Remove unused example vars only when `--remove-unused` is set.

Safety boundaries:

- Real `.env` files are never modified by default.
- Existing comments are preserved.
- Use `--dry-run` to inspect output before writing.
