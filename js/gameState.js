// AdAstra: Genesis Realm - Gelişmiş Karakter Seviyesi, Ordu, Taverna & Otomasyon Yöneticisi
import { GAME_CONFIG } from './config.js';
import { globalPool } from './globalPool.js';
import { sound } from './audio.js';
import { ammMarket } from './ammMarket.js';

export class GameStateManager {
  constructor() {
    this.storageKey = 'adastra_player_save_v6';
    this.state = this.loadState();
    this.listeners = [];
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
      soldierUnits: this.mergeSoldierUnits(parsed.soldierUnits)
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
  // ASKER BİRİMİ — v2: DÖRT SINIF, DÖRT ROL (F-19)
  // ═══════════════════════════════════════════════════════════════════════
  // v1'de her asker `class: 'warrior'`, `baseAtk: 20`, `maxHp: 100` idi.
  // Config'de Muhafız / Okçu / Paladin tanımlıydı ama hiç kullanılmıyordu;
  // savaşta tüm askerler birbirinin aynıydı ve kadro kurma diye bir karar yoktu.
  //
  // v2'de asker satın alırken sınıf seçilir. Sınıflar canı, saldırıyı, zırhı,
  // hızı, kritiği ve saf tercihini değiştirir; her birinin kendi yeteneği vardır.
  static SOLDIER_ROTATION = ['guardian', 'ranger', 'paladin', 'mage'];

  createSoldierUnit(index, classId = null) {
    const rotation = GameStateManager.SOLDIER_ROTATION;
    const cls = classId && GAME_CONFIG.COMBAT_CLASSES[classId]
      ? classId
      : rotation[(index - 1) % rotation.length];
    const c = GAME_CONFIG.COMBAT_CLASSES[cls];

    return {
      id: `soldier_${Date.now()}_${index}`,
      name: `${c.name} #${index}`,
      class: cls,
      className: c.name,
      icon: c.icon,
      element: null,
      row: c.preferredRow,
      level: 1,
      xp: 0,
      maxHp: Math.round(100 * c.hpMult),
      hp: Math.round(100 * c.hpMult),
      baseAtk: Math.round(20 * c.atkMult),
      baseArmor: c.baseArmor,
      baseSpeed: c.baseSpeed,
      baseCrit: c.baseCrit,
      basePen: c.basePen,
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
    const rotation = GameStateManager.SOLDIER_ROTATION;
    if (!Array.isArray(saved) || saved.length === 0) {
      // Sıfırlanmış hesapta ordu boş başlar; otomatik asker yaratılmaz.
      return [];
    }
    return saved.map((s, i) => {
      // Eski kayıtlarda herkes 'warrior' idi; rotasyona göre sınıf atanır.
      const cls = GAME_CONFIG.COMBAT_CLASSES[s.class] ? s.class : rotation[i % rotation.length];
      const c = GAME_CONFIG.COMBAT_CLASSES[cls];
      return {
        id: s.id || `soldier_${i + 1}`,
        name: s.name && s.className ? s.name : `${c.name} #${i + 1}`,
        class: cls,
        className: c.name,
        icon: c.icon,
        element: null,
        row: s.row || c.preferredRow,
        level: s.level || 1,
        xp: s.xp || 0,
        maxHp: s.maxHp || Math.round(100 * c.hpMult),
        hp: s.hp != null ? s.hp : (s.maxHp || Math.round(100 * c.hpMult)),
        baseAtk: s.baseAtk || Math.round(20 * c.atkMult),
        baseArmor: s.baseArmor != null ? s.baseArmor : c.baseArmor,
        baseSpeed: s.baseSpeed != null ? s.baseSpeed : c.baseSpeed,
        baseCrit: s.baseCrit != null ? s.baseCrit : c.baseCrit,
        basePen: s.basePen != null ? s.basePen : c.basePen,
        woundedUntil: s.woundedUntil || 0,
        equipment: {
          weapon: null, helmet: null, armor: null, legs: null, boots: null,
          ...(s.equipment || {})
        }
      };
    });
  }

  // 1 Asker satın alma maliyeti: 180.000 $ADASTRA (180 bin ADA)
  getSoldierCost(index = (this.state.soldierUnits || []).length + 1) {
    if (!GAME_CONFIG.SOLDIER_COST_EXPONENT || GAME_CONFIG.SOLDIER_COST_EXPONENT === 0) {
      return GAME_CONFIG.SOLDIER_COST_BASE || 180000;
    }
    const n = Math.max(1, index);
    return Math.round(GAME_CONFIG.SOLDIER_COST_BASE * Math.pow(n, GAME_CONFIG.SOLDIER_COST_EXPONENT));
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

    const cfg = GAME_CONFIG.SOLDIER_PASSIVE_HEAL;
    const maxHp = soldier.maxHp || 100;
    const hp = Math.min(maxHp, Math.max(0, soldier.hp != null ? soldier.hp : maxHp));
    const missingHp = Math.max(0, maxHp - hp);
    const wheatNeeded = Math.ceil(missingHp * cfg.WHEAT_PER_HP);
    const adaCost = Math.ceil(missingHp * cfg.INSTANT_HEAL_ADA_PER_HP);
    const secondsRemaining = missingHp > 0 ? Math.ceil((missingHp / maxHp) * cfg.FULL_HEAL_SECONDS) : 0;
    const wheatInStock = Math.floor(this.state.inventory.wheat || 0);

    return {
      hp: Math.floor(hp),
      maxHp,
      missingHp: Math.ceil(missingHp),
      hpPct: Math.floor((hp / maxHp) * 100),
      isFull: missingHp <= 0,
      isPaused: missingHp > 0 && wheatInStock <= 0,
      wheatNeeded,
      adaCost,
      secondsRemaining,
      wheatInStock
    };
  }

  // Oyun döngüsünün her tikinde (gerçek zaman veya fastForward) 18 askeri deltaSeconds kadar pasif olarak iyileştirir.
  // KESİNLİKLE ADA harcamaz, sadece depodaki Buğdayı orantılı olarak düşer. Buğday biterse ilgili asker için sessizce durur.
  processSoldierPassiveHealing(deltaSeconds) {
    if (!deltaSeconds || deltaSeconds <= 0) return { wheatRanOut: false };

    const cfg = GAME_CONFIG.SOLDIER_PASSIVE_HEAL;
    const units = this.state.soldierUnits || [];
    let changed = false;
    let wheatRanOut = false;

    units.forEach(soldier => {
      const maxHp = soldier.maxHp || 100;
      const currentHp = soldier.hp != null ? soldier.hp : maxHp;
      if (currentHp >= maxHp) return;

      const missingHp = maxHp - currentHp;
      const hpPerSecond = maxHp / cfg.FULL_HEAL_SECONDS;
      let hpGain = Math.min(missingHp, hpPerSecond * deltaSeconds);
      let wheatCost = hpGain * cfg.WHEAT_PER_HP;

      const availableWheat = this.state.inventory.wheat || 0;
      if (availableWheat <= 0) {
        wheatRanOut = true;
        return;
      }

      if (wheatCost > availableWheat) {
        hpGain = availableWheat / cfg.WHEAT_PER_HP;
        wheatCost = availableWheat;
        wheatRanOut = true;
      }

      if (hpGain > 0) {
        this.state.inventory.wheat = Math.max(0, Math.round((availableWheat - wheatCost) * 100) / 100);
        soldier.hp = Math.min(maxHp, Math.round((currentHp + hpGain) * 100) / 100);
        changed = true;
      }
    });

    if (changed) this.saveState();
    return { wheatRanOut };
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
    this.state.adAstraBalance -= info.adaCost;
    soldier.hp = soldier.maxHp || 100;

    sound.playRepair();
    this.saveState();

    return {
      success: true,
      message: `⚡ ${soldier.name} anında tam cana kavuştu! (-${info.wheatNeeded} 🌾 Buğday, -${info.adaCost} 🟣 ADA)`
    };
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

    const wheatPerStamina = (GAME_CONFIG.BASE_PRODUCTION.wheat || 15) * (GAME_CONFIG.WHEAT_REFILL_RATIO || 0.21); // 3.15 Buğday / 1 Stamina
    const actualGain = Math.min(staminaToGain, maxStam - curStam);
    const requiredWheat = Math.ceil(actualGain * wheatPerStamina);

    if ((Number(inv.wheat) || 0) < requiredWheat) {
      return { success: false, message: `Yetersiz Buğday! +${Math.round(actualGain)} Stamina için ${requiredWheat} Buğday gerekli.` };
    }

    inv.wheat = Math.max(0, inv.wheat - requiredWheat);
    this.state.stamina = Math.min(maxStam, curStam + actualGain);
    sound.playStaminaRefill();
    this.saveState();
    return {
      success: true,
      message: `🍞 ${requiredWheat} Buğday tüketildi! +${Math.round(actualGain)} Stamina yenilendi (${Math.floor(this.state.stamina)}/${maxStam})`
    };
  }

  // 1.5 Depodaki Buğday ile Staminayı Tek Seferde Tamamen Doldurma
  // Kural: 1 Stamina doldurmak için dakika başı çıkartılan buğdayın (15) %21'i (3.15 Buğday) gerekir.
  refillStaminaToMaxWithWheat() {
    const inv = this.state.inventory;
    const maxStam = this.getMaxStamina();
    const curStam = this.state.stamina;
    const neededStamina = maxStam - curStam;

    if (neededStamina <= 0) {
      return { success: false, message: 'Stamina zaten tamamen dolu!' };
    }

    const availableWheat = Math.floor(Number(inv.wheat) || 0);
    if (availableWheat <= 0) {
      return { success: false, message: 'Yetersiz Buğday! Depoda hiç buğday yok.' };
    }

    const wheatPerStamina = (GAME_CONFIG.BASE_PRODUCTION.wheat || 15) * (GAME_CONFIG.WHEAT_REFILL_RATIO || 0.21); // 3.15 Buğday / 1 Stamina
    const exactWheatNeeded = Math.ceil(neededStamina * wheatPerStamina);
    const wheatToUse = Math.min(availableWheat, exactWheatNeeded);

    if (wheatToUse <= 0) {
      return { success: false, message: 'Stamina doldurmak için yeterli buğday yok.' };
    }

    const gainedStamina = wheatToUse / wheatPerStamina;
    inv.wheat = Math.max(0, inv.wheat - wheatToUse);
    this.state.stamina = Math.min(maxStam, curStam + gainedStamina);
    sound.playStaminaRefill();
    this.saveState();

    const isFull = this.state.stamina >= maxStam;
    return {
      success: true,
      message: isFull
        ? `⚡ ${wheatToUse} Buğday tüketildi! Stamina tamamen dolduruldu (${maxStam}/${maxStam} ⚡)`
        : `⚡ ${wheatToUse} Buğday tüketildi! +${Math.round(gainedStamina)} Stamina yenilendi (${Math.floor(this.state.stamina)}/${maxStam} ⚡)`
    };
  }

  // 2. Tavernadan AdAstra Karşılığında Staminayı Fullleme
  instantRefillStamina() {
    const cost = GAME_CONFIG.STAMINA_INSTANT_REFILL_ADASTRA_COST || 50;
    const maxStam = this.getMaxStamina();
    const curBal = Number(this.state.adAstraBalance) || 0;
    if (curBal < cost) {
      return { success: false, message: `Yetersiz AdAstra Token! (${cost} ADA gerekli, mevcut: ${curBal.toFixed(1)} ADA)` };
    }
    if (this.state.stamina >= maxStam) {
      return { success: false, message: 'Stamina zaten dolu!' };
    }

    this.state.adAstraBalance = curBal - cost;
    this.state.stamina = maxStam;
    globalPool.recordTokenSpend(cost);
    sound.playStaminaRefill();
    this.saveState();
    return { success: true, message: `🥩 Stamina ${maxStam}/${maxStam} fullendi!` };
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

    this.state.stamina -= staminaCost;
    this.state.activeExpeditions[nodeId] = {
      nodeId,
      durationMinutes: minutes,
      durationHours: hours,
      durationSeconds: baseDurationSec,
      elapsedSeconds: 0,
      isCompleted: false
    };

    if (toolId === 'axe') sound.playChop();
    else if (toolId === 'pickaxe') sound.playPickaxe();
    else sound.playHarvest();

    this.saveState();
    return { success: true, message: `${hours} Saatlik ${nodeConfig.name} görevi başlatıldı! (-${staminaCost} ⚡)` };
  }

  getExpeditionSpeedMultiplier() {
    if (this.isBuffActive('speed_potion_3')) return 2.0;
    if (this.isBuffActive('speed_potion_2')) return 1.75;
    if (this.isBuffActive('speed_potion_1')) return 1.5;
    if (this.isBuffActive('speed_wood') || this.isBuffActive('speed_iron') || this.isBuffActive('speed_wheat')) return 1.5;
    return 1.0;
  }

  updateExpeditions(deltaSeconds) {
    let hasChanges = false;
    const speedMult = this.getExpeditionSpeedMultiplier();
    for (const nodeId of Object.keys(this.state.activeExpeditions)) {
      const exp = this.state.activeExpeditions[nodeId];
      if (exp && !exp.isCompleted) {
        exp.elapsedSeconds += (deltaSeconds * speedMult);
        if (exp.elapsedSeconds >= exp.durationSeconds) {
          exp.elapsedSeconds = exp.durationSeconds;
          exp.isCompleted = true;
          hasChanges = true;

          // 🤖 OTOMATİK TOPLAMA & OTOMATİK TAMİR BOTU (AUTO-COLLECTOR & AUTO-REPAIR)
          if (this.isAutoCollectorActive()) {
            setTimeout(() => {
              this.claimExpedition(nodeId);

              const toolId = GAME_CONFIG.GLOBAL_RESOURCE_CAPS[nodeId].requiredTool;
              const tool = this.state.tools[toolId];

              // Eğer aletin dayanıklılığı sıfırlandıysa, depodaki hammaddelerle otomatik tamir et
              if (tool && tool.durability <= 0) {
                const repCost = this.calculateRepairCost(toolId);
                const inv = this.state.inventory;

                if (repCost && (inv.wood || 0) >= repCost.woodCost && (inv.iron || 0) >= repCost.ironCost && this.state.adAstraBalance >= repCost.adAstraCost) {
                  this.repairTool(toolId);
                }
              }

              // Alet sağlamsa ve stamina varsa yeniden başlat
              if (this.state.tools[toolId] && this.state.tools[toolId].durability > 0 && this.state.stamina >= 25) {
                this.startExpedition(nodeId);
              }
            }, 500);
          }
        }
      }
    }
    if (hasChanges) this.saveState();
  }

  isAutoCollectorActive() {
    return this.isBuffActive('auto_collector') ||
           this.isBuffActive('auto_collector_weekly') ||
           this.isBuffActive('auto_collector_monthly');
  }

  getAutoCollectorExpiry() {
    let maxExp = 0;
    for (const id of ['auto_collector', 'auto_collector_weekly', 'auto_collector_monthly']) {
      const b = this.state.activeBuffs[id];
      if (b && b.expiresAt > maxExp && b.expiresAt > Date.now()) {
        maxExp = b.expiresAt;
      }
    }
    return maxExp;
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

    // v1 HATASI: burada `speed_${nodeId}` (yani 40 ADA'lık eski buff) okunuyordu.
    // Oyuncunun tavernada 4.500–45.000 ADA'ya aldığı speed_potion_1/2/3
    // iksirleri verimi HİÇ etkilemiyordu — 40 ADA'lık ürün 45.000 ADA'lıktan
    // 1.125 kat daha verimliydi (F-17). Artık gerçek çarpan okunuyor.
    const speedMult = this.getExpeditionSpeedMultiplier();
    const durationMins = exp.durationMinutes || Math.round((exp.durationHours || 0.3) * 60) || Math.max(1, Math.round(exp.durationSeconds / 60));
    const durationHours = exp.durationHours || parseFloat((durationMins / 60).toFixed(2));
    const totalYield = Math.max(10, Math.floor(ratePm * durationMins * speedMult));
    const totalXp = Math.max(5, Math.floor(35 * durationHours));

    const progressRatio = Math.min(1, exp.elapsedSeconds / exp.durationSeconds);
    const claimedRatio = Math.min(1, (exp.claimedSeconds || 0) / exp.durationSeconds);
    const unclimedProgress = Math.max(0, progressRatio - claimedRatio);
    const accruedAmount = Math.floor(totalYield * unclimedProgress);
    const accruedXp = exp.isCompleted ? totalXp : Math.max(1, Math.floor(totalXp * progressRatio));
    const pct = Math.min(100, Math.floor(progressRatio * 100));
    const remainingSeconds = Math.max(0, Math.ceil(exp.durationSeconds - exp.elapsedSeconds));

    return {
      accruedAmount,
      totalYield,
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
    const resourceDisplayNames = { wood: 'odun', iron: 'demir', wheat: 'buğday' };
    const rLabel = resourceDisplayNames[nodeId] || nodeConfig.name;

    if (limit != null && (currentAmount + accruedInfo.accruedAmount > limit)) {
      return {
        success: false,
        isWarehouseFull: true,
        nodeId,
        currentAmount,
        limit,
        remainingToClaim: accruedInfo.accruedAmount,
        message: `⚠️ Silo'nuz dolu! Lütfen ${rLabel} seferini tamamlamak için silonuzu büyütün ve silonuzda yer açın.`
      };
    }

    const requested = globalPool.harvest(nodeId, accruedInfo.accruedAmount);
    const { stored: harvestedAmount, overflow } = this.storeResource(nodeId, requested);
    if (playerTool) {
      playerTool.totalGathered = (playerTool.totalGathered || 0) + harvestedAmount;
    }

    const xpGained = accruedInfo.accruedXp || Math.max(1, Math.floor(35 * ((accruedInfo.elapsedSeconds || 60) / 3600)));
    const levelResult = this.addXp(xpGained);

    exp.claimedSeconds = exp.elapsedSeconds;
    sound.playHarvest();
    this.saveState();

    return {
      success: true,
      amount: harvestedAmount,
      overflow,
      xpGained,
      levelResult,
      message: overflow > 0
        ? `⚡ ${harvestedAmount} ${nodeConfig.name} toplandı, ${overflow} birim depoya sığmadı ve çürüdü! (+${xpGained} XP) — Depoyu yükselt.`
        : `⚡ ${harvestedAmount} ${nodeConfig.name} erken toplandı! (+${xpGained} XP)`
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // DEPO KAPASİTESİ — v2: ARTIK GERÇEKTEN UYGULANIYOR (F-16)
  // ═══════════════════════════════════════════════════════════════════════
  // v1'de getWarehouseCapacity() hesaplanıp yüzde çubuğunda gösteriliyordu ama
  // envantere ekleme yapan hiçbir yerde tavan kontrolü yoktu. Depo yükseltmesi
  // (3.000 ADA'ya kadar) tamamen kozmetik bir harcamaydı ve oyunun en doğal
  // hammadde sink'i olan taşma kaybı devre dışıydı.
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
    // Seviye arttıkça dakika başı üretim artmaz, her seviye için fix kalır; sadece sefer süresi uzar.
    const ratePm = this.getResourceRatePerMinute(nodeId);
    const speedMult = this.getExpeditionSpeedMultiplier();
    const durationMinutes = exp.durationMinutes || Math.round((exp.durationHours || 0.3) * 60) || Math.max(1, Math.round(exp.durationSeconds / 60));
    const totalYield = Math.floor(ratePm * durationMinutes * speedMult);

    // Erken toplanan miktarı düş
    const claimedRatio = Math.min(1, (exp.claimedSeconds || 0) / exp.durationSeconds);
    const alreadyClaimed = Math.floor(totalYield * claimedRatio);
    const remainingToClaim = Math.max(5, totalYield - alreadyClaimed);

    // SİLO / DEPO DOLULUK VE TAŞMA KONTROLÜ
    // Kural: Sefer bitince eğer seferden gelecek olan kaynağı almak depoyu dolduruyor ve taşırıyorsa
    // kaynak ziyan olmasın diye uyarı verilir:
    // "silo'nuz dolu lütfen [ilgili kaynak] seferi tamamlamak için silonuzu büyütün ve silonuzda yer açın"
    const cap = this.getWarehouseCapacity();
    const limit = cap[nodeId];
    const currentAmount = Number(this.state.inventory[nodeId]) || 0;
    const resourceDisplayNames = { wood: 'odun', iron: 'demir', wheat: 'buğday' };
    const rLabel = resourceDisplayNames[nodeId] || nodeId;

    if (limit != null && (currentAmount + remainingToClaim > limit)) {
      return {
        success: false,
        isWarehouseFull: true,
        nodeId,
        currentAmount,
        limit,
        remainingToClaim,
        message: `⚠️ Silo'nuz dolu! Lütfen ${rLabel} seferini tamamlamak için silonuzu büyütün ve silonuzda yer açın.`
      };
    }

    const fromPool = globalPool.harvest(nodeId, remainingToClaim);
    const { stored: harvestedAmount, overflow } = this.storeResource(nodeId, fromPool);

    // Sefer süresi kadar dakika başına 1 durability aşınması (72 saat = 4320 dk)
    playerTool.durability = Math.max(0, (playerTool.durability != null ? playerTool.durability : 4320) - durationMinutes);
    playerTool.totalGathered = (playerTool.totalGathered || 0) + harvestedAmount;

    // Sefer Başına XP Kazanımı (Sefer ekranındaki XP ile %100 aynı)
    const durationHours = exp.durationHours || parseFloat((durationMinutes / 60).toFixed(2));
    const xpGained = Math.max(5, Math.floor(35 * durationHours));
    this.addXp(xpGained);

    delete this.state.activeExpeditions[nodeId];

    if (playerTool.durability === 0) sound.playBreakWarning();
    else sound.playHarvest();

    this.saveState();

    return {
      success: true,
      amount: harvestedAmount,
      overflow,
      resourceName: nodeConfig.name,
      icon: nodeConfig.icon,
      durabilityLeft: playerTool.durability,
      toolName: toolConfig.name,
      xpGained,
      isBroken: playerTool.durability === 0
    };
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
    const nextLvl = this.state.level + 1;
    const curLvl = this.state.level;
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
      durationHours: this.getExpeditionDurationHours(nextLvl)
    };
  }

  levelUp() {
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
    // Ek olarak dakika başına 1 AdAstra onarım bedeli alınır
    const woodCostPerMin = (woodRatePm * 0.25) / 3;
    const ironCostPerMin = (ironRatePm * 0.25) / 3;
    const adAstraCostPerMin = 1;

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
        adAstraCostPerMin
      };
    }

    const woodCost = Math.ceil(missingDurability * woodCostPerMin);
    const ironCost = Math.ceil(missingDurability * ironCostPerMin);
    const adAstraCost = Math.ceil(missingDurability * adAstraCostPerMin);

    return {
      toolName: toolConfig.name,
      woodCost,
      ironCost,
      wheatCost: 0,
      adAstraCost,
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
  // 🤖 AMM DEX ANLIK MALİYET BOTU (Her saniye otomatik hesaplar)
  // =========================================================================
  tickUpgradeCostBot(deltaSeconds = 1) {
    this._upgradeBotTimer = (this._upgradeBotTimer || 0) + deltaSeconds;
    if (this._upgradeBotTimer < 1.0 && this.liveUpgradeCosts) {
      return this.liveUpgradeCosts;
    }
    this._upgradeBotTimer = 0;

    const warehouseCost = this.getWarehouseUpgradeCost();
    const levelReq = this.getNextLevelRequirement();

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
      }
    };

    return this.liveUpgradeCosts;
  }

  // =========================================================================
  // 7.5. 5 ADET DEMİRCİ EKİPMANI (SİLAH, MİĞFER, ZIRH, PANTOLON, AYAKKABI)
  // =========================================================================
  // Toplam Ekipman Bonuslarını Hesaplar (Tüm 5 yuvanın ATK ve HP toplamı)
  getEquipmentBonusStats() {
    let totalAtk = 0;
    let totalHp = 0;
    if (!this.state.equipment) return { totalAtk: 0, totalHp: 0 };

    for (const slot of ['weapon', 'helmet', 'armor', 'legs', 'boots']) {
      const item = this.state.equipment[slot];
      if (item && item.durability > 0) {
        totalAtk += item.atkBonus || 0;
        totalHp += item.hpBonus || 0;
      }
    }
    return { totalAtk, totalHp };
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

    const inv = this.state.inventory;
    const cost = recipe.cost;
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
    inv.iron = (inv.iron || 0) - cost.iron;
    inv.wood = (inv.wood || 0) - cost.wood;
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
      destination = 've Cephanelik Deposu\'na eklendi (İstediğin askere giydirebilirsin)';
    }

    sound.playRepair();
    this.saveState();

    return { 
      success: true, 
      message: `⚒️ ${recipe.icon} ${recipe.name} başarıyla dövüldü ${destination}! (13/13 Dayanıklılık)`, 
      item 
    };
  }

  // 2. Ekipman Tekrar Dövme / Onarım Maliyeti (Reforge Cost)
  // Durability 13 altına düştüğünde tekrar dövülerek 13/13 yapılır.
  // Eşyanın seviyesi ne kadar yüksekse tekrar dövme maliyeti de o kadar yüksek olur!
  calculateEquipmentReforgeCost(slotKey) {
    const item = this.state.equipment ? this.state.equipment[slotKey] : null;
    if (!item) return null;

    const missing = 13 - (item.durability || 0);
    if (missing <= 0) return { missing: 0, ironCost: 0, woodCost: 0, adAstraCost: 0, isRepaired: true };

    const lvl = item.level || 1;
    const ironCost = Math.max(4, Math.ceil(missing * 3 * lvl));
    const woodCost = Math.max(3, Math.ceil(missing * 2 * lvl));
    const adAstraCost = Math.max(3, Math.ceil(missing * 2 * lvl));

    return {
      missing,
      ironCost,
      woodCost,
      adAstraCost,
      isRepaired: false,
      itemName: item.name,
      level: lvl
    };
  }

  // Ekipmanı Tekrar Döv (Reforge to 13/13)
  reforgeEquipment(slotKey) {
    const cost = this.calculateEquipmentReforgeCost(slotKey);
    if (!cost) return { success: false, message: 'Ekipman bulunamadı!' };
    if (cost.missing <= 0) return { success: false, message: 'Ekipman zaten 13/13 dayanıklılıkta!' };

    const inv = this.state.inventory;
    if ((inv.iron || 0) < cost.ironCost) {
      return { success: false, message: `Yetersiz Demir! (${cost.ironCost} Demir gerekli)` };
    }
    if ((inv.wood || 0) < cost.woodCost) {
      return { success: false, message: `Yetersiz Odun! (${cost.woodCost} Odun gerekli)` };
    }
    if (this.state.adAstraBalance < cost.adAstraCost) {
      return { success: false, message: `Yetersiz AdAstra! (${cost.adAstraCost} $ADASTRA gerekli)` };
    }

    inv.iron -= cost.ironCost;
    inv.wood -= cost.woodCost;
    this.state.adAstraBalance -= cost.adAstraCost;
    globalPool.recordTokenSpend(cost.adAstraCost);

    const item = this.state.equipment[slotKey];
    item.durability = 13;

    sound.playRepair();
    this.saveState();

    return {
      success: true,
      message: `🔨 ${item.icon} ${item.name} örste yeniden dövüldü ve 13/13 dayanıklılığa ulaştı!`
    };
  }

  // 3. Ekipman Geliştirme Maliyeti (Upgrade Cost: Lv.1 -> Lv.10 DeepSeek-R1 Matriksi)
  calculateEquipmentUpgradeCost(slotKey) {
    const item = this.state.equipment ? this.state.equipment[slotKey] : null;
    if (!item) return null;

    const currentLvl = item.level || 1;
    if (currentLvl >= (GAME_CONFIG.EQUIPMENT_MAX_LEVEL || 10)) {
      return { isMaxLevel: true, currentLevel: currentLvl };
    }

    const nextLvl = currentLvl + 1;
    const tier = GAME_CONFIG.EQUIPMENT_UPGRADE_TIERS[nextLvl] || {
      iron: nextLvl * 30,
      wood: nextLvl * 20,
      fragments: nextLvl * 5,
      adAstra: nextLvl * 100
    };

    return {
      isMaxLevel: false,
      currentLevel: currentLvl,
      nextLevel: nextLvl,
      ironCost: tier.iron,
      woodCost: tier.wood,
      fragmentCost: tier.fragments,
      adAstraCost: tier.adAstra,
      nextAtk: Math.round(item.baseAtk * (1 + (nextLvl - 1) * 0.35)),
      nextHp: Math.round(item.baseHp * (1 + (nextLvl - 1) * 0.35))
    };
  }

  // Ekipmanı Geliştir (Upgrade Level: Demir + Odun + Parça + AdAstra)
  upgradeEquipment(slotKey) {
    const cost = this.calculateEquipmentUpgradeCost(slotKey);
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
    this.state.adAstraBalance -= cost.adAstraCost;
    globalPool.recordTokenSpend(cost.adAstraCost);

    const item = this.state.equipment[slotKey];
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

  // =========================================================================
  // 8. TEÇHİZAT ONARIM VE DAYANIKLILIK YÖNETİMİ
  // =========================================================================

  calculateEquipmentRepairCost(slotKey, soldierIndex = null) {
    let item = null;
    if (soldierIndex !== null && soldierIndex !== undefined && soldierIndex !== '') {
      const soldier = (this.state.soldierUnits || [])[soldierIndex];
      item = soldier?.equipment ? soldier.equipment[slotKey] : null;
    } else {
      item = this.state.equipment ? this.state.equipment[slotKey] : null;
    }
    if (!item) return { missingDurability: 0, ironCost: 0, woodCost: 0, fragCost: 0, adaCost: 0, isRepaired: true };

    const maxDur = item.maxDurability || 13;
    const curDur = item.durability != null ? item.durability : maxDur;
    const missing = Math.max(0, maxDur - curDur);
    if (missing <= 0) return { missingDurability: 0, ironCost: 0, woodCost: 0, fragCost: 0, adaCost: 0, isRepaired: true };

    const lvl = item.level || 1;
    const ironCost = Math.max(2, Math.ceil(missing * 2 * lvl));
    const woodCost = Math.max(1, Math.ceil(missing * 1.5 * lvl));
    const fragCost = lvl >= 5 ? Math.ceil(missing * 0.5) : 0;
    const adaCost = Math.max(1, Math.ceil(missing * 1 * lvl));

    return {
      missingDurability: missing,
      ironCost,
      woodCost,
      fragCost,
      adaCost,
      isRepaired: false,
      itemName: item.name,
      level: lvl
    };
  }

  repairEquipment(slotKey, soldierIndex = null) {
    let item = null;
    let soldier = null;
    if (soldierIndex !== null && soldierIndex !== undefined && soldierIndex !== '') {
      soldier = (this.state.soldierUnits || [])[soldierIndex];
      item = soldier?.equipment ? soldier.equipment[slotKey] : null;
    } else {
      item = this.state.equipment ? this.state.equipment[slotKey] : null;
    }

    if (!item) return { success: false, message: 'Onarılacak ekipman bulunamadı!' };

    const cost = this.calculateEquipmentRepairCost(slotKey, soldierIndex);
    if (cost.missingDurability <= 0) {
      return { success: false, message: `${item.name} zaten tamamen sağlam!` };
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

    const currentLvl = item.level || 1;
    if (currentLvl >= (GAME_CONFIG.EQUIPMENT_MAX_LEVEL || 10)) {
      return { success: false, message: 'Bu ekipman zaten maksimum seviyede (Lv.10 Master)!' };
    }

    const nextLvl = currentLvl + 1;
    const tier = GAME_CONFIG.EQUIPMENT_UPGRADE_TIERS[nextLvl] || {
      iron: nextLvl * 30,
      wood: nextLvl * 20,
      fragments: nextLvl * 5,
      adAstra: nextLvl * 100
    };

    const inv = this.state.inventory;
    if ((inv.fragments || 0) < tier.fragments) {
      return { success: false, message: `Yetersiz Teçhizat Parçası! (${tier.fragments} Teçhizat Parçaları gerekli)` };
    }
    if ((inv.iron || 0) < tier.iron) {
      return { success: false, message: `Yetersiz Demir! (${tier.iron} Demir gerekli)` };
    }
    if ((inv.wood || 0) < tier.wood) {
      return { success: false, message: `Yetersiz Odun! (${tier.wood} Odun gerekli)` };
    }
    if (this.state.adAstraBalance < tier.adAstra) {
      return { success: false, message: `Yetersiz AdAstra! (${tier.adAstra} $ADASTRA gerekli)` };
    }

    inv.fragments = (inv.fragments || 0) - tier.fragments;
    inv.iron = (inv.iron || 0) - tier.iron;
    inv.wood = (inv.wood || 0) - tier.wood;
    this.state.adAstraBalance -= tier.adAstra;
    globalPool.recordTokenSpend(tier.adAstra);

    item.level = nextLvl;
    item.atkBonus = Math.round((item.baseAtk || 20) * (1 + (nextLvl - 1) * 0.35));
    item.hpBonus = Math.round((item.baseHp || 30) * (1 + (nextLvl - 1) * 0.35));
    item.durability = item.maxDurability || 13;

    sound.playLevelUp();
    this.saveState();

    return {
      success: true,
      message: `✨ ${item.icon} ${item.name} Seviye ${item.level}'e yükseltildi! (+${item.atkBonus} Saldırı, +${item.hpBonus} Can, 13/13 Dayanıklılık)`
    };
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

  // Tek tıkla krallıktaki, cephanelikteki ve tüm askerlerin üzerindeki hasarlı teçhizatları onarır
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
    };;
  }

  repairAllEquipmentInKingdom() {
    const all = this.getAllArmoryEquipmentList();
    let totalIron = 0, totalWood = 0, totalFrag = 0, totalAda = 0, repairedCount = 0;

    all.forEach(entry => {
      const maxDur = entry.item.maxDurability || 13;
      const curDur = entry.item.durability != null ? entry.item.durability : maxDur;
      const missing = Math.max(0, maxDur - curDur);
      if (missing > 0) {
        const lvl = entry.item.level || 1;
        const ironCost = Math.max(2, Math.ceil(missing * 2 * lvl));
        const woodCost = Math.max(1, Math.ceil(missing * 1.5 * lvl));
        const fragCost = lvl >= 5 ? Math.ceil(missing * 0.5) : 0;
        const adaCost = Math.max(1, Math.ceil(missing * 1 * lvl));

        totalIron += ironCost;
        totalWood += woodCost;
        totalFrag += fragCost;
        totalAda += adaCost;
        repairedCount++;
      }
    });

    if (repairedCount === 0) {
      return { success: false, message: 'Tüm silah ve zırhlar zaten 13/13 maksimum dayanıklılıkta!' };
    }

    const inv = this.state.inventory;
    if ((inv.iron || 0) < totalIron) return { success: false, message: `Yetersiz Demir! (${totalIron} Demir gerekli)` };
    if ((inv.wood || 0) < totalWood) return { success: false, message: `Yetersiz Odun! (${totalWood} Odun gerekli)` };
    if ((inv.fragments || 0) < totalFrag) return { success: false, message: `Yetersiz Teçhizat Parçası! (${totalFrag} Teçhizat Parçaları gerekli)` };
    if ((this.state.adAstraBalance || 0) < totalAda) return { success: false, message: `Yetersiz $ADASTRA! (${totalAda} ADA gerekli)` };

    inv.iron -= totalIron;
    inv.wood -= totalWood;
    if (totalFrag > 0) inv.fragments -= totalFrag;
    this.state.adAstraBalance -= totalAda;
    globalPool.recordTokenSpend(totalAda);

    all.forEach(entry => {
      const maxDur = entry.item.maxDurability || 13;
      entry.item.durability = maxDur;
    });

    sound.playRepair();
    this.saveState();

    return {
      success: true,
      message: `🔨 Krallıktaki ${repairedCount} parça teçhizat tek seferde onarıldı! (-${totalIron} Demir, -${totalWood} Odun, -${totalAda} ADA)`
    };
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

    const xpGained = Math.floor(40 * lvl * (isMajorBoss ? 3.0 : 1));
    const adAstraGained = Math.floor(15 * lvl * (isMajorBoss ? 3.0 : 1));
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
      this.state.arenaKeys = (this.state.arenaKeys || 0) + 1;
    }

    sound.playLevelUp();
    this.saveState();

    return { xpGained, adAstraGained, fragmentsGained, boxGained, artifactDiscovered, isBoss: isMajorBoss };
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

    this.state.lockedBoxes -= 1;

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

  // 🍦 VANILLA HESAP SIFIRLAMA:
  // Oyun ekonomisini (DEX AMM havuzları, Hazine rezervleri, Küresel çıkarma limitleri) ASLA SIFIRLAMAZ!
  // Yalnızca oyuncunun kişisel hesabını (Lv.1, 0 XP, 100 Stamina, 250 ADA, 0 Asker, %100 Alet,
  // 1. Kat Zindan, 0 Aktif Sefer) başlangıç profiline döndürür.
  vanillaReset() {
    if (typeof localStorage !== 'undefined') {
      // SADECE oyuncu hesabının kaydını sil (Piyasa, AMM ve ekonomi ayarlarını koru)
      localStorage.removeItem(this.storageKey);
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
        infantry: 0,
        archer: 0,
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
      soldierUnits: []
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
  // 🏦 KRALLIK HAZİNESİ & ÖDÜL HAVUZLARI (TREASURY VAULT SUMMARY)
  // =========================================================================
  getTreasuryVaultSummary() {
    const state = this.state;
    const boss = this.getWorldBossInfo();
    const colosseum = state.colosseumStats || { wins: 0, losses: 0, totalAdaWon: 0 };
    
    // 1. Ödül Havuzları
    const worldBossPool = boss.weeklyAdaPool || 100000;
    const colosseumPool = 50000 + (colosseum.wins * 350);
    const parliamentStakingPool = 85000;
    const dungeonLootVault = 125000;
    const burnedNftPool = 42500 + ((state.genesisNftMinted ? 1 : 0) * 18000);
    const totalAmmLiquidityAda = 3200000;

    const totalVaultAda = worldBossPool + colosseumPool + parliamentStakingPool + dungeonLootVault + totalAmmLiquidityAda;

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

  claimAndRestartAllExpeditions() {
    const results = { claimed: 0, restarted: 0, totalHarvest: 0, messages: [] };
    const completed = Object.keys(this.state.activeExpeditions || {}).filter(
      nId => this.state.activeExpeditions[nId]?.isCompleted
    );
    for (const nodeId of completed) {
      const res = this.claimExpedition(nodeId);
      if (res.success) {
        results.claimed++;
        results.totalHarvest += res.amount || 0;
      } else if (res.isWarehouseFull) {
        results.messages.push(res.message);
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
              this.state.armoryInventory.splice(chosen.armoryIndex, 1);
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
  // PRE-BATTLE: SAVAŞ TAHMİNİ & SİLAH KORUMA
  // =========================================================================
  getBattlePrediction(enemyHp, enemyAtk, selectedSoldierIndices, protectWeapons = false) {
    const soldiers = this.state.soldierUnits || [];
    let totalAtk = 0;
    let totalHp = 0;

    for (const idx of selectedSoldierIndices) {
      const stats = this.getSoldierFullStats(idx);
      if (!stats) continue;
      const sol = soldiers[idx];
      if (!sol) continue;

      let solAtk = stats.totalAtk;
      if (protectWeapons && sol.equipment?.weapon) {
        solAtk -= (sol.equipment.weapon.atkBonus || 0);
      }
      totalAtk += solAtk;
      totalHp += Math.min(sol.hp || sol.maxHp || 100, stats.totalMaxHp);
    }

    const turnsToKillEnemy = enemyHp > 0 ? Math.ceil(enemyHp / Math.max(1, totalAtk)) : 1;
    const turnsEnemyKillsUs = totalHp > 0 ? Math.ceil(totalHp / Math.max(1, enemyAtk)) : 1;
    const winChance = Math.min(100, Math.max(5, Math.round((turnsEnemyKillsUs / (turnsToKillEnemy + 0.1)) * 50)));

    let difficulty = 'Kolay';
    if (winChance < 30) difficulty = 'İmkansız';
    else if (winChance < 50) difficulty = 'Zor';
    else if (winChance < 75) difficulty = 'Orta';

    return { totalAtk, totalHp, turnsToKillEnemy, winChance, difficulty, selectedCount: selectedSoldierIndices.length, protectWeapons };
  }

  // =========================================================================
  // BOT KAYNAK EKSİKLİĞİ KONTROLÜ (BİLDİRİM MERKEZİ İÇİN)
  // =========================================================================
  getBotResourceDeficitWarning() {
    if (!this.isAutoCollectorActive()) return null;
    const inv = this.state.inventory || {};
    const ada = this.state.adAstraBalance || 0;
    const missing = [];

    if ((inv.iron || 0) < 50) missing.push(`${50 - (inv.iron || 0)} ⛏️ Demir`);
    if ((inv.wood || 0) < 50) missing.push(`${50 - (inv.wood || 0)} 🌲 Odun`);
    if ((inv.wheat || 0) < 50) missing.push(`${50 - (inv.wheat || 0)} 🌾 Buğday`);
    if (ada < 50) missing.push(`${(50 - ada).toFixed(0)} 🟣 ADA`);

    if (missing.length > 0) {
      return {
        type: 'warning',
        icon: '⚠️',
        title: 'Otomasyon Botu Kaynak Uyarısı',
        text: `Botun kesintisiz çalışması ve aşınan aletleri otomatik onarabilmesi için deponuzda en az 50 Demir, 50 Odun, 50 Buğday ve 50 $ADASTRA bulundurmalısınız. (Eksikler: ${missing.join(', ')})`,
        missing
      };
    }
    return null;
  }

  // =========================================================================
  // KOLEZYUM 1v1 PVP & HAFTALIK LİDERLİK TABLOSU
  // =========================================================================
  getColosseumLeaderboard() {
    if (!this.state.colosseumLeaderboard) {
      this.state.colosseumLeaderboard = [
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

    // ═══════════════════════════════════════════════════════════════════
    // GİRİŞ BEDELİ — v2 (F-02)
    // ═══════════════════════════════════════════════════════════════════
    // v1'de arayüz "🔑 N Anahtar" rozetini gösteriyor ve whitepaper anahtarın
    // "dövüşlere girmek için kullanıldığını" söylüyordu; ancak bu fonksiyonun
    // hiçbir yerinde arenaKeys kontrol edilmiyor veya düşülmüyordu. Düello
    // tamamen ücretsizdi, şampiyon Math.max(1,...) ile asla ölmüyordu ve
    // galibiyet %25 ihtimalle YENİ anahtar veriyordu. Sink olması gereken
    // kalem faucet'e dönüşmüştü: sınırsız ücretsiz ADA.
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
    let playerCurrentHp = champion.hp || playerMaxHp;

    // Gerçekçi Rakip Şampiyon Havuzu
    const opponents = [
      { name: 'Gölge Gladyatörü Kael', atk: Math.floor(playerAtk * (0.85 + Math.random() * 0.3)), hp: Math.floor(playerMaxHp * (0.85 + Math.random() * 0.3)), icon: '🥷' },
      { name: 'Çöl Akrebi Malok', atk: Math.floor(playerAtk * (0.90 + Math.random() * 0.3)), hp: Math.floor(playerMaxHp * (0.90 + Math.random() * 0.3)), icon: '🦂' },
      { name: 'Kolezyum Şampiyonu Ragnar', atk: Math.floor(playerAtk * (0.95 + Math.random() * 0.35)), hp: Math.floor(playerMaxHp * (0.95 + Math.random() * 0.35)), icon: '🪓' }
    ];
    const opp = opponents[Math.floor(Math.random() * opponents.length)];
    let oppHp = opp.hp;

    const combatLog = [];
    let round = 0;
    while (playerCurrentHp > 0 && oppHp > 0 && round < 8) {
      round++;
      const pDmg = Math.floor(playerAtk * (0.9 + Math.random() * 0.3));
      oppHp = Math.max(0, oppHp - pDmg);
      combatLog.push(`⚔️ Tur ${round}: ${champion.name} hamle yaptı ve rakibe **-${pDmg} hasar** verdi!`);

      if (oppHp <= 0) break;

      const eDmg = Math.floor(opp.atk * (0.85 + Math.random() * 0.25));
      playerCurrentHp = Math.max(0, playerCurrentHp - eDmg);
      combatLog.push(`💥 Tur ${round}: ${opp.name} karşı saldırıyla **-${eDmg} hasar** vurdu!`);
    }

    const isVictory = playerCurrentHp > 0 && oppHp <= 0;
    champion.hp = Math.max(1, playerCurrentHp); // Hayatta kalır ama yaralanır
    const damageTaken = playerMaxHp - champion.hp;

    if (!this.state.colosseumStats) {
      this.state.colosseumStats = { wins: 0, losses: 0, score: 0, rank: 11 };
    }

    let rewardAda = 0;
    let rewardKeys = 0;

    // ELO puanı: rakip artık oyuncudan türetilse de derece gerçek biçimde işler.
    if (this.state.colosseumStats.rating == null) {
      this.state.colosseumStats.rating = GAME_CONFIG.COLOSSEUM.STARTING_RATING;
    }
    const expected = 1 / (1 + Math.pow(10, 0 / 400)); // eşit güçlü rakip = 0.5
    const ratingDelta = Math.round(GAME_CONFIG.COLOSSEUM.K_FACTOR * ((isVictory ? 1 : 0) - expected));
    this.state.colosseumStats.rating = Math.max(0, this.state.colosseumStats.rating + ratingDelta);

    if (isVictory) {
      this.state.colosseumStats.wins += 1;
      this.state.colosseumStats.score += 3;

      // YASA 1: ödül BASILMAZ, hazineden ÇEKİLİR.
      // v1'de `state.adAstraBalance += rewardAda` yazıyordu — bedeli olmayan
      // sınırsız emisyon. Artık arena havuzu boşalırsa ödül kendiliğinden küçülür.
      const request = 120 + Math.floor(Math.random() * 60);
      const draw = globalPool.withdrawReward('arena', request);
      rewardAda = Math.floor(draw.granted);
      this.state.adAstraBalance += rewardAda;
      if (Math.random() < 0.25) {
        rewardKeys = 1;
        this.state.arenaKeys = (this.state.arenaKeys || 0) + 1;
      }
      sound.playLevelUp();
    } else {
      this.state.colosseumStats.losses += 1;
      this.state.colosseumStats.score = Math.max(0, this.state.colosseumStats.score - 1);
    }

    this.saveState();

    return {
      success: true,
      isVictory,
      championName: champion.name,
      opponentName: opp.name,
      opponentIcon: opp.icon,
      damageTaken,
      currentHp: champion.hp,
      maxHp: champion.maxHp,
      rewardAda,
      rewardKeys,
      combatLog,
      colosseumStats: this.state.colosseumStats
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
        weeklyAdaPool: 100000,
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
  // Her 1 ATK = 1:1 rasyo, Her 1 HP = 1:0.25 rasyo
  calculateUserWorldBossPower() {
    const boss = this.getWorldBossInfo();
    const atk = boss.userStakedAtk || 0;
    const hp = boss.userStakedHp || 0;
    const calculatedDamage = Math.floor((atk * 1.0) + (hp * 0.25));
    const estimatedAda = Math.floor((calculatedDamage * boss.weeklyAdaPool) / boss.maxBossHp);
    return {
      atk,
      hp,
      atkContribution: Math.floor(atk * 1.0),
      hpContribution: Math.floor(hp * 0.25),
      calculatedDamage,
      estimatedAda
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

    // Gerekli XP Formülü: Level * 100
    while (s.xp >= (s.level * 100)) {
      s.xp -= (s.level * 100);
      s.level += 1;
      s.baseAtk = (s.baseAtk || 20) + 5;
      s.maxHp = (s.maxHp || 100) + 15;
      s.hp = s.maxHp;
      leveledUp = true;
      newLevel = s.level;
    }

    this.saveState();
    return { leveledUp, newLevel, soldierName: s.name };
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

