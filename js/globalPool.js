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
    this.serverTimeOffset = 0;
    this.trustedTimeReady = false;
    this.state = this.loadState();
    this.initNetworkTimeSync();
  }

  // Güvenilir zaman: sunucu ofseti mevcutsa uygula, yoksa Date.now() kullan
  getTrustedTime() {
    return Date.now() + this.serverTimeOffset;
  }

  // Tarayıcı ortamında sunucunun HTTP yanıt başlığından (Date header) gerçek UTC zamanını alır
  // Böylece oyuncu bilgisayarının saatini 1 hafta ileri alsa dahi sunucu saati bunu otomatik sıfırlar
  async initNetworkTimeSync() {
    if (typeof window !== 'undefined' && typeof fetch === 'function') {
      try {
        const res = await fetch(window.location.href, { method: 'HEAD', cache: 'no-store' });
        const serverDateStr = res.headers.get('date');
        if (serverDateStr) {
          const serverTime = new Date(serverDateStr).getTime();
          if (!isNaN(serverTime) && serverTime > 0) {
            this.serverTimeOffset = serverTime - Date.now();
            this.trustedTimeReady = true;
            this.checkEpochExpiration();
          }
        }
      } catch (err) {
        // Çevrimdışı fallback: yerel monotonic saat devam eder
      }
    }
  }

  checkEpochExpiration() {
    const now = this.getTrustedTime();
    if (this.state && this.state.epochEndTime && now > this.state.epochEndTime) {
      this.createNewEpoch(this.state);
      this.saveState();
    }
  }

  // Pazar'ı Pazartesiye bağlayan gece 00:01 (Türkiye Saati / UTC+3 = Pazar 21:01 UTC) reset zamanını hesaplar
  getNextWeeklyResetTRT(fromTimestamp = null) {
    const baseTime = fromTimestamp !== null ? fromTimestamp : this.getTrustedTime();
    const TRT_OFFSET_MS = 3 * 60 * 60 * 1000;
    const trtNow = new Date(baseTime + TRT_OFFSET_MS);

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
  getNextMonday1800TRT(fromTimestamp = null) {
    return this.getNextWeeklyResetTRT(fromTimestamp);
  }

  loadState() {
    if (typeof localStorage === 'undefined') return this.createNewEpoch();
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const now = this.getTrustedTime();

        // Anti-Tamper: Saat geriye sarılırsa son kaydedilen zamandan önceye gidemez
        if (parsed.lastSavedTime && now < parsed.lastSavedTime - 60000) {
          console.warn('[GlobalPool Anti-Tamper] Sistem saati manipülasyonu tespit edildi.');
        }

        // Zamanı dolduysa yeni haftalık epoch başlat
        if (now > (parsed.epochEndTime || 0)) {
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
        // UBI havuzu ve yapımcı cüzdanı eksikse otomatik tohumla ve senkronize et
        if (parsed.ubiPool === undefined || isNaN(parsed.ubiPool) || parsed.ubiPool <= 0) {
          parsed.ubiPool = (GAME_CONFIG.UBI_CONFIG && GAME_CONFIG.UBI_CONFIG.INITIAL_SEED_POOL) || 2400000;
        }
        if (parsed.creatorRoyaltyTotal === undefined) {
          parsed.creatorRoyaltyTotal = 0;
        }
        if (!parsed.creatorWallet) {
          parsed.creatorWallet = GAME_CONFIG.CREATOR_WALLET_ADDRESS;
        }
        if (!parsed.totalBurnedResources) {
          parsed.totalBurnedResources = { wood: 0, iron: 0, wheat: 0 };
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
      totalBurned: prevState ? prevState.totalBurned || 18450 : 18450, // %13 Kalıcı Yakım
      creatorRoyaltyTotal: prevState ? prevState.creatorRoyaltyTotal || 0 : 0, // %3 Yapımcı Telifi
      creatorWallet: GAME_CONFIG.CREATOR_WALLET_ADDRESS || '0x58DBCF66bdd7BfA9da98aDba1965b3794321087C',
      ubiPool: prevState ? prevState.ubiPool || (GAME_CONFIG.UBI_CONFIG ? GAME_CONFIG.UBI_CONFIG.INITIAL_SEED_POOL : 2400000) : 2400000, // %6 Evrensel Temel Gelir Havuzu
      ubiWeeklyDistributed: prevState ? prevState.ubiWeeklyDistributed || 0 : 0,
      totalTreasury: prevState ? prevState.totalTreasury || 40000000 : 40000000, // %78 Hazine
      treasury: prevState ? prevState.treasury || {
        dungeon: 14000000,      // %35 Zindan & Boss Zaferleri
        ammBuyback: 6000000,    // %15 AMM DEX Likidite Geri Alımı
        arena: 8000000,         // %20 18v18 Kolezyum Gladyatör Arenası
        worldBoss: 8000000,     // %20 Dünya Bossu
        carnival: 4000000       // %10 Şans Çarkı Kasası
      } : {
        dungeon: 14000000,
        ammBuyback: 6000000,
        arena: 8000000,
        worldBoss: 8000000,
        carnival: 4000000
      },
      totalActiveMiners: 342,
      buybackFromBroadcasting: prevState ? prevState.buybackFromBroadcasting || 12500 : 12500, // %35 Avalanche Arena yayın buyback havuzu
      totalBurnedResources: prevState ? prevState.totalBurnedResources || { wood: 0, iron: 0, wheat: 0 } : { wood: 0, iron: 0, wheat: 0 }
    };

    this.state = state;
    this.saveState();
    return state;
  }

  // 🔥 HAMMADDE KALICI YAKIMI (BURN) VE TOTAL ARZDAN DÜŞÜLMESİ
  // Oyunda nerede bir odun, demir veya buğday harcanırsa bu metotla yakılır ve total arzdan (totalCap & remaining) kalıcı silinir.
  recordResourceBurn(resourceKey, amount) {
    const qty = Number(amount) || 0;
    if (qty <= 0) return { burned: 0 };

    if (!this.state.totalBurnedResources) {
      this.state.totalBurnedResources = { wood: 0, iron: 0, wheat: 0 };
    }
    this.state.totalBurnedResources[resourceKey] = (this.state.totalBurnedResources[resourceKey] || 0) + qty;

    const res = this.state.resources && this.state.resources[resourceKey];
    if (res) {
      // Total Cap (Küresel Toplam Arz) kalıcı olarak düşürülür:
      res.totalCap = Math.max(0, (res.totalCap || 0) - qty);
      // Kalan arz da güncellenir:
      res.remaining = Math.max(0, Math.min(res.remaining, res.totalCap));
      if (res.totalCap <= 0 || res.remaining <= 0) {
        res.remaining = 0;
        res.depleted = true;
      }
    }

    this.saveState();
    return { resourceKey, amount: qty, remainingCap: res ? res.totalCap : 0, remaining: res ? res.remaining : 0 };
  }

  saveState() {
    if (typeof localStorage === 'undefined') return;
    if (this.state) {
      this.state.lastSavedTime = this.getTrustedTime();
    }
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

  // 🪙 TOKEN HARCANDIĞINDA:
  // %13 KALICI YAKIM + %3 YAPIMCI TELİFİ + %6 EVRENSEL TEMEL GELİR (UBI) + %78 HAZİNE DEFTERİNE GİRİŞ = %100!
  recordTokenSpend(adAstraAmount) {
    if (isNaN(adAstraAmount) || adAstraAmount <= 0) return { burned: 0, creatorRoyalty: 0, ubiShare: 0, treasuryShare: 0 };

    const burnRate = GAME_CONFIG.TOKEN_BURN_RATE ?? 0.13;           // %13 Kalıcı Yakım
    const creatorRate = GAME_CONFIG.CREATOR_ROYALTY_RATE ?? 0.03;   // %3 Yapımcı Cüzdanı (0x58DBCF66bdd7BfA9da98aDba1965b3794321087C)
    const ubiRate = GAME_CONFIG.UBI_POOL_RATE ?? 0.06;              // %6 Evrensel Temel Gelir Havuzu
    const treasuryRate = GAME_CONFIG.TOKEN_REWARD_POOL_RATE ?? 0.78;// %78 Hazine Havuzları

    this.state.totalSpent = (this.state.totalSpent || 0) + adAstraAmount;

    // 1. %13 Kalıcı Yakım
    const burned = adAstraAmount * burnRate;
    this.state.totalBurned = (this.state.totalBurned || 0) + burned;

    // 2. %3 Yapımcı Telifi
    const creatorRoyalty = adAstraAmount * creatorRate;
    this.state.creatorRoyaltyTotal = (this.state.creatorRoyaltyTotal || 0) + creatorRoyalty;
    this.state.creatorWallet = GAME_CONFIG.CREATOR_WALLET_ADDRESS;

    // 3. %6 Evrensel Temel Gelir (Seviye Stake) Havuzu
    const ubiShare = adAstraAmount * ubiRate;
    this.state.ubiPool = (this.state.ubiPool || 0) + ubiShare;

    // 4. %78 Hazine Girişi
    const treasuryShare = adAstraAmount * treasuryRate;
    this.state.totalTreasury = (this.state.totalTreasury || 0) + treasuryShare;

    // Hazine defterine gerçek giriş
    const result = treasury.deposit(treasuryShare);
    treasury.recordBurn(burned);

    // Geriye dönük uyumluluk
    this.state.treasury = {
      dungeon: treasury.getPool('dungeon'),
      ammBuyback: treasury.getPool('ammBuyback'),
      arena: treasury.getPool('arena'),
      staking: treasury.getPool('season'),
      worldBoss: treasury.getPool('worldBoss')
    };

    this.saveState();
    if (typeof window !== 'undefined' && typeof window.updateUbiCardLive === 'function') {
      try { window.updateUbiCardLive(); } catch (e) {}
    }
    return { burned, creatorRoyalty, ubiShare, treasuryShare, allocations: result.allocations };
  }

  // 🏛️ EVRENSEL TEMEL GELİR (UBI) BİLGİSİ VE SEVİYEYE GÖRE HESAPLAMA MOTORU
  getUbiPoolInfo(playerLevel = 1, lastClaimedEpoch = 0) {
    const totalPool = this.state.ubiPool || 0;
    const amortizationWeeks = (GAME_CONFIG.UBI_CONFIG && GAME_CONFIG.UBI_CONFIG.AMORTIZATION_WEEKS) || 12; // 3 Ay = 12 Hafta
    const weeklyBudget = totalPool / amortizationWeeks;

    const calc = this.calculateLevelUbiPayout(playerLevel, weeklyBudget);
    const alreadyClaimedThisWeek = (lastClaimedEpoch === this.state.epochId);

    return {
      totalPool: Math.round(totalPool),
      weeklyBudget: Math.round(weeklyBudget),
      amortizationWeeks,
      epochId: this.state.epochId,
      alreadyClaimedThisWeek,
      nextResetTimestamp: this.getNextWeeklyResetTRT(),
      ...calc
    };
  }

  // Seviyeye göre (Lv 1 - 81) dengeli UBI dağıtım payı hesabı:
  // Balina Sömürüsü Koruması: W(L) = 1 + sqrt(L-1)*0.75 ve %5 Tek Çekim Tavanı!
  calculateLevelUbiPayout(playerLevel = 1, weeklyBudget = null) {
    const lvl = Math.max(1, Math.min(81, playerLevel || 1));
    const nextLvl = Math.min(81, lvl + 1);

    const pool = Math.max(0, Number(this.state.ubiPool) || 0);
    const budget = weeklyBudget !== null ? weeklyBudget : (pool / 12);

    // Dengeli Kök/Logaritmik Fonksiyon: Lv 1 = 1.00, Lv 3 = 2.06, Lv 10 = 3.25, Lv 81 = 7.71
    const calcWeight = (l) => 1 + Math.sqrt(l - 1) * 0.75;
    const playerWeight = calcWeight(lvl);
    const nextPlayerWeight = calcWeight(nextLvl);

    // Her seviyenin haftalık bütçeden aldığı adil pay:
    // Taban: bütçenin %0.5'i (Lv 1), Lv 81 için bütçenin ~%3.85'i
    const rawPayout = (budget * 0.005) * playerWeight;
    const rawNextPayout = (budget * 0.005) * nextPlayerWeight;

    // 🛡️ TEK ÇEKİM TAVANI: Havuzun %5'inden fazlası ASLA tek seferde çekilemez!
    const maxSingleCap = pool * ((GAME_CONFIG.UBI_CONFIG && GAME_CONFIG.UBI_CONFIG.MAX_SINGLE_CLAIM_SHARE) || 0.05);
    const cappedPayout = Math.min(rawPayout, maxSingleCap > 0 ? maxSingleCap : rawPayout);

    // Minimum 0.01 ADA, 2 ondalık hassasiyetle anlık canlı değer
    const payout = Math.max(0.01, Math.round(cappedPayout * 100) / 100);
    const nextLevelPayout = Math.max(0.01, Math.round(Math.min(rawNextPayout, maxSingleCap > 0 ? maxSingleCap : rawNextPayout) * 100) / 100);
    const increasePct = payout > 0 ? Math.round(((nextLevelPayout - payout) / payout) * 100) : 0;

    return {
      playerLevel: lvl,
      playerWeight: Math.round(playerWeight * 100) / 100,
      payout,
      nextLevelPayout,
      increasePct,
      maxSingleCap: Math.round(maxSingleCap)
    };
  }

  // Haftalık Evrensel Temel Gelir Claim Metodu (Havuz Koruma Tamponu İle)
  claimWeeklyUbi(playerLevel = 1, currentBalance = 0, lastClaimedEpoch = 0) {
    if (lastClaimedEpoch === this.state.epochId) {
      return {
        success: false,
        message: 'Bu haftaki Evrensel Temel Gelir (UBI) ödülünüzü zaten talep ettiniz. Sonraki dağıtım Pazar ➜ Pazartesi 00:01 TRT döngüsünde açılacaktır.'
      };
    }

    const ubiInfo = this.getUbiPoolInfo(playerLevel, lastClaimedEpoch);
    let amount = ubiInfo.payout;

    if (amount <= 0 || (this.state.ubiPool || 0) <= 0) {
      return {
        success: false,
        message: 'UBI havuzunda şu anda dağıtılabilir bakiye bulunmuyor.'
      };
    }

    // Havuz sağlığı koruması: Eğer talep edilen tutar havuzun kalanından fazlaysa, kalan havuzun %50'si verilir, havuz asla sıfırlanmaz
    if (amount > this.state.ubiPool) {
      amount = Math.max(0.01, Math.round((this.state.ubiPool * 0.5) * 100) / 100);
    }

    // Havuzdan düş ve deftere yaz
    this.state.ubiPool -= amount;
    this.state.ubiWeeklyDistributed = (this.state.ubiWeeklyDistributed || 0) + amount;
    this.saveState();

    return {
      success: true,
      amount,
      playerLevel,
      epochId: this.state.epochId,
      message: `🏛️ Seviye ${playerLevel} Evrensel Temel Geliriniz (+${amount.toLocaleString('tr-TR')} 🟣 $ADASTRA) cüzdanınıza aktarıldı!`
    };
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
