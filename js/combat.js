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

// 👑 Seviye 9 ve Seviye 18 için Düz HP-Yüzdesi Tetikleyicili Boss Fazları
export const DEFAULT_BOSS_PHASES = {
  9: [
    {
      atPct: 0.50,
      name: 'Taş Kabuk',
      text: 'Kadim Taş Golyat taş kabuğuna büründü! (+%50 Zırh ve devasa Kalkan)',
      onEnter({ enemies, log }) {
        enemies.filter(isAlive).forEach(e => {
          addStatus(e, { type: 'fortify', turns: 3, magnitude: 0.50, stackable: false });
          addStatus(e, { type: 'shield', turns: 3, magnitude: Math.round(e.maxHp * 0.25) });
        });
      }
    }
  ],
  18: [
    {
      atPct: 0.60,
      name: 'Ejderha Gazabı',
      text: 'Kıyamet Ejderhası IGNIS kükreyerek alev saçtı! (+%50 Saldırı Gücü)',
      onEnter({ enemies, log }) {
        enemies.filter(isAlive).forEach(e => {
          addStatus(e, { type: 'rage', turns: 4, magnitude: 0.50, stackable: false });
        });
      }
    },
    {
      atPct: 0.25,
      name: 'Kıyamet Alevi',
      text: 'IGNIS son nefesinde tüm ön safı alevlere boğdu! (Sersemletme Darbesi)',
      onEnter({ allies, log, rng }) {
        const front = allies.filter(isAlive).filter(u => u.row === 'front');
        const targets = front.length > 0 ? front : allies.filter(isAlive);
        targets.forEach(a => {
          if (rng() < 0.75) {
            addStatus(a, { type: 'stun', turns: 1, stackable: false });
          }
        });
      }
    }
  ]
};

// Zırh azaltması: azalan verimli, asla %100 olmaz
function mitigation(armor, penetration) {
  const eff = Math.max(0, (armor || 0) - (penetration || 0));
  const K = GAME_CONFIG.COMBAT.ARMOR_CONSTANT;
  return 1 - eff / (eff + K);
}

// ─────────────────────────────────────────────────────────────────────────
// Birim oluşturma (Tek Tip Asker + Skill Loadout)
// ─────────────────────────────────────────────────────────────────────────
export function createUnit(spec) {
  const maxHp = Math.max(1, Math.round(spec.maxHp != null ? spec.maxHp : 100));
  
  // Askerin yetenek yükü (Skill Loadout): 1-3 aktif yetenek + 1 pasif yetenek
  const skills = spec.skills && Array.isArray(spec.skills) && spec.skills.length
    ? [...spec.skills]
    : ['shieldWall'];

  return {
    uid: spec.uid || `u_${Math.random().toString(36).slice(2, 9)}`,
    sourceIndex: spec.sourceIndex != null ? spec.sourceIndex : -1,
    name: spec.name || 'AdAstra Şampiyonu',
    icon: spec.icon || '⚔️',
    level: spec.level || 1,
    side: spec.side || 'ally',

    maxHp,
    hp: Math.max(0, Math.round(spec.hp != null ? spec.hp : maxHp)),
    atk: Math.max(1, Math.round(spec.atk != null ? spec.atk : 25)),
    armor: Math.max(0, Math.round(spec.armor != null ? spec.armor : 10)),
    speed: Math.max(1, Math.round(spec.speed != null ? spec.speed : 10)),
    crit: spec.crit != null ? spec.crit : 0.05,
    critDmg: spec.critDmg != null ? spec.critDmg : GAME_CONFIG.COMBAT.BASE_CRIT_DAMAGE,
    pen: Math.max(0, spec.pen != null ? spec.pen : 5),
    lifesteal: spec.lifesteal || 0,

    skills,
    row: spec.row || 'front', // 'front' | 'back'

    // Tur başına aksiyon sayısı (Boss mekaniği)
    actionsPerRound: Math.max(1, spec.actionsPerRound || 1),
    abilities: spec.abilities || null,
    abilityCooldown: spec.abilityCooldown || 3,

    statuses: [],
    cooldown: 0,
    cooldowns: (skills || []).reduce((acc, sk) => { acc[sk] = 0; return acc; }, {}),
    revivedOnce: false,
    usedLastStand: false,
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
// Hedef seçimi — ÖN SAF / ARKA SAF MEVZİ MEKANİZMASI
// Ön saf ayaktayken arka saf korunur (%85 ön safa yönelme, %15 sızma).
// Ön saf çöktüğünde arka saf açığa çıkar; delici saldırılar doğrudan arka safı hedefler.
// ─────────────────────────────────────────────────────────────────────────
export function selectTarget(attacker, enemies, rng = Math.random, { piercing = false } = {}) {
  const alive = enemies.filter(isAlive);
  if (alive.length === 0) return null;

  // Taunt her şeyi ezer — muhafızın kalkan duvarı işte bu yüzden değerli
  const taunters = alive.filter(u => hasStatus(u, 'taunt'));
  if (taunters.length > 0) return taunters[Math.floor(rng() * taunters.length)];

  // Delici saldırılar doğrudan arka safı vurur / en düşük canlıyı hedefler (infazcı davranışı)
  if (piercing) {
    const back = alive.filter(u => u.row === 'back');
    const pool = back.length > 0 ? back : alive;
    return pool.reduce((a, b) => (a.hp / a.maxHp <= b.hp / b.maxHp ? a : b));
  }

  // Ön saf ayaktayken arka saf korunur (%85 ön saf, %15 sızma)
  const front = alive.filter(u => u.row === 'front');
  if (front.length > 0) {
    const coverRate = (GAME_CONFIG.COMBAT && GAME_CONFIG.COMBAT.FRONTLINE_COVER != null)
      ? GAME_CONFIG.COMBAT.FRONTLINE_COVER
      : 0.85;
    if (rng() < coverRate) {
      return front[Math.floor(rng() * front.length)];
    }
  }

  // Ön saf yoksa veya %15 sızma gerçekleştiyse tüm canlı düşmanlar serbest hedeflenir
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
// ⚔️ ASKER YETENEK ENVENTARİ (SKILL LOADOUT SİSTEMİ)
// Tek tip askerler için 7 temel taktiksel rol yeteneği
// ─────────────────────────────────────────────────────────────────────────
export const PLAYER_SKILLS = {
  // 🛡️ Kalkan Duvarı: Tanklık
  shieldWall: {
    id: 'shieldWall',
    name: 'Kalkan Duvarı',
    icon: '🛡️',
    role: 'Tanklık',
    cooldown: 3,
    desc: 'Kendine 2 tur taunt çeker, +%45 zırh ve %20 kalkan kazanır.',
    execute(self, allies, enemies, rng, log) {
      addStatus(self, { type: 'taunt', turns: 2, stackable: false });
      addStatus(self, { type: 'fortify', turns: 2, magnitude: 0.45, stackable: false });
      const shieldAmt = Math.round(self.maxHp * 0.20);
      addStatus(self, { type: 'shield', turns: 3, magnitude: shieldAmt });
      log.push({
        type: 'ability', ability: 'Kalkan Duvarı', icon: '🛡️',
        actor: self.name, actorIcon: self.icon, actorSide: self.side,
        text: `${self.name} Kalkan Duvarı kurdu: Düşman ateşini üzerine çekiyor (+%45 Zırh, ${shieldAmt} Kalkan)!`
      });
      return true;
    }
  },

  // ⚡ Şok Dalgası: Kalabalık temizleme (AoE)
  shockwave: {
    id: 'shockwave',
    name: 'Şok Dalgası',
    icon: '⚡',
    role: 'AoE Temizleme',
    cooldown: 3,
    desc: 'Ön saftaki en fazla 3 hedefe alan hasarı vurur.',
    execute(self, allies, enemies, rng, log) {
      const alive = enemies.filter(isAlive);
      const front = alive.filter(u => u.row === 'front');
      const pool = front.length > 0 ? front : alive;
      const targets = pool.slice(0, 3);
      if (targets.length === 0) return false;
      log.push({
        type: 'ability', ability: 'Şok Dalgası', icon: '⚡',
        actor: self.name, actorIcon: self.icon, actorSide: self.side,
        text: `${self.name} yeri sarsan bir Şok Dalgası gönderdi — ${targets.length} hedefe vurdu!`
      });
      for (const t of targets) {
        applyDamage(self, t, effectiveAtk(self) * 0.85, rng, log, { label: 'Şok Dalgası' });
      }
      return true;
    }
  },

  // ✨ Sahra Merhemi: Sağlık & Destek
  fieldMedic: {
    id: 'fieldMedic',
    name: 'Sahra Merhemi',
    icon: '✨',
    role: 'Sağlık / Destek',
    cooldown: 3,
    desc: 'En yaralı müttefiği iyileştirir, lanetleri temizler ve moral verir.',
    execute(self, allies, enemies, rng, log) {
      const wounded = allies.filter(isAlive).sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0];
      if (!wounded) return false;
      const healAmt = Math.round(self.maxHp * 0.22 + effectiveAtk(self) * 0.5);
      log.push({
        type: 'ability', ability: 'Sahra Merhemi', icon: '✨',
        actor: self.name, actorIcon: self.icon, actorSide: self.side,
        text: `${self.name} Sahra Merhemi uyguladı: ${wounded.name} ${healAmt} HP iyileşti ve arındı!`
      });
      healUnit(self, wounded, healAmt, log);
      wounded.statuses = wounded.statuses.filter(s => !['burn', 'poison', 'weaken', 'chill', 'sunder'].includes(s.type));
      addStatus(wounded, { type: 'rage', turns: 2, magnitude: 0.15, stackable: false });
      return true;
    }
  },

  // 🪓 Zırh Kırıcı: Boss & Tank kırma
  armorBreaker: {
    id: 'armorBreaker',
    name: 'Zırh Kırıcı',
    icon: '🪓',
    role: 'Anti-Tank',
    cooldown: 3,
    desc: 'Hedefe sert bir darbe indirir ve zırhını 3 tur kırar (-%40 zırh).',
    execute(self, allies, enemies, rng, log) {
      const target = selectTarget(self, enemies, rng);
      if (!target) return false;
      log.push({
        type: 'ability', ability: 'Zırh Kırıcı', icon: '🪓',
        actor: self.name, actorIcon: self.icon, actorSide: self.side,
        text: `${self.name} ${target.name}'in zırhına sert bir darbe indirdi (-%40 zırh)!`
      });
      addStatus(target, { type: 'sunder', turns: 3, stackable: false });
      applyDamage(self, target, effectiveAtk(self) * 1.30, rng, log, { label: 'Zırh Kırıcı' });
      return true;
    }
  },

  // 💫 Sersemletme Darbesi: Kontrol
  stunStrike: {
    id: 'stunStrike',
    name: 'Sersemletme Darbesi',
    icon: '💫',
    role: 'Kontrol',
    cooldown: 4,
    desc: 'Hedefe vurur ve 1 tur sersemleterek hareketini engeller.',
    execute(self, allies, enemies, rng, log) {
      const target = selectTarget(self, enemies, rng);
      if (!target) return false;
      log.push({
        type: 'ability', ability: 'Sersemletme Darbesi', icon: '💫',
        actor: self.name, actorIcon: self.icon, actorSide: self.side,
        text: `${self.name} kafaya indirdiği darbeyle ${target.name}'i sersemletti (1 tur devre dışı)!`
      });
      addStatus(target, { type: 'stun', turns: 1, stackable: false });
      applyDamage(self, target, effectiveAtk(self) * 1.10, rng, log, { label: 'Sersemletme' });
      return true;
    }
  },

  // 🩸 Kan Çılgınlığı: Riskli yüksek hasar
  bloodFrenzy: {
    id: 'bloodFrenzy',
    name: 'Kan Çılgınlığı',
    icon: '🩸',
    role: 'Riskli Hasar',
    cooldown: 3,
    desc: 'Kendi zırhını düşürerek 2 tur boyunca saldırı gücünü +%50 artırır.',
    execute(self, allies, enemies, rng, log) {
      addStatus(self, { type: 'rage', turns: 2, magnitude: 0.50, stackable: false });
      addStatus(self, { type: 'sunder', turns: 2, stackable: false });
      log.push({
        type: 'ability', ability: 'Kan Çılgınlığı', icon: '🩸',
        actor: self.name, actorIcon: self.icon, actorSide: self.side,
        text: `${self.name} Kan Çılgınlığına girdi: +%50 Saldırı Gücü kazandı (-%40 Zırh feragatiyle)!`
      });
      const target = selectTarget(self, enemies, rng);
      if (target) {
        applyDamage(self, target, effectiveAtk(self) * 1.25, rng, log, { label: 'Çılgın Vuruş' });
      }
      return true;
    }
  },

  // 🔥 Son Nefes: Pasif Hayatta Kalma
  lastStand: {
    id: 'lastStand',
    name: 'Son Nefes',
    icon: '🔥',
    role: 'Pasif',
    isPassive: true,
    desc: 'Canı %20 altına düştüğünde bir kerelik %35 kalkan ve zırh patlaması tetikler.',
    checkTrigger(self, log) {
      if (self.usedLastStand || !isAlive(self)) return false;
      if (self.hp <= self.maxHp * 0.25) {
        self.usedLastStand = true;
        const shieldAmt = Math.round(self.maxHp * 0.35);
        addStatus(self, { type: 'shield', turns: 3, magnitude: shieldAmt });
        addStatus(self, { type: 'fortify', turns: 3, magnitude: 0.50, stackable: false });
        log.push({
          type: 'ability', ability: 'Son Nefes', icon: '🔥',
          actor: self.name, actorIcon: self.icon, actorSide: self.side,
          text: `🔥 ${self.name} ölümün eşiğinde Son Nefes pasifini tetikledi: ${shieldAmt} Kalkan ve +%50 Zırh kazandı!`
        });
        return true;
      }
      return false;
    }
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
    const targets = [...pool, ...rest].slice(0, GAME_CONFIG.COMBAT.MAX_AOE_TARGETS || 4);
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

      // Pasif yetenek kontrolü (örn. lastStand)
      if (unit.side === 'ally' && unit.skills && unit.skills.includes('lastStand')) {
        PLAYER_SKILLS.lastStand.checkTrigger(unit, log);
      }

      // Yetenek hazırsa kullan
      let usedAbility = false;
      if (unit.cooldown <= 0) {
        if (unit.side === 'ally') {
          // Müttefik Asker Skill Loadout Taraması (1-3 Aktif Yetenek)
          const activeSkills = unit.skills && unit.skills.length ? unit.skills : ['shieldWall'];

          for (const sKey of activeSkills) {
            const sDef = PLAYER_SKILLS[sKey];
            if (sDef && !sDef.isPassive && typeof sDef.execute === 'function') {
              usedAbility = sDef.execute(unit, own, foes, rng, log);
              if (usedAbility) {
                unit.cooldown = sDef.cooldown || 3;
                break;
              }
            }
          }
        } else {
          // Canavar Yetenek Kiti
          const kit = unit.abilities && unit.abilities.length
            ? MONSTER_ABILITIES[unit.abilities[Math.floor(rng() * unit.abilities.length)]]
            : null;
          if (kit) {
            usedAbility = kit(unit, own, foes, rng, log);
            if (usedAbility) {
              unit.cooldown = unit.abilityCooldown || 3;
            }
          }
        }
      } else {
        unit.cooldown--;
      }

      if (!usedAbility) {
        const target = selectTarget(unit, foes, rng);
        if (target) applyDamage(unit, target, effectiveAtk(unit), rng, log, { label: 'Saldırı' });
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
  const winner = victory ? 'ally' : (alliesDown ? 'enemy' : 'draw');

  return {
    victory,
    winner,
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
