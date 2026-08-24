// AdAstra: Genesis Realm - Automated Market Maker (AMM: x * y = k) Swap Engine
// 180 Günlük Kaynak Üretim Dengesi Başlangıç Havuzu: 1.000.000 ADA Likidite

export class AMMMarketEngine {
  constructor() {
    this.storageKey = 'adastra_amm_pools_v6';
    this.pools = this.loadPools();
  }

  loadPools() {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.wood && parsed.iron && parsed.wheat && parsed.fragments) {
            if (!parsed.boxes) {
              parsed.boxes = { resourceReserve: 4000, adAstraReserve: 100000, name: 'Kilitli Sandık', icon: '📦' };
            }
            if (!parsed.keys) {
              parsed.keys = { resourceReserve: 2850, adAstraReserve: 100000, name: 'Arena Anahtarı', icon: '🔑' };
            }
            return parsed;
          }
        } catch (e) {
          console.error('AMM Pool load error:', e);
        }
      }
    }
    // 180 Günlük Kaynak Üretimi & Likidite Oranı
    return {
      wood: { resourceReserve: 109111140, adAstraReserve: 1000000, name: 'Odun', icon: '🌲' },
      iron: { resourceReserve: 54555480, adAstraReserve: 1000000, name: 'Demir', icon: '⛏️' },
      wheat: { resourceReserve: 218222280, adAstraReserve: 1000000, name: 'Buğday', icon: '🌾' },
      fragments: { resourceReserve: 1000, adAstraReserve: 1000000, name: 'Parça', icon: '🧩' },
      boxes: { resourceReserve: 4000, adAstraReserve: 100000, name: 'Kilitli Sandık', icon: '📦' },
      keys: { resourceReserve: 2850, adAstraReserve: 100000, name: 'Arena Anahtarı', icon: '🔑' }
    };
  }

  savePools() {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.storageKey, JSON.stringify(this.pools));
    }
  }

  // 1 Birim Hammaddenin Anlık Fiyatı ($ADASTRA cinsinden)
  getPrice(resourceKey) {
    const pool = this.pools[resourceKey];
    if (!pool || pool.resourceReserve <= 0) return 0;
    return pool.adAstraReserve / pool.resourceReserve;
  }

  // Hammadde Satıp AdAstra Kazanma Tahmini (dx hammadde sat -> dy ADA al)
  // (x + dx) * (y - dy) = k  =>  dy = (y * dx) / (x + dx)
  getEstimatedAdAstraForSell(resourceKey, resourceAmount) {
    const pool = this.pools[resourceKey];
    if (!pool || resourceAmount <= 0) return 0;
    const x = pool.resourceReserve;
    const y = pool.adAstraReserve;
    return (y * resourceAmount) / (x + resourceAmount);
  }

  // Belirli Miktarda Hammadde Satın Almanın AdAstra Maliyet Tahmini (dx hammadde al -> dy ADA öde)
  // (x - dx) * (y + dy) = k  =>  dy = (y * dx) / (x - dx)
  getEstimatedCostForBuy(resourceKey, resourceAmount) {
    const pool = this.pools[resourceKey];
    if (!pool || resourceAmount <= 0) return 0;
    const x = pool.resourceReserve;
    const y = pool.adAstraReserve;
    if (resourceAmount >= x) return Infinity;
    return (y * resourceAmount) / (x - resourceAmount);
  }

  // Belirli Miktarda AdAstra ile Kaç Hammadde Alınabilir Tahmini (dy ADA ver -> dx hammadde al)
  getEstimatedResourceForBuy(resourceKey, adAstraAmount) {
    const pool = this.pools[resourceKey];
    if (!pool || adAstraAmount <= 0) return 0;
    const x = pool.resourceReserve;
    const y = pool.adAstraReserve;
    return (x * adAstraAmount) / (y + adAstraAmount);
  }

  // Satış İşlemi (dx kadar hammadde sat)
  executeSell(resourceKey, resourceAmount) {
    const pool = this.pools[resourceKey];
    if (!pool || resourceAmount <= 0) return { success: false, message: 'Geçersiz miktar!' };

    const adAstraOut = this.getEstimatedAdAstraForSell(resourceKey, resourceAmount);
    if (adAstraOut <= 0) return { success: false, message: 'Kazanç hesaplanamadı!' };

    // Havuzu Güncelle
    pool.resourceReserve += resourceAmount;
    pool.adAstraReserve -= adAstraOut;
    this.savePools();

    const newPrice = this.getPrice(resourceKey);

    return {
      success: true,
      adAstraReceived: adAstraOut,
      newPrice,
      resourceName: pool.name,
      icon: pool.icon
    };
  }

  // Alış İşlemi (dx kadar hammadde satın al)
  executeBuyAmount(resourceKey, resourceAmount) {
    const pool = this.pools[resourceKey];
    if (!pool || resourceAmount <= 0) return { success: false, message: 'Geçersiz miktar!' };

    if (resourceAmount >= pool.resourceReserve) {
      return { success: false, message: `Havuzda yeterli ${pool.name} likiditesi yok! (Havuz: ${Math.floor(pool.resourceReserve)})` };
    }

    const cost = this.getEstimatedCostForBuy(resourceKey, resourceAmount);
    if (!isFinite(cost) || cost <= 0) return { success: false, message: 'Maliyet hesaplanamadı!' };

    // Havuzu Güncelle
    pool.adAstraReserve += cost;
    pool.resourceReserve -= resourceAmount;
    this.savePools();

    const newPrice = this.getPrice(resourceKey);

    return {
      success: true,
      cost,
      resourceReceived: resourceAmount,
      newPrice,
      resourceName: pool.name,
      icon: pool.icon
    };
  }
}

export const ammMarket = new AMMMarketEngine();
