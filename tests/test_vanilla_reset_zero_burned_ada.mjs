import assert from 'node:assert/strict';
import { GameStateManager } from '../js/gameState.js';
import { globalPool } from '../js/globalPool.js';
import { treasury } from '../js/treasury.js';

console.log('--- 🧪 VANILLA RESET: TOPLAM YAKILAN ADA SIFIRLAMA TESTİ ---');

// Mock localStorage
globalThis.localStorage = {
  store: {},
  getItem(k) { return this.store[k] || null; },
  setItem(k, v) { this.store[k] = String(v); },
  removeItem(k) { delete this.store[k]; },
  clear() { this.store = {}; }
};

const gs = new GameStateManager();

// 1. Önce oyunda yakım ve harcama oluşturalım
globalPool.recordTokenSpend(10000);
treasury.deposit(5000);

const ecoBefore = gs.getEconomyAndPoolsSummary();
console.log('Sıfırlama Öncesi İstatistikler:');
console.log(`- Toplam Yakılan $ADASTRA: ${ecoBefore.lifetimeBurnedAda} ADA`);
console.log(`- Toplam Giren (Inflow): ${ecoBefore.totalDeposited} ADA`);
assert.ok(ecoBefore.lifetimeBurnedAda > 0, 'Sıfırlama öncesi yakılan ADA 0 dan büyük olmalı');

// 2. Şimdi vanillaReset() çalıştıralım
console.log('\n[2] vanillaReset() çağrılıyor...');
gs.vanillaReset();

const ecoAfter = gs.getEconomyAndPoolsSummary();
console.log('Vanilla Reset Sonrası İstatistikler:');
console.log(`- Toplam Yakılan $ADASTRA: ${ecoAfter.lifetimeBurnedAda} ADA`);
console.log(`- Toplam Giren (Inflow): ${ecoAfter.totalDeposited} ADA`);
console.log(`- Dağıtılan Ödüller (Outflow): ${ecoAfter.totalWithdrawn} ADA`);
console.log(`- GlobalPool Total Burned: ${globalPool.state.totalBurned} ADA`);
console.log(`- Treasury Lifetime Burned: ${treasury.state.lifetimeBurned} ADA`);

assert.equal(ecoAfter.lifetimeBurnedAda, 0, 'Vanilla reset sonrası Toplam Yakılan $ADASTRA tam 0 olmalıdır!');
assert.equal(globalPool.state.totalBurned, 0, 'globalPool.state.totalBurned tam 0 olmalıdır!');
assert.equal(treasury.state.lifetimeBurned, 0, 'treasury.state.lifetimeBurned tam 0 olmalıdır!');
assert.equal(ecoAfter.totalDeposited, 0, 'Toplam giren bakiye tam 0 olmalıdır!');
assert.equal(ecoAfter.totalWithdrawn, 0, 'Dağıtılan ödüller tam 0 olmalıdır!');

console.log('✅ Vanilla reset sonrası Toplam Yakılan $ADASTRA 0 ADA olarak başarıyla doğrulandı!');
