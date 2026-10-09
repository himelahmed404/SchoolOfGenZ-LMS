/* Admin console data (ported from Admin Console v5). Each list maps to a server resource. */

export type Area = 'payments' | 'content' | 'refunds' | 'students' | 'teachers' | 'certificates' | 'courses' | 'batches' | 'coupons' | 'announcements' | 'reports' | 'activity' | 'settings' | 'roles';
export type Section = 'overview' | Area;
export type Perm = 'none' | 'view' | 'edit';
/** Number inputs keep '' while the field is being edited. */
export type Num = number | '';

export interface Role { id: string; name: string; desc: string; locked?: boolean; perms: Record<Area, Perm> }
export interface Staff { id: string; name: string; email: string; role: string; last: string }
/** What is studied inside a course: a subject of a diploma semester, or the single course itself. */
export interface Subject { id: string; code: string; title: string; lessons: number }
/**
 * What is sold. A diploma course is one semester of a department: several subjects and dated batches.
 * A single course is one recorded course: no batch, open all the time, kept for life.
 */
export interface AdminCourse {
  id: string; kind: 'diploma' | 'single'; code: string; title: string; status: 'draft' | 'published' | 'archived';
  model: 'free' | 'one' | 'inst'; price: Num; inst: number;
  early: 'on' | 'off'; earlyPrice: Num; earlyEnd: string;
  perBatch: 'on' | 'off'; bp: Record<string, Num>;
  subjects: Subject[];
  /** Students in a single course. A diploma course counts them through its batches. */
  enrolled: number;
}
/** One run of a diploma course; `course` is that course's id. */
export interface Batch { id: string; course: string; start: string; exam: string; seats: Num; enrolled: number; status: 'enrolling' | 'running' | 'closed' | 'finished' }
/** `courses` holds the ids of the subjects they teach. */
export interface AdminTeacher { id: string; name: string; email: string; courses: string[]; med: number; overdue: number; answered: number; status: 'active' | 'invited' | 'inactive'; joined: string }
export interface AdminStudent {
  /** `batch` is set for a diploma course only. */
  id: string; name: string; phone: string; course: string; batch?: string; status: 'active' | 'pending' | 'suspended';
  paid: number; due: number; prog: number; devices: { n: string; last: string }[]; joined: string; note?: string;
}
export interface Coupon { id: string; code: string; type: 'pct' | 'amt'; value: number; scope: string; used: number; limit: number; exp: string; disabled: boolean }
export interface Refund {
  id: string; name: string; course: string; batch?: string; paid: number; method: string; number: string; ago: number; watched: number; why: string;
  status: 'open' | 'refunded' | 'denied'; amount?: number; reason?: string;
}
export interface Cert { id: string; name: string; course: string; issued: string; status: 'valid' | 'revoked'; reason?: string }
export interface Announcement { id: string; title: string; body: string; aud: 'all' | 'course' | 'batch'; target: string; ch: string[]; status: 'sent' | 'scheduled' | 'draft'; when: string }
/** `at` is a timestamp (ms). */
export interface ActivityEntry { id: string; at: number; actor: string; area: string; action: string; target: string; reason: string }
export interface Settings { bkash: string; nagad: string; watermark: 'on' | 'off'; devices: number; refundDays: Num; refundWatch: Num; autoClose: 'on' | 'off'; sms: 'on' | 'off' }

export interface AdminData {
  roles: Role[]; staff: Staff[]; courses: AdminCourse[]; batches: Batch[]; teachers: AdminTeacher[]; students: AdminStudent[];
  coupons: Coupon[]; refunds: Refund[]; certs: Cert[]; ann: Announcement[]; activity: ActivityEntry[]; settings: Settings;
  /** Staff member the console is being viewed as (no auth yet). */
  viewAs: string;
  navMini: boolean;
  /** Width of the detail pane in px, as last dragged. */
  paneW?: number;
}

/* ---------- view model the console renderer draws ---------- */

/** `plain` marks a badge with no fill (the normal state of a status), so it lines up with plain text. */
export interface Cell { isText: boolean; isBadge: boolean; t: string; sub: string; hasSub: boolean; font: string; subFont: string; weight: number; fg: string; subFg: string; bg: string; plain?: boolean }
export interface Action { label: string; go: () => void; bg: string; fg: string; bd: string; op: number }
/** A label and its value. With `go` the row is a shortcut (e.g. to a filter); `on` marks the one in use. */
export interface KV { k: string; v: string; font: string; fg: string; weight: number; go?: () => void; on?: boolean }
export interface Item { t: string; sub: string; hasSub: boolean; right: string; hasRight: boolean; hasAct: boolean; actLabel: string; actGo: () => void }
export interface SegOpt { label: string; go: () => void; bg: string; fg: string; bd: string; weight: number; op: number }
export interface Field {
  label: string; hasLabel: boolean; isInput: boolean; isArea: boolean; isSeg: boolean; dir: 'row' | 'column'; align: string;
  bd: string; hint: string; hasHint: boolean; hintFg: string;
  type?: string; value?: string; onChange?: (v: string) => void; ph?: string; disabled?: boolean; opts?: SegOpt[];
}
export interface Block {
  title: string; hasTitle: boolean; note: string; hasNote: boolean; noteBg: string; kv: KV[]; hasKv: boolean; fields: Field[]; hasFields: boolean; items: Item[]; hasItems: boolean;
  /** In the full-width form (Settings) this block takes a whole row instead of one column. */
  wide?: boolean;
}
export interface Detail { title: string; sub?: string; badge?: Cell | null; closable?: boolean; wide?: boolean; blocks: Block[]; actions?: Action[] }
/** A filter tab. `view` marks a tab that switches the view (Roles / Staff) instead of filtering the list. */
export interface Tab { label: string; count: string; go: () => void; on: boolean; view?: boolean }
export interface ListView {
  filters: Tab[];
  hasSearch: boolean; ph: string;
  /** Column headers. The last `extra` of them (and of each row's cells) show only when the list is wide. */
  cols: string[]; extra: number;
  /** grid-template-columns for the normal and the wide layout. */
  grid: string; gridWide: string;
  rows: { key: string; cells: Cell[]; go: () => void; on: boolean }[];
  isEmpty: boolean; empty: string;
  /** Paging over the filtered rows; `prev`/`next` are null at the ends. */
  page: { from: number; to: number; total: number; prev: (() => void) | null; next: (() => void) | null };
}

/* Dashboards (Overview, Reports). Charts follow one hue per series; status colours are kept for status. */
export interface Kpi {
  label: string; value: string; sub: string; go: () => void; icon: string; iconBg: string; iconFg: string;
  /** Change against a named period: `text` is signed ("+12% vs last month"), `good` says whether that direction is good news. */
  delta?: { text: string; dir: 'up' | 'down' | 'flat'; good: boolean };
  /** Recent values, oldest first; the last one is the current period. */
  spark?: number[];
}
/** One bar of a ranked list; every bar shares the series colour. */
export interface Bar { label: string; value: string; pct: number }
/** A ratio against a limit. `warn` when it is close to the limit, with `note` saying so in words. */
export interface Meter { label: string; value: string; pct: number; warn: boolean; note: string }
export interface Point { x: string; y: number }
/** One series over time. `partial` marks the last point as an unfinished period. */
export interface Trend { points: Point[]; unit: 'taka' | 'count'; partial?: boolean }
/** Parts of a whole; `slot` picks the validated categorical colour (1 or 2). `sub` is a second fact about the part. */
export interface Share { label: string; value: string; pct: number; slot: 1 | 2; sub?: string }
export interface Panel {
  title: string; sub?: string;
  /** Columns out of 12 on a wide screen. */
  span: 4 | 6 | 8 | 12;
  items?: Item[]; bars?: Bar[]; meters?: Meter[]; trend?: Trend; share?: Share[];
  /** The whole that `share` divides, shown in the middle of the ring. */
  whole?: { label: string; value: string };
  /** A switch in the panel header that scopes this panel alone (the period of Overview's revenue chart). */
  seg?: Tab[];
  table?: { cols: string[]; rows: string[][] };
  /** Link in the panel header, e.g. to the full list. */
  more?: { label: string; go: () => void };
}
export interface Dash { seg: Tab[]; kpis: Kpi[]; panels: Panel[] }

/** A table of every role against every area (Roles & staff). */
export interface Matrix {
  filters: Tab[];
  cols: { key: string; title: string; sub: string; on: boolean; go: () => void }[];
  rows: { label: string; cells: Cell[] }[];
}

export interface SectionView {
  title: string; sub: string; head: Action[];
  list?: ListView; dash?: Dash; matrix?: Matrix; detail?: Detail;
  /** Section-wide numbers shown beside a list while no row is selected. */
  summary?: KV[];
  /** What the filter tabs divide the list by, as the summary's heading. Default: "By status". */
  tabsLabel?: string;
}

export interface ConfirmSpec {
  title: string; body?: string; needReason?: boolean; reasons?: string[]; danger?: boolean; ok?: string;
  run: (reason: string) => void;
}
