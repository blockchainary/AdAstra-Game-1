import assert from 'node:assert/strict';
import { GameStateManager } from './js/gameState.js';
import { GAME_CONFIG } from './js/config.js';

console.log('--- 🧪 SWEEP HARVEST & COMBAT ENHANCEMENT TESTİ ---');

// Mock localStorage
globalThis.localStorage = {
  store: {},
  getItem(k) { return this.store[k] || null; },
  setItem(k, v) { this.store[k] = String(v); },
  removeItem(k) { delete this.store[k]; },
  clear() { this.store = {}; }
};

const gs = new GameStateManager();
gs.state.adAstraBalance = 100000;
gs.state.inventory = { iron: 100, wood: 100, wheat: 100, fragments: 50 };

// 1. claimAllHarvests() boş durum kontrolü
const emptySweep = gs.claimAllHarvests();
assert.equal(emptySweep.success, false, 'Sefer yokken sweep harvest güvenli bir şekilde false dönmeli');

// 2. Sefer başlat ve sweep harvest ile topla
gs.startExpedition('wheat');
gs.startExpedition('wood');

// Süreyi tamamla
gs.state.activeExpeditions['wheat'].isCompleted = true;
gs.state.activeExpeditions['wood'].isCompleted = true;

const sweepRes = gs.claimAllHarvests();
assert.equal(sweepRes.success, true, 'Tamamlanan tüm seferler tek tıkla toplanabilmeli');
assert(sweepRes.totalHarvested > 0, 'Toplanan hammadde miktarı 0\'dan büyük olmalı');
assert(sweepRes.totalXp > 0, 'Toplanan XP miktarı 0\'dan büyük olmalı');

console.log('✅ Sweep Harvest (Tüm Mahsulü Topla) testi başarıyla geçti!');
