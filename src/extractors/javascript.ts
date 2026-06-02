import { parse } from '@babel/parser';
import type { AccessType, EnvReference } from '../types.js';

type NodeLike = Record<string, unknown> & { type?: string; loc?: { start?: { line?: number; column?: number } } };

export function extractJavaScriptEnv(content: string, filePath: string): EnvReference[] {
  let ast: NodeLike;
  try {
    ast = parse(content, {
      sourceType: 'unambiguous',
      plugins: ['typescript', 'jsx', 'importMeta', 'decorators-legacy'],
      errorRecovery: true
    }) as unknown as NodeLike;
  } catch {
    return extractJavaScriptRegexFallback(content, filePath);
  }

  const refs: EnvReference[] = [];
  visit(ast, [], (node, stack) => {
    collectEnvMember(node, stack, refs, filePath);
    collectEnvCall(node, stack, refs, filePath);
    collectProcessEnvDestructure(node, refs, filePath);
    collectFrameworkEnvConfig(node, refs, filePath);
    collectSchemaProperty(node, stack, refs, filePath);
  });
  return dedupeRefs(refs);
}

function collectEnvMember(node: NodeLike, stack: NodeLike[], refs: EnvReference[], filePath: string): void {
  if (node.type !== 'MemberExpression' && node.type !== 'OptionalMemberExpression') return;
  const object = node.object as NodeLike | undefined;
  const property = node.property as NodeLike | undefined;
  if (!object || !property) return;

  if (isProcessEnv(object)) {
    const name = staticPropertyName(property);
    if (name) {
      addRef(refs, name, filePath, node, inferAccessType(stack, node));
    } else {
      addRef(refs, 'process.env[*]', filePath, node, 'dynamic', 'medium');
    }
    return;
  }

  if (isImportMetaEnv(object)) {
    const name = staticPropertyName(property);
    if (name) addRef(refs, name, filePath, node, inferAccessType(stack, node), 'high', true);
    else addRef(refs, 'import.meta.env[*]', filePath, node, 'dynamic', 'medium', true);
    return;
  }

  if (isDenoEnv(object) || isBunEnv(object)) {
    const name = staticPropertyName(property);
    if (name) addRef(refs, name, filePath, node, inferAccessType(stack, node));
  }
}

function collectEnvCall(node: NodeLike, stack: NodeLike[], refs: EnvReference[], filePath: string): void {
  if (node.type !== 'CallExpression' && node.type !== 'OptionalCallExpression') return;
  const callee = node.callee as NodeLike | undefined;
  const args = (node.arguments as NodeLike[] | undefined) ?? [];
  if (!callee || (callee.type !== 'MemberExpression' && callee.type !== 'OptionalMemberExpression')) return;
  const object = callee.object as NodeLike | undefined;
  const property = callee.property as NodeLike | undefined;
  if (!object || staticPropertyName(property) !== 'get') return;

  if (isDenoEnv(object)) {
    const name = literalString(args[0]);
    if (name) addRef(refs, name, filePath, node, args.length > 1 ? 'defaulted' : 'optional');
  }

  const parent = stack.at(-1);
  if (parent?.type === 'AwaitExpression') return;
}

function collectProcessEnvDestructure(node: NodeLike, refs: EnvReference[], filePath: string): void {
  if (node.type !== 'VariableDeclarator') return;
  const init = node.init as NodeLike | undefined;
  const id = node.id as NodeLike | undefined;
  if (!init || !id || !isProcessEnv(init) || id.type !== 'ObjectPattern') return;
  const properties = (id.properties as NodeLike[] | undefined) ?? [];
  for (const property of properties) {
    if (property.type !== 'ObjectProperty' && property.type !== 'Property') continue;
    const key = property.key as NodeLike | undefined;
    const name = staticPropertyName(key);
    if (name) addRef(refs, name, filePath, property, 'required');
  }
}

function collectFrameworkEnvConfig(node: NodeLike, refs: EnvReference[], filePath: string): void {
  if (!isFrameworkConfigFile(filePath)) return;
  if (node.type !== 'ObjectProperty' && node.type !== 'Property') return;
  const key = node.key as NodeLike | undefined;
  if (staticPropertyName(key) !== 'env') return;
  const value = node.value as NodeLike | undefined;
  if (value?.type !== 'ObjectExpression') return;

  const properties = (value.properties as NodeLike[] | undefined) ?? [];
  for (const property of properties) {
    if (property.type !== 'ObjectProperty' && property.type !== 'Property') continue;
    const name = staticPropertyName(property.key as NodeLike | undefined);
    if (!name || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) continue;
    const defaultValue = literalValueString(property.value as NodeLike | undefined);
    refs.push({
      name,
      sourceType: 'deployment',
      file: filePath,
      line: property.loc?.start?.line,
      column: property.loc?.start?.column,
      language: languageForPath(filePath),
      accessType: defaultValue === undefined ? 'unknown' : 'defaulted',
      defaultValue,
      confidence: 'high'
    });
  }
}

function collectSchemaProperty(node: NodeLike, stack: NodeLike[], refs: EnvReference[], filePath: string): void {
  if (node.type !== 'ObjectProperty' && node.type !== 'Property' && node.type !== 'ObjectMethod') return;
  const key = node.key as NodeLike | undefined;
  const name = staticPropertyName(key);
  if (!name || !/^[A-Z][A-Z0-9_]*$/.test(name)) return;
  if (!stack.some(isKnownSchemaCall)) return;
  const value = node.value as NodeLike | undefined;
  const accessType: AccessType = value && callHasDefault(value) ? 'defaulted' : 'required';
  refs.push({
    name,
    sourceType: 'schema',
    file: filePath,
    line: node.loc?.start?.line,
    column: node.loc?.start?.column,
    language: languageForPath(filePath),
    accessType,
    confidence: 'high'
  });
}

function isKnownSchemaCall(node: NodeLike): boolean {
  if (node.type !== 'CallExpression' && node.type !== 'OptionalCallExpression') return false;
  const name = expressionName(node.callee as NodeLike | undefined);
  return Boolean(name && /(^|\.)(cleanEnv|envsafe|createEnv|object)$/.test(name));
}

function callHasDefault(node: NodeLike): boolean {
  if (node.type !== 'CallExpression' && node.type !== 'OptionalCallExpression') return false;
  const args = (node.arguments as NodeLike[] | undefined) ?? [];
  return args.some((arg) => JSON.stringify(arg).includes('"default"'));
}

function addRef(
  refs: EnvReference[],
  name: string,
  filePath: string,
  node: NodeLike,
  accessType: AccessType,
  confidence: 'low' | 'medium' | 'high' = 'high',
  isPublicFrontend = false
): void {
  refs.push({
    name,
    sourceType: 'code',
    file: filePath,
    line: node.loc?.start?.line,
    column: node.loc?.start?.column,
    language: languageForPath(filePath),
    accessType,
    confidence,
    isPublicFrontend
  });
}

function inferAccessType(stack: NodeLike[], node: NodeLike): AccessType {
  const parent = stack.at(-1);
  if (parent && (parent.type === 'LogicalExpression' || parent.type === 'BinaryExpression')) {
    const left = parent.left as NodeLike | undefined;
    const op = parent.operator;
    if (left === node && (op === '??' || op === '||')) return 'defaulted';
  }
  return 'required';
}

function visit(node: NodeLike | undefined, stack: NodeLike[], cb: (node: NodeLike, stack: NodeLike[]) => void): void {
  if (!node || typeof node !== 'object') return;
  cb(node, stack);
  const nextStack = [...stack, node];
  for (const [key, value] of Object.entries(node)) {
    if (key === 'loc' || key === 'start' || key === 'end' || key === 'comments' || key === 'extra') continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item && typeof item === 'object' && 'type' in item) visit(item as NodeLike, nextStack, cb);
      }
    } else if (value && typeof value === 'object' && 'type' in value) {
      visit(value as NodeLike, nextStack, cb);
    }
  }
}

function isProcessEnv(node: NodeLike | undefined): boolean {
  if (!node || (node.type !== 'MemberExpression' && node.type !== 'OptionalMemberExpression')) return false;
  return expressionName(node) === 'process.env';
}

function isImportMetaEnv(node: NodeLike | undefined): boolean {
  return expressionName(node) === 'import.meta.env';
}

function isDenoEnv(node: NodeLike | undefined): boolean {
  return expressionName(node) === 'Deno.env';
}

function isBunEnv(node: NodeLike | undefined): boolean {
  return expressionName(node) === 'Bun.env';
}

function expressionName(node: NodeLike | undefined): string | undefined {
  if (!node) return undefined;
  if (node.type === 'Identifier') return node.name as string;
  if (node.type === 'ThisExpression') return 'this';
  if (node.type === 'MetaProperty') {
    const meta = node.meta as NodeLike | undefined;
    const property = node.property as NodeLike | undefined;
    return `${meta?.name as string}.${property?.name as string}`;
  }
  if (node.type === 'MemberExpression' || node.type === 'OptionalMemberExpression') {
    const object = expressionName(node.object as NodeLike | undefined);
    const property = staticPropertyName(node.property as NodeLike | undefined);
    return object && property ? `${object}.${property}` : undefined;
  }
  return undefined;
}

function staticPropertyName(node: NodeLike | undefined): string | undefined {
  if (!node) return undefined;
  if (node.type === 'Identifier') return node.name as string;
  return literalString(node);
}

function literalString(node: NodeLike | undefined): string | undefined {
  if (!node) return undefined;
  if (node.type === 'StringLiteral' || node.type === 'Literal') return node.value as string;
  if (node.type === 'TemplateLiteral') {
    const expressions = (node.expressions as unknown[] | undefined) ?? [];
    const quasis = (node.quasis as NodeLike[] | undefined) ?? [];
    if (expressions.length === 0) {
      return ((quasis[0]?.value as Record<string, unknown> | undefined)?.cooked as string | undefined) ?? undefined;
    }
  }
  return undefined;
}

function literalValueString(node: NodeLike | undefined): string | undefined {
  if (!node) return undefined;
  if (node.type === 'StringLiteral' || node.type === 'NumericLiteral' || node.type === 'BooleanLiteral' || node.type === 'Literal') {
    const value = node.value;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  }
  if (node.type === 'TemplateLiteral') return literalString(node);
  return undefined;
}

function languageForPath(filePath: string): 'js' | 'ts' {
  return /\.tsx?$/.test(filePath) ? 'ts' : 'js';
}

function isFrameworkConfigFile(filePath: string): boolean {
  return /(?:^|\/)(?:next|vite|nuxt|astro|svelte|remix)\.config\.[cm]?[jt]s$/.test(filePath);
}

function extractJavaScriptRegexFallback(content: string, filePath: string): EnvReference[] {
  const refs: EnvReference[] = [];
  const dynamicPatterns = [/process\.env\s*\[[^\]'"][^\]]*\]/g, /import\.meta\.env\s*\[[^\]'"][^\]]*\]/g];
  for (const pattern of dynamicPatterns) {
    for (const match of content.matchAll(pattern)) {
      refs.push({
        name: match[0].startsWith('import') ? 'import.meta.env[*]' : 'process.env[*]',
        sourceType: 'code',
        file: filePath,
        line: 1,
        column: match.index ?? 0,
        language: languageForPath(filePath),
        accessType: 'dynamic',
        confidence: 'low',
        isPublicFrontend: match[0].startsWith('import')
      });
    }
  }
  return refs;
}

function dedupeRefs(refs: EnvReference[]): EnvReference[] {
  const seen = new Set<string>();
  return refs.filter((ref) => {
    const key = `${ref.sourceType}:${ref.name}:${ref.file}:${ref.line ?? 0}:${ref.column ?? 0}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
