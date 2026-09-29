// Kayıt güvenliği: bozuk kayıt yedekten açılır, silinmez; yazma hatası oyunu durdurmaz.
import assert from 'node:assert/strict';

globalThis.localStorage = {
  store: {},
  failWrites: false,
  getItem(k) { return this.store[k] ?? null; },
  setItem(k, v) {
    if (this.failWrites) { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; }
    this.store[k] = String(v);
  },
  removeItem(k) { delete this.store[k]; },
  clear() { this.store = {}; }
};

const { readJSON, writeJSON, removeJSON, consumeStorageEvents, BACKUP_SUFFIX, CORRUPT_SUFFIX } = await import('../js/storage.js');
const { GameStateManager } = await import('../js/gameState.js');
const { globalPool } = await import('../js/globalPool.js');
const { ammMarket } = await import('../js/ammMarket.js');
const { treasury } = await import('../js/treasury.js');

let passed = 0;
const ok = (name) => { passed++; console.log(`✅ ${name}`); };
const KEY = 'adastra_player_save_v6';

// 1) Başarılı yükleme son sağlam yedeği oluşturur
{
  localStorage.clear(); consumeStorageEvents();
  writeJSON('k', { a: 1 });
  const r = readJSON('k');
  assert.deepEqual(r.data, { a: 1 });
  assert.equal(r.source, 'main');
  assert.equal(localStorage.getItem('k' + BACKUP_SUFFIX), JSON.stringify({ a: 1 }));
  ok('Başarılı yüklemede son sağlam yedek alınır');
}

// 2) Bozuk kayıt yedekten açılır, bozuk kopya saklanır
{
  localStorage.clear(); consumeStorageEvents();
  const gs = new GameStateManager();
  gs.state.adAstraBalance = 123456;
  gs.state.level = 7;
  gs.saveState();
  new GameStateManager(); // yükleme → yedek oluşur
  localStorage.store[KEY] = '{"adAstraBalance": 99, bozuk';
  const gs2 = new GameStateManager();
  assert.equal(gs2.state.adAstraBalance, 123456, 'Yedekteki bakiye geri gelmeli');
  assert.equal(gs2.state.level, 7);
  assert.equal(localStorage.getItem(KEY + CORRUPT_SUFFIX), '{"adAstraBalance": 99, bozuk', 'Bozuk kayıt silinmemeli');
  const evs = consumeStorageEvents();
  assert.ok(evs.some(e => e.type === 'recovered' && e.key === KEY));
  gs2.saveState();
  assert.equal(JSON.parse(localStorage.getItem(KEY)).adAstraBalance, 123456, 'Sonraki kayıt sağlam veriyi yazmalı');
  ok('Bozuk kayıt son sağlam yedekten açılır, bozuk kopya korunur');
}

// 3) Yedek de yoksa yeni profil açılır ama bozuk kayıt yine korunur
{
  localStorage.clear(); consumeStorageEvents();
  localStorage.store[KEY] = 'null';
  const gs = new GameStateManager();
  assert.equal(gs.state.level, 1);
  assert.equal(localStorage.getItem(KEY + CORRUPT_SUFFIX), 'null');
  assert.ok(consumeStorageEvents().some(e => e.type === 'lost'));
  ok('Yedek yoksa yeni profil açılır, bozuk kayıt saklanır');
}

// 4) Dünya, AMM ve hazine kayıtları da bozulursa yedekten açılır
{
  localStorage.clear(); consumeStorageEvents();
  ammMarket.resetPools(); globalPool.vanillaReset(); treasury.reset();
  globalPool.state.totalSpent = 777; globalPool.saveState();
  ammMarket.pools.wood.adAstraReserve = 4242; ammMarket.savePools();
  treasury.state.pools.dungeon = 555; treasury.save();
  // yükleme → yedekler
  globalPool.loadState(); ammMarket.loadPools(); treasury.load();
  for (const k of [globalPool.storageKey, ammMarket.storageKey, treasury.storageKey]) localStorage.store[k] = '{bozuk';
  assert.equal(globalPool.loadState().totalSpent, 777);
  assert.equal(ammMarket.loadPools().wood.adAstraReserve, 4242);
  assert.equal(treasury.load().pools.dungeon, 555);
  ok('Dünya, AMM ve hazine kayıtları da yedekten kurtarılır');
}

// 5) Sıfırlama yedeği de siler (eski ilerleme geri gelmez)
{
  localStorage.clear(); consumeStorageEvents();
  const gs = new GameStateManager();
  gs.state.level = 9; gs.saveState();
  new GameStateManager();
  assert.ok(localStorage.getItem(KEY + BACKUP_SUFFIX));
  removeJSON(KEY);
  assert.equal(localStorage.getItem(KEY + BACKUP_SUFFIX), null);
  ok('Sıfırlama ana kaydı ve yedeği birlikte siler');
}

// 6) Depolama dolu: kaydetme hata fırlatmaz, olay bildirilir
{
  localStorage.clear(); consumeStorageEvents();
  const gs = new GameStateManager();
  localStorage.failWrites = true;
  assert.doesNotThrow(() => gs.saveState());
  assert.doesNotThrow(() => globalPool.saveState());
  localStorage.failWrites = false;
  assert.ok(consumeStorageEvents().some(e => e.type === 'write-failed'));
  ok('Depolama doluyken kaydetme oyunu durdurmaz, oyuncuya bildirilir');
}

console.log(`\n${passed} kayıt güvenliği testi geçti.`);
