// v1.27 — Piyango balina koruması, zindan günlük giriş kuralları ve kota paneli
import assert from 'node:assert/strict';

globalThis.localStorage = {
  store: {},
  getItem(k) { return this.store[k] ?? null; },
  setItem(k, v) { this.store[k] = String(v); },
  removeItem(k) { delete this.store[k]; },
  clear() { this.store = {}; }
};

const { GameStateManager } = await import('../js/gameState.js');
const { ammMarket } = await import('../js/ammMarket.js');
const { globalPool } = await import('../js/globalPool.js');
const { treasury } = await import('../js/treasury.js');
const { GAME_CONFIG } = await import('../js/config.js');
const { renderQuotaTracker, renderDungeonEntryLadder } = await import('../js/ui/limits.js');

const fresh = () => {
  localStorage.clear();
  ammMarket.resetPools();
  globalPool.vanillaReset();
  treasury.reset();
  return new GameStateManager();
};
const nextWeek = () => { globalPool.state.epochId = (globalPool.state.epochId || 1) + 1; };
let passed = 0;
const ok = (name) => { passed++; console.log(`✅ ${name}`); };

const L = GAME_CONFIG.CARNIVAL.LOTTERY;
const WEEK = L.MAX_TICKETS_PER_ACCOUNT;
const HELD = L.MAX_HELD_TICKETS;

// 1) Haftalık alım sınırı: tek seferde de parça parça da aşılamaz
{
  const gs = fresh();
  gs.state.adAstraBalance = 10_000_000;
  assert.equal(gs.buyLotteryTickets(WEEK + 1).success, false, 'Sınırın üstü tek seferde alınamamalı');
  assert.equal(gs.buyLotteryTickets(WEEK - 1).success, true);
  assert.equal(gs.buyLotteryTickets(1).success, true);
  const r = gs.buyLotteryTickets(1);
  assert.equal(r.success, false, 'Haftalık sınır dolunca alım reddedilmeli');
  assert.match(r.message, /haftada en fazla/);
  assert.equal(gs.getLotteryStatus().canBuy, 0);
  ok(`Piyango: hesap başı haftalık ${WEEK} bilet sınırı`);
}

// 2) Elde tutma sınırı: haftalarca biriktirerek kasayı emmek mümkün değil
{
  const gs = fresh();
  gs.state.adAstraBalance = 100_000_000;
  let weeks = 0;
  while (weeks < 20) {
    const st = gs.getLotteryStatus();
    if (st.canBuy > 0) gs.buyLotteryTickets(st.canBuy);
    nextWeek();
    weeks++;
  }
  const st = gs.getLotteryStatus();
  assert.equal(st.myTickets, HELD, `20 haftada bile en fazla ${HELD} bilet tutulabilmeli`);
  assert.ok(st.weekLeft > 0, 'Yeni haftada haftalık sınır açık olmalı');
  assert.equal(st.canBuy, 0, 'Elde tutma sınırı doluyken alım kapalı olmalı');
  const r = gs.buyLotteryTickets(1);
  assert.equal(r.success, false);
  assert.match(r.message, /elinde en fazla/);
  // En büyük olası ödül sınırlı: kasanın küçük bir kısmı
  assert.ok(st.potentialPrize <= HELD * L.TICKET_COST_ADA * L.WINNER_MULTIPLIER);
  assert.ok(st.potentialPrize / L.SEED_POOL_ADA < 0.01, 'Tek kazanç tohum kasanın %1\'ini geçmemeli');
  ok(`Piyango: devreden biletlerle birlikte en fazla ${HELD} bilet tutulur, ödül sınırlı`);
}

// 3) Çark parçaları elde tutma sınırını delemez (çark gerçekten çevrilir, ödül parçaya sabitlenir)
{
  const rewards = GAME_CONFIG.CARNIVAL.WHEEL_REWARDS;
  const total = rewards.reduce((s, r) => s + (r.weight || 1), 0);
  let cum = 0;
  for (const r of rewards) { if (r.type === 'ticket_shard') break; cum += r.weight; }
  const realRandom = Math.random;
  const spinShard = (gs) => {
    Math.random = () => (cum + 0.5) / total;
    try { return gs.spinCarnivalWheel('ada'); } finally { Math.random = realRandom; }
  };

  const gs = fresh();
  gs.state.adAstraBalance = 10_000;
  gs.state.lotteryTickets = HELD;
  gs.state.wheelTicketShards = 2;
  assert.equal(spinShard(gs).success, true);
  assert.equal(gs.state.lotteryTickets, HELD, 'Sınır doluyken parça bilete dönüşmemeli');
  assert.equal(gs.state.wheelTicketShards, 3, 'Parça kaybolmamalı, beklemeli');

  gs.state.lotteryTickets = HELD - 1;
  assert.equal(spinShard(gs).success, true);
  assert.equal(gs.state.lotteryTickets, HELD, 'Yer açılınca bekleyen parçalar bilete dönüşmeli');
  ok('Piyango: çark parçaları sınırın üstünde bilete dönüşmez, bekler');
}

// 4) Temsili diğer oyuncular da aynı sınıra uyar
{
  const gs = fresh();
  for (let i = 0; i < 30; i++) gs.simulateOtherLotteryBuyers();
  const maxSim = Math.max(...gs.getLotterySimHolders().map(h => h.tickets));
  assert.ok(maxSim <= HELD, `Temsili oyuncu ${maxSim} bilet tutmamalı`);
  ok('Piyango: temsili oyuncular da elde tutma sınırına uyar');
}

// 5) Zindan: 1. giriş ücretsiz ve aşınmasız, 2–5 aşınmalı, 6+ harçlı
{
  const gs = fresh();
  gs.state.adAstraBalance = 100_000;
  gs.state.stamina = 1000;
  const lvl = 3;
  const cost = gs.getDungeonStaminaCost(lvl, 2);

  const t1 = gs.getDungeonEntryTerms(lvl, false, 2);
  assert.equal(t1.nextIsFirstFree, true);
  assert.equal(t1.staminaCost, 0, 'İlk giriş stamina harcamamalı');
  const e1 = gs.beginDungeonEntry(lvl, false, { soldierCount: 2 });
  assert.equal(e1.success, true);
  assert.equal(e1.rewarded, true);
  assert.equal(e1.firstFree, true);
  assert.equal(e1.weaponWear, false, 'İlk girişte silah aşınmamalı');
  assert.equal(gs.state.stamina, 1000, 'İlk girişte stamina düşmemeli');

  for (let n = 2; n <= 5; n++) {
    const before = gs.state.stamina;
    const e = gs.beginDungeonEntry(lvl, false, { soldierCount: 2 });
    assert.equal(e.success, true);
    assert.equal(e.entryNumber, n);
    assert.equal(e.rewarded, true, `${n}. giriş harçsız ödüllü olmalı`);
    assert.equal(e.fee, 0);
    assert.equal(e.weaponWear, true, `${n}. girişte silah aşınmalı`);
    assert.equal(before - gs.state.stamina, cost, `${n}. girişte stamina harcanmalı`);
  }

  const t6 = gs.getDungeonEntryTerms(lvl, false, 2);
  assert.equal(t6.nextNeedsFee, true, '6. girişte harç devreye girmeli');
  assert.ok(t6.fee > 0);
  const training = gs.beginDungeonEntry(lvl, false, { soldierCount: 2 });
  assert.equal(training.rewarded, false, 'Harç ödenmezse antrenman');
  const adaBefore = gs.state.adAstraBalance;
  const paid = gs.beginDungeonEntry(lvl, false, { soldierCount: 2, payGateFee: true });
  assert.equal(paid.rewarded, true);
  assert.equal(adaBefore - gs.state.adAstraBalance, t6.fee, 'Harç bakiyeden düşmeli');
  assert.equal(gs.getDungeonDayStatus().entriesToday, 7);
  ok('Zindan: 1. giriş ücretsiz/aşınmasız, 2–5 aşınmalı, 6+ harçlı');
}

// 6) Zindan: stamina yetmezse giriş sayılmaz; ilk giriş staminasız da yapılabilir
{
  const gs = fresh();
  gs.state.stamina = 0;
  const e1 = gs.beginDungeonEntry(5, false, { soldierCount: 3 });
  assert.equal(e1.success, true, 'Ücretsiz ilk giriş stamina gerektirmemeli');
  const e2 = gs.beginDungeonEntry(5, false, { soldierCount: 3 });
  assert.equal(e2.success, false, 'Stamina yoksa ikinci giriş reddedilmeli');
  assert.equal(gs.getDungeonDayStatus().entriesToday, 1, 'Reddedilen giriş sayılmamalı');
  // Harç yetmezse stamina harcanmadan reddedilir
  const gs2 = fresh();
  gs2.state.stamina = 1000;
  gs2.state.adAstraBalance = 0;
  gs2.state.dailyCounters = { ...gs2.getDailyCounters(), dungeonEntries: 5, dungeonRuns: 5 };
  const r = gs2.beginDungeonEntry(5, false, { soldierCount: 1, payGateFee: true });
  assert.equal(r.success, false);
  assert.equal(gs2.state.stamina, 1000, 'Harç reddinde stamina geri alınmış olmalı (hiç düşmemeli)');
  ok('Zindan: reddedilen giriş sayılmaz, stamina boşa harcanmaz');
}

// 7) Silah aşınması: yalnız savaşa girenlerin silahı 1 düşer
{
  const gs = fresh();
  gs.state.soldierUnits = [
    { name: 'A', equipment: { weapon: { durability: 13, maxDurability: 13 } } },
    { name: 'B', equipment: { weapon: { durability: 5, maxDurability: 13 } } }
  ];
  const worn = gs.applyDungeonWeaponWear([1]);
  assert.equal(worn.length, 1);
  assert.equal(gs.state.soldierUnits[0].equipment.weapon.durability, 13);
  assert.equal(gs.state.soldierUnits[1].equipment.weapon.durability, 4);
  ok('Zindan: silah aşınması yalnız savaşa giren askere uygulanır');
}

// 8) Eski kayıt: toplam giriş sayacı yoksa ödüllü + harçlı girişlerden türetilir
{
  const gs = fresh();
  const c = gs.getDailyCounters();
  delete c.dungeonEntries;
  c.dungeonRuns = 2;
  c.dungeonPaidEntries = 1;
  const st = gs.getDungeonDayStatus();
  assert.equal(st.entriesToday, 3);
  assert.equal(st.nextIsFirstFree, false);
  ok('Zindan: eski kayıtlarla uyumlu giriş sayacı');
}

// 9) Kota paneli ve giriş basamakları hatasız üretilir
{
  const gs = fresh();
  const html = renderQuotaTracker({ gameState: gs, globalPool, config: GAME_CONFIG });
  for (const s of ['quota-tracker', 'day-strip', 'Zümrüt Meşe Odunu', 'Piyango: bu hafta aldığın bilet', 'Kolezyum maçı', 'entry-ladder']) {
    assert.ok(html.includes(s), `Panelde "${s}" olmalı`);
  }
  assert.ok(!/NaN|undefined|Infinity/.test(html), 'Panelde NaN/undefined/Infinity olmamalı');
  const ladder = renderDungeonEntryLadder({ freeTotal: 5, entriesToday: 2 });
  assert.equal((ladder.match(/is-done/g) || []).length, 2);
  assert.equal((ladder.match(/is-current/g) || []).length, 1);
  ok('Kota paneli: tüm bölümler hatasız üretiliyor');
}

console.log(`\n${passed} v1.27 testi geçti.`);
