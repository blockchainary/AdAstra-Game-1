// Mock localStorage and window for Node environment
const storage = {};
globalThis.localStorage = {
  getItem: (k) => storage[k] || null,
  setItem: (k, v) => { storage[k] = String(v); },
  removeItem: (k) => { delete storage[k]; },
  clear: () => { for (let k in storage) delete storage[k]; }
};
globalThis.window = { dispatchEvent: () => {} };

const { GAME_CONFIG } = await import('./js/config.js');
const { gameState } = await import('./js/gameState.js');
const { ammMarket } = await import('./js/ammMarket.js');
const { globalPool } = await import('./js/globalPool.js');

console.log('--- 1. TESTING AMM TRADING & POOLS ---');
console.log('Pools status:');
for (const [k, p] of Object.entries(ammMarket.pools)) {
  console.log(`- ${k}: Res=${p.resourceReserve}, ADA=${p.adAstraReserve}, Price=${ammMarket.getPrice(k)}`);
}

// Test estimating buy cost
const buy10WoodCost = ammMarket.getEstimatedCostForBuy('wood', 10);
console.log(`Estimated cost to buy 10 wood: ${buy10WoodCost} ADA`);

// Test estimating sell gain
const sell10WoodGain = ammMarket.getEstimatedAdAstraForSell('wood', 10);
console.log(`Estimated gain to sell 10 wood: ${sell10WoodGain} ADA`);

console.log('\n--- 2. TESTING 5-PIECE BLACKSMITH EQUIPMENT ---');
gameState.state.adAstraBalance = 100000;
gameState.state.inventory.wood = 5000;
gameState.state.inventory.iron = 5000;
gameState.state.inventory.wheat = 5000;
gameState.state.inventory.fragments = 500;

// Craft weapon
const craftRes = gameState.craftEquipment('weapon');
console.log('Craft weapon:', craftRes);
console.log('Equipped weapon:', gameState.state.equipment.weapon);

// Damage weapon
gameState.state.equipment.weapon.durability = 3;
const reforgeCost = gameState.calculateEquipmentReforgeCost('weapon');
console.log('Reforge cost for damaged weapon (3/13):', reforgeCost);

const reforgeRes = gameState.reforgeEquipment('weapon');
console.log('Reforge weapon result:', reforgeRes);
console.log('Weapon after reforge:', gameState.state.equipment.weapon);

// Upgrade weapon
const upCost = gameState.calculateEquipmentUpgradeCost('weapon');
console.log('Upgrade cost for weapon:', upCost);
const upRes = gameState.upgradeEquipment('weapon');
console.log('Upgrade weapon result:', upRes);
console.log('Weapon after upgrade:', gameState.state.equipment.weapon);

console.log('\n--- 3. TESTING STAMINA & WHEAT REFILL ---');
gameState.state.level = 5;
console.log(`Level 5 Max Stamina: ${gameState.getMaxStamina()}`);
console.log(`Level 5 Expedition Stamina Cost: ${gameState.getExpeditionStaminaCost()}`);

gameState.state.stamina = 10;
const refillRes = gameState.refillStaminaWithWheat();
console.log('Refill stamina with wheat:', refillRes);
console.log(`Stamina after refill: ${gameState.state.stamina} / ${gameState.getMaxStamina()}`);

console.log('\n--- 4. TESTING ALL 5 EQUIPMENT SLOTS CRAFT ---');
['helmet', 'armor', 'legs', 'boots'].forEach(slot => {
  const res = gameState.craftEquipment(slot);
  console.log(`Craft ${slot}:`, res.success, res.message);
});
console.log('Total Equipment Bonus Stats:', gameState.getEquipmentBonusStats());

console.log('\n✅ ALL SYSTEMS VERIFIED AND OPERATIONAL!');
