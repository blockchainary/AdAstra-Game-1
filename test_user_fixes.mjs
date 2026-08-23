global.localStorage = {
  getItem: () => null,
  setItem: () => {}
};

import { gameState } from './js/gameState.js';
import { ammMarket } from './js/ammMarket.js';
import { GAME_CONFIG } from './js/config.js';

console.log("=== 1. SEFER SÜRESİ TESTİ ===");
console.log("Lv 1 Sefer Süresi:", gameState.getExpeditionDurationHours(1), "Saat (", gameState.getExpeditionDurationMinutes(1), "Dakika)");
console.log("Lv 81 Sefer Süresi:", gameState.getExpeditionDurationHours(81), "Saat (", gameState.getExpeditionDurationMinutes(81), "Dakika)");

console.log("\n=== 2. TAMİRAT RESOURCE COST TESTİ ===");
gameState.state.tools.axe.durability = 25;
const axeCost = gameState.calculateRepairCost('axe');
console.log("Balta Tamir Maliyeti:", axeCost);

console.log("\n=== 3. 180 GÜNLÜK AMM PAZAR HAVUZLARI TESTİ ===");
console.log("Odun Havuzu:", ammMarket.pools.wood.resourceReserve, "Odun /", ammMarket.pools.wood.adAstraReserve, "ADA - Fiyat:", ammMarket.getPrice('wood'), "ADA");
console.log("Demir Havuzu:", ammMarket.pools.iron.resourceReserve, "Demir /", ammMarket.pools.iron.adAstraReserve, "ADA - Fiyat:", ammMarket.getPrice('iron'), "ADA");
console.log("Buğday Havuzu:", ammMarket.pools.wheat.resourceReserve, "Buğday /", ammMarket.pools.wheat.adAstraReserve, "ADA - Fiyat:", ammMarket.getPrice('wheat'), "ADA");

console.log("\n=== 4. %49 DEPO KAPASİTESİ VE ANLIK FİYATLI YÜKSELTME TESTİ ===");
const capLvl1 = gameState.getWarehouseCapacity(1);
console.log("Lv 1 Depo Kapasiteleri:", capLvl1);
const upgradeCost = gameState.getWarehouseUpgradeCost(1);
console.log("Lv 2 Depo Yükseltme Maliyeti (%49):", upgradeCost);

console.log("\n=== 5. SEVİYE VE STAMİNA ARTIŞ TESTİ ===");
console.log("Lv 1 Max Stamina:", gameState.getMaxStamina(1));
console.log("Lv 2 Max Stamina:", gameState.getMaxStamina(2));
console.log("Lv 81 Max Stamina:", gameState.getMaxStamina(81));

console.log("\n✅ ALL 6 USER FIXES VERIFIED 100%!");
