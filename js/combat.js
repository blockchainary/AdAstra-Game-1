// AdAstra: Genesis Realm v2 — Taktik Savaş Motoru
// ============================================================================
// v1'de savaş tek bir toplama işlemiydi: iki HP yığını ±%15 varyansla birbirine
// vuruyordu. Sınıf, ölüm, inisiyatif, mevzi, zırh, element ve karar yoktu;
// "tüm askerleri gönder" her koşulda baskın stratejiydi.
//
// v2 çekirdeği BİRİM DÜZEYİNDE ve SIRA TABANLIDIR. Aynı motor üç arenayı da
// besler; farklılığı kısıtlar yaratır:
//   • Zindan    → 3 odalık koşu, odalar arası iyileşme yok, öfke sayacı
//   • Kolezyum  → 1v1, yasaklama aşaması, ELO eşleşmesi
//   • World Boss→ faz mekanikleri, rol katkısı, paylaşılan HP
//
// Motor saf fonksiyoneldir: DOM bilmez, state yazmaz. Girdi alır, tur tur
// olay kaydı üretir. Bu sayede hem sunucuda hem istemcide aynı sonucu verir
// ve Monte Carlo ile savaş öncesi tahmin yapılabilir.
// ============================================================================

import { GAME_CONFIG } from './config.js';

// ─────────────────────────────────────────────────────────────────────────
// Deterministik RNG (mulberry32) — aynı tohum, aynı savaş.
// Sunucu otoritesine geçildiğinde tohum sunucudan gelir, istemci doğrular.
// ─────────────────────────────────────────────────────────────────────────
export function makeRng(seed) {
  let a = (seed >>> 0) || 1;
  return function rng() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Element sistemi devre dışı — askerler nötr. Her zaman 1.0 döndürür.
export function elementMultiplier(attacker, defender) {
  return 1;
}

// Zırh azaltması: azalan verimli, asla %100 olmaz
function mitigation(armor, penetration) {
  const eff = Math.max(0, (armor || 0) - (penetration || 0));
  const K = GAME_CONFIG.COMBAT.ARMOR_CONSTANT;
  return 1 - eff / (eff + K);
}

// ─────────────────────────────────────────────────────────────────────────
// Birim oluşturma
// ─────────────────────────────────────────────────────────────────────────
export function createUnit(spec) {
  const cls = GAME_CONFIG.COMBAT_CLASSES[spec.cls] || GAME_CONFIG.COMBAT_CLASSES.guardian;
  const maxHp = Math.max(1, Math.round(spec.maxHp != null ? spec.maxHp : 100));
  return {
    uid: spec.uid || `u_${Math.random().toString(36).slice(2, 9)}`,
    sourceIndex: spec.sourceIndex != null ? spec.sourceIndex : -1,
    name: spec.name || cls.name,
    icon: spec.icon || cls.icon,
    cls: spec.cls || 'guardian',
    clsName: cls.name,
    level: spec.level || 1,
    side: spec.side || 'ally',

    maxHp,
    hp: Math.max(0, Math.round(spec.hp != null ? spec.hp : maxHp)),
    atk: Math.max(1, Math.round(spec.atk != null ? spec.atk : 20)),
    armor: Math.max(0, Math.round(spec.armor != null ? spec.armor : cls.baseArmor)),
    speed: Math.max(1, Math.round(spec.speed != null ? spec.speed : cls.baseSpeed)),
    crit: spec.crit != null ? spec.crit : cls.baseCrit,
    critDmg: spec.critDmg != null ? spec.critDmg : GAME_CONFIG.COMBAT.BASE_CRIT_DAMAGE,
    pen: Math.max(0, spec.pen != null ? spec.pen : cls.basePen),
    lifesteal: spec.lifesteal || 0,

    element: null,
    row: spec.row || cls.preferredRow,

    // Tur başına aksiyon sayısı. Tek bir boss 18 askere karşı bir aksiyonla
    // savaşamaz — 18 vuruş alıp 1 vuruş yapar. Boss'lar bu yüzden tur içinde
    // birden fazla hamle yapar; ordu büyüdükçe boss da daha çok hamle kazanır.
    actionsPerRound: Math.max(1, spec.actionsPerRound || 1),
    abilities: spec.abilities || null,
    abilityCooldown: spec.abilityCooldown || 3,

    statuses: [],
    cooldown: 0,
    revivedOnce: false,
    // Savaş sonu raporu için
    damageDealt: 0,
    damageTaken: 0,
    healingDone: 0,
    kills: 0
  };
}

const isAlive = u => u.hp > 0;

function statusValue(unit, type) {
  return unit.statuses
    .filter(s => s.type === type)
    .reduce((sum, s) => sum + (s.magnitude || 0), 0);
}
const hasStatus = (unit, type) => unit.statuses.some(s => s.type === type);

function addStatus(unit, status) {
  const existing = unit.statuses.find(s => s.type === status.type && s.stackable === false);
  if (existing) {
    existing.turns = Math.max(existing.turns, status.turns);
    existing.magnitude = Math.max(existing.magnitude || 0, status.magnitude || 0);
    return;
  }
  unit.statuses.push({ stackable: true, ...status });
}

// Etkin statlar (statü etkileri uygulanmış)
function effectiveAtk(unit) {
  return unit.atk * (1 + statusValue(unit, 'rage')) * (hasStatus(unit, 'weaken') ? 0.7 : 1);
}
function effectiveArmor(unit) {
  return unit.armor * (1 + statusValue(unit, 'fortify')) * (hasStatus(unit, 'sunder') ? 0.6 : 1);
}
function effectiveSpeed(unit) {
  return unit.speed * (1 + statusValue(unit, 'haste')) * (hasStatus(unit, 'chill') ? 0.65 : 1);
}

// ─────────────────────────────────────────────────────────────────────────
// Hedef seçimi — MEVZİ BURADA ANLAM KAZANIR
// Ön saf ayaktayken arka saf korunur; kırılınca arka saf açığa çıkar.
// ─────────────────────────────────────────────────────────────────────────
function selectTarget(attacker, enemies, rng, { piercing = false } = {}) {
  const alive = enemies.filter(isAlive);
  if (alive.length === 0) return null;

  // Taunt her şeyi ezer — muhafızın kalkan duvarı işte bu yüzden değerli
  const taunters = alive.filter(u => hasStatus(u, 'taunt'));
  if (taunters.length > 0) return taunters[Math.floor(rng() * taunters.length)];

  // Delici saldırılar arka safı doğrudan vurur (okçunun rolü)
  if (piercing) {
    const back = alive.filter(u => u.row === 'back');
    const pool = back.length > 0 ? back : alive;
    // En düşük canlıyı seç: infazcı davranışı
    return pool.reduce((a, b) => (a.hp / a.maxHp <= b.hp / b.maxHp ? a : b));
  }

  const front = alive.filter(u => u.row === 'front');
  if (front.length > 0) {
    // Ön saf ayakta: %85 ön safa, %15 sızma
    if (rng() < GAME_CONFIG.COMBAT.FRONTLINE_COVER) {
      return front[Math.floor(rng() * front.length)];
    }
  }
  return alive[Math.floor(rng() * alive.length)];
}

// ─────────────────────────────────────────────────────────────────────────
// Hasar uygulama
// ─────────────────────────────────────────────────────────────────────────
function applyDamage(attacker, target, rawDamage, rng, log, { canCrit = true, label = '' } = {}) {
  let dmg = rawDamage;
  let isCrit = false;

  if (canCrit && rng() < attacker.crit) {
    isCrit = true;
    dmg *= attacker.critDmg;
  }

  dmg *= elementMultiplier(attacker.element, target.element);
  dmg *= mitigation(effectiveArmor(target), attacker.pen);
  // Küçük varyans — tamamen deterministik savaş sıkıcıdır
  dmg *= 0.92 + rng() * 0.16;
  dmg = Math.max(1, Math.round(dmg));

  // Kalkan önce emer
  const shield = unitShield(target);
  let absorbed = 0;
  if (shield > 0) {
    absorbed = Math.min(shield, dmg);
    consumeShield(target, absorbed);
    dmg -= absorbed;
  }

  target.hp = Math.max(0, target.hp - dmg);
  attacker.damageDealt += dmg;
  target.damageTaken += dmg;

  if (attacker.lifesteal > 0 && dmg > 0) {
    const healed = Math.round(dmg * attacker.lifesteal);
    attacker.hp = Math.min(attacker.maxHp, attacker.hp + healed);
    attacker.healingDone += healed;
  }

  const died = target.hp <= 0;
  if (died) attacker.kills += 1;

  log.push({
    type: 'damage',
    actor: attacker.name, actorIcon: attacker.icon, actorSide: attacker.side,
    target: target.name, targetIcon: target.icon,
    amount: dmg, absorbed, isCrit, label,
    element: attacker.element,
    targetHp: target.hp, targetMaxHp: target.maxHp,
    died
  });

  return { dmg, isCrit, died };
}

function unitShield(unit) {
  return unit.statuses.filter(s => s.type === 'shield').reduce((s, x) => s + x.magnitude, 0);
}
function consumeShield(unit, amount) {
  let left = amount;
  for (const s of unit.statuses) {
    if (s.type !== 'shield' || left <= 0) continue;
    const take = Math.min(s.magnitude, left);
    s.magnitude -= take;
    left -= take;
  }
  unit.statuses = unit.statuses.filter(s => !(s.type === 'shield' && s.magnitude <= 0));
}

function healUnit(healer, target, amount, log) {
  const before = target.hp;
  target.hp = Math.min(target.maxHp, target.hp + Math.round(amount));
  const healed = target.hp - before;
  if (healed > 0) {
    healer.healingDone += healed;
    log.push({
      type: 'heal',
      actor: healer.name, actorIcon: healer.icon, actorSide: healer.side,
      target: target.name, targetIcon: target.icon,
      amount: healed, targetHp: target.hp, targetMaxHp: target.maxHp
    });
  }
  return healed;
}

// ─────────────────────────────────────────────────────────────────────────
// SINIF YETENEKLERİ — dört sınıf, dört gerçek rol
// ─────────────────────────────────────────────────────────────────────────
const ABILITIES = {
  // 🛡️ Muhafız — Kalkan Duvarı: kendini hedef gösterir, safı ayakta tutar
  guardian(self, allies, enemies, rng, log) {
    addStatus(self, { type: 'taunt', turns: 2, stackable: false });
    addStatus(self, { type: 'fortify', turns: 2, magnitude: 0.45, stackable: false });
    const shieldAmt = Math.round(self.maxHp * 0.18);
    addStatus(self, { type: 'shield', turns: 3, magnitude: shieldAmt });
    log.push({
      type: 'ability', ability: 'Kalkan Duvarı', icon: '🛡️',
      actor: self.name, actorIcon: self.icon, actorSide: self.side,
      text: `${self.name} kalkan duvarı kurdu: düşman ateşini üzerine çekiyor (+%45 zırh, ${shieldAmt} kalkan).`
    });
    return true;
  },

  // 🏹 Okçu — Delici Ok: zırhı yok sayar, arka safı infaz eder
  ranger(self, allies, enemies, rng, log) {
    const target = selectTarget(self, enemies, rng, { piercing: true });
    if (!target) return false;
    log.push({
      type: 'ability', ability: 'Delici Ok', icon: '🏹',
      actor: self.name, actorIcon: self.icon, actorSide: self.side,
      text: `${self.name} arka safa delici ok fırlattı — zırh yok sayılıyor!`
    });
    const saved = self.pen;
    self.pen = 99999;
    applyDamage(self, target, effectiveAtk(self) * 1.65, rng, log, { label: 'Delici Ok' });
    self.pen = saved;
    return true;
  },

  // 🔮 Büyücü — Element Patlaması: tüm düşmanlara vurur, elemente göre statü basar
  mage(self, allies, enemies, rng, log) {
    const targets = enemies.filter(isAlive).slice(0, GAME_CONFIG.COMBAT.MAX_AOE_TARGETS);
    if (targets.length === 0) return false;
    log.push({
      type: 'ability', ability: 'Element Patlaması', icon: '🔮',
      actor: self.name, actorIcon: self.icon, actorSide: self.side,
      text: `${self.name} ${GAME_CONFIG.ELEMENT_TRIANGLE[self.element]?.name || 'arcane'} patlaması saldı — tüm düşman safı etkilendi!`
    });
    for (const t of targets) {
      applyDamage(self, t, effectiveAtk(self) * 0.8, rng, log, { label: 'Element Patlaması' });
      if (!isAlive(t)) continue;
      if (self.element === 'fire') {
        addStatus(t, { type: 'burn', turns: 3, magnitude: Math.round(effectiveAtk(self) * 0.14), stackable: false });
      } else if (self.element === 'ice') {
        addStatus(t, { type: 'chill', turns: 2, stackable: false });
      } else if (self.element === 'nature') {
        addStatus(t, { type: 'poison', turns: 3, magnitude: Math.round(t.maxHp * 0.035), stackable: false });
      } else {
        addStatus(t, { type: 'weaken', turns: 2, stackable: false });
      }
    }
    return true;
  },

  // ⚔️ Paladin — Kutsal Işık: en yaralı müttefiki iyileştirir, lanet temizler
  paladin(self, allies, enemies, rng, log) {
    const wounded = allies.filter(isAlive).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    if (!wounded) return false;
    const amount = Math.round(self.maxHp * 0.22 + effectiveAtk(self) * 0.6);
    log.push({
      type: 'ability', ability: 'Kutsal Işık', icon: '✨',
      actor: self.name, actorIcon: self.icon, actorSide: self.side,
      text: `${self.name} kutsal ışık çağırdı — ${wounded.name} iyileşiyor ve lanetlerden arınıyor.`
    });
    healUnit(self, wounded, amount, log);
    wounded.statuses = wounded.statuses.filter(s => !['burn', 'poison', 'weaken', 'chill', 'sunder'].includes(s.type));
    addStatus(wounded, { type: 'rage', turns: 2, magnitude: 0.15, stackable: false });
    return true;
  }
};

// ─────────────────────────────────────────────────────────────────────────
// Canavar yetenekleri (zindan / boss tarafı)
// ─────────────────────────────────────────────────────────────────────────
const MONSTER_ABILITIES = {
  // Alan hasarı — EN FAZLA 4 hedef.
  // Sınırsız alan hasarı ordu büyüklüğüyle doğrusal ölçeklenir: 18 kişilik
  // orduya karşı tek "yarma" 18× hasara dönüşür ve tek hedefli saldırıları
  // tamamen anlamsız kılar. Hedef sayısı kapatılmazsa denge eğrisi seviyeden
  // seviyeye zıplar (kalabalık kadro cezalandırılır, tek hedefli boss ezilir).
  cleave(self, allies, enemies, rng, log) {
    const alive = enemies.filter(isAlive);
    const front = alive.filter(u => u.row === 'front');
    const pool = front.length > 0 ? front : alive;
    const rest = alive.filter(u => !pool.includes(u));
    const targets = [...pool, ...rest].slice(0, GAME_CONFIG.COMBAT.MAX_AOE_TARGETS);
    if (targets.length === 0) return false;
    log.push({ type: 'ability', ability: 'Yarma Darbesi', icon: '💥', actor: self.name, actorIcon: self.icon, actorSide: self.side,
      text: `${self.name} geniş bir yay çizerek ön safta ${targets.length} birimi biçti!` });
    targets.forEach(t => applyDamage(self, t, effectiveAtk(self) * 0.62, rng, log, { label: 'Yarma Darbesi' }));
    return true;
  },
  // Zırh kırar
  sunder(self, allies, enemies, rng, log) {
    const t = selectTarget(self, enemies, rng);
    if (!t) return false;
    log.push({ type: 'ability', ability: 'Zırh Parçalayıcı', icon: '🪓', actor: self.name, actorIcon: self.icon, actorSide: self.side,
      text: `${self.name} ${t.name}'in zırhını paramparça etti (-%40 zırh)!` });
    addStatus(t, { type: 'sunder', turns: 3, stackable: false });
    applyDamage(self, t, effectiveAtk(self) * 1.1, rng, log, { label: 'Zırh Parçalayıcı' });
    return true;
  },
  // Kendini iyileştirir
  regenerate(self, allies, enemies, rng, log) {
    const amount = Math.round(self.maxHp * 0.08);
    log.push({ type: 'ability', ability: 'Kadim Yenilenme', icon: '🌀', actor: self.name, actorIcon: self.icon, actorSide: self.side,
      text: `${self.name} kadim güçlerden beslenip ${amount} can yeniledi.` });
    healUnit(self, self, amount, log);
    return true;
  },
  // Bir birimi sersemletir
  terrify(self, allies, enemies, rng, log) {
    const t = selectTarget(self, enemies, rng);
    if (!t) return false;
    log.push({ type: 'ability', ability: 'Dehşet Çığlığı', icon: '😱', actor: self.name, actorIcon: self.icon, actorSide: self.side,
      text: `${self.name} dehşet çığlığı attı — ${t.name} bir tur donakaldı!` });
    addStatus(t, { type: 'stun', turns: 1, stackable: false });
    return true;
  },
  // Arka safı hedefler
  swoop(self, allies, enemies, rng, log) {
    const t = selectTarget(self, enemies, rng, { piercing: true });
    if (!t) return false;
    log.push({ type: 'ability', ability: 'Kanat Dalışı', icon: '🦅', actor: self.name, actorIcon: self.icon, actorSide: self.side,
      text: `${self.name} ön safı aşıp arka safa daldı!` });
    applyDamage(self, t, effectiveAtk(self) * 1.35, rng, log, { label: 'Kanat Dalışı' });
    return true;
  }
};

// ─────────────────────────────────────────────────────────────────────────
// Tur başı statü işleme
// ─────────────────────────────────────────────────────────────────────────
function tickStatuses(unit, log) {
  if (!isAlive(unit)) return;

  for (const s of unit.statuses) {
    if (s.type === 'burn' || s.type === 'poison') {
      const dmg = Math.max(1, Math.round(s.magnitude));
      unit.hp = Math.max(0, unit.hp - dmg);
      unit.damageTaken += dmg;
      log.push({
        type: 'dot', dotType: s.type,
        target: unit.name, targetIcon: unit.icon,
        amount: dmg, targetHp: unit.hp, targetMaxHp: unit.maxHp,
        died: unit.hp <= 0
      });
    }
  }

  unit.statuses = unit.statuses
    .map(s => ({ ...s, turns: s.turns - 1 }))
    .filter(s => s.turns > 0 && !(s.type === 'shield' && s.magnitude <= 0));
}

// ─────────────────────────────────────────────────────────────────────────
// ANA SİMÜLASYON
// ─────────────────────────────────────────────────────────────────────────
export function simulateBattle({
  allies,
  enemies,
  seed = Date.now(),
  maxRounds = GAME_CONFIG.COMBAT.MAX_ROUNDS,
  rageAfterRound = GAME_CONFIG.COMBAT.RAGE_AFTER_ROUND,
  modifier = null,        // { id, name, onRoundStart(ctx) }
  bossPhases = null       // [{ atPct, name, text, onEnter(ctx) }]
} = {}) {
  const rng = makeRng(seed);
  const log = [];
  const rounds = [];

  allies.forEach(u => { u.side = 'ally'; });
  enemies.forEach(u => { u.side = 'enemy'; });

  const totalEnemyMaxHp = enemies.reduce((s, u) => s + u.maxHp, 0);
  let phaseIndex = -1;
  let round = 0;
  let rageStacks = 0;

  if (modifier) {
    log.push({ type: 'modifier', text: `🌐 Kat Etkisi — ${modifier.name}: ${modifier.desc}` });
  }

  while (round < maxRounds && allies.some(isAlive) && enemies.some(isAlive)) {
    round++;
    const roundStartIdx = log.length;

    // Kat modifikatörü
    if (modifier && typeof modifier.onRoundStart === 'function') {
      modifier.onRoundStart({ allies, enemies, round, log, rng, addStatus, applyDamage });
    }

    // Boss fazı geçişi
    if (bossPhases) {
      const enemyHpPct = enemies.reduce((s, u) => s + Math.max(0, u.hp), 0) / Math.max(1, totalEnemyMaxHp);
      for (let i = bossPhases.length - 1; i > phaseIndex; i--) {
        if (enemyHpPct <= bossPhases[i].atPct) {
          phaseIndex = i;
          const ph = bossPhases[i];
          log.push({ type: 'phase', text: `⚡ FAZ ${i + 2}: ${ph.name} — ${ph.text}` });
          if (typeof ph.onEnter === 'function') ph.onEnter({ allies, enemies, log, rng, addStatus });
          break;
        }
      }
    }

    // Öfke sayacı: uzayan savaş cezalandırılır. "Güçlü olmak" yetmez, HIZLI olmalısın.
    if (round > rageAfterRound) {
      rageStacks++;
      enemies.filter(isAlive).forEach(e => addStatus(e, {
        type: 'rage', turns: 99, magnitude: GAME_CONFIG.COMBAT.RAGE_PER_ROUND, stackable: false
      }));
      if (rageStacks === 1) {
        log.push({ type: 'rage', text: `🔥 ÖFKE! ${rageAfterRound}. tur geçildi — düşman her tur güçleniyor. Savaşı bitir!` });
      }
    }

    // İnisiyatif: hız sıralaması, her tur yeniden hesaplanır (chill/haste etkiler).
    // actionsPerRound > 1 olan birimler sıraya birden fazla kez girer.
    const order = [];
    for (const u of [...allies, ...enemies]) {
      if (!isAlive(u)) continue;
      for (let a = 0; a < u.actionsPerRound; a++) {
        order.push({ u, init: effectiveSpeed(u) * (0.9 + rng() * 0.2) - a * 0.001 });
      }
    }
    order.sort((a, b) => b.init - a.init);
    const turnQueue = order.map(x => x.u);

    for (const unit of turnQueue) {
      if (!isAlive(unit)) continue;
      if (!allies.some(isAlive) || !enemies.some(isAlive)) break;

      if (hasStatus(unit, 'stun')) {
        log.push({ type: 'stunned', actor: unit.name, actorIcon: unit.icon, actorSide: unit.side });
        continue;
      }

      const own = unit.side === 'ally' ? allies : enemies;
      const foes = unit.side === 'ally' ? enemies : allies;

      // Yetenek hazırsa kullan
      let usedAbility = false;
      if (unit.cooldown <= 0) {
        const kit = unit.side === 'ally'
          ? ABILITIES[unit.cls]
          : (unit.abilities && unit.abilities.length
            ? MONSTER_ABILITIES[unit.abilities[Math.floor(rng() * unit.abilities.length)]]
            : null);
        if (kit) {
          usedAbility = kit(unit, own, foes, rng, log);
          if (usedAbility) {
            const cd = unit.side === 'ally'
              ? (GAME_CONFIG.COMBAT_CLASSES[unit.cls]?.cooldown || 3)
              : (unit.abilityCooldown || 3);
            unit.cooldown = cd;
          }
        }
      } else {
        unit.cooldown--;
      }

      if (!usedAbility) {
        const target = selectTarget(unit, foes, rng, { piercing: unit.cls === 'ranger' });
        if (target) applyDamage(unit, target, effectiveAtk(unit), rng, log, { label: 'Saldırı' });
      }

      // Paladin pasifi: savaşta bir kez düşen müttefiki ayağa kaldırır
      const fallen = own.find(u => u.hp <= 0 && !u.revivedOnce);
      if (fallen) {
        const savior = own.find(u => u.cls === 'paladin' && isAlive(u) && !u.usedRevive);
        if (savior) {
          savior.usedRevive = true;
          fallen.revivedOnce = true;
          fallen.hp = Math.round(fallen.maxHp * 0.25);
          fallen.statuses = [];
          log.push({
            type: 'revive', actor: savior.name, actorIcon: savior.icon, actorSide: savior.side,
            target: fallen.name, targetIcon: fallen.icon,
            text: `✨ ${savior.name} düşen ${fallen.name}'i ayağa kaldırdı! (%25 can)`
          });
        }
      }
    }

    // Tur sonu: yanma/zehir tik'i ve statü sayaçları
    [...allies, ...enemies].forEach(u => tickStatuses(u, log));

    rounds.push({
      round,
      events: log.slice(roundStartIdx),
      allyHp: allies.reduce((s, u) => s + Math.max(0, u.hp), 0),
      allyMaxHp: allies.reduce((s, u) => s + u.maxHp, 0),
      enemyHp: enemies.reduce((s, u) => s + Math.max(0, u.hp), 0),
      enemyMaxHp: totalEnemyMaxHp,
      aliveAllies: allies.filter(isAlive).length,
      aliveEnemies: enemies.filter(isAlive).length
    });
  }

  const enemiesDown = !enemies.some(isAlive);
  const alliesDown = !allies.some(isAlive);
  const victory = enemiesDown && !alliesDown;
  const timeout = !enemiesDown && !alliesDown;

  return {
    victory,
    timeout,
    rounds,
    roundCount: round,
    log,
    allies,
    enemies,
    survivors: allies.filter(isAlive).length,
    casualties: allies.filter(u => !isAlive(u)).length,
    // Savaş sonu istatistikleri — "en çok hasar vuran" tablosu için
    mvp: [...allies].sort((a, b) => (b.damageDealt + b.healingDone) - (a.damageDealt + a.healingDone))[0] || null,
    totalDamageDealt: allies.reduce((s, u) => s + u.damageDealt, 0),
    totalDamageTaken: allies.reduce((s, u) => s + u.damageTaken, 0)
  };
}

// ─────────────────────────────────────────────────────────────────────────
// SAVAŞ ÖNCESİ TAHMİN — Monte Carlo
// v1'deki "turnsToKill / turnsEnemyKillsUs × 50" formülü sadece bir orandı.
// Burada savaş gerçekten N kez oynanır; kazanma şansı ampirik olarak ölçülür.
// ─────────────────────────────────────────────────────────────────────────
export function predictBattle(buildAllies, buildEnemies, samples = 120, opts = {}) {
  let wins = 0;
  let totalRounds = 0;
  let totalCasualties = 0;
  let timeouts = 0;

  for (let i = 0; i < samples; i++) {
    const res = simulateBattle({
      allies: buildAllies(),
      enemies: buildEnemies(),
      seed: (Date.now() ^ (i * 2654435761)) >>> 0,
      ...opts
    });
    if (res.victory) wins++;
    if (res.timeout) timeouts++;
    totalRounds += res.roundCount;
    totalCasualties += res.casualties;
  }

  const winRate = wins / samples;
  let difficulty = 'Kolay';
  if (winRate < 0.15) difficulty = 'İmkansız';
  else if (winRate < 0.40) difficulty = 'Çok Zor';
  else if (winRate < 0.65) difficulty = 'Zor';
  else if (winRate < 0.85) difficulty = 'Dengeli';

  return {
    winChance: Math.round(winRate * 100),
    difficulty,
    avgRounds: +(totalRounds / samples).toFixed(1),
    avgCasualties: +(totalCasualties / samples).toFixed(1),
    timeoutRate: +(timeouts / samples).toFixed(2),
    samples
  };
}
