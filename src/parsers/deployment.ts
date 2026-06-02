import YAML from 'yaml';
import type { EnvReference } from '../types.js';

export function parseDeploymentFile(content: string, filePath: string): EnvReference[] {
  const lower = filePath.toLowerCase();
  if (lower.endsWith('dockerfile') || lower.includes('/dockerfile') || lower === 'dockerfile') {
    return parseDockerfile(content, filePath);
  }
  if (lower.endsWith('.toml')) return parseNetlifyToml(content, filePath);
  if (lower.endsWith('.json')) return parseJsonDeployment(content, filePath);
  if (lower.endsWith('.yml') || lower.endsWith('.yaml')) return parseYamlDeployment(content, filePath);
  return [];
}

export function parseDockerfile(content: string, filePath: string): EnvReference[] {
  const refs: EnvReference[] = [];
  const lines = content.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index] ?? '';
    const trimmed = raw.trim();
    const instructionMatch = trimmed.match(/^(ARG|ENV)\s+(.+)$/i);
    if (!instructionMatch) continue;
    const instruction = instructionMatch[1]?.toUpperCase() as 'ARG' | 'ENV';
    const rest = instructionMatch[2] ?? '';
    for (const token of splitDockerTokens(rest, instruction)) {
      const [key, ...valueParts] = token.split('=');
      const name = key?.trim();
      if (!name || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) continue;
      refs.push({
        name,
        sourceType: 'deployment',
        file: filePath,
        line: index + 1,
        column: raw.indexOf(name),
        language: 'dockerfile',
        accessType: valueParts.length > 0 ? 'defaulted' : 'unknown',
        defaultValue: valueParts.length > 0 ? valueParts.join('=') : undefined,
        confidence: 'high'
      });
    }
  }
  return refs;
}

function splitDockerTokens(input: string, instruction: 'ARG' | 'ENV'): string[] {
  const tokens: string[] = [];
  let current = '';
  let quote: string | undefined;
  for (const char of input) {
    if ((char === '"' || char === "'") && quote === undefined) {
      quote = char;
      current += char;
      continue;
    }
    if (char === quote) {
      quote = undefined;
      current += char;
      continue;
    }
    if (/\s/.test(char) && quote === undefined) {
      if (current) tokens.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  if (current) tokens.push(current);
  if (instruction === 'ENV' && tokens.length >= 2 && !tokens[0]?.includes('=')) {
    return [`${tokens[0] ?? ''}=${tokens.slice(1).join(' ')}`];
  }
  return tokens;
}

export function parseYamlDeployment(content: string, filePath: string): EnvReference[] {
  const refs: EnvReference[] = [];
  let docs: unknown[];
  try {
    docs = YAML.parseAllDocuments(content).map((doc) => doc.toJSON());
  } catch {
    return refs;
  }

  for (const doc of docs) {
    collectYamlEnv(doc, refs, filePath);
  }
  return refs;
}

function collectYamlEnv(node: unknown, refs: EnvReference[], filePath: string): void {
  if (Array.isArray(node)) {
    for (const item of node) collectYamlEnv(item, refs, filePath);
    return;
  }
  if (!node || typeof node !== 'object') return;

  const record = node as Record<string, unknown>;
  if ('environment' in record) collectEnvironment(record.environment, refs, filePath);
  if ('env' in record) collectEnv(record.env, refs, filePath);
  if ('data' in record && (record.kind === 'ConfigMap' || record.kind === 'Secret')) collectMapKeys(record.data, refs, filePath);
  if ('stringData' in record && record.kind === 'Secret') collectMapKeys(record.stringData, refs, filePath);

  for (const value of Object.values(record)) collectYamlEnv(value, refs, filePath);
}

function collectEnvironment(value: unknown, refs: EnvReference[], filePath: string): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === 'string') {
        const [name, ...rest] = item.split('=');
        addDeploymentRef(refs, filePath, name, rest.join('='));
      }
    }
    return;
  }
  collectMapKeys(value, refs, filePath);
}

function collectEnv(value: unknown, refs: EnvReference[], filePath: string): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      if (item && typeof item === 'object') {
        const record = item as Record<string, unknown>;
        if (typeof record.name === 'string') {
          addDeploymentRef(refs, filePath, record.name, typeof record.value === 'string' ? record.value : undefined);
        }
      }
    }
    return;
  }
  collectMapKeys(value, refs, filePath);
}

function collectMapKeys(value: unknown, refs: EnvReference[], filePath: string): void {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return;
  for (const [key, rawValue] of Object.entries(value as Record<string, unknown>)) {
    addDeploymentRef(refs, filePath, key, typeof rawValue === 'string' ? rawValue : undefined);
  }
}

function addDeploymentRef(refs: EnvReference[], filePath: string, name: string | undefined, defaultValue?: string): void {
  if (!name || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) return;
  refs.push({
    name,
    sourceType: 'deployment',
    file: filePath,
    language: filePath.endsWith('.json') ? 'json' : filePath.endsWith('.toml') ? 'toml' : 'yaml',
    accessType: defaultValue ? 'defaulted' : 'unknown',
    defaultValue,
    confidence: 'high'
  });
}

function parseJsonDeployment(content: string, filePath: string): EnvReference[] {
  try {
    const json = JSON.parse(content) as unknown;
    const refs: EnvReference[] = [];
    collectJsonEnv(json, refs, filePath);
    return refs;
  } catch {
    return [];
  }
}

function collectJsonEnv(node: unknown, refs: EnvReference[], filePath: string): void {
  if (Array.isArray(node)) {
    for (const item of node) collectJsonEnv(item, refs, filePath);
    return;
  }
  if (!node || typeof node !== 'object') return;
  const record = node as Record<string, unknown>;
  if ('env' in record) collectMapKeys(record.env, refs, filePath);
  if ('build' in record && record.build && typeof record.build === 'object' && 'env' in (record.build as Record<string, unknown>)) {
    collectMapKeys((record.build as Record<string, unknown>).env, refs, filePath);
  }
  for (const value of Object.values(record)) collectJsonEnv(value, refs, filePath);
}

function parseNetlifyToml(content: string, filePath: string): EnvReference[] {
  const refs: EnvReference[] = [];
  const lines = content.split(/\r?\n/);
  let inEnvironment = false;
  for (let index = 0; index < lines.length; index += 1) {
    const trimmed = (lines[index] ?? '').trim();
    if (trimmed.startsWith('[')) inEnvironment = /environment/i.test(trimmed);
    if (!inEnvironment || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/);
    if (match) addDeploymentRef(refs, filePath, match[1], match[2]);
  }
  return refs;
}
