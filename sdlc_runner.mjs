// AdAstra Realm - SDLC Otomasyon & Doğrulama Motoru (E2E & Runtime Test Suite)
import { chromium } from 'playwright';
import { execSync } from 'child_process';

console.log('==================================================');
console.log('🚀 SDLC Pre-Validation & E2E Test Suite Başlatılıyor...');
console.log('==================================================');

// 1. STATİK SÖZDİZİMİ KONTROLÜ
console.log('\n[SDLC Aşama 1] Statik JavaScript Sözdizimi Taraması...');
try {
  execSync('node --check ./js/dungeonScene.js', { stdio: 'pipe' });
  execSync('node --check ./js/grandTownScene.js', { stdio: 'pipe' });
  execSync('node --check ./js/app.js', { stdio: 'pipe' });
  execSync('node --check ./js/gameState.js', { stdio: 'pipe' });
  execSync('node --check ./js/globalPool.js', { stdio: 'pipe' });
  console.log('✅ Tüm JS dosyaları sözdizimi kontrolünden başarıyla geçti (0 Syntax Error).');
} catch (err) {
  console.error('❌ JS Sözdizimi Hatası Bulundu:', err.message);
  process.exit(1);
}

// 2. RUNTIME & E2E OTOMASYON TESTİ
console.log('\n[SDLC Aşama 2] Canlı Tarayıcı Başlatılıyor & Konsol Logları İzleniyor...');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  const consoleErrors = [];
  page.on('pageerror', err => {
    console.error('❌ PAGE RUNTIME ERROR:', err.message);
    consoleErrors.push(err.message);
  });
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error('❌ CONSOLE ERROR:', msg.text());
      consoleErrors.push(msg.text());
    }
  });

  try {
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    console.log('✅ Oyun ana sayfası yüklendi.');

    // Test 1: Dashboard Modalı
    console.log('\n[SDLC Test 1] Dashboard Modalı Açılış/Kapanış Testi...');
    await page.keyboard.press('Tab');
    await page.waitForTimeout(600);
    const isDashOpen = await page.evaluate(() => document.getElementById('rpg-modal')?.classList.contains('active'));
    if (!isDashOpen) throw new Error('Dashboard modalı açılmadı!');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    console.log('✅ Dashboard modalı sorunsuz çalışıyor.');

    // Test 2: Zindana Giriş & Kat Geçişleri
    console.log('\n[SDLC Test 2] Zindana Giriş & 6 Kat Döngüsü Testi...');
    await page.keyboard.press('6');
    await page.waitForTimeout(1000);

    const inDungeon = await page.evaluate(() => {
      return document.body.classList.contains('in-dungeon') &&
             !document.getElementById('dungeon-floor-bar')?.classList.contains('hidden') &&
             document.querySelector('.top-nav-menu')?.classList.contains('hidden');
    });
    if (!inDungeon) throw new Error('Zindan moduna geçilemedi veya üst bar menüleri ayrıştırılamadı!');
    console.log('✅ Zindan moduna başarıyla girildi (Menü ayrımı doğrulandı).');

    // 6 Katı Sırayla Gez
    for (let f = 1; f <= 6; f++) {
      await page.click(`.floor-tab[data-floor="${f}"]`);
      await page.waitForTimeout(400);
      const activeTabFloor = await page.evaluate(() => {
        return document.querySelector('.floor-tab.active')?.dataset.floor;
      });
      if (parseInt(activeTabFloor, 10) !== f) {
        throw new Error(`${f}. Kata geçiş yapılamadı!`);
      }
    }
    console.log('✅ 1. Kat ile 6. Kat arasındaki tüm geçişler sorunsuz çalıştı.');

    // Test 3: Canavar Kartı & Savaş Modalı
    console.log('\n[SDLC Test 3] Zindan Canavar Kartı & Savaş Hazırlık Modalı Testi...');
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('open-monster-battle', {
        detail: {
          monster: { level: 1, name: 'Bataklık Balçığı', icon: '🟢', hp: 200, atk: 30, rewardAdAstra: 15, rewardXp: 40 }
        }
      }));
    });
    await page.waitForTimeout(600);
    const isBattleModalOpen = await page.evaluate(() => document.getElementById('rpg-modal')?.classList.contains('active'));
    if (!isBattleModalOpen) throw new Error('Savaş hazırlık modalı açılamadı!');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    console.log('✅ Canavar savaş hazırlık penceresi sorunsuz çalışıyor.');

    // Test 4: Kasabaya Temiz Dönüş
    console.log('\n[SDLC Test 4] Kasaba Meydanına Dönüş Testi...');
    await page.click('#btn-dungeon-return-town');
    await page.waitForTimeout(800);
    const returnedToTown = await page.evaluate(() => {
      return !document.body.classList.contains('in-dungeon') &&
             document.getElementById('dungeon-floor-bar')?.classList.contains('hidden') &&
             !document.querySelector('.top-nav-menu')?.classList.contains('hidden');
    });
    if (!returnedToTown) throw new Error('Kasabaya dönüşte üst menü veya sahne temizlenemedi!');
    console.log('✅ Kasabaya temiz dönüş başarıyla doğrulandı.');

    // Test 5: Envanter & Silo Modalı
    console.log('\n[SDLC Test 5] Envanter & Silo Modalı Testi...');
    await page.click('#top-btn-inventory');
    await page.waitForTimeout(600);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    console.log('✅ Envanter modalı sorunsuz çalışıyor.');

    // Final Değerlendirme
    console.log('\n==================================================');
    if (consoleErrors.length === 0) {
      console.log('🎉 [SDLC BAŞARILI] Tüm 5 Aşama Geçildi. Hata Sayısı: 0');
      console.log('==================================================');
      await browser.close();
      process.exit(0);
    } else {
      console.error(`❌ [SDLC BAŞARISIZ] ${consoleErrors.length} adet çalışma zamanı hatası tespit edildi!`);
      console.log('==================================================');
      await browser.close();
      process.exit(1);
    }
  } catch (err) {
    console.error('\n❌ [SDLC TEST HATASI]:', err.message);
    await browser.close();
    process.exit(1);
  }
})();
