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
    ignores: ['dist/', 'node_modules/', 'eslint.config.js', 'tsdown.config.ts'],
  },
];
