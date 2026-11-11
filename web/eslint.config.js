import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

const uiLibs = [
  { name: 'react', message: 'This module must stay free of React and three.js.' },
  { name: 'react-dom', message: 'This module must stay free of React and three.js.' },
  { name: 'three', message: 'This module must stay free of React and three.js.' },
];
const uiPatterns = [
  {
    group: ['react/*', 'react-dom/*', 'three/*', '@react-three/*'],
    message: 'This module must stay free of React and three.js.',
  },
];
const pureRule = { 'no-restricted-imports': ['error', { paths: uiLibs, patterns: uiPatterns }] };

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { ecmaVersion: 2022, globals: { ...globals.browser } },
    plugins: { 'react-hooks': reactHooks },
    rules: { ...reactHooks.configs.recommended.rules },
  },
  {
    files: ['*.config.{js,ts}', 'plugins/**/*.ts', 'scripts/**/*.mjs'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: [
      'src/engine/**/*.{ts,tsx}',
      'src/state/machine.ts',
      'src/state/types.ts',
      'src/data/**/*.{ts,tsx}',
      'src/state/settingsStorage.ts',
    ],
    rules: pureRule,
  },
);
