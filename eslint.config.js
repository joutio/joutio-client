import js from '@eslint/js'
import pluginQuery from '@tanstack/eslint-plugin-query'
import tseslint from 'typescript-eslint'

/** Garde-fous de l'ADR 0001 (avenant 2026-11-22) : `react` et `@tanstack/react-query` seulement, aucune plateforme. */
export default tseslint.config(
  { ignores: ['dist', '*.cjs'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  pluginQuery.configs['flat/recommended'],
  {
    files: ['src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'react/*',
                'react-dom',
                'react-dom/*',
                'react-native',
                'react-native/*',
                'expo',
                'expo-*',
                'vite',
                'next',
                'next/*',
              ],
              message: 'Domaine partagé : ni plateforme ni renderer (ADR 0001).',
            },
            { group: ['@/*'], message: "Domaine autonome : aucun alias d'application." },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        'window',
        'document',
        'localStorage',
        'sessionStorage',
        'fetch',
        'navigator',
        'WebSocket',
      ],
    },
  },
  {
    // Le client HTTP et le transport temps réel viennent du runtime (`useJoutio`) : stables par nature, ils ne font pas
    // partie de la clé de cache. La règle `exhaustive-deps` les ignore.
    files: ['src/features/**/query/**', 'src/features/**/hooks/**', 'src/core/**/*.ts', 'src/sync/**/*.ts'],
    rules: {
      '@tanstack/query/exhaustive-deps': [
        'error',
        {
          allowlist: {
            types: ['HttpClient', 'RealtimeTransport', 'JoutioRuntime'],
            variables: ['http', 'realtime', 'clock'],
          },
        },
      ],
    },
  },
  {
    // Le socle ne connaît aucune feature : les dépendances vont des features vers `core`, jamais l'inverse.
    files: ['src/core/**/*.ts'],
    ignores: ['src/core/**/tests/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['**/features/**', '**/sync/**'], message: "core ne dépend d'aucune feature." },
            {
              group: [
                'react/*',
                'react-dom',
                'react-dom/*',
                'react-native',
                'react-native/*',
                'expo',
                'expo-*',
                'vite',
                'next',
                'next/*',
              ],
              message: 'Domaine partagé : ni plateforme ni renderer (ADR 0001).',
            },
            { group: ['@/*'], message: "Domaine autonome : aucun alias d'application." },
          ],
        },
      ],
    },
  },
)
