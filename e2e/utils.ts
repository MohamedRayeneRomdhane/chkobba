import { expect, type Browser, type Page } from '@playwright/test';

export function rankToValue(rank: string): number {
  if (rank === 'A') return 1;
  if (rank === 'Q') return 8;
  if (rank === 'J') return 9;
  if (rank === 'K') return 10;
  const n = parseInt(rank, 10);
  return Number.isFinite(n) ? n : -1;
}

export async function waitPlayers(page: Page, n: number) {
  await expect(page.getByText(new RegExp(`Players\\s+${n}/4`))).toBeVisible({ timeout: 20_000 });
}

export async function getRoomCode(page: Page) {
  const copyBtn = page.getByRole('button', { name: 'Copy room code' });
  await expect(copyBtn).toBeVisible({ timeout: 20_000 });
  const badgeText = await copyBtn.evaluate((btn: HTMLElement) => (btn.previousElementSibling as HTMLElement | null)?.textContent || '');
  const text = (badgeText || '').trim();
  const m = text.match(/Room\s+([A-Z0-9]{4})/);
  if (!m) throw new Error(`Could not parse room code from: ${text}`);
  return m[1];
}

export async function createAndJoinFour(browser: Browser) {
  const contexts = await Promise.all([
    browser.newContext(),
    browser.newContext(),
    browser.newContext(),
    browser.newContext(),
  ]);
  const pages = await Promise.all(contexts.map((c: any) => c.newPage()));

  const [p1, p2, p3, p4] = pages;
  await Promise.all([p1.goto('/'), p2.goto('/'), p3.goto('/'), p4.goto('/')]);

  // Ensure sockets connected before any action
  await expect(p1.getByText(/Connected/)).toBeVisible({ timeout: 20_000 });
  await expect(p2.getByText(/Connected/)).toBeVisible({ timeout: 20_000 });
  await expect(p3.getByText(/Connected/)).toBeVisible({ timeout: 20_000 });
  await expect(p4.getByText(/Connected/)).toBeVisible({ timeout: 20_000 });

  // Create room from p1 and share code
  await p1.getByRole('button', { name: 'Create & Join' }).click();
  const code = await getRoomCode(p1);

  // Sequential joins with player count checks to avoid races
  await p2.fill('#roomCode', code);
  await p2.getByRole('button', { name: 'Join', exact: true }).click();
  await Promise.all([waitPlayers(p1, 2), waitPlayers(p2, 2)]);

  await p3.fill('#roomCode', code);
  await p3.getByRole('button', { name: 'Join', exact: true }).click();
  await Promise.all([waitPlayers(p1, 3), waitPlayers(p3, 3)]);

  await p4.fill('#roomCode', code);
  await p4.getByRole('button', { name: 'Join', exact: true }).click();
  await Promise.all([waitPlayers(p1, 4), waitPlayers(p4, 4)]);

  return pages as [Page, Page, Page, Page];
}

export async function getTableValues(page: Page): Promise<number[]> {
  const cards = page.locator('#table-grid [data-card-id]');
  const count = await cards.count();
  const values: number[] = [];
  for (let i = 0; i < count; i++) {
    const alt = await cards.nth(i).locator('img').getAttribute('alt');
    const rank = alt?.match(/^(A|[2-7]|Q|J|K) of /)?.[1] || '';
    values.push(rankToValue(rank));
  }
  return values;
}

export async function getHandValues(page: Page): Promise<{ index: number; value: number; id: string }[]> {
  const cards = page.locator('[data-seat-anchor="bottom"] [data-hand-card-id]');
  const count = await cards.count();
  const res: { index: number; value: number; id: string }[] = [];
  for (let i = 0; i < count; i++) {
    const img = cards.nth(i).locator('img');
    const alt = await img.getAttribute('alt');
    const rank = alt?.match(/^(A|[2-7]|Q|J|K) of /)?.[1] || '';
    const id = await cards.nth(i).getAttribute('data-hand-card-id');
    res.push({ index: i, value: rankToValue(rank), id: id || '' });
  }
  return res;
}
