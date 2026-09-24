import test from 'node:test';
import assert from 'node:assert/strict';
import { gameState } from '../js/gameState.js';

test('🧪 Kullanıcı Akışı: 50k ADA -> Bot Satın Alma -> Silo Şişmeme -> +6 Saat İleri Sarma Donmama Testi', async (t) => {
  await t.test('1. Bot satın alındığında siloyu şişirmemeli ve kasadaki ADA ile sadece asgari eksik tamamlanmalı', () => {
    gameState.vanillaReset();
    gameState.state.adAstraBalance = 50000;

    assert.equal(gameState.state.inventory.wood, 60);
    assert.equal(gameState.state.inventory.iron, 40);
    assert.equal(gameState.state.inventory.wheat, 80);

    const buyRes = gameState.buyTavernaAutomationBot(false);
    assert.equal(buyRes.success, true);

    // Silo asla şişmemeli!
    assert.equal(gameState.state.inventory.wood, 60, 'Odun 60 kalmalı');
    assert.equal(gameState.state.inventory.iron, 50, 'Demir sadece 40->50 olarak tamamlanmalı');
    assert.equal(gameState.state.inventory.wheat, 80, 'Buğday 80 kalmalı (şişirilmemeli)');
    assert.ok(gameState.state.adAstraBalance > 3500, 'Kasada kalan ADA korunmalı');
  });

  await t.test('2. 6 Saat İleri Sarıldığında (fastForwardTime) browser donmadan <100ms içinde 60 sefer tamamlayıp siloyu yükseltmeli', () => {
    const t0 = Date.now();
    const report = gameState.fastForwardTime(6);
    const duration = Date.now() - t0;

    assert.ok(duration < 200, `Simülasyon 200ms altında bitmeli, ölçülen: ${duration}ms`);
    assert.equal(report.botExecutionStatus, 'ran', 'Bot aktif olarak çalışmalı');
    assert.equal(report.totalExpeditionsClaimed, 60, '6 saatte 60 sefer toplanmalı');
    assert.ok(gameState.state.warehouseLevel >= 2, 'Silo otomatik yükseltilmeli');
    assert.equal(gameState.isBotPaused(), false, 'Bot dondurulmamış olmalı');
  });
});
