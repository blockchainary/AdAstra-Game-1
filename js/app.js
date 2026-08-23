// AdAstra: Genesis Realm - Pixiland v2.7.0 Modern Controller
import { GAME_CONFIG } from './config.js';
import { gameState } from './gameState.js';
import { globalPool } from './globalPool.js';
import { ammMarket } from './ammMarket.js';
import { sound } from './audio.js';
import { GrandTownScene } from './grandTownScene.js';
import { DungeonScene } from './dungeonScene.js';

let speedMultiplier = 1;
let lastTickTime = performance.now();
let phaserGame = null;

// PHASE 2: GAMEFI & RPG EKONOMİSİ - MODAL SEKME & GEÇİCİ DURUM DEĞİŞKENLERİ
let barracksActiveTab = 'equipment';
let mineActiveTab = 'mining';
let marketActiveTab = 'resources';
let selectedSoldierIndex = 0;
let collectionActiveTab = 'koleksiyon';
let pendingCraftedItem = null;
let lastBoxResult = null;
let barracksLiveRefreshAccumulator = 0;

// DOM Referansları
const dom = {
  playerLevel: document.getElementById('player-level'),
  staminaText: document.getElementById('stamina-text'),
  adAstraBalance: document.getElementById('adastra-balance'),
  resWheat: document.getElementById('res-wheat'),
  resWood: document.getElementById('res-wood'),
  resIron: document.getElementById('res-iron'),
  resFish: document.getElementById('res-fish'),
  resFragments: document.getElementById('res-fragments'),
  btnDailyLimits: document.getElementById('btn-daily-limits'),
  profileBadgeBtn: document.getElementById('profile-badge-btn'),
  btnDockWorkers: document.getElementById('btn-dock-workers'),
  btnDockInventory: document.getElementById('btn-dock-inventory'),
  btnDockBarracks: document.getElementById('btn-dock-barracks'),
  btnDockMarket: document.getElementById('btn-dock-market'),
  btnDockMap: document.getElementById('btn-dock-map'),
  btnAudioToggle: document.getElementById('btn-audio-toggle'),
  btnDungeonReturnTown: document.getElementById('btn-dungeon-return-town'),

  // Sağ Menü Paneli (Realm Sidebar)
  sidebarCharacterCard: document.getElementById('sidebar-character-card'),
  sidebarPlayerLevel: document.getElementById('sidebar-player-level'),
  sidebarStaminaText: document.getElementById('sidebar-stamina-text'),
  sidebarStaminaFill: document.getElementById('sidebar-stamina-fill'),
  sidebarAdAstraBalance: document.getElementById('sidebar-adastra-balance'),
  sidebarAvaxBalance: document.getElementById('sidebar-avax-balance'),
  sidebarFragmentRate: document.getElementById('sidebar-fragment-rate'),
  sidebarBoxRate: document.getElementById('sidebar-box-rate'),
  sideBtnInventory: document.getElementById('side-btn-inventory'),
  sideBtnWorkers: document.getElementById('side-btn-workers'),
  sideBtnBarracks: document.getElementById('side-btn-barracks'),
  sideBtnColosseum: document.getElementById('side-btn-colosseum'),
  sideBtnCollection: document.getElementById('side-btn-collection'),
  sideBtnBoxes: document.getElementById('side-btn-boxes'),
  sidebarBoxBadge: document.getElementById('sidebar-box-badge'),
  expFillIron: document.getElementById('exp-fill-iron'),
  expTimeIron: document.getElementById('exp-time-iron'),
  expFillWood: document.getElementById('exp-fill-wood'),
  expTimeWood: document.getElementById('exp-time-wood'),
  expFillWheat: document.getElementById('exp-fill-wheat'),
  expTimeWheat: document.getElementById('exp-time-wheat'),
  sidebarLimitTextIron: document.getElementById('sidebar-limit-text-iron'),
  sidebarLimitFillIron: document.getElementById('sidebar-limit-fill-iron'),
  sidebarLimitTextWood: document.getElementById('sidebar-limit-text-wood'),
  sidebarLimitFillWood: document.getElementById('sidebar-limit-fill-wood'),
  sidebarLimitTextWheat: document.getElementById('sidebar-limit-text-wheat'),
  sidebarLimitFillWheat: document.getElementById('sidebar-limit-fill-wheat'),
  sidebarResetTimer: document.getElementById('sidebar-reset-timer'),
  toastContainer: document.getElementById('toast-container'),
  rpgModal: document.getElementById('rpg-modal'),
  modalTitle: document.getElementById('modal-title'),
  modalBody: document.getElementById('modal-body'),
  btnCloseModal: document.getElementById('btn-close-modal'),
  loadingScreen: document.getElementById('loading-screen'),
  loadingBarFill: document.getElementById('loading-bar-fill'),
  loadingPercentage: document.getElementById('loading-percentage'),
  loadingQuote: document.getElementById('loading-quote')
};

// Modal Visibility Helper - Checks if ANY modal is currently open
function isAnyModalOpen() {
  const isRpg = dom.rpgModal && dom.rpgModal.classList.contains('active');
  const devModal = document.getElementById('dev-modal');
  const isDev = devModal && !devModal.classList.contains('hidden');
  return isRpg || isDev || document.body.classList.contains('modal-open');
}

function displayModal() {
  if (dom.rpgModal) {
    dom.rpgModal.classList.add('active');
    document.body.classList.add('modal-open');
  }
}

function closeModal() {
  if (dom.rpgModal) {
    dom.rpgModal.classList.remove('active');
  }
  const devModal = document.getElementById('dev-modal');
  const isDevOpen = devModal && !devModal.classList.contains('hidden');
  if (!isDevOpen) {
    document.body.classList.remove('modal-open');
  }
}

// Toast Bildirimi
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  let icon = '✨';
  if (type === 'error') icon = '⚠️';

  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  dom.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.25s ease';
    setTimeout(() => toast.remove(), 250);
  }, 3500);
}

// Cinematic Loading Bar - Pürüzsüz & Güvenilir Yükleme Akışı
function runCinematicLoadingSequence() {
  let progress = 0;
  const quotes = [
    'Zümrüt meşeler ve kadim ormanlar filizleniyor...',
    'Dağ madenleri ve derin demir damarları kazılıyor...',
    'Büyük Kolezyum ve gladyatör arenası kuruluyor...',
    'Zindan mağarası ve canavarlar uyanıyor...'
  ];

  let quoteIdx = 0;

  function updateProgress(newProgress) {
    if (!dom.loadingBarFill || !dom.loadingPercentage) return;
    progress = Math.max(progress, Math.min(Math.floor(newProgress), 99));
    dom.loadingBarFill.style.width = `${progress}%`;
    dom.loadingPercentage.innerText = `%${progress}`;

    if (progress > 30 && quoteIdx === 0 && dom.loadingQuote) { quoteIdx = 1; dom.loadingQuote.innerText = quotes[1]; }
    else if (progress > 60 && quoteIdx === 1 && dom.loadingQuote) { quoteIdx = 2; dom.loadingQuote.innerText = quotes[2]; }
    else if (progress > 85 && quoteIdx === 2 && dom.loadingQuote) { quoteIdx = 3; dom.loadingQuote.innerText = quotes[3]; }
  }

  // Smooth visual progress ticker
  const bootInterval = setInterval(() => {
    progress += Math.floor(Math.random() * 15) + 10;
    if (progress >= 90) {
      progress = 90;
      clearInterval(bootInterval);
    }
    updateProgress(progress);
  }, 100);

  window.__updateLoadingBar = updateProgress;

  function finishLoading() {
    clearInterval(bootInterval);
    if (dom.loadingBarFill) dom.loadingBarFill.style.width = '100%';
    if (dom.loadingPercentage) dom.loadingPercentage.innerText = '%100';
    setTimeout(() => {
      if (dom.loadingScreen) dom.loadingScreen.classList.add('hidden');
    }, 250);
  }

  window.__finishLoadingBar = finishLoading;

  // Güvenlik: Maksimum 1.2 saniye içinde her durumda ekranı aç
  setTimeout(() => {
    finishLoading();
  }, 1200);
}


// Top Bar Render
function renderTopBar() {
  const state = gameState.state;
  dom.playerLevel.innerText = `Lv.${state.level}`;

  const maxStamina = gameState.getMaxStamina(state.level);
  const staminaInt = Math.floor(state.stamina);
  dom.staminaText.innerText = `${staminaInt}/${maxStamina}`;

  dom.adAstraBalance.innerText = state.adAstraBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  dom.resWheat.innerText = state.inventory.wheat || 0;
  dom.resWood.innerText = state.inventory.wood || 0;
  dom.resIron.innerText = state.inventory.iron || 0;
  if (dom.resFish) dom.resFish.innerText = state.inventory.fish || 0;
  if (dom.resFragments) dom.resFragments.innerText = state.inventory.fragments || 0;

  if (dom.sidebarBoxBadge) {
    const boxCount = state.lockedBoxes || 0;
    dom.sidebarBoxBadge.innerText = boxCount;
    dom.sidebarBoxBadge.classList.toggle('hidden', boxCount <= 0);
  }

  renderRealmSidebar(state, maxStamina, staminaInt);
}

// =========================================================================
// SAĞ MENÜ PANELİ (REALM SIDEBAR) - KARAKTER KARTI & SEFER TAKİPÇİSİ
// =========================================================================
function formatCountdown(remainingSeconds) {
  const secs = Math.max(0, Math.ceil(remainingSeconds));
  const hh = Math.floor(secs / 3600);
  const mm = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
  const ss = (secs % 60).toString().padStart(2, '0');
  if (hh > 0) {
    return `${hh}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

function renderExpeditionTracker(nodeId, fillEl, timeEl) {
  if (!fillEl || !timeEl) return;
  const exp = gameState.state.activeExpeditions[nodeId];

  if (!exp) {
    fillEl.className = 'sidebar-exp-fill idle';
    fillEl.style.width = '0%';
    timeEl.innerText = 'BOŞTA';
    return;
  }

  const pct = Math.min(100, Math.floor((exp.elapsedSeconds / exp.durationSeconds) * 100));
  fillEl.style.width = `${pct}%`;

  if (exp.isCompleted) {
    fillEl.className = 'sidebar-exp-fill done';
    timeEl.innerText = 'HAZIR';
  } else {
    fillEl.className = `sidebar-exp-fill ${nodeId}`;
    timeEl.innerText = formatCountdown(exp.durationSeconds - exp.elapsedSeconds);
  }
}

function renderRealmSidebar(state, maxStamina, staminaInt) {
  if (dom.sidebarPlayerLevel) dom.sidebarPlayerLevel.innerText = `Lv.${state.level}`;
  if (dom.sidebarStaminaText) dom.sidebarStaminaText.innerText = `${staminaInt}/${maxStamina}`;
  if (dom.sidebarStaminaFill) dom.sidebarStaminaFill.style.width = `${Math.max(0, Math.min(100, (staminaInt / maxStamina) * 100))}%`;
  if (dom.sidebarAdAstraBalance) {
    dom.sidebarAdAstraBalance.innerText = state.adAstraBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (dom.sidebarAvaxBalance) {
    dom.sidebarAvaxBalance.innerText = (state.avaxBalance || 250).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  const fragmentRate = gameState.getFragmentDropRate(state.level);
  const boxRate = gameState.getBoxDropRate(state.level);
  if (dom.sidebarFragmentRate) {
    dom.sidebarFragmentRate.innerText = `${(fragmentRate * 100).toFixed(2)}%`;
  }
  if (dom.sidebarBoxRate) {
    dom.sidebarBoxRate.innerText = `${(boxRate * 100).toFixed(4)}%`;
  }

  // 2. Aktif Seferler
  renderExpeditionTracker('iron', dom.expFillIron, dom.expTimeIron);
  renderExpeditionTracker('wood', dom.expFillWood, dom.expTimeWood);
  renderExpeditionTracker('wheat', dom.expFillWheat, dom.expTimeWheat);

  // 3. Global Günlük Çıkarma Limitleri (Gerçek kalan miktar globalPool.state.resources üzerinden okunur)
  const getRem = (key) => {
    const info = globalPool.getResourceInfo(key);
    return { remaining: info.remaining, maxCap: info.totalCap, pct: Math.floor(parseFloat(info.percent)) };
  };

  const ironInfo = getRem('iron');
  const woodInfo = getRem('wood');
  const wheatInfo = getRem('wheat');

  if (dom.sidebarLimitTextIron) dom.sidebarLimitTextIron.innerText = `${ironInfo.remaining.toLocaleString('tr-TR')} / ${ironInfo.maxCap.toLocaleString('tr-TR')}`;
  if (dom.sidebarLimitFillIron) dom.sidebarLimitFillIron.style.width = `${ironInfo.pct}%`;

  if (dom.sidebarLimitTextWood) dom.sidebarLimitTextWood.innerText = `${woodInfo.remaining.toLocaleString('tr-TR')} / ${woodInfo.maxCap.toLocaleString('tr-TR')}`;
  if (dom.sidebarLimitFillWood) dom.sidebarLimitFillWood.style.width = `${woodInfo.pct}%`;

  if (dom.sidebarLimitTextWheat) dom.sidebarLimitTextWheat.innerText = `${wheatInfo.remaining.toLocaleString('tr-TR')} / ${wheatInfo.maxCap.toLocaleString('tr-TR')}`;
  if (dom.sidebarLimitFillWheat) dom.sidebarLimitFillWheat.style.width = `${wheatInfo.pct}%`;

  if (dom.sidebarResetTimer) {
    const secToReset = globalPool.getSecondsUntilReset();
    const hrs = Math.floor(secToReset / 3600);
    const mins = Math.floor((secToReset % 3600) / 60);
    dom.sidebarResetTimer.innerText = `⏳ ${hrs}s ${mins}d`;
  }
}

// Zindan Mağarasına Geçiş (Sağ Menü Kısayolu & Kolezyum Modalı Ortak Kullanır)
function enterDungeonScene() {
  closeModal();
  if (phaserGame && phaserGame.scene) {
    if (phaserGame.scene.isActive('GrandTownScene')) {
      phaserGame.scene.stop('GrandTownScene');
    }
    phaserGame.scene.start('DungeonScene');

    // Üst şerit menüyü Zindan Menüsüyle değiştir
    const topNavMenu = document.querySelector('.top-nav-menu');
    const floorBar = document.getElementById('dungeon-floor-bar');
    if (topNavMenu) topNavMenu.classList.add('hidden');
    if (floorBar) floorBar.classList.remove('hidden');
  }
}

// Zindandan Kasaba Meydanına Temiz Dönüş (Kat Barı Butonu & Alt Menü Kısayolu Ortak Kullanır)
function returnToTown() {
  if (!(phaserGame && phaserGame.scene)) return;
  if (phaserGame.scene.isActive('DungeonScene')) {
    phaserGame.scene.stop('DungeonScene');
  }
  phaserGame.scene.start('GrandTownScene');

  // Üst şerit menüyü Kasaba Menüsüne geri döndür
  const topNavMenu = document.querySelector('.top-nav-menu');
  const floorBar = document.getElementById('dungeon-floor-bar');
  if (topNavMenu) topNavMenu.classList.remove('hidden');
  if (floorBar) floorBar.classList.add('hidden');

  showToast('🏰 Kasaba meydanına dönüldü!', 'info');
}

// =========================================================================
// 1. GÜNLÜK KALAN KAYNAK LİMİTLERİ MODALI
// =========================================================================
function openDailyLimitsModal() {
  dom.modalTitle.innerHTML = `<span>📊</span> <span>HAFTALIK KAYNAK ÇIKARTIM HAVUZU</span>`;

  const getRem = (key) => {
    const info = globalPool.getResourceInfo(key);
    return { remaining: info.remaining, maxCap: info.totalCap, pct: Math.floor(parseFloat(info.percent)) };
  };

  const woodInfo = getRem('wood');
  const ironInfo = getRem('iron');
  const wheatInfo = getRem('wheat');

  dom.modalBody.innerHTML = `
    <div class="clean-card">
      <div class="card-title">🌐 Krallık Haftalık Kaynak Üretim Limitleri</div>
      <div class="clean-desc">
        Krallık ekonomisini korumak ve enflasyonu önlemek adına 7 günlük dönemde krallık genelinde çıkartılabilecek maksimum hammadde miktarı belirlenmiştir. Limitler her hafta sıfırlanır.
      </div>
    </div>

    <div style="display: flex; flex-direction: column; gap: 10px;">
      
      <!-- Odun -->
      <div class="clean-card" style="padding: 12px 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 1.5rem;">🌲</span>
            <strong style="font-size: 1rem; color: #4ade80;">Zümrüt Meşe Odunu</strong>
          </div>
          <span class="card-badge" style="color: #4ade80;">%${woodInfo.pct} Kalan</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 0.85rem; color: #94a3b8; font-weight: 600;">
          <span>Bu Hafta Kalan: <strong style="color: #fff;">${woodInfo.remaining.toLocaleString('tr-TR')} Adet</strong></span>
          <span>Haftalık Toplam: ${woodInfo.maxCap.toLocaleString('tr-TR')}</span>
        </div>
      </div>

      <!-- Demir -->
      <div class="clean-card" style="padding: 12px 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 1.5rem;">⛏️</span>
            <strong style="font-size: 1rem; color: #38bdf8;">Derin Demir Cevheri</strong>
          </div>
          <span class="card-badge" style="color: #38bdf8;">%${ironInfo.pct} Kalan</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 0.85rem; color: #94a3b8; font-weight: 600;">
          <span>Bu Hafta Kalan: <strong style="color: #fff;">${ironInfo.remaining.toLocaleString('tr-TR')} Adet</strong></span>
          <span>Haftalık Toplam: ${ironInfo.maxCap.toLocaleString('tr-TR')}</span>
        </div>
      </div>

      <!-- Buğday -->
      <div class="clean-card" style="padding: 12px 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 1.5rem;">🌾</span>
            <strong style="font-size: 1rem; color: #facc15;">Güneş Buğdayı</strong>
          </div>
          <span class="card-badge" style="color: #facc15;">%${wheatInfo.pct} Kalan</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 0.85rem; color: #94a3b8; font-weight: 600;">
          <span>Bu Hafta Kalan: <strong style="color: #fff;">${wheatInfo.remaining.toLocaleString('tr-TR')} Adet</strong></span>
          <span>Haftalık Toplam: ${wheatInfo.maxCap.toLocaleString('tr-TR')}</span>
        </div>
      </div>

    </div>
  `;

  displayModal();
}

let economyActiveTab = 'overview';
let simPlayerCount = 500;
let simDays = 30;
let simResults = null;

// =========================================================================
// 1.5 📊 EKONOMİK DENGE, 10B MAKRO TOKENOMICS & CANLI SİMÜLATÖR PANELİ
// =========================================================================
function openEconomyDashboardModal(tab = economyActiveTab) {
  economyActiveTab = tab;
  dom.modalTitle.innerHTML = `<span>📈</span> <span>EKONOMİK DENGE, 10B TOKENOMICS & SİMÜLATÖR</span>`;

  const poolState = globalPool.state;
  const treasury = poolState.treasury || { dungeon: 0, ammBuyback: 0, arena: 0, staking: 0 };
  const metrics = globalPool.getEconomicHealthMetrics();

  const tabsHtml = `
    <div class="phase2-tab-row">
      <button class="phase2-tab-btn economy-tab-btn ${economyActiveTab === 'overview' ? 'active' : ''}" data-tab="overview">🌐 10B Tokenomics & Hazine</button>
      <button class="phase2-tab-btn economy-tab-btn ${economyActiveTab === 'health' ? 'active' : ''}" data-tab="health">🩺 Canlı Denge Metrikleri</button>
      <button class="phase2-tab-btn economy-tab-btn ${economyActiveTab === 'simulator' ? 'active' : ''}" data-tab="simulator">🎮 Makro Simülatör</button>
    </div>
  `;

  let contentHtml = '';

  if (economyActiveTab === 'overview') {
    contentHtml = `
      <div class="clean-card" style="border-color: #c084fc; background: #160e1c;">
        <div class="card-title-row">
          <div class="card-title">🟣 $ADASTRA Avalanche C-Chain Tokenomics</div>
          <span class="card-badge" style="color: #4ade80;">10 Milyar Sabit Arz</span>
        </div>
        <div style="font-size: 0.8rem; color: #cbd5e1; word-break: break-all; margin-top: 4px; background: #0e0712; padding: 6px 10px; border-radius: 6px; border: 1px solid #581c87;">
          Kontrat: <strong style="color: #e9d5ff;">${globalPool.state.contractAddress}</strong>
        </div>
      </div>

      <!-- Yakım & Hazine 2'li Kolon -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <div class="clean-card" style="border-color: #ef4444; background: #1a0a0a;">
          <div style="font-size: 0.82rem; color: #fca5a5; font-weight: 700;">🔥 Toplam Kalıcı Yakım (%18)</div>
          <div style="font-size: 1.25rem; font-weight: 800; color: #f87171; margin-top: 4px;">
            ${Math.floor(poolState.totalBurned).toLocaleString('tr-TR')} ADA
          </div>
          <div style="font-size: 0.75rem; color: #94a3b8; margin-top: 2px;">Ebediyen dolaşımdan çıkarıldı</div>
        </div>

        <div class="clean-card" style="border-color: #38bdf8; background: #081520;">
          <div style="font-size: 0.82rem; color: #7dd3fc; font-weight: 700;">💎 Toplam Hazine Kasası (%82)</div>
          <div style="font-size: 1.25rem; font-weight: 800; color: #38bdf8; margin-top: 4px;">
            ${Math.floor(poolState.totalTreasury).toLocaleString('tr-TR')} ADA
          </div>
          <div style="font-size: 0.75rem; color: #94a3b8; margin-top: 2px;">4 kolda ekosisteme dağıtılıyor</div>
        </div>
      </div>

      <!-- %82 Hazine Alt Dağılımı -->
      <div class="clean-card">
        <div class="card-title">💎 %82 Hazine & Ödül Havuzları Alt Dağılımı</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px;">
          
          <div style="background: #140e08; padding: 10px; border-radius: 8px; border: 1px solid #583007;">
            <div style="display: flex; justify-content: space-between; font-size: 0.82rem;">
              <span style="color: #f87171; font-weight: 700;">🏰 Zindan & Bosslar (%35)</span>
            </div>
            <div style="font-size: 1.05rem; font-weight: 800; color: #fca5a5; margin-top: 2px;">
              ${Math.floor(treasury.dungeon).toLocaleString('tr-TR')} ADA
            </div>
            <div style="font-size: 0.72rem; color: #94a3b8;">PvE canavar ve boss ödülleri</div>
          </div>

          <div style="background: #140e08; padding: 10px; border-radius: 8px; border: 1px solid #583007;">
            <div style="display: flex; justify-content: space-between; font-size: 0.82rem;">
              <span style="color: #38bdf8; font-weight: 700;">💧 AMM DEX Geri Alım (%30)</span>
            </div>
            <div style="font-size: 1.05rem; font-weight: 800; color: #7dd3fc; margin-top: 2px;">
              ${Math.floor(treasury.ammBuyback).toLocaleString('tr-TR')} ADA
            </div>
            <div style="font-size: 0.72rem; color: #94a3b8;">DEX fiyat tabanı & likidite desteği</div>
          </div>

          <div style="background: #140e08; padding: 10px; border-radius: 8px; border: 1px solid #583007;">
            <div style="display: flex; justify-content: space-between; font-size: 0.82rem;">
              <span style="color: #facc15; font-weight: 700;">🏟️ Kolezyum Arena (%25)</span>
            </div>
            <div style="font-size: 1.05rem; font-weight: 800; color: #fde047; margin-top: 2px;">
              ${Math.floor(treasury.arena).toLocaleString('tr-TR')} ADA
            </div>
            <div style="font-size: 0.72rem; color: #94a3b8;">18v18 gladyatör şampiyonluk havuzu</div>
          </div>

          <div style="background: #140e08; padding: 10px; border-radius: 8px; border: 1px solid #583007;">
            <div style="display: flex; justify-content: space-between; font-size: 0.82rem;">
              <span style="color: #c084fc; font-weight: 700;">🔒 Staking Rezervi (%10)</span>
            </div>
            <div style="font-size: 1.05rem; font-weight: 800; color: #e9d5ff; margin-top: 2px;">
              ${Math.floor(treasury.staking).toLocaleString('tr-TR')} ADA
            </div>
            <div style="font-size: 0.72rem; color: #94a3b8;">%8-12 APY pasif kilitli getiri</div>
          </div>

        </div>
      </div>

      <!-- Dış Likidite Enjeksiyonu -->
      <div class="clean-card" style="border-color: #22c55e; background: #0c1a0e;">
        <div class="card-title-row">
          <div class="card-title" style="color: #4ade80;">📺 Avalanche Arena Yayın Geliri Buyback Desteği</div>
          <span class="card-badge" style="color: #4ade80;">%35 Gelir Enjeksiyonu</span>
        </div>
        <div style="font-size: 0.85rem; color: #cbd5e1; margin-top: 4px;">
          AlphAvax yayınlarından gelen gelirin <strong>%35'i</strong> ile DEX'ten açık piyasadan token satın alınır; %50'si yakılır, %50'si AMM likiditesine kilitlenir.
        </div>
        <div style="font-size: 1.1rem; font-weight: 800; color: #4ade80; margin-top: 6px;">
          Aktif Buyback Hacmi: ${Math.floor(poolState.buybackFromBroadcasting).toLocaleString('tr-TR')} $ADASTRA
        </div>
      </div>
    `;
  } else if (economyActiveTab === 'health') {
    contentHtml = `
      <div class="clean-card">
        <div class="card-title-row">
          <div class="card-title">🩺 DeepSeek R1 Master Ekonomik Denge Denetleyicisi</div>
          <span class="card-badge" style="color: ${metrics.statusBadgeColor};">${metrics.statusText}</span>
        </div>
        <div class="clean-desc">
          Tüm kaynakların üretim (musluk) ve tüketim (lavabo) oranları anlık olarak diferansiyel denklemlerle denetlenmektedir.
        </div>
      </div>

      <div style="display: flex; flex-direction: column; gap: 8px;">
        <!-- E_net -->
        <div class="clean-card" style="padding: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: 0.95rem; font-weight: 800; color: #c084fc;">🪙 Net Token Emisyon Katsayısı (E_net ≤ 0)</div>
              <div style="font-size: 0.78rem; color: #94a3b8;">Harcanan tokenlerin yakım hızı ödül dağıtım hızından yüksektir.</div>
            </div>
            <span class="card-badge" style="color: #22c55e; font-size: 0.95rem;">${metrics.E_net} (Deflasyonist)</span>
          </div>
        </div>

        <!-- Sigma Wheat -->
        <div class="clean-card" style="padding: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: 0.95rem; font-weight: 800; color: #facc15;">🌾 Buğday Biyolojik Tüketim Oranı (Σ ≥ 1.00)</div>
              <div style="font-size: 0.78rem; color: #94a3b8;">18 Askerin 18 dakikada bir iyileşmesi ve stamina doldurma tüketimi.</div>
            </div>
            <span class="card-badge" style="color: #22c55e; font-size: 0.95rem;">${metrics.sigmaWheat} (Dengede)</span>
          </div>
        </div>

        <!-- Sigma Iron & Wood -->
        <div class="clean-card" style="padding: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: 0.95rem; font-weight: 800; color: #38bdf8;">⛏️ Demir & 🌲 Odun Aşınma Oranı (Σ ≥ 1.00)</div>
              <div style="font-size: 0.78rem; color: #94a3b8;">3 Alet tamiri ve 5 Parça 13/13 Ekipman dövme tüketimi.</div>
            </div>
            <span class="card-badge" style="color: #22c55e; font-size: 0.95rem;">${metrics.sigmaIron} (Dengede)</span>
          </div>
        </div>
      </div>
    `;
  } else if (economyActiveTab === 'simulator') {
    if (!simResults) {
      simResults = globalPool.simulateMacroEconomy(simPlayerCount, simDays);
    }

    const simTableRows = simResults.slice(0, 10).map(r => `
      <tr style="border-bottom: 1px solid #38200f; font-size: 0.78rem; text-align: center;">
        <td style="padding: 6px; font-weight: 700; color: #facc15;">Gün ${r.day}</td>
        <td style="padding: 6px; color: #38bdf8;">${r.activePlayers}</td>
        <td style="padding: 6px; color: #cbd5e1;">${r.dailySpend.toLocaleString('tr-TR')} ADA</td>
        <td style="padding: 6px; color: #f87171; font-weight: 700;">-${r.dailyBurn.toLocaleString('tr-TR')} ADA</td>
        <td style="padding: 6px; color: #4ade80;">${r.dungeonVault.toLocaleString('tr-TR')} ADA</td>
        <td style="padding: 6px; color: #c084fc;">${(r.circulatingSupply / 1000000).toFixed(2)}M</td>
      </tr>
    `).join('');

    contentHtml = `
      <div class="clean-card">
        <div class="card-title">🎮 Makro Ekonomi Projeksiyon Simülatörü</div>
        <div class="clean-desc">
          Farklı aktif oyuncu kitleleri ve zaman dilimlerinde $ADASTRA yakımını, hazine büyümesini ve dolaşım arzını canlı simüle et.
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr auto; gap: 10px; align-items: flex-end; margin-top: 10px;">
          <div>
            <label style="font-size: 0.8rem; color: #94a3b8; font-weight: 700;">Aktif Oyuncu (DAU):</label>
            <input type="number" id="sim-input-players" value="${simPlayerCount}" min="10" max="100000" class="amm-number-input" style="width: 100%; margin-top: 4px;" />
          </div>
          <div>
            <label style="font-size: 0.8rem; color: #94a3b8; font-weight: 700;">Simülasyon Süresi (Gün):</label>
            <select id="sim-input-days" class="amm-number-input" style="width: 100%; margin-top: 4px;">
              <option value="7" ${simDays === 7 ? 'selected' : ''}>7 Gün</option>
              <option value="30" ${simDays === 30 ? 'selected' : ''}>30 Gün (1 Ay)</option>
              <option value="90" ${simDays === 90 ? 'selected' : ''}>90 Gün (1 Sezon)</option>
              <option value="365" ${simDays === 365 ? 'selected' : ''}>365 Gün (1 Yıl)</option>
            </select>
          </div>
          <button id="btn-run-simulation" class="btn-clean btn-clean-green" style="padding: 10px 16px; font-size: 0.85rem; height: 38px;">
            ▶️ ÇALIŞTIR
          </button>
        </div>
      </div>

      <div class="clean-card" style="padding: 8px;">
        <div style="font-weight: 800; font-size: 0.85rem; color: #facc15; margin-bottom: 6px;">📋 ${simDays} Günlük Simülasyon Sonuç Tablosu (İlk 10 Gün)</div>
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #140e08; font-size: 0.75rem; color: #94a3b8; border-bottom: 2px solid #583007;">
                <th style="padding: 6px;">Gün</th>
                <th style="padding: 6px;">Aktif</th>
                <th style="padding: 6px;">Harcama</th>
                <th style="padding: 6px;">Yakılan (%18)</th>
                <th style="padding: 6px;">Zindan Kasası</th>
                <th style="padding: 6px;">Kalan Arz</th>
              </tr>
            </thead>
            <tbody>
              ${simTableRows}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  dom.modalBody.innerHTML = `${tabsHtml}${contentHtml}`;
  displayModal();
}

// =========================================================================
// 2. KARAKTER SEVİYESİ & ENVANTER MENÜSÜ
// =========================================================================
function openInventoryModal() {
  const state = gameState.state;
  dom.modalTitle.innerHTML = `<span>🧙‍♂️</span> <span>KARAKTER GELİŞİMİ & ENVANTER</span>`;

  const wood = state.inventory.wood || 0;
  const iron = state.inventory.iron || 0;
  const wheat = state.inventory.wheat || 0;
  const adAstra = state.adAstraBalance || 0;
  const currentDuration = gameState.getExpeditionDurationHours();

  const req = gameState.getNextLevelRequirement();
  const maxStamina = gameState.getMaxStamina();

  const axeCost = gameState.calculateRepairCost('axe') || { woodCost: 0, ironCost: 0, adAstraCost: 0, missingDurability: 0 };
  const pickaxeCost = gameState.calculateRepairCost('pickaxe') || { woodCost: 0, ironCost: 0, adAstraCost: 0, missingDurability: 0 };
  const sickleCost = gameState.calculateRepairCost('sickle') || { woodCost: 0, ironCost: 0, adAstraCost: 0, missingDurability: 0 };

  const axe = state.tools.axe || { durability: 100 };
  const pickaxe = state.tools.pickaxe || { durability: 100 };
  const sickle = state.tools.sickle || { durability: 100 };

  dom.modalBody.innerHTML = `
    <!-- Karakter Seviye Atlama Kartı -->
    <div class="clean-card" style="border-color: #facc15; background: #1c140c;">
      <div class="card-title-row">
        <div class="card-title">👑 Seviye ${state.level} AlphAvax Gezgini</div>
        <div class="card-badge" style="color: #fde047;">Sefer Süresi: ${currentDuration} Saat</div>
      </div>
      
      <div class="clean-desc">
        Seviye atladığında sefer süren <strong>${req.durationHours} Saate</strong> ve Maksimum Staminan <strong>${gameState.getMaxStamina(state.level + 1)} ⚡'ya</strong> çıkar!
      </div>

      <!-- İlerleme & Gereksinimler -->
      <div style="background: #140e08; padding: 12px; border-radius: 10px; border: 1px solid #583007; display: flex; flex-direction: column; gap: 8px;">
        <div style="display: flex; justify-content: space-between; font-size: 0.88rem; font-weight: 700;">
          <span style="color: #60a5fa;">✨ Deneyim (XP):</span>
          <span style="color: ${state.currentXp >= req.xp ? '#4ade80' : '#f87171'};">${state.currentXp} / ${req.xp} XP</span>
        </div>
        
        <div style="font-size: 0.85rem; font-weight: 700; color: #cbd5e1; margin-top: 4px;">Gereken Hammadde & Token:</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 0.82rem; font-weight: 600;">
          <div style="color: ${wood >= req.wood ? '#4ade80' : '#f87171'};">🌲 ${wood}/${req.wood} Odun</div>
          <div style="color: ${iron >= req.iron ? '#4ade80' : '#f87171'};">⛏️ ${iron}/${req.iron} Demir</div>
          <div style="color: ${wheat >= req.wheat ? '#4ade80' : '#f87171'};">🌾 ${wheat}/${req.wheat} Buğday</div>
        </div>
        
        <div style="display: flex; justify-content: space-between; font-size: 0.88rem; font-weight: 700; margin-top: 2px;">
          <span style="color: #c084fc;">🟣 AdAstra:</span>
          <span style="color: ${adAstra >= req.adAstra ? '#4ade80' : '#f87171'};">${adAstra.toFixed(1)} / ${req.adAstra} ADA</span>
        </div>
      </div>

      <button id="btn-modal-levelup" class="btn-clean btn-clean-green" style="margin-top: 4px;">
        SEVİYE ${state.level + 1}'E YÜKSELT
      </button>
    </div>

    <!-- Stamina Yönetimi & Buğday ile Doldurma -->
    <div class="clean-card" style="border-color: #38bdf8; background: #0c1524;">
      <div class="card-title-row">
        <div class="card-title">⚡ Dayanıklılık (Stamina)</div>
        <span class="card-badge" style="color: #38bdf8;">${Math.floor(state.stamina)} / ${maxStamina} ⚡</span>
      </div>
      <div class="clean-desc">
        Seviye atlandıkça maksimum stamina artar. Sefer süresi uzadıkça harcanan stamina da artar. Depodaki buğdayları fırınlayarak veya tavernadan ziyafet sofrasıyla staminanı doldurabilirsin.
      </div>
      <div style="margin-top: 8px;">
        <button id="btn-wheat-stamina-refill" class="btn-clean btn-clean-gold" style="font-size: 0.88rem; padding: 10px;" ${wheat < 20 || state.stamina >= maxStamina ? 'disabled' : ''}>
          🍞 20 Buğday Tüket (+25 ⚡ Stamina Doldur)
        </button>
      </div>
    </div>

    <!-- Depo Kapasitesi & Yükseltme -->
    ${(() => {
      const cap = gameState.getWarehouseCapacity();
      const nextCap = gameState.getWarehouseCapacity(state.warehouseLevel + 1);
      const canUpgrade = state.warehouseLevel < GAME_CONFIG.WAREHOUSE.baseLevels;
      const nextCost = canUpgrade ? GAME_CONFIG.WAREHOUSE.upgradeCosts[state.warehouseLevel + 1] : null;

      let upgradeBtn = '';
      if (canUpgrade && nextCost) {
        const canAfford = wood >= nextCost.wood && iron >= nextCost.iron && wheat >= nextCost.wheat && adAstra >= nextCost.adAstra;
        upgradeBtn = `<button id="btn-modal-upgrade-warehouse" class="btn-clean btn-clean-green" style="margin-top: 8px; width: 100%;" ${canAfford ? '' : 'disabled'}>
          🔨 SEVİYE ${state.warehouseLevel + 1}'E YÜKSELT
        </button>`;
      }

      return `<div class="clean-card">
        <div class="card-title-row">
          <div class="card-title">📦 Depo (Seviye ${state.warehouseLevel})</div>
          <span style="font-size: 0.85rem; color: #fde047; font-weight: 700;">Kapasite Yönetimi</span>
        </div>
        <div class="inv-grid" style="gap: 8px;">
          <div style="background: #140e08; padding: 10px; border-radius: 8px; border: 1px solid #583007;">
            <div style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 4px;">⛏️ Demir</div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="flex: 1; height: 16px; background: #0c0604; border-radius: 4px; border: 1px solid #583007; overflow: hidden;">
                <div style="height: 100%; background: #94a3b8; width: ${Math.min(100, (iron / cap.iron) * 100)}%;"></div>
              </div>
              <span style="font-weight: 700; color: #94a3b8; min-width: 50px; text-align: right;">${iron}/${cap.iron}</span>
            </div>
          </div>
          <div style="background: #140e08; padding: 10px; border-radius: 8px; border: 1px solid #583007;">
            <div style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 4px;">🌲 Odun</div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="flex: 1; height: 16px; background: #0c0604; border-radius: 4px; border: 1px solid #583007; overflow: hidden;">
                <div style="height: 100%; background: #4ade80; width: ${Math.min(100, (wood / cap.wood) * 100)}%;"></div>
              </div>
              <span style="font-weight: 700; color: #4ade80; min-width: 50px; text-align: right;">${wood}/${cap.wood}</span>
            </div>
          </div>
          <div style="background: #140e08; padding: 10px; border-radius: 8px; border: 1px solid #583007;">
            <div style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 4px;">🌾 Buğday</div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="flex: 1; height: 16px; background: #0c0604; border-radius: 4px; border: 1px solid #583007; overflow: hidden;">
                <div style="height: 100%; background: #facc15; width: ${Math.min(100, (wheat / cap.wheat) * 100)}%;"></div>
              </div>
              <span style="font-weight: 700; color: #facc15; min-width: 50px; text-align: right;">${wheat}/${cap.wheat}</span>
            </div>
          </div>
        </div>
        ${canUpgrade ? `<div style="background: #140e08; padding: 10px; border-radius: 8px; border: 1px solid #583007; margin-top: 8px; font-size: 0.82rem;">
          <div style="color: #cbd5e1; font-weight: 700; margin-bottom: 4px;">Seviye ${state.warehouseLevel + 1} Maliyeti:</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 0.8rem;">
            <div style="color: ${wood >= nextCost.wood ? '#4ade80' : '#f87171'};">🌲 ${nextCost.wood}</div>
            <div style="color: ${iron >= nextCost.iron ? '#4ade80' : '#f87171'};">⛏️ ${nextCost.iron}</div>
            <div style="color: ${wheat >= nextCost.wheat ? '#4ade80' : '#f87171'};">🌾 ${nextCost.wheat}</div>
            <div style="color: ${adAstra >= nextCost.adAstra ? '#4ade80' : '#f87171'};">🟣 ${nextCost.adAstra} ADA</div>
          </div>
        </div>` : '<div style="text-align: center; color: #94a3b8; font-size: 0.85rem; margin-top: 8px;">✅ Maksimum Seviye Ulaşıldı</div>'}
        ${upgradeBtn}
      </div>`;
    })()}

    <!-- Depolanan Hammaddeler -->
    <div class="clean-card">
      <div class="card-title">📦 Depolanan Hammaddeler</div>
      <div class="inv-grid">
        <div class="inv-slot"><div class="inv-icon">🌲</div><div class="inv-qty">${wood}</div><div class="inv-name">Odun</div></div>
        <div class="inv-slot"><div class="inv-icon">⛏️</div><div class="inv-qty">${iron}</div><div class="inv-name">Demir</div></div>
        <div class="inv-slot"><div class="inv-icon">🌾</div><div class="inv-qty">${wheat}</div><div class="inv-name">Buğday</div></div>
        <div class="inv-slot"><div class="inv-icon">🧩</div><div class="inv-qty">${state.inventory.fragments || 0}</div><div class="inv-name">Parça</div></div>
      </div>
    </div>

    <!-- Aletler & Tamirat (Odun + Demir + AdAstra) -->
    <div class="clean-card">
      <div class="card-title-row">
        <div class="card-title">🔨 Aletler & Dayanıklılık</div>
        <span style="font-size: 0.85rem; color: #fde047; font-weight: 700;">Odun + Demir + ADA ile Onarım</span>
      </div>

      <!-- Balta -->
      <div class="durability-row">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 1.4rem;">🪓</span>
          <div>
            <div style="font-size: 0.95rem; font-weight: 800;">Acemi Baltası</div>
            <div style="font-size: 0.8rem; color: #94a3b8;">${axe.durability >= 100 ? '✅ Sağlam' : `Maliyet: <strong>${axeCost.woodCost} Odun</strong> + <strong>${axeCost.ironCost} Demir</strong> + <strong>${axeCost.adAstraCost} ADA</strong>`}</div>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="card-badge" style="color: ${axe.durability <= 25 ? '#ef4444' : '#22c55e'};">%${axe.durability}</span>
          <button class="btn-clean btn-clean-outline btn-modal-repair" data-tool="axe" style="padding: 6px 12px; font-size: 0.8rem; width: auto;" ${axe.durability >= 100 ? 'disabled' : ''}>${axe.durability >= 100 ? 'Tam' : 'Onar'}</button>
        </div>
      </div>

      <!-- Kazma -->
      <div class="durability-row">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 1.4rem;">⛏️</span>
          <div>
            <div style="font-size: 0.95rem; font-weight: 800;">Bronz Kazma</div>
            <div style="font-size: 0.8rem; color: #94a3b8;">${pickaxe.durability >= 100 ? '✅ Sağlam' : `Maliyet: <strong>${pickaxeCost.woodCost} Odun</strong> + <strong>${pickaxeCost.ironCost} Demir</strong> + <strong>${pickaxeCost.adAstraCost} ADA</strong>`}</div>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="card-badge" style="color: ${pickaxe.durability <= 25 ? '#ef4444' : '#22c55e'};">%${pickaxe.durability}</span>
          <button class="btn-clean btn-clean-outline btn-modal-repair" data-tool="pickaxe" style="padding: 6px 12px; font-size: 0.8rem; width: auto;" ${pickaxe.durability >= 100 ? 'disabled' : ''}>${pickaxe.durability >= 100 ? 'Tam' : 'Onar'}</button>
        </div>
      </div>

      <!-- Orak -->
      <div class="durability-row">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 1.4rem;">🌾</span>
          <div>
            <div style="font-size: 0.95rem; font-weight: 800;">Demir Orak</div>
            <div style="font-size: 0.8rem; color: #94a3b8;">${sickle.durability >= 100 ? '✅ Sağlam' : `Maliyet: <strong>${sickleCost.woodCost} Odun</strong> + <strong>${sickleCost.ironCost} Demir</strong> + <strong>${sickleCost.adAstraCost} ADA</strong>`}</div>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="card-badge" style="color: ${sickle.durability <= 25 ? '#ef4444' : '#22c55e'};">%${sickle.durability}</span>
          <button class="btn-clean btn-clean-outline btn-modal-repair" data-tool="sickle" style="padding: 6px 12px; font-size: 0.8rem; width: auto;" ${sickle.durability >= 100 ? 'disabled' : ''}>${sickle.durability >= 100 ? 'Tam' : 'Onar'}</button>
        </div>
      </div>
    </div>
  `;

  displayModal();
}

// =========================================================================
// 3. PREMIUM CANAVAR SAVAŞ MODALI (KİLİTLİ KAT SİSTEMİYLE ENTEGRE)
// =========================================================================
function openMonsterBattleModal(monster) {
  const army = gameState.state.army || { infantry: 0, archer: 0, knight: 0 };
  const totalSoldiers = (army.infantry || 0) + (army.archer || 0) + (army.knight || 0);

  if (totalSoldiers <= 0) {
    showToast('Önce kışladan veya kolezyumdan asker kiralamalısın!', 'error');
    return;
  }

  sound.playPickaxe();
  dom.modalTitle.innerHTML = `<span>⚔️</span> <span>[SEVİYE ${monster.level}] ${monster.name.toUpperCase()}</span>`;

  let playerHp = totalSoldiers * 130 + 100;
  let maxPlayerHp = playerHp;
  let monsterHp = monster.hp;
  let maxMonsterHp = monster.hp;

  dom.modalBody.innerHTML = `
    <!-- Savaş Alanı Kartı -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
      
      <!-- Oyuncu Ordusu -->
      <div class="clean-card" style="border-color: #38bdf8; padding: 12px;">
        <div style="font-family: var(--font-game); font-size: 1rem; color: #38bdf8; font-weight: 800; margin-bottom: 4px;">
          🛡️ AlphAvax Ordusu
        </div>
        <div style="font-size: 0.8rem; color: #94a3b8; line-height: 1.4;">
          ${army.infantry}x Muhafız • ${army.archer}x Okçu • ${army.knight}x Paladin
        </div>
        <div style="margin-top: 8px; font-weight: 800; font-size: 0.85rem; color: #4ade80;" id="battle-player-hp">
          ❤️ Can: ${playerHp} / ${maxPlayerHp}
        </div>
      </div>

      <!-- Canavar -->
      <div class="clean-card" style="border-color: ${monster.isBoss ? '#ef4444' : '#f59e0b'}; padding: 12px;">
        <div style="font-family: var(--font-game); font-size: 1rem; color: ${monster.isBoss ? '#ef4444' : '#fde047'}; font-weight: 800; margin-bottom: 4px;">
          ${monster.icon} ${monster.name}
        </div>
        <div style="font-size: 0.8rem; color: #94a3b8; line-height: 1.4;">
          Saldırı Gücü: ${monster.atk} ATK
        </div>
        <div style="margin-top: 8px; font-weight: 800; font-size: 0.85rem; color: #ef4444;" id="battle-monster-hp">
          ❤️ Can: ${monsterHp} / ${maxMonsterHp}
        </div>
      </div>

    </div>

    <!-- Zafer Ödülü -->
    <div class="clean-card" style="padding: 10px 14px; background: #161009;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 0.85rem; font-weight: 700; color: #cbd5e1;">🎁 Zafer Ganimeti:</span>
        <strong style="font-family: var(--font-game); font-size: 0.95rem; color: #fde047;">
          +${monster.rewardAdAstra} ADA • +${monster.rewardXp} XP ${monster.level === 18 ? '• 💎 Ejderha Kristali' : (monster.isBoss ? '• 💠 Nadir Ganimet' : '')}
        </strong>
      </div>
    </div>

    <!-- Canlı Savaş Logu -->
    <div id="battle-live-log" class="clean-card" style="font-family: var(--font-body); font-size: 0.88rem; color: #cbd5e1; text-align: center; padding: 14px; min-height: 55px; display: flex; align-items: center; justify-content: center; background: #120c06;">
      ⚔️ Ordun savaşa hazır. Saldırı emrini ver!
    </div>

    <button id="btn-start-dungeon-fight" class="btn-clean btn-clean-green" style="font-size: 1.05rem; padding: 14px;">
      ⚔️ SALDIRIYA GEÇ
    </button>
  `;

  displayModal();

  const startFightBtn = document.getElementById('btn-start-dungeon-fight');
  const liveLog = document.getElementById('battle-live-log');
  const playerHpEl = document.getElementById('battle-player-hp');
  const monsterHpEl = document.getElementById('battle-monster-hp');

  startFightBtn.addEventListener('click', () => {
    startFightBtn.disabled = true;
    startFightBtn.innerText = '⚔️ Çarpışma Sürüyor...';
    liveLog.innerHTML = '⚡ Orduların kılıçları ve büyüleri çarpışıyor...';

    let round = 0;
    const fightInterval = setInterval(() => {
      round++;
      sound.playPickaxe();

      const pDmg = (army.infantry * 25) + (army.archer * 48) + (army.knight * 90) + 35;
      monsterHp = Math.max(0, monsterHp - pDmg);

      const mDmg = monster.atk + Math.floor(Math.random() * 20);
      playerHp = Math.max(0, playerHp - mDmg);

      playerHpEl.innerText = `❤️ Can: ${playerHp} / ${maxPlayerHp}`;
      monsterHpEl.innerText = `❤️ Can: ${monsterHp} / ${maxMonsterHp}`;

      liveLog.innerHTML = `💥 ${monster.name} üzerine <strong>-${pDmg} hasar</strong> vuruldu! (Düşman vuruşu: -${mDmg})`;

      if (monsterHp <= 0 || playerHp <= 0 || round >= 5) {
        clearInterval(fightInterval);
        const isVictory = (monsterHp <= 0 && playerHp > 0) || (round >= 5 && playerHp > monsterHp);

        if (isVictory) {
          sound.playLevelUp();

          // Zindan Ganimeti: XP, $ADASTRA, şansa bağlı Parça/Kilitli Sandık/Eser düşümü
          const dropRes = gameState.addDungeonXpAndDrops(monster.level, !!monster.isBoss);

          // Görev İlerlemesi (Günlük & Haftalık Zindan Avcısı Görevleri)
          gameState.progressQuest('daily_dungeon_kills', 1);
          gameState.progressQuest('weekly_dungeon_kills', 1);

          // Check if final boss (Level 18) is defeated
          if (monster.level === 18) {
            // Epic cycle reset
            gameState.state.dungeonProgress = 1;
            gameState.saveState();

            // Show epic celebration popup
            window.dispatchEvent(new CustomEvent('toast-notify', {
              detail: {
                message: '🏆 ZİNDAN DÖNGÜSÜ TAMAMLANDI! Zindan sıfırlandı ve 1. Kat 1. Seviyeden yeniden başladı!',
                type: 'success'
              }
            }));

            let dropsHtml = '';
            if (dropRes.fragmentsGained > 0) dropsHtml += `<div>🧩 +${dropRes.fragmentsGained} Parça</div>`;
            if (dropRes.boxGained > 0) dropsHtml += `<div>📦 +${dropRes.boxGained} Kilitli Sandık</div>`;
            if (dropRes.artifactDiscovered) dropsHtml += `<div>${dropRes.artifactDiscovered.icon} Yeni Eser Keşfedildi: ${dropRes.artifactDiscovered.name}!</div>`;
            if (dropRes.isBoss) dropsHtml += `<div>🔑 +1 Arena Anahtarı</div>`;

            liveLog.innerHTML = `
              <div style="color: #4ade80; font-weight: 800; font-size: 1rem;">
                🏆🏆🏆 EFSANEVI ZAFER! ${monster.name} YILDIRILDI! 🏆🏆🏆<br>
                <span style="color: #fde047; font-size: 0.9rem;">+${dropRes.adAstraGained} $ADASTRA • +${dropRes.xpGained} XP Hazinene Eklendi!</span>
                <div style="margin-top: 8px; font-size: 0.9rem; color: #c084fc; font-weight: 700;">⚡ ZİNDAN DÖNGÜSÜ TAMAMLANDI!</div>
                <div style="margin-top: 4px; font-size: 0.85rem; color: #a78bfa;">1. Kat 1. Seviyeden Yeniden Başla!</div>
                ${dropsHtml ? `<div style="margin-top: 6px; font-size: 0.85rem; color: #c084fc; display: flex; flex-direction: column; gap: 2px;">${dropsHtml}</div>` : ''}
              </div>
            `;
          } else {
            // Bir sonraki seviyenin kilidini aç
            window.dispatchEvent(new CustomEvent('monster-defeated', { detail: { level: monster.level } }));

            let dropsHtml = '';
            if (dropRes.fragmentsGained > 0) dropsHtml += `<div>🧩 +${dropRes.fragmentsGained} Parça</div>`;
            if (dropRes.boxGained > 0) dropsHtml += `<div>📦 +${dropRes.boxGained} Kilitli Sandık</div>`;
            if (dropRes.artifactDiscovered) dropsHtml += `<div>${dropRes.artifactDiscovered.icon} Yeni Eser Keşfedildi: ${dropRes.artifactDiscovered.name}!</div>`;
            if (dropRes.isBoss) dropsHtml += `<div>🔑 +1 Arena Anahtarı</div>`;

            liveLog.innerHTML = `
              <div style="color: #4ade80; font-weight: 800; font-size: 1rem;">
                🏆 ZAFER! ${monster.name} yok edildi!<br>
                <span style="color: #fde047; font-size: 0.9rem;">+${dropRes.adAstraGained} $ADASTRA • +${dropRes.xpGained} XP Hazinene Eklendi!</span>
                ${dropsHtml ? `<div style="margin-top: 6px; font-size: 0.85rem; color: #c084fc; display: flex; flex-direction: column; gap: 2px;">${dropsHtml}</div>` : ''}
              </div>
            `;
          }

          startFightBtn.innerText = 'KAPAT VE DEVAM ET';
          startFightBtn.disabled = false;
          startFightBtn.onclick = () => { closeModal(); renderTopBar(); };
        } else {
          liveLog.innerHTML = `<div style="color: #ef4444; font-weight: 800;">💀 BOZGUN! Ordun ağır darbe alıp geri çekildi.</div>`;
          startFightBtn.innerText = 'GERİ ÇEKİL';
          startFightBtn.disabled = false;
          startFightBtn.onclick = () => closeModal();
        }
      }
    }, 600);
  });
}

function renderExpeditionActiveBox(nodeId) {
  const nodeConfig = GAME_CONFIG.GLOBAL_RESOURCE_CAPS[nodeId];
  const accrued = gameState.getAccruedExpeditionHarvest(nodeId);
  const colorMap = { wood: '#4ade80', iron: '#38bdf8', wheat: '#facc15' };
  const nodeColor = colorMap[nodeId] || '#ca8a04';

  return `
    <div class="expedition-active-box" id="modal-exp-box-${nodeId}" style="border-color: ${nodeColor};">
      <div class="exp-active-header">
        <span class="exp-live-label" style="color: ${nodeColor};">⏳ ${nodeConfig.name} Seferi Sürüyor</span>
        <span class="exp-live-pct" id="modal-exp-pct-${nodeId}">%${accrued.pct}</span>
      </div>
      
      <div style="display: flex; justify-content: space-between; font-size: 0.85rem; color: #94a3b8; font-weight: 700;">
        <span>Kalan Süre:</span>
        <strong id="modal-exp-time-${nodeId}" style="color: #fff; font-size: 0.95rem;">${formatCountdown(accrued.remainingSeconds)}</strong>
      </div>

      <div class="exp-live-track">
        <div class="exp-live-fill" id="modal-exp-fill-${nodeId}" style="width: ${accrued.pct}%; background: linear-gradient(90deg, #ca8a04, ${nodeColor});"></div>
      </div>

      <div class="exp-accrued-row">
        <span>${nodeConfig.icon} Biriken Kaynak:</span>
        <strong class="exp-accrued-val" id="modal-exp-accrued-${nodeId}">+${accrued.accruedAmount} ${nodeConfig.name} (+${Math.floor(accrued.accruedAmount * 0.5)} XP)</strong>
      </div>

      <div class="exp-btn-row">
        <button class="btn-clean btn-clean-purple btn-modal-partial-claim" data-node="${nodeId}" id="btn-modal-partial-${nodeId}" style="flex: 1;" ${accrued.accruedAmount <= 0 ? 'disabled' : ''}>
          ⚡ ERKEN TOPLA (+${accrued.accruedAmount} Al)
        </button>
        ${accrued.isCompleted ? `
          <button class="btn-clean btn-clean-green btn-modal-claim" data-node="${nodeId}" style="flex: 1;">
            🏁 TAMAMLANDI - TÜMÜNÜ TOPLA
          </button>
        ` : ''}
      </div>
    </div>
  `;
}

// =========================================================================
// 4. BÖLGE MODALLERİ (ORMAN, MADEN, ÇİFTLİK, BALIKÇI, KIŞLA, TAVERNA, AMM PAZAR, KOLEZYUM)
// =========================================================================
function openTownZoneModal(zoneId, zoneName) {
  if (zoneId === 'barracks') {
    openBarracksModal();
    return;
  }
  if (zoneId === 'colosseum') {
    openColosseumModal();
    return;
  }

  const state = gameState.state;
  dom.modalTitle.innerHTML = `<span>📍</span> <span>${zoneName}</span>`;
  const currentDuration = gameState.getExpeditionDurationHours();

  let html = '';

  // 1. ORMAN (WOOD)
  if (zoneId === 'forest') {
    const playerTool = state.tools.axe || { durability: 0 };
    const axeCost = gameState.calculateRepairCost('axe');
    const activeExp = state.activeExpeditions.wood;
    const isSpeedActive = gameState.isBuffActive('speed_wood');

    html = `
      <div class="clean-card">
        <div class="card-title-row">
          <div class="card-title">🌲 Odun Kesim Seferi</div>
          <div class="card-badge">${currentDuration} Saatlik Sefer ${isSpeedActive ? '⚡ 1.5x Hızlı' : ''}</div>
        </div>
        
        <div class="durability-row">
          <span style="font-size: 0.95rem; font-weight: 700;">🪓 Balta Durumu:</span>
          <span class="card-badge" style="color: ${playerTool.durability <= 25 ? '#ef4444' : '#22c55e'};">%${playerTool.durability}</span>
        </div>

        ${activeExp ? renderExpeditionActiveBox('wood') : `
          <button class="btn-clean btn-modal-start" data-node="wood" ${playerTool.durability <= 0 || state.stamina < 25 ? 'disabled' : ''}>
            ${currentDuration} Saatlik Odun Görevine Gönder (-25 ⚡)
          </button>
        `}
      </div>

      <div class="clean-card">
        <div class="card-title-row">
          <div class="card-title">🔨 Balta Tamiratı</div>
          <span style="font-size: 0.85rem; color: #fde047; font-weight: 700;">${axeCost.resourceCost} Odun + ${axeCost.adAstraCost} ADA</span>
        </div>
        <button class="btn-clean btn-clean-outline btn-modal-repair" data-tool="axe" ${playerTool.durability >= 100 ? 'disabled' : ''}>
          ${playerTool.durability >= 100 ? 'Balta Tamamen Sağlam' : `Baltayı Onar (${axeCost.resourceCost} Odun + ${axeCost.adAstraCost} ADA)`}
        </button>
      </div>
    `;
  }

  // 2. MADEN (IRON) - Maden Seferleri & Tamirhane
  else if (zoneId === 'mine') {
    const pickaxeTool = state.tools.pickaxe || { durability: 0 };
    const pickCost = gameState.calculateRepairCost('pickaxe');
    const activeExp = state.activeExpeditions.iron;
    const isSpeedActive = gameState.isBuffActive('speed_iron');

    const tabsHtml = `
      <div class="phase2-tab-row">
        <button class="phase2-tab-btn mine-tab-btn ${mineActiveTab === 'mining' ? 'active' : ''}" data-tab="mining">⛏️ Maden Seferleri</button>
        <button class="phase2-tab-btn mine-tab-btn ${mineActiveTab === 'repair' ? 'active' : ''}" data-tab="repair">🔧 Tamirhane</button>
      </div>
    `;

    let contentHtml = '';

    if (mineActiveTab === 'mining') {
      contentHtml = `
        <div class="clean-card">
          <div class="card-title-row">
            <div class="card-title">⛏️ Demir Madeni Seferi</div>
            <div class="card-badge">${currentDuration} Saatlik Sefer ${isSpeedActive ? '⚡ 1.5x Hızlı' : ''}</div>
          </div>

          <div class="durability-row">
            <span style="font-size: 0.95rem; font-weight: 700;">⛏️ Kazma Durumu:</span>
            <span class="card-badge" style="color: ${pickaxeTool.durability <= 25 ? '#ef4444' : '#22c55e'};">%${pickaxeTool.durability}</span>
          </div>

          ${activeExp ? renderExpeditionActiveBox('iron') : `
            <button class="btn-clean btn-modal-start" data-node="iron" ${pickaxeTool.durability <= 0 || state.stamina < 25 ? 'disabled' : ''}>
              ${currentDuration} Saatlik Maden Görevine Gönder (-25 ⚡)
            </button>
          `}
        </div>
      `;
    } else {
      const slotNames = { weapon: 'Silah', helmet: 'Miğfer', armor: 'Gövde Zırhı', legs: 'Pantolon', boots: 'Ayakkabı' };
      const slotIcons = { weapon: '🗡️', helmet: '🪖', armor: '🛡️', legs: '👖', boots: '👢' };
      const currentEquip = state.equipment || {};
      const brokenSlots = ['weapon', 'helmet', 'armor', 'legs', 'boots'].filter(slot => currentEquip[slot]);

      const equipmentRepairCards = brokenSlots.map(slot => {
        const item = currentEquip[slot];
        const reforgeCost = gameState.calculateEquipmentReforgeCost(slot);
        const durPct = Math.floor((item.durability / 13) * 100);

        return `
          <div class="clean-card" style="border-left: 4px solid ${item.durability <= 0 ? '#ef4444' : '#22c55e'};">
            <div class="card-title-row">
              <div class="card-title">${item.icon} ${item.name} (${slotNames[slot]})</div>
              <span style="font-size: 0.8rem; color: ${item.durability <= 3 ? '#ef4444' : '#94a3b8'};">🛡️ ${item.durability}/13 ${item.durability === 0 ? '(KIRIK!)' : `(%${durPct})`}</span>
            </div>
            <button class="btn-clean btn-clean-outline btn-reforge-equipment" data-slot="${slot}" style="border-color: ${item.durability < 13 ? '#facc15' : '#582a08'}; color: #fde047;" ${item.durability >= 13 ? 'disabled' : ''}>
              ${item.durability >= 13 ? '✅ 13/13 Sağlam' : `🔧 Onar (${reforgeCost.ironCost}⛏️ + ${reforgeCost.woodCost}🌲 + ${reforgeCost.adAstraCost}ADA)`}
            </button>
          </div>
        `;
      }).join('');

      contentHtml = `
        <div class="clean-card">
          <div class="card-title">🔧 Tamirhane</div>
          <div class="clean-desc">Dayanıklılığı biten aletlerin ve kırık teçhizatların tamir edildiği yer. Yeni ekipman dövmek için Kışla'daki ⚒️ Demirci'yi ziyaret et.</div>
        </div>

        <div class="clean-card">
          <div class="card-title-row">
            <div class="card-title">🔨 Kazma Tamiratı</div>
            <span style="font-size: 0.85rem; color: #fde047; font-weight: 700;">${pickCost.resourceCost} Demir + ${pickCost.adAstraCost} ADA</span>
          </div>
          <button class="btn-clean btn-clean-outline btn-modal-repair" data-tool="pickaxe" ${pickaxeTool.durability >= 100 ? 'disabled' : ''}>
            ${pickaxeTool.durability >= 100 ? 'Kazma Tamamen Sağlam' : `Kazmayı Onar (${pickCost.resourceCost} Demir + ${pickCost.adAstraCost} ADA)`}
          </button>
        </div>

        ${brokenSlots.length > 0 ? equipmentRepairCards : `
          <div class="clean-card" style="text-align: center; color: #94a3b8;">
            Henüz dövülmüş bir teçhizatın yok. Kışla'daki ⚒️ Demirci'de yeni ekipman dövebilirsin.
          </div>
        `}
      `;
    }

    html = `${tabsHtml}${contentHtml}`;
  }

  // 3. ÇİFTLİK (WHEAT)
  else if (zoneId === 'farm') {
    const sickleTool = state.tools.sickle || { durability: 0 };
    const sickleCost = gameState.calculateRepairCost('sickle');
    const activeExp = state.activeExpeditions.wheat;
    const isSpeedActive = gameState.isBuffActive('speed_wheat');

    html = `
      <div class="clean-card">
        <div class="card-title-row">
          <div class="card-title">🌾 Buğday Hasat Seferi</div>
          <div class="card-badge">${currentDuration} Saatlik Sefer ${isSpeedActive ? '⚡ 1.5x Hızlı' : ''}</div>
        </div>
        
        <div class="durability-row">
          <span style="font-size: 0.95rem; font-weight: 700;">🌾 Orak Durumu:</span>
          <span class="card-badge" style="color: ${sickleTool.durability <= 25 ? '#ef4444' : '#22c55e'};">%${sickleTool.durability}</span>
        </div>

        ${activeExp ? renderExpeditionActiveBox('wheat') : `
          <button class="btn-clean btn-modal-start" data-node="wheat" ${sickleTool.durability <= 0 || state.stamina < 25 ? 'disabled' : ''}>
            ${currentDuration} Saatlik Hasat Görevine Gönder (-25 ⚡)
          </button>
        `}
      </div>

      <div class="clean-card">
        <div class="card-title-row">
          <div class="card-title">🔨 Orak Tamiratı</div>
          <span style="font-size: 0.85rem; color: #fde047; font-weight: 700;">${sickleCost.resourceCost} Buğday + ${sickleCost.adAstraCost} ADA</span>
        </div>
        <button class="btn-clean btn-clean-outline btn-modal-repair" data-tool="sickle" ${sickleTool.durability >= 100 ? 'disabled' : ''}>
          ${sickleTool.durability >= 100 ? 'Orak Tamamen Sağlam' : `Orağı Onar (${sickleCost.resourceCost} Buğday + ${sickleCost.adAstraCost} ADA)`}
        </button>
      </div>
    `;
  }

  // 4. AMM PAZAR YERİ (AUTOMATED MARKET MAKER DEX SWAP)
  else if (zoneId === 'market') {
    const marketTabsHtml = `
      <div class="phase2-tab-row">
        <button class="phase2-tab-btn market-tab-btn ${marketActiveTab === 'resources' ? 'active' : ''}" data-tab="resources">🪙 Hammadde Havuzları</button>
        <button class="phase2-tab-btn market-tab-btn ${marketActiveTab === 'fragments' ? 'active' : ''}" data-tab="fragments">🧩 Parça Ticareti</button>
      </div>
    `;

    html = `
      <div class="clean-card">
        <div class="card-title-row">
          <div class="card-title">🏪 AMM Pazar Yeri (DEX Likidite Havuzları)</div>
          <span style="font-size: 0.85rem; color: #c084fc; font-weight: 700;">Bakiye: ${state.adAstraBalance.toFixed(1)} ADA</span>
        </div>
        <div class="clean-desc">
          Automated Market Maker ($x \\cdot y = k$) sistemi: Pazara hammadde sattıkça havuzdaki kaynak artar ve ucuzlar; hammadde satın alındıkça fiyatı yükselir.
        </div>
      </div>

      ${marketTabsHtml}
    `;

    const renderAmmTradeCard = (resKey) => {
      const pool = ammMarket.pools[resKey];
      const price = ammMarket.getPrice(resKey);
      const invAmount = state.inventory[resKey] || 0;
      const initialBuy = 10;
      const initialSell = Math.min(10, invAmount > 0 ? invAmount : 10);

      const buyCost = ammMarket.getEstimatedCostForBuy(resKey, initialBuy);
      const sellGain = ammMarket.getEstimatedAdAstraForSell(resKey, initialSell);

      return `
        <div class="amm-card" data-res="${resKey}">
          <div class="amm-card-header">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 1.6rem;">${pool.icon}</span>
              <div>
                <div style="font-size: 1.02rem; font-weight: 800; color: #fff;">${pool.name} Havuzu</div>
                <div style="font-size: 0.78rem; color: #94a3b8;">
                  Havuz: <strong>${Math.floor(pool.resourceReserve).toLocaleString('tr-TR')} ${pool.name}</strong> • <strong>${Math.floor(pool.adAstraReserve).toLocaleString('tr-TR')} ADA</strong>
                </div>
              </div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 0.95rem; font-weight: 800; color: #facc15;">1 ${pool.name} = ${price >= 1000 ? price.toLocaleString('tr-TR', { maximumFractionDigits: 1 }) : price.toFixed(4)} $ADASTRA</div>
              <div style="font-size: 0.78rem; color: #cbd5e1;">Envanterin: <strong style="color: #4ade80;">${invAmount.toLocaleString('tr-TR')} Adet</strong></div>
            </div>
          </div>

          <div class="amm-trade-grid">
            <!-- Satın Al (Buy) -->
            <div class="amm-trade-box">
              <div class="amm-trade-title" style="color: #4ade80;">
                <span>🛒</span> <span>${pool.name} Satın Al</span>
              </div>
              <div class="amm-input-row">
                <input type="number" min="1" class="amm-number-input amm-buy-qty" data-res="${resKey}" value="${initialBuy}" placeholder="Adet..." />
              </div>
              <div class="amm-est-display">
                <span style="color: #94a3b8;">Maliyet:</span>
                <strong class="amm-est-cost-text" data-res="${resKey}" style="color: #f87171;">
                  ${isFinite(buyCost) ? `~${buyCost.toFixed(2)} ADA` : 'Yetersiz Likidite'}
                </strong>
              </div>
              <button class="btn-clean btn-clean-green btn-amm-confirm-buy" data-res="${resKey}" style="padding: 8px 12px; font-size: 0.82rem;">
                🟢 ONAYLA & SATIN AL
              </button>
            </div>

            <!-- Sat (Sell) -->
            <div class="amm-trade-box">
              <div class="amm-trade-title" style="color: #facc15;">
                <span>💰</span> <span>${pool.name} Sat</span>
              </div>
              <div class="amm-input-row">
                <input type="number" min="1" class="amm-number-input amm-sell-qty" data-res="${resKey}" value="${initialSell}" placeholder="Adet..." />
              </div>
              <div class="amm-est-display">
                <span style="color: #94a3b8;">Kazanç:</span>
                <strong class="amm-est-gain-text" data-res="${resKey}" style="color: #4ade80;">
                  ~${sellGain.toFixed(2)} ADA
                </strong>
              </div>
              <button class="btn-clean btn-clean-outline btn-amm-confirm-sell" data-res="${resKey}" style="padding: 8px 12px; font-size: 0.82rem; border-color: #facc15; color: #fde047;">
                🔴 ONAYLA & SAT
              </button>
            </div>
          </div>
        </div>
      `;
    };

    if (marketActiveTab === 'fragments') {
      html += `
        <div class="amm-trade-container">
          ${renderAmmTradeCard('fragments')}
        </div>
      `;
      dom.modalBody.innerHTML = html;
      displayModal();
      return;
    }

    html += `
      <!-- 3 AMM Kaynak Havuzu -->
      <div class="amm-trade-container">
        ${renderAmmTradeCard('wood')}
        ${renderAmmTradeCard('iron')}
        ${renderAmmTradeCard('wheat')}
      </div>
    `;
  }

  // 5. TAVERNA (MATEMATİKSEL BOOSTLAR & OTOMASYON)
  else if (zoneId === 'tavern') {
    const isBotActive = gameState.isBuffActive('auto_collector');
    const isWoodBuff = gameState.isBuffActive('speed_wood');
    const isIronBuff = gameState.isBuffActive('speed_iron');
    const isWheatBuff = gameState.isBuffActive('speed_wheat');

    html = `
      <div class="clean-card">
        <div class="card-title">🍺 Taverna Güçlendirmeleri & Otomasyon</div>
        <div class="clean-desc">
          Ekonomik dengeye göre optimize edilmiş 3 kademeli sefer iksirleri ve 24 saatlik otomatik toplama botu ile sefer verimini katla.
        </div>
      </div>

      <!-- 1. Otomatik Toplayıcı Bot -->
      <div class="clean-card" style="border-color: ${isBotActive ? '#4ade80' : '#78350f'};">
        <div class="card-title-row">
          <div class="card-title">🤖 24 Saatlik Otomatik Toplama Botu</div>
          <div class="card-badge" style="color: ${isBotActive ? '#4ade80' : '#facc15'};">
            ${isBotActive ? '✅ Aktif Çalışıyor' : '23.500 $ADASTRA'}
          </div>
        </div>
        <div class="clean-desc">Seferler tamamlandığında kaynakları otomatik toplar ve alet sağlamsa tekrar gönderir.</div>
        <button class="btn-clean btn-modal-buybuff" data-buff="auto_collector" ${isBotActive ? 'disabled' : ''}>
          ${isBotActive ? 'Bot Zaten Aktif' : 'Botu 24 Saatliğine Kirala (23.500 ADA)'}
        </button>
      </div>

      <!-- 2. Üç Kademeli Sefer İksirleri -->
      <div class="clean-card">
        <div class="card-title">⚡ Sefer Hızlandırıcı İksir Paketleri</div>
        <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 8px;">

          <!-- Kısa Darbe -->
          <div style="background: #140e08; padding: 10px 12px; border-radius: 8px; border: 1px solid #583007; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-weight: 800; font-size: 0.95rem; color: #38bdf8;">⚡ Kısa Darbe İksiri (1.50x Hız)</div>
              <div style="font-size: 0.78rem; color: #94a3b8;">2 Saat • 4.500 $ADASTRA</div>
            </div>
            <button class="btn-clean btn-clean-outline btn-modal-buybuff" data-buff="speed_wood" style="padding: 6px 12px; font-size: 0.8rem; width: auto;" ${isWoodBuff ? 'disabled' : ''}>
              ${isWoodBuff ? 'Aktif' : '4.500 ADA'}
            </button>
          </div>

          <!-- Standart Sefer -->
          <div style="background: #140e08; padding: 10px 12px; border-radius: 8px; border: 1px solid #583007; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-weight: 800; font-size: 0.95rem; color: #facc15;">⚡ Standart Sefer İksiri (1.75x Hız)</div>
              <div style="font-size: 0.78rem; color: #94a3b8;">6 Saat • 15.000 $ADASTRA</div>
            </div>
            <button class="btn-clean btn-clean-gold btn-modal-buybuff" data-buff="speed_iron" style="padding: 6px 12px; font-size: 0.8rem; width: auto;" ${isIronBuff ? 'disabled' : ''}>
              ${isIronBuff ? 'Aktif' : '15.000 ADA'}
            </button>
          </div>

          <!-- Büyük Sefer -->
          <div style="background: #140e08; padding: 10px 12px; border-radius: 8px; border: 1px solid #583007; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-weight: 800; font-size: 0.95rem; color: #c084fc;">⚡ Büyük Sefer İksiri (2.00x Hız - Balina)</div>
              <div style="font-size: 0.78rem; color: #94a3b8;">24 Saat • 45.000 $ADASTRA</div>
            </div>
            <button class="btn-clean btn-clean-purple btn-modal-buybuff" data-buff="speed_wheat" style="padding: 6px 12px; font-size: 0.8rem; width: auto;" ${isWheatBuff ? 'disabled' : ''}>
              ${isWheatBuff ? 'Aktif' : '45.000 ADA'}
            </button>
          </div>

        </div>
      </div>

      <!-- Stamina Fullleme -->
      <div class="clean-card">
        <div class="card-title">🥩 Ziyafet Sofrası (Stamina Fullleme)</div>
        <button class="btn-clean btn-clean-purple" id="btn-inn-refill">
          Staminayı Anında ${gameState.getMaxStamina()}/${gameState.getMaxStamina()} Fullle (50 $ADASTRA)
        </button>
      </div>
    `;
  }

  dom.modalBody.innerHTML = html;
  displayModal();
}

// =========================================================================
// 4.5 PHASE 2: ASKERİ KIŞLA (DEMİRCİ & 18 KİŞİLİK ORDU)
// =========================================================================
const BARRACKS_CLASS_NAMES = { warrior: 'Asker' };
const BARRACKS_CLASS_ICONS = { warrior: '⚔️' };

function renderBarracksHtml() {
  const state = gameState.state;
  let pendingBannerHtml = '';

  const tabsHtml = `
    <div class="phase2-tab-row">
      <button class="phase2-tab-btn barracks-tab-btn ${barracksActiveTab === 'equipment' ? 'active' : ''}" data-tab="equipment">⚒️ Demirci (5 Ekipman Döv)</button>
      <button class="phase2-tab-btn barracks-tab-btn ${barracksActiveTab === 'army' ? 'active' : ''}" data-tab="army">🛡️ Ordu Yönetimi</button>
      <button class="phase2-tab-btn barracks-tab-btn ${barracksActiveTab === 'armory' ? 'active' : ''}" data-tab="armory">📦 Akıllı Silah Deposu</button>
    </div>
  `;

  let contentHtml = '';

  if (barracksActiveTab === 'armory') {
    // Smart Armory Tab View
    const soldiers = state.soldierUnits || [];
    const playerEquip = state.equipment || {};
    const unassignedItems = [];
    ['weapon', 'helmet', 'armor', 'legs', 'boots'].forEach(slot => {
      if (playerEquip[slot]) unassignedItems.push({ slot, ...playerEquip[slot] });
    });

    contentHtml = `
      <div class="clean-card" style="margin-bottom:12px;">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
          <div>
            <div class="card-title">⚔️ Akıllı Silah Dağıtım & Donatım Hub'ı</div>
            <div class="clean-desc">Tüm dövülmüş eşyaları tek tıkla orduna dağıt veya tüm teçhizatları tek tıkla sök!</div>
          </div>
          <div style="display:flex; gap:8px;">
            <button class="btn-clean btn-clean-green btn-smart-auto-equip" style="width:auto; padding:8px 14px; font-size:0.8rem;">
              ⚡ En İyi Eşyaları Otomatik Dağıt
            </button>
            <button class="btn-clean btn-clean-gold btn-smart-unequip-all" style="width:auto; padding:8px 14px; font-size:0.8rem;">
              🔄 Tüm Eşyaları Sök
            </button>
          </div>
        </div>
      </div>
      <div class="armory-layout">
        <div class="armory-inv-panel">
          <div style="font-weight:800; font-size:0.9rem; color:#fde047; margin-bottom:8px;">
            📦 Boşta Kalan Dövülmüş Eşyalar (${unassignedItems.length})
          </div>
          ${unassignedItems.map(item => `
            <div class="armory-equip-item">
              <span style="font-size:1.2rem;">${item.slot === 'weapon' ? '🗡️' : (item.slot === 'helmet' ? '🪖' : (item.slot === 'armor' ? '🛡️' : (item.slot === 'legs' ? '👖' : '👢')))}</span>
              <div style="flex:1;">
                <div style="font-weight:700; color:#fff;">${item.name || item.slot}</div>
                <div style="font-size:0.75rem; color:#94a3b8;">
                  ${item.atkBonus ? `+${item.atkBonus} ATK ` : ''}${item.hpBonus ? `+${item.hpBonus} HP` : ''} • Dayanıklılık: ${item.durability || 100}%
                </div>
              </div>
              <span class="rarity-tag ${(item.rarity || 'rare').toLowerCase()}">${item.rarity || 'RARE'}</span>
            </div>
          `).join('') || '<div style="padding:20px; text-align:center; color:#94a3b8; font-size:0.8rem;">Envanterde boş eşya yok. Demirci sekmesinde yeni eşyalar dövebilirsin!</div>'}
        </div>

        <div class="armory-soldiers-panel">
          <div style="font-weight:800; font-size:0.9rem; color:#4ade80; margin-bottom:8px;">
            🛡️ 18 Kişilik Ordu Donatım Durumu
          </div>
          ${soldiers.map((sol, idx) => {
            const stats = gameState.getSoldierFullStats(idx);
            const setBonus = gameState.getSoldierSetBonus(idx);
            const slots = ['weapon', 'helmet', 'armor', 'legs', 'boots'];
            const filledSlots = slots.filter(s => sol.equipment && sol.equipment[s]).length;

            return `
              <div class="armory-soldier-mini ${selectedSoldierIndex === idx ? 'selected' : ''}" data-soldier-idx="${idx}">
                <span style="font-size:1.1rem;">${BARRACKS_CLASS_ICONS[sol.class] || '🛡️'}</span>
                <div style="flex:1;">
                  <div style="font-weight:700; color:#fff;">#${idx + 1} ${sol.name}</div>
                  <div style="font-size:0.72rem; color:#94a3b8;">
                    ⚔️ ${stats?.totalAtk || 20} ATK • ❤️ ${sol.hp || 100}/${stats?.totalMaxHp || 100} HP
                    ${setBonus ? `<span style="color:#c084fc; font-weight:700;"> • ✨ ${setBonus.name}</span>` : ''}
                  </div>
                </div>
                <div class="armory-slots-mini" title="${filledSlots}/5 Yuva Dolu">
                  ${slots.map(s => `<div class="armory-slot-dot ${sol.equipment && sol.equipment[s] ? 'filled' : ''}"></div>`).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  } else if (barracksActiveTab === 'equipment') {
    // 1. KRALİYET DEMİRCİSİ (5 EKİPMAN PARÇASI)
    const equipConfig = GAME_CONFIG.EQUIPMENT_RECIPES;
    const currentEquip = state.equipment || {};
    const totalStats = gameState.getEquipmentBonusStats();

    const slots = ['weapon', 'helmet', 'armor', 'legs', 'boots'];
    const slotNames = { weapon: 'Silah', helmet: 'Miğfer', armor: 'Gövde Zırhı', legs: 'Pantolon', boots: 'Ayakkabı' };

    contentHtml = `
      <div class="clean-card" style="border-color: #f59e0b; background: #1c140c;">
        <div class="card-title-row">
          <div class="card-title">⚒️ Kraliyet Demircisi - 5 Parça Ekipman Takımı</div>
          <span class="card-badge" style="color: #4ade80;">⚔️ +${totalStats.totalAtk} ATK | ❤️ +${totalStats.totalHp} HP</span>
        </div>
        <div class="clean-desc">
          Demirci ocağında tam 5 parça teçhizat dövebilirsin (Silah, Miğfer, Zırh, Pantolon, Ayakkabı). Tüm eşyalar <strong>13/13 Dayanıklılık</strong> ile başlar. Dayanıklılık bittiğinde <strong>örste yeniden dövülerek (13/13)</strong> tamir edilir! Demir, Odun ve ADA ile <strong>seviyeleri yükseltilebilir</strong>.
        </div>
      </div>

      <div class="equip-grid">
        ${slots.map(slot => {
          const recipe = equipConfig[slot];
          const item = currentEquip[slot];

          if (!item) {
            // Henüz Dövülmemiş (Craftable)
            return `
              <div class="equip-card" style="border-left: 4px solid #78350f;">
                <div class="equip-card-header">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 1.6rem;">${recipe.icon}</span>
                    <div>
                      <div style="font-size: 0.95rem; font-weight: 800; color: #fff;">${recipe.name} (${slotNames[slot]})</div>
                      <div style="font-size: 0.78rem; color: #94a3b8;">Temel Güç: ${recipe.baseAtk > 0 ? `+${recipe.baseAtk} ATK ` : ''}${recipe.baseHp > 0 ? `+${recipe.baseHp} HP` : ''} • 13/13 Dayanıklılık</div>
                    </div>
                  </div>
                  <span class="card-badge" style="color: #94a3b8;">Dövülmedi</span>
                </div>
                <div class="clean-desc" style="font-size: 0.8rem;">${recipe.desc}</div>
                <div style="background: #120905; padding: 8px 12px; border-radius: 8px; border: 1px solid #4a2105; display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: 700; color: #cbd5e1;">
                  <span>Maliyet:</span>
                  <span>🧩 ${recipe.cost.fragments} • ⛏️ ${recipe.cost.iron} • 🌲 ${recipe.cost.wood} • 🟣 ${recipe.cost.adAstra} ADA</span>
                </div>
                <button class="btn-clean btn-clean-green btn-craft-equipment" data-slot="${slot}" style="padding: 10px; font-size: 0.85rem;">
                  🔨 ÖRSTE DÖV (13/13 DAYANIKLILIK)
                </button>
              </div>
            `;
          }

          // Dövülmüş Eşya (Crafted & Equipped)
          const reforgeCost = gameState.calculateEquipmentReforgeCost(slot);
          const upgradeCost = gameState.calculateEquipmentUpgradeCost(slot);
          const durPct = Math.floor((item.durability / 13) * 100);

          return `
            <div class="equip-card" style="border-left: 4px solid ${item.durability <= 0 ? '#ef4444' : '#22c55e'};">
              <div class="equip-card-header">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 1.6rem;">${item.icon}</span>
                  <div>
                    <div style="font-size: 0.98rem; font-weight: 800; color: #fff;">${item.name} (${slotNames[slot]})</div>
                    <div style="font-size: 0.78rem; color: #fde047;">Seviye ${item.level} Şampiyon Teçhizatı</div>
                  </div>
                </div>
                <div style="display: flex; gap: 6px;">
                  <span class="card-badge" style="color: #4ade80;">⚔️ +${item.atkBonus || 0} ATK</span>
                  <span class="card-badge" style="color: #38bdf8;">❤️ +${item.hpBonus || 0} HP</span>
                </div>
              </div>

              <!-- Dayanıklılık Çubuğu -->
              <div style="display: flex; flex-direction: column; gap: 4px;">
                <div style="display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: 700;">
                  <span style="color: ${item.durability <= 3 ? '#ef4444' : '#cbd5e1'};">🛡️ Dayanıklılık: ${item.durability}/13 ${item.durability === 0 ? '(KIRIK - TEKRAR DÖVÜLMELİ!)' : ''}</span>
                  <span style="color: #94a3b8;">%${durPct}</span>
                </div>
                <div class="equip-durability-track">
                  <div class="equip-durability-fill" style="width: ${durPct}%;"></div>
                </div>
              </div>

              <div class="equip-actions-grid">
                <!-- Yeniden Döv (13/13 Durability) -->
                <button class="btn-clean btn-clean-outline btn-reforge-equipment" data-slot="${slot}" style="font-size: 0.78rem; padding: 8px; border-color: ${item.durability < 13 ? '#facc15' : '#582a08'}; color: #fde047;" ${item.durability >= 13 ? 'disabled' : ''}>
                  ${item.durability >= 13 ? '✅ 13/13 Sağlam' : `🔨 Tekrar Döv (${reforgeCost.ironCost}⛏️ + ${reforgeCost.woodCost}🌲 + ${reforgeCost.adAstraCost}ADA)`}
                </button>

                <!-- Geliştir (Seviye +1) -->
                <button class="btn-clean btn-clean-green btn-upgrade-equipment" data-slot="${slot}" style="font-size: 0.78rem; padding: 8px;">
                  ✨ Seviye ${upgradeCost.nextLevel}'e Yükselt (${upgradeCost.ironCost}⛏️ + ${upgradeCost.woodCost}🌲 + ${upgradeCost.adAstraCost}ADA)
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  } else if (barracksActiveTab === 'army') {
    const soldiers = state.soldierUnits || [];
    const maxSoldiers = GAME_CONFIG.MAX_SOLDIERS;
    const canBuy = soldiers.length < maxSoldiers && state.adAstraBalance >= GAME_CONFIG.SOLDIER_PRICE;

    if (soldiers.length === 0) {
      contentHtml = `
        <div class="clean-card" style="border-color: #38bdf8;">
          <div class="card-title">🛡️ Ordu Yönetimi</div>
          <div class="clean-desc">Henüz hiç askerin yok. İlk askerini satın alarak orduna başla! Maksimum ${maxSoldiers} askere kadar sahip olabilirsin.</div>
        </div>
        <div class="clean-card" style="background: #0c1117; border-color: #30a46c; text-align: center;">
          <div style="font-weight: 800; font-size: 1rem; margin-bottom: 10px; color: #94a3b8;">⚔️ Roster Boş</div>
          <button id="btn-buy-soldier-unit" class="btn-clean btn-clean-green" ${canBuy ? '' : 'disabled'}>
            ➕ Yeni Asker Satın Al (${GAME_CONFIG.SOLDIER_PRICE.toLocaleString('tr-TR')} ADA)
          </button>
        </div>
      `;
    } else {
      const actualSelectedIndex = soldiers[selectedSoldierIndex] ? selectedSoldierIndex : 0;
      const selectedSoldier = soldiers[actualSelectedIndex];
      const soldierStats = gameState.getSoldierFullStats(actualSelectedIndex) || { totalAtk: 20, totalMaxHp: 100, bonusAtk: 0, bonusHp: 0 };
      const slots = ['weapon', 'helmet', 'armor', 'legs', 'boots'];
      const slotNames = { weapon: 'Silah', helmet: 'Miğfer', armor: 'Gövde Zırhı', legs: 'Pantolon', boots: 'Ayakkabı' };
      const slotIcons = { weapon: '🗡️', helmet: '🪖', armor: '🛡️', legs: '👖', boots: '👢' };

      const rosterHtml = `
        <div class="soldier-roster-grid">
          ${soldiers.map((s, idx) => {
            const eqCount = Object.values(s.equipment || {}).filter(Boolean).length;
            const isAct = idx === actualSelectedIndex;
            const rarity = eqCount >= 5 ? 'rarity-legendary' : eqCount >= 3 ? 'rarity-epic' : eqCount >= 1 ? 'rarity-rare' : 'rarity-common';
            const heal = gameState.getSoldierHealInfo(idx) || { hp: s.hp, maxHp: s.maxHp, hpPct: 100, isFull: true, isPaused: false };
            const hpBarColor = heal.hpPct <= 25 ? '#ef4444' : heal.hpPct <= 60 ? '#f97316' : '#4ade80';
            return `
              <div class="soldier-roster-card ${rarity} ${isAct ? 'active' : ''} btn-select-soldier-card" data-soldier-idx="${idx}">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-size: 1.2rem;">⚔️</span>
                  <span style="font-size: 0.72rem; color: #4ade80; font-weight: 700;">${eqCount}/5 Yuva</span>
                </div>
                <div style="font-size: 0.82rem; font-weight: 800; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${s.name}</div>
                <div style="font-size: 0.7rem; color: #94a3b8; margin-bottom: 3px;">Seviye ${s.level || 1}</div>
                <div class="soldier-hp-track">
                  <div class="soldier-hp-fill" style="width: ${heal.hpPct}%; background: ${hpBarColor};"></div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 2px;">
                  <span style="font-size: 0.68rem; font-weight: 700; color: ${hpBarColor};">${heal.hp}/${heal.maxHp} HP</span>
                  ${heal.isFull
                    ? `<span style="font-size: 0.62rem; color: #4ade80;">✅ Tam Can</span>`
                    : heal.isPaused
                      ? `<span class="soldier-heal-badge-warning">⚠️ Buğday Yok</span>`
                      : `<span style="font-size: 0.62rem; color: #94a3b8;">⏳ İyileşiyor</span>`
                  }
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;

      const buyMoreHtml = soldiers.length < maxSoldiers ? `
        <div class="clean-card" style="background: #0c1117; border-color: #30a46c; display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 10px;">
          <div>
            <div style="font-weight: 800; font-size: 0.92rem;">➕ Yeni Asker Satın Al</div>
            <div style="font-size: 0.78rem; color: #94a3b8;">${soldiers.length}/${maxSoldiers} Asker • 🟣 ${GAME_CONFIG.SOLDIER_PRICE.toLocaleString('tr-TR')} ADA</div>
          </div>
          <button id="btn-buy-soldier-unit" class="btn-clean btn-clean-green" style="width: auto; padding: 10px 16px;" ${canBuy ? '' : 'disabled'}>
            ⚔️ SATIN AL
          </button>
        </div>
      ` : `
        <div class="clean-card" style="background: #0c1117; border-color: #ef4444; text-align: center; margin-top: 10px;">
          <div style="font-weight: 700; color: #ef4444;">🛡️ Maksimum Asker Sayısına Ulaştın! (${maxSoldiers}/${maxSoldiers})</div>
        </div>
      `;

      const equipmentSlotsHtml = slots.map(slot => {
        const equippedItem = (selectedSoldier.equipment || {})[slot];
        const inventoryItem = (state.equipment || {})[slot];

        if (equippedItem) {
          const eqLevel = equippedItem.level || 1;
          const eqRarity = eqLevel >= 5 ? 'rarity-legendary' : eqLevel >= 3 ? 'rarity-epic' : eqLevel >= 2 ? 'rarity-rare' : '';
          return `
            <div class="soldier-slot-item equipped ${eqRarity}">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="font-weight: 800; font-size: 0.9rem; color: #fff;">${equippedItem.icon} ${equippedItem.name}</div>
                <span class="card-badge" style="color: #4ade80;">13/13</span>
              </div>
              <div style="font-size: 0.75rem; color: #fde047;">${slotNames[slot]} • Seviye ${equippedItem.level || 1} (+${equippedItem.atkBonus || 0} ATK, +${equippedItem.hpBonus || 0} HP)</div>
              <button class="btn-clean btn-clean-red btn-soldier-unequip-slot" data-soldier-idx="${actualSelectedIndex}" data-slot="${slot}" style="padding: 6px; font-size: 0.75rem;">
                ✕ ÇIKAR (Karakter Envanterine Aktar)
              </button>
            </div>
          `;
        } else {
          return `
            <div class="soldier-slot-item">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="font-weight: 700; font-size: 0.85rem; color: #94a3b8;">${slotIcons[slot]} ${slotNames[slot]} Yuvası</div>
                <span style="font-size: 0.72rem; color: #64748b;">BOŞ</span>
              </div>
              ${inventoryItem ? `
                <button class="btn-clean btn-clean-green btn-soldier-equip-slot" data-soldier-idx="${actualSelectedIndex}" data-slot="${slot}" style="padding: 6px; font-size: 0.75rem;">
                  ➕ ${inventoryItem.icon} ${inventoryItem.name} Kuşan
                </button>
              ` : `
                <div style="font-size: 0.72rem; color: #64748b; text-align: center; padding: 4px;">Demirci sekmesinden dövülmeli</div>
              `}
            </div>
          `;
        }
      }).join('');

      contentHtml = `
        <div class="clean-card" style="border-color: #38bdf8;">
          <div class="card-title-row">
            <div class="card-title">🛡️ Ordu Yönetimi (Asker Seç & Donat)</div>
            <span class="card-badge" style="color: #38bdf8;">${soldiers.length}/${maxSoldiers} Asker</span>
          </div>
          <div class="clean-desc">Aşağıdaki askerlerden birine tıkla; Demirci'de dövdüğün 5 parça teçhizatı (Silah, Miğfer, Zırh, Pantolon, Bot) doğrudan o askerin envanterine kuşandır!</div>
          ${rosterHtml}
          ${buyMoreHtml}
        </div>

        <div class="soldier-sheet-card">
          <div class="soldier-sheet-header">
            <div>
              <div style="font-size: 1.1rem; font-weight: 800; color: #fff;">
                ⚔️ ${selectedSoldier.name}
              </div>
              <div style="font-size: 0.8rem; color: #fde047; margin-top: 2px;">
                Seviye ${selectedSoldier.level || 1} Asker • Özel Teçhizat Envanteri
              </div>
            </div>
            <div style="display: flex; gap: 8px;">
              <span class="card-badge" style="color: #ef4444;">⚔️ ${soldierStats.totalAtk} Toplam ATK</span>
              <span class="card-badge" style="color: #22c55e;">❤️ ${soldierStats.totalMaxHp} Toplam HP</span>
            </div>
          </div>

          ${(() => {
            const setBonus = gameState.getSoldierSetBonus(actualSelectedIndex);
            if (!setBonus) return '';
            return `
          <div class="set-badge-banner">
            <span style="position:relative;z-index:1;">✨ SET BONUSU: ${setBonus.name} — ${setBonus.desc}</span>
          </div>`;
          })()}

          ${(() => {
            const heal = gameState.getSoldierHealInfo(actualSelectedIndex);
            if (!heal) return '';
            const hpColor = heal.hpPct <= 25 ? '#ef4444' : heal.hpPct <= 60 ? '#f97316' : '#4ade80';
            const hh = Math.floor(heal.secondsRemaining / 3600);
            const mm = Math.floor((heal.secondsRemaining % 3600) / 60);

            return `
          <div class="soldier-heal-panel">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span style="font-size: 0.85rem; font-weight: 700; color: #cbd5e1;">❤️ Can Barı</span>
              <span style="font-weight: 800; font-size: 0.9rem; color: ${hpColor};">${heal.hp} / ${heal.maxHp} HP</span>
            </div>
            <div class="soldier-hp-track soldier-hp-track-large">
              <div class="soldier-hp-fill" style="width: ${heal.hpPct}%; background: ${hpColor};"></div>
            </div>

            <div class="soldier-heal-status-row">
              <span style="color: ${heal.isFull ? '#4ade80' : '#f97316'};">
                ${heal.isFull ? '✅ Tamamen İyileşti' : `⏳ Tam Can İçin Kalan: ${hh}s ${mm}dk`}
              </span>
              <span style="color: #94a3b8;">🌾 Gereken Buğday: ${heal.wheatNeeded} Buğday (Depoda: ${heal.wheatInStock})</span>
            </div>

            ${heal.isPaused ? `<div class="soldier-heal-badge-warning-full">⚠️ Depoda Yetersiz Buğday! İyileşme Durdu</div>` : ''}

            <button class="btn-clean btn-clean-purple btn-soldier-instant-heal" data-soldier-idx="${actualSelectedIndex}" style="margin-top: 8px;" ${heal.isFull ? 'disabled' : ''}>
              ${heal.isFull ? '✅ Zaten Tam Can' : `⚡ Hızlı Doyur (${heal.wheatNeeded} 🌾 + ${heal.adaCost} 🟣 ADA)`}
            </button>
          </div>`;
          })()}

          <div style="font-size: 0.85rem; font-weight: 700; color: #cbd5e1; margin-bottom: 4px;">🎯 5 Parça Teçhizat Yuvası:</div>
          <div class="soldier-slots-grid">
            ${equipmentSlotsHtml}
          </div>
        </div>
      `;
    }
  }

  return `${pendingBannerHtml}${tabsHtml}${contentHtml}`;
}

function openBarracksModal() {
  dom.modalTitle.innerHTML = `<span>⚔️</span> <span>ASKERİ KIŞLA & TALİM KAMPI</span>`;
  dom.modalBody.innerHTML = renderBarracksHtml();
  displayModal();
}

// Kışla Paneli açıkken (18 Kişilik Ordu sekmesi) can barlarını, kalan iyileşme süresini
// ve buğday ihtiyacını canlı tutmak için ~1.5 saniyede bir modal gövdesini yeniden çizer.
function refreshBarracksLiveUI(deltaSeconds) {
  if (!dom.rpgModal || !dom.rpgModal.classList.contains('active')) return;
  if (barracksActiveTab !== 'army') return;
  if (!document.querySelector('.soldier-roster-grid')) return;

  barracksLiveRefreshAccumulator += deltaSeconds;
  if (barracksLiveRefreshAccumulator < 1.5) return;
  barracksLiveRefreshAccumulator = 0;

  dom.modalBody.innerHTML = renderBarracksHtml();
}

// =========================================================================
// 4.6 PHASE 2: BÜYÜK KOLEZYUM - 18v18 GLADYATÖR ARENA SAVAŞI
// =========================================================================
function buildPlayerArenaSquad(state) {
  return state.soldierUnits.map((soldier, idx) => {
    // Kuşanılmış 5 yuvanın (Silah, Miğfer, Zırh, Pantolon, Ayakkabı) tüm bonuslarını ve set bonusunu içerir
    const fullStats = gameState.getSoldierFullStats(idx) || { totalAtk: soldier.baseAtk || 20, totalMaxHp: soldier.maxHp || 100 };
    // Kışla'da henüz iyileşmemiş askerler Kolezyum'a eksik canla girer (mevcut HP oranı taşınır)
    const woundedRatio = Math.min(1, Math.max(0, (soldier.hp != null ? soldier.hp : (soldier.maxHp || 100)) / (soldier.maxHp || 100)));
    return { icon: BARRACKS_CLASS_ICONS[soldier.class] || '⚔️', hp: Math.max(1, Math.round(fullStats.totalMaxHp * woundedRatio)), atk: fullStats.totalAtk };
  });
}

function buildGladiatorSquad() {
  const roster = [];
  for (let i = 0; i < 18; i++) {
    roster.push({ icon: '⚔️', hp: 120, atk: 22 });
  }
  return roster;
}

function renderArenaUnitGrid(squad, deadCount) {
  return squad.map((unit, i) => `<div class="arena-unit ${i < deadCount ? 'dead' : ''}">${unit.icon}</div>`).join('');
}

function openColosseumModal() {
  const state = gameState.state;
  const soldiers = state.soldierUnits || [];
  const hasSoldiers = soldiers.length > 0;

  dom.modalTitle.innerHTML = `<span>🏟️</span> <span>BÜYÜK GLADYATÖR KOLEZYUMU</span>`;

  dom.modalBody.innerHTML = `
    <div class="clean-card" style="border-color: #ef4444; background: #1c1012;">
      <div class="card-title-row">
        <div class="card-title">🏟️ 18v18 Gladyatör Arena Savaşı</div>
        <span class="card-badge" style="color: #fde047;">🔑 ${state.arenaKeys || 0} Anahtar</span>
      </div>
      <div class="clean-desc">
        ${hasSoldiers ? `Ordun (${soldiers.length} Asker) ile Kolezyum'un en acımasız gladyatör mangasına karşı taktik meydan savaşına gir! Zafer; $ADASTRA, ordu tecrübesi ve bir 🔑 Arena Anahtarı kazandırır.` : '⚠️ Kolezyum Arenasında savaşmak için önce Kışla\'dan asker satın almalısın!'}
      </div>
      <button id="btn-start-arena-battle" class="btn-clean btn-clean-green" style="font-size: 1.02rem; padding: 13px;" ${hasSoldiers ? '' : 'disabled'}>
        ${hasSoldiers ? '⚔️ 18v18 SAVAŞA BAŞLA' : '⚠️ Orduda Asker Yok (Kışla\'dan Asker Al)'}
      </button>
    </div>

    <div class="arena-battlefield">
      <div class="arena-squad player-squad">
        <div class="arena-squad-title">🛡️ AlphAvax Ordusu (${soldiers.length} Asker)</div>
        <div class="arena-hp-track"><div id="arena-player-hp-fill" class="arena-hp-fill player" style="width: 100%;"></div></div>
        <div id="arena-player-grid" class="arena-unit-grid"></div>
      </div>
      <div class="arena-vs-badge">VS</div>
      <div class="arena-squad enemy-squad">
        <div class="arena-squad-title">💀 Kolezyum Gladyatörleri</div>
        <div class="arena-hp-track"><div id="arena-enemy-hp-fill" class="arena-hp-fill enemy" style="width: 100%;"></div></div>
        <div id="arena-enemy-grid" class="arena-unit-grid"></div>
      </div>
    </div>

    <div id="arena-combat-log" class="clean-card arena-combat-log">
      ${hasSoldiers ? '⚔️ Ordular karşı karşıya... Savaşı başlatmak için düğmeye bas!' : '⚠️ Savaşı başlatmak için önce orduna asker katmalısın.'}
    </div>
  `;

  displayModal();

  const playerSquad = buildPlayerArenaSquad(state);
  const enemySquad = buildGladiatorSquad();
  const playerGridEl = document.getElementById('arena-player-grid');
  const enemyGridEl = document.getElementById('arena-enemy-grid');
  playerGridEl.innerHTML = renderArenaUnitGrid(playerSquad, 0);
  enemyGridEl.innerHTML = renderArenaUnitGrid(enemySquad, 0);

  const startBtn = document.getElementById('btn-start-arena-battle');
  const logEl = document.getElementById('arena-combat-log');
  const playerHpFill = document.getElementById('arena-player-hp-fill');
  const enemyHpFill = document.getElementById('arena-enemy-hp-fill');

  startBtn.addEventListener('click', () => {
    startBtn.disabled = true;
    startBtn.innerText = '⚔️ Savaş Sürüyor...';

    const playerMaxHp = playerSquad.reduce((sum, u) => sum + u.hp, 0);
    const playerAtk = playerSquad.reduce((sum, u) => sum + u.atk, 0);
    const enemyMaxHp = enemySquad.reduce((sum, u) => sum + u.hp, 0);
    const enemyAtk = enemySquad.reduce((sum, u) => sum + u.atk, 0);

    let playerHp = playerMaxHp;
    let enemyHp = enemyMaxHp;
    let round = 0;

    const battleInterval = setInterval(() => {
      round++;
      sound.playPickaxe();

      const pDmg = Math.floor(playerAtk * (0.85 + Math.random() * 0.3));
      const eDmg = Math.floor(enemyAtk * (0.85 + Math.random() * 0.3));
      enemyHp = Math.max(0, enemyHp - pDmg);
      playerHp = Math.max(0, playerHp - eDmg);

      const playerDeadCount = 18 - Math.ceil((playerHp / playerMaxHp) * 18);
      const enemyDeadCount = 18 - Math.ceil((enemyHp / enemyMaxHp) * 18);

      playerHpFill.style.width = `${Math.max(0, (playerHp / playerMaxHp) * 100)}%`;
      enemyHpFill.style.width = `${Math.max(0, (enemyHp / enemyMaxHp) * 100)}%`;
      playerGridEl.innerHTML = renderArenaUnitGrid(playerSquad, playerDeadCount);
      enemyGridEl.innerHTML = renderArenaUnitGrid(enemySquad, enemyDeadCount);

      logEl.innerHTML = `⚔️ Tur ${round}: Ordun <strong>-${pDmg} hasar</strong> verdi, gladyatörler <strong>-${eDmg} hasar</strong> ile karşılık verdi!`;

      if (enemyHp <= 0 || playerHp <= 0 || round >= 10) {
        clearInterval(battleInterval);
        const isVictory = (enemyHp <= 0 && playerHp > 0) || (round >= 10 && playerHp > enemyHp);

        // Kolezyumda alınan hasarı orduya oranla dağıt: her askerin HP'si savaşta aldığı yara oranında düşer.
        // Askerler ölmez (min 1 HP), sonrasında Kışla'daki Buğday ile pasif/anında iyileşme sistemiyle tedavi edilirler.
        const damagePct = Math.min(1, Math.max(0, (playerMaxHp - playerHp) / playerMaxHp));
        state.soldierUnits.forEach(soldier => {
          const maxHp = soldier.maxHp || 100;
          const currentHp = soldier.hp != null ? soldier.hp : maxHp;
          const dmg = Math.round(currentHp * damagePct);
          soldier.hp = Math.max(1, currentHp - dmg);
        });

        if (isVictory) {
          sound.playLevelUp();
          const adaReward = 220 + Math.floor(Math.random() * 120);
          const xpReward = 260 + Math.floor(Math.random() * 140);
          state.adAstraBalance += adaReward;
          state.currentXp += xpReward;
          gameState.addArenaKey(1);

          // Hayatta kalan askerlere tecrübe puanı dağıt (ölenler XP kazanmaz)
          state.soldierUnits.forEach((soldier, i) => {
            if (i >= playerDeadCount) {
              soldier.xp = (soldier.xp || 0) + 25;
              const xpTarget = soldier.level * 120;
              if (soldier.xp >= xpTarget && soldier.level < 20) {
                soldier.xp -= xpTarget;
                soldier.level += 1;
              }
            }
          });
          gameState.saveState();

          logEl.innerHTML = `
            <div style="color: #4ade80; font-weight: 800; font-size: 1rem;">
              🏆 ZAFER! Kolezyum Gladyatörleri yenildi!<br>
              <span style="color: #fde047; font-size: 0.9rem;">+${adaReward} $ADASTRA • +${xpReward} XP • Hayatta kalan askerlere +25 XP</span>
              <div class="arena-key-reward">🔑 +1 Arena Anahtarı Kazanıldı!</div>
            </div>
          `;
          startBtn.innerText = 'KAPAT VE DEVAM ET';
          startBtn.disabled = false;
          startBtn.onclick = () => { closeModal(); renderTopBar(); };
        } else {
          gameState.saveState();
          logEl.innerHTML = `<div style="color: #ef4444; font-weight: 800;">💀 BOZGUN! Ordun Kolezyum'da ağır darbe aldı ve geri çekildi. Askerlerin can kaybetti, Kışla'da Buğday ile iyileştir!</div>`;
          startBtn.innerText = 'GERİ ÇEKİL';
          startBtn.disabled = false;
          startBtn.onclick = () => closeModal();
        }
      }
    }, 550);
  });
}

// =========================================================================
// 4.7 PHASE 2: 18 PARÇALIK NFT KOLEKSİYONU & KİLİTLİ KUTULAR
// =========================================================================
function renderCollectionHtml() {
  const state = gameState.state;

  const tabsHtml = `
    <div class="phase2-tab-row">
      <button class="phase2-tab-btn collection-tab-btn ${collectionActiveTab === 'koleksiyon' ? 'active' : ''}" data-tab="koleksiyon">👑 Koleksiyon (18 Eser)</button>
      <button class="phase2-tab-btn collection-tab-btn ${collectionActiveTab === 'kutular' ? 'active' : ''}" data-tab="kutular">📦 Kilitli Kutular</button>
    </div>
  `;

  let contentHtml = '';

  if (collectionActiveTab === 'koleksiyon') {
    const discoveredCount = state.collectionArtifacts.filter(a => a.discovered).length;
    const requiredCount = GAME_CONFIG.GENESIS_NFT.requiredArtifacts;
    const allDiscovered = discoveredCount >= requiredCount;
    const genesisMinted = state.genesisNftMinted;

    const artifactCards = state.collectionArtifacts.map(a => {
      const cfg = GAME_CONFIG.COLLECTION_ARTIFACTS.find(c => c.id === a.id);
      if (!a.discovered) {
        return `<div class="artifact-card locked" title="Henüz keşfedilmedi"><span>❓</span><span class="artifact-lock-icon">🔒</span></div>`;
      }
      return `<div class="artifact-card rarity-${cfg.rarity}" title="${cfg.name}: ${cfg.lore}"><span>${cfg.icon}</span></div>`;
    }).join('');

    contentHtml = `
      <div class="clean-card genesis-banner ${allDiscovered && !genesisMinted ? 'ready' : ''}">
        <div class="card-title-row">
          <div class="card-title">🏆 ${GAME_CONFIG.GENESIS_NFT.name}</div>
          <span class="card-badge">${discoveredCount}/${requiredCount} Eser</span>
        </div>
        <div class="clean-desc">Zindan bosslarını yenerek ve Kilitli Sandıklar açarak 18 Koleksiyon Eserinin tamamını topla; ardından efsanevi Genesis NFT'ni bas!</div>
        <button id="btn-mint-genesis" class="btn-clean btn-clean-purple" ${(!allDiscovered || genesisMinted) ? 'disabled' : ''}>
          ${genesisMinted ? '✅ Genesis NFT Zaten Basıldı' : `🏆 GENESIS NFT BAS (${GAME_CONFIG.GENESIS_NFT.adAstraCost} ADA)`}
        </button>
      </div>
      <div class="collection-grid">${artifactCards}</div>
    `;
  } else {
    const lockedBoxes = state.lockedBoxes || 0;
    const arenaKeys = state.arenaKeys || 0;
    const canOpen = lockedBoxes > 0 && arenaKeys > 0;

    let revealHtml = '';
    if (lastBoxResult) {
      revealHtml = `<div class="clean-card box-reveal-card"><div class="card-title">🎉 ${lastBoxResult.message}</div></div>`;
    }

    const boxCount = Math.min(lockedBoxes, 12);
    const boxesHtml = boxCount > 0
      ? Array.from({ length: boxCount }, () => `<div class="mystery-box-item">📦</div>`).join('')
      : `<div class="phase2-empty-state">Şu anda açılacak bir Kilitli Sandığın yok. Zindanlarda canavar öldürerek şansını dene!</div>`;

    contentHtml = `
      <div class="clean-card">
        <div class="card-title-row">
          <div class="card-title">📦 Kilitli Sandıklar</div>
          <span class="card-badge">🔑 ${arenaKeys} Anahtar</span>
        </div>
        <div class="clean-desc">Her sandığı açmak 1 🔑 Arena Anahtarı gerektirir. Anahtarları Zindan bosslarını yenerek veya 18v18 Kolezyum Savaşını kazanarak topla!</div>
      </div>
      ${revealHtml}
      <div class="mystery-box-grid">${boxesHtml}</div>
      <button id="btn-open-mystery-box" class="btn-clean btn-clean-green" ${canOpen ? '' : 'disabled'}>
        📦 SANDIK AÇ (1 🔑 Anahtar Harca) — ${lockedBoxes} Sandık Mevcut
      </button>
    `;
  }

  return tabsHtml + contentHtml;
}

function openCollectionModal(initialTab) {
  if (initialTab) {
    collectionActiveTab = initialTab;
    lastBoxResult = null;
  }
  dom.modalTitle.innerHTML = `<span>👑</span> <span>18 PARÇALIK NFT KOLEKSİYONU & KİLİTLİ KUTULAR</span>`;
  dom.modalBody.innerHTML = renderCollectionHtml();
}

// =========================================================================
// 4.8 GÜNLÜK & HAFTALIK GÖREVLER MODALI (QUEST ENGINE)
// =========================================================================
let questsActiveTab = 'daily';

function openQuestsModal() {
  gameState.checkQuestResets();
  dom.modalTitle.innerHTML = `<span>📜</span> <span>GÜNLÜK & HAFTALIK GÖREVLER</span>`;
  const state = gameState.state;
  const progress = state.questProgress || {};
  const claimed = state.claimedQuests || {};

  const tabsHtml = `
    <div class="phase2-tab-row">
      <button class="phase2-tab-btn quest-tab-btn ${questsActiveTab === 'daily' ? 'active' : ''}" data-tab="daily">☀️ Günlük Görevler</button>
      <button class="phase2-tab-btn quest-tab-btn ${questsActiveTab === 'weekly' ? 'active' : ''}" data-tab="weekly">🏆 Haftalık Görevler</button>
    </div>
  `;

  const list = questsActiveTab === 'weekly' ? (GAME_CONFIG.WEEKLY_QUESTS || []) : (GAME_CONFIG.DAILY_QUESTS || []);

  const questCards = list.map(q => {
    const curr = Math.min(q.target, progress[q.id] || 0);
    const isDone = curr >= q.target;
    const isClaimed = claimed[q.id] || false;
    const pct = Math.min(100, Math.floor((curr / q.target) * 100));

    return `
      <div class="clean-card" style="border-left: 4px solid ${isClaimed ? '#64748b' : (isDone ? '#22c55e' : '#f59e0b')};">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <div>
            <div style="font-weight: 800; font-size: 0.95rem; color: #fff;">${q.title}</div>
            <div style="font-size: 0.78rem; color: #94a3b8; margin-top: 2px;">${q.desc}</div>
          </div>
          <span class="card-badge" style="color: ${isDone ? '#4ade80' : '#facc15'};">${curr} / ${q.target}</span>
        </div>

        <div class="progress-wrapper" style="margin-bottom: 8px;">
          <div class="progress-bar" style="width: ${pct}%;"></div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="font-size: 0.8rem; font-weight: 700; color: #fde047;">
            🎁 Ödül: +${q.rewardAda} ADA • +${q.rewardXp} XP • +${q.rewardFragments} 🧩
          </div>
          <button class="btn-clean ${isDone && !isClaimed ? 'btn-clean-green' : 'btn-clean-outline'} btn-claim-quest-reward" data-quest-id="${q.id}" data-type="${questsActiveTab}" style="padding: 6px 14px; font-size: 0.8rem; width: auto;" ${(!isDone || isClaimed) ? 'disabled' : ''}>
            ${isClaimed ? '✅ Alındı' : (isDone ? '🎁 ÖDÜLÜ AL' : '⏳ Sürüyor')}
          </button>
        </div>
      </div>
    `;
  }).join('');

  dom.modalBody.innerHTML = `
    ${tabsHtml}
    <div class="clean-card">
      <div class="card-title">📜 Krallık Görevleri & Başarımlar</div>
      <div class="clean-desc">Görevleri tamamlayarak ekstra $ADASTRA, XP ve Zindan Parçaları (🧩) kazan!</div>
    </div>
    ${questCards}
  `;

  displayModal();
}

// =========================================================================
// 4.9 BİLDİRİM MERKEZİ (NOTIFICATION CENTER)
// =========================================================================
const realmNotifications = [
  { id: 1, icon: '🏰', text: 'AdAstra Krallığına hoş geldin! Krallığını büyütmek için sefere çık.', time: 'Şimdi', unread: true },
  { id: 2, icon: '📜', text: 'Günlük ve Haftalık görevlerin hazır! (Q)', time: 'Şimdi', unread: true }
];

function addNotification(icon, text) {
  realmNotifications.unshift({
    id: Date.now(),
    icon: icon || '🔔',
    text,
    time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
    unread: true
  });
  updateNotificationBadge();
}

function updateNotificationBadge() {
  const badge = document.getElementById('notif-badge');
  const unreadCount = realmNotifications.filter(n => n.unread).length;
  if (badge) {
    badge.innerText = unreadCount;
    badge.style.display = unreadCount > 0 ? 'flex' : 'none';
  }
}

function toggleNotificationPanel() {
  let panel = document.getElementById('notif-dropdown-panel');
  if (panel) {
    panel.remove();
    return;
  }

  realmNotifications.forEach(n => n.unread = false);
  updateNotificationBadge();

  panel = document.createElement('div');
  panel.id = 'notif-dropdown-panel';
  panel.className = 'notif-panel';

  const itemsHtml = realmNotifications.slice(0, 10).map(n => `
    <div class="notif-item ${n.unread ? 'unread' : ''}">
      <span class="notif-item-icon">${n.icon}</span>
      <div class="notif-item-text">
        <div>${n.text}</div>
        <div class="notif-item-time">${n.time}</div>
      </div>
    </div>
  `).join('');

  panel.innerHTML = `
    <div class="notif-panel-header">
      <span>🔔 BİLDİRİM MERKEZİ</span>
      <span style="font-size:0.7rem; color:#94a3b8; cursor:pointer;" id="btn-clear-notifs">Temizle</span>
    </div>
    <div style="max-height: 340px; overflow-y: auto;">
      ${itemsHtml || '<div style="padding:16px; text-align:center; color:#94a3b8; font-size:0.8rem;">Yeni bildirim yok.</div>'}
    </div>
  `;

  document.body.appendChild(panel);

  const clearBtn = panel.querySelector('#btn-clear-notifs');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      realmNotifications.length = 0;
      updateNotificationBadge();
      panel.remove();
    });
  }

  setTimeout(() => {
    const closeListener = (e) => {
      if (!panel.contains(e.target) && !e.target.closest('#btn-notif-bell')) {
        panel.remove();
        document.removeEventListener('click', closeListener);
      }
    };
    document.addEventListener('click', closeListener);
  }, 50);
}

// =========================================================================
// 4.10 KRALLIK DASHBOARD (MASTER COMMAND CENTER)
// =========================================================================
function openDashboardModal() {
  gameState.checkQuestResets();
  const summary = gameState.getRealmSummary();
  const repairCosts = gameState.getAllRepairCost();
  const healCosts = gameState.getAllHealCost();

  dom.modalTitle.innerHTML = `<span>🏰</span> <span>KRALLIK DASHBOARD & 1-CLICK MERKEZİ</span>`;

  // 1-Click Top Actions Bar
  const quickActionsHtml = `
    <div class="clean-card" style="background: linear-gradient(135deg, rgba(20,14,8,0.95), rgba(35,22,12,0.95)); border-color: rgba(245,158,11,0.5);">
      <div class="card-title-row">
        <div class="card-title">⚡ 1-Click Toplu Krallık Eylemleri</div>
        <span class="card-badge" style="color: #fde047;">TAB Kısayolu</span>
      </div>
      <div class="dashboard-1click-grid">
        <button class="btn-1click btn-1click-claim-restart-exp" title="Tamamlanan seferleri topla ve boştakileri başlat">
          <span>⚡</span> <span>Tüm Seferleri Topla & Başlat</span>
        </button>
        <button class="btn-1click btn-1click-repair-tools" ${repairCosts.count === 0 ? 'disabled' : ''} title="Tüm aletleri tamir et">
          <span>🔨</span> <span>Tüm Aletleri Onar (${repairCosts.totalWood}🌲 ${repairCosts.totalIron}⛏️ ${repairCosts.totalAda}🟣)</span>
        </button>
        <button class="btn-1click btn-1click-heal-army" ${healCosts.count === 0 ? 'disabled' : ''} title="Tüm yaralı askerleri doyur ve iyileştir">
          <span>🌾</span> <span>Tüm Orduyu Doyur (${healCosts.totalWheat}🌾 ${healCosts.totalAda}🟣)</span>
        </button>
        <button class="btn-1click btn-1click-claim-all-quests" ${summary.claimableQuests.length === 0 ? 'disabled' : ''} title="Tamamlanan görevlerin ödüllerini al">
          <span>🎁</span> <span>Tüm Görevleri Topla (${summary.claimableQuests.length})</span>
        </button>
      </div>
    </div>
  `;

  // 6 Widget Grid
  const widgetsHtml = `
    <div class="dashboard-grid">
      <!-- Widget 1: Genel Bakış -->
      <div class="dashboard-widget">
        <div class="dashboard-widget-title"><span>📊</span> <span>Genel Durum</span></div>
        <div class="dashboard-stat-row">
          <span>Karakter Seviyesi</span>
          <span class="dashboard-stat-value" style="color:#fde047;">Lv.${summary.level}</span>
        </div>
        <div class="dashboard-stat-row">
          <span>$ADASTRA Bakiyesi</span>
          <span class="dashboard-stat-value" style="color:#c084fc;">${summary.ada.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} 🟣</span>
        </div>
        <div class="dashboard-stat-row">
          <span>Stamina Enerjisi</span>
          <span class="dashboard-stat-value" style="color:#38bdf8;">${Math.floor(summary.stamina)} / ${summary.maxStamina} ⚡</span>
        </div>
        <div class="dashboard-mini-bar">
          <div class="dashboard-mini-bar-fill" style="width:${Math.min(100, (summary.stamina / summary.maxStamina) * 100)}%; background:linear-gradient(90deg,#0284c7,#38bdf8);"></div>
        </div>
      </div>

      <!-- Widget 2: Aktif Seferler -->
      <div class="dashboard-widget">
        <div class="dashboard-widget-title"><span>⚡</span> <span>Sefer Takipçisi (${summary.activeExps.length}/3)</span></div>
        ${summary.activeExps.map(e => `
          <div class="dashboard-stat-row">
            <span>${e.icon} ${e.name}</span>
            <span class="dashboard-stat-value" style="color:${e.isCompleted ? '#4ade80' : '#facc15'};">
              ${e.isCompleted ? '✅ HAZIR' : formatCountdown(e.remainingSeconds)}
            </span>
          </div>
          <div class="dashboard-mini-bar">
            <div class="dashboard-mini-bar-fill" style="width:${e.pct}%; background:${e.isCompleted ? '#22c55e' : '#f59e0b'};"></div>
          </div>
        `).join('') || '<div style="color:#94a3b8; font-size:0.8rem; padding:6px 0;">Şu an aktif sefer yok.</div>'}
      </div>

      <!-- Widget 3: Alet Sağlığı -->
      <div class="dashboard-widget">
        <div class="dashboard-widget-title"><span>🔨</span> <span>Alet Dayanıklılıkları (Ort. %${summary.avgToolHealth})</span></div>
        ${summary.toolSummary.map(t => `
          <div class="dashboard-stat-row">
            <span>${t.icon} ${t.name}</span>
            <span class="dashboard-stat-value" style="color:${t.durability < 30 ? '#ef4444' : '#34d399'};">${t.durability}/100</span>
          </div>
          <div class="dashboard-mini-bar">
            <div class="dashboard-mini-bar-fill" style="width:${t.durability}%; background:${t.durability < 30 ? '#ef4444' : '#10b981'};"></div>
          </div>
        `).join('')}
      </div>

      <!-- Widget 4: Ordu & Sağlık -->
      <div class="dashboard-widget">
        <div class="dashboard-widget-title"><span>🛡️</span> <span>18 Kişilik Ordu (%${summary.avgHpPct} Can)</span></div>
        <div class="dashboard-stat-row">
          <span>Toplam Savaş Gücü</span>
          <span class="dashboard-stat-value" style="color:#fde047;">⚔️ ${summary.totalAtk} ATK • ❤️ ${summary.totalHp} HP</span>
        </div>
        <div class="dashboard-stat-row">
          <span>Yaralı Askerler</span>
          <span class="dashboard-stat-value" style="color:${summary.woundedCount > 0 ? '#ef4444' : '#4ade80'};">
            ${summary.woundedCount > 0 ? `⚠️ ${summary.woundedCount} Asker Yaralı` : '✅ Tüm Ordu Zinde'}
          </span>
        </div>
        <div class="dashboard-mini-bar">
          <div class="dashboard-mini-bar-fill" style="width:${summary.avgHpPct}%; background:${summary.avgHpPct < 50 ? '#ef4444' : '#10b981'};"></div>
        </div>
      </div>

      <!-- Widget 5: Görevler -->
      <div class="dashboard-widget">
        <div class="dashboard-widget-title"><span>📜</span> <span>Görev İlerlemeleri</span></div>
        <div class="dashboard-stat-row">
          <span>Hazır Ödüller</span>
          <span class="dashboard-stat-value" style="color:#4ade80;">${summary.claimableQuests.length} Görev Toplanabilir</span>
        </div>
        <div class="dashboard-stat-row">
          <span>Günlük Görevler</span>
          <span class="dashboard-stat-value">${summary.dailyQuests.filter(q => q.claimed).length} / ${summary.dailyQuests.length} Tamamlandı</span>
        </div>
        <div class="dashboard-stat-row">
          <span>Haftalık Görevler</span>
          <span class="dashboard-stat-value">${summary.weeklyQuests.filter(q => q.claimed).length} / ${summary.weeklyQuests.length} Tamamlandı</span>
        </div>
      </div>

      <!-- Widget 6: Depo Doluluk -->
      <div class="dashboard-widget">
        <div class="dashboard-widget-title"><span>📦</span> <span>Depo Kapasitesi (${summary.warehouseCapacity} Birim)</span></div>
        <div class="dashboard-stat-row">
          <span>🌲 Odun (%${summary.woodPct})</span>
          <span class="dashboard-stat-value">${summary.inventory.wood || 0}</span>
        </div>
        <div class="dashboard-mini-bar">
          <div class="dashboard-mini-bar-fill" style="width:${summary.woodPct}%; background:#10b981;"></div>
        </div>
        <div class="dashboard-stat-row" style="margin-top:6px;">
          <span>⛏️ Demir (%${summary.ironPct})</span>
          <span class="dashboard-stat-value">${summary.inventory.iron || 0}</span>
        </div>
        <div class="dashboard-mini-bar">
          <div class="dashboard-mini-bar-fill" style="width:${summary.ironPct}%; background:#0284c7;"></div>
        </div>
        <div class="dashboard-stat-row" style="margin-top:6px;">
          <span>🌾 Buğday (%${summary.wheatPct})</span>
          <span class="dashboard-stat-value">${summary.inventory.wheat || 0}</span>
        </div>
        <div class="dashboard-mini-bar">
          <div class="dashboard-mini-bar-fill" style="width:${summary.wheatPct}%; background:#f59e0b;"></div>
        </div>
      </div>
    </div>
  `;

  dom.modalBody.innerHTML = quickActionsHtml + widgetsHtml;
  displayModal();
}

// =========================================================================
// 4.11 SMART ARMORY (AKILLI SİLAH DEPOSU & ENTITLE MATRİSİ)
// =========================================================================
function openSmartArmoryModal() {
  dom.modalTitle.innerHTML = `<span>⚔️</span> <span>AKILLI SİLAH DEPOSU & ENTITLE MATRİSİ</span>`;

  const state = gameState.state;
  const soldiers = state.soldierUnits || [];
  const playerEquip = state.equipment || {};

  const unassignedItems = [];
  ['weapon', 'helmet', 'armor', 'legs', 'boots'].forEach(slot => {
    if (playerEquip[slot]) {
      unassignedItems.push({ slot, ...playerEquip[slot] });
    }
  });

  const leftPanelHtml = `
    <div class="armory-inv-panel">
      <div style="font-weight:800; font-size:0.9rem; color:#fde047; margin-bottom:8px; display:flex; justify-content:space-between;">
        <span>📦 Boşta Kalan Dövülmüş Eşyalar (${unassignedItems.length})</span>
      </div>
      <div class="clean-desc" style="margin-bottom:10px;">Demirci'de dövüp henüz askerlere kuşandırmadığın hazır eşyalar:</div>
      ${unassignedItems.map(item => `
        <div class="armory-equip-item">
          <span style="font-size:1.2rem;">${item.slot === 'weapon' ? '🗡️' : (item.slot === 'helmet' ? '🪖' : (item.slot === 'armor' ? '🛡️' : (item.slot === 'legs' ? '👖' : '👢')))}</span>
          <div style="flex:1;">
            <div style="font-weight:700; color:#fff;">${item.name || item.slot}</div>
            <div style="font-size:0.75rem; color:#94a3b8;">
              ${item.atkBonus ? `+${item.atkBonus} ATK ` : ''}${item.hpBonus ? `+${item.hpBonus} HP` : ''} • Dayanıklılık: ${item.durability || 100}%
            </div>
          </div>
          <span class="rarity-tag ${(item.rarity || 'rare').toLowerCase()}">${item.rarity || 'RARE'}</span>
        </div>
      `).join('') || '<div style="padding:20px; text-align:center; color:#94a3b8; font-size:0.8rem;">Envanterde boş eşya yok. Demirci\'de yeni eşyalar dövebilirsin!</div>'}
    </div>
  `;

  const rightPanelHtml = `
    <div class="armory-soldiers-panel">
      <div style="font-weight:800; font-size:0.9rem; color:#4ade80; margin-bottom:8px;">
        <span>🛡️ 18 Kişilik Ordu Donatım Durumu</span>
      </div>
      ${soldiers.map((sol, idx) => {
        const stats = gameState.getSoldierFullStats(idx);
        const setBonus = gameState.getSoldierSetBonus(idx);
        const slots = ['weapon', 'helmet', 'armor', 'legs', 'boots'];
        const filledSlots = slots.filter(s => sol.equipment && sol.equipment[s]).length;

        return `
          <div class="armory-soldier-mini ${selectedSoldierIndex === idx ? 'selected' : ''}" data-soldier-idx="${idx}">
            <span style="font-size:1.1rem;">${BARRACKS_CLASS_ICONS[sol.class] || '🛡️'}</span>
            <div style="flex:1;">
              <div style="font-weight:700; color:#fff;">#${idx + 1} ${sol.name}</div>
              <div style="font-size:0.72rem; color:#94a3b8;">
                ⚔️ ${stats?.totalAtk || 20} ATK • ❤️ ${sol.hp || 100}/${stats?.totalMaxHp || 100} HP
                ${setBonus ? `<span style="color:#c084fc; font-weight:700;"> • ✨ ${setBonus.name}</span>` : ''}
              </div>
            </div>
            <div class="armory-slots-mini" title="${filledSlots}/5 Yuva Dolu">
              ${slots.map(s => `<div class="armory-slot-dot ${sol.equipment && sol.equipment[s] ? 'filled' : ''}"></div>`).join('')}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  dom.modalBody.innerHTML = `
    <div class="clean-card" style="margin-bottom:12px;">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
        <div>
          <div class="card-title">⚔️ Akıllı Silah Dağıtım & Donatım Hub'ı</div>
          <div class="clean-desc">Tüm dövülmüş eşyaları tek tıkla orduna dağıt veya tüm teçhizatları tek tıkla sök!</div>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="btn-clean btn-clean-green btn-smart-auto-equip" style="width:auto; padding:8px 14px; font-size:0.8rem;">
            ⚡ En İyi Eşyaları Otomatik Dağıt
          </button>
          <button class="btn-clean btn-clean-gold btn-smart-unequip-all" style="width:auto; padding:8px 14px; font-size:0.8rem;">
            🔄 Tüm Eşyaları Sök
          </button>
        </div>
      </div>
    </div>
    <div class="armory-layout">
      ${leftPanelHtml}
      ${rightPanelHtml}
    </div>
  `;

  displayModal();
}

// =========================================================================
// 4.12 SAVAŞ ÖNCESİ TAKTİK & FORMASYON HAZIRLIĞI (PRE-BATTLE FORMATION)
// =========================================================================
let preBattleProtectWeapons = false;
let preBattleSelectedSoldiers = Array.from({ length: 18 }, (_, i) => i);

function openPreBattleModal(monster) {
  dom.modalTitle.innerHTML = `<span>⚔️</span> <span>SAVAŞ ÖNCESİ TAKTİK FORMASYON HAZIRLIĞI</span>`;

  const state = gameState.state;
  const prediction = gameState.getBattlePrediction(monster.hp, monster.atk, preBattleSelectedSoldiers, preBattleProtectWeapons);

  const enemyCardHtml = `
    <div class="prebattle-enemy-card">
      <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
        <span style="font-size:2.2rem;">${monster.icon || '💀'}</span>
        <div>
          <div style="font-weight:800; font-size:1.1rem; color:#f87171;">${monster.name}</div>
          <div style="font-size:0.8rem; color:#94a3b8;">${monster.level}. Kat Zindan Muhafızı</div>
        </div>
      </div>
      <div class="dashboard-stat-row">
        <span>Can Puanı (HP)</span>
        <span class="dashboard-stat-value" style="color:#ef4444;">${monster.hp} HP</span>
      </div>
      <div class="dashboard-stat-row">
        <span>Saldırı Gücü (ATK)</span>
        <span class="dashboard-stat-value" style="color:#f59e0b;">${monster.atk} ATK</span>
      </div>
      <div class="dashboard-stat-row">
        <span>Ganimet Ödülü</span>
        <span class="dashboard-stat-value" style="color:#fde047;">+${monster.rewardAda} ADA • +${monster.rewardXp} XP</span>
      </div>

      <div class="prebattle-prediction ${prediction.difficulty.toLowerCase()}">
        <div>KAZANMA ŞANSI: %${prediction.winChance} (${prediction.difficulty.toUpperCase()})</div>
        <div style="font-size:0.75rem; font-weight:normal; margin-top:3px; opacity:0.85;">
          ${prediction.winChance >= 75 ? '🔥 Ordun ezici üstünlüğe sahip!' : (prediction.winChance >= 50 ? '⚖️ Dengeli bir savaş, yaralanmalar olabilir.' : '⚠️ Yüksek risk! Ordun yenilgiye uğrayabilir.')}
        </div>
      </div>
    </div>
  `;

  const armySelectHtml = `
    <div class="prebattle-army-panel">
      <div style="font-weight:800; font-size:0.9rem; color:#34d399; margin-bottom:6px; display:flex; justify-content:space-between;">
        <span>🛡️ Savaşa Girecek Askerler (${preBattleSelectedSoldiers.length}/18)</span>
      </div>

      <div class="prebattle-weapon-toggle ${preBattleProtectWeapons ? 'active' : ''}" id="btn-toggle-weapon-protection">
        <span>${preBattleProtectWeapons ? '🛡️' : '⚔️'}</span>
        <div>
          <div style="font-weight:700;">Silah Dayanıklılığı Koruması: ${preBattleProtectWeapons ? 'AÇIK' : 'KAPALI'}</div>
          <div style="font-size:0.72rem; opacity:0.8;">${preBattleProtectWeapons ? 'Silahlar aşınmaz, ancak silah ATK bonusu savaşta kullanılmaz.' : 'Tam güçle savaşılır, silahların dayanıklılığı -1 aşınır.'}</div>
        </div>
      </div>

      <div style="max-height:220px; overflow-y:auto; padding-right:4px;">
        ${(state.soldierUnits || []).map((sol, idx) => {
          const stats = gameState.getSoldierFullStats(idx);
          const isChecked = preBattleSelectedSoldiers.includes(idx);
          return `
            <label class="prebattle-soldier-checkbox">
              <input type="checkbox" class="prebattle-sol-check" data-idx="${idx}" ${isChecked ? 'checked' : ''}>
              <span>${BARRACKS_CLASS_ICONS[sol.class] || '🛡️'}</span>
              <span style="flex:1; font-weight:600;">#${idx+1} ${sol.name} (${sol.hp || 100} HP)</span>
              <span style="font-size:0.72rem; color:#fde047;">${stats?.totalAtk || 20} ATK</span>
            </label>
          `;
        }).join('')}
      </div>
    </div>
  `;

  dom.modalBody.innerHTML = `
    <div class="prebattle-grid">
      ${enemyCardHtml}
      ${armySelectHtml}
    </div>
    <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:14px;">
      <button class="btn-clean btn-clean-outline" id="btn-cancel-prebattle" style="width:auto; padding:10px 20px;">
        🏳️ Vazgeç
      </button>
      <button class="btn-clean btn-clean-green" id="btn-start-tactical-battle" style="width:auto; padding:10px 28px; font-weight:800; font-size:0.95rem;">
        ⚔️ SAVAŞA BAŞLA
      </button>
    </div>
  `;

  const weaponToggle = document.getElementById('btn-toggle-weapon-protection');
  if (weaponToggle) {
    weaponToggle.addEventListener('click', () => {
      preBattleProtectWeapons = !preBattleProtectWeapons;
      openPreBattleModal(monster);
    });
  }

  document.querySelectorAll('.prebattle-sol-check').forEach(chk => {
    chk.addEventListener('change', () => {
      const idx = parseInt(chk.dataset.idx, 10);
      if (chk.checked) {
        if (!preBattleSelectedSoldiers.includes(idx)) preBattleSelectedSoldiers.push(idx);
      } else {
        preBattleSelectedSoldiers = preBattleSelectedSoldiers.filter(i => i !== idx);
      }
      openPreBattleModal(monster);
    });
  });

  const cancelBtn = document.getElementById('btn-cancel-prebattle');
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

  const startBtn = document.getElementById('btn-start-tactical-battle');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      if (preBattleSelectedSoldiers.length === 0) {
        showToast('En az 1 asker seçmelisin!', 'error');
        return;
      }
      executeMonsterBattle(monster, preBattleSelectedSoldiers, preBattleProtectWeapons);
    });
  }

  displayModal();
}

function executeMonsterBattle(monster, selectedIndices, protectWeapons) {
  dom.modalTitle.innerHTML = `<span>⚔️</span> <span>ZİNDAN SAVAŞI: ${monster.name.toUpperCase()}</span>`;

  const state = gameState.state;
  const soldiers = state.soldierUnits || [];

  let playerSquad = selectedIndices.map(idx => {
    const stats = gameState.getSoldierFullStats(idx) || { totalAtk: 20, totalMaxHp: 100 };
    const sol = soldiers[idx];
    let atk = stats.totalAtk;
    if (protectWeapons && sol.equipment?.weapon) {
      atk -= (sol.equipment.weapon.atkBonus || 0);
    }
    return {
      idx,
      name: sol.name,
      icon: BARRACKS_CLASS_ICONS[sol.class] || '🛡️',
      hp: sol.hp != null ? sol.hp : 100,
      maxHp: stats.totalMaxHp,
      atk
    };
  });

  const playerTotalHp = playerSquad.reduce((s, u) => s + u.hp, 0);
  const playerTotalAtk = playerSquad.reduce((s, u) => s + u.atk, 0);

  dom.modalBody.innerHTML = `
    <div class="clean-card" style="border-color: #ef4444; background: #1c1012;">
      <div class="card-title-row">
        <div class="card-title">💀 ${monster.name} ile Savaş</div>
        <span class="card-badge">${monster.level}. Kat Muhafızı</span>
      </div>
    </div>

    <div class="arena-battlefield">
      <div class="arena-squad player-squad">
        <div class="arena-squad-title">🛡️ Seçilen Ordu (${playerSquad.length} Asker)</div>
        <div class="arena-hp-track"><div id="dungeon-player-hp-fill" class="arena-hp-fill player" style="width: 100%;"></div></div>
        <div style="font-size:0.8rem; text-align:center; color:#34d399;" id="dungeon-player-hp-text">${playerTotalHp} / ${playerTotalHp} HP</div>
      </div>
      <div class="arena-vs-badge">VS</div>
      <div class="arena-squad enemy-squad">
        <div class="arena-squad-title">💀 ${monster.name}</div>
        <div class="arena-hp-track"><div id="dungeon-enemy-hp-fill" class="arena-hp-fill enemy" style="width: 100%;"></div></div>
        <div style="font-size:0.8rem; text-align:center; color:#ef4444;" id="dungeon-enemy-hp-text">${monster.hp} / ${monster.hp} HP</div>
      </div>
    </div>

    <div id="dungeon-combat-log" class="clean-card arena-combat-log">
      ⚔️ Savaş başlıyor...
    </div>
  `;

  let pCurHp = playerTotalHp;
  let eCurHp = monster.hp;
  const pHpFill = document.getElementById('dungeon-player-hp-fill');
  const eHpFill = document.getElementById('dungeon-enemy-hp-fill');
  const pHpText = document.getElementById('dungeon-player-hp-text');
  const eHpText = document.getElementById('dungeon-enemy-hp-text');
  const logEl = document.getElementById('dungeon-combat-log');

  let round = 0;
  const battleInt = setInterval(() => {
    round++;
    sound.playPickaxe();

    const pDmg = Math.floor(playerTotalAtk * (0.85 + Math.random() * 0.3));
    const eDmg = Math.floor(monster.atk * (0.85 + Math.random() * 0.3));

    eCurHp = Math.max(0, eCurHp - pDmg);
    pCurHp = Math.max(0, pCurHp - eDmg);

    if (eHpFill) eHpFill.style.width = `${Math.round((eCurHp / monster.hp) * 100)}%`;
    if (pHpFill) pHpFill.style.width = `${Math.round((pCurHp / playerTotalHp) * 100)}%`;
    if (eHpText) eHpText.innerText = `${eCurHp} / ${monster.hp} HP`;
    if (pHpText) pHpText.innerText = `${pCurHp} / ${playerTotalHp} HP`;

    if (logEl) {
      logEl.innerHTML = `<div>⚔️ Tur ${round}: Ordun ${pDmg} hasar vurdu! ${monster.name} ${eDmg} karşı hasar verdi!</div>`;
    }

    if (eCurHp <= 0 || pCurHp <= 0) {
      clearInterval(battleInt);
      const isVictory = eCurHp <= 0;

      const dmgFraction = Math.min(1, (playerTotalHp - pCurHp) / Math.max(1, playerTotalHp));
      selectedIndices.forEach(idx => {
        if (soldiers[idx]) {
          const loss = Math.floor((soldiers[idx].hp || 100) * dmgFraction);
          soldiers[idx].hp = Math.max(1, (soldiers[idx].hp || 100) - loss);
          if (!protectWeapons && soldiers[idx].equipment?.weapon) {
            soldiers[idx].equipment.weapon.durability = Math.max(0, (soldiers[idx].equipment.weapon.durability || 100) - 1);
          }
        }
      });

      if (isVictory) {
        sound.playLevelUp();
        state.adAstraBalance += monster.rewardAda;
        state.currentXp += monster.rewardXp;
        state.dungeonProgress = Math.max(state.dungeonProgress || 1, monster.level + 1);

        gameState.progressQuest('daily_dungeon_kills', 1);
        gameState.progressQuest('weekly_dungeon_kills', 1);

        addNotification('🏆', `${monster.name} yenildi! +${monster.rewardAda} ADA & +${monster.rewardXp} XP kazanıldı.`);

        if (logEl) {
          logEl.innerHTML = `
            <div style="color:#4ade80; font-weight:800; font-size:1.1rem; text-align:center;">
              🏆 ZAFER! ${monster.name} yok edildi!
            </div>
            <div style="text-align:center; color:#fde047; margin-top:4px;">
              +${monster.rewardAda} $ADASTRA • +${monster.rewardXp} XP kazanıldı! ${monster.level + 1}. Kat açıldı!
            </div>
          `;
        }
      } else {
        if (logEl) {
          logEl.innerHTML = `
            <div style="color:#ef4444; font-weight:800; font-size:1.1rem; text-align:center;">
              💀 BOZGUN! Ordun ${monster.name} karşısında geri çekilmek zorunda kaldı.
            </div>
          `;
        }
      }

      gameState.saveState();
      renderTopBar();
    }
  }, 350);
}

// =========================================================================
// 4.13 COMMAND PALETTE (Ctrl+K)
// =========================================================================
let cmdPaletteActiveIdx = 0;
let filteredCmdActions = [];

function openCommandPalette() {
  closeCommandPalette();

  const overlay = document.createElement('div');
  overlay.id = 'cmd-palette-overlay';
  overlay.className = 'cmd-palette-overlay';

  overlay.innerHTML = `
    <div class="cmd-palette-box">
      <input type="text" id="cmd-palette-input" class="cmd-palette-input" placeholder="🔍 Krallık eylemi veya bina ara... (ESC ile kapat)" autofocus>
      <div id="cmd-palette-results" class="cmd-palette-results"></div>
    </div>
  `;

  document.body.appendChild(overlay);

  const input = overlay.querySelector('#cmd-palette-input');
  input.focus();

  renderCommandPalette('');

  input.addEventListener('input', (e) => {
    cmdPaletteActiveIdx = 0;
    renderCommandPalette(e.target.value);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      cmdPaletteActiveIdx = Math.min(filteredCmdActions.length - 1, cmdPaletteActiveIdx + 1);
      renderCommandPalette(input.value);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      cmdPaletteActiveIdx = Math.max(0, cmdPaletteActiveIdx - 1);
      renderCommandPalette(input.value);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCmdActions[cmdPaletteActiveIdx]) {
        executeCommand(filteredCmdActions[cmdPaletteActiveIdx].id);
      }
    } else if (e.key === 'Escape') {
      closeCommandPalette();
    }
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeCommandPalette();
  });
}

function closeCommandPalette() {
  const overlay = document.getElementById('cmd-palette-overlay');
  if (overlay) overlay.remove();
}

function renderCommandPalette(query) {
  const resultsContainer = document.getElementById('cmd-palette-results');
  if (!resultsContainer) return;

  const actions = gameState.getCommandPaletteActions();
  const q = (query || '').toLowerCase().trim();

  filteredCmdActions = actions.filter(a =>
    a.label.toLowerCase().includes(q) || a.category.toLowerCase().includes(q)
  );

  resultsContainer.innerHTML = filteredCmdActions.map((a, i) => `
    <div class="cmd-palette-item ${i === cmdPaletteActiveIdx ? 'active' : ''}" data-cmd-id="${a.id}">
      <span class="cmd-palette-item-icon">${a.icon}</span>
      <span class="cmd-palette-item-label">${a.label}</span>
      <span class="cmd-palette-item-category">${a.category}</span>
      ${a.shortcut ? `<span class="cmd-palette-item-shortcut">${a.shortcut}</span>` : ''}
    </div>
  `).join('') || '<div style="padding:16px; text-align:center; color:#94a3b8; font-size:0.85rem;">Eşleşen eylem bulunamadı.</div>';

  resultsContainer.querySelectorAll('.cmd-palette-item').forEach(item => {
    item.addEventListener('click', () => {
      executeCommand(item.dataset.cmdId);
    });
  });
}

function executeCommand(actionId) {
  closeCommandPalette();
  switch (actionId) {
    case 'dashboard': openDashboardModal(); break;
    case 'forest': openTownZoneModal('forest', '🌲 Zümrüt Ormanı & Oduncu'); break;
    case 'mine': openTownZoneModal('mine', '⛏️ Maden Ocağı & Tamirhane'); break;
    case 'farm': openTownZoneModal('farm', '🌾 Güneş Tarlası & Değirmen'); break;
    case 'barracks': openBarracksModal(); break;
    case 'market': openTownZoneModal('market', '🏪 AMM Pazar Yeri'); break;
    case 'dungeon': enterDungeonScene(); break;
    case 'colosseum': openColosseumModal(); break;
    case 'quests': openQuestsModal(); break;
    case 'inventory': openInventoryModal(); break;
    case 'economy': openEconomyDashboardModal('overview'); break;
    case 'claimAll':
      const cRes = gameState.claimAndRestartAllExpeditions();
      showToast(`⚡ ${cRes.claimed} Sefer Toplandı, ${cRes.restarted} Yeni Sefer Başlatıldı!`, 'success');
      renderTopBar();
      break;
    case 'repairAll':
      const rRes = gameState.repairAllTools();
      showToast(rRes.repaired > 0 ? `🔨 ${rRes.repaired} alet tamir edildi!` : 'Tamir edilecek alet yok.', 'success');
      renderTopBar();
      break;
    case 'healAll':
      const hRes = gameState.instantHealAllSoldiers();
      showToast(hRes.healed > 0 ? `❤️ ${hRes.healed} asker iyileştirildi!` : 'İyileştirilecek asker yok.', 'success');
      renderTopBar();
      break;
    case 'claimQuests':
      const qRes = gameState.claimAllQuestRewards();
      showToast(qRes.claimed > 0 ? `🎁 ${qRes.claimed} görev ödülü toplandı: +${qRes.totalAda} ADA!` : 'Toplanacak görev ödülü yok.', 'success');
      renderTopBar();
      break;
    case 'autoEquip':
      const eqRes = gameState.autoEquipBest();
      showToast(eqRes.message, eqRes.success ? 'success' : 'info');
      break;
  }
}

// Event Dinleyicileri
function initAppEvents() {
  // Global Klavye Kısayolları (TAB, Ctrl+K, S, I, F, B, M, D, C, Q, E, Esc)
  window.addEventListener('keydown', (e) => {
    // Ctrl+K veya Cmd+K -> Command Palette
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openCommandPalette();
      return;
    }

    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.key === 'Tab') {
      e.preventDefault();
      openDashboardModal();
      return;
    }

    const key = e.key.toUpperCase();
    if (key === 'ESCAPE') {
      closeCommandPalette();
      closeModal();
      closeDevModal();
      return;
    }
    if (key === '1' || key === 'S') {
      openTownZoneModal('forest', '🌲 Zümrüt Ormanı & Oduncu');
    } else if (key === '2' || key === 'I') {
      openTownZoneModal('mine', '⛏️ Maden Ocağı & Tamirhane');
    } else if (key === '3' || key === 'F') {
      openTownZoneModal('farm', '🌾 Güneş Tarlası & Değirmen');
    } else if (key === '4' || key === 'B') {
      openBarracksModal();
    } else if (key === '5' || key === 'M') {
      openTownZoneModal('market', '🏪 AMM Pazar Yeri');
    } else if (key === '6' || key === 'D') {
      enterDungeonScene();
    } else if (key === '7' || key === 'C') {
      openColosseumModal();
    } else if (key === 'Q') {
      openQuestsModal();
    } else if (key === 'E') {
      openInventoryModal();
    }
  });

  dom.btnCloseModal.addEventListener('click', closeModal);
  dom.rpgModal.addEventListener('click', (e) => {
    if (e.target === dom.rpgModal) closeModal();
  });

  // Add comprehensive event isolation to modal overlay and all modal containers
  const stopEvents = ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click', 'touchstart', 'touchend'];
  stopEvents.forEach(evt => {
    dom.rpgModal.addEventListener(evt, (e) => {
      if (e.target === dom.rpgModal || e.target.closest('.rpg-modal-window')) {
        e.stopPropagation();
      }
    }, { capture: false });
  });

  // Also prevent propagation on the modal header and body
  const modalHeader = document.querySelector('.rpg-modal-header');
  const modalBody = document.querySelector('.rpg-modal-body');
  const modalWindow = document.querySelector('.rpg-modal-window');

  if (modalHeader) {
    stopEvents.forEach(evt => {
      modalHeader.addEventListener(evt, (e) => e.stopPropagation(), { capture: false });
    });
  }
  if (modalBody) {
    stopEvents.forEach(evt => {
      modalBody.addEventListener(evt, (e) => e.stopPropagation(), { capture: false });
    });
  }
  if (modalWindow) {
    stopEvents.forEach(evt => {
      modalWindow.addEventListener(evt, (e) => e.stopPropagation(), { capture: false });
    });
  }

  // Profil Rozetine Tıklama -> Karakter Gelişimi & Envanter
  if (dom.profileBadgeBtn) dom.profileBadgeBtn.addEventListener('click', openInventoryModal);

  // Günlük Limitler Paneli Butonu
  if (dom.btnDailyLimits) dom.btnDailyLimits.addEventListener('click', openDailyLimitsModal);

  // 10B Makro Tokenomics & Canlı Simülatör Butonu
  const btnEconomy = document.getElementById('btn-economy-dashboard');
  if (btnEconomy) btnEconomy.addEventListener('click', () => openEconomyDashboardModal('overview'));

  // ÜST ŞERİT MENÜ BUTONLARI (TOP NAV STRIP BUTTONS)
  const btnNavDash = document.getElementById('btn-nav-dashboard');
  if (btnNavDash) btnNavDash.addEventListener('click', openDashboardModal);

  const btnNotifBell = document.getElementById('btn-notif-bell');
  if (btnNotifBell) btnNotifBell.addEventListener('click', toggleNotificationPanel);

  const topBtnInv = document.getElementById('top-btn-inventory');
  if (topBtnInv) topBtnInv.addEventListener('click', openInventoryModal);

  const topBtnBarracks = document.getElementById('top-btn-barracks');
  if (topBtnBarracks) topBtnBarracks.addEventListener('click', openBarracksModal);

  const topBtnMarket = document.getElementById('top-btn-market');
  if (topBtnMarket) topBtnMarket.addEventListener('click', () => openTownZoneModal('market', '🏪 AMM Pazar Alanı'));

  const topBtnTavern = document.getElementById('top-btn-tavern');
  if (topBtnTavern) topBtnTavern.addEventListener('click', () => openTownZoneModal('tavern', '🍺 Taverna & Han'));

  const btnNavQuests = document.getElementById('btn-nav-quests');
  if (btnNavQuests) btnNavQuests.addEventListener('click', openQuestsModal);

  const topBtnColosseum = document.getElementById('top-btn-colosseum');
  if (topBtnColosseum) topBtnColosseum.addEventListener('click', openColosseumModal);

  const topBtnDungeon = document.getElementById('top-btn-dungeon');
  if (topBtnDungeon) {
    topBtnDungeon.addEventListener('click', () => {
      enterDungeonScene();
    });
  }

  // SAĞ ÜST KÖŞE HAMMADDE KUTUCUKLARI (RESOURCE PILLS TIKLAMA OLAYLARI)
  const pillWheat = document.getElementById('res-pill-wheat');
  if (pillWheat) pillWheat.addEventListener('click', () => openTownZoneModal('farm', '🌾 Güneş Tarlası & Değirmen'));

  const pillWood = document.getElementById('res-pill-wood');
  if (pillWood) pillWood.addEventListener('click', () => openTownZoneModal('forest', '🌲 Zümrüt Ormanı & Oduncu Kulübesi'));

  const pillIron = document.getElementById('res-pill-iron');
  if (pillIron) pillIron.addEventListener('click', () => openTownZoneModal('mine', '⛏️ Maden Ocağı & Tamirhane'));

  const pillFragments = document.getElementById('res-pill-fragments');
  if (pillFragments) pillFragments.addEventListener('click', () => openTownZoneModal('market', '🏪 AMM Pazar Alanı'));

  // Alt 3D Dock Butonları (varsa)
  if (dom.btnDockWorkers) dom.btnDockWorkers.addEventListener('click', openInventoryModal);
  if (dom.btnDockInventory) dom.btnDockInventory.addEventListener('click', openInventoryModal);
  if (dom.btnDockBarracks) dom.btnDockBarracks.addEventListener('click', openBarracksModal);
  if (dom.btnDockMarket) dom.btnDockMarket.addEventListener('click', () => openTownZoneModal('market', '🏪 AMM Pazar Alanı'));

  // Sağ Menü Açma/Kapama Çekmece Butonu
  const toggleBtn = document.getElementById('btn-sidebar-toggle');
  const sidebar = document.getElementById('realm-sidebar');
  const toggleArrow = document.getElementById('sidebar-toggle-arrow');

  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      sidebar.classList.toggle('open');
      const isOpen = sidebar.classList.contains('open');
      toggleBtn.classList.toggle('open', isOpen);
      if (toggleArrow) toggleArrow.innerText = isOpen ? '▶' : '◀';
    });

    toggleBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
    toggleBtn.addEventListener('pointerup', (e) => e.stopPropagation());

    sidebar.addEventListener('pointerdown', (e) => e.stopPropagation());
    sidebar.addEventListener('pointerup', (e) => e.stopPropagation());
    sidebar.addEventListener('click', (e) => e.stopPropagation());
    sidebar.addEventListener('pointerenter', () => {
      const tooltip = document.getElementById('realm-hover-tooltip');
      if (tooltip) {
        tooltip.classList.remove('visible');
        tooltip.classList.add('hidden');
      }
    });
  }

  // Sağ Menü Paneli (Realm Sidebar) Butonları
  if (dom.sidebarCharacterCard) dom.sidebarCharacterCard.addEventListener('click', openInventoryModal);
  if (dom.sideBtnInventory) dom.sideBtnInventory.addEventListener('click', openInventoryModal);
  if (dom.sideBtnWorkers) dom.sideBtnWorkers.addEventListener('click', openInventoryModal);
  if (dom.sideBtnBarracks) dom.sideBtnBarracks.addEventListener('click', openBarracksModal);
  if (dom.sideBtnColosseum) dom.sideBtnColosseum.addEventListener('click', openColosseumModal);
  if (dom.sideBtnCollection) dom.sideBtnCollection.addEventListener('click', () => openCollectionModal('koleksiyon'));
  if (dom.sideBtnBoxes) dom.sideBtnBoxes.addEventListener('click', () => openCollectionModal('kutular'));

  // Sefer kartlarına tıklayınca ilgili kaynağın modalını aç
  document.querySelectorAll('.sidebar-exp-card').forEach(card => {
    card.addEventListener('click', () => {
      const node = card.dataset.node;
      if (node === 'iron') openTownZoneModal('mine', '⛏️ Maden Ocağı & Tamirhane');
      else if (node === 'wood') openTownZoneModal('forest', '🌲 Zümrüt Ormanı & Oduncu Kulübesi');
      else if (node === 'wheat') openTownZoneModal('farm', '🌾 Güneş Tarlası & Değirmen');
    });
  });

  if (dom.btnDockMap) {
    dom.btnDockMap.addEventListener('click', () => {
      if (phaserGame && phaserGame.scene) {
        // Eğer Zindan sahnesindeyse kasabaya dön
        const activeScenes = phaserGame.scene.getScenes(true);
        const isDungeon = activeScenes.some(s => s.scene.key === 'DungeonScene');

        if (isDungeon) {
          returnToTown();
        } else if (phaserGame.scene.scenes[0]) {
          const cam = phaserGame.scene.scenes[0].cameras.main;
          const minZoom = Math.max(cam.width / 2400, cam.height / 1350);
          phaserGame.scene.scenes[0].tweens.add({
            targets: cam,
            scrollX: (2400 - cam.width) / 2,
            scrollY: (1350 - cam.height) / 2,
            zoom: minZoom,
            duration: 400,
            ease: 'Sine.easeInOut'
          });
          showToast('🗺️ Harita merkeze odaklandı!', 'info');
        }
      }
    });
  }

  if (dom.btnDungeonReturnTown) {
    dom.btnDungeonReturnTown.addEventListener('click', returnToTown);
  }

  // Sabit HTML Kat Seçici Barı Tıklamaları (100% Senkron & Kesin Tıklama)
  document.querySelectorAll('.floor-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const floor = parseInt(tab.dataset.floor, 10);
      document.querySelectorAll('.floor-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      window.dispatchEvent(new CustomEvent('switch-dungeon-floor', { detail: { floor } }));
    });
  });

  window.addEventListener('open-town-modal', (e) => {
    const { zoneId, zoneName } = e.detail;
    if (zoneId === 'barracks') openBarracksModal();
    else if (zoneId === 'colosseum') openColosseumModal();
    else if (zoneId === 'collection') openCollectionModal();
    else openTownZoneModal(zoneId, zoneName);
  });

  window.addEventListener('open-monster-battle', (e) => {
    const { monster } = e.detail;
    const currentLevel = gameState.state.dungeonProgress || 1;
    if (monster.level !== currentLevel) {
      showToast('Bu seviye henüz kilitli veya zaten tamamlandı!', 'error');
      return;
    }
    openPreBattleModal(monster);
  });

  window.addEventListener('toast-notify', (e) => {
    const { message, type } = e.detail;
    showToast(message, type);
  });

  dom.modalBody.addEventListener('click', (e) => {
    // 1-Click: Tüm Seferleri Topla & Yeniden Başlat
    const exp1ClickBtn = e.target.closest('.btn-1click-claim-restart-exp');
    if (exp1ClickBtn) {
      const res = gameState.claimAndRestartAllExpeditions();
      showToast(`⚡ ${res.claimed} Sefer Toplandı, ${res.restarted} Yeni Sefer Başlatıldı!`, 'success');
      sound.playHarvest();
      openDashboardModal();
      renderTopBar();
      return;
    }

    // 1-Click: Tüm Aletleri Onar
    const repair1ClickBtn = e.target.closest('.btn-1click-repair-tools');
    if (repair1ClickBtn) {
      const res = gameState.repairAllTools();
      if (res.repaired > 0) {
        showToast(`🔨 ${res.repaired} alet tamir edildi: -${res.totalWood}🌲 -${res.totalIron}⛏️ -${res.totalAda}🟣`, 'success');
        sound.playRepair();
      } else {
        showToast('Tamir edilecek alet yok.', 'info');
      }
      openDashboardModal();
      renderTopBar();
      return;
    }

    // 1-Click: Tüm Orduyu Doyur & İyileştir
    const heal1ClickBtn = e.target.closest('.btn-1click-heal-army');
    if (heal1ClickBtn) {
      const res = gameState.instantHealAllSoldiers();
      if (res.healed > 0) {
        showToast(`🌾 ${res.healed} asker doyuruldu ve tam cana ulaştı: -${res.totalWheat}🌾 -${res.totalAda}🟣`, 'success');
        sound.playLevelUp();
      } else {
        showToast('İyileştirilecek yaralı asker yok.', 'info');
      }
      openDashboardModal();
      renderTopBar();
      return;
    }

    // 1-Click: Tüm Görev Ödüllerini Topla
    const claimQuests1ClickBtn = e.target.closest('.btn-1click-claim-all-quests');
    if (claimQuests1ClickBtn) {
      const res = gameState.claimAllQuestRewards();
      if (res.claimed > 0) {
        showToast(`🎁 ${res.claimed} görev ödülü toplandı: +${res.totalAda} ADA • +${res.totalXp} XP • +${res.totalFragments} 🧩!`, 'success');
        sound.playLevelUp();
      } else {
        showToast('Toplanacak hazır görev ödülü yok.', 'info');
      }
      openDashboardModal();
      renderTopBar();
      return;
    }

    // Smart Armory: Otomatik En İyileri Dağıt
    const autoEquipBtn = e.target.closest('.btn-smart-auto-equip');
    if (autoEquipBtn) {
      const res = gameState.autoEquipBest();
      showToast(res.message, res.success ? 'success' : 'info');
      openSmartArmoryModal();
      renderTopBar();
      return;
    }

    // Smart Armory: Tüm Eşyaları Sök
    const unequipAllBtn = e.target.closest('.btn-smart-unequip-all');
    if (unequipAllBtn) {
      const res = gameState.unequipAllSoldiers();
      showToast(res.message, res.success ? 'success' : 'info');
      openSmartArmoryModal();
      renderTopBar();
      return;
    }

    // Smart Armory: Asker Seçimi
    const armorySolMini = e.target.closest('.armory-soldier-mini');
    if (armorySolMini) {
      const idx = parseInt(armorySolMini.dataset.soldierIdx, 10);
      if (!isNaN(idx)) {
        selectedSoldierIndex = idx;
        openSmartArmoryModal();
      }
      return;
    }

    // Seviye Atlama
    if (e.target.closest('#btn-modal-levelup')) {
      const res = gameState.levelUp();
      if (res.success) {
        showToast(res.message, 'success');
        openInventoryModal();
      } else {
        showToast(res.message, 'error');
      }
      renderTopBar();
      return;
    }

    // Sefer Başlatma
    const startBtn = e.target.closest('.btn-modal-start');
    if (startBtn) {
      const node = startBtn.dataset.node;
      const res = gameState.startExpedition(node);
      if (res.success) {
        showToast(res.message, 'success');
        closeModal();
      } else {
        showToast(res.message, 'error');
      }
      renderTopBar();
      return;
    }

    // Sefer Toplama (Tam Claim)
    const claimBtn = e.target.closest('.btn-modal-claim');
    if (claimBtn) {
      const node = claimBtn.dataset.node;
      const res = gameState.claimExpedition(node);
      if (res.success) {
        showToast(`📦 +${res.amount} ${res.resourceName} & +${res.xpGained} XP kazanıldı!`, 'success');
        closeModal();
      } else {
        showToast(res.message, 'error');
      }
      renderTopBar();
      return;
    }

    // Sefer Erken Toplama (Partial Claim)
    const partialClaimBtn = e.target.closest('.btn-modal-partial-claim');
    if (partialClaimBtn) {
      const node = partialClaimBtn.dataset.node;
      const res = gameState.claimPartialExpedition(node);
      if (res.success) {
        showToast(res.message, 'success');
        const acc = gameState.getAccruedExpeditionHarvest(node);
        const accEl = document.getElementById(`modal-exp-accrued-${node}`);
        if (accEl) accEl.innerText = `+0 ${GAME_CONFIG.GLOBAL_RESOURCE_CAPS[node].name}`;
        partialClaimBtn.disabled = true;
      } else {
        showToast(res.message, 'error');
      }
      renderTopBar();
      return;
    }

    // Kışla Asker Seçimi
    const selectSoldierBtn = e.target.closest('.btn-select-soldier-card');
    if (selectSoldierBtn) {
      const idx = parseInt(selectSoldierBtn.dataset.soldierIdx, 10);
      if (!isNaN(idx)) {
        selectedSoldierIndex = idx;
        openBarracksModal();
      }
      return;
    }

    // Askere Teçhizat Kuşanma
    const equipSoldierSlotBtn = e.target.closest('.btn-soldier-equip-slot');
    if (equipSoldierSlotBtn) {
      const sIdx = parseInt(equipSoldierSlotBtn.dataset.soldierIdx, 10);
      const slotKey = equipSoldierSlotBtn.dataset.slot;
      const res = gameState.equipSoldierSlot(sIdx, slotKey);
      if (res.success) {
        showToast(res.message, 'success');
        openBarracksModal();
      } else {
        showToast(res.message, 'error');
      }
      renderTopBar();
      return;
    }

    // Askerden Teçhizat Çıkarma
    const unequipSoldierSlotBtn = e.target.closest('.btn-soldier-unequip-slot');
    if (unequipSoldierSlotBtn) {
      const sIdx = parseInt(unequipSoldierSlotBtn.dataset.soldierIdx, 10);
      const slotKey = unequipSoldierSlotBtn.dataset.slot;
      const res = gameState.unequipSoldierSlot(sIdx, slotKey);
      if (res.success) {
        showToast(res.message, 'success');
        openBarracksModal();
      } else {
        showToast(res.message, 'error');
      }
      renderTopBar();
      return;
    }

    // ⚡ Anında Doyur & İyileştir (Buğday + ADA)
    const instantHealBtn = e.target.closest('.btn-soldier-instant-heal');
    if (instantHealBtn) {
      const sIdx = parseInt(instantHealBtn.dataset.soldierIdx, 10);
      const res = gameState.instantHealSoldierUnit(sIdx);
      if (res.success) {
        showToast(res.message, 'success');
        openBarracksModal();
      } else {
        showToast(res.message, 'error');
      }
      renderTopBar();
      return;
    }

    // Alet Onarımı
    const repairBtn = e.target.closest('.btn-modal-repair');
    if (repairBtn) {
      const tool = repairBtn.dataset.tool;
      const res = gameState.repairTool(tool);
      if (res.success) {
        showToast(res.message, 'success');
        closeModal();
      } else {
        showToast(res.message, 'error');
      }
      renderTopBar();
      return;
    }

    // Buğday ile Stamina Doldur
    if (e.target.closest('#btn-wheat-stamina-refill')) {
      const res = gameState.refillStaminaWithWheat();
      if (res.success) {
        showToast(res.message, 'success');
        openInventoryModal();
      } else {
        showToast(res.message, 'error');
      }
      renderTopBar();
      return;
    }

    // AMM Pazar: İnteraktif Onaylı Kaynak Satışı
    const ammConfirmSellBtn = e.target.closest('.btn-amm-confirm-sell');
    if (ammConfirmSellBtn) {
      const resKey = ammConfirmSellBtn.dataset.res;
      const inputEl = dom.modalBody.querySelector(`.amm-sell-qty[data-res="${resKey}"]`);
      const qty = inputEl ? (parseFloat(inputEl.value) || 0) : 0;

      if (qty <= 0) {
        showToast('Lütfen satmak istediğin geçerli bir miktar gir!', 'error');
        return;
      }
      if ((gameState.state.inventory[resKey] || 0) < qty) {
        showToast(`Yetersiz ${resKey.toUpperCase()}! Envanterinde ${gameState.state.inventory[resKey] || 0} adet var.`, 'error');
        return;
      }

      const res = ammMarket.executeSell(resKey, qty);
      if (res.success) {
        gameState.state.inventory[resKey] -= qty;
        gameState.state.adAstraBalance += res.adAstraReceived;
        gameState.saveState();
        showToast(`💰 ${qty} ${res.resourceName} başarıyla satıldı: +${res.adAstraReceived.toFixed(2)} $ADASTRA kazanıldı!`, 'success');
        sound.playLevelUp();
        openTownZoneModal('market', '🏪 AMM Pazar Alanı');
      } else {
        showToast(res.message || 'Satış işlemi gerçekleştirilemedi!', 'error');
      }
      renderTopBar();
      return;
    }

    // AMM Pazar: İnteraktif Onaylı Kaynak Alışı
    const ammConfirmBuyBtn = e.target.closest('.btn-amm-confirm-buy');
    if (ammConfirmBuyBtn) {
      const resKey = ammConfirmBuyBtn.dataset.res;
      const inputEl = dom.modalBody.querySelector(`.amm-buy-qty[data-res="${resKey}"]`);
      const qty = inputEl ? (parseFloat(inputEl.value) || 0) : 0;

      if (qty <= 0) {
        showToast('Lütfen satın almak istediğin geçerli bir miktar gir!', 'error');
        return;
      }

      const estimatedCost = ammMarket.getEstimatedCostForBuy(resKey, qty);
      if (!isFinite(estimatedCost)) {
        showToast('Havuzda bu miktarı karşılayacak yeterli hammadde likiditesi yok!', 'error');
        return;
      }
      if (gameState.state.adAstraBalance < estimatedCost) {
        showToast(`Yetersiz $ADASTRA! Gereken: ~${estimatedCost.toFixed(2)} ADA, Bakiyen: ${gameState.state.adAstraBalance.toFixed(2)} ADA`, 'error');
        return;
      }

      const res = ammMarket.executeBuyAmount(resKey, qty);
      if (res.success) {
        gameState.state.adAstraBalance -= res.cost;
        gameState.state.inventory[resKey] = (gameState.state.inventory[resKey] || 0) + res.resourceReceived;
        gameState.saveState();
        showToast(`🛒 ${res.cost.toFixed(2)} ADA ödendi: +${res.resourceReceived} ${res.resourceName} satın alındı!`, 'success');
        sound.playLevelUp();
        openTownZoneModal('market', '🏪 AMM Pazar Alanı');
      } else {
        showToast(res.message || 'Alış işlemi gerçekleştirilemedi!', 'error');
      }
      renderTopBar();
      return;
    }

    // Demirci: 5 Parça Ekipman Dövme (Craft)
    const equipCraftBtn = e.target.closest('.btn-craft-equipment');
    if (equipCraftBtn) {
      const slotKey = equipCraftBtn.dataset.slot;
      const res = gameState.craftEquipment(slotKey);
      if (res.success) {
        showToast(res.message, 'success');
        sound.playLevelUp();
        openBarracksModal();
      } else {
        showToast(res.message, 'error');
      }
      renderTopBar();
      return;
    }

    // Demirci: Ekipmanı Yeniden Dövme (Reforge to 13/13)
    const equipReforgeBtn = e.target.closest('.btn-reforge-equipment');
    if (equipReforgeBtn) {
      const slotKey = equipReforgeBtn.dataset.slot;
      const res = gameState.reforgeEquipment(slotKey);
      if (res.success) {
        showToast(res.message, 'success');
        sound.playPickaxe();
        openBarracksModal();
      } else {
        showToast(res.message, 'error');
      }
      renderTopBar();
      return;
    }

    // Demirci: Ekipman Seviye Yükseltme (Upgrade Lv+1)
    const equipUpgradeBtn = e.target.closest('.btn-upgrade-equipment');
    if (equipUpgradeBtn) {
      const slotKey = equipUpgradeBtn.dataset.slot;
      const res = gameState.upgradeEquipment(slotKey);
      if (res.success) {
        showToast(res.message, 'success');
        sound.playLevelUp();
        openBarracksModal();
      } else {
        showToast(res.message, 'error');
      }
      renderTopBar();
      return;
    }

    // Kışla Tek Tip Asker Satın Alma
    if (e.target.closest('#btn-buy-soldier-unit')) {
      const res = gameState.buySoldierUnit();
      if (res.success) {
        showToast(res.message, 'success');
        openBarracksModal();
      } else {
        showToast(res.message, 'error');
      }
      renderTopBar();
      return;
    }

    // Taverna Güçlendirme Satın Alma
    const buyBuffBtn = e.target.closest('.btn-modal-buybuff');
    if (buyBuffBtn) {
      const buffId = buyBuffBtn.dataset.buff;
      const res = gameState.buyTavernBuff(buffId);
      if (res.success) {
        showToast(res.message, 'success');
        openTownZoneModal('tavern', '🍺 Taverna & Han');
      } else {
        showToast(res.message, 'error');
      }
      renderTopBar();
      return;
    }

    // Taverna Stamina Refill
    if (e.target.closest('#btn-inn-refill')) {
      const res = gameState.instantRefillStamina();
      if (res.success) {
        showToast(res.message, 'success');
        closeModal();
      } else {
        showToast(res.message, 'error');
      }
      renderTopBar();
      return;
    }

    // Zindan Mağarasına Gir
    if (e.target.closest('#btn-modal-enter-dungeon')) {
      enterDungeonScene();
      return;
    }

    // Ekonomi Paneli: Sekme Geçişi
    const economyTabBtn = e.target.closest('.economy-tab-btn');
    if (economyTabBtn) {
      openEconomyDashboardModal(economyTabBtn.dataset.tab);
      return;
    }

    // Ekonomi Simülatörü: Çalıştır Butonu
    if (e.target.closest('#btn-run-simulation')) {
      const pInput = dom.modalBody.querySelector('#sim-input-players');
      const dInput = dom.modalBody.querySelector('#sim-input-days');
      if (pInput) simPlayerCount = Math.max(10, parseInt(pInput.value, 10) || 500);
      if (dInput) simDays = parseInt(dInput.value, 10) || 30;
      simResults = globalPool.simulateMacroEconomy(simPlayerCount, simDays);
      sound.playLevelUp();
      showToast(`📊 ${simPlayerCount} aktif oyuncu ile ${simDays} günlük simülasyon hesaplandı!`, 'success');
      openEconomyDashboardModal('simulator');
      return;
    }

    // Görevler: Sekme Geçişi (Günlük / Haftalık)
    const questTabBtn = e.target.closest('.quest-tab-btn');
    if (questTabBtn) {
      questsActiveTab = questTabBtn.dataset.tab;
      openQuestsModal();
      return;
    }

    // Görevler: Ödül Toplama
    const claimQuestBtn = e.target.closest('.btn-claim-quest-reward');
    if (claimQuestBtn) {
      const qId = claimQuestBtn.dataset.questId;
      const qType = claimQuestBtn.dataset.type;
      const res = gameState.claimQuestReward(qId, qType);
      if (res.success) {
        showToast(res.message, 'success');
        openQuestsModal();
      } else {
        showToast(res.message, 'error');
      }
      renderTopBar();
      return;
    }

    // AMM Pazar: Sekme Geçişi (Hammadde / Parça Ticareti)
    const marketTabBtn = e.target.closest('.market-tab-btn');
    if (marketTabBtn) {
      marketActiveTab = marketTabBtn.dataset.tab;
      openTownZoneModal('market', '🏪 AMM Pazar Alanı');
      return;
    }

    // Maden: Sekme Geçişi (Maden Seferleri / Tamirhane)
    const mineTabBtn = e.target.closest('.mine-tab-btn');
    if (mineTabBtn) {
      mineActiveTab = mineTabBtn.dataset.tab;
      openTownZoneModal('mine', '⛏️ Maden Ocağı & Tamirhane');
      return;
    }

    // Kışla: Sekme Geçişi (Demirci / Ordu Yönetimi / Akıllı Silah Deposu)
    const barracksTabBtn = e.target.closest('.barracks-tab-btn');
    if (barracksTabBtn) {
      barracksActiveTab = barracksTabBtn.dataset.tab;
      openBarracksModal();
      return;
    }

    // Ekipman Onarımı (18 Kişilik Ordu)
    const repairEquipBtn = e.target.closest('.btn-repair-equipment');
    if (repairEquipBtn) {
      const soldierIndex = parseInt(repairEquipBtn.dataset.soldierIndex, 10);
      const slot = repairEquipBtn.dataset.slot;
      const res = gameState.repairEquipmentItem(soldierIndex, slot);
      if (res.success) {
        showToast(res.message, 'success');
        openBarracksModal();
      } else {
        showToast(res.message, 'error');
      }
      renderTopBar();
      return;
    }

    // Depo Yükseltme
    if (e.target.closest('#btn-modal-upgrade-warehouse')) {
      const res = gameState.upgradeWarehouse();
      if (res.success) {
        showToast(res.message, 'success');
        openInventoryModal();
      } else {
        showToast(res.message, 'error');
      }
      renderTopBar();
      return;
    }

    // Demirci: Silah/Zırh Dövme
    const craftBtn = e.target.closest('.btn-craft-recipe');
    if (craftBtn) {
      const recipeId = craftBtn.dataset.recipe;
      const res = gameState.craftEquipment(recipeId);
      if (res.success) {
        pendingCraftedItem = res.item;
        barracksActiveTab = 'army';
        showToast(res.message, 'success');
        openBarracksModal();
      } else {
        showToast(res.message, 'error');
      }
      renderTopBar();
      return;
    }

    // Koleksiyon: Sekme Geçişi (Koleksiyon / Kilitli Kutular)
    const collectionTabBtn = e.target.closest('.collection-tab-btn');
    if (collectionTabBtn) {
      collectionActiveTab = collectionTabBtn.dataset.tab;
      lastBoxResult = null;
      openCollectionModal();
      return;
    }

    // Genesis NFT Basımı
    if (e.target.closest('#btn-mint-genesis')) {
      const res = gameState.mintGenesisNft();
      if (res.success) {
        showToast(res.message, 'success');
      } else {
        showToast(res.message, 'error');
      }
      openCollectionModal();
      renderTopBar();
      return;
    }

    // Kilitli Sandık Açma (1 Arena Anahtarı Karşılığında)
    if (e.target.closest('#btn-open-mystery-box')) {
      const st = gameState.state;
      if ((st.lockedBoxes || 0) <= 0) {
        showToast('Açılacak Kilitli Sandığın yok!', 'error');
        return;
      }
      if ((st.arenaKeys || 0) <= 0) {
        showToast('Sandık açmak için en az 1 🔑 Arena Anahtarına ihtiyacın var! (Zindan bosslarını yen veya 18v18 Kolezyum Savaşını kazan)', 'error');
        return;
      }
      const res = gameState.unboxMysteryBox();
      if (res.success) {
        st.arenaKeys -= 1;
        gameState.saveState();
        lastBoxResult = res;
        showToast(res.message, 'success');
      } else {
        showToast(res.message, 'error');
      }
      openCollectionModal();
      renderTopBar();
      return;
    }
  });

  // AMM Pazar İnteraktif Tahmini Fiyat Hesaplama Girdileri (Canlı Güncelleme)
  dom.modalBody.addEventListener('input', (e) => {
    // AMM Satın Al Adet Girdisi Değişimi
    const buyInput = e.target.closest('.amm-buy-qty');
    if (buyInput) {
      const resKey = buyInput.dataset.res;
      const qty = parseFloat(buyInput.value) || 0;
      const costEl = dom.modalBody.querySelector(`.amm-est-cost-text[data-res="${resKey}"]`);
      if (costEl) {
        if (qty <= 0) {
          costEl.innerText = '~0.00 ADA';
        } else {
          const cost = ammMarket.getEstimatedCostForBuy(resKey, qty);
          costEl.innerText = isFinite(cost) ? `~${cost.toFixed(2)} ADA` : 'Yetersiz Likidite';
        }
      }
      return;
    }

    // AMM Satış Adet Girdisi Değişimi
    const sellInput = e.target.closest('.amm-sell-qty');
    if (sellInput) {
      const resKey = sellInput.dataset.res;
      const qty = parseFloat(sellInput.value) || 0;
      const gainEl = dom.modalBody.querySelector(`.amm-est-gain-text[data-res="${resKey}"]`);
      if (gainEl) {
        if (qty <= 0) {
          gainEl.innerText = '~0.00 ADA';
        } else {
          const gain = ammMarket.getEstimatedAdAstraForSell(resKey, qty);
          gainEl.innerText = `~${gain.toFixed(2)} ADA`;
        }
      }
      return;
    }
  });

  if (dom.btnAudioToggle) {
    dom.btnAudioToggle.addEventListener('click', () => {
      sound.isMuted = !sound.isMuted;
      dom.btnAudioToggle.innerText = sound.isMuted ? '🔇' : '🔊';
      if (!sound.isMuted) sound.playLevelUp();
    });
  }

  // Geliştirici & Hızlı Test Paneli Olayları
  initDevPanelEvents();
}

// =========================================================================
// 🧪 GELİŞTİRİCİ & HIZLI TEST PANELİ (DEV CHEAT ENGINE)
// =========================================================================
function syncDevLiveInputs() {
  const st = gameState.state;
  const inv = st.inventory || {};
  
  const elWood = document.getElementById('dev-live-wood');
  const elIron = document.getElementById('dev-live-iron');
  const elWheat = document.getElementById('dev-live-wheat');
  const elFrag = document.getElementById('dev-live-fragments');
  const elAda = document.getElementById('dev-live-adastra');
  const elStam = document.getElementById('dev-live-stamina');
  const elLvl = document.getElementById('dev-live-level');

  if (elWood) elWood.value = inv.wood || 0;
  if (elIron) elIron.value = inv.iron || 0;
  if (elWheat) elWheat.value = inv.wheat || 0;
  if (elFrag) elFrag.value = inv.fragments || 0;
  if (elAda) elAda.value = Math.floor(st.adAstraBalance || 0);
  if (elStam) elStam.value = Math.floor(st.stamina || 0);
  if (elLvl) elLvl.value = st.level || 1;
}

function openDevModal() {
  const modal = document.getElementById('dev-modal');
  if (modal) {
    modal.classList.remove('hidden');
    document.body.classList.add('modal-open');
    syncDevLiveInputs();
  }
}

function closeDevModal() {
  const modal = document.getElementById('dev-modal');
  if (modal) modal.classList.add('hidden');
  const isRpgOpen = dom.rpgModal && dom.rpgModal.classList.contains('active');
  if (!isRpgOpen) {
    document.body.classList.remove('modal-open');
  }
}

function initDevPanelEvents() {
  const btnToggle = document.getElementById('btn-dev-panel-toggle');
  const btnClose = document.getElementById('btn-close-dev-modal');
  const modal = document.getElementById('dev-modal');

  if (btnToggle) {
    btnToggle.addEventListener('click', () => {
      openDevModal();
    });
  }

  if (btnClose) {
    btnClose.addEventListener('click', () => {
      closeDevModal();
    });
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeDevModal();
    });
  }

  // Klavye Kısayolu: 'T' tuşuna basınca Test Panelini Aç/Kapat
  window.addEventListener('keydown', (e) => {
    if (e.key === 't' || e.key === 'T') {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      if (modal) {
        if (modal.classList.contains('hidden')) openDevModal();
        else closeDevModal();
      }
    }
  });

  // 1. ÖZEL DEĞER AYARLAMA BUTONLARI (CUSTOM INJECTOR)
  const btnCustomAdd = document.getElementById('btn-dev-custom-add');
  const btnCustomSub = document.getElementById('btn-dev-custom-sub');
  const btnCustomSet = document.getElementById('btn-dev-custom-set');
  const btnCustomZero = document.getElementById('btn-dev-custom-zero');
  const selectTarget = document.getElementById('dev-select-target');
  const inputCustomVal = document.getElementById('dev-input-custom-val');

  function applyCustomAction(mode) {
    if (!selectTarget || !inputCustomVal) return;
    const target = selectTarget.value;
    const val = parseFloat(inputCustomVal.value) || 0;

    let msg = '';
    if (target === 'wood' || target === 'iron' || target === 'wheat' || target === 'fragments') {
      const cur = gameState.state.inventory[target] || 0;
      if (mode === 'add') {
        gameState.addDevResource(target, val);
        msg = `🌲 ${target.toUpperCase()}: +${val.toLocaleString()} eklendi! (Yeni: ${gameState.state.inventory[target].toLocaleString()})`;
      } else if (mode === 'sub') {
        gameState.addDevResource(target, -val);
        msg = `🔻 ${target.toUpperCase()}: -${val.toLocaleString()} çıkarıldı! (Kalan: ${gameState.state.inventory[target].toLocaleString()})`;
      } else if (mode === 'set') {
        gameState.setDevResource(target, val);
        msg = `🎯 ${target.toUpperCase()}: Değer ${val.toLocaleString()} yapıldı!`;
      } else if (mode === 'zero') {
        gameState.setDevResource(target, 0);
        msg = `🗑️ ${target.toUpperCase()} sıfırlandı!`;
      }
    } else if (target === 'adAstra') {
      if (mode === 'add') {
        gameState.addDevAdAstra(val);
        msg = `🟣 $ADASTRA: +${val.toLocaleString()} eklendi!`;
      } else if (mode === 'sub') {
        gameState.addDevAdAstra(-val);
        msg = `🔻 $ADASTRA: -${val.toLocaleString()} çıkarıldı!`;
      } else if (mode === 'set') {
        gameState.setDevAdAstra(val);
        msg = `🎯 $ADASTRA: Değer ${val.toLocaleString()} yapıldı!`;
      } else if (mode === 'zero') {
        gameState.setDevAdAstra(0);
        msg = `🗑️ $ADASTRA sıfırlandı!`;
      }
    } else if (target === 'stamina') {
      const maxStam = gameState.getMaxStamina();
      if (mode === 'zero') gameState.state.stamina = 0;
      else if (mode === 'set') gameState.state.stamina = Math.min(maxStam, Math.max(0, val));
      else if (mode === 'add') gameState.state.stamina = Math.min(maxStam, Math.max(0, (gameState.state.stamina || 0) + val));
      else if (mode === 'sub') gameState.state.stamina = Math.min(maxStam, Math.max(0, (gameState.state.stamina || 0) - val));
      gameState.saveState();
      msg = `⚡ Stamina: ${Math.floor(gameState.state.stamina)}/${maxStam} yapıldı!`;
    } else if (target === 'level') {
      const targetLvl = mode === 'zero' ? 1 : Math.max(1, Math.min(81, val));
      gameState.setDevLevel(targetLvl);
      msg = `👑 Seviye ${targetLvl} olarak ayarlandı!`;
    } else if (target === 'arenaKeys') {
      if (mode === 'zero') gameState.state.arenaKeys = 0;
      else if (mode === 'set') gameState.state.arenaKeys = Math.max(0, val);
      else if (mode === 'add') gameState.state.arenaKeys = Math.max(0, (gameState.state.arenaKeys || 0) + val);
      else if (mode === 'sub') gameState.state.arenaKeys = Math.max(0, (gameState.state.arenaKeys || 0) - val);
      gameState.saveState();
      msg = `🗝️ Arena Anahtarı: ${gameState.state.arenaKeys} yapıldı!`;
    } else if (target === 'lockedBoxes') {
      if (mode === 'zero') gameState.state.lockedBoxes = 0;
      else if (mode === 'set') gameState.state.lockedBoxes = Math.max(0, val);
      else if (mode === 'add') gameState.state.lockedBoxes = Math.max(0, (gameState.state.lockedBoxes || 0) + val);
      else if (mode === 'sub') gameState.state.lockedBoxes = Math.max(0, (gameState.state.lockedBoxes || 0) - val);
      gameState.saveState();
      msg = `📦 Kilitli Sandık: ${gameState.state.lockedBoxes} yapıldı!`;
    } else if (target === 'dungeon') {
      const dLvl = mode === 'zero' ? 1 : Math.max(1, Math.min(18, val));
      gameState.setDungeonProgress(dLvl);
      msg = `💀 Zindan Kat Seviyesi ${dLvl} yapıldı!`;
    }

    showToast(msg, 'success');
    sound.playLevelUp();
    syncDevLiveInputs();
    renderTopBar();
  }

  if (btnCustomAdd) btnCustomAdd.addEventListener('click', () => applyCustomAction('add'));
  if (btnCustomSub) btnCustomSub.addEventListener('click', () => applyCustomAction('sub'));
  if (btnCustomSet) btnCustomSet.addEventListener('click', () => applyCustomAction('set'));
  if (btnCustomZero) btnCustomZero.addEventListener('click', () => applyCustomAction('zero'));

  // 2. CANLI TABLO İNTERAKTİF GİRDİLERİ
  const bindLiveInput = (id, setter) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', () => {
        const val = parseFloat(el.value) || 0;
        setter(val);
        showToast('🎯 Değer güncellendi!', 'success');
        syncDevLiveInputs();
        renderTopBar();
      });
    }
  };

  bindLiveInput('dev-live-wood', v => gameState.setDevResource('wood', v));
  bindLiveInput('dev-live-iron', v => gameState.setDevResource('iron', v));
  bindLiveInput('dev-live-wheat', v => gameState.setDevResource('wheat', v));
  bindLiveInput('dev-live-fragments', v => gameState.setDevResource('fragments', v));
  bindLiveInput('dev-live-adastra', v => gameState.setDevAdAstra(v));
  bindLiveInput('dev-live-stamina', v => { gameState.state.stamina = Math.min(gameState.getMaxStamina(), Math.max(0, v)); gameState.saveState(); });
  bindLiveInput('dev-live-level', v => gameState.setDevLevel(Math.min(81, Math.max(1, v))));

  // 3. CANLI TABLO HIZLI BUTONLARI (QUICK BUTTONS)
  document.addEventListener('click', (e) => {
    // Quick delta (+/-)
    const quickBtn = e.target.closest('[data-dev-quick]');
    if (quickBtn) {
      const res = quickBtn.getAttribute('data-dev-quick');
      const delta = parseFloat(quickBtn.getAttribute('data-delta')) || 0;
      if (res === 'adAstra') gameState.addDevAdAstra(delta);
      else gameState.addDevResource(res, delta);
      showToast(`${delta > 0 ? '+' : ''}${delta.toLocaleString()} ${res} uygulandı!`, 'success');
      sound.playHarvest();
      syncDevLiveInputs();
      renderTopBar();
      return;
    }

    // Quick zero (sıfırla)
    const zeroBtn = e.target.closest('[data-dev-quick-zero]');
    if (zeroBtn) {
      const res = zeroBtn.getAttribute('data-dev-quick-zero');
      if (res === 'adAstra') gameState.setDevAdAstra(0);
      else gameState.setDevResource(res, 0);
      showToast(`🗑️ ${res} sıfırlandı!`, 'info');
      syncDevLiveInputs();
      renderTopBar();
      return;
    }

    // Exact set
    const setBtn = e.target.closest('[data-dev-set-exact]');
    if (setBtn) {
      const field = setBtn.getAttribute('data-dev-set-exact');
      const val = parseFloat(setBtn.getAttribute('data-val')) || 0;
      if (field === 'stamina') {
        const maxStam = gameState.getMaxStamina();
        gameState.state.stamina = Math.min(maxStam, Math.max(0, val));
        gameState.saveState();
        showToast(`⚡ Stamina: ${Math.min(val, maxStam)}/${maxStam} yapıldı!`, 'success');
      } else if (field === 'level') {
        gameState.setDevLevel(val);
        showToast(`👑 Seviye ${val} yapıldı!`, 'success');
      }
      sound.playLevelUp();
      syncDevLiveInputs();
      renderTopBar();
      return;
    }

    // Preset dev actions
    const btn = e.target.closest('[data-dev-action]');
    if (!btn) return;

    const action = btn.getAttribute('data-dev-action');
    const amount = parseInt(btn.getAttribute('data-amount'), 10) || 0;
    const hours = parseInt(btn.getAttribute('data-hours'), 10) || 0;
    const level = parseInt(btn.getAttribute('data-level'), 10) || 0;

    switch (action) {
      case 'vanilla-reset':
        const vRes = gameState.vanillaReset();
        showToast(vRes.message, 'success');
        closeDevModal();
        closeModal();
        break;

      case 'add-wood':
        gameState.addDevResource('wood', amount);
        showToast(`🌲 +${amount.toLocaleString()} Odun eklendi!`, 'success');
        sound.playHarvest();
        break;

      case 'add-iron':
        gameState.addDevResource('iron', amount);
        showToast(`⛏️ +${amount.toLocaleString()} Demir eklendi!`, 'success');
        sound.playPickaxe();
        break;

      case 'add-wheat':
        gameState.addDevResource('wheat', amount);
        showToast(`🌾 +${amount.toLocaleString()} Buğday eklendi!`, 'success');
        sound.playHarvest();
        break;

      case 'add-fragments':
        gameState.addDevResource('fragments', amount);
        showToast(`🧩 +${amount.toLocaleString()} Parça (Fragment) eklendi!`, 'success');
        sound.playLevelUp();
        break;

      case 'add-adastra':
        gameState.addDevAdAstra(amount);
        showToast(`🟣 +${amount.toLocaleString()} $ADASTRA bakiyene eklendi!`, 'success');
        sound.playLevelUp();
        break;

      case 'add-keys':
        gameState.addArenaKey(amount);
        showToast(`🗝️ +${amount} Arena Anahtarı eklendi!`, 'success');
        sound.playLevelUp();
        break;

      case 'add-boxes':
        gameState.state.lockedBoxes = (gameState.state.lockedBoxes || 0) + amount;
        gameState.saveState();
        showToast(`📦 +${amount} Kilitli Sandık eklendi!`, 'success');
        sound.playLevelUp();
        break;

      case 'fast-forward':
        gameState.fastForwardTime(hours);
        showToast(`⏩ Zaman ${hours} saat ileri sarıldı!`, 'success');
        sound.playLevelUp();
        break;

      case 'complete-expeditions':
        gameState.completeAllExpeditionsNow();
        showToast(`⚡ Tüm aktif işçi seferleri anında tamamlandı!`, 'success');
        sound.playLevelUp();
        break;

      case 'claim-expeditions':
        const claims = gameState.claimAllCompletedExpeditions();
        if (claims && claims.length > 0) {
          showToast(`🎁 ${claims.length} adet tamamlanan sefer toplandı!`, 'success');
        } else {
          showToast(`⚠️ Toplanacak tamamlanmış sefer bulunamadı.`, 'info');
        }
        break;

      case 'reset-daily-limits':
        globalPool.resetEpoch();
        showToast(`📊 Küresel günlük kaynak limitleri ve havuzlar yenilendi!`, 'success');
        sound.playLevelUp();
        break;

      case 'refill-stamina':
        gameState.refillDevStamina();
        showToast(`⚡ Stamina 100/100 tam dolduruldu!`, 'success');
        sound.playLevelUp();
        break;

      case 'level-up':
        gameState.levelUp();
        showToast(`🆙 Seviye ${gameState.state.level}'e yükseltildi!`, 'success');
        sound.playLevelUp();
        break;

      case 'set-level':
        gameState.setDevLevel(level);
        showToast(`👑 Seviye ${level} olarak ayarlandı! (Sefer süresi: ${gameState.getExpeditionDurationHours(level)} Saat)`, 'success');
        sound.playLevelUp();
        break;

      case 'heal-soldiers':
        gameState.healAllDevSoldiers();
        showToast(`❤️ Tüm 18 askerin canı %100 iyileştirildi!`, 'success');
        sound.playLevelUp();
        break;

      case 'repair-tools':
        gameState.repairAllDevTools();
        showToast(`🔨 Tüm aletler, silahlar ve zırhlar %100 tamir edildi (18 tamir hakkı yenilendi)!`, 'success');
        sound.playLevelUp();
        break;

      case 'unlock-artifacts':
        gameState.unlockAllDevArtifacts();
        showToast(`👑 Tüm 18 Koleksiyon Eseri keşfedildi! Genesis NFT basılabilir!`, 'success');
        sound.playLevelUp();
        break;

      case 'unlock-all-soldiers':
        while ((gameState.state.soldierUnits || []).length < (GAME_CONFIG.MAX_SOLDIERS || 18)) {
          gameState.state.soldierUnits.push(gameState.createSoldierUnit(gameState.state.soldierUnits.length + 1));
        }
        gameState.state.soldierUnits.forEach(s => { s.hp = s.maxHp || 100; });
        gameState.saveState();
        showToast(`⚔️ 18 Asker tamamı orduya katıldı!`, 'success');
        sound.playLevelUp();
        break;

      case 'set-dungeon':
        gameState.setDungeonProgress(level);
        showToast(`💀 Zindan ilerlemesi Seviye ${level} olarak ayarlandı!`, 'success');
        sound.playLevelUp();
        break;
    }

    syncDevLiveInputs();
    renderTopBar();
  });
}

function uiGameLoop(currentTime) {
  const deltaMs = currentTime - lastTickTime;
  lastTickTime = currentTime;
  const deltaSeconds = (deltaMs / 1000) * speedMultiplier;

  gameState.regenerateStamina(deltaSeconds);
  gameState.updateExpeditions(deltaSeconds);
  gameState.processSoldierPassiveHealing(deltaSeconds);
  globalPool.simulateGlobalActivity(deltaSeconds);
  refreshBarracksLiveUI(deltaSeconds);

  // Canlı Açık Sefer Modalı Sayacı Güncelleme
  ['wood', 'iron', 'wheat'].forEach(nodeId => {
    const timeEl = document.getElementById(`modal-exp-time-${nodeId}`);
    const pctEl = document.getElementById(`modal-exp-pct-${nodeId}`);
    const fillEl = document.getElementById(`modal-exp-fill-${nodeId}`);
    const accEl = document.getElementById(`modal-exp-accrued-${nodeId}`);
    const partBtn = document.getElementById(`btn-modal-partial-${nodeId}`);
    if (timeEl && fillEl) {
      const acc = gameState.getAccruedExpeditionHarvest(nodeId);
      timeEl.innerText = formatCountdown(acc.remainingSeconds);
      if (pctEl) pctEl.innerText = `%${acc.pct}`;
      fillEl.style.width = `${acc.pct}%`;
      if (accEl) {
        accEl.innerText = `+${acc.accruedAmount} ${GAME_CONFIG.GLOBAL_RESOURCE_CAPS[nodeId].name} (+${Math.floor(acc.accruedAmount * 0.5)} XP)`;
      }
      if (partBtn) {
        partBtn.disabled = acc.accruedAmount <= 0;
        partBtn.innerText = `⚡ ERKEN TOPLA (+${acc.accruedAmount} Al)`;
      }
    }
  });

  // Zindan Üst Barındaki Dinamik Sayıcılar
  const dkKeys = document.getElementById('dungeon-dock-keys');
  if (dkKeys) dkKeys.innerText = gameState.state.arenaKeys || 0;
  const dkBoxes = document.getElementById('dungeon-dock-boxes');
  if (dkBoxes) dkBoxes.innerText = gameState.state.lockedBoxes || 0;
  const dkFrags = document.getElementById('dungeon-dock-fragments');
  if (dkFrags) dkFrags.innerText = gameState.state.inventory.fragments || 0;

  renderTopBar();
  requestAnimationFrame(uiGameLoop);
}

function initPhaser() {
  const W = window.innerWidth;
  const H = Math.max(300, window.innerHeight - 56);

  const config = {
    type: Phaser.CANVAS,           // Force Canvas (WebGL can silently fail)
    parent: 'phaser-game-container',
    width: W,
    height: H,
    backgroundColor: '#1a0f08',
    render: {
      antialias: true,
      pixelArt: false,
      roundPixels: false,
      transparent: false,
      clearBeforeRender: true,
      powerPreference: 'default'
    },
    scene: [GrandTownScene, DungeonScene]
  };

  phaserGame = new Phaser.Game(config);

  // Force canvas to fill area below top header strip
  phaserGame.events.once('ready', () => {
    console.log('[Phaser] Game ready! Resizing canvas...');
    if (phaserGame && phaserGame.scale) {
      phaserGame.scale.resize(window.innerWidth, Math.max(300, window.innerHeight - 56));
    }
    if (window.__finishLoadingBar) window.__finishLoadingBar();
  });

  // Resize on window change
  window.addEventListener('resize', () => {
    if (!phaserGame || !phaserGame.scale) return;
    phaserGame.scale.resize(window.innerWidth, Math.max(300, window.innerHeight - 56));
  });
}


window.addEventListener('DOMContentLoaded', () => {
  initPhaser();
  initAppEvents();
  renderTopBar();
  lastTickTime = performance.now();
  requestAnimationFrame(uiGameLoop);
  runCinematicLoadingSequence();
});

