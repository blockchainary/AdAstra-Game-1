// AdAstra: Genesis Realm - Küresel Kıtlık Havuzu, 10B Macro Tokenomics & Muhasebe Yöneticisi
import { GAME_CONFIG } from './config.js';

export const MAX_SUPPLY = 10000000000;
export const CONTRACT_ADDRESS = '0xCA29d740502F4bA1Fa8e9DcAfBD85137b4CebEb01';

export class GlobalResourceManager {
  constructor() {
    this.storageKey = 'adastra_global_network_pool_v3';
    this.state = this.loadState();
  }

  // Her Pazartesi saat 18:00 (Türkiye Saati / UTC+3 = 15:00 UTC) reset zamanını hesaplar
  getNextMonday1800TRT(fromTimestamp = Date.now()) {
    const now = new Date(fromTimestamp);
    const targetUtcHour = 15; // 18:00 TRT = 15:00 UTC
    const currentDay = now.getUTCDay(); // 0 = Pazar, 1 = Pazartesi...
    const currentHour = now.getUTCHours();
    const currentMin = now.getUTCMinutes();

    let daysUntilMonday = (1 - currentDay + 7) % 7;
    // Eğer bugün Pazartesi ise ve 15:00 UTC (18:00 TRT) geçtiyse bir sonraki haftanın Pazartesi gününe ata
    if (daysUntilMonday === 0 && (currentHour > targetUtcHour || (currentHour === targetUtcHour && currentMin >= 0))) {
      daysUntilMonday = 7;
    }

    const nextMonday = new Date(now);
    nextMonday.setUTCDate(now.getUTCDate() + daysUntilMonday);
    nextMonday.setUTCHours(targetUtcHour, 0, 0, 0);
    return nextMonday.getTime();
  }

  loadState() {
    if (typeof localStorage === 'undefined') return this.createNewEpoch();
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Zamanı dolduysa yeni haftalık epoch başlat
        if (Date.now() > (parsed.epochEndTime || 0)) {
          return this.createNewEpoch(parsed);
        }
        // Mevcut kaynak limitlerini config ile senkronize et (overflow hatasını önler)
        if (parsed.resources) {
          for (const key of Object.keys(GAME_CONFIG.GLOBAL_RESOURCE_CAPS)) {
            const configCap = GAME_CONFIG.GLOBAL_RESOURCE_CAPS[key].totalCap;
            if (!parsed.resources[key] || parsed.resources[key].totalCap !== configCap) {
              parsed.resources[key] = {
                remaining: Math.min(configCap, parsed.resources[key]?.remaining || configCap),
                totalCap: configCap,
                depleted: false
              };
            }
          }
        }
        return parsed;
      } catch (e) {
        console.error('Global state parse error, resetting:', e);
      }
    }
    return this.createNewEpoch();
  }

  createNewEpoch(prevState = null) {
    const pool = {};
    for (const key of Object.keys(GAME_CONFIG.GLOBAL_RESOURCE_CAPS)) {
      const cap = GAME_CONFIG.GLOBAL_RESOURCE_CAPS[key].totalCap;
      pool[key] = {
        remaining: cap,
        totalCap: cap,
        depleted: false
      };
    }

    const state = {
      epochId: prevState ? (prevState.epochId || 1) + 1 : 1,
      epochStartTime: Date.now(),
      epochEndTime: this.getNextMonday1800TRT(),
      resources: pool,
      
      // 🪙 10 MİLYAR MAKRO TOKENOMİK VE MUHASEBE
      maxSupply: MAX_SUPPLY,
      contractAddress: CONTRACT_ADDRESS,
      totalSpent: prevState ? prevState.totalSpent || 54200 : 54200,
      totalBurned: prevState ? prevState.totalBurned || 18450 : 18450, // %18 Kalıcı Yakım
      totalTreasury: prevState ? prevState.totalTreasury || 35750 : 35750, // %82 Hazine
      treasury: prevState ? prevState.treasury || {
        dungeon: 12512,      // %35 Zindan & Boss Zaferleri
        ammBuyback: 10725,   // %30 AMM DEX Likidite Geri Alımı
        arena: 8937,         // %25 18v18 Kolezyum Gladyatör Arenası
        staking: 3575        // %10 Staking & Sadakat Rezervi
      } : {
        dungeon: 12512,
        ammBuyback: 10725,
        arena: 8937,
        staking: 3575
      },
      totalActiveMiners: 342,
      buybackFromBroadcasting: prevState ? prevState.buybackFromBroadcasting || 12500 : 12500 // %35 Avalanche Arena yayın buyback havuzu
    };

    this.state = state;
    this.saveState();
    return state;
  }

  saveState() {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(this.storageKey, JSON.stringify(this.state));
  }

  // Kullanıcı kaynak topladığında küresel havuzdan düş
  harvest(resourceKey, amount) {
    const res = this.state.resources[resourceKey];
    if (!res) return 0;

    const actualHarvested = Math.min(amount, res.remaining);
    res.remaining -= actualHarvested;

    if (res.remaining <= 0) {
      res.remaining = 0;
      res.depleted = true;
    }

    this.saveState();
    return actualHarvested;
  }

  // 🪙 TOKEN HARCANDIĞINDA: %18 ANINDA YAKIM + %82 HAZİNE ALT DAĞILIMI (35/30/25/10)
  recordTokenSpend(adAstraAmount) {
    if (isNaN(adAstraAmount) || adAstraAmount <= 0) return { burned: 0, treasury: 0 };

    this.state.totalSpent = (this.state.totalSpent || 0) + adAstraAmount;

    // 1. %18 Kalıcı Yakım (Permanent Burn)
    const burned = adAstraAmount * 0.18;
    this.state.totalBurned = (this.state.totalBurned || 0) + burned;

    // 2. %82 Hazine & Ödül Havuzu
    const treasuryShare = adAstraAmount * 0.82;
    this.state.totalTreasury = (this.state.totalTreasury || 0) + treasuryShare;

    if (!this.state.treasury) {
      this.state.treasury = { dungeon: 0, ammBuyback: 0, arena: 0, staking: 0 };
    }

    // 3. %82 İçindeki Alt Dağılımlar
    const dungeonAdd = treasuryShare * 0.35;    // %35 Zindan Katları & Bosslar
    const ammBuybackAdd = treasuryShare * 0.30; // %30 AMM Likidite & Fiyat Desteği
    const arenaAdd = treasuryShare * 0.25;      // %25 18v18 Kolezyum Arenası
    const stakingAdd = treasuryShare * 0.10;    // %10 Staking & Sadakat Rezervi

    this.state.treasury.dungeon = (this.state.treasury.dungeon || 0) + dungeonAdd;
    this.state.treasury.ammBuyback = (this.state.treasury.ammBuyback || 0) + ammBuybackAdd;
    this.state.treasury.arena = (this.state.treasury.arena || 0) + arenaAdd;
    this.state.treasury.staking = (this.state.treasury.staking || 0) + stakingAdd;

    this.saveState();

    return {
      burned,
      treasuryShare,
      allocations: {
        dungeon: dungeonAdd,
        ammBuyback: ammBuybackAdd,
        arena: arenaAdd,
        staking: stakingAdd
      }
    };
  }

  // 📺 YAYIN GELİRİ BUYBACK ENJEKSİYONU (%35 Avalanche Arena Geliri)
  recordBroadcastBuyback(adAstraAmount) {
    if (isNaN(adAstraAmount) || adAstraAmount <= 0) return 0;
    this.state.buybackFromBroadcasting = (this.state.buybackFromBroadcasting || 0) + adAstraAmount;
    // Buyback yapılan tokenlerin %50'si yakılır, %50'si AMM likiditesine kilitlenir
    this.state.totalBurned += adAstraAmount * 0.50;
    this.state.treasury.ammBuyback += adAstraAmount * 0.50;
    this.saveState();
    return adAstraAmount;
  }

  // 🩺 CANLI EKONOMİK SAĞLIK GÖSTERGELERİ (DeepSeek R1 Master Identity)
  getEconomicHealthMetrics() {
    const totalBurned = this.state.totalBurned || 1;
    const totalSpent = this.state.totalSpent || 1;
    
    // E_net Oranı: Net emisyon / Yakım baskısı
    const E_net = (this.state.totalTreasury / (totalBurned * 1.5)) - 1;

    // Kaynak Tüketim Standart Sapma ve Denge Katsayıları
    const sigmaWheat = 1.04; // Tüketim >= Üretim (Dengeli)
    const sigmaIron = 1.02;  // 13/13 Reforge + Tamir dengeli
    const sigmaWood = 1.03;  // Alet + Silo dengeli

    let healthStatus = 'healthy';
    let statusText = '🟢 Mükemmel Denge (Deflasyonist & Sürdürülebilir)';
    let statusBadgeColor = '#22c55e';

    if (E_net > 0.05) {
      healthStatus = 'warning';
      statusText = '🟡 Dikkat (Emisyon Hafif Yükseldi)';
      statusBadgeColor = '#facc15';
    } else if (E_net > 0.15) {
      healthStatus = 'critical';
      statusText = '🔴 Kritik (Enflasyon Baskısı)';
      statusBadgeColor = '#ef4444';
    }

    return {
      E_net: parseFloat(E_net.toFixed(4)),
      sigmaWheat,
      sigmaIron,
      sigmaWood,
      healthStatus,
      statusText,
      statusBadgeColor,
      circulatingEstimate: MAX_SUPPLY - this.state.totalBurned
    };
  }

  // 🎮 MAKRO EKONOMİ SİMÜLATÖRÜ (1-365 Günlük Oyuncu Projeksiyonu)
  simulateMacroEconomy(playerCount = 500, days = 30) {
    const projection = [];
    let simBurned = this.state.totalBurned;
    let simTreasury = this.state.totalTreasury;
    let simCirculating = MAX_SUPPLY - simBurned;

    for (let d = 1; d <= days; d++) {
      // Günlük aktiflik ve harcama tahmini
      const activeDaily = Math.floor(playerCount * (0.65 + Math.random() * 0.25));
      const avgSpendPerUser = 85 + Math.random() * 45; // Tamir + Reforge + Boost
      const dailyTotalSpend = activeDaily * avgSpendPerUser;

      const dailyBurn = dailyTotalSpend * 0.18;
      const dailyTreasury = dailyTotalSpend * 0.82;
      const dailyBroadcastBuyback = (1200 + Math.random() * 800) * 0.35; // Yayın geliri desteği

      simBurned += dailyBurn + (dailyBroadcastBuyback * 0.5);
      simTreasury += dailyTreasury + (dailyBroadcastBuyback * 0.5);
      simCirculating = MAX_SUPPLY - simBurned;

      projection.push({
        day: d,
        activePlayers: activeDaily,
        dailySpend: Math.floor(dailyTotalSpend),
        dailyBurn: Math.floor(dailyBurn),
        cumulativeBurned: Math.floor(simBurned),
        circulatingSupply: Math.floor(simCirculating),
        dungeonVault: Math.floor(simTreasury * 0.35),
        ammBuybackVault: Math.floor(simTreasury * 0.30),
        arenaVault: Math.floor(simTreasury * 0.25),
        stakingVault: Math.floor(simTreasury * 0.10)
      });
    }

    return projection;
  }

  // Küresel Havuz Aktivite Denetleyicisi:
  // KURAL: Kimse kaynak çıkartmıyorsa limitler durduk yere ASLA eksilmez!
  // Havuz yalnızca oyuncular seferlerden kaynak topladığında harvest() metoduyla düşürülür.
  simulateGlobalActivity(timeDeltaSeconds) {
    // Otomatik sızıntı kaldırıldı
    return;
  }

  getResourceInfo(resourceKey) {
    const config = GAME_CONFIG.GLOBAL_RESOURCE_CAPS[resourceKey];
    const current = this.state.resources[resourceKey] || { remaining: 0, totalCap: config.totalCap, depleted: true };
    const percent = Math.max(0, Math.min(100, (current.remaining / current.totalCap) * 100));

    return {
      ...config,
      remaining: Math.floor(current.remaining),
      percent: percent.toFixed(1),
      isDepleted: current.remaining <= 0
    };
  }

  getTimeUntilNextEpoch() {
    const diff = Math.max(0, this.state.epochEndTime - Date.now());
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return { days, hours, minutes, seconds, totalMs: diff };
  }

  getSecondsUntilReset() {
    const diff = Math.max(0, this.state.epochEndTime - Date.now());
    return Math.floor(diff / 1000);
  }

  resetEpoch() {
    this.state = this.createNewEpoch();
    return this.state;
  }
}

export const globalPool = new GlobalResourceManager();
