import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GameStateManager } from '../js/gameState.js';
import { GAME_CONFIG } from '../js/config.js';

describe('Silo Kısmi Doldurma ve Kalan Mahsulü Seferde Bekletme Mekanizması Testi', () => {
  // Mock localStorage
  globalThis.localStorage = {
    store: {},
    getItem(k) { return this.store[k] || null; },
    setItem(k, v) { this.store[k] = String(v); },
    removeItem(k) { delete this.store[k]; },
    clear() { this.store = {}; }
  };

  const gs = new GameStateManager();

  it('Kullanıcı Senaryosu: Silo Kapasitesi 1800, Depoda 1307 Buğday varken 540 Mahsulün 493\'ü toplanıp ambar tam doldurulmalı', () => {
    // 1. Durum Ayarı: Silo kapasitesi 1800, depoda 1307 buğday
    gs.state.warehouseLevel = 1; // 1800 kapasite
    gs.state.inventory.wheat = 1307;

    const cap = gs.getWarehouseCapacity();
    assert.strictEqual(cap.wheat, 1800, 'Seviye 1 ambar kapasitesi 1800 olmalı');

    // 2. Sefer Ayarı: 18 dakikalık buğday seferi tamamlandı (18 dk * 30 = 540 buğday)
    gs.state.activeExpeditions.wheat = {
      nodeId: 'wheat',
      durationMinutes: 18,
      durationHours: 0.3,
      durationSeconds: 1080,
      elapsedSeconds: 1080,
      isCompleted: true
    };

    const accrued = gs.getAccruedExpeditionHarvest('wheat');
    assert.strictEqual(accrued.accruedAmount, 540, 'Sefer mahsulü 540 buğday olmalı');

    // 3. Sefer Toplama (Claim) Çağrısı
    const res = gs.claimExpedition('wheat');

    assert.strictEqual(res.success, true, 'Kısmi ambar doldurma başarılı olmalı');
    assert.strictEqual(res.isPartialSiloFill, true, 'Kısmi ambar dolum bayrağı true olmalı');
    assert.strictEqual(res.harvestedAmount, 493, 'Depodaki boş yer kadar (1800 - 1307 = 493) toplanmalı');
    assert.strictEqual(res.stillRemaining, 47, 'Seferde kalan miktar (540 - 493 = 47) olmalı');
    assert.strictEqual(gs.state.inventory.wheat, 1800, 'Depodaki buğday tam 1800/1800 (%100) olmalı');

    // Sefer silinmemeli, kalan 47 buğdayı tutmaya devam etmeli!
    assert.ok(gs.state.activeExpeditions.wheat, 'Sefer aktif kalmaya devam etmeli');
    assert.strictEqual(gs.state.activeExpeditions.wheat.claimedAmount, 493, 'Seferden 493 buğday çekildiği kaydedilmeli');
  });

  it('Depo tamamen doluyken (1800/1800) tekrar toplanmak istendiğinde net uyarı verilmeli', () => {
    assert.strictEqual(gs.state.inventory.wheat, 1800, 'Depo şu an 1800/1800 dolu');

    const res = gs.claimExpedition('wheat');
    assert.strictEqual(res.success, false, 'Depo doluyken ek kaynak alınamamalı');
    assert.strictEqual(res.isWarehouseFull, true, 'isWarehouseFull true olmalı');
    assert.ok(res.message.includes('tamamen dolu'), 'Silo tamamen dolu mesajı içermeli');
  });

  it('Depoda yer açıldığında (veya silo yükseltildiğinde) kalan 47 buğday toplanmalı ve sefer tamamlanmalı', () => {
    // Oyuncu 100 buğday harcasın: Depoda 1700 buğday kalsın (100 boşluk)
    gs.state.inventory.wheat = 1700;

    const accrued = gs.getAccruedExpeditionHarvest('wheat');
    assert.strictEqual(accrued.accruedAmount, 47, 'Kalan mahsul 47 buğday olarak hesaplanmalı');

    const res = gs.claimExpedition('wheat');

    assert.strictEqual(res.success, true, 'Kalan mahsul toplama başarılı olmalı');
    assert.strictEqual(res.isPartialSiloFill, false, 'Sefer tamamen bittiği için isPartialSiloFill false olmalı');
    assert.strictEqual(res.harvestedAmount, 47, 'Kalan 47 buğdayın hepsi toplanmalı');
    assert.strictEqual(res.stillRemaining, 0, 'Kalan miktar 0 olmalı');
    assert.strictEqual(gs.state.inventory.wheat, 1747, 'Depo 1700 + 47 = 1747 olmalı');

    // Sefer artık tamamen tamamlandı ve silindi!
    assert.strictEqual(gs.state.activeExpeditions.wheat, undefined, 'Sefer silinmiş olmalı ve yeni sefere hazır olmalı');
  });
});
