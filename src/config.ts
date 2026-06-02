import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';
import { z } from 'zod';
import type { EnvLintConfig, ReportFormat, RuleConfigKey, RuleSetting } from './types.js';

const severitySchema = z.enum(['off', 'info', 'warn', 'error']);

const rawConfigSchema = z
  .object({
    version: z.literal(1).default(1),
    project: z
      .object({
        type: z.enum(['auto', 'node', 'python', 'mixed']).optional(),
        root: z.string().optional()
      })
      .optional(),
    scan: z
      .object({
        include: z.array(z.string()).optional(),
        exclude: z.array(z.string()).optional()
      })
      .optional(),
    files: z
      .object({
        examples: z.array(z.string()).optional(),
        realEnv: z.array(z.string()).optional(),
        readRealValues: z.boolean().optional(),
        custom: z.array(z.string()).optional()
      })
      .optional(),
    rules: z.record(z.string(), severitySchema).optional(),
    frontend: z
      .object({
        publicPrefixes: z.array(z.string()).optional(),
        secretNamePatterns: z.array(z.string()).optional()
      })
      .optional(),
    production: z
      .object({
        contexts: z.array(z.string()).optional(),
        unsafeDefaults: z.array(z.string()).optional()
      })
      .optional(),
    ignore: z
      .array(
        z.object({
          name: z.string(),
          reason: z.string().optional(),
          expires: z.string().optional()
        })
      )
      .optional(),
    report: z
      .object({
        format: z.enum(['table', 'json', 'markdown', 'sarif', 'junit']).optional(),
        output: z.string().optional(),
        redactSecretNames: z.boolean().optional()
      })
      .optional()
  })
  .passthrough();

export const defaultConfig: EnvLintConfig = {
  version: 1,
  project: {
    type: 'auto',
    root: '.'
  },
  scan: {
    include: [
      'src',
      'apps',
      'packages',
      'Dockerfile',
      'docker-compose.yml',
      'docker-compose.yaml',
      'k8s',
      '.github/workflows',
      'vercel.json',
      'netlify.toml'
    ],
    exclude: ['node_modules', 'dist', 'build', '.venv', 'coverage', '.git']
  },
  files: {
    examples: ['.env.example', '.env.sample', '.env.local.example', '.env.production.example'],
    realEnv: ['.env', '.env.local'],
    readRealValues: false
  },
  rules: {
    missingInExample: 'error',
    unusedInExample: 'warn',
    missingInDeployment: 'warn',
    dynamicAccess: 'warn',
    unsafeDefault: 'error',
    frontendSecretExposure: 'error',
    requiredWithoutValidation: 'warn',
    duplicateDefinition: 'warn',
    invalidNameFormat: 'warn',
    missingDescriptionComment: 'info',
    nameMismatch: 'info'
  },
  frontend: {
    publicPrefixes: ['VITE_', 'NEXT_PUBLIC_', 'PUBLIC_'],
    secretNamePatterns: ['SECRET', 'TOKEN', 'PRIVATE', 'PASSWORD', 'API_KEY']
  },
  production: {
    contexts: ['production', 'prod'],
    unsafeDefaults: ['localhost', 'changeme', 'password', 'admin', 'test']
  },
  ignore: [],
  report: {
    format: 'markdown',
    output: 'envlint-report.md',
    redactSecretNames: false
  }
};

export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function loadConfig(root: string, configPath?: string): Promise<EnvLintConfig> {
  const resolvedRoot = path.resolve(root);
  const resolvedConfigPath = configPath ? path.resolve(resolvedRoot, configPath) : path.join(resolvedRoot, 'envlint.config.yaml');
  const configExists = await pathExists(resolvedConfigPath);
  if (!configExists) {
    return {
      ...defaultConfig,
      project: { ...defaultConfig.project, root: resolvedRoot },
      scan: { ...defaultConfig.scan },
      files: { ...defaultConfig.files },
      rules: { ...defaultConfig.rules },
      frontend: { ...defaultConfig.frontend },
      production: { ...defaultConfig.production },
      ignore: [...defaultConfig.ignore],
      report: { ...defaultConfig.report }
    };
  }

  const raw = YAML.parse(await readFile(resolvedConfigPath, 'utf8')) ?? {};
  const parsed = rawConfigSchema.parse(raw);
  const rules = { ...defaultConfig.rules } as Record<RuleConfigKey, RuleSetting>;
  for (const [key, value] of Object.entries(parsed.rules ?? {})) {
    if (key in rules) rules[key as RuleConfigKey] = value;
  }

  return {
    version: 1,
    project: {
      type: parsed.project?.type ?? defaultConfig.project.type,
      root: path.resolve(resolvedRoot, parsed.project?.root ?? defaultConfig.project.root)
    },
    scan: {
      include: parsed.scan?.include ?? defaultConfig.scan.include,
      exclude: parsed.scan?.exclude ?? defaultConfig.scan.exclude
    },
    files: {
      examples: parsed.files?.examples ?? defaultConfig.files.examples,
      realEnv: parsed.files?.realEnv ?? defaultConfig.files.realEnv,
      readRealValues: parsed.files?.readRealValues ?? defaultConfig.files.readRealValues,
      custom: parsed.files?.custom
    },
    rules,
    frontend: {
      publicPrefixes: parsed.frontend?.publicPrefixes ?? defaultConfig.frontend.publicPrefixes,
      secretNamePatterns: parsed.frontend?.secretNamePatterns ?? defaultConfig.frontend.secretNamePatterns
    },
    production: {
      contexts: parsed.production?.contexts ?? defaultConfig.production.contexts,
      unsafeDefaults: parsed.production?.unsafeDefaults ?? defaultConfig.production.unsafeDefaults
    },
    ignore: parsed.ignore ?? [],
    report: {
      format: (parsed.report?.format ?? defaultConfig.report.format) as ReportFormat,
      output: parsed.report?.output ?? defaultConfig.report.output,
      redactSecretNames: parsed.report?.redactSecretNames ?? defaultConfig.report.redactSecretNames
    }
  };
}

export function renderDefaultConfig(): string {
  return YAML.stringify({
    version: 1,
    project: {
      type: 'auto',
      root: '.'
    },
    scan: defaultConfig.scan,
    files: defaultConfig.files,
    rules: defaultConfig.rules,
    frontend: defaultConfig.frontend,
    production: defaultConfig.production,
    ignore: [
      {
        name: 'OPTIONAL_DEBUG_FLAG',
        reason: 'Used only in local debugging',
        expires: '2026-12-31'
      }
    ],
    report: {
      format: 'markdown',
      output: 'envlint-report.md',
      redactSecretNames: false
    }
  });
}
