# Steps 10-11: Architecture & Design Tokens

## Step 10: Create Project Structure

Create the following directory structure with architecture layers:

```
{project-name}/
├── .storybook/
│   ├── main.ts
│   └── preview.tsx
├── src/
│   ├── theme/
│   │   ├── index.ts
│   │   ├── config.ts
│   │   ├── tokens/
│   │   │   ├── colors.ts
│   │   │   ├── typography.ts
│   │   │   ├── spacing.ts
│   │   │   └── index.ts
│   │   └── hooks/
│   │       └── useDesignTokens.ts
│   ├── shared/
│   │   ├── ui/
│   │   │   ├── Button/
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Button.stories.tsx
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   └── lib/
│   │       └── .gitkeep
│   ├── features/
│   │   └── .gitkeep
│   ├── hooks/
│   │   └── .gitkeep
│   ├── routes/
│   │   ├── __root.tsx
│   │   └── index.tsx
│   └── main.tsx
├── eslint-plugin-novacuria/
│   ├── index.js
│   └── rules/
│       ├── no-hardcoded-colors.js
│       ├── no-hardcoded-fonts.js
│       └── no-hardcoded-spacing.js
└── ...config files
```

## Step 11: Create Design Token System

Create `src/theme/tokens/colors.ts`:

```typescript
/**
 * Semantic color tokens extending Ant Design's color system.
 * Use these via useDesignTokens() hook - never hardcode colors.
 */
export const colorTokens = {
  // Primary brand colors
  colorPrimary: '#1677ff',
  colorPrimaryHover: '#4096ff',
  colorPrimaryActive: '#0958d9',
  colorPrimaryBg: '#e6f4ff',

  // Success colors
  colorSuccess: '#52c41a',
  colorSuccessHover: '#73d13d',
  colorSuccessActive: '#389e0d',
  colorSuccessBg: '#f6ffed',

  // Warning colors
  colorWarning: '#faad14',
  colorWarningHover: '#ffc53d',
  colorWarningActive: '#d48806',
  colorWarningBg: '#fffbe6',

  // Error colors
  colorError: '#ff4d4f',
  colorErrorHover: '#ff7875',
  colorErrorActive: '#d9363e',
  colorErrorBg: '#fff2f0',

  // Neutral colors
  colorText: 'rgba(0, 0, 0, 0.88)',
  colorTextSecondary: 'rgba(0, 0, 0, 0.65)',
  colorTextTertiary: 'rgba(0, 0, 0, 0.45)',
  colorTextDisabled: 'rgba(0, 0, 0, 0.25)',

  // Background colors
  colorBgContainer: '#ffffff',
  colorBgElevated: '#ffffff',
  colorBgLayout: '#f5f5f5',
  colorBgSpotlight: 'rgba(0, 0, 0, 0.85)',

  // Border colors
  colorBorder: '#d9d9d9',
  colorBorderSecondary: '#f0f0f0',
} as const

export type ColorToken = keyof typeof colorTokens
```

Create `src/theme/tokens/typography.ts`:

```typescript
/**
 * Typography tokens extending Ant Design's type system.
 * Use these via useDesignTokens() hook - never hardcode fonts.
 */
export const typographyTokens = {
  // Font families
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  fontFamilyCode: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace",

  // Font sizes (in px)
  fontSizeSM: 12,
  fontSize: 14,
  fontSizeLG: 16,
  fontSizeXL: 20,
  fontSizeHeading1: 38,
  fontSizeHeading2: 30,
  fontSizeHeading3: 24,
  fontSizeHeading4: 20,
  fontSizeHeading5: 16,

  // Font weights
  fontWeightNormal: 400,
  fontWeightMedium: 500,
  fontWeightSemibold: 600,
  fontWeightBold: 700,

  // Line heights
  lineHeight: 1.5714285714285714,
  lineHeightLG: 1.5,
  lineHeightSM: 1.6666666666666667,
  lineHeightHeading1: 1.2105263157894737,
  lineHeightHeading2: 1.2666666666666666,
  lineHeightHeading3: 1.3333333333333333,
  lineHeightHeading4: 1.4,
  lineHeightHeading5: 1.5,
} as const

export type TypographyToken = keyof typeof typographyTokens
```

Create `src/theme/tokens/spacing.ts`:

```typescript
/**
 * Spacing tokens based on 4px grid system.
 * Use these via useDesignTokens() hook - never hardcode spacing values.
 */
export const spacingTokens = {
  // Base spacing (4px increments)
  paddingXXS: 4,
  paddingXS: 8,
  paddingSM: 12,
  padding: 16,
  paddingMD: 20,
  paddingLG: 24,
  paddingXL: 32,

  // Margin tokens (same 4px grid)
  marginXXS: 4,
  marginXS: 8,
  marginSM: 12,
  margin: 16,
  marginMD: 20,
  marginLG: 24,
  marginXL: 32,

  // Component-specific spacing
  controlHeight: 32,
  controlHeightSM: 24,
  controlHeightLG: 40,

  // Border radius
  borderRadius: 6,
  borderRadiusSM: 4,
  borderRadiusLG: 8,
  borderRadiusXS: 2,
} as const

export type SpacingToken = keyof typeof spacingTokens

export const validSpacingValues = [0, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 56, 64, 80, 96]
```

Create `src/theme/tokens/index.ts`:

```typescript
export * from './colors'
export * from './typography'
export * from './spacing'
```

Create `src/theme/config.ts`:

```typescript
import type { ThemeConfig } from 'antd'
import { colorTokens } from './tokens/colors'
import { typographyTokens } from './tokens/typography'
import { spacingTokens } from './tokens/spacing'

export const lightTheme: ThemeConfig = {
  token: {
    colorPrimary: colorTokens.colorPrimary,
    colorSuccess: colorTokens.colorSuccess,
    colorWarning: colorTokens.colorWarning,
    colorError: colorTokens.colorError,
    colorTextBase: colorTokens.colorText,
    colorBgBase: colorTokens.colorBgContainer,
    fontFamily: typographyTokens.fontFamily,
    fontSize: typographyTokens.fontSize,
    padding: spacingTokens.padding,
    paddingXS: spacingTokens.paddingXS,
    paddingSM: spacingTokens.paddingSM,
    paddingLG: spacingTokens.paddingLG,
    paddingXL: spacingTokens.paddingXL,
    margin: spacingTokens.margin,
    marginXS: spacingTokens.marginXS,
    marginSM: spacingTokens.marginSM,
    marginLG: spacingTokens.marginLG,
    marginXL: spacingTokens.marginXL,
    borderRadius: spacingTokens.borderRadius,
    controlHeight: spacingTokens.controlHeight,
  },
  components: {
    Layout: {
      headerBg: colorTokens.colorPrimary,
      headerColor: '#ffffff',
    },
  },
}

export const darkTheme: ThemeConfig = {
  token: {
    colorPrimary: colorTokens.colorPrimary,
    colorBgBase: '#141414',
    colorTextBase: 'rgba(255, 255, 255, 0.85)',
  },
}
```

Create `src/theme/hooks/useDesignTokens.ts`:

```typescript
import { theme } from 'antd'

const { useToken } = theme

/**
 * Hook to access Ant Design's design tokens.
 *
 * @example
 * const { token } = useDesignTokens()
 * return <div style={{ color: token.colorPrimary }}>Hello</div>
 */
export function useDesignTokens() {
  const { token } = useToken()
  return { token }
}
```

Create `src/theme/index.ts`:

```typescript
export { lightTheme, darkTheme } from './config'
export * from './tokens'
export { useDesignTokens } from './hooks/useDesignTokens'
```
