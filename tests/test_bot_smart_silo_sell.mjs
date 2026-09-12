import assert from 'node:assert/strict';
import { GameStateManager } from '../js/gameState.js';
import { ammMarket } from '../js/ammMarket.js';

console.log('--- 🤖 24s OTOMASYON BOTU: AKILLI SİLO ALANI (%5 MARJLI MİNİMAL SATIŞ) TESTİ ---');

// Mock localStorage
globalThis.localStorage = {
  store: {},
  getItem(k) { return this.store[k] || null; },
  setItem(k, v) { this.store[k] = String(v); },
  removeItem(k) { delete this.store[k]; },
  clear() { this.store = {}; }
};

const gs = new GameStateManager();
const cap = gs.getWarehouseCapacity();
const woodLimit = cap.wood;

console.log(`Mevcut Seviye 1 Silo Odun Kapasitesi: ${woodLimit}`);

// 1. Silo Yeterli Olduğunda Satış Yapılmaması Kontrolü
gs.state.inventory.wood = 200;
const harvestYield1 = 300; // Toplam 500 <= woodLimit (1080)
const res1 = gs.handleBotSiloSpace('wood', harvestYield1);
assert.equal(res1.handled, true, 'Silo yeterli olunca handled: true olmalı');
assert.equal(res1.neededSell, 0, 'Silo yeterli olunca satış yapılmamalı');
assert.equal(gs.state.inventory.wood, 200, 'Envanter değişmemeli');
console.log('✅ 1. Test Başarılı: Silo kapasitesi yeterliyken gereksiz satış yapılmadı.');

// 2. Akıllı Satış (botSiloAutoUpgrade = false) & %5 Güvenlik Marjı Kontrolü
gs.setBotSiloOption(false);
assert.equal(gs.state.botSiloAutoUpgrade, false, 'Bot silo seçeneği Akıllı Satış olmalı');

// Siloyu limite çok yaklaştırıyoruz: 1000 / 1080 (Boş yer: 80)
gs.state.inventory.wood = 1000;
const harvestYield2 = 200; // Gelecek hasat: 200
// Gereken net boş alan: 200. Mevcut boş alan: 80. Açık: 120.
// %5 Güvenlik Marjı ile gereken alan: Math.ceil(200 * 1.05) = 210.
// Satılması gereken miktar: 210 - 80 = 130 (Açık olan 120'den %5 daha fazla!)

const initWood = gs.state.inventory.wood;
const initAda = gs.state.adAstraBalance || 0;

const res2 = gs.handleBotSiloSpace('wood', harvestYield2);
assert.equal(res2.handled, true, 'Satış işlemi başarılı olmalı');
assert.equal(res2.action, 'sold', 'Aksiyon sold olmalı');
assert.equal(res2.marginPercent, 5, 'Güvenlik marjı %5 olmalı');
assert.equal(res2.amountSold, 130, `Satılan miktar tam 130 olmalı (Açık + %5 marj), gerçekleşen: ${res2.amountSold}`);
assert.equal(gs.state.inventory.wood, initWood - 130, 'Envanterden tam 130 odun düşülmeli');
assert(gs.state.adAstraBalance > initAda, 'Satıştan ADA kazanılmış olmalı');

// Şimdi hasat (200 odun) geldiğinde envanterin kapasiteyi aşmadığını ve %5 pay kaldığını doğrula:
const afterHarvestWood = gs.state.inventory.wood + harvestYield2;
assert(afterHarvestWood <= woodLimit, `Hasat sonrası (${afterHarvestWood}) depo limitini (${woodLimit}) aşmamalı`);
const remainingMargin = woodLimit - afterHarvestWood;
assert.equal(remainingMargin, 10, `Kalan boşluk tam 10 olmalı (200'ün %5'i), gerçekleşen: ${remainingMargin}`);
console.log('✅ 2. Test Başarılı: Akıllı Satış tüm ambarı boşaltmadı; tam döngü kazancı + %5 güvenlik marjı (130 odun) satarak 10 birimlik güvenlik payı bıraktı!');

// 3. claimExpedition İçinde Otomatik Tetiklenme Kontrolü
// Aktif buff olarak 24 saatlik bot tanımla
gs.state.activeBuffs['auto_collector'] = { expiresAt: Date.now() + 86400000 };
assert(gs.isAutoCollectorActive(), 'Otomasyon botu aktif olmalı');

// Siloyu tekrar doldur: Odun tam kapasitede olsun
gs.state.inventory.wood = woodLimit;
gs.state.activeExpeditions['wood'] = {
  nodeId: 'wood',
  durationMinutes: 10,
  durationSeconds: 600,
  elapsedSeconds: 600,
  claimedSeconds: 0,
  isCompleted: true
};

const claimRes = gs.claimExpedition('wood');
assert.equal(claimRes.success, true, 'claimExpedition bot sayesinde siloyu boşaltıp başarıyla tamamlanmalı');
assert(claimRes.amount > 0, 'Odun toplanmış olmalı');
assert(gs.state.inventory.wood <= woodLimit, 'Hasat sonrası odun siloyu taşırmamalı');
console.log('✅ 3. Test Başarılı: claimExpedition bot aktifken silodaki taşmayı otomatik çözdü ve seferi kesintisiz tamamladı!');

// 4. Silo Yükseltme Modu (botSiloAutoUpgrade = true) Başarısız Olunca Akıllı Satışa Devretme Fallback Kontrolü
gs.setBotSiloOption(true);
assert.equal(gs.state.botSiloAutoUpgrade, true, 'Bot yükseltme moduna alındı');

// ADA bakiyesini sıfırlayarak silo yükseltmesinin başarısız olmasını sağla
gs.state.adAstraBalance = 0;
gs.state.inventory.wood = woodLimit; // Silo ağzına kadar dolu

const fallbackRes = gs.handleBotSiloSpace('wood', 100);
assert.equal(fallbackRes.handled, true, 'Yükseltme başarısız olunca akıllı satış devreye girmeli');
assert.equal(fallbackRes.action, 'sold', 'Fallback olarak satış gerçekleşmeli');
assert.equal(fallbackRes.amountSold, 105, '100 odunluk hasat için %5 marj ile 105 odun satılmalı');
assert(gs.state.adAstraBalance > 0, 'Satıştan ADA kazanılmış olmalı');
console.log('✅ 4. Test Başarılı: Yükseltme yapılamayınca bot durmadı, otomatik olarak %5 marjlı Akıllı Satış mekanizmasına devretti!');

console.log('🎉 TÜM 24s BOT AKILLI SİLO SATIŞ (%5 MARJ) TESTLERİ %100 BAŞARIYLA TAMAMLANDI!');
