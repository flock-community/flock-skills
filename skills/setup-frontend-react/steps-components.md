# Step 12: Create Example UI Component with Storybook Story

Create `src/shared/ui/Button/Button.tsx`:

```tsx
import { Button as AntButton, ButtonProps as AntButtonProps } from 'antd'
import { useDesignTokens } from '@/theme'

export interface ButtonProps extends AntButtonProps {
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'danger'
}

/**
 * Button component that wraps Ant Design's Button with design tokens.
 */
export function Button({ variant = 'primary', style, ...props }: ButtonProps) {
  const { token } = useDesignTokens()

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {},
    secondary: {
      backgroundColor: token.colorBgContainer,
      borderColor: token.colorBorder,
      color: token.colorText,
    },
    danger: {
      backgroundColor: token.colorError,
      borderColor: token.colorError,
    },
  }

  return (
    <AntButton
      type={variant === 'primary' ? 'primary' : 'default'}
      danger={variant === 'danger'}
      style={{ ...variantStyles[variant], ...style }}
      {...props}
    />
  )
}
```

Create `src/shared/ui/Button/Button.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from './Button'

const meta: Meta<typeof Button> = {
  title: 'shared/ui/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'danger'],
    },
    size: {
      control: 'select',
      options: ['small', 'middle', 'large'],
    },
    disabled: {
      control: 'boolean',
    },
    loading: {
      control: 'boolean',
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = {
  args: {
    children: 'Primary Button',
    variant: 'primary',
  },
}

export const Secondary: Story = {
  args: {
    children: 'Secondary Button',
    variant: 'secondary',
  },
}

export const Danger: Story = {
  args: {
    children: 'Danger Button',
    variant: 'danger',
  },
}

export const Loading: Story = {
  args: {
    children: 'Loading Button',
    loading: true,
  },
}

export const Disabled: Story = {
  args: {
    children: 'Disabled Button',
    disabled: true,
  },
}

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <Button size="small">Small</Button>
      <Button size="middle">Middle</Button>
      <Button size="large">Large</Button>
    </div>
  ),
}
```

Create `src/shared/ui/Button/index.ts`:

```typescript
export { Button } from './Button'
export type { ButtonProps } from './Button'
```

Create `src/shared/ui/index.ts`:

```typescript
export * from './Button'
```
