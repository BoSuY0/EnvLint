# Release Checklist

This repository is locally release-ready when every command in this file passes. Actual public release still requires a maintainer-controlled GitHub remote, npm account, npm token, and final package-name ownership check.

## Local Release Gates

Run from `/home/tetra/Documents/EnvLint`:

```bash
npm ci
npm run release:check
npm run publish:dry-run
```

Run a clean install smoke:

```bash
npm run build
tmp="$(mktemp -d)"
npm pack --json --pack-destination "$tmp" > "$tmp/pack.json"
tarball="$tmp/$(node -e "console.log(require(process.argv[1])[0].filename)" "$tmp/pack.json")"
mkdir "$tmp/consumer"
cd "$tmp/consumer"
npm init -y
npm install "$tarball"
npx envlint --version
npx envlint init
npx envlint scan . --format json --output report.json
```

Run action-step smoke from the repository root:

```bash
node - <<'NODE'
const fs = require('fs');
const YAML = require('yaml');
const action = YAML.parse(fs.readFileSync('action.yml', 'utf8'));
fs.writeFileSync('/tmp/envlint-action-run.sh', action.runs.steps[0].run);
NODE

RUNNER_TEMP=/tmp \
GITHUB_ACTION_PATH="$PWD" \
ENVLINT_PATH=fixtures/node-express \
ENVLINT_CONFIG=envlint.config.yaml \
ENVLINT_FORMAT=markdown \
ENVLINT_OUTPUT=/tmp/envlint-action-report.md \
ENVLINT_DIFF=false \
ENVLINT_ANNOTATIONS=true \
ENVLINT_BASE=HEAD \
ENVLINT_HEAD=HEAD \
ENVLINT_FAIL_ON_ERROR=false \
bash /tmp/envlint-action-run.sh
```

## Public Release Gates

- Confirm the real Git remote is `https://github.com/BoSuY0/EnvLint` and `package.json` has matching `repository`, `bugs`, and `homepage` fields.
- Confirm the `envlint` npm package name is publishable from the maintainer account. `npm view envlint` currently returns an unpublished-package E404, so a maintainer should verify npm policy and account ownership before publishing.
- Configure `NPM_TOKEN` and GitHub release permissions.
- Commit the release tree, push it, and run CI on GitHub.
- Publish from CI or run:

```bash
npm publish --provenance
```

- Create the GitHub release and move the `v1` tag only after CI and npm publish both succeed.
