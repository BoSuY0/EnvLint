import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { FixOptions, FixResult, ScanResult } from './types.js';
import { pathExists } from './config.js';

export async function updateEnvExample(root: string, result: ScanResult, options: FixOptions = {}): Promise<FixResult> {
  const target = result.config.files.examples[0] ?? '.env.example';
  const filePath = path.resolve(root, target);
  const existing = (await pathExists(filePath)) ? await readFile(filePath, 'utf8') : '';
  const lines = existing.length > 0 ? existing.split(/\r?\n/) : [];
  const existingKeys = new Set(lines.map((line) => line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/)?.[1]).filter((key): key is string => Boolean(key)));
  const missing = result.findings
    .filter((finding) => finding.ruleId === 'missing-in-example' && finding.autofix?.type === 'add-to-example')
    .map((finding) => finding.variableName)
    .filter((name) => !existingKeys.has(name));
  const uniqueMissing = [...new Set(options.sort ? missing.sort() : missing)];

  const remove = options.removeUnused
    ? new Set(result.findings.filter((finding) => finding.ruleId === 'unused-in-example').map((finding) => finding.variableName))
    : new Set<string>();

  let nextLines = lines.filter((line) => {
    const key = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/)?.[1];
    return !key || !remove.has(key);
  });

  if (uniqueMissing.length > 0) {
    if (nextLines.length > 0 && nextLines[nextLines.length - 1] !== '') nextLines.push('');
    for (const name of uniqueMissing) {
      const evidence = result.findings.find((finding) => finding.variableName === name)?.evidence[0];
      if (options.preserveComments !== false && evidence) nextLines.push(`# Required by ${evidence.file}`);
      nextLines.push(`${name}=`);
      nextLines.push('');
    }
  }

  while (nextLines.length > 0 && nextLines[nextLines.length - 1] === '') nextLines.pop();
  const output = nextLines.join('\n') + (nextLines.length > 0 ? '\n' : '');
  const changed = output !== existing;
  if (changed && !options.dryRun) await writeFile(filePath, output);

  return {
    changed,
    file: target,
    added: uniqueMissing,
    removed: [...remove],
    output
  };
}

