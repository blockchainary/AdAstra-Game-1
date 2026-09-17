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

test('🤖 Bot Çift Yönlü Dengeleme: Eksik Hammadde Oto-Tedarik (autoBuyBotResourceDeficit) & Silo Yükseltme Güvencesi', async (t) => {
  localStorage.clear();

  await t.test('1. Depoda Odun:0, Demir:0, Buğday:0 ve ADA:1000 iken autoBuyBotResourceDeficit eksikleri AMM pazarından satın almalı', () => {
    const gs = new GameStateManager();
    gs.state.inventory = { wood: 0, iron: 0, wheat: 0, fragments: 0 };
    gs.state.adAstraBalance = 1000;

    const prereqBefore = gs.checkBotPrerequisites();
    assert.equal(prereqBefore.isMet, false, 'Ön koşul henüz sağlanmamış olmalı');
    assert.equal(prereqBefore.missing.length, 3, '3 hammadde eksik olmalı (Odun, Demir, Buğday)');

    const buyRes = gs.autoBuyBotResourceDeficit(50);
    assert.equal(buyRes.bought, true, 'Oto-tedarik başarıyla gerçekleşmeli');
    assert.ok(buyRes.totalSpentAda > 0, 'ADA harcanmış olmalı');
    assert.ok(gs.state.adAstraBalance < 1000, 'ADA bakiyesi düşmüş olmalı');

    // Depoların en az 50 olduğuna emin ol
    assert.ok((gs.state.inventory.wood || 0) >= 50, 'Odun en az 50 olmalı');
    assert.ok((gs.state.inventory.iron || 0) >= 50, 'Demir en az 50 olmalı');
    assert.ok((gs.state.inventory.wheat || 0) >= 50, 'Buğday en az 50 olmalı');

    const prereqAfter = gs.checkBotPrerequisites();
    assert.equal(prereqAfter.isMet, true, 'Satın alımdan sonra ön koşullar tam olarak sağlanmalı');
  });

  await t.test('2. updateBotPauseState: Hammadde eksik olduğunda bot duraklamak yerine kasadaki ADA ile kaynak alıp kesintisiz çalışmalı', () => {
    const gs = new GameStateManager();
    // 24 saatlik bot tanımla
    const now = Date.now();
    gs.state.tavernaBotActive = true;
    gs.state.tavernaBotExpiresAt = now + 24 * 3600 * 1000;
    gs.state.botActiveUntil = gs.state.tavernaBotExpiresAt;
    gs.state.botPaused = false;

    // Hammaddeleri sıfırla ama kasada ADA bırak
    gs.state.inventory.wood = 0;
    gs.state.inventory.iron = 0;
    gs.state.inventory.wheat = 0;
    gs.state.adAstraBalance = 5000;

    const pauseCheck = gs.updateBotPauseState();
    assert.equal(gs.state.botPaused, false, 'Bot duraklatılmamış olmalı');
    assert.ok(gs.state.inventory.wood >= 50, 'Odun otomatik 50 yapılmış olmalı');
    assert.ok(gs.state.inventory.iron >= 50, 'Demir otomatik 50 yapılmış olmalı');
    assert.ok(gs.state.inventory.wheat >= 50, 'Buğday otomatik 50 yapılmış olmalı');
  });

  await t.test('3. Silo Seviye Yükseltildiğinde ambarlar sıfırlansa bile bot aktifse anında 50 hammadde satın alınarak güvenceye alınmalı', () => {
    const gs = new GameStateManager();
    const now = Date.now();
    gs.state.tavernaBotActive = true;
    gs.state.tavernaBotExpiresAt = now + 24 * 3600 * 1000;
    gs.state.botActiveUntil = gs.state.tavernaBotExpiresAt;

    // Depoları %80 doldur ve siloyu yükselt
    gs.state.warehouseLevel = 1;
    const cap = gs.getWarehouseCapacity(1);
    gs.state.inventory = {
      wood: cap.wood,
      iron: cap.iron,
      wheat: cap.wheat,
      fragments: 0
    };
    gs.state.adAstraBalance = 10000;

    const upRes = gs.upgradeWarehouse();
    assert.equal(upRes.success, true, 'Silo yükseltilmiş olmalı');
    assert.equal(gs.state.warehouseLevel, 2, 'Silo Seviye 2 olmalı');

    // Yükseltme sonrası bot aktif olduğu için ambarlar 0 kalmamalı, en az 50 olmalı!
    assert.ok((gs.state.inventory.wood || 0) >= 50, 'Yükseltme sonrası Odun en az 50 olmalı');
    assert.ok((gs.state.inventory.iron || 0) >= 50, 'Yükseltme sonrası Demir en az 50 olmalı');
    assert.ok((gs.state.inventory.wheat || 0) >= 50, 'Yükseltme sonrası Buğday en az 50 olmalı');
    assert.equal(gs.isBotPaused(), false, 'Bot asla duraklatılmamış olmalı');
  });

  await t.test('4. Dondurulmuş (Paused) bot, kasada ADA varken fastForwardTime tetiklendiğinde otomatik uyanıp seferleri çalıştırmalı', () => {
    const gs = new GameStateManager();
    // Yapay olarak duraklatılmış durum yarat
    gs.state.tavernaBotActive = true;
    gs.state.tavernaBotExpiresAt = Date.now() + 20 * 3600 * 1000;
    gs.state.botPaused = true;
    gs.state.botPausedRemainingMs = 20 * 3600 * 1000; // 20 saat dondurulmuş
    gs.state.inventory.wood = 0;
    gs.state.inventory.iron = 0;
    gs.state.inventory.wheat = 0;
    gs.state.adAstraBalance = 8000;
    gs.state.stamina = 100;
    gs.state.tools = {
      axe: { durability: 100, maxDurability: 100 },
      pickaxe: { durability: 100, maxDurability: 100 },
      sickle: { durability: 100, maxDurability: 100 }
    };

    // updateBotPauseState çağrıldığında kasadaki ADA ile hammadde alınıp bot uyandırılmalı
    const pauseState = gs.updateBotPauseState();
    assert.equal(pauseState.isPaused, false, 'updateBotPauseState oto-tedarik yaparak botu uyandırmalı');
    assert.equal(gs.isBotPaused(), false, 'Bot artık duraklatılmış olmamalı');

    const report = gs.fastForwardTime(2); // 2 saat ileri sar
    assert.equal(report.botExecutionStatus, 'ran', 'Bot uyanıp seferleri çalıştırmalı');
    assert.ok(report.totalExpeditionsClaimed > 0, 'Seferler toplanmış olmalı');
  });
});
