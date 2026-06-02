# Supported Languages And Frameworks

## JavaScript, TypeScript, Node, Deno, Bun

Detected with AST parsing where possible:

- `process.env.NAME`
- `process.env['NAME']`
- dynamic `process.env[prefix + name]`
- `import.meta.env.VITE_NAME`
- `Deno.env.get('NAME')`
- `Bun.env.NAME`
- destructuring from `process.env`
- schema-like object keys in `cleanEnv`, `envsafe`, `createEnv`, and `z.object`
- framework config `env` object keys in `next.config.*`, `vite.config.*`, `nuxt.config.*`, `astro.config.*`, `svelte.config.*`, and `remix.config.*`

## Python

Detected with Python `ast` when `python3` is available:

- `os.environ['NAME']`
- `os.environ.get('NAME')`
- `os.getenv('NAME')`
- dynamic `os.environ[name]`
- Pydantic Settings fields converted to likely env names with medium confidence

## Deployment Config

- Dockerfile `ARG` and `ENV`
- docker-compose `environment`
- Kubernetes `env`, ConfigMap, and Secret keys
- GitHub Actions `env`
- Vercel JSON `env`
- Netlify TOML environment sections
