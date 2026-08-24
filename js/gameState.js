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
        } catch (e) {
          console.error('Save state error:', e);
        }
      }
    }
    return {
      ...GAME_CONFIG.STARTING_PROFILE,
      ...parsed,
      inventory: { ...GAME_CONFIG.STARTING_PROFILE.inventory, ...(parsed.inventory || {}) },
      tools: { ...GAME_CONFIG.STARTING_PROFILE.tools, ...(parsed.tools || {}) },
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

  // Tek Tip Asker Birimi Oluşturur (İkon: ⚔️, İsim: Asker #N)
  createSoldierUnit(index) {
    return {
      id: `soldier_${Date.now()}_${index}`,
      name: `Asker #${index}`,
      class: 'warrior',
      icon: '⚔️',
      level: 1,
      xp: 0,
      hp: 100,
      maxHp: 100,
      baseAtk: 20,
      equipment: {
        weapon: null,
        helmet: null,
        armor: null,
        legs: null,
        boots: null
      }
    };
  }

  mergeSoldierUnits(saved) {
    if (!Array.isArray(saved)) return [];
    return saved.map((s, i) => ({
      id: s.id || `soldier_${i + 1}`,
      name: `Asker #${i + 1}`,
      class: 'warrior',
      icon: '⚔️',
      level: s.level || 1,
      xp: s.xp || 0,
      hp: s.hp != null ? s.hp : (s.maxHp || 100),
      maxHp: s.maxHp || 100,
      baseAtk: s.baseAtk || 20,
      equipment: {
        weapon: null,
        helmet: null,
        armor: null,
        legs: null,
        boots: null,
        ...(s.equipment || {})
      }
    }));
  }

  buySoldierUnit() {
    if (!Array.isArray(this.state.soldierUnits)) {
      this.state.soldierUnits = [];
    }
    const maxSoldiers = GAME_CONFIG.MAX_SOLDIERS || 18;
    if (this.state.soldierUnits.length >= maxSoldiers) {
      return { success: false, message: `Maksimum ${maxSoldiers} askere zaten sahipsin!` };
    }
    const cost = GAME_CONFIG.SOLDIER_PRICE || 18000;
    if ((this.state.adAstraBalance || 0) < cost) {
      return { success: false, message: `Yetersiz $ADASTRA! Asker satın almak için ${cost.toLocaleString()} ADA gerekir.` };
    }
    this.state.adAstraBalance -= cost;
    const newIdx = this.state.soldierUnits.length + 1;
    const newUnit = this.createSoldierUnit(newIdx);
    this.state.soldierUnits.push(newUnit);
    this.saveState();
    sound.playLevelUp();
    return { success: true, message: `⚔️ Asker #${newIdx} orduya katıldı!`, soldier: newUnit };
  }

  getSoldierSetBonus(soldierIndex) {
    const soldier = (this.state.soldierUnits || [])[soldierIndex];
    if (!soldier || !soldier.equipment) return null;
    const count = ['weapon', 'helmet', 'armor', 'legs', 'boots'].filter(slot => {
      const item = soldier.equipment[slot];
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
      const item = eq[slot];
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
        this.state.inventory.wheat = Math.max(0, availableWheat - wheatCost);
        soldier.hp = Math.min(maxHp, currentHp + hpGain);
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
    if (!this.state.equipment) this.state.equipment = {};
    if (this.state.equipment[slotKey]) {
      return { success: false, message: 'Karakter envanterindeki bu yuva dolu! Önce oradaki eşyayı yönetmelisin.' };
    }

    this.state.equipment[slotKey] = item;
    soldier.equipment[slotKey] = null;

    sound.playRepair();
    this.saveState();
    return { success: true, message: `🛡️ ${item.name} kuşanmadan çıkarıldı ve genel envantere aktarıldı!` };
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

  // Seviye atlandıkça Max Stamina Artar (Lv.1: 100, Lv.2: 120, Lv.3: 140...)
  getMaxStamina(level = this.state.level) {
    return 100 + (level - 1) * 20;
  }

  // Sefer Süresi Arttıkça Harcanan Stamina da Artar (Lv.1: 25, Lv.2: 37, Lv.3: 49...)
  getExpeditionStaminaCost(level = this.state.level) {
    return Math.round(25 + (level - 1) * 12);
  }

  getFragmentDropRate(level = this.state.level) {
    const clampedLevel = Math.max(1, Math.min(81, level));
    return GAME_CONFIG.FRAGMENT_DROP_MIN + (clampedLevel - 1) * (0.162 / 80);
  }

  getBoxDropRate(level = this.state.level) {
    const clampedLevel = Math.max(1, Math.min(81, level));
    return GAME_CONFIG.BOX_DROP_MIN + (clampedLevel - 1) * (0.001782 / 80);
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

  // 1. Depodan Buğday Harcayarak Stamina Doldurma
  refillStaminaWithWheat(wheatAmount = 20) {
    const inv = this.state.inventory;
    const maxStam = this.getMaxStamina();
    if ((inv.wheat || 0) < wheatAmount) {
      return { success: false, message: `Yetersiz Buğday! (${wheatAmount} Buğday gerekli)` };
    }
    if (this.state.stamina >= maxStam) {
      return { success: false, message: 'Stamina zaten tamamen dolu!' };
    }

    inv.wheat -= wheatAmount;
    const gainedStamina = wheatAmount * 1.25; // 20 Buğday = +25 Stamina
    this.state.stamina = Math.min(maxStam, this.state.stamina + gainedStamina);
    sound.playStaminaRefill();
    this.saveState();
    return {
      success: true,
      message: `🍞 ${wheatAmount} Buğday fırınlandı! +${Math.round(gainedStamina)} Stamina yenilendi (${Math.floor(this.state.stamina)}/${maxStam})`
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
    if (this.state.stamina < staminaCost) {
      return { success: false, message: `Yetersiz Stamina! (${staminaCost} Stamina gerekli)` };
    }

    const toolId = nodeConfig.requiredTool;
    const tool = this.state.tools[toolId];
    if (!tool || tool.durability <= 0) {
      sound.playBreakWarning();
      return { success: false, message: `Gereken alet (${GAME_CONFIG.TOOLS[toolId].name}) kırık! Önce tamir etmelisin.` };
    }

    // Seviye Bazlı Süre (Lv 1: 1080 sn / 18 dk, Lv 81: 259200 sn / 72 saat)
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
                const resKey = toolId === 'pickaxe' ? 'iron' : toolId === 'axe' ? 'wood' : 'wheat';

                if ((inv[resKey] || 0) >= repCost.resourceCost && this.state.adAstraBalance >= repCost.adAstraCost) {
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

  getAccruedExpeditionHarvest(nodeId) {
    const exp = this.state.activeExpeditions[nodeId];
    if (!exp) return { accruedAmount: 0, totalYield: 0, pct: 0, remainingSeconds: 0, elapsedSeconds: 0, durationSeconds: 0, isCompleted: false };

    const basePm = (GAME_CONFIG.BASE_PRODUCTION && GAME_CONFIG.BASE_PRODUCTION[nodeId]) || 15;
    const G = (GAME_CONFIG.GROWTH_FACTORS && GAME_CONFIG.GROWTH_FACTORS[nodeId]) || 1.08;
    const factor = Math.pow(G, this.state.level - 1) * (1 + 0.015 * (this.state.level - 1));
    const ratePm = Math.floor(basePm * factor);

    const isSpeedActive = this.isBuffActive(`speed_${nodeId}`);
    const speedMult = isSpeedActive ? 1.5 : 1;
    const totalYield = Math.max(10, Math.floor(ratePm * 60 * exp.durationHours * speedMult));

    const progressRatio = Math.min(1, exp.elapsedSeconds / exp.durationSeconds);
    const claimedRatio = Math.min(1, (exp.claimedSeconds || 0) / exp.durationSeconds);
    const unclimedProgress = Math.max(0, progressRatio - claimedRatio);
    const accruedAmount = Math.floor(totalYield * unclimedProgress);
    const pct = Math.min(100, Math.floor(progressRatio * 100));
    const remainingSeconds = Math.max(0, Math.ceil(exp.durationSeconds - exp.elapsedSeconds));

    return {
      accruedAmount,
      totalYield,
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
    const harvestedAmount = globalPool.harvest(nodeId, accruedInfo.accruedAmount);

    this.state.inventory[nodeId] = (this.state.inventory[nodeId] || 0) + harvestedAmount;
    if (playerTool) {
      playerTool.totalGathered = (playerTool.totalGathered || 0) + harvestedAmount;
    }

    const xpGained = Math.max(5, Math.floor(harvestedAmount * 0.5));
    const levelResult = this.addXp(xpGained);

    exp.claimedSeconds = exp.elapsedSeconds;
    sound.playHarvest();
    this.saveState();

    return {
      success: true,
      amount: harvestedAmount,
      xpGained,
      levelResult,
      message: `⚡ ${harvestedAmount} ${nodeConfig.name} erken toplandı! (+${xpGained} XP)`
    };
  }

  claimExpedition(nodeId) {
    const exp = this.state.activeExpeditions[nodeId];
    if (!exp || !exp.isCompleted) {
      return { success: false, message: 'Henüz toplanacak bir sefer tamamlanmadı.' };
    }

    const nodeConfig = GAME_CONFIG.GLOBAL_RESOURCE_CAPS[nodeId];
    const toolConfig = GAME_CONFIG.TOOLS[nodeConfig.requiredTool];
    const playerTool = this.state.tools[nodeConfig.requiredTool];

    // Matematiksel Sefer Verimi (Base_pm * Factor * Duration * Multiplier)
    const basePm = (GAME_CONFIG.BASE_PRODUCTION && GAME_CONFIG.BASE_PRODUCTION[nodeId]) || 15;
    const G = (GAME_CONFIG.GROWTH_FACTORS && GAME_CONFIG.GROWTH_FACTORS[nodeId]) || 1.08;
    const factor = Math.pow(G, this.state.level - 1) * (1 + 0.015 * (this.state.level - 1));
    const ratePm = Math.floor(basePm * factor);

    const isSpeedActive = this.isBuffActive(`speed_${nodeId}`);
    const speedMult = isSpeedActive ? 1.5 : 1;
    const totalYield = Math.floor(ratePm * 60 * exp.durationHours * speedMult);
    
    // Erken toplanan miktarı düş
    const claimedRatio = Math.min(1, (exp.claimedSeconds || 0) / exp.durationSeconds);
    const alreadyClaimed = Math.floor(totalYield * claimedRatio);
    const remainingToClaim = Math.max(5, totalYield - alreadyClaimed);

    const harvestedAmount = globalPool.harvest(nodeId, remainingToClaim);

    this.state.inventory[nodeId] = (this.state.inventory[nodeId] || 0) + harvestedAmount;
    
    playerTool.durability = Math.max(0, playerTool.durability - toolConfig.durabilityLossPerExpedition);
    playerTool.totalGathered = (playerTool.totalGathered || 0) + harvestedAmount;

    // Sefer Başına XP Kazanımı
    const xpGained = Math.floor(35 * exp.durationHours);
    this.addXp(xpGained);

    delete this.state.activeExpeditions[nodeId];

    if (playerTool.durability === 0) sound.playBreakWarning();
    else sound.playHarvest();

    this.saveState();

    return {
      success: true,
      amount: harvestedAmount,
      resourceName: nodeConfig.name,
      icon: nodeConfig.icon,
      durabilityLeft: playerTool.durability,
      toolName: toolConfig.name,
      xpGained,
      isBroken: playerTool.durability === 0
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
  getNextLevelRequirement() {
    const nextLvl = this.state.level + 1;
    const xp = Math.floor(100 * Math.pow(nextLvl, 2.4) * Math.pow(1.045, nextLvl - 1));
    return {
      level: nextLvl,
      xp: xp,
      wood: Math.floor(xp * 0.35),
      iron: Math.floor(xp * 0.45),
      wheat: Math.floor(xp * 0.40),
      adAstra: Math.floor(1500 * Math.pow(nextLvl, 2.10) * Math.pow(1.015, nextLvl - 1)),
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
  // 5. ALET TAMİRATI (Odun + Demir + AdAstra)
  // =========================================================================
  calculateRepairCost(toolId) {
    const toolConfig = GAME_CONFIG.TOOLS[toolId];
    const playerTool = this.state.tools[toolId];
    if (!toolConfig || !playerTool) return null;

    const missingDurability = 100 - playerTool.durability;
    if (missingDurability <= 0) return { missingDurability: 0, woodCost: 0, ironCost: 0, resourceCost: 0, adAstraCost: 0, toolName: toolConfig.name };

    const ratio = missingDurability / 100;
    const full = toolConfig.fullRepairCost || { wood: 20, iron: 15, adAstra: 10 };
    const woodCost = Math.max(1, Math.ceil(full.wood * ratio));
    const ironCost = Math.max(1, Math.ceil(full.iron * ratio));
    const adAstraCost = Math.max(1, Math.ceil(full.adAstra * ratio));
    const resourceCost = toolId === 'axe' ? woodCost : (toolId === 'pickaxe' ? ironCost : Math.max(1, Math.ceil(20 * ratio)));

    return {
      toolName: toolConfig.name,
      woodCost,
      ironCost,
      resourceCost,
      adAstraCost,
      missingDurability
    };
  }

  repairTool(toolId) {
    const cost = this.calculateRepairCost(toolId);
    if (!cost) return { success: false, message: 'Geçersiz alet!' };
    if (cost.missingDurability === 0) return { success: false, message: 'Alet zaten %100 sağlam!' };

    const inv = this.state.inventory;
    if ((inv.wood || 0) < cost.woodCost) {
      return { success: false, message: `Yetersiz Odun! (${cost.woodCost} Odun gerekli)` };
    }
    if ((inv.iron || 0) < cost.ironCost) {
      return { success: false, message: `Yetersiz Demir! (${cost.ironCost} Demir gerekli)` };
    }
    if (this.state.adAstraBalance < cost.adAstraCost) {
      return { success: false, message: `Yetersiz AdAstra! (${cost.adAstraCost} $ADASTRA gerekli)` };
    }

    inv.wood -= cost.woodCost;
    inv.iron -= cost.ironCost;
    this.state.adAstraBalance -= cost.adAstraCost;
    globalPool.recordTokenSpend(cost.adAstraCost);
    this.state.tools[toolId].durability = 100;

    sound.playRepair();
    this.saveState();

    return { success: true, message: `🔨 ${cost.toolName} tamamen onarıldı!` };
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
  getWarehouseCapacity(level = this.state.warehouseLevel) {
    const lvl = Math.max(1, level);
    const cap = Math.floor(5000 * Math.pow(lvl, 2.15) * Math.pow(1.04, lvl - 1));
    return {
      wood: cap,
      iron: Math.floor(cap * 0.75),
      wheat: Math.floor(cap * 1.1),
      fragments: Math.floor(cap * 0.1)
    };
  }

  getWarehouseUpgradeCost(currentLevel = this.state.warehouseLevel) {
    if (currentLevel >= GAME_CONFIG.WAREHOUSE.baseLevels) return null;
    const currentCap = this.getWarehouseCapacity(currentLevel);
    const wood = Math.floor(currentCap.wood * 0.49);
    const iron = Math.floor(currentCap.iron * 0.49);
    const wheat = Math.floor(currentCap.wheat * 0.49);

    const pWood = ammMarket ? ammMarket.getPrice('wood') : 0.00916;
    const pIron = ammMarket ? ammMarket.getPrice('iron') : 0.0183;
    const pWheat = ammMarket ? ammMarket.getPrice('wheat') : 0.00458;
    const adAstra = Math.max(10, Math.round(wood * pWood + iron * pIron + wheat * pWheat));

    return {
      wood,
      iron,
      wheat,
      adAstra
    };
  }

  upgradeWarehouse() {
    const cost = this.getWarehouseUpgradeCost();
    if (!cost) {
      return { success: false, message: 'Deponuz zaten maksimum seviyede!' };
    }

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
    if (this.state.adAstraBalance < cost.adAstra) {
      return { success: false, message: `Yetersiz AdAstra! (${cost.adAstra} $ADASTRA gerekli)` };
    }

    inv.wood -= cost.wood;
    inv.iron -= cost.iron;
    inv.wheat -= cost.wheat;
    this.state.adAstraBalance -= cost.adAstra;
    globalPool.recordTokenSpend(cost.adAstra);

    this.state.warehouseLevel += 1;
    sound.playLevelUp();
    this.saveState();

    return {
      success: true,
      message: `🏰 Deponuz Seviye ${this.state.warehouseLevel}'e yükseltildi! Kapasiteler artırıldı.`
    };
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

  // 1. Ekipman İlk Kez Dövme (Craft)
  craftEquipment(slotKey) {
    const recipe = GAME_CONFIG.EQUIPMENT_RECIPES[slotKey];
    if (!recipe) return { success: false, message: 'Geçersiz ekipman parçası!' };

    if (!this.state.equipment) {
      this.state.equipment = { weapon: null, helmet: null, armor: null, legs: null, boots: null };
    }
    if (this.state.equipment[slotKey]) {
      return { success: false, message: `Bu yuvada zaten ${this.state.equipment[slotKey].name} kuşanılmış durumda!` };
    }

    const inv = this.state.inventory;
    const cost = recipe.cost;
    if ((inv.fragments || 0) < cost.fragments) {
      return { success: false, message: `Yetersiz Parça! (${cost.fragments} Parça gerekli)` };
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

    inv.fragments -= cost.fragments;
    inv.iron -= cost.iron;
    inv.wood -= cost.wood;
    this.state.adAstraBalance -= cost.adAstra;
    globalPool.recordTokenSpend(cost.adAstra);

    const item = {
      id: `${recipe.id}_${Date.now()}`,
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

    this.state.equipment[slotKey] = item;
    sound.playRepair();
    this.saveState();

    return { success: true, message: `${recipe.icon} ${recipe.name} başarıyla dövüldü ve kuşandırıldı! (13/13 Dayanıklılık)`, item };
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
      return { success: false, message: `Yetersiz Parça! (${cost.fragmentCost} Parça gerekli)` };
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
  // 8. SOLDIER SYSTEM - EQUIPMENT REPAIR (18 Kişilik soldierUnits Ordusu)
  // =========================================================================
  repairEquipmentItem(soldierIndex, slot) {
    const soldier = (this.state.soldierUnits || [])[soldierIndex];
    if (!soldier) return { success: false, message: 'Asker bulunamadı!' };

    const item = soldier.equipment ? soldier.equipment[slot] : null;
    if (!item) return { success: false, message: 'Bu yuvada kuşanılmış bir ekipman bulunamadı!' };

    const maxDur = item.maxDurability || 13;
    if ((item.repairsLeft !== undefined ? item.repairsLeft : GAME_CONFIG.MAX_EQUIPMENT_REPAIRS) <= 0) {
      return { success: false, message: `⚠️ ${item.name} tamir hakkı tükendi! Kırılacak!` };
    }

    const missingDurability = maxDur - (item.durability || 0);
    if (missingDurability <= 0) {
      return { success: false, message: `${item.name} zaten tamamen sağlam!` };
    }

    const ironCost = Math.ceil(missingDurability);
    const woodCost = Math.ceil(missingDurability * 0.5);

    const inv = this.state.inventory;
    if ((inv.iron || 0) < ironCost) {
      return { success: false, message: `Yetersiz Demir! (${ironCost} Demir gerekli)` };
    }
    if ((inv.wood || 0) < woodCost) {
      return { success: false, message: `Yetersiz Odun! (${woodCost} Odun gerekli)` };
    }

    inv.iron -= ironCost;
    inv.wood -= woodCost;
    item.durability = maxDur;
    item.repairsLeft = (item.repairsLeft !== undefined ? item.repairsLeft : GAME_CONFIG.MAX_EQUIPMENT_REPAIRS) - 1;

    sound.playRepair();
    this.saveState();

    return {
      success: true,
      message: `🔨 ${item.name} onarıldı! (Kalan tamir hakkı: ${item.repairsLeft}/${GAME_CONFIG.MAX_EQUIPMENT_REPAIRS})`,
      repairsLeft: item.repairsLeft
    };
  }

  // =========================================================================
  // 6. GAMEFI & RPG EKONOMİSİ (PHASE 1)
  // =========================================================================

  // Zindan Canavarı Yenildiğinde XP, AdAstra ve Şansa Bağlı Ganimet Dağıtır
  addDungeonXpAndDrops(level, isBoss = false) {
    const lvl = Math.max(1, Math.min(18, level));
    const bossMultiplier = isBoss ? GAME_CONFIG.BOSS_DROP_MULTIPLIER : 1;

    const xpGained = Math.floor(40 * lvl * (isBoss ? 2.2 : 1));
    const adAstraGained = Math.floor(15 * lvl * (isBoss ? 2.2 : 1));
    this.state.currentXp += xpGained;
    this.state.adAstraBalance += adAstraGained;

    let fragmentsGained = 0;
    const fragmentChance = Math.min(0.95, this.getFragmentDropRate(level) * bossMultiplier);
    if (Math.random() < fragmentChance) {
      fragmentsGained = isBoss ? (2 + Math.floor(Math.random() * 3)) : (1 + Math.floor(Math.random() * 2));
      this.state.inventory.fragments = (this.state.inventory.fragments || 0) + fragmentsGained;
    }

    let boxGained = 0;
    const boxChance = Math.min(0.5, this.getBoxDropRate(level) * bossMultiplier);
    if (Math.random() < boxChance) {
      boxGained = 1;
      this.state.lockedBoxes = (this.state.lockedBoxes || 0) + 1;
    }

    let artifactDiscovered = null;
    if (isBoss) {
      const artifactChance = Math.min(1, GAME_CONFIG.ARTIFACT_BASE_RATE * lvl * GAME_CONFIG.BOSS_DROP_MULTIPLIER);
      if (Math.random() < artifactChance) {
        artifactDiscovered = this.discoverArtifact(lvl);
      }
      this.state.arenaKeys = (this.state.arenaKeys || 0) + 1;
    }

    sound.playLevelUp();
    this.saveState();

    return { xpGained, adAstraGained, fragmentsGained, boxGained, artifactDiscovered, isBoss };
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
      return { success: false, message: 'Açılacak Kilitli Sandığın yok!' };
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
        ? `📦 Sandıktan [${rarityBadge}] ${chosenConfig.icon} ${chosenConfig.name} çıktı! (Koleksiyonunda ${userArt.count} adet oldu)`
        : `🎉 TEBRİKLER! Sandıktan YENİ [${rarityBadge}] ${chosenConfig.icon} ${chosenConfig.name} keşfettin!`
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
        this.state.tools[t].durability = 100;
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

  // 🍦 VANILLA HESAP SIFIRLAMA: localStorage'ı tamamen temizler ve karakteri
  // sıfırdan (Lv.1, 0 XP, 100 Stamina, 250 ADA, 0 Asker, 0 Teçhizat, %100 Alet,
  // 1. Kat Zindan, 0 Aktif Sefer, 0 Görev İlerlemesi) vanilla başlangıç profiline döndürür.
  vanillaReset() {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
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
        axe: { durability: 100, totalGathered: 0 },
        pickaxe: { durability: 100, totalGathered: 0 },
        sickle: { durability: 100, totalGathered: 0 }
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

    // Alet Sağlığı
    const toolSummary = Object.keys(tools).map(toolId => {
      const t = tools[toolId];
      const cfg = GAME_CONFIG.TOOLS[toolId];
      return { id: toolId, name: cfg?.name || toolId, durability: t.durability, icon: cfg?.icon || '🔧' };
    });
    const avgToolHealth = toolSummary.length > 0 ? Math.round(toolSummary.reduce((s, t) => s + t.durability, 0) / toolSummary.length) : 100;

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
      woodPct: Math.min(100, Math.round(((inv.wood || 0) / (whCap.wood || 500)) * 100)),
      ironPct: Math.min(100, Math.round(((inv.iron || 0) / (whCap.iron || 400)) * 100)),
      wheatPct: Math.min(100, Math.round(((inv.wheat || 0) / (whCap.wheat || 800)) * 100)),
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
      }
    }
    // Yeniden başlatma dene
    for (const nodeId of ['wood', 'iron', 'wheat']) {
      if (!this.state.activeExpeditions[nodeId]) {
        const res = this.startExpedition(nodeId);
        if (res.success) results.restarted++;
      }
    }
    return results;
  }

  repairAllTools() {
    const results = { repaired: 0, totalWood: 0, totalIron: 0, totalAda: 0, messages: [] };
    for (const toolId of Object.keys(this.state.tools || {})) {
      const cost = this.calculateRepairCost(toolId);
      if (cost && cost.missingDurability > 0) {
        const res = this.repairTool(toolId);
        if (res.success) {
          results.repaired++;
          results.totalWood += cost.woodCost;
          results.totalIron += cost.ironCost;
          results.totalAda += cost.adAstraCost;
        } else {
          results.messages.push(res.message);
        }
      }
    }
    return results;
  }

  getAllRepairCost() {
    let totalWood = 0, totalIron = 0, totalAda = 0, count = 0;
    for (const toolId of Object.keys(this.state.tools || {})) {
      const cost = this.calculateRepairCost(toolId);
      if (cost && cost.missingDurability > 0) {
        totalWood += cost.woodCost;
        totalIron += cost.ironCost;
        totalAda += cost.adAstraCost;
        count++;
      }
    }
    return { totalWood, totalIron, totalAda, count };
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
    const equipped = 0;
    const slots = ['weapon', 'helmet', 'armor', 'legs', 'boots'];
    let totalEquipped = 0;

    for (let i = 0; i < soldiers.length; i++) {
      for (const slot of slots) {
        if (!soldiers[i].equipment) soldiers[i].equipment = {};
        if (!soldiers[i].equipment[slot]) {
          const playerEquip = this.state.equipment ? this.state.equipment[slot] : null;
          if (playerEquip) {
            soldiers[i].equipment[slot] = { ...playerEquip };
            delete this.state.equipment[slot];
            totalEquipped++;
          }
        }
      }
    }
    if (totalEquipped > 0) {
      sound.playRepair();
      this.saveState();
    }
    return { success: totalEquipped > 0, equipped: totalEquipped, message: totalEquipped > 0 ? `⚔️ ${totalEquipped} eşya otomatik olarak en iyi askerlere dağıtıldı!` : 'Dağıtılacak boş eşya veya yuva yok.' };
  }

  unequipAllSoldiers() {
    const soldiers = this.state.soldierUnits || [];
    const slots = ['weapon', 'helmet', 'armor', 'legs', 'boots'];
    let totalUnequipped = 0;

    if (!this.state.equipment) this.state.equipment = {};
    for (let i = 0; i < soldiers.length; i++) {
      for (const slot of slots) {
        if (soldiers[i].equipment && soldiers[i].equipment[slot]) {
          if (!this.state.equipment[slot]) {
            this.state.equipment[slot] = soldiers[i].equipment[slot];
            soldiers[i].equipment[slot] = null;
            totalUnequipped++;
          }
        }
      }
    }
    if (totalUnequipped > 0) {
      sound.playRepair();
      this.saveState();
    }
    return { success: totalUnequipped > 0, unequipped: totalUnequipped, message: totalUnequipped > 0 ? `🔄 ${totalUnequipped} eşya askerlerden sökülüp envantere aktarıldı!` : 'Sökülecek eşya yok.' };
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

  executeColosseum1v1Match(championIndex = 0) {
    const soldiers = this.state.soldierUnits || [];
    const champion = soldiers[championIndex];
    if (!champion) {
      return { success: false, message: 'Kolezyum arenasına çıkacak geçerli bir şampiyon askerin yok!' };
    }

    if ((champion.hp || 0) <= 15) {
      return { success: false, message: `⚠️ ${champion.name} ağır yaralı (Can: ${champion.hp}/${champion.maxHp}). Kolezyuma çıkmadan önce buğdayla iyileştirilmelidir!` };
    }

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

    if (isVictory) {
      this.state.colosseumStats.wins += 1;
      this.state.colosseumStats.score += 3;
      rewardAda = 120 + Math.floor(Math.random() * 60);
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
  // SAVAŞ ALANI: HAFTALIK WORLD BOSS ORDU STAKE ETKİNLİĞİ
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
        userStakedSoldiersCount: 0
      };
    } else {
      // Kullanıcı ordusunu henüz kilitlemediyse varsayılan değerler 0 olmalıdır
      if (!this.state.worldBoss.userStaked) {
        this.state.worldBoss.stakedArmyCount = 0;
        this.state.worldBoss.totalStakedAtk = 0;
        this.state.worldBoss.totalStakedHp = 0;
      }
    }
    return this.state.worldBoss;
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

    sound.playLevelUp();
    this.saveState();

    return {
      success: true,
      message: `🛡️ ${soldiers.length} kişilik ordun (${userAtk} ATK / ${userHp} HP) Pazar günkü World Boss savaşı için başarıyla kilitlendi!`,
      boss
    };
  }

  attackWorldBoss() {
    const boss = this.getWorldBossInfo();
    if (!boss.userStaked) {
      return { success: false, message: 'Savaşa katılmak için önce ordunuzu kilitlemelisiniz!' };
    }

    // Kullanıcının ordusunun verdiği toplam hasar
    const userAtk = boss.userStakedAtk || 500;
    const damageDealt = Math.floor(userAtk * (1.8 + Math.random() * 0.4));
    boss.userDamage = (boss.userDamage || 0) + damageDealt;
    boss.bossHp = Math.max(0, boss.bossHp - damageDealt);

    // Hasar Başına Tekil ADA Dağıtım Hesaplaması: (damageDealt / maxBossHp) * weeklyAdaPool
    const rewardAda = Math.max(1, Math.floor((damageDealt / boss.maxBossHp) * boss.weeklyAdaPool));
    this.state.adAstraBalance += rewardAda;

    sound.playPickaxe();
    this.saveState();

    return {
      success: true,
      damageDealt,
      totalUserDamage: boss.userDamage,
      remainingBossHp: boss.bossHp,
      rewardAda,
      message: `💥 Ordun World Boss'a ${damageDealt.toLocaleString()} HASAR vurdu ve payına ${rewardAda.toLocaleString()} $ADASTRA düştü!`
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

