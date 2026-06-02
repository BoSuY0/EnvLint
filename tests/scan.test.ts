import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { scanProject } from '../src/scan.js';
import { updateEnvExample } from '../src/fixer.js';
import { formatFindings } from '../src/reporters/index.js';

async function makeTempProject(): Promise<string> {
  const root = join(tmpdir(), `envlint-${Date.now()}-`);
  await mkdir(root, { recursive: true });
  await mkdir(join(root, 'src'), { recursive: true });
  await mkdir(join(root, 'k8s'), { recursive: true });
  await writeFile(
    join(root, 'src', 'config.ts'),
    `
    const db = process.env.DATABASE_URL;
    const publicSecret = import.meta.env.VITE_SECRET_TOKEN;
    const dyn = process.env[prefix + name];
    `
  );
  await writeFile(
    join(root, 'settings.py'),
    `
import os
from pydantic_settings import BaseSettings

cache = os.getenv("REDIS_URL", "redis://localhost")

class Settings(BaseSettings):
    database_url: str
    jwt_secret: str
    `
  );
  await writeFile(
    join(root, '.env.example'),
    `# Existing\nDATABASE_URL=postgres://localhost\nREDIS_URL=redis://localhost\nOLD_FLAG=true\n`
  );
  await writeFile(join(root, 'Dockerfile'), 'ARG DATABASE_URL\nENV JWT_SECRET=\n');
  await writeFile(
    join(root, 'envlint.config.yaml'),
    `
version: 1
scan:
  include:
    - src
    - settings.py
    - Dockerfile
files:
  examples:
    - .env.example
rules:
  missingInDeployment: warn
report:
  format: json
    `
  );
  return root;
}

describe('scanProject integration', () => {
  it('builds a contract, evaluates built-in rules, reports, and safely fixes examples', async () => {
    const root = await makeTempProject();
    const result = await scanProject(root);

    expect(result.contract.variables.DATABASE_URL?.presentInExample).toBe(true);
    expect(result.contract.variables.JWT_SECRET?.presentInSchema).toBe(true);
    expect(result.findings.map((finding) => finding.ruleId)).toEqual(
      expect.arrayContaining([
        'unsafe-default',
        'unused-in-example',
        'frontend-secret-exposure',
        'required-without-validation',
        'dynamic-access'
      ])
    );

    const markdown = formatFindings(result.findings, result, { format: 'markdown' });
    expect(markdown).toContain('EnvLint Report');
    expect(formatFindings(result.findings, result, { format: 'sarif' })).toContain('"version": "2.1.0"');
    expect(formatFindings(result.findings, result, { format: 'junit' })).toContain('<testsuite');

    const fix = await updateEnvExample(root, result, { sort: true, preserveComments: true });
    expect(fix.changed).toBe(true);
    const updated = await readFile(join(root, '.env.example'), 'utf8');
    expect(updated).toContain('JWT_SECRET=');
    expect(updated).toContain('# Required by settings.py');
  });

  it('accepts scan-time overrides for reading real env values', async () => {
    const root = join(tmpdir(), `envlint-scan-overrides-${Date.now()}-`);
    await mkdir(join(root, 'src'), { recursive: true });
    await writeFile(join(root, 'src', 'index.ts'), 'const db = process.env.DATABASE_URL;\n');
    await writeFile(join(root, '.env'), 'DATABASE_URL=postgres://real-secret\n');

    const safe = await scanProject(root);
    const safeRef = safe.references.find((ref) => ref.name === 'DATABASE_URL' && ref.envFileKind === 'real');
    expect(safeRef).toMatchObject({ valueWasRead: false });
    expect(safeRef?.defaultValue).toBeUndefined();

    const allowed = await scanProject(root, {
      configOverrides: {
        files: {
          readRealValues: true
        }
      }
    });
    const allowedRef = allowed.references.find((ref) => ref.name === 'DATABASE_URL' && ref.envFileKind === 'real');
    expect(allowedRef).toMatchObject({
      valueWasRead: true,
      defaultValue: 'postgres://real-secret'
    });
  });

  it('honors disabled rules and severity overrides from config', async () => {
    const root = join(tmpdir(), `envlint-rules-${Date.now()}-`);
    await mkdir(join(root, 'src'), { recursive: true });
    await writeFile(
      join(root, 'src', 'client.ts'),
      `
      const db = process.env.DATABASE_URL;
      const exposed = import.meta.env.NEXT_PUBLIC_API_SECRET;
      `
    );
    await writeFile(
      join(root, 'envlint.config.yaml'),
      `
version: 1
scan:
  include:
    - src
rules:
  missingInExample: off
  missingInDeployment: off
  requiredWithoutValidation: off
  frontendSecretExposure: warn
      `
    );

    const result = await scanProject(root);

    expect(result.findings.map((finding) => finding.ruleId)).not.toContain('missing-in-example');
    expect(result.findings.find((finding) => finding.ruleId === 'frontend-secret-exposure')).toMatchObject({
      severity: 'warn'
    });
  });

  it('honors wildcard ignores only while they are not expired', async () => {
    const root = join(tmpdir(), `envlint-ignore-${Date.now()}-`);
    await mkdir(join(root, 'src'), { recursive: true });
    await writeFile(
      join(root, 'src', 'index.ts'),
      `
      const feature = process.env.FEATURE_ALPHA;
      const legacy = process.env.LEGACY_FLAG;
      `
    );
    await writeFile(
      join(root, 'envlint.config.yaml'),
      `
version: 1
scan:
  include:
    - src
rules:
  missingInDeployment: off
  requiredWithoutValidation: off
ignore:
  - name: FEATURE_*
    reason: Feature flags are provisioned by the platform
    expires: 2999-12-31
  - name: LEGACY_FLAG
    reason: This ignore is intentionally expired
    expires: 2000-01-01
      `
    );

    const result = await scanProject(root);
    const missingNames = result.findings.filter((finding) => finding.ruleId === 'missing-in-example').map((finding) => finding.variableName);

    expect(missingNames).not.toContain('FEATURE_ALPHA');
    expect(missingNames).toContain('LEGACY_FLAG');
  });
});
