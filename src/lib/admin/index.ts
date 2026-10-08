// Admin console: logic + section builders. Import from here so every builder is registered.
import { BUILDERS } from './console';
import { overview } from './sections/overview';

BUILDERS.overview = overview;

export * from './console';
export { AREAS, adminSeed } from './seed';
export type * from './types';
