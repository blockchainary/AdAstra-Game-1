import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 950 } });
page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE ERR:', m.text()); });
page.on('pageerror', e => console.log('PAGEERROR:', e.message));

const evalState = async (body, args = {}) => page.evaluate(async ({ body, args }) => {
  const { gameState } = await import('/js/gameState.js');
  const { ammMarket } = await import('/js/ammMarket.js');
  const { globalPool } = await import('/js/globalPool.js');
  const { GAME_CONFIG } = await import('/js/config.js');
  const fn = new Function('gameState', 'ammMarket', 'globalPool', 'GAME_CONFIG', 'args', body);
  return fn(gameState, ammMarket, globalPool, GAME_CONFIG, args);
}, { body, args });

await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3500);
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3500);

const beforeDev = await evalState('return { stamina: gameState.state.stamina, wood: gameState.state.inventory.wood, active: gameState.state.activeExpeditions, axe: gameState.state.tools.axe }');
console.log('BEFORE DEV GRANTS:', JSON.stringify(beforeDev));

const openDev = async () => { await page.keyboard.press('t'); await page.waitForSelector('#dev-modal:not(.hidden)', { timeout: 3000 }); };
const closeDev = async () => { const isOpen = await page.locator('#dev-modal:not(.hidden)').count(); if (isOpen) await page.click('#btn-close-dev-modal'); await page.waitForTimeout(100); };
const clickDevAction = async (action, extra = '') => { await openDev(); await page.click(`[data-dev-action="${action}"]${extra}`); await page.waitForTimeout(150); await closeDev(); };

await clickDevAction('add-wood', '[data-amount="50000"]');
await clickDevAction('add-iron', '[data-amount="50000"]');
await clickDevAction('add-wheat', '[data-amount="50000"]');
await clickDevAction('add-adastra', '[data-amount="100000"]');

const afterDev = await evalState('return { stamina: gameState.state.stamina, wood: gameState.state.inventory.wood, ada: gameState.state.adAstraBalance, active: gameState.state.activeExpeditions, axe: gameState.state.tools.axe }');
console.log('AFTER DEV GRANTS (via my import):', JSON.stringify(afterDev));

const lsRaw = await page.evaluate(() => {
  const raw = localStorage.getItem('adastra_player_save_v6');
  return raw ? JSON.parse(raw).inventory : null;
});
console.log('AFTER DEV GRANTS (localStorage raw):', JSON.stringify(lsRaw));

await page.keyboard.press('1');
await page.waitForTimeout(300);
const modalOpen = await page.locator('#rpg-modal.active').count();
console.log('MODAL OPEN AFTER PRESS 1:', modalOpen);
const btn = page.locator('.btn-modal-start[data-node="wood"]');
console.log('START BTN COUNT:', await btn.count());
console.log('START BTN DISABLED:', await btn.getAttribute('disabled').catch(() => 'N/A'));
const modalHtml = await page.locator('#modal-body').innerHTML().catch(() => 'N/A');
console.log('MODAL BODY (first 600 chars):', modalHtml.slice(0, 600));

await btn.click();
await page.waitForTimeout(400);

const afterClick = await evalState('return { stamina: gameState.state.stamina, active: gameState.state.activeExpeditions }');
console.log('AFTER CLICK START:', JSON.stringify(afterClick));

const toast = await page.evaluate(() => {
  const toasts = document.querySelectorAll('#toast-container > div');
  return Array.from(toasts).map(t => t.textContent);
});
console.log('TOASTS:', JSON.stringify(toast));

await browser.close();
