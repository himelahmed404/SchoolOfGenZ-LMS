import { ApiFailure } from './client';

/*
 * The API answers a refusal with a code. This is how the student and teacher screens say it:
 * a Bangla sentence, with digits in the reader's own numerals (`n` from useStore).
 * The admin console words the same codes in English (src/lib/admin/errors.ts).
 */

type N = (v: string | number) => string;

const NOT_ALLOWED = 'এটা করার অনুমতি তোমার নেই।';

const SAY: Record<string, (n: N) => string> = {
  bad_credentials: () => 'ফোন নম্বর, ইমেইল বা পাসওয়ার্ড মিলছে না। আবার দেখে লেখো।',
  rate_limited: () => 'অনেকবার চেষ্টা করা হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করো।',
  suspended: () => 'এই অ্যাকাউন্ট বন্ধ রাখা হয়েছে। সাপোর্টে কথা বলো।',
  inactive: () => 'এই অ্যাকাউন্ট এখন চালু নেই। অ্যাডমিনকে জানাও।',
  device_limit: () => 'তুমি আগে থেকেই অন্য ডিভাইসে লগ ইন করে আছো, আর জায়গা নেই। একটা ডিভাইস থেকে লগ আউট করে আবার চেষ্টা করো।',
  bad_code: () => 'কোডটা ভুল, অথবা এর মেয়াদ শেষ। SMS-এর কোডটা আবার দেখে লেখো।',
  weak_password: (n) => 'পাসওয়ার্ডে কমপক্ষে ' + n(8) + 'টা অক্ষর আর একটা সংখ্যা লাগবে।',
  bad_link: () => 'লিংকটা ভুল, আগে ব্যবহার করা হয়েছে, অথবা এর মেয়াদ শেষ। অ্যাডমিনের কাছে নতুন লিংক চাও।',
  wrong_password: () => 'বর্তমান পাসওয়ার্ডটা ঠিক হয়নি।',
  email_taken: () => 'এই ইমেইল অন্য একটা অ্যাকাউন্টে ব্যবহার হচ্ছে।',
  invalid_input: () => 'কিছু একটা ঠিকমতো লেখা হয়নি। আবার দেখে নাও।',
  offline: () => 'সার্ভারের সাথে যোগাযোগ করা যাচ্ছে না। ইন্টারনেট দেখে আবার চেষ্টা করো।',
  unauthorized: () => 'আবার লগ ইন করতে হবে।',
  bad_origin: () => NOT_ALLOWED,
  wrong_role: () => NOT_ALLOWED,
  no_permission: () => NOT_ALLOWED,
  not_yours_to_change: () => NOT_ALLOWED,
};

const UNKNOWN = 'আমাদের দিকে একটা সমস্যা হয়েছে। একটু পরে আবার চেষ্টা করো।';

/** The codes this file has words for. */
export const KNOWN_CODES = Object.keys(SAY);

/** What to tell the person about a failed request. Anything that is not a known refusal gets the general sentence. */
export function sayError(e: unknown, n: N): string {
  const say = e instanceof ApiFailure ? SAY[e.code] : undefined;
  return say ? say(n) : UNKNOWN;
}
