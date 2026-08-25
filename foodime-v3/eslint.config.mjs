import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  {
    ignores: ['.next/**', 'node_modules/**', 'public/**', 'playwright-report/**', 'test-results/**'],
  },
  ...compat.extends('next/core-web-vitals'),
  {
    rules: {
      // App Router carrega fontes no layout.tsx; a regra só faz sentido no Pages Router
      '@next/next/no-page-custom-font': 'off',
    },
  },
];

export default eslintConfig;
