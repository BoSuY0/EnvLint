import { parseDotenv } from './parsers/dotenv.js';

export type SchemaFormat = 'zod' | 'json-schema' | 'pydantic';

export interface GenerateSchemaOptions {
  format: SchemaFormat;
  sourcePath: string;
}

export function generateSchemaFromEnvFile(content: string, options: GenerateSchemaOptions): string {
  const parsed = parseDotenv(content, { filePath: options.sourcePath, kind: 'example', readValues: true });
  const keys = parsed.entries.map((entry) => entry.key);
  if (options.format === 'json-schema') return generateJsonSchema(keys);
  if (options.format === 'pydantic') return generatePydantic(keys);
  return generateZod(keys);
}

function generateZod(keys: string[]): string {
  return [
    "import { z } from 'zod';",
    '',
    'export const envSchema = z.object({',
    ...keys.map((key) => `  ${key}: z.string().min(1),`),
    '});',
    '',
    'export type Env = z.infer<typeof envSchema>;'
  ].join('\n');
}

function generateJsonSchema(keys: string[]): string {
  return JSON.stringify(
    {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      additionalProperties: true,
      required: keys,
      properties: Object.fromEntries(keys.map((key) => [key, { type: 'string' }]))
    },
    null,
    2
  );
}

function generatePydantic(keys: string[]): string {
  return [
    'from pydantic_settings import BaseSettings',
    '',
    'class Settings(BaseSettings):',
    ...keys.map((key) => `    ${key.toLowerCase()}: str`)
  ].join('\n');
}

