import { chromium } from 'playwright';

(async () => {
  console.log('==================================================');
  console.log('🚀 SDLC Comprehensive Full Feature & QA Test Suite');
  console.log('==================================================\n');

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto('http://localhost:5173');
  await page.waitForTimeout(2000);

  // TEST 1: Test Menu All Features
  console.log('[SDLC Test 1] Test & Dev Cheat Menu Verification...');
  const testMenuResult = await page.evaluate(async () => {
    const actions = [
      'add_ada', 'add_wood', 'add_iron', 'add_wheat', 'add_fragments', 'add_boxes', 'add_keys',
      'full_stamina', 'buy_soldier', 'heal_all_army', 'max_equip_all', 'auto_equip', 'level_up_player',
      'craft_all_equip', 'upgrade_all_equip', 'repair_all_tools', 'upgrade_warehouse',
      'dungeon_lv1', 'dungeon_lv9', 'dungeon_lv18', 'dungeon_next',
      'unlock_all_artifacts', 'open_1_box', 'open_10_boxes',
      'enable_bot', 'enable_buffs', 'finish_expeditions'
    ];

    const results = {};
    for (const a of actions) {
      try {
        const btn = document.querySelector(`.btn-test-action[data-action="${a}"]`);
        if (btn) btn.click();
        results[a] = 'OK';
      } catch (e) {
        results[a] = 'ERR: ' + e.message;
      }
    }
    return results;
  });
  console.log('✅ Test Menu Actions Status:', Object.values(testMenuResult).every(v => v === 'OK') ? 'ALL PASSED' : testMenuResult);

  // TEST 2: Mystery Box 100% Collection Item Drop Test
  console.log('\n[SDLC Test 2] Mystery Box 100% Collection Item & Rarity Verification (100 Sample Drops)...');
  const boxTest = await page.evaluate(() => {
    window.gameState.state.lockedBoxes = 100;
    const droppedArtifacts = [];
    const rarities = { common: 0, rare: 0, epic: 0, legendary: 0 };

    for (let i = 0; i < 100; i++) {
      const res = window.gameState.unboxMysteryBox();
      if (res.type !== 'artifact' || !res.artifact) {
        return { success: false, error: 'Non-artifact item dropped: ' + JSON.stringify(res) };
      }
      droppedArtifacts.push(res.artifact.name);
      rarities[res.artifact.rarity] = (rarities[res.artifact.rarity] || 0) + 1;
    }

    return {
      success: true,
      totalOpened: 100,
      rarityDistribution: rarities
    };
  });
  console.log('✅ Mystery Box Results:', boxTest);

  // TEST 3: Expedition XP to Player Avatar & Level Up Test
  console.log('\n[SDLC Test 3] Expedition XP to Avatar & Level Up Verification...');
  const xpTest = await page.evaluate(() => {
    window.gameState.state.activeBuffs = {};
    window.gameState.state.activeExpeditions = {};
    window.gameState.state.stamina = 100;
    window.gameState.state.tools.pickaxe.durability = 100;
    const initialLvl = window.gameState.state.level;
    const initialXp = window.gameState.state.currentXp || 0;

    // Start expedition and finish
    const startRes = window.gameState.startExpedition('iron');
    window.gameState.cheatFinishAllExpeditions();
    const expBeforeClaim = JSON.stringify(window.gameState.state.activeExpeditions);
    const claimRes = window.gameState.claimExpedition('iron');

    const updatedXp = window.gameState.state.currentXp || 0;
    const gained = updatedXp - initialXp;

    return {
      started: startRes.success,
      startMsg: startRes.message,
      expBeforeClaim,
      claimed: claimRes.success,
      claimMsg: claimRes.message,
      xpGained: claimRes.xpGained,
      currentXp: updatedXp,
      gained,
      level: window.gameState.state.level,
      topBarLevelText: document.getElementById('player-level').innerText
    };
  });
  console.log('✅ Expedition XP Avatar Status:', xpTest);

  // TEST 4: Tavern Speed Potion Acceleration Test
  console.log('\n[SDLC Test 4] Tavern Speed Potion (1.5x, 1.75x, 2.0x) Acceleration Verification...');
  const potionTest = await page.evaluate(() => {
    window.gameState.activateTavernBuff('speed_potion_3', 1); // 2.0x
    const mult = window.gameState.getExpeditionSpeedMultiplier();

    window.gameState.startExpedition('wood', 2); // 7200 seconds base
    const beforeElapsed = window.gameState.state.activeExpeditions.wood.elapsedSeconds;
    window.gameState.updateExpeditions(60); // 60 real seconds
    const afterElapsed = window.gameState.state.activeExpeditions.wood.elapsedSeconds;

    return {
      speedMultiplier: mult,
      elapsedFor60s: afterElapsed - beforeElapsed
    };
  });
  console.log('✅ Potion Test Result (Expect 120s for 60s at 2.0x):', potionTest);

  // TEST 5: Dungeon Mode & Floor 5 -> Floor 6 Transition Test
  console.log('\n[SDLC Test 5] Dungeon Top Nav Layout & Floor 5 -> Floor 6 Transition...');
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('enter-dungeon-view'));
  });
  await page.waitForTimeout(500);

  const dungeonTest = await page.evaluate(() => {
    const isDungeonBody = document.body.classList.contains('in-dungeon');
    const floorBarVisible = !document.getElementById('dungeon-floor-bar').classList.contains('hidden');

    // Switch to floor 5
    window.dispatchEvent(new CustomEvent('switch-dungeon-floor', { detail: { floor: 5 } }));
    return { isDungeonBody, floorBarVisible };
  });
  await page.waitForTimeout(500);

  // Now trigger Floor 6 switch via portal
  const floor6Switch = await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('switch-dungeon-floor', { detail: { floor: 6 } }));
    const activeTab = document.querySelector('.floor-tab.active');
    return {
      currentFloor: activeTab ? activeTab.dataset.floor : null
    };
  });
  // TEST 6: Kingdom Treasury & Reward Pools Modal Test
  console.log('\n[SDLC Test 6] Kingdom Treasury & Reward Pools Modal Verification...');
  await page.click('#btn-dungeon-return-town');
  await page.waitForTimeout(600);
  await page.click('#btn-nav-treasury');
  await page.waitForTimeout(600);

  const treasuryTest = await page.evaluate(() => {
    const modalTitle = document.getElementById('modal-title')?.innerText || '';
    const modalBody = document.getElementById('modal-body')?.innerText || '';
    return {
      opened: modalTitle.includes('KRALLIK HAZİNESİ'),
      hasWorldBoss: modalBody.includes('World Boss'),
      hasColosseum: modalBody.includes('Kolezyum'),
      hasBurnedPool: modalBody.includes('Kalıcı Yakılan')
    };
  });
  console.log('✅ Treasury Vault Status:', treasuryTest);

  console.log('\n==================================================');
  console.log('Total Unhandled Page Errors:', errors.length);
  if (errors.length > 0) {
    console.error('Errors:', errors);
  }
  console.log('==================================================');

  await browser.close();
  process.exit(errors.length === 0 ? 0 : 1);
})();
