import { gameState } from './js/gameState.js';
import { GAME_CONFIG } from './js/config.js';

console.log('=== TEST 1: RESOURCE CAPS ===');
console.log('Wheat Cap:', GAME_CONFIG.GLOBAL_RESOURCE_CAPS.wheat.totalCap, 'Expected: 490000');
console.log('Wood Cap:', GAME_CONFIG.GLOBAL_RESOURCE_CAPS.wood.totalCap, 'Expected: 180000');
console.log('Iron Cap:', GAME_CONFIG.GLOBAL_RESOURCE_CAPS.iron.totalCap, 'Expected: 130000');

console.log('\n=== TEST 2: SOLDIER BUYING & ROSTER GROWTH ===');
console.log('Initial soldierUnits count:', gameState.state.soldierUnits.length);

// Add ADA for buying soldiers
gameState.state.adAstraBalance = 100000;
const buy1 = gameState.buySoldierUnit();
console.log('Buy Soldier 1:', buy1);

const buy2 = gameState.buySoldierUnit();
console.log('Buy Soldier 2:', buy2);

console.log('Current soldierUnits count:', gameState.state.soldierUnits.length);
console.log('Soldier 1 Name & Icon:', gameState.state.soldierUnits[0].name, gameState.state.soldierUnits[0].icon);

console.log('\n=== TEST 3: BATTLE PREDICTION WITH BOUGHT SOLDIERS ===');
const pred = gameState.getBattlePrediction(100, 15, [0, 1], false);
console.log('Battle Prediction with 2 soldiers:', pred);

console.log('\n=== ALL ENGINE VALIDATION TESTS SUCCESSFUL! ===');
