import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineProject } from 'vitest/config';

// `@/…` resolves from the app root (apps/web/app, components, lib, hooks), like tsconfig `paths`.
const appRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineProject({
  esbuild: { jsx: 'automatic' },
  resolve: { alias: { '@': appRoot } },
  test: {
    name: 'web',
    include: ['test/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
  },
});
