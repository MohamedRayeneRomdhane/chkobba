import { test, expect, type Browser, type Page } from '@playwright/test';
import { createAndJoinFour, waitPlayers } from './utils';

async function discardFirstPlayableCard(page: Page) {
  const firstCard = page.locator('[data-hand-card-id]').first();
  await firstCard.waitFor({ state: 'visible' });
  // Ensure it's our turn before attempting to play
  await expect(page.getByText('Your turn')).toBeVisible({ timeout: 10_000 });
  // Prefer explicit Play Selected path to ensure it's our turn
  await firstCard.click();
  const playBtn = page.getByRole('button', { name: 'Play Selected' });
  await expect(playBtn).toBeEnabled({ timeout: 10_000 });
  await playBtn.click();
}

async function expectNoLingeringFlights(page: Page) {
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
  const [p1] = await createAndJoinFour(browser);
  // Ensure everyone sees 4/4 before proceeding
  await waitPlayers(p1, 4);

  // Discard once from the creator tab (seat 0 starts)
  await discardFirstPlayableCard(p1);
  await expectNoLingeringFlights(p1);
});
