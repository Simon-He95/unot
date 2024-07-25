// @ts-check
const antfu = require('@antfu/eslint-config').default

module.exports = antfu(
  {
    ignores: [
      // eslint ignore globs here
      'media',
    ],
  },
  {
    rules: {
      // overrides
      'ts/no-var-requires': 'off',
      'ts/no-require-imports': 'off',
      'style/max-statements-per-line': 'off',
      'import/no-mutable-exports': 'off',
      'no-console': 'off',
      'unused-imports/no-unused-vars': 'off',
      'regexp/no-empty-alternative': 'off',
      'regexp/no-super-linear-backtracking': 'off',
      'regexp/no-dupe-disjunctions': 'off',
    },
  },
)
