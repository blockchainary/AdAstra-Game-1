// AdAstra: Genesis Realm v2 — AMM Swap Motoru (x · y = k)
// ============================================================================
// v1'DEKİ İKİ YAPISAL HATA:
//
//  1) Havuz rezervleri config'teki AMM_CORRIDORS tablosuyla hiç ilişkili değildi.
//     Odun 0,00916 ADA (koridor tabanı 0,10) — 11 kat ucuz. Parça ise 1.000 ADA
//     (koridor tavanı 12) — 83 kat pahalı. Sonuç: tüm küresel haftalık kotanın
//     satışı 6.264 ADA getiriyordu, yani tek askerin üçte biri. Hammadde
//     ekonomisi ekonomik olarak var değildi.
//
//  2) Swap ücreti yoktu. Ücret olmayınca ne likidite geliri, ne işlem başına
//     yakım, ne de fiyat istikrarı vardı.
//
// v2'DE:
//  • Rezervler koridor hedef fiyatından türetilir (YASA 3: kıt olan pahalıdır).
//  • Derinlik, haftalık küresel kotanın fiyatı ~%7 hareket ettireceği şekilde
//    seçilir — piyasa ne donuk ne de manipüle edilebilir olur.
//  • %0,30 ücret alınır: yarısı yakılır, yarısı havuzda kalır.
//  • Fiyat koridoru UYGULANIR: taban altına inen satış reddedilir, hazine
//    buyback ile havuzu destekler.
// ============================================================================

import { GAME_CONFIG } from './config.js';

// Haftalık küresel kotanın fiyatı ne kadar hareket ettireceği
const TARGET_PRICE_IMPACT = 0.07;

// Kota bilgisi olmayan varlıklar için varsayılan haftalık arz tahmini
const WEEKLY_SUPPLY_FALLBACK = { fragments: 9000, boxes: 260, keys: 900 };

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
    wood:      derivePool('wood',      { name: 'Odun', icon: '🌲' }),
    iron:      derivePool('iron',      { name: 'Demir', icon: '⛏️' }),
    wheat:     derivePool('wheat',     { name: 'Buğday', icon: '🌾' }),
    fragments: derivePool('fragments', { name: 'Teçhizat Parçaları', icon: '🧩' }),
    boxes:     derivePool('boxes',     { name: 'Pandora Kutusu', icon: '📦' }),
    keys:      derivePool('keys',      { name: 'Arena Anahtarı', icon: '🔑' })
  };
}

export class AMMMarketEngine {
  constructor() {
    // v7: v6 havuzları bozuk fiyatlarla kaydedilmişti; sürüm artırımı
    // eski localStorage verisinin taşınmasını engeller.
    this.storageKey = 'adastra_amm_pools_v7';
    this.pools = this.loadPools();
    this.feeStats = this.loadFeeStats();
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
    if (typeof localStorage === 'undefined') return { collected: 0, burned: 0 };
    try {
      return JSON.parse(localStorage.getItem(this.storageKey + '_fees')) || { collected: 0, burned: 0 };
    } catch (_) {
      return { collected: 0, burned: 0 };
    }
  }

  savePools() {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(this.storageKey, JSON.stringify(this.pools));
    localStorage.setItem(this.storageKey + '_fees', JSON.stringify(this.feeStats));
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

    // Havuz: hammadde girer, brüt ADA çıkar; ücretin likidite payı havuzda kalır
    pool.resourceReserve += resourceAmount;
    pool.adAstraReserve -= gross;
    const feeToPool = fee * (1 - GAME_CONFIG.AMM_FEE_BURN_SHARE);
    pool.adAstraReserve += feeToPool;

    const burned = fee * GAME_CONFIG.AMM_FEE_BURN_SHARE;
    this.feeStats.collected += fee;
    this.feeStats.burned += burned;
    this.savePools();

    return {
      success: true,
      adAstraReceived: net,
      fee,
      burned,
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

    pool.adAstraReserve += net;
    pool.resourceReserve -= resourceAmount;
    const feeToPool = fee * (1 - GAME_CONFIG.AMM_FEE_BURN_SHARE);
    pool.adAstraReserve += feeToPool;

    const burned = fee * GAME_CONFIG.AMM_FEE_BURN_SHARE;
    this.feeStats.collected += fee;
    this.feeStats.burned += burned;
    this.savePools();

    return {
      success: true,
      cost,
      fee,
      burned,
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

  resetPools() {
    this.pools = buildDefaultPools();
    this.feeStats = { collected: 0, burned: 0 };
    this.savePools();
  }
}

export const ammMarket = new AMMMarketEngine();
