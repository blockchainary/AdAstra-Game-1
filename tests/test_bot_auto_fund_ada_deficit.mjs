import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { GameStateManager } from '../js/gameState.js';
import { ammMarket } from '../js/ammMarket.js';
import { GAME_CONFIG } from '../js/config.js';

// Mock localStorage for node environment
const localStorageMock = (function() {
  let store = {};
  return {
    getItem: function(key) { return store[key] || null; },
    setItem: function(key, value) { store[key] = value.toString(); },
    clear: function() { store = {}; },
    removeItem: function(key) { delete store[key]; }
  };
})();
global.localStorage = localStorageMock;

describe('🤖 Bot Çalışırken ADA Yetersizliğinde Depodan Eşit Miktarda Satış ve Oto-Finansman Testi', () => {
  let gameState;

  beforeEach(() => {
    localStorage.clear();
    gameState = new GameStateManager();
  });

  it('1. Bot çalışırken ADA 50 altına düşerse depodan tüm malzemelerden EŞİT MİKTARDA satıp 50 ADA temin etmeli', () => {
    // Depoda bol hammadde var, ama ADA 5'e düşmüş
    gameState.state.inventory = { wood: 500, iron: 500, wheat: 500 };
    gameState.state.adAstraBalance = 5;

    const res = gameState.autoFundBotAdaDeficit(50);
    assert.strictEqual(res.funded, true, 'Oto finansman başarılı olmalı');
    assert.ok(res.totalEarned > 0, 'ADA kazanılmış olmalı');
    assert.ok(gameState.state.adAstraBalance >= 50, 'Yeni ADA bakiyesi en az 50 olmalı');

    // Eşit miktarda satıldığı kontrolü:
    assert.strictEqual(res.toSell.wood, res.toSell.iron, 'Odun ve Demir eşit satılmalı');
    assert.strictEqual(res.toSell.iron, res.toSell.wheat, 'Demir ve Buğday eşit satılmalı');
    assert.ok(res.toSell.wood > 0, 'En az 1 adet satılmış olmalı');
  });

  it('2. updateBotPauseState: ADA < 50 olduğunda bot durmak yerine eşit satış yapıp kesintisiz çalışmaya devam etmeli', () => {
    // Bot süresi var
    gameState.state.inventory = { wood: 300, iron: 300, wheat: 300 };
    gameState.state.adAstraBalance = 15; // 50'nin altında!
    gameState.state.botActiveUntil = Date.now() + (12 * 3600 * 1000);
    gameState.state.tavernaBotExpiresAt = gameState.state.botActiveUntil;

    // Bot pause durumunu güncelle
    const pauseStatus = gameState.updateBotPauseState();

    // Bot duraklatılmamalı! Çünkü oto-finansman devreye girip ADA'yı 50'ye tamamladı
    assert.strictEqual(pauseStatus.isPaused, false, 'Bot duraklatılmamalı, kesintisiz çalışmalı');
    assert.strictEqual(gameState.isBotPaused(), false, 'isBotPaused false olmalı');
    assert.ok(gameState.state.adAstraBalance >= 50, 'Bakiyesi 50 ADA üzerine çıkarılmış olmalı');
  });

  it('3. Halihazırda duraklatılmış bot, updateBotPauseState anında depodan eşit satışla anında UYANMALI (Resume)', () => {
    // Kullanıcının ekranındaki durum: Bot 50 ADA yok diye duraklatılmıştı
    gameState.state.inventory = { wood: 250, iron: 250, wheat: 250 };
    gameState.state.adAstraBalance = 8;
    gameState.state.botPaused = true;
    gameState.state.botPausedRemainingMs = 18 * 3600 * 1000;

    const pauseStatus = gameState.updateBotPauseState();

    assert.strictEqual(pauseStatus.isPaused, false, 'Duraklatılmış bot anında uyanmalı');
    assert.strictEqual(gameState.isBotPaused(), false, 'isBotPaused false olmalı');
    assert.ok(gameState.state.adAstraBalance >= 50, 'ADA bakiyesi 50 üzerine çıkmalı');
  });
});
