import path from 'node:path';
import type { EnvReference } from '../types.js';
import { extractJavaScriptEnv } from './javascript.js';
import { extractPythonEnv } from './python.js';

export function extractEnvReferences(content: string, filePath: string): EnvReference[] {
  const ext = path.extname(filePath).toLowerCase();
  if (['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx'].includes(ext) || /next\.config\.[cm]?js$/.test(filePath)) {
    return extractJavaScriptEnv(content, filePath);
  }
  if (ext === '.py') return extractPythonEnv(content, filePath);
  return [];
}

