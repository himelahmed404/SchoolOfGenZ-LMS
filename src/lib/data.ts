// Seed data ported from the v6 design prototype. Replace with API data once a server exists.
// Facts (names, batches, dates, times, counts, prices) are English; titles and lesson content are Bangla.
import { digits, pad2 } from './format';
import type { Block, BlockType, Catalog, Chapter, ChapterTest, Confusion, CourseId, Doubt, LessonRevision, Notif, PayMethod, Payment, PayStatus, QuizQ, Reason, Tone } from './types';

export const boardExam = { name: 'পর্ব সমাপনী পরীক্ষা', even: '2026-12-14', odd: '2027-04-18' };
/** Diploma semesters a student can pick. */
export const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

export const confusions: Record<string, Confusion[]> = {
  'dsa:0:2': [
    { q: 'ডেটা স্ট্রাক্চার আর ডেটাবেস — একই জিনিস?', a: 'না। ডেটা স্ট্রাক্চার হলো চলমান প্রোগ্রামের মেমরিতে ডেটা সাজানোর নিয়ম — প্রোগ্রাম বন্ধ হলেই শেষ। ডেটাবেস ডিস্কে রাখে, প্রোগ্রাম বন্ধ হলেও থাকে। মজার ব্যাপার হলো, ডেটাবেস নিজেও ভেতরে ডেটা স্ট্রাক্চার ব্যবহার করে — যেমন B-tree।' },
    { q: 'O(n) মানে কত সেকেন্ড?', a: 'কোনো সেকেন্ড না। O(n) বলে দেয় ডেটা n গুণ বাড়লে কাজের সময়ও মোটামুটি n গুণ বাড়বে — বাড়ার হার, পরিমাপ নয়। তাই খুব ছোট ডেটায় একটা O(n²) কোড O(n)-এর চেয়ে দ্রুতও হতে পারে।' }
  ],
  'dsa:2:4': [
    { q: 'স্ট্যাকের top আর অ্যারের শেষ ইনডেক্স — একই জিনিস?', a: 'না। অ্যারের শেষ ইনডেক্স মানে বরাদ্দ করা জায়গার শেষ ঘর — সেটা ফিক্সড। top হলো এই মুহূর্তে সবচেয়ে উপরে থাকা এলিমেন্টের ইনডেক্স — push করলে বাড়ে, pop করলে কমে। খালি স্ট্যাকে top = −১, কিন্তু শেষ ইনডেক্স তখনও size − ১।' },
    { q: 'overflow আর underflow গুলিয়ে ফেলি — কোনটা কখন?', a: 'ভরা স্ট্যাকে আরেকটা push করতে গেলে overflow — জায়গা নেই। খালি স্ট্যাকে pop করতে গেলে underflow — সরানোর কিছু নেই। মনে রাখার সহজ উপায়: over মানে উপরে উপচে পড়া, under মানে নিচে আর কিছু বাকি নেই।' },
    { q: 'কিউ থেকে একটা বের হলে বাকিরা এক ঘর করে এগোয়?', a: 'সাধারণ (লিনিয়ার) কিউ-এ এগোয় না — front পয়েন্টারটাই এক ঘর সামনে সরে যায়। ফলে শুরুর ঘরগুলো খালি পড়ে থাকে, আর কিউ ভরা না হলেও ভরা মনে হয়। এই অপচয় সারাতেই সার্কুলার কিউ — পরের লেসন।' },
    { q: 'পরীক্ষায় শুধু LIFO/FIFO লিখলেই পুরো নম্বর?', a: 'না। বোর্ড প্রায়ই “উদাহরণসহ ব্যাখ্যা কর” চায়। স্ট্যাকের জন্য ব্রাউজারের ব্যাক বাটন বা ফাংশন কল স্ট্যাক, কিউ-এর জন্য প্রিন্টারের কাজের লাইন — একটা উদাহরণ লিখলেই নম্বর কাটা যায় না।' }
  ],
  'dsa:2:5': [
    { q: 'rear সবসময় front-এর পরে থাকে?', a: 'সার্কুলার কিউ-এ না। rear ঘুরে এসে front-এর আগেও চলে যেতে পারে — এটাই “সার্কুলার” হওয়ার মানে। তাই ইনডেক্স তুলনা করে “কে আগে” বুঝতে যাওয়াটাই ভুল।' },
    { q: 'কিউ ভরা আর খালি — দুটো আলাদা করবো কীভাবে?', a: 'ভরা: (rear + ১) % size == front। কিন্তু খালি অবস্থাতেও front আর rear গা লাগাতে পড়তে পারে। তাই হয় একটা ঘর ইচ্ছা করে ফাঁকা রাখতে হয়, নয়তো আলাদা একটা count রাখতে হয়। শুধু front আর rear দেখে হয় না।' }
  ]
};

export const outcomeSets: Record<CourseId, { t: string; ch: number }[]> = {
  dsa: [
    { t: 'অ্যারে আর লিংকড লিস্ট — কোনটা কখন ব্যবহার করবে, যুক্তি দিয়ে বলতে পারবে', ch: 1 },
    { t: 'স্ট্যাক দিয়ে ইনফিক্স থেকে পোস্টফিক্স রূপান্তর খাতায় করতে পারবে', ch: 2 },
    { t: 'বাইনারি সার্চ ট্রি বানিয়ে তিন রকম ট্রাভার্সাল লিখতে পারবে', ch: 3 },
    { t: 'পাঁচটা সর্টিং অ্যালগোরিদম কোড করে কমপ্লেক্সিটি তুলনা করতে পারবে', ch: 4 },
    { t: 'গ্রাফে BFS আর DFS চালিয়ে শর্টেস্ট পাথ বের করতে পারবে', ch: 5 }
  ],
  eng: [
    { t: 'ইংরেজি শব্দ শুনে লিখতে আর দেখে শুদ্ধ উচ্চারণে বলতে পারবে', ch: 0 },
    { t: 'পরিচয়, ঠিকানা, দরদাম — দৈনন্দিন কথা ইংরেজিতে চালাতে পারবে', ch: 1 }
  ]
};

/** What a program on sale promises, shown on its enroll page. A diploma batch lists its subjects instead. */
export const programOutcomes: Record<string, string[]> = {
  web: [
    'HTML আর CSS দিয়ে ডিজাইন দেখে হুবহু পেজ বানাতে পারবে',
    'JavaScript দিয়ে ফরম যাচাই আর ইন্টারঅ্যাকশন লিখতে পারবে',
    'মোবাইলে ঠিকমতো দেখায় — এমন রেসপন্সিব লেআউট করতে পারবে',
    'Git দিয়ে কাজ সেভ করে GitHub-এ তুলতে পারবে',
    'নিজের তিনটা প্রজেক্ট লাইভ লিংকসহ দেখাতে পারবে'
  ],
};

export const merchants: Record<PayMethod, string> = { bKash: '01777 090909', Nagad: '01888 070707' };

export const queueSeed: Payment[] = [
  { id: 'q1', name: 'Sadia Afrin', phone: '01812 337742', course: 'CST · 4th Semester', batch: 'CST-04-B01', method: 'bKash', amount: 3000, due: 3000, trx: 'BKX9T4LM20', sender: '01812 337742', agoMin: 12, status: 'pending' },
  { id: 'q2', name: 'Rakibul Islam', phone: '01911 208864', course: 'Spoken English — Foundation', method: 'Nagad', amount: 1500, due: 2000, trx: 'NGD5K1RW83', sender: '01911 208864', agoMin: 26, status: 'pending' },
  { id: 'q3', name: 'Nusrat Jahan Mim', phone: '01741 665503', course: 'CST · 4th Semester', batch: 'CST-04-B01', method: 'bKash', amount: 3000, due: 3000, trx: 'BKX2P8VC57', sender: '01918 442210', agoMin: 41, status: 'pending' },
  { id: 'q4', name: 'Tanvir Hossain', phone: '01684 991127', course: 'Web Development Basics', method: 'bKash', amount: 2500, due: 2500, trx: 'BKX6Q3ZN14', sender: '01684 991127', agoMin: 60, status: 'pending' },
  { id: 'q5', name: 'Farhana Akter', phone: '01521 774096', course: 'Spoken English — Foundation', method: 'Nagad', amount: 2000, due: 2000, trx: 'NGD8W2YT65', sender: '01521 774096', agoMin: 75, status: 'pending' },
  { id: 'q6', name: 'Ariful Islam', phone: '01733 550218', course: 'CST · 4th Semester', batch: 'CST-04-B01', method: 'bKash', amount: 3000, due: 3000, trx: 'BKX9T4LM20', sender: '01733 550218', agoMin: 120, status: 'pending', dup: true },
  { id: 'q7', name: 'Sumaiya Binte Karim', phone: '01876 331409', course: 'Web Development Basics', method: 'Nagad', amount: 2500, due: 2500, trx: 'NGD3M7QX92', sender: '01876 331409', agoMin: 140, status: 'pending' },
  { id: 'q8', name: 'Imran Kabir', phone: '01958 002264', course: 'Spoken English — Foundation', method: 'bKash', amount: 2000, due: 2000, trx: 'BKX1L5HD38', sender: '01958 002264', agoMin: 180, status: 'pending' },
  { id: 'q9', name: 'Jannatul Ferdous', phone: '01627 883351', course: 'CST · 4th Semester', batch: 'CST-04-B01', method: 'bKash', amount: 3000, due: 3000, trx: 'BKX4C9JR76', sender: '01627 883351', agoMin: 200, status: 'pending' },
  { id: 'q10', name: 'Mehedi Hasan', phone: '01799 116740', course: 'Web Development Basics', method: 'Nagad', amount: 1000, due: 2500, trx: 'NGD7B4KF29', sender: '01799 116740', agoMin: 240, status: 'pending' },
  { id: 'q11', name: 'Sharmin Sultana', phone: '01555 448802', course: 'Spoken English — Foundation', method: 'bKash', amount: 2000, due: 2000, trx: 'BKX8N2WS45', sender: '01555 448802', agoMin: 1500, status: 'approved' },
  { id: 'q12', name: 'Nafis Iqbal', phone: '01844 907715', course: 'CST · 4th Semester', batch: 'CST-04-B01', method: 'Nagad', amount: 3000, due: 3000, trx: 'NGD6V1PA83', sender: '01844 907715', agoMin: 1560, status: 'approved' },
  { id: 'q13', name: 'Rubaiya Haque', phone: '01712 664438', course: 'Web Development Basics', method: 'bKash', amount: 500, due: 2500, trx: 'BKX0F3TM61', sender: '01712 664438', agoMin: 1620, status: 'rejected' }
];

/** What the signed-in student paid for the programs they are already in. */
export const paymentHistory: { id: string; program: string; method: PayMethod; amount: number; trx: string; date: string; status: PayStatus }[] = [
  { id: 'p2', program: 'eng', method: 'Nagad', amount: 2000, trx: 'NGD4T9LC61', date: '2026-08-16', status: 'approved' },
  { id: 'p1', program: 'cst4', method: 'bKash', amount: 3000, trx: 'BKX3H8QK27', date: '2026-08-02', status: 'approved' },
];

/** Why a payment is rejected. The admin picks the English label; the student reads the Bangla one. */
export const rejectReasons: Reason[] = [
  { code: 'wrong_trx', en: 'Wrong TrxID', bn: 'ভুল TrxID' },
  { code: 'short', en: 'Amount too low', bn: 'টাকা কম' },
  { code: 'duplicate', en: 'Duplicate', bn: 'ডুপ্লিকেট' },
  { code: 'other_number', en: 'Different number', bn: 'অন্য নম্বর' },
];

/** Generated classmates per batch, until the roster comes from the server: a seed for the names and how many there are. */
export const rosterSeed: Record<string, { seed: number; size: number }> = {
  'CST-04-B01': { seed: 11, size: 30 },
  'CST-04-B02': { seed: 23, size: 24 },
};
export const firstNames = ['Sakib', 'Tasnim', 'Rifat', 'Mahia', 'Naim', 'Fariha', 'Tanvir', 'Sumaiya', 'Arif', 'Nusrat', 'Jubayer', 'Lamia', 'Rakib', 'Tanzila', 'Emon', 'Sadia', 'Fahim', 'Maria', 'Shuvo', 'Afsana', 'Rahat', 'Jannat', 'Sajib', 'Nadia', 'Hridoy', 'Moumita', 'Tarek', 'Sanjida'];
export const lastNames = ['Islam', 'Hossain', 'Ahmed', 'Rahman', 'Khan', 'Chowdhury', 'Sarkar', 'Haque', 'Biswas', 'Talukdar', 'Majumdar', 'Sheikh'];
export const doubtSeed: Doubt[] = [
  { id: 'd1', batch: 'CST-04-B01', course: 'dsa', ch: 2, li: 4, who: 'Rakib Hasan', q: 'স্ট্যাক আর কিউ একসাথে ব্যবহার করা যায়? বইয়ে একটা উদাহরণ আছে বুঝিনি।', agoMin: 3120, reply: 'যায়। দুইটা স্ট্যাক দিয়ে কিউ বানানো একটা ক্লাসিক প্রশ্ন — অধ্যায় ০৩-এর শেষ লেসনে দেখাবো।', by: 'Shahriar Hossain', replyAgoMin: 2880 },
  { id: 'd2', batch: 'CST-04-B01', course: 'dsa', ch: 2, li: 4, who: 'Sumaiya Akter', q: 'underflow আর overflow-এর পার্থক্যটা আরেকবার বলবেন?', agoMin: 1620 },
  { id: 'd3', batch: 'CST-04-B01', course: 'dsa', ch: 0, li: 3, who: 'Fahim Muntasir', q: 'O(1) আর O(n)-এর পার্থক্য পরীক্ষার খাতায় কীভাবে লিখলে পুরো নম্বর পাবো?', agoMin: 1860 },
  { id: 'd4', batch: 'CST-04-B01', course: 'dsa', ch: 2, li: 2, who: 'Tanzila Rahman', q: 'top = −1 দিয়ে শুরু করি কেন? 0 দিয়ে শুরু করলে কী সমস্যা?', agoMin: 300 },
  { id: 'd5', batch: 'CST-04-B01', course: 'dsa', ch: 2, li: 3, who: 'Jubayer Alam', q: 'enqueue করার সময় আগে rear বাড়াবো, নাকি আগে মান বসাবো?', agoMin: 40 },
  { id: 'd6', batch: 'CST-04-B01', course: 'dsa', ch: 1, li: 2, who: 'Nadia Islam', q: 'ডাবলি লিংকড লিস্টে prev পয়েন্টার না রাখলে ঠিক কোন কাজটা কঠিন হয়?', agoMin: 4200, reply: 'পেছন দিকে যাওয়া, আর মাঝখান থেকে কোনো নোড মুছে ফেলা। prev না থাকলে আগের নোডটা খুঁজতে আবার শুরু থেকে হাঁটতে হয় — O(n)।', by: 'Shahriar Hossain', replyAgoMin: 4320 }
];
export const stackBlocks: Block[] = [
  { t: 'h', x: 'স্ট্যাক (Stack) কী?' },
  { t: 'p', x: 'স্ট্যাক হলো এমন একটি লিনিয়ার ডেটা স্ট্রাকচার যেখানে ডেটা একটি প্রান্ত দিয়েই ঢোকে আর সেই একই প্রান্ত দিয়েই বের হয়। প্রান্তটির নাম top। ব্যাপারটা প্লেটের স্তূপের মতো — সবার শেষে যে প্লেটটা রাখলে, হাতে আসবে সেটাই আগে।' },
  { t: 'code', x: 'LIFO — Last In, First Out' },
  { t: 'p', x: 'স্ট্যাকের মূল অপারেশন চারটি:' },
  { t: 'list', x: 'push() — উপরে নতুন এলিমেন্ট বসানো\npop() — উপরের এলিমেন্ট সরানো\npeek() — উপরের এলিমেন্ট দেখা, না সরিয়ে\nisEmpty() — স্ট্যাক খালি কিনা যাচাই' },
  { t: 'h', x: 'কিউ (Queue) কী?' },
  { t: 'p', x: 'কিউ-এর নিয়ম উল্টো। এক প্রান্ত দিয়ে ডেটা ঢোকে (rear), অন্য প্রান্ত দিয়ে বের হয় (front) — ঠিক টিকিট কাউন্টারের লাইনের মতো। যে আগে দাঁড়িয়েছে, সে আগে যাবে।' },
  { t: 'p', x: 'পরীক্ষায় প্রায় প্রতিবার আসে: স্ট্যাক LIFO, কিউ FIFO। আর ইনফিক্স থেকে পোস্টফিক্স রূপান্তর, ফাংশন কল ট্র্যাকিং, ব্রাউজারের ব্যাক বাটন — এই তিনটাই স্ট্যাকের প্রয়োগ।' }
];
/* ---------- chapter tests ---------- */

/** Time limit a new chapter test starts with. */
export const DEFAULT_TEST_SECONDS = 600;
/** A chapter test needs at least this many questions before it can go to review. */
export const MIN_TEST_QUESTIONS = 5;

const q = (stem: string, o: string[], a: number): QuizQ => ({ stem, o, a });

const arrayTest: ChapterTest = { seconds: 480, qs: [
  q('অ্যারের কোনো এলিমেন্ট ইনডেক্স দিয়ে পড়তে কত সময় লাগে?', ['O(1)', 'O(n)', 'O(log n)', 'O(n²)'], 0),
  q('C ভাষায় অ্যারের প্রথম এলিমেন্টের ইনডেক্স কত?', ['0', '1', '−1', 'অ্যারের সাইজ'], 0),
  q('অ্যারের মাঝখানে নতুন এলিমেন্ট ঢোকাতে সবচেয়ে খারাপ ক্ষেত্রে কত সময় লাগে?', ['O(1)', 'O(n)', 'O(log n)', 'O(n²)'], 1),
  q('অ্যারের এলিমেন্টগুলো মেমরিতে কীভাবে থাকে?', ['পাশাপাশি, একটানা ঘরে', 'এলোমেলো জায়গায়', 'পয়েন্টার দিয়ে জোড়া লাগানো', 'হার্ড ডিস্কে'], 0),
  q('O(n) বলতে কী বোঝায়?', ['ডেটা যত গুণ বাড়ে, কাজও মোটামুটি তত গুণ বাড়ে', 'কাজ শেষ হতে ঠিক n সেকেন্ড লাগে', 'ডেটা বাড়লেও সময় একই থাকে', 'সময় বাড়ে ডেটার বর্গ হারে'], 0),
] };

const linkedListTest: ChapterTest = { seconds: 480, qs: [
  q('অ্যারের তুলনায় লিংকড লিস্টের প্রধান সুবিধা কী?', ['ইনডেক্স দিয়ে দ্রুত পড়া যায়', 'সাইজ ইচ্ছামতো বাড়ে-কমে', 'কম মেমরি লাগে', 'সবসময় সাজানো থাকে'], 1),
  q('সিঙ্গলি লিংকড লিস্টের প্রতিটি নোডে কী থাকে?', ['শুধু ডেটা', 'ডেটা আর ইনডেক্স', 'ডেটা আর পরের নোডের ঠিকানা', 'আগের ও পরের দুই নোডের ঠিকানা'], 2),
  q('লিংকড লিস্টের একদম শুরুতে নতুন নোড যোগ করতে কত সময় লাগে?', ['O(1)', 'O(n)', 'O(log n)', 'O(n²)'], 0),
  q('ডাবলি লিংকড লিস্টের নোডে বাড়তি কী থাকে?', ['আরেকটা ডেটা', 'ইনডেক্স নম্বর', 'লিস্টের সাইজ', 'আগের নোডের ঠিকানা (prev)'], 3),
  q('লিংকড লিস্টের k-তম এলিমেন্ট পড়তে কত সময় লাগে?', ['O(1)', 'O(n)', 'O(log n)', 'O(n²)'], 1),
] };

const stackQueueTest: ChapterTest = { seconds: 480, qs: [
  q('স্ট্যাক কোন নীতিতে চলে?', ['FIFO', 'LIFO', 'প্রায়োরিটি', 'র‍্যান্ডম'], 1),
  q('কিউ থেকে এলিমেন্ট বের করার অপারেশনের নাম কী?', ['pop()', 'enqueue()', 'dequeue()', 'peek()'], 2),
  q('ইনফিক্স থেকে পোস্টফিক্স রূপান্তরে কোন ডেটা স্ট্রাকচার লাগে?', ['কিউ', 'স্ট্যাক', 'ট্রি', 'গ্রাফ'], 1),
  q('অ্যারে দিয়ে বানানো খালি স্ট্যাকে top-এর মান সাধারণত কত ধরা হয়?', ['0', '1', '−1', 'অ্যারের সাইজ'], 2),
  q('সার্কুলার কিউ ভরা — কোন শর্তে বোঝা যায়?', ['(rear + 1) % size == front', 'rear == front', 'front == 0', 'rear == size'], 0),
] };

/** Written by the teacher for the Tree chapter and waiting for admin review, so students do not see it yet. */
const treeTestQs: QuizQ[] = [
  q('বাইনারি ট্রিতে একটি নোডের সর্বোচ্চ কয়টি চাইল্ড থাকতে পারে?', ['১', '২', '৩', 'যত খুশি'], 1),
  q('বাইনারি সার্চ ট্রি-তে সবচেয়ে ছোট মান কোথায় থাকে?', ['রুট নোডে', 'সবচেয়ে ডান দিকের নোডে', 'সবচেয়ে বাঁ দিকের নোডে', 'যেকোনো লিফে'], 2),
  q('ইনঅর্ডার ট্রাভার্সালে BST-র মানগুলো কোন ক্রমে আসে?', ['ছোট থেকে বড়', 'বড় থেকে ছোট', 'এলোমেলো', 'লেভেল অনুযায়ী'], 0),
  q('প্রি-অর্ডার ট্রাভার্সালের ক্রম কোনটি?', ['বাম → রুট → ডান', 'রুট → বাম → ডান', 'বাম → ডান → রুট', 'ডান → রুট → বাম'], 1),
  q('ম্যাক্স-হিপের রুটে কোন মান থাকে?', ['সবচেয়ে ছোট', 'মাঝের মান', 'সবচেয়ে বড়', 'যেকোনো মান'], 2),
];

export const itemSeeds: Record<string, Partial<LessonRevision>> = {
  'dsa|lesson:5:4': { status: 'review', update: true, by: 'Shahriar Hossain', subAgoMin: 35,
    quiz: [
      { stem: 'Dijkstra কখন ভুল উত্তর দিতে পারে?', o: ['কোনো এজের ওজন ঋণাত্মক হলে', 'গ্রাফ ডিরেক্টেড হলে', 'নোড ১০০-র বেশি হলে', 'গ্রাফে সাইকেল থাকলে'], a: 0, why: 'ঋণাত্মক ওজনে আগে চূড়ান্ত ধরা দূরত্ব পরে কমে যেতে পারে — Dijkstra সেটা আর ফিরে দেখে না।' },
      { stem: 'প্রতি ধাপে কোন নোড বেছে নেওয়া হয়?', o: ['সবচেয়ে কাছের অদেখা নোড', 'সবচেয়ে বেশি প্রতিবেশী যার', 'বর্ণানুক্রমে পরের নোড', 'যেকোনো একটা নোড'], a: 0, why: '' }
    ], blocks: [
    { t: 'h', x: 'Dijkstra কী খোঁজে?' },
    { t: 'p', x: 'একটা নোড থেকে বাকি সব নোডে সবচেয়ে কম খরচের পথ। শর্ত একটাই — কোনো এজের ওজন ঋণাত্মক হতে পারবে না।' },
    { t: 'img', file: 'dijkstra-graph.png', cap: 'ছয় নোডের গ্রাফ — A থেকে শুরু' },
    { t: 'p', x: 'প্রতি ধাপে সবচেয়ে কাছের অদেখা নোড u বেছে নিয়ে তার প্রতিবেশী v-এর দূরত্ব হালনাগাদ করো:' },
    { t: 'fx', x: 'd[v] = \\min\\big(d[v],\\; d[u] + w(u, v)\\big)' }
  ] },
  'dsa|lesson:4:3': { status: 'returned', update: true, reason: 'unclear_av', reasonNote: '4:10 to 6:00', by: 'Shahriar Hossain', subAgoMin: 1500 },
  'dsa|new:3:0': { kind: 'lesson', ch: 3, isNew: true, title: 'AVL ট্রি — রোটেশন দিয়ে ব্যালান্স', status: 'review', by: 'Shahriar Hossain', subAgoMin: 50,
    video: { state: 'done', name: 'VID_20260924_2215.mp4', dur: '16:45' },
    quiz: [{ stem: 'AVL ট্রিতে কোনো নোডের ব্যালান্স ফ্যাক্টর কত হলে রোটেশন লাগে?', o: ['২ বা −২', '১', '০', '−১'], a: 0, why: 'AVL-এ −১, ০ আর ১ চলে। এর বাইরে গেলেই রোটেশন।' }],
    blocks: [
      { t: 'h', x: 'BST কেন একপাশে হেলে পড়ে' },
      { t: 'p', x: 'সাজানো ক্রমে ডেটা ঢোকালে বাইনারি সার্চ ট্রি আসলে একটা লম্বা লিংকড লিস্ট হয়ে যায় — খোঁজার সময় O(log n) থেকে O(n)।' },
      { t: 'fx', x: 'bf(n) = h(n_{L}) - h(n_{R}) \\in \\{-1,\\, 0,\\, 1\\}' },
      { t: 'img', file: 'avl-ll-rotation.png', cap: 'LL কেস — ডান দিকে একবার রোটেশন' },
      { t: 'list', x: 'LL — ডানে একবার ঘোরাও\nRR — বাঁয়ে একবার ঘোরাও\nLR — আগে বাঁয়ে, তারপর ডানে\nRL — আগে ডানে, তারপর বাঁয়ে' }
    ] },
  'eng|lesson:1:2': { status: 'review', update: true, by: 'Nusrat Jahan', subAgoMin: 120,
    blocks: [
      { t: 'h', x: 'ফোন ধরার প্রথম তিন লাইন' },
      { t: 'p', x: 'ফোনে মুখ দেখা যায় না, তাই ভদ্রতা পুরোটাই শব্দে। নিচের তিনটা লাইন মনে রাখলে বেশিরভাগ কল শুরু করা যায়।' },
      { t: 'list', x: 'Hello, this is Mahmud speaking.\nCould I speak to Rahim, please?\nSorry, could you say that again?' }
    ] },
  'dsa|test:3': { kind: 'test', ch: 3, isNew: true, status: 'review', by: 'Shahriar Hossain', subAgoMin: 20, seconds: 600, quiz: treeTestQs },
  'dsa|new:5:0': { kind: 'lesson', ch: 5, isNew: true, title: 'Floyd–Warshall — সব জোড়ার শর্টেস্ট পাথ', status: 'draft', video: { state: 'none' }, quiz: [], blocks: [
    { t: 'h', x: 'কখন Dijkstra যথেষ্ট না' },
    { t: 'p', x: 'যখন প্রতিটা নোড থেকে প্রতিটা নোডের দূরত্ব লাগবে, তখন n বার Dijkstra চালানোর বদলে একবারেই পুরো টেবিল বানানো যায়।' },
    { t: 'fx', x: 'd_{ij} = \\min(d_{ij},\\; d_{ik} + d_{kj})' }
  ] }
};
export const fxKeys: [string, string][] = [['×', ' \\times '], ['÷', ' \\div '], ['x²', '^{2}'], ['√', '\\sqrt{}'], ['a/b', '\\frac{a}{b}'], ['Σ', '\\sum '], ['π', '\\pi '], ['≤', ' \\le '], ['≥', ' \\ge '], ['→', ' \\to ']];
export const blockTypes: Record<BlockType, string[]> = {
  h: ['Heading', "'Anek Bangla',sans-serif", '600', '1.45', 'শিরোনাম লেখো'],
  p: ['Paragraph', "'Tiro Bangla',Georgia,serif", '400', '1.85', 'লেখা শুরু করো'],
  list: ['List · one per line', "'Tiro Bangla',Georgia,serif", '400', '1.85', 'প্রতি লাইনে একটা পয়েন্ট'],
  code: ['Code', "'JetBrains Mono',monospace", '400', '1.7', 'কোড বা ফর্মুলা টেক্সট'],
  img: ['Image'], fx: ['Formula · LaTeX']
};

/** Why a lesson or test is sent back. The admin picks the English label; the teacher reads the Bangla one. */
export const contentReasons: Reason[] = [
  { code: 'unclear_av', en: 'Video sound or picture unclear', bn: 'ভিডিওর শব্দ বা ছবি অস্পষ্ট' },
  { code: 'wrong_fact', en: 'Factual error in the notes', bn: 'নোটে তথ্যগত ভুল' },
  { code: 'wrong_answer', en: 'Wrong quiz answer', bn: 'কুইজের উত্তর ভুল' },
  { code: 'off_syllabus', en: 'Outside the syllabus', bn: 'সিলেবাসের বাইরে' },
];

/**
 * A chapter that is only an outline: `n` parts named after it, the first `done` of them already finished.
 * The diploma subjects other than Data Structure have no notes or videos of their own yet.
 */
const parts = (name: string, n: number, done = 0): Chapter => ({
  name,
  lessons: Array.from({ length: n }, (_, i) => ({
    t: name + ' — পর্ব ' + digits(i + 1, 'bn'),
    d: pad2(9 + ((i * 5 + name.length) % 9)) + ':' + pad2((i * 17 + name.length * 7) % 60),
    ...(i < done ? { done: true } : {}),
  })),
});

/**
 * Programs are what is sold; courses are what is studied.
 * A diploma program is a semester with several subjects and dated batches. A single program is one recorded course with no batch.
 */
export const catalog: Catalog = {
  programs: {
    cst4: { id: 'cst4', kind: 'diploma', code: 'CST', sem: 4, price: 3000, courses: ['math4', 'dsa', 'dbms', 'wdd', 'de2', 'mp', 'soc'] },
    cst5: { id: 'cst5', kind: 'diploma', code: 'CST', sem: 5, price: 3200, courses: ['os', 'net', 'java', 'se'] },
    eng: { id: 'eng', kind: 'single', code: 'ENG', weeks: 8, price: 2000, courses: ['eng'] },
    web: { id: 'web', kind: 'single', code: 'WEB', weeks: 10, price: 2500, courses: ['web'] },
  },
  batches: {
    'CST-04-B01': { id: 'CST-04-B01', program: 'cst4', no: 1, start: '2026-08-01', end: '2026-12-28', status: 'running' },
    'CST-04-B02': { id: 'CST-04-B02', program: 'cst4', no: 2, start: '2026-09-01', end: '2027-01-15', status: 'running' },
    'CST-05-B01': { id: 'CST-05-B01', program: 'cst5', no: 1, start: '2027-01-10', end: '2027-06-20', status: 'enrolling' },
  },
  courses: {
    math4: {
      id: 'math4', code: 'MATH', title: 'গণিত-৪', titleEn: 'Mathematics-4', instructor: 'Shahriar Hossain', bteb: '25941',
      chapters: [parts('Complex Number', 4, 4), parts('Differential Calculus', 5, 5), parts('Integral Calculus', 5), parts('Differential Equations', 4), parts('Statistics & Probability', 4)],
    },
    dsa: {
      id: 'dsa', code: 'DSA', title: 'ডেটা স্ট্রাকচার ও অ্যালগরিদম', titleEn: 'Data Structure & Algorithm', instructor: 'Shahriar Hossain', bteb: '25942',
      chapters: [
        { name: 'ভূমিকা ও অ্যারে (Array)', lessons: [
          { t: 'কোর্স পরিচিতি', d: '08:20', done: true },
          { t: 'ডেটা স্ট্রাকচার কেন দরকার', d: '11:05', done: true },
          { t: 'অ্যারে — মেমরি লেআউট', d: '14:30', done: true },
          { t: 'অ্যারে অপারেশন ও কমপ্লেক্সিটি', d: '12:15', done: true } ], test: arrayTest },
        { name: 'লিংকড লিস্ট (Linked List)', lessons: [
          { t: 'সিঙ্গলি লিংকড লিস্ট', d: '15:40', done: true },
          { t: 'ইনসার্ট ও ডিলিট', d: '13:20', done: true },
          { t: 'ডাবলি লিংকড লিস্ট', d: '12:50', done: true },
          { t: 'অ্যারে বনাম লিংকড লিস্ট', d: '09:35', done: true } ], test: linkedListTest },
        { name: 'স্ট্যাক ও কিউ (Stack & Queue)', lessons: [
          { t: 'স্ট্যাক কী', d: '10:10', done: true },
          { t: 'পুশ ও পপ', d: '11:45', done: true },
          { t: 'অ্যারে দিয়ে স্ট্যাক ইমপ্লিমেন্ট', d: '13:05', done: true },
          { t: 'কিউ কী', d: '09:50', done: true },
          { t: 'Stack ও Queue — বেসিক ধারণা', d: '12:30' },
          { t: 'সার্কুলার কিউ', d: '11:20' } ], test: stackQueueTest },
        { name: 'ট্রি (Tree)', lessons: [
          { t: 'বাইনারি ট্রি পরিচিতি', d: '13:10' },
          { t: 'ট্রি ট্রাভার্সাল', d: '16:00' },
          { t: 'বাইনারি সার্চ ট্রি', d: '14:25' },
          { t: 'BST ইনসার্ট ও ডিলিট', d: '15:10' },
          { t: 'হিপ (Heap)', d: '12:40' } ] },
        { name: 'সর্টিং ও সার্চিং', lessons: [
          { t: 'লিনিয়ার ও বাইনারি সার্চ', d: '12:00' },
          { t: 'বাবল ও সিলেকশন সর্ট', d: '13:30' },
          { t: 'ইনসার্শন সর্ট', d: '10:45' },
          { t: 'মার্জ সর্ট', d: '15:20' },
          { t: 'কুইক সর্ট', d: '16:10' },
          { t: 'কমপ্লেক্সিটি তুলনা', d: '11:00' } ] },
        { name: 'গ্রাফ (Graph)', lessons: [
          { t: 'গ্রাফ পরিচিতি', d: '12:20' },
          { t: 'অ্যাডজেসেন্সি ম্যাট্রিক্স ও লিস্ট', d: '13:45' },
          { t: 'BFS', d: '14:00' },
          { t: 'DFS', d: '13:15' },
          { t: 'শর্টেস্ট পাথ — Dijkstra', d: '17:30' } ] }
      ]
    },
    dbms: {
      id: 'dbms', code: 'DBMS', title: 'ডেটাবেজ ম্যানেজমেন্ট সিস্টেম', titleEn: 'Database Management System', instructor: 'Tanvir Ahmed', bteb: '25943',
      chapters: [parts('Database Concepts', 3, 3), parts('ER Model', 4, 4), parts('SQL', 5), parts('Normalization', 3), parts('Transactions', 3)],
    },
    wdd: {
      id: 'wdd', code: 'WDD', title: 'ওয়েব ডিজাইন ও ডেভেলপমেন্ট', titleEn: 'Web Design & Development', instructor: 'Tanvir Ahmed', bteb: '25944',
      chapters: [parts('HTML & CSS', 5, 5), parts('JavaScript', 6, 6), parts('Responsive Design', 4), parts('PHP Basics', 5), parts('Project', 4)],
    },
    de2: {
      id: 'de2', code: 'DE2', title: 'ডিজিটাল ইলেকট্রনিক্স-২', titleEn: 'Digital Electronics-2', instructor: 'Imtiaz Rahman', bteb: '25945',
      chapters: [parts('Flip-Flops', 4, 4), parts('Counters', 4, 4), parts('Registers', 4), parts('ADC & DAC', 4)],
    },
    mp: {
      id: 'mp', code: 'MP', title: 'মাইক্রোপ্রসেসর', titleEn: 'Microprocessor', instructor: 'Imtiaz Rahman', bteb: '25946',
      chapters: [parts('8085 Architecture', 4, 4), parts('Instruction Set', 4, 4), parts('Assembly Programming', 3), parts('Interfacing', 3)],
    },
    soc: {
      id: 'soc', code: 'SOC', title: 'সোশ্যাল সায়েন্স', titleEn: 'Social Science', instructor: 'Farzana Yasmin', bteb: '25811',
      chapters: [parts('বাংলাদেশের ইতিহাস', 3, 3), parts('অর্থনীতি', 3, 3), parts('সমাজ ও সংস্কৃতি', 3), parts('পরিবেশ', 3)],
    },
    // Next semester, on sale in Explore. Outlines only.
    os: { id: 'os', code: 'OS', title: 'অপারেটিং সিস্টেম', titleEn: 'Operating System', instructor: 'Imtiaz Rahman', chapters: [parts('Process Management', 4), parts('Memory Management', 4)] },
    net: { id: 'net', code: 'NET', title: 'কম্পিউটার নেটওয়ার্ক', titleEn: 'Computer Network', instructor: 'Tanvir Ahmed', chapters: [parts('Network Models', 4), parts('IP Addressing', 4)] },
    java: { id: 'java', code: 'JAVA', title: 'জাভা প্রোগ্রামিং', titleEn: 'Java Programming', instructor: 'Shahriar Hossain', chapters: [parts('Classes & Objects', 5), parts('Inheritance', 4)] },
    se: { id: 'se', code: 'SE', title: 'সফটওয়্যার ইঞ্জিনিয়ারিং', titleEn: 'Software Engineering', instructor: 'Tanvir Ahmed', chapters: [parts('Software Process', 3), parts('Requirements', 3)] },
    eng: {
      id: 'eng', code: 'ENG', title: 'স্পোকেন ইংলিশ — ফাউন্ডেশন', titleEn: 'Spoken English — Foundation', instructor: 'Nusrat Jahan',
      chapters: [
        { name: 'উচ্চারণ ও শব্দ', lessons: [
          { t: 'কোর্স কীভাবে করবে', d: '06:40', done: true },
          { t: 'ভাওয়েল সাউন্ড', d: '12:10', done: true },
          { t: 'কনসোনেন্ট ক্লাস্টার', d: '11:30', done: true },
          { t: 'শব্দে জোর (Word stress)', d: '10:05', done: true } ] },
        { name: 'দৈনন্দিন কথোপকথন', lessons: [
          { t: 'পরিচয় দেওয়া', d: '09:20' },
          { t: 'দিক ও ঠিকানা জিজ্ঞাসা', d: '10:40' },
          { t: 'ফোনে কথা বলা', d: '11:15' },
          { t: 'দোকানে দরদাম', d: '08:55' },
          { t: 'ছোট গল্প বলা', d: '12:25' } ] },
        { name: 'ইন্টারভিউ ইংলিশ', lessons: [
          { t: 'নিজের পরিচয় — ৬০ সেকেন্ড', d: '10:30' },
          { t: 'সাধারণ প্রশ্নের উত্তর', d: '13:00' },
          { t: 'দুর্বলতা নিয়ে প্রশ্ন', d: '09:45' },
          { t: 'প্রশ্ন করা শেখো', d: '08:30' },
          { t: 'মক ইন্টারভিউ', d: '18:20' } ] },
        { name: 'পাবলিক স্পিকিং বেসিক', lessons: [
          { t: 'ভয় সামলানো', d: '11:10' },
          { t: 'কথার গঠন', d: '12:35' },
          { t: 'শরীরী ভাষা', d: '10:20' },
          { t: 'শেষ উপস্থাপনা', d: '15:40' } ] }
      ]
    },
    web: {
      id: 'web', code: 'WEB', title: 'ওয়েব ডেভেলপমেন্ট বেসিক', titleEn: 'Web Development Basics', instructor: 'Tanvir Ahmed',
      chapters: [parts('HTML দিয়ে পেজের কাঠামো', 5), parts('CSS দিয়ে ডিজাইন', 5), parts('রেসপন্সিভ লেআউট', 4), parts('JavaScript বেসিক', 6), parts('Git, GitHub ও প্রজেক্ট', 4)],
    },
  },
};

export const practiceQs: QuizQ[] = [
  { stem: 'স্ট্যাক কোন নীতিতে কাজ করে?', o: ['LIFO — Last In, First Out', 'FIFO — First In, First Out', 'র‍্যান্ডম অ্যাক্সেস', 'প্রায়োরিটি অনুযায়ী'], a: 0, why: 'সবার শেষে যেটা ঢোকে, সেটাই আগে বের হয় — তাই LIFO।' },
  { stem: 'কিউ-তে নতুন এলিমেন্ট কোন প্রান্তে যোগ হয়?', o: ['front', 'rear', 'top', 'middle'], a: 1, why: 'কিউ-তে যোগ হয় rear দিয়ে, বের হয় front দিয়ে।' },
  { stem: 'স্ট্যাক থেকে এলিমেন্ট সরানোর অপারেশনের নাম কী?', o: ['push()', 'peek()', 'pop()', 'dequeue()'], a: 2, why: 'push() বসায়, pop() সরায়, peek() শুধু দেখায়।' },
  { stem: 'খালি স্ট্যাকে pop() করলে কী হয়?', o: ['Overflow', 'Underflow', 'কিছুই হয় না', 'স্ট্যাক রিসেট হয়'], a: 1, why: 'খালি স্ট্যাকে pop() করলে underflow, ভরা স্ট্যাকে push() করলে overflow।' },
  { stem: 'ফাংশন কল ট্র্যাক করতে অপারেটিং সিস্টেম কোনটি ব্যবহার করে?', o: ['কিউ', 'লিংকড লিস্ট', 'কল স্ট্যাক', 'হিপ'], a: 2, why: 'শেষ যে ফাংশনটা ডাকা হয়, সেটাই আগে শেষ হয় — কল স্ট্যাক।' },
  { stem: 'সার্কুলার কিউ কেন ব্যবহার করা হয়?', o: ['মেমরির অপচয় কমাতে', 'সার্চ দ্রুত করতে', 'ডেটা সাজাতে', 'রিকার্শন সহজ করতে'], a: 0, why: 'সাধারণ কিউ-তে front এগিয়ে গেলে সামনের জায়গা ফাঁকা পড়ে থাকে; সার্কুলার কিউ সেটা আবার ব্যবহার করে।' },
  { stem: 'নিচের কোনটি স্ট্যাকের প্রয়োগ নয়?', o: ['ব্রাউজারের ব্যাক বাটন', 'ইনফিক্স থেকে পোস্টফিক্স', 'প্রিন্টার স্পুলিং', 'রিকার্শন'], a: 2, why: 'প্রিন্টার স্পুলিং কিউ — যে ফাইল আগে এসেছে, সেটাই আগে ছাপা হয়।' }
];

/** The signed-in teacher: the subject they teach and the batch their home screen follows. */
export const teacher = { name: 'Shahriar Hossain', course: 'dsa', batch: 'CST-04-B01', phone: '01711-649032', title: 'Senior Instructor · Computer Technology' };
export const defaultStudent = { name: 'Mahmudul Hasan', phone: '01712 445589', masked: '01712-••••89' };
/** Subjects a teacher can list on their profile. */
export const subjectOptions = ['Data Structure', 'C Programming', 'Algorithm', 'Database', 'Web Development', 'Networking'];
export const supportPhone = '01777 090909';
/** Seeded until activity tracking exists: the current streak ends today. */
export const streakSeed = { current: 12, best: 19 };
export const weekDayShort = ['Sa', 'Su', 'Mo', 'Tu', 'We', 'Th', 'Fr'];
export const weekDayHead = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

/** Cover and progress-bar colour per course. A cover carries white text, so each one is dark enough for it (a test checks). */
export const courseCover: Record<CourseId, { bg: string; bar: string }> = {
  dsa: { bg: 'var(--hero)', bar: 'var(--brand)' },
  math4: { bg: '#3B5BA9', bar: 'var(--brand)' },
  dbms: { bg: '#7A4FB3', bar: 'var(--brand)' },
  wdd: { bg: '#8A5A00', bar: 'var(--brand)' },
  de2: { bg: '#0E7490', bar: 'var(--brand)' },
  mp: { bg: '#475569', bar: 'var(--brand)' },
  soc: { bg: '#9A3B6B', bar: 'var(--brand)' },
  eng: { bg: '#C2357A', bar: 'var(--accent-2)' },
  web: { bg: '#B4470F', bar: 'var(--accent-2)' },
};
const PLAIN_COVER = { bg: 'var(--hero)', bar: 'var(--brand)' };
export const coverOf = (id: CourseId) => courseCover[id] || PLAIN_COVER;

/** Tile colours for a tone: [background, foreground]. */
export const toneColors: Record<Tone, [string, string]> = {
  brand: ['var(--brand-soft)', 'var(--on-brand-soft)'],
  ok: ['var(--ok-soft)', 'var(--ok)'],
  warn: ['var(--warn-soft)', 'var(--warn)'],
  sun: ['var(--sun)', 'var(--on-sun)'],
  pink: ['var(--accent-2-soft)', 'var(--accent-2)'],
};

export const notifSeed: Record<'student' | 'teacher', Notif[]> = {
  student: [
    { id: 's1', icon: 'forum', tone: 'brand', title: 'তোমার প্রশ্নের উত্তর এসেছে', body: 'Shahriar Hossain: "খালি স্ট্যাকে pop() করলে underflow হয় — তাই আগে isEmpty() চেক করো।"', agoMin: 12, href: '/learn/dsa/2/4?tab=ask' },
    { id: 's2', icon: 'check_circle', tone: 'ok', title: 'পেমেন্ট অ্যাপ্রুভ হয়েছে', body: 'Web Development কোর্সে তোমার ভর্তি নিশ্চিত।', agoMin: 60, href: '/' },
    { id: 's3', icon: 'quiz', tone: 'warn', title: 'Chapter 02-এর টেস্ট খোলা আছে', body: 'লিংকড লিস্ট শেষ করেছ। চাইলে চ্যাপ্টার টেস্টটা দিয়ে নাও — এটা ঐচ্ছিক।', agoMin: 300, href: '/course/dsa' },
    { id: 's4', icon: 'local_fire_department', tone: 'sun', title: 'নতুন ব্যাজ: ৭ দিনের স্ট্রিক', body: 'টানা ৭ দিন পড়েছ। এভাবেই চালিয়ে যাও!', agoMin: 1500, href: '/profile' },
    { id: 's5', icon: 'videocam', tone: 'pink', title: 'Live Class সোমবার সন্ধ্যা ৭টা', body: 'Queue ও Circular Queue — প্রশ্ন নিয়ে এসো।', agoMin: 2880, href: '/' }
  ],
  teacher: [
    { id: 't1', icon: 'forum', tone: 'brand', title: '৪টি নতুন প্রশ্ন', body: 'CST-04-B01 ব্যাচ থেকে — Stack ও Queue লেসনে।', agoMin: 8, href: '/teacher/doubts' },
    { id: 't2', icon: 'task_alt', tone: 'ok', title: 'কনটেন্ট অ্যাপ্রুভ হয়েছে', body: '"Linked List — ইনসার্শন" লেসন এখন লাইভ।', agoMin: 180, href: '/teacher/content' },
    { id: 't3', icon: 'payments', tone: 'sun', title: 'সেপ্টেম্বরের পেআউট পাঠানো হয়েছে', body: '৳38,400 — bKash 01711-••••32', agoMin: 8640, href: '/teacher/profile' }
  ]
};

/** Student badges: [icon, label, sub (date earned or what's left), earned]. */
export const badgeSeed: [string, string, string, boolean][] = [
  ['local_fire_department', '৭ দিনের স্ট্রিক', '2 Oct', true],
  ['bolt', '১০০ পয়েন্ট', '18 Sep', true],
  ['target', 'নির্ভুল কুইজ', '25 Sep', true],
  ['workspace_premium', 'প্রথম সার্টিফিকেট', '30 Sep', true],
  ['emoji_events', 'টপ ১০', '3 ranks to go', false],
  ['forum', 'কৌতূহলী মন', '3/5 questions', false],
  ['nights_stay', 'রাতজাগা পাখি', '5 lessons after 10 PM', false],
  ['school', 'কোর্স শেষ', '62% done', false],
];

/** A certificate the student already holds (an earlier course). */
export const pastCertificate = { title: 'Programming Fundamentals', meta: 'Completed · 30 Sep 2026' };

/** Teacher profile stats (seeded until ratings and payouts come from the server). */
export const teacherStats = {
  rating: '4.8', reviews: 312,
  /** [stars, % of reviews] */
  stars: [[5, 78], [4, 15], [3, 5], [2, 1], [1, 1]] as [number, number][],
  earned: 42500, pending: 8200, nextPayout: '10 Oct', payoutTo: 'bKash · 01711-••••32',
  // v6 used #0F7A55 for ALG, which is now the brand (DS) colour; the orange preset keeps the three tiles distinct.
  courses: [
    { code: 'DS', title: 'Data Structure — CST', batch: 'CST-04-B01', students: 86, rating: '4.9', bg: 'var(--hero)' },
    { code: 'C', title: 'C Programming', batch: 'CST-02-B03', students: 124, rating: '4.7', bg: '#C2357A' },
    { code: 'ALG', title: 'Algorithm Basics', batch: 'Recorded', students: 410, rating: '4.8', bg: '#D2561B' },
  ],
  payouts: [['Sep 2026', 38400, 'TRX 9KD27HQ1PX'], ['Aug 2026', 35150, 'TRX 8JB11ZK0MA'], ['Jul 2026', 31900, 'TRX 7HC94LR3QE']] as [string, number, string][],
};
