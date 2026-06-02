# Examples

## Next.js

```ts
const publicApi = process.env.NEXT_PUBLIC_API_URL;
const secret = process.env.INTERNAL_SECRET;
```

```ts
// next.config.js
export default {
  env: {
    NEXT_PUBLIC_API_URL: 'https://api.example.com'
  }
};
```

EnvLint warns when secret-like names are exposed through `NEXT_PUBLIC_`.

## Vite

```ts
const api = import.meta.env.VITE_API_URL;
```

Public frontend prefixes are configurable.

## FastAPI

```py
import os
DATABASE_URL = os.environ["DATABASE_URL"]
```

Pydantic Settings classes are treated as schema references with medium confidence.

## Docker Compose

```yaml
services:
  api:
    environment:
      DATABASE_URL: postgres://db
```

Deployment keys are compared with code and example files.

## Kubernetes

```yaml
env:
  - name: DATABASE_URL
    valueFrom:
      secretKeyRef:
        name: db
        key: url
```
