import { stat } from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';
import type { EnvLintConfig, SourceFileSet } from './types.js';
import { pathExists } from './config.js';
import { toPosix, unique } from './utils.js';

export async function collectSourceFiles(root: string, config: EnvLintConfig): Promise<SourceFileSet> {
  const includePatterns = await expandIncludePatterns(root, config.scan.include);
  const ignore = config.scan.exclude.map((entry) => `${entry.replace(/\/$/, '')}/**`);
  const found = await fg(includePatterns, {
    cwd: root,
    dot: true,
    onlyFiles: true,
    unique: true,
    ignore
  });

  const envExampleFiles = await existingConfiguredFiles(root, config.files.examples);
  const realEnvFiles = await existingConfiguredFiles(root, config.files.realEnv);
  const all = unique([...found.map(toPosix), ...envExampleFiles, ...realEnvFiles]);

  return {
    codeFiles: all.filter(isCodeFile),
    envExampleFiles,
    realEnvFiles,
    deploymentFiles: unique(all.filter(isDeploymentFile))
  };
}

async function expandIncludePatterns(root: string, includes: string[]): Promise<string[]> {
  const patterns: string[] = [];
  for (const include of includes) {
    if (hasGlob(include)) {
      patterns.push(include);
      continue;
    }
    const full = path.resolve(root, include);
    if (!(await pathExists(full))) continue;
    const info = await stat(full);
    patterns.push(info.isDirectory() ? `${toPosix(include).replace(/\/$/, '')}/**/*` : toPosix(include));
  }
  return patterns.length > 0 ? patterns : ['**/*'];
}

async function existingConfiguredFiles(root: string, files: string[]): Promise<string[]> {
  const found: string[] = [];
  for (const file of files) {
    if (await pathExists(path.resolve(root, file))) found.push(toPosix(file));
  }
  return found;
}

function hasGlob(value: string): boolean {
  return /[*?[\]{}()!+@]/.test(value);
}

function isCodeFile(filePath: string): boolean {
  return /\.(?:[cm]?[jt]sx?|py)$/.test(filePath) || /next\.config\.[cm]?js$/.test(filePath);
}

function isDeploymentFile(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  return (
    lower.endsWith('dockerfile') ||
    lower.includes('/dockerfile') ||
    lower.endsWith('docker-compose.yml') ||
    lower.endsWith('docker-compose.yaml') ||
    lower.includes('.github/workflows/') ||
    lower.includes('/k8s/') ||
    lower.includes('/kubernetes/') ||
    lower.endsWith('vercel.json') ||
    lower.endsWith('netlify.toml')
  );
}

