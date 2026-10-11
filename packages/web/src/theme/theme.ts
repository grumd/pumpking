import {
  Alert,
  Badge,
  type DefaultMantineColor,
  Drawer,
  Input,
  type MantineColorsTuple,
  Menu,
  Modal,
  Paper,
  Popover,
  Switch,
  Table,
  Tooltip,
  colorsTuple,
  createTheme,
} from '@mantine/core';

import breakpoints from './breakpoints.json';
import focusCss from './focus.module.css';
import inputCss from './input.module.css';
import tableCss from './table.module.css';
import { type AppColor, appColors, discordHover } from './tokens';

const fontFamily = 'Nunito, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

// Each app color is a single shade. Discord's darkest shade is its hover color
const colors = Object.fromEntries(
  Object.entries(appColors).map(([name, color]) => [name, colorsTuple(color)])
) as Record<AppColor, MantineColorsTuple>;
colors.discord = colorsTuple([...Array(9).fill(appColors.discord), discordHover]);

declare module '@mantine/core' {
  export interface MantineThemeColorsOverride {
    colors: Record<DefaultMantineColor | AppColor, MantineColorsTuple>;
  }
}

export const theme = createTheme({
  autoContrast: true,
  primaryColor: 'gray',
  fontFamily,
  headings: { fontFamily },
  focusClassName: focusCss.focus,
  colors,
  breakpoints,
  fontSizes: {
    xxl: '1.5rem',
  },
  lineHeights: {
    xs: '1.2',
    sm: '1.3',
    md: '1.4',
    lg: '1.5',
    xl: '1.6',
  },
  spacing: {
    xxs: '0.25rem',
    xs: '0.625rem',
    sm: '0.75rem',
    md: '1rem',
    lg: '1.25rem',
    xl: '2rem',
  },
  components: {
    Alert: Alert.extend({
      defaultProps: {
        variant: 'light',
        radius: 'md',
      },
    }),
    Badge: Badge.extend({
      defaultProps: {
        pl: '0.5em',
        pr: '0.5em',
        radius: 'sm',
        lh: 1,
      },
    }),
    Drawer: Drawer.extend({
      styles: {
        title: {
          fontWeight: 700,
          fontSize: 'var(--mantine-font-size-lg)',
        },
      },
    }),
    Input: Input.extend({
      classNames: inputCss,
    }),
    Menu: Menu.extend({
      defaultProps: {
        radius: 'md',
        shadow: 'sm',
      },
      styles: {
        dropdown: {
          background: 'var(--pk-surface-1)',
        },
      },
    }),
    Modal: Modal.extend({
      defaultProps: {
        centered: true,
        radius: 'md',
      },
    }),
    Paper: Paper.extend({
      defaultProps: {
        radius: 'md',
        shadow: 'sm',
      },
    }),
    Popover: Popover.extend({
      defaultProps: {
        radius: 'md',
        shadow: 'sm',
      },
      styles: {
        dropdown: {
          background: 'var(--pk-surface-1)',
        },
      },
    }),
    Switch: Switch.extend({
      defaultProps: {
        withThumbIndicator: false,
        color: 'teal',
      },
    }),
    Table: Table.extend({
      classNames: tableCss,
      defaultProps: {
        stripedColor: 'var(--pk-surface-stripe)',
        highlightOnHoverColor: 'var(--pk-surface-3)',
      },
    }),
    Tooltip: Tooltip.extend({
      defaultProps: {
        events: { hover: true, focus: true, touch: true },
      },
    }),
  },
});
