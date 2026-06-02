import { describe, expect, it } from 'vitest';
import { parseDotenv } from '../src/parsers/dotenv.js';

describe('parseDotenv', () => {
  it('preserves comments and reads example values for policy checks', () => {
    const parsed = parseDotenv('# Database\nDATABASE_URL=postgres://localhost\nexport JWT_SECRET=\n', {
      filePath: '.env.example',
      kind: 'example',
      readValues: true
    });

    expect(parsed.entries.map((entry) => entry.key)).toEqual(['DATABASE_URL', 'JWT_SECRET']);
    expect(parsed.entries[0]?.leadingComments).toEqual(['# Database']);
    expect(parsed.references[0]).toMatchObject({
      name: 'DATABASE_URL',
      sourceType: 'env-file',
      defaultValue: 'postgres://localhost'
    });
  });

  it('does not read real env values unless explicitly allowed', () => {
    const parsed = parseDotenv('DATABASE_URL=postgres://secret\nEMPTY=\n', {
      filePath: '.env',
      kind: 'real',
      readValues: false
    });

    expect(parsed.entries[0]?.value).toBeUndefined();
    expect(parsed.references[0]?.defaultValue).toBeUndefined();
    expect(parsed.entries[1]?.value).toBeUndefined();
  });
});

