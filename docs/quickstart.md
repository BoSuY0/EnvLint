# Quickstart

Install EnvLint in a project:

```bash
npm install --save-dev envlint
npx envlint init
npx envlint scan . --format table
```

CI-friendly scan:

```bash
npx envlint scan . --format sarif --output envlint.sarif --ci
```

Safe autofix:

```bash
npx envlint fix . --update-example --sort --preserve-comments
```

EnvLint reads only variable names from real `.env` files by default.

