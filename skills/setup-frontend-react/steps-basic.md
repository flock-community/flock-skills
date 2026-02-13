# Steps 3-8: Basic Setup

## Step 3: Create Project with Vite

```bash
npm create vite@latest {project-name} -- --template react-ts
cd {target-directory}/{project-name}
npm install
```

## Step 4: Configure ESLint + Prettier

Install ESLint with TypeScript and React support:

```bash
npm install -D eslint @eslint/js typescript-eslint eslint-plugin-react-hooks eslint-plugin-react-refresh globals
npm install -D prettier eslint-config-prettier eslint-plugin-prettier
npm install -D eslint-plugin-boundaries
```

Create `eslint.config.js` with flat config format (ESLint 9+):

```javascript
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-plugin-prettier'
import prettierConfig from 'eslint-config-prettier'
import boundaries from 'eslint-plugin-boundaries'
import novacuria from './eslint-plugin-novacuria/index.js'

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'src/routeTree.gen.ts', 'eslint-plugin-novacuria', '.storybook'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.strictTypeChecked, prettierConfig],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      prettier: prettier,
      boundaries: boundaries,
      novacuria: novacuria,
    },
    settings: {
      'boundaries/elements': [
        { type: 'theme', pattern: 'src/theme/*' },
        { type: 'shared-ui', pattern: 'src/shared/ui/*' },
        { type: 'shared-lib', pattern: 'src/shared/lib/*' },
        { type: 'features', pattern: 'src/features/*' },
        { type: 'hooks', pattern: 'src/hooks/*' },
        { type: 'routes', pattern: 'src/routes/*' },
      ],
      'boundaries/ignore': ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'prettier/prettier': 'error',
      '@typescript-eslint/restrict-template-expressions': 'off',

      // Architecture boundary rules
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          rules: [
            { from: 'theme', allow: [] },
            { from: 'shared-lib', allow: [] },
            { from: 'shared-ui', allow: ['theme', 'shared-lib'] },
            { from: 'hooks', allow: ['theme', 'shared-lib'] },
            { from: 'features', allow: ['theme', 'shared-ui', 'shared-lib'] },
            { from: 'routes', allow: ['theme', 'shared-ui', 'shared-lib', 'features', 'hooks'] },
          ],
        },
      ],

      // Custom design token rules
      'novacuria/no-hardcoded-colors': 'error',
      'novacuria/no-hardcoded-fonts': 'error',
      'novacuria/no-hardcoded-spacing': 'warn',
    },
  },
  // Disable custom rules for theme token files (they ARE the source of truth)
  {
    files: ['src/theme/**/*.{ts,tsx}'],
    rules: {
      'novacuria/no-hardcoded-colors': 'off',
      'novacuria/no-hardcoded-fonts': 'off',
      'novacuria/no-hardcoded-spacing': 'off',
    },
  }
)
```

Create `.prettierrc`:

```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

Create `.prettierignore`:

```
dist
node_modules
src/routeTree.gen.ts
eslint-plugin-novacuria
```

## Step 5: Add npm Scripts

Update `package.json` scripts section:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "typecheck": "tsc --noEmit",
    "preview": "vite preview",
    "storybook": "storybook dev -p 6006",
    "storybook:build": "storybook build"
  }
}
```

## Step 6: Install TanStack Router + Query

```bash
npm install @tanstack/react-router @tanstack/react-query
npm install -D @tanstack/router-plugin @tanstack/router-devtools @tanstack/react-query-devtools
```

## Step 7: Configure Vite with TanStack Router Plugin and Path Aliases

Update `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    // TanStack Router plugin must be before react plugin
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

## Step 8: Install Ant Design

```bash
npm install antd @ant-design/icons
```
