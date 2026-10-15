import react from '@jperezmart/eslint-config/react';
import repo from '../../eslint.repo.js';

export default [
  ...react,
  ...repo,
  {
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    ignores: [
      '.next/',
      'node_modules/',
      'eslint.config.js',
      'next.config.ts',
      'next-env.d.ts',
    ],
  },
];
