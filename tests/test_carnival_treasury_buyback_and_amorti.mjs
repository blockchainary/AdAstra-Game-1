import assert from 'node:assert/strict';
import { GameStateManager } from '../js/gameState.js';
import { GAME_CONFIG } from '../js/config.js';
import { ammMarket } from '../js/ammMarket.js';
import { treasury } from '../js/treasury.js';

// Mock localStorage for node environment
globalThis.localStorage = {
  store: {},
  getItem(k) { return this.store[k] || null; },
  setItem(k, v) { this.store[k] = String(v); },
  removeItem(k) { delete this.store[k]; },
  clear() { this.store = {}; }
};

console.log('--- 🧪 KARNAVAL HAZİNE BUYBACK & 3 AMORTİ BİLETİ TESTİ BAŞLATILIYOR ---');

const gs = new GameStateManager();
treasury.state.pools.carnival = 5000000; // 5 Milyon ADA Karnaval Kasası

// Test 1: Config Kontrolü (3 Adet = 1 Çevirme)
console.log('\n[1/5] Config Amorti Bilet Tanımı Denetleniyor...');
const shardReward = GAME_CONFIG.CARNIVAL.WHEEL_REWARDS.find(r => r.type === 'ticket_shard');
assert(shardReward, 'ticket_shard ödülü bulunmalı');
assert(shardReward.name.includes('3 Adet = 1 Çevirme'), 'Ödül adında 3 Adet = 1 Çevirme belirtilmeli');
console.log('✅ Config amorti bilet tanımı 3 Adet = 1 Çevirme olarak doğrulandı.');

// Test 2: 3 Amorti Bilet Parçası Döngüsü
console.log('\n[2/5] 3 Adet Amorti Bilet Parçası ile 1 Çevirme Kazanımı Test Ediliyor...');
gs.state.wheelTicketShards = 0;
gs.state.lotteryTickets = 0;

// 1. Parça
const mockShardReward = { id: 'wheel_ticket_shard', name: 'Amorti Çark Bileti (3 Adet = 1 Çevirme)', icon: '🎟️', type: 'ticket_shard', amount: 1 };
const origRewards = GAME_CONFIG.CARNIVAL.WHEEL_REWARDS;

// Çarkı zorla ticket_shard verecek şekilde mocklayıp test edelim
GAME_CONFIG.CARNIVAL.WHEEL_REWARDS = [mockShardReward];
gs.state.adAstraBalance = 1000;

const spin1 = gs.spinCarnivalWheel('ada');
assert(spin1.success, 'Çark çevirme başarılı olmalı');
assert.equal(gs.state.wheelTicketShards, 1, '1. parçada bilet parçası 1 olmalı');
assert.equal(gs.state.lotteryTickets, 0, '1. parçada henüz bilet verilmemeli');

const spin2 = gs.spinCarnivalWheel('ada');
assert(spin2.success, 'Çark çevirme başarılı olmalı');
assert.equal(gs.state.wheelTicketShards, 2, '2. parçada bilet parçası 2 olmalı');
assert.equal(gs.state.lotteryTickets, 0, '2. parçada henüz bilet verilmemeli');

const spin3 = gs.spinCarnivalWheel('ada');
assert(spin3.success, 'Çark çevirme başarılı olmalı');
assert.equal(gs.state.wheelTicketShards, 0, '3. parçada parçalar sıfırlanmalı (-3)');
assert.equal(gs.state.lotteryTickets, 1, '3. parçada tam +1 Piyango/Çark Bileti kazanılmalı');
assert(spin3.rewardSummaryText.includes('+1 Çark Çevirme / Piyango Bileti'), 'Özet metninde bilet kazanımı belirtilmeli');
console.log('✅ 3 Parça = 1 Çark/Piyango Bileti tam olarak doğrulandı.');

// Test 3: ADA Ödülü - Karnaval Hazine Kasasından Karşılanması
console.log('\n[3/5] ADA Ödüllerinin Karnaval Hazine Kasasından Karşılanması Test Ediliyor...');
const preCarnivalAda = treasury.state.pools.carnival;
const preUserAda = gs.state.adAstraBalance;
const mockAdaReward = { id: 'ada_200', name: '200 $ADASTRA Nakit Ödül', icon: '🟣', type: 'ada', amount: 200, valAda: 200 };
GAME_CONFIG.CARNIVAL.WHEEL_REWARDS = [mockAdaReward];

const spinAda = gs.spinCarnivalWheel('ada');
assert(spinAda.success, 'ADA ödüllü çark başarılı olmalı');
// 100 ADA çevirme ücretinden Karnaval hazinesine %10 pay (+10 ADA) girer, 200 ADA ödül çıkar: net -190 ADA (veya -200 payout)
assert.equal(treasury.state.outflow.carnival >= 200, true, 'Karnaval kasasından en az 200 ADA çıkış (outflow) kaydedilmeli');
// Kullanıcı 100 ödedi, 200 kazandı -> net +100
assert.equal(gs.state.adAstraBalance, preUserAda - 100 + 200, 'Kullanıcıya hazineden 200 ADA aktarılmalı');
assert(spinAda.rewardSummaryText.includes('Karnaval Hazinesinden Karşılandı'), 'Açıklamada hazineden karşılandığı belirtilmeli');
console.log('✅ ADA ödülü havadan basılmadı, doğrudan Karnaval Hazine Kasasından ödendi.');

// Test 4: Hammadde Ödülü - AMM DEX Buyback ve Teslimat
console.log('\n[4/5] Hammadde Ödüllerinin AMM DEX Buyback Mekanizması Test Ediliyor...');
const preOutflowCarnival = treasury.state.outflow?.carnival || 0;
const preAmmWoodAda = ammMarket.pools.wood.adAstraReserve;
const preAmmWoodRes = ammMarket.pools.wood.resourceReserve;
const preUserWood = gs.state.inventory.wood || 0;

const mockWoodReward = { id: 'raw_1000_wood', name: '1.000 ADA Değerinde Odun', icon: '🌲', type: 'amm_raw', key: 'wood', adaVal: 1000, valAda: 1000 };
GAME_CONFIG.CARNIVAL.WHEEL_REWARDS = [mockWoodReward];

const pWood = ammMarket.getPrice('wood');
const expectedWoodAmount = Math.round(1000 / pWood);
const expectedWoodCostAda = Math.round(expectedWoodAmount * pWood);

const spinWood = gs.spinCarnivalWheel('ada');
assert(spinWood.success, 'Hammadde ödülü başarılı olmalı');
assert.equal(treasury.state.outflow.carnival, preOutflowCarnival + expectedWoodCostAda, 'Karnaval kasasından buyback tutarı outflow kaydedilmeli');
assert.equal(ammMarket.pools.wood.adAstraReserve, preAmmWoodAda + expectedWoodCostAda, 'AMM DEX havuzuna ADA likiditesi girmeli');
assert.equal(ammMarket.pools.wood.resourceReserve, preAmmWoodRes - expectedWoodAmount, 'AMM DEX havuzundan hammadde satın alınmalı');
assert.equal(gs.state.inventory.wood, preUserWood + expectedWoodAmount, 'Satın alınan odun kullanıcı envanterine teslim edilmeli');
assert(spinWood.rewardSummaryText.includes('Market Buyback'), 'Açıklamada buyback yapıldığı belirtilmeli');
console.log('✅ Hammadde infinit basılmadı; Karnaval Hazinesi ADA bütçesiyle AMM pazarından buyback yapılıp kullanıcıya teslim edildi.');

// Test 5: Teçhizat Parçaları & Pandora Kutu Anahtarları Buyback
console.log('\n[5/5] Teçhizat Parçaları ve Kutu Anahtarları Buyback Test Ediliyor...');
const preOutflowKeys = treasury.state.outflow?.carnival || 0;
const preUserKeys = gs.state.arenaKeys || 0;
const mockKeyReward = { id: 'box_key', name: '1 Pandora Kutusu Anahtarı', icon: '🔑', type: 'key', amount: 1, valAda: 1000 };
GAME_CONFIG.CARNIVAL.WHEEL_REWARDS = [mockKeyReward];

const keyPrice = ammMarket.getPrice('keys') || 1000.0;
const expectedKeyCost = Math.round(1 * keyPrice);

const spinKey = gs.spinCarnivalWheel('ada');
assert(spinKey.success, 'Anahtar ödülü başarılı olmalı');
assert.equal(treasury.state.outflow.carnival, preOutflowKeys + expectedKeyCost, 'Karnaval kasasından anahtar bedeli outflow kaydedilmeli');
assert.equal(gs.state.arenaKeys, preUserKeys + 1, 'Kullanıcıya 1 Pandora Kutusu Anahtarı teslim edilmeli');
assert(spinKey.rewardSummaryText.includes('Market Buyback'), 'Açıklamada buyback yapıldığı belirtilmeli');

// Teçhizat Parçası Testi
const preOutflowFrag = treasury.state.outflow?.carnival || 0;
const preUserFrag = gs.state.inventory.fragments || 0;
const mockFragReward = { id: 'frag_10', name: '10 Teçhizat Parçası', icon: '🧩', type: 'resource', key: 'fragments', amount: 10, valAda: 450 };
GAME_CONFIG.CARNIVAL.WHEEL_REWARDS = [mockFragReward];

const fragPrice = ammMarket.getPrice('fragments') || 45.0;
const expectedFragCost = Math.round(10 * fragPrice);

const spinFrag = gs.spinCarnivalWheel('ada');
assert(spinFrag.success, 'Teçhizat parçası ödülü başarılı olmalı');
assert.equal(treasury.state.outflow.carnival, preOutflowFrag + expectedFragCost, 'Karnaval kasasından teçhizat parçası bedeli outflow kaydedilmeli');
assert.equal(gs.state.inventory.fragments, preUserFrag + 10, 'Kullanıcıya 10 Teçhizat Parçası teslim edilmeli');
assert(spinFrag.rewardSummaryText.includes('Market Buyback'), 'Açıklamada buyback yapıldığı belirtilmeli');

// Restore original rewards
GAME_CONFIG.CARNIVAL.WHEEL_REWARDS = origRewards;

console.log('\n🎉 TÜM KARNAVAL HAZİNE BUYBACK & 3 AMORTİ BİLETİ TESTLERİ %100 BAŞARIYLA TAMAMLANDI! 🎉\n');
