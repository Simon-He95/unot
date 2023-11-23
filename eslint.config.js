const simon_he = require('@simon_he/eslint-config').default

module.exports = simon_he({
  ignores: ['src/search.ts', 'test'],
}, {
  rules: {
    'no-eval': 'off',
    'ts/no-require-imports': 'off',
    'ts/no-var-requires': 'off',
    'import/no-mutable-exports': 'off',
  },
})
