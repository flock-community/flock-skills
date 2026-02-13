# Step 13: Create Custom ESLint Plugin

Create `eslint-plugin-novacuria/index.js`:

```javascript
import noHardcodedColors from './rules/no-hardcoded-colors.js'
import noHardcodedFonts from './rules/no-hardcoded-fonts.js'
import noHardcodedSpacing from './rules/no-hardcoded-spacing.js'

export default {
  rules: {
    'no-hardcoded-colors': noHardcodedColors,
    'no-hardcoded-fonts': noHardcodedFonts,
    'no-hardcoded-spacing': noHardcodedSpacing,
  },
}
```

Create `eslint-plugin-novacuria/rules/no-hardcoded-colors.js`:

```javascript
/**
 * ESLint rule: no-hardcoded-colors
 * Detects hardcoded color values and provides AI-friendly error messages.
 */

const COLOR_PATTERNS = [
  /#[0-9a-fA-F]{3,8}\b/,
  /\brgba?\s*\([^)]+\)/,
  /\bhsla?\s*\([^)]+\)/,
]

const ALLOWED_COLORS = ['transparent', 'inherit', 'currentColor', 'none']

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow hardcoded color values. Use design tokens instead.',
      category: 'Best Practices',
      recommended: true,
    },
    messages: {
      noHardcodedColor: `Hardcoded color "{{value}}" detected.

How to fix:
1. Import: import { useDesignTokens } from '@/theme'
2. Use: const { token } = useDesignTokens()
3. Apply: style={{ color: token.colorPrimary }}

Available color tokens:
- Primary: colorPrimary, colorPrimaryHover, colorPrimaryActive, colorPrimaryBg
- Success: colorSuccess, colorSuccessHover, colorSuccessActive, colorSuccessBg
- Warning: colorWarning, colorWarningHover, colorWarningActive, colorWarningBg
- Error: colorError, colorErrorHover, colorErrorActive, colorErrorBg
- Text: colorText, colorTextSecondary, colorTextTertiary, colorTextDisabled
- Background: colorBgContainer, colorBgElevated, colorBgLayout
- Border: colorBorder, colorBorderSecondary

See src/theme/tokens/colors.ts for the full list.`,
    },
    schema: [],
  },

  create(context) {
    function checkValue(node, value) {
      if (typeof value !== 'string') return
      if (ALLOWED_COLORS.includes(value.toLowerCase())) return

      for (const pattern of COLOR_PATTERNS) {
        if (pattern.test(value)) {
          context.report({ node, messageId: 'noHardcodedColor', data: { value } })
          return
        }
      }
    }

    return {
      JSXAttribute(node) {
        if (node.name.name !== 'style') return
        if (node.value?.type !== 'JSXExpressionContainer') return
        const expr = node.value.expression
        if (expr.type !== 'ObjectExpression') return

        for (const prop of expr.properties) {
          if (prop.type !== 'Property') continue
          if (prop.value.type === 'Literal') {
            checkValue(prop.value, prop.value.value)
          }
        }
      },

      Property(node) {
        if (node.value.type === 'Literal') {
          const key = node.key.name || node.key.value
          const colorProps = ['color', 'backgroundColor', 'borderColor', 'background', 'fill', 'stroke']
          if (colorProps.includes(key)) {
            checkValue(node.value, node.value.value)
          }
        }
      },

      TemplateLiteral(node) {
        for (const quasi of node.quasis) {
          checkValue(quasi, quasi.value.raw)
        }
      },
    }
  },
}
```

Create `eslint-plugin-novacuria/rules/no-hardcoded-fonts.js`:

```javascript
/**
 * ESLint rule: no-hardcoded-fonts
 * Detects hardcoded font-family values and provides AI-friendly error messages.
 */

const FONT_PATTERNS = [
  /\b(Arial|Helvetica|Times|Georgia|Verdana|Courier|Comic Sans|Impact)\b/i,
  /font-family\s*:/,
  /'[^']+',\s*sans-serif/,
  /"[^"]+",\s*sans-serif/,
]

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow hardcoded font-family values. Use design tokens instead.',
      category: 'Best Practices',
      recommended: true,
    },
    messages: {
      noHardcodedFont: `Hardcoded font-family detected.

How to fix:
1. Import: import { useDesignTokens } from '@/theme'
2. Use: const { token } = useDesignTokens()
3. Apply: style={{ fontFamily: token.fontFamily }}

Available typography tokens:
- fontFamily: System font stack for body text
- fontFamilyCode: Monospace font stack for code
- fontSizeSM (12px), fontSize (14px), fontSizeLG (16px), fontSizeXL (20px)
- fontWeightNormal (400), fontWeightMedium (500), fontWeightSemibold (600), fontWeightBold (700)

See src/theme/tokens/typography.ts for the full list.`,
    },
    schema: [],
  },

  create(context) {
    function checkValue(node, value) {
      if (typeof value !== 'string') return
      for (const pattern of FONT_PATTERNS) {
        if (pattern.test(value)) {
          context.report({ node, messageId: 'noHardcodedFont' })
          return
        }
      }
    }

    return {
      JSXAttribute(node) {
        if (node.name.name !== 'style') return
        if (node.value?.type !== 'JSXExpressionContainer') return
        const expr = node.value.expression
        if (expr.type !== 'ObjectExpression') return

        for (const prop of expr.properties) {
          if (prop.type !== 'Property') continue
          const key = prop.key.name || prop.key.value
          if (key === 'fontFamily' && prop.value.type === 'Literal') {
            checkValue(prop.value, prop.value.value)
          }
        }
      },

      Property(node) {
        const key = node.key.name || node.key.value
        if (key === 'fontFamily' && node.value.type === 'Literal') {
          checkValue(node.value, node.value.value)
        }
      },
    }
  },
}
```

Create `eslint-plugin-novacuria/rules/no-hardcoded-spacing.js`:

```javascript
/**
 * ESLint rule: no-hardcoded-spacing
 * Detects spacing values that don't align with the 4px grid system.
 */

const VALID_SPACING = [0, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 56, 64, 80, 96]

const SPACING_PROPS = [
  'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
  'gap', 'rowGap', 'columnGap', 'top', 'right', 'bottom', 'left',
]

export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Warn about spacing values that do not follow the 4px grid.',
      category: 'Best Practices',
      recommended: true,
    },
    messages: {
      noHardcodedSpacing: `Arbitrary spacing "{{value}}" detected. Use 4px grid tokens.

How to fix:
1. Import: import { useDesignTokens } from '@/theme'
2. Use: const { token } = useDesignTokens()
3. Apply: style={{ padding: token.padding }}

Available spacing tokens (4px grid):
- paddingXXS (4px), paddingXS (8px), paddingSM (12px)
- padding (16px), paddingMD (20px), paddingLG (24px), paddingXL (32px)
- marginXXS (4px), marginXS (8px), marginSM (12px)
- margin (16px), marginMD (20px), marginLG (24px), marginXL (32px)

Valid 4px grid values: 0, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 56, 64, 80, 96

See src/theme/tokens/spacing.ts for the full list.`,
    },
    schema: [],
  },

  create(context) {
    function checkSpacingValue(node, value) {
      let numericValue = value
      if (typeof value === 'string') {
        const match = value.match(/^(\d+(?:\.\d+)?)(px)?$/)
        if (!match) return
        numericValue = parseFloat(match[1])
      }

      if (typeof numericValue !== 'number') return

      if (!VALID_SPACING.includes(numericValue)) {
        context.report({ node, messageId: 'noHardcodedSpacing', data: { value: String(value) } })
      }
    }

    return {
      JSXAttribute(node) {
        if (node.name.name !== 'style') return
        if (node.value?.type !== 'JSXExpressionContainer') return
        const expr = node.value.expression
        if (expr.type !== 'ObjectExpression') return

        for (const prop of expr.properties) {
          if (prop.type !== 'Property') continue
          const key = prop.key.name || prop.key.value
          if (SPACING_PROPS.includes(key) && prop.value.type === 'Literal') {
            checkSpacingValue(prop.value, prop.value.value)
          }
        }
      },

      Property(node) {
        const key = node.key.name || node.key.value
        if (SPACING_PROPS.includes(key) && node.value.type === 'Literal') {
          checkSpacingValue(node.value, node.value.value)
        }
      },
    }
  },
}
```
