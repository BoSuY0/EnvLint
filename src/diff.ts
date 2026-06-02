import { execFileSync } from 'node:child_process';
import path from 'node:path';
import type { EnvFinding, ScanResult } from './types.js';

export function filterFindingsForGitDiff(result: ScanResult, base: string, head = 'HEAD'): EnvFinding[] {
  let changed = new Set<string>();
  try {
    const output = execFileSync('git', ['diff', '--name-only', `${base}...${head}`], {
      cwd: result.root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    });
    changed = new Set(output.split(/\r?\n/).filter(Boolean).map((file) => file.split(path.sep).join('/')));
  } catch {
    return result.findings;
  }
  if (changed.size === 0) return [];
  return result.findings.filter((finding) => finding.evidence.some((ref) => changed.has(ref.file)));
}
