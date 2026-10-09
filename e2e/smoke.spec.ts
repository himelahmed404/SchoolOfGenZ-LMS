import { expect, test } from '@playwright/test';
import { signedInAs } from './session';

test('the LMS reaches the API through its own /api path', async ({ request }) => {
  const res = await request.get('/api/v1/health');
  expect(res.status()).toBe(200);
  expect(await res.json()).toMatchObject({ ok: true, db: true });
  expect(res.headers()['x-request-id']).toBeTruthy();
});

test('an unknown API path comes back as an error with a code', async ({ request }) => {
  const res = await request.get('/api/v1/nothing-here');
  expect(res.status()).toBe(404);
  expect((await res.json()).error.code).toBe('no_route');
});

test('My Courses shows the semester with its subjects, then the single course', async ({ page }) => {
  await signedInAs(page, 'student');
  await page.goto('/courses');
  await expect(page.getByRole('heading', { name: 'CST · 4th Semester' })).toBeVisible();
  await expect(page.getByText('BTEB 25942')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Skill Courses' })).toBeVisible();
});

test('a single course has no Quiz tab and a diploma subject does', async ({ page }) => {
  await signedInAs(page, 'student');
  await page.goto('/learn/eng/0/0');
  await expect(page.getByRole('tab', { name: 'Notes' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Quiz' })).toHaveCount(0);
  await page.goto('/learn/dsa/2/4');
  await expect(page.getByRole('tab', { name: 'Quiz' })).toBeVisible();
});
