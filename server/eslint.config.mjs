import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['node_modules/**', 'drizzle/**', '.data/**', '.vercel/**'] },
  ...tseslint.configs.recommended,
  {
    rules: {
      // Express finds an error handler by its four arguments, used or not.
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
);
