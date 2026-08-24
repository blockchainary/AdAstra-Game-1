// Zindan denge kalibrasyonu — beklenen ilerleme profiline karşı 18 seviye
import { GAME_CONFIG } from './adastra/js/config.js';
import { createUnit, simulateBattle } from './adastra/js/combat.js';
import { buildRun, getWeeklyModifier, getDungeonEntry } from './adastra/js/bestiary.js';

const COMP = ['guardian', 'ranger', 'paladin', 'mage'];

// Beklenen oyuncu profili: zindan seviyesi D'de kaç asker, hangi seviyede,
// kaç parça ve hangi seviyede teçhizatla. Erken oyunda teçhizat henüz yoktur —
// parça (fragment) ancak zindandan düşer, yani ekipman zindanla birlikte büyür.
function profile(D) {
  return {
    count: Math.min(18, 3 + Math.floor(D * 0.85)),
    solLevel: Math.max(1, D),
    eqPieces: Math.max(0, Math.min(5, Math.floor((D - 1) / 2))),
    eqLevel: Math.max(1, Math.min(10, Math.ceil((D - 2) / 2)))
  };
}

function equipBonus(eqLevel, pieces) {
  if (pieces <= 0) return { atk: 0, hp: 0 };
  const m = 1 + (eqLevel - 1) * 0.35;
  const slots = ['weapon', 'armor', 'helmet', 'legs', 'boots'].slice(0, pieces);
  let atk = 0, hp = 0;
  for (const k of slots) {
    const r = GAME_CONFIG.EQUIPMENT_RECIPES[k];
    atk += Math.round(r.baseAtk * m);
    hp += Math.round(r.baseHp * m);
  }
  const setB = pieces >= 5 ? 1.25 : pieces >= 4 ? 1.12 : pieces >= 2 ? 1.05 : 1;
  return { atk: Math.round(atk * setB), hp: Math.round(hp * setB) };
}

function buildSquad(D, { comp = COMP, gearOffset = 0, countOffset = 0 } = {}) {
  const p = profile(D);
  const count = Math.max(1, p.count + countOffset);
  const eb = equipBonus(
    Math.max(1, Math.min(10, p.eqLevel + gearOffset)),
    Math.max(0, p.eqPieces + (gearOffset < 0 ? -2 : 0))
  );
  const units = [];
  for (let i = 0; i < count; i++) {
    const clsId = comp[i % comp.length];
    const c = GAME_CONFIG.COMBAT_CLASSES[clsId];
    const baseHp = 100 + 15 * (p.solLevel - 1);
    const baseAtk = 20 + 5 * (p.solLevel - 1);
    units.push(createUnit({
      uid: `a${i}`, name: `${c.name} #${i + 1}`, cls: clsId, level: p.solLevel,
      maxHp: Math.round((baseHp + eb.hp) * c.hpMult),
      atk: Math.round((baseAtk + eb.atk) * c.atkMult),
      element: ['fire', 'nature', 'ice'][i % 3],
      side: 'ally'
    }));
  }
  return units;
}

// Bir koşuyu 3 oda boyunca oynar; odalar arası iyileşme yok
function runOnce(D, opts, seed) {
  const squad = buildSquad(D, opts);
  const entry = getDungeonEntry(D);
  const mod = getWeeklyModifier(entry.floor, 0);
  const rooms = buildRun(D, squad.length);
  for (let r = 0; r < rooms.length; r++) {
    const res = simulateBattle({
      allies: squad, enemies: rooms[r].units,
      seed: (seed * 7919 + r * 104729) >>> 0,
      modifier: r === 0 ? mod : null
    });
    if (!res.victory) return { cleared: false, room: r, roundCount: res.roundCount };
    squad.forEach(u => { u.statuses = []; u.cooldown = 0; });
  }
  return { cleared: true, room: rooms.length, survivors: squad.filter(u => u.hp > 0).length, size: squad.length };
}

function rate(D, opts, n = 90) {
  let win = 0, sumSurv = 0, size = 0;
  for (let i = 0; i < n; i++) {
    const r = runOnce(D, opts, i + 1);
    if (r.cleared) { win++; sumSurv += r.survivors; size = r.size; }
  }
  return { pct: Math.round((win / n) * 100), survivors: win ? +(sumSurv / win).toFixed(1) : 0, size };
}

console.log('═══ ZİNDAN DENGE TABLOSU (3 odalık koşu, odalar arası iyileşme yok) ═══');
console.log('Lv | tip        | ordu | beklenen | eksik teçhizat | az asker | tek-sınıf');
for (let D = 1; D <= 18; D++) {
  const e = getDungeonEntry(D);
  const tip = e.isBoss ? 'BOSS      ' : e.isFloorGuard ? 'kat muhafızı' : 'normal    ';
  const base = rate(D, {});
  const under = rate(D, { gearOffset: -3 }, 60);
  const few = rate(D, { countOffset: -Math.ceil(profile(D).count / 2) }, 60);
  const mono = rate(D, { comp: ['guardian'] }, 60);
  console.log(
    String(D).padStart(2) + ' | ' + tip + ' | ' + String(base.size).padStart(4) +
    ' | %' + String(base.pct).padStart(3) + ' (kalan ' + String(base.survivors).padStart(4) + ')' +
    ' | %' + String(under.pct).padStart(3) +
    ' | %' + String(few.pct).padStart(3) +
    ' | %' + String(mono.pct).padStart(3)
  );
}
