import assert from 'node:assert/strict';
import { globalPool } from '../js/globalPool.js';
import { GameStateManager } from '../js/gameState.js';
import { GAME_CONFIG } from '../js/config.js';

console.log('--- 🧪 HAFTALIK RESET (PAZAR/PAZARTESİ 00:01 TSİ) & VANILLA SIFIRLAMA TESTİ ---');

// Mock localStorage
globalThis.localStorage = {
  store: {},
  getItem(k) { return this.store[k] || null; },
  setItem(k, v) { this.store[k] = String(v); },
  removeItem(k) { delete this.store[k]; },
  clear() { this.store = {}; }
};

// 1. Reset Zamanı Hesaplama Doğrulaması (Pazar'ı Pazartesiye bağlayan gece 00:01 TSİ = Pazar 21:01 UTC)
// Senaryo A: Pazar günü saat 15:00 TSİ (12:00 UTC)
// 2026-09-13 bir Pazar günüdür.
const sundayAfternoonUtc = new Date('2026-09-13T12:00:00Z').getTime(); // TSİ 15:00
const resetFromSunday = globalPool.getNextWeeklyResetTRT(sundayAfternoonUtc);
const resetDateFromSunday = new Date(resetFromSunday);

// Hedef: 2026-09-13 Pazar 21:01:00 UTC (yani 2026-09-14 Pazartesi 00:01:00 TRT)
assert.equal(resetDateFromSunday.toISOString(), '2026-09-13T21:01:00.000Z', 'Pazar günü verilen tarihte bir sonraki reset aynı gecenin 21:01 UTC (00:01 TSİ) olmalı');
console.log('✅ Senaryo A (Pazar öğleden sonra): Reset zamanı tam Pazar gecesi 00:01 TSİ olarak hesaplandı!');

// Senaryo B: Pazartesi gecesi 00:00:30 TSİ (2026-09-13T21:00:30Z UTC)
const sundayMidnightUtc = new Date('2026-09-13T21:00:30Z').getTime();
const resetFromMidnight = globalPool.getNextWeeklyResetTRT(sundayMidnightUtc);
const resetDateFromMidnight = new Date(resetFromMidnight);
assert.equal(resetDateFromMidnight.toISOString(), '2026-09-13T21:01:00.000Z', '00:01 TSİ öncesinde hedef aynı gecenin 00:01 TSİ olmalı');
console.log('✅ Senaryo B (Pazartesi 00:00:30 TSİ): Hedef tam 30 saniye sonraki 00:01 TSİ!');

// Senaryo C: Pazartesi günü 00:02 TSİ (2026-09-13T21:02:00Z UTC) - 00:01 geçildi!
const mondayAfterResetUtc = new Date('2026-09-13T21:02:00Z').getTime();
const resetFromMonday = globalPool.getNextWeeklyResetTRT(mondayAfterResetUtc);
const resetDateFromMonday = new Date(resetFromMonday);
// Hedef: 7 gün sonraki Pazar 21:01 UTC (2026-09-20T21:01:00.000Z)
assert.equal(resetDateFromMonday.toISOString(), '2026-09-20T21:01:00.000Z', '00:01 geçildikten sonra sonraki haftanın Pazar gecesi 00:01 TSİ olmalı');
console.log('✅ Senaryo C (Pazartesi 00:02 TSİ): Hedef sonraki haftanın Pazartesi 00:01 TSİ gününe başarıyla devretti!');

// 2. Vanilla Reset ile Haftalık Kaynak Çıkartma Limitlerinin Sıfırlanması
const gs = new GameStateManager();

// Önce kaynak çıkartarak limitleri harcayalım
globalPool.harvest('wood', 80000);
globalPool.harvest('wheat', 200000);
globalPool.harvest('iron', 50000);

const woodBefore = globalPool.state.resources.wood.remaining;
const wheatBefore = globalPool.state.resources.wheat.remaining;
const ironBefore = globalPool.state.resources.iron.remaining;

console.log(`Hasat sonrası kalanlar: Odun: ${woodBefore}, Buğday: ${wheatBefore}, Demir: ${ironBefore}`);
assert(woodBefore < GAME_CONFIG.GLOBAL_RESOURCE_CAPS.wood.totalCap, 'Odun limiti eksilmiş olmalı');
assert(wheatBefore < GAME_CONFIG.GLOBAL_RESOURCE_CAPS.wheat.totalCap, 'Buğday limiti eksilmiş olmalı');
assert(ironBefore < GAME_CONFIG.GLOBAL_RESOURCE_CAPS.iron.totalCap, 'Demir limiti eksilmiş olmalı');

// Şimdi vanillaReset() çağıralım
gs.vanillaReset();

const woodAfter = globalPool.state.resources.wood.remaining;
const wheatAfter = globalPool.state.resources.wheat.remaining;
const ironAfter = globalPool.state.resources.iron.remaining;

console.log(`Vanilla reset sonrası limitler: Odun: ${woodAfter}, Buğday: ${wheatAfter}, Demir: ${ironAfter}`);
assert.equal(woodAfter, GAME_CONFIG.GLOBAL_RESOURCE_CAPS.wood.totalCap, 'Odun limiti %100 kapasiteye (180.000) sıfırlanmalı');
assert.equal(wheatAfter, GAME_CONFIG.GLOBAL_RESOURCE_CAPS.wheat.totalCap, 'Buğday limiti %100 kapasiteye (490.000) sıfırlanmalı');
assert.equal(ironAfter, GAME_CONFIG.GLOBAL_RESOURCE_CAPS.iron.totalCap, 'Demir limiti %100 kapasiteye (130.000) sıfırlanmalı');

console.log('🎉 TÜM HAFTALIK RESET VE VANILLA SIFIRLAMA TESTLERİ BAŞARIYLA GEÇTİ!');
