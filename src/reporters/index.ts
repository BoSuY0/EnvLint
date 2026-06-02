import type { EnvFinding, ReporterOptions, ScanResult, Severity } from '../types.js';
import { escapeXml, severityRank } from '../utils.js';

export function formatFindings(findings: EnvFinding[], result: ScanResult, options: ReporterOptions): string {
  const secretNames = options.redactSecretNames ? collectSecretNames(findings, result) : new Set<string>();
  const printableFindings = options.redactSecretNames ? deepRedact(findings, secretNames) : findings;
  const printableResult = options.redactSecretNames ? deepRedact(result, secretNames) : result;
  const sorted = [...printableFindings].sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || a.variableName.localeCompare(b.variableName));
  switch (options.format) {
    case 'json':
      return formatJson(sorted, printableResult);
    case 'markdown':
      return formatMarkdown(sorted);
    case 'sarif':
      return formatSarif(sorted);
    case 'junit':
      return formatJunit(sorted);
    case 'table':
    default:
      return formatTable(sorted);
  }
}

const redactedSecretName = '<redacted-secret-name>';

function collectSecretNames(findings: EnvFinding[], result: ScanResult): Set<string> {
  const names = new Set<string>();
  for (const finding of findings) {
    if (isSecretLike(finding.variableName) || finding.evidence.some((ref) => ref.isSecretLike)) names.add(finding.variableName);
    for (const ref of finding.evidence) {
      if (ref.isSecretLike || isSecretLike(ref.name)) names.add(ref.name);
    }
  }
  for (const [name, variable] of Object.entries(result.contract.variables)) {
    if (variable.secretLike || isSecretLike(name)) names.add(name);
  }
  return names;
}

function deepRedact<T>(value: T, names: Set<string>): T {
  if (typeof value === 'string') return redactString(value, names) as T;
  if (Array.isArray(value)) return value.map((item) => deepRedact(item, names)) as T;
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [redactString(key, names), deepRedact(entry, names)])
  ) as T;
}

function redactString(value: string, names: Set<string>): string {
  let redacted = value;
  for (const name of names) {
    if (!name) continue;
    redacted = redacted.split(name).join(redactedSecretName);
  }
  return redacted;
}

function isSecretLike(name: string): boolean {
  return /SECRET|TOKEN|PRIVATE|PASSWORD|API_KEY/i.test(name);
}

export function summarizeFindings(findings: EnvFinding[]): Record<Severity, number> {
  return findings.reduce(
    (summary, finding) => {
      summary[finding.severity] += 1;
      return summary;
    },
    { error: 0, warn: 0, info: 0 } as Record<Severity, number>
  );
}

function formatTable(findings: EnvFinding[]): string {
  const summary = summarizeFindings(findings);
  const rows = findings.map((finding) => [
    finding.severity.toUpperCase(),
    finding.variableName,
    finding.message,
    finding.evidence[0] ? `${finding.evidence[0].file}:${finding.evidence[0].line ?? 1}` : ''
  ]);
  const widths = [7, 24, 72, 32];
  const header = `EnvLint: ${findings.length} findings (Errors: ${summary.error}, Warnings: ${summary.warn}, Info: ${summary.info})`;
  if (rows.length === 0) return `${header}\nNo findings.`;
  return [
    header,
    ...rows.map((row) =>
      row
        .map((cell, index) => {
          const text = cell.length > widths[index]! ? `${cell.slice(0, widths[index]! - 1)}…` : cell;
          return text.padEnd(widths[index]!);
        })
        .join('  ')
        .trimEnd()
    ),
    '',
    'Run: envlint explain <VARIABLE>'
  ].join('\n');
}

function formatJson(findings: EnvFinding[], result: ScanResult): string {
  return JSON.stringify(
    {
      status: findings.some((finding) => finding.severity === 'error') ? 'failed' : 'passed',
      summary: summarizeFindings(findings),
      files: result.files,
      findings,
      variables: result.contract.variables,
      errors: result.errors
    },
    null,
    2
  );
}

function formatMarkdown(findings: EnvFinding[]): string {
  const summary = summarizeFindings(findings);
  const lines = ['## EnvLint Report', '', `Status: ${summary.error > 0 ? 'Failed' : 'Passed'}`, `Errors: ${summary.error} - Warnings: ${summary.warn} - Info: ${summary.info}`, ''];
  for (const severity of ['error', 'warn', 'info'] as const) {
    const group = findings.filter((finding) => finding.severity === severity);
    if (group.length === 0) continue;
    lines.push(`### ${severity === 'error' ? 'Errors' : severity === 'warn' ? 'Warnings' : 'Info'}`);
    for (const finding of group) {
      lines.push(`- \`${finding.variableName}\`: ${finding.message}`);
    }
    lines.push('');
  }
  const fixes = findings.filter((finding) => finding.autofix);
  if (fixes.length > 0) {
    lines.push('### Suggested fixes');
    for (const finding of fixes) lines.push(`- ${finding.recommendation}`);
    lines.push('');
  }
  return lines.join('\n').trimEnd() + '\n';
}

function formatSarif(findings: EnvFinding[]): string {
  const rules = [...new Map(findings.map((finding) => [finding.ruleId, finding])).values()].map((finding) => ({
    id: finding.ruleId,
    shortDescription: { text: finding.ruleId },
    defaultConfiguration: { level: sarifLevel(finding.severity) }
  }));
  return JSON.stringify(
    {
      version: '2.1.0',
      $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
      runs: [
        {
          tool: {
            driver: {
              name: 'EnvLint',
              informationUri: 'https://github.com/envlint/envlint',
              rules
            }
          },
          results: findings.map((finding) => ({
            ruleId: finding.ruleId,
            level: sarifLevel(finding.severity),
            message: { text: finding.message },
            locations: finding.evidence.slice(0, 1).map((ref) => ({
              physicalLocation: {
                artifactLocation: { uri: ref.file },
                region: {
                  startLine: ref.line ?? 1,
                  startColumn: (ref.column ?? 0) + 1
                }
              }
            }))
          }))
        }
      ]
    },
    null,
    2
  );
}

function sarifLevel(severity: Severity): 'error' | 'warning' | 'note' {
  return severity === 'error' ? 'error' : severity === 'warn' ? 'warning' : 'note';
}

function formatJunit(findings: EnvFinding[]): string {
  const failures = findings.filter((finding) => finding.severity === 'error');
  const cases = findings
    .map((finding) => {
      const body =
        finding.severity === 'error'
          ? `<failure message="${escapeXml(finding.message)}">${escapeXml(finding.recommendation)}</failure>`
          : finding.severity === 'warn'
            ? `<system-out>${escapeXml(finding.message)}</system-out>`
            : '';
      return `<testcase classname="EnvLint.${escapeXml(finding.ruleId)}" name="${escapeXml(finding.variableName)}">${body}</testcase>`;
    })
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?><testsuite name="EnvLint" tests="${findings.length}" failures="${failures.length}">${cases}</testsuite>`;
}
