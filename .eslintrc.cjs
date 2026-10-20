module.exports = {
  root: true,
  env: {
    es2022: true
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  extends: ['eslint:recommended'],
  ignorePatterns: [
    'node_modules/',
    '**/node_modules/',
    'dist/',
    '**/dist/',
    'build/',
    '**/build/',
    'coverage/',
    '**/coverage/',
    '*.min.js'
  ],
  rules: {
    'no-console': 'off',
    'no-empty': ['error', { allowEmptyCatch: true }],
    'no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }
    ]
  }
}
