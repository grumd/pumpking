import {
  ActionIcon,
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
  Progress,
  Switch,
  Table,
  Tooltip,
  colorsTuple,
  createTheme,
} from '@mantine/core';

import { translation } from 'utils/context/translation';

import breakpoints from './breakpoints.json';
import focusCss from './focus.module.css';
import progressCss from './progress.module.css';
import switchCss from './switch.module.css';
import tableCss from './table.module.css';
import { type AppColor, appColors, discordHover } from './tokens';

const fontFamily = 'Nunito, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

// Each app color is a single shade. Discord's darkest shade is its hover color
const colors = Object.fromEntries(
  Object.entries(appColors).map(([name, color]) => [name, colorsTuple(color)])
) as Record<AppColor, MantineColorsTuple>;
colors.discord = colorsTuple([...Array(9).fill(appColors.discord), discordHover]);

// Modal and Drawer titles
const overlayStyles = {
  title: {
    fontWeight: 700,
    fontSize: 'var(--mantine-font-size-lg)',
  },
};

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
    ActionIcon: ActionIcon.extend({
      defaultProps: {
        variant: 'subtle',
      },
    }),
    Alert: Alert.extend({
      defaultProps: {
        variant: 'light',
        radius: 'md',
      },
    }),
    Badge: Badge.extend({
      defaultProps: {
        radius: 'sm',
      },
      styles: {
        root: {
          paddingLeft: '0.5em',
          paddingRight: '0.5em',
          lineHeight: 1,
        },
      },
    }),
    Drawer: Drawer.extend({
      defaultProps: {
        closeButtonProps: { 'aria-label': translation.CLOSE },
      },
      styles: overlayStyles,
    }),
    Input: Input.extend({
      // The focus border in the focus color
      styles: {
        wrapper: {
          '--input-bd-focus': 'var(--pk-focus-ring)',
        },
      },
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
        closeButtonProps: { 'aria-label': translation.CLOSE },
      },
      styles: overlayStyles,
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
          // Never wider than the screen
          maxWidth: 'calc(100vw - 2 * var(--mantine-spacing-xs))',
        },
      },
    }),
    Progress: Progress.extend({
      classNames: progressCss,
    }),
    Switch: Switch.extend({
      classNames: switchCss,
      defaultProps: {
        withThumbIndicator: false,
        color: 'teal',
      },
    }),
    Table: Table.extend({
      classNames: tableCss,
      // Every row list has the same row height
      vars: (_, props) => ({
        table: {
          '--table-vertical-spacing':
            props.variant === 'rows' ? 'var(--mantine-spacing-xxs)' : undefined,
        },
      }),
      defaultProps: {
        stripedColor: 'var(--pk-surface-stripe)',
        highlightOnHoverColor: 'var(--pk-surface-3)',
      },
    }),
    Tooltip: Tooltip.extend({
      defaultProps: {
        // focus: keyboard focus. touch: shown while the finger is down (press and hold)
        events: { hover: true, focus: true, touch: true },
      },
    }),
  },
});
