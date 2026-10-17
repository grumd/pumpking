# Pumpking web: design system

The web app is built from three layers. Use them in this order and stop at the first one that does the job:

1. **Mantine components** with their props (`Button`, `Badge`, `Text`, `Table`, `Modal`, `Stack`, `Group`, `SimpleGrid`...). Their defaults come from the theme, so most of the time you pass no styling props at all.
2. **Building blocks** in `src/components/`: the app's own pieces (page layout, card, stat...). See the catalogue below.
3. **A CSS module next to your component**, only for layout that no prop or block covers. It may use tokens only.

A new feature should need no new CSS. If it does, the missing piece probably belongs in the theme or in `src/components/`: add it there (and to this file) instead of styling locally.

Open `/#/design-system` in dev (`npm start`) to see every token and block rendered. It works logged in or out.

## Where things live

| What | Where |
|---|---|
| Raw token values (colors, palettes, page widths): the only file with hex colors | `src/theme/tokens.ts` |
| Mantine theme: spacing, type, radius, breakpoints, component defaults | `src/theme/theme.ts` |
| CSS variables (`--pk-*`) built from the tokens | `src/theme/cssVariables.ts` |
| Breakpoints (read by the theme and by `postcss.config.cjs`) | `src/theme/breakpoints.json` |
| The only global stylesheet | `src/theme/global.css` |
| CSS for the theme's component defaults (Table variant, focus ring) | `src/theme/*.module.css` |
| Building blocks | `src/components/<Name>/` |
| Visual reference page | `src/features/design-system/` (dev only, `/#/design-system`) |

The theme is **dark only** today. Every color that depends on the scheme is a CSS variable defined in the `dark` block of `cssVariables.ts`, so a light theme means adding a `light` block there, not touching components. Don't use Mantine's `dark.N` / `gray.N` shades in features: they are the dark palette itself and won't follow a light theme. Use the `--pk-surface-*` tokens.

## Tokens

### Root size and breakpoints

- The root font size is **18px**, and **14px below the `md` breakpoint (900px)** (`global.css`). Every `rem` value, so every Mantine size, scales with it. Don't use `px` or `%` font sizes.
- Breakpoints (`breakpoints.json`): `xs` 30em (480px), `sm` 48em (768px), **`md` 56.25em (900px)**, `lg` 74em (1184px), `xl` 90em (1440px). `md` is the desktop/phone switch: the root font, the leaderboard columns and the ranking columns all change there.
- In TSX use responsive props: `cols={{ base: 1, sm: 2 }}`, `hiddenFrom="md"`, `visibleFrom="md"` (they work on `Table.Th` / `Table.Td` too).
- In CSS modules use the Mantine mixins: `@mixin smaller-than $mantine-breakpoint-md { ... }` / `@mixin larger-than $mantine-breakpoint-md { ... }`. Never a raw `@media (max-width: 900px)`.

### Colors

**Surfaces** (backgrounds, darkest to lightest):

| Token | Value | Use |
|---|---|---|
| `--pk-surface-page` | `#242424` | page background (set on `body`) |
| `--pk-surface-sunken` | `#1f1f1f` | wells inside a card: media previews, code |
| `--pk-surface-1` | `#2e2e2e` | a level-1 `Card` on the page; popovers, menus (theme default); graph tooltips |
| `--pk-surface-2` | `#3b3b3b` | a level-2 `Card` or row inside a card; the rows of `Table variant="rows"` |
| `--pk-surface-stripe` | `#444444` | every other row of a `striped` table |
| `--pk-surface-3` | `#424242` | hover on a surface-2 row; the selected/"me" row |

**Text and lines**:

| Token | Value | Use |
|---|---|---|
| `--mantine-color-text` | `#eeeeee` | default text (Mantine's own variable, overridden) |
| `--pk-text-strong` | `#ffffff` | emphasis: active nav link, the main number in a row |
| `--mantine-color-dimmed` (`c="dimmed"`) | `#b3b3b3` | secondary text: labels, dates, ranks. The only muted level; meets WCAG AA (4.5:1) on every surface above |
| `--mantine-color-placeholder` | `#969696` | input placeholders (AA on inputs) |
| `--pk-border` | `#424242` | dividers, the top bar line, the card title underline |
| `--pk-focus-ring` | accent | keyboard focus outline. The theme applies it to every Mantine control (`focusClassName`) and `global.css` to other focusable elements; don't set it yourself |
| `--pk-progress-track` | `#777777` | the empty part of a `Progress` bar (theme default) |
| `--pk-opacity-hidden` | `0.35` | a row the user chose to hide but still sees (ranking "show all") |

`c="grey"`, `c="dark.2"`, `#888` and opacity for secondary text are not allowed: use `c="dimmed"`.

**Graphs** (recharts props accept `var()`):

| Token | Use |
|---|---|
| `--pk-graph-axis` | axis lines and tick labels: `<XAxis stroke="var(--pk-graph-axis)" tick={{ fill: 'var(--pk-graph-axis)' }} />` |
| `--pk-graph-grid` | `CartesianGrid stroke` |
| `--pk-graph-reference` | `ReferenceLine stroke` (zero lines) |
| `--pk-grade-<grade>` | one color per Phoenix grade, e.g. `var(--pk-grade-sss-plus)`, `var(--pk-grade-aa)`. `gradeColorVar(grade)` in `tokens.ts` builds the name |

**Glows** (the exp rank icons and the exp bar): `--pk-glow-bronze`, `--pk-glow-silver`, `--pk-glow-gold`, `--pk-glow-green`, `--pk-glow-purple`. Use them in `filter: drop-shadow(0 0 rem(3px) var(--pk-glow-gold))` or `box-shadow: 0 0 rem(4px) var(--pk-glow-gold)`. These are the only shadows allowed besides Mantine's `shadow` prop.

**Highlighted players**: 25 colors `--pk-highlight-0` … `--pk-highlight-24`. A row gets its color with `style={{ '--pk-highlight': `var(--pk-highlight-${index})` }}`, and its CSS module uses `color-mix(in srgb, var(--pk-highlight) 23%, transparent)` for the background and `color-mix(in srgb, var(--pk-highlight) 63%, transparent)` for the outline.

**App colors** are registered as Mantine colors (`tokens.ts` `appColors`). Each is a single shade, so Mantine's light/outline variants and `-text` shades all equal the base color. That decides where each group may be used:

| Group | Names | Allowed as |
|---|---|---|
| Chart type | `single` `singlePerf` `double` `doublePerf` `halfDouble` `coop` | filled backgrounds only (`ChartLabel`, `color=` on a filled `Badge`), graph fills. Text that names a single/double chart type on a dark surface (too dark for these) uses `c="red.2"` / `c="green.2"` |
| Mix | `mix24` (Prime) `mix25` (Prime 2) `mix26` (XX) `mix27` (Phoenix) `mix28` (Phoenix 2) | filled `Badge` only. `mixColor(mix)` maps a mix number to the name |
| Judgement | `perfect` `great` `good` `bad` `miss` | text (`c="perfect"`) and fills |
| Medal | `gold` `silver` `bronze` | text, icons, fills. "Gold" is this one color everywhere (cups, trophy links, exp numbers, the exp bar) |
| Accent | `accent` | graph lines, progress, the achievement ring, focus ring |
| Fresh | `fresh` | on the latest result's row: places gained (text, about 4.3:1 on that row), "NEW" / the score increase (light `Badge`) |
| Latest | `latest` | muted background of the latest result's row on a chart (`color-mix` 20%) |
| Mine | `mine` | muted background of the logged-in player's row on a chart (`color-mix` 20%; `latest` wins when it's also the latest) |
| Dropped | `dropped` | text: places lost to the latest result on a chart (5.1:1 on the stripe; about 3.3:1 on a tinted row) |
| Brand | `discord` | the Discord sign-in `Button` only (it has a real hover shade) |

Generic states use Mantine's palette names, nothing else: `red` (errors, delete, "unread"), `green` (success, live), `yellow` (warnings), `blue` (info), `orange` (the HJ mod badge, `variant="light"` so it stays quiet in the results), `grape` (a filter is active; admin-only flags), `teal` (switches, "on"), `gray` (neutral status: ended, hidden), `cyan` / `pink` only where they already mean something in admin. As filled `Badge`/`Button`/`Alert` colors and `c=` on text.

Chart type colors are kept from the old design. White text on `double` and `coop` is under AA; see "Known gaps".

### Spacing

Theme scale: `xxs` 0.25rem, `xs` 0.625rem, `sm` 0.75rem, `md` 1rem, `lg` 1.25rem, `xl` 2rem. Use only these names in `gap`, `p`, `m`, `spacing` props and `var(--mantine-spacing-*)` in CSS. `0` is fine. No other numbers (`gap={4}`) and no `em` values.

| Where | Value |
|---|---|
| Page side padding | `xs` on phones, `sm` from `sm` up (`pageSidePadding` in `tokens.ts`, used by `PageContainer`, the top bar and the login screens) |
| Between cards on a page | `sm` (`PageContainer` does it) |
| Inside a card, between blocks | `xs` |
| Between rows in a list | `xxs` |
| Card padding | `sm` (level 1), `xs` (level 2) |
| Icon next to text | `xxs` |

### Typography

- Font: **Nunito** (400/600/700, loaded in `index.html`) for everything, including headings and inputs. `ff="monospace"` is fine for ids and tokens in admin.
- Sizes: Mantine `fz` / `size`: `xs` 0.75rem, `sm` 0.875rem, `md` 1rem, `lg` 1.125rem, `xl` 1.25rem, `xxl` 1.5rem (large stat values). Nothing else: no `"2.2em"`, no `%`. A smaller part of a number (the last three digits of a score) uses a smaller `fz` than the rest.
- `xs` is 10.5px on phones: use it for captions next to bigger text only, never for something the user has to read on its own.
- Weights: 400 normal, 600 for emphasis in a row, 700 (`fw="bold"`) for titles and the main number.
- Headings: `Title order={1}` on the login screens, `Title order={2}` for a page or tournament title. Card titles are `h2` rendered by `Card`.

### Radius and z-index

- Radius: `sm` (buttons, inputs, badges: the Mantine default), `md` (cards, modals, popovers, alerts, table rows: set by the theme). Nothing else.
- z-index: leave layering to Mantine. No `z-index` in CSS modules.

## Theme defaults

Set in `theme.ts`, so don't repeat them as props:

| Component | Default |
|---|---|
| (all) | `primaryColor: 'gray'` (filled buttons are dark gray), `fontFamily` Nunito, focus ring via `focusClassName` |
| `Paper` | `radius="md"`, `shadow="sm"`, on the page surface (Mantine's body color) |
| `Modal` | `centered`, `radius="md"`, on the page surface, title bold `lg` (like `Drawer`) |
| `Drawer` | title bold `lg`, on the page surface |
| `Popover`, `Menu` | dropdown on surface-1, `radius="md"`; a `Popover` dropdown is never wider than the screen |
| `Tooltip` | Mantine's light tooltip (as before); opens on hover, keyboard focus, and press-and-hold on touch screens |
| `Progress` | track `--pk-progress-track` |
| `Alert` | `variant="light"`, `radius="md"` |
| `ActionIcon` | `variant="subtle"` |
| `Anchor` | underline on hover; default text color is Mantine's anchor gray |
| `Input` (all inputs) | focus border in accent |
| `Table` | `stripedColor` surface-stripe, `highlightOnHoverColor` surface-3; `variant="rows"` (below): text `md`, row padding `xxs`, so every row list has the same row height |
| `Badge` | `radius="sm"`, tight padding |
| `Switch` | `color="teal"`, no thumb indicator |

## Building blocks

All in `src/components/`. Everything not listed here is either a Mantine component or local to one feature.

### `PageContainer`

The outer wrapper of every logged-in page: a `<main>` that takes the full width up to the page width, with side padding and an `sm` gap between its children.

- The top bar always has the default width, so on `wide` (admin) pages it doesn't line up with the content; that's accepted.
- `width`: `'default'` (53rem: about 950px on desktop; also the top bar), `'narrow'` (27rem: about 490px on desktop and the full width of a phone; single forms like add result and the login screens), `'wide'` (admin only).
- Use it once per page, as the root. Don't add `Container`, `max-width` or page padding yourself.

### `Card`

A surface with an optional title: the "section" of a page.

- `title?: ReactNode`: an `h2` (`fz="xl"`) with an underline.
- `actions?: ReactNode`: icon buttons or a small control, right of the title.
- `level?: 1 | 2`: `1` on the page (surface-1, padding `sm`), `2` for a card or row inside a card (surface-2, padding `xs`).
- Takes the `Paper` props (`component`, `flex`, `p`, `mb`...).
- Use for any group of content on a page. A card with its own header (the leaderboard chart card) has no `title`, so no underline.
- The one padding exception: the leaderboard's dense results table uses smaller card paddings below `md` (level 1 `xs`, level 2 `xxs 0`) so its 10 columns fit a phone. Below `sm` the chart cards also reach the screen edges, square, with `xxs` side padding (and another `xxs` inside the header and after the date): the page's side padding left the results too little room. They are in `chart-results.module.css`, not responsive `p` props, which would add a `<style>` tag per card in the virtualized list. Don't copy it elsewhere.
- For the same reason the results rows' text, badge and grade sizes (larger on phones, where the narrow step counts leave room) are plain props: `useRowSizes` (`leaderboards/components/charts/useRowSizes.ts`) picks the phone or desktop set with Mantine's `useMatches`, once per chart card.
- Don't nest a level-1 card in another level-1 card. Don't use Mantine's `Card` or `Paper` directly for sections.
- In admin drawers, groups of fields use the admin-local `Section` (a dimmed heading without a surface), not `Card`.

### `Stat`

A label over a value.

- `label: ReactNode`, `value: ReactNode`, `size?: 'sm' | 'lg'`: `sm` (label `xs`, value `sm`) for detail views like admin; `lg` (label `sm`, value `xxl`) for page headers like the profile.
- Put several in a `Group` or `SimpleGrid`.

### `KeyValueList`

A two-column `dl`: dimmed labels on the left, values on the right.

- `items: Array<{ label: ReactNode; value: ReactNode; hiddenFrom?: MantineBreakpoint } | false | null | undefined>` (falsy items are skipped; `hiddenFrom` hides the row from that breakpoint up, e.g. a value a table column shows there).
- `noWrap?: boolean`: each row on one line. In a `Popover width="min-content"` the dropdown then grows to fit the rows, and notes under the list wrap at that width (the leaderboard result details).
- Use for the details of one thing in a popover, modal or tooltip: result details, a confirm dialog, a graph tooltip. A graph tooltip on the profile is `<GraphTooltip><KeyValueList items={...} /></GraphTooltip>` (`features/profile/components/GraphTooltip.tsx`: a bordered surface-1 `Paper`), with `{...tooltipProps}` (`graphAxis.ts`) on recharts' `Tooltip`, which keeps it above the next card.
- Use `Stat` instead when the values are few and should stand out.

### `Place`

A place in a ranking: `#N`.

- `place: number`, `medals?: boolean`: with `medals`, places 1–3 are bold in gold / silver / bronze.
- Use it wherever a list shows positions (ranking, leaderboard rows, top tracks, tournaments, profile cups).
- `medals` on rankings of players or tracks. The leaderboard's dense results table and the tournament chart order go without.

### `EmptyState`

Centered dimmed text for "nothing here".

- `children`: the message (from translations, e.g. `lang.NOTHING_FOUND`).
- Use for empty lists and searches. Errors are `ErrorAlert`, loading is `Loader`.

### `ErrorAlert`

A red alert titled "Error" with an icon: a query or a page that failed.

- `children`: the message (`error.message`, or a translation like `lang.PROFILE_NOT_FOUND`).
- A short red note under a form (a failed sign-in, a failed save) is a bare `<Alert color="red">` without the title.

### `Loader`

Full-width centered Mantine dots. Use while a query loads. Inside an input's `rightSection` use Mantine's `<Loader size="xs" />`.

### `ChartLabel`

The colored chart label (`S21`, `D18`, `SP3`, `COOP2`, `HD20`).

- `label: string` as written in the DB. Use it for every chart label, admin tables included. Don't render labels as plain `Badge`s.
- `typeLabel?: string`: the label that tells the chart type when `label` doesn't (older mixes' labels like `NL-5`).
- `same?: boolean`: a muted look for "same as the previous mix" (admin track detail).
- `chartLabelColor(label)` (`ChartLabel/chartLabelColor.ts`) returns the Mantine color name, for graphs.

### Other shared components

| Component | Use |
|---|---|
| `TopBar` | the navigation, rendered by `Root` |
| `Flag` | a country flag image, `size` `sm` / `md` |
| `Grade` | a Phoenix grade image from a grade or a score |
| `Medal`, `MedalCounts` | trophy icons in medal colors; cup counts |
| `ExpRankImg` | the exp rank icon with its glow |
| `ModalTrigger` | a button that opens a modal with its own open state |
| `useConfirmationPopup` | a confirm modal driven by a promise (Cancel default, OK filled) |
| `ToggleButton`, `ToggleButtonGroup` | on/off buttons for multi-select filters |
| `CollapsibleBar` | a full-width button that expands a section |
| `NoticeIndicator` | the red "unread" mark on a nav link |
| `TextInputWithReset` | a text input with a labelled clear button |
| `ResultScreenshotLink` | the "screenshot" link of a result |
| `GoogleButton` | the Google sign-in button (fixes its background on dark) |

### Mantine components: how to use them here

Don't wrap these; configure them through the theme.

| Need | Use |
|---|---|
| A data table (tournaments, admin lists) | `Table` inside `Table.ScrollContainer minWidth={...}`, so phones scroll it instead of squeezing the page |
| A dense table of results | `Table striped` + the feature's CSS module for column widths and judgement colors |
| A list of rows with columns (ranking, top tracks, best scores) | `Table variant="rows"`: each row is a surface-2 tile with rounded ends, hover surface-3. On phones hide secondary columns with `visibleFrom="md"` instead of scrolling |
| A column as narrow as its content (place, numbers, icons, a switch) | `Table.Td` / `Table.Th` with `data-fit`; the other columns share the rest |
| The main number of a row (pp, play count) | `Table.Td` with `data-main` (bold, `--pk-text-strong`) |
| A selected or "me" row | `Table.Tr` with `data-selected` (surface-3) |
| A row that opens something | Put a real link or button for that action inside the row; a row `onClick` is only a shortcut on top. Add `data-clickable` to the `Table.Tr` for the pointer cursor |
| A filter bar over a list | `<Group wrap="wrap" gap="xs">` with the input `flex={1} miw={rem(200)}`, then counts and buttons |
| Errors | `ErrorAlert` |
| Warnings / notes | `<Alert color="yellow">` / `<Alert>` |
| Tabs | `Tabs` (default variant for navigation between areas, `variant="pills"` for switching a view inside a page) |
| Something to click | `Button`, `ActionIcon` (always with `aria-label`), `Anchor` for navigation (also for external links), `UnstyledButton` when it must look like plain content (a score you click, a tooltip target). Never `onClick` on a `div`, `span` or `td` alone |
| Extra info | `Tooltip` for short hints that are fine to miss on touch screens (they show on press-and-hold). Its target must be focusable (`UnstyledButton`, `Button`, `Anchor`), or touch and keyboard users can't open it. `Popover` for anything with links or buttons; the theme keeps its dropdown within the screen |
| Status | `Badge` with a state color |
| Progress | `Progress` with `color="accent"` |

## Styling rules

1. **No inline styles.** `style={{...}}` and `styles={{...}}` are lint errors. The one exception: `style` may set CSS custom properties (`style={{ '--progress': '42%' }}`), which a CSS module reads. Third-party style objects (recharts `contentStyle`, the image-area `globalAreaStyle`) may only contain `var(--...)` values.
2. **No raw colors outside `src/theme/`.** No hex, `rgb()`, `hsl()` or named colors in CSS modules (stylelint), no hex / `rgb()` / `hsl()` string literals in TSX (eslint), and no `dark.N` / `gray.N` color props. `transparent` and `currentColor` are fine. Use a token.
3. **No global CSS.** The only global stylesheet is `src/theme/global.css`. Every other style file is a `*.module.css` next to its component. No `.scss`, no global class names.
4. **Mantine props before CSS.** Layout (`Group`, `Stack`, `SimpleGrid`, `flex`, `w`, `hiddenFrom`), spacing (`p`, `gap`), text (`fz`, `fw`, `c`, `truncate`, `ta`, `lh`) are props. Write a CSS module only for what props can't express: table column widths, a CSS grid, a hover effect, a pseudo-element, a glow.
5. **Only tokens in CSS modules**: `var(--mantine-spacing-*)`, `var(--mantine-font-size-*)`, `var(--mantine-radius-*)`, `var(--pk-*)`, `var(--mantine-color-*)`, and `rem()` for fixed sizes (icon boxes, column widths).
6. **Accessibility is part of the component.** Every input has a `label`, or an `aria-label` when its label is shown elsewhere (a column header); every icon-only control has an `aria-label`; interactive things are buttons or links; tooltip targets are focusable.
7. **Every page works at 375px** without horizontal scrolling of the page itself. Use responsive props, `Table.ScrollContainer`, `visibleFrom`, and `SimpleGrid cols={{ base: ..., sm: ... }}`.
8. **Text goes through translations** (`src/constants/translations/`, all 4 languages). Adding a key for a new label or `aria-label` is fine; keep it short and plain. Admin is English only and keeps its strings inline.

Lint (`npm run lint` in `packages/web`) enforces 1–3.

## Usability redesigns made during the migration

The migration keeps the old look. These are the places that changed on purpose, each because it was hard to use:

| Where | Change | Why |
|---|---|---|
| All pages | One page width (`PageContainer`), full width up to it, with side padding on phones | Widths were 800–1485px depending on the page; the content edge jumped between nav items; tables made tournaments and admin wider than a 375px screen |
| All pages | Nunito everywhere, with real 600/700 weights | Inputs and titles used the system font, and bold was synthesized from the 400 weight |
| All pages | Muted text `#828282` → `#b3b3b3`; placeholders `#696969` → `#969696` | Secondary text failed WCAG AA on every card surface (2.6–3.5:1), placeholders were 2.5:1 |
| All pages | Visible keyboard focus ring (accent) on all controls | The default outline was dark gray on dark gray (1.2:1) |
| All pages | One set of surfaces: leaderboard and ranking go from `#353535`/`#424242` to the card surfaces (`#2e2e2e`/`#3b3b3b`) used everywhere else | Four near-identical card grays across three systems |
| Top bar | Inactive links in dimmed text instead of `#555`; smaller links under `md` | Inactive links had 2.1:1 contrast; the mobile font rule never applied, so the nav wrapped to 3 lines |
| Profile | Graphs stack under `sm`; achievements and level achievements use responsive grids; the 65% font shrink is gone | At 375px the graphs were 170px wide, achievement names overflowed their cards, and em-based text was 9px |
| Profile | pp and rank history tooltips get a background | They had none (an undefined class), so the text drew over the graph lines |
| Profile | Best-score dates fade by age down to 55% instead of 20% | The oldest dates were 1.8:1 |
| Profile, songs | Lists of rows use `Table variant="rows"` and `Place` | Same list look as the ranking; top-3 colors match the medals |
| Leaderboard | The score that opens the result details is a button, and focus moves into the popover | The popover could only be opened with a mouse or touch, and its links were out of keyboard reach |
| Leaderboard | "Show N more" is a real button with a focus ring | It had `all: unset`, so keyboard users couldn't see it |
| Leaderboard | Combo column hidden below `md`, together with its popover fallback | Between 768 and 900px the combo was shown nowhere |
| Leaderboard | Chart cards reach the screen edges below `sm` | With the page and card side padding, names and scores had about 40px less room than before the redesign |
| Leaderboard | The charts filter popover fits the screen and works from the keyboard | It overflowed a 375px screen, and Tab skipped its controls |
| Leaderboard | Player filters and sorting inputs stack on phones | Three player selects were ~115px wide each, the sort select was cut off, and opening sorting pushed "charts filter" off the screen |
| Leaderboard, profile | Date tooltips and achievement descriptions open on keyboard focus and on press-and-hold | They were hover only |
| Ranking | Rows use `Table variant="rows"` inside a card; the hide switch has a label | Same list look as songs and profile; the switch had no name for screen readers |
| Ranking | Empty state and error use `EmptyState` / `Alert` | The empty state was hardcoded Russian text and the error was a raw string |
| Tournaments | Empty states use `EmptyState`; the player's own row uses `data-selected`; tables scroll inside their card on phones | The page was 600px wide on a 375px screen |
| Confirm modal | Cancel is a default button, OK is filled | Cancel was red, which reads as the destructive action |
| Card titles | One size (`xl`) on every page | They were 27px on songs and tournaments and 17px on the profile |
| Chart labels | White text instead of `#eee`; admin tables use `ChartLabel` | Slightly better contrast; admin showed labels as gray badges, hiding single/double |

## Known gaps

- White text on the `double` (3.2:1) and `coop` (3.6:1) chart colors is under AA for small text. The colors are kept on purpose; darkening them is a separate decision.
- Mix badge colors are translucent and assume a dark background; a light theme needs its own values.
- Logged-in pages have no `h1`; card titles start at `h2`.
- The leaderboard's step columns (perfect...miss) have no header. Adding one is a feature change.
- "Show more" on the profile's most played / best scores stays after the last page (a behavior bug, left as it is).
