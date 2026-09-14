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

const now = Date.now();
// 3 saat öncesinde başlamış seferler
const threeHoursAgo = now - 10800000;
gs.state.activeExpeditions = {
  wood: { nodeId: 'wood', durationMinutes: 18, durationSeconds: 1080, elapsedSeconds: 100, startedAt: threeHoursAgo, lastTickAt: threeHoursAgo, isCompleted: false },
  iron: { nodeId: 'iron', durationMinutes: 18, durationSeconds: 1080, elapsedSeconds: 100, startedAt: threeHoursAgo, lastTickAt: threeHoursAgo, isCompleted: false },
  wheat: { nodeId: 'wheat', durationMinutes: 18, durationSeconds: 1080, elapsedSeconds: 100, startedAt: threeHoursAgo, lastTickAt: threeHoursAgo, isCompleted: false }
};

console.log('Başlangıç Envanter:', gs.state.inventory);

// 3 saatlik tek bir devasa frame geldi (sekme ön plana geldi)
gs.updateExpeditions(10800);

console.log('3 Saat Sonrası Envanter:', gs.state.inventory);
console.log('3 Saat Sonrası Silo:', gs.state.warehouseLevel);
console.log('Aktif Seferler:', gs.state.activeExpeditions);
console.log('Son Bot Hareketleri:', gs.state.lastBotActions);
