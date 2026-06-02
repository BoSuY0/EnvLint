#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Command } from 'commander';
import { loadConfig, pathExists, renderDefaultConfig } from './config.js';
import { filterFindingsForGitDiff } from './diff.js';
import { updateEnvExample } from './fixer.js';
import { formatFindings } from './reporters/index.js';
import { scanProject } from './scan.js';
import { generateSchemaFromEnvFile, type SchemaFormat } from './schema.js';
import type { ReportFormat } from './types.js';

const program = new Command();

program.name('envlint').description('Static environment variable contract linter.').version('1.0.0');

program
  .command('init')
  .description('Create envlint.config.yaml')
  .option('--force', 'overwrite an existing config')
  .action(async (options: { force?: boolean }) => {
    const target = path.resolve(process.cwd(), 'envlint.config.yaml');
    if ((await pathExists(target)) && !options.force) {
      console.error('envlint.config.yaml already exists. Use --force to overwrite.');
      process.exitCode = 1;
      return;
    }
    await writeFile(target, renderDefaultConfig());
    console.log('Created envlint.config.yaml');
  });

program
  .command('scan')
  .description('Scan a project for env contract findings')
  .argument('[path]', 'project path', '.')
  .option('--config <path>', 'config file path')
  .option('--format <format>', 'table|json|markdown|sarif|junit')
  .option('--output <path>', 'write report to a file')
  .option('--strict', 'exit non-zero on warnings or errors')
  .option('--ci', 'exit non-zero on errors')
  .option('--allow-read-values', 'read values from real env files for local policy checks; reports redact those values')
  .option('--redact-secret-names', 'redact secret-like variable names in reports')
  .action(
    async (
      targetPath: string,
      options: {
        config?: string;
        format?: ReportFormat;
        output?: string;
        strict?: boolean;
        ci?: boolean;
        allowReadValues?: boolean;
        redactSecretNames?: boolean;
      }
    ) => {
      const result = await scanProject(targetPath, {
        configPath: options.config,
        configOverrides: {
          files: options.allowReadValues ? { readRealValues: true } : undefined,
          report: options.redactSecretNames ? { redactSecretNames: true } : undefined
        }
      });
      const format = options.format ?? result.config.report.format;
      const output = formatFindings(result.findings, result, {
        format,
        redactSecretNames: result.config.report.redactSecretNames
      });
      await writeOrPrint(output, options.output ?? (options.format ? undefined : result.config.report.output));
      if (options.strict && result.findings.some((finding) => finding.severity === 'warn' || finding.severity === 'error')) process.exitCode = 1;
      if (options.ci && result.findings.some((finding) => finding.severity === 'error')) process.exitCode = 1;
    }
  );

program
  .command('fix')
  .description('Safely update env example files')
  .argument('[path]', 'project path', '.')
  .option('--config <path>', 'config file path')
  .option('--update-example', 'update the primary env example file')
  .option('--sort', 'sort added keys')
  .option('--preserve-comments', 'add comments for new keys')
  .option('--remove-unused', 'remove unused vars from examples')
  .option('--dry-run', 'print the generated file without writing')
  .action(
    async (
      targetPath: string,
      options: {
        config?: string;
        updateExample?: boolean;
        sort?: boolean;
        preserveComments?: boolean;
        removeUnused?: boolean;
        dryRun?: boolean;
      }
    ) => {
      if (!options.updateExample) {
        console.error('Use --update-example to modify env example files.');
        process.exitCode = 1;
        return;
      }
      const result = await scanProject(targetPath, { configPath: options.config });
      const fix = await updateEnvExample(path.resolve(targetPath), result, {
        updateExample: options.updateExample,
        sort: options.sort,
        preserveComments: options.preserveComments,
        removeUnused: options.removeUnused,
        dryRun: options.dryRun
      });
      if (options.dryRun) console.log(fix.output);
      else console.log(fix.changed ? `Updated ${fix.file}: added ${fix.added.length}, removed ${fix.removed.length}` : `${fix.file} already up to date`);
    }
  );

program
  .command('explain')
  .description('Explain where an env var was found and which rules affect it')
  .argument('<variable>', 'env variable name')
  .argument('[path]', 'project path', '.')
  .option('--config <path>', 'config file path')
  .action(async (variable: string, targetPath: string, options: { config?: string }) => {
    const result = await scanProject(targetPath, { configPath: options.config });
    const contract = result.contract.variables[variable];
    if (!contract) {
      console.log(`${variable} was not found.`);
      return;
    }
    console.log(`${variable}`);
    for (const ref of contract.references) {
      console.log(`- ${ref.sourceType} ${ref.accessType ?? 'unknown'} ${ref.file}:${ref.line ?? 1}`);
    }
    const findings = result.findings.filter((finding) => finding.variableName === variable);
    if (findings.length > 0) {
      console.log('\nFindings:');
      for (const finding of findings) console.log(`- ${finding.severity.toUpperCase()} ${finding.ruleId}: ${finding.message}`);
    }
  });

program
  .command('schema')
  .description('Generate a starter runtime validation schema from an env example file')
  .option('--from <path>', 'source env example file', '.env.example')
  .option('--format <format>', 'zod|json-schema|pydantic', 'zod')
  .option('--output <path>', 'write generated schema to a file')
  .action(async (options: { from: string; format: SchemaFormat; output?: string }) => {
    const content = await readFile(path.resolve(process.cwd(), options.from), 'utf8');
    const schema = generateSchemaFromEnvFile(content, { format: options.format, sourcePath: options.from });
    if (options.output) await writeFile(path.resolve(process.cwd(), options.output), schema);
    else console.log(schema);
  });

program
  .command('diff')
  .description('Show findings whose evidence is in files changed between two git refs')
  .argument('[path]', 'project path', '.')
  .option('--base <ref>', 'base git ref', 'origin/main')
  .option('--head <ref>', 'head git ref', 'HEAD')
  .option('--config <path>', 'config file path')
  .option('--format <format>', 'table|json|markdown|sarif|junit', 'table')
  .action(async (targetPath: string, options: { base: string; head: string; config?: string; format: ReportFormat }) => {
    const result = await scanProject(targetPath, { configPath: options.config });
    const findings = filterFindingsForGitDiff(result, options.base, options.head);
    console.log(formatFindings(findings, result, { format: options.format }));
  });

await program.parseAsync(process.argv);

async function writeOrPrint(content: string, outputPath: string | undefined): Promise<void> {
  if (!outputPath) {
    console.log(content);
    return;
  }
  await writeFile(path.resolve(process.cwd(), outputPath), content);
  console.log(`Wrote ${outputPath}`);
}
