import base from '@jperezmart/eslint-config/base';
import repo from '../../eslint.repo.js';

export default [
  ...base,
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
