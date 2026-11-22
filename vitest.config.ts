import { defineConfig } from 'vitest/config'

/** Modules purs en environnement `node` ; les tests de hooks passent en jsdom via `// @vitest-environment jsdom` (ADR 0001, avenant 2026-11-22). */
export default defineConfig({ test: { environment: 'node', include: ['src/**/*.test.ts'] } })
