// AdAstra: Genesis Realm - Gelişmiş Karakter Seviyesi, Ordu, Taverna & Otomasyon Yöneticisi
import { GAME_CONFIG } from './config.js';
import { globalPool } from './globalPool.js';
import { sound } from './audio.js';
import { ammMarket } from './ammMarket.js';
import { treasury } from './treasury.js';
import { createUnit, simulateBattle } from './combat.js';

export class GameStateManager {
  constructor() {
    this.storageKey = 'adastra_player_save_v6';
    this.state = this.loadState();
    this.listeners = [];
    // 🛡️ Amorti İade Havuzu Düzeltmesi: Bilet alınmışsa ve amorti kasası 0 kalmışsa %2 payını anında aktar
    if (this.state.lotteryTickets > 0 && (!this.state.lotteryAmortiPool || this.state.lotteryAmortiPool === 0)) {
      const ticketCost = (GAME_CONFIG.CARNIVAL?.LOTTERY?.TICKET_COST_ADA || 100);
      const amortiRate = (GAME_CONFIG.CARNIVAL?.LOTTERY?.AMORTI_SHARE || 0.02);
      this.state.lotteryAmortiPool = Math.round(this.state.lotteryTickets * ticketCost * amortiRate);
      this.saveState();
    }
    // 🗑️ Sefer Hızlandırıcı İksirlerin Sistemden Tamamen Temizlenmesi
    if (this.state.activeBuffs) {
      delete this.state.activeBuffs['speed_potion_1'];
      delete this.state.activeBuffs['speed_potion_2'];
      delete this.state.activeBuffs['speed_potion_3'];
    }
    if (typeof ammMarket !== 'undefined' && ammMarket && ammMarket.subscribe) {
      ammMarket.subscribe(() => {
        this.tickUpgradeCostBot(0);
        this.notifyListeners();
      });
    }
  }

  subscribe(fn) {
    if (typeof fn === 'function') {
      this.listeners.push(fn);
    }
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  notifyListeners() {
    if (!this.listeners) return;
    this.listeners.forEach(fn => {
      try { fn(this.state); } catch (e) { console.error('Listener error:', e); }
    });
  }

  loadState() {
    let parsed = {};
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        try {
          parsed = JSON.parse(saved) || {};
          delete parsed.dailyQuests;
        } catch (e) {
          console.error('Save state error:', e);
        }
      }
    }
    return {
      ...GAME_CONFIG.STARTING_PROFILE,
      ...parsed,
      inventory: { ...GAME_CONFIG.STARTING_PROFILE.inventory, ...(parsed.inventory || {}) },
      tools: this.mergeTools(parsed.tools),
      army: { ...GAME_CONFIG.STARTING_PROFILE.army, ...(parsed.army || {}) },
      warehouseLevel: parsed.warehouseLevel || 1,
      activeBuffs: parsed.activeBuffs || {},
      activeExpeditions: parsed.activeExpeditions || {},
      lockedBoxes: parsed.lockedBoxes || 0,
      arenaKeys: parsed.arenaKeys || 0,
      genesisNftMinted: parsed.genesisNftMinted || false,
      equipment: {
        weapon: null,
        helmet: null,
        armor: null,
        legs: null,
        boots: null,
        ...(parsed.equipment || {})
      },
      armoryInventory: Array.isArray(parsed.armoryInventory) ? parsed.armoryInventory : [],
      collectionArtifacts: this.mergeCollectionArtifacts(parsed.collectionArtifacts),
      soldierUnits: this.mergeSoldierUnits(parsed.soldierUnits),
      dungeonMonsterCurrentHp: parsed.dungeonMonsterCurrentHp || {},
      lotteryTickets: parsed.lotteryTickets || 0,
      lotteryPool: (parsed.lotteryPool != null && parsed.lotteryPool >= 20000000) ? parsed.lotteryPool : (GAME_CONFIG.LOTTERY?.SEED_POOL_ADA || 20000000),
      lotteryAmortiPool: (parsed.lotteryAmortiPool != null && parsed.lotteryAmortiPool > 0)
        ? parsed.lotteryAmortiPool
        : Math.round((parsed.lotteryTickets || 0) * (GAME_CONFIG.CARNIVAL?.LOTTERY?.TICKET_COST_ADA || 100) * (GAME_CONFIG.CARNIVAL?.LOTTERY?.AMORTI_SHARE || 0.02)),
      wheelTicketShards: parsed.wheelTicketShards || 0,
      botSiloAutoUpgrade: parsed.botSiloAutoUpgrade !== undefined ? parsed.botSiloAutoUpgrade : true,
      botActiveUntil: parsed.botActiveUntil || 0,
      redeemCodes: Array.isArray(parsed.redeemCodes) ? parsed.redeemCodes : [],
      burnedResources: parsed.burnedResources || { wood: 0, iron: 0, wheat: 0 },
      carnivalBurnedResources: parsed.carnivalBurnedResources || { wood: 0, iron: 0, wheat: 0 }
    };
  }

  // 18 Koleksiyon Eserinin Kayıtlı Keşif Durumunu GAME_CONFIG Listesiyle Birleştirir
  mergeCollectionArtifacts(saved) {
    const savedMap = new Map((Array.isArray(saved) ? saved : []).map(a => [a.id, a]));
    return GAME_CONFIG.COLLECTION_ARTIFACTS.map(cfg => {
      const existing = savedMap.get(cfg.id);
      return {
        id: cfg.id,
        discovered: existing ? !!existing.discovered : false,
        discoveredAt: existing ? (existing.discoveredAt || null) : null
      };
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ASKER BİRİMİ — TEK TİP ASKER + SKILL LOADOUT & TAKTİKSEL MEVZİ
  // ═══════════════════════════════════════════════════════════════════════
  // Askerler sınıf kısıtı olmaksızın eşit Whitepaper stat eğrisini ($100 + 25*(L-1)$ HP,
  // $25 + 6*(L-1)$ ATK) takip eder. Taktiksel farklılaşma, her askerin taşıdığı
  // bağımsız Skill Loadout (1-3 aktif + pasif yetenek) ve Ön/Arka Saf (row) konumundan gelir.

  createSoldierUnit(index) {
    const level = 1;
    const maxHp = GAME_CONFIG.SOLDIER_MAX_HP || 100;
    const baseAtk = GAME_CONFIG.SOLDIER_BASE_ATK || 25;

    // İlk askere Kalkan Duvarı, 2. askere Şok Dalgası, 3. askere Sahra Merhemi vb. dengeli dağılım
    const initialSkills = (index === 1) ? ['shieldWall']
      : (index === 2) ? ['shockwave']
      : (index === 3) ? ['fieldMedic']
      : (index === 4) ? ['armorBreaker']
      : ['shieldWall'];

    return {
      id: `soldier_${Date.now()}_${index}`,
      name: `AdAstra Şampiyonu #${index}`,
      class: 'adastra_champion',
      classId: 'adastra_champion',
      className: 'AdAstra Şampiyonu',
      icon: '⚔️',
      row: index <= 2 ? 'front' : 'back',
      skills: initialSkills,
      level,
      xp: 0,
      maxHp,
      hp: maxHp,
      baseAtk,
      atk: baseAtk,
      baseArmor: 10,
      baseSpeed: 10,
      baseCrit: 0.05,
      basePen: 5,
      woundedUntil: 0,
      equipment: { weapon: null, helmet: null, armor: null, legs: null, boots: null }
    };
  }

  mergeTools(saved) {
    const defaults = {
      axe: { durability: 4320, totalGathered: 0 },
      pickaxe: { durability: 4320, totalGathered: 0 },
      sickle: { durability: 4320, totalGathered: 0 }
    };
    if (!saved) return defaults;
    const merged = { ...defaults, ...saved };
    Object.keys(merged).forEach(k => {
      if (merged[k]) {
        if (merged[k].durability != null && merged[k].durability <= 100) {
          merged[k].durability = Math.round((merged[k].durability / 100) * 4320);
        } else if (merged[k].durability == null) {
          merged[k].durability = 4320;
        }
      }
    });
    return merged;
  }

  mergeSoldierUnits(saved) {
    if (!Array.isArray(saved) || saved.length === 0) {
      return [];
    }
    return saved.map((s, i) => {
      const level = Math.max(1, s.level || 1);
      const maxHp = 100 + (level - 1) * (GAME_CONFIG.SOLDIER_HP_PER_LEVEL || 25);
      const baseAtk = 25 + (level - 1) * (GAME_CONFIG.SOLDIER_ATK_PER_LEVEL || 6);

      // Geriye dönük uyumlu yetenek yükleme
      const skills = s.skills && Array.isArray(s.skills) && s.skills.length > 0
        ? [...s.skills]
        : (i === 0 ? ['shieldWall'] : i === 1 ? ['shockwave'] : ['armorBreaker']);

      return {
        id: s.id || `soldier_${i + 1}`,
        name: `AdAstra Şampiyonu #${i + 1}`,
        class: 'adastra_champion',
        className: 'AdAstra Şampiyonu',
        icon: '⚔️',
        row: s.row || (i < 2 ? 'front' : 'back'),
        skills,
        level,
        xp: s.xp || 0,
        maxHp: s.maxHp || maxHp,
        hp: s.hp != null ? Math.min(s.hp, s.maxHp || maxHp) : maxHp,
        baseAtk: s.baseAtk || baseAtk,
        baseArmor: 10,
        baseSpeed: 10,
        baseCrit: 0.05,
        basePen: 5,
        woundedUntil: s.woundedUntil || 0,
        equipment: {
          weapon: null, helmet: null, armor: null, legs: null, boots: null,
          ...(s.equipment || {})
        }
      };
    });
  }

  // 🔥 HAMMADDE KALICI YAKIMI (BURN) VE TOTAL ARZDAN DÜŞÜLMESİ
  // Oyunda bir odun, demir veya buğday harcandığında anında yakılır, sayacı artar ve küresel total arzdan silinir.
  burnResource(resourceKey, amount) {
    const qty = Number(amount) || 0;
    if (qty <= 0) return 0;

    if (!this.state.burnedResources) {
      this.state.burnedResources = { wood: 0, iron: 0, wheat: 0 };
    }
    this.state.burnedResources[resourceKey] = (this.state.burnedResources[resourceKey] || 0) + qty;

    try {
      if (typeof globalPool !== 'undefined' && globalPool && typeof globalPool.recordResourceBurn === 'function') {
        globalPool.recordResourceBurn(resourceKey, qty);
      }
    } catch (e) {
      console.warn('globalPool recordResourceBurn error:', e);
    }
    return qty;
  }

  burnResources({ wood = 0, iron = 0, wheat = 0 } = {}) {
    if (wood > 0) this.burnResource('wood', wood);
    if (iron > 0) this.burnResource('iron', iron);
    if (wheat > 0) this.burnResource('wheat', wheat);
  }

  // 🎪 Karnaval Çarkında Anında Yakılan Hammaddeler Sayacı
  recordCarnivalResourceBurn(resourceKey, amount) {
    const qty = Number(amount) || 0;
    if (qty <= 0) return 0;
    if (!this.state.carnivalBurnedResources) {
      this.state.carnivalBurnedResources = { wood: 0, iron: 0, wheat: 0 };
    }
    this.state.carnivalBurnedResources[resourceKey] = (this.state.carnivalBurnedResources[resourceKey] || 0) + qty;
    this.burnResource(resourceKey, qty);
    return qty;
  }

  // Asker satın alma maliyeti: İlk asker 5.000 $ADASTRA, 18. asker 1.800.000 $ADASTRA kademeli artan model
  getSoldierCost(index = (this.state.soldierUnits || []).length + 1) {
    const n = Math.max(1, index);
    const base = GAME_CONFIG.SOLDIER_COST_BASE || 5000;
    if (n === 1) {
      return base;
    }
    if (n === 18 && GAME_CONFIG.SOLDIER_18_TARGET_COST) {
      return GAME_CONFIG.SOLDIER_18_TARGET_COST;
    }
    const exponent = (GAME_CONFIG.SOLDIER_COST_EXPONENT != null) ? GAME_CONFIG.SOLDIER_COST_EXPONENT : 2.0364522367650437;
    const rawCost = base * Math.pow(n, exponent);
    return Math.round(rawCost / 50) * 50;
  }

  buySoldierUnit() {
    if (!Array.isArray(this.state.soldierUnits)) {
      this.state.soldierUnits = [];
    }
    const maxSoldiers = GAME_CONFIG.MAX_SOLDIERS ?? Infinity;
    if (maxSoldiers !== Infinity && this.state.soldierUnits.length >= maxSoldiers) {
      return { success: false, message: `Maksimum ${maxSoldiers} askere zaten sahipsin!` };
    }
    const newIdx = this.state.soldierUnits.length + 1;
    const cost = this.getSoldierCost(newIdx);
    if ((this.state.adAstraBalance || 0) < cost) {
      return { success: false, message: `Yetersiz $ADASTRA! ${newIdx}. asker için ${cost.toLocaleString()} ADA gerekir.` };
    }
    this.state.adAstraBalance -= cost;
    // v1'de bu satır YOKTU: 18 askerlik 324.000 ADA'lık harcama ne yakılıyor
    // ne hazineye giriyordu — muhasebe dışı bir delikti (F-06).
    globalPool.recordTokenSpend(cost);

    const newUnit = this.createSoldierUnit(newIdx);
    this.state.soldierUnits.push(newUnit);
    this.saveState();
    sound.playLevelUp();
    return {
      success: true,
      message: `⚔️ ${newUnit.icon} ${newUnit.name} (${newUnit.className}) orduya katıldı! (-${cost.toLocaleString()} ADA)`,
      soldier: newUnit,
      cost
    };
  }

  renameSoldierUnit(soldierIndex, newName) {
    if (!Array.isArray(this.state.soldierUnits)) return { success: false, message: 'Ordu bulunamadı.' };
    const soldier = this.state.soldierUnits[soldierIndex];
    if (!soldier) return { success: false, message: 'Asker bulunamadı.' };

    const cleanName = (newName || '').trim();
    if (!cleanName) return { success: false, message: 'Asker ismi boş bırakılamaz.' };
    if (cleanName.length > 24) return { success: false, message: 'Asker ismi en fazla 24 karakter olabilir.' };

    const oldName = soldier.name;
    soldier.name = cleanName;
    this.saveState();
    return {
      success: true,
      message: `⚔️ Asker ismi "${cleanName}" olarak güncellendi!`,
      oldName,
      newName: cleanName
    };
  }

  getSoldierSetBonus(soldierIndex) {
    const soldier = (this.state.soldierUnits || [])[soldierIndex];
    if (!soldier) return null;
    const eq = soldier.equipment || {};
    const count = ['weapon', 'helmet', 'armor', 'legs', 'boots'].filter(slot => {
      const item = eq[slot] || (this.state.equipment ? this.state.equipment[slot] : null);
      return item && (item.durability === undefined || item.durability > 0);
    }).length;

    if (count >= 5 && GAME_CONFIG.EQUIPMENT_SET_BONUSES && GAME_CONFIG.EQUIPMENT_SET_BONUSES[5]) return { count, ...GAME_CONFIG.EQUIPMENT_SET_BONUSES[5] };
    if (count >= 4 && GAME_CONFIG.EQUIPMENT_SET_BONUSES && GAME_CONFIG.EQUIPMENT_SET_BONUSES[4]) return { count, ...GAME_CONFIG.EQUIPMENT_SET_BONUSES[4] };
    if (count >= 2 && GAME_CONFIG.EQUIPMENT_SET_BONUSES && GAME_CONFIG.EQUIPMENT_SET_BONUSES[2]) return { count, ...GAME_CONFIG.EQUIPMENT_SET_BONUSES[2] };
    return null;
  }

  getSoldierFullStats(soldierIndex) {
    const soldier = (this.state.soldierUnits || [])[soldierIndex];
    if (!soldier) return null;

    let bonusAtk = 0;
    let bonusHp = 0;
    const eq = soldier.equipment || {};

    ['weapon', 'helmet', 'armor', 'legs', 'boots'].forEach(slot => {
      const item = eq[slot] || (this.state.equipment ? this.state.equipment[slot] : null);
      if (item && (item.durability === undefined || item.durability > 0)) {
        bonusAtk += (item.atkBonus || 0);
        bonusHp += (item.hpBonus || 0);
      }
    });

    const setBonus = this.getSoldierSetBonus(soldierIndex);
    const atkMult = setBonus ? setBonus.atkMultiplier : 1.0;
    const hpMult = setBonus ? setBonus.hpMultiplier : 1.0;

    const baseAtk = soldier.baseAtk || 20;
    const baseHp = soldier.maxHp || 100;

    return {
      totalAtk: Math.round((baseAtk + bonusAtk) * atkMult),
      totalMaxHp: Math.round((baseHp + bonusHp) * hpMult),
      bonusAtk,
      bonusHp,
      setBonus
    };
  }

  // =========================================================================
  // 🌾 18 KİŞİLİK ORDU: OTOMATİK BUĞDAY İLE PASİF İYİLEŞME DÖNGÜSÜ
  // =========================================================================

  // Belirli bir askerin anlık iyileşme bilgisini (HP, kalan süre, gereken buğday/ada) hesaplar. UI bu metoda dayanır.
  getSoldierHealInfo(soldierIndex) {
    const soldier = (this.state.soldierUnits || [])[soldierIndex];
    if (!soldier) return null;

    const passiveCfg = GAME_CONFIG.SOLDIER_PASSIVE_HEAL || {};
    const fastCfg = GAME_CONFIG.SOLDIER_FAST_HEAL || {};
    const maxHp = soldier.maxHp || 100;
    const hp = Math.min(maxHp, Math.max(0, soldier.hp != null ? soldier.hp : maxHp));
    const missingHp = Math.max(0, maxHp - hp);

    // 24 Saatlik Otomatik Pasif İyileşme Oranları (1 HP = 0.30 Buğday + 0.10 ADA)
    const passiveWheatRate = passiveCfg.wheatPerHp != null ? passiveCfg.wheatPerHp : 0.30;
    const passiveAdaRate = passiveCfg.adaPerHp != null ? passiveCfg.adaPerHp : 0.10;
    const passiveWheatNeeded = Math.round(missingHp * passiveWheatRate * 100) / 100;
    const passiveAdaCost = Math.round(missingHp * passiveAdaRate * 100) / 100;

    // Hızlı Doldurma Oranları (24 Saatlik Formülün 10 Katı: 1 HP = 3 Buğday + 1 ADA)
    const fastWheatRate = fastCfg.wheatPerHp != null ? fastCfg.wheatPerHp : 3.0;
    const fastAdaRate = fastCfg.adAstraPerHp != null ? fastCfg.adAstraPerHp : 1.0;
    const wheatNeeded = Math.round(missingHp * fastWheatRate * 100) / 100;
    const adaCost = Math.round(missingHp * fastAdaRate * 100) / 100;

    const fullHealSec = passiveCfg.FULL_HEAL_SECONDS || 86400; // 24 Saat
    const secondsRemaining = missingHp > 0 ? Math.ceil((missingHp / maxHp) * fullHealSec) : 0;
    const wheatInStock = Math.floor(this.state.inventory?.wheat || 0);
    const adaInBalance = Math.floor(this.state.adAstraBalance || 0);
    const isPaused = missingHp > 0 && (wheatInStock <= 0 || adaInBalance <= 0 || wheatInStock < 0.30 || adaInBalance < 0.10);

    return {
      hp: Math.floor(hp),
      maxHp,
      missingHp: Math.ceil(missingHp),
      hpPct: Math.floor((hp / maxHp) * 100),
      isFull: missingHp <= 0,
      isPaused,
      pauseMessage: isPaused ? 'Hesabınızda yeteri kadar $ADASTRA veya Buğday yok! Askerlerin iyileşmesi durduruldu.' : null,
      // 24 Saatlik Otomatik Pasif İyileşme
      passiveWheatRate,
      passiveAdaRate,
      passiveWheatNeeded,
      passiveAdaCost,
      // Hızlı Doyurma (10x)
      fastWheatRate,
      fastAdaRate,
      wheatNeeded,
      wheatCost: wheatNeeded,
      adaCost,
      adAstraCost: adaCost,
      secondsRemaining,
      wheatInStock,
      adaInBalance
    };
  }

  // Orduda iyileşmesi gereken ancak kaynak yetersizliğinden durdurulan asker var mı?
  isArmyPassiveHealBlocked() {
    const units = this.state.soldierUnits || [];
    const hasWounded = units.some(s => (s.hp != null ? s.hp : (s.maxHp || 100)) < (s.maxHp || 100));
    if (!hasWounded) return false;

    const wheat = this.state.inventory?.wheat || 0;
    const ada = this.state.adAstraBalance || 0;
    return wheat <= 0 || ada <= 0 || wheat < 0.30 || ada < 0.10;
  }

  // 24 Saatlik Otomatik Pasif Asker İyileşmesi:
  // Her 1 HP için: 24 saat boyunca toplam 0.30 Buğday + 0.10 ADA tüketerek kendi kendine yavaş yavaş dolar.
  // Kural: Hesapta yeteri kadar buğday VEYA $ADASTRA yoksa süreç tamamen durdurulur!
  processSoldierPassiveHealing(deltaSeconds) {
    if (!deltaSeconds || deltaSeconds <= 0) return { wheatRanOut: false, isPaused: false };

    const cfg = GAME_CONFIG.SOLDIER_PASSIVE_HEAL || {};
    const fullHealSec = cfg.FULL_HEAL_SECONDS || 86400; // 24 Saat
    const wheatPerHp = cfg.wheatPerHp != null ? cfg.wheatPerHp : 0.30;
    const adaPerHp = cfg.adaPerHp != null ? cfg.adaPerHp : 0.10;

    const units = this.state.soldierUnits || [];
    let changed = false;
    let anyWounded = false;

    const availableWheat = this.state.inventory?.wheat || 0;
    const availableAda = this.state.adAstraBalance || 0;

    // Temel kural: Bakiye veya buğday yetersizse iyileşme süreci derhal durdurulur!
    if (availableWheat <= 0 || availableAda <= 0) {
      const hasWounded = units.some(s => (s.hp != null ? s.hp : (s.maxHp || 100)) < (s.maxHp || 100));
      if (hasWounded) {
        this.state.isPassiveHealPaused = true;
        this.state.passiveHealPauseReason = 'insufficient_resources';
      }
      return { wheatRanOut: true, adaRanOut: true, isPaused: hasWounded };
    }

    units.forEach(soldier => {
      const maxHp = soldier.maxHp || 100;
      const currentHp = soldier.hp != null ? soldier.hp : maxHp;
      if (currentHp >= maxHp) return;
      anyWounded = true;

      const missingHp = maxHp - currentHp;
      const hpPerSecond = maxHp / fullHealSec;
      const hpGain = Math.min(missingHp, hpPerSecond * deltaSeconds);
      const wheatCost = hpGain * wheatPerHp;
      const adaCost = hpGain * adaPerHp;

      const curW = this.state.inventory?.wheat || 0;
      const curA = this.state.adAstraBalance || 0;

      // Hesapta yeteri kadar buğday ve adastra yoksa hp doldurma süreci durdurulsun
      if (wheatCost > curW || adaCost > curA) {
        this.state.isPassiveHealPaused = true;
        this.state.passiveHealPauseReason = 'insufficient_resources';
        return;
      }

      if (hpGain > 0) {
        this.state.inventory.wheat = Math.max(0, Math.round((curW - wheatCost) * 100) / 100);
        this.burnResource('wheat', wheatCost);
        this.state.adAstraBalance = Math.max(0, Math.round((curA - adaCost) * 100) / 100);
        soldier.hp = Math.min(maxHp, Math.round((currentHp + hpGain) * 100) / 100);
        changed = true;
      }
    });

    if (anyWounded && !this.isArmyPassiveHealBlocked()) {
      this.state.isPassiveHealPaused = false;
    }

    if (changed) this.saveState();
    return { 
      wheatRanOut: this.isArmyPassiveHealBlocked(),
      isPaused: this.isArmyPassiveHealBlocked()
    };
  }

  // '⚡ ANINDA DOYUR & İYİLEŞTİR': Kalan Buğday ihtiyacını + hızlı iyileştirme bedelini (ADA) anında harcayıp HP'yi MaxHP'ye tamamlar.
  instantHealSoldierUnit(soldierIndex) {
    const soldier = (this.state.soldierUnits || [])[soldierIndex];
    if (!soldier) return { success: false, message: 'Asker bulunamadı!' };

    const info = this.getSoldierHealInfo(soldierIndex);
    if (!info || info.isFull) {
      return { success: false, message: `${soldier.name} zaten tam can!` };
    }

    const inv = this.state.inventory;
    if ((inv.wheat || 0) < info.wheatNeeded) {
      return { success: false, message: `⚠️ Yetersiz Buğday! (${info.wheatNeeded} 🌾 gerekli, Depoda: ${info.wheatInStock})` };
    }
    if ((this.state.adAstraBalance || 0) < info.adaCost) {
      return { success: false, message: `⚠️ Yetersiz $ADASTRA! (${info.adaCost} 🟣 ADA gerekli)` };
    }

    inv.wheat -= info.wheatNeeded;
    this.burnResource('wheat', info.wheatNeeded);
    this.state.adAstraBalance -= info.adaCost;
    soldier.hp = soldier.maxHp || 100;

    // 🔥 Hazine Muhasebesi ve Deflasyonist Yakım Entegrasyonu
    // Hızlı doyurulan askerin harcanan ADA bedeli: %22 kalıcı yakılır, %78 hazine havuzlarına aktarılır
    if (info.adaCost > 0) {
      globalPool.recordTokenSpend(info.adaCost);
    }

    sound.playRepair();
    this.saveState();

    return {
      success: true,
      message: `⚡ ${soldier.name} anında tam cana kavuştu! (-${info.wheatNeeded} 🌾 Buğday, -${info.adaCost} 🟣 ADA • 🔥 %22 Yakıldı)`
    };
  }

  healSoldierInstantly(soldierIndex) {
    return this.instantHealSoldierUnit(soldierIndex);
  }

  equipSoldierSlot(soldierIndex, slotKey) {
    const soldier = (this.state.soldierUnits || [])[soldierIndex];
    if (!soldier) return { success: false, message: 'Asker bulunamadı.' };

    const playerEquip = this.state.equipment ? this.state.equipment[slotKey] : null;
    if (!playerEquip) {
      return { success: false, message: `Demirci'de dövülmüş boş bir ${slotKey} bulunamadı! Önce Demirci'de eşya dövmelisin.` };
    }

    if (!soldier.equipment) soldier.equipment = {};
    const oldItem = soldier.equipment[slotKey];

    soldier.equipment[slotKey] = { ...playerEquip };
    delete this.state.equipment[slotKey];

    if (oldItem) {
      this.state.equipment[slotKey] = oldItem;
    }

    sound.playRepair();
    this.saveState();
    return { success: true, message: `🛡️ ${soldier.name} üzerine ${playerEquip.name} başarıyla kuşandırıldı!` };
  }

  unequipSoldierSlot(soldierIndex, slotKey) {
    const soldier = (this.state.soldierUnits || [])[soldierIndex];
    if (!soldier || !soldier.equipment || !soldier.equipment[slotKey]) {
      return { success: false, message: 'Çıkarılacak ekipman yok.' };
    }

    const item = soldier.equipment[slotKey];
    soldier.equipment[slotKey] = null;

    if (!this.state.equipment) this.state.equipment = {};
    if (!this.state.equipment[slotKey]) {
      this.state.equipment[slotKey] = item;
    } else {
      if (!Array.isArray(this.state.armoryInventory)) this.state.armoryInventory = [];
      this.state.armoryInventory.push(item);
    }

    sound.playRepair();
    this.saveState();
    return { success: true, message: `🛡️ ${item.name} kuşanmadan çıkarıldı ve depoya aktarıldı!` };
  }

  saveState() {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.storageKey, JSON.stringify(this.state));
    }
    this.notifyListeners();
  }

  subscribe(callback) {
    this.listeners.push(callback);
  }

  notifyListeners() {
    this.listeners.forEach(fn => fn(this.state));
  }

  // Karakter Seviyesine Göre Sefer Süresi (Lv 1: 18 dakika / 0.3 saat / 1080 saniye, Lv 81: 72 saat / 4320 dakika / 259200 saniye)
  // Formül: DurationMinutes(level) = Math.round(18 + (level - 1) * 53.775)
  getExpeditionDurationMinutes(level = this.state.level) {
    const lvl = Math.max(GAME_CONFIG.EXPEDITION_MIN_LEVEL, Math.min(GAME_CONFIG.EXPEDITION_MAX_LEVEL, level));
    const slope = (GAME_CONFIG.EXPEDITION_MAX_DURATION_MINUTES - GAME_CONFIG.EXPEDITION_MIN_DURATION_MINUTES) / (GAME_CONFIG.EXPEDITION_MAX_LEVEL - GAME_CONFIG.EXPEDITION_MIN_LEVEL);
    return Math.round(GAME_CONFIG.EXPEDITION_MIN_DURATION_MINUTES + slope * (lvl - GAME_CONFIG.EXPEDITION_MIN_LEVEL));
  }

  // Formül: DurationSeconds(level) = Math.round((18 + (level - 1) * 53.775) * 60)
  getExpeditionDurationSeconds(level = this.state.level) {
    const lvl = Math.max(GAME_CONFIG.EXPEDITION_MIN_LEVEL, Math.min(GAME_CONFIG.EXPEDITION_MAX_LEVEL, level));
    const slope = (GAME_CONFIG.EXPEDITION_MAX_DURATION_MINUTES - GAME_CONFIG.EXPEDITION_MIN_DURATION_MINUTES) / (GAME_CONFIG.EXPEDITION_MAX_LEVEL - GAME_CONFIG.EXPEDITION_MIN_LEVEL);
    return Math.round((GAME_CONFIG.EXPEDITION_MIN_DURATION_MINUTES + slope * (lvl - GAME_CONFIG.EXPEDITION_MIN_LEVEL)) * 60);
  }

  // Formül: DurationHours(level) = parseFloat(((18 + (level - 1) * 53.775) / 60).toFixed(2))
  getExpeditionDurationHours(level = this.state.level) {
    return parseFloat((this.getExpeditionDurationMinutes(level) / 60).toFixed(2));
  }

  // Max Stamina — v2: 100 + 25·(L-1)
  // v1'de max 100+20(L-1), sefer maliyeti 25+12(L-1) idi. Üç düğümü paralel
  // işletmek Seviye 3'ten itibaren MATEMATİKSEL OLARAK İMKANSIZ hâle geliyordu
  // (3×49 = 147 > 140). Oyunun temel döngüsü ikinci seviye atlamasında ölüyordu.
  // v2'de 3·maliyet ≤ max eşitsizliği her seviyede korunur (F-14).
  getMaxStamina(level = this.state.level) {
    return GAME_CONFIG.MAX_STAMINA + (level - 1) * GAME_CONFIG.STAMINA_MAX_PER_LEVEL;
  }

  // Sefer maliyeti — v2: 20 + 8·(L-1). Lv.81'de 3 sefer = 1.980 ≤ 2.100 max.
  getExpeditionStaminaCost(level = this.state.level) {
    return Math.round(GAME_CONFIG.STAMINA_COST_PER_EXPEDITION + (level - 1) * GAME_CONFIG.STAMINA_COST_PER_LEVEL);
  }

  // ⚔️ Zindan Savaşı Stamina Maliyeti Hesabı
  // Formül: Asker Sayısı × (BASE_PER_SOLDIER + Zindan Seviyesi)
  // Dengeli RPG Modeli: Asker Başına 5 Stamina + Canavar Seviyesi Başına 1 Stamina
  getDungeonStaminaCost(monsterLevel = 1, soldierCount = 1) {
    const numSoldiers = Number(soldierCount);
    if (isNaN(numSoldiers) || numSoldiers <= 0) return 0;
    const cfg = GAME_CONFIG.DUNGEON_STAMINA_COST_PER_SOLDIER || GAME_CONFIG.DUNGEON_COMBAT_STAMINA || { BASE_PER_SOLDIER: 5 };
    const perSoldierCost = (cfg[monsterLevel] != null)
      ? cfg[monsterLevel]
      : ((cfg.BASE_PER_SOLDIER || 5) + (Number(monsterLevel) || 1));
    return Math.round(numSoldiers * perSoldierCost);
  }

  // Zindan savaşına girmek için stamina yeterli mi kontrol et
  canEnterDungeonBattle(monsterLevel = 1, soldierCount = 1) {
    const cost = this.getDungeonStaminaCost(monsterLevel, soldierCount);
    const curStamina = Math.floor(this.state.stamina || 0);
    const shortfall = Math.max(0, cost - curStamina);
    return {
      canEnter: curStamina >= cost,
      cost,
      current: curStamina,
      currentStamina: curStamina,
      shortfall,
      missing: shortfall
    };
  }

  canEnterDungeon(monsterLevel = 1, soldierCount = 1) {
    return this.canEnterDungeonBattle(monsterLevel, soldierCount);
  }

  // Zindan savaşı başladığında staminayı tahsil et
  deductDungeonStamina(monsterLevel = 1, soldierCount = 1) {
    const check = this.canEnterDungeonBattle(monsterLevel, soldierCount);
    if (!check.canEnter) {
      return {
        success: false,
        cost: check.cost,
        currentStamina: check.currentStamina,
        shortfall: check.shortfall,
        missing: check.shortfall,
        message: `⚠️ Yetersiz Stamina! Bu savaşa ${soldierCount} askerle girmek için ${check.cost} ⚡ Stamina gerekiyor (Mevcut: ${check.currentStamina} ⚡).`
      };
    }

    this.state.stamina = Math.max(0, (this.state.stamina || 0) - check.cost);
    this.saveState();

    return {
      success: true,
      cost: check.cost,
      remainingStamina: Math.floor(this.state.stamina),
      message: `⚡ -${check.cost} Stamina harcandı. (Kalan: ${Math.floor(this.state.stamina)}/${this.getMaxStamina()} ⚡)`
    };
  }

  getFragmentDropRate(level = this.state.level) {
    const clampedLevel = Math.max(1, Math.min(81, level));
    const range = (GAME_CONFIG.FRAGMENT_DROP_MAX || 0.18) - (GAME_CONFIG.FRAGMENT_DROP_MIN || 0.0018);
    return (GAME_CONFIG.FRAGMENT_DROP_MIN || 0.0018) + (clampedLevel - 1) * (range / 80);
  }

  getBoxDropRate(level = this.state.level) {
    const clampedLevel = Math.max(1, Math.min(81, level));
    const range = (GAME_CONFIG.BOX_DROP_MAX || 0.0018) - (GAME_CONFIG.BOX_DROP_MIN || 0.000018);
    return (GAME_CONFIG.BOX_DROP_MIN || 0.000018) + (clampedLevel - 1) * (range / 80);
  }

  formatDropChance(rate) {
    const pct = rate * 100;
    if (pct >= 1) return `%${pct.toFixed(2)}`;
    if (pct >= 0.01) {
      const str3 = pct.toFixed(3);
      if (str3.endsWith('0')) return `%${pct.toFixed(2)}`;
      return `%${str3}`;
    }
    const str4 = pct.toFixed(4);
    if (str4.endsWith('0')) return `%${pct.toFixed(3)}`;
    return `%${str4}`;
  }

  // Doğal Stamina Yenilenmesi (Maksimum Stamina Sınırına Göre)
  regenerateStamina(deltaSeconds) {
    const maxStamina = this.getMaxStamina();
    if (this.state.stamina < maxStamina) {
      const regenAmount = (deltaSeconds / GAME_CONFIG.STAMINA_NATURAL_REGEN_INTERVAL);
      this.state.stamina = Math.min(maxStamina, this.state.stamina + regenAmount);
      this.saveState();
    }
  }

  // 1. Depodan Buğday Harcayarak Stamina Doldurma (+20 Stamina = 63 Buğday)
  // Kural: 1 Stamina doldurmak için dakika başı çıkartılan buğdayın (15) %21'i (3.15 Buğday) gerekir.
  refillStaminaWithWheat(staminaToGain = 20) {
    const inv = this.state.inventory;
    const maxStam = this.getMaxStamina();
    const curStam = this.state.stamina;
    if (curStam >= maxStam) {
      return { success: false, message: 'Stamina zaten tamamen dolu!' };
    }

    const wheatPerStamina = GAME_CONFIG.WHEAT_PER_STAMINA || 3.15; // 3.15 Buğday / 1 Stamina
    const actualGain = Math.min(staminaToGain, maxStam - curStam);
    const requiredWheat = Math.ceil(actualGain * wheatPerStamina);

    if ((Number(inv.wheat) || 0) < requiredWheat) {
      return { success: false, message: `Yetersiz Buğday! +${Math.round(actualGain)} Stamina için ${requiredWheat} Buğday gerekli.` };
    }

    inv.wheat = Math.max(0, inv.wheat - requiredWheat);
    this.burnResource('wheat', requiredWheat);
    this.state.stamina = Math.min(maxStam, curStam + actualGain);
    sound.playStaminaRefill();
    this.saveState();
    return {
      success: true,
      message: `🍞 ${requiredWheat} Buğday tüketildi! +${Math.round(actualGain)} Stamina yenilendi (${Math.floor(this.state.stamina)}/${maxStam})`
    };
  }

  // 1.5 Depodaki Buğday ile İhtiyaç Kadar Stamina Doldurma
  // Kural: 1 Stamina doldurmak için dakika başı çıkartılan buğdayın (15) %21'i (3.15 Buğday) gerekir.
  refillStaminaExact(staminaNeeded) {
    if (!staminaNeeded || staminaNeeded <= 0) return { success: true, wheatUsed: 0, gainedStamina: 0 };
    const inv = this.state.inventory;
    const maxStam = this.getMaxStamina();
    const curStam = this.state.stamina || 0;
    const actualNeeded = Math.min(staminaNeeded, Math.max(0, maxStam - curStam));

    if (actualNeeded <= 0) {
      return { success: true, wheatUsed: 0, gainedStamina: 0, message: 'Stamina zaten yeterli.' };
    }

    const availableWheat = Math.floor(Number(inv.wheat) || 0);
    if (availableWheat <= 0) {
      return { success: false, message: 'Yetersiz Buğday! Depoda hiç buğday yok.' };
    }

    const wheatPerStamina = GAME_CONFIG.WHEAT_PER_STAMINA || 3.15; // 3.15 Buğday / 1 Stamina
    const exactWheatNeeded = Math.ceil(actualNeeded * wheatPerStamina);
    const wheatToUse = Math.min(availableWheat, exactWheatNeeded);

    if (wheatToUse <= 0) {
      return { success: false, message: 'Stamina doldurmak için yeterli buğday yok.' };
    }

    const gainedStamina = wheatToUse / wheatPerStamina;
    inv.wheat = Math.max(0, inv.wheat - wheatToUse);
    this.burnResource('wheat', wheatToUse);
    this.state.stamina = Math.min(maxStam, curStam + gainedStamina);
    sound.playStaminaRefill();
    this.saveState();

    return {
      success: true,
      wheatUsed: wheatToUse,
      gainedStamina,
      message: `⚡ ${wheatToUse} Buğday tüketildi! +${Math.round(gainedStamina)} Stamina yenilendi (${Math.floor(this.state.stamina)}/${maxStam} ⚡)`
    };
  }

  // Depodaki Buğday ile Staminayı Tek Seferde Tamamen Doldurma
  refillStaminaToMaxWithWheat() {
    const maxStam = this.getMaxStamina();
    const curStam = this.state.stamina || 0;
    const needed = maxStam - curStam;
    if (needed <= 0) {
      return { success: false, message: 'Stamina zaten tamamen dolu!' };
    }
    return this.refillStaminaExact(needed);
  }

  // 2. Tavernadan AdAstra Karşılığında Staminayı Fullleme (DEVRE DIŞI - Stamina sadece Buğday ile doldurulabilir)
  instantRefillStamina() {
    return { success: false, message: 'Stamina $ADASTRA ile doldurulamaz! Sadece buğday ile doldurulabilir.' };
  }

  // =========================================================================
  // 1. SEFER BAŞLATMA & TOPLAMA (Süre Seviyeye Göre Uzun Sürer)
  // =========================================================================
  startExpedition(nodeId) {
    const nodeConfig = GAME_CONFIG.GLOBAL_RESOURCE_CAPS[nodeId];
    if (!nodeConfig) return { success: false, message: 'Geçersiz kaynak alanı!' };

    if (this.state.activeExpeditions[nodeId]) {
      return { success: false, message: 'Bu alanda zaten aktif bir sefer devam ediyor!' };
    }

    const staminaCost = this.getExpeditionStaminaCost();
    const resourceDisplayNames = { wood: 'Odun', iron: 'Demir', wheat: 'Buğday' };
    const rName = resourceDisplayNames[nodeId] || (nodeConfig && nodeConfig.name) || nodeId;

    if (this.state.stamina < staminaCost) {
      return {
        success: false,
        isInsufficientStamina: true,
        nodeId,
        staminaCost,
        currentStamina: Math.floor(this.state.stamina),
        message: `⚠️ ${rName} seferini başlatmak için yeteri kadar staminanız bulunmamaktadır.`
      };
    }

    const toolId = nodeConfig.requiredTool;
    const tool = this.state.tools[toolId];
    if (!tool || tool.durability <= 0) {
      sound.playBreakWarning();
      return { success: false, message: `Gereken alet (${GAME_CONFIG.TOOLS[toolId].name}) kırık! Önce tamir etmelisin.` };
    }

    // Seviye Bazlı Süre (Lv 1: 18 dk / 1080 sn, Lv 81: 72 saat / 4320 dk / 259200 sn)
    const minutes = this.getExpeditionDurationMinutes();
    const hours = this.getExpeditionDurationHours();
    let baseDurationSec = this.getExpeditionDurationSeconds();

    // Taverna 1.5x Hız Güçlendirmesi Aktif mi?
    const speedBuffKey = `speed_${nodeId}`;
    if (this.isBuffActive(speedBuffKey)) {
      baseDurationSec = Math.floor(baseDurationSec / 1.5);
    }

    const now = Date.now();
    this.state.stamina -= staminaCost;
    this.state.activeExpeditions[nodeId] = {
      nodeId,
      durationMinutes: minutes,
      durationHours: hours,
      durationSeconds: baseDurationSec,
      elapsedSeconds: 0,
      startedAt: now,
      lastTickAt: now,
      isCompleted: false
    };

    if (toolId === 'axe') sound.playChop();
    else if (toolId === 'pickaxe') sound.playPickaxe();
    else sound.playHarvest();

    this.saveState();
    return { success: true, message: `${hours} Saatlik ${nodeConfig.name} görevi başlatıldı! (-${staminaCost} ⚡)` };
  }

  getExpeditionSpeedMultiplier() {
    return 1.0;
  }

  updateExpeditions(deltaSeconds) {
    let hasChanges = false;
    const now = Date.now();
    const speedMult = this.getExpeditionSpeedMultiplier();
    const isBot = this.isAutoCollectorActive() || this.hasPurchasedBot();

    // 1. En büyük zaman farkını bul (çevrimdışı/arka plan süresi)
    let maxDiff = deltaSeconds || 0;
    for (const nodeId of Object.keys(this.state.activeExpeditions || {})) {
      const exp = this.state.activeExpeditions[nodeId];
      if (exp && !exp.isCompleted && exp.lastTickAt && exp.lastTickAt > 0) {
        const diff = (now - exp.lastTickAt) / 1000;
        if (diff > maxDiff) maxDiff = Math.min(diff, 86400); // En fazla 24 saat
      }
    }

    // 🤖 ÇOKLU DÖNGÜ & ÇEVRİMDIŞI / ARKA PLAN İLERLEME MOTORU (PARALLEL CATCH-UP ENGINE)
    // Eğer bot aktifse ve geçen süre 1 seferden (örn. 1080s) uzunsa:
    // 3 sefer alanını (Odun, Demir, Buğday) paralel simüle ederek ardışık tüm döngüleri işlet!
    if (isBot && maxDiff > 1080) {
      let remainingTime = maxDiff;
      let safetyCounter = 80; // Maksimum 80 sefer (~24 saat)
      while (remainingTime > 0 && safetyCounter-- > 0) {
        let minNeeded = remainingTime;
        let anyActive = false;
        for (const nodeId of ['wood', 'iron', 'wheat']) {
          const exp = this.state.activeExpeditions ? this.state.activeExpeditions[nodeId] : null;
          if (exp && !exp.isCompleted) {
            anyActive = true;
            const needed = Math.max(1, (exp.durationSeconds - (exp.elapsedSeconds || 0)) / speedMult);
            if (needed < minNeeded) minNeeded = needed;
          }
        }

        if (!anyActive) {
          this.runTavernaAutomationCycle();
          hasChanges = true;
          const hasAny = Object.keys(this.state.activeExpeditions || {}).length > 0;
          if (!hasAny || this.isBotPaused()) break;
          continue;
        }

        const stepToApply = Math.min(remainingTime, minNeeded);
        remainingTime -= stepToApply;

        for (const nodeId of ['wood', 'iron', 'wheat']) {
          const exp = this.state.activeExpeditions ? this.state.activeExpeditions[nodeId] : null;
          if (exp && !exp.isCompleted) {
            exp.elapsedSeconds = Math.min(exp.durationSeconds, (exp.elapsedSeconds || 0) + (stepToApply * speedMult));
            exp.lastTickAt = now;
            if (exp.elapsedSeconds >= exp.durationSeconds) {
              exp.isCompleted = true;
            }
          }
        }
        hasChanges = true;

        this.runTavernaAutomationCycle();
        if (this.isBotPaused()) break;
      }

      for (const nodeId of Object.keys(this.state.activeExpeditions || {})) {
        const exp = this.state.activeExpeditions[nodeId];
        if (exp) exp.lastTickAt = now;
      }
      this.saveState();
      return;
    }

    // Normal Frame Akışı (Realtime 60fps)
    for (const nodeId of Object.keys(this.state.activeExpeditions || {})) {
      const exp = this.state.activeExpeditions[nodeId];
      if (exp && !exp.isCompleted) {
        let step = deltaSeconds || 0;
        if (exp.lastTickAt && exp.lastTickAt > 0) {
          const realDiff = (now - exp.lastTickAt) / 1000;
          if (realDiff > 0) {
            step = Math.max(step, Math.min(realDiff, 86400));
          }
        }
        exp.lastTickAt = now;
        if (!exp.startedAt) exp.startedAt = now - (exp.elapsedSeconds * 1000);

        exp.elapsedSeconds = Math.min(exp.durationSeconds, (exp.elapsedSeconds || 0) + (step * speedMult));
        hasChanges = true;

        if (exp.elapsedSeconds >= exp.durationSeconds) {
          exp.elapsedSeconds = exp.durationSeconds;
          exp.isCompleted = true;

          if (isBot) {
            this.runTavernaAutomationCycle();
          }
        }
      }
    }

    if (hasChanges) {
      this._expSaveThrottle = (this._expSaveThrottle || 0) + 1;
      if (this._expSaveThrottle >= 60) {
        this._expSaveThrottle = 0;
        this.saveState();
      }
    }
  }

  // 🤖 24 SAATLİK TAVERNA OTONOM SEFER, HASAT, TAMİR, STAMİNA & SİLO MOTORU
  // Sıralama:
  // 1. Önce sefer kaynaklarını topla (hasat depoya girsin, eksikler tamamlansın)
  // 2. Aletleri onar
  // 3. Staminayı sadece bir sonraki seferleri karşılayacak kadar doldur (buğdayı tüketmeden)
  // 4. Silo durumunu kontrol et (kullanıcı seçimine göre "siloyu yükselt" veya "akıllı satış")
  // 5. 50x Önkoşul kontrolü (eksik varsa dondur/pause)
  // 6. Sonra tekrar seferi gönder
  runTavernaAutomationCycle() {
    const hasBot = this.hasPurchasedBot();
    if (!hasBot) return { active: false, paused: false, actions: [] };

    const nodes = ['wood', 'iron', 'wheat'];
    const actions = [];

    // =========================================================================
    // 0. BOT ADA ÖN-KONTROLÜ & OTOMATİK FİNANSMAN
    // Bot çalışırken yetersiz $ADASTRA olup durmaması için depodan eşit miktarda satış yap
    // =========================================================================
    if ((this.state.adAstraBalance || 0) < 50) {
      const fundRes = this.autoFundBotAdaDeficit(50);
      if (fundRes && fundRes.funded) {
        actions.push(`⚖️ Bot Oto-Finansman: Yetersiz ADA için depodan eşit miktarda (${fundRes.toSell?.wood || 0} Odun, ${fundRes.toSell?.iron || 0} Demir, ${fundRes.toSell?.wheat || 0} Buğday) satılarak +${fundRes.totalEarned?.toFixed(1)} $ADASTRA sağlandı.`);
      }
    }

    // =========================================================================
    // 1. ÖNCE TAMAMLANAN SEFERLERİ TOPLA (Hasat)
    // Sefer bitmişse veya süresi dolmuşsa derhal toplanır.
    // Bu sayede ambara buğday, demir ve odun girer; yetersizlik çözülür.
    // =========================================================================
    for (const nodeId of nodes) {
      const exp = this.state.activeExpeditions ? this.state.activeExpeditions[nodeId] : null;
      if (exp && (exp.isCompleted || (exp.elapsedSeconds >= exp.durationSeconds))) {
        exp.isCompleted = true;
        const claimRes = this.claimExpedition(nodeId);
        if (claimRes && claimRes.success) {
          actions.push(`✅ ${GAME_CONFIG.GLOBAL_RESOURCE_CAPS[nodeId].name} seferi toplandı.`);
        }
      }
    }

    // =========================================================================
    // 2. ALETLERİ ONAR
    // Kırık veya sıfır dayanıklılığa sahip aletleri depodaki kaynaklarla tamir et
    // =========================================================================
    for (const nodeId of nodes) {
      const toolId = GAME_CONFIG.GLOBAL_RESOURCE_CAPS[nodeId].requiredTool;
      const tool = this.state.tools ? this.state.tools[toolId] : null;
      if (tool && tool.durability <= 0) {
        const repCost = this.calculateRepairCost(toolId);
        const inv = this.state.inventory || {};
        if (repCost && (inv.wood || 0) >= repCost.woodCost && (inv.iron || 0) >= repCost.ironCost) {
          if ((this.state.adAstraBalance || 0) < repCost.adAstraCost) {
            this.autoFundBotAdaDeficit(Math.max(50, repCost.adAstraCost + 5));
          }
          if ((this.state.adAstraBalance || 0) >= repCost.adAstraCost) {
            const repRes = this.repairTool(toolId);
            if (repRes && repRes.success) {
              actions.push(`🔨 ${GAME_CONFIG.TOOLS[toolId].name} otomatik tamir edildi.`);
            }
          }
        }
      }
    }

    // =========================================================================
    // 3. STAMİNAYI DOLDUR (SADECE BİR SONRAKİ SEFERLERİ KARŞILAYACAK KADAR!)
    // Asla tüm buğdayı tüketip staminayı full'lemez; sadece gönderilecek sefer kadar alır.
    // =========================================================================
    const staminaCostPerExp = this.getExpeditionStaminaCost ? this.getExpeditionStaminaCost() : (GAME_CONFIG.STAMINA_COST_PER_EXPEDITION || 25);
    const readyToLaunchNodes = [];
    for (const nodeId of nodes) {
      const hasExp = this.state.activeExpeditions && this.state.activeExpeditions[nodeId];
      if (!hasExp) {
        const toolId = GAME_CONFIG.GLOBAL_RESOURCE_CAPS[nodeId].requiredTool;
        const tool = this.state.tools ? this.state.tools[toolId] : null;
        if (tool && tool.durability > 0) {
          readyToLaunchNodes.push(nodeId);
        }
      }
    }

    if (readyToLaunchNodes.length > 0) {
      const totalStaminaNeeded = readyToLaunchNodes.length * staminaCostPerExp;
      const currentStamina = this.state.stamina || 0;

      if (totalStaminaNeeded > currentStamina) {
        const staminaDeficit = totalStaminaNeeded - currentStamina;
        const refRes = this.refillStaminaExact(staminaDeficit);
        if (refRes && refRes.success && refRes.wheatUsed > 0) {
          actions.push(`🍞 ${refRes.wheatUsed} Buğday ile seferler için +${Math.round(refRes.gainedStamina)} Stamina sağlandı.`);
        }
      }
    }

    // =========================================================================
    // 4. SİLO DURUMUNU KONTROL ET & SİLOYU YÜKSELT
    // Kullanıcı "Siloyu Yükselt" (botSiloAutoUpgrade = true) seçtiyse her döngüde
    // depoların %80 doluluğunu kontrol eder ve siloyu üst seviyeye taşır.
    // Asla kaynakları AMM pazarında erken satıp harcamaz!
    // =========================================================================
    // =========================================================================
    // 4. SİLO DURUMUNU KONTROL ET & SİLOYU YÜKSELT (Veya Kaynakları Sat)
    // =========================================================================
    if (this.state.botSiloAutoUpgrade) {
      const upgradeRes = this.tryAutoUpgradeWarehouseWithAdaFinancing();
      if (upgradeRes && upgradeRes.upgraded) {
        actions.push(`🏰 Silo otomatik Seviye ${this.state.warehouseLevel}'e yükseltildi!`);
      }
    } else {
      // Kullanıcı açıkça "Kaynakları Sat" seçtiyse:
      // Silonun yarısını (%50) rezerve koru, fazlasını sürekli AMM'de sat
      for (const nid of nodes) {
        const spaceRes = this.handleBotSiloSpace(nid, 1);
        if (spaceRes && spaceRes.action === 'sold') {
          actions.push(`⚖️ Satış Modu (%50 Rezerve): ${spaceRes.amountSold} ${nid} satıldı (+${spaceRes.adAstraReceived?.toFixed(1)} ADA).`);
        }
      }
    }

    // =========================================================================
    // 5. 50x ÖNKOŞUL KAYNAK KONTROLÜ VE DONDURMA/UYANMA (Pause/Freeze)
    // Hasat, tamirat ve minimum stamina dolumundan sonra bakiye kontrolü
    // =========================================================================
    this.updateBotPauseState();
    if (this.isBotPaused()) {
      if (actions.length > 0) {
        this.state.lastBotActions = actions;
        this.saveState();
      }
      return { active: false, paused: true, actions };
    }

    // =========================================================================
    // 6. TEKRAR SEFERLERİ GÖNDER (Otonom Başlatma)
    // =========================================================================
    for (const nodeId of readyToLaunchNodes) {
      const hasExp = this.state.activeExpeditions && this.state.activeExpeditions[nodeId];
      if (!hasExp) {
        const toolId = GAME_CONFIG.GLOBAL_RESOURCE_CAPS[nodeId].requiredTool;
        const tool = this.state.tools ? this.state.tools[toolId] : null;
        const staminaCost = this.getExpeditionStaminaCost ? this.getExpeditionStaminaCost() : (GAME_CONFIG.STAMINA_COST_PER_EXPEDITION || 25);

        if (tool && tool.durability > 0 && (this.state.stamina || 0) >= staminaCost) {
          const startRes = this.startExpedition(nodeId);
          if (startRes && startRes.success) {
            actions.push(`🚀 ${GAME_CONFIG.GLOBAL_RESOURCE_CAPS[nodeId].name} seferi otonom başlatıldı.`);
          }
        }
      }
    }

    if (actions.length > 0) {
      this.state.lastBotActions = actions;
      this.saveState();
    }

    return { active: true, actions };
  }

  // 🔍 24 Saatlik Otomasyon Botunun Kesintisiz Çalışma Koşulları (Her Kaynaktan Min 50)
  checkBotPrerequisites() {
    const inv = this.state.inventory || {};
    const ada = this.state.adAstraBalance || 0;
    const req = 50;
    const missing = [];

    if ((inv.iron || 0) < req) {
      missing.push({ key: 'iron', name: 'Demir', icon: '⛏️', current: (inv.iron || 0), required: req, missing: Math.ceil(req - (inv.iron || 0)) });
    }
    if ((inv.wood || 0) < req) {
      missing.push({ key: 'wood', name: 'Odun', icon: '🌲', current: (inv.wood || 0), required: req, missing: Math.ceil(req - (inv.wood || 0)) });
    }
    if ((inv.wheat || 0) < req) {
      missing.push({ key: 'wheat', name: 'Buğday', icon: '🌾', current: (inv.wheat || 0), required: req, missing: Math.ceil(req - (inv.wheat || 0)) });
    }
    if (ada < req) {
      missing.push({ key: 'adAstra', name: '$ADASTRA', icon: '🟣', current: ada, required: req, missing: Math.ceil(req - ada) });
    }

    return {
      isMet: missing.length === 0,
      missing,
      missingText: missing.map(m => `${m.missing} ${m.icon} ${m.name}`).join(', ')
    };
  }

  /**
   * 🤖 Bot Çalışırken ADA Yetersizliği Durumunda Depodan Eşit Miktarda Kaynak Satışı
   * Kullanıcı kuralı: Bot çalışırken yetersiz $ADASTRA olup durursa (veya durmaması için),
   * depodaki tüm malzemelerden (Odun, Demir, Buğday) eşit miktarda satıp botun tekrar
   * çalışması için ihtiyaç olan $ADASTRA'yı (en az 50 $ADASTRA) marketten elde eder.
   */
  autoFundBotAdaDeficit(neededTarget = 50) {
    const curAda = Number(this.state.adAstraBalance) || 0;
    if (curAda >= neededTarget) {
      return { funded: false, reason: 'sufficient_ada', currentBalance: curAda };
    }

    if (typeof ammMarket === 'undefined' || !ammMarket || !ammMarket.executeSell) {
      return { funded: false, reason: 'amm_unavailable' };
    }

    const deficit = Math.max(0, neededTarget - curAda);
    // Küçük bir tampon (+5 ADA) ekleyerek en az 55 ADA'ya ulaştır ki anında tekrar düşüp durmasın
    const targetToRaise = Math.max(1, Math.ceil(deficit + 5));

    const inv = this.state.inventory = this.state.inventory || {};
    const nodes = ['wood', 'iron', 'wheat'];

    // Her malzemenin satış fiyatını al
    const prices = {};
    let sumPrices = 0;
    for (const node of nodes) {
      let p = 0;
      if (typeof ammMarket.getEstimatedAdAstraForSell === 'function') {
        p = ammMarket.getEstimatedAdAstraForSell(node, 1);
      }
      if (!p || isNaN(p) || p <= 0) {
        p = (typeof ammMarket.getPrice === 'function') ? ammMarket.getPrice(node) : 0.5;
      }
      prices[node] = Math.max(0.01, p || 0.5);
      sumPrices += prices[node];
    }

    if (sumPrices <= 0) return { funded: false, reason: 'zero_prices' };

    // 1. ADIM: Eşit miktarda x satılacak: x * sumPrices >= targetToRaise
    let unitsPerNode = Math.ceil(targetToRaise / sumPrices);
    if (unitsPerNode < 1) unitsPerNode = 1;

    // Depodaki stokları kontrol et
    const curStocks = {
      wood: Number(inv.wood) || 0,
      iron: Number(inv.iron) || 0,
      wheat: Number(inv.wheat) || 0
    };

    // Tüm malzemelerden eşit miktarda satmayı hedefle
    const toSell = { wood: 0, iron: 0, wheat: 0 };
    const minStock = Math.min(curStocks.wood, curStocks.iron, curStocks.wheat);

    if (minStock >= unitsPerNode) {
      // Her malzemede yeterli stok var: tam olarak eşit miktarda sat!
      toSell.wood = unitsPerNode;
      toSell.iron = unitsPerNode;
      toSell.wheat = unitsPerNode;
    } else if (minStock > 0) {
      // Ortak minimum kadar eşit sat, kalan açığı stokları elverenler arasında eşit paylaştır
      toSell.wood = minStock;
      toSell.iron = minStock;
      toSell.wheat = minStock;

      const raisedSoFar = minStock * sumPrices;
      let remainingToRaise = Math.max(0, targetToRaise - raisedSoFar);

      if (remainingToRaise > 0) {
        // Stoğu minStock'tan fazla olan kaynaklar
        const surplusNodes = nodes.filter(n => (curStocks[n] - minStock) > 0);
        if (surplusNodes.length > 0) {
          const surplusSumPrice = surplusNodes.reduce((acc, n) => acc + prices[n], 0);
          const extraUnitsPerNode = Math.ceil(remainingToRaise / surplusSumPrice);
          for (const sn of surplusNodes) {
            const avail = curStocks[sn] - minStock;
            const extra = Math.min(avail, extraUnitsPerNode);
            toSell[sn] += extra;
          }
        }
      }
    } else {
      // Bir kaynağın stoğu 0 bile olsa, diğer mevcut kaynaklardan eşit miktarda sat
      const availableNodes = nodes.filter(n => curStocks[n] > 0);
      if (availableNodes.length > 0) {
        const availSumPrice = availableNodes.reduce((acc, n) => acc + prices[n], 0);
        let equalQty = Math.ceil(targetToRaise / availSumPrice);
        const minAvail = Math.min(...availableNodes.map(n => curStocks[n]));
        equalQty = Math.min(equalQty, minAvail);
        if (equalQty < 1 && minAvail >= 1) equalQty = 1;
        for (const an of availableNodes) {
          toSell[an] = Math.min(curStocks[an], equalQty);
        }
      }
    }

    const totalUnitsPlanned = toSell.wood + toSell.iron + toSell.wheat;
    if (totalUnitsPlanned <= 0) {
      return { funded: false, reason: 'no_inventory_available' };
    }

    let totalEarned = 0;
    const soldBreakdown = {};

    for (const node of nodes) {
      const qty = toSell[node] || 0;
      if (qty > 0) {
        const sellRes = ammMarket.executeSell(node, qty);
        if (sellRes && sellRes.success) {
          inv[node] = Math.max(0, (inv[node] || 0) - qty);
          const earned = Number(sellRes.adAstraReceived) || 0;
          totalEarned += earned;
          soldBreakdown[node] = { qty, earned };
        }
      }
    }

    if (totalEarned > 0) {
      this.state.adAstraBalance = (this.state.adAstraBalance || 0) + totalEarned;
      this.saveState();

      const actionMsg = `⚖️ Bot Oto-Finansman: Yetersiz ADA giderildi. Depodan eşit miktarda (${toSell.wood} Odun, ${toSell.iron} Demir, ${toSell.wheat} Buğday) satılarak +${totalEarned.toFixed(1)} $ADASTRA elde edildi.`;
      if (!this.state.lastBotActions) this.state.lastBotActions = [];
      this.state.lastBotActions.push(actionMsg);

      return {
        funded: true,
        toSell,
        totalEarned,
        soldBreakdown,
        newBalance: this.state.adAstraBalance,
        message: actionMsg
      };
    }

    return { funded: false, reason: 'sell_execution_failed' };
  }

  // ⏸️ Botun Duraklatılması (Pause) ve Süresinin Azalmadan Dondurulması (Freeze) Motoru
  updateBotPauseState() {
    const now = Date.now();
    const isTavernaBotPurchased = (this.state.tavernaBotActive && (this.state.tavernaBotExpiresAt || 0) > now) ||
                                  (this.state.botActiveUntil && this.state.botActiveUntil > now) ||
                                  (this.state.botPaused && (this.state.botPausedRemainingMs || 0) > 0);

    if (!isTavernaBotPurchased) {
      if (this.state.botPaused) {
        this.state.botPaused = false;
        this.state.botPausedRemainingMs = null;
      }
      return { isBotPurchased: false, isPaused: false };
    }

    const rawExp = Math.max(
      this.state.botActiveUntil || 0,
      this.state.tavernaBotExpiresAt || 0
    );

    let prereq = this.checkBotPrerequisites();

    // 🤖 KULLANICI KURALI: Eğer bot çalışırken/aktifken $ADASTRA < 50 olduğu için duracaksa veya durmuşsa:
    // Bot durup beklemek yerine depodaki tüm malzemelerden (Odun, Demir, Buğday) eşit miktarda satıp
    // 50 $ADASTRA'yı marketten temin eder ve durmayı engeller!
    if (!prereq.isMet) {
      const hasAdaMissing = prereq.missing.some(m => m.key === 'adAstra');
      if (hasAdaMissing) {
        const fundRes = this.autoFundBotAdaDeficit(50);
        if (fundRes && fundRes.funded) {
          // Satış yapıldı ve ADA tamamlandı, koşulları tekrar kontrol et!
          prereq = this.checkBotPrerequisites();
        }
      }
    }

    if (!prereq.isMet) {
      // Koşullar hala sağlanmıyor (örneğin hammadde eksikse) -> BOT DURAKLATILMALI VE SÜRESİ DONDURULMALI!
      if (!this.state.botPaused) {
        this.state.botPaused = true;
        const remainingMs = Math.max(1000, rawExp - now);
        this.state.botPausedRemainingMs = remainingMs;
        this.state.botPausedAt = now;
        this.saveState();
      } else {
        // Zaten duraklatılmış, sürenin 1 saniye bile azalmaması için bitiş süresini sürekli ileri ötele!
        if (this.state.botPausedRemainingMs > 0) {
          this.state.botActiveUntil = now + this.state.botPausedRemainingMs;
          this.state.tavernaBotExpiresAt = this.state.botActiveUntil;
          if (this.state.activeBuffs?.auto_collector) {
            this.state.activeBuffs.auto_collector.expiresAt = this.state.botActiveUntil;
          }
        }
      }
      return { isBotPurchased: true, isPaused: true, prereq };
    } else {
      // Koşullar tam! (En az 50 Demir, 50 Odun, 50 Buğday, 50 ADA mevcut)
      if (this.state.botPaused) {
        // Bot duraklatılmıştı, ŞİMDİ ANINDA UYANDIRILACAK (RESUME)!
        this.state.botPaused = false;
        const restoredRemMs = this.state.botPausedRemainingMs || (24 * 3600 * 1000);
        this.state.botActiveUntil = now + restoredRemMs;
        this.state.tavernaBotExpiresAt = this.state.botActiveUntil;
        this.state.botPausedRemainingMs = null;
        this.state.botPausedAt = null;

        if (!this.state.activeBuffs) this.state.activeBuffs = {};
        this.state.activeBuffs['auto_collector'] = {
          id: 'auto_collector',
          name: '24 Saatlik Otomasyon Botu',
          expiresAt: this.state.botActiveUntil
        };

        this.saveState();

        // 🚀 Koşullar tamamlandığı an beklemeden hemen otonom sefer ve tamiratı tetikle!
        try {
          this.runTavernaAutomationCycle();
        } catch (e) {
          console.warn('Bot resume cycle execution error:', e);
        }

        return { isBotPurchased: true, isPaused: false, justResumed: true };
      }

      return { isBotPurchased: true, isPaused: false };
    }
  }

  isBotPaused() {
    return !!this.state.botPaused;
  }

  hasPurchasedBot() {
    const now = Date.now();
    const isTavernaBot = (this.state.botActiveUntil && this.state.botActiveUntil > now) ||
                         (this.state.tavernaBotActive && this.state.tavernaBotExpiresAt > now) ||
                         (this.state.botPaused && (this.state.botPausedRemainingMs || 0) > 0);
    return !!isTavernaBot ||
           this.isBuffActive('auto_collector') ||
           this.isBuffActive('auto_collector_weekly') ||
           this.isBuffActive('auto_collector_monthly');
  }

  isAutoCollectorActive() {
    this.updateBotPauseState();

    const now = Date.now();
    const isTavernaBot = (this.state.botActiveUntil && this.state.botActiveUntil > now) ||
                         (this.state.tavernaBotActive && this.state.tavernaBotExpiresAt > now) ||
                         (this.state.botPaused && (this.state.botPausedRemainingMs || 0) > 0);
    return !!isTavernaBot ||
           this.isBuffActive('auto_collector') ||
           this.isBuffActive('auto_collector_weekly') ||
           this.isBuffActive('auto_collector_monthly');
  }

  isBotRunning() {
    return this.isAutoCollectorActive() && !this.isBotPaused();
  }

  getAutoCollectorExpiry() {
    if (this.state.botPaused && this.state.botPausedRemainingMs > 0) {
      return Date.now() + this.state.botPausedRemainingMs;
    }
    const now = Date.now();
    let maxExp = 0;
    if (this.state.botActiveUntil && this.state.botActiveUntil > now) {
      maxExp = Math.max(maxExp, this.state.botActiveUntil);
    }
    if (this.state.tavernaBotActive && this.state.tavernaBotExpiresAt > now) {
      maxExp = Math.max(maxExp, this.state.tavernaBotExpiresAt);
    }
    for (const id of ['auto_collector', 'auto_collector_weekly', 'auto_collector_monthly']) {
      const b = this.state.activeBuffs ? this.state.activeBuffs[id] : null;
      if (b && b.expiresAt > maxExp && b.expiresAt > now) {
        maxExp = b.expiresAt;
      }
    }
    return maxExp;
  }

  getAutoCollectorRemainingSeconds() {
    if (this.state.botPaused && this.state.botPausedRemainingMs > 0) {
      return Math.max(0, Math.floor(this.state.botPausedRemainingMs / 1000));
    }
    const exp = this.getAutoCollectorExpiry();
    return Math.max(0, Math.floor((exp - Date.now()) / 1000));
  }

  getAutoCollectorRemainingText() {
    const sec = this.getAutoCollectorRemainingSeconds();
    if (sec <= 0) return 'Pasif';
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const s = sec % 60;

    let timeStr = '';
    if (hrs > 0) timeStr = `${hrs}s ${mins}d`;
    else if (mins > 0) timeStr = `${mins}d ${s}sn`;
    else timeStr = `${s}sn`;

    if (this.state.botPaused) {
      return `⏸️ ${timeStr} (Donduruldu)`;
    }
    return timeStr;
  }

  // Belirli bir kaynak için dakika başına fix (sabit) üretim miktarı
  // Her seviyede fix kalır: Seviye arttıkça dakikalık üretim artmaz, sadece sefer süresi uzar.
  getResourceRatePerMinute(nodeId) {
    return (GAME_CONFIG.BASE_PRODUCTION && GAME_CONFIG.BASE_PRODUCTION[nodeId]) || 15;
  }

  getAccruedExpeditionHarvest(nodeId) {
    const exp = this.state.activeExpeditions[nodeId];
    if (!exp) return { accruedAmount: 0, totalYield: 0, pct: 0, remainingSeconds: 0, elapsedSeconds: 0, durationSeconds: 0, isCompleted: false };

    const ratePm = this.getResourceRatePerMinute(nodeId);

    const speedMult = this.getExpeditionSpeedMultiplier();
    const durationMins = exp.durationMinutes || Math.round((exp.durationHours || 0.3) * 60) || Math.max(1, Math.round(exp.durationSeconds / 60));
    const durationHours = exp.durationHours || parseFloat((durationMins / 60).toFixed(2));
    const totalYield = Math.max(10, Math.floor(ratePm * durationMins * speedMult));
    const totalXp = Math.max(5, Math.floor(35 * durationHours));

    const progressRatio = Math.min(1, exp.elapsedSeconds / exp.durationSeconds);
    let alreadyClaimed = 0;
    if (exp.claimedAmount != null) {
      alreadyClaimed = exp.claimedAmount;
    } else if (exp.claimedSeconds) {
      alreadyClaimed = Math.floor(totalYield * Math.min(1, exp.claimedSeconds / exp.durationSeconds));
    }

    const earnedSoFar = Math.floor(totalYield * progressRatio);
    const accruedAmount = Math.max(0, earnedSoFar - alreadyClaimed);
    const accruedXp = exp.isCompleted ? totalXp : Math.max(1, Math.floor(totalXp * progressRatio));
    const pct = Math.min(100, Math.floor(progressRatio * 100));
    const remainingSeconds = Math.max(0, Math.ceil(exp.durationSeconds - exp.elapsedSeconds));

    return {
      accruedAmount,
      totalYield,
      alreadyClaimed,
      accruedXp,
      totalXp,
      pct,
      remainingSeconds,
      elapsedSeconds: exp.elapsedSeconds,
      durationSeconds: exp.durationSeconds,
      isCompleted: exp.isCompleted
    };
  }

  claimPartialExpedition(nodeId) {
    const exp = this.state.activeExpeditions[nodeId];
    if (!exp) return { success: false, message: 'Aktif sefer bulunamadı.' };

    const accruedInfo = this.getAccruedExpeditionHarvest(nodeId);
    if (accruedInfo.accruedAmount <= 0) {
      return { success: false, message: 'Henüz toplanabilir bir kaynak birikmedi (En az 1 adet birikmeli).' };
    }

    const nodeConfig = GAME_CONFIG.GLOBAL_RESOURCE_CAPS[nodeId];
    const playerTool = this.state.tools[nodeConfig.requiredTool];

    // SİLO / DEPO DOLULUK VE TAŞMA KONTROLÜ (Erken Toplama)
    const cap = this.getWarehouseCapacity();
    const limit = cap[nodeId];
    const currentAmount = Number(this.state.inventory[nodeId]) || 0;
    const availableRoom = limit != null ? Math.max(0, limit - currentAmount) : accruedInfo.accruedAmount;
    const resourceDisplayNames = { wood: 'odun', iron: 'demir', wheat: 'buğday' };
    const rLabel = resourceDisplayNames[nodeId] || nodeConfig.name;

    // 1. Durum: Depoda HİÇ boş yer yok
    if (limit != null && availableRoom <= 0) {
      return {
        success: false,
        isWarehouseFull: true,
        nodeId,
        currentAmount,
        limit,
        remainingToClaim: accruedInfo.accruedAmount,
        message: `⚠️ Silo'nuz tamamen dolu (${currentAmount}/${limit})! Lütfen ${rLabel} seferini tamamlamak için silonuzu büyütün veya silonuzda yer açın.`
      };
    }

    // 2. Durum: Depoda yer var - boş yeri tam dolduracak kadarını al, kalanı seferde bırak
    const amountToHarvest = Math.min(accruedInfo.accruedAmount, availableRoom);
    const requested = globalPool.harvest(nodeId, amountToHarvest);
    const { stored: harvestedAmount, overflow } = this.storeResource(nodeId, requested);
    if (playerTool) {
      playerTool.totalGathered = (playerTool.totalGathered || 0) + harvestedAmount;
    }

    const xpGained = Math.max(1, Math.floor((accruedInfo.accruedXp || 1) * (harvestedAmount / accruedInfo.accruedAmount)));
    const levelResult = this.addXp(xpGained);

    // Kısmi tahsilatı claimedAmount'a ekle
    exp.claimedAmount = (exp.claimedAmount || accruedInfo.alreadyClaimed || 0) + harvestedAmount;
    if (accruedInfo.totalYield > 0) {
      exp.claimedSeconds = Math.min(exp.durationSeconds, Math.floor((exp.claimedAmount / accruedInfo.totalYield) * exp.durationSeconds));
    } else {
      exp.claimedSeconds = exp.elapsedSeconds;
    }

    sound.playHarvest();
    this.saveState();

    const stillWaiting = Math.max(0, accruedInfo.accruedAmount - harvestedAmount);

    return {
      success: true,
      amount: harvestedAmount,
      overflow,
      xpGained,
      levelResult,
      isPartialSiloFill: stillWaiting > 0,
      stillRemaining: stillWaiting,
      message: stillWaiting > 0
        ? `📥 Silodaki boş alan kadar +${harvestedAmount} ${nodeConfig.name} erken toplandı ve ambar doldu (${this.state.inventory[nodeId]}/${limit})! Kalan ${stillWaiting} adet mahsul seferde bekletiliyor.`
        : `⚡ ${harvestedAmount} ${nodeConfig.name} erken toplandı! (+${xpGained} XP)`
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // DEPO KAPASİTESİ — v2: ARTIK GERÇEKTEN UYGULANIYOR (F-16)
  // ═══════════════════════════════════════════════════════════════════════
  storeResource(resourceKey, amount) {
    if (!(amount > 0)) return { stored: 0, overflow: 0 };
    const cap = this.getWarehouseCapacity();
    const limit = cap[resourceKey];
    const current = this.state.inventory[resourceKey] || 0;

    if (limit == null) {
      this.state.inventory[resourceKey] = current + amount;
      return { stored: amount, overflow: 0 };
    }

    const room = Math.max(0, limit - current);
    const stored = Math.min(amount, room);
    const overflow = amount - stored;
    this.state.inventory[resourceKey] = current + stored;
    return { stored, overflow };
  }

  claimExpedition(nodeId) {
    const exp = this.state.activeExpeditions[nodeId];
    if (!exp || !exp.isCompleted) {
      return { success: false, message: 'Henüz toplanacak bir sefer tamamlanmadı.' };
    }

    const nodeConfig = GAME_CONFIG.GLOBAL_RESOURCE_CAPS[nodeId];
    const toolConfig = GAME_CONFIG.TOOLS[nodeConfig.requiredTool];
    const playerTool = this.state.tools[nodeConfig.requiredTool];

    // Matematiksel Sefer Verimi (Dakika Başı Fix Üretim * Dakika * Hız Çarpanı)
    const ratePm = this.getResourceRatePerMinute(nodeId);
    const speedMult = this.getExpeditionSpeedMultiplier();
    const durationMinutes = exp.durationMinutes || Math.round((exp.durationHours || 0.3) * 60) || Math.max(1, Math.round(exp.durationSeconds / 60));
    const totalYield = Math.floor(ratePm * durationMinutes * speedMult);

    // Erken veya kısmi toplanan miktarı düş
    const alreadyClaimed = exp.claimedAmount != null
      ? exp.claimedAmount
      : Math.floor(totalYield * Math.min(1, (exp.claimedSeconds || 0) / exp.durationSeconds));
    const remainingToClaim = Math.max(0, totalYield - alreadyClaimed);

    if (remainingToClaim <= 0) {
      delete this.state.activeExpeditions[nodeId];
      this.saveState();
      return { success: true, message: 'Tüm mahsul zaten toplandı.' };
    }

    // SİLO / DEPO DOLULUK VE TAŞMA KONTROLÜ
    const cap = this.getWarehouseCapacity();
    const limit = cap[nodeId];
    let currentAmount = Number(this.state.inventory[nodeId]) || 0;
    let availableRoom = limit != null ? Math.max(0, limit - currentAmount) : remainingToClaim;
    const resourceDisplayNames = { wood: 'odun', iron: 'demir', wheat: 'buğday' };
    const rLabel = resourceDisplayNames[nodeId] || nodeId;

    // 🤖 Otomasyon Botu Aktifse:
    let botSurplusSold = 0;
    let botSurplusAdaEarned = 0;
    const isBotActive = this.isAutoCollectorActive() || this.hasPurchasedBot();
    if (isBotActive) {
      const spaceRes = this.handleBotSiloSpace(nodeId, remainingToClaim);
      if (spaceRes && spaceRes.action === 'sold') {
        botSurplusSold = spaceRes.amountSold || 0;
        botSurplusAdaEarned = spaceRes.adAstraReceived || 0;
      }
      currentAmount = Number(this.state.inventory[nodeId]) || 0;
      const updatedCap = this.getWarehouseCapacity();
      const updatedLimit = updatedCap[nodeId];
      availableRoom = updatedLimit != null ? Math.max(0, updatedLimit - currentAmount) : remainingToClaim;
    }

    // 1. Durum: Depoda HİÇ boş yer yok (0 yer var) VE bot artanı satamadıysa / manuel kullanıcıysa:
    if (limit != null && availableRoom <= 0 && botSurplusSold <= 0) {
      exp.isCompleted = true;
      exp.stillRemaining = remainingToClaim;
      this.saveState();
      return {
        success: false,
        isWarehouseFull: true,
        nodeId,
        currentAmount,
        limit,
        remainingToClaim,
        stillRemaining: remainingToClaim,
        message: `⚠️ Silo'nuz tamamen dolu (${currentAmount}/${limit})! Kalan ${remainingToClaim} ${rLabel} seferde bekletiliyor. Depoda yer açıldığında veya silonuz büyüdüğünde toplanacaktır.`
      };
    }

    // 2. Durum: Depoda yer var veya bot artanı markette sattı!
    const harvestAmount = Math.min(remainingToClaim, availableRoom);
    let harvestedAmount = 0;
    if (harvestAmount > 0) {
      const fromPool = globalPool.harvest(nodeId, harvestAmount);
      const storedRes = this.storeResource(nodeId, fromPool);
      harvestedAmount = storedRes.stored;
    }

    const totalClaimedThisStep = harvestedAmount;
    exp.claimedAmount = (exp.claimedAmount || alreadyClaimed) + totalClaimedThisStep;
    exp.claimedSeconds = exp.durationSeconds;

    if (playerTool) {
      playerTool.totalGathered = (playerTool.totalGathered || 0) + totalClaimedThisStep;
    }

    const stillRemaining = Math.max(0, totalYield - exp.claimedAmount);

    // Eğer seferden kalan miktar tamamen bittiyse (0 kaldıysa): Seferi bitir ve temizle!
    if (stillRemaining <= 0) {
      playerTool.durability = Math.max(0, (playerTool.durability != null ? playerTool.durability : 4320) - durationMinutes);

      const durationHours = exp.durationHours || parseFloat((durationMinutes / 60).toFixed(2));
      const xpGained = Math.max(5, Math.floor(35 * durationHours));
      this.state.characterXp = (this.state.characterXp || 0) + xpGained;

      delete this.state.activeExpeditions[nodeId];

      if (playerTool.durability === 0) sound.playBreakWarning();
      else sound.playHarvest();

      // 🤖 KURAL 2 (Adım 4 A Seçeneği 2. Bölüm): Her sefer bitiminde tetikle ve olabiliyorsa yap!
      if (isBotActive && this.state.botSiloAutoUpgrade) {
        this.tryAutoUpgradeWarehouseWithAdaFinancing();
      }

      this.saveState();

      let msg = `🌾 ${harvestedAmount} ${nodeConfig.name} başarıyla toplandı ve ambarınıza eklendi!`;
      if (botSurplusSold > 0) {
        msg = `🤖 Ambar doldu: ${harvestedAmount} ${nodeConfig.name} depolandı (%100 silo). Fazla gelen ${botSurplusSold} ${nodeConfig.name} AMM'de satıldı (+${botSurplusAdaEarned.toFixed(1)} ADA). Sefer tamamlandı!`;
      }

      return {
        success: true,
        isPartialSiloFill: false,
        amount: totalClaimedThisStep,
        harvestedAmount,
        botSurplusSold,
        botSurplusAdaEarned,
        stillRemaining: 0,
        message: msg
      };
    } else {
      // Depo doldu, kalan miktar seferde bekliyor!
      sound.playHarvest();
      this.saveState();

      return {
        success: true,
        isPartialSiloFill: true,
        amount: harvestedAmount,
        harvestedAmount,
        stillRemaining,
        currentAmount: this.state.inventory[nodeId],
        limit,
        message: `📥 Silodaki boş alan kadar +${harvestedAmount} ${nodeConfig.name} depoya aktarıldı ve ambarınız doldu (${this.state.inventory[nodeId]}/${limit})! Kalan ${stillRemaining} ${nodeConfig.name} seferde bekletiliyor. Depoda yer açtığınızda veya silonuzu büyüttüğünüzde kalan mahsulü de toplayabilirsiniz.`
      };
    }
  }

  // ✨ 60+ YAŞ ÖZEL: TEK TIKLA TÜM KASABADAN MAHSUL & VERGİ TOPLA (SWEEP HARVEST)
  claimAllHarvests() {
    const nodes = ['wheat', 'wood', 'iron'];
    let totalHarvested = 0;
    let totalXp = 0;
    const collectedDetails = [];

    for (const nodeId of nodes) {
      const exp = this.state.activeExpeditions[nodeId];
      if (exp) {
        if (exp.isCompleted) {
          const res = this.claimExpedition(nodeId);
          if (res && res.success) {
            totalHarvested += (res.amount || 0);
            totalXp += (res.xpGained || 0);
            collectedDetails.push(`${res.amount} ${res.resourceName || nodeId}`);
          }
        } else {
          const res = this.claimPartialExpedition(nodeId);
          if (res && res.success) {
            totalHarvested += (res.amount || 0);
            totalXp += (res.xpGained || 0);
            const nodeConfig = GAME_CONFIG.GLOBAL_RESOURCE_CAPS[nodeId];
            collectedDetails.push(`${res.amount} ${nodeConfig ? nodeConfig.name : nodeId}`);
          }
        }
      }
    }

    if (totalHarvested > 0) {
      sound.playLevelUp();
      this.saveState();
      return {
        success: true,
        totalHarvested,
        totalXp,
        message: `✨ Bütün Kasabadan Mahsuller Toplandı: +${collectedDetails.join(', ')} (+${totalXp} XP)`
      };
    }

    return {
      success: false,
      message: 'Toplanacak hazır bir mahsul veya biriken kaynak bulunamadı. Önce tarlalara ve madenlere işçi gönderin!'
    };
  }

  sweepCompletedExpeditions() {
    const nodes = ['wheat', 'wood', 'iron'];
    let totalHarvested = 0;
    let totalXp = 0;
    const collectedDetails = [];

    for (const nodeId of nodes) {
      const exp = this.state.activeExpeditions[nodeId];
      if (exp && exp.isCompleted) {
        const res = this.claimExpedition(nodeId);
        if (res && res.success) {
          totalHarvested += (res.amount || 0);
          totalXp += (res.xpGained || 0);
          const nodeConfig = GAME_CONFIG.GLOBAL_RESOURCE_CAPS[nodeId];
          collectedDetails.push(`+${res.amount} ${nodeConfig ? nodeConfig.name : nodeId}`);
        }
      }
    }

    if (totalHarvested > 0) {
      sound.playLevelUp();
      this.saveState();
      return {
        success: true,
        totalHarvested,
        totalXp,
        message: `⚡ Biten Seferler Başarıyla Toplandı: ${collectedDetails.join(', ')} (+${totalXp} XP)`
      };
    }

    return {
      success: false,
      message: 'Şu an tamamlanmış bir sefer bulunmuyor.'
    };
  }

  // 🏛️ HAFTALIK EVRENSEL TEMEL GELİR (UBI) TALEP ETME METODU
  claimWeeklyUbi() {
    const res = globalPool.claimWeeklyUbi(
      this.state.level || 1,
      this.state.adAstraBalance || 0,
      this.state.lastClaimedUbiEpoch || 0
    );
    if (res.success) {
      this.state.lastClaimedUbiEpoch = res.epochId;
      this.state.adAstraBalance = (this.state.adAstraBalance || 0) + res.amount;
      this.state.totalUbiEarned = (this.state.totalUbiEarned || 0) + res.amount;
      sound.playLevelUp();
      this.saveState();
    }
    return res;
  }

  // 🧙‍♂️ KRAL DANIŞMANI (BİR CÜMLELİK REHBERLİK & TAVSİYE)
  getRoyalAdvisorAdvice() {
    const inv = this.state.inventory || {};
    const soldiers = this.state.soldierUnits || [];
    const exp = this.state.activeExpeditions || {};
    const dProg = this.state.dungeonProgress || 1;

    // 1. Hazır bekleyen sefer mahsulü varsa
    let readyExpCount = 0;
    for (const node of ['wheat', 'wood', 'iron']) {
      if (exp[node] && exp[node].isCompleted) readyExpCount++;
    }
    if (readyExpCount > 0) {
      return {
        icon: '🌾',
        title: 'Mahsuller Hazır!',
        advice: `Tarlada ve madenlerde ${readyExpCount} işçin seferden döndü! Yukarıdaki **"TÜM MAHSULÜ TOPLA"** butonuna basarak ambarları doldurabilirsin.`,
        action: 'sweep_harvest',
        actionLabel: '✨ Topla'
      };
    }

    // 2. Yaralı asker varsa ve buğday yeterliyse
    const injuredSoldier = soldiers.find(s => (s.hp || 100) < (s.maxHp || 100));
    if (injuredSoldier && (inv.wheat || 0) >= 10) {
      return {
        icon: '❤️',
        title: 'Askerler Dinlenmek İstiyor',
        advice: `Orduda yaralı askerlerin var. Kışlaya gidip **"Tek Dokunuşla Ordumu Hazırla"** ile onları doyurabilirsin!`,
        action: 'open_barracks',
        actionLabel: '⚔️ Kışlaya Git'
      };
    }

    // 3. İşçiler boştaysa
    const idleNodes = ['wheat', 'wood', 'iron'].filter(n => !exp[n]);
    if (idleNodes.length > 0) {
      return {
        icon: '⛏️',
        title: 'İşçiler Boşta Bekliyor',
        advice: `Madenler ve tarlalar şu an boşta duruyor. Çiftliğe veya Madene tıklayıp işçilerini sefere göndererek hammadde toplat!`,
        action: 'open_dashboard',
        actionLabel: '🏰 Krallık Merkezi'
      };
    }

    // 4. Demirci için yeterli hammadde varsa ve eşyalar boşsa
    if ((inv.iron || 0) >= 60 && (inv.wood || 0) >= 40) {
      return {
        icon: '🔥',
        title: 'Demirci Ocağı Yanıyor',
        advice: `Ambarında yeterli demir ve odun var. Demircide yeni bir kılıç veya zırh döverek askerlerini zırhlandırabilirsin!`,
        action: 'open_blacksmith',
        actionLabel: '⚒️ Demirciye Git'
      };
    }

    // 5. Zindan için tavsiye
    return {
      icon: '💀',
      title: 'Zindan Seni Bekliyor',
      advice: `Ordun hazır durumda! Zindan ${dProg}. Kat Muhafızını yenerek hazineleri krallığına kazandırabilirsin.`,
      action: 'open_dungeon',
      actionLabel: '🗺️ Zindana İn'
    };
  }

  // Sefer/zindan kazanımlarından gelen XP'yi karaktere ekler.
  // NOT: Seviye atlama otomatik değildir; oyuncu "levelUp()" ile ayrı bir eylem olarak yükselir.
  addXp(amount) {
    this.state.currentXp = (this.state.currentXp || 0) + amount;
    return null;
  }

  // =========================================================================
  // 2. KARAKTER SEVİYE ATLAMA (MATEMATİKSEL EKONOMİ MODELİ - 180M BALİNA DENGESİ)
  // =========================================================================
  // ═══════════════════════════════════════════════════════════════════════
  // SEVİYE EĞRİSİ — v2: HEDEF SÜREDEN TÜRETİLİR (F-13)
  // ═══════════════════════════════════════════════════════════════════════
  // v1'de XP = 100·n^2,4·1,045^(n-1) idi. XP arzı ise sefer başına yalnızca
  // 35×süreSaat. İki eğri arasındaki uçurum kapatılamıyordu:
  //     Lv.30  →  1.257.370 XP  →  4,1 YIL kesintisiz oyun
  //     Lv.81  → 128.726.298 XP →  420 YIL
  // Alt uçta da kırıktı: Lv.2 için 6.527 ADA gerekiyordu ama oyuncu 250 ADA
  // ile başlıyor ve TÜM DÜNYANIN haftalık hammadde geliri 6.264 ADA idi.
  //
  // v2'de eğri tersinden kurulur: "Lv.81 yaklaşık 1.100 günde (3 yıl)
  // ulaşılabilir olsun" denir ve XP maliyeti buradan türetilir.
  // Günlük XP arzı ≈ 3 düğüm × 35 XP/saat × 24 = 2.520 XP.
  getCumulativeXpForLevel(level) {
    const L = Math.max(1, Math.min(GAME_CONFIG.MAX_PLAYER_LEVEL, level));
    const DAILY_XP_SUPPLY = 2520;
    const TARGET_DAYS_TO_MAX = 1100;
    const days = TARGET_DAYS_TO_MAX * Math.pow((L - 1) / (GAME_CONFIG.MAX_PLAYER_LEVEL - 1), 2.2);
    return Math.round(DAILY_XP_SUPPLY * days);
  }

  getNextLevelRequirement() {
    const maxLvl = GAME_CONFIG.MAX_PLAYER_LEVEL || 81;
    const curLvl = this.state.level || 1;
    const isMaxLevel = curLvl >= maxLvl;
    const nextLvl = isMaxLevel ? maxLvl : curLvl + 1;
    const xp = Math.max(60, this.getCumulativeXpForLevel(nextLvl) - this.getCumulativeXpForLevel(curLvl));

    // Sefer Matematiği (Tüm seferlere eşit gönderilerek XP'nin dolması için gereken sefer sayısı):
    const durMin = this.getExpeditionDurationMinutes(curLvl);
    const durHours = durMin / 60;
    const xpPerExp = Math.max(5, Math.floor(35 * durHours));
    const xpPerCycle = 3 * xpPerExp;
    const cycles = Math.max(1, Math.ceil(xp / Math.max(1, xpPerCycle)));

    // Bu sefer döngülerinde kazanılan toplam hammadde:
    const rateWood = (GAME_CONFIG.BASE_PRODUCTION && GAME_CONFIG.BASE_PRODUCTION.wood) || 18;
    const rateIron = (GAME_CONFIG.BASE_PRODUCTION && GAME_CONFIG.BASE_PRODUCTION.iron) || 12;
    const rateWheat = (GAME_CONFIG.BASE_PRODUCTION && GAME_CONFIG.BASE_PRODUCTION.wheat) || 30;

    const totalWood = cycles * durMin * rateWood;
    const totalIron = cycles * durMin * rateIron;
    const totalWheat = cycles * durMin * rateWheat;

    // Seviye yükseltme maliyeti: Kazanılan kaynakların tam yarısı (%50):
    const wood = Math.round(totalWood / 2);
    const iron = Math.round(totalIron / 2);
    const wheat = Math.round(totalWheat / 2);

    // ADA maliyeti: AMM DEX pazar yerinde istenen odun, demir ve buğdayın anlık toplam AdAstra değeri!
    let adAstra = 0;
    let ammBreakdown = { wood: 0, iron: 0, wheat: 0 };
    if (typeof ammMarket !== 'undefined' && ammMarket && ammMarket.calculateResourcesAdAstraValue) {
      const calc = ammMarket.calculateResourcesAdAstraValue({ wood, iron, wheat });
      adAstra = calc.totalAda;
      ammBreakdown = calc.breakdown;
    } else if (typeof ammMarket !== 'undefined' && ammMarket && ammMarket.getEstimatedAdAstraForSell) {
      const sWood = ammMarket.getEstimatedAdAstraForSell('wood', wood);
      const sIron = ammMarket.getEstimatedAdAstraForSell('iron', iron);
      const sWheat = ammMarket.getEstimatedAdAstraForSell('wheat', wheat);
      adAstra = Math.max(1, Math.round(sWood + sIron + sWheat));
      ammBreakdown = { wood: Math.round(sWood), iron: Math.round(sIron), wheat: Math.round(sWheat) };
    } else {
      adAstra = Math.round(wood * 2.5 + iron * 4.0 + wheat * 0.9);
      ammBreakdown = { wood: Math.round(wood * 2.5), iron: Math.round(iron * 4.0), wheat: Math.round(wheat * 0.9) };
    }

    const curFragRate = this.getFragmentDropRate(curLvl);
    const nextFragRate = this.getFragmentDropRate(nextLvl);
    const curBoxRate = this.getBoxDropRate(curLvl);
    const nextBoxRate = this.getBoxDropRate(nextLvl);

    return {
      level: nextLvl,
      xp,
      cycles,
      durMin,
      totalWoodEarned: totalWood,
      totalIronEarned: totalIron,
      totalWheatEarned: totalWheat,
      wood,
      iron,
      wheat,
      adAstra,
      ammBreakdown,
      curFragRate,
      nextFragRate,
      curBoxRate,
      nextBoxRate,
      curFragRateFormatted: this.formatDropChance(curFragRate),
      nextFragRateFormatted: this.formatDropChance(nextFragRate),
      curBoxRateFormatted: this.formatDropChance(curBoxRate),
      nextBoxRateFormatted: this.formatDropChance(nextBoxRate),
      durationHours: this.getExpeditionDurationHours(nextLvl),
      isMaxLevel
    };
  }

  levelUp() {
    const maxLvl = GAME_CONFIG.MAX_PLAYER_LEVEL || 81;
    if ((this.state.level || 1) >= maxLvl) {
      return { success: false, message: `🏆 Tebrikler! Maksimum seviyeye (Lv.${maxLvl}) zaten ulaştın!` };
    }

    const req = this.getNextLevelRequirement();
    const inv = this.state.inventory;

    if (this.state.currentXp < req.xp) {
      return { success: false, message: `Yetersiz XP! (${this.state.currentXp}/${req.xp} XP)` };
    }
    if ((inv.wood || 0) < req.wood) {
      return { success: false, message: `Yetersiz Odun! (${req.wood} Odun gerekli)` };
    }
    if ((inv.iron || 0) < req.iron) {
      return { success: false, message: `Yetersiz Demir! (${req.iron} Demir gerekli)` };
    }
    if ((inv.wheat || 0) < req.wheat) {
      return { success: false, message: `Yetersiz Buğday! (${req.wheat} Buğday gerekli)` };
    }
    if (this.state.adAstraBalance < req.adAstra) {
      return { success: false, message: `Yetersiz AdAstra! (${req.adAstra} $ADASTRA gerekli)` };
    }

    // Maliyetleri düş
    inv.wood -= req.wood;
    inv.iron -= req.iron;
    inv.wheat -= req.wheat;
    this.burnResources({ wood: req.wood, iron: req.iron, wheat: req.wheat });
    this.state.adAstraBalance -= req.adAstra;
    globalPool.recordTokenSpend(req.adAstra);

    this.state.currentXp -= req.xp;
    this.state.level += 1;
    this.state.maxStamina = this.getMaxStamina(this.state.level);
    this.state.stamina = this.state.maxStamina;

    sound.playLevelUp();
    this.saveState();

    const newDuration = this.getExpeditionDurationHours();
    return {
      success: true,
      message: `🎉 TEBRİKLER! Seviye ${this.state.level}'e ulaştın! (Maksimum Stamina: ${this.state.maxStamina} ⚡, Sefer Süresi: ${newDuration} Saat)`,
      newLevel: this.state.level,
      newDuration,
      maxStamina: this.state.maxStamina
    };
  }

  // =========================================================================
  // 3. KIŞLA ASKER SATIN ALMA (BARRACKS ARMY)
  // =========================================================================
  buyTroop(troopId) {
    const troop = GAME_CONFIG.TROOP_TYPES[troopId];
    if (!troop) return { success: false, message: 'Geçersiz asker!' };

    if (this.state.adAstraBalance < troop.costAdAstra) {
      return { success: false, message: `Yetersiz AdAstra! (${troop.costAdAstra} $ADASTRA gerekli)` };
    }

    this.state.adAstraBalance -= troop.costAdAstra;
    globalPool.recordTokenSpend(troop.costAdAstra);

    this.state.army[troopId] = (this.state.army[troopId] || 0) + 1;
    sound.playLevelUp();
    this.saveState();

    return {
      success: true,
      message: `⚔️ 1 adet ${troop.name} orduya katıldı! (Toplam: ${this.state.army[troopId]})`
    };
  }

  // =========================================================================
  // 4. TAVERNA GÜÇLENDİRMELERİ (24 SAATLİK BOOSTLAR & BOT)
  // =========================================================================
  isBuffActive(buffId) {
    const buff = this.state.activeBuffs[buffId];
    if (!buff) return false;
    return Date.now() < buff.expiresAt;
  }

  buyTavernBuff(buffId) {
    const buffConfig = GAME_CONFIG.TAVERN_BUFFS[buffId];
    if (!buffConfig) return { success: false, message: 'Geçersiz güçlendirme!' };

    if (this.state.adAstraBalance < buffConfig.costAdAstra) {
      return { success: false, message: `Yetersiz AdAstra! (${buffConfig.costAdAstra} $ADASTRA gerekli)` };
    }

    this.state.adAstraBalance -= buffConfig.costAdAstra;
    globalPool.recordTokenSpend(buffConfig.costAdAstra);

    const now = Date.now();
    const currentExpire = (this.state.activeBuffs[buffId] && this.state.activeBuffs[buffId].expiresAt > now)
      ? this.state.activeBuffs[buffId].expiresAt
      : now;

    this.state.activeBuffs[buffId] = {
      id: buffId,
      name: buffConfig.name,
      expiresAt: currentExpire + buffConfig.durationSeconds * 1000
    };

    sound.playLevelUp();
    this.saveState();

    return {
      success: true,
      message: `✨ ${buffConfig.name} 24 saatliğine aktif edildi!`
    };
  }

  // =========================================================================
  // 5. ALET TAMİRATI (Dakika Başına Odun & Demir Üretiminin %25/3'ü + 1 ADA)
  // =========================================================================
  calculateRepairCost(toolId) {
    const toolConfig = GAME_CONFIG.TOOLS[toolId];
    const playerTool = this.state.tools ? this.state.tools[toolId] : null;
    if (!toolConfig || !playerTool) return null;

    const maxDur = toolConfig.maxDurability || 4320;
    const curDur = Math.min(maxDur, Math.max(0, playerTool.durability != null ? playerTool.durability : maxDur));
    const missingDurability = maxDur - curDur; // Eksilen dakika sayısı

    // Dakika başına üretilen Odun ve Demir
    const woodRatePm = this.getResourceRatePerMinute('wood');
    const ironRatePm = this.getResourceRatePerMinute('iron');

    // Kural: Dakika başına üretilen odun ve demirin %25'i alınıp 3 alete paylaştırılır (/ 3)
    const woodCostPerMin = (woodRatePm * 0.25) / 3;
    const ironCostPerMin = (ironRatePm * 0.25) / 3;

    if (missingDurability <= 0) {
      return {
        missingDurability: 0,
        woodCost: 0,
        ironCost: 0,
        wheatCost: 0,
        adAstraCost: 0,
        toolName: toolConfig.name,
        maxDurability: maxDur,
        currentDurability: curDur,
        woodCostPerMin: parseFloat(woodCostPerMin.toFixed(2)),
        ironCostPerMin: parseFloat(ironCostPerMin.toFixed(2)),
        adAstraCostPerMin: 0
      };
    }

    const woodCost = Math.ceil(missingDurability * woodCostPerMin);
    const ironCost = Math.ceil(missingDurability * ironCostPerMin);

    // Kural: Talep edilen odun ve demirin anlık market fiyatlarına (AMM DEX) eşdeğerde $ADASTRA alınır!
    let adAstraCost = 0;
    let ammBreakdown = { wood: 0, iron: 0 };
    if (missingDurability > 0) {
      if (typeof ammMarket !== 'undefined' && ammMarket && ammMarket.calculateResourcesAdAstraValue) {
        const ammCalc = ammMarket.calculateResourcesAdAstraValue({ wood: woodCost, iron: ironCost });
        adAstraCost = Math.max(1, ammCalc.totalAda);
        ammBreakdown = ammCalc.breakdown;
      } else {
        const pWood = (typeof ammMarket !== 'undefined' && ammMarket.getPrice) ? (ammMarket.getPrice('wood') || 2.5) : 2.5;
        const pIron = (typeof ammMarket !== 'undefined' && ammMarket.getPrice) ? (ammMarket.getPrice('iron') || 4.0) : 4.0;
        adAstraCost = Math.max(1, Math.round(woodCost * pWood + ironCost * pIron));
        ammBreakdown = { wood: Math.round(woodCost * pWood), iron: Math.round(ironCost * pIron) };
      }
    }
    const adAstraCostPerMin = missingDurability > 0 ? parseFloat((adAstraCost / missingDurability).toFixed(2)) : 0;

    return {
      toolName: toolConfig.name,
      woodCost,
      ironCost,
      wheatCost: 0,
      adAstraCost,
      ammBreakdown,
      missingDurability,
      maxDurability: maxDur,
      currentDurability: curDur,
      woodCostPerMin: parseFloat(woodCostPerMin.toFixed(2)),
      ironCostPerMin: parseFloat(ironCostPerMin.toFixed(2)),
      adAstraCostPerMin
    };
  }

  repairTool(toolId) {
    const cost = this.calculateRepairCost(toolId);
    if (!cost) return { success: false, message: 'Geçersiz alet!' };
    if (cost.missingDurability === 0) return { success: false, message: 'Alet zaten tamamen sağlam!' };

    const inv = this.state.inventory;
    if ((inv.wood || 0) < cost.woodCost) {
      return {
        success: false,
        message: `Yetersiz Odun! (${cost.woodCost} Odun gerekli, ambarında: ${Math.floor(inv.wood || 0)})`
      };
    }
    if ((inv.iron || 0) < cost.ironCost) {
      return {
        success: false,
        message: `Yetersiz Demir! (${cost.ironCost} Demir gerekli, ambarında: ${Math.floor(inv.iron || 0)})`
      };
    }
    if (this.state.adAstraBalance < cost.adAstraCost) {
      return {
        success: false,
        message: `Yetersiz AdAstra! (${cost.adAstraCost} $ADASTRA gerekli, sende: ${Number(this.state.adAstraBalance || 0).toFixed(1)} ADA)`
      };
    }

    inv.wood -= cost.woodCost;
    inv.iron -= cost.ironCost;
    this.burnResources({ wood: cost.woodCost, iron: cost.ironCost });
    this.state.adAstraBalance -= cost.adAstraCost;
    globalPool.recordTokenSpend(cost.adAstraCost);

    const maxDur = GAME_CONFIG.TOOLS[toolId]?.maxDurability || 4320;
    this.state.tools[toolId].durability = maxDur;

    sound.playRepair();
    this.saveState();

    return {
      success: true,
      message: `🔧 ${cost.toolName} tamamen onarıldı (${maxDur}/${maxDur} dk)! (-${cost.woodCost} Odun, -${cost.ironCost} Demir, -${cost.adAstraCost} ADA)`
    };
  }

  faucetAdAstra(amount = 100) {
    this.state.adAstraBalance += amount;
    sound.playLevelUp();
    this.saveState();
    return this.state.adAstraBalance;
  }

  // =========================================================================
  // 7. WAREHOUSE MANAGEMENT & UPGRADE (MATEMATİKSEL EKONOMİ MODELİ)
  // =========================================================================
  // =========================================================================
  // =========================================================================
  // 7. SİLO / DEPO YÖNETİMİ & YÜKSELTMELERİ (WAREHOUSE / SILO)
  // =========================================================================
  // Maksimum Seviye: 18 (İstifçiliği önleme kuralı)
  // Başlangıç (Seviye 1): 1080 Odun, 720 Demir, 900 Buğday
  // Maksimum (Seviye 18): Haftalık havuz limitlerinin %50'si:
  //   - Odun: 90.000 (180k haftalık havuz limitinin %50'si)
  //   - Demir: 65.000 (130k haftalık havuz limitinin %50'si)
  //   - Buğday: 245.000 (490k haftalık havuz limitinin %50'si)
  getWarehouseCapacity(level = this.state.warehouseLevel) {
    const lvl = Math.max(1, Math.min(18, level));
    if (lvl === 18) {
      return { wood: 90000, iron: 65000, wheat: 245000, fragments: 2500 };
    }
    const step = lvl - 1;
    const rWood = Math.pow(90000 / 1080, 1 / 17);
    const rIron = Math.pow(65000 / 720, 1 / 17);
    const rWheat = Math.pow(245000 / 900, 1 / 17);

    return {
      wood: Math.round(1080 * Math.pow(rWood, step)),
      iron: Math.round(720 * Math.pow(rIron, step)),
      wheat: Math.round(900 * Math.pow(rWheat, step)),
      fragments: Math.round(100 + step * 140)
    };
  }

  getWarehouseUpgradeCost(currentLevel = this.state.warehouseLevel) {
    const maxLevel = (GAME_CONFIG.WAREHOUSE && GAME_CONFIG.WAREHOUSE.baseLevels) || 18;
    if (currentLevel >= maxLevel) return null;

    const currentCap = this.getWarehouseCapacity(currentLevel);
    const nextCap = this.getWarehouseCapacity(currentLevel + 1);

    // Kural: Her bir kaynak için maksimum silo kapasitesinin yarısı (maxCap / 2)
    // Başlangıç Seviye 1 için: Odun: 1080/2 = 540, Demir: 720/2 = 360, Buğday: 900/2 = 450
    const wood = Math.floor(currentCap.wood / 2);
    const iron = Math.floor(currentCap.iron / 2);
    const wheat = Math.floor(currentCap.wheat / 2);

    // Kural: Tüm bu kaynakların anlık olarak pazarda (AMM DEX) satılsa kaç AdAstra edeceği
    let adAstra = 0;
    let ammBreakdown = { wood: 0, iron: 0, wheat: 0 };
    if (typeof ammMarket !== 'undefined' && ammMarket && ammMarket.calculateResourcesAdAstraValue) {
      const calc = ammMarket.calculateResourcesAdAstraValue({ wood, iron, wheat });
      adAstra = calc.totalAda;
      ammBreakdown = calc.breakdown;
    } else if (typeof ammMarket !== 'undefined' && ammMarket.getEstimatedAdAstraForSell) {
      const sellWood = ammMarket.getEstimatedAdAstraForSell('wood', wood);
      const sellIron = ammMarket.getEstimatedAdAstraForSell('iron', iron);
      const sellWheat = ammMarket.getEstimatedAdAstraForSell('wheat', wheat);
      adAstra = Math.max(1, Math.round(sellWood + sellIron + sellWheat));
      ammBreakdown = { wood: Math.round(sellWood), iron: Math.round(sellIron), wheat: Math.round(sellWheat) };
    } else {
      const pWood = 2.5;
      const pIron = 4.0;
      const pWheat = 0.9;
      adAstra = Math.round(wood * pWood + iron * pIron + wheat * pWheat);
      ammBreakdown = { wood: Math.round(wood * pWood), iron: Math.round(iron * pIron), wheat: Math.round(wheat * pWheat) };
    }

    // Kural: Siloyu yükseltmek için tüm kaynak depoları %80 DOLU olmak zorunda!
    const inv = this.state.inventory || {};
    const curWood = inv.wood || 0;
    const curIron = inv.iron || 0;
    const curWheat = inv.wheat || 0;

    const reqWoodFill = Math.round(currentCap.wood * 0.8);
    const reqIronFill = Math.round(currentCap.iron * 0.8);
    const reqWheatFill = Math.round(currentCap.wheat * 0.8);

    const isWood80 = curWood >= reqWoodFill;
    const isIron80 = curIron >= reqIronFill;
    const isWheat80 = curWheat >= reqWheatFill;
    const is80PercentFull = isWood80 && isIron80 && isWheat80;

    const canAffordCost = curWood >= wood && curIron >= iron && curWheat >= wheat && (this.state.adAstraBalance || 0) >= adAstra;

    return {
      currentLevel,
      nextLevel: currentLevel + 1,
      currentCap,
      nextCap,
      wood,
      iron,
      wheat,
      adAstra,
      ammBreakdown,
      reqWoodFill,
      reqIronFill,
      reqWheatFill,
      isWood80,
      isIron80,
      isWheat80,
      is80PercentFull,
      canAffordCost,
      canUpgrade: is80PercentFull && canAffordCost
    };
  }

  upgradeWarehouse() {
    const cost = this.getWarehouseUpgradeCost();
    if (!cost) {
      return { success: false, message: 'Deponuz zaten maksimum seviyede!' };
    }

    // 1. ÖN KOŞUL: Tüm kaynak depoları en az %80 dolu olmak zorunda!
    if (!cost.is80PercentFull) {
      const unfulfilled = [];
      const inv = this.state.inventory || {};
      if (!cost.isWood80) unfulfilled.push(`🌲 Odun (${(inv.wood || 0).toFixed(0)}/${cost.reqWoodFill})`);
      if (!cost.isIron80) unfulfilled.push(`⛏️ Demir (${(inv.iron || 0).toFixed(0)}/${cost.reqIronFill})`);
      if (!cost.isWheat80) unfulfilled.push(`🌾 Buğday (${(inv.wheat || 0).toFixed(0)}/${cost.reqWheatFill})`);
      return {
        success: false,
        message: `⚠️ Silo yükseltilemez! Tüm depolar en az %80 dolu olmalıdır. Yetersiz olanlar: ${unfulfilled.join(', ')}`
      };
    }

    // 2. MALİYET KONTROLÜ
    const inv = this.state.inventory;
    if ((inv.wood || 0) < cost.wood) {
      return { success: false, message: `Yetersiz Odun! (${cost.wood} Odun gerekli)` };
    }
    if ((inv.iron || 0) < cost.iron) {
      return { success: false, message: `Yetersiz Demir! (${cost.iron} Demir gerekli)` };
    }
    if ((inv.wheat || 0) < cost.wheat) {
      return { success: false, message: `Yetersiz Buğday! (${cost.wheat} Buğday gerekli)` };
    }
    if ((this.state.adAstraBalance || 0) < cost.adAstra) {
      return { success: false, message: `Yetersiz AdAstra! (${cost.adAstra} $ADASTRA gerekli)` };
    }

    // Maliyetleri düş
    inv.wood -= cost.wood;
    inv.iron -= cost.iron;
    inv.wheat -= cost.wheat;
    this.burnResources({ wood: cost.wood, iron: cost.iron, wheat: cost.wheat });
    this.state.adAstraBalance -= cost.adAstra;
    globalPool.recordTokenSpend(cost.adAstra);

    this.state.warehouseLevel += 1;
    sound.playLevelUp();
    this.saveState();

    const newCap = this.getWarehouseCapacity(this.state.warehouseLevel);
    return {
      success: true,
      message: `🏰 Silo Seviye ${this.state.warehouseLevel}'e yükseltildi! Yeni Kapasiteler: 🌲 ${newCap.wood} Odun, ⛏️ ${newCap.iron} Demir, 🌾 ${newCap.wheat} Buğday.`
    };
  }

  // =========================================================================
  // 🤖 AMM DEX ANLIK MALİYET BOTU (Her saniye ve her fiyat değişiminde otomatik tarar)
  // =========================================================================
  tickUpgradeCostBot(deltaSeconds = 1) {
    this._upgradeBotTimer = (this._upgradeBotTimer || 0) + deltaSeconds;
    if (this._upgradeBotTimer < 1.0 && this.liveUpgradeCosts && deltaSeconds > 0) {
      return this.liveUpgradeCosts;
    }
    this._upgradeBotTimer = 0;

    const warehouseCost = this.getWarehouseUpgradeCost();
    const levelReq = this.getNextLevelRequirement();
    const toolsRepair = this.getAllRepairCost();
    const botFinancials = this.calculateTavernaBotProfitAndCost();

    this.liveUpgradeCosts = {
      timestamp: Date.now(),
      warehouse: warehouseCost ? {
        level: warehouseCost.nextLevel,
        wood: warehouseCost.wood,
        iron: warehouseCost.iron,
        wheat: warehouseCost.wheat,
        adAstra: warehouseCost.adAstra,
        breakdown: warehouseCost.ammBreakdown || {},
        canAfford: warehouseCost.canAffordCost,
        canUpgrade: warehouseCost.canUpgrade,
        is80PercentFull: warehouseCost.is80PercentFull
      } : null,
      accountLevel: {
        level: levelReq.level,
        wood: levelReq.wood,
        iron: levelReq.iron,
        wheat: levelReq.wheat,
        adAstra: levelReq.adAstra,
        breakdown: levelReq.ammBreakdown || {},
        canAfford: (this.state.inventory.wood || 0) >= levelReq.wood &&
                   (this.state.inventory.iron || 0) >= levelReq.iron &&
                   (this.state.inventory.wheat || 0) >= levelReq.wheat &&
                   (this.state.adAstraBalance || 0) >= levelReq.adAstra
      },
      toolsRepair,
      bot: botFinancials,
      prices: {
        wheat: (typeof ammMarket !== 'undefined' && ammMarket.getPrice) ? ammMarket.getPrice('wheat') : 0.9,
        wood: (typeof ammMarket !== 'undefined' && ammMarket.getPrice) ? ammMarket.getPrice('wood') : 2.5,
        iron: (typeof ammMarket !== 'undefined' && ammMarket.getPrice) ? ammMarket.getPrice('iron') : 4.0,
        fragments: (typeof ammMarket !== 'undefined' && ammMarket.getPrice) ? ammMarket.getPrice('fragments') : 45.0,
        boxes: (typeof ammMarket !== 'undefined' && ammMarket.getPrice) ? ammMarket.getPrice('boxes') : 10000.0,
        keys: (typeof ammMarket !== 'undefined' && ammMarket.getPrice) ? ammMarket.getPrice('keys') : 1000.0
      }
    };

    return this.liveUpgradeCosts;
  }

  // 🏛️ Anlık Piyasa Fiyatları & Tüm Dinamik Ödeme Maliyetleri Tarayıcısı
  getDynamicEconomyRates() {
    const p = {
      wheat: (typeof ammMarket !== 'undefined' && ammMarket.getPrice) ? ammMarket.getPrice('wheat') : 0.9,
      wood: (typeof ammMarket !== 'undefined' && ammMarket.getPrice) ? ammMarket.getPrice('wood') : 2.5,
      iron: (typeof ammMarket !== 'undefined' && ammMarket.getPrice) ? ammMarket.getPrice('iron') : 4.0,
      fragments: (typeof ammMarket !== 'undefined' && ammMarket.getPrice) ? ammMarket.getPrice('fragments') : 45.0,
      boxes: (typeof ammMarket !== 'undefined' && ammMarket.getPrice) ? ammMarket.getPrice('boxes') : 10000.0,
      keys: (typeof ammMarket !== 'undefined' && ammMarket.getPrice) ? ammMarket.getPrice('keys') : 1000.0
    };

    return {
      prices: p,
      warehouse: this.getWarehouseUpgradeCost(),
      accountLevel: this.getNextLevelRequirement(),
      toolsRepair: this.getAllRepairCost(),
      equipmentCraft: this.getAllEquipmentCraftCosts(),
      equipmentRepair: this.getAllEquipmentRepairCostInKingdom(),
      soldiersHeal: this.getAllSoldiersHealCost(),
      bot: this.calculateTavernaBotProfitAndCost()
    };
  }

  // Tüm teçhizat yuvalarının anlık dövme (craft) maliyetlerini AMM DEX fiyatlarıyla hesaplar
  getAllEquipmentCraftCosts() {
    const slots = ['weapon', 'helmet', 'armor', 'legs', 'boots'];
    const craftCosts = {};
    slots.forEach(slot => {
      craftCosts[slot] = this.calculateEquipmentCraftCost(slot);
    });
    return craftCosts;
  }

  // Krallıktaki (çanta, cephanelik ve ordudaki) tüm hasarlı teçhizatların anlık onarım maliyetini hesaplar
  getAllEquipmentRepairCostInKingdom() {
    const all = this.getAllArmoryEquipmentList ? this.getAllArmoryEquipmentList() : [];
    let totalIron = 0, totalWood = 0, totalAda = 0, repairedCount = 0;
    all.forEach(entry => {
      if (entry && entry.item) {
        const cost = this.calculateEquipmentRepairCost(entry.item);
        if (cost && cost.missingDurability > 0) {
          totalIron += cost.ironCost;
          totalWood += cost.woodCost;
          totalAda += cost.adaCost;
          repairedCount++;
        }
      }
    });
    return {
      count: repairedCount,
      totalIron,
      totalWood,
      totalAda,
      canAfford: (this.state.inventory?.iron || 0) >= totalIron &&
                 (this.state.inventory?.wood || 0) >= totalWood &&
                 (this.state.adAstraBalance || 0) >= totalAda
    };
  }

  // Ordudaki tüm yaralı askerlerin anlık doyurma & iyileştirme maliyetini hesaplar
  getAllSoldiersHealCost() {
    const units = this.state.soldierUnits || [];
    let totalWheat = 0, totalAda = 0, woundedCount = 0;
    units.forEach((_, idx) => {
      const info = this.getSoldierHealInfo(idx);
      if (info && !info.isFull) {
        totalWheat += info.wheatNeeded;
        totalAda += info.adaCost;
        woundedCount++;
      }
    });
    return {
      woundedCount,
      totalWheat: Math.round(totalWheat * 100) / 100,
      totalAda: Math.round(totalAda * 100) / 100,
      canAfford: (this.state.inventory?.wheat || 0) >= totalWheat &&
                 (this.state.adAstraBalance || 0) >= totalAda
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 🔨 YENİ MATEMATİKSEL TEÇHİZAT CRAFT, UPGRADE VE ONARIM MOTORU
  // ═══════════════════════════════════════════════════════════════════════
  // 1 ATK = 18 dk Odun (324) + 18 dk Demir (216) + AMM DEX ADA + 1 Parça
  // 1 HP  = 21 dk Odun (378) + 21 dk Demir (252) + AMM DEX ADA + 1 Parça
  // Upgrade: Hammadde +%18 (1.18x), Parça 2 katı (1 -> 2 -> 4 -> 8 -> 16)
  // Dayanıklılık: 13/13 (Zafere -1). Sıfırlanınca yenileme: Kümülatif üretimin %10'u
  // ═══════════════════════════════════════════════════════════════════════

  getCumulativeEquipmentResourceCost(item) {
    const lvl = Math.max(1, item?.level || 1);
    const atk = item?.baseAtk || (item?.slot === 'weapon' ? 25 : 0);
    const hp = item?.baseHp || (item?.slot !== 'weapon' ? 50 : 0);
    const baseWood = Math.max(15, atk * (18 * 18) + hp * (21 * 18));
    const baseIron = Math.max(20, atk * (18 * 12) + hp * (21 * 12));

    let totalWood = 0;
    let totalIron = 0;
    for (let l = 1; l <= lvl; l++) {
      const mult = Math.pow(1.18, l - 1);
      totalWood += baseWood * mult;
      totalIron += baseIron * mult;
    }
    return {
      baseWood,
      baseIron,
      totalWood: Math.round(totalWood),
      totalIron: Math.round(totalIron)
    };
  }

  // 1. Ekipman Dövme Maliyetini Hesapla
  calculateEquipmentCraftCost(recipeOrSlot) {
    const recipe = typeof recipeOrSlot === 'string'
      ? (GAME_CONFIG.EQUIPMENT_RECIPES[recipeOrSlot] || {})
      : (recipeOrSlot || {});
    const atk = recipe.baseAtk || 0;
    const hp = recipe.baseHp || 0;
    const wood = Math.max(15, atk * (18 * 18) + hp * (21 * 18));
    const iron = Math.max(20, atk * (18 * 12) + hp * (21 * 12));
    const fragments = 1;
    const adaCost = ammMarket.calculateResourcesAdAstraValue({ wood, iron }).totalAda;

    return {
      wood,
      iron,
      fragments,
      adAstra: adaCost,
      woodCost: wood,
      ironCost: iron,
      fragCost: fragments,
      adaCost: adaCost
    };
  }

  // 1. Ekipman Dövme (Craft) - Sınırsız Dövme: Boşsa doğrudan kuşanılır, doluysa Cephanelik Deposu'na eklenir
  craftEquipment(slotKey) {
    const recipe = GAME_CONFIG.EQUIPMENT_RECIPES[slotKey];
    if (!recipe) return { success: false, message: 'Geçersiz ekipman parçası!' };

    if (!this.state.equipment) {
      this.state.equipment = { weapon: null, helmet: null, armor: null, legs: null, boots: null };
    }
    if (!Array.isArray(this.state.armoryInventory)) {
      this.state.armoryInventory = [];
    }

    const cost = this.calculateEquipmentCraftCost(recipe);
    const inv = this.state.inventory;

    if ((inv.fragments || 0) < cost.fragments) {
      return { success: false, message: `Yetersiz Teçhizat Parçası! (${cost.fragments} Teçhizat Parçaları gerekli)` };
    }
    if ((inv.iron || 0) < cost.iron) {
      return { success: false, message: `Yetersiz Demir! (${cost.iron} Demir gerekli)` };
    }
    if ((inv.wood || 0) < cost.wood) {
      return { success: false, message: `Yetersiz Odun! (${cost.wood} Odun gerekli)` };
    }
    if (this.state.adAstraBalance < cost.adAstra) {
      return { success: false, message: `Yetersiz AdAstra! (${cost.adAstra} $ADASTRA gerekli)` };
    }

    inv.fragments = (inv.fragments || 0) - cost.fragments;
    inv.iron -= cost.iron;
    inv.wood -= cost.wood;
    this.burnResources({ wood: cost.wood, iron: cost.iron });
    this.state.adAstraBalance -= cost.adAstra;
    globalPool.recordTokenSpend(cost.adAstra);

    const item = {
      id: `${recipe.id}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      slot: recipe.slot,
      name: recipe.name,
      icon: recipe.icon,
      level: 1,
      baseAtk: recipe.baseAtk,
      baseHp: recipe.baseHp,
      atkBonus: recipe.baseAtk,
      hpBonus: recipe.baseHp,
      durability: 13,
      maxDurability: 13,
      craftedAt: Date.now()
    };

    let destination = '';
    if (!this.state.equipment[slotKey]) {
      this.state.equipment[slotKey] = item;
      destination = 've krallık ana yuvasına kuşandırıldı';
    } else {
      this.state.armoryInventory.push(item);
      destination = 've Cephanelik Deposu\'na eklendi';
    }

    sound.playRepair();
    this.saveState();

    return { 
      success: true, 
      message: `⚒️ ${recipe.icon} ${recipe.name} başarıyla dövüldü ${destination}! (13/13 Dayanıklılık)`, 
      item 
    };
  }

  // 2. Ekipman Geliştirme Maliyeti (Upgrade Cost)
  // Kaynaklar +%18 artar, Parçalar 2 katına çıkar, ADA ise AMM DEX pazar değerine eşittir
  calculateEquipmentUpgradeCost(itemOrSlot, soldierIndex = null) {
    let item = null;
    if (typeof itemOrSlot === 'object' && itemOrSlot !== null) {
      item = itemOrSlot;
    } else if (soldierIndex !== null && soldierIndex !== undefined && soldierIndex !== '') {
      const soldier = (this.state.soldierUnits || [])[soldierIndex];
      item = soldier?.equipment ? soldier.equipment[itemOrSlot] : null;
    } else {
      item = this.state.equipment ? this.state.equipment[itemOrSlot] : null;
    }
    if (!item) return null;

    const currentLvl = item.level || 1;
    if (currentLvl >= (GAME_CONFIG.EQUIPMENT_MAX_LEVEL || 10)) {
      return { isMaxLevel: true, currentLevel: currentLvl };
    }

    const nextLvl = currentLvl + 1;
    const cum = this.getCumulativeEquipmentResourceCost(item);
    const mult = Math.pow(1.18, currentLvl);
    const woodCost = Math.max(15, Math.round(cum.baseWood * mult));
    const ironCost = Math.max(20, Math.round(cum.baseIron * mult));
    const fragmentCost = Math.pow(2, currentLvl); // 1 -> 2 -> 4 -> 8 -> 16
    const adAstraCost = ammMarket.calculateResourcesAdAstraValue({ wood: woodCost, iron: ironCost }).totalAda;

    return {
      isMaxLevel: false,
      currentLevel: currentLvl,
      nextLevel: nextLvl,
      ironCost,
      woodCost,
      fragmentCost,
      adAstraCost,
      nextAtk: Math.round(item.baseAtk * (1 + (nextLvl - 1) * 0.35)),
      nextHp: Math.round(item.baseHp * (1 + (nextLvl - 1) * 0.35)),
      item
    };
  }

  // Ekipmanı Geliştir
  upgradeEquipment(itemOrSlot, soldierIndex = null) {
    const cost = this.calculateEquipmentUpgradeCost(itemOrSlot, soldierIndex);
    if (!cost) return { success: false, message: 'Ekipman bulunamadı!' };
    if (cost.isMaxLevel) return { success: false, message: 'Bu ekipman zaten maksimum seviyede (Lv.10 Master)!' };

    const inv = this.state.inventory;
    if ((inv.fragments || 0) < cost.fragmentCost) {
      return { success: false, message: `Yetersiz Teçhizat Parçası! (${cost.fragmentCost} Teçhizat Parçaları gerekli)` };
    }
    if ((inv.iron || 0) < cost.ironCost) {
      return { success: false, message: `Yetersiz Demir! (${cost.ironCost} Demir gerekli)` };
    }
    if ((inv.wood || 0) < cost.woodCost) {
      return { success: false, message: `Yetersiz Odun! (${cost.woodCost} Odun gerekli)` };
    }
    if (this.state.adAstraBalance < cost.adAstraCost) {
      return { success: false, message: `Yetersiz AdAstra! (${cost.adAstraCost} $ADASTRA gerekli)` };
    }

    inv.fragments = (inv.fragments || 0) - cost.fragmentCost;
    inv.iron -= cost.ironCost;
    inv.wood -= cost.woodCost;
    this.burnResources({ wood: cost.woodCost, iron: cost.ironCost });
    this.state.adAstraBalance -= cost.adAstraCost;
    globalPool.recordTokenSpend(cost.adAstraCost);

    const item = cost.item;
    item.level = cost.nextLevel;
    item.atkBonus = cost.nextAtk;
    item.hpBonus = cost.nextHp;
    item.durability = 13; // Yükseltme yapıldığında dayanıklılık da tamir edilir

    sound.playLevelUp();
    this.saveState();

    return {
      success: true,
      message: `✨ ${item.icon} ${item.name} Seviye ${item.level}'e yükseltildi! (+${item.atkBonus} Saldırı, +${item.hpBonus} Can, 13/13 Dayanıklılık)`
    };
  }

  // 3. Teçhizat Onarım Maliyeti (Repair Cost)
  // Kural: Dayanıklılık sıfırlanınca üretim kaynaklarının %10'u (Odun+Demir+AMM DEX ADA). Kısmi hasarda oranlanır.
  calculateEquipmentRepairCost(itemOrSlot, soldierIndex = null) {
    let item = null;
    if (typeof itemOrSlot === 'object' && itemOrSlot !== null) {
      item = itemOrSlot;
    } else if (soldierIndex !== null && soldierIndex !== undefined && soldierIndex !== '') {
      const soldier = (this.state.soldierUnits || [])[soldierIndex];
      item = soldier?.equipment ? soldier.equipment[itemOrSlot] : null;
    } else {
      item = this.state.equipment ? this.state.equipment[itemOrSlot] : null;
    }
    if (!item) return { missingDurability: 0, ironCost: 0, woodCost: 0, fragCost: 0, adaCost: 0, isRepaired: true };

    const maxDur = item.maxDurability || 13;
    const curDur = item.durability != null ? item.durability : maxDur;
    const missing = Math.max(0, maxDur - curDur);
    if (missing <= 0) return { missingDurability: 0, ironCost: 0, woodCost: 0, fragCost: 0, adaCost: 0, isRepaired: true, item };

    const cum = this.getCumulativeEquipmentResourceCost(item);
    const damageRatio = missing / maxDur;
    // Sıfır dayanıklılıkta kümülatif kaynağın %10'u, kısmi hasarda oranlanır
    const woodCost = Math.max(1, Math.round(cum.totalWood * 0.10 * damageRatio));
    const ironCost = Math.max(1, Math.round(cum.totalIron * 0.10 * damageRatio));
    const adaCost = ammMarket.calculateResourcesAdAstraValue({ wood: woodCost, iron: ironCost }).totalAda;

    return {
      missingDurability: missing,
      ironCost,
      woodCost,
      fragCost: 0,
      adaCost,
      isRepaired: false,
      itemName: item.name,
      level: item.level || 1,
      item
    };
  }

  repairEquipment(itemOrSlot, soldierIndex = null) {
    const cost = this.calculateEquipmentRepairCost(itemOrSlot, soldierIndex);
    if (!cost || !cost.item) return { success: false, message: 'Onarılacak ekipman bulunamadı!' };
    const item = cost.item;
    const soldier = (soldierIndex !== null && soldierIndex !== undefined && soldierIndex !== '') ? (this.state.soldierUnits || [])[soldierIndex] : null;
    if (cost.missingDurability <= 0) {
      return { success: false, message: `${item.name} zaten tamamen sağlam (13/13)!` };
    }

    const inv = this.state.inventory;
    if ((inv.iron || 0) < cost.ironCost) {
      return { success: false, message: `Yetersiz Demir! (${cost.ironCost} Demir gerekli)` };
    }
    if ((inv.wood || 0) < cost.woodCost) {
      return { success: false, message: `Yetersiz Odun! (${cost.woodCost} Odun gerekli)` };
    }
    if ((inv.fragments || 0) < cost.fragCost) {
      return { success: false, message: `Yetersiz Teçhizat Parçası! (${cost.fragCost} Teçhizat Parçaları gerekli)` };
    }
    if ((this.state.adAstraBalance || 0) < cost.adaCost) {
      return { success: false, message: `Yetersiz $ADASTRA! (${cost.adaCost} ADA gerekli)` };
    }

    inv.iron -= cost.ironCost;
    inv.wood -= cost.woodCost;
    this.burnResources({ wood: cost.woodCost, iron: cost.ironCost });
    if (cost.fragCost > 0) inv.fragments = (inv.fragments || 0) - cost.fragCost;
    this.state.adAstraBalance -= cost.adaCost;
    globalPool.recordTokenSpend(cost.adaCost);

    const maxDur = item.maxDurability || 13;
    item.durability = maxDur;

    sound.playRepair();
    this.saveState();

    const ownerText = soldier ? `${soldier.name} üzerindeki ` : '';
    return {
      success: true,
      message: `🔨 ${ownerText}${item.name} başarıyla tamir edildi! (${maxDur}/${maxDur} Dayanıklılık)`
    };
  }

  repairEquipmentItem(soldierIndex, slot) {
    return this.repairEquipment(slot, soldierIndex);
  }

  // =========================================================================
  // 5.5. GENİŞLETİLMİŞ CEPHANELİK (ARMORY) VE BÜTÜNLEŞİK EŞYA YÖNETİMİ
  // =========================================================================

  // Krallıktaki tüm teçhizatları (Krallık Ana Yuvaları, Cephanelik Deposu, 18 Asker Üzerindekiler) tek bir listede toplar
  getAllArmoryEquipmentList() {
    const list = [];
    const slots = ['weapon', 'helmet', 'armor', 'legs', 'boots'];
    const slotNames = { weapon: 'Silah', helmet: 'Miğfer', armor: 'Gövde Zırhı', legs: 'Pantolon', boots: 'Ayakkabı' };

    // 1. Krallık Ana Yuvalarındaki Eşyalar
    slots.forEach(slot => {
      const item = this.state.equipment ? this.state.equipment[slot] : null;
      if (item && item.level > 0) {
        list.push({
          source: 'kingdom',
          slotKey: slot,
          slotName: slotNames[slot] || slot,
          soldierIndex: null,
          soldierName: null,
          locationLabel: 'Krallık Ana Yuvası',
          item
        });
      }
    });

    // 2. Cephanelik Deposundaki Boşta Duran Eşyalar
    (this.state.armoryInventory || []).forEach((item, armoryIdx) => {
      if (item && item.level > 0) {
        list.push({
          source: 'armory',
          armoryIndex: armoryIdx,
          slotKey: item.slot,
          slotName: slotNames[item.slot] || item.slot,
          soldierIndex: null,
          soldierName: null,
          locationLabel: 'Cephanelik Deposu (Boşta)',
          item
        });
      }
    });

    // 3. Askerlerin Üzerindeki Eşyalar
    (this.state.soldierUnits || []).forEach((sol, sIdx) => {
      slots.forEach(slot => {
        const item = sol.equipment ? sol.equipment[slot] : null;
        if (item && item.level > 0) {
          list.push({
            source: 'soldier',
            slotKey: slot,
            slotName: slotNames[slot] || slot,
            soldierIndex: sIdx,
            soldierName: sol.name,
            locationLabel: `${sol.name} Üzerinde`,
            item
          });
        }
      });
    });

    return list;
  }

  // Herhangi bir yerdeki eşyayı (Krallık, Cephanelik veya Asker Üzerindeki) tek tıkla seviye atlatır
  upgradeAnyEquipment({ source, slotKey, armoryIndex = null, soldierIndex = null, itemId = null }) {
    let item = null;
    if (source === 'kingdom') {
      item = this.state.equipment ? this.state.equipment[slotKey] : null;
    } else if (source === 'armory') {
      if (armoryIndex !== null && armoryIndex !== undefined && this.state.armoryInventory) {
        item = this.state.armoryInventory[armoryIndex];
      }
    } else if (source === 'soldier') {
      const soldier = (this.state.soldierUnits || [])[soldierIndex];
      item = soldier?.equipment ? soldier.equipment[slotKey] : null;
    }

    if (!item && itemId) {
      // ID bazlı fallback arama
      const all = this.getAllArmoryEquipmentList();
      const match = all.find(e => e.item && e.item.id === itemId);
      if (match) item = match.item;
    }

    if (!item) return { success: false, message: 'Yükseltilecek ekipman bulunamadı!' };
    return this.upgradeEquipment(item);
  }

  // Cephanelikteki veya Krallıktaki eşyayı seçilen askere kuşandırır
  equipSoldierFromDepot(soldierIndex, { source, slotKey, armoryIndex }) {
    const soldier = (this.state.soldierUnits || [])[soldierIndex];
    if (!soldier) return { success: false, message: 'Asker bulunamadı.' };
    if (!soldier.equipment) soldier.equipment = {};

    let itemToEquip = null;

    if (source === 'armory' && this.state.armoryInventory) {
      if (armoryIndex >= 0 && armoryIndex < this.state.armoryInventory.length) {
        itemToEquip = this.state.armoryInventory.splice(armoryIndex, 1)[0];
      }
    } else if (source === 'kingdom' && this.state.equipment) {
      itemToEquip = this.state.equipment[slotKey];
      delete this.state.equipment[slotKey];
    }

    if (!itemToEquip) {
      return { success: false, message: 'Kuşanılacak eşya bulunamadı!' };
    }

    const targetSlot = itemToEquip.slot || slotKey;
    const oldItem = soldier.equipment[targetSlot];

    soldier.equipment[targetSlot] = itemToEquip;

    // Eskiden takılı olan eşyayı cephanelik deposuna güvenle aktar
    if (oldItem) {
      if (!Array.isArray(this.state.armoryInventory)) this.state.armoryInventory = [];
      this.state.armoryInventory.push(oldItem);
    }

    sound.playRepair();
    this.saveState();

    return {
      success: true,
      message: `🛡️ ${soldier.name} üzerine ${itemToEquip.name} kuşandırıldı!${oldItem ? ` (Eski ${oldItem.name} Cephaneliğe aktarıldı)` : ''}`
    };
  }

  // Askerin üzerindeki eşyayı Cephanelik Deposuna çıkarır
  unequipSoldierToArmory(soldierIndex, slotKey) {
    const soldier = (this.state.soldierUnits || [])[soldierIndex];
    if (!soldier || !soldier.equipment || !soldier.equipment[slotKey]) {
      return { success: false, message: 'Çıkarılacak ekipman yok.' };
    }

    const item = soldier.equipment[slotKey];
    soldier.equipment[slotKey] = null;

    if (!Array.isArray(this.state.armoryInventory)) this.state.armoryInventory = [];
    this.state.armoryInventory.push(item);

    sound.playRepair();
    this.saveState();

    return {
      success: true,
      message: `🔄 ${item.name} kuşanmadan çıkarıldı ve Cephanelik Deposu'na eklendi!`
    };
  }

  // ♻️ Düşük Kalite / Seviye 1 Fazlalık Boştaki Eşyaları Hurdaya Çevirip Parça Kazanma
  scrapAllLowTierEquipment(maxLevel = 1) {
    if (!Array.isArray(this.state.armoryInventory)) this.state.armoryInventory = [];
    let scrappedCount = 0;
    let gainedFragments = 0;
    let gainedIron = 0;

    // Cephanelikteki boşta kalan eşyaları filtrele
    const remaining = [];
    for (const item of this.state.armoryInventory) {
      if (item && (item.level || 1) <= maxLevel) {
        scrappedCount++;
        const fragGained = Math.max(1, Math.floor((item.level || 1) * 2));
        const ironGained = Math.max(5, Math.floor((item.level || 1) * 10));
        gainedFragments += fragGained;
        gainedIron += ironGained;
      } else if (item) {
        remaining.push(item);
      }
    }
    this.state.armoryInventory = remaining;

    // Krallık ana yuvasında boşta ve kullanılmayan Lv.1 eşyalar varsa onları da değerlendir
    const slots = ['weapon', 'helmet', 'armor', 'legs', 'boots'];
    slots.forEach(slot => {
      const item = this.state.equipment ? this.state.equipment[slot] : null;
      if (item && (item.level || 1) <= maxLevel) {
        scrappedCount++;
        const fragGained = Math.max(1, Math.floor((item.level || 1) * 2));
        const ironGained = Math.max(5, Math.floor((item.level || 1) * 10));
        gainedFragments += fragGained;
        gainedIron += ironGained;
        delete this.state.equipment[slot];
      }
    });

    if (scrappedCount === 0) {
      return { success: false, message: 'Hurdaya çevrilecek boşta Lv.1 veya düşük eşya bulunamadı.' };
    }

    this.state.inventory.fragments = (this.state.inventory.fragments || 0) + gainedFragments;
    this.state.inventory.iron = (this.state.inventory.iron || 0) + gainedIron;

    sound.playRepair();
    this.saveState();

    return {
      success: true,
      scrappedCount,
      message: `♻️ ${scrappedCount} adet düşük seviye boşta eşya hurdaya ayrıldı! (+${gainedFragments} 💎 Teçhizat Parçaları, +${gainedIron} ⛏️ Demir)`
    };
  }

  // Krallıktaki, cephanelikteki ve askerlerdeki tüm hasarlı eşyaları tek seferde onarır
  // Krallıktaki, cephanelikteki ve askerlerdeki tüm hasarlı eşyaları tek seferde onarır
  repairAllEquipmentInKingdom() {
    const all = this.getAllArmoryEquipmentList();
    let totalIron = 0, totalWood = 0, totalAda = 0, repairedCount = 0;
    const toRepair = [];

    all.forEach(entry => {
      const cost = this.calculateEquipmentRepairCost(entry.item);
      if (cost && cost.missingDurability > 0) {
        totalIron += cost.ironCost;
        totalWood += cost.woodCost;
        totalAda += cost.adaCost;
        repairedCount++;
        toRepair.push({ item: entry.item, cost });
      }
    });

    if (repairedCount === 0) {
      return { success: false, message: 'Tüm silah ve zırhlar zaten 13/13 maksimum dayanıklılıkta!' };
    }

    const inv = this.state.inventory;
    if ((inv.iron || 0) < totalIron) return { success: false, message: `Yetersiz Demir! (${totalIron} Demir gerekli)` };
    if ((inv.wood || 0) < totalWood) return { success: false, message: `Yetersiz Odun! (${totalWood} Odun gerekli)` };
    if ((this.state.adAstraBalance || 0) < totalAda) return { success: false, message: `Yetersiz $ADASTRA! (${totalAda} ADA gerekli)` };

    inv.iron -= totalIron;
    inv.wood -= totalWood;
    this.burnResources({ wood: totalWood, iron: totalIron });
    this.state.adAstraBalance -= totalAda;
    globalPool.recordTokenSpend(totalAda);

    toRepair.forEach(({ item }) => {
      item.durability = item.maxDurability || 13;
    });

    sound.playRepair();
    this.saveState();

    return {
      success: true,
      repairedCount,
      message: `🔨 Krallıktaki ${repairedCount} parça teçhizat tek seferde onarıldı! (-${totalWood} Odun, -${totalIron} Demir, -${totalAda} ADA)`
    };
  }

  // Özelleştirilmiş Geliştirme: Belirli kategori (silah, miğfer vb.) ve belirli seviyedeki eşyaları geliştirir
  // Örnek: "Sadece Seviye 2 Silahları Geliştir" veya "Sadece Seviye 1 Miğferleri Geliştir"
  upgradeEquipmentByTypeAndLevel(targetSlot = null, targetLevel = null) {
    const all = this.getAllArmoryEquipmentList();
    let upgradedCount = 0;
    let messages = [];

    for (const entry of all) {
      const item = entry.item;
      if (!item) continue;
      const matchSlot = !targetSlot || targetSlot === 'all' || item.slot === targetSlot;
      const matchLevel = targetLevel == null || item.level === targetLevel;
      if (matchSlot && matchLevel && (item.level || 1) < (GAME_CONFIG.EQUIPMENT_MAX_LEVEL || 10)) {
        const res = this.upgradeEquipment(item);
        if (res.success) {
          upgradedCount++;
        } else {
          messages.push(res.message);
          break; // Kaynak yetmediğinde dur
        }
      }
    }

    if (upgradedCount === 0 && messages.length > 0) {
      return { success: false, message: messages[0] };
    }
    if (upgradedCount === 0) {
      return { success: false, message: 'Geliştirilecek uygun teçhizat bulunamadı!' };
    }

    return {
      success: true,
      upgradedCount,
      message: `✨ ${upgradedCount} adet teçhizat başarıyla bir sonraki seviyeye yükseltildi!`
    };
  }

  // Tüm Cephanelikteki Geliştirilebilir Eşyaları Toplu Geliştir
  upgradeAllEquipmentInKingdom() {
    return this.upgradeEquipmentByTypeAndLevel('all', null);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 👾 ZİNDAN KALICI (PERSISTENT) CANAVAR CANI YÖNETİMİ
  // ═══════════════════════════════════════════════════════════════════════
  getMonsterCurrentHp(floorLevel, baseHp) {
    if (!this.state.dungeonMonsterCurrentHp) this.state.dungeonMonsterCurrentHp = {};
    const saved = this.state.dungeonMonsterCurrentHp[floorLevel];
    return (saved != null && saved > 0) ? saved : baseHp;
  }

  recordMonsterHp(floorLevel, hp) {
    if (!this.state.dungeonMonsterCurrentHp) this.state.dungeonMonsterCurrentHp = {};
    if (hp <= 0) {
      delete this.state.dungeonMonsterCurrentHp[floorLevel];
    } else {
      this.state.dungeonMonsterCurrentHp[floorLevel] = Math.round(hp);
    }
    this.saveState();
  }

  clearMonsterHp(floorLevel) {
    if (this.state.dungeonMonsterCurrentHp) {
      delete this.state.dungeonMonsterCurrentHp[floorLevel];
      this.saveState();
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 🤖 TAVERNA 24 SAATLİK OTOMASYON BOTU (KÂRA ORTAK MODELİ)
  // ═══════════════════════════════════════════════════════════════════════
  calculateTavernaBotProfitAndCost() {
    const prod = GAME_CONFIG.BASE_PRODUCTION;
    const woodPrice = ammMarket.getPrice('wood') || 2.50;
    const ironPrice = ammMarket.getPrice('iron') || 4.00;
    const wheatPrice = ammMarket.getPrice('wheat') || 0.90;

    const grossValuePerMin = (prod.wood * woodPrice) + (prod.iron * ironPrice) + (prod.wheat * wheatPrice);
    const staminaPerMin = (3 * (GAME_CONFIG.STAMINA_COST_PER_EXPEDITION || 20)) / 18;
    const wheatPerMinForStamina = staminaPerMin * (GAME_CONFIG.WHEAT_PER_STAMINA || 3.15);
    const staminaCostPerMinAda = wheatPerMinForStamina * wheatPrice;

    const toolWoodPerMin = 3 * 1.5;
    const toolIronPerMin = 3 * 1.0;
    const toolMaterialCostPerMinAda = (toolWoodPerMin * woodPrice) + (toolIronPerMin * ironPrice);
    // Kural: Alet onarımında talep edilen odun ve demirin anlık market değerine eşdeğerde ADA da alınır
    const toolAdaPerMin = toolMaterialCostPerMinAda;
    const toolCostPerMinAda = toolMaterialCostPerMinAda + toolAdaPerMin;

    const netProfitPerMin = Math.max(1, grossValuePerMin - staminaCostPerMinAda - toolCostPerMinAda);
    const netProfit24h = Math.round(netProfitPerMin * 1440);
    const botCostAda = Math.max(100, Math.round(netProfit24h * 0.50));

    return {
      grossValuePerMin: parseFloat(grossValuePerMin.toFixed(2)),
      staminaCostPerMinAda: parseFloat(staminaCostPerMinAda.toFixed(2)),
      toolCostPerMinAda: parseFloat(toolCostPerMinAda.toFixed(2)),
      netProfitPerMin: parseFloat(netProfitPerMin.toFixed(2)),
      netProfit24h: Math.round(netProfit24h),
      grossRevenueAda: Math.round(grossValuePerMin * 1440),
      staminaWheatCostAda: Math.round(staminaCostPerMinAda * 1440),
      toolRepairCostAda: Math.round(toolCostPerMinAda * 1440),
      netProfitAda: Math.round(netProfit24h),
      botCostAda,
      dailyGrossValAda: Math.round(grossValuePerMin * 1440),
      dailyStaminaCostAda: Math.round(staminaCostPerMinAda * 1440),
      dailyWheatNeededForStamina: Math.round(wheatPerMinForStamina * 1440),
      dailyToolRepairAda: Math.round(toolCostPerMinAda * 1440),
      dailyNetProfitAda: Math.round(netProfit24h),
      dailyBotCostAda: botCostAda,
      livePrices: { wood: woodPrice, iron: ironPrice, wheat: wheatPrice }
    };
  }

  buyTavernaAutomationBot(useFree = false) {
    const calc = this.calculateTavernaBotProfitAndCost();
    const cost = useFree ? 0 : calc.botCostAda;

    if (!useFree && this.state.adAstraBalance < cost) {
      return {
        success: false,
        message: `Yetersiz $ADASTRA! 24 Saatlik Otomasyon Botu için ${cost.toLocaleString()} ADA gereklidir (Saf kârın %50'si).`
      };
    }

    if (!useFree) {
      this.state.adAstraBalance -= cost;
      globalPool.recordTokenSpend(cost);
    }

    const now = Date.now();
    if (this.state.botPaused && this.state.botPausedRemainingMs > 0) {
      this.state.botPausedRemainingMs += (24 * 3600 * 1000);
      this.state.botActiveUntil = now + this.state.botPausedRemainingMs;
      this.state.tavernaBotExpiresAt = this.state.botActiveUntil;
    } else {
      const baseTime = (this.state.botActiveUntil && this.state.botActiveUntil > now) ? this.state.botActiveUntil : now;
      this.state.botActiveUntil = baseTime + (24 * 3600 * 1000);
      this.state.tavernaBotActive = true;
      this.state.tavernaBotExpiresAt = this.state.botActiveUntil;
    }

    // Tüm auto-collector sistemleriyle geriye dönük uyum için activeBuffs'a da yaz
    if (!this.state.activeBuffs) this.state.activeBuffs = {};
    this.state.activeBuffs['auto_collector'] = {
      id: 'auto_collector',
      name: '24 Saatlik Otomasyon Botu',
      expiresAt: this.state.botActiveUntil
    };

    this.saveState();

    // 🚀 Bot satın alındığı saniye derhal ilk otonom döngüyü çalıştır (boştaki tüm seferleri anında başlat)
    try {
      this.runTavernaAutomationCycle();
    } catch (e) {
      console.warn('Bot initial cycle error:', e);
    }

    return {
      success: true,
      botActiveUntil: this.state.botActiveUntil,
      costPaid: cost,
      message: `🤖 24 Saatlik Otomasyon Botu aktifleştirildi! (Maliyet: ${cost.toLocaleString()} ADA, Kâr Ortaklığı: %50)`
    };
  }

  setBotSiloOption(autoUpgrade = true) {
    this.state.botSiloAutoUpgrade = !!autoUpgrade;
    if (!this.state.botSettings) this.state.botSettings = {};
    this.state.botSettings.siloAutoUpgrade = !!autoUpgrade;
    this.saveState();
    return { success: true, autoUpgrade: this.state.botSiloAutoUpgrade };
  }

  /**
   * 🤖 24 Saatlik Otomasyon Botu - Kapsamlı Akıllı Silo Alanı Yönetimi
   * Kullanıcı Talimatları Doğrultusunda:
   * 1. Silonun yükseltilebilip yükseltilemeyeceğini kontrol eder; botSiloAutoUpgrade === true ise HER ZAMAN ÖNCE SİLOYU YÜKSELTİR.
   * 2. Yükseltme için tüm depolar %80 doluluğa ulaşmış fakat yeterli ADA yoksa:
   *    Silonun %80 doluluğunu korur, %80 üzerindeki fazlalığı silo yükseltmek için gereken ADA birikene kadar AMM'de satar!
   * 3. Silonun yükseltilemediği durumlarda:
   *    Seferden elde edilecek kaynak miktarı kadar siloda yer açacak kadar AMM'den satış yapar (tam gereken yer açılır).
   * 4. botSiloAutoUpgrade === false (Kaynakları Sat Modu) ise:
   *    Silonun yarısını (%50) rezerve korur, fazlasını sürekli AMM'de satarak ADA'ya dönüştürür.
   */
  handleBotSiloSpace(nodeId, harvestYield) {
    const capMap = this.getWarehouseCapacity();
    const limit = capMap[nodeId];
    if (limit == null) return { handled: true, reason: 'no_limit' };

    const currentAmount = Number(this.state.inventory[nodeId]) || 0;
    const yieldAmount = Math.max(1, Number(harvestYield) || 0);
    const availableRoom = Math.max(0, limit - currentAmount);

    // KURAL 0: Her sefer sonlandığında silonun yükseltilip yükseltilemeyeceğini kontrol et.
    // Yükseltilebiliyorsa ve kullanıcı "silo yükseltme" seçeneğini seçmişse HER ZAMAN ÖNCE SİLOYU YÜKSELT!
    if (this.state.botSiloAutoUpgrade) {
      const upCost = this.getWarehouseUpgradeCost();
      if (upCost && upCost.canUpgrade) {
        const upRes = this.upgradeWarehouse();
        if (upRes && upRes.success) {
          const newCap = this.getWarehouseCapacity()[nodeId];
          return { handled: true, action: 'upgraded', newCapacity: newCap };
        }
      }
    }

    // KURAL 1 & 2: Kişi "Siloyu Yükselt" (botSiloAutoUpgrade = true) seçmişse:
    if (this.state.botSiloAutoUpgrade) {
      const upCost = this.getWarehouseUpgradeCost();

      // KURAL 2: Eğer siloyu yükseltmek için yeterli adastra yoksa:
      // Silonun %80 dolacağı kadar kaynak bıraksın sadece siloda,
      // geri kalan kaynağı silo yükseltmek için yeterli adastra birikene kadar satsın marketten!
      if (upCost && upCost.is80PercentFull && !upCost.canAffordCost) {
        const reqFill = Math.round(limit * 0.8);
        const surplus = Math.max(0, currentAmount - reqFill);
        const adaDeficit = Math.max(0, upCost.adAstra - (this.state.adAstraBalance || 0));

        if (surplus > 0 && adaDeficit > 0 && typeof ammMarket !== 'undefined' && ammMarket.executeSell) {
          const price = (ammMarket.getPrice && ammMarket.getPrice(nodeId)) ? ammMarket.getPrice(nodeId) : 1;
          const neededUnits = Math.max(1, Math.ceil(adaDeficit / price));
          const amountToSell = Math.min(surplus, neededUnits);

          if (amountToSell > 0) {
            const sellRes = ammMarket.executeSell(nodeId, amountToSell);
            if (sellRes && sellRes.success) {
              this.state.inventory[nodeId] = Math.max(0, (this.state.inventory[nodeId] || 0) - amountToSell);
              this.state.adAstraBalance = (this.state.adAstraBalance || 0) + (sellRes.adAstraReceived || 0);
              this.state.lastBotSiloAction = {
                timestamp: Date.now(),
                nodeId,
                amountSold: amountToSell,
                adAstraEarned: sellRes.adAstraReceived,
                reason: 'silo_upgrade_ada_deficit'
              };
              this.saveState();

              // Satış sonrası ADA tamamlandıysa anında yükseltmeyi dene!
              const freshCost = this.getWarehouseUpgradeCost();
              if (freshCost && freshCost.canUpgrade) {
                const freshUp = this.upgradeWarehouse();
                if (freshUp && freshUp.success) {
                  return { handled: true, action: 'upgraded', newCapacity: this.getWarehouseCapacity()[nodeId] };
                }
              }

              return {
                handled: true,
                action: 'sold_for_ada',
                amountSold: amountToSell,
                adAstraReceived: sellRes.adAstraReceived,
                message: `🤖 Silo yükseltme ADA açığını kapatmak için %80 barajı üzerindeki ${amountToSell} ${nodeId} satıldı (+${sellRes.adAstraReceived.toFixed(1)} ADA).`
              };
            }
          }
        }
      }

      // KURAL 1 (Adım 1): Sefer bittiğinde ilgili kaynağın silodaki yerine baksın.
      // Siloda yer varsa kaynağı toplayıp siloya göndersin.
      // Eğer siloda yeteri kadar yer yoksa, seferden elde edilecek kaynak miktarı kadar
      // siloda yer açacak kadar (artan miktar kadar) AMM'den satış yapsın!
      // (Örneğin sefer bitti ve 324 odun toplanacak, siloda 200 yer var: 124 odun markette satılır,
      // 324 odunun hepsi depolanır ve ambar tam 1080 ile %100 dolar, sefer sıfırlanıp biter).
      if (availableRoom < yieldAmount) {
        const shortfall = yieldAmount - availableRoom;
        const amountToSell = Math.min(currentAmount, shortfall);

        if (amountToSell > 0 && typeof ammMarket !== 'undefined' && ammMarket.executeSell) {
          const sellRes = ammMarket.executeSell(nodeId, amountToSell);
          if (sellRes && sellRes.success) {
            this.state.inventory[nodeId] = Math.max(0, (this.state.inventory[nodeId] || 0) - amountToSell);
            this.state.adAstraBalance = (this.state.adAstraBalance || 0) + (sellRes.adAstraReceived || 0);
            this.state.lastBotSiloAction = {
              timestamp: Date.now(),
              nodeId,
              amountSold: amountToSell,
              adAstraEarned: sellRes.adAstraReceived,
              reason: 'make_room_for_expedition_yield'
            };
            this.saveState();

            return {
              handled: true,
              action: 'sold',
              amountSold: amountToSell,
              adAstraReceived: sellRes.adAstraReceived,
              message: `🤖 Sefer hasadı için tam gereken yer açıldı: ${amountToSell} ${nodeId} AMM'de satıldı (+${sellRes.adAstraReceived.toFixed(1)} ADA).`
            };
          }
        }
      }

      return { handled: true, reason: 'space_sufficient', neededSell: 0, amountSold: 0 };
    }

    // KURAL 3: Kişi bot seçeneklerinde kaynakların marketten satılması seçeneğini seçmişse (botSiloAutoUpgrade = false):
    // O zaman elde edilen kaynakların hepsini sürekli satsın, sadece silonun YARISI (%50) dolu olacak kadar kaynağı biriktirsin!
    const halfCap = Math.floor(limit * 0.5);
    const projectedTotal = currentAmount + yieldAmount;
    if (projectedTotal > halfCap) {
      const surplusAboveHalf = Math.max(0, currentAmount - halfCap);
      const neededSpace = Math.max(0, projectedTotal - limit);
      const amountToSell = Math.min(currentAmount, Math.max(surplusAboveHalf, neededSpace));

      if (amountToSell > 0 && typeof ammMarket !== 'undefined' && ammMarket.executeSell) {
        const sellRes = ammMarket.executeSell(nodeId, amountToSell);
        if (sellRes && sellRes.success) {
          this.state.inventory[nodeId] = Math.max(0, (this.state.inventory[nodeId] || 0) - amountToSell);
          this.state.adAstraBalance = (this.state.adAstraBalance || 0) + (sellRes.adAstraReceived || 0);
          this.state.lastBotSiloAction = {
            timestamp: Date.now(),
            nodeId,
            amountSold: amountToSell,
            adAstraEarned: sellRes.adAstraReceived,
            reason: 'sell_mode_keep_half_cap'
          };
          this.saveState();

          return {
            handled: true,
            action: 'sold',
            amountSold: amountToSell,
            adAstraReceived: sellRes.adAstraReceived,
            message: `🤖 Kaynak Satış Modu: Silo yarısı (%50) korunup ${amountToSell} ${nodeId} satıldı (+${sellRes.adAstraReceived.toFixed(1)} ADA).`
          };
        }
      }
    }

    return { handled: true, reason: 'space_sufficient', neededSell: 0 };
  }

  /**
   * 🤖 Silo Yükseltme & %80 Barajında ADA Finansmanı (Adım 4 A Seçeneği 2. Bölüm)
   * Her sefer bitiminde tetiklenir:
   * 1. Tüm depolar %80 doluluğa ulaşmış mı kontrol eder.
   * 2. Gerekli hammadde (odun, demir, buğday) yeterliyse fakat ADA eksikse:
   *    Depolardaki %80 güvenlik barajının üstünde kalan fazlalık kaynakları AMM DEX'te satarak
   *    yükseltme için gereken ADA'yı finanse eder.
   * 3. ADA tamamlandığında siloyu derhal Seviye Atlatır!
   */
  tryAutoUpgradeWarehouseWithAdaFinancing() {
    if (!this.state.botSiloAutoUpgrade) return { success: false, reason: 'auto_upgrade_disabled' };

    let cost = this.getWarehouseUpgradeCost();
    if (!cost) return { success: false, reason: 'max_level' };

    // Eğer zaten yükseltilebiliyorsa doğrudan yükselt!
    if (cost.canUpgrade) {
      const upRes = this.upgradeWarehouse();
      if (upRes && upRes.success) {
        return { success: true, upgraded: true, newLevel: this.state.warehouseLevel };
      }
    }

    // %80 Barajında ADA Finansmanı:
    // Depolar %80 dolu mu?
    if (cost.is80PercentFull && !cost.canAffordCost) {
      const inv = this.state.inventory || {};
      const hasWood = (inv.wood || 0) >= cost.wood;
      const hasIron = (inv.iron || 0) >= cost.iron;
      const hasWheat = (inv.wheat || 0) >= cost.wheat;

      // Hammaddeler yeterli, sadece ADA eksikse:
      if (hasWood && hasIron && hasWheat) {
        let adaDeficit = Math.max(0, cost.adAstra - (this.state.adAstraBalance || 0));
        if (adaDeficit > 0 && typeof ammMarket !== 'undefined' && ammMarket.executeSell) {
          const cap = cost.currentCap || this.getWarehouseCapacity();
          const nodes = ['wood', 'iron', 'wheat'];
          let totalSoldAda = 0;

          for (const node of nodes) {
            if (adaDeficit <= 0) break;
            const baraj = Math.round((cap[node] || 0) * 0.8);
            const cur = Number(inv[node]) || 0;
            const surplus = Math.max(0, cur - baraj);

            if (surplus > 0) {
              const price = (ammMarket.getPrice && ammMarket.getPrice(node)) ? ammMarket.getPrice(node) : 1;
              const neededUnits = Math.max(1, Math.ceil(adaDeficit / price));
              const amountToSell = Math.min(surplus, neededUnits);

              if (amountToSell > 0) {
                const sellRes = ammMarket.executeSell(node, amountToSell);
                if (sellRes && sellRes.success) {
                  this.state.inventory[node] = Math.max(0, (this.state.inventory[node] || 0) - amountToSell);
                  const earned = sellRes.adAstraReceived || 0;
                  this.state.adAstraBalance = (this.state.adAstraBalance || 0) + earned;
                  totalSoldAda += earned;
                  adaDeficit = Math.max(0, adaDeficit - earned);
                }
              }
            }
          }

          this.saveState();

          // ADA tamamlandıysa siloyu derhal seviye atlat!
          const freshCost = this.getWarehouseUpgradeCost();
          if (freshCost && freshCost.canUpgrade) {
            const freshUp = this.upgradeWarehouse();
            if (freshUp && freshUp.success) {
              return { success: true, upgraded: true, newLevel: this.state.warehouseLevel, totalSoldAda };
            }
          }
        }
      }
    }

    return { success: false, reason: 'conditions_not_met' };
  }

  // Türkçe Kaynak İsimleri Çevirici
  getResourceNameTr(key) {
    if (!key) return '';
    const map = {
      wood: 'Odun',
      iron: 'Demir',
      wheat: 'Buğday',
      ada: 'ADA',
      adastra: '$ADASTRA',
      ticket: 'Bilet',
      fragments: 'Teçhizat Parçası',
      boxes: 'Pandora Kutusu',
      keys: 'Anahtar',
      scroll_heal: 'Şifa Parşömeni',
      scroll_stamina: 'Stamina Parşömeni',
      scroll_teleport: 'Işınlanma Parşömeni'
    };
    return map[String(key).toLowerCase()] || key;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 🎪 KRALLIK KARNAVALI: 14 ÖDÜLLÜ ŞANS ÇARKI & HAFTALIK PİYANGO
  // ═══════════════════════════════════════════════════════════════════════
  spinCarnivalWheel(paymentMethod = 'ada') {
    const costAda = GAME_CONFIG.CARNIVAL?.WHEEL_COST_ADA || 100;
    const inv = this.state.inventory;

    let burnedInfo = null;

    if (paymentMethod === 'ada') {
      if (this.state.adAstraBalance < costAda) {
        return { success: false, message: `Yetersiz $ADASTRA! Çark çevirmek için ${costAda} ADA gereklidir.` };
      }
      this.state.adAstraBalance -= costAda;
      globalPool.recordTokenSpend(costAda);
    } else if (paymentMethod === 'ticket') {
      if ((this.state.lotteryTickets || 0) < 1) {
        return { success: false, message: 'Çark çevirmek için en az 1 Piyango Biletine sahip olmalısın!' };
      }
      this.state.lotteryTickets -= 1;
    } else if (['wood', 'iron', 'wheat'].includes(paymentMethod)) {
      const price = ammMarket.getPrice(paymentMethod) || 1.0;
      const requiredAmount = Math.ceil(costAda / price);
      const resNameTr = this.getResourceNameTr(paymentMethod);
      if ((inv[paymentMethod] || 0) < requiredAmount) {
        return { success: false, message: `Yetersiz ${resNameTr}! 100 ADA değerinde hammadde için ${requiredAmount} adet gereklidir.` };
      }
      inv[paymentMethod] -= requiredAmount;
      // 🔥 HAMMADDE ANINDA YAKILIR VE KARNAVAL YAKIM SAYACINA YAZILIR
      this.recordCarnivalResourceBurn(paymentMethod, requiredAmount);
      burnedInfo = { resource: paymentMethod, resourceNameTr: resNameTr, amount: requiredAmount, fromPayment: true };

      // Hazine defteri ve tokenomics muhasebesi: 100 ADA eşdeğeri harcama kaydı
      globalPool.recordTokenSpend(costAda);
    } else {
      return { success: false, message: 'Geçersiz ödeme yöntemi!' };
    }

    const rewards = GAME_CONFIG.CARNIVAL.WHEEL_REWARDS;
    const totalWeight = rewards.reduce((s, r) => s + (r.weight || 1), 0);
    let rand = Math.random() * totalWeight;
    let selectedReward = rewards[0];

    for (const r of rewards) {
      if (rand < r.weight) {
        selectedReward = r;
        break;
      }
      rand -= r.weight;
    }

    let rewardSummaryText = selectedReward.name;
    let buybackInfo = null;

    if (selectedReward.type === 'ada') {
      // 🏛️ KARNAVAL HAZİNESİNDEN ADA ÖDÜLÜ: Havadan basılmaz, doğrudan Karnaval Hazine Kasasından karşılanır!
      const rewardAmount = selectedReward.amount || 0;
      const carnivalBalance = (typeof treasury !== 'undefined' && treasury.getPool) ? treasury.getPool('carnival') : ((typeof treasury !== 'undefined' && treasury.state?.pools?.carnival) || 0);
      const adaToPay = carnivalBalance > 0 ? Math.min(carnivalBalance, rewardAmount) : rewardAmount;

      if (typeof treasury !== 'undefined' && adaToPay > 0 && (treasury.state?.pools?.carnival || 0) > 0) {
        const actualDeduct = Math.min(treasury.state.pools.carnival, adaToPay);
        treasury.state.pools.carnival = Math.max(0, treasury.state.pools.carnival - actualDeduct);
        if (!treasury.state.outflow) treasury.state.outflow = {};
        treasury.state.outflow.carnival = (treasury.state.outflow.carnival || 0) + actualDeduct;
        treasury.save();
      }

      this.state.adAstraBalance += adaToPay;
      rewardSummaryText = `${adaToPay.toLocaleString('tr-TR')} $ADASTRA (🏛️ Karnaval Hazinesinden Karşılandı)`;

    } else if (selectedReward.key === 'fragments' || (selectedReward.type === 'resource' && selectedReward.key === 'fragments')) {
      // 🏛️ TEÇHİZAT PARÇALARI: Sonsuz/infinit basılmaz, Karnaval Hazinesi bütçesiyle AMM marketten buyback yapılıp kullanıcıya verilir!
      const fragAmount = selectedReward.amount || 1;
      const fragPrice = (typeof ammMarket !== 'undefined' && ammMarket.getPrice) ? (ammMarket.getPrice('fragments') || 45.0) : 45.0;
      const buyCostAda = Math.round(fragAmount * fragPrice);

      const carnivalBalance = (typeof treasury !== 'undefined' && treasury.getPool) ? treasury.getPool('carnival') : ((typeof treasury !== 'undefined' && treasury.state?.pools?.carnival) || 0);
      const adaToSpend = carnivalBalance > 0 ? Math.min(carnivalBalance, buyCostAda) : buyCostAda;

      if (typeof treasury !== 'undefined' && adaToSpend > 0 && (treasury.state?.pools?.carnival || 0) > 0) {
        const actualDeduct = Math.min(treasury.state.pools.carnival, adaToSpend);
        treasury.state.pools.carnival = Math.max(0, treasury.state.pools.carnival - actualDeduct);
        if (!treasury.state.outflow) treasury.state.outflow = {};
        treasury.state.outflow.carnival = (treasury.state.outflow.carnival || 0) + actualDeduct;
        treasury.save();
      }

      // AMM DEX Marketinden Buyback: Pazar havuzuna ADA girer, pazar havuzundan rezerv düşer
      if (typeof ammMarket !== 'undefined' && ammMarket.pools && ammMarket.pools.fragments) {
        ammMarket.pools.fragments.adAstraReserve = (ammMarket.pools.fragments.adAstraReserve || 0) + adaToSpend;
        ammMarket.pools.fragments.resourceReserve = Math.max(1, (ammMarket.pools.fragments.resourceReserve || 0) - fragAmount);
        if (typeof ammMarket.savePools === 'function') ammMarket.savePools();
      }

      // Kullanıcıya teslim edilir
      inv.fragments = (inv.fragments || 0) + fragAmount;
      rewardSummaryText = `${fragAmount} Teçhizat Parçası (🏛️ Karnaval Hazinesinden Market Buyback)`;
      buybackInfo = { item: `${fragAmount} Teçhizat Parçası`, adaSpent: adaToSpend };

    } else if (selectedReward.type === 'amm_raw' || ['wood', 'iron', 'wheat'].includes(selectedReward.key)) {
      // 🏛️ HAMMADDELER (Odun, Demir, Buğday): Sonsuz basılmaz, Karnaval Hazinesi bütçesiyle AMM marketten buyback yapılıp kullanıcıya verilir!
      const resKey = selectedReward.key;
      const p = (typeof ammMarket !== 'undefined' && ammMarket.getPrice) ? (ammMarket.getPrice(resKey) || 1.0) : 1.0;
      const grantAmount = selectedReward.amount || Math.round((selectedReward.adaVal || 50) / p);
      const buyCostAda = Math.round(grantAmount * p);

      const carnivalBalance = (typeof treasury !== 'undefined' && treasury.getPool) ? treasury.getPool('carnival') : ((typeof treasury !== 'undefined' && treasury.state?.pools?.carnival) || 0);
      const adaToSpend = carnivalBalance > 0 ? Math.min(carnivalBalance, buyCostAda) : buyCostAda;

      if (typeof treasury !== 'undefined' && adaToSpend > 0 && (treasury.state?.pools?.carnival || 0) > 0) {
        const actualDeduct = Math.min(treasury.state.pools.carnival, adaToSpend);
        treasury.state.pools.carnival = Math.max(0, treasury.state.pools.carnival - actualDeduct);
        if (!treasury.state.outflow) treasury.state.outflow = {};
        treasury.state.outflow.carnival = (treasury.state.outflow.carnival || 0) + actualDeduct;
        treasury.save();
      }

      // AMM DEX Marketinden Buyback: Pazar havuzuna ADA girer, pazar havuzundan hammadde düşer
      if (typeof ammMarket !== 'undefined' && ammMarket.pools && ammMarket.pools[resKey]) {
        ammMarket.pools[resKey].adAstraReserve = (ammMarket.pools[resKey].adAstraReserve || 0) + adaToSpend;
        ammMarket.pools[resKey].resourceReserve = Math.max(1, (ammMarket.pools[resKey].resourceReserve || 0) - grantAmount);
        if (typeof ammMarket.savePools === 'function') ammMarket.savePools();
      }

      // Kullanıcıya teslim edilir
      inv[resKey] = (inv[resKey] || 0) + grantAmount;
      const grantResNameTr = this.getResourceNameTr(resKey);
      rewardSummaryText = `${grantAmount.toLocaleString('tr-TR')} ${grantResNameTr} (🏛️ Karnaval Hazinesinden Market Buyback)`;
      buybackInfo = { item: `${grantAmount.toLocaleString('tr-TR')} ${grantResNameTr}`, adaSpent: adaToSpend };

    } else if (selectedReward.type === 'key' || selectedReward.id === 'box_key') {
      // 🏛️ PANDORA KUTUSU ANAHTARLARI: Sonsuz basılmaz, Karnaval Hazinesi bütçesiyle AMM marketten buyback yapılıp kullanıcıya verilir!
      const keyAmount = selectedReward.amount || 1;
      const keyPrice = (typeof ammMarket !== 'undefined' && ammMarket.getPrice) ? (ammMarket.getPrice('keys') || 1000.0) : 1000.0;
      const buyCostAda = Math.round(keyAmount * keyPrice);

      const carnivalBalance = (typeof treasury !== 'undefined' && treasury.getPool) ? treasury.getPool('carnival') : ((typeof treasury !== 'undefined' && treasury.state?.pools?.carnival) || 0);
      const adaToSpend = carnivalBalance > 0 ? Math.min(carnivalBalance, buyCostAda) : buyCostAda;

      if (typeof treasury !== 'undefined' && adaToSpend > 0 && (treasury.state?.pools?.carnival || 0) > 0) {
        const actualDeduct = Math.min(treasury.state.pools.carnival, adaToSpend);
        treasury.state.pools.carnival = Math.max(0, treasury.state.pools.carnival - actualDeduct);
        if (!treasury.state.outflow) treasury.state.outflow = {};
        treasury.state.outflow.carnival = (treasury.state.outflow.carnival || 0) + actualDeduct;
        treasury.save();
      }

      // AMM DEX Marketinden Buyback: Pazar havuzuna ADA girer, havuzdan anahtar düşer
      if (typeof ammMarket !== 'undefined' && ammMarket.pools && ammMarket.pools.keys) {
        ammMarket.pools.keys.adAstraReserve = (ammMarket.pools.keys.adAstraReserve || 0) + adaToSpend;
        ammMarket.pools.keys.resourceReserve = Math.max(1, (ammMarket.pools.keys.resourceReserve || 0) - keyAmount);
        if (typeof ammMarket.savePools === 'function') ammMarket.savePools();
      }

      // Kullanıcıya teslim edilir
      this.state.arenaKeys = (this.state.arenaKeys || 0) + keyAmount;
      rewardSummaryText = `${keyAmount} Pandora Kutusu Anahtarı (🏛️ Karnaval Hazinesinden Market Buyback)`;
      buybackInfo = { item: `${keyAmount} Pandora Kutusu Anahtarı`, adaSpent: adaToSpend };

    } else if (selectedReward.type === 'bot_free') {
      this.buyTavernaAutomationBot(true);
    } else if (selectedReward.type === 'scroll') {
      inv[selectedReward.key] = (inv[selectedReward.key] || 0) + selectedReward.amount;
    } else if (selectedReward.type === 'ticket_shard') {
      // 🎟️ AMORTİ BİLETLERİ: 10'dan 3'e indirildi! 3 adet amorti bileti geldiğinde 1 çark çevirme hakkı verir!
      this.state.wheelTicketShards = (this.state.wheelTicketShards || 0) + 1;
      if (this.state.wheelTicketShards >= 3) {
        this.state.wheelTicketShards -= 3;
        this.state.lotteryTickets = (this.state.lotteryTickets || 0) + 1;
        rewardSummaryText += ' (🎉 3 Parça Birikti: +1 Çark Çevirme / Piyango Bileti Kazanıldı!)';
      }
    } else if (selectedReward.type === 'analysis_code') {
      const code = `ALPHAVAX-COIN-${Date.now().toString(36).toUpperCase()}`;
      if (!Array.isArray(this.state.redeemCodes)) this.state.redeemCodes = [];
      this.state.redeemCodes.push({ code, type: 'coin_analysis', created: Date.now() });
      rewardSummaryText = `👑 Kodun: ${code} (Vercel App Coin Analizi)`;
    }

    sound.playLevelUp();
    this.saveState();

    return {
      success: true,
      reward: selectedReward,
      slice: selectedReward,
      rewardSummaryText,
      burnedInfo,
      buybackInfo,
      message: buybackInfo
        ? `🎉 Çarktan kazandın: ${rewardSummaryText}! (🏛️ Karnaval Hazine Kasasından ${buybackInfo.adaSpent.toLocaleString('tr-TR')} ADA ile AMM DEX pazarından buyback yapılıp teslim edildi)`
        : burnedInfo
        ? `🔥 ${burnedInfo.amount.toLocaleString('tr-TR')} ${burnedInfo.resourceNameTr} anında yakıldı ve sistemden silindi! Çarktan kazandın: ${rewardSummaryText}`
        : `🎉 Tebrikler! Çarktan kazandın: ${rewardSummaryText}`
    };
  }

  useScroll(scrollType, targetId = null) {
    if (!this.state.inventory) this.state.inventory = {};
    const inv = this.state.inventory;
    const count = inv[scrollType] || 0;
    if (count <= 0) {
      return { success: false, message: 'Envanterinde bu parşömenden hiç bulunmuyor!' };
    }

    if (scrollType === 'scroll_heal') {
      const soldiers = (this.state.soldierUnits && this.state.soldierUnits.length > 0) ? this.state.soldierUnits : (this.state.soldiers || []);
      if (soldiers.length === 0) {
        return { success: false, message: 'İyileştirilecek bir askerin bulunmuyor!' };
      }
      let target = null;
      if (targetId !== null && targetId !== undefined) {
        target = soldiers.find((s, idx) => s.id === targetId || String(idx) === String(targetId));
      }
      if (!target) {
        target = soldiers.find(s => (s.hp || 0) < (s.maxHp || 100));
      }
      if (!target) {
        return { success: false, message: 'Ordudaki tüm AdAstra Şampiyonlarının canı zaten tam dolu!' };
      }
      const healAmount = 10;
      target.hp = Math.min(target.maxHp || 100, (target.hp || 0) + healAmount);
      inv.scroll_heal -= 1;
      this.saveState();
      return {
        success: true,
        message: `📜 Ordu İyileştirme Parşömeni kullanıldı! ${target.name} +10 Can kazandı (${target.hp}/${target.maxHp || 100} HP).`
      };
    }

    if (scrollType === 'scroll_stamina') {
      const maxStamina = this.getMaxStamina();
      const curStam = this.state.stamina || 0;
      if (curStam >= maxStamina) {
        return { success: false, message: 'Dayanıklılığın (Stamina) zaten tamamen dolu!' };
      }
      const actualGain = Math.min(100, maxStamina - curStam);
      this.state.stamina = Math.min(maxStamina, curStam + 100);
      inv.scroll_stamina -= 1;
      this.saveState();
      return {
        success: true,
        message: `⚡ 100 Stamina Parşömeni kullanıldı! +${Math.round(actualGain)} Dayanıklılık dolduruldu (${Math.floor(this.state.stamina)}/${maxStamina} ⚡).`
      };
    }

    if (scrollType === 'scroll_repair') {
      return { success: false, message: '🔨 Alet onarım parşömenleri oyundan kaldırılmıştır. Aletlerinizi Demirci aracılığıyla (Odun + Demir + ADA) tamir edebilirsiniz.' };
    }

    return { success: false, message: 'Bilinmeyen parşömen türü!' };
  }

  buyLotteryTickets(ticketCount = 1) {
    const count = Math.max(1, parseInt(ticketCount) || 1);
    const maxAllowed = GAME_CONFIG.CARNIVAL?.LOTTERY?.MAX_TICKETS_PER_ACCOUNT || 100;
    const currentTickets = this.state.lotteryTickets || 0;

    if (currentTickets + count > maxAllowed) {
      const remainingCanBuy = Math.max(0, maxAllowed - currentTickets);
      return {
        success: false,
        message: `🚫 Balina İstifleme Kuralı: Bir hesap her hafta en fazla ${maxAllowed} bilet (10.000 ADA) satın alabilir! Mevcut biletin: ${currentTickets}, alabileceğin ek bilet: ${remainingCanBuy}.`
      };
    }

    const cost = count * (GAME_CONFIG.CARNIVAL?.LOTTERY?.TICKET_COST_ADA || 100);

    if (this.state.adAstraBalance < cost) {
      return { success: false, message: `Yetersiz $ADASTRA! ${count} bilet için ${cost} ADA gereklidir.` };
    }

    const amortiRate = GAME_CONFIG.CARNIVAL?.LOTTERY?.AMORTI_SHARE || 0.02;
    const amortiAmount = Math.round(cost * amortiRate * 100) / 100;
    const poolAmount = cost - amortiAmount;

    this.state.adAstraBalance -= cost;
    this.state.lotteryTickets = currentTickets + count;
    this.state.lotteryAmortiPool = (this.state.lotteryAmortiPool || 0) + amortiAmount;
    this.state.lotteryPool = (this.state.lotteryPool || 20000000) + poolAmount;

    sound.playHarvest();
    this.saveState();

    return {
      success: true,
      ticketCount: count,
      totalTickets: this.state.lotteryTickets,
      lotteryPool: this.state.lotteryPool,
      lotteryAmortiPool: this.state.lotteryAmortiPool,
      amortiAdded: amortiAmount,
      message: `🎟️ ${count} Adet Piyango Bileti satın alındı! (+${amortiAmount} ADA Amorti İade Havuzuna aktarıldı, Toplam Biletin: ${this.state.lotteryTickets} / Max ${maxAllowed})`
    };
  }

  drawWeeklyLottery() {
    const pool = this.state.lotteryPool || 20000000;
    const amortiShare = Math.round(pool * (GAME_CONFIG.CARNIVAL?.LOTTERY?.AMORTI_SHARE || 0.02));
    this.state.lotteryAmortiPool = (this.state.lotteryAmortiPool || 0) + amortiShare;
    this.state.lotteryPool = Math.max(0, pool - amortiShare);

    const userTickets = this.state.lotteryTickets || 0;
    const totalTickets = Math.max(100, userTickets + 900);
    const userWinChance = userTickets / totalTickets;
    const userWon = Math.random() < userWinChance;

    let burnedTickets = 0;
    let keptTickets = userTickets;
    let wonAmount = 0;

    if (userWon && userTickets > 0) {
      const ticketCostTotal = userTickets * 100;
      wonAmount = ticketCostTotal * 2; // Tam 2 katı (2x) kazanç!
      this.state.adAstraBalance += wonAmount;
      this.state.lotteryPool = Math.max(0, this.state.lotteryPool - wonAmount);
      burnedTickets = userTickets;
      keptTickets = 0;
      this.state.lotteryTickets = 0;
      sound.playLevelUp();
    }

    const message = userWon
      ? `👑 TEBRİKLER! Krallık Piyangosu size çıktı! Sahip olduğunuz ${burnedTickets} biletin net 2 katı (+${wonAmount.toLocaleString('tr-TR')} $ADASTRA) anında cüzdanınıza aktarıldı!`
      : (userTickets > 0
          ? `🎲 Çekiliş tamamlandı. Bu hafta ikramiye size çıkmadı ancak hiçbir biletiniz yanmadı! Satın aldığınız ${userTickets} adet biletiniz otomatik olarak bir sonraki haftaya devredildi, şansınız kesintisiz devam ediyor.`
          : `🎲 Çekiliş tamamlandı. Bu hafta biletiniz bulunmuyordu. Bir sonraki haftaya devreden dev kasadan pay almak için bilet alabilirsiniz.`);

    return {
      userWon,
      wonAmount,
      winnerShare: wonAmount,
      amortiShare,
      rolloverPool: this.state.lotteryPool,
      userTicketsRemaining: keptTickets,
      burnedTickets,
      message
    };
  }

  burnLotteryTicketsForAmorti(count = 1) {
    const userTickets = this.state.lotteryTickets || 0;
    const toBurn = Math.min(userTickets, Math.max(1, parseInt(count) || 1));
    if (toBurn <= 0) return { success: false, message: 'Yakılacak biletin bulunmuyor!' };

    const amortiPool = this.state.lotteryAmortiPool || 0;
    if (amortiPool <= 0) {
      return { success: false, message: 'Amorti havuzunda henüz birikmiş $ADASTRA bulunmuyor.' };
    }

    const baseAmortiPerTicket = (GAME_CONFIG.CARNIVAL?.LOTTERY?.TICKET_COST_ADA || 100) * (GAME_CONFIG.CARNIVAL?.LOTTERY?.AMORTI_SHARE || 0.02);
    const calculatedPayout = Math.round(toBurn * baseAmortiPerTicket);
    const totalPayout = Math.min(amortiPool, Math.max(1, calculatedPayout));

    this.state.lotteryTickets -= toBurn;
    this.state.lotteryAmortiPool = Math.max(0, amortiPool - totalPayout);
    this.state.adAstraBalance += totalPayout;

    this.saveState();
    return {
      success: true,
      burned: toBurn,
      payout: totalPayout,
      message: `🎟️ ${toBurn} Bilet yakıldı ve Amorti Kasasından +${totalPayout.toLocaleString()} ADA çekildi!`
    };
  }

  // 👑 TALİHLİ BİLET YAKIMI & 2 KATINA KASADAN ADA ÇEKİMİ
  claimWinnerLotteryPayout(count = null) {
    const userTickets = this.state.lotteryTickets || 0;
    if (userTickets <= 0) {
      return { success: false, message: 'Yakılacak piyango biletin bulunmuyor!' };
    }

    const toBurn = (count !== null && count !== undefined && parseInt(count) > 0)
      ? Math.min(userTickets, parseInt(count))
      : userTickets;

    const ticketValAda = GAME_CONFIG.CARNIVAL?.LOTTERY?.TICKET_COST_ADA || 100;
    const multiplier = GAME_CONFIG.CARNIVAL?.LOTTERY?.WINNER_MULTIPLIER || 2.0;
    const payoutAda = Math.round(toBurn * ticketValAda * multiplier);

    const pool = this.state.lotteryPool || 20000000;
    const actualPayout = Math.min(pool, payoutAda);

    this.state.lotteryTickets = Math.max(0, userTickets - toBurn);
    this.state.lotteryPool = Math.max(0, pool - actualPayout);
    this.state.adAstraBalance += actualPayout;

    sound.playLevelUp();
    this.saveState();

    return {
      success: true,
      burnedTickets: toBurn,
      payoutAda: actualPayout,
      remainingTickets: this.state.lotteryTickets,
      remainingPool: this.state.lotteryPool,
      message: `🏆 TEBRİKLER TALİHLİ! ${toBurn} adet piyango biletin fırında yakıldı ve bilet değerinin tam 2 katı (+${actualPayout.toLocaleString('tr-TR')} $ADASTRA) Piyango Hazne Kasasından çekilerek cüzdanına aktarıldı!`
    };
  }

  useLotteryTicketForWheel() {
    return this.spinCarnivalWheel('ticket');
  }

  // =========================================================================
  // 6. GAMEFI & RPG EKONOMİSİ (PHASE 1)
  // =========================================================================

  // Zindan Canavarı Yenildiğinde XP, AdAstra ve Şansa Bağlı Ganimet Dağıtır
  addDungeonXpAndDrops(level, isBoss = false) {
    const lvl = Math.max(1, Math.min(18, level));
    // SADECE Kat 3 (Lv.9 Kadim Taş Golyat) ve Kat 6 (Lv.18 Kıyamet Ejderhası IGNIS) Bosslarında %100 çarpan etkisi (+%100 ekstra şans, 2 katı)
    const isMajorBoss = isBoss || lvl === 9 || lvl === 18;
    const bossMultiplier = isMajorBoss ? (GAME_CONFIG.BOSS_DROP_MULTIPLIER || 2.0) : 1.0;

    const xpGained = Math.floor(200 * lvl * (isMajorBoss ? 3.0 : 1));
    const targetAdAstra = Math.floor(90 * lvl * (isMajorBoss ? 3.0 : 1));
    const draw = (typeof treasury !== 'undefined' && treasury && treasury.withdraw)
      ? treasury.withdraw('dungeon', targetAdAstra)
      : { granted: targetAdAstra };
    const adAstraGained = Math.max(1, Math.round(draw.granted != null ? draw.granted : targetAdAstra));
    this.state.currentXp += xpGained;
    this.state.adAstraBalance += adAstraGained;

    let fragmentsGained = 0;
    const accountLevel = this.state.level || 1;
    const fragmentChance = Math.min(0.95, this.getFragmentDropRate(accountLevel) * bossMultiplier);
    if (Math.random() < fragmentChance) {
      fragmentsGained = isMajorBoss ? (3 + Math.floor(Math.random() * 4)) : (1 + Math.floor(Math.random() * 2));
      this.state.inventory.fragments = (this.state.inventory.fragments || 0) + fragmentsGained;
    }

    let boxGained = 0;
    const boxChance = Math.min(0.5, this.getBoxDropRate(accountLevel) * bossMultiplier);
    if (Math.random() < boxChance) {
      boxGained = 1;
      this.state.lockedBoxes = (this.state.lockedBoxes || 0) + 1;
    }

    let artifactDiscovered = null;
    if (isMajorBoss) {
      const artifactChance = Math.min(1, GAME_CONFIG.ARTIFACT_BASE_RATE * lvl * 6);
      if (Math.random() < artifactChance) {
        artifactDiscovered = this.discoverArtifact(lvl);
      }
    }

    // 📜 Zindan Zafer Ganimeti: Canavarlardan Düşen Parşömenler (Yalnızca Ordu İyileştirme & 100 Stamina)
    let scrollGained = null;
    const scrollChance = isMajorBoss ? 0.40 : 0.07;
    if (Math.random() < scrollChance) {
      const isHeal = Math.random() < 0.60;
      const scrollType = isHeal ? 'scroll_heal' : 'scroll_stamina';
      this.state.inventory[scrollType] = (this.state.inventory[scrollType] || 0) + 1;
      scrollGained = {
        type: scrollType,
        name: isHeal ? 'Ordu İyileştirme Parşömeni (+10 HP)' : '100 Stamina Doldurma Parşömeni',
        icon: isHeal ? '📜' : '⚡',
        image: isHeal ? 'assets/scroll_heal.jpg' : 'assets/scroll_stamina.jpg'
      };
    }

    sound.playLevelUp();
    this.saveState();

    return { xpGained, adAstraGained, fragmentsGained, boxGained, artifactDiscovered, scrollGained, isBoss: isMajorBoss };
  }

  // Henüz Keşfedilmemiş Bir Koleksiyon Eserini Açığa Çıkarır (Varsa Zindan Seviyesine Uygun Olanı Önceliklendirir)
  discoverArtifact(preferredLevel = null) {
    const undiscovered = this.state.collectionArtifacts.filter(a => !a.discovered);
    if (undiscovered.length === 0) return null;

    const exactMatch = preferredLevel !== null
      ? undiscovered.find(a => {
        const cfg = GAME_CONFIG.COLLECTION_ARTIFACTS.find(c => c.id === a.id);
        return cfg && cfg.dropLevel === preferredLevel;
      })
      : null;

    const pick = exactMatch || undiscovered[Math.floor(Math.random() * undiscovered.length)];
    pick.discovered = true;
    pick.discoveredAt = Date.now();

    const cfg = GAME_CONFIG.COLLECTION_ARTIFACTS.find(c => c.id === pick.id);
    return { id: pick.id, name: cfg.name, icon: cfg.icon, rarity: cfg.rarity, lore: cfg.lore };
  }

  // Kilitli Sandığı Açar (SADECE 18 Koleksiyon Eserinden Biri Çıkar - Rarity Ağırlıklı)
  unboxMysteryBox() {
    if ((this.state.lockedBoxes || 0) <= 0) {
      return { success: false, message: 'Açılacak Pandora Kutun yok!' };
    }
    if ((this.state.arenaKeys || 0) <= 0) {
      return {
        success: false,
        message: '🔑 Pandora Kutusu açmak için en az 1 Anahtar gerekir! (Anahtarlar yalnızca Kolezyum haftalık derecesinden, Şans Çarkından veya AMM Pazarından temin edilebilir).'
      };
    }

    this.state.lockedBoxes -= 1;
    this.state.arenaKeys -= 1;

    // Rarity Ağırlıkları: Common (%50), Rare (%30), Epic (%15), Legendary (%5)
    const roll = Math.random();
    let selectedRarity = 'common';
    if (roll < 0.05) {
      selectedRarity = 'legendary'; // %5 Efsanevi
    } else if (roll < 0.20) {
      selectedRarity = 'epic';      // %15 Epik
    } else if (roll < 0.50) {
      selectedRarity = 'rare';      // %30 Nadir
    } else {
      selectedRarity = 'common';    // %50 Yaygın
    }

    // Seçilen rarity'ye ait tüm eserleri bul
    const pool = GAME_CONFIG.COLLECTION_ARTIFACTS.filter(c => c.rarity === selectedRarity);
    const chosenConfig = pool.length > 0
      ? pool[Math.floor(Math.random() * pool.length)]
      : GAME_CONFIG.COLLECTION_ARTIFACTS[Math.floor(Math.random() * GAME_CONFIG.COLLECTION_ARTIFACTS.length)];

    // Kullanıcının koleksiyonundaki eşleşen eseri bul veya oluştur
    let userArt = (this.state.collectionArtifacts || []).find(a => a.id === chosenConfig.id);
    if (!userArt) {
      userArt = { id: chosenConfig.id, discovered: false, discoveredAt: null, count: 0 };
      if (!this.state.collectionArtifacts) this.state.collectionArtifacts = [];
      this.state.collectionArtifacts.push(userArt);
    }

    const wasDiscovered = userArt.discovered;
    userArt.discovered = true;
    if (!userArt.discoveredAt) userArt.discoveredAt = Date.now();
    userArt.count = (userArt.count || 0) + 1;

    const rarityBadge = chosenConfig.rarity === 'legendary' ? '💎 EFSANEVİ' : (chosenConfig.rarity === 'epic' ? '🟣 EPİK' : (chosenConfig.rarity === 'rare' ? '🔵 NADİR' : '🟢 YAYGIN'));
    const isDuplicate = wasDiscovered;

    sound.playLevelUp();
    this.saveState();

    return {
      success: true,
      type: 'artifact',
      isDuplicate,
      artifact: {
        id: chosenConfig.id,
        name: chosenConfig.name,
        icon: chosenConfig.icon,
        rarity: chosenConfig.rarity,
        lore: chosenConfig.lore,
        count: userArt.count
      },
      message: isDuplicate
        ? `📦 Pandora Kutusundan [${rarityBadge}] ${chosenConfig.icon} ${chosenConfig.name} çıktı! (Koleksiyonunda ${userArt.count} adet oldu)`
        : `🎉 TEBRİKLER! Pandora Kutusundan YENİ [${rarityBadge}] ${chosenConfig.icon} ${chosenConfig.name} keşfettin!`
    };
  }

  openMysteryBox() {
    return this.unboxMysteryBox();
  }

  // 18 Koleksiyon Eseri Tamamlandığında Genesis NFT'yi Basar
  mintGenesisNft() {
    if (this.state.genesisNftMinted) {
      return { success: false, message: 'Genesis NFT zaten basıldı!' };
    }

    const required = GAME_CONFIG.GENESIS_NFT.requiredArtifacts;
    const discoveredCount = this.state.collectionArtifacts.filter(a => a.discovered).length;
    if (discoveredCount < required) {
      return { success: false, message: `Tüm koleksiyonu tamamlamalısın! (${discoveredCount}/${required} Eser)` };
    }

    const cost = GAME_CONFIG.GENESIS_NFT.adAstraCost;
    if (this.state.adAstraBalance < cost) {
      return { success: false, message: `Yetersiz AdAstra! (${cost} $ADASTRA gerekli)` };
    }

    this.state.adAstraBalance -= cost;
    globalPool.recordTokenSpend(cost);
    this.state.genesisNftMinted = true;

    sound.playLevelUp();
    this.saveState();

    return { success: true, message: `🏆 ${GAME_CONFIG.GENESIS_NFT.name} başarıyla basıldı! Efsane tamamlandı!` };
  }

  // Kolezyum/Arena Girişleri İçin Arena Anahtarı Ekler
  addArenaKey(count = 1) {
    this.state.arenaKeys = (this.state.arenaKeys || 0) + count;
    this.saveState();
    return this.state.arenaKeys;
  }

  // =========================================================================
  // 🧪 GELİŞTİRİCİ & HIZLI TEST METOTLARI (DEV CHEAT ENGINE)
  // =========================================================================
  addDevResource(resourceKey, amount) {
    if (!this.state.inventory) this.state.inventory = {};
    this.state.inventory[resourceKey] = Math.max(0, (this.state.inventory[resourceKey] || 0) + amount);
    this.saveState();
    return this.state.inventory[resourceKey];
  }

  setDevResource(resourceKey, exactAmount) {
    if (!this.state.inventory) this.state.inventory = {};
    this.state.inventory[resourceKey] = Math.max(0, exactAmount);
    this.saveState();
    return this.state.inventory[resourceKey];
  }

  addDevAdAstra(amount) {
    this.state.adAstraBalance = Math.max(0, (this.state.adAstraBalance || 0) + amount);
    this.saveState();
    return this.state.adAstraBalance;
  }

  setDevAdAstra(exactAmount) {
    this.state.adAstraBalance = Math.max(0, exactAmount);
    this.saveState();
    return this.state.adAstraBalance;
  }

  activateTavernBuff(buffId, durationDays = 1) {
    const buffConfig = GAME_CONFIG.TAVERN_BUFFS[buffId] || { name: buffId, durationSeconds: durationDays * 86400 };
    const now = Date.now();
    const durSec = (buffConfig.durationSeconds || durationDays * 86400);
    this.state.activeBuffs[buffId] = {
      id: buffId,
      name: buffConfig.name,
      expiresAt: now + durSec * 1000
    };
    this.saveState();
  }

  fastForwardTime(hours) {
    const seconds = hours * 3600;
    // 1. Aktif Seferleri İlerlet
    for (const nodeId of Object.keys(this.state.activeExpeditions || {})) {
      const exp = this.state.activeExpeditions[nodeId];
      if (exp && !exp.isCompleted) {
        exp.elapsedSeconds += seconds;
        if (exp.elapsedSeconds >= exp.durationSeconds) {
          exp.elapsedSeconds = exp.durationSeconds;
          exp.isCompleted = true;
        }
      }
    }
    // 2. Taverna Güçlendirmelerini İlerlet (expiresAt mutlak zaman damgasını geriye sarar)
    for (const buffId of Object.keys(this.state.activeBuffs || {})) {
      const buff = this.state.activeBuffs[buffId];
      if (buff && buff.expiresAt) {
        buff.expiresAt -= seconds * 1000;
      }
    }
    // 3. Ordunun (soldierUnits) Buğday ile Pasif İyileşmesini İlerlet
    this.processSoldierPassiveHealing(seconds);
    this.saveState();
  }

  completeAllExpeditionsNow() {
    for (const nodeId of Object.keys(this.state.activeExpeditions || {})) {
      const exp = this.state.activeExpeditions[nodeId];
      if (exp) {
        exp.elapsedSeconds = exp.durationSeconds;
        exp.isCompleted = true;
      }
    }
    this.saveState();
  }

  claimAllCompletedExpeditions() {
    const results = [];
    for (const nodeId of Object.keys(this.state.activeExpeditions || {})) {
      const exp = this.state.activeExpeditions[nodeId];
      if (exp && exp.isCompleted) {
        const res = this.claimExpedition(nodeId);
        results.push(res);
      }
    }
    return results;
  }

  refillDevStamina() {
    this.state.stamina = this.getMaxStamina();
    this.saveState();
  }

  setDevLevel(targetLevel) {
    this.state.level = Math.max(1, Math.min(GAME_CONFIG.MAX_PLAYER_LEVEL, targetLevel));
    this.saveState();
  }

  healAllDevSoldiers() {
    if (Array.isArray(this.state.soldierUnits)) {
      this.state.soldierUnits.forEach(s => {
        s.hp = s.maxHp || 100;
      });
    }
    this.saveState();
  }

  repairAllDevTools() {
    Object.keys(this.state.tools || {}).forEach(t => {
      if (this.state.tools[t]) {
        this.state.tools[t].durability = 4320;
      }
    });
    // Silah & Zırhları da Tamir Et
    if (Array.isArray(this.state.soldierUnits)) {
      this.state.soldierUnits.forEach(u => {
        if (u.weapon) { u.weapon.durability = 100; u.weapon.repairsLeft = 18; }
        if (u.armor) { u.armor.durability = 100; u.armor.repairsLeft = 18; }
      });
    }
    this.saveState();
  }

  unlockAllDevArtifacts() {
    if (Array.isArray(this.state.collectionArtifacts)) {
      this.state.collectionArtifacts.forEach(a => {
        a.discovered = true;
        a.discoveredAt = Date.now();
      });
    }
    this.saveState();
  }

  setDungeonProgress(level) {
    this.state.dungeonProgress = Math.max(1, Math.min(18, level));
    this.saveState();
  }

  // 🍦 VANILLA HESAP & 100M $ADASTRA İLK DAĞITIM TOHUM HAVUZLARI VE TÜM HAZİNELERİ SIFIRLAMA:
  // 1. Oyuncunun kişisel hesabını başlangıç profiline döndürür.
  // 2. Haftalık kaynak çıkartma limitlerini tam kapasiteye (%100) sıfırlar.
  // 3. AMM DEX Pazar Havuzlarını tam 40M $ADASTRA ilk tohum rezervlerine sıfırlar.
  // 4. Krallık Hazinesi Kasalarını (Zindan 14M, Arena 8M, World Boss 8M, AMM Buyback 6M, Karnaval 4M) tam 40M $ADASTRA ilk tohum rezervlerine sıfırlar.
  // 5. Krallık Piyango Havuzunu tam 20M $ADASTRA tohumuna sıfırlar.
  // 6. World Boss'u tam 1.000.000 Can ve 8M ADA ödül havuzuyla ilk haline sıfırlar.
  // 7. Kolezyum Gladyatör Arenasını, ELO derecesini, günlük maç haklarını ve liderlik tablosunu sıfırlar.
  // 8. Zindan katlarını ve canavar canlarını Seviye 1'e ve %100 tam cana sıfırlar.
  // Toplam 100 Milyon $ADASTRA başlangıç fonu ilk anki oranlarıyla oyuna yeniden dağıtılır!
  vanillaReset() {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.storageKey);
    }
    if (typeof globalPool !== 'undefined' && globalPool && globalPool.resetEpoch) {
      globalPool.resetEpoch();
    }
    if (typeof ammMarket !== 'undefined' && ammMarket && ammMarket.resetPools) {
      ammMarket.resetPools();
    }
    if (typeof treasury !== 'undefined' && treasury && treasury.resetToSeed) {
      treasury.resetToSeed();
    } else if (typeof treasury !== 'undefined' && treasury && treasury.reset) {
      treasury.reset();
    }
    this.state = {
      name: 'AlphAvax Gezgini',
      level: 1,
      currentXp: 0,
      stamina: 100,
      adAstraBalance: 250,
      inventory: {
        wood: 60,
        iron: 40,
        wheat: 80,
        fragments: 0
      },
      tools: {
        axe: { durability: 4320, totalGathered: 0 },
        pickaxe: { durability: 4320, totalGathered: 0 },
        sickle: { durability: 4320, totalGathered: 0 }
      },
      army: {
        infantry: 2,
        archer: 1,
        knight: 0
      },
      equipment: {
        weapon: null,
        helmet: null,
        armor: null,
        legs: null,
        boots: null
      },
      warehouseLevel: 1,
      lockedBoxes: 0,
      arenaKeys: 0,
      genesisNftMinted: false,
      activeBuffs: {},
      activeExpeditions: {},
      dungeonProgress: 1,
      collectionArtifacts: this.mergeCollectionArtifacts([]),
      soldierUnits: this.mergeSoldierUnits([]),
      armoryInventory: [],
      dungeonMonsterCurrentHp: {},
      lotteryTickets: 0,
      lotteryPool: (GAME_CONFIG.LOTTERY && GAME_CONFIG.LOTTERY.SEED_POOL_ADA) || 20000000,
      lotteryAmortiPool: 0,
      wheelTicketShards: 0,
      botSiloAutoUpgrade: true,
      botActiveUntil: 0,
      tavernaBotActive: false,
      redeemCodes: [],
      burnedResources: { wood: 0, iron: 0, wheat: 0 },
      lastClaimedUbiEpoch: 0,
      totalUbiEarned: 0,
      // 🏟️ KOLEZYUM GLADYATÖR ARENASI İLK DAĞITIM VE DURUM SIFIRLAMA
      colosseumStats: {
        wins: 0,
        losses: 0,
        score: 0,
        rank: 11,
        totalAdaWon: 0,
        rating: (GAME_CONFIG.COLOSSEUM && GAME_CONFIG.COLOSSEUM.STARTING_RATING) || 1000
      },
      colosseumLeaderboard: [
        { rank: 1, name: 'Kraliyet Gladyatörü Leonidas', score: 48, wins: 48, losses: 2, icon: '🦁', title: 'Arena Şampiyonu', rewardKeys: 5, rewardAda: 15000 },
        { rank: 2, name: 'Valkyrie Selin', score: 42, wins: 42, losses: 5, icon: '⚔️', title: 'Yenilmez Gladyatör', rewardKeys: 3, rewardAda: 8000 },
        { rank: 3, name: 'Gölge Şövalyesi Eren', score: 38, wins: 38, losses: 7, icon: '🗡️', title: 'Arenanın Fatihi', rewardKeys: 1, rewardAda: 2500 },
        { rank: 4, name: 'Titan Barok', score: 35, wins: 35, losses: 8, icon: '🗿', title: 'Taş Muhafız', rewardKeys: 1, rewardAda: 2500 },
        { rank: 5, name: 'Büyücü Zafira', score: 31, wins: 31, losses: 9, icon: '🧙‍♀️', title: 'Kadim Elementalist', rewardKeys: 1, rewardAda: 2500 },
        { rank: 6, name: 'Gece Avcısı Kaan', score: 28, wins: 28, losses: 10, icon: '🏹', title: 'Usta Nişancı', rewardKeys: 1, rewardAda: 2500 },
        { rank: 7, name: 'Korsan Kaptan Drake', score: 25, wins: 25, losses: 12, icon: '🏴‍☠️', title: 'Denizler Fatihi', rewardKeys: 1, rewardAda: 2500 },
        { rank: 8, name: 'Ejderha Süvarisi Alperen', score: 22, wins: 22, losses: 13, icon: '🐉', title: 'Ateş Lordu', rewardKeys: 1, rewardAda: 2500 },
        { rank: 9, name: 'Kutsal Şövalye Galahad', score: 19, wins: 19, losses: 14, icon: '🛡️', title: 'Işık Muhafızı', rewardKeys: 1, rewardAda: 2500 },
        { rank: 10, name: 'Fırtına Savaşçısı Zephyr', score: 16, wins: 16, losses: 15, icon: '⚡', title: 'Fırtına Getiren', rewardKeys: 1, rewardAda: 2500 },
      ],
      dailyCounters: {
        date: new Date().toISOString().slice(0, 10),
        arenaMatches: 0,
        dungeonRuns: 0
      },
      // 🌋 DÜNYA BOSSU (WORLD BOSS) İLK DAĞITIM VE CAN SIFIRLAMA
      worldBoss: {
        name: 'Kadim Kıyamet Behemoth\'u (WORLD BOSS)',
        icon: '🌋',
        totalVaultPool: (typeof treasury !== 'undefined' && treasury.getPool) ? Math.round(treasury.getPool('worldBoss')) : 8000000,
        weeklyDistributionRate: (GAME_CONFIG.WORLD_BOSS && GAME_CONFIG.WORLD_BOSS.WEEKLY_DISTRIBUTION_RATE) || 0.10,
        weeklyDistributionPool: Math.round(((typeof treasury !== 'undefined' && treasury.getPool) ? Math.round(treasury.getPool('worldBoss')) : 8000000) * 0.10),
        weeklyAdaPool: (typeof treasury !== 'undefined' && treasury.getPool) ? Math.round(treasury.getPool('worldBoss')) : 8000000,
        bossHp: 1000000,
        maxBossHp: 1000000,
        bossAtk: 500000,
        stakedArmyCount: 0,
        totalStakedAtk: 0,
        totalStakedHp: 0,
        userStaked: false,
        userDamage: 0,
        userStakedSoldiersCount: 0,
        userStakedAtk: 0,
        userStakedHp: 0,
        claimableRewardAda: 0,
        totalClaimedAda: 0,
        lastBattleTimestamp: null
      }
    };
    this.saveState();
  }

  // =========================================================================
  // DASHBOARD: KRALIK GENEL BAKIŞ & TOPLU EYLEMLER
  // =========================================================================
  getRealmSummary() {
    const state = this.state;
    const tools = state.tools || {};
    const soldiers = state.soldierUnits || [];
    const exps = state.activeExpeditions || {};

    // Aktif Seferler
    const activeExps = Object.keys(exps).map(nodeId => {
      const exp = exps[nodeId];
      const info = this.getAccruedExpeditionHarvest(nodeId);
      const nodeConfig = GAME_CONFIG.GLOBAL_RESOURCE_CAPS[nodeId];
      return { nodeId, name: nodeConfig?.name || nodeId, icon: nodeConfig?.icon || '📦', ...info, isCompleted: exp.isCompleted };
    });
    const completedExps = activeExps.filter(e => e.isCompleted);

    // Alet Sağlığı (72 Saat = 4320 Dakika)
    const toolSummary = Object.keys(tools).map(toolId => {
      const t = tools[toolId];
      const cfg = GAME_CONFIG.TOOLS[toolId];
      const maxDur = cfg?.maxDurability || 4320;
      const curDur = Math.max(0, Math.min(maxDur, t.durability != null ? t.durability : maxDur));
      const pct = Math.min(100, Math.max(0, Math.round((curDur / maxDur) * 100)));
      return { id: toolId, name: cfg?.name || toolId, durability: curDur, maxDurability: maxDur, pct, icon: cfg?.icon || '🔧' };
    });
    const avgToolHealth = toolSummary.length > 0 ? Math.round(toolSummary.reduce((s, t) => s + t.pct, 0) / toolSummary.length) : 100;

    // Ordu Durumu
    const totalAtk = soldiers.reduce((s, sol, i) => s + (this.getSoldierFullStats(i)?.totalAtk || 20), 0);
    const totalHp = soldiers.reduce((s, sol, i) => s + (this.getSoldierFullStats(i)?.totalMaxHp || 100), 0);
    const woundedCount = soldiers.filter(s => (s.hp || 0) < (s.maxHp || 100)).length;
    const avgHpPct = soldiers.length > 0 ? Math.round(soldiers.reduce((s, sol) => s + ((sol.hp || 0) / (sol.maxHp || 100)) * 100, 0) / soldiers.length) : 100;

    // Depo
    const inv = state.inventory || {};
    const whCap = this.getWarehouseCapacity();

    return {
      level: state.level, xp: state.currentXp, ada: state.adAstraBalance,
      stamina: state.stamina, maxStamina: this.getMaxStamina(),
      activeExps, completedExps,
      toolSummary, avgToolHealth,
      soldierCount: soldiers.length, totalAtk, totalHp, woundedCount, avgHpPct,
      inventory: inv, warehouseCapacity: whCap,
      woodPct: Math.min(100, Math.round(((inv.wood || 0) / (whCap.wood || 1080)) * 100)),
      ironPct: Math.min(100, Math.round(((inv.iron || 0) / (whCap.iron || 720)) * 100)),
      wheatPct: Math.min(100, Math.round(((inv.wheat || 0) / (whCap.wheat || 900)) * 100)),
    };
  }

  // =========================================================================
  // 🏛️ KRALLIK HAZİNESİ, TOKENOMİCS VE TÜM HAVUZLARIN DETAYLI ÖZETİ
  // =========================================================================
  getEconomyAndPoolsSummary() {
    const summary = treasury.getSummary();
    const state = this.state;
    const boss = this.getWorldBossInfo();

    const alloc = GAME_CONFIG.TREASURY_ALLOCATION || {
      dungeon: 25 / 78,
      ammBuyback: 18 / 78,
      worldBoss: 15 / 78,
      arena: 10 / 78,
      carnival: 10 / 78
    };

    const burnRate = GAME_CONFIG.TOKEN_BURN_RATE || 0.13;
    const ubiRate = GAME_CONFIG.UBI_POOL_RATE || 0.06;
    const creatorRate = GAME_CONFIG.CREATOR_ROYALTY_RATE || 0.03;
    const lotteryPool = state.lotteryPool != null ? state.lotteryPool : 20000000;
    const amortiPool = state.lotteryAmortiPool || 0;
    const myTickets = state.lotteryTickets || 0;
    const lotteryWinnerMultiplier = GAME_CONFIG.CARNIVAL?.LOTTERY?.WINNER_MULTIPLIER || 2.0;
    const lotteryWinnerShare = myTickets > 0 ? myTickets * 100 * lotteryWinnerMultiplier : 200;
    const lotteryAmortiShare = Math.round(lotteryPool * (GAME_CONFIG.CARNIVAL?.LOTTERY?.AMORTI_SHARE || 0.02));
    const lotteryRolloverShare = Math.max(0, lotteryPool - lotteryAmortiShare);

    // Sadece Karnaval Çarkında Anında Yakılan Hammaddeler sayacı (genel oyundaki yakımlar hariç)
    const burnedResources = state.carnivalBurnedResources || { wood: 0, iron: 0, wheat: 0 };
    const lifetimeBurnedAda = Math.round((treasury.state?.lifetimeBurned || 0) + (globalPool.state?.totalBurned || 0));

    const pools = [
      {
        id: 'dungeon',
        name: 'Zindan Ganimet Kasası',
        icon: '🏰',
        color: '#06b6d4',
        sharePct: 25,
        balance: Math.round(treasury.getPool('dungeon')),
        target: GAME_CONFIG.TREASURY_TARGET_RESERVE?.dungeon || 10000000,
        health: treasury.getPoolHealth('dungeon'),
        inflow: Math.round(treasury.state?.inflow?.dungeon || 0),
        outflow: Math.round(treasury.state?.outflow?.dungeon || 0),
        description: '6 Katlı ve 18 Seviyeli kadim zindan canavarlarını ve kat bosslarını yenen gezginlere zafer ganimeti olarak dağıtılır.',
        howToEarn: 'Zindana gir, canavarları katlet ve kat bosslarını devir.',
        actionType: 'dungeon',
        actionText: '💀 Zindana Git'
      },
      {
        id: 'ammBuyback',
        name: 'AMM DEX Likidite & Buyback',
        icon: '🤖',
        color: '#38bdf8',
        sharePct: 18,
        balance: Math.round(treasury.getPool('ammBuyback')),
        target: GAME_CONFIG.TREASURY_TARGET_RESERVE?.ammBuyback || 7200000,
        health: treasury.getPoolHealth('ammBuyback'),
        inflow: Math.round(treasury.state?.inflow?.ammBuyback || 0),
        outflow: Math.round(treasury.state?.outflow?.ammBuyback || 0),
        description: 'Piyasa dalgalanmalarında DEX fiyat tabanını korumak, arz fazlası tokenları geri alıp yakmak ve likiditeyi desteklemek için kullanılır.',
        howToEarn: 'AMM Pazarında işlem yapıldığında otomatik devreye girer.',
        actionType: 'market',
        actionText: '🏪 Markete Git'
      },
      {
        id: 'worldBoss',
        name: 'Dünya Bossu (World Boss) Akın Havuzu',
        icon: '🌋',
        color: '#ef4444',
        sharePct: 15,
        balance: Math.round(treasury.getPool('worldBoss')),
        target: GAME_CONFIG.TREASURY_TARGET_RESERVE?.worldBoss || 6000000,
        health: treasury.getPoolHealth('worldBoss'),
        inflow: Math.round(treasury.state?.inflow?.worldBoss || 0),
        outflow: Math.round(treasury.state?.outflow?.worldBoss || 0),
        description: 'Her Pazar 18:00 TSİ otomatik savaşında kilitlenen orduların Kadim Kıyamet Behemothuna verdiği hasar oranında dağıtılır.',
        howToEarn: 'Ordunu kışladan savaşa kilitle, Pazar 18:00 hasar payını kap.',
        actionType: 'boss',
        actionText: '🌋 Boss Karargahı'
      },
      {
        id: 'arena',
        name: 'Kolezyum Gladyatör Havuzu',
        icon: '🏟️',
        color: '#f59e0b',
        sharePct: 10,
        balance: Math.round(treasury.getPool('arena')),
        target: GAME_CONFIG.TREASURY_TARGET_RESERVE?.arena || 4000000,
        health: treasury.getPoolHealth('arena'),
        inflow: Math.round(treasury.state?.inflow?.arena || 0),
        outflow: Math.round(treasury.state?.outflow?.arena || 0),
        description: 'Arena anahtarı kullanan şampiyonların 1v1 düelloları ve haftalık sıralama ödülleri bu fondan çekilir.',
        howToEarn: 'Arena anahtarı kuşan, Kolezyuma çık ve şampiyonları devir.',
        actionType: 'colosseum',
        actionText: '🏟️ Kolezyuma Git'
      },
      {
        id: 'carnival',
        name: 'Krallık Karnavalı & Şans Kasası',
        icon: '🎪',
        color: '#ec4899',
        sharePct: 10,
        balance: Math.round(treasury.getPool('carnival')),
        target: GAME_CONFIG.TREASURY_TARGET_RESERVE?.carnival || 4000000,
        health: treasury.getPoolHealth('carnival'),
        inflow: Math.round(treasury.state?.inflow?.carnival || 0),
        outflow: Math.round(treasury.state?.outflow?.carnival || 0),
        description: '15 potansiyel ödüllü Şans Çarkındaki doğrudan token ödüllerinin emisyon kasasıdır.',
        howToEarn: 'Karnavalda 100 ADA, hammadde veya biletle şans çarkını çevir.',
        actionType: 'carnival_wheel',
        actionText: '🎡 Şans Çarkı'
      }
    ];

    const totalPoolsBalance = pools.reduce((acc, p) => acc + p.balance, 0) + lotteryPool;

    return {
      burnRatePct: Math.round(burnRate * 100),
      ubiRatePct: Math.round(ubiRate * 100),
      creatorRatePct: Math.round(creatorRate * 100),
      treasuryRatePct: 78,
      allocations: alloc,
      pools,
      totalPoolsBalance,
      lifetimeBurnedAda,
      burnedResources,
      ammBurnedResources: (typeof ammMarket !== 'undefined' && ammMarket.getBurnedResources)
        ? ammMarket.getBurnedResources()
        : { wood: 0, iron: 0, wheat: 0 },
      lottery: {
        lotteryPool,
        amortiPool,
        winnerShare: lotteryWinnerShare,
        amortiShare: lotteryAmortiShare,
        rolloverShare: lotteryRolloverShare
      },
      solvencyPct: Math.round((summary.solvency || 1) * 100),
      totalDeposited: Math.round(treasury.state?.lifetimeDeposited || 0),
      totalWithdrawn: Math.round(treasury.state?.lifetimeWithdrawn || 0)
    };
  }

  // =========================================================================
  // 🏦 KRALLIK HAZİNESİ & ÖDÜL HAVUZLARI (TREASURY VAULT SUMMARY)
  // =========================================================================
  getTreasuryVaultSummary() {
    const state = this.state;
    const boss = this.getWorldBossInfo();
    const colosseum = state.colosseumStats || { wins: 0, losses: 0, totalAdaWon: 0 };
    
    // 1. Ödül Havuzları (Gerçek Hazine Kasaları ve AMM Likidite Değerleri)
    const worldBossPool = (typeof treasury !== 'undefined' && treasury.getPool) ? Math.round(treasury.getPool('worldBoss')) : (boss.weeklyAdaPool || 8000000);
    const colosseumPool = (typeof treasury !== 'undefined' && treasury.getPool) ? Math.round(treasury.getPool('arena')) : 8000000;
    const dungeonLootVault = (typeof treasury !== 'undefined' && treasury.getPool) ? Math.round(treasury.getPool('dungeon')) : 14000000;
    const carnivalPool = (typeof treasury !== 'undefined' && treasury.getPool) ? Math.round(treasury.getPool('carnival')) : 4000000;
    const ammBuybackPool = (typeof treasury !== 'undefined' && treasury.getPool) ? Math.round(treasury.getPool('ammBuyback')) : 6000000;
    const burnedNftPool = 42500 + ((state.genesisNftMinted ? 1 : 0) * 18000);
    const totalAmmLiquidityAda = (typeof ammMarket !== 'undefined' && ammMarket.getTotalAdAstraLiquidity) ? ammMarket.getTotalAdAstraLiquidity() : 40000000;
    const lotteryPoolAda = Math.round(state.lotteryPool || 20000000);

    const totalVaultAda = worldBossPool + colosseumPool + dungeonLootVault + carnivalPool + ammBuybackPool + totalAmmLiquidityAda;

    // 2. Kullanıcının Hak Edişleri & Payları
    const userBossDamage = boss.userDamage || 0;
    const maxBossHp = boss.maxBossHp || 1000000;
    const userBossRewardEstimate = Math.floor((userBossDamage / maxBossHp) * worldBossPool);

    const userStakedArmyCount = boss.userStakedSoldiersCount || 0;
    const userStakedAtk = boss.userStakedAtk || 0;

    return {
      totalVaultAda,
      totalAmmLiquidityAda,
      burnedNftPool,
      pools: [
        {
          id: 'world_boss',
          name: 'Haftalık World Boss Ödül Havuzu',
          icon: '🌋',
          color: '#ef4444',
          totalPoolAda: worldBossPool,
          description: 'Her Pazar 20:00\'da kilitlenen orduların vurduğu hasara göre dağıtılır.',
          userShareText: userBossDamage > 0 ? `%${((userBossDamage / maxBossHp) * 100).toFixed(2)} Hasar Payı (~${userBossRewardEstimate.toLocaleString()} ADA)` : (userStakedArmyCount > 0 ? `${userStakedArmyCount} Asker Kilitli (${userStakedAtk} ATK)` : 'Ordu Kilitlenmedi'),
          userClaimableAda: 0,
          statusBadge: userStakedArmyCount > 0 ? '🛡️ Ordu Kilitli' : '⚠️ Katılmadın',
          actionType: 'boss',
          actionText: '🌋 Boss Savaşına Katıl'
        },
        {
          id: 'colosseum_arena',
          name: 'Kolezyum Gladyatör Şampiyonluk Havuzu',
          icon: '🏟️',
          color: '#f59e0b',
          totalPoolAda: colosseumPool,
          description: 'Arena anahtarı kullanan gladyatörlerin dövüşlerinden biriken haftalık zafer fonu.',
          userShareText: `${colosseum.wins || 0} Galibiyet • Kazanılan: ${(colosseum.totalAdaWon || 0).toLocaleString()} ADA`,
          userClaimableAda: 0,
          statusBadge: colosseum.wins > 0 ? '⚔️ Gladyatör' : 'Çaylak',
          actionType: 'colosseum',
          actionText: '🏟️ Arenaya Git'
        },
        {
          id: 'parliament_staking',
          name: 'AdAstra Meclisi & Staking Getiri Havuzu',
          icon: '👑',
          color: '#a855f7',
          totalPoolAda: parliamentStakingPool,
          description: 'Topluluk meclisi oylamalarına katılan ve Arena bileti sahiplerine %18 payla dağıtılan staking havuzu.',
          userShareText: state.arenaKeys > 0 ? `${state.arenaKeys} Arena Bileti / 1:18 Oy Ağırlığı` : 'Bilet Yok (1:1 Standart Oy)',
          userClaimableAda: 0,
          statusBadge: '🏛️ Aktif Meclis',
          actionType: 'parliament',
          actionText: '🏛️ Meclis Oylaması'
        },
        {
          id: 'dungeon_loot',
          name: 'Zindan Kat & Boss Ganimet Kasası',
          icon: '🗺️',
          color: '#06b6d4',
          totalPoolAda: dungeonLootVault,
          description: '6 Katlı ve 18 Seviyeli kadim zindan canavarlarını yenen gezginlere tahsis edilen rezerv.',
          userShareText: `İlerleme: ${state.dungeonProgress || 1}. Seviye`,
          userClaimableAda: 0,
          statusBadge: `Kat ${Math.ceil((state.dungeonProgress || 1) / 3)}/6`,
          actionType: 'dungeon',
          actionText: '💀 Zindana Gir'
        },
        {
          id: 'nft_burn',
          name: 'Deflasyonist NFT Yakım (Burn) Kasası',
          icon: '🔥',
          color: '#f97316',
          totalPoolAda: burnedNftPool,
          description: 'P2P Pazaryerindeki %18 indirimli alımlardan ve Genesis NFT üretiminden kalıcı yakılan $ADASTRA.',
          userShareText: `${(state.collectionArtifacts || []).filter(a => a.discovered).length}/18 Eser Keşfedildi`,
          userClaimableAda: 0,
          statusBadge: state.genesisNftMinted ? '💎 Genesis NFT Basıldı' : '🔥 Kalıcı Yakım',
          actionType: 'collection',
          actionText: '👑 Koleksiyon & NFT'
        }
      ]
    };
  }

  // 🛡️ AMM DEX Otonom Buyback & Yakım Operasyonu (Döngü Başına)
  executeAmmTreasuryBuyback(cycleBudgetCap = 0.10) {
    if (typeof ammMarket !== 'undefined' && typeof ammMarket.executeAutonomousBuyback === 'function') {
      const res = ammMarket.executeAutonomousBuyback(cycleBudgetCap);
      this.saveState();
      return res;
    }
    return { success: false, message: 'AMM Market motoru bulunamadı.' };
  }

  getAmmBuybackAnalysis(cycleBudgetCap = 0.10) {
    if (typeof ammMarket !== 'undefined' && typeof ammMarket.getBuybackAnalysis === 'function') {
      return ammMarket.getBuybackAnalysis(cycleBudgetCap);
    }
    return null;
  }

  claimAndRestartAllExpeditions() {
    const results = { claimed: 0, partialClaimed: 0, restarted: 0, totalHarvest: 0, messages: [] };
    const allActive = Object.keys(this.state.activeExpeditions || {});
    for (const nodeId of allActive) {
      const exp = this.state.activeExpeditions[nodeId];
      if (!exp) continue;
      if (exp.isCompleted) {
        const res = this.claimExpedition(nodeId);
        if (res.success) {
          results.claimed++;
          results.totalHarvest += res.amount || 0;
        } else if (res.isWarehouseFull) {
          results.messages.push(res.message);
        }
      } else {
        // Sefer henüz bitmemiş olsa bile o ana kadar çıkartılan kaynakları topla
        const pRes = this.claimPartialExpedition(nodeId);
        if (pRes.success) {
          results.partialClaimed++;
          results.totalHarvest += pRes.amount || 0;
        } else if (pRes.isWarehouseFull) {
          results.messages.push(pRes.message);
        }
      }
    }

    // Alet kontrolü ve otomatik onarım desteği (Özellikle orak/sickle kırık kaldığında buğday/wheat seferinin başlamama sorununu çözer)
    const requiredTools = { wood: 'axe', iron: 'pickaxe', wheat: 'sickle' };
    for (const nodeId of ['wood', 'iron', 'wheat']) {
      const toolId = requiredTools[nodeId];
      const tool = this.state.tools ? this.state.tools[toolId] : null;
      if (tool && tool.durability <= 0) {
        this.repairTool(toolId);
      }
    }

    const staminaMissingNodes = [];

    // Yeniden başlatma dene
    for (const nodeId of ['wood', 'iron', 'wheat']) {
      if (!this.state.activeExpeditions[nodeId]) {
        const res = this.startExpedition(nodeId);
        if (res.success) {
          results.restarted++;
        } else {
          if (res.isInsufficientStamina) {
            const resourceDisplayNames = { wood: 'Odun', iron: 'Demir', wheat: 'Buğday' };
            staminaMissingNodes.push(resourceDisplayNames[nodeId] || nodeId);
          }
          if (res.message) {
            results.messages.push(res.message);
          }
        }
      }
    }

    if (staminaMissingNodes.length > 0) {
      results.staminaWarning = `⚠️ ${staminaMissingNodes.join(', ')} seferini başlatmak için yeteri kadar staminanız bulunmamaktadır.`;
    }

    return results;
  }

  repairAllTools() {
    const results = { repaired: 0, totalWood: 0, totalIron: 0, totalWheat: 0, totalAda: 0, messages: [] };
    for (const toolId of Object.keys(this.state.tools || {})) {
      const cost = this.calculateRepairCost(toolId);
      if (cost && cost.missingDurability > 0) {
        const res = this.repairTool(toolId);
        if (res.success) {
          results.repaired++;
          results.totalWood += cost.woodCost;
          results.totalIron += cost.ironCost;
          results.totalWheat += cost.wheatCost;
          results.totalAda += cost.adAstraCost;
        } else {
          results.messages.push(res.message);
        }
      }
    }
    results.success = results.repaired > 0;
    results.message = results.success
      ? `🔨 ${results.repaired} Adet Alet Başarıyla Onarıldı! (-${results.totalWood} Odun, -${results.totalIron} Demir, -${results.totalAda} ADA)`
      : (results.messages.length > 0 ? results.messages[0] : 'Onarılacak hasarlı alet bulunamadı veya yetersiz kaynak.');
    return results;
  }

  getAllRepairCost() {
    let totalWood = 0, totalIron = 0, totalWheat = 0, totalAda = 0, count = 0;
    for (const toolId of Object.keys(this.state.tools || {})) {
      const cost = this.calculateRepairCost(toolId);
      if (cost && cost.missingDurability > 0) {
        totalWood += cost.woodCost;
        totalIron += cost.ironCost;
        totalWheat += cost.wheatCost;
        totalAda += cost.adAstraCost;
        count++;
      }
    }
    return { totalWood, totalIron, totalWheat, totalAda, count };
  }

  instantHealAllSoldiers() {
    const results = { healed: 0, totalWheat: 0, totalAda: 0, messages: [] };
    const soldiers = this.state.soldierUnits || [];
    for (let i = 0; i < soldiers.length; i++) {
      const info = this.getSoldierHealInfo(i);
      if (info && info.missingHp > 0) {
        const res = this.instantHealSoldierUnit(i);
        if (res.success) {
          results.healed++;
          results.totalWheat += info.wheatNeeded;
          results.totalAda += info.adaCost;
        } else {
          results.messages.push(res.message);
          break;
        }
      }
    }
    return results;
  }

  getAllHealCost() {
    let totalWheat = 0, totalAda = 0, count = 0;
    const soldiers = this.state.soldierUnits || [];
    for (let i = 0; i < soldiers.length; i++) {
      const info = this.getSoldierHealInfo(i);
      if (info && info.missingHp > 0) {
        totalWheat += info.wheatNeeded;
        totalAda += info.adaCost;
        count++;
      }
    }
    return { totalWheat, totalAda, count };
  }

  // =========================================================================
  // SMART ARMORY: OTOMATİK EN İYİ EŞYALARI DAĞIT & TOPLU SÖK
  // =========================================================================
  autoEquipBest() {
    const soldiers = this.state.soldierUnits || [];
    const slots = ['weapon', 'helmet', 'armor', 'legs', 'boots'];
    let totalEquipped = 0;

    if (!Array.isArray(this.state.armoryInventory)) this.state.armoryInventory = [];

    for (let i = 0; i < soldiers.length; i++) {
      for (const slot of slots) {
        if (!soldiers[i].equipment) soldiers[i].equipment = {};
        if (!soldiers[i].equipment[slot]) {
          // Krallık ana yuvası ve Cephanelik deposundaki tüm adayları topla ve en yüksek seviyeliyi seç
          const candidates = [];
          if (this.state.equipment && this.state.equipment[slot]) {
            candidates.push({ item: this.state.equipment[slot], source: 'kingdom' });
          }
          this.state.armoryInventory.forEach((armItem, aIdx) => {
            if (armItem && armItem.slot === slot) {
              candidates.push({ item: armItem, source: 'armory', armoryIndex: aIdx });
            }
          });

          // En yüksek seviyeli ve dayanıklılığı tam/yüksek olanı seç
          candidates.sort((a, b) => ((b.item.level || 1) - (a.item.level || 1)) || ((b.item.durability || 0) - (a.item.durability || 0)));

          let itemToEquip = null;
          if (candidates.length > 0) {
            const chosen = candidates[0];
            itemToEquip = chosen.item;
            if (chosen.source === 'kingdom') {
              delete this.state.equipment[slot];
            } else {
              const armIdx = this.state.armoryInventory.indexOf(chosen.item);
              if (armIdx !== -1) {
                this.state.armoryInventory.splice(armIdx, 1);
              }
            }
          }

          if (itemToEquip) {
            soldiers[i].equipment[slot] = itemToEquip;
            totalEquipped++;
          }
        }
      }
    }
    if (totalEquipped > 0) {
      sound.playRepair();
      this.saveState();
    }
    return { 
      success: totalEquipped > 0, 
      equipped: totalEquipped, 
      message: totalEquipped > 0 
        ? `⚔️ ${totalEquipped} parça teçhizat otomatik olarak orduna dağıtıldı!` 
        : 'Dağıtılacak boşta teçhizat veya boş asker yuvası bulunamadı.' 
    };
  }

  unequipAllSoldiers() {
    const soldiers = this.state.soldierUnits || [];
    const slots = ['weapon', 'helmet', 'armor', 'legs', 'boots'];
    let totalUnequipped = 0;

    if (!Array.isArray(this.state.armoryInventory)) this.state.armoryInventory = [];

    for (let i = 0; i < soldiers.length; i++) {
      for (const slot of slots) {
        if (soldiers[i].equipment && soldiers[i].equipment[slot]) {
          const item = soldiers[i].equipment[slot];
          soldiers[i].equipment[slot] = null;
          this.state.armoryInventory.push(item);
          totalUnequipped++;
        }
      }
    }
    if (totalUnequipped > 0) {
      sound.playRepair();
      this.saveState();
    }
    return { 
      success: totalUnequipped > 0, 
      unequipped: totalUnequipped, 
      message: totalUnequipped > 0 
        ? `🔄 ${totalUnequipped} parça eşya askerlerden sökülüp Cephanelik Deposu'na aktarıldı!` 
        : 'Sökülecek eşya bulunamadı.' 
    };
  }

  // =========================================================================
  // PRE-BATTLE: SAVAŞ TAHMİNİ (ORDU VE KUŞANILMIŞ SİLAHLAR)
  // =========================================================================
  getBattlePrediction(enemyHp, enemyAtk, selectedSoldierIndices) {
    const soldiers = this.state.soldierUnits || [];
    let totalAtk = 0;
    let totalHp = 0;

    for (const idx of selectedSoldierIndices) {
      const stats = this.getSoldierFullStats(idx);
      if (!stats) continue;
      const sol = soldiers[idx];
      if (!sol) continue;

      totalAtk += stats.totalAtk;
      totalHp += Math.min(sol.hp || sol.maxHp || 100, stats.totalMaxHp);
    }

    const turnsToKillEnemy = enemyHp > 0 ? Math.ceil(enemyHp / Math.max(1, totalAtk)) : 1;
    const turnsEnemyKillsUs = totalHp > 0 ? Math.ceil(totalHp / Math.max(1, enemyAtk)) : 1;
    const winChance = Math.min(100, Math.max(5, Math.round((turnsEnemyKillsUs / (turnsToKillEnemy + 0.1)) * 50)));

    let difficulty = 'Kolay';
    if (winChance < 30) difficulty = 'İmkansız';
    else if (winChance < 50) difficulty = 'Zor';
    else if (winChance < 75) difficulty = 'Orta';

    return { totalAtk, totalHp, turnsToKillEnemy, winChance, difficulty, selectedCount: selectedSoldierIndices.length };
  }

  // =========================================================================
  // BOT KAYNAK EKSİKLİĞİ KONTROLÜ (BİLDİRİM MERKEZİ VE PAUSE İÇİN)
  // =========================================================================
  getBotResourceDeficitWarning() {
    const rawExp = Math.max(
      this.state.botActiveUntil || 0,
      this.state.tavernaBotExpiresAt || 0,
      this.state.activeBuffs?.auto_collector?.expiresAt || 0
    );
    const hasBot = (rawExp > Date.now()) || (this.state.botPaused && (this.state.botPausedRemainingMs || 0) > 0);
    if (!hasBot) return null;

    const prereq = this.checkBotPrerequisites();
    if (!prereq.isMet) {
      return {
        type: 'warning',
        icon: '⏸️',
        title: '24s Otomasyon Botu Duraklatıldı (Süreniz Donduruldu)',
        text: `Botun aletleri onarabilmesi ve seferleri aksatmaması için deponuzda en az 50 Demir, 50 Odun, 50 Buğday ve 50 $ADASTRA bulunmalıdır. Süreniz dondurulmuştur ve asla azalmaz! (Eksikler: ${prereq.missingText}) — Kaynakları tamamladığınız an bot anında otomatik çalışmaya devam edecektir.`,
        missing: prereq.missing
      };
    }
    return null;
  }

  // =========================================================================
  // KOLEZYUM ARENA LİGİ & HAFTALIK LİDERLİK TABLOSU (ASENKRON BOT LİGİ)
  // =========================================================================
  getColosseumLeaderboard() {
    if (!this.state.colosseumLeaderboard) {
      this.state.colosseumLeaderboard = [
        { rank: 1, name: 'Gladyatör Botu #1 (Leonidas)', score: 48, wins: 48, losses: 2, icon: '🦁', title: 'Şampiyon Bot', rewardKeys: 5, rewardAda: 15000, isBot: true },
        { rank: 2, name: 'Gladyatör Botu #2 (Selin)', score: 42, wins: 42, losses: 5, icon: '⚔️', title: 'Elmas Bot', rewardKeys: 3, rewardAda: 8000, isBot: true },
        { rank: 3, name: 'Gladyatör Botu #3 (Eren)', score: 38, wins: 38, losses: 7, icon: '🗡️', title: 'Altın Bot', rewardKeys: 1, rewardAda: 2500, isBot: true },
        { rank: 4, name: 'Gladyatör Botu #4 (Barok)', score: 35, wins: 35, losses: 8, icon: '🗿', title: 'Taş Muhafız', rewardKeys: 1, rewardAda: 2500, isBot: true },
        { rank: 5, name: 'Gladyatör Botu #5 (Zafira)', score: 31, wins: 31, losses: 9, icon: '🧙‍♀️', title: 'Gümüş Bot', rewardKeys: 1, rewardAda: 2500, isBot: true },
        { rank: 6, name: 'Gladyatör Botu #6 (Kaan)', score: 28, wins: 28, losses: 10, icon: '🏹', title: 'Gümüş Bot', rewardKeys: 1, rewardAda: 2500, isBot: true },
        { rank: 7, name: 'Gladyatör Botu #7 (Drake)', score: 25, wins: 25, losses: 12, icon: '🏴‍☠️', title: 'Bronz Bot', rewardKeys: 1, rewardAda: 2500, isBot: true },
        { rank: 8, name: 'Gladyatör Botu #8 (Alperen)', score: 22, wins: 22, losses: 13, icon: '🐉', title: 'Bronz Bot', rewardKeys: 1, rewardAda: 2500, isBot: true },
        { rank: 9, name: 'Gladyatör Botu #9 (Galahad)', score: 19, wins: 19, losses: 14, icon: '🛡️', title: 'Acemi Bot', rewardKeys: 1, rewardAda: 2500, isBot: true },
        { rank: 10, name: 'Gladyatör Botu #10 (Zephyr)', score: 16, wins: 16, losses: 15, icon: '⚡', title: 'Acemi Bot', rewardKeys: 1, rewardAda: 2500, isBot: true },
      ];
    }
    return this.state.colosseumLeaderboard;
  }

  // Günlük sayaçlar (arena maçı, zindan koşusu) — gün değişince sıfırlanır
  getDailyCounters() {
    const today = new Date().toISOString().slice(0, 10);
    if (!this.state.dailyCounters || this.state.dailyCounters.date !== today) {
      this.state.dailyCounters = { date: today, arenaMatches: 0, dungeonRuns: 0 };
    }
    return this.state.dailyCounters;
  }

  executeColosseum1v1Match(championIndex = 0) {
    if (this.isArmyStakedInWorldBoss()) {
      return { success: false, message: '🔒 Ordun World Boss savaşına kilitlendiği için Kolezyum arenasına çıkamaz! Önce Savaş Alanından ordunun kilidini açmalısın.' };
    }

    const soldiers = this.state.soldierUnits || [];
    const champion = soldiers[championIndex];
    if (!champion) {
      return { success: false, message: 'Kolezyum arenasına çıkacak geçerli bir şampiyon askerin yok!' };
    }

    if ((champion.hp || 0) <= 15) {
      return { success: false, message: `⚠️ ${champion.name} ağır yaralı (Can: ${champion.hp}/${champion.maxHp}). Kolezyuma çıkmadan önce buğdayla iyileştirilmelidir!` };
    }

    const cfg = GAME_CONFIG.COLOSSEUM;
    const counters = this.getDailyCounters();
    if (counters.arenaMatches >= cfg.DAILY_MATCH_CAP) {
      return { success: false, message: `⏳ Günlük arena hakkın doldu (${cfg.DAILY_MATCH_CAP}/${cfg.DAILY_MATCH_CAP}). Yarın tekrar gel.` };
    }
    if ((this.state.arenaKeys || 0) < cfg.ENTRY_KEY_COST) {
      return { success: false, message: `🔑 Arenaya çıkmak için ${cfg.ENTRY_KEY_COST} Arena Anahtarı gerekir! (Zindan boss'larından veya pazardan edinebilirsin.)` };
    }
    if ((this.state.stamina || 0) < cfg.ENTRY_STAMINA_COST) {
      return { success: false, message: `⚡ Yetersiz stamina! (${cfg.ENTRY_STAMINA_COST} gerekli)` };
    }

    this.state.arenaKeys -= cfg.ENTRY_KEY_COST;
    this.state.stamina -= cfg.ENTRY_STAMINA_COST;
    counters.arenaMatches += 1;

    const stats = this.getSoldierFullStats(championIndex);
    const playerAtk = stats.totalAtk;
    const playerMaxHp = stats.totalMaxHp;

    const playerRating = this.state.colosseumStats?.rating || GAME_CONFIG.COLOSSEUM.STARTING_RATING;
    const tier = this.getColosseumTier(playerRating);

    // Sabit Lig Kademelerine Göre Kalibre Edilmiş Düşman Şampiyonu
    const oppBaseAtk = tier.id === 'champion' ? 180 : tier.id === 'diamond' ? 120 : tier.id === 'gold' ? 75 : tier.id === 'silver' ? 45 : 25;
    const oppBaseHp = tier.id === 'champion' ? 900 : tier.id === 'diamond' ? 600 : tier.id === 'gold' ? 350 : tier.id === 'silver' ? 200 : 100;

    const oppAtk = Math.max(15, Math.floor(oppBaseAtk * (0.85 + Math.random() * 0.3)));
    const oppMaxHp = Math.max(80, Math.floor(oppBaseHp * (0.85 + Math.random() * 0.3)));
    const oppRating = Math.round(tier.minRating + Math.random() * 150);

    const opponent = {
      name: `${tier.name} Rakibi`,
      icon: tier.id === 'champion' ? '👑' : tier.id === 'diamond' ? '💎' : tier.id === 'gold' ? '🥇' : tier.id === 'silver' ? '🥈' : '🥉',
      atk: oppAtk,
      hp: oppMaxHp,
      rating: oppRating
    };

    // combat.js createUnit ve simulateBattle simülasyonu
    const allyUnit = createUnit({
      uid: 'player_champ',
      name: champion.name,
      icon: champion.icon || '⚔️',
      maxHp: playerMaxHp,
      hp: champion.hp || playerMaxHp,
      atk: playerAtk,
      skills: champion.skills || ['shieldWall'],
      row: champion.row || 'front'
    });

    const enemyUnit = createUnit({
      uid: 'opp_champ',
      name: opponent.name,
      icon: opponent.icon,
      maxHp: oppMaxHp,
      hp: oppMaxHp,
      atk: oppAtk,
      skills: ['shieldWall', 'shockwave'],
      row: 'front',
      side: 'enemy'
    });

    const simRes = simulateBattle({
      allies: [allyUnit],
      enemies: [enemyUnit],
      seed: Date.now()
    });

    const isVictory = !!(simRes.victory || simRes.winner === 'ally');
    const finalPlayerHp = allyUnit.hp;
    // 🛡️ Askeri Koruma Kuralı (No Permadeath): Kolezyumda asker asla ölmez, 1 HP'de hayatta kalır
    champion.hp = Math.max(1, finalPlayerHp);
    const damageTaken = playerMaxHp - champion.hp;

    if (!this.state.colosseumStats) {
      this.state.colosseumStats = { wins: 0, losses: 0, score: 0, rank: 11, rating: GAME_CONFIG.COLOSSEUM.STARTING_RATING };
    }

    let rewardAda = 0;
    let rewardKeys = 0;

    // 🏆 Gerçek ELO Formülü
    if (this.state.colosseumStats.rating == null) {
      this.state.colosseumStats.rating = GAME_CONFIG.COLOSSEUM.STARTING_RATING;
    }
    const expected = 1 / (1 + Math.pow(10, (oppRating - this.state.colosseumStats.rating) / 400));
    const ratingDelta = Math.round(GAME_CONFIG.COLOSSEUM.K_FACTOR * ((isVictory ? 1 : 0) - expected));
    this.state.colosseumStats.rating = Math.max(0, this.state.colosseumStats.rating + ratingDelta);

    if (isVictory) {
      this.state.colosseumStats.wins += 1;
      this.state.colosseumStats.score += 3;

      // Hazine Arena Kasasından Ödül
      const arenaPool = (typeof treasury !== 'undefined' && treasury.getPool) ? treasury.getPool('arena') : 8000000;
      const baseReward = Math.min(2500, Math.round(arenaPool * 0.0002));
      rewardAda = Math.round(baseReward * tier.rewardMult);
      this.state.adAstraBalance = (this.state.adAstraBalance || 0) + rewardAda;

      if (Math.random() < 0.25) {
        rewardKeys = 1;
        this.state.arenaKeys = (this.state.arenaKeys || 0) + 1;
      }
    } else {
      this.state.colosseumStats.losses += 1;
      this.state.colosseumStats.score = Math.max(0, this.state.colosseumStats.score - 1);
    }

    this.saveState();

    const combatLog = simRes.log.map(l => l.text || `${l.actor} -> ${l.target} (${l.amount || ''} hasar)`).filter(Boolean);

    return {
      success: true,
      isVictory,
      championName: champion.name,
      opponentName: opponent.name,
      opponentIcon: opponent.icon,
      damageTaken,
      currentHp: champion.hp,
      maxHp: champion.maxHp,
      rewardAda,
      rewardKeys,
      combatLog,
      colosseumStats: this.state.colosseumStats,
      tier
    };
  }

  // =========================================================================
  // SAVAŞ ALANI: HAFTALIK WORLD BOSS ORDU STAKE & OTOMATİK SAVAŞ (PAZAR 18:00 TSİ)
  // =========================================================================
  getWorldBossInfo() {
    if (!this.state.worldBoss) {
      this.state.worldBoss = {
        name: 'Kadim Kıyamet Behemoth\'u (WORLD BOSS)',
        icon: '🌋',
        weeklyAdaPool: (typeof treasury !== 'undefined' && treasury.getPool) ? Math.round(treasury.getPool('worldBoss')) : 8000000,
        bossHp: 1000000,
        maxBossHp: 1000000,
        bossAtk: 500000,
        stakedArmyCount: 0,
        totalStakedAtk: 0,
        totalStakedHp: 0,
        userStaked: false,
        userDamage: 0,
        userStakedSoldiersCount: 0,
        userStakedAtk: 0,
        userStakedHp: 0,
        claimableRewardAda: 0,
        totalClaimedAda: 0,
        lastBattleTimestamp: null
      };
    } else {
      if (typeof treasury !== 'undefined' && treasury.getPool) {
        this.state.worldBoss.weeklyAdaPool = Math.round(treasury.getPool('worldBoss')) || 8000000;
      }
      if (!this.state.worldBoss.userStaked) {
        this.state.worldBoss.stakedArmyCount = 0;
        this.state.worldBoss.totalStakedAtk = 0;
        this.state.worldBoss.totalStakedHp = 0;
      }
      if (this.state.worldBoss.claimableRewardAda == null) {
        this.state.worldBoss.claimableRewardAda = 0;
      }
    }
    return this.state.worldBoss;
  }

  // Kullanıcının ordusunun Pazar 18:00 TSİ savaşındaki hasar gücünü hesaplar:
  // Her 1 ATK = 1:1 rasyo, Her 1 HP = 1:0.25 rasyo + Yetenek Çeşitliliği Bonusu (max +%50)
  calculateUserWorldBossPower() {
    const boss = this.getWorldBossInfo();
    const atk = boss.userStakedAtk || 0;
    const hp = boss.userStakedHp || 0;
    const baseDamage = Math.floor((atk * 1.0) + (hp * 0.25));

    // Rol / Yetenek Çeşitliliği Bonusu
    const diversity = this.calculateSquadSkillDiversity();
    const calculatedDamage = Math.floor(baseDamage * diversity.diversityMultiplier);
    const estimatedAda = Math.floor((calculatedDamage * boss.weeklyAdaPool) / boss.maxBossHp);
    return {
      atk,
      hp,
      atkContribution: Math.floor(atk * 1.0),
      hpContribution: Math.floor(hp * 0.25),
      baseDamage,
      calculatedDamage,
      estimatedAda,
      diversityMultiplier: diversity.diversityMultiplier,
      uniqueRoles: diversity.uniqueRoles,
      rolesFound: diversity.rolesFound
    };
  }

  stakeArmyForWorldBoss() {
    const soldiers = this.state.soldierUnits || [];
    if (soldiers.length === 0) {
      return { success: false, message: 'World Boss savaşına kilitlemek için ordunuzda asker bulunmalıdır!' };
    }

    let userAtk = 0;
    let userHp = 0;
    for (let i = 0; i < soldiers.length; i++) {
      const stats = this.getSoldierFullStats(i);
      userAtk += stats.totalAtk;
      userHp += stats.totalMaxHp;
    }

    const boss = this.getWorldBossInfo();
    if (boss.userStaked) {
      boss.stakedArmyCount = Math.max(0, (boss.stakedArmyCount || 0) - (boss.userStakedSoldiersCount || 0));
      boss.totalStakedAtk = Math.max(0, (boss.totalStakedAtk || 0) - (boss.userStakedAtk || 0));
      boss.totalStakedHp = Math.max(0, (boss.totalStakedHp || 0) - (boss.userStakedHp || 0));
    }
    boss.userStaked = true;
    boss.userStakedSoldiersCount = soldiers.length;
    boss.userStakedAtk = userAtk;
    boss.userStakedHp = userHp;
    boss.stakedArmyCount = (boss.stakedArmyCount || 0) + soldiers.length;
    boss.totalStakedAtk = (boss.totalStakedAtk || 0) + userAtk;
    boss.totalStakedHp = (boss.totalStakedHp || 0) + userHp;

    const power = this.calculateUserWorldBossPower();

    sound.playLevelUp();
    this.saveState();

    return {
      success: true,
      message: `🛡️ ${soldiers.length} kişilik ordun (${userAtk} ATK + ${userHp} HP ➔ ${power.calculatedDamage.toLocaleString()} Hasar Gücü) Pazar 18:00 TSİ otomatik World Boss savaşı için başarıyla kilitlendi!`,
      boss,
      power
    };
  }

  // Bu haftanın savaş zamanı (Pazar 15:00 UTC = 18:00 TSİ) geldi mi?
  getWorldBossSchedule(now = Date.now()) {
    const cfg = GAME_CONFIG.WORLD_BOSS;
    const d = new Date(now);
    const day = d.getUTCDay();
    // Bu haftanın Pazar 15:00 UTC anı
    const thisSunday = new Date(d);
    thisSunday.setUTCDate(d.getUTCDate() - day + cfg.BATTLE_DAY_UTC);
    thisSunday.setUTCHours(cfg.BATTLE_HOUR_UTC, 0, 0, 0);
    let battleTime = thisSunday.getTime();
    if (battleTime > now) battleTime -= 7 * 24 * 3600 * 1000; // en son geçen savaş anı
    const nextBattle = battleTime + 7 * 24 * 3600 * 1000;
    return { lastBattleTime: battleTime, nextBattleTime: nextBattle, msUntilNext: nextBattle - now };
  }

  // Her Pazar TSİ 18:00'da TEK SEFERLİK otomatik savaş.
  //
  // ═══════════════════════════════════════════════════════════════════════
  // v1'DEKİ EN AĞIR AÇIK (F-03)
  // ═══════════════════════════════════════════════════════════════════════
  // Whitepaper savaşın "her Pazar 18:00'da tek seferlik ve otomatik" olduğunu
  // söylüyordu ama kodda ZAMANLAYICI YOKTU. Bunun yerine savaş alanı modalına,
  // geliştirici paneline değil OYUNCUNUN GÖRDÜĞÜ EKRANA, bir "[Test] Pazar
  // Savaşını Şimdi Simüle Et" butonu konmuştu. Her tıklama hasarı ve
  // toplanabilir ödülü artırıyordu; sınır yoktu. Tam donanımlı 18 askerle
  // tıklama başına ~901 ADA, saniyede birkaç tıklama.
  //
  // v2'de savaş gerçek takvime bağlıdır ve haftada bir kez çalışır.
  executeSundayAutoWorldBossBattle({ force = false } = {}) {
    const boss = this.getWorldBossInfo();
    if (!boss.userStaked) {
      return { success: false, message: 'Kilitli ordunuz bulunmadığı için bu haftaki savaşa dahil olunamadı.' };
    }

    const sched = this.getWorldBossSchedule();
    if (!force && (boss.lastBattleTimestamp || 0) >= sched.lastBattleTime) {
      const hrs = Math.floor(sched.msUntilNext / 3600000);
      const mins = Math.floor((sched.msUntilNext % 3600000) / 60000);
      return {
        success: false,
        alreadyFought: true,
        message: `⏳ Bu haftanın World Boss savaşı çoktan gerçekleşti. Sonraki savaşa ${hrs} saat ${mins} dakika kaldı (Pazar 18:00 TSİ).`
      };
    }

    const power = this.calculateUserWorldBossPower();
    const damageDealt = power.calculatedDamage;

    boss.userDamage = damageDealt; // haftalık — birikmez
    boss.bossHp = Math.max(0, boss.bossHp - damageDealt);

    // YASA 1: ödül hazinenin worldBoss havuzundan çekilir, basılmaz.
    const request = Math.max(1, Math.floor((damageDealt * boss.weeklyAdaPool) / boss.maxBossHp));
    const draw = globalPool.withdrawReward('worldBoss', request);
    const rewardAda = Math.floor(draw.granted);

    boss.claimableRewardAda = (boss.claimableRewardAda || 0) + rewardAda;
    boss.lastBattleTimestamp = Date.now();

    // Ordu kilidi savaştan sonra açılır
    boss.userStaked = false;

    sound.playLevelUp();
    this.saveState();

    return {
      success: true,
      damageDealt,
      rewardAda,
      requested: request,
      scaled: draw.scaleFactor < 0.999,
      claimableRewardAda: boss.claimableRewardAda,
      message: `💥 Pazar 18:00 TSİ World Boss savaşı tamamlandı! Ordun ${damageDealt.toLocaleString()} hasar vurdu ve ${rewardAda.toLocaleString()} $ADASTRA kazandı.${draw.scaleFactor < 0.999 ? ' (Havuz doluluğu nedeniyle ödül oranlandı.)' : ''}`
    };
  }

  isArmyStakedInWorldBoss() {
    return !!(this.state.worldBoss && this.state.worldBoss.userStaked);
  }

  // Kullanıcının World Boss ekranına düşen ADA ödülünü cüzdanına çekmesi (Claim)
  claimWorldBossReward() {
    const boss = this.getWorldBossInfo();
    const claimable = boss.claimableRewardAda || 0;
    const soldiersCount = boss.userStakedSoldiersCount || 0;

    if (claimable <= 0 && !boss.userStaked) {
      return { success: false, message: 'Toplanacak World Boss ödülü bulunmuyor!' };
    }

    this.state.adAstraBalance += claimable;
    boss.totalClaimedAda = (boss.totalClaimedAda || 0) + claimable;
    boss.claimableRewardAda = 0;

    // Savaştan sonra ordu serbest bırakılır
    boss.stakedArmyCount = Math.max(0, (boss.stakedArmyCount || 0) - soldiersCount);
    boss.totalStakedAtk = Math.max(0, (boss.totalStakedAtk || 0) - (boss.userStakedAtk || 0));
    boss.totalStakedHp = Math.max(0, (boss.totalStakedHp || 0) - (boss.userStakedHp || 0));
    boss.userStaked = false;
    boss.userStakedSoldiersCount = 0;
    boss.userStakedAtk = 0;
    boss.userStakedHp = 0;

    sound.playLevelUp();
    this.saveState();

    return {
      success: true,
      claimedAda: claimable,
      unlockedSoldiersCount: soldiersCount,
      newBalance: this.state.adAstraBalance,
      message: claimable > 0
        ? `🎁 ${claimable.toLocaleString()} $ADASTRA World Boss ödülü cüzdanına aktarıldı ve ordun serbest bırakıldı!`
        : `🛡️ ${soldiersCount} kişilik ordun serbest bırakıldı!`
    };
  }

  // Erken Çekilme (Emergency Unstake):
  // Pazar günü etkinlik tamamlanmadan önce ordu çekilirse, ordunun vereceği hasar üzerinden
  // kazanacağı anlık tahmini ADA miktarının %18'i ceza olarak ödenir ve ordu serbest bırakılır.
  emergencyUnstakeWorldBossArmy() {
    const boss = this.getWorldBossInfo();
    if (!boss.userStaked) {
      return { success: false, message: 'Kilitlenmiş bir ordunuz bulunmuyor!' };
    }

    const power = this.calculateUserWorldBossPower();
    const estimatedAda = power.estimatedAda || 0;
    // Anlık tahmini ADA miktarının %18'i ceza olarak hesaplanır:
    const penaltyAda = Math.max(1, Math.round(estimatedAda * 0.18));

    if (this.state.adAstraBalance < penaltyAda) {
      return {
        success: false,
        penaltyRequired: penaltyAda,
        message: `❌ Yetersiz bakiye! Ordunu erken çekmek için tahmini kazancının (%18) cezası olan ${penaltyAda.toLocaleString()} $ADASTRA gerekiyor (Mevcut Bakiye: ${this.state.adAstraBalance.toLocaleString()} ADA).`
      };
    }

    // Cezayı tahsil et (%22 kalıcı yakım + %78 hazineye giriş)
    this.state.adAstraBalance -= penaltyAda;
    globalPool.recordTokenSpend(penaltyAda);

    const soldiersCount = boss.userStakedSoldiersCount || 0;
    boss.stakedArmyCount = Math.max(0, (boss.stakedArmyCount || 0) - soldiersCount);
    boss.totalStakedAtk = Math.max(0, (boss.totalStakedAtk || 0) - (boss.userStakedAtk || 0));
    boss.totalStakedHp = Math.max(0, (boss.totalStakedHp || 0) - (boss.userStakedHp || 0));
    boss.userStaked = false;
    boss.userStakedSoldiersCount = 0;
    boss.userStakedAtk = 0;
    boss.userStakedHp = 0;
    boss.claimableRewardAda = 0;

    sound.playPickaxe();
    this.saveState();

    return {
      success: true,
      penaltyPaid: penaltyAda,
      unlockedSoldiersCount: soldiersCount,
      newBalance: this.state.adAstraBalance,
      message: `🔓 %18 Ceza (${penaltyAda.toLocaleString()} $ADASTRA) ödendi. ${soldiersCount} kişilik ordunun kilidi başarıyla açıldı!`
    };
  }

  // =========================================================================
  // P2P KOLEKSİYON ESERİ PAZARYERİ (ORDER BOOK & İLAN YÖNETİMİ)
  // =========================================================================
  getP2PArtifactListings() {
    if (!this.state.p2pMarketListings || this.state.p2pMarketListings.length === 0) {
      this.state.p2pMarketListings = [
        { id: 'p2p_1', artifactId: 'artifact_01', sellerName: 'Gezgin_Goblins', priceAda: 85, createdAt: Date.now() - 3600000 },
        { id: 'p2p_2', artifactId: 'artifact_04', sellerName: 'Lord_Kaelen', priceAda: 160, createdAt: Date.now() - 7200000 },
        { id: 'p2p_3', artifactId: 'artifact_06', sellerName: 'Tüccar_Kael', priceAda: 290, createdAt: Date.now() - 14400000 },
        { id: 'p2p_4', artifactId: 'artifact_09', sellerName: 'Gladyator_Rex', priceAda: 650, createdAt: Date.now() - 28800000 },
        { id: 'p2p_5', artifactId: 'artifact_12', sellerName: 'Saray_Muhafizi', priceAda: 1200, createdAt: Date.now() - 43200000 },
        { id: 'p2p_6', artifactId: 'artifact_17', sellerName: 'Ejderha_Avcisi', priceAda: 2800, createdAt: Date.now() - 86400000 }
      ];
    }
    return this.state.p2pMarketListings;
  }

  createP2PArtifactListing(artifactId, priceAda) {
    const price = Math.floor(Number(priceAda));
    if (isNaN(price) || price < 10) {
      return { success: false, message: 'Minimum satış fiyatı 10 $ADASTRA olmalıdır!' };
    }
    const art = (this.state.collectionArtifacts || []).find(a => a.id === artifactId);
    if (!art || !art.discovered) {
      return { success: false, message: 'Sahip olmadığınız veya henüz keşfetmediğiniz bir eseri satışa çıkaramazsınız!' };
    }
    const cfg = GAME_CONFIG.COLLECTION_ARTIFACTS.find(c => c.id === artifactId);
    const listing = {
      id: `p2p_${Date.now()}`,
      artifactId,
      sellerName: this.state.profileName || 'AlphAvax Gezgini',
      isUserListing: true,
      priceAda: price,
      createdAt: Date.now()
    };

    const listings = this.getP2PArtifactListings();
    listings.unshift(listing);
    this.saveState();

    return { success: true, message: `🚀 ${cfg ? cfg.icon : '👑'} ${cfg ? cfg.name : artifactId} eseri ${price.toLocaleString()} $ADASTRA fiyatla pazara ilan verildi!`, listing };
  }

  buyP2PArtifactListing(listingId) {
    const listings = this.getP2PArtifactListings();
    const idx = listings.findIndex(l => l.id === listingId);
    if (idx === -1) return { success: false, message: 'İlan bulunamadı veya daha önce satıldı!' };

    const listing = listings[idx];
    if (this.state.adAstraBalance < listing.priceAda) {
      return { success: false, message: `Yetersiz Bakiye! (${listing.priceAda.toLocaleString()} $ADASTRA gerekli)` };
    }

    this.state.adAstraBalance -= listing.priceAda;
    globalPool.recordTokenSpend(listing.priceAda);

    // Keşfedildi olarak işaretle
    const art = (this.state.collectionArtifacts || []).find(a => a.id === listing.artifactId);
    if (art) {
      art.discovered = true;
      art.discoveredAt = Date.now();
    }

    const cfg = GAME_CONFIG.COLLECTION_ARTIFACTS.find(c => c.id === listing.artifactId);

    // İlanı pazardan kaldır
    listings.splice(idx, 1);
    sound.playLevelUp();
    this.saveState();

    return { success: true, message: `🎉 ${cfg ? cfg.icon : '👑'} ${cfg ? cfg.name : listing.artifactId} eseri ${listing.priceAda.toLocaleString()} $ADASTRA ödenerek pazardan satın alındı ve albümüne eklendi!` };
  }

  cancelP2PArtifactListing(listingId) {
    const listings = this.getP2PArtifactListings();
    const idx = listings.findIndex(l => l.id === listingId);
    if (idx === -1) return { success: false, message: 'İlan bulunamadı!' };

    listings.splice(idx, 1);
    this.saveState();
    return { success: true, message: 'İlan başarıyla pazardan kaldırıldı.' };
  }

  // Asker Birimlerine Zindan XP'si Ekleme ve Seviye Atlattırma
  addSoldierXp(soldierIdx, xpAmount) {
    const s = (this.state.soldierUnits || [])[soldierIdx];
    if (!s) return { leveledUp: false };

    s.xp = (s.xp || 0) + xpAmount;
    let leveledUp = false;
    let newLevel = s.level || 1;
    let unlockedSkills = [];

    // Gerekli XP Formülü: Level * 100
    while (s.xp >= (s.level * 100)) {
      s.xp -= (s.level * 100);
      s.level += 1;
      s.baseAtk = 25 + (s.level - 1) * (GAME_CONFIG.SOLDIER_ATK_PER_LEVEL || 6);
      s.maxHp = 100 + (s.level - 1) * (GAME_CONFIG.SOLDIER_HP_PER_LEVEL || 25);
      s.hp = s.maxHp;
      leveledUp = true;
      newLevel = s.level;

      // Otomatik yetenek slotu ve kilit açımı
      const newly = this.checkSoldierSkillUnlock(s);
      if (newly && newly.length) unlockedSkills.push(...newly);
    }

    this.saveState();
    return { leveledUp, newLevel, soldierName: s.name, unlockedSkills };
  }

  // ⚔️ Seviye Kademelerinde Otomatik Skill Açımı (Lv.10, Lv.25, Lv.45, Lv.65)
  checkSoldierSkillUnlock(soldier) {
    if (!soldier.skills) soldier.skills = ['shieldWall'];
    const lvl = soldier.level || 1;
    const newlyUnlocked = [];

    // Seviye 10: 2. Slot (Şok Dalgası)
    if (lvl >= 10 && !soldier.skills.includes('shockwave') && !soldier.skills.includes('armorBreaker')) {
      soldier.skills.push('shockwave');
      newlyUnlocked.push('shockwave');
    }
    // Seviye 25: 3. Slot (Zırh Kırıcı)
    if (lvl >= 25 && !soldier.skills.includes('armorBreaker')) {
      soldier.skills.push('armorBreaker');
      newlyUnlocked.push('armorBreaker');
    }
    // Seviye 45: 4. Slot (Sahra Merhemi)
    if (lvl >= 45 && !soldier.skills.includes('fieldMedic')) {
      soldier.skills.push('fieldMedic');
      newlyUnlocked.push('fieldMedic');
    }
    // Seviye 65: Pasif Yetenek (Son Nefes)
    if (lvl >= 65 && !soldier.skills.includes('lastStand')) {
      soldier.skills.push('lastStand');
      newlyUnlocked.push('lastStand');
    }
    return newlyUnlocked;
  }

  // 🛡️ Asker Formasyonu (Ön Saf / Arka Saf) Ayarlama
  setSoldierRow(soldierIdx, row) {
    const s = (this.state.soldierUnits || [])[soldierIdx];
    if (!s) return { success: false, message: 'Asker bulunamadı!' };
    s.row = row === 'back' ? 'back' : 'front';
    this.saveState();
    return { success: true, soldier: s, row: s.row };
  }

  // 📖 Askere Yeni Skill Öğretme (Skill Loadout: Max 3 Aktif + Pasif)
  learnSoldierSkill(soldierIdx, skillId) {
    const s = (this.state.soldierUnits || [])[soldierIdx];
    if (!s) return { success: false, message: 'Asker bulunamadı!' };
    if (!s.skills) s.skills = ['shieldWall'];
    if (s.skills.includes(skillId)) {
      return { success: false, message: 'Bu asker bu yeteneği zaten biliyor!' };
    }

    const activeSkills = s.skills.filter(sk => sk !== 'lastStand');
    if (skillId !== 'lastStand' && activeSkills.length >= 3) {
      // 3 aktif yetenek dolduysa en eskisini çıkarıp yeniyi ekler
      s.skills = [...activeSkills.slice(1), skillId, ...(s.skills.includes('lastStand') ? ['lastStand'] : [])];
    } else {
      s.skills.push(skillId);
    }

    this.saveState();
    return { success: true, soldier: s, skills: s.skills };
  }

  // 🌋 Dünya Bossu & Ordu Yetenek Çeşitliliği Hasar Çarpanı
  calculateSquadSkillDiversity(soldierIndices = null) {
    const units = soldierIndices
      ? soldierIndices.map(i => (this.state.soldierUnits || [])[i]).filter(Boolean)
      : (this.state.soldierUnits || []);

    if (units.length === 0) return { uniqueRoles: 0, diversityMultiplier: 1.0, rolesFound: [] };

    const roles = new Set();
    units.forEach(u => {
      const skills = u.skills || ['shieldWall'];
      skills.forEach(sk => {
        if (sk === 'shieldWall') roles.add('Tank');
        else if (sk === 'shockwave') roles.add('AoE');
        else if (sk === 'fieldMedic') roles.add('Şifacı');
        else if (sk === 'armorBreaker') roles.add('Anti-Tank');
        else if (sk === 'stunStrike') roles.add('Kontrol');
        else if (sk === 'bloodFrenzy') roles.add('Berserker');
        else if (sk === 'lastStand') roles.add('Hayatta Kalma');
      });
    });

    const uniqueRoles = roles.size;
    // Her farklı taktiksel rol için %6 hasar çarpanı bonusu (örn. 5 farklı rol = 1.24x hasar!)
    const diversityMultiplier = Math.min(1.50, 1.0 + Math.max(0, uniqueRoles - 1) * 0.06);

    return {
      uniqueRoles,
      diversityMultiplier: parseFloat(diversityMultiplier.toFixed(2)),
      rolesFound: Array.from(roles)
    };
  }

  // 🏆 Kolezyum Sabit Lig Kademeleri (Bronz / Gümüş / Altın / Elmas / Şampiyon)
  getColosseumTier(rating = (this.state.colosseumStats?.rating || 1000)) {
    if (rating >= 1800) return { id: 'champion', name: '👑 Efsanevi Şampiyon', color: '#f59e0b', rewardMult: 2.0, minRating: 1800 };
    if (rating >= 1500) return { id: 'diamond', name: '💎 Elmas Gladyatör', color: '#38bdf8', rewardMult: 1.6, minRating: 1500 };
    if (rating >= 1300) return { id: 'gold', name: '🥇 Altın Gladyatör', color: '#eab308', rewardMult: 1.3, minRating: 1300 };
    if (rating >= 1150) return { id: 'silver', name: '🥈 Gümüş Gladyatör', color: '#94a3b8', rewardMult: 1.1, minRating: 1150 };
    return { id: 'bronze', name: '🥉 Bronz Gladyatör', color: '#b45309', rewardMult: 1.0, minRating: 0 };
  }

  // =========================================================================
  // 🧪 GELİŞTİRİCİ & HİLE (DEV CHEAT) TEST FONKSİYONLARI
  // =========================================================================
  cheatAddResources(wood = 0, iron = 0, wheat = 0, fragments = 0, adAstra = 0, boxes = 0, keys = 0) {
    const inv = this.state.inventory;
    inv.wood = (inv.wood || 0) + wood;
    inv.iron = (inv.iron || 0) + iron;
    inv.wheat = (inv.wheat || 0) + wheat;
    inv.fragments = (inv.fragments || 0) + fragments;
    this.state.adAstraBalance += adAstra;
    this.state.lockedBoxes = (this.state.lockedBoxes || 0) + boxes;
    this.state.arenaKeys = (this.state.arenaKeys || 0) + keys;
    this.saveState();
    return { success: true, message: '⚡ Test Kaynakları Hesaba Eklendi!' };
  }

  cheatRefillStamina() {
    this.state.stamina = this.getMaxStamina();
    this.saveState();
    return { success: true, message: '⚡ Stamina %100 Dolduruldu!' };
  }

  cheatUnlockAllArtifacts() {
    (this.state.collectionArtifacts || []).forEach(a => {
      a.discovered = true;
      a.discoveredAt = Date.now();
    });
    this.saveState();
    return { success: true, message: '👑 Tüm 18 Koleksiyon Eseri Açıldı!' };
  }

  cheatSetDungeonProgress(level) {
    this.state.dungeonProgress = Math.max(1, Math.min(18, level));
    this.saveState();
    return { success: true, message: `💀 Zindan İlerlemesi Seviye ${level} Olarak Ayarlandı!` };
  }

  cheatLevelUpPlayer() {
    this.state.level = (this.state.level || 1) + 1;
    this.state.currentXp = 0;
    this.state.stamina = this.getMaxStamina();
    this.saveState();
    return { success: true, message: `👑 Gezgin Seviye ${this.state.level}'e Yükseltildi!` };
  }

  cheatMaxEquipAllSoldiers() {
    const soldiers = this.state.soldierUnits || [];
    const slots = ['weapon', 'helmet', 'armor', 'legs', 'boots'];
    for (let i = 0; i < soldiers.length; i++) {
      if (!soldiers[i].equipment) soldiers[i].equipment = {};
      for (const slot of slots) {
        const recipe = GAME_CONFIG.EQUIPMENT_RECIPES[slot];
        soldiers[i].equipment[slot] = {
          id: `${recipe.id}_cheat_${i}`,
          slot: recipe.slot,
          name: recipe.name,
          icon: recipe.icon,
          level: 10,
          baseAtk: recipe.baseAtk,
          baseHp: recipe.baseHp,
          atkBonus: Math.round(recipe.baseAtk * (1 + 9 * 0.35)),
          hpBonus: Math.round(recipe.baseHp * (1 + 9 * 0.35)),
          durability: 13,
          maxDurability: 13,
          craftedAt: Date.now()
        };
      }
      soldiers[i].hp = soldiers[i].maxHp || 100;
    }
    this.saveState();
    return { success: true, message: '⚔️ Tüm Askerlere Lv.10 Master Zırh ve Silah Donatıldı!' };
  }

  cheatFinishAllExpeditions() {
    const active = this.state.activeExpeditions;
    for (const key of Object.keys(active)) {
      if (active[key]) {
        active[key].elapsedSeconds = active[key].durationSeconds || 1080;
        active[key].isCompleted = true;
      }
    }
    this.saveState();
    return { success: true, message: '⚡ Tüm Seferler Anında Tamamlandı!' };
  }

  // =========================================================================
  // COMMAND PALETTE: ARANABILIR EYLEM LİSTESİ
  // =========================================================================
  getCommandPaletteActions() {
    return [
      { id: 'dashboard', icon: '🏰', label: 'Krallık Dashboard', shortcut: 'TAB', category: 'Panel' },
      { id: 'treasury', icon: '🏦', label: 'Krallık Hazinesi & Ödül Havuzları', shortcut: 'H', category: 'Panel' },
      { id: 'forest', icon: '🌲', label: 'Zümrüt Ormanı & Oduncu', shortcut: '1 / S', category: 'Bina' },
      { id: 'mine', icon: '⛏️', label: 'Maden Ocağı & Demirci', shortcut: '2 / I', category: 'Bina' },
      { id: 'farm', icon: '🌾', label: 'Güneş Tarlası & Çiftlik', shortcut: '3 / F', category: 'Bina' },
      { id: 'barracks', icon: '⚔️', label: 'Kışla & Ordu Yönetimi', shortcut: '4 / B', category: 'Bina' },
      { id: 'market', icon: '🏪', label: 'AMM Pazar Yeri', shortcut: '5 / M', category: 'Bina' },
      { id: 'dungeon', icon: '💀', label: 'Zindan', shortcut: '6 / D', category: 'Bina' },
      { id: 'colosseum', icon: '🏟️', label: 'Kolezyum Arenası', shortcut: '7 / C', category: 'Bina' },
      { id: 'inventory', icon: '🎒', label: 'Envanter & Karakter', shortcut: 'E', category: 'Panel' },
      { id: 'claimAll', icon: '⚡', label: 'Tüm Seferleri Topla & Yeniden Başlat', shortcut: '', category: 'Eylem' },
      { id: 'repairAll', icon: '🔨', label: 'Tüm Aletleri Onar', shortcut: '', category: 'Eylem' },
      { id: 'healAll', icon: '🌾', label: 'Tüm Orduyu İyileştir', shortcut: '', category: 'Eylem' },
      { id: 'autoEquip', icon: '⚔️', label: 'En İyi Eşyaları Otomatik Dağıt', shortcut: '', category: 'Eylem' },
      { id: 'economy', icon: '📈', label: 'Ekonomi & Tokenomics Dashboard', shortcut: '', category: 'Panel' },
    ];
  }
}

export const gameState = new GameStateManager();

