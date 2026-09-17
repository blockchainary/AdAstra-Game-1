import test from 'node:test';
import assert from 'node:assert';
import { gameState } from '../js/gameState.js';

test('⚔️ Asker İsmi Değiştirme (Custom Soldier Naming) Testi', async (t) => {
  // Test öncesi state sıfırlama / asker oluşturma
  gameState.state.soldierUnits = [
    { id: 1, name: 'AdAstra Piyadesi', level: 1, hp: 100, maxHp: 100, baseAtk: 20, skills: ['shieldWall'] },
    { id: 2, name: 'AdAstra Okçusu', level: 10, hp: 120, maxHp: 120, baseAtk: 28, skills: ['shieldWall', 'shockwave'] }
  ];

  await t.test('1. Geçerli bir isimle askerin adı başarıyla güncellenmeli', () => {
    const res = gameState.renameSoldierUnit(0, 'Kuzey Muhafızı');
    assert.strictEqual(res.success, true);
    assert.strictEqual(gameState.state.soldierUnits[0].name, 'Kuzey Muhafızı');
    assert.strictEqual(res.oldName, 'AdAstra Piyadesi');
    assert.strictEqual(res.newName, 'Kuzey Muhafızı');
  });

  await t.test('2. Boş veya salt boşluktan oluşan isimler reddedilmeli', () => {
    const res = gameState.renameSoldierUnit(0, '   ');
    assert.strictEqual(res.success, false);
    assert.strictEqual(gameState.state.soldierUnits[0].name, 'Kuzey Muhafızı'); // değişmemeli
  });

  await t.test('3. 24 karakterden uzun isimler reddedilmeli', () => {
    const longName = 'BuCokUzunBirAskerIsmiOlduguIcinReddedilmeli';
    const res = gameState.renameSoldierUnit(0, longName);
    assert.strictEqual(res.success, false);
    assert.strictEqual(gameState.state.soldierUnits[0].name, 'Kuzey Muhafızı');
  });

  await t.test('4. Olmayan asker indeksi için hata dönmeli', () => {
    const res = gameState.renameSoldierUnit(99, 'Yeni İsim');
    assert.strictEqual(res.success, false);
  });
});
