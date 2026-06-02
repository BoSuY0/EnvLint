import type { EnvContract, EnvFinding, EnvLintConfig, EnvReference, EnvVariableContract, RuleId, Severity } from '../types.js';
import { findingId } from '../utils.js';
import { ruleIdToConfigKey } from '../types.js';

interface RuleDefinition {
  id: RuleId;
  defaultSeverity: Severity;
  evaluate(contract: EnvContract, context: RuleContext): EnvFinding[];
}

interface RuleContext {
  config: EnvLintConfig;
}

const rules: RuleDefinition[] = [
  {
    id: 'missing-in-example',
    defaultSeverity: 'error',
    evaluate(contract, context) {
      return variables(contract)
        .filter((variable) => isRequiredByProduct(variable) && !variable.presentInExample && !isIgnored(variable.name, context.config))
        .map((variable, index) =>
          finding('missing-in-example', severityFor('missing-in-example', context.config, 'error'), variable.name, [
            ...variable.codeReferences,
            ...variable.schemaReferences
          ], `Add ${variable.name}= to the primary example env file.`, index, {
            type: 'add-to-example',
            file: context.config.files.examples[0] ?? '.env.example',
            patchPreview: `${variable.name}=`
          })
        );
    }
  },
  {
    id: 'unused-in-example',
    defaultSeverity: 'warn',
    evaluate(contract, context) {
      return variables(contract)
        .filter(
          (variable) =>
            variable.presentInExample &&
            variable.codeReferences.length === 0 &&
            variable.schemaReferences.length === 0 &&
            variable.deploymentReferences.length === 0 &&
            !isIgnored(variable.name, context.config)
        )
        .map((variable, index) =>
          finding(
            'unused-in-example',
            severityFor('unused-in-example', context.config, 'warn'),
            variable.name,
            variable.exampleReferences,
            `Remove ${variable.name} from example files if it is obsolete, or add an ignore entry if it is intentionally unused.`,
            index,
            {
              type: 'remove-from-example',
              file: variable.exampleReferences[0]?.file ?? context.config.files.examples[0] ?? '.env.example',
              patchPreview: `-${variable.name}=`
            }
          )
        );
    }
  },
  {
    id: 'missing-in-deployment',
    defaultSeverity: 'warn',
    evaluate(contract, context) {
      return variables(contract)
        .filter((variable) => isRequiredByProduct(variable) && !variable.presentInDeployment && !isIgnored(variable.name, context.config))
        .map((variable, index) =>
          finding(
            'missing-in-deployment',
            severityFor('missing-in-deployment', context.config, 'warn'),
            variable.name,
            [...variable.codeReferences, ...variable.schemaReferences],
            `Define ${variable.name} in deployment config or document why deployment injection is external.`,
            index
          )
        );
    }
  },
  {
    id: 'unsafe-default',
    defaultSeverity: 'error',
    evaluate(contract, context) {
      return variables(contract)
        .filter((variable) =>
          variable.references.some((ref) => ref.defaultValue && isUnsafeDefault(ref.defaultValue, context.config.production.unsafeDefaults))
        )
        .map((variable, index) =>
          finding(
            'unsafe-default',
            severityFor('unsafe-default', context.config, 'error'),
            variable.name,
            variable.references.filter((ref) => ref.defaultValue && isUnsafeDefault(ref.defaultValue, context.config.production.unsafeDefaults)),
            `Replace unsafe default for ${variable.name} with an empty placeholder or non-production-safe example.`,
            index
          )
        );
    }
  },
  {
    id: 'frontend-secret-exposure',
    defaultSeverity: 'error',
    evaluate(contract, context) {
      return variables(contract)
        .filter((variable) => variable.publicFrontend && variable.secretLike)
        .map((variable, index) =>
          finding(
            'frontend-secret-exposure',
            severityFor('frontend-secret-exposure', context.config, 'error'),
            variable.name,
            variable.references.filter((ref) => ref.isPublicFrontend || ref.isSecretLike),
            `Rename ${variable.name} or remove the public frontend prefix so secret-like data is not exposed to client bundles.`,
            index
          )
        );
    }
  },
  {
    id: 'required-without-validation',
    defaultSeverity: 'warn',
    evaluate(contract, context) {
      return variables(contract)
        .filter((variable) => variable.codeReferences.some((ref) => ref.accessType === 'required') && !variable.presentInSchema)
        .map((variable, index) =>
          finding(
            'required-without-validation',
            severityFor('required-without-validation', context.config, 'warn'),
            variable.name,
            variable.codeReferences.filter((ref) => ref.accessType === 'required'),
            `Add ${variable.name} to a runtime validation schema or mark it optional with a safe default.`,
            index
          )
        );
    }
  },
  {
    id: 'duplicate-definition',
    defaultSeverity: 'warn',
    evaluate(contract, context) {
      return variables(contract)
        .filter((variable) => {
          const values = new Set(variable.exampleReferences.map((ref) => ref.defaultValue).filter((value): value is string => value !== undefined));
          return values.size > 1;
        })
        .map((variable, index) =>
          finding(
            'duplicate-definition',
            severityFor('duplicate-definition', context.config, 'warn'),
            variable.name,
            variable.exampleReferences,
            `Unify conflicting example defaults for ${variable.name}.`,
            index
          )
        );
    }
  },
  {
    id: 'dynamic-access',
    defaultSeverity: 'warn',
    evaluate(contract, context) {
      return variables(contract)
        .filter((variable) => variable.dynamic)
        .map((variable, index) =>
          finding(
            'dynamic-access',
            severityFor('dynamic-access', context.config, 'warn'),
            variable.name,
            variable.references.filter((ref) => ref.accessType === 'dynamic'),
            'Static analysis cannot fully verify dynamic env access. Prefer explicit names or add a documented ignore.',
            index
          )
        );
    }
  },
  {
    id: 'invalid-name-format',
    defaultSeverity: 'warn',
    evaluate(contract, context) {
      return variables(contract)
        .filter((variable) => !variable.name.includes('[*]') && !/^[A-Z][A-Z0-9_]*$/.test(variable.name))
        .map((variable, index) =>
          finding(
            'invalid-name-format',
            severityFor('invalid-name-format', context.config, 'warn'),
            variable.name,
            variable.references,
            `Rename ${variable.name} to SCREAMING_SNAKE_CASE or configure a project-specific naming rule.`,
            index
          )
        );
    }
  },
  {
    id: 'missing-description-comment',
    defaultSeverity: 'info',
    evaluate(contract, context) {
      return variables(contract)
        .filter(
          (variable) =>
            variable.required &&
            variable.exampleReferences.length > 0 &&
            variable.exampleReferences.every((ref) => !ref.description)
        )
        .map((variable, index) =>
          finding(
            'missing-description-comment',
            severityFor('missing-description-comment', context.config, 'info'),
            variable.name,
            variable.exampleReferences,
            `Add a short comment above ${variable.name} explaining what sets it and whether it is required.`,
            index
          )
        );
    }
  },
  {
    id: 'name-mismatch',
    defaultSeverity: 'info',
    evaluate(contract, context) {
      const vars = variables(contract);
      const findings: EnvFinding[] = [];
      for (const variable of vars) {
        if (!isRequiredByProduct(variable) || variable.presentInExample) continue;
        const similar = vars.find((candidate) => candidate.presentInExample && candidate.name !== variable.name && similarName(candidate.name, variable.name));
        if (similar) {
          findings.push(
            finding(
              'name-mismatch',
              severityFor('name-mismatch', context.config, 'info'),
              variable.name,
              [...variable.references, ...similar.references],
              `Check whether ${variable.name} should match example variable ${similar.name}.`,
              findings.length,
              {
                type: 'rename-suggestion',
                file: similar.exampleReferences[0]?.file ?? context.config.files.examples[0] ?? '.env.example',
                patchPreview: `${similar.name} -> ${variable.name}`
              }
            )
          );
        }
      }
      return findings;
    }
  }
];

export function evaluateRules(contract: EnvContract, config: EnvLintConfig): EnvFinding[] {
  return rules.flatMap((rule) => {
    if (config.rules[ruleIdToConfigKey[rule.id]] === 'off') return [];
    return rule.evaluate(contract, { config }).filter((finding) => finding.severity !== 'info' || config.rules[ruleIdToConfigKey[finding.ruleId]] !== 'off');
  });
}

function variables(contract: EnvContract): EnvVariableContract[] {
  return Object.values(contract.variables);
}

function finding(
  ruleId: RuleId,
  severity: Severity,
  variableName: string,
  evidence: EnvReference[],
  recommendation: string,
  index: number,
  autofix?: EnvFinding['autofix']
): EnvFinding {
  return {
    id: findingId(ruleId, variableName, index),
    ruleId,
    severity,
    variableName,
    message: messageFor(ruleId, variableName),
    evidence,
    recommendation,
    autofix
  };
}

function messageFor(ruleId: RuleId, variableName: string): string {
  const messages: Record<RuleId, string> = {
    'missing-in-example': `${variableName} is used or validated but missing from env example files.`,
    'unused-in-example': `${variableName} is present in env example files but was not found in code, schemas, or deployment config.`,
    'missing-in-deployment': `${variableName} is required by the project but missing from deployment config.`,
    'dynamic-access': `${variableName} uses dynamic env access that cannot be fully verified statically.`,
    'unsafe-default': `${variableName} has an unsafe default for production contexts.`,
    'frontend-secret-exposure': `${variableName} looks secret-like and is exposed through a public frontend prefix.`,
    'required-without-validation': `${variableName} is read as required without a detected validation schema.`,
    'duplicate-definition': `${variableName} has conflicting defaults across env example files.`,
    'invalid-name-format': `${variableName} does not match the default env variable naming convention.`,
    'missing-description-comment': `${variableName} is required but lacks an explanatory comment in example files.`,
    'name-mismatch': `${variableName} is missing but a similar example variable exists.`
  };
  return messages[ruleId];
}

function severityFor(ruleId: RuleId, config: EnvLintConfig, fallback: Severity): Severity {
  const setting = config.rules[ruleIdToConfigKey[ruleId]];
  return setting === 'off' ? fallback : setting;
}

function isRequiredByProduct(variable: EnvVariableContract): boolean {
  return variable.codeReferences.length > 0 || variable.schemaReferences.some((ref) => ref.accessType === 'required');
}

function isIgnored(name: string, config: EnvLintConfig): boolean {
  return config.ignore.some((ignore) => !ignoreExpired(ignore.expires) && ignoreNameMatches(ignore.name, name));
}

function ignoreExpired(expires: string | undefined): boolean {
  if (!expires) return false;
  const expiresAt = Date.parse(`${expires}T23:59:59.999Z`);
  return Number.isFinite(expiresAt) && Date.now() > expiresAt;
}

function ignoreNameMatches(pattern: string, name: string): boolean {
  if (!pattern.includes('*') && !pattern.includes('?')) return pattern === name;
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.');
  return new RegExp(`^${escaped}$`).test(name);
}

function isUnsafeDefault(value: string, unsafeDefaults: string[]): boolean {
  const lower = value.toLowerCase();
  return unsafeDefaults.some((unsafe) => lower.includes(unsafe.toLowerCase()));
}

function similarName(a: string, b: string): boolean {
  const compactA = a.replace(/^(VITE_|NEXT_PUBLIC_|PUBLIC_)/, '').replace(/_/g, '');
  const compactB = b.replace(/^(VITE_|NEXT_PUBLIC_|PUBLIC_)/, '').replace(/_/g, '');
  if (compactA === compactB) return true;
  const tokensA = new Set(a.split('_'));
  const tokensB = new Set(b.split('_'));
  const overlap = [...tokensA].filter((token) => tokensB.has(token)).length;
  return overlap >= 2;
}
