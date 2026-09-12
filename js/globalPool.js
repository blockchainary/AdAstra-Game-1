// AdAstra: Genesis Realm - Küresel Kıtlık Havuzu, 10B Macro Tokenomics & Muhasebe Yöneticisi
import { GAME_CONFIG } from './config.js';

import { treasury } from './treasury.js';

export const MAX_SUPPLY = 10000000000;

// v1'deki adres 43 karakterdi (hex kısmı 41 hane) — geçerli bir EVM adresi
// 0x + 40 hanedir, bu yüzden hiçbir cüzdanda çözülmüyordu (denetim bulgusu F-12).
// Fazladan hane kaldırıldı. GERÇEK sözleşme adresiyle değiştirilmelidir.
export const CONTRACT_ADDRESS = '0xCA29d740502F4bA1Fa8e9DcAfBD85137b4CeBeB0';

export const isValidEvmAddress = (a) => /^0x[a-fA-F0-9]{40}$/.test(String(a || ''));

// Dolaşımdaki arz varsayımı — deflasyon anlatısı MAX_SUPPLY üzerinden değil,
// dolaşım üzerinden kurulmalıdır (F-11). Gerçek rakamla değiştirin.
export const CIRCULATING_SUPPLY_ESTIMATE = 1200000000;

export class GlobalResourceManager {
  constructor() {
    this.storageKey = 'adastra_global_network_pool_v3';
    this.state = this.loadState();
  }

  // Pazar'ı Pazartesiye bağlayan gece 00:01 (Türkiye Saati / UTC+3 = Pazar 21:01 UTC) reset zamanını hesaplar
  getNextWeeklyResetTRT(fromTimestamp = Date.now()) {
    const TRT_OFFSET_MS = 3 * 60 * 60 * 1000;
    const trtNow = new Date(fromTimestamp + TRT_OFFSET_MS);

    const trtDay = trtNow.getUTCDay(); // 0 = Pazar, 1 = Pazartesi...
    const trtHour = trtNow.getUTCHours();
    const trtMin = trtNow.getUTCMinutes();

    let daysUntilMonday = (1 - trtDay + 7) % 7;
    // Eğer bugün Pazartesi ise ve 00:01 TRT geçtiyse sonraki haftanın Pazartesisine (7 gün sonraya) ata
    if (daysUntilMonday === 0 && (trtHour > 0 || (trtHour === 0 && trtMin >= 1))) {
      daysUntilMonday = 7;
    }

    const targetTrt = new Date(trtNow);
    targetTrt.setUTCDate(trtNow.getUTCDate() + daysUntilMonday);
    targetTrt.setUTCHours(0, 1, 0, 0); // 00:01:00.000 TRT

    return targetTrt.getTime() - TRT_OFFSET_MS;
  }

  // Geriye dönük uyumluluk
  getNextMonday1800TRT(fromTimestamp = Date.now()) {
    return this.getNextWeeklyResetTRT(fromTimestamp);
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
      epochEndTime: this.getNextWeeklyResetTRT(),
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

  // 🪙 TOKEN HARCANDIĞINDA: %22 KALICI YAKIM + %78 HAZİNE DEFTERİNE GİRİŞ
  //
  // v2 farkı: hazine payı artık sadece bir sayaç değil, GERÇEK BİR BÜTÇE.
  // treasury.deposit() ile beş havuza dağıtılır ve ödüller yalnızca oradan
  // çekilebilir (YASA 1). Böylece dağıtılan toplam, biriken toplamı aşamaz.
  //
  // Ayrıca bu fonksiyon artık asker alımı, AMM ücreti, anlık iyileştirme ve
  // ekipman tamiri yollarından da çağrılıyor — v1'de bu dört yol muhasebe
  // dışıydı ve 324.000 ADA'lık asker harcaması hiçbir istatistiğe girmiyordu (F-06).
  recordTokenSpend(adAstraAmount) {
    if (isNaN(adAstraAmount) || adAstraAmount <= 0) return { burned: 0, treasuryShare: 0 };

    const burnRate = GAME_CONFIG.TOKEN_BURN_RATE;
    this.state.totalSpent = (this.state.totalSpent || 0) + adAstraAmount;

    const burned = adAstraAmount * burnRate;
    this.state.totalBurned = (this.state.totalBurned || 0) + burned;

    const treasuryShare = adAstraAmount * (1 - burnRate);
    this.state.totalTreasury = (this.state.totalTreasury || 0) + treasuryShare;

    // Hazine defterine gerçek giriş
    const result = treasury.deposit(treasuryShare);
    treasury.recordBurn(burned);

    // Geriye dönük uyumluluk: eski panel alanları defterden beslenir
    this.state.treasury = {
      dungeon: treasury.getPool('dungeon'),
      ammBuyback: treasury.getPool('ammBuyback'),
      arena: treasury.getPool('arena'),
      staking: treasury.getPool('season'),
      worldBoss: treasury.getPool('worldBoss')
    };

    this.saveState();
    return { burned, treasuryShare, allocations: result.allocations };
  }

  // Ödül çekimi — tek geçit. Hiçbir modül bakiyeye doğrudan ADA eklemez.
  withdrawReward(poolId, amount) {
    return treasury.withdraw(poolId, amount);
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

  // 🩺 CANLI EKONOMİK SAĞLIK GÖSTERGELERİ
  //
  // v1'DEKİ İKİ HATA:
  //  1) E_net = hazine/(yakım×1,5) − 1 idi. Yakım her zaman harcamanın %18'i,
  //     hazine her zaman %82'si olduğu için bu oran daima 0,82/0,27−1 = +2,037
  //     değerine yakınsıyordu. Gösterge SABİTTİ — hiçbir şey ölçmüyordu (F-09).
  //  2) Eşik sırası ters yazılmıştı:
  //         if (E_net > 0.05) uyarı; else if (E_net > 0.15) kritik;
  //     0,15'ten büyük her değer zaten 0,05'ten de büyük olduğu için "kritik"
  //     dalı ASLA çalışmıyordu. Panel ne olursa olsun en fazla sarı gösteriyordu.
  //
  // v2'de ölçülen şey ÖDEME GÜCÜ: hazineye giren ile hazineden çıkanın oranı.
  // Bu gerçekten dalgalanır ve gerçekten bir şey söyler.
  getEconomicHealthMetrics() {
    const t = treasury.getSummary();

    // Net emisyon oranı: dağıtılan ödüller / toplanan hazine.
    // > 1 → dağıtım girişten fazla (havuzlar eriyor), < 1 → birikim var.
    const payoutRatio = t.lifetimeDeposited > 0
      ? t.lifetimeWithdrawn / t.lifetimeDeposited
      : 0;
    const E_net = payoutRatio - 1;

    // Kaynak denge katsayıları: artık sabit değil, gerçek havuz tüketiminden.
    const sigmaOf = (key) => {
      const res = this.state.resources[key];
      if (!res || !res.totalCap) return 1;
      const consumedRatio = 1 - (res.remaining / res.totalCap);
      const elapsed = Math.max(1, Date.now() - (this.state.epochStartTime || Date.now()));
      const epochLength = Math.max(1, (this.state.epochEndTime || Date.now()) - (this.state.epochStartTime || Date.now()));
      const expectedRatio = Math.min(1, elapsed / epochLength);
      return expectedRatio > 0 ? +(consumedRatio / expectedRatio).toFixed(3) : 1;
    };

    // ÖNEMLİ: en ağır eşik ÖNCE kontrol edilir.
    let healthStatus, statusText, statusBadgeColor;
    if (E_net > 0.15 || t.avgHealth < 0.25) {
      healthStatus = 'critical';
      statusText = '🔴 Kritik — Ödül havuzları eriyor, dağıtım girişi aşıyor';
      statusBadgeColor = '#ef4444';
    } else if (E_net > 0.05 || t.avgHealth < 0.55) {
      healthStatus = 'warning';
      statusText = '🟡 Dikkat — Emisyon yükseldi, hazine tamponu inceliyor';
      statusBadgeColor = '#facc15';
    } else {
      healthStatus = 'healthy';
      statusText = '🟢 Sağlıklı — Deflasyonist ve sürdürülebilir';
      statusBadgeColor = '#22c55e';
    }

    const circulating = Math.max(0, CIRCULATING_SUPPLY_ESTIMATE - (this.state.totalBurned || 0));

    return {
      E_net: parseFloat(E_net.toFixed(4)),
      payoutRatio: parseFloat(payoutRatio.toFixed(4)),
      treasuryHealth: parseFloat(t.avgHealth.toFixed(3)),
      sigmaWheat: sigmaOf('wheat'),
      sigmaIron: sigmaOf('iron'),
      sigmaWood: sigmaOf('wood'),
      healthStatus,
      statusText,
      statusBadgeColor,
      totalBurned: this.state.totalBurned || 0,
      // Deflasyon DOLAŞIMDAKİ arz üzerinden raporlanır, max supply üzerinden değil
      circulatingEstimate: circulating,
      burnedPctOfCirculating: parseFloat((((this.state.totalBurned || 0) / CIRCULATING_SUPPLY_ESTIMATE) * 100).toFixed(4)),
      treasuryPools: t.pools
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
    this.saveState();
    return this.state;
  }
}

export const globalPool = new GlobalResourceManager();
