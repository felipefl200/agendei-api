import js from '@eslint/js'
import prettierConfig from 'eslint-config-prettier'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import unusedImports from 'eslint-plugin-unused-imports'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: ['dist', 'node_modules', 'coverage'],
  },

  js.configs.recommended,

  ...tseslint.configs.recommendedTypeChecked,

  {
    files: ['src/**/*.ts'],

    languageOptions: {
      globals: {
        ...globals.node,
      },
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },

    plugins: {
      'simple-import-sort': simpleImportSort,
      'unused-imports': unusedImports,
    },

    rules: {
      /**
       * Imports
       */
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            // Node built-ins
            ['^node:'],

            // Packages
            ['^@?\\w'],

            // Aliases internos, caso você use depois: @/...
            ['^@/'],

            // Parent imports: ../
            ['^\\.\\.(?!/?$)', '^\\.\\./?$'],

            // Same-folder imports: ./
            ['^\\./(?=.*/)(?!/?$)', '^\\.(?!/?$)', '^\\./?$'],

            // Side-effect imports
            ['^\\u0000'],
          ],
        },
      ],
      'simple-import-sort/exports': 'error',

      /**
       * Imports não utilizados
       */
      'unused-imports/no-unused-imports': 'error',

      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      /**
       * TypeScript
       */
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'separate-type-imports',
        },
      ],

      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
    },
  },

  {
    files: ['src/shared/database/schema/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
    },
  },

  /**
   * Deve vir no final para desligar regras de formatação
   * que possam conflitar com o Prettier.
   */
  prettierConfig,
)
