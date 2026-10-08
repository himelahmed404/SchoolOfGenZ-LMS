// Seed data ported from the v6 design prototype. Replace with API data once a server exists.
// Facts (names, batches, dates, times, counts, prices) are English; titles and lesson content are Bangla.
import type { Block, BlockType, Confusion, Course, CourseId, Doubt, LessonRevision, Notif, PayMethod, Payment, QuizQ, Tone } from './types';

export const boardExam = { name: 'পর্ব সমাপনী পরীক্ষা', even: '2026-12-14', odd: '2027-04-18' };
/** Diploma semesters a student can pick. */
export const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

export const confusions: Record<string, Confusion[]> = {
  'cst:0:2': [
    { q: 'ডেটা স্ট্রাক্চার আর ডেটাবেস — একই জিনিস?', a: 'না। ডেটা স্ট্রাক্চার হলো চলমান প্রোগ্রামের মেমরিতে ডেটা সাজানোর নিয়ম — প্রোগ্রাম বন্ধ হলেই শেষ। ডেটাবেস ডিস্কে রাখে, প্রোগ্রাম বন্ধ হলেও থাকে। মজার ব্যাপার হলো, ডেটাবেস নিজেও ভেতরে ডেটা স্ট্রাক্চার ব্যবহার করে — যেমন B-tree।' },
    { q: 'O(n) মানে কত সেকেন্ড?', a: 'কোনো সেকেন্ড না। O(n) বলে দেয় ডেটা n গুণ বাড়লে কাজের সময়ও মোটামুটি n গুণ বাড়বে — বাড়ার হার, পরিমাপ নয়। তাই খুব ছোট ডেটায় একটা O(n²) কোড O(n)-এর চেয়ে দ্রুতও হতে পারে।' }
  ],
  'cst:2:4': [
    { q: 'স্ট্যাকের top আর অ্যারের শেষ ইনডেক্স — একই জিনিস?', a: 'না। অ্যারের শেষ ইনডেক্স মানে বরাদ্দ করা জায়গার শেষ ঘর — সেটা ফিক্সড। top হলো এই মুহূর্তে সবচেয়ে উপরে থাকা এলিমেন্টের ইনডেক্স — push করলে বাড়ে, pop করলে কমে। খালি স্ট্যাকে top = −১, কিন্তু শেষ ইনডেক্স তখনও size − ১।' },
    { q: 'overflow আর underflow গুলিয়ে ফেলি — কোনটা কখন?', a: 'ভরা স্ট্যাকে আরেকটা push করতে গেলে overflow — জায়গা নেই। খালি স্ট্যাকে pop করতে গেলে underflow — সরানোর কিছু নেই। মনে রাখার সহজ উপায়: over মানে উপরে উপচে পড়া, under মানে নিচে আর কিছু বাকি নেই।' },
    { q: 'কিউ থেকে একটা বের হলে বাকিরা এক ঘর করে এগোয়?', a: 'সাধারণ (লিনিয়ার) কিউ-এ এগোয় না — front পয়েন্টারটাই এক ঘর সামনে সরে যায়। ফলে শুরুর ঘরগুলো খালি পড়ে থাকে, আর কিউ ভরা না হলেও ভরা মনে হয়। এই অপচয় সারাতেই সার্কুলার কিউ — পরের লেসন।' },
    { q: 'পরীক্ষায় শুধু LIFO/FIFO লিখলেই পুরো নম্বর?', a: 'না। বোর্ড প্রায়ই “উদাহরণসহ ব্যাখ্যা কর” চায়। স্ট্যাকের জন্য ব্রাউজারের ব্যাক বাটন বা ফাংশন কল স্ট্যাক, কিউ-এর জন্য প্রিন্টারের কাজের লাইন — একটা উদাহরণ লিখলেই নম্বর কাটা যায় না।' }
  ],
  'cst:2:5': [
    { q: 'rear সবসময় front-এর পরে থাকে?', a: 'সার্কুলার কিউ-এ না। rear ঘুরে এসে front-এর আগেও চলে যেতে পারে — এটাই “সার্কুলার” হওয়ার মানে। তাই ইনডেক্স তুলনা করে “কে আগে” বুঝতে যাওয়াটাই ভুল।' },
    { q: 'কিউ ভরা আর খালি — দুটো আলাদা করবো কীভাবে?', a: 'ভরা: (rear + ১) % size == front। কিন্তু খালি অবস্থাতেও front আর rear গা লাগাতে পড়তে পারে। তাই হয় একটা ঘর ইচ্ছা করে ফাঁকা রাখতে হয়, নয়তো আলাদা একটা count রাখতে হয়। শুধু front আর rear দেখে হয় না।' }
  ]
};

export const outcomeSets: Record<CourseId, { t: string; ch: number }[]> = {
  cst: [
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

export const newCourseOutcomes = [
  'HTML আর CSS দিয়ে ডিজাইন দেখে হুবহু পেজ বানাতে পারবে',
  'JavaScript দিয়ে ফরম যাচাই আর ইন্টারঅ্যাকশন লিখতে পারবে',
  'মোবাইলে ঠিকমতো দেখায় — এমন রেসপন্সিব লেআউট করতে পারবে',
  'Git দিয়ে কাজ সেভ করে GitHub-এ তুলতে পারবে',
  'নিজের তিনটা প্রজেক্ট লাইভ লিংকসহ দেখাতে পারবে'
];

export const newCourse = { code: 'WEB', title: 'ওয়েব ডেভেলপমেন্ট বেসিক', titleEn: 'Web Development Basics',
  instructor: 'Tanvir Ahmed', price: 2500, batch: 'WEB-01-B03', batchNo: 3, lessons: 24, weeks: 10, livePerWeek: 2 };

export const merchants: Record<PayMethod, string> = { bKash: '01777 090909', Nagad: '01888 070707' };

export const queueSeed: Payment[] = [
  { id: 'q1', name: 'Sadia Afrin', phone: '01812 337742', course: 'ডেটা স্ট্রাকচার ও অ্যালগরিদম', batch: 'CST-04-B01', method: 'bKash', amount: 3000, due: 3000, trx: 'BKX9T4LM20', sender: '01812 337742', agoMin: 12, status: 'pending' },
  { id: 'q2', name: 'Rakibul Islam', phone: '01911 208864', course: 'স্পোকেন ইংলিশ — ফাউন্ডেশন', batch: 'ENG-02-B07', method: 'Nagad', amount: 1500, due: 2000, trx: 'NGD5K1RW83', sender: '01911 208864', agoMin: 26, status: 'pending' },
  { id: 'q3', name: 'Nusrat Jahan Mim', phone: '01741 665503', course: 'ডেটা স্ট্রাকচার ও অ্যালগরিদম', batch: 'CST-04-B01', method: 'bKash', amount: 3000, due: 3000, trx: 'BKX2P8VC57', sender: '01918 442210', agoMin: 41, status: 'pending' },
  { id: 'q4', name: 'Tanvir Hossain', phone: '01684 991127', course: 'ওয়েব ডেভেলপমেন্ট বেসিক', batch: 'WEB-01-B03', method: 'bKash', amount: 2500, due: 2500, trx: 'BKX6Q3ZN14', sender: '01684 991127', agoMin: 60, status: 'pending' },
  { id: 'q5', name: 'Farhana Akter', phone: '01521 774096', course: 'স্পোকেন ইংলিশ — ফাউন্ডেশন', batch: 'ENG-02-B07', method: 'Nagad', amount: 2000, due: 2000, trx: 'NGD8W2YT65', sender: '01521 774096', agoMin: 75, status: 'pending' },
  { id: 'q6', name: 'Ariful Islam', phone: '01733 550218', course: 'ডেটা স্ট্রাকচার ও অ্যালগরিদম', batch: 'CST-04-B01', method: 'bKash', amount: 3000, due: 3000, trx: 'BKX9T4LM20', sender: '01733 550218', agoMin: 120, status: 'pending', dup: true },
  { id: 'q7', name: 'Sumaiya Binte Karim', phone: '01876 331409', course: 'ওয়েব ডেভেলপমেন্ট বেসিক', batch: 'WEB-01-B03', method: 'Nagad', amount: 2500, due: 2500, trx: 'NGD3M7QX92', sender: '01876 331409', agoMin: 140, status: 'pending' },
  { id: 'q8', name: 'Imran Kabir', phone: '01958 002264', course: 'স্পোকেন ইংলিশ — ফাউন্ডেশন', batch: 'ENG-02-B07', method: 'bKash', amount: 2000, due: 2000, trx: 'BKX1L5HD38', sender: '01958 002264', agoMin: 180, status: 'pending' },
  { id: 'q9', name: 'Jannatul Ferdous', phone: '01627 883351', course: 'ডেটা স্ট্রাকচার ও অ্যালগরিদম', batch: 'CST-04-B01', method: 'bKash', amount: 3000, due: 3000, trx: 'BKX4C9JR76', sender: '01627 883351', agoMin: 200, status: 'pending' },
  { id: 'q10', name: 'Mehedi Hasan', phone: '01799 116740', course: 'ওয়েব ডেভেলপমেন্ট বেসিক', batch: 'WEB-01-B03', method: 'Nagad', amount: 1000, due: 2500, trx: 'NGD7B4KF29', sender: '01799 116740', agoMin: 240, status: 'pending' },
  { id: 'q11', name: 'Sharmin Sultana', phone: '01555 448802', course: 'স্পোকেন ইংলিশ — ফাউন্ডেশন', batch: 'ENG-02-B07', method: 'bKash', amount: 2000, due: 2000, trx: 'BKX8N2WS45', sender: '01555 448802', agoMin: 1500, status: 'approved' },
  { id: 'q12', name: 'Nafis Iqbal', phone: '01844 907715', course: 'ডেটা স্ট্রাকচার ও অ্যালগরিদম', batch: 'CST-04-B01', method: 'Nagad', amount: 3000, due: 3000, trx: 'NGD6V1PA83', sender: '01844 907715', agoMin: 1560, status: 'approved' },
  { id: 'q13', name: 'Rubaiya Haque', phone: '01712 664438', course: 'ওয়েব ডেভেলপমেন্ট বেসিক', batch: 'WEB-01-B03', method: 'bKash', amount: 500, due: 2500, trx: 'BKX0F3TM61', sender: '01712 664438', agoMin: 1620, status: 'rejected' }
];

export const rejectReasons = ['ভুল TrxID', 'টাকা কম', 'ডুপ্লিকেট', 'অন্য নম্বর'];

export const batches: Record<string, { course: CourseId; seed: number; size: number }> = {
  'CST-04-B01': { course: 'cst', seed: 11, size: 30 },
  'CST-04-B02': { course: 'cst', seed: 23, size: 24 },
  'ENG-02-B07': { course: 'eng', seed: 37, size: 18 }
};
export const firstNames = ['Sakib', 'Tasnim', 'Rifat', 'Mahia', 'Naim', 'Fariha', 'Tanvir', 'Sumaiya', 'Arif', 'Nusrat', 'Jubayer', 'Lamia', 'Rakib', 'Tanzila', 'Emon', 'Sadia', 'Fahim', 'Maria', 'Shuvo', 'Afsana', 'Rahat', 'Jannat', 'Sajib', 'Nadia', 'Hridoy', 'Moumita', 'Tarek', 'Sanjida'];
export const lastNames = ['Islam', 'Hossain', 'Ahmed', 'Rahman', 'Khan', 'Chowdhury', 'Sarkar', 'Haque', 'Biswas', 'Talukdar', 'Majumdar', 'Sheikh'];
export const doubtSeed: Doubt[] = [
  { id: 'd1', batch: 'CST-04-B01', course: 'cst', ch: 2, li: 4, who: 'Rakib Hasan', q: 'স্ট্যাক আর কিউ একসাথে ব্যবহার করা যায়? বইয়ে একটা উদাহরণ আছে বুঝিনি।', agoMin: 3120, reply: 'যায়। দুইটা স্ট্যাক দিয়ে কিউ বানানো একটা ক্লাসিক প্রশ্ন — অধ্যায় ০৩-এর শেষ লেসনে দেখাবো।', by: 'Shahriar Hossain', replyAgoMin: 2880 },
  { id: 'd2', batch: 'CST-04-B01', course: 'cst', ch: 2, li: 4, who: 'Sumaiya Akter', q: 'underflow আর overflow-এর পার্থক্যটা আরেকবার বলবেন?', agoMin: 1620 },
  { id: 'd3', batch: 'CST-04-B01', course: 'cst', ch: 0, li: 3, who: 'Fahim Muntasir', q: 'O(1) আর O(n)-এর পার্থক্য পরীক্ষার খাতায় কীভাবে লিখলে পুরো নম্বর পাবো?', agoMin: 1860 },
  { id: 'd4', batch: 'CST-04-B01', course: 'cst', ch: 2, li: 2, who: 'Tanzila Rahman', q: 'top = −1 দিয়ে শুরু করি কেন? 0 দিয়ে শুরু করলে কী সমস্যা?', agoMin: 300 },
  { id: 'd5', batch: 'CST-04-B01', course: 'cst', ch: 2, li: 3, who: 'Jubayer Alam', q: 'enqueue করার সময় আগে rear বাড়াবো, নাকি আগে মান বসাবো?', agoMin: 40 },
  { id: 'd6', batch: 'CST-04-B01', course: 'cst', ch: 1, li: 2, who: 'Nadia Islam', q: 'ডাবলি লিংকড লিস্টে prev পয়েন্টার না রাখলে ঠিক কোন কাজটা কঠিন হয়?', agoMin: 4200, reply: 'পেছন দিকে যাওয়া, আর মাঝখান থেকে কোনো নোড মুছে ফেলা। prev না থাকলে আগের নোডটা খুঁজতে আবার শুরু থেকে হাঁটতে হয় — O(n)।', by: 'Shahriar Hossain', replyAgoMin: 4320 }
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
export const itemSeeds: Record<string, Partial<LessonRevision>> = {
  'cst|lesson:5:4': { status: 'review', update: true, by: 'Shahriar Hossain', subAgoMin: 35,
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
  'cst|lesson:4:3': { status: 'returned', update: true, reason: 'ভিডিওর শব্দ অস্পষ্ট, ৪:১০ থেকে ৬:০০', by: 'Shahriar Hossain', subAgoMin: 1500 },
  'cst|new:3:0': { kind: 'lesson', ch: 3, isNew: true, title: 'AVL ট্রি — রোটেশন দিয়ে ব্যালান্স', status: 'review', by: 'Shahriar Hossain', subAgoMin: 50,
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
    quiz: [{ stem: 'ফোনে কাউকে চাইতে সবচেয়ে ভদ্র বাক্য কোনটা?', o: ['Could I speak to Rahim, please?', 'Give me Rahim.', 'Rahim there?', 'I want Rahim.'], a: 0, why: '' }],
    blocks: [
      { t: 'h', x: 'ফোন ধরার প্রথম তিন লাইন' },
      { t: 'p', x: 'ফোনে মুখ দেখা যায় না, তাই ভদ্রতা পুরোটাই শব্দে। নিচের তিনটা লাইন মনে রাখলে বেশিরভাগ কল শুরু করা যায়।' },
      { t: 'list', x: 'Hello, this is Mahmud speaking.\nCould I speak to Rahim, please?\nSorry, could you say that again?' }
    ] },
  'cst|new:5:0': { kind: 'lesson', ch: 5, isNew: true, title: 'Floyd–Warshall — সব জোড়ার শর্টেস্ট পাথ', status: 'draft', video: { state: 'none' }, quiz: [], blocks: [
    { t: 'h', x: 'কখন Dijkstra যথেষ্ট না' },
    { t: 'p', x: 'যখন প্রতিটা নোড থেকে প্রতিটা নোডের দূরত্ব লাগবে, তখন n বার Dijkstra চালানোর বদলে একবারেই পুরো টেবিল বানানো যায়।' },
    { t: 'fx', x: 'd_{ij} = \\min(d_{ij},\\; d_{ik} + d_{kj})' }
  ] }
};
export const fxKeys: [string, string][] = [['×', ' \\times '], ['÷', ' \\div '], ['x²', '^{2}'], ['√', '\\sqrt{}'], ['a/b', '\\frac{a}{b}'], ['Σ', '\\sum '], ['π', '\\pi '], ['≤', ' \\le '], ['≥', ' \\ge '], ['→', ' \\to ']];
export const blockTypes: Record<BlockType, string[]> = {
  h: ['শিরোনাম', "'Anek Bangla',sans-serif", '600', '1.45', 'শিরোনাম লেখো'],
  p: ['অনুচ্ছেদ', "'Tiro Bangla',Georgia,serif", '400', '1.85', 'লেখা শুরু করো'],
  list: ['তালিকা · প্রতি লাইনে একটা', "'Tiro Bangla',Georgia,serif", '400', '1.85', 'প্রতি লাইনে একটা পয়েন্ট'],
  code: ['কোড', "'JetBrains Mono',monospace", '400', '1.7', 'কোড বা ফর্মুলা টেক্সট'],
  img: ['ছবি'], fx: ['সূত্র · LaTeX']
};

export const contentReasons = ['ভিডিওর শব্দ বা ছবি অস্পষ্ট', 'নোটে তথ্যগত ভুল', 'কুইজের উত্তর ভুল', 'সিলেবাসের বাইরে'];

export const courses: Record<CourseId, Course> = {
  cst: {
    id: 'cst', code: 'CST', track: 'batch',
    title: 'ডেটা স্ট্রাকচার ও অ্যালগরিদম', titleEn: 'Data Structure & Algorithm', instructor: 'Shahriar Hossain',
    sem: 4, batchNo: 1, start: '2026-08-01', end: '2026-12-28',
    chapters: [
      { name: 'ভূমিকা ও অ্যারে (Array)', lessons: [
        { t: 'কোর্স পরিচিতি', d: '08:20', done: true },
        { t: 'ডেটা স্ট্রাকচার কেন দরকার', d: '11:05', done: true },
        { t: 'অ্যারে — মেমরি লেআউট', d: '14:30', done: true },
        { t: 'অ্যারে অপারেশন ও কমপ্লেক্সিটি', d: '12:15', done: true } ] },
      { name: 'লিংকড লিস্ট (Linked List)', lessons: [
        { t: 'সিঙ্গলি লিংকড লিস্ট', d: '15:40', done: true },
        { t: 'ইনসার্ট ও ডিলিট', d: '13:20', done: true },
        { t: 'ডাবলি লিংকড লিস্ট', d: '12:50', done: true },
        { t: 'অ্যারে বনাম লিংকড লিস্ট', d: '09:35', done: true } ] },
      { name: 'স্ট্যাক ও কিউ (Stack & Queue)', lessons: [
        { t: 'স্ট্যাক কী', d: '10:10', done: true },
        { t: 'পুশ ও পপ', d: '11:45', done: true },
        { t: 'অ্যারে দিয়ে স্ট্যাক ইমপ্লিমেন্ট', d: '13:05', done: true },
        { t: 'কিউ কী', d: '09:50', done: true },
        { t: 'Stack ও Queue — বেসিক ধারণা', d: '12:30' },
        { t: 'সার্কুলার কিউ', d: '11:20' } ] },
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
  eng: {
    id: 'eng', code: 'ENG', track: 'skill',
    title: 'স্পোকেন ইংলিশ — ফাউন্ডেশন', titleEn: 'Spoken English — Foundation', instructor: 'Nusrat Jahan',
    weeks: 8, access: 'lifetime',
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
  }
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

export const testQs: QuizQ[] = [
  { stem: 'অ্যারের কোনো এলিমেন্ট ইনডেক্স দিয়ে পড়তে কত সময় লাগে?', o: ['O(1)', 'O(n)', 'O(log n)', 'O(n²)'], a: 0 },
  { stem: 'লিংকড লিস্টের প্রধান সুবিধা কী?', o: ['ইনডেক্স অ্যাক্সেস দ্রুত', 'ডাইনামিক সাইজ', 'কম মেমরি লাগে', 'সবসময় সাজানো থাকে'], a: 1 },
  { stem: 'স্ট্যাক কোন নীতিতে চলে?', o: ['FIFO', 'LIFO', 'প্রায়োরিটি', 'র‍্যান্ডম'], a: 1 },
  { stem: 'কিউ থেকে এলিমেন্ট বের করার অপারেশনের নাম কী?', o: ['pop()', 'enqueue()', 'dequeue()', 'peek()'], a: 2 },
  { stem: 'বাইনারি সার্চ চালাতে হলে ডেটা কেমন হতে হবে?', o: ['সাজানো (sorted)', 'অসাজানো', 'সংখ্যা হতে হবে', 'যেকোনো'], a: 0 },
  { stem: 'বাইনারি সার্চের টাইম কমপ্লেক্সিটি কত?', o: ['O(n)', 'O(1)', 'O(log n)', 'O(n log n)'], a: 2 },
  { stem: 'ইনফিক্স থেকে পোস্টফিক্স রূপান্তরে কোন ডেটা স্ট্রাকচার লাগে?', o: ['কিউ', 'স্ট্যাক', 'ট্রি', 'গ্রাফ'], a: 1 },
  { stem: 'BFS ট্রাভার্সালে কোন ডেটা স্ট্রাকচার ব্যবহার হয়?', o: ['স্ট্যাক', 'কিউ', 'হিপ', 'অ্যারে'], a: 1 },
  { stem: 'মার্জ সর্টের গড় টাইম কমপ্লেক্সিটি কত?', o: ['O(n²)', 'O(n log n)', 'O(n)', 'O(log n)'], a: 1 },
  { stem: 'বাইনারি সার্চ ট্রি-তে সবচেয়ে ছোট মান কোথায় থাকে?', o: ['রুট নোডে', 'সবচেয়ে ডান দিকের নোডে', 'সবচেয়ে বাঁ দিকের নোডে', 'যেকোনো লিফে'], a: 2 }
];
export const teacher = { name: 'Shahriar Hossain', batch: 'CST-04-B01', phone: '01711-649032', title: 'Senior Instructor · Computer Technology' };
export const defaultStudent = { name: 'Mahmudul Hasan', phone: '01712 445589', masked: '01712-••••89', batch: 'CST-04-B01' };
/** Subjects a teacher can list on their profile. */
export const subjectOptions = ['Data Structure', 'C Programming', 'Algorithm', 'Database', 'Web Development', 'Networking'];
export const supportPhone = '01777 090909';
export const testMeta = { name: 'Model Test 04', seconds: 1500 };
/** Seeded until activity tracking exists: the current streak ends today. */
export const streakSeed = { current: 12, best: 19 };
export const weekDayShort = ['Sa', 'Su', 'Mo', 'Tu', 'We', 'Th', 'Fr'];
export const weekDayHead = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

/** Tile colours for a tone: [background, foreground]. */
export const toneColors: Record<Tone, [string, string]> = {
  brand: ['var(--brand-soft)', 'var(--brand)'],
  ok: ['var(--ok-soft)', 'var(--ok)'],
  warn: ['var(--warn-soft)', 'var(--warn)'],
  sun: ['var(--sun)', 'var(--on-sun)'],
  pink: ['var(--accent-2-soft)', 'var(--accent-2)'],
};

export const notifSeed: Record<'student' | 'teacher', Notif[]> = {
  student: [
    { id: 's1', icon: 'forum', tone: 'brand', title: 'তোমার প্রশ্নের উত্তর এসেছে', body: 'Shahriar Hossain: "খালি স্ট্যাকে pop() করলে underflow হয় — তাই আগে isEmpty() চেক করো।"', agoMin: 12, href: '/learn/cst/2/4?tab=ask' },
    { id: 's2', icon: 'check_circle', tone: 'ok', title: 'পেমেন্ট অ্যাপ্রুভ হয়েছে', body: 'Web Development কোর্সে তোমার ভর্তি নিশ্চিত।', agoMin: 60, href: '/' },
    { id: 's3', icon: 'timer', tone: 'warn', title: 'Model Test 04 — শুক্রবার', body: '১০ প্রশ্ন · ২৫ মিনিট। প্রস্তুতি নিতে Chapter 03 রিভিশন দাও।', agoMin: 300, href: '/' },
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
