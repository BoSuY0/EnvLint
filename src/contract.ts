import type { EnvContract, EnvLintConfig, EnvReference, EnvVariableContract } from './types.js';
import { isPublicFrontendName, isSecretLikeName } from './utils.js';

export function buildEnvContract(references: EnvReference[], config: EnvLintConfig): EnvContract {
  const variables: Record<string, EnvVariableContract> = {};

  for (const ref of references) {
    const enriched: EnvReference = {
      ...ref,
      isSecretLike: ref.isSecretLike ?? isSecretLikeName(ref.name, config.frontend.secretNamePatterns),
      isPublicFrontend: ref.isPublicFrontend ?? isPublicFrontendName(ref.name, config.frontend.publicPrefixes)
    };
    const current = variables[enriched.name] ?? createVariable(enriched.name);
    current.references.push(enriched);
    variables[enriched.name] = current;
  }

  for (const variable of Object.values(variables)) {
    variable.codeReferences = variable.references.filter((ref) => ref.sourceType === 'code');
    variable.exampleReferences = variable.references.filter((ref) => ref.sourceType === 'env-file' && ref.envFileKind === 'example');
    variable.realEnvReferences = variable.references.filter((ref) => ref.sourceType === 'env-file' && ref.envFileKind === 'real');
    variable.deploymentReferences = variable.references.filter((ref) => ref.sourceType === 'deployment');
    variable.schemaReferences = variable.references.filter((ref) => ref.sourceType === 'schema');
    variable.required = [...variable.codeReferences, ...variable.schemaReferences].some((ref) => ref.accessType === 'required');
    variable.presentInExample = variable.exampleReferences.length > 0;
    variable.presentInDeployment = variable.deploymentReferences.length > 0;
    variable.presentInSchema = variable.schemaReferences.length > 0;
    variable.secretLike = variable.references.some((ref) => ref.isSecretLike) || isSecretLikeName(variable.name, config.frontend.secretNamePatterns);
    variable.publicFrontend = variable.references.some((ref) => ref.isPublicFrontend) || isPublicFrontendName(variable.name, config.frontend.publicPrefixes);
    variable.dynamic = variable.references.some((ref) => ref.accessType === 'dynamic');
  }

  return { variables };
}

function createVariable(name: string): EnvVariableContract {
  return {
    name,
    references: [],
    required: false,
    presentInExample: false,
    presentInDeployment: false,
    presentInSchema: false,
    secretLike: false,
    publicFrontend: false,
    dynamic: false,
    codeReferences: [],
    exampleReferences: [],
    realEnvReferences: [],
    deploymentReferences: [],
    schemaReferences: []
  };
}

