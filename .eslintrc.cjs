module.exports = {
  root: true,
  overrides: [
    {
      files: ['frontend/**/*.{js,jsx,ts,tsx}'],
      env: {
        browser: true,
        es2021: true,
        node: true,
      },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      plugins: ['react', 'react-hooks'],
      extends: [
        'eslint:recommended',
        'plugin:react/recommended',
        'plugin:react-hooks/recommended',
        'prettier',
      ],
      settings: {
        react: {
          version: 'detect',
        },
      },
      rules: {
        'react/react-in-jsx-scope': 'off',
        'react/prop-types': 'off',
        'no-empty': 'off',
        'no-irregular-whitespace': 'off',
      },
    },
    {
      files: ['backend/**/*.{js,ts}'],
      env: {
        node: true,
        es2021: true,
      },
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      plugins: ['@typescript-eslint'],
      extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'prettier',
      ],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        'prefer-const': 'off',
      },
    },
  ],
};
