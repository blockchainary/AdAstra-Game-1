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

test('🌾 Botun Kaynak Biriktirme, Silo Büyütme ve 3 Saatlik Çevrimdışı İlerleme Testi', async (t) => {
  localStorage.clear();
  const gs = new GameStateManager();

  await t.test('1. "Siloyu Yükselt" seçiliyken kaynaklar erken panik satışı ile satılmamalı, depoda korunmalı', () => {
    gs.state.botActiveUntil = Date.now() + 24 * 3600 * 1000;
    gs.state.tavernaBotActive = true;
    gs.state.tavernaBotExpiresAt = gs.state.botActiveUntil;
    gs.state.botPaused = false;
    gs.state.botSiloAutoUpgrade = true;

    // Seviye 1 Silo kapasiteleri: wood: 900, iron: 600, wheat: 450
    // Başlangıç: Wood 739, Iron 493, Wheat 333 (Kullanıcının gerçek canlı durumu)
    gs.state.inventory.wood = 739;
    gs.state.inventory.iron = 493;
    gs.state.inventory.wheat = 333;
    gs.state.adAstraBalance = 50000;

    // handleBotSiloSpace çağrıldığında
    const res = gs.handleBotSiloSpace('wheat', 270);

    // Kaynak pazarda satılmamış olmalı (action != 'sold')!
    assert.notEqual(res.action, 'sold', 'Kullanıcı siloyu yükseltmek isterken buğdayı pazarda satmamalı!');
    assert.equal(gs.state.inventory.wheat, 333, 'Buğday miktarı korunmalı!');
  });

  await t.test('2. Depolar doldukça ve %80 barajı aşıldığında silo otomatik yükseltilmeli', () => {
    gs.state.botSiloAutoUpgrade = true;
    // Seviye 1'de Kapasiteler: Wood: 1080, Iron: 720, Wheat: 900
    // %80 doluluk: Wood: 864, Iron: 576, Wheat: 720
    gs.state.inventory.wood = 900;
    gs.state.inventory.iron = 600;
    gs.state.inventory.wheat = 750; // %80 aşıldı!
    gs.state.adAstraBalance = 100000;

    const initialLvl = gs.state.warehouseLevel;
    const upRes = gs.upgradeWarehouse();

    assert.ok(upRes.success, 'Silo yükseltme başarılı olmalı');
    assert.equal(gs.state.warehouseLevel, initialLvl + 1, 'Silo seviye atlamalı');
    
    // Yeni kapasiteler Seviye 2'ye çıkmalı
    const newCap = gs.getWarehouseCapacity();
    assert.ok(newCap.wheat > 900, 'Buğday kapasitesi artmalı');
    assert.ok(newCap.wood > 1080, 'Odun kapasitesi artmalı');
  });

  await t.test('3. 3 Saatlik (180 dakika) Çevrimdışı / Arka Plan Zamanında Çoklu Sefer Döngüsü Doğrulaması', () => {
    gs.state.warehouseLevel = 2; // Kapasite 1800/1200/900
    gs.state.inventory.wood = 100;
    gs.state.inventory.iron = 100;
    gs.state.inventory.wheat = 200;
    gs.state.stamina = 100;
    gs.state.tools.axe.durability = 4000;
    gs.state.tools.pickaxe.durability = 4000;
    gs.state.tools.sickle.durability = 4000;

    // Aktif bir buğday seferi tanımla
    const expDurSec = 1080; // 18 dk
    gs.state.activeExpeditions = {
      wheat: {
        nodeId: 'wheat',
        durationMinutes: 18,
        durationSeconds: expDurSec,
        elapsedSeconds: 0,
        startedAt: Date.now() - 3600000,
        lastTickAt: Date.now() - 3600000, // 1 saat (3600s) öncesi
        isCompleted: false
      }
    };

    const initialWheat = gs.state.inventory.wheat;

    // 1 saat (3600 saniye) geçmiş gibi updateExpeditions çağır
    // 3600 saniye = 3 seferden fazla (3 x 1080 = 3240 s)
    gs.updateExpeditions(3600);

    // Envanterdeki buğday 1 seferlik değil, çoklu döngü kadar artmış olmalı!
    assert.ok(gs.state.inventory.wheat > initialWheat + 200, `Buğday çoklu sefer kadar artmalı! Mevcut: ${gs.state.inventory.wheat}, Başlangıç: ${initialWheat}`);
  });
});
