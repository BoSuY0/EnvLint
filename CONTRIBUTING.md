# Contributing

Thanks for helping EnvLint catch env contract drift earlier.

## Development

```bash
npm ci
npm test
npm run lint
npm run build
```

Use fixtures for new language, framework, deployment, or reporter behavior. Add the smallest failing test first, then implement the parser, rule, or reporter change.

## Pull Requests

- Keep changes focused.
- Add or update tests for behavior changes.
- Document new CLI flags, config keys, rules, and security-sensitive behavior.
- Do not include real secret values in tests, fixtures, screenshots, or reports.

