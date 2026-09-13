import { chromium } from 'playwright';

async function inspectLiveGame() {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222').catch(() => null);
  let page;
  let ownedBrowser = false;
  if (browser) {
    const contexts = browser.contexts();
    const pages = contexts[0]?.pages() || [];
    page = pages.find(p => p.url().includes('localhost:5173'));
  }

  if (!page) {
    const b = await chromium.launch({ headless: true });
    ownedBrowser = true;
    page = await b.newPage();
    await page.goto('http://localhost:5173/');
    await page.waitForTimeout(2000);
  }

  const gameStateData = await page.evaluate(() => {
    const raw = localStorage.getItem('adastra_player_save_v6');
    const state = raw ? JSON.parse(raw) : null;
    const poolRaw = localStorage.getItem('adastra_global_network_pool_v3');
    const pool = poolRaw ? JSON.parse(poolRaw) : null;
    
    return {
      state: state ? {
        level: state.level,
        stamina: state.stamina,
        adAstraBalance: state.adAstraBalance,
        inventory: state.inventory,
        warehouseLevel: state.warehouseLevel,
        tools: state.tools,
        botActiveUntil: state.botActiveUntil,
        tavernaBotActive: state.tavernaBotActive,
        tavernaBotExpiresAt: state.tavernaBotExpiresAt,
        botPaused: state.botPaused,
        botPausedRemainingMs: state.botPausedRemainingMs,
        botSiloAutoUpgrade: state.botSiloAutoUpgrade,
        activeExpeditions: state.activeExpeditions,
        lastBotActions: state.lastBotActions,
        lastBotSiloAction: state.lastBotSiloAction
      } : null,
      poolResources: pool?.resources
    };
  });

  console.log('LIVE GAME STATE:\n' + JSON.stringify(gameStateData, null, 2));
  if (ownedBrowser) {
    await page.context().browser().close();
  }
}

inspectLiveGame().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
