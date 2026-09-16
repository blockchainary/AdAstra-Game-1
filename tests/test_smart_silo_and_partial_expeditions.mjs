// tests/test_smart_silo_and_partial_expeditions.mjs
import assert from 'node:assert/strict';
import { GameStateManager } from '../js/gameState.js';
import { GAME_CONFIG } from '../js/config.js';

console.log('--- 🧪 KAPSAMLI AKILLI SİLO, ADA FİNANSMANI & KISMİ SEFER BEKLETME TESTİ BAŞLATILIYOR ---');

// Mock AMM Market
const mockAmmMarket = {
  getPrice(nodeId) {
    if (nodeId === 'wood') return 2.5;
    if (nodeId === 'iron') return 4.0;
    if (nodeId === 'wheat') return 1.0;
    return 1.0;
  },
  executeSell(nodeId, amount) {
    const p = this.getPrice(nodeId);
    const gross = amount * p;
    const fee = gross * 0.02;
    const net = gross - fee;
    return { success: true, adAstraReceived: net, amountSold: amount };
  },
  getEstimatedAdAstraForSell(nodeId, amount) {
    const p = this.getPrice(nodeId);
    return amount * p * 0.98;
  },
  calculateResourcesAdAstraValue(resources) {
    let totalAda = 0;
    const breakdown = {};
    for (const [k, v] of Object.entries(resources)) {
      const p = this.getPrice(k);
      const val = v * p * 0.98;
      breakdown[k] = val;
      totalAda += val;
    }
    return { totalAda: Math.round(totalAda), breakdown };
  }
};
globalThis.ammMarket = mockAmmMarket;

// Mock Sound & GlobalPool
globalThis.sound = { playHarvest() {}, playBreakWarning() {}, playLevelUp() {}, playError() {} };
globalThis.globalPool = {
  harvest(nodeId, amount) { return amount; },
  recordTokenSpend(amount) {}
};

// Mock localStorage
globalThis.localStorage = {
  store: {},
  getItem(k) { return this.store[k] || null; },
  setItem(k, v) { this.store[k] = String(v); },
  removeItem(k) { delete this.store[k]; },
  clear() { this.store = {}; }
};

const gs = new GameStateManager();

// [TEST 1] Kısmi Toplama & Seferde Bekletme Mekaniği (Manuel / Temel Akış)
console.log('\n[1/5] Kısmi Toplama & Seferde Bekletme Test Ediliyor...');
gs.state.warehouseLevel = 1;
const cap1 = gs.getWarehouseCapacity(1); // wood: 1080
gs.state.inventory.wood = 880; // Siloda 200 boş yer var

// 500 Odunluk tamamlanmış sefer oluştur
gs.state.activeExpeditions = {
  wood: {
    nodeId: 'wood',
    durationMinutes: 18,
    durationSeconds: 1080,
    elapsedSeconds: 1080,
    isCompleted: true,
    claimedAmount: 0
  }
};

// Seferin verimini hesapla: 18 * 18 = 324 odun
const claim1 = gs.claimExpedition('wood');
assert.equal(claim1.success, true, 'Kısmi toplama başarılı olmalı');
assert.equal(claim1.isPartialSiloFill, true, 'Kısmi silo doldurma bayrağı aktif olmalı');
assert.equal(claim1.harvestedAmount, 200, 'Silodaki 200 boş yer kadar toplanmalı');
assert.equal(gs.state.inventory.wood, 1080, 'Silo tam 1080/1080 dolmalı');
assert(gs.state.activeExpeditions.wood != null, 'Seferde hala mahsul beklediği için sefer silinmemeli');
assert.equal(claim1.stillRemaining, 124, 'Kalan 124 odun seferde beklemeli');
console.log(`✅ [1/5] Başarılı: 324 Odunun 200'ü depoya alındı, kalan ${claim1.stillRemaining} Odun seferde bekletiliyor.`);

// [TEST 2] Kalan Mahsulün Yer Açılınca Toplanması ve Seferin Temizlenmesi
console.log('\n[2/5] Kalan Mahsulün Toplanması ve Seferin Kapanması Test Ediliyor...');
// Depoda 150 yer açalım (odun harcandı diyelim)
gs.state.inventory.wood = 930; // 1080 - 930 = 150 boş yer var
const claim2 = gs.claimExpedition('wood');
assert.equal(claim2.success, true, 'İkinci claim başarılı olmalı');
assert.equal(claim2.isPartialSiloFill, false, 'Kalan 124 odun tamamen toplandığı için sefer tamamlanmalı');
assert.equal(claim2.harvestedAmount, 124, 'Kalan 124 odunun tamamı depoya girmeli');
assert.equal(gs.state.inventory.wood, 1054, 'Depo 930 + 124 = 1054 olmalı');
assert.equal(gs.state.activeExpeditions.wood, undefined, 'Sefer tamamen bittiği için silinmeli');
console.log('✅ [2/5] Başarılı: Kalan 124 Odun yer açılınca toplandı ve sefer başarıyla temizlendi.');

// [TEST 3] Bot: Siloyu Yükselt Modu - Yer Yetersizliğinde Tam Sefer Kadar Yer Açma
console.log('\n[3/5] Bot: Siloyu Yükselt Modunda Yetersiz Yerde Tam Sefer Kadar Yer Açma Test Ediliyor...');
gs.state.warehouseLevel = 1;
gs.setBotSiloOption(true); // Siloyu Yükselt modu
gs.buyTavernaAutomationBot(true); // Bot aktif

// Siloda 200 boş yer olsun (limit: 1080, mevcut: 880)
gs.state.inventory.wood = 880;
// Seferden 300 odun gelmesi gereksin
const botSpace1 = gs.handleBotSiloSpace('wood', 300);
assert.equal(botSpace1.handled, true);
assert.equal(botSpace1.action, 'sold');
// Siloda 200 yer vardı, 300 yer açmak için 100 satılmalı!
assert.equal(botSpace1.amountSold, 100, 'Tam 300 yer açılması için 100 odun satılmalı');
assert.equal(gs.state.inventory.wood, 780, 'Depoda 880 - 100 = 780 odun kalmalı');
const newRoom = cap1.wood - gs.state.inventory.wood;
assert.equal(newRoom, 300, 'Siloda artık tam 300 odunluk boş yer olmalı!');
console.log('✅ [3/5] Başarılı: 300 Odunluk hasat için tam 100 Odun satıldı ve ambarda tam 300 boş yer açıldı.');

// [TEST 4] Bot: Siloyu Yükselt Modu - ADA Eksikliğinde %80 Üzerini Satıp ADA Biriktirme
console.log('\n[4/5] Bot: %80 Dolulukta ADA Eksikliği İçin Fazlalığı Satma Test Ediliyor...');
gs.state.warehouseLevel = 1;
gs.setBotSiloOption(true);

// Depoları %80 barajına ve üzerine çıkaralım
// reqWoodFill: 864, reqIronFill: 576, reqWheatFill: 720
gs.state.inventory.wood = 1000; // 864 barajının 136 üzerinde!
gs.state.inventory.iron = 600;  // 576 barajının üzerinde
gs.state.inventory.wheat = 800; // 720 barajının üzerinde
gs.state.adAstraBalance = 0;    // 0 ADA var, yükseltme için ADA eksik!

const upCost = gs.getWarehouseUpgradeCost();
assert.equal(upCost.is80PercentFull, true, 'Depolar %80 dolu olmalı');
assert.equal(upCost.canAffordCost, false, 'ADA yetersiz olmalı');

// Bot devreye girdiğinde ADA açığını kapatmak için %80 üzerindeki fazlalığı satmalı!
const adaFundingRes = gs.handleBotSiloSpace('wood', 10);
assert.equal(adaFundingRes.handled, true);
assert(adaFundingRes.action === 'sold_for_ada' || adaFundingRes.action === 'upgraded');
assert(gs.state.adAstraBalance > 0, 'Satıştan ADA kazanılmış olmalı');
assert(gs.state.inventory.wood >= upCost.reqWoodFill, '%80 barajı (864) ASLA delinmemeli');
console.log(`✅ [4/5] Başarılı: ADA eksikliği için %80 barajı korunarak fazlalık satıldı (+${gs.state.adAstraBalance.toFixed(1)} ADA). Depo: ${gs.state.inventory.wood} (Baraj: ${upCost.reqWoodFill})`);

// [TEST 5] Bot: Kaynakları Sat Modu (botSiloAutoUpgrade = false) - Silonun %50'sini Koruyup Fazlasını Satma
console.log('\n[5/5] Bot: Kaynakları Sat Modunda %50 Rezerve Koruma Test Ediliyor...');
gs.state.warehouseLevel = 1;
gs.setBotSiloOption(false); // Kaynakları Sat modu

// limit: 1080. Silonun yarısı (%50): 540
gs.state.inventory.wood = 700; // 540'ın üzerinde
const sellModeRes = gs.handleBotSiloSpace('wood', 50);
assert.equal(sellModeRes.handled, true);
assert.equal(sellModeRes.action, 'sold');
// 700 - 540 = 160 fazlalık satılmalı
assert.equal(sellModeRes.amountSold, 160, 'Silonun yarısının (%50 = 540) üzerindeki 160 odun satılmalı');
assert.equal(gs.state.inventory.wood, 540, 'Depoda tam silonun yarısı (540) kalmalı');
console.log('✅ [5/5] Başarılı: Kaynakları Sat modunda silonun yarısı (540 Odun) rezerve korundu, fazlalık satıldı.');

console.log('\n🎉 TÜM AKILLI SİLO, ADA FİNANSMANI VE KISMİ SEFER BEKLETME TESTLERİ %100 BAŞARIYLA GEÇTİ! 🎉');
