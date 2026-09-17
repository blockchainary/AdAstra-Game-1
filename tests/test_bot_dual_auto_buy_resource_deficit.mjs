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

test('🤖 Bot Çift Yönlü Dengeleme: Eksik Hammadde Oto-Tedarik & Seviyeye Göre Sefer Tamiratı +%50 Rezerv Güvencesi', async (t) => {
  localStorage.clear();

  await t.test('1. getBotDynamicResourceDeficitTargets: Seviye arttıkça (Lv 1, 2, 3) tamirat bedelleri ve +%50 hedef orantılı artmalı', () => {
    const gs = new GameStateManager();

    const lv1Data = gs.getBotDynamicResourceDeficitTargets(1);
    assert.equal(lv1Data.durationMinutes, 18, 'Lv 1 sefer süresi 18 dakika olmalı');
    assert.ok(lv1Data.targets.wood >= 120, `Lv 1 Odun hedefi >= 120 olmalı, bulunan: ${lv1Data.targets.wood}`);
    assert.ok(lv1Data.targets.iron >= 80, `Lv 1 Demir hedefi >= 80 olmalı, bulunan: ${lv1Data.targets.iron}`);

    const lv2Data = gs.getBotDynamicResourceDeficitTargets(2);
    assert.equal(lv2Data.durationMinutes, 72, 'Lv 2 sefer süresi 72 dakika olmalı');
    assert.ok(lv2Data.targets.wood > lv1Data.targets.wood, 'Lv 2 Odun hedefi Lv 1den büyük olmalı');
    assert.ok(lv2Data.targets.iron > lv1Data.targets.iron, 'Lv 2 Demir hedefi Lv 1den büyük olmalı');
    assert.ok(lv2Data.targets.wood >= 480, `Lv 2 Odun hedefi >= 480 olmalı, bulunan: ${lv2Data.targets.wood}`);
    assert.ok(lv2Data.targets.iron >= 320, `Lv 2 Demir hedefi >= 320 olmalı, bulunan: ${lv2Data.targets.iron}`);

    const lv3Data = gs.getBotDynamicResourceDeficitTargets(3);
    assert.equal(lv3Data.durationMinutes, 126, 'Lv 3 sefer süresi 126 dakika olmalı');
    assert.ok(lv3Data.targets.wood > lv2Data.targets.wood, 'Lv 3 Odun hedefi Lv 2den büyük olmalı');
    assert.ok(lv3Data.targets.iron > lv2Data.targets.iron, 'Lv 3 Demir hedefi Lv 2den büyük olmalı');
    assert.ok(lv3Data.targets.wood >= 850, `Lv 3 Odun hedefi >= 850 olmalı, bulunan: ${lv3Data.targets.wood}`);
    assert.ok(lv3Data.targets.iron >= 560, `Lv 3 Demir hedefi >= 560 olmalı, bulunan: ${lv3Data.targets.iron}`);
  });

  await t.test('2. Depoda Odun:0, Demir:0, Buğday:0 iken autoBuyBotResourceDeficit seviyeye göre tamirat +%50 miktarını satın almalı', () => {
    const gs = new GameStateManager();
    gs.state.level = 2; // Oyuncu Seviye 2
    gs.state.inventory = { wood: 0, iron: 0, wheat: 0, fragments: 0 };
    gs.state.adAstraBalance = 20000;

    const dynamicReq = gs.getBotDynamicResourceDeficitTargets(2);
    const buyRes = gs.autoBuyBotResourceDeficit();

    assert.equal(buyRes.bought, true, 'Oto-tedarik başarıyla gerçekleşmeli');
    assert.ok(buyRes.totalSpentAda > 0, 'ADA harcanmış olmalı');

    // Alınan miktarlar sabit 50 değil, Seviye 2 tamiratının en az %50 fazlası olmalı!
    assert.ok(gs.state.inventory.wood >= dynamicReq.targets.wood, `Odun en az ${dynamicReq.targets.wood} olmalı, ambar: ${gs.state.inventory.wood}`);
    assert.ok(gs.state.inventory.iron >= dynamicReq.targets.iron, `Demir en az ${dynamicReq.targets.iron} olmalı, ambar: ${gs.state.inventory.iron}`);
    assert.ok(gs.state.inventory.wheat >= dynamicReq.targets.wheat, `Buğday en az ${dynamicReq.targets.wheat} olmalı, ambar: ${gs.state.inventory.wheat}`);
  });

  await t.test('3. Silo Seviye Yükseltildiğinde ambarlar sıfırlansa bile bot aktifse Seviye Tamiratı +%50 kadar satın alıp güvenceye almalı', () => {
    const gs = new GameStateManager();
    const now = Date.now();
    gs.state.level = 2; // Oyuncu Seviye 2
    gs.state.tavernaBotActive = true;
    gs.state.tavernaBotExpiresAt = now + 24 * 3600 * 1000;
    gs.state.botActiveUntil = gs.state.tavernaBotExpiresAt;

    // Depoları Seviye 2 için doldur ve siloyu Seviye 3'e yükselt
    gs.state.warehouseLevel = 2;
    const cap = gs.getWarehouseCapacity(2);
    gs.state.inventory = {
      wood: cap.wood,
      iron: cap.iron,
      wheat: cap.wheat,
      fragments: 0
    };
    gs.state.adAstraBalance = 30000;

    const upRes = gs.upgradeWarehouse();
    assert.equal(upRes.success, true, 'Silo yükseltilmiş olmalı');
    assert.equal(gs.state.warehouseLevel, 3, 'Silo Seviye 3 olmalı');

    // Yükseltme sonrası bot aktif olduğu için ambarlar 0 veya 50 değil; Lv 2 tamiratının %50 fazlası kadar olmalı!
    const expectedTargets = gs.getBotDynamicResourceDeficitTargets(2).targets;
    assert.ok((gs.state.inventory.wood || 0) >= expectedTargets.wood, `Yükseltme sonrası Odun >= ${expectedTargets.wood} olmalı, ambar: ${gs.state.inventory.wood}`);
    assert.ok((gs.state.inventory.iron || 0) >= expectedTargets.iron, `Yükseltme sonrası Demir >= ${expectedTargets.iron} olmalı, ambar: ${gs.state.inventory.iron}`);
    assert.ok((gs.state.inventory.wheat || 0) >= expectedTargets.wheat, `Yükseltme sonrası Buğday >= ${expectedTargets.wheat} olmalı, ambar: ${gs.state.inventory.wheat}`);
    assert.equal(gs.isBotPaused(), false, 'Bot asla duraklatılmamış olmalı');
  });

  await t.test('4. Dondurulmuş (Paused) bot, kasada ADA varken updateBotPauseState anında dinamik rezervle uyanmalı', () => {
    const gs = new GameStateManager();
    gs.state.level = 1;
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

    // updateBotPauseState çağrıldığında kasadaki ADA ile dinamik tamirat rezervi alınıp bot uyandırılmalı
    const pauseState = gs.updateBotPauseState();
    assert.equal(pauseState.isPaused, false, 'updateBotPauseState oto-tedarik yaparak botu uyandırmalı');
    assert.equal(gs.isBotPaused(), false, 'Bot artık duraklatılmış olmamalı');

    const report = gs.fastForwardTime(2); // 2 saat ileri sar
    assert.equal(report.botExecutionStatus, 'ran', 'Bot uyanıp seferleri çalıştırmalı');
    assert.ok(report.totalExpeditionsClaimed > 0, 'Seferler toplanmış olmalı');
  });
});
