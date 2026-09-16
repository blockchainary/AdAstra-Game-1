import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve('C:/Users/AlphAvax/.gemini/antigravity-ide/scratch/adastra-realm');

test('🖱️ Harita & Zindan Hover Tooltip ve El (Pointer) İmleci Doğrulama Testi', async (t) => {
  await t.test('1. index.html içinde sadece 1 adet phaser-game-container bulunmalı (duplike olmamalı)', () => {
    const html = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf-8');
    const matches = html.match(/id=["']phaser-game-container["']/g) || [];
    assert.strictEqual(matches.length, 1, 'index.html içinde tam olarak 1 adet phaser-game-container olmalıdır');
  });

  await t.test('2. grandTownScene.js içinde fare imleci (pointer cursor) ve doğru viewport koordinatları yer almalı', () => {
    const sceneCode = fs.readFileSync(path.join(projectRoot, 'js/grandTownScene.js'), 'utf-8');
    assert.ok(sceneCode.includes("setDefaultCursor('pointer')"), 'Bina hover anında pointer cursor ayarlanmalıdır');
    assert.ok(sceneCode.includes("setDefaultCursor('default')"), 'Bina pointerout anında default cursor ayarlanmalıdır');
    assert.ok(sceneCode.includes("tooltipCy + canvasTop"), 'Tooltip Y koordinatına üst bar offseti (canvasTop) eklenmelidir');
  });

  await t.test('3. dungeonScene.js içinde zindan canavar ve portal hover imleci ile koordinatları doğrulanmalı', () => {
    const sceneCode = fs.readFileSync(path.join(projectRoot, 'js/dungeonScene.js'), 'utf-8');
    assert.ok(sceneCode.includes("setDefaultCursor('pointer')"), 'Zindan oda/portal hover anında pointer cursor ayarlanmalıdır');
    assert.ok(sceneCode.includes("pointer.y + canvasTop - 45"), 'Zindan tooltip Y koordinatına canvasTop eklenmelidir');
  });

  await t.test('4. style.css içinde #phaser-game-container 92px üst boşluğa hizalanmış olmalı', () => {
    const css = fs.readFileSync(path.join(projectRoot, 'css/style.css'), 'utf-8');
    assert.ok(css.includes('top: 92px'), 'Container top: 92px kuralına sahip olmalıdır');
    assert.ok(css.includes('height: calc(100vh - 92px)'), 'Container tam ekran boyutu 92px düşülerek hesaplanmalıdır');
  });
});
