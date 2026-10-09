import { expect, test } from '@playwright/test';
import { DEMO, sameDevice, signIn } from './session';

test.beforeEach(({ page }) => sameDevice(page));

test('a signed-out visitor is sent to sign in, and a wrong guess is refused', async ({ page }) => {
  await page.goto('/courses');
  await expect(page).toHaveURL('/signin?next=%2Fcourses');
  await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();

  // A number nobody has, and a new one each run: the server counts tries per number, so guessing at
  // a demo account here would lock it for the tests that follow.
  await signIn(page, '019' + String(Date.now()).slice(-8), 'not-the-password-1');
  await expect(page.locator('form [role=alert]')).toBeVisible();
  await expect(page).toHaveURL('/signin?next=%2Fcourses');
});

test('a student signs in, returns to where they were going, is kept out of the other apps, and logs out', async ({ page }) => {
  await page.goto('/courses');
  await signIn(page, DEMO.student.login);
  await expect(page).toHaveURL('/courses');
  await expect(page.getByRole('heading', { name: 'CST · 4th Semester' })).toBeVisible();

  await page.goto('/teacher');
  await expect(page).toHaveURL('/');
  await page.goto('/admin/payments');
  await expect(page).toHaveURL('/');

  await page.goto('/profile');
  await expect(page.getByText(DEMO.student.name).first()).toBeVisible();
  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page).toHaveURL('/signin');

  // The session is over on the server too, not only forgotten here.
  await page.goto('/courses');
  await expect(page).toHaveURL('/signin?next=%2Fcourses');
  expect((await page.request.get('/api/v1/auth/me')).status()).toBe(401);
});

test('a teacher and a staff member each land in their own app and are sent back from the others', async ({ page }) => {
  await page.goto('/signin');
  await signIn(page, DEMO.teacher.login);
  await expect(page).toHaveURL('/teacher');
  await page.goto('/admin');
  await expect(page).toHaveURL('/teacher');
  await page.goto('/teacher/profile');
  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page).toHaveURL('/signin');

  await signIn(page, DEMO.admin.login);
  await expect(page).toHaveURL(/\/admin/);
  await expect(page.getByText(DEMO.admin.name).first()).toBeVisible();
  await page.goto('/courses');
  await expect(page).toHaveURL(/\/admin/);
  await page.goto('/admin/roles');
  await expect(page.getByRole('tab', { name: /^Staff/ })).toBeVisible();
});

test('the screens for setting a password are open to a signed-out visitor, and a made-up link is refused', async ({ page }) => {
  await page.goto('/forgot');
  await expect(page.getByRole('heading', { name: 'Forgot Password' })).toBeVisible();
  await page.goto('/activate');
  await expect(page.getByRole('heading', { name: 'Set Your Password' })).toBeVisible();
  await page.goto('/invite/not-a-real-token');
  await expect(page.getByRole('heading', { name: 'This Link Does Not Work' })).toBeVisible();
});
