import test from 'node:test';
import assert from 'node:assert/strict';
import { gameState } from '../js/gameState.js';
import { globalPool } from '../js/globalPool.js';
import { GAME_CONFIG } from '../js/config.js';

test('Evrensel Temel Gelir (UBI) & %3 Yapımcı Telifi & %13 Yakım Testi', async (t) => {
  gameState.vanillaReset();

  await t.test('[1/6] Tokenomics Oranları Doğrulaması: %13 Yakım, %3 Yapımcı, %6 UBI, %78 Hazine', () => {
    assert.equal(GAME_CONFIG.TOKEN_BURN_RATE, 0.13, 'Yakım oranı %13 olmalı');
    assert.equal(GAME_CONFIG.CREATOR_ROYALTY_RATE, 0.03, 'Yapımcı telif oranı %3 olmalı');
    assert.equal(GAME_CONFIG.UBI_POOL_RATE, 0.06, 'UBI havuz oranı %6 olmalı');
    assert.equal(GAME_CONFIG.TOKEN_REWARD_POOL_RATE, 0.78, 'Hazine ödül oranı %78 olmalı');
    assert.equal(
      GAME_CONFIG.CREATOR_WALLET_ADDRESS,
      '0x58DBCF66bdd7BfA9da98aDba1965b3794321087C',
      'Yapımcı cüzdan adresi doğru tanımlanmış olmalı'
    );
  });

  await t.test('[2/6] recordTokenSpend Harcamasının 4 Kanala Kusursuz Dağıtımı', () => {
    const spendAmount = 10000;
    const initialBurned = globalPool.state.totalBurned || 0;
    const initialCreator = globalPool.state.creatorRoyaltyTotal || 0;
    const initialUbi = globalPool.state.ubiPool || 0;

    const res = globalPool.recordTokenSpend(spendAmount);

    assert.equal(res.burned, 1300, '%13 yani 1.300 ADA yakılmalı');
    assert.equal(res.creatorRoyalty, 300, '%3 yani 300 ADA yapımcı cüzdanına tahsis edilmeli');
    assert.equal(res.ubiShare, 600, '%6 yani 600 ADA UBI havuzuna eklenmeli');
    assert.equal(res.treasuryShare, 7800, '%78 yani 7.800 ADA hazineye gitmeli');

    assert.equal(globalPool.state.totalBurned, initialBurned + 1300);
    assert.equal(globalPool.state.creatorRoyaltyTotal, initialCreator + 300);
    assert.equal(globalPool.state.ubiPool, initialUbi + 600);
  });

  await t.test('[3/6] 3 Aylık (12 Haftalık) Dağıtım Amortismanı ve Haftalık Bütçe Hesabı', () => {
    globalPool.state.ubiPool = 2400000; // 2.4M ADA
    const info = globalPool.getUbiPoolInfo(1);

    assert.equal(info.amortizationWeeks, 12, 'Amortisman süresi 12 hafta (3 ay) olmalı');
    assert.equal(info.weeklyBudget, 200000, 'Haftalık bütçe 2.4M / 12 = 200.000 ADA olmalı');
  });

  await t.test('[4/6] Seviye 1 vs Seviye 81 Matematiksel Üssel Pay Dağılımı (W(L) = L^1.85)', () => {
    globalPool.state.ubiPool = 2400000;
    const lv1 = globalPool.calculateLevelUbiPayout(1);
    const lv10 = globalPool.calculateLevelUbiPayout(10);
    const lv40 = globalPool.calculateLevelUbiPayout(40);
    const lv81 = globalPool.calculateLevelUbiPayout(81);

    assert(lv1.payout > 0, 'Seviye 1 taban ödül almalı');
    assert(lv10.payout > lv1.payout * 50, 'Seviye 10, Seviye 1 den en az 50 kat fazla pay almalı');
    assert(lv81.payout > lv1.payout * 2000, 'Seviye 81, Seviye 1 den en az 2.000 kat fazla pay almalı');
    assert(lv81.playerWeight > 3000, 'Seviye 81 ağırlığı 3.000 in üzerinde olmalı (~3375)');

    // Kullanıcı Senaryosu: 22.000 ADA'lık havuzda Seviye 1 vs Seviye 3 kesinlikle farklı ve dinamik olmalı
    globalPool.state.ubiPool = 22000;
    const userLv1 = globalPool.calculateLevelUbiPayout(1);
    const userLv3 = globalPool.calculateLevelUbiPayout(3);
    assert.notEqual(userLv1.payout, userLv3.payout, 'Seviye 1 ve Seviye 3 aynı sabit tutarda (5 ADA) kalamaz!');
    assert(userLv3.payout > userLv1.payout * 7, 'Seviye 3, Seviye 1 in en az 7 katı pay almalı');

    // Havuz 22.000'den 50.000'e çıktığında anlık canlı büyüme
    globalPool.state.ubiPool = 50000;
    const updatedLv3 = globalPool.calculateLevelUbiPayout(3);
    assert(updatedLv3.payout > userLv3.payout * 2, 'Havuz doldukça payout anlık olarak artmalı');
  });

  await t.test('[5/6] Envanter / Karakter Paneli Haftalık Claim ve Çift Claim Koruması', () => {
    gameState.state.level = 5;
    gameState.state.lastClaimedUbiEpoch = 0;
    const initialAda = gameState.state.adAstraBalance || 0;

    const claimRes = gameState.claimWeeklyUbi();
    assert.equal(claimRes.success, true, 'İlk claim başarılı olmalı');
    assert(claimRes.amount > 0, 'Dağıtılan ADA pozitif olmalı');
    assert.equal(gameState.state.adAstraBalance, initialAda + claimRes.amount, 'ADA bakiyesi artmalı');
    assert.equal(gameState.state.lastClaimedUbiEpoch, globalPool.state.epochId, 'Epoch ID kaydedilmeli');

    // Aynı hafta ikinci kez claim denemesi engellenmeli
    const secondClaim = gameState.claimWeeklyUbi();
    assert.equal(secondClaim.success, false, 'Aynı hafta mükerrer claim yapılamaz');
    assert(secondClaim.message.includes('zaten talep ettiniz'), 'Kullanıcıya bilgilendirme mesajı verilmeli');
  });

  await t.test('[6/6] Vanilla Reset ile UBI Havuzunun Tohum Değerine Sıfırlanması', () => {
    globalPool.state.ubiPool = 9999999;
    gameState.state.lastClaimedUbiEpoch = 42;

    gameState.vanillaReset();

    assert.equal(gameState.state.lastClaimedUbiEpoch, 0, 'Claim epoch sıfırlanmalı');
    assert.equal(globalPool.state.ubiPool, 2400000, 'UBI havuzu 2.4M başlangıç tohumuna sıfırlanmalı');
  });
});
