import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // The API in server/ has its own ESLint config.
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts', 'design/**', 'server/**', 'playwright-report/**', 'test-results/**']),
]);
