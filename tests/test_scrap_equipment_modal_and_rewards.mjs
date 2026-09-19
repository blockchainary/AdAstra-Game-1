// tests/test_scrap_equipment_modal_and_rewards.mjs
// Düşük Seviye Eşyaları Hurdaya Çevirme, Ödül Dökümü & Rapor Test Paketi

import assert from 'assert';
import { gameState } from '../js/gameState.js';

console.log('♻️ [TEST] Eşyaları Hurdaya Çevirme & Geri Dönüşüm Raporu Testleri Başlatılıyor...\n');

// State'i sıfırla
gameState.vanillaReset();

// --------------------------------------------------------------------------
// TEST 1: Cephanelikte Boşta Lv.1 Eşyalar Varken Hurdaya Çevirme
// --------------------------------------------------------------------------
console.log('▶ TEST 1: Boştaki Lv.1 Eşyaları Hurdaya Çevirme & Döküm');

const initialFragments = gameState.state.inventory.fragments || 0;
const initialIron = gameState.state.inventory.iron || 0;

// Cephaneliğe 3 adet Seviye 1 eşya ve 1 adet Seviye 2 eşya ekleyelim
gameState.state.armoryInventory = [
  { id: 'wpn_1', name: 'Paslı Kılıç', slot: 'weapon', level: 1, icon: '🗡️' },
  { id: 'hlm_1', name: 'Demir Miğfer', slot: 'helmet', level: 1, icon: '🪖' },
  { id: 'arm_1', name: 'Eski Zırh', slot: 'armor', level: 1, icon: '🛡️' },
  { id: 'wpn_2', name: 'Usta Kılıcı', slot: 'weapon', level: 2, icon: '⚔️' } // Lv.2 korunmalı!
];

const res = gameState.scrapAllLowTierEquipment(1);

assert.strictEqual(res.success, true, 'İşlem başarılı olmalı');
assert.strictEqual(res.scrappedCount, 3, 'Tam olarak 3 adet Lv.1 eşya hurdaya ayrılmalı');
assert.strictEqual(res.gainedFragments, 6, '3 eşya x 2 = 6 Teçhizat Parçası kazanılmalı');
assert.strictEqual(res.gainedIron, 30, '3 eşya x 10 = 30 Demir Cevheri kazanılmalı');

// Rapor dökümü listesi kontrolü
assert.strictEqual(res.scrappedItems.length, 3, 'Dökümde 3 eşya bulunmalı');
assert.strictEqual(res.scrappedItems[0].name, 'Paslı Kılıç');
assert.strictEqual(res.scrappedItems[1].name, 'Demir Miğfer');
assert.strictEqual(res.scrappedItems[2].name, 'Eski Zırh');

// Cephanelikte sadece Lv.2 eşya kalmalı
assert.strictEqual(gameState.state.armoryInventory.length, 1, 'Cephanelikte yalnızca Lv.2 eşya kalmalı');
assert.strictEqual(gameState.state.armoryInventory[0].name, 'Usta Kılıcı');

// Envanter bakiye artışı
assert.strictEqual(gameState.state.inventory.fragments, initialFragments + 6, 'Envanterdeki parça sayısı artmalı');
assert.strictEqual(gameState.state.inventory.iron, initialIron + 30, 'Envanterdeki demir sayısı artmalı');

console.log('  ✅ 3 adet Seviye 1 eşya başarıyla hurdaya çevrildi: +6 💎 Parça, +30 ⛏️ Demir!');
console.log('  ✅ Seviye 2 eşya başarıyla korundu.');

// --------------------------------------------------------------------------
// TEST 2: Askerlerin Üzerindeki Kuşanılmış Eşyaların Korunması
// --------------------------------------------------------------------------
console.log('\n▶ TEST 2: Askerlerin Kuşanılmış Eşyalarının Korunması');

// 1 asker oluşturalım ve üzerine Lv.1 silah takalım
const soldier = gameState.createSoldierUnit(1);
soldier.equipment = {
  weapon: { name: 'Kuşanılmış Asker Kılıcı', slot: 'weapon', level: 1, icon: '🗡️' }
};
gameState.state.soldierUnits = [soldier];

// Cephanelikte boş eşya yokken tekrar hurdaya çevir
const resSoldier = gameState.scrapAllLowTierEquipment(1);
assert.strictEqual(resSoldier.success, false, 'Hurdaya çevrilecek boşta eşya olmamalı');
assert.strictEqual(soldier.equipment.weapon.name, 'Kuşanılmış Asker Kılıcı', 'Askerin üzerindeki eşya ASLA silinmemeli!');

console.log('  ✅ Askerin üzerindeki teçhizatın korunduğu doğrulandı.');

// --------------------------------------------------------------------------
// TEST 3: Boş Envanterde Hurdaya Çevirme Çağrısı
// --------------------------------------------------------------------------
console.log('\n▶ TEST 3: Boş Envanter Kontrolü');

gameState.state.armoryInventory = [];
const emptyRes = gameState.scrapAllLowTierEquipment(1);
assert.strictEqual(emptyRes.success, false);
assert.strictEqual(emptyRes.scrappedCount, 0);

console.log('  ✅ Boş envanterde güvenli uyarı mesajı verildi.');

console.log('\n🎉 [BAŞARILI] Eşya Hurdaya Çevirme & Geri Dönüşüm Raporu %100 Doğrulandı!');
