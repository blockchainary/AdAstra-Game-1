import assert from 'node:assert';
import { GAME_CONFIG } from '../js/config.js';

console.log('--- 🎪 KARNAVAL ŞANS ÇARKI ÖDÜL ORANLARI DOĞRULAMA TESTİ (v1.08) ---');

const rewards = GAME_CONFIG.CARNIVAL.WHEEL_REWARDS;
assert(Array.isArray(rewards) && rewards.length === 18, 'Çarkta tam 18 ödül dilimi bulunmalı');

const totalWeight = rewards.reduce((sum, r) => sum + (r.weight || 0), 0);
console.log(`Toplam Havuz Ağırlığı: ${totalWeight}`);
assert.equal(totalWeight, 10000, 'Toplam ağırlık tam 10.000 tabanına eşit olmalı');

console.log('\n--- 📊 5 ANA KURAL MATEMATİKSEL KONTROLÜ ---');

// 1. Oto bot gelme oranı %1'in altında olsun
const botReward = rewards.find(r => r.type === 'bot_free' || r.id === 'free_bot_24h');
assert(botReward, '24s Otomasyon botu ödülü bulunmalı');
const botRate = botReward.weight / totalWeight;
const botPct = (botRate * 100).toFixed(2);
console.log(`1. 24s Otomasyon Botu: %${botPct} (Ağırlık: ${botReward.weight})`);
assert(botRate < 0.01, `Oto bot oranı %1'in altında olmalı: %${botPct}`);
console.log('   ✅ KURAL 1 SAĞLANDI: Oto bot oranı %1\'in altında (< %1.00)');

// 2. Teçhizat parçaları gelme oranı %1'in altında olsun
const fragRewards = rewards.filter(r => r.key === 'fragments' || r.id.startsWith('frag_'));
const totalFragWeight = fragRewards.reduce((s, r) => s + r.weight, 0);
const fragRate = totalFragWeight / totalWeight;
const fragPct = (fragRate * 100).toFixed(2);
console.log(`2. Teçhizat Parçaları Toplamı: %${fragPct} (Toplam Ağırlık: ${totalFragWeight})`);
fragRewards.forEach(fr => {
  console.log(`   - ${fr.name}: %${((fr.weight / totalWeight) * 100).toFixed(2)} (Ağırlık: ${fr.weight})`);
});
assert(fragRate < 0.01, `Teçhizat parçaları oranı %1'in altında olmalı: %${fragPct}`);
console.log('   ✅ KURAL 2 SAĞLANDI: Teçhizat parçaları toplam oranı %1\'in altında (< %1.00)');

// 3. Stamina parşömenlerinin gelme oranı %1'in altında olsun
const staminaScroll = rewards.find(r => r.key === 'scroll_stamina' || r.id === 'scroll_stamina');
assert(staminaScroll, '100 Stamina parşömeni bulunmalı');
const staminaRate = staminaScroll.weight / totalWeight;
const staminaPct = (staminaRate * 100).toFixed(2);
console.log(`3. 100 Stamina Doldurma Parşömeni: %${staminaPct} (Ağırlık: ${staminaScroll.weight})`);
assert(staminaRate < 0.01, `Stamina parşömeni oranı %1'in altında olmalı: %${staminaPct}`);
console.log('   ✅ KURAL 3 SAĞLANDI: Stamina parşömeni oranı %1\'in altında (< %1.00)');

// 4. Anahtar gelme oranı %0.1'in altında olsun
const keyReward = rewards.find(r => r.type === 'key' || r.id === 'box_key');
assert(keyReward, 'Pandora kutusu anahtarı bulunmalı');
const keyRate = keyReward.weight / totalWeight;
const keyPct = (keyRate * 100).toFixed(3);
console.log(`4. Pandora Kutusu Anahtarı: %${keyPct} (Ağırlık: ${keyReward.weight})`);
assert(keyRate < 0.001, `Anahtar oranı %0.1'in altında olmalı: %${keyPct}`);
console.log('   ✅ KURAL 4 SAĞLANDI: Anahtar oranı %0.1\'in altında (< %0.100)');

// 5. Alphavax vercel app coin analiz kodu parşömeninin gelme oranı %1'in altında olsun
const analysisReward = rewards.find(r => r.type === 'analysis_code' || r.id === 'coin_analysis_code');
assert(analysisReward, 'Coin analiz kodu ödülü bulunmalı');
const analysisRate = analysisReward.weight / totalWeight;
const analysisPct = (analysisRate * 100).toFixed(2);
console.log(`5. AlphAvax Coin Analiz Kodu: %${analysisPct} (Ağırlık: ${analysisReward.weight})`);
assert(analysisRate < 0.01, `Coin analiz kodu oranı %1'in altında olmalı: %${analysisPct}`);
console.log('   ✅ KURAL 5 SAĞLANDI: Coin analiz kodu oranı %1\'in altında (< %1.00)');

console.log('\n--- 📋 TÜM 18 DİLİMİN GÜNCEL DAĞILIM TABLOSU ---');
let cumulativeProb = 0;
rewards.forEach((r, idx) => {
  const p = (r.weight / totalWeight) * 100;
  cumulativeProb += p;
  console.log(`${(idx + 1).toString().padStart(2, ' ')}. ${r.icon} ${r.name.padEnd(45, ' ')} : %${p.toFixed(3).padStart(6, ' ')} (Ağırlık: ${r.weight.toString().padStart(4, ' ')})`);
});

assert.equal(Math.round(cumulativeProb), 100, 'Kümülatif toplam %100 olmalı');
console.log('\n🎉 TÜM ŞANS ÇARKI ÖDÜL ORANLARI VE 5 TEMEL KURAL %100 BAŞARIYLA DOĞRULANDI! 🎉\n');
