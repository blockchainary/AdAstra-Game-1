// Realm of Astra — AMM Swap Motoru (x · y = k)
// ============================================================================
// AMM DEX Dinamik Havuz Mimarisi:
//  • Rezervler AMM_CORRIDORS hedef fiyatlarından türetilir (YASA 3: kıt olan pahalıdır).
//  • Derinlik, haftalık küresel kotanın fiyatı ~%7 hareket ettireceği şekilde seçilir.
//  • %2.00 Market Harcı alınır: %78 Hazine, %13 Kalıcı Yakım, %6 UBI, %3 Telif.
//  • %2.00 Hammadde Yakımı alınır: Alınan/satılan kaynaktan anında yakılıp total arzdan silinir.
//  • Fiyat koridoru UYGULANIR: taban altına inen satış reddedilir, tavan aşımı engellenir.
// ============================================================================

import { GAME_CONFIG } from './config.js';
import { globalPool } from './globalPool.js';
import { treasury } from './treasury.js';

// 🏛️ Lansman / Genesis Değişmez Başlangıç Fiyatları (Tüm düşüşler buna göre hesaplanır)
export const GENESIS_PRICES = {
  wheat: 0.90,       // 🌾 Buğday
  iron: 4.00,        // ⛏️ Demir
  wood: 2.50,        // 🌲 Odun
  fragments: 45.00,  // 🧩 Teçhizat Parçası
  keys: 1000.0,      // 🔑 Arena Anahtarı
  boxes: 10000.0     // 📦 Pandora Kutusu
};

// ⚖️ Hazine Dağıtım Öncelik Ağırlıkları (Ana hammadde üçlüsüne %75 aslan payı)
export const BUYBACK_ASSET_WEIGHTS = {
  wheat: 0.30,       // %30 Aslan Payı (Stamina & Can tüketimi)
  iron: 0.25,        // %25 Ağır Sanayi (Teçhizat & Tamirat)
  wood: 0.20,        // %20 Temel Hammadde (İnşaat & Aletler)
  fragments: 0.10,   // %10 Teçhizat Parçaları
  keys: 0.08,        // %8 Arena Anahtarları
  boxes: 0.07        // %7 Pandora Kutuları
};

// Haftalık küresel kotanın fiyatı ne kadar hareket ettireceği
const TARGET_PRICE_IMPACT = 0.07;

// Kota bilgisi olmayan varlıklar için varsayılan haftalık arz tahmini
const WEEKLY_SUPPLY_FALLBACK = {
  fragments: 9000,
  boxes: 15,
  keys: 50,
  scroll_heal: 1500,
  scroll_stamina: 1000
};

function weeklySupplyOf(key) {
  const cap = GAME_CONFIG.GLOBAL_RESOURCE_CAPS[key];
  if (cap) return cap.totalCap;
  return WEEKLY_SUPPLY_FALLBACK[key] || 1000;
}

// r = kota·(1-etki)/etki  →  bu derinlikte kotanın tamamı fiyatı %etki kadar oynatır
function derivePool(key, meta) {
  const corridor = GAME_CONFIG.AMM_CORRIDORS[key];
  const price = corridor ? corridor.defaultPriceAda : 1;
  const supply = weeklySupplyOf(key);
  const resourceReserve = Math.round(supply * (1 - TARGET_PRICE_IMPACT) / TARGET_PRICE_IMPACT);
  return {
    resourceReserve,
    adAstraReserve: Math.round(resourceReserve * price),
    ...meta
  };
}

function buildDefaultPools() {
  return {
    wheat: derivePool('wheat', { name: 'Buğday', icon: '🌾' }),
    wood: derivePool('wood', { name: 'Odun', icon: '🌲' }),
    iron: derivePool('iron', { name: 'Demir', icon: '⛏️' }),
    fragments: derivePool('fragments', { name: 'Teçhizat Parçaları', icon: '🧩' }),
    boxes: derivePool('boxes', { name: 'Pandora Kutusu', icon: '📦' }),
    keys: derivePool('keys', { name: 'Arena Anahtarı', icon: '🔑' }),
    scroll_heal: derivePool('scroll_heal', { name: 'Ordu İyileştirme Parşömeni', icon: '📜' }),
    scroll_stamina: derivePool('scroll_stamina', { name: '100 Stamina Doldurma Parşömeni', icon: '⚡' })
  };
}

export class AMMMarketEngine {
  constructor() {
    // v10: 40M $ADASTRA Derin AMM Havuzları (10k ADA Pandora Kutusu, 1k ADA Anahtar)
    this.storageKey = 'adastra_amm_pools_v10';
    this.listeners = [];
    this.pools = this.loadPools();
    this.feeStats = this.loadFeeStats();
  }

  // ── Canlı Dinamik Fiyat Abonelik ve Bildirim Sistemi ────────────────
  subscribe(fn) {
    if (typeof fn === 'function') {
      if (!this.listeners) this.listeners = [];
      this.listeners.push(fn);
    }
    return () => {
      if (this.listeners) {
        this.listeners = this.listeners.filter(l => l !== fn);
      }
    };
  }

  notifyPriceChange() {
    if (!this.listeners || this.listeners.length === 0) return;
    const prices = this.getAllPrices();
    this.listeners.forEach(fn => {
      try { fn(prices); } catch (e) { console.error('AMM Price listener error:', e); }
    });
  }

  getAllPrices() {
    const prices = {};
    for (const key of Object.keys(this.pools || {})) {
      prices[key] = this.getPrice(key);
    }
    return prices;
  }

  loadPools() {
    const defaults = buildDefaultPools();
    if (typeof localStorage === 'undefined') return defaults;

    const saved = localStorage.getItem(this.storageKey);
    if (!saved) return defaults;
    try {
      const parsed = JSON.parse(saved);
      const merged = {};
      for (const key of Object.keys(defaults)) {
        merged[key] = parsed[key] && parsed[key].resourceReserve > 0
          ? { ...defaults[key], ...parsed[key] }
          : defaults[key];
      }
      return merged;
    } catch (e) {
      console.error('AMM Pool load error, reseeding:', e);
      return defaults;
    }
  }

  loadFeeStats() {
    if (typeof localStorage === 'undefined') return { collected: 0, burned: 0, burnedResources: { wood: 0, iron: 0, wheat: 0 } };
    try {
      const data = JSON.parse(localStorage.getItem(this.storageKey + '_fees')) || { collected: 0, burned: 0 };
      if (!data.burnedResources) data.burnedResources = { wood: 0, iron: 0, wheat: 0 };
      return data;
    } catch (_) {
      return { collected: 0, burned: 0, burnedResources: { wood: 0, iron: 0, wheat: 0 } };
    }
  }

  getBurnedResources() {
    if (!this.feeStats) this.feeStats = this.loadFeeStats();
    if (!this.feeStats.burnedResources) this.feeStats.burnedResources = { wood: 0, iron: 0, wheat: 0 };
    return {
      wood: Math.round((this.feeStats.burnedResources.wood || 0) * 10) / 10,
      iron: Math.round((this.feeStats.burnedResources.iron || 0) * 10) / 10,
      wheat: Math.round((this.feeStats.burnedResources.wheat || 0) * 10) / 10
    };
  }

  savePools() {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(this.storageKey, JSON.stringify(this.pools));
    localStorage.setItem(this.storageKey + '_fees', JSON.stringify(this.feeStats));
    this.notifyPriceChange();
  }

  // 🏛️ AMM DEX Havuzlarını İlk 40M $ADASTRA Tohum Dağıtımına Sıfırla
  resetPools() {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.storageKey);
      localStorage.removeItem(this.storageKey + '_fees');
    }
    this.pools = buildDefaultPools();
    this.feeStats = { collected: 0, burned: 0, burnedResources: { wood: 0, iron: 0, wheat: 0 } };
    this.savePools();
    return this.pools;
  }

  // AMM DEX Toplam $ADASTRA Likidite Rezervi
  getTotalAdAstraLiquidity() {
    let total = 0;
    for (const pool of Object.values(this.pools || {})) {
      total += (pool.adAstraReserve || 0);
    }
    return Math.round(total);
  }

  // ── Fiyatlandırma ───────────────────────────────────────────────────
  getPrice(resourceKey) {
    const pool = this.pools[resourceKey];
    if (!pool || pool.resourceReserve <= 0) return 0;
    return pool.adAstraReserve / pool.resourceReserve;
  }

  getCorridor(resourceKey) {
    return GAME_CONFIG.AMM_CORRIDORS[resourceKey] || null;
  }

  // Fiyatın koridor içindeki konumu: 0 = taban, 1 = tavan
  getCorridorPosition(resourceKey) {
    const c = this.getCorridor(resourceKey);
    if (!c) return 0.5;
    const p = this.getPrice(resourceKey);
    return Math.max(0, Math.min(1, (p - c.minPriceAda) / (c.maxPriceAda - c.minPriceAda)));
  }

  // dx hammadde sat → dy ADA al  (ücret düşülmüş net)
  getEstimatedAdAstraForSell(resourceKey, resourceAmount) {
    const pool = this.pools[resourceKey];
    if (!pool || resourceAmount <= 0) return 0;
    const gross = (pool.adAstraReserve * resourceAmount) / (pool.resourceReserve + resourceAmount);
    return gross * (1 - GAME_CONFIG.AMM_FEE_RATE);
  }

  // dx hammadde al → dy ADA öde  (ücret eklenmiş brüt)
  getEstimatedCostForBuy(resourceKey, resourceAmount) {
    const pool = this.pools[resourceKey];
    if (!pool || resourceAmount <= 0) return 0;
    if (resourceAmount >= pool.resourceReserve) return Infinity;
    const net = (pool.adAstraReserve * resourceAmount) / (pool.resourceReserve - resourceAmount);
    return net * (1 + GAME_CONFIG.AMM_FEE_RATE);
  }

  getEstimatedResourceForBuy(resourceKey, adAstraAmount) {
    const pool = this.pools[resourceKey];
    if (!pool || adAstraAmount <= 0) return 0;
    const net = adAstraAmount / (1 + GAME_CONFIG.AMM_FEE_RATE);
    return (pool.resourceReserve * net) / (pool.adAstraReserve + net);
  }

  // İstenen kaynak paketinin (odun, demir, buğday vb.) AMM DEX pazarındaki anlık toplam $ADASTRA değeri
  calculateResourcesAdAstraValue(resources = {}) {
    let totalAda = 0;
    const breakdown = {};
    for (const [key, amount] of Object.entries(resources)) {
      const numAmount = Math.max(0, Number(amount) || 0);
      if (numAmount <= 0) {
        breakdown[key] = 0;
        continue;
      }
      let adaVal = 0;
      if (this.pools && this.pools[key] && this.pools[key].resourceReserve > 0) {
        adaVal = this.getEstimatedAdAstraForSell(key, numAmount);
        if (!adaVal || isNaN(adaVal) || adaVal <= 0) {
          adaVal = numAmount * (this.getPrice(key) || 1.0);
        }
      } else {
        const corridor = this.getCorridor ? this.getCorridor(key) : null;
        const fallbackPrice = corridor ? corridor.defaultPriceAda : 1.0;
        adaVal = numAmount * fallbackPrice;
      }
      breakdown[key] = Math.round(adaVal * 100) / 100;
      totalAda += adaVal;
    }
    return {
      totalAda: Math.max(1, Math.round(totalAda)),
      breakdown
    };
  }

  // İşlem sonrası fiyat ne olur? (koridor kontrolü için)
  previewPriceAfterSell(resourceKey, amount) {
    const p = this.pools[resourceKey];
    if (!p) return 0;
    const gross = (p.adAstraReserve * amount) / (p.resourceReserve + amount);
    return (p.adAstraReserve - gross) / (p.resourceReserve + amount);
  }

  previewPriceAfterBuy(resourceKey, amount) {
    const p = this.pools[resourceKey];
    if (!p || amount >= p.resourceReserve) return Infinity;
    const cost = (p.adAstraReserve * amount) / (p.resourceReserve - amount);
    return (p.adAstraReserve + cost) / (p.resourceReserve - amount);
  }

  // ── İşlemler ────────────────────────────────────────────────────────
  executeSell(resourceKey, resourceAmount) {
    const pool = this.pools[resourceKey];
    if (!pool || resourceAmount <= 0) return { success: false, message: 'Geçersiz miktar!' };

    const corridor = this.getCorridor(resourceKey);
    const priceAfter = this.previewPriceAfterSell(resourceKey, resourceAmount);
    if (corridor && priceAfter < corridor.minPriceAda) {
      return {
        success: false,
        message: `⛔ Bu satış ${pool.name} fiyatını koridor tabanının (${corridor.minPriceAda} ADA) altına indirir. Daha küçük bir miktar dene — piyasa taban koruması devrede.`,
        corridorBlocked: true
      };
    }

    const gross = (pool.adAstraReserve * resourceAmount) / (pool.resourceReserve + resourceAmount);
    const fee = gross * GAME_CONFIG.AMM_FEE_RATE;
    const net = gross - fee;
    if (net <= 0) return { success: false, message: 'Kazanç hesaplanamadı!' };

    // 🔥 Hammadde Yakımı (%2 Fee): Satılan malzemeden %2 fee kesilir, anında yakılır ve total arzdan silinir
    const resourceBurnFee = resourceAmount * (GAME_CONFIG.AMM_RESOURCE_FEE_RATE || GAME_CONFIG.AMM_FEE_RATE || 0.02);
    if (resourceBurnFee > 0) {
      if (!this.feeStats.burnedResources) this.feeStats.burnedResources = { wood: 0, iron: 0, wheat: 0 };
      if (this.feeStats.burnedResources[resourceKey] !== undefined) {
        this.feeStats.burnedResources[resourceKey] = (this.feeStats.burnedResources[resourceKey] || 0) + resourceBurnFee;
      }
      if (typeof globalPool !== 'undefined' && typeof globalPool.recordResourceBurn === 'function') {
        globalPool.recordResourceBurn(resourceKey, resourceBurnFee);
      }
    }

    // Havuz: hammadde girer, brüt ADA çıkar
    pool.resourceReserve += resourceAmount;
    pool.adAstraReserve -= gross;

    // %2 Market Komisyonu: Doğrudan Ekosistem Token Harcama & Hazine Dağıtım Motoruna aktarılır:
    // (%78 Hazine 5 Ödül Kasası + %13 Kalıcı Yakım + %6 UBI Temel Gelir + %3 Yapımcı)
    let spendResult = null;
    if (fee > 0 && typeof globalPool !== 'undefined' && typeof globalPool.recordTokenSpend === 'function') {
      spendResult = globalPool.recordTokenSpend(fee);
    }

    const burned = spendResult ? spendResult.burned : (fee * 0.13);
    this.feeStats.collected += fee;
    this.feeStats.burned += burned;
    this.savePools();

    return {
      success: true,
      adAstraReceived: net,
      gross,
      fee,
      burned,
      resourceBurnFee,
      newPrice: this.getPrice(resourceKey),
      resourceName: pool.name,
      icon: pool.icon
    };
  }

  executeBuyAmount(resourceKey, resourceAmount) {
    const pool = this.pools[resourceKey];
    if (!pool || resourceAmount <= 0) return { success: false, message: 'Geçersiz miktar!' };
    if (resourceAmount >= pool.resourceReserve * 0.5) {
      return { success: false, message: `Tek işlemde havuzun yarısından fazlası alınamaz! (Havuz: ${Math.floor(pool.resourceReserve)} ${pool.name})` };
    }

    const corridor = this.getCorridor(resourceKey);
    const priceAfter = this.previewPriceAfterBuy(resourceKey, resourceAmount);
    if (corridor && priceAfter > corridor.maxPriceAda) {
      return {
        success: false,
        message: `⛔ Bu alım ${pool.name} fiyatını koridor tavanının (${corridor.maxPriceAda} ADA) üstüne çıkarır. Daha küçük bir miktar dene — piyasa tavan koruması devrede.`,
        corridorBlocked: true
      };
    }

    const net = (pool.adAstraReserve * resourceAmount) / (pool.resourceReserve - resourceAmount);
    const fee = net * GAME_CONFIG.AMM_FEE_RATE;
    const cost = net + fee;
    if (!isFinite(cost) || cost <= 0) return { success: false, message: 'Maliyet hesaplanamadı!' };

    // 🔥 Hammadde Yakımı (%2 Fee): Satın alınan malzemeden %2 fee kesilir, anında yakılır ve total arzdan silinir
    const resourceBurnFee = resourceAmount * (GAME_CONFIG.AMM_RESOURCE_FEE_RATE || GAME_CONFIG.AMM_FEE_RATE || 0.02);
    if (resourceBurnFee > 0) {
      if (!this.feeStats.burnedResources) this.feeStats.burnedResources = { wood: 0, iron: 0, wheat: 0 };
      if (this.feeStats.burnedResources[resourceKey] !== undefined) {
        this.feeStats.burnedResources[resourceKey] = (this.feeStats.burnedResources[resourceKey] || 0) + resourceBurnFee;
      }
      if (typeof globalPool !== 'undefined' && typeof globalPool.recordResourceBurn === 'function') {
        globalPool.recordResourceBurn(resourceKey, resourceBurnFee);
      }
    }

    pool.adAstraReserve += net;
    pool.resourceReserve -= resourceAmount;

    // %2 Market Komisyonu: Doğrudan Ekosistem Token Harcama & Hazine Dağıtım Motoruna aktarılır
    let spendResult = null;
    if (fee > 0 && typeof globalPool !== 'undefined' && typeof globalPool.recordTokenSpend === 'function') {
      spendResult = globalPool.recordTokenSpend(fee);
    }

    const burned = spendResult ? spendResult.burned : (fee * 0.13);
    this.feeStats.collected += fee;
    this.feeStats.burned += burned;
    this.savePools();

    return {
      success: true,
      cost,
      netCost: net,
      fee,
      burned,
      resourceBurnFee,
      resourceReceived: resourceAmount,
      newPrice: this.getPrice(resourceKey),
      resourceName: pool.name,
      icon: pool.icon
    };
  }

  // ── Hazine destekli buyback ─────────────────────────────────────────
  // Fiyat koridor tabanına yaklaştığında hazine havuzun ADA tarafını besler.
  // Bu, balinaların çekildiği dönemde F2P satış baskısının havuzu kurutmasını
  // engelleyen denge valfidir.
  injectBuyback(resourceKey, adaAmount) {
    const pool = this.pools[resourceKey];
    if (!pool || adaAmount <= 0) return 0;
    pool.adAstraReserve += adaAmount;
    this.savePools();
    return adaAmount;
  }

  // Hangi havuzlar desteğe muhtaç?
  getPoolsNeedingSupport(threshold = 0.18) {
    return Object.keys(this.pools)
      .filter(k => this.getCorridor(k) && this.getCorridorPosition(k) < threshold)
      .map(k => ({ key: k, name: this.pools[k].name, position: this.getCorridorPosition(k), price: this.getPrice(k) }));
  }

  getMarketSummary() {
    return Object.keys(this.pools).map(key => {
      const pool = this.pools[key];
      const corridor = this.getCorridor(key);
      return {
        key,
        name: pool.name,
        icon: pool.icon,
        price: this.getPrice(key),
        resourceReserve: pool.resourceReserve,
        adAstraReserve: pool.adAstraReserve,
        corridor,
        corridorPosition: this.getCorridorPosition(key),
        tvlAda: pool.adAstraReserve * 2
      };
    });
  }

  // ── 6 Varlıklı Dinamik Buyback & Burn Analiz Raporu ───────────────────
  // Düşüşler değişmez Genesis Başlangıç Fiyatlarına ($P_{genesis}$) göre hesaplanır.
  // Ağırlık %75 ana hammadde üçlüsüne (Buğday %30, Demir %25, Odun %20), %25 diğerlerine verilir.
  getBuybackAnalysis(cycleBudgetCap = 0.10) {
    const availableTreasury = (typeof treasury !== 'undefined' && treasury.getPool)
      ? (treasury.getPool('ammBuyback') || 0)
      : 6000000;

    const maxCycleFund = availableTreasury * cycleBudgetCap;
    const assets = ['wheat', 'iron', 'wood', 'fragments', 'keys', 'boxes'];
    const details = [];
    let totalScore = 0;
    let maxUrgency = 0;

    for (const key of assets) {
      const pool = this.pools[key];
      if (!pool) continue;
      const curPrice = this.getPrice(key);
      const genPrice = GENESIS_PRICES[key] || 1.0;
      // Düşüş oranı: sadece başlangıç fiyatının altına indiğinde devreye girer
      const dropRatio = Math.max(0, (genPrice - curPrice) / genPrice);
      // Kuvvet Yasası: %10 düşüşte binde 3, %90 düşüşte %76.8 harcama yoğunluğu
      const urgency = Math.pow(dropRatio, 2.5);
      const weight = BUYBACK_ASSET_WEIGHTS[key] || 0.1;
      const score = weight * urgency;

      totalScore += score;
      if (urgency > maxUrgency) maxUrgency = urgency;

      details.push({
        key,
        name: pool.name,
        icon: pool.icon,
        currentPrice: curPrice,
        genesisPrice: genPrice,
        dropRatio,
        dropPct: Math.round(dropRatio * 1000) / 10,
        urgency,
        weight,
        score
      });
    }

    // Toplam harcanacak bütçe: krizin aciliyetiyle dinamik ölçeklenir
    const totalFundToSpend = totalScore > 0 ? (maxCycleFund * maxUrgency) : 0;

    // Her varlığa düşen pay ve tahmini yakılacak fiziksel adet
    for (const d of details) {
      const share = totalScore > 0 ? (d.score / totalScore) : 0;
      const budget = totalFundToSpend * share;
      let estUnits = 0;
      if (budget > 0 && this.pools[d.key]) {
        estUnits = this.getEstimatedResourceForBuy(d.key, budget);
      }
      d.sharePct = Math.round(share * 1000) / 10;
      d.allocatedBudget = Math.round(budget * 100) / 100;
      d.estimatedUnitsToBurn = Math.round(estUnits * 10) / 10;
    }

    return {
      availableTreasury: Math.round(availableTreasury),
      cycleBudgetCap,
      maxCycleFund: Math.round(maxCycleFund),
      maxUrgency: Math.round(maxUrgency * 10000) / 10000,
      totalFundToSpend: Math.round(totalFundToSpend * 100) / 100,
      assets: details
    };
  }

  // ── Otonom Buyback & Burn Yürütücü (Döngü Başına) ───────────────────
  executeAutonomousBuyback(cycleBudgetCap = 0.10) {
    const analysis = this.getBuybackAnalysis(cycleBudgetCap);
    if (!analysis.totalFundToSpend || analysis.totalFundToSpend <= 1) {
      return {
        success: false,
        executed: false,
        message: 'Tüm varlıklar başlangıç fiyatında veya üzerinde, hazine müdahalesine gerek yok.',
        analysis
      };
    }

    const availableTreasury = (typeof treasury !== 'undefined' && treasury.getPool)
      ? (treasury.getPool('ammBuyback') || 0)
      : 0;

    if (availableTreasury < analysis.totalFundToSpend) {
      return {
        success: false,
        executed: false,
        message: 'Hazine AMM kasasında yeterli bakiye bulunmuyor.',
        analysis
      };
    }

    const reportItems = [];
    let totalActualSpent = 0;
    let totalUnitsBurned = 0;

    for (const item of analysis.assets) {
      if (item.allocatedBudget <= 0) continue;
      const pool = this.pools[item.key];
      if (!pool) continue;

      const budget = item.allocatedBudget;
      const oldPrice = this.getPrice(item.key);

      // Hazineden fon tahsis edilir (treasury.drawBuyback doğrudan sayı döndürür)
      let withdrawn = budget;
      if (typeof treasury !== 'undefined') {
        if (typeof treasury.drawBuyback === 'function') {
          withdrawn = treasury.drawBuyback(budget);
        } else if (typeof treasury.withdraw === 'function') {
          const wRes = treasury.withdraw('ammBuyback', budget);
          withdrawn = typeof wRes === 'object' && wRes ? (wRes.granted || 0) : Number(wRes) || 0;
        }
      }
      if (withdrawn <= 0) continue;

      // AMM Havuzundan satın alınır ($x \cdot y = k$)
      const net = withdrawn / (1 + GAME_CONFIG.AMM_FEE_RATE);
      const unitsToBuy = (pool.resourceReserve * net) / (pool.adAstraReserve + net);

      pool.adAstraReserve += net;
      pool.resourceReserve -= unitsToBuy;

      // 🔥 Kalıcı Yakım (Burn):
      if (!this.feeStats.burnedResources) this.feeStats.burnedResources = {};
      this.feeStats.burnedResources[item.key] = (this.feeStats.burnedResources[item.key] || 0) + unitsToBuy;

      if (typeof globalPool !== 'undefined' && globalPool && typeof globalPool.recordResourceBurn === 'function') {
        globalPool.recordResourceBurn(item.key, unitsToBuy);
      }
      if (typeof window !== 'undefined' && window.gameState && typeof window.gameState.burnResource === 'function') {
        window.gameState.burnResource(item.key, unitsToBuy);
      }

      totalActualSpent += withdrawn;
      totalUnitsBurned += unitsToBuy;

      reportItems.push({
        key: item.key,
        name: item.name,
        icon: item.icon,
        budgetSpent: Math.round(withdrawn * 100) / 100,
        unitsBurned: Math.round(unitsToBuy * 10) / 10,
        oldPrice: Math.round(oldPrice * 1000) / 1000,
        newPrice: Math.round(this.getPrice(item.key) * 1000) / 1000,
        dropPct: item.dropPct
      });
    }

    this.savePools();

    const report = {
      timestamp: Date.now(),
      totalSpent: Math.round(totalActualSpent * 100) / 100,
      totalUnitsBurned: Math.round(totalUnitsBurned * 10) / 10,
      remainingTreasury: (typeof treasury !== 'undefined' && treasury.getPool) ? Math.round(treasury.getPool('ammBuyback')) : 0,
      items: reportItems
    };

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.storageKey + '_last_buyback', JSON.stringify(report));
    }
    this.lastBuybackReport = report;

    return {
      success: true,
      executed: true,
      message: `🎯 Otonom Buyback & Yakım Tamamlandı: ${report.totalSpent.toLocaleString('tr-TR')} ADA ile piyasadan malzemeler alınıp kalıcı olarak yakıldı!`,
      report
    };
  }

  getLastBuybackReport() {
    if (this.lastBuybackReport) return this.lastBuybackReport;
    if (typeof localStorage === 'undefined') return null;
    try {
      return JSON.parse(localStorage.getItem(this.storageKey + '_last_buyback')) || null;
    } catch (_) {
      return null;
    }
  }
}

export const ammMarket = new AMMMarketEngine();
