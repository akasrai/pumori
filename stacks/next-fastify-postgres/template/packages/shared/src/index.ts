// Single source of truth for API contracts. Both apps/api and apps/web import from here.
// Add new resource schemas in their own file and re-export them below.
export * from './errors.ts';
export * from './auth.ts';
export * from './dev.ts';
