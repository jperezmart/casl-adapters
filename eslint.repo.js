// Rules this repo adds on top of @jperezmart/eslint-config, shared by every
// package's eslint.config.js. They live here rather than in the shared config,
// which five repos adopt: a rule turned on there changes all of them.
export default [
  {
    rules: {
      // Two imports from one module; `import type` beside a value import is fine.
      'no-duplicate-imports': [
        'error',
        { includeExports: true, allowSeparateTypeImports: true },
      ],
    },
  },
];
