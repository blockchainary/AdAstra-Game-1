import { gameState } from './js/gameState.js';
import { GAME_CONFIG } from './js/config.js';

console.log('🧪 Testing new Dashboard, Armory, and Prediction methods...');

// 1. Test getRealmSummary
const summary = gameState.getRealmSummary();
console.log('✅ getRealmSummary:', {
  level: summary.level,
  ada: summary.ada,
  activeExps: summary.activeExps.length,
  avgToolHealth: summary.avgToolHealth,
  soldierCount: summary.soldierCount,
  totalAtk: summary.totalAtk,
  totalHp: summary.totalHp,
  woundedCount: summary.woundedCount
});

// 2. Test repair costs
const repairCost = gameState.getAllRepairCost();
console.log('✅ getAllRepairCost:', repairCost);

// 3. Test heal costs
const healCost = gameState.getAllHealCost();
console.log('✅ getAllHealCost:', healCost);

// 4. Test Battle Prediction
const pred1 = gameState.getBattlePrediction(100, 15, [0, 1, 2, 3, 4], false);
console.log('✅ Battle Prediction (5 soldiers):', pred1);

const pred2 = gameState.getBattlePrediction(100, 15, [0, 1, 2, 3, 4], true);
console.log('✅ Battle Prediction (5 soldiers, protected weapons):', pred2);

// 5. Test Command Palette actions
const actions = gameState.getCommandPaletteActions();
console.log('✅ Command Palette actions count:', actions.length);

// 6. Test Auto-equip and unequip
const unequipRes = gameState.unequipAllSoldiers();
console.log('✅ unequipAllSoldiers:', unequipRes);

const autoEquipRes = gameState.autoEquipBest();
console.log('✅ autoEquipBest:', autoEquipRes);

console.log('🎉 ALL ENGINE TESTS PASSED!');
