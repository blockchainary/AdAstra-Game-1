import { GAME_CONFIG } from '../js/config.js';
globalThis.GAME_CONFIG = GAME_CONFIG;

import { ammMarket } from '../js/ammMarket.js';
globalThis.ammMarket = ammMarket;

import { globalPool } from '../js/globalPool.js';
globalThis.globalPool = globalPool;

globalThis.window = { dispatchEvent: () => {}, addEventListener: () => {} };
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
  playBreakWarning: () => {},
  playRepair: () => {}
};

import { GameStateManager } from '../js/gameState.js';

const gs = new GameStateManager();
// Kullanıcının gerçek state'ini verelim
gs.state.level = 1;
gs.state.warehouseLevel = 3;
gs.state.stamina = 1.02;
gs.state.adAstraBalance = 56605;
gs.state.inventory = { wood: 696, iron: 466, wheat: 571, fragments: 0 };
gs.state.tools = {
  axe: { durability: 4122, totalGathered: 3564 },
  pickaxe: { durability: 4122, totalGathered: 2376 },
  sickle: { durability: 4158, totalGathered: 4860 }
};
gs.state.botActiveUntil = Date.now() + 86400000;
gs.state.tavernaBotActive = true;
gs.state.tavernaBotExpiresAt = gs.state.botActiveUntil;
gs.state.botPaused = false;
gs.state.botSiloAutoUpgrade = true;

const cap = gs.getWarehouseCapacity();
console.log('--- BAŞLANGIÇ DURUMU ---');
console.log('Silo Seviyesi:', gs.state.warehouseLevel);
console.log('Kapasiteler:', cap);
console.log('Envanter:', gs.state.inventory);
console.log('Stamina:', gs.state.stamina);
console.log('Aletler:', gs.state.tools);

// 3 sefer başlatalım
const now = Date.now();
gs.state.activeExpeditions = {
  wood: { nodeId: 'wood', durationMinutes: 18, durationSeconds: 1080, elapsedSeconds: 0, startedAt: now, lastTickAt: now, isCompleted: false },
  iron: { nodeId: 'iron', durationMinutes: 18, durationSeconds: 1080, elapsedSeconds: 0, startedAt: now, lastTickAt: now, isCompleted: false },
  wheat: { nodeId: 'wheat', durationMinutes: 18, durationSeconds: 1080, elapsedSeconds: 0, startedAt: now, lastTickAt: now, isCompleted: false }
};

console.log('\n--- 1. SEFER DÖNGÜSÜ (18 DAKİKA / 1080s) ÇALIŞTIRILIYOR ---');
gs.updateExpeditions(1080);

console.log('1. Sefer Sonrası Envanter:', gs.state.inventory);
console.log('1. Sefer Sonrası Silo Seviyesi:', gs.state.warehouseLevel);
console.log('1. Sefer Sonrası Stamina:', gs.state.stamina);
console.log('1. Sefer Sonrası Aktif Seferler:', Object.keys(gs.state.activeExpeditions));
console.log('1. Sefer Sonrası Bot Hareketleri:', gs.state.lastBotActions);
console.log('1. Sefer Sonrası Silo Hareketi:', gs.state.lastBotSiloAction);
console.log('Bot Paused mı?:', gs.state.botPaused);

console.log('\n--- ARKA ARKAYA 10 SEFER DÖNGÜSÜ ÇALIŞTIRILIYOR ---');
for (let i = 2; i <= 10; i++) {
  gs.updateExpeditions(1080);
}

console.log('\n--- 10 SEFER SONRASI DURUM ---');
console.log('Envanter:', gs.state.inventory);
console.log('Silo Seviyesi:', gs.state.warehouseLevel);
console.log('Stamina:', gs.state.stamina);
console.log('Aktif Seferler:', Object.keys(gs.state.activeExpeditions));
console.log('Son Bot Hareketleri:', gs.state.lastBotActions);
console.log('Son Silo Hareketi:', gs.state.lastBotSiloAction);
