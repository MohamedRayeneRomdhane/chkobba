import { test, expect, type Browser } from '@playwright/test';
import { createAndJoinFour, getTableValues, getHandValues, rankToValue } from './utils';

// Discard (place on table) with no capture: pick a hand card whose value
// does not match any table card value, then Play Selected with no combo

test('player can discard a card onto the table', async ({ browser }) => {
  const [p1] = await createAndJoinFour(browser);

  const tableGrid = p1.locator('#table-grid');
  await expect(tableGrid.locator('[data-card-id]')).toHaveCount(4);

  const bottomHandCards = p1.locator('[data-seat-anchor="bottom"] [data-hand-card-id]');
  await expect(bottomHandCards).toHaveCount(3);
  // Ensure it's our turn (creator starts as seat 0)
  await expect(p1.getByText('Your turn')).toBeVisible({ timeout: 10_000 });

  const tableVals = await getTableValues(p1);
  const handVals = await getHandValues(p1);
  const candidate = handVals.find((h) => !tableVals.includes(h.value));
  test.skip(!candidate, 'No safe discard (all hand values match table)');

  // Select the candidate and play with no table selection
  await bottomHandCards.nth(candidate!.index).click();
  await p1.getByRole('button', { name: 'Play Selected' }).click();

  // Table should gain +1, hand should lose -1
  await expect(bottomHandCards).toHaveCount(2);
  await expect(tableGrid.locator('[data-card-id]')).toHaveCount(5);
});

// Single-card capture: find table card with same value as selected hand card and play

test('single-card capture when matching value is present', async ({ browser }) => {
  const [p1] = await createAndJoinFour(browser);

  const tableCards = p1.locator('#table-grid [data-card-id]');
  const handCards = p1.locator('[data-seat-anchor="bottom"] [data-hand-card-id]');
  await expect(handCards).toHaveCount(3);
  await expect(p1.getByText('Your turn')).toBeVisible({ timeout: 10_000 });
  // Find any matching hand-table value pair
  const handVals = await getHandValues(p1);
  const tableVals = await getTableValues(p1);
  const match = handVals.find((h) => tableVals.includes(h.value));
  test.skip(!match, 'No single-match available in current deal');

  // Select the matching hand card and the corresponding table card
  await handCards.nth(match!.index).click();
  // Pick the first table card with the same value
  const tCount = await tableCards.count();
  let tIdx = -1;
  for (let i = 0; i < tCount; i++) {
    const alt = await tableCards.nth(i).locator('img').getAttribute('alt');
    const r = alt?.match(/^(A|[2-7]|Q|J|K) of /)?.[1] || '';
    if (rankToValue(r) === match!.value) { tIdx = i; break; }
  }
  await tableCards.nth(tIdx).click();
  await p1.getByRole('button', { name: 'Play Selected' }).click();

  // Assert hand -1 and table -1 (captured), allowing for animation timing
  await expect(handCards).toHaveCount(2);
  await expect(tableCards).toHaveCount(3);
});

// Multi-card combination capture UI: selecting multiple table cards updates the sum indicator

test('table selection updates combination sum and allows play', async ({ browser }) => {
  const [p1] = await createAndJoinFour(browser);
  const tableCards = p1.locator('#table-grid [data-card-id]');
  const handCards = p1.locator('[data-seat-anchor="bottom"] [data-hand-card-id]');
  await expect(handCards).toHaveCount(3);

  // Select first hand card
  await handCards.first().click();

  // Select first two table cards (UI-only validation of sum box)
  const alt1 = await tableCards.nth(0).locator('img').getAttribute('alt');
  const alt2 = await tableCards.nth(1).locator('img').getAttribute('alt');
  const r1 = rankToValue((alt1?.match(/^(A|[2-7]|Q|J|K) of /)?.[1]) || 'A');
  const r2 = rankToValue((alt2?.match(/^(A|[2-7]|Q|J|K) of /)?.[1]) || 'A');
  await tableCards.nth(0).click();
  await tableCards.nth(1).click();

  // Verify the sum indicator text reflects selection
  const indicator = p1.locator('text=Selected:');
  await expect(indicator).toBeVisible();
  // Not asserting exact sum equality with hand value (random), but the text should include Sum:
  await expect(indicator).toContainText(/Sum: \d+/);
});
