const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  {
    ignores: ['node_modules/**', '.tmp/**', 'coverage/**'],
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        sails: 'readonly',
        User: 'readonly',
        ExpenseCategory: 'readonly',
        ExpenseSource: 'readonly',
        Expense: 'readonly',
        Group: 'readonly',
        GroupInvite: 'readonly',
        GroupMember: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
    },
  },
];
