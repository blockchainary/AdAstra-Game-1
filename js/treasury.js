// AdAstra: Genesis Realm v2 — Hazine Defteri (Treasury Ledger)
// ============================================================================
// EKONOMİK ANAYASA — YASA 1: "Ödül basılmaz, transfer edilir."
//
// Hiçbir modül `state.adAstraBalance += x` yazmaz. Her ödül bu defterden
// withdraw() ile çekilir. Havuzda para yoksa ödül otomatik olarak küçülür.
// Bu, oyunun sonsuz para basma yollarını (zindan farmı, kolezyum, world boss)
// yapısal olarak imkânsız kılar: dağıtılan toplam, biriken toplamı aşamaz.
// ============================================================================

import { GAME_CONFIG } from './config.js';

const POOL_IDS = ['dungeon', 'arena', 'worldBoss', 'ammBuyback', 'season'];

export class TreasuryLedger {
  constructor() {
    this.storageKey = 'adastra_treasury_ledger_v1';
    this.state = this.load();
  }

  load() {
    const seed = () => ({
      pools: { dungeon: 180000, arena: 120000, worldBoss: 110000, ammBuyback: 90000, season: 45000 },
      lifetimeDeposited: 0,
      lifetimeWithdrawn: 0,
      lifetimeBurned: 0,
      // Havuz bazında toplam giriş/çıkış — çözünürlük oranı (solvency) için
      inflow: { dungeon: 0, arena: 0, worldBoss: 0, ammBuyback: 0, season: 0 },
      outflow: { dungeon: 0, arena: 0, worldBoss: 0, ammBuyback: 0, season: 0 },
      // Ödül ölçekleme geçmişi (panelde gösterilir)
      lastScaleFactor: 1
    });

    if (typeof localStorage === 'undefined') return seed();
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) return seed();
    try {
      const parsed = JSON.parse(raw);
      const base = seed();
      return {
        ...base,
        ...parsed,
        pools: { ...base.pools, ...(parsed.pools || {}) },
        inflow: { ...base.inflow, ...(parsed.inflow || {}) },
        outflow: { ...base.outflow, ...(parsed.outflow || {}) }
      };
    } catch (e) {
      console.error('Treasury ledger parse error, reseeding:', e);
      return seed();
    }
  }

  save() {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(this.storageKey, JSON.stringify(this.state));
  }

  // ---------------------------------------------------------------------
  // GİRİŞ: Oyuncu harcaması hazineye akar (%22 yakım hariç)
  // ---------------------------------------------------------------------
  deposit(treasuryShare) {
    const amount = Number(treasuryShare);
    if (!isFinite(amount) || amount <= 0) return { allocations: {} };

    const alloc = GAME_CONFIG.TREASURY_ALLOCATION;
    const allocations = {};
    for (const id of POOL_IDS) {
      const cut = amount * (alloc[id] || 0);
      this.state.pools[id] = (this.state.pools[id] || 0) + cut;
      this.state.inflow[id] = (this.state.inflow[id] || 0) + cut;
      allocations[id] = cut;
    }
    this.state.lifetimeDeposited += amount;
    this.save();
    return { allocations };
  }

  recordBurn(amount) {
    if (!isFinite(amount) || amount <= 0) return;
    this.state.lifetimeBurned += amount;
    this.save();
  }

  // ---------------------------------------------------------------------
  // ÇIKIŞ: Ödül talebi. Havuz yetersizse ORANTILI olarak küçültülür.
  // Dönen değer, oyuncunun gerçekten alacağı miktardır.
  // ---------------------------------------------------------------------
  withdraw(poolId, requested) {
    const want = Number(requested);
    if (!POOL_IDS.includes(poolId) || !isFinite(want) || want <= 0) {
      return { granted: 0, requested: Math.max(0, want || 0), scaleFactor: 0, depleted: true };
    }

    const available = this.state.pools[poolId] || 0;
    const floorRatio = GAME_CONFIG.TREASURY_MIN_PAYOUT_RATIO;

    // Bir tek ödül havuzun tamamını süpüremez: tek seferde en fazla %2'si.
    const singleDrawCap = available * GAME_CONFIG.TREASURY_SINGLE_DRAW_CAP;
    let granted = Math.min(want, singleDrawCap);

    // Havuz kritik seviyeye düşerse ödüller kademeli küçülür (yumuşak iniş)
    const health = this.getPoolHealth(poolId);
    if (health < 1) {
      granted *= Math.max(floorRatio, health);
    }

    granted = Math.max(0, Math.min(granted, available));
    if (granted <= 0) {
      return { granted: 0, requested: want, scaleFactor: 0, depleted: true };
    }

    this.state.pools[poolId] = available - granted;
    this.state.outflow[poolId] = (this.state.outflow[poolId] || 0) + granted;
    this.state.lifetimeWithdrawn += granted;
    this.state.lastScaleFactor = granted / want;
    this.save();

    return {
      granted,
      requested: want,
      scaleFactor: granted / want,
      depleted: false,
      poolRemaining: this.state.pools[poolId]
    };
  }

  // Havuz sağlığı: hedef rezervin ne kadarı duruyor? (1 = tam, 0 = boş)
  getPoolHealth(poolId) {
    const target = GAME_CONFIG.TREASURY_TARGET_RESERVE[poolId] || 1;
    return Math.max(0, Math.min(1, (this.state.pools[poolId] || 0) / target));
  }

  getPool(poolId) {
    return this.state.pools[poolId] || 0;
  }

  // AMM fiyat desteği için buyback bütçesi çekilir
  drawBuyback(amount) {
    const available = this.state.pools.ammBuyback || 0;
    const granted = Math.max(0, Math.min(Number(amount) || 0, available));
    if (granted <= 0) return 0;
    this.state.pools.ammBuyback = available - granted;
    this.state.outflow.ammBuyback += granted;
    this.save();
    return granted;
  }

  getSummary() {
    const pools = POOL_IDS.map(id => ({
      id,
      name: GAME_CONFIG.TREASURY_POOL_NAMES[id] || id,
      balance: this.state.pools[id] || 0,
      target: GAME_CONFIG.TREASURY_TARGET_RESERVE[id] || 0,
      health: this.getPoolHealth(id),
      inflow: this.state.inflow[id] || 0,
      outflow: this.state.outflow[id] || 0
    }));

    const totalBalance = pools.reduce((s, p) => s + p.balance, 0);
    const avgHealth = pools.reduce((s, p) => s + p.health, 0) / pools.length;

    return {
      pools,
      totalBalance,
      avgHealth,
      lifetimeDeposited: this.state.lifetimeDeposited,
      lifetimeWithdrawn: this.state.lifetimeWithdrawn,
      lifetimeBurned: this.state.lifetimeBurned,
      // Ödeme gücü: girenin ne kadarı hâlâ dağıtılabilir durumda
      solvency: this.state.lifetimeDeposited > 0
        ? 1 - (this.state.lifetimeWithdrawn / this.state.lifetimeDeposited)
        : 1
    };
  }

  reset() {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(this.storageKey);
    this.state = this.load();
  }
}

export const treasury = new TreasuryLedger();
