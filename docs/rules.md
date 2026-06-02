# Rule Catalog

- `missing-in-example`: code or schema requires a var missing from env example files.
- `unused-in-example`: example var was not found in code, schema, or deployment config.
- `missing-in-deployment`: required var is not present in deployment config.
- `unsafe-default`: example or deployment default includes values like `localhost`, `changeme`, `password`, `admin`, or `test`.
- `frontend-secret-exposure`: secret-like name uses a public frontend prefix.
- `required-without-validation`: required code access has no detected runtime schema.
- `duplicate-definition`: env examples define different defaults for the same var.
- `dynamic-access`: static analysis found computed env access.
- `invalid-name-format`: var does not match default `SCREAMING_SNAKE_CASE`.
- `missing-description-comment`: required example var lacks a comment.
- `name-mismatch`: a missing var resembles a different example var.

Each rule can be configured as `off`, `info`, `warn`, or `error`.

