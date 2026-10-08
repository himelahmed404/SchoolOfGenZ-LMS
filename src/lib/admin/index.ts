// Admin console: logic + section builders. Import from here so every builder is registered.
import { BUILDERS } from './console';
import { overview } from './sections/overview';
import { announcements } from './sections/announcements';
import { batches, coupons, courses } from './sections/catalog';
import { certificates, students, teachers } from './sections/people';
import { refunds } from './sections/refunds';

BUILDERS.overview = overview;
BUILDERS.students = students;
BUILDERS.teachers = teachers;
BUILDERS.certificates = certificates;
BUILDERS.courses = courses;
BUILDERS.batches = batches;
BUILDERS.coupons = coupons;
BUILDERS.refunds = refunds;
BUILDERS.announcements = announcements;

export * from './console';
export { AREAS, adminSeed } from './seed';
export type * from './types';
