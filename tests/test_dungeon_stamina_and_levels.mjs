import assert from 'node:assert/strict';
import { GAME_CONFIG } from '../js/config.js';
import { GameStateManager } from '../js/gameState.js';

console.log('🧪 Running test_dungeon_stamina_and_levels.mjs...');

// 1. GAME_CONFIG Doğrulaması
assert.ok(GAME_CONFIG.DUNGEON_STAMINA_COST_PER_SOLDIER, 'DUNGEON_STAMINA_COST_PER_SOLDIER config içinde tanımlı olmalı');
assert.equal(GAME_CONFIG.DUNGEON_STAMINA_COST_PER_SOLDIER.BASE_PER_SOLDIER, 5, 'Taban stamina asker başına 5 olmalı');

for (let lvl = 1; lvl <= 18; lvl++) {
  const expectedCost = 5 + lvl;
  assert.equal(
    GAME_CONFIG.DUNGEON_STAMINA_COST_PER_SOLDIER[lvl],
    expectedCost,
    `Kat ${lvl} asker başı maliyeti ${expectedCost} olmalı`
  );
}
console.log('✅ 1. 18 Katın tüm asker başı stamina maliyetleri formüle uygun (Kat 1: 6, Kat 18: 23).');

const gs = new GameStateManager();

// 2. getDungeonStaminaCost Metod Doğrulaması
assert.equal(gs.getDungeonStaminaCost(1, 1), 6, 'Kat 1, 1 asker = 6 stamina');
assert.equal(gs.getDungeonStaminaCost(1, 3), 18, 'Kat 1, 3 asker = 18 stamina');
assert.equal(gs.getDungeonStaminaCost(10, 2), 30, 'Kat 10, 2 asker = (5+10)*2 = 30 stamina');
assert.equal(gs.getDungeonStaminaCost(18, 3), 69, 'Kat 18, 3 asker = 23*3 = 69 stamina');
assert.equal(gs.getDungeonStaminaCost(1, 0), 0, '0 asker = 0 stamina');
console.log('✅ 2. gs.getDungeonStaminaCost ordu boyutuna ve kata göre hatasız hesaplıyor.');

// 3. canEnterDungeon ve deductDungeonStamina Doğrulaması
gs.state.stamina = 50;
const checkOk = gs.canEnterDungeon(1, 3); // 18 stamina gerekir
assert.equal(checkOk.canEnter, true, '50 stamina varken 18 staminaya izin verilmeli');
assert.equal(checkOk.cost, 18);
assert.equal(checkOk.current, 50);

const deductRes1 = gs.deductDungeonStamina(1, 3);
assert.equal(deductRes1.success, true, 'Düşüm başarılı olmalı');
assert.equal(deductRes1.cost, 18);
assert.equal(gs.state.stamina, 32, '50 - 18 = 32 stamina kalmalı');

// Yetersiz stamina senaryosu
const checkFail = gs.canEnterDungeon(18, 2); // (5+18)*2 = 46 stamina gerekir, 32 var
assert.equal(checkFail.canEnter, false, '32 stamina varken 46 staminaya izin verilmemeli');
assert.equal(checkFail.missing, 14, 'Eksik stamina 14 olmalı');

const deductResFail = gs.deductDungeonStamina(18, 2);
assert.equal(deductResFail.success, false, 'Yetersiz staminada düşüm başarısız olmalı');
assert.equal(gs.state.stamina, 32, 'Stamina değişmemeli (32 kalmalı)');

console.log('✅ 3. canEnterDungeon ve deductDungeonStamina bakiye kontrolü ve düşümü kusursuz çalışıyor.');

// 4. Vanilla Reset Dayanıklılığı
gs.vanillaReset();
assert.equal(gs.state.stamina, 100, 'Vanilla reset sonrası stamina 100 olmalı');
assert.equal(gs.getDungeonStaminaCost(1, 1), 6, 'Reset sonrası zindan stamina fonksiyonları çalışmaya devam etmeli');

console.log('✅ 4. Vanilla reset sonrası zindan stamina mekanikleri sağlam.');
console.log('🎉 TÜM ZİNDAN STAMİNA TESTLERİ BAŞARIYLA GEÇTİ!');
