module.exports = {
  env: {
    node: true, // Node.js global variables and Node.js scoping.
    es2021: true, // Adds all ECMAScript 2021 globals and automatically sets the `ecmaVersion` parser option to 12.
    'cypress/globals': true,
  },
  extends: [
    'eslint:recommended', // Use the recommended rules from ESLint
    'plugin:@typescript-eslint/recommended', // Use the recommended rules from the @typescript-eslint/eslint-plugin
    'plugin:prettier/recommended', // Enables eslint-plugin-prettier and eslint-config-prettier,
    'plugin:cypress/recommended',
  ],
  parser: '@typescript-eslint/parser', // Specifies the ESLint parser
  parserOptions: {
    ecmaVersion: 12, // Allows for the parsing of modern ECMAScript features
    sourceType: 'module', // Allows for the use of imports
    project: './tsconfig.json', // Specify the TypeScript config file
  },
  plugins: ['@typescript-eslint'],
  rules: {
    '@typescript-eslint/no-floating-promises': ['error'],
  },
};
