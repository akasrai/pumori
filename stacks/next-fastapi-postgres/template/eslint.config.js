// ESLint flat config. Architecture rules live here: a violation fails `./verify`.
import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import { defineConfig } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

const SHARED_ONLY = {
  group: ['@app/shared/*', '**/packages/shared/**'],
  message: "Import shared contracts from '@app/shared' (its public entry point) only.",
};

// no-restricted-syntax entries. ESLint replaces (not merges) a rule's options when a later block sets
// it again, so every block below lists the full set it needs.
const NO_ENUMS = { selector: 'TSEnumDeclaration', message: 'No enums: use an `as const` object plus a derived union type.' };
const NO_SPREAD_AND = {
  selector: "ObjectExpression > SpreadElement > LogicalExpression[operator='&&']",
  message: 'Spread conditionally with `...(cond ? obj : {})`, never `...(cond && obj)`.',
};
const NO_DEFAULT_EXPORT = { selector: 'ExportDefaultDeclaration', message: 'Named exports only (default exports only where a framework requires them).' };

// Raw Tailwind colour shades (bg-blue-500, text-gray-400) and hex colours (bg-[#fff], #1a2b3c) in class
// names, as in common team eslint configs. Use the semantic tokens from app/theme.css
// (bg-primary, text-muted-foreground, border-border, bg-success-subtle...): docs/design.md.
const RAW_COLOUR =
  '/\\b(?:text|bg|border|ring|fill|stroke|from|via|to|divide|outline|placeholder|shadow|decoration|accent|caret)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|black|white)(?:-\\d{2,3})?\\b|#[0-9a-fA-F]{3,8}\\b/';
const RAW_COLOUR_MESSAGE =
  'Use a semantic colour token (bg-primary, text-muted-foreground, bg-success-subtle, ...; docs/design.md) instead of a raw Tailwind shade or hex colour.';
const CLASS_STRINGS = [
  "JSXAttribute[name.name='className'] Literal",
  "JSXAttribute[name.name='className'] TemplateElement",
  // class helpers outside a className attribute (that case is covered above)
  "CallExpression[callee.name=/^(cn|cva|clsx)$/]:not(JSXAttribute[name.name='className'] *) Literal",
  "CallExpression[callee.name=/^(cn|cva|clsx)$/]:not(JSXAttribute[name.name='className'] *) TemplateElement",
];
const NO_RAW_COLOURS = CLASS_STRINGS.map((target) => ({
  selector: `${target}[${target.endsWith('Literal') ? 'value' : 'value.raw'}=${RAW_COLOUR}]`,
  message: RAW_COLOUR_MESSAGE,
}));
// Sleek design rules (docs/design.md § Never do): no heavy shadows outside the design system (cards and
// inputs have none; overlays get `shadow-popover` from components/ui), and no "AI sparkle" icons.
const HEAVY_SHADOW = '/\\bshadow-(?:lg|xl|2xl)\\b/';
const NO_HEAVY_SHADOWS = CLASS_STRINGS.map((target) => ({
  selector: `${target}[${target.endsWith('Literal') ? 'value' : 'value.raw'}=${HEAVY_SHADOW}]`,
  message: 'No heavy shadows (shadow-lg/xl/2xl): cards and inputs are flat with a hairline border; overlays get theirs from components/ui (docs/design.md).',
}));
const NO_SPARKLES = {
  name: 'lucide-react',
  importNames: ['Sparkle', 'SparkleIcon', 'Sparkles', 'SparklesIcon', 'LucideSparkle', 'LucideSparkles', 'WandSparkles', 'WandSparklesIcon', 'Wand2', 'Wand2Icon'],
  message: 'No decorative sparkle/"AI" icons (docs/design.md § Never do). Use an icon only where it adds meaning.',
};
const WEB_UI_ONLY_MESSAGE = 'Build UI from @/components/ui/* (the design system); only components/ui may use Radix, sonner and cva directly.';
const WEB_UI_ONLY_PATHS = [...['radix-ui', 'sonner', 'class-variance-authority'].map((name) => ({ name, message: WEB_UI_ONLY_MESSAGE })), NO_SPARKLES];
const WEB_UI_ONLY = { group: ['radix-ui/*', '@radix-ui/*'], message: WEB_UI_ONLY_MESSAGE };
// Playwright's getByLabel/getByText match substrings by default: getByLabel('Amount') also matches an
// 'Exact amounts' radio added later by another task, and the test breaks after merging (P3 v02).
const NO_LOOSE_LOCATORS = {
  selector: "CallExpression[callee.property.name=/^(getByLabel|getByText|getByPlaceholder)$/][arguments.length=1][arguments.0.type='Literal']",
  message: "Pass { exact: true } (or a regex anchored with ^...$): string locators match substrings, so another task's new label can make this one ambiguous.",
};
const WEB_ROUTE_FILES = 'apps/web/app/**/{page,layout,error,global-error,loading,not-found,template,default}.tsx';

export default defineConfig(
  {
    ignores: [
      '**/node_modules/**', '**/.next/**', '**/.next-e2e/**', '**/.next-release/**', '**/dist/**', '**/next-env.d.ts',
      'test-results/**', 'playwright-report/**', '.verify/**', '.run/**', 'apps/api/**',
      '.claude/**', '.pumori/**',
    ],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  // --- Team TypeScript rules (docs/coding-rules.md) --------------------------------------------------
  {
    plugins: { '@stylistic': stylistic },
    rules: {
      // arrow functions everywhere
      'func-style': ['error', 'expression'],
      'prefer-arrow-callback': 'error',
      // blank line before control flow and return
      '@stylistic/padding-line-between-statements': ['error', {
        blankLine: 'always', prev: '*', next: ['return', 'if', 'for', 'while', 'do', 'switch', 'throw', 'try'],
      }],
      // formatting the team gets from Prettier (singleQuote, semi)
      '@stylistic/quotes': ['error', 'single', { avoidEscape: true }],
      '@stylistic/semi': ['error', 'always'],
      // interfaces for object shapes, unions/derived types with `type`
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      '@typescript-eslint/ban-ts-comment': 'error',
      'no-nested-ternary': 'error',
      'no-restricted-syntax': ['error', NO_ENUMS, NO_SPREAD_AND, NO_DEFAULT_EXPORT],
    },
  },
  {
    // frameworks that require a default export
    files: ['**/*.config.{ts,js,mjs}', WEB_ROUTE_FILES, 'scripts/e2e-teardown.ts'],
    rules: { 'no-restricted-syntax': ['error', NO_ENUMS, NO_SPREAD_AND] },
  },
  // --- Design system: semantic colour tokens only (components/ui defines them) -------------
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    ignores: ['apps/web/components/ui/**', 'apps/web/**/*.config.ts'],
    rules: { 'no-restricted-syntax': ['error', NO_ENUMS, NO_SPREAD_AND, NO_DEFAULT_EXPORT, ...NO_RAW_COLOURS, ...NO_HEAVY_SHADOWS] },
  },
  {
    files: [WEB_ROUTE_FILES],
    rules: { 'no-restricted-syntax': ['error', NO_ENUMS, NO_SPREAD_AND, ...NO_RAW_COLOURS, ...NO_HEAVY_SHADOWS] },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/no-non-null-assertion': 'error',
      eqeqeq: ['error', 'smart'],
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['scripts/**'],
    rules: { 'no-console': 'off' },
  },
  // --- Architecture boundaries -------------------------------------------------------
  {
    files: ['apps/web/**'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'no-restricted-imports': ['error', {
        paths: WEB_UI_ONLY_PATHS,
        patterns: [
          SHARED_ONLY,
          {
            group: ['@app/api', '@app/api/*', '**/apps/api/**', '**/api/src/**', '**/api/scripts/**'],
            message: 'apps/web must not import apps/api. Put contracts in packages/shared.',
          },
          {
            group: ['pg', 'postgres', 'drizzle-orm', 'drizzle-orm/*'],
            message: 'Database access belongs in apps/api (Python) only.',
          },
          WEB_UI_ONLY,
        ],
      }],
    },
  },
  {
    // the design system itself wraps Radix, sonner and cva
    files: ['apps/web/components/ui/**'],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [NO_SPARKLES],
        patterns: [
          SHARED_ONLY,
          { group: ['@app/api', '@app/api/*', '**/apps/api/**'], message: 'apps/web must not import apps/api. Put contracts in packages/shared.' },
          { group: ['@/components/*', '!@/components/ui', '!@/components/ui/*'], message: 'components/ui is the base layer: it must not import feature components or the shell.' },
        ],
      }],
    },
  },
  {
    files: ['packages/shared/**'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['@app/api', '@app/web', '**/apps/**', 'next', 'next/*', 'react', 'react-dom'],
          message: 'packages/shared is framework-free: zod schemas and types only.',
        }],
      }],
    },
  },
  {
    files: ['e2e/**'],
    rules: {
      'no-restricted-syntax': ['error', NO_ENUMS, NO_SPREAD_AND, NO_DEFAULT_EXPORT, NO_LOOSE_LOCATORS],
      'no-restricted-imports': ['error', {
        patterns: [SHARED_ONLY, { group: ['**/apps/**'], message: 'e2e tests drive the UI; do not import app internals.' }],
      }],
    },
  },
  {
    // Page helpers only find things and act; assertions stay in the protected specs, so a UI change updates one
    // helper and can never weaken a test (helpers are not protected; the reviewer checks their diffs).
    files: ['e2e/support/**', 'apps/*/test/support/**'],
    rules: {
      'no-restricted-syntax': ['error', NO_ENUMS, NO_SPREAD_AND, NO_DEFAULT_EXPORT, NO_LOOSE_LOCATORS,
        { selector: "CallExpression[callee.name='expect']", message: 'No assertions in test helpers: return values or locators and assert in the spec.' }],
    },
  },
);
