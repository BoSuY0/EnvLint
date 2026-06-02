import { describe, expect, it } from 'vitest';
import { formatFindings } from '../src/reporters/index.js';
import type { EnvFinding, ScanResult } from '../src/types.js';
import { defaultConfig } from '../src/config.js';

const secretFinding: EnvFinding = {
  id: 'frontend-secret-exposure:NEXT_PUBLIC_API_SECRET:0',
  ruleId: 'frontend-secret-exposure',
  severity: 'error',
  variableName: 'NEXT_PUBLIC_API_SECRET',
  message: 'NEXT_PUBLIC_API_SECRET looks secret-like and is exposed through a public frontend prefix.',
  recommendation: 'Rename NEXT_PUBLIC_API_SECRET or remove the public frontend prefix.',
  evidence: [
    {
      name: 'NEXT_PUBLIC_API_SECRET',
      sourceType: 'code',
      file: 'src/client.ts',
      line: 1,
      column: 12,
      language: 'ts',
      accessType: 'required',
      confidence: 'high',
      isSecretLike: true,
      isPublicFrontend: true
    }
  ]
};

const result = {
  root: '.',
  config: { ...defaultConfig, report: { ...defaultConfig.report, redactSecretNames: true } },
  files: { codeFiles: [], envExampleFiles: [], realEnvFiles: [], deploymentFiles: [] },
  references: secretFinding.evidence,
  contract: { variables: {} },
  findings: [secretFinding],
  errors: []
} satisfies ScanResult;

describe('reporters', () => {
  it('redacts secret-like names when redactSecretNames is enabled', () => {
    const markdown = formatFindings([secretFinding], result, { format: 'markdown', redactSecretNames: true });
    const json = formatFindings([secretFinding], result, { format: 'json', redactSecretNames: true });

    expect(markdown).not.toContain('NEXT_PUBLIC_API_SECRET');
    expect(json).not.toContain('NEXT_PUBLIC_API_SECRET');
    expect(markdown).toContain('<redacted-secret-name>');
    expect(JSON.parse(json).findings[0].variableName).toBe('<redacted-secret-name>');
  });
});

