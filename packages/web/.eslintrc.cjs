// Design system rules (DESIGN.md, "Styling rules")
const inlineStyleMessage =
  'No inline styles: use Mantine props, a block or a CSS module (DESIGN.md). `style` may only set --custom-properties.';
const rawColorMessage = 'No raw colors outside src/theme: use a token (DESIGN.md).';

const designSystemSyntax = [
  {
    selector:
      "JSXAttribute[name.name='style'] > JSXExpressionContainer > ObjectExpression > Property:not([key.value=/^--/])",
    message: inlineStyleMessage,
  },
  {
    selector: "JSXAttribute[name.name='style'] > JSXExpressionContainer > :not(ObjectExpression)",
    message: inlineStyleMessage,
  },
  {
    selector: "JSXAttribute[name.name='styles']",
    message: inlineStyleMessage,
  },
  {
    selector: 'Literal[value=/^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/]',
    message: rawColorMessage,
  },
  {
    selector: 'Literal[value=/(rgba?|hsla?)\\(/]',
    message: rawColorMessage,
  },
  {
    selector: 'Literal[value=/^(dark|gray)\\.[0-9]$/]',
    message: 'No dark.N / gray.N shades: use the --pk-surface-* tokens (DESIGN.md).',
  },
];

module.exports = {
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': 'warn',
    'no-restricted-syntax': ['error', ...designSystemSyntax],
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['*.scss'],
            message: 'Use a *.module.css file (DESIGN.md).',
          },
          {
            group: ['*.css', '!*.module.css', '!@mantine/*/styles.css', '!theme/global.css'],
            message: 'Only CSS modules: the one global stylesheet is src/theme/global.css.',
          },
        ],
      },
    ],
  },
  overrides: [
    {
      // The tokens live here
      files: ['src/theme/**'],
      rules: {
        'no-restricted-syntax': 'off',
      },
    },
    {
      // Not migrated to the design system yet. Remove each entry when its feature is migrated
      files: [
        'src/components/Card/CardWithProgress.tsx',
        'src/components/CollapsibleBar/**',
        'src/components/ExpRankImg/**',
        'src/components/Flag/**',
        'src/components/Loader/**',
        'src/components/Medal/**',
        'src/components/NoticeIndicator/**',
        'src/components/ResultScreenshotLink/**',
        'src/components/ToggleButton/**',
        'src/components/TopBar/**',
        'src/features/root/**',
        'src/features/login/**',
        'src/features/songs/**',
        'src/features/ranking/**',
        'src/features/profile/**',
        'src/features/leaderboards/**',
        'src/features/tournaments/**',
        'src/features/admin/**',
      ],
      rules: {
        'no-restricted-syntax': 'off',
        'no-restricted-imports': 'off',
      },
    },
  ],
};
