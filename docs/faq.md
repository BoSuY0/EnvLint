# FAQ

## Does EnvLint replace runtime validation?

No. EnvLint catches static contract drift before CI or deployment. Runtime validation still protects the running process.

## Why warn on dynamic access?

Computed env access can be legitimate, but it cannot be fully verified statically. EnvLint reports it so maintainers can document or ignore it intentionally.

## Why are real `.env` values not read by default?

Most contract checks need names, not values. Key-only parsing reduces accidental secret exposure in logs and reports.

## Can I customize prefixes and secret patterns?

Yes. Configure `frontend.publicPrefixes` and `frontend.secretNamePatterns` in `envlint.config.yaml`.

