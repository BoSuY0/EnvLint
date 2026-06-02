import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { collectSourceFiles } from './collector.js';
import { loadConfig } from './config.js';
import { buildEnvContract } from './contract.js';
import { extractEnvReferences } from './extractors/index.js';
import { parseDeploymentFile } from './parsers/deployment.js';
import { parseDotenv } from './parsers/dotenv.js';
import { evaluateRules } from './rules/index.js';
import type { EnvLintConfig, EnvReference, ScanResult } from './types.js';

export interface ScanConfigOverrides {
  files?: Pick<Partial<EnvLintConfig['files']>, 'readRealValues'>;
  report?: Pick<Partial<EnvLintConfig['report']>, 'redactSecretNames'>;
}

export interface ScanOptions {
  configPath?: string;
  configOverrides?: ScanConfigOverrides;
}

export async function scanProject(root = process.cwd(), options: ScanOptions = {}): Promise<ScanResult> {
  const resolvedRoot = path.resolve(root);
  const config = applyConfigOverrides(await loadConfig(resolvedRoot, options.configPath), options.configOverrides);
  const files = await collectSourceFiles(resolvedRoot, config);
  const references: EnvReference[] = [];
  const errors: string[] = [];

  for (const file of files.envExampleFiles) {
    await readAndCollect(resolvedRoot, file, errors, (content) =>
      references.push(
        ...parseDotenv(content, {
          filePath: file,
          kind: 'example',
          readValues: true
        }).references
      )
    );
  }

  for (const file of files.realEnvFiles) {
    await readAndCollect(resolvedRoot, file, errors, (content) =>
      references.push(
        ...parseDotenv(content, {
          filePath: file,
          kind: 'real',
          readValues: config.files.readRealValues
        }).references
      )
    );
  }

  for (const file of files.codeFiles) {
    await readAndCollect(resolvedRoot, file, errors, (content) => references.push(...extractEnvReferences(content, file)));
  }

  for (const file of files.deploymentFiles) {
    await readAndCollect(resolvedRoot, file, errors, (content) => references.push(...parseDeploymentFile(content, file)));
  }

  const contract = buildEnvContract(references, config);
  const findings = evaluateRules(contract, config);
  return {
    root: resolvedRoot,
    config,
    files,
    references,
    contract,
    findings,
    errors
  };
}

function applyConfigOverrides(config: EnvLintConfig, overrides?: ScanConfigOverrides): EnvLintConfig {
  if (!overrides) return config;
  return {
    ...config,
    files: {
      ...config.files,
      ...overrides.files
    },
    report: {
      ...config.report,
      ...overrides.report
    }
  };
}

async function readAndCollect(root: string, file: string, errors: string[], collect: (content: string) => void): Promise<void> {
  try {
    collect(await readFile(path.join(root, file), 'utf8'));
  } catch (error) {
    errors.push(`${file}: ${(error as Error).message}`);
  }
}
