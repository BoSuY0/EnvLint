import { describe, expect, it } from 'vitest';
import { extractJavaScriptEnv } from '../src/extractors/javascript.js';
import { extractPythonEnv } from '../src/extractors/python.js';

describe('JavaScript and TypeScript extraction', () => {
  it('detects AST env access, schema keys, frontend vars, and dynamic access', () => {
    const refs = extractJavaScriptEnv(
      `
      const db = process.env.DATABASE_URL;
      const redis = process.env['REDIS_URL'] ?? 'redis://localhost';
      const vite = import.meta.env.VITE_API_URL;
      const deno = Deno.env.get('DENO_TOKEN');
      const bun = Bun.env.BUN_SECRET;
      const dyn = process.env[\`APP_\${key}\`];
      cleanEnv(process.env, { JWT_SECRET: str(), OPTIONAL_FLAG: bool({ default: false }) });
      `,
      'src/config.ts'
    );

    expect(refs.map((ref) => `${ref.sourceType}:${ref.name}:${ref.accessType}`).sort()).toEqual(
      expect.arrayContaining([
        'code:DATABASE_URL:required',
        'code:REDIS_URL:defaulted',
        'code:VITE_API_URL:required',
        'code:DENO_TOKEN:optional',
        'code:BUN_SECRET:required',
        'code:process.env[*]:dynamic',
        'schema:JWT_SECRET:required',
        'schema:OPTIONAL_FLAG:defaulted'
      ])
    );
    expect(refs.find((ref) => ref.name === 'VITE_API_URL')?.isPublicFrontend).toBe(true);
  });
});

describe('Python extraction', () => {
  it('uses Python AST for os env access and Pydantic Settings patterns', () => {
    const refs = extractPythonEnv(
      `
import os
from pydantic_settings import BaseSettings

db = os.environ["DATABASE_URL"]
cache = os.getenv("REDIS_URL", "redis://localhost")
optional = os.environ.get("OPTIONAL_NAME")
dynamic = os.environ[prefix + name]

class Settings(BaseSettings):
    jwt_secret: str
    optional_flag: bool = False
      `,
      'settings.py'
    );

    expect(refs.map((ref) => `${ref.sourceType}:${ref.name}:${ref.accessType}`).sort()).toEqual(
      expect.arrayContaining([
        'code:DATABASE_URL:required',
        'code:REDIS_URL:defaulted',
        'code:OPTIONAL_NAME:optional',
        'code:os.environ[*]:dynamic',
        'schema:JWT_SECRET:required',
        'schema:OPTIONAL_FLAG:defaulted'
      ])
    );
  });
});
