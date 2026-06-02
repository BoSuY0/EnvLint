import { spawnSync } from 'node:child_process';
import type { EnvReference } from '../types.js';

const pythonExtractorScript = String.raw`
import ast
import json
import sys
import textwrap

source = textwrap.dedent(sys.stdin.read())
file_path = sys.argv[1]
refs = []

def add(name, source_type, node, access_type, confidence='high'):
    refs.append({
        'name': name,
        'sourceType': source_type,
        'file': file_path,
        'line': getattr(node, 'lineno', None),
        'column': getattr(node, 'col_offset', None),
        'language': 'python',
        'accessType': access_type,
        'confidence': confidence,
    })

def literal_string(node):
    if isinstance(node, ast.Constant) and isinstance(node.value, str):
        return node.value
    ast_str = getattr(ast, 'Str', ())
    if ast_str and isinstance(node, ast_str):
        return node.s
    return None

def expr_name(node):
    if isinstance(node, ast.Name):
        return node.id
    if isinstance(node, ast.Attribute):
        base = expr_name(node.value)
        return f"{base}.{node.attr}" if base else node.attr
    return None

def field_to_env(name):
    out = []
    prev_lower = False
    for ch in name:
        if ch.isupper() and prev_lower:
            out.append('_')
        if ch.isalnum():
            out.append(ch.upper())
            prev_lower = ch.islower() or ch.isdigit()
        else:
            if out and out[-1] != '_':
                out.append('_')
            prev_lower = False
    return ''.join(out).strip('_')

class Visitor(ast.NodeVisitor):
    def visit_Call(self, node):
        callee = expr_name(node.func)
        if callee in ('os.getenv', 'environ.get', 'os.environ.get'):
            name = literal_string(node.args[0]) if node.args else None
            if name:
                add(name, 'code', node, 'defaulted' if len(node.args) > 1 or any(getattr(k, 'arg', None) == 'default' for k in node.keywords) else 'optional')
        self.generic_visit(node)

    def visit_Subscript(self, node):
        target = expr_name(node.value)
        if target in ('os.environ', 'environ'):
            name = literal_string(getattr(node, 'slice', None))
            if name:
                add(name, 'code', node, 'required')
            else:
                add('os.environ[*]', 'code', node, 'dynamic', 'medium')
        self.generic_visit(node)

    def visit_ClassDef(self, node):
        bases = {expr_name(base) for base in node.bases}
        if 'BaseSettings' in bases or 'pydantic.BaseSettings' in bases or 'pydantic_settings.BaseSettings' in bases:
            for stmt in node.body:
                if isinstance(stmt, ast.AnnAssign) and isinstance(stmt.target, ast.Name):
                    add(field_to_env(stmt.target.id), 'schema', stmt, 'defaulted' if stmt.value is not None else 'required', 'medium')
                elif isinstance(stmt, ast.Assign):
                    for target in stmt.targets:
                        if isinstance(target, ast.Name):
                            add(field_to_env(target.id), 'schema', stmt, 'defaulted', 'medium')
        self.generic_visit(node)

try:
    tree = ast.parse(source, filename=file_path)
    Visitor().visit(tree)
    print(json.dumps(refs))
except SyntaxError:
    print(json.dumps([]))
`;

export function extractPythonEnv(content: string, filePath: string): EnvReference[] {
  const result = spawnSync('python3', ['-c', pythonExtractorScript, filePath], {
    input: content,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024
  });
  if (result.status === 0 && result.stdout.trim()) {
    try {
      return JSON.parse(result.stdout) as EnvReference[];
    } catch {
      return extractPythonRegexFallback(content, filePath);
    }
  }
  return extractPythonRegexFallback(content, filePath);
}

function extractPythonRegexFallback(content: string, filePath: string): EnvReference[] {
  const refs: EnvReference[] = [];
  const patterns = [
    { regex: /os\.getenv\(\s*['"]([A-Za-z_][A-Za-z0-9_]*)['"]/g, accessType: 'optional' as const },
    { regex: /os\.environ\.get\(\s*['"]([A-Za-z_][A-Za-z0-9_]*)['"]/g, accessType: 'optional' as const },
    { regex: /os\.environ\[\s*['"]([A-Za-z_][A-Za-z0-9_]*)['"]\s*\]/g, accessType: 'required' as const },
    { regex: /os\.environ\[[^\]'"][^\]]*\]/g, accessType: 'dynamic' as const, name: 'os.environ[*]' }
  ];
  for (const pattern of patterns) {
    for (const match of content.matchAll(pattern.regex)) {
      refs.push({
        name: pattern.name ?? (match[1] as string),
        sourceType: 'code',
        file: filePath,
        line: 1,
        column: match.index ?? 0,
        language: 'python',
        accessType: pattern.accessType,
        confidence: pattern.accessType === 'dynamic' ? 'low' : 'medium'
      });
    }
  }
  return refs;
}
