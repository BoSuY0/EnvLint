import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);

describe('CLI', () => {
  it('prints to stdout when --format is provided without --output', async () => {
    const root = join(tmpdir(), `envlint-cli-${Date.now()}-`);
    await mkdir(join(root, 'src'), { recursive: true });
    await writeFile(join(root, 'src', 'index.ts'), 'const db = process.env.DATABASE_URL;\n');
    await writeFile(join(root, '.env.example'), 'DATABASE_URL=\n');

    const { stdout } = await execFileAsync(process.execPath, ['--import', 'tsx', 'src/cli.ts', 'scan', root, '--format', 'json'], {
      cwd: process.cwd()
    });

    expect(JSON.parse(stdout).summary).toBeDefined();
  });

  it('redacts secret-like variable names from scan output when requested', async () => {
    const root = join(tmpdir(), `envlint-cli-redact-${Date.now()}-`);
    await mkdir(join(root, 'src'), { recursive: true });
    await writeFile(join(root, 'src', 'client.ts'), 'const token = import.meta.env.NEXT_PUBLIC_API_SECRET;\n');
    await writeFile(join(root, '.env.example'), 'NEXT_PUBLIC_API_SECRET=\n');

    const { stdout } = await execFileAsync(
      process.execPath,
      ['--import', 'tsx', 'src/cli.ts', 'scan', root, '--format', 'json', '--redact-secret-names'],
      {
        cwd: process.cwd()
      }
    );

    expect(stdout).not.toContain('NEXT_PUBLIC_API_SECRET');
    expect(stdout).toContain('<redacted-secret-name>');
  });

  it('allows real env value reads without leaking those values in JSON reports', async () => {
    const root = join(tmpdir(), `envlint-cli-values-${Date.now()}-`);
    await mkdir(join(root, 'src'), { recursive: true });
    await writeFile(join(root, 'src', 'index.ts'), 'const db = process.env.DATABASE_URL;\n');
    await writeFile(join(root, '.env'), 'DATABASE_URL=postgres://real-secret\n');

    const { stdout } = await execFileAsync(
      process.execPath,
      ['--import', 'tsx', 'src/cli.ts', 'scan', root, '--format', 'json', '--allow-read-values'],
      {
        cwd: process.cwd()
      }
    );
    const report = JSON.parse(stdout);

    expect(stdout).not.toContain('postgres://real-secret');
    expect(report.variables.DATABASE_URL.realEnvReferences[0]).toMatchObject({
      valueWasRead: true,
      defaultValue: '<redacted-env-value>'
    });
  });

  it('requires --update-example before fix mutates env example files', async () => {
    const root = join(tmpdir(), `envlint-cli-fix-${Date.now()}-`);
    await mkdir(join(root, 'src'), { recursive: true });
    await writeFile(join(root, 'src', 'index.ts'), 'const db = process.env.DATABASE_URL;\n');
    await writeFile(join(root, '.env.example'), '# existing\n');

    await expect(execFileAsync(process.execPath, ['--import', 'tsx', 'src/cli.ts', 'fix', root], { cwd: process.cwd() })).rejects.toMatchObject({
      stderr: expect.stringContaining('Use --update-example')
    });
    await expect(readFile(join(root, '.env.example'), 'utf8')).resolves.toBe('# existing\n');
  });
});
