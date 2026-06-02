import path from 'node:path';
import type { EnvReference, Severity } from './types.js';

export function toPosix(filePath: string): string {
  return filePath.split(path.sep).join('/');
}

export function relativePath(root: string, filePath: string): string {
  const rel = path.relative(root, filePath);
  return toPosix(rel || '.');
}

export function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

export function isSecretLikeName(name: string, patterns: string[]): boolean {
  const upper = name.toUpperCase();
  return patterns.some((pattern) => upper.includes(pattern.toUpperCase()));
}

export function isPublicFrontendName(name: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => name.startsWith(prefix));
}

export function pythonFieldToEnvName(field: string): string {
  return field
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
}

export function severityRank(severity: Severity): number {
  return severity === 'error' ? 3 : severity === 'warn' ? 2 : 1;
}

export function escapeMarkdown(value: string): string {
  return value.replace(/([\\`*_{}[\]()#+\-.!|])/g, '\\$1');
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function maskValue(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  if (value.length === 0) return '';
  return '<redacted>';
}

export function lineColumnFromIndex(content: string, index: number): { line: number; column: number } {
  const prefix = content.slice(0, index);
  const lines = prefix.split(/\r?\n/);
  return { line: lines.length, column: lines[lines.length - 1]?.length ?? 0 };
}

export function referenceId(ref: EnvReference): string {
  return `${ref.sourceType}:${ref.name}:${ref.file}:${ref.line ?? 0}:${ref.column ?? 0}`;
}

export function findingId(ruleId: string, variableName: string, index = 0): string {
  return `${ruleId}:${variableName}:${index}`;
}

