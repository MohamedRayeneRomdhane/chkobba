import { test, expect, type Browser } from '@playwright/test';
import { createAndJoinFour } from './utils';

// Basic room flow and initial dealing
// Verifies: 4 players joined, seats assigned, initial 3-card hands and 4-card table rendered

test('room creates, four join, initial deal renders', async ({ browser }) => {
  const [p1] = await createAndJoinFour(browser);

  // Wait for table grid and 4 cards
  const tableGrid = p1.locator('#table-grid');
  await expect(tableGrid).toBeVisible();
  await expect(tableGrid.locator('[data-card-id]')).toHaveCount(4);

  // Bottom hand should have 3 cards initially
  const bottomHandCards = p1.locator('[data-seat-anchor="bottom"] [data-hand-card-id]');
  await expect(bottomHandCards).toHaveCount(3);

  // Each opponent should show 3 card backs
  const topCards = p1.locator('[data-seat-anchor="top"] [data-op-card]');
  const leftCards = p1.locator('[data-seat-anchor="left"] [data-op-card]');
  const rightCards = p1.locator('[data-seat-anchor="right"] [data-op-card]');
  await expect(topCards).toHaveCount(3);
  await expect(leftCards).toHaveCount(3);
  await expect(rightCards).toHaveCount(3);

  // Scoreboard visible with default scores/chkobba
  await expect(p1.getByText(/Team A .* chk/)).toBeVisible();
  await expect(p1.getByText(/Team B .* chk/)).toBeVisible();
});
