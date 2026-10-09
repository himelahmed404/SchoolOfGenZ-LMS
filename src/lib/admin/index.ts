// Admin console: logic + section builders. Import from here so every builder is registered.
import { BUILDERS } from './console';
import { overview } from './sections/overview';
import { announcements } from './sections/announcements';
import { batches, coupons, courses } from './sections/catalog';
import { certificates, students, teachers } from './sections/people';
import { refunds } from './sections/refunds';
import { activity, reports, roles, settings } from './sections/system';

BUILDERS.overview = overview;
BUILDERS.students = students;
BUILDERS.teachers = teachers;
BUILDERS.certificates = certificates;
BUILDERS.courses = courses;
BUILDERS.batches = batches;
BUILDERS.coupons = coupons;
BUILDERS.refunds = refunds;
BUILDERS.announcements = announcements;
BUILDERS.reports = reports;
BUILDERS.activity = activity;
BUILDERS.settings = settings;
BUILDERS.roles = roles;

export * from './console';
export { noFetched, noRole, roleFromApi, rolesFromApi } from './api';
export { ADMIN_CODES, sayAdmin } from './errors';
export { AREAS, adminSeed } from './seed';
export type * from './types';
