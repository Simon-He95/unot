// @ts-check
import antfu from '@antfu/eslint-config'

export default antfu(
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
      'perfectionist/sort-imports': 'off',
    },
  },
)
