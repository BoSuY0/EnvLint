import type { EnvReference } from '../types.js';

export interface DotenvEntry {
  key: string;
  value?: string;
  rawValue?: string;
  line: number;
  leadingComments: string[];
  raw: string;
}

export interface DotenvParseOptions {
  filePath: string;
  kind: 'example' | 'real';
  readValues: boolean;
}

export interface DotenvParseResult {
  entries: DotenvEntry[];
  references: EnvReference[];
  comments: string[];
}

const keyPattern = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*(?:=\s*(.*))?$/;

export function parseDotenv(content: string, options: DotenvParseOptions): DotenvParseResult {
  const entries: DotenvEntry[] = [];
  const comments: string[] = [];
  const pendingComments: string[] = [];
  const lines = content.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index] ?? '';
    const trimmed = raw.trim();
    if (trimmed.length === 0) {
      pendingComments.length = 0;
      continue;
    }
    if (trimmed.startsWith('#')) {
      comments.push(raw);
      pendingComments.push(raw);
      continue;
    }

    const match = raw.match(keyPattern);
    if (!match) {
      pendingComments.length = 0;
      continue;
    }

    const key = match[1] ?? '';
    const rawValue = match[2] ?? '';
    const shouldReadValue = options.kind === 'example' || options.readValues;
    const value = shouldReadValue ? unquote(stripInlineComment(rawValue).trim()) : undefined;
    entries.push({
      key,
      value,
      rawValue,
      line: index + 1,
      leadingComments: [...pendingComments],
      raw
    });
    pendingComments.length = 0;
  }

  return {
    entries,
    comments,
    references: entries.map((entry) => ({
      name: entry.key,
      sourceType: 'env-file',
      file: options.filePath,
      line: entry.line,
      column: 0,
      language: 'dotenv',
      accessType: entry.value && entry.value.length > 0 ? 'defaulted' : 'unknown',
      defaultValue: entry.value,
      confidence: 'high',
      envFileKind: options.kind,
      description: entry.leadingComments.join('\n') || undefined,
      valueWasRead: options.kind === 'example' || options.readValues
    }))
  };
}

function stripInlineComment(value: string): string {
  let quote: string | undefined;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if ((char === '"' || char === "'") && value[index - 1] !== '\\') {
      quote = quote === char ? undefined : quote ?? char;
    }
    if (char === '#' && quote === undefined && /\s/.test(value[index - 1] ?? ' ')) {
      return value.slice(0, index);
    }
  }
  return value;
}

function unquote(value: string): string {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

