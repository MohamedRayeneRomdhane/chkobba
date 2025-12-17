import { test, expect } from '@playwright/test';

async function getRoomCode(page) {
  // Wait for the copy button which only appears after room creation
  const copyBtn = page.getByRole('button', { name: 'Copy room code' });
  await expect(copyBtn).toBeVisible({ timeout: 20_000 });
  const badgeText = await copyBtn.evaluate((btn) => btn.previousElementSibling?.textContent || '');
  const text = (badgeText || '').trim();
  const m = text.match(/Room\s+([A-Z0-9]{4})/);
  if (!m) throw new Error(`Could not parse room code from: ${text}`);
  return m[1];
}

async function joinRoom(page, code: string) {
  await page.fill('#roomCode', code);
  await page.getByRole('button', { name: 'Join', exact: true }).click();
}

async function waitForPlayers(page, n: number) {
  await expect(page.locator(`text=Players ${n}/4`)).toBeVisible({ timeout: 20_000 });
}

async function discardFirstPlayableCard(page) {
  const firstCard = page.locator('[data-hand-card-id]').first();
  await firstCard.waitFor({ state: 'visible' });
  // Prefer explicit Play Selected path to ensure it's our turn
  await firstCard.click();
  const playBtn = page.getByRole('button', { name: 'Play Selected' });
  await expect(playBtn).toBeEnabled({ timeout: 10_000 });
  await playBtn.click();
}

async function expectNoLingeringFlights(page) {
  const layer = page.locator('[data-flight-layer]');
  await expect(layer).toBeVisible();
  // It may take a moment for a flight to appear after click
  await page.waitForSelector('[data-flight-id]', { state: 'attached', timeout: 2000 }).catch(() => {});
  // Regardless, ensure any flight disappears within a reasonable budget
  await page.waitForSelector('[data-flight-id]', { state: 'detached', timeout: 3000 });
  // Ensure layer is non-interactive
  const pointerEvents = await layer.evaluate((el) => getComputedStyle(el).pointerEvents);
  expect(pointerEvents).toBe('none');
}

// Basic E2E to ensure a discard does not leave a stuck overlay
// and that the flight layer remains non-interactive.

test('discard overlay cleans up - no lingering image', async ({ browser, page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Create & Join' }).click();
  const code = await getRoomCode(page);

  const context = await browser.newContext();
  const p2 = await context.newPage();
  const p3 = await context.newPage();
  const p4 = await context.newPage();
  await Promise.all([p2.goto('/'), p3.goto('/'), p4.goto('/')]);
  await joinRoom(p2, code);
  await joinRoom(p3, code);
  await joinRoom(p4, code);

  await waitForPlayers(page, 4);

  // Discard once from the creator tab (seat 0 starts)
  await discardFirstPlayableCard(page);
  await expectNoLingeringFlights(page);
});
