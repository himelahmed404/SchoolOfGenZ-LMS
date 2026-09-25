# School of GenZ LMS

Bangla-first learning platform: student, teacher and admin apps, built from the v3 design handoff
(`School of GenZ LMS v3.dc.html` in the claude.ai/design project).

## Run

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
npm run typecheck
```

## Routes

| Role | Path | Screen |
|---|---|---|
| Student | `/` | Dashboard (redirects to `/setup` on first visit) |
| | `/setup` | First-run setup / profile (name, semester, exam date, numerals) |
| | `/course/[cst\|eng]` | Course page |
| | `/learn/[course]/[chapter]/[lesson]` | Lesson player (0-based indexes) |
| | `/test`, `/test/result` | Timed model test and review |
| | `/leaderboard` | Batch leaderboard (±5 window) |
| | `/certificate` | Certificate |
| | `/enroll`, `/enroll/pay`, `/enroll/pending` | Enrollment with bKash/Nagad |
| Teacher | `/teacher`, `/teacher/doubts`, `/teacher/content`, `/teacher/content/[key]` | Class, doubts, content, lesson editor |
| Admin | `/admin` | Payments queue + content review (desktop, keyboard shortcuts) |

## Layout of the code

- `src/lib/data.ts` — seed data ported from the prototype.
- `src/lib/state.ts` — the persisted app state shape.
- `src/lib/selectors.ts` — pure reads (progress, roster, leaderboard, queue flags, revisions).
- `src/lib/actions.ts` — pure mutations; each is the seam for a future API call.
- `src/lib/store.tsx` — React provider; persists to `localStorage` and syncs across tabs.
- `src/lib/brand.ts` — derives all brand tokens from one hex (`BRAND`).
- `src/app/globals.css` — design tokens, responsive scale, shared component classes.

## Not real yet

There is no server. State lives in `localStorage`, so the cross-role flows (student pays → admin
approves → student sees it; teacher submits → admin publishes → students see the new version) work
within one browser, including across tabs. Also simulated: video playback and upload, image picking,
the roster, doubts and leaderboard peers. Fonts load from Google Fonts. Mascot, covers and avatars
are placeholders.

Before production:
- Auth and roles (routes are open).
- API and persistence for Progress, TestAttempt, Payment, LessonRevision and Doubt. The duplicate
  TrxID check must run server-side, and the leaderboard API must return only the ±5 window.
- Stream player (bunny.net), real uploads, SMS on payment decisions.
- Newly created lessons that the admin publishes need course-structure support before students can
  see them. Updates to existing lessons already reach students.
