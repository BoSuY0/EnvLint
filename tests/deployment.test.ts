import { describe, expect, it } from 'vitest';
import { parseDeploymentFile } from '../src/parsers/deployment.js';

describe('deployment parsers', () => {
  it('detects Dockerfile ARG and ENV keys', () => {
    const refs = parseDeploymentFile('ARG DATABASE_URL\nENV NODE_ENV=production JWT_SECRET=placeholder\n', 'Dockerfile');

    expect(refs.map((ref) => ref.name).sort()).toEqual(['DATABASE_URL', 'JWT_SECRET', 'NODE_ENV']);
  });

  it('preserves defaults from Dockerfile legacy ENV key value syntax', () => {
    const refs = parseDeploymentFile('ENV NODE_ENV production\n', 'Dockerfile');

    expect(refs[0]).toMatchObject({
      name: 'NODE_ENV',
      accessType: 'defaulted',
      defaultValue: 'production'
    });
  });

  it('detects compose, Kubernetes, and GitHub Actions env keys from YAML', () => {
    const composeRefs = parseDeploymentFile(
      `
services:
  api:
    environment:
      DATABASE_URL: postgres://db
      REDIS_URL: redis://redis
      `,
      'docker-compose.yml'
    );
    const k8sRefs = parseDeploymentFile(
      `
kind: Deployment
spec:
  template:
    spec:
      containers:
        - name: api
          env:
            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: jwt
                  key: token
---
kind: ConfigMap
data:
  FEATURE_FLAG: "true"
      `,
      'k8s/deployment.yaml'
    );
    const ghaRefs = parseDeploymentFile(
      `
name: ci
env:
  DATABASE_URL: postgres://ci
jobs:
  test:
    env:
      JWT_SECRET: test
      `,
      '.github/workflows/ci.yml'
    );

    expect(composeRefs.map((ref) => ref.name).sort()).toEqual(['DATABASE_URL', 'REDIS_URL']);
    expect(k8sRefs.map((ref) => ref.name).sort()).toEqual(['FEATURE_FLAG', 'JWT_SECRET']);
    expect(ghaRefs.map((ref) => ref.name).sort()).toEqual(['DATABASE_URL', 'JWT_SECRET']);
  });
});
