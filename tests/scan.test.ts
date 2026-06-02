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
});
