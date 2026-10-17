import type { CSSVariablesResolver } from '@mantine/core';

import { darkScheme, gradeColors, gradeVarName, highlightColors } from './tokens';

// The --pk-* variables, plus Mantine variables we override. Values that would differ in a
// light theme go in `dark` (a light theme adds a `light` block with the same keys)
export const cssVariablesResolver: CSSVariablesResolver = () => {
  const grades: Record<string, string> = {};
  for (const [grade, color] of Object.entries(gradeColors)) {
    grades[gradeVarName(grade as keyof typeof gradeColors)] = color;
  }

  const highlights: Record<string, string> = {};
  highlightColors.forEach((color, index) => {
    highlights[`--pk-highlight-${index}`] = color;
  });

  return {
    variables: {
      '--pk-opacity-hidden': darkScheme.opacityHidden,
    },
    light: {},
    dark: {
      '--mantine-color-text': darkScheme.text,
      '--mantine-color-body': darkScheme.surfacePage,
      '--mantine-color-dimmed': darkScheme.dimmed,
      '--mantine-color-placeholder': darkScheme.placeholder,
      '--mantine-color-default-border': darkScheme.border,

      '--pk-text-strong': darkScheme.textStrong,
      '--pk-surface-page': darkScheme.surfacePage,
      '--pk-surface-sunken': darkScheme.surfaceSunken,
      '--pk-surface-1': darkScheme.surface1,
      '--pk-surface-2': darkScheme.surface2,
      '--pk-surface-stripe': darkScheme.surfaceStripe,
      '--pk-surface-3': darkScheme.surface3,
      '--pk-border': darkScheme.border,
      '--pk-focus-ring': darkScheme.focusRing,
      '--pk-progress-track': darkScheme.progressTrack,

      '--pk-graph-axis': darkScheme.graphAxis,
      '--pk-graph-grid': darkScheme.graphGrid,
      '--pk-graph-reference': darkScheme.graphReference,
      '--pk-graph-cursor': darkScheme.graphCursor,
      '--pk-graph-second': darkScheme.graphSecond,

      '--pk-glow-bronze': darkScheme.glowBronze,
      '--pk-glow-silver': darkScheme.glowSilver,
      '--pk-glow-gold': darkScheme.glowGold,
      '--pk-glow-green': darkScheme.glowGreen,
      '--pk-glow-purple': darkScheme.glowPurple,

      ...grades,
      ...highlights,
    },
  };
};
