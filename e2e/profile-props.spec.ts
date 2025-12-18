import { test, expect, type Browser, type Page } from '@playwright/test';

async function createAndJoin(browser: Browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('/');
  await page.getByRole('button', { name: 'Create & Join' }).click();
  // Ensure socket connected and snapshot updated
  await expect(page.getByText(/Connected/)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/Players\s+1\/4/)).toBeVisible({ timeout: 20_000 });
  return page;
}

// Profile editing overlay flow: open, choose avatar + nickname, then save and overlay closes

test('edit profile overlay updates nickname and avatar', async ({ browser }) => {
  const page = await createAndJoin(browser);

  // Open overlay
  await page.getByRole('button', { name: 'Edit Profile' }).click();
  const modal = page.getByRole('dialog', { name: 'Edit Profile' });
  await expect(modal).toBeVisible({ timeout: 10_000 });

  // Fill nickname within overlay
  const nicknameInput = modal.getByPlaceholder('Nickname');
  await nicknameInput.fill('Tester');

  // Pick the first avatar image within overlay
  const avatarThumb = modal.locator('img[alt$=".jpg"], img[alt$=".svg"]').first();
  await avatarThumb.click();

  // Save within overlay
  await modal.getByRole('button', { name: 'Save Profile' }).click();

  // Overlay should close and bottom seat panel should reflect nickname
  await expect(page.getByRole('dialog', { name: 'Edit Profile' })).toBeHidden();
  await expect(page.getByText('Tester')).toBeVisible();
});

// Café props interactions: clicking triggers (no hard audio assertion, just DOM presence)

test('café props are clickable (coffee, hookah, cigarettes)', async ({ browser }) => {
  const page = await createAndJoin(browser);

  // Coffee cup
  const coffee = page.getByAltText('Coffee cup');
  await expect(coffee).toBeVisible();
  await coffee.click();

  // Hookah (press down then up to simulate inhale/exhale)
  const hookah = page.getByAltText('Hookah');
  await expect(hookah).toBeVisible();
  await hookah.dispatchEvent('pointerdown');
  await hookah.dispatchEvent('pointerup');

  // Cigarette pack
  const cigs = page.getByAltText('Cigarette pack');
  await expect(cigs).toBeVisible();
  await cigs.click();
});
