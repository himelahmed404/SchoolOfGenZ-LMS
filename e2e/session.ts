import { expect, type Page } from '@playwright/test';

/** The demo accounts from `server/src/db/seed/demo.json`. They all share one password. */
export const DEMO = {
  student: { login: '01712445589', name: 'Mahmudul Hasan', home: '/' },
  teacher: { login: 'shahriar@schoolofgenz.com', name: 'Shahriar Hossain', home: '/teacher' },
  admin: { login: 'rifat@schoolofgenz.com', name: 'Rifat Ahmed', home: '/admin' },
} as const;
export const DEMO_PASSWORD = 'genz2026';

/**
 * Every test is the same browser to the server. A student may be signed in on two devices only, and
 * a test that failed half way never logs out, so a new name each time would lock the demo student out.
 */
const DEVICE = 'e2e-browser';
export const sameDevice = (page: Page) => page.addInitScript((d) => localStorage.setItem('sgz-device', d), DEVICE);

/** Signed in without the form, for a test that is about something else. Development only (`/auth/dev`). */
export async function signedInAs(page: Page, as: keyof typeof DEMO) {
  await sameDevice(page);
  const res = await page.request.post('/api/v1/auth/dev', { headers: { origin: 'http://localhost:3000' }, data: { as, device: DEVICE } });
  expect(res.status(), 'the demo data is loaded and DEV_LOGIN is on').toBe(200);
}

/** Fill the sign-in form and send it. */
export async function signIn(page: Page, login: string, password = DEMO_PASSWORD) {
  await page.getByLabel('Phone or email').fill(login);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
}
