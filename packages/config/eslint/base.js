// Shared ESLint config for Node/TypeScript packages (api, shared).
// Type-aware rules catch real bugs such as unhandled promises.
import js from '@eslint/js'
import security from 'eslint-plugin-security'
import globals from 'globals'
import tseslint from 'typescript-eslint'

/** @param {{ tsconfigRootDir: string }} options */
export function baseConfig({ tsconfigRootDir }) {
  return [
    { ignores: ['dist/**', 'coverage/**', 'node_modules/**', '*.config.*'] },
    js.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    security.configs.recommended,
    {
      languageOptions: {
        globals: globals.node,
        parserOptions: { projectService: true, tsconfigRootDir },
      },
      rules: {
        '@typescript-eslint/consistent-type-imports': 'error',
        '@typescript-eslint/no-floating-promises': 'error',
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      },
    },
  ]
}
