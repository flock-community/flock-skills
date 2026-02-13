# Steps 14-23: Finalize Setup

## Step 14: Update TypeScript Config for Path Aliases

Update `tsconfig.app.json` to include path aliases:

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"]
}
```

## Step 15: Create Root Route with Theme

Create `src/routes/__root.tsx`:

```tsx
import { createRootRoute, Outlet, Link } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { ConfigProvider, Layout, Menu } from 'antd'
import { lightTheme } from '@/theme'

const { Header, Content } = Layout

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <ConfigProvider theme={lightTheme}>
      <Layout style={{ minHeight: '100vh' }}>
        <Header>
          <Menu
            theme="dark"
            mode="horizontal"
            selectable={false}
            items={[
              {
                key: 'home',
                label: <Link to="/">Home</Link>,
              },
            ]}
          />
        </Header>
        <Content style={{ padding: 24 }}>
          <Outlet />
        </Content>
      </Layout>
      <TanStackRouterDevtools position="bottom-right" />
    </ConfigProvider>
  )
}
```

## Step 16: Create Index Route

Create `src/routes/index.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { Typography, Card } from 'antd'

const { Title, Paragraph } = Typography

export const Route = createFileRoute('/')({
  component: HomeComponent,
})

function HomeComponent() {
  return (
    <Card>
      <Title>Welcome</Title>
      <Paragraph>Your React + Vite + TypeScript application is ready.</Paragraph>
    </Card>
  )
}
```

## Step 17: Create Main Entry Point

Replace `src/main.tsx`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

import { routeTree } from './routeTree.gen'

import './index.css'

const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
    },
  },
})

const rootElement = document.getElementById('root')
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </StrictMode>
  )
}
```

## Step 18: Update CSS

Replace `src/index.css` with minimal reset:

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family:
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    'Helvetica Neue',
    Arial,
    sans-serif;
}

#root {
  min-height: 100vh;
}
```

## Step 19: Clean Up Generated Files

Remove Vite default files that are no longer needed:

```bash
rm -f src/App.tsx src/App.css src/assets/react.svg public/vite.svg
```

## Step 20: Create CLAUDE.md

Create `CLAUDE.md` in the project root. See [templates/CLAUDE.md.template](templates/CLAUDE.md.template) for the content.

## Step 21: Create README.md

Create `README.md` in the project root. See [templates/README.md.template](templates/README.md.template) for the content.

## Step 22: Initialize Git Repository

```bash
cd {target-directory}/{project-name}
git init
```

Append to `.gitignore`:

```gitignore
### Environment ###
.env
.env.local
*.local

### Logs ###
*.log
logs/

### OS ###
.DS_Store
Thumbs.db

*storybook.log
storybook-static
```

Make initial commit:

```bash
git add .
git commit -m "Initial React + Vite + TypeScript setup with TanStack Router, TanStack Query, and Ant Design"
```

## Step 23: Verify Setup

Start the dev server to generate the route tree file:

```bash
npm run dev
```

Wait for the server to start and confirm `src/routeTree.gen.ts` is generated, then stop it (Ctrl+C).

Run typecheck and lint to confirm everything works:

```bash
npm run typecheck
npm run lint
```

Restart the dev server to verify the application runs:

```bash
npm run dev
```

The dev server should start and the application should be accessible at `http://localhost:5173`.
