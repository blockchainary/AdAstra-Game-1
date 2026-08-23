// =============================================================================
// AdAstra Realm - Otonom Uçtan Uca (E2E) Test & Hata Avcısı
// Playwright ile gerçek Chromium tarayıcısında TÜM oyun döngüsünü simüle eder.
// =============================================================================
import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:5173';
const results = [];
const consoleErrors = [];
let currentPhase = 'boot';

function logResult(name, status, detail = '') {
  results.push({ name, status, detail, phase: currentPhase });
  const icon = status === 'PASS' ? '✅' : status === 'WARN' ? '⚠️' : '❌';
  console.log(`${icon} [${currentPhase}] ${name}${detail ? ' — ' + detail : ''}`);
}
function setPhase(p) {
  currentPhase = p;
  console.log(`\n========== FAZ: ${p} ==========`);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 950 } });

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Vite HMR / Phaser WebGL fallback gürültüsünü filtrele
      if (/Failed to load resource.*favicon/i.test(text)) return;
      consoleErrors.push({ phase: currentPhase, text });
    }
  });
  page.on('pageerror', (err) => {
    consoleErrors.push({ phase: currentPhase, text: 'PAGEERROR: ' + err.message + '\n' + (err.stack || '') });
  });

  // ---------------------------------------------------------------------
  // Yardımcı Fonksiyonlar
  // ---------------------------------------------------------------------
  // ÖNEMLİ: Vite dev sunucusu, kaynak dosyalar diskte değiştiğinde (HMR)
  // import yollarına "?t=<timestamp>" önbellek-kırıcı sorgu ekler. app.js'in
  // GERÇEK olarak kullandığı gameState.js URL'si buysa, düz "/js/gameState.js"
  // ile yapılan bağımsız bir import() FARKLI bir GameStateManager singleton'ı
  // oluşturur (aynı sınıf ama ayrı bellek/localStorage senkronizasyonu) ve
  // UI tıklamalarıyla yapılan değişiklikler test tarafında GÖRÜNMEZ olur.
  // Bu yüzden app.js'in gerçekte kullandığı çözümlenmiş modül yollarını
  // kaynağından ayrıştırıp, referansları window üzerinde BİR KEZ önbelleğe
  // alıyoruz; böylece test kodu her zaman uygulamanın gerçek singleton'larına
  // erişir.
  const resolveTestModules = async () => {
    await page.evaluate(async () => {
      const src = await fetch('/js/app.js').then(r => r.text());
      const grab = (name) => {
        const m = src.match(new RegExp(`from ["'](/js/${name}\\.js[^"']*)["']`));
        return m ? m[1] : `/js/${name}.js`;
      };
      const [gs, amm, gp, cfg] = await Promise.all([
        import(grab('gameState')),
        import(grab('ammMarket')),
        import(grab('globalPool')),
        import(grab('config')),
      ]);
      window.__test = { gameState: gs.gameState, ammMarket: amm.ammMarket, globalPool: gp.globalPool, GAME_CONFIG: cfg.GAME_CONFIG };
    });
  };

  // Sayfa içi modül fonksiyon çağırıcı (gerçek gameState singleton'ına erişir)
  const evalState = async (body, args = {}) => {
    return await page.evaluate(({ body, args }) => {
      const { gameState, ammMarket, globalPool, GAME_CONFIG } = window.__test;
      // eslint-disable-next-line no-new-func
      const fn = new Function('gameState', 'ammMarket', 'globalPool', 'GAME_CONFIG', 'args', body);
      return fn(gameState, ammMarket, globalPool, GAME_CONFIG, args);
    }, { body, args });
  };

  const openDev = async () => {
    await page.keyboard.press('t');
    await page.waitForSelector('#dev-modal:not(.hidden)', { timeout: 3000 });
  };
  const closeDev = async () => {
    const isOpen = await page.locator('#dev-modal:not(.hidden)').count();
    if (isOpen) await page.click('#btn-close-dev-modal');
    await page.waitForTimeout(100);
  };
  const clickDevAction = async (action, extra = '') => {
    await openDev();
    await page.click(`[data-dev-action="${action}"]${extra}`);
    await page.waitForTimeout(150);
    await closeDev();
  };
  const modalText = async () => await page.textContent('#modal-body').catch(() => '');
  const isModalOpen = async () => !!(await page.locator('#rpg-modal.active').count());
  const closeModal = async () => {
    if (await isModalOpen()) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(150);
    }
  };
  const lastToast = async () => {
    return await page.evaluate(() => {
      const toasts = document.querySelectorAll('#toast-container .toast, #toast-container > div');
      if (!toasts.length) return null;
      return toasts[toasts.length - 1].textContent;
    });
  };

  // =========================================================================
  setPhase('0-boot');
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);
  logResult('Oyun sayfası & Phaser motoru yüklendi', (await page.title()) ? 'PASS' : 'FAIL');

  // =========================================================================
  setPhase('1-baslangic-durumu');
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);
  await resolveTestModules();

  const initState = await evalState(`return {
    level: gameState.state.level,
    xp: gameState.state.currentXp,
    ada: gameState.state.adAstraBalance,
    stamina: gameState.state.stamina,
    tools: gameState.state.tools,
    equipment: gameState.state.equipment,
    soldierUnitsCount: gameState.state.soldierUnits.length
  }`);
  logResult('Seviye 1 ile başlıyor', initState.level === 1 ? 'PASS' : 'FAIL', `level=${initState.level}`);
  logResult('Stamina 100/100 ile başlıyor', initState.stamina === 100 ? 'PASS' : 'FAIL', `stamina=${initState.stamina}`);
  logResult('Aletler %100 (13/13 karşılığı) sağlam başlıyor', (initState.tools.axe.durability === 100 && initState.tools.pickaxe.durability === 100 && initState.tools.sickle.durability === 100) ? 'PASS' : 'FAIL');
  logResult('Başlangıç bakiyesi düşük/sıfıra yakın (ekonomi dengesi)', initState.ada <= 250 ? 'PASS' : 'WARN', `ada=${initState.ada}`);
  logResult('18 kişilik asker rosteri (soldierUnits) hazır geliyor', initState.soldierUnitsCount === 18 ? 'PASS' : 'FAIL', `count=${initState.soldierUnitsCount}`);
  logResult('5 ekipman yuvası (silah/miğfer/zırh/pantolon/bot) boş başlıyor', Object.values(initState.equipment).every(v => v === null) ? 'PASS' : 'FAIL');

  // =========================================================================
  setPhase('2-klavye-kisayollari-ve-modaller');
  const shortcuts = [
    ['1', 'Zümrüt Ormanı'], ['2', 'Maden Ocağı'], ['3', 'Güneş Tarlası'],
    ['4', 'ASKERİ KIŞLA'], ['5', 'AMM Pazar'], ['7', 'GLADYATÖR KOLEZYUMU'],
    ['q', 'Krallık Görevleri'], ['e', 'KARAKTER GELİŞİMİ']
  ];
  for (const [key, expectedText] of shortcuts) {
    await page.keyboard.press(key);
    await page.waitForTimeout(300);
    const opened = await isModalOpen();
    const txt = opened ? await page.textContent('#rpg-modal') : '';
    const ok = opened && txt.includes(expectedText);
    logResult(`Kısayol '${key.toUpperCase()}' doğru modalı açıyor`, ok ? 'PASS' : 'FAIL', ok ? '' : `beklenen: "${expectedText}"`);
    await closeModal();
  }
  const stillClosed = !(await isModalOpen());
  logResult('Esc tuşu tüm modalleri kapatıyor', stillClosed ? 'PASS' : 'FAIL');

  // S/I/F/B/M/C alternatif kısayolları da dene
  const altShortcuts = ['s', 'i', 'f', 'b', 'm', 'c'];
  let altOk = true;
  for (const key of altShortcuts) {
    await page.keyboard.press(key);
    await page.waitForTimeout(200);
    if (!(await isModalOpen())) altOk = false;
    await closeModal();
  }
  logResult('Alternatif kısayollar (S/I/F/B/M/C) çalışıyor', altOk ? 'PASS' : 'FAIL');

  await page.keyboard.press('6');
  await page.waitForTimeout(1200);
  const dungeonEntered = !!(await page.locator('#dungeon-floor-bar:not(.hidden)').count());
  logResult("Kısayol '6'/D zindana giriş yapıyor", dungeonEntered ? 'PASS' : 'FAIL');
  if (dungeonEntered) {
    await page.click('#btn-dungeon-return-town').catch(() => {});
    await page.waitForTimeout(500);
  }

  await openDev();
  logResult("Kısayol 'T' geliştirici panelini açıyor", (await page.locator('#dev-modal:not(.hidden)').count()) ? 'PASS' : 'FAIL');
  await closeDev();

  // =========================================================================
  setPhase('3-sefer-stamina-xp-level');
  // Yeterli hammadde/ADA ver
  await clickDevAction('add-wood', '[data-amount="50000"]');
  await clickDevAction('add-iron', '[data-amount="50000"]');
  await clickDevAction('add-wheat', '[data-amount="50000"]');
  await clickDevAction('add-adastra', '[data-amount="100000"]');

  const staminaBefore = await evalState('return gameState.state.stamina');
  // 3 sefer başlat: Odun (1), Demir (2), Buğday (3)
  await page.keyboard.press('1');
  await page.waitForTimeout(300);
  await page.click('.btn-modal-start[data-node="wood"]');
  await page.waitForTimeout(300);
  await closeModal();

  await page.keyboard.press('2');
  await page.waitForTimeout(300);
  await page.click('.mine-tab-btn[data-tab="mining"]').catch(() => {});
  await page.click('.btn-modal-start[data-node="iron"]');
  await page.waitForTimeout(300);
  await closeModal();

  await page.keyboard.press('3');
  await page.waitForTimeout(300);
  await page.click('.btn-modal-start[data-node="wheat"]');
  await page.waitForTimeout(300);
  await closeModal();

  const afterStart = await evalState(`return {
    stamina: gameState.state.stamina,
    activeCount: Object.keys(gameState.state.activeExpeditions).length
  }`);
  logResult('3 sefer aynı anda başlatıldı', afterStart.activeCount === 3 ? 'PASS' : 'FAIL', `active=${afterStart.activeCount}`);
  const expectedStaminaCost = await evalState('return gameState.getExpeditionStaminaCost() * 3');
  const staminaDrop = staminaBefore - afterStart.stamina;
  // Küçük tolerans: gerçek UI tıklamaları arasında geçen sürede doğal stamina yenilenmesi de işliyor
  logResult('Stamina doğru miktarda düştü', Math.abs(staminaDrop - expectedStaminaCost) < 1 ? 'PASS' : 'FAIL', `düşen=${staminaDrop}, beklenen=${expectedStaminaCost}`);

  // Erken Claim (⚡) Testi: Lv1'de gerçek süre ~18 saniye, birkaç saniye bekleyip erken toplamayı dene
  await page.waitForTimeout(7000);
  await page.keyboard.press('1');
  await page.waitForTimeout(300);
  const partialBtnEnabled = await page.locator('.btn-modal-partial-claim[data-node="wood"]:not([disabled])').count();
  logResult('Erken Toplama (⚡) butonu zaman geçince aktifleşiyor', partialBtnEnabled ? 'PASS' : 'FAIL');
  if (partialBtnEnabled) {
    const woodBefore = await evalState('return gameState.state.inventory.wood');
    await page.click('.btn-modal-partial-claim[data-node="wood"]');
    await page.waitForTimeout(300);
    const woodAfter = await evalState('return gameState.state.inventory.wood');
    logResult('Erken toplama envantere kaynak ekliyor', woodAfter > woodBefore ? 'PASS' : 'FAIL', `${woodBefore} -> ${woodAfter}`);
  }
  await closeModal();

  // Seferlerin tamamlanmasını bekle ve tam Claim yap
  await page.waitForTimeout(14000);
  const xpBefore = await evalState('return gameState.state.currentXp');
  await clickDevAction('claim-expeditions');
  const afterClaim = await evalState(`return {
    xp: gameState.state.currentXp,
    activeCount: Object.keys(gameState.state.activeExpeditions).length,
    wood: gameState.state.inventory.wood,
    iron: gameState.state.inventory.iron,
    wheat: gameState.state.inventory.wheat
  }`);
  logResult('Tüm seferler toplandı (aktif sefer kalmadı)', afterClaim.activeCount === 0 ? 'PASS' : 'FAIL');
  logResult('Sefer sonrası XP kazanıldı', afterClaim.xp > xpBefore ? 'PASS' : 'FAIL', `${xpBefore} -> ${afterClaim.xp}`);

  // Seviye Atlama 1 -> 81 (Gerçek levelUp() akışı bir kez UI üzerinden, sonra dev ile 81'e)
  await evalState(`gameState.state.currentXp = 999999; gameState.saveState();`);
  await clickDevAction('add-wood', '[data-amount="50000"]');
  await page.keyboard.press('e');
  await page.waitForTimeout(300);
  await page.click('#btn-modal-levelup');
  await page.waitForTimeout(300);
  const lvl2State = await evalState('return { level: gameState.state.level, maxStamina: gameState.getMaxStamina() }');
  logResult('Gerçek UI ile Seviye 1 -> 2 atlama başarılı', lvl2State.level === 2 ? 'PASS' : 'FAIL', `level=${lvl2State.level}`);
  logResult('Seviye atlayınca max stamina arttı (120)', lvl2State.maxStamina === 120 ? 'PASS' : 'FAIL', `maxStamina=${lvl2State.maxStamina}`);
  await closeModal();

  await openDev();
  await page.click('[data-dev-action="set-level"][data-level="81"]');
  await page.waitForTimeout(200);
  await closeDev();
  const lvl81 = await evalState(`return {
    level: gameState.state.level,
    durationHours: gameState.getExpeditionDurationHours(),
    maxStamina: gameState.getMaxStamina()
  }`);
  logResult('Seviye 81 (MAX) ayarlandı', lvl81.level === 81 ? 'PASS' : 'FAIL', `level=${lvl81.level}`);
  logResult('Lv81 sefer süresi 72 saat', lvl81.durationHours === 72 ? 'PASS' : 'FAIL', `duration=${lvl81.durationHours}`);
  logResult('Lv81 max stamina 1700', lvl81.maxStamina === 1700 ? 'PASS' : 'FAIL', `maxStamina=${lvl81.maxStamina}`);

  // Buğday ile stamina doldurma testi
  await evalState(`gameState.state.stamina = 10; gameState.state.inventory.wheat = 1000; gameState.saveState();`);
  await page.keyboard.press('e');
  await page.waitForTimeout(300);
  const wheatBeforeRefill = await evalState('return gameState.state.inventory.wheat');
  await page.click('#btn-wheat-stamina-refill');
  await page.waitForTimeout(300);
  const afterRefill = await evalState('return { stamina: gameState.state.stamina, wheat: gameState.state.inventory.wheat }');
  logResult('Buğday ile stamina doldurma çalışıyor', afterRefill.stamina > 10 ? 'PASS' : 'FAIL', `stamina=${afterRefill.stamina}`);
  logResult('Buğday ile doldurma envanterden buğday harcıyor', afterRefill.wheat < wheatBeforeRefill ? 'PASS' : 'FAIL', `${wheatBeforeRefill} -> ${afterRefill.wheat}`);
  await closeModal();

  // Doğal Yenilenme testi
  await evalState(`gameState.state.stamina = 50; gameState.saveState();`);
  await page.waitForTimeout(4000);
  const naturalRegen = await evalState('return gameState.state.stamina');
  logResult('Doğal stamina yenilenmesi zamanla artıyor', naturalRegen > 50 ? 'PASS' : 'FAIL', `50 -> ${naturalRegen}`);

  // =========================================================================
  setPhase('4-alet-asinmasi-ve-tamir');
  await evalState(`
    gameState.state.level = 1;
    gameState.state.stamina = 100;
    gameState.state.tools.axe.durability = 100;
    gameState.state.activeExpeditions = {};
    gameState.state.inventory.wood = 50000;
    gameState.state.inventory.iron = 50000;
    gameState.saveState();
  `);
  // Baltayı 4 sefer ile 100 -> 0 aşındır (her seferde -25)
  for (let i = 0; i < 4; i++) {
    await evalState(`gameState.startExpedition('wood');`);
    await evalState(`gameState.completeAllExpeditionsNow();`);
    await evalState(`gameState.claimExpedition('wood');`);
  }
  const wornAxe = await evalState('return gameState.state.tools.axe.durability');
  logResult('Balta 4 seferde 100 -> 0 aşınıyor (-25/sefer)', wornAxe === 0 ? 'PASS' : 'FAIL', `durability=${wornAxe}`);

  // Kırık aletle sefer başlatma engellenmeli
  await page.keyboard.press('1');
  await page.waitForTimeout(300);
  const startDisabled = await page.locator('.btn-modal-start[data-node="wood"][disabled]').count();
  logResult('Kırık aletle yeni sefer başlatma engelleniyor (buton disabled)', startDisabled ? 'PASS' : 'FAIL');

  // Yetersiz kaynakla tamir denemesi
  await evalState(`gameState.state.inventory.wood = 0; gameState.state.inventory.iron = 0; gameState.state.adAstraBalance = 0; gameState.saveState();`);
  await page.keyboard.press('1');
  await page.waitForTimeout(300);
  const repairDisabledInsufficient = await page.locator('.btn-modal-repair[data-tool="axe"]').first();
  const repairBtnText = await repairDisabledInsufficient.textContent().catch(() => '');
  await evalState(`gameState.state.inventory.wood = 100; gameState.state.inventory.iron = 100; gameState.state.adAstraBalance = 0; gameState.saveState();`);
  await page.keyboard.press('1');
  await page.waitForTimeout(300);
  await page.click('.btn-modal-repair[data-tool="axe"]');
  await page.waitForTimeout(300);
  const toastAfterFailedRepair = await lastToast();
  const durabilityStillZero = await evalState('return gameState.state.tools.axe.durability');
  logResult('Yetersiz ADA ile tamir reddediliyor (hata mesajı + durability değişmiyor)', durabilityStillZero === 0 ? 'PASS' : 'FAIL', toastAfterFailedRepair || '');
  await closeModal();

  // Yeterli kaynakla tamir
  await evalState(`gameState.state.inventory.wood = 100; gameState.state.inventory.iron = 100; gameState.state.adAstraBalance = 1000; gameState.saveState();`);
  await page.keyboard.press('1');
  await page.waitForTimeout(300);
  await page.click('.btn-modal-repair[data-tool="axe"]');
  await page.waitForTimeout(300);
  const durabilityAfterRepair = await evalState('return gameState.state.tools.axe.durability');
  logResult('Yeterli hammadde + ADA ile tamir başarılı (100/100)', durabilityAfterRepair === 100 ? 'PASS' : 'FAIL', `durability=${durabilityAfterRepair}`);
  await closeModal();

  // =========================================================================
  setPhase('5-amm-pazari-4-kaynak');
  await evalState(`gameState.state.adAstraBalance = 100000; gameState.state.inventory.fragments = 1000; gameState.saveState();`);
  const resources = ['wood', 'iron', 'wheat'];
  for (const res of resources) {
    await page.keyboard.press('5');
    await page.waitForTimeout(300);
    await page.click('.market-tab-btn[data-tab="resources"]').catch(() => {});
    await page.waitForTimeout(200);

    const priceBefore = await evalState(`return ammMarket.getPrice('${res}')`);
    const adaBefore = await evalState('return gameState.state.adAstraBalance');
    const invBefore = await evalState(`return gameState.state.inventory.${res}`);

    await page.fill(`.amm-buy-qty[data-res="${res}"]`, '5000');
    await page.waitForTimeout(150);
    await page.click(`.btn-amm-confirm-buy[data-res="${res}"]`);
    await page.waitForTimeout(300);

    const adaAfterBuy = await evalState('return gameState.state.adAstraBalance');
    const invAfterBuy = await evalState(`return gameState.state.inventory.${res}`);
    const priceAfterBuy = await evalState(`return ammMarket.getPrice('${res}')`);

    logResult(`AMM: ${res} satın alma bakiyeyi düşürüyor`, adaAfterBuy < adaBefore ? 'PASS' : 'FAIL', `${adaBefore.toFixed(1)} -> ${adaAfterBuy.toFixed(1)}`);
    logResult(`AMM: ${res} satın alma envantere ekliyor (+5000)`, (invAfterBuy - invBefore) === 5000 ? 'PASS' : 'FAIL', `${invBefore} -> ${invAfterBuy}`);
    logResult(`AMM: ${res} satın alma sonrası fiyat kayması (slippage) yukarı`, priceAfterBuy > priceBefore ? 'PASS' : 'FAIL', `${priceBefore.toFixed(6)} -> ${priceAfterBuy.toFixed(6)}`);

    // Satış
    await page.waitForTimeout(200);
    await page.fill(`.amm-sell-qty[data-res="${res}"]`, '2000');
    await page.waitForTimeout(150);
    const adaBeforeSell = await evalState('return gameState.state.adAstraBalance');
    await page.click(`.btn-amm-confirm-sell[data-res="${res}"]`);
    await page.waitForTimeout(300);
    const adaAfterSell = await evalState('return gameState.state.adAstraBalance');
    logResult(`AMM: ${res} satış bakiyeyi artırıyor`, adaAfterSell > adaBeforeSell ? 'PASS' : 'FAIL', `${adaBeforeSell.toFixed(1)} -> ${adaAfterSell.toFixed(1)}`);
  }

  // Bakiye kontrolü: yetersiz ADA ile alış reddedilmeli
  await evalState(`gameState.state.adAstraBalance = 0; gameState.saveState();`);
  await page.keyboard.press('5');
  await page.waitForTimeout(300);
  await page.fill('.amm-buy-qty[data-res="wood"]', '999999999');
  await page.waitForTimeout(150);
  const invBeforeBadBuy = await evalState('return gameState.state.inventory.wood');
  await page.click('.btn-amm-confirm-buy[data-res="wood"]');
  await page.waitForTimeout(300);
  const invAfterBadBuy = await evalState('return gameState.state.inventory.wood');
  logResult('AMM: Yetersiz bakiye ile büyük alış engelleniyor', invAfterBadBuy === invBeforeBadBuy ? 'PASS' : 'FAIL', `${invBeforeBadBuy} -> ${invAfterBadBuy}`);
  await closeModal();

  // Parça (fragments) ticareti sekmesi
  await evalState(`gameState.state.adAstraBalance = 100000; gameState.state.inventory.fragments = 500; gameState.saveState();`);
  await page.keyboard.press('5');
  await page.waitForTimeout(300);
  await page.click('.market-tab-btn[data-tab="fragments"]');
  await page.waitForTimeout(300);
  const fragCardVisible = await page.locator('.amm-card[data-res="fragments"]').count();
  logResult('AMM: Parça Ticareti sekmesi açılıyor ve havuz kartı render ediliyor', fragCardVisible ? 'PASS' : 'FAIL');
  if (fragCardVisible) {
    const fragBefore = await evalState('return gameState.state.inventory.fragments');
    await page.click('.btn-amm-confirm-buy[data-res="fragments"]');
    await page.waitForTimeout(300);
    const fragAfter = await evalState('return gameState.state.inventory.fragments');
    logResult('AMM: Parça satın alma çalışıyor', fragAfter > fragBefore ? 'PASS' : 'FAIL', `${fragBefore} -> ${fragAfter}`);
  }
  await closeModal();

  // =========================================================================
  setPhase('6-18-asker-rosteri-ve-ekipman');
  await evalState(`
    gameState.state.adAstraBalance = 1000000;
    gameState.state.inventory.fragments = 10000;
    gameState.state.inventory.iron = 100000;
    gameState.state.inventory.wood = 100000;
    gameState.state.equipment = { weapon: null, helmet: null, armor: null, legs: null, boots: null };
    gameState.saveState();
  `);

  await page.keyboard.press('4');
  await page.waitForTimeout(300);
  await page.click('.barracks-tab-btn[data-tab="equipment"]').catch(() => {});
  await page.waitForTimeout(200);

  const slots = ['weapon', 'helmet', 'armor', 'legs', 'boots'];
  for (const slot of slots) {
    await page.click(`.btn-craft-equipment[data-slot="${slot}"]`).catch(async () => {
      // Kışla açıldıktan sonra sekme kapanmış olabilir, tekrar aç
      await page.keyboard.press('4');
      await page.waitForTimeout(200);
      await page.click('.barracks-tab-btn[data-tab="equipment"]');
      await page.waitForTimeout(200);
      await page.click(`.btn-craft-equipment[data-slot="${slot}"]`);
    });
    await page.waitForTimeout(300);
  }
  const craftedState = await evalState(`return gameState.state.equipment`);
  const allCrafted = slots.every(s => craftedState[s] && craftedState[s].durability === 13);
  logResult('5 ekipman parçası dövüldü (13/13 dayanıklılık ile)', allCrafted ? 'PASS' : 'FAIL', JSON.stringify(Object.fromEntries(slots.map(s => [s, craftedState[s] ? craftedState[s].durability : null]))));

  // Askere kuşandırma & set bonusu testi
  await page.click('.barracks-tab-btn[data-tab="army"]');
  await page.waitForTimeout(300);
  await page.click('.btn-select-soldier-card[data-soldier-idx="0"]').catch(() => {});
  await page.waitForTimeout(200);

  const bonusAtEachStep = [];
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    const btn = page.locator(`.btn-soldier-equip-slot[data-soldier-idx="0"][data-slot="${slot}"]`);
    if (await btn.count()) {
      await btn.click();
      await page.waitForTimeout(250);
    }
    const bonus = await evalState('return gameState.getSoldierSetBonus(0)');
    bonusAtEachStep.push({ count: i + 1, bonus });
  }
  const bonus2 = bonusAtEachStep.find(b => b.count === 2);
  const bonus4 = bonusAtEachStep.find(b => b.count === 4);
  const bonus5 = bonusAtEachStep.find(b => b.count === 5);
  logResult('2 parça kuşanınca "İkili Küme Bonusu" aktifleşiyor', bonus2 && bonus2.bonus && bonus2.bonus.count >= 2 ? 'PASS' : 'FAIL', JSON.stringify(bonus2 && bonus2.bonus));
  logResult('4 parça kuşanınca "Dörtlü Küme Bonusu" aktifleşiyor', bonus4 && bonus4.bonus && bonus4.bonus.count >= 4 && bonus4.bonus.atkMultiplier === 1.12 ? 'PASS' : 'FAIL', JSON.stringify(bonus4 && bonus4.bonus));
  logResult('5 parça (tam takım) kuşanınca "Şampiyon Bonusu" aktifleşiyor', bonus5 && bonus5.bonus && bonus5.bonus.count >= 5 && bonus5.bonus.atkMultiplier === 1.25 ? 'PASS' : 'FAIL', JSON.stringify(bonus5 && bonus5.bonus));

  // Çıkarma (Unequip) testi
  const unequipBtn = page.locator('.btn-soldier-unequip-slot[data-soldier-idx="0"][data-slot="weapon"]');
  if (await unequipBtn.count()) {
    await unequipBtn.click();
    await page.waitForTimeout(250);
    const afterUnequip = await evalState(`return { soldierHasWeapon: !!gameState.state.soldierUnits[0].equipment.weapon, invHasWeapon: !!gameState.state.equipment.weapon }`);
    logResult('Askerden ekipman çıkarma çalışıyor (envantere geri dönüyor)', (!afterUnequip.soldierHasWeapon && afterUnequip.invHasWeapon) ? 'PASS' : 'FAIL', JSON.stringify(afterUnequip));
  } else {
    logResult('Askerden ekipman çıkarma butonu bulunamadı', 'FAIL');
  }
  await closeModal();

  // =========================================================================
  setPhase('7-kolezyum-gladyator-duellosu');
  await evalState(`gameState.state.adAstraBalance = 500000; gameState.saveState();`);
  await page.keyboard.press('7');
  await page.waitForTimeout(300);
  // Birkaç asker satın al (18v18 arenanın rakip mangasına karşı test amaçlı)
  for (let i = 0; i < 3; i++) {
    await page.click('.btn-modal-buytroop[data-troop="knight"]').catch(() => {});
    await page.waitForTimeout(200);
    await page.keyboard.press('7');
    await page.waitForTimeout(200);
  }
  const arenaKeysBefore = await evalState('return gameState.state.arenaKeys');
  const startBtnCount = await page.locator('#btn-start-arena-battle').count();
  logResult('Kolezyum: 18v18 savaş ekranı ve başlat butonu render ediliyor', startBtnCount ? 'PASS' : 'FAIL');
  if (startBtnCount) {
    await page.click('#btn-start-arena-battle');
    await page.waitForTimeout(6500); // 10 tur x 550ms
    const logText = await page.textContent('#arena-combat-log').catch(() => '');
    const battleEnded = /ZAFER|BOZGUN/.test(logText);
    logResult('Kolezyum: Savaş turları işleyip bir sonuçla bitiyor (Zafer/Bozgun)', battleEnded ? 'PASS' : 'FAIL', logText.slice(0, 80));
  }
  await closeModal();

  // =========================================================================
  setPhase('8-6-katli-zindan');
  await evalState(`gameState.setDungeonProgress(1); gameState.state.army = { infantry: 20, archer: 20, knight: 20 }; gameState.saveState();`);
  await page.keyboard.press('6');
  await page.waitForTimeout(1200);

  const scaleX = 1600 / 2400;
  const scaleY = 950 / 1350;
  const clickDungeonZone = async (px, py) => {
    await page.mouse.click(px * scaleX, py * scaleY);
    await page.waitForTimeout(500);
  };
  const fightAndClose = async () => {
    const fightBtn = page.locator('#btn-start-dungeon-fight');
    if (!(await fightBtn.count())) return { opened: false };
    await fightBtn.click();
    await page.waitForTimeout(3500); // 5 tur x 600ms
    const logText = await page.textContent('#battle-live-log').catch(() => '');
    await page.click('#btn-start-dungeon-fight').catch(() => {}); // "KAPAT VE DEVAM ET" / "GERİ ÇEKİL"
    await page.waitForTimeout(300);
    await closeModal();
    return { opened: true, logText };
  };

  // 1. Kat, 1. Canavar (Bataklık Balçığı, Lv.1)
  await clickDungeonZone(340, 550);
  const monsterModalOpened = await isModalOpen();
  logResult('Zindan: 1.Kat canlı canavar bölgesine tıklayınca savaş modalı açılıyor', monsterModalOpened ? 'PASS' : 'FAIL');
  const f1 = await fightAndClose();
  const victoryText1 = /ZAFER/.test(f1.logText || '');
  logResult('Zindan: 1.Kat canavarı yenildi (güçlü ordu ile)', victoryText1 ? 'PASS' : 'FAIL', (f1.logText || '').replace(/<[^>]+>/g, ' ').slice(0, 100));
  const progressAfterF1 = await evalState('return gameState.state.dungeonProgress');
  logResult('Zindan: Canavar yenilince bir sonraki seviyenin kilidi açılıyor', progressAfterF1 === 2 ? 'PASS' : 'FAIL', `dungeonProgress=${progressAfterF1}`);

  // Ara Boss'a (Kat 3, Lv.9 - Kadim Taş Golyat) dev panelinden atla
  await openDev();
  await page.selectOption('#dev-select-target', 'dungeon');
  await page.fill('#dev-input-custom-val', '9');
  await page.click('#btn-dev-custom-set');
  await page.waitForTimeout(200);
  await closeDev();

  await page.click('.floor-tab[data-floor="3"]');
  await page.waitForTimeout(600);
  const arenaKeysBeforeBoss = await evalState('return gameState.state.arenaKeys');
  await clickDungeonZone(1690, 420); // Sağ slot: Kadim Taş Golyat (ARA BOSS)
  const bossModalOpened = await isModalOpen();
  const bossModalTitle = await page.textContent('#modal-title').catch(() => '');
  logResult('Zindan: ARA BOSS (3.Kat, Lv.9) bölgesine tıklayınca savaş açılıyor', bossModalOpened && /GOLYAT/i.test(bossModalTitle), bossModalTitle);
  const fBoss = await fightAndClose();
  const arenaKeysAfterBoss = await evalState('return gameState.state.arenaKeys');
  logResult('Zindan: Ara Boss yenilince 🔑 Arena Anahtarı kazanılıyor', arenaKeysAfterBoss > arenaKeysBeforeBoss ? 'PASS' : 'FAIL', `${arenaKeysBeforeBoss} -> ${arenaKeysAfterBoss}`);

  // Büyük Boss'a (Kat 6, Lv.18 - Kıyamet Ejderhası IGNIS) dev panelinden atla
  await openDev();
  await page.selectOption('#dev-select-target', 'dungeon');
  await page.fill('#dev-input-custom-val', '18');
  await page.click('#btn-dev-custom-set');
  await page.waitForTimeout(200);
  await closeDev();

  await page.click('.floor-tab[data-floor="6"]');
  await page.waitForTimeout(600);
  await clickDungeonZone(1950, 450); // Sağ slot: Kıyamet Ejderhası IGNIS (BÜYÜK BOSS)
  const finalBossOpened = await isModalOpen();
  const finalBossTitle = await page.textContent('#modal-title').catch(() => '');
  logResult('Zindan: BÜYÜK BOSS (6.Kat, Lv.18 IGNIS) bölgesine tıklayınca savaş açılıyor', finalBossOpened && /IGNIS/i.test(finalBossTitle), finalBossTitle);
  const fFinal = await fightAndClose();
  const progressAfterFinal = await evalState('return gameState.state.dungeonProgress');
  const finalVictory = /ZAFER/.test(fFinal.logText || '');
  logResult('Zindan: Büyük Boss (Lv.18) yenilince döngü sıfırlanıp 1.Kata dönüyor', finalVictory ? (progressAfterFinal === 1 ? 'PASS' : 'FAIL') : 'WARN', finalVictory ? `dungeonProgress=${progressAfterFinal}` : 'Boss savaşı kaybedildi (rastgele/ dengeye bağlı) — döngü sıfırlama test edilemedi');

  // Kilitli Sandık + Anahtar akışı
  await evalState(`gameState.state.lockedBoxes = 3; gameState.state.arenaKeys = Math.max(gameState.state.arenaKeys, 3); gameState.saveState();`);
  await page.click('#side-btn-boxes').catch(async () => { await page.keyboard.press('e'); });
  await page.waitForTimeout(300);
  const boxOpenBtn = page.locator('#btn-open-mystery-box');
  if (await boxOpenBtn.count()) {
    const boxesBefore = await evalState('return gameState.state.lockedBoxes');
    await boxOpenBtn.click();
    await page.waitForTimeout(300);
    const boxesAfter = await evalState('return gameState.state.lockedBoxes');
    const revealVisible = await page.locator('.box-reveal-card').count();
    logResult('📦 Kilitli Sandık: Anahtar ile açma çalışıyor ve ödül gösteriliyor', (boxesAfter === boxesBefore - 1 && revealVisible) ? 'PASS' : 'FAIL', `sandık: ${boxesBefore} -> ${boxesAfter}`);
  } else {
    logResult('📦 Kilitli Sandık: Aç butonu bulunamadı', 'FAIL');
  }
  await closeModal();

  // =========================================================================
  setPhase('9-taverna-ve-gorevler');
  await evalState(`gameState.state.adAstraBalance = 200000; gameState.state.activeBuffs = {}; gameState.saveState();`);
  const tavernBtn = page.locator('#top-btn-tavern');
  await tavernBtn.click().catch(async () => { await page.evaluate(() => window.dispatchEvent(new CustomEvent('open-town-modal', { detail: { zoneId: 'tavern', zoneName: 'Taverna' } }))); });
  await page.waitForTimeout(400);
  const tavernOpened = await isModalOpen();
  logResult('Taverna modalı açılıyor', tavernOpened ? 'PASS' : 'FAIL');

  if (tavernOpened) {
    // Fiyat etiketi ile gerçek tahsilat karşılaştırması (data-buff="speed_wood" kartı)
    const displayedPriceText = await page.locator('.btn-modal-buybuff[data-buff="speed_wood"]').textContent().catch(() => '');
    const configuredCost = await evalState(`return GAME_CONFIG.TAVERN_BUFFS.speed_wood.costAdAstra`);
    const adaBeforeBuff = await evalState('return gameState.state.adAstraBalance');
    await page.click('.btn-modal-buybuff[data-buff="speed_wood"]');
    await page.waitForTimeout(300);
    const adaAfterBuff = await evalState('return gameState.state.adAstraBalance');
    const actualCharged = adaBeforeBuff - adaAfterBuff;
    logResult('Taverna: "Kısa Darbe İksiri" satın alma UI etiketiyle gerçek ücret eşleşiyor mu?',
      Math.abs(actualCharged - parseFloat((displayedPriceText.match(/[\d.,]+/g) || ['0'])[0].replace(/\./g, '').replace(',', '.'))) < 1 ? 'PASS' : 'FAIL',
      `Etikette görünen: "${displayedPriceText.trim()}", gerçekte tahsil edilen: ${actualCharged} ADA (config: ${configuredCost} ADA)`);
    const buffActive = await evalState(`return gameState.isBuffActive('speed_wood')`);
    logResult('Taverna: Satın alınan güçlendirme 24 saatliğine aktifleşiyor', buffActive ? 'PASS' : 'FAIL');

    await page.keyboard.press('Escape');
    await tavernBtn.click().catch(() => {});
    await page.waitForTimeout(400);
    await page.click('#btn-inn-refill').catch(() => {});
    await page.waitForTimeout(300);
    const staminaFull = await evalState('return gameState.state.stamina >= gameState.getMaxStamina()');
    logResult('Taverna: ADA karşılığı anında stamina fullleme çalışıyor', staminaFull ? 'PASS' : 'FAIL');
  }
  await closeModal();

  // Günlük/Haftalık Görevler
  await page.keyboard.press('q');
  await page.waitForTimeout(300);
  const questModalOpened = await isModalOpen();
  logResult('Görevler modalı (Q) açılıyor', questModalOpened ? 'PASS' : 'FAIL');
  const questProgress = await evalState(`return gameState.state.questProgress || {}`);
  logResult('Önceki fazlarda yapılan eylemler görev ilerlemesine otomatik yansıyor', Object.values(questProgress).some(v => v > 0) ? 'PASS' : 'FAIL', JSON.stringify(questProgress));

  // Tüm günlük görevleri tamamlanacak şekilde zorla ilerlet, ödülü UI'dan topla
  await evalState(`
    (GAME_CONFIG.DAILY_QUESTS || []).forEach(q => { gameState.state.questProgress[q.id] = q.target; });
    gameState.saveState();
  `);
  await page.keyboard.press('q');
  await page.waitForTimeout(300);
  const claimableBtn = page.locator('.btn-claim-quest-reward:not([disabled])').first();
  if (await claimableBtn.count()) {
    const adaBeforeQuest = await evalState('return gameState.state.adAstraBalance');
    await claimableBtn.click();
    await page.waitForTimeout(300);
    const adaAfterQuest = await evalState('return gameState.state.adAstraBalance');
    logResult('Görev ödülü UI üzerinden başarıyla toplanıyor', adaAfterQuest > adaBeforeQuest ? 'PASS' : 'FAIL', `${adaBeforeQuest} -> ${adaAfterQuest}`);
  } else {
    logResult('Tamamlanmış görev ödül butonu bulunamadı', 'FAIL');
  }
  await closeModal();

  // Reset döngüsü: 24 saat öncesine tarihle, modalı yeniden aç ve otomatik sıfırlanmayı doğrula
  await evalState(`
    gameState.state.lastDailyQuestReset = Date.now() - (25 * 3600 * 1000);
    gameState.state.lastWeeklyQuestReset = Date.now() - (8 * 24 * 3600 * 1000);
    gameState.saveState();
  `);
  await page.keyboard.press('q');
  await page.waitForTimeout(300);
  const afterReset = await evalState(`return { progress: gameState.state.questProgress, claimed: gameState.state.claimedQuests }`);
  const allReset = Object.values(afterReset.progress).every(v => v === 0) && Object.values(afterReset.claimed).every(v => v === false || v === undefined);
  logResult('Günlük/Haftalık görevler 24s/7g sonra otomatik sıfırlanıyor', allReset ? 'PASS' : 'FAIL', JSON.stringify(afterReset));
  await closeModal();

  await browser.close();
  finalizeSummary();
}

function finalizeSummary() {
  console.log('\n\n========== ÖZET RAPOR ==========');
  const passCount = results.filter(r => r.status === 'PASS').length;
  const failCount = results.filter(r => r.status === 'FAIL').length;
  const warnCount = results.filter(r => r.status === 'WARN').length;
  console.log(`Toplam: ${results.length} | Geçti: ${passCount} | Kaldı: ${failCount} | Uyarı: ${warnCount}`);
  if (failCount) {
    console.log('\n--- BAŞARISIZ TESTLER ---');
    results.filter(r => r.status === 'FAIL').forEach(r => console.log(`❌ [${r.phase}] ${r.name} ${r.detail}`));
  }
  if (consoleErrors.length) {
    console.log(`\n--- YAKALANAN KONSOL/SAYFA HATALARI (${consoleErrors.length}) ---`);
    consoleErrors.forEach(e => console.log(`[${e.phase}] ${e.text}`));
  } else {
    console.log('\nKonsolda hiç JS hatası/istisna yakalanmadı. ✅');
  }
}

main().catch(err => {
  console.error('TEST SCRIPT ÇÖKTÜ:', err);
  finalizeSummary();
});
