module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  extends: ['eslint:recommended', 'plugin:import/recommended', 'prettier'],
  plugins: ['import'],
  ignorePatterns: [
    'node_modules',
    'dist',
    'build',
    '**/prisma/migrations/**',
    '**/generated/**',
    '**/vitest.config.js',
    '**/vitest.integration.config.js',
  ],
  rules: {
    'no-restricted-properties': [
      'error',
      {
        object: 'process',
        property: 'env',
        message: 'Import config from src/config/env.js instead of reading process.env directly.',
      },
    ],
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'import/order': [
      'warn',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'always',
      },
    ],
  },
  overrides: [
    {
      files: ['apps/backend/src/config/env.js'],
      rules: {
        'no-restricted-properties': 'off',
      },
    },
    {
      files: ['**/*.test.js', '**/test/**/*.js'],
      env: {
        node: true,
      },
      rules: {
        'no-restricted-properties': 'off',
      },
    },
    {
      files: ['apps/frontend/**/*.{js,jsx}'],
      env: {
        browser: true,
        node: false,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      extends: ['plugin:react/recommended', 'plugin:react/jsx-runtime', 'plugin:react-hooks/recommended'],
      plugins: ['react', 'react-hooks'],
      settings: {
        react: { version: 'detect' },
      },
      rules: {
        // No `prop-types` package in this JS (non-TypeScript) project --
        // enforcing this rule would require adding it purely for lint
        // compliance, with no runtime or DX benefit at this project's size.
        'react/prop-types': 'off',
      },
    },
  ],
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx'],
      },
    },
  },
};
