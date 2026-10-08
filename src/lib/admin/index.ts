// Admin console: logic + section builders. Import from here so every builder is registered.
import { BUILDERS } from './console';
import { overview } from './sections/overview';
import { batches, coupons, courses } from './sections/catalog';
import { certificates, students, teachers } from './sections/people';

BUILDERS.overview = overview;
BUILDERS.students = students;
BUILDERS.teachers = teachers;
BUILDERS.certificates = certificates;
BUILDERS.courses = courses;
BUILDERS.batches = batches;
BUILDERS.coupons = coupons;

export * from './console';
export { AREAS, adminSeed } from './seed';
export type * from './types';
