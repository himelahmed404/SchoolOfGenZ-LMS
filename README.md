# School of GenZ LMS

Bangla-first learning platform: student, teacher and admin apps, built from the v6 design handoff
(`School of GenZ LMS v6.dc.html` and the `Admin Console v5.dc.html` it imports, in the
claude.ai/design project).

## Run

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
npm run lint       # ESLint (eslint-config-next)
npm run typecheck
npm test           # Vitest: src/lib/*.test.ts
```

CI (`.github/workflows/ci.yml`) runs lint, typecheck, tests and the build on every push.

## Dev bar (no sign-in yet)

There is no auth. A dark strip at the top of every page switches role (student / teacher / admin)
and numerals (bn / latin), and has a jump menu to every screen of the current role. Hide it with `NEXT_PUBLIC_DEV_BAR=0`; remove it once real sign-in exists. Logout and password
change are UI-only.

## Theme

The app is light on every device, whatever the system setting. The sun/moon button (sidebar, phone
top bar, setup screen, admin console) switches to dark, and the choice is saved on that device.
`src/lib/theme.ts` holds the rule and the script that applies it before first paint.

## Language

Two kinds of text, so no line mixes scripts:

- **Facts are English with 123 digits:** names of instructors and staff, course code, semester, batch,
  dates and times, durations, counts, percentages, prices and ranks. They come from the formatters
  in the first half of `src/lib/format.ts` and the course-fact selectors in `src/lib/selectors.ts`.
- **Titles and sentences are Bangla:** course, chapter and lesson titles, lesson content, greetings,
  guidance, empty states and dialogs. Digits inside a Bangla sentence follow the student's numeral
  setting (`digits`, `ordinal`).

## Routes

| Role | Path | Screen |
|---|---|---|
| Student | `/` | Dashboard: streak, resume card, exam countdown, courses, this week (redirects to `/setup` on first visit) |
| | `/setup` | First-run setup (name, semester, exam date, numerals) |
| | `/course/[cst\|eng]` | Course page |
| | `/learn/[course]/[chapter]/[lesson]` | Lesson player: Notes / My note / Stuck / Quiz / Ask, bookmarks (0-based indexes) |
| | `/test/[course]/[chapter]`, `…/result` | Optional chapter test (timed) and its review; opens once the chapter's lessons are done |
| | `/leaderboard` | Batch leaderboard (±5 window) |
| | `/certificate` | Certificate |
| | `/enroll`, `/enroll/pay`, `/enroll/pending` | Enrollment with bKash/Nagad |
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
never blocks the next chapter, and can be retaken; the best score counts 5 leaderboard points per
correct answer. Keys: revision `cid|test:ci`, attempt and result `cid:ci`.

## Layout of the code

- `src/lib/data.ts`: seed data ported from the prototype. Course details are fields (`sem`, `batchNo`, `start`…), and times are minutes ago.
- `src/lib/state.ts`: the persisted app state shape (`version` bumps reset old saved state).
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
- `src/components/Shell.tsx`: the student/teacher shell (sidebar, icon rail below 1024px, mobile topbar and tab bar below 768px).
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
