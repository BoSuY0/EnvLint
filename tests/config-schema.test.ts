import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';
import { generateSchemaFromEnvFile } from '../src/schema.js';

describe('config and schema generation', () => {
  it('loads defaults and validates user config', async () => {
    const root = join(tmpdir(), `envlint-config-${Date.now()}-`);
    await mkdir(root, { recursive: true });
    await writeFile(
      join(root, 'envlint.config.yaml'),
      `
version: 1
frontend:
  publicPrefixes:
    - VITE_
rules:
  missingInExample: error
      `
    );

    const config = await loadConfig(root);
    expect(config.rules.missingInExample).toBe('error');
    expect(config.frontend.publicPrefixes).toEqual(['VITE_']);
    expect(config.files.readRealValues).toBe(false);
  });

  it('generates zod, JSON Schema, and Pydantic stubs from env examples', () => {
    const dotenv = 'DATABASE_URL=\nJWT_SECRET=\nOPTIONAL_FLAG=false\n';

    expect(generateSchemaFromEnvFile(dotenv, { format: 'zod', sourcePath: '.env.example' })).toContain('z.object');
    expect(generateSchemaFromEnvFile(dotenv, { format: 'json-schema', sourcePath: '.env.example' })).toContain('"DATABASE_URL"');
    expect(generateSchemaFromEnvFile(dotenv, { format: 'pydantic', sourcePath: '.env.example' })).toContain('class Settings');
  });
});
