import { execFile } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
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
});

