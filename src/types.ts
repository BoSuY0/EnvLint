export type SourceType = 'code' | 'env-file' | 'deployment' | 'schema';
export type EnvLanguage = 'js' | 'ts' | 'python' | 'yaml' | 'dockerfile' | 'dotenv' | 'toml' | 'json' | 'unknown';
export type AccessType = 'required' | 'optional' | 'defaulted' | 'dynamic' | 'unknown';
export type Confidence = 'low' | 'medium' | 'high';
export type Severity = 'info' | 'warn' | 'error';
export type RuleSetting = Severity | 'off';
export type ReportFormat = 'table' | 'json' | 'markdown' | 'sarif' | 'junit';

export type RuleConfigKey =
  | 'missingInExample'
  | 'unusedInExample'
  | 'missingInDeployment'
  | 'dynamicAccess'
  | 'unsafeDefault'
  | 'frontendSecretExposure'
  | 'requiredWithoutValidation'
  | 'duplicateDefinition'
  | 'invalidNameFormat'
  | 'missingDescriptionComment'
  | 'nameMismatch';

export type RuleId =
  | 'missing-in-example'
  | 'unused-in-example'
  | 'missing-in-deployment'
  | 'dynamic-access'
  | 'unsafe-default'
  | 'frontend-secret-exposure'
  | 'required-without-validation'
  | 'duplicate-definition'
  | 'invalid-name-format'
  | 'missing-description-comment'
  | 'name-mismatch';

export const ruleIdToConfigKey: Record<RuleId, RuleConfigKey> = {
  'missing-in-example': 'missingInExample',
  'unused-in-example': 'unusedInExample',
  'missing-in-deployment': 'missingInDeployment',
  'dynamic-access': 'dynamicAccess',
  'unsafe-default': 'unsafeDefault',
  'frontend-secret-exposure': 'frontendSecretExposure',
  'required-without-validation': 'requiredWithoutValidation',
  'duplicate-definition': 'duplicateDefinition',
  'invalid-name-format': 'invalidNameFormat',
  'missing-description-comment': 'missingDescriptionComment',
  'name-mismatch': 'nameMismatch'
};

export interface EnvReference {
  name: string;
  sourceType: SourceType;
  file: string;
  line?: number;
  column?: number;
  language?: EnvLanguage;
  accessType?: AccessType;
  defaultValue?: string;
  isSecretLike?: boolean;
  isPublicFrontend?: boolean;
  confidence: Confidence;
  envFileKind?: 'example' | 'real';
  description?: string;
  valueWasRead?: boolean;
}

export interface EnvVariableContract {
  name: string;
  references: EnvReference[];
  required: boolean;
  presentInExample: boolean;
  presentInDeployment: boolean;
  presentInSchema: boolean;
  secretLike: boolean;
  publicFrontend: boolean;
  dynamic: boolean;
  codeReferences: EnvReference[];
  exampleReferences: EnvReference[];
  realEnvReferences: EnvReference[];
  deploymentReferences: EnvReference[];
  schemaReferences: EnvReference[];
}

export interface EnvContract {
  variables: Record<string, EnvVariableContract>;
}

export interface EnvFinding {
  id: string;
  ruleId: RuleId;
  severity: Severity;
  variableName: string;
  message: string;
  evidence: EnvReference[];
  recommendation: string;
  autofix?: {
    type: 'add-to-example' | 'remove-from-example' | 'rename-suggestion';
    file: string;
    patchPreview: string;
  };
}

export interface EnvLintConfig {
  version: 1;
  project: {
    type: 'auto' | 'node' | 'python' | 'mixed';
    root: string;
  };
  scan: {
    include: string[];
    exclude: string[];
  };
  files: {
    examples: string[];
    realEnv: string[];
    readRealValues: boolean;
    custom?: string[];
  };
  rules: Record<RuleConfigKey, RuleSetting>;
  frontend: {
    publicPrefixes: string[];
    secretNamePatterns: string[];
  };
  production: {
    contexts: string[];
    unsafeDefaults: string[];
  };
  ignore: Array<{
    name: string;
    reason?: string;
    expires?: string;
  }>;
  report: {
    format: ReportFormat;
    output?: string;
    redactSecretNames: boolean;
  };
}

export interface SourceFileSet {
  codeFiles: string[];
  envExampleFiles: string[];
  realEnvFiles: string[];
  deploymentFiles: string[];
}

export interface ScanResult {
  root: string;
  config: EnvLintConfig;
  files: SourceFileSet;
  references: EnvReference[];
  contract: EnvContract;
  findings: EnvFinding[];
  errors: string[];
}

export interface ReporterOptions {
  format: ReportFormat;
  redactSecretNames?: boolean;
}

export interface FixOptions {
  updateExample?: boolean;
  sort?: boolean;
  preserveComments?: boolean;
  removeUnused?: boolean;
  dryRun?: boolean;
}

export interface FixResult {
  changed: boolean;
  file: string;
  added: string[];
  removed: string[];
  output: string;
}

