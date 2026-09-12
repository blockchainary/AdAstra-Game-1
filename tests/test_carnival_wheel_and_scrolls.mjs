import assert from 'node:assert/strict';
import { GameStateManager } from '../js/gameState.js';
import { GAME_CONFIG } from '../js/config.js';

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

console.log('\n🎉 TÜM ŞANS ÇARKI VE PARŞÖMEN TESTLERİ %100 BAŞARIYLA TAMAMLANDI! 🎉\n');
