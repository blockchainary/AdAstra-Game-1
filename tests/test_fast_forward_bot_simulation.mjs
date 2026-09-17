import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = {
  dispatchEvent: () => {},
  addEventListener: () => {}
};
globalThis.localStorage = {
  store: {},
  getItem(k) { return this.store[k] || null; },
  setItem(k, v) { this.store[k] = String(v); },
  removeItem(k) { delete this.store[k]; },
  clear() { this.store = {}; }
};
globalThis.sound = {
  playStaminaRefill: () => {},
  playLevelUp: () => {},
  playSuccess: () => {},
  playClick: () => {},
  playHarvest: () => {},
  playBreakWarning: () => {}
};

import { GAME_CONFIG } from '../js/config.js';
globalThis.GAME_CONFIG = GAME_CONFIG;

import { ammMarket } from '../js/ammMarket.js';
globalThis.ammMarket = ammMarket;

import { globalPool } from '../js/globalPool.js';
globalThis.globalPool = globalPool;

import { GameStateManager } from '../js/gameState.js';

test('⏩ Zaman Atlama (fastForwardTime) & Taverna Botu Simülasyonu Testleri', async (t) => {
  localStorage.clear();

  await t.test('1. Bot aktif DEĞİLKEN zaman sarıldığında bot çalışmamalı, sadece aktif seferler ilerlemeli', () => {
    const gs = new GameStateManager();
    gs.state.tavernaBotActive = false;
    gs.state.botActiveUntil = 0;
    gs.state.tavernaBotExpiresAt = 0;
    gs.state.botPaused = false;

    // Tek bir odun seferi ekle
    gs.state.activeExpeditions = {
      wood: {
        nodeId: 'wood',
        durationSeconds: 1080,
        elapsedSeconds: 0,
        isCompleted: false
      }
    };

    const initialWood = gs.state.inventory.wood;
    const report = gs.fastForwardTime(2);

    assert.equal(report.hasBot, false, 'Bot olmamalı');
    assert.equal(report.botExecutionStatus, 'inactive', 'Bot durumu inactive olmalı');
    assert.equal(gs.state.activeExpeditions.wood.isCompleted, true, 'Odun seferi tamamlanmış olmalı');
    // Toplanmadığı için envanter artmamalı (bot olmadığı için otomatik toplanmaz)
    assert.equal(gs.state.inventory.wood, initialWood, 'Bot yokken otomatik toplama yapılmamalı');
  });

  await t.test('2. Bot AKTİFKEN +1 Saat sarıldığında ardışık seferler çalışmalı, mahsul toplanmalı ve süre azalmalı', () => {
    const gs = new GameStateManager();
    const now = Date.now();
    const initialRemainingHours = 24;
    gs.state.botActiveUntil = now + initialRemainingHours * 3600 * 1000;
    gs.state.tavernaBotActive = true;
    gs.state.tavernaBotExpiresAt = gs.state.botActiveUntil;
    gs.state.botPaused = false;
    gs.state.warehouseLevel = 3; // bol depo kapasitesi

    // Yeterli kaynaklar ve aletler
    gs.state.inventory.wood = 500;
    gs.state.inventory.iron = 500;
    gs.state.inventory.wheat = 800;
    gs.state.adAstraBalance = 10000;
    gs.state.stamina = 100;
    gs.state.tools.axe.durability = 5000;
    gs.state.tools.pickaxe.durability = 5000;
    gs.state.tools.sickle.durability = 5000;

    // 1 saat (3600 saniye) ileri sar
    const report = gs.fastForwardTime(1);

    assert.equal(report.hasBot, true, 'Bot aktif olmalı');
    assert.equal(report.botExecutionStatus, 'ran', 'Bot çalışmış olmalı');
    assert.ok(report.totalExpeditionsClaimed >= 2, `1 saatte en az 2 sefer toplanmalı, toplanan: ${report.totalExpeditionsClaimed}`);
    assert.ok(report.woodGain > 0 || report.ironGain > 0 || report.wheatGain > 0, 'En az bir kaynaktan kazanç sağlanmalı');
    
    // Bot süresi kontrolü: 24 saatten yaklaşık 23 saate inmiş olmalı
    const currentExpiry = gs.getAutoCollectorExpiry();
    const remainingMs = currentExpiry - now;
    const remainingHours = Math.round(remainingMs / (3600 * 1000));
    assert.equal(remainingHours, 23, `Kalan bot süresi 23 saat olmalı, bulunan: ${remainingHours}`);
  });

  await t.test('3. Bot DONDURULMUŞKEN (Paused) zaman sarıldığında bot süresi ASLA azalmamalı', () => {
    const gs = new GameStateManager();
    const frozenMs = 18 * 3600 * 1000; // 18 saat dondurulmuş süre
    gs.state.botPaused = true;
    gs.state.botPausedRemainingMs = frozenMs;
    gs.state.botActiveUntil = 0;
    gs.state.tavernaBotExpiresAt = 0;
    gs.state.inventory.iron = 10; // eksik demir (<50)

    const report = gs.fastForwardTime(6);

    assert.equal(report.hasBot, true, 'Bot satın alınmış olmalı');
    assert.equal(report.botExecutionStatus, 'paused', 'Bot paused statüsünde olmalı');
    assert.equal(gs.state.botPausedRemainingMs, frozenMs, 'Dondurulmuş bot süresi zerre kadar azalmamalı!');
    assert.ok(report.botRemainingText.includes('Donduruldu'), 'Rapor metninde Donduruldu ifadesi yer almalı');
  });

  await t.test('4. Kalan süreden DAHA UZUN bir zaman sarıldığında bot süresi bitmeli (expired)', () => {
    const gs = new GameStateManager();
    const now = Date.now();
    // Yalnızca 2 saatlik bot süresi kaldı
    gs.state.botActiveUntil = now + 2 * 3600 * 1000;
    gs.state.tavernaBotActive = true;
    gs.state.tavernaBotExpiresAt = gs.state.botActiveUntil;
    gs.state.botPaused = false;
    gs.state.warehouseLevel = 3;
    gs.state.inventory.wood = 500;
    gs.state.inventory.iron = 500;
    gs.state.inventory.wheat = 500;
    gs.state.adAstraBalance = 5000;
    gs.state.stamina = 100;
    gs.state.tools.axe.durability = 5000;
    gs.state.tools.pickaxe.durability = 5000;
    gs.state.tools.sickle.durability = 5000;

    // 6 saat ileri sar
    const report = gs.fastForwardTime(6);

    assert.equal(report.botExecutionStatus, 'expired', 'Bot süresi dolduğu için expired raporlanmalı');
    assert.equal(gs.hasPurchasedBot(), false, 'Bot süresi bittiği için artık aktif bot olmamalı');
  });
});
