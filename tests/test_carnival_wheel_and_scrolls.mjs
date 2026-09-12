import assert from 'node:assert/strict';
import { GameStateManager } from '../js/gameState.js';
import { GAME_CONFIG } from '../js/config.js';
import { ammMarket } from '../js/ammMarket.js';

// Mock localStorage for node environment
globalThis.localStorage = {
  store: {},
  getItem(k) { return this.store[k] || null; },
  setItem(k, v) { this.store[k] = String(v); },
  removeItem(k) { delete this.store[k]; },
  clear() { this.store = {}; }
};

console.log('--- 🧪 KARNAVAL ŞANS ÇARKI VE PARŞÖMEN ENVANTERİ TESTİ BAŞLATILIYOR ---');

const gs = new GameStateManager();

// Test 1: Çark ödülleri ve veri doğrulaması
console.log('\n[1/4] Şans Çarkı Ödül Tablosu Denetleniyor...');
const wheelRewards = GAME_CONFIG.CARNIVAL.WHEEL_REWARDS;
assert(Array.isArray(wheelRewards) && wheelRewards.length === 18, 'Çarkta tam 18 ödül dilimi bulunmalı');
wheelRewards.forEach((r, idx) => {
  assert(r.id, `Ödül #${idx} id içermeli`);
  assert(r.name, `Ödül #${idx} name içermeli`);
  assert(r.icon, `Ödül #${idx} icon içermeli`);
  assert(r.weight > 0, `Ödül #${idx} weight > 0 olmalı`);
});
console.log('✅ 18 Dilimli Şans Çarkı konfigürasyonu eksiksiz.');

// Test 2: Ordu İyileştirme Parşömeni (scroll_heal)
console.log('\n[2/4] Ordu İyileştirme Parşömeni (scroll_heal) Test Ediliyor...');
// Asker oluştur veya yarala
if (!gs.state.soldiers || gs.state.soldiers.length === 0) {
  gs.state.soldiers = [gs.createSoldierUnit(1)];
}
const soldier = gs.state.soldiers[0];
soldier.hp = 50; // 50/100 HP
gs.state.inventory.scroll_heal = 2;

const healRes = gs.useScroll('scroll_heal');
assert(healRes.success, 'scroll_heal başarılı olmalı');
assert.equal(soldier.hp, 60, 'Asker canı 50 den 60 a çıkmalı (+10 HP)');
assert.equal(gs.state.inventory.scroll_heal, 1, 'Kalan parşömen 1 olmalı');

// Canı 100 e eşitleyip tekrar deneyelim
soldier.hp = soldier.maxHp;
const fullHpRes = gs.useScroll('scroll_heal');
assert(!fullHpRes.success, 'Can doluyken parşömen harcanmamalı');
assert.equal(gs.state.inventory.scroll_heal, 1, 'Parşömen sayısı değişmemeli');
console.log('✅ Ordu İyileştirme Parşömeni (+10 HP) mekaniği %100 doğrulandı.');

// Test 3: Stamina Fulleme Parşömeni (scroll_stamina)
console.log('\n[3/4] Stamina Fulleme Parşömeni (scroll_stamina) Test Ediliyor...');
const maxStamina = gs.getMaxStamina();
gs.state.stamina = 15;
gs.state.inventory.scroll_stamina = 1;

const staminaRes = gs.useScroll('scroll_stamina');
assert(staminaRes.success, 'scroll_stamina başarılı olmalı');
assert.equal(gs.state.stamina, maxStamina, 'Stamina doğrudan maksimuma ulaşmalı');
assert.equal(gs.state.inventory.scroll_stamina, 0, 'Parşömen tüketilmeli');

const fullStaminaRes = gs.useScroll('scroll_stamina');
assert(!fullStaminaRes.success, 'Stamina doluyken veya parşömen yokken reddedilmeli');
console.log('✅ Stamina Fulleme Parşömeni mekaniği %100 doğrulandı.');

// Test 4: %10 Alet Onarım Parşömeni (scroll_repair)
console.log('\n[4/4] %10 Alet Onarım Parşömeni (scroll_repair) Test Ediliyor...');
gs.state.tools.axe.durability = 3000;
gs.state.tools.pickaxe.durability = 3500;
gs.state.tools.sickle.durability = 4000;
gs.state.inventory.scroll_repair = 1;

const repairRes = gs.useScroll('scroll_repair');
assert(repairRes.success, 'scroll_repair başarılı olmalı');
assert.equal(gs.state.tools.axe.durability, 3432, 'Baltaya +432 dk dayanıklılık eklenmeli');
assert.equal(gs.state.tools.pickaxe.durability, 3932, 'Kazmaya +432 dk dayanıklılık eklenmeli');
assert.equal(gs.state.tools.sickle.durability, 4320, 'Orak maksimum 4320 ile sınırlanmalı');
assert.equal(gs.state.inventory.scroll_repair, 0, 'Parşömen tüketilmeli');

// Tüm aletler 4320 iken
gs.state.tools.axe.durability = 4320;
gs.state.tools.pickaxe.durability = 4320;
gs.state.tools.sickle.durability = 4320;
gs.state.inventory.scroll_repair = 1;
const fullRepairRes = gs.useScroll('scroll_repair');
assert(!fullRepairRes.success, 'Aletler tam sağlamken parşömen harcanmamalı');
assert.equal(gs.state.inventory.scroll_repair, 1, 'Parşömen sayısı korunmalı');

console.log('✅ %10 Alet Onarım Parşömeni mekaniği %100 doğrulandı.');

// Test 5: Karnaval Çarkında Demir, Odun ve Buğdayların Anında Yakılması & Sistemden Silinmesi
console.log('\n[5/6] Karnaval Çarkında Demir, Odun ve Buğdayların Yakılması Test Ediliyor...');
gs.state.inventory.wood = 5000;
gs.state.inventory.iron = 5000;
gs.state.inventory.wheat = 5000;

const initialWoodReserve = ammMarket.pools.wood?.resourceReserve || 0;
const initialIronReserve = ammMarket.pools.iron?.resourceReserve || 0;
const initialWheatReserve = ammMarket.pools.wheat?.resourceReserve || 0;

const woodPrice = ammMarket.getPrice('wood') || 1.0;
const expectedWoodCost = Math.ceil(100 / woodPrice);

const spinWoodRes = gs.spinCarnivalWheel('wood');
assert(spinWoodRes.success, 'Odun ile çark çevirme başarılı olmalı');
assert(spinWoodRes.burnedInfo, 'burnedInfo dönmeli');
assert.equal(spinWoodRes.burnedInfo.resource, 'wood');
assert.equal(spinWoodRes.burnedInfo.amount, expectedWoodCost);
const wonWood = (spinWoodRes.slice?.type === 'resource' && spinWoodRes.slice?.resource === 'wood') ? spinWoodRes.slice.amount : 0;
assert.equal(gs.state.inventory.wood, 5000 - expectedWoodCost + wonWood, 'Envanterden odun tam düşmeli');
assert.equal(ammMarket.pools.wood.resourceReserve, initialWoodReserve, 'AMM havuz rezervine ASLA odun eklenmemeli, yanmalı');
assert.equal(gs.state.burnedResources.wood, expectedWoodCost, 'burnedResources.wood kaydedilmeli');

// Demir ile çevir
const ironPrice = ammMarket.getPrice('iron') || 1.0;
const expectedIronCost = Math.ceil(100 / ironPrice);
const spinIronRes = gs.spinCarnivalWheel('iron');
assert(spinIronRes.success, 'Demir ile çark çevirme başarılı olmalı');
const wonIron = (spinIronRes.slice?.type === 'resource' && spinIronRes.slice?.resource === 'iron') ? spinIronRes.slice.amount : 0;
assert.equal(gs.state.inventory.iron, 5000 - expectedIronCost + wonIron, 'Envanterden demir tam düşmeli');
assert.equal(ammMarket.pools.iron.resourceReserve, initialIronReserve, 'AMM havuz rezervine ASLA demir eklenmemeli, yanmalı');
assert.equal(gs.state.burnedResources.iron, expectedIronCost, 'burnedResources.iron kaydedilmeli');

// Buğday ile çevir
const wheatPrice = ammMarket.getPrice('wheat') || 1.0;
const expectedWheatCost = Math.ceil(100 / wheatPrice);
const spinWheatRes = gs.spinCarnivalWheel('wheat');
assert(spinWheatRes.success, 'Buğday ile çark çevirme başarılı olmalı');
const wonWheat = (spinWheatRes.slice?.type === 'resource' && spinWheatRes.slice?.resource === 'wheat') ? spinWheatRes.slice.amount : 0;
assert.equal(gs.state.inventory.wheat, 5000 - expectedWheatCost + wonWheat, 'Envanterden buğday tam düşmeli');
assert.equal(ammMarket.pools.wheat.resourceReserve, initialWheatReserve, 'AMM havuz rezervine ASLA buğday eklenmemeli, yanmalı');
assert.equal(gs.state.burnedResources.wheat, expectedWheatCost, 'burnedResources.wheat kaydedilmeli');

console.log('✅ Karnaval çarkında harcanan odun, demir ve buğdayların anında yakılarak yok edildiği %100 doğrulandı.');

// Test 5.1: SoldierUnits üzerinde spesifik Asker ID ile Ordu İyileştirme Parşömeni
gs.state.soldierUnits = [
  { id: 'sol_101', name: 'Piyade', hp: 30, maxHp: 100 },
  { id: 'sol_102', name: 'Okçu', hp: 40, maxHp: 100 }
];
gs.state.inventory.scroll_heal = 2;
const targetedHeal = gs.useScroll('scroll_heal', 'sol_102');
assert(targetedHeal.success, 'Belirli ID li askere iyileştirme parşömeni uygulanabilmeli');
assert.equal(gs.state.soldierUnits[1].hp, 50, 'Hedeflenen askerin canı 40 tan 50 ye çıkmalı');
assert.equal(gs.state.soldierUnits[0].hp, 30, 'Hedeflenmeyen askerin canı değişmemeli');
assert.equal(gs.state.inventory.scroll_heal, 1, '1 parşömen düşmeli');

// Test 6: Krallık Hazinesi & Havuz Dağılımı ve Ödül Bakiyeleri Özeti
console.log('\n[6/6] Krallık Hazinesi & Havuz Dağılımı ve Canlı Ödüller Test Ediliyor...');
const ecoSummary = gs.getEconomyAndPoolsSummary();
assert(ecoSummary, 'Hazine ve havuz özeti oluşturulmalı');
assert.equal(ecoSummary.burnRatePct, 22, 'Kalıcı yakım oranı %22 olmalı');
assert.equal(ecoSummary.allocations.dungeon, 0.25, 'Zindan havuz payı %25 olmalı');
assert.equal(ecoSummary.allocations.arena, 0.15, 'Kolezyum havuz payı %15 olmalı');
assert.equal(ecoSummary.allocations.worldBoss, 0.15, 'World Boss havuz payı %15 olmalı');
assert.equal(ecoSummary.allocations.ammBuyback, 0.13, 'AMM buyback havuz payı %13 olmalı');
assert.equal(ecoSummary.allocations.carnival, 0.10, 'Karnaval havuz payı %10 olmalı');
assert(ecoSummary.pools.length === 5, '5 ana hazine havuzu listelenmeli');

ecoSummary.pools.forEach(p => {
  assert(p.balance >= 0, `${p.name} bakiyesi pozitif olmalı`);
  assert(p.sharePct > 0, `${p.name} dağıtım payı bulunmalı`);
  assert(p.actionType, `${p.name} aksiyon butonu tanımlı olmalı`);
});

assert(ecoSummary.lottery.lotteryPool >= 1000000, 'Piyango kasası 1.000.000+ ADA olmalı');
assert.equal(ecoSummary.lottery.winnerShare, Math.round(ecoSummary.lottery.lotteryPool * 0.18), 'Piyango kazanan payı %18 olmalı');
assert(ecoSummary.burnedResources.wood >= expectedWoodCost, 'Yakılan odun özette görünmeli');
assert(ecoSummary.burnedResources.iron >= expectedIronCost, 'Yakılan demir özette görünmeli');
assert(ecoSummary.burnedResources.wheat >= expectedWheatCost, 'Yakılan buğday özette görünmeli');

console.log('✅ Hazine gelir dağılımı, havuz ödül bakiyeleri ve piyango telemetrisi %100 doğrulandı.');

console.log('\n🎉 TÜM ŞANS ÇARKI, YAKIM VE HAVUZ DAĞILIMI TESTLERİ %100 BAŞARIYLA TAMAMLANDI! 🎉\n');
