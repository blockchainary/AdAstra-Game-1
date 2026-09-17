// AdAstra: Genesis Realm v2 — Yaratık Kütüğü (Bestiary)
// ============================================================================
// v1'de canavarlar tek satırlık {hp, atk} nesneleriydi. Sınıfı, elementi,
// yeteneği ve tur içi aksiyon sayısı yoktu — bu yüzden 18 kişilik bir ordu
// karşısında tek boss, 18 vuruş alıp 1 vuruş yapıyordu ve savaş deterministik
// bir garantili zafere dönüşüyordu (F-19).
//
// v2'de her canavarın elementi, yetenek seti ve tur başına aksiyon sayısı var.
// Boss'lar ordu büyüdükçe daha çok hamle kazanır: kalabalık artık bedava değil.
// ============================================================================

import { GAME_CONFIG } from './config.js';
import { createUnit, DEFAULT_BOSS_PHASES } from './combat.js';

// 6 kat × 3 seviye = 18 bölüm. Her katın kendi canavar profili ve yetenekleri var.
export const DUNGEON_LEVELS = [
  // ── 1. KAT: Kristal Mağarası ─────────────────────────────────────────
  { level: 1,  name: 'Bataklık Balçığı',        icon: '🟢', floor: 1, cls: 'guardian', abilities: [] },
  { level: 2,  name: 'Mağara Goblini',          icon: '👺', floor: 1, cls: 'ranger',   abilities: ['swoop'] },
  { level: 3,  name: 'Gölge Kurdu',             icon: '🐺', floor: 1, cls: 'ranger',   abilities: ['swoop'], isFloorGuard: true },

  // ── 2. KAT: Kemik Mahzeni ─────────────────────────────────────────────
  { level: 4,  name: 'Kemik Mahzeni İskeleti',  icon: '💀', floor: 2, cls: 'guardian', abilities: ['sunder'] },
  { level: 5,  name: 'Lanetli Kemik Büyücüsü',  icon: '🧙‍♂️', floor: 2, cls: 'mage',     abilities: ['terrify'] },
  { level: 6,  name: 'Kemik Taht Muhafızı',     icon: '🗡️', floor: 2, cls: 'paladin',  abilities: ['cleave', 'regenerate'], isFloorGuard: true },

  // ── 3. KAT: Kadim Tapınak — ARA BOSS ──────────────────────────────────
  { level: 7,  name: 'Karanlık Tarikatçı',      icon: '🧙‍♂️', floor: 3, cls: 'mage',     abilities: ['terrify'] },
  { level: 8,  name: 'Cehennem Tazısı',         icon: '🐺', floor: 3, cls: 'ranger',   abilities: ['swoop', 'cleave'] },
  { level: 9,  name: 'Kadim Taş Golyat',        icon: '🗿', floor: 3, cls: 'guardian', abilities: ['cleave', 'sunder', 'regenerate'], isBoss: true, bossLabel: 'ARA BOSS', bossPhases: DEFAULT_BOSS_PHASES[9] },

  // ── 4. KAT: Lanetli Firavun Mezarı ────────────────────────────────────
  { level: 10, name: 'Sargılı Mumya',           icon: '🧟', floor: 4, cls: 'guardian', abilities: ['sunder'] },
  { level: 11, name: 'Gölge Hayalet',           icon: '👻', floor: 4, cls: 'mage',     abilities: ['swoop', 'terrify'] },
  { level: 12, name: 'Lanetli Firavun',         icon: '👑', floor: 4, cls: 'paladin',  abilities: ['cleave', 'regenerate', 'terrify'], isFloorGuard: true },

  // ── 5. KAT: Kaynayan Lav Çukuru ──────────────────────────────────────
  { level: 13, name: 'Ateş İblisi',             icon: '😈', floor: 5, cls: 'ranger',   abilities: ['cleave'] },
  { level: 14, name: 'Lav Elementali',          icon: '🌋', floor: 5, cls: 'mage',     abilities: ['cleave', 'regenerate'] },
  { level: 15, name: 'Obsidyen Berserker',      icon: '⚔️', floor: 5, cls: 'ranger',   abilities: ['cleave', 'sunder'], isFloorGuard: true },

  // ── 6. KAT: Kıyamet Mabedi — FİNAL ───────────────────────────────────
  { level: 16, name: 'Kıyamet Şövalyesi',       icon: '🛡️', floor: 6, cls: 'paladin',  abilities: ['cleave', 'sunder'] },
  { level: 17, name: 'Kadim Gölge Lordu',       icon: '👁️', floor: 6, cls: 'mage',     abilities: ['terrify', 'swoop', 'cleave'] },
  { level: 18, name: 'Kıyamet Ejderhası IGNIS', icon: '🐉', floor: 6, cls: 'guardian', abilities: ['cleave', 'sunder', 'swoop', 'regenerate'], isBoss: true, bossLabel: 'BÜYÜK BOSS', bossPhases: DEFAULT_BOSS_PHASES[18] }
];

// Kat başına refakatçi yaratıklar (odalar tek düşmandan ibaret değil)
const MINION_NAMES = {
  1: ['Mağara Örümceği', 'Yarasa Sürüsü'],
  2: ['Kemik Yığını', 'Mezar Sıçanı'],
  3: ['Tapınak Muhafızı', 'Taş Gargoyle'],
  4: ['Lahit Böceği', 'Kum Hayaleti'],
  5: ['Kor Yarasası', 'Magma Kurtçuğu'],
  6: ['Ejderha Yavrusu', 'Kıyamet Muhafızı']
};

// ─────────────────────────────────────────────────────────────────────────
// Ölçekleme formülleri — oyuncu gücüne göre kalibre edildi.
// squadPower: ordunun toplam (ATK + HP/6) değeri. Canavar buna göre boyutlanır
// ki hem düşük hem yüksek seviyede savaş anlamlı kalsın.
// ─────────────────────────────────────────────────────────────────────────
const SCALE = {
  ARMOR_BASE: 18,
  ARMOR_PER_LEVEL: 3.4,
  SPEED_BASE: 9,
  SPEED_PER_LEVEL: 0.35,
  // Savaşın kaç tur sürmesi hedefleniyor (uzun savaş = daha çok risk penceresi)
  TARGET_ROUNDS: { normal: 4.5, guard: 6.0, boss: 8.0 },
  // Oyuncunun bu savaşta kaybetmesi beklenen etkin can oranı
  TARGET_HP_LOSS: { normal: 0.32, guard: 0.56, boss: 0.76 },
  // Kalibrasyon katsayıları (zırh azaltması + yetenek yükünü telafi eder)
  HP_CALIBRATION: 0.85,
  ATK_CALIBRATION: 2.4
};

// Yeteneklerin "hasar yükü": bir normal saldırı = 1.0.
// `cleave` 4 hedefe 0.62× vurur → 2.48×. Bu hesaba katılmazsa yarma
// yeteneği olan canavarlar bütçelenenin 2,5 katı hasar verir ve zorluk
// eğrisi seviyeden seviyeye zıplar (Lv.8 ve Lv.13'te görüldüğü gibi).
const ABILITY_WEIGHT = {
  cleave: 0.62 * 4,   // 4 hedefe alan hasarı
  sunder: 1.10 + 0.25, // hasar + zırh kırma değeri
  swoop: 1.35,        // arka safı vuran tek hedef
  terrify: 1.00,      // hasar yok ama oyuncunun bir turunu çalar
  regenerate: 0.55    // hasar yok, kendini iyileştirir
};

// Soğuma süresi C olan bir canavar her C aksiyonda bir yetenek kullanır.
// Ortalama hasar çarpanı: ((C-1)·1.0 + yetenekAğırlığı) / C
function abilityLoadFactor(entry) {
  const list = entry.abilities || [];
  if (list.length === 0) return 1;
  const avgWeight = list.reduce((s, a) => s + (ABILITY_WEIGHT[a] ?? 1), 0) / list.length;
  const C = entry.isBoss ? 2 : 3;
  return ((C - 1) * 1.0 + avgWeight) / C;
}

// ─────────────────────────────────────────────────────────────────────────
// BEKLENEN OYUNCU GÜCÜ — zorluğun tek referansı
//
// v1'in ve ilk v2 denemelerinin ortak hatası, canavar statlarını oyuncudan
// BAĞIMSIZ bir üstel eğriye bağlamaktı (hp = base·level^1.5 gibi). Oyuncu
// gücü ise basamaklı büyür: her 2 zindan seviyesinde bir yeni teçhizat parçası,
// her seviyede yeni asker. İki eğri birbirini tutmayınca zorluk seviyeden
// seviyeye zıplar — bir bölüm %100, bir sonraki %0 olur.
//
// v2'de canavar statları DOĞRUDAN beklenen ordu gücünden türetilir. Böylece
// zorluk tasarımcının seçtiği şeydir (kaç tur sürsün, ne kadar can kaybedilsin),
// tesadüfi bir üstel çakışma değil.
// ─────────────────────────────────────────────────────────────────────────
export function expectedSquad(level) {
  const D = Math.max(1, Math.min(18, level));
  const count = Math.min(GAME_CONFIG.MAX_SOLDIERS, 3 + Math.floor(D * 0.85));
  const solLevel = D;
  const eqPieces = Math.max(0, Math.min(5, Math.floor((D - 1) / 2)));
  const eqLevel = Math.max(1, Math.min(10, Math.ceil((D - 2) / 2)));

  const m = 1 + (eqLevel - 1) * 0.35;
  const slots = ['weapon', 'armor', 'helmet', 'legs', 'boots'].slice(0, eqPieces);
  let eqAtk = 0, eqHp = 0;
  for (const k of slots) {
    const r = GAME_CONFIG.EQUIPMENT_RECIPES[k];
    eqAtk += r.baseAtk * m;
    eqHp += r.baseHp * m;
  }
  const setB = eqPieces >= 5 ? 1.25 : eqPieces >= 4 ? 1.12 : eqPieces >= 2 ? 1.05 : 1;
  eqAtk *= setB; eqHp *= setB;

  const baseHp = 100 + 15 * (solLevel - 1);
  const baseAtk = 20 + 5 * (solLevel - 1);

  // Dengeli kadro varsayımı: guardian/ranger/paladin/mage döngüsü
  const classes = Object.values(GAME_CONFIG.COMBAT_CLASSES);
  const avgHpMult = classes.reduce((s, c) => s + c.hpMult, 0) / classes.length;
  const avgAtkMult = classes.reduce((s, c) => s + c.atkMult, 0) / classes.length;

  return {
    count,
    solLevel,
    totalAtk: count * (baseAtk + eqAtk) * avgAtkMult,
    totalHp: count * (baseHp + eqHp) * avgHpMult
  };
}

function roleOf(entry) {
  if (entry.isBoss) return 'boss';
  if (entry.isFloorGuard) return 'guard';
  return 'normal';
}

function baseStats(level) {
  const entry = getDungeonEntry(level);
  const role = roleOf(entry);
  const sq = expectedSquad(level);
  let rounds = SCALE.TARGET_ROUNDS[role];
  let loss = SCALE.TARGET_HP_LOSS[role];

  // Kat 3 (Lv.9 Kadim Taş Golyat) ve Kat 6 (Lv.18 Kıyamet Ejderhası IGNIS) çok daha zorlu boss statları:
  let bossMultiplier = 1.0;
  if (entry.isBoss) {
    rounds = level === 18 ? 14.0 : 10.5;
    loss = level === 18 ? 0.95 : 0.88;
    bossMultiplier = level === 18 ? 2.6 : 1.85;
  }

  // Canavarın canı: ordunun `rounds` tur boyunca vurabileceği toplam hasar
  const hp = sq.totalAtk * rounds * SCALE.HP_CALIBRATION * bossMultiplier;
  // Canavarın vuruşu: ordunun aynı sürede hedeflenen oranda can kaybetmesi
  const atkPerRound = (sq.totalHp * loss) / rounds;
  // Tur başına aksiyon sayısına bölünür (boss birden çok kez vurur)
  const actions = actionsFor(entry, sq.count);
  const atk = (atkPerRound / actions) * SCALE.ATK_CALIBRATION * (entry.isBoss ? 1.6 : 1.0) / abilityLoadFactor(entry);

  return {
    hp: Math.max(60, Math.round(hp)),
    atk: Math.max(8, Math.round(atk)),
    armor: Math.round((SCALE.ARMOR_BASE + level * SCALE.ARMOR_PER_LEVEL) * (entry.isBoss ? 1.5 : 1.0)),
    speed: Math.round(SCALE.SPEED_BASE + level * SCALE.SPEED_PER_LEVEL)
  };
}

// Boss'un tur başına aksiyon sayısı, karşısındaki ordunun büyüklüğüne bağlıdır.
function actionsFor(entry, squadSize) {
  const crowd = Math.max(1, squadSize);
  if (entry.isBoss) return Math.max(3, Math.min(5, Math.round(crowd / 4)));
  if (entry.isFloorGuard) return Math.max(1, Math.min(3, Math.round(crowd / 7)));
  return Math.max(1, Math.min(2, Math.round(crowd / 9)));
}

export function getDungeonEntry(level) {
  return DUNGEON_LEVELS.find(e => e.level === level) || DUNGEON_LEVELS[0];
}

// Odanın toplam güç bütçesi, son odaya göre oranlanır.
// Ara odalar asıl sınav değildir; onların işi kaynak (can, kalkan, bekleme
// süresi) tüketmektir — çünkü odalar arasında iyileşme yoktur.
const ROOM_BUDGET = [0.42, 0.58, 1.0];

// Tek bir canavar birimi üretir. `share`, odanın bütçesinden aldığı paydır.
export function buildMonster(level, squadSize = 6, role = 'main', index = 0, share = 1) {
  const entry = getDungeonEntry(level);
  const s = baseStats(level);

  // Rol farkı (boss / kat muhafızı / normal) zaten baseStats() içinde
  // hedeflenen tur sayısı ve can kaybı oranıyla modellendi. Burada yalnızca
  // odanın bütçe payı uygulanır.
  let hpMult = share, atkMult = share, name = entry.name, icon = entry.icon, abilities = entry.abilities;

  if (role === 'minion') {
    const pool = MINION_NAMES[entry.floor] || ['Zindan Yaratığı'];
    name = pool[index % pool.length];
    icon = '👹';
    abilities = [];
    // Refakatçiler saldırı gücünü canlarından daha çok korur: kalabalık tehdit
    atkMult *= 1.25;
  }

  const cls = role === 'minion' ? 'guardian' : entry.cls;
  const mainRow = (entry.cls === 'guardian' || entry.cls === 'paladin') ? 'front' : 'back';

  // Kritik şansı ve zırh delme AÇIKÇA verilir. Aksi hâlde createUnit bunları
  // sınıf şablonundan miras alır ve "ranger" tipli bir canavar %28 kritik +
  // 40 delme ile aynı seviyedeki "guardian" tipli canavardan kat kat ölümcül
  // olur — zorluk eğrisi seviyeden seviyeye zıplar. Sınıf yalnızca hafif bir
  // karakter farkı yaratır, uçurum değil.
  const flavor = { ranger: 0.07, mage: 0.03, paladin: 0.02, guardian: 0 }[cls] || 0;
  const penFlavor = { ranger: 14, mage: 8, paladin: 4, guardian: 0 }[cls] || 0;

  return createUnit({
    crit: Math.min(0.30, 0.05 + level * 0.006 + (role === 'minion' ? 0 : flavor)),
    pen: Math.round(level * 1.6 + (role === 'minion' ? 0 : penFlavor)),
    uid: `mon_${level}_${role}_${index}`,
    name,
    icon,
    cls,
    level,
    // Refakatçiler ÖN SAFTA durur: ana yaratığa ulaşmak için önce onları
    // kırman gerekir. Okçunun "Delici Ok"u işte burada değer kazanır.
    row: role === 'minion' ? 'front' : mainRow,
    maxHp: Math.max(1, Math.round(s.hp * hpMult)),
    hp: Math.max(1, Math.round(s.hp * hpMult)),
    atk: Math.max(1, Math.round(s.atk * atkMult)),
    armor: role === 'minion' ? Math.round(s.armor * 0.65) : s.armor,
    speed: s.speed + (role === 'minion' ? 3 : 0),
    element: entry.element,
    abilities: abilities && abilities.length ? abilities : null,
    abilityCooldown: entry.isBoss ? 2 : 3,
    actionsPerRound: role === 'minion' ? 1 : actionsFor(entry, squadSize),
    side: 'enemy'
  });
}

// ─────────────────────────────────────────────────────────────────────────
// ODA KURULUMU — bir zindan koşusu 3 odadan oluşur:
//   Oda 1-2: öncü devriye + refakatçiler (kaynak yıpratır)
//   Oda 3  : kat muhafızı / boss (asıl sınav)
// Odalar arasında iyileşme YOK: kaynak yönetimi savaşın parçasıdır.
// ─────────────────────────────────────────────────────────────────────────
export function buildRoom(level, roomIndex, squadSize = 6) {
  const entry = getDungeonEntry(level);
  const rooms = GAME_CONFIG.DUNGEON.ROOMS_PER_RUN;
  const isFinalRoom = roomIndex === rooms - 1;
  const budget = ROOM_BUDGET[Math.min(roomIndex, ROOM_BUDGET.length - 1)];

  if (!isFinalRoom) {
    // Bütçenin %60'ı öncüye, %40'ı iki refakatçiye
    const scout = buildMonster(level, squadSize, 'main', roomIndex, budget * 0.60);
    scout.name = `${entry.name} (Öncü)`;
    scout.actionsPerRound = Math.max(1, scout.actionsPerRound - 1);
    return {
      title: `Oda ${roomIndex + 1} — Öncü Devriye`,
      subtitle: `${entry.name} öncüsü ve iki refakatçisi yolunu kesiyor.`,
      units: [
        scout,
        buildMonster(level, squadSize, 'minion', 0, budget * 0.20),
        buildMonster(level, squadSize, 'minion', 1, budget * 0.20)
      ]
    };
  }

  const hasGuards = entry.isBoss || entry.isFloorGuard;
  const mainShare = hasGuards ? 0.78 : 1.0;
  const units = [buildMonster(level, squadSize, 'main', 0, budget * mainShare)];
  if (hasGuards) {
    units.push(buildMonster(level, squadSize, 'minion', 0, budget * 0.11));
    units.push(buildMonster(level, squadSize, 'minion', 1, budget * 0.11));
  }
  return {
    title: entry.isBoss ? `👑 ${entry.bossLabel}: ${entry.name}` : `Oda ${roomIndex + 1} — ${entry.name}`,
    subtitle: entry.isBoss
      ? 'Kadim muhafızları önce düşür — boss arka safta bekliyor.'
      : (entry.isFloorGuard ? 'Kat muhafızı ve korumaları.' : `${entry.name} son odada.`),
    units
  };
}

// Bir koşunun 3 odasını hazırlar
export function buildRun(level, squadSize = 6) {
  const rooms = [];
  for (let i = 0; i < GAME_CONFIG.DUNGEON.ROOMS_PER_RUN; i++) {
    rooms.push(buildRoom(level, i, squadSize));
  }
  return rooms;
}

// Haftalık kat modifikatörü — ISO hafta numarasına göre deterministik rotasyon
export function getWeeklyModifier(floor, now = Date.now()) {
  const week = Math.floor(now / (7 * 24 * 3600 * 1000));
  const mods = GAME_CONFIG.DUNGEON_MODIFIERS;
  const base = mods[(week + floor) % mods.length];

  return {
    ...base,
    onRoundStart({ allies, enemies, log, round }) {
      if (base.kind === 'dot' && round > 1) {
        [...allies, ...enemies].forEach(u => {
          if (u.hp <= 0) return;
          const d = base.magnitude;
          u.hp = Math.max(0, u.hp - d);
          u.damageTaken += d;
        });
        log.push({ type: 'modifierTick', text: `🌋 ${base.name}: tüm birimler ${base.magnitude} hasar aldı.` });
      }
      if (base.kind === 'allyBuff' && round === 1) {
        allies.forEach(u => u.statuses.push({ type: 'rage', turns: 99, magnitude: base.magnitude, stackable: false }));
        log.push({ type: 'modifierTick', text: `⭐ ${base.name}: ordunun saldırı gücü %${Math.round(base.magnitude * 100)} arttı.` });
      }
      if (base.kind === 'armorCut' && round === 1) {
        [...allies, ...enemies].forEach(u => { u.armor = Math.round(u.armor * (1 - base.magnitude)); });
        log.push({ type: 'modifierTick', text: `⚙️ ${base.name}: tüm zırhlar %${Math.round(base.magnitude * 100)} azaldı.` });
      }
    }
  };
}

// World Boss birimi — haftalık, paylaşılan, fazlı
export function buildWorldBoss(bossHp, bossAtk, squadSize = 18) {
  return createUnit({
    uid: 'world_boss',
    name: 'Kadim Kıyamet Behemoth\'u',
    icon: '🌋',
    cls: 'guardian',
    level: 30,
    maxHp: bossHp,
    hp: bossHp,
    atk: bossAtk,
    armor: 140,
    speed: 12,
    element: 'fire',
    row: 'front',
    abilities: ['cleave', 'sunder', 'swoop', 'terrify'],
    abilityCooldown: 2,
    actionsPerRound: Math.max(3, Math.min(8, Math.round(squadSize / 2.5))),
    side: 'enemy'
  });
}
