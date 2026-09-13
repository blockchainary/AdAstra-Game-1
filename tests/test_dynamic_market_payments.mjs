import assert from 'node:assert/strict';
import { GameStateManager } from '../js/gameState.js';
import { ammMarket } from '../js/ammMarket.js';

console.log('--- 🧪 ANLIK AMM DEX PAZAR FİYATI VE DİNAMİK ÖDEME SİSTEMİ TESTİ BAŞLATILIYOR ---');

// Mock localStorage
globalThis.localStorage = {
  store: {},
  getItem(k) { return this.store[k] || null; },
  setItem(k, v) { this.store[k] = String(v); },
  removeItem(k) { delete this.store[k]; },
  clear() { this.store = {}; }
};

// Sıfır havuz tohumları ile başla
ammMarket.resetPools();
const gs = new GameStateManager();

// 1. Alet Onarımında Talep Edilen Odun ve Demirin Anlık Market Değeri Kadar ADA Alınması
console.log('\n[1/5] Alet Onarımında Anlık AMM Pazar Değeri ADA Bedeli Test Ediliyor...');
const axe = gs.state.tools.axe;
axe.durability = 4320 - 100; // 100 dakika aşınma

const initialRepairCost = gs.calculateRepairCost('axe');
console.log('100 dk Aşınmış Balta Onarım Maliyeti:', {
  missingDurability: initialRepairCost.missingDurability,
  woodCost: initialRepairCost.woodCost,
  ironCost: initialRepairCost.ironCost,
  adAstraCost: initialRepairCost.adAstraCost
});

assert(initialRepairCost.woodCost > 0, 'Odun bedeli pozitif olmalı');
assert(initialRepairCost.ironCost > 0, 'Demir bedeli pozitif olmalı');

const expectedAmmValInitial = ammMarket.calculateResourcesAdAstraValue({
  wood: initialRepairCost.woodCost,
  iron: initialRepairCost.ironCost
}).totalAda;

assert.equal(initialRepairCost.adAstraCost, expectedAmmValInitial, 'Alet onarım ADA bedeli talep edilen odun ve demirin anlık AMM değerine eşit olmalı');
console.log(`✅ [1. Test Başarılı] İlk Balta Onarım Bedeli: ${initialRepairCost.woodCost} Odun + ${initialRepairCost.ironCost} Demir + ${initialRepairCost.adAstraCost} ADA (AMM Değeriyle Tam Eşit)`);

// 2. AMM DEX Pazar Fiyatı Değişince Onarım ADA Bedelinin Anında Değişmesi
console.log('\n[2/5] AMM DEX Fiyatı Değişimi & Anında Güncellenen Alet Onarım Bedeli Test Ediliyor...');
const oldWoodPrice = ammMarket.getPrice('wood');
const oldIronPrice = ammMarket.getPrice('iron');
console.log(`Eski Fiyatlar: Odun: ${oldWoodPrice.toFixed(4)} ADA, Demir: ${oldIronPrice.toFixed(4)} ADA`);

// Pazarda büyük bir alım simüle ederek fiyatları yükseltelim
// (veya havuz rezervlerini doğrudan değiştirerek fiyat artışı oluşturalım)
ammMarket.pools.wood.adAstraReserve = 20000000; // 20M ADA / 4M Odun = ~5.0 ADA (2x Fiyat)
ammMarket.pools.iron.adAstraReserve = 20000000; // 20M ADA / 2.5M Demir = ~8.0 ADA (2x Fiyat)
ammMarket.savePools();

const newWoodPrice = ammMarket.getPrice('wood');
const newIronPrice = ammMarket.getPrice('iron');
console.log(`Yeni Fiyatlar (Pazar Yükseldi): Odun: ${newWoodPrice.toFixed(4)} ADA, Demir: ${newIronPrice.toFixed(4)} ADA`);

const updatedRepairCost = gs.calculateRepairCost('axe');
console.log('Piyasa Yükseldikten Sonra Balta Onarım Maliyeti:', {
  woodCost: updatedRepairCost.woodCost,
  ironCost: updatedRepairCost.ironCost,
  adAstraCost: updatedRepairCost.adAstraCost
});

assert(updatedRepairCost.adAstraCost > initialRepairCost.adAstraCost, 'Piyasa yükselince alet onarım ADA maliyeti de hemen artmalı');
const expectedNewAmmVal = ammMarket.calculateResourcesAdAstraValue({
  wood: updatedRepairCost.woodCost,
  iron: updatedRepairCost.ironCost
}).totalAda;
assert.equal(updatedRepairCost.adAstraCost, expectedNewAmmVal, 'Yeni alet onarım ADA maliyeti anlık yükselen AMM değerine tam eşit olmalı');
console.log(`✅ [2. Test Başarılı] Balta Onarım ADA Bedeli ${initialRepairCost.adAstraCost} ADA -> ${updatedRepairCost.adAstraCost} ADA olarak anında güncellendi!`);

// 3. Taverna 24s Otomasyon Botunun Anlık Fiyat Değişikliklerine Canlı Tepki Vermesi
console.log('\n[3/5] Taverna 24s Otomasyon Botu Anlık Fiyat Taraması Test Ediliyor...');
const botHighPrice = gs.calculateTavernaBotProfitAndCost();
console.log('Yüksek Fiyat Seviyesinde Bot Finansalları:', {
  grossRevenueAda: botHighPrice.grossRevenueAda,
  toolRepairCostAda: botHighPrice.toolRepairCostAda,
  netProfitAda: botHighPrice.netProfitAda,
  botCostAda: botHighPrice.botCostAda
});

// Şimdi havuzları sıfırlayarak normal başlangıç fiyatlarına döndürelim
ammMarket.resetPools();
const botNormalPrice = gs.calculateTavernaBotProfitAndCost();
console.log('Normal Fiyat Seviyesinde Bot Finansalları:', {
  grossRevenueAda: botNormalPrice.grossRevenueAda,
  toolRepairCostAda: botNormalPrice.toolRepairCostAda,
  netProfitAda: botNormalPrice.netProfitAda,
  botCostAda: botNormalPrice.botCostAda
});

assert.notEqual(botHighPrice.botCostAda, botNormalPrice.botCostAda, 'Bot fiyatı pazar hareketlerine göre anında değişmeli');
assert.equal(botNormalPrice.botCostAda, Math.round(botNormalPrice.netProfitAda * 0.5), 'Normal fiyatta bot net kârın %50\'si olmalı');
assert.equal(botHighPrice.botCostAda, Math.round(botHighPrice.netProfitAda * 0.5), 'Yüksek fiyatta bot net kârın %50\'si olmalı');
console.log('✅ [3. Test Başarılı] Taverna Botu market fiyatlarını tarayarak saf kâr ve bot maliyetini anında güncelliyor!');

// 4. AMM Market Fiyat Değişim Aboneliği (Event Listener / Subscriber) Kontrolü
console.log('\n[4/5] AMM DEX Fiyat Bildirim Aboneliği (Event Dispatcher) Test Ediliyor...');
let subscriberNotified = false;
let notifiedPrices = null;

const unsubscribe = ammMarket.subscribe((prices) => {
  subscriberNotified = true;
  notifiedPrices = prices;
});

// Pazarda bir satış işlemi yapalım
ammMarket.executeSell('wheat', 1000);

assert.equal(subscriberNotified, true, 'AMM satış işlemi gerçekleştiğinde dinleyiciler tetiklenmeli');
assert(notifiedPrices && notifiedPrices.wheat > 0, 'Dinleyiciye güncel fiyat listesi aktarılmalı');
console.log('✅ [4. Test Başarılı] AMM DEX işlemi anında aboneleri tetikledi. Canlı Buğday Fiyatı:', notifiedPrices.wheat);
unsubscribe();

// 5. getDynamicEconomyRates ve tickUpgradeCostBot Entegrasyonu
console.log('\n[5/5] getDynamicEconomyRates ve tickUpgradeCostBot Entegrasyonu Test Ediliyor...');
const ecoRates = gs.getDynamicEconomyRates();
assert(ecoRates.prices.wood > 0, 'Dinamik odun fiyatı tanımlı olmalı');
assert(ecoRates.prices.iron > 0, 'Dinamik demir fiyatı tanımlı olmalı');
assert(ecoRates.prices.wheat > 0, 'Dinamik buğday fiyatı tanımlı olmalı');
assert(ecoRates.toolsRepair.count >= 0, 'Alet onarım taraması başarılı olmalı');
assert(ecoRates.bot.botCostAda > 0, 'Canlı bot fiyatı hesaplanmış olmalı');

const tickResult = gs.tickUpgradeCostBot(1.0);
assert(tickResult.prices.wheat > 0, 'tickUpgradeCostBot anlık fiyatları taramalı');
assert(tickResult.toolsRepair, 'tickUpgradeCostBot alet tamir masraflarını taramalı');
assert(tickResult.bot, 'tickUpgradeCostBot canlı bot verilerini taramalı');

console.log('✅ [5. Test Başarılı] Genel dinamik ekonomi ve yükseltme maliyet botu başarıyla doğrulandı!');

// 6. Teçhizat Dövme (Craft) AMM DEX Pazar Fiyatı Duyarlılığı Testi
console.log('\n[6/8] Teçhizat Dövme (Craft) Anlık Market Fiyatı Test Ediliyor...');
const initialWeaponCraft = gs.calculateEquipmentCraftCost('weapon');
assert(initialWeaponCraft.woodCost > 0, 'Silah dövme odun istemeli');
assert(initialWeaponCraft.ironCost > 0, 'Silah dövme demir istemeli');
assert(initialWeaponCraft.adaCost > 0, 'Silah dövme ADA istemeli');

// Piyasa fiyatını yükseltelim
ammMarket.pools.wood.adAstraReserve = 25000000;
ammMarket.pools.iron.adAstraReserve = 25000000;
ammMarket.savePools();

const highWeaponCraft = gs.calculateEquipmentCraftCost('weapon');
assert(highWeaponCraft.adaCost > initialWeaponCraft.adaCost, 'Piyasa fiyatı artınca silah dövme ADA bedeli hemen artmalı');
const expectedHighCraftAda = ammMarket.calculateResourcesAdAstraValue({
  wood: highWeaponCraft.woodCost,
  iron: highWeaponCraft.ironCost
}).totalAda;
assert.equal(highWeaponCraft.adaCost, expectedHighCraftAda, 'Dövme ADA bedeli anlık AMM DEX değerine tam eşit olmalı');
console.log(`✅ [6. Test Başarılı] Silah Dövme ADA Bedeli ${initialWeaponCraft.adaCost} ADA -> ${highWeaponCraft.adaCost} ADA olarak canlı güncellendi!`);

// 7. Teçhizat Yükseltme (Upgrade) ve Onarım (Repair) Anlık Market Fiyatı Testi
console.log('\n[7/8] Teçhizat Yükseltme ve Onarımında Canlı Pazar Değeri Test Ediliyor...');
ammMarket.resetPools(); // normal fiyatlar
// Test için sahte bir kılıç oluşturalım
const testSword = {
  id: 'test_sword_1',
  slot: 'weapon',
  name: 'Test Kılıcı',
  level: 1,
  baseAtk: 25,
  baseHp: 0,
  durability: 8, // 13 üzerinden 8 (5 hasar)
  maxDurability: 13
};

const normalUpgradeCost = gs.calculateEquipmentUpgradeCost(testSword);
const normalRepairCost = gs.calculateEquipmentRepairCost(testSword);

// Fiyatları yükseltelim
ammMarket.pools.wood.adAstraReserve = 25000000;
ammMarket.pools.iron.adAstraReserve = 25000000;
ammMarket.savePools();

const highUpgradeCost = gs.calculateEquipmentUpgradeCost(testSword);
const highRepairCost = gs.calculateEquipmentRepairCost(testSword);

assert(highUpgradeCost.adAstraCost > normalUpgradeCost.adAstraCost, 'Piyasa yükselince teçhizat yükseltme ADA bedeli anında artmalı');
assert(highRepairCost.adaCost > normalRepairCost.adaCost, 'Piyasa yükselince teçhizat onarım ADA bedeli anında artmalı');

console.log(`✅ [7. Test Başarılı] Teçhizat Yükseltme: ${normalUpgradeCost.adAstraCost} -> ${highUpgradeCost.adAstraCost} ADA, Onarım: ${normalRepairCost.adaCost} -> ${highRepairCost.adaCost} ADA!`);

// 8. getDynamicEconomyRates Teçhizat & Asker İyileştirme Entegrasyonu Testi
console.log('\n[8/8] getDynamicEconomyRates Teçhizat & Asker İyileştirme Taraması Test Ediliyor...');
ammMarket.resetPools();
const fullEco = gs.getDynamicEconomyRates();
assert.ok(fullEco.equipmentCraft, 'equipmentCraft nesnesi bulunmalı');
assert.ok(fullEco.equipmentCraft.weapon, 'weapon dövme maliyeti taranmalı');
assert.ok(fullEco.equipmentRepair, 'equipmentRepair nesnesi bulunmalı');
assert.ok(fullEco.soldiersHeal, 'soldiersHeal nesnesi bulunmalı');
console.log('✅ [8. Test Başarılı] Tüm teçhizat craft, onarım ve asker iyileştirme dinamik fiyatlama motoruna bağlandı!');

console.log('\n🎉 TÜM ANLIK AMM DEX VE DİNAMİK ÖDEME MEKANİZMASI TESTLERİ %100 BAŞARIYLA GEÇTİ! 🎉');
