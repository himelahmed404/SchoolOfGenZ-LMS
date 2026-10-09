# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

School of GenZ LMS: a Bangla-first learning platform with three apps in one Next.js project (student, teacher, admin console). It was rebuilt from a claude.ai/design prototype and is moving onto its own API (`server/`): accounts are there, everything else is not. Every page is a client component, and apart from the signed-in person all data is seed data and state lives in `localStorage`. `README.md` has the full route table and the list of what is simulated; keep it current when routes or behaviour change.

Stack: Next.js 16 (App Router), React 19, TypeScript (strict), Vitest, ESLint 9 with `eslint-config-next`. No Tailwind, no CSS modules, no UI library. KaTeX renders formulas.

## Commands

```bash
npm run setup            # install the LMS and server/
npm run dev              # the LMS on :3000 and the API on :4000 (dev:web / dev:api for one)
npm run build            # production build
npm run lint             # ESLint
npm run check:admin-en   # fails if a Bangla letter or digit appears in admin code
npm run typecheck        # tsc --noEmit
npm test                 # vitest run (src/**/*.test.ts, node environment)

npx vitest run src/lib/format.test.ts          # one file
npx vitest run src/lib/actions.test.ts -t 'TrxID'   # tests whose name matches
npx vitest src/lib/selectors.test.ts           # watch mode

npm run test:api                               # the API's tests (server/, embedded Postgres)
npm --prefix server run lint                   # and typecheck, db:generate, db:reset
npm run test:e2e                               # Playwright journeys through both apps (e2e/)
```

CI (`.github/workflows/ci.yml`, Node 24) runs two jobs on every push: the LMS (lint, `check:admin-en`, typecheck, tests, build) and the API (lint, typecheck, migrations match the schema, tests on the embedded database and again on Postgres 17). Run lint, typecheck and tests for whichever side you changed before committing.

`NEXT_PUBLIC_DEV_BAR=0` hides the dev bar. `API_ORIGIN` is where `/api/*` is forwarded (default `http://localhost:4000` in development). The server's variables are in `server/.env.example`; none is needed locally.

Vercel deploys `main`, so work on a branch.

## Where this is going

The app is moving from seed data in the browser to a real server, in milestones B0–B11. **B0, B1 and B2 are done**: the two kinds of product are modelled in the LMS, `server/` exists with its database, and accounts are on it (sign-in, sessions, passwords, the profile, the console's roles and staff). Every other screen still runs on seed data and `localStorage`. From here an area moves to the API at a time, and its seed data is deleted from the client when it does. Until a section below says otherwise, what it describes is still true.

## The API (`server/`)

A separate Express 5 app in TypeScript with its own `package.json`, ESLint and Vitest configs. It serves the LMS, the marketing site and later a mobile app.

- **The browser never calls it across sites.** The LMS forwards `/api/*` to `API_ORIGIN` (`next.config.ts`). Call it from the LMS with `api()` in `src/lib/api/client.ts`, which throws `ApiFailure` with a `code`; fetch with TanStack Query (`ApiProvider` is in the root layout).
- **Files:** `src/index.ts` default-exports the app (Vercel's entry), `src/dev.ts` listens locally, `src/app.ts` builds it from what it depends on (`createApp({ db })`), so a test can hand it a fresh database. A feature goes in `src/modules/<area>/` as `routes.ts` (HTTP only) and `service.ts` (the rule, taking `Tx`).
- **Imports end in `.js`** (`./app.js`), because the server is Node ESM. The LMS does not do this.
- **Errors:** throw `ApiError` (`badRequest`, `forbidden`, `conflict`…) with a code; `errorHandler` is the only place a response is written for a failure. Anything else thrown is a bug: it is logged and the client gets `internal`. Codes, not sentences: each client words them.
- **Input:** `parse(schema, req.body)` from `src/http/validate.ts`. It returns only the fields the contract names.
- **Contract:** `src/contract/` holds the shapes (zod). The LMS imports the types as `@contract`. Keep that folder free of imports other than zod, since the LMS compiles it.
- **Database:** Drizzle, `src/db/schema.ts`. `Db` runs on Postgres (Neon) when `DATABASE_URL` is set and on PGlite, an embedded Postgres, when it is not. After changing the schema run `npm --prefix server run db:generate` and commit the SQL it writes into `server/drizzle/`; CI fails if you forget. Hand-written SQL (the activity log's append-only trigger) is a `--custom` migration.
- **Rules the database keeps:** a TrxID is unique, a student is in a program once, the activity log cannot be updated or deleted. Do not weaken these in code; test them in `src/db/db.test.ts`.
- **Rate limits** are counted in the database (`limit()` in `src/http/rateLimit.ts`), because the server keeps no memory between requests on Vercel.
- **Logs** are one JSON line each (`log` in `src/http/log.ts`). Never log a password, token, code or request body.
- **Tests** get a fresh migrated database per file from `testDb()`; test the HTTP surface with supertest on `createApp`. Test names are sentences, as in the LMS.
- **Demo data** is `src/db/seed/demo.json`, loaded by `seed.ts` into an empty development database. It is not for production.

## Signing in

- **Who is signed in** is `me` from `useStore()` (`Me` from `@contract`), fetched from `/auth/me` with TanStack Query under `ME_KEY`. It is also `s.me` inside actions and selectors, but it is never saved: `store.tsx` strips it from `localStorage`. A null `me` means nothing until `ready`.
- **Three kinds of person**, one app each: `student` (`/`), `teacher` (`/teacher`), `staff` (`/admin`). Students sign in with a phone number, the others with an email.
- **Two guards, neither is security.** `src/proxy.ts` redirects a request with no session cookie to `/signin?next=…` before a page is drawn. `useGuard()` runs in `Shell`, `AdminShell`, `/setup` and `/certificate`, and sends a signed-in person out of an app that is not theirs; render nothing until it returns true. The API checks the session and the permission on every request.
- **The rules are pure functions** in `src/lib/api/session.ts` (`redirectFor`, `afterSignIn`, `safeNext`, `passwordOk`), with tests. `OPEN` there and in `proxy.ts` must list the same screens.
- **Screens before sign-in** (`/signin`, `/activate`, `/forgot`, `/invite/[token]`) are built from `src/components/AuthFrame.tsx`. A new one goes in both `OPEN` lists.
- **Errors are codes.** `sayError(e, n)` in `src/lib/api/messages.ts` words a code in Bangla for students and teachers; `sayAdmin` in `src/lib/admin/errors.ts` words it in English for the console. Add the wording when the API gains a code.
- **Signing out** is `signOut()` from the store, then `router.replace('/signin')`. It drops everything fetched for that person; `signedIn(user)` fetches it again for the next one.
- **Limits to remember when testing:** a student may be on two devices (`sgz-device` in `localStorage` names the browser), and one login gets ten tries in 15 minutes, right or wrong. `e2e/session.ts` has the helpers that stay inside both.
- **Demo accounts** share the password `DEMO_PASSWORD` in `server/src/db/seed.ts`. In development the API prints each SMS in its terminal, which is where a reset code is read.

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

### Catalog: programs, batches, courses

There are two kinds of product, and they are not the same shape:

| | Diploma batch | Single course |
|---|---|---|
| Sold as | A semester of a department, one price | One recorded course |
| Runs as | Dated batches | No batch; open all the time, kept for life |
| Has | Chapter tests, lesson quizzes, a batch leaderboard | Projects (not built yet), a certificate |

- `Program` is what is sold (`kind: 'diploma' | 'single'`), `Batch` is one run of a diploma program, `Course` is what is studied: a subject of a semester, or the one course of a single program. `Enrollment` is `{ program, batch? }`.
- The catalog is `s.catalog`, seeded from `catalog` in `data.ts`. Screens read it through selectors or `s.catalog.courses[id]`; nothing outside `src/lib` imports the seed catalog. It is left out of saved state (`store.tsx`), so a new build always shows the current one.
- Start from the selectors: `myPrograms`, `myCourses`, `myBatch`, `programOf`, `batchOf`, `isSingle`, `offers`, `payingOffer`, `offerView`, `programName`.
- Anything that belongs to a batch must cope with there being none: `myBatch(s)` is undefined for a student with only single courses, so the leaderboard, the rank tile and the live-class row are hidden for them. Questions on a lesson are per batch in a diploma subject and shared in a single course (`doubtsFor(s, cid, bid?)`).
- A diploma program's name is a fact, so it is always English (`CST · 4th Semester`). A single program is named by its course's title.
- One payment is made at a time: `s.payment.program` is what it is for (`chooseProgram`), and approving it adds the enrollment (`decidePayments`).

### Keys

`cid` is a course id. Route params and keys use **0-based** chapter and lesson indexes; display adds 1 (`lessonRef`).

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

Both frames call `useGuard()` and show the signed-in person. `DevBar` is rendered in development only; it signs in as a demo student, teacher or admin through `/auth/dev`, a route the API has only outside production.

**Adding a student or teacher screen:** create the route, add it to `NAV` in `Shell.tsx`, add it to `JUMPS` and `screenOf` in `DevBar.tsx`, and add a row to the README route table.

### Admin console

The console is data-driven. It does not have a component per section.

- `src/lib/admin/console.ts`: the `AdminConsole` class. A new instance is built on every render from `(state, setState, env)`. It holds formatting (`nf`, `tk`, `pl`, `fd`, `when`), permissions (`perm`), effects (`upd`, `log`, `flash`, `ask`, `go`/`nav`) and view-model constructors (`T`/`B` cells, `kv`, `it`, `inp`/`area`/`seg` fields, `blk`, `A` actions, `K` stat tiles, `mkList`).
- In the console a **course** is what is sold: `AdminCourse.kind` is `diploma` (a semester, with `subjects` and batches) or `single` (one subject, no batch, its own `enrolled` count). Teachers are assigned to subjects. Use `c.studentsOf`, `c.lessonsOf`, `c.subject`, `c.teacherOf(subjectId)` and `c.inWhat(row)` instead of reading batches directly.
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
- Permissions are enforced by the API for Roles & staff, which is the one section on the server (`src/lib/admin/api.ts`; `c.send(call, then)` runs a request and shows its failure). Every other section still enforces them in the UI only. Do not treat those as security.

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

See "Not real yet" in `README.md`. In short: only accounts are on the server, no SMS gateway is connected, simulated video and uploads, and a newly created lesson that an admin publishes does not reach students yet because the course structure is static seed data.
