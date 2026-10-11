# packages/web

The UI is built on a small design system. Read `DESIGN.md` before writing UI code; `/#/design-system` (dev only) shows every token and block.

Rules:

- Build pages from Mantine components and the blocks in `src/components/` (`PageContainer`, `Card`, `Stat`, `KeyValueList`, `Place`, `EmptyState`, `ChartLabel`...). Theme defaults already style Mantine components: don't repeat them as props.
- If something is missing, add a token to `src/theme/` or a block to `src/components/` (and to `DESIGN.md`) instead of writing local styles.
- No inline styles (`style` only for `--custom-properties`), no raw colors outside `src/theme/tokens.ts`, no global CSS or `.scss`: a CSS module next to the component, using tokens only, when props can't do it.
- Every page must work at 375px wide. Text goes through `src/constants/translations/`.
- Gates: `npm run lint`, `npm run ts` (in this package) and `npm run build:web` (repo root).
