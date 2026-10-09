# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

School of GenZ LMS: a Bangla-first learning platform with three apps in one Next.js project (student, teacher, admin console). It was rebuilt from a claude.ai/design prototype and **has no server yet**. Every page is a client component, all data is seed data, and state lives in `localStorage`. `README.md` has the full route table and the list of what is simulated; keep it current when routes or behaviour change.

Stack: Next.js 16 (App Router), React 19, TypeScript (strict), Vitest, ESLint 9 with `eslint-config-next`. No Tailwind, no CSS modules, no UI library. KaTeX renders formulas.

## Commands

```bash
npm run dev              # http://localhost:3000
npm run build            # production build
npm run lint             # ESLint
npm run check:admin-en   # fails if a Bangla letter or digit appears in admin code
npm run typecheck        # tsc --noEmit
npm test                 # vitest run (src/**/*.test.ts, node environment)

npx vitest run src/lib/format.test.ts          # one file
npx vitest run src/lib/actions.test.ts -t 'TrxID'   # tests whose name matches
npx vitest src/lib/selectors.test.ts           # watch mode
```

CI (`.github/workflows/ci.yml`, Node 24) runs lint, `check:admin-en`, typecheck, tests and the build on every push. Run the first four before committing.

`NEXT_PUBLIC_DEV_BAR=0` hides the dev bar. There are no other environment variables.

Vercel deploys `main`, so work on a branch.

## Architecture

### State: one store, pure functions around it

All logic lives in `src/lib/` and follows one flow:

| File | Role |
|---|---|
| `data.ts` | Seed data (courses, queue, doubts, notifications). The stand-in for the API. |
| `types.ts` | Domain types. |
| `state.ts` | `AppState` and `initialState`: the persisted shape. |
| `selectors.ts` | Pure reads `(state, …) => value`. |
| `actions.ts` | Pure mutations `(state, …) => state`. Each is where a server call will go. |
| `store.tsx` | `StoreProvider` / `useStore()`. Persists to `localStorage` key `sgz-lms-v1`. |

Pages never mutate state inline. They call `set((x) => someAction(x, …))` and read through selectors.

Things that are easy to get wrong:

- **`ready`.** The store renders `initialState` on the server and on the first client render, then loads saved state in an effect. Anything that redirects, or depends on saved state, must wait for `ready` (see `src/app/page.tsx`, `Shell`, `AdminShell`).
- **`version`.** Bump `AppState.version` when an existing slice changes shape; saved state from another version is dropped. A new top-level slice merges in on load and needs no bump.
- **Cross-role flows run through the same store.** A `storage` listener reloads state when another tab writes, which is how "student pays → admin approves → student sees it" works with one tab per role.
- **Time is relative.** Seed records store minutes ago (`agoMin`, `subAgoMin`), not timestamps. Functions that need the clock take `now` / `today` as a parameter so tests can fix it.

### Keys

Route params and keys use **0-based** chapter and lesson indexes; display adds 1 (`lessonRef`).

| Key | Used for |
|---|---|
| `cid:ci:li` | `progress`, `bookmarks`, `myNotes` (`lessonKey`) |
| `cid:ci` | A chapter test attempt and its result (`testKey`) |
| `cid\|lesson:ci:li` | Revision of an existing lesson |
| `cid\|new:ci:<id>` | Revision of a new lesson (`newLessonKey`) |
| `cid\|test:ci` | Revision of a chapter test (`testRevKey`) |

### Content revisions

A teacher's edits and what students see are separate:

- `s.tItems[k]` is the working revision (`draft` → `review` → `published` or `returned`). Read it with `item(s, k)`, which falls back to `itemSeeds` and then `baseItem(k)`, so a revision exists for every lesson without being stored.
- `s.published[k]` is the last version an admin approved. Students read only this, through `studentLesson` and `chapterTest`.
- `patchItem` refuses edits while in review, and turns a published item back into a draft update. `decideContent` is the admin's publish or return.

### Payments

`allQueue(s)` is the admin's queue: `queueSeed` with `s.decided` applied, plus the student's own submission as a row with id `live` (from `s.payment`). `decidePayments` routes `live` back to `s.payment`, which is how the student sees the decision.

### Shells

- `src/app/layout.tsx`: fonts, the theme script, `StoreProvider`, the dev bar and `Celebrations`.
- `src/components/Shell.tsx`: student and teacher frame. Each page wraps itself: `<Shell role="student" title="…">`. `NAV` holds the sidebar groups; items with a `tab` label also appear in the phone tab bar, the rest go under "More".
- `src/app/admin/layout.tsx` → `AdminShell` in `src/components/admin/Console.tsx`: the console frame for every `/admin` route.

There is no auth. `DevBar` switches role by navigating (`/`, `/teacher`, `/admin`).

**Adding a student or teacher screen:** create the route, add it to `NAV` in `Shell.tsx`, add it to `JUMPS` and `screenOf` in `DevBar.tsx`, and add a row to the README route table.

### Admin console

The console is data-driven. It does not have a component per section.

- `src/lib/admin/console.ts`: the `AdminConsole` class. A new instance is built on every render from `(state, setState, env)`. It holds formatting (`nf`, `tk`, `pl`, `fd`, `when`), permissions (`perm`), effects (`upd`, `log`, `flash`, `ask`, `go`/`nav`) and view-model constructors (`T`/`B` cells, `kv`, `it`, `inp`/`area`/`seg` fields, `blk`, `A` actions, `K` stat tiles, `mkList`).
- `src/lib/admin/sections/*.ts`: one builder per section, `(c: AdminConsole) => SectionView`. A `SectionView` is a `list`, `dash` or `matrix`, with an optional `detail` pane. Builders decide colours and labels; they return plain data with callbacks.
  - A dashboard `Panel` holds one of `trend` (line chart), `share` + `whole` (ring), `bars`, `meters`, `table` or `items`, and may carry its own `seg` switch. The page-wide switch is `dash.seg`.
  - `sections/revenue.ts` is the one revenue series; Overview and Reports both draw it for the period in `S.period`.
  - Status badges come from `c.B(status)`. `ST` maps a status to a tone; the normal state (`active`) is `plain`, with no fill, so the exceptions stand out in a list.
- `src/lib/admin/index.ts`: registers every builder in `BUILDERS`. **Import from `@/lib/admin`, not `./console`,** or the builders are not registered.
- `src/components/admin/Console.tsx`: the one renderer for any `SectionView`. `charts.tsx` draws the dashboard charts; the arithmetic behind them is in `src/lib/admin/chart-math.ts` so it can be tested.
- `src/components/admin/Queues.tsx`: the payment and content-review queues. These two are hand-built (keyboard shortcuts, previews) and act on the main store through `decidePayments` and `decideContent`.

State split: console **data** (`AdminData`, the `DATA_KEYS` list in `Console.tsx`) is written back to `s.admin` and persisted; console **view state** (`ConsoleUi`: selection, filter, search, form, draft, confirm) is local to `AdminFrame` and resets when the section changes from outside. A field added to `AdminData` must also be added to `DATA_KEYS`.

Rules the console follows:

- Destructive or money actions go through `c.ask({ needReason, reasons, run })` and then `c.log(area, action, target, reason)`. The activity log is append-only.
- `c.ro` is true when the role has view access only. `inp`/`seg`/`A` disable themselves from it; pass `free` to `A` for actions that are safe when read-only (navigation, copy).
- Permissions are enforced in the UI only. Do not treat them as security.

**Adding a section:** extend `Area` in `types.ts`, add it to `AREAS` in `seed.ts` and to `NAV` and `ICON` in `console.ts`, write the builder under `sections/`, and register it in `index.ts`. `/admin/[section]` picks it up through `isSection`.

## Conventions

### Language: two kinds of text, never mixed in one line

- **Labels are English**: anything that names a thing or an action. Headings, navigation, tabs, buttons, badges, field labels, status words ("Approved", "Waiting"), tooltips and accessible names (`aria-label`). English headings and buttons use Title Case ("What You Will Learn", "Send Reply").
- **Facts are English with 123 digits**: names of people, course code, semester, batch, dates, times, durations, counts, percentages, prices, ranks. Use the formatters in the first half of `src/lib/format.ts` (`dateEn`, `taka`, `plural`, `ago`, `semLabel`, …) and the course-fact selectors (`courseKicker`, `courseMeta`, `lessonRef`). A line made of figures is a fact even where it reads like advice ("15 points to 20th"), and a count in a badge is a fact.
- **Sentences are Bangla**: anything that talks to the person. Course, chapter and lesson titles, lesson content, greetings, the description under a heading, placeholders, empty states, dialog titles and text, validation messages. Digits inside a Bangla sentence follow the student's numeral setting: use `n()` from `useStore()`, or `digits` / `ordinal`. Never type Bangla digits into a sentence.
- A dialog therefore has a Bangla title and body, an English fact line if it needs one, and English buttons (see the test's submit dialog).
- **The admin console is English only**, digits and seed data included. `check:admin-en` scans every `.ts`, `.tsx` and `.css` file under `src/lib/admin`, `src/components/admin` and `src/app/admin`, comments and tests too. Only `৳` is allowed.
- **Reasons cross that line.** `rejectReasons` and `contentReasons` in `data.ts` carry a code with `en` and `bn` labels. Store the code; show it with `reasonText(list, code, 'en' | 'bn')`.

### Styling

- Design tokens are CSS variables in `src/app/globals.css`, for light and dark (`[data-theme]` on `<html>`). Use them (`var(--ink-2)`, `var(--surface)`, `var(--brand)`), not hex values.
- Brand tokens are derived at runtime from `BRAND` in `src/lib/brand.ts` and set inline on `<html>`. The values in `globals.css` are fallbacks for first paint; change both together (a test compares them).
- Text on a soft brand fill uses `--on-brand-soft`, not `--brand`: `--brand` on `--brand-soft` is under 4.5:1 in the light theme. Borders and icons can stay `--brand`.
- A field you type or tick in (input, textarea, checkbox) has a `--field-line` edge, which is 3:1 against every surface. `--line` and `--line-strong` are for dividers, cards and buttons.
- Touch targets are 44px. `.btn-sm`, `.ctl`, `.seg > button`, `.add-btn` and `.blk-ctl` grow to 44px under `@media (pointer: coarse), (max-width: 767px)`, so do not give them a fixed inline `height`. The admin console does the same at 767px in `admin.css`.
- An action that loses work either asks first or can be undone: the test's Submit opens a dialog, and deleting a block in the lesson editor shows `.snack` with Undo for six seconds.
- Screens are styled with inline `style` objects plus the shared classes in `globals.css` (`btn`, `seg`, `row`, `t13`, `w600`, `ink2`, `mono`, `disp`, `hl`…). Sizes that change with the screen are variables (`--d1`, `--card-pad`, `--card-cols`) reset at 1179px and 767px, so components do not need their own media queries. The student shell changes at 1023px (icon rail) and 767px (top bar and tab bar).
- The admin console has its own stylesheet, `src/app/admin/admin.css`, with every class prefixed `adm-`.
- Icons: student and teacher screens use Material Symbols by name, `<Icon name="home" />`. The admin console uses the SVG paths in `ICON` with `<Svg d={…} />`.
- Add `data-print="hide"` to chrome that must not print (the certificate prints).
- Theme is light unless the device chose dark; it never follows the system setting. It is stored under `sgz-theme`, outside the app state (`src/lib/theme.ts`).

### Tests

Tests cover `src/lib` only and run in Node with no DOM. Put logic in `src/lib` as pure functions so it can be tested, and keep components thin. Test names are sentences describing behaviour (`'refuses edits while the revision is in review'`).

`src/lib/brand.test.ts` reads `globals.css` and fails if a text token drops under 4.5:1 on its background, if `--field-line` drops under 3:1, or if the brand fallbacks in the stylesheet differ from what `brandTokens` derives. Add a pair there when you add a text-on-fill token.

## Design source

`design/` (git-ignored, so absent on a fresh clone) holds the prototype the app was ported from: `School of GenZ LMS v6.dc.html`, `Admin Console v5.dc.html` and `support.js`. When a screen's intended look or behaviour is unclear, read these before guessing. Comments such as "ported from v6 `applyBrand`" refer to functions in those files.

## Before production

See "Not real yet" in `README.md`. In short: no auth (routes are open), no API or database, simulated video and uploads, and a newly created lesson that an admin publishes does not reach students yet because the course structure is static seed data.
