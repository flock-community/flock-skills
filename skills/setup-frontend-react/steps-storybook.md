# Step 9: Install and Configure Storybook

Install Storybook with Vite builder:

```bash
npx storybook@latest init --builder vite --skip-install
npm install
```

Update `.storybook/main.ts`:

```typescript
import type { StorybookConfig } from '@storybook/react-vite'
import path from 'path'

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    '@chromatic-com/storybook',
    '@storybook/addon-vitest',
    '@storybook/addon-a11y',
    '@storybook/addon-docs',
    '@storybook/addon-onboarding',
  ],
  framework: '@storybook/react-vite',
  viteFinal: async (config) => {
    if (config.resolve) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@': path.resolve(__dirname, '../src'),
      }
    }
    return config
  },
}

export default config
```

Create `.storybook/preview.tsx`:

```tsx
import type { Preview } from '@storybook/react-vite'
import React from 'react'
import { ConfigProvider } from 'antd'
import { lightTheme } from '../src/theme'

import '../src/index.css'

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  decorators: [
    (Story) => (
      <ConfigProvider theme={lightTheme}>
        <Story />
      </ConfigProvider>
    ),
  ],
}

export default preview
```

Remove the default Storybook example stories:

```bash
rm -rf src/stories
```
