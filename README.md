# School of GenZ LMS

Bangla-first learning platform: student, teacher and admin apps, built from the v6 design handoff
(`School of GenZ LMS v6.dc.html` and the `Admin Console v5.dc.html` it imports, in the
claude.ai/design project).

## Run

Two apps live in this repo: the LMS (Next.js, at the root) and its API (Express, in `server/`).

```bash
npm run setup      # install both: the LMS and server/
npm run dev        # both: the LMS on http://localhost:3000, the API on http://localhost:4000
npm run dev:web    # only the LMS
npm run dev:api    # only the API
npm run build && npm start
npm run lint       # ESLint (eslint-config-next)
npm run check:admin-en   # fails if Bangla text appears in admin code
npm run typecheck
npm test           # the LMS: Vitest, src/lib/**/*.test.ts
npm run test:api   # the API: Vitest, server/src/**/*.test.ts
npm run test:e2e   # journeys through both, in Chrome (Playwright, e2e/)
```

Nothing else needs installing. With no `DATABASE_URL` the API runs on an embedded Postgres kept in
`server/.data/` and loads the demo data the first time it starts. `npm --prefix server run db:reset`
rebuilds it.

CI (`.github/workflows/ci.yml`) runs two jobs on every push. The LMS: lint, the admin-English check,
typecheck, tests and the build. The API: lint, typecheck, a check that every schema change has its
migration, and the tests twice, on the embedded database and on Postgres 17.

## The API (`server/`)

The LMS is moving from seed data in the browser to this server, one area at a time. The dot in the
dev bar says whether the API is answering. So far only `/api/v1/health` is used.

- The browser never calls the API directly. It calls `/api/*` on the LMS, and Next forwards the
  request to `API_ORIGIN` (`next.config.ts`; `http://localhost:4000` in development). Cookies stay
  first-party and there is no CORS.
- `server/src/index.ts` exports the Express app, which is what Vercel runs. `src/dev.ts` listens locally.
- `server/src/app.ts` builds the app: security headers, a request id on every response, JSON bodies,
  the routes under `/v1`, and one error handler.
- Every failure has the same shape, `{ error: { code, message, fields?, requestId } }`. The LMS words
  the `code` in Bangla; `message` is for developers.
- `server/src/db/schema.ts` is the database (Drizzle). After changing it run
  `npm --prefix server run db:generate`, which writes the next SQL migration into `server/drizzle/`.
- `server/src/contract/` holds the request and response shapes (zod). The LMS imports its types as
  `@contract`, so the two cannot drift apart.
- `server/.env.example` lists the environment variables. None is needed locally.

## Dev bar (no sign-in yet)

There is no auth. A dark strip at the top of every page switches role (student / teacher / admin)
and numerals (bn / latin), and has a jump menu to every screen of the current role. Hide it with `NEXT_PUBLIC_DEV_BAR=0`; remove it once real sign-in exists. Logout and password
change are UI-only.

## Theme

The app is light on every device, whatever the system setting. The sun/moon button (sidebar, phone
top bar, setup screen, admin console) switches to dark, and the choice is saved on that device.
`src/lib/theme.ts` holds the rule and the script that applies it before first paint.

## Language

Three kinds of text, so no line mixes scripts:

- **Labels are English:** whatever names a thing or an action. Headings, navigation, tabs, buttons,
  badges, field labels, status words and accessible names.
- **Facts are English with 123 digits:** names of instructors and staff, course code, semester, batch,
  dates and times, durations, counts, percentages, prices and ranks. They come from the formatters
  in the first half of `src/lib/format.ts` and the course-fact selectors in `src/lib/selectors.ts`.
  A line made of figures is a fact ("15 points to 20th"), and so is a count in a badge.
- **Sentences are Bangla:** whatever talks to the person. Course, chapter and lesson titles, lesson
  content, greetings, the text under a heading, placeholders, empty states and dialog text. Digits
  inside a Bangla sentence follow the student's numeral setting (`n()`, `digits`, `ordinal`); they
  are never typed in as Bangla digits.
- **The admin console is English only,** including digits, dates and seed data (`lang="en"` on its
  root). What people typed still appears as typed: a lesson under review, a student's name.
- **Reasons cross that line.** `rejectReasons` and `contentReasons` in `src/lib/data.ts` carry a code
  and two labels: the admin picks the English one, and the student or teacher reads the Bangla one
  (`reasonText`, `returnReason`). The stored value is the code.

## Two kinds of product

| | Diploma batch | Single course |
|---|---|---|
| What is sold | A semester of a department | One course |
| Inside | Several subjects → chapters → lessons | Chapters → recorded lessons |
| How it runs | A dated batch with seats and an exam date | Recorded. No batch; open all the time |
| Access | For the semester | For life |
| Checked by | Chapter tests and a batch leaderboard | Projects (not built yet) |
| Certificate | No | Yes |

In the code a **program** is what is sold (`kind: 'diploma' | 'single'`), a **batch** is one run of a
diploma program, and a **course** is what is studied: a subject of a semester, or the one course of a
single program. An enrollment names a program and, for diploma, a batch.

## Routes

| Role | Path | Screen |
|---|---|---|
| Student | `/` | Dashboard: streak, resume card, exam countdown, courses, this week (redirects to `/setup` on first visit) |
| | `/setup` | First-run setup (name, semester, exam date, numerals) |
| | `/courses`, `/course/[course]` | My courses (each semester with its subjects, then single courses); course page |
| | `/explore` | Diploma batches and single courses open for enrollment |
| | `/learn/[course]/[chapter]/[lesson]` | Lesson player: Notes / Stuck? / Quiz / Q&A / My Note, bookmarks (0-based indexes). A single course has no Quiz tab |
| | `/test/[course]/[chapter]`, `…/result` | Optional chapter test (timed) and its review; opens once the chapter's lessons are done. Diploma subjects only |
| | `/leaderboard` | Batch leaderboard across the semester's subjects (±5 window). Only for a student in a diploma batch |
| | `/certificates`, `/certificate` | Certificates earned and still locked, for single courses; the certificate itself |
| | `/saved` | Bookmarked lessons and private notes |
| | `/questions` | Every question the student asked, with the teacher's answer |
| | `/payments` | The student's payments and their status |
| | `/help` | Support number and common questions (refund rule and device limit come from admin Settings) |
| | `/enroll`, `/enroll/pay`, `/enroll/pending` | Enrollment in the program picked in Explore, with bKash/Nagad. One payment at a time |
| | `/profile`, `/profile/edit` (`#password`) | Profile (stats, streak calendar, badges, bookmarks, notes) and edit |
| Teacher | `/teacher`, `/teacher/doubts` | Class progress, doubts |
| | `/teacher/content`, `/teacher/content/[key]` | Content list; editor for a lesson or a chapter test |
| | `/teacher/profile`, `/teacher/profile/edit` | Rating, payouts, courses; edit |
| Admin | `/admin` | Console overview (desktop) |
| | `/admin/payments`, `/admin/content` | Payment and content-review queues (keyboard shortcuts); content covers lessons and chapter tests |
| | `/admin/[section]` | `students`, `teachers`, `certificates`, `courses`, `batches`, `coupons`, `refunds`, `announcements`, `reports`, `activity`, `settings`, `roles` |

Notifications are a drawer in the student/teacher shell, not a route.

## Chapter tests

A chapter can end with one optional test. The teacher writes it (questions and a time limit) in the
content editor, an admin reviews it like a lesson, and only then do students see it. A chapter with
no published test shows no test option. For students it unlocks when the chapter's lessons are done,
never blocks the next chapter, and can be retaken. Submit asks first and says how many questions are
unanswered. The best score counts 5 leaderboard points per correct answer. Keys: revision
`cid|test:ci`, attempt and result `cid:ci`.

## Layout of the code

- `src/lib/data.ts`: seed data ported from the prototype. `catalog` holds the programs, batches and courses; times are minutes ago.
- `src/lib/state.ts`: the app state shape (`version` bumps reset old saved state). It carries the catalog and the student's enrollments; the catalog is not saved, so a new build always shows the current one.
- `src/lib/selectors.ts`: pure reads (progress, roster, leaderboard, queue flags, revisions).
- `src/lib/actions.ts`: pure mutations, each the seam for a future API call.
- `src/lib/store.tsx`: React provider. It persists to `localStorage` and syncs across tabs.
- `src/lib/brand.ts`: derives all brand tokens (including `--hero`) from one hex (`BRAND`).
- `src/lib/theme.ts`: light/dark choice, kept per device outside the app state.
- `src/lib/admin/`: the admin console.
  - `console.ts`: `AdminConsole` holds the helpers, permissions, View-as, search, confirm-with-reason and the activity log.
  - `sections/*`: each section builder returns a `SectionView` (a list, dashboard or detail pane).
  - `index.ts`: builders register in `BUILDERS` here.
  - `seed.ts`: seed data for the store's `admin` slice.
- `src/components/admin/Console.tsx`: the generic renderer for any `SectionView`.
- `src/components/admin/Queues.tsx`: the payment and content queues.
- `src/components/Shell.tsx`: the student/teacher shell. `NAV` holds the grouped sidebar links; below 1024px the sidebar is an icon rail, and below 768px there is a top bar and a tab bar whose "More" sheet holds the links without a `tab` label.
- `src/app/globals.css`: design tokens (light and dark), the responsive scale and shared component classes.

## Not real yet

There is no server. State lives in `localStorage`, so the cross-role flows work within one browser,
including across tabs:
- Student pays → admin approves → the student sees it.
- Teacher submits → admin publishes → students see the new version.
- Teacher replies → the student's Ask tab shows it.

Also simulated:
- video playback and upload, and image picking
- the roster, doubts and leaderboard peers
- the admin console's students, refunds, reports and staff

Fonts and icons (Material Symbols Rounded) load from Google Fonts. The mascot, covers and avatars
are placeholders.

Before production:
- Auth and roles. Routes are open, and admin permissions are enforced only in the UI.
- API and persistence for Progress, TestAttempt, Payment, LessonRevision, Doubt and the admin data.
  The duplicate TrxID check must run server-side, and the leaderboard API must return only the ±5 window.
- Stream player (bunny.net), real uploads, SMS/push for payment decisions and announcements.
- Newly created lessons that the admin publishes need course-structure support before students can
  see them. Updates to existing lessons already reach students.
