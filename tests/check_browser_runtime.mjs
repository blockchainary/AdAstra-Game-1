import { chromium } from 'playwright';

async function checkConsole() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER ERROR:', msg.text());
    } else if (msg.type() === 'warn') {
      console.log('BROWSER WARN:', msg.text());
    }
  });

  page.on('pageerror', err => {
    console.log('PAGE UNCAUGHT ERROR:', err.message);
  });

  await page.goto('http://localhost:5173/');
  await page.waitForTimeout(5000);

  // localStorage'ı incele
  const rawState = await page.evaluate(() => localStorage.getItem('adastra_game_state_v1'));
  console.log('PAGE LOADED OK, STATE PRESENT:', !!rawState);

  await browser.close();
}

checkConsole();
