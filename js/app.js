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
window.gameState = gameState;
window.globalPool = globalPool;

// PHASE 2: GAMEFI & RPG EKONOMİSİ - MODAL SEKME & GEÇİCİ DURUM DEĞİŞKENLERİ
let barracksActiveTab = 'army';
let mineActiveTab = 'mining';
let marketActiveTab = 'resources';
let selectedSoldierIndex = 0;
let collectionActiveTab = 'koleksiyon';
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
    const days = Math.floor(secToReset / 86400);
    const hrs = Math.floor((secToReset % 86400) / 3600);
    const mins = Math.floor((secToReset % 3600) / 60);
    dom.sidebarResetTimer.innerText = days > 0 ? `⏳ ${days}g ${hrs}s ${mins}d` : `⏳ ${hrs}s ${mins}d`;
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

    // Üst şerit menüyü Zindan Menüsüyle değiştir & hammadde pillerini gizle
    document.body.classList.add('in-dungeon');
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
  document.body.classList.remove('in-dungeon');
  const topNavMenu = document.querySelector('.top-nav-menu');
  const floorBar = document.getElementById('dungeon-floor-bar');
  if (topNavMenu) topNavMenu.classList.remove('hidden');
  if (floorBar) floorBar.classList.add('hidden');

  showToast('🏰 Kasaba meydanına dönüldü!', 'info');
}

window.addEventListener('enter-dungeon-view', () => {
  enterDungeonScene();
});

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
// 2. SİLO / DEPO & KARAKTER GELİŞİMİ MENÜLERİ
// =========================================================================
function openWarehouseModal() {
  const state = gameState.state;
  dom.modalTitle.innerHTML = `<span>📦</span> <span>KRALLIK DEPOSU & SİLO KAPASİTE YÖNETİMİ</span>`;

  const wood = state.inventory.wood || 0;
  const iron = state.inventory.iron || 0;
  const wheat = state.inventory.wheat || 0;
  const adAstra = state.adAstraBalance || 0;

  const cap = gameState.getWarehouseCapacity();
  const canUpgrade = state.warehouseLevel < GAME_CONFIG.WAREHOUSE.baseLevels;
  const nextCost = canUpgrade ? GAME_CONFIG.WAREHOUSE.upgradeCosts[state.warehouseLevel + 1] : null;

  let upgradeBtn = '';
  if (canUpgrade && nextCost) {
    const canAfford = wood >= nextCost.wood && iron >= nextCost.iron && wheat >= nextCost.wheat && adAstra >= nextCost.adAstra;
    upgradeBtn = `
      <div style="background: #140e08; padding: 12px; border-radius: 8px; border: 1px solid #583007; margin-top: 12px;">
        <div style="color: #cbd5e1; font-weight: 700; margin-bottom: 8px;">Seviye ${state.warehouseLevel + 1} Yükseltme Maliyeti:</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.88rem;">
          <div style="color: ${wood >= nextCost.wood ? '#4ade80' : '#f87171'}; font-weight: 700;">🌲 ${wood}/${nextCost.wood} Odun</div>
          <div style="color: ${iron >= nextCost.iron ? '#4ade80' : '#f87171'}; font-weight: 700;">⛏️ ${iron}/${nextCost.iron} Demir</div>
          <div style="color: ${wheat >= nextCost.wheat ? '#4ade80' : '#f87171'}; font-weight: 700;">🌾 ${wheat}/${nextCost.wheat} Buğday</div>
          <div style="color: ${adAstra >= nextCost.adAstra ? '#4ade80' : '#f87171'}; font-weight: 700;">🟣 ${adAstra.toFixed(1)}/${nextCost.adAstra} $ADASTRA</div>
        </div>
      </div>
      <button id="btn-modal-upgrade-warehouse" class="btn-clean btn-clean-green" style="margin-top: 12px; width: 100%; font-size: 1.05rem; padding: 13px; font-weight: 800;" ${canAfford ? '' : 'disabled'}>
        🔨 SEVİYE ${state.warehouseLevel + 1}'E YÜKSELT
      </button>
    `;
  } else {
    upgradeBtn = `<div style="text-align: center; color: #facc15; margin-top: 12px; font-weight: 800; font-size: 0.95rem;">✅ Maksimum Depo Seviyesine Ulaşıldı (Seviye 10 Master)</div>`;
  }

  dom.modalBody.innerHTML = `
    <div class="clean-card" style="border-color: #ca8a04; background: #181109; padding: 16px;">
      <div class="card-title-row">
        <div class="card-title" style="font-size: 1.1rem; color: #fde047;">📦 Silo & Depo (Seviye ${state.warehouseLevel})</div>
        <span style="font-size: 0.85rem; color: #fde047; font-weight: 700;">Kapasite Yönetimi</span>
      </div>
      
      <div class="clean-desc" style="margin-bottom: 12px;">
        Depo seviyeni yükselterek Demir, Odun ve Buğday maks stok kapasitelerini artırabilir ve krallık üretimini büyütebilirsin.
      </div>

      <div class="inv-grid" style="gap: 10px; margin-top: 8px;">
        <div style="background: #140e08; padding: 12px; border-radius: 8px; border: 1px solid #583007;">
          <div style="font-size: 0.85rem; color: #94a3b8; margin-bottom: 6px; font-weight: 700;">⛏️ Demir Stok Durumu</div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="flex: 1; height: 18px; background: #0c0604; border-radius: 4px; border: 1px solid #583007; overflow: hidden;">
              <div style="height: 100%; background: #94a3b8; width: ${Math.min(100, (iron / cap.iron) * 100)}%;"></div>
            </div>
            <span style="font-weight: 800; color: #94a3b8; min-width: 70px; text-align: right;">${iron}/${cap.iron}</span>
          </div>
        </div>

        <div style="background: #140e08; padding: 12px; border-radius: 8px; border: 1px solid #583007;">
          <div style="font-size: 0.85rem; color: #94a3b8; margin-bottom: 6px; font-weight: 700;">🌲 Odun Stok Durumu</div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="flex: 1; height: 18px; background: #0c0604; border-radius: 4px; border: 1px solid #583007; overflow: hidden;">
              <div style="height: 100%; background: #4ade80; width: ${Math.min(100, (wood / cap.wood) * 100)}%;"></div>
            </div>
            <span style="font-weight: 800; color: #4ade80; min-width: 70px; text-align: right;">${wood}/${cap.wood}</span>
          </div>
        </div>

        <div style="background: #140e08; padding: 12px; border-radius: 8px; border: 1px solid #583007;">
          <div style="font-size: 0.85rem; color: #94a3b8; margin-bottom: 6px; font-weight: 700;">🌾 Buğday Stok Durumu</div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="flex: 1; height: 18px; background: #0c0604; border-radius: 4px; border: 1px solid #583007; overflow: hidden;">
              <div style="height: 100%; background: #facc15; width: ${Math.min(100, (wheat / cap.wheat) * 100)}%;"></div>
            </div>
            <span style="font-weight: 800; color: #facc15; min-width: 70px; text-align: right;">${wheat}/${cap.wheat}</span>
          </div>
        </div>
      </div>

      ${upgradeBtn}
    </div>
  `;

  displayModal();
}

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
  if (zoneId === 'barracks' || zoneId === 'battlefield') {
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

  // 2. MADEN (IRON) - Sadece Maden Seferleri & Kazma Bakımı (Sekmesiz Temiz Görünüm)
  else if (zoneId === 'mine') {
    const pickaxeTool = state.tools.pickaxe || { durability: 0 };
    const pickCost = gameState.calculateRepairCost('pickaxe');
    const activeExp = state.activeExpeditions.iron;
    const isSpeedActive = gameState.isBuffActive('speed_iron');

    html = `
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

      <div class="clean-card">
        <div class="card-title-row">
          <div class="card-title">🔨 Kazma Tamiratı</div>
          <span style="font-size: 0.85rem; color: #fde047; font-weight: 700;">${pickCost.resourceCost} Demir + ${pickCost.adAstraCost} ADA</span>
        </div>
        <button class="btn-clean btn-clean-outline btn-modal-repair" data-tool="pickaxe" ${pickaxeTool.durability >= 100 ? 'disabled' : ''}>
          ${pickaxeTool.durability >= 100 ? 'Kazma Tamamen Sağlam' : `Kazmayı Onar (${pickCost.resourceCost} Demir + ${pickCost.adAstraCost} ADA)`}
        </button>
      </div>
    `;
  }

  // 2.5 DEMİRCİ & TAMİRHANE (ŞEHİR MERKEZİNDEKİ EV) - Silah/Zırh Dövme & Tamirhane Sekmeleri
  else if (zoneId === 'blacksmith') {
    const pickaxeTool = state.tools.pickaxe || { durability: 0 };
    const axeTool = state.tools.axe || { durability: 0 };
    const sickleTool = state.tools.sickle || { durability: 0 };
    const pickCost = gameState.calculateRepairCost('pickaxe');
    const axeCost = gameState.calculateRepairCost('axe');
    const sickleCost = gameState.calculateRepairCost('sickle');

    const tabsHtml = `
      <div class="phase2-tab-row">
        <button class="phase2-tab-btn mine-tab-btn ${mineActiveTab === 'blacksmith' ? 'active' : ''}" data-tab="blacksmith">⚒️ Demirci (Silah & Zırh Döv)</button>
        <button class="phase2-tab-btn mine-tab-btn ${mineActiveTab === 'repair' ? 'active' : ''}" data-tab="repair">🔧 Tamirhane</button>
      </div>
    `;

    let contentHtml = '';

    if (mineActiveTab === 'repair') {
      // 🔧 TAMİRHANE
      const forgedSlots = Object.keys(state.equipment || {}).filter(slot => state.equipment[slot] && state.equipment[slot].level > 0);
      const equipmentRepairCards = forgedSlots.map(slot => {
        const item = state.equipment[slot];
        const durability = item.durability ?? 100;
        const repCost = gameState.calculateEquipmentRepairCost(slot);
        const slotTr = { weapon: 'Silah', helmet: 'Miğfer', armor: 'Gövde Zırhı', legs: 'Pantolon', boots: 'Ayakkabı' }[slot] || slot;

        return `
          <div class="clean-card" style="margin-bottom: 8px;">
            <div class="card-title-row">
              <div class="card-title">${item.icon} ${item.name} (${slotTr} Lv.${item.level})</div>
              <span class="card-badge" style="color: ${durability <= 25 ? '#ef4444' : '#22c55e'};">%${durability}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px;">
              <span style="font-size: 0.82rem; color: #cbd5e1;">Maliyet: ${repCost.ironCost}⛏️ + ${repCost.fragCost}🧩 + ${repCost.adaCost}ADA</span>
              <button class="btn-clean btn-clean-outline btn-equip-repair" data-slot="${slot}" style="width: auto; padding: 6px 14px;" ${durability >= 100 ? 'disabled' : ''}>
                ${durability >= 100 ? '✅ Sağlam' : `Onar (${repCost.ironCost}⛏️ + ${repCost.fragCost}🧩)`}
              </button>
            </div>
          </div>
        `;
      }).join('');

      contentHtml = `
        <div class="clean-card" style="border-color: #38bdf8; background: #0f172a;">
          <div class="card-title-row">
            <div class="card-title">🔧 Krallık Tamirhanesi</div>
            <span class="card-badge" style="color: #38bdf8;">Tüm Ekipmanlar</span>
          </div>
          <div class="clean-desc">
            Savaşlarda ve seferlerde yıpranan silah, zırh ve işçi aletlerini onararak güçlerini koru.
          </div>
        </div>

        <div style="font-weight: 800; font-size: 0.9rem; color: #f59e0b; margin: 12px 0 6px 2px;">🛡️ Askeri Teçhizat Onarımı</div>
        ${forgedSlots.length > 0 ? equipmentRepairCards : `
          <div class="clean-card" style="text-align: center; color: #94a3b8; font-size: 0.85rem;">
            Henüz dövülmüş bir silah veya zırhın yok. ⚒️ Demirci sekmesinden yeni eşyalar dövebilirsin.
          </div>
        `}

        <div style="font-weight: 800; font-size: 0.9rem; color: #38bdf8; margin: 14px 0 6px 2px;">🔨 İşçi Aletleri Bakımı</div>
        <!-- Kazma -->
        <div class="clean-card">
          <div class="card-title-row">
            <div class="card-title">⛏️ Kazma Bakımı</div>
            <span class="card-badge" style="color: ${pickaxeTool.durability <= 25 ? '#ef4444' : '#22c55e'};">%${pickaxeTool.durability}</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px;">
            <span style="font-size: 0.82rem; color: #cbd5e1;">Maliyet: ${pickCost.resourceCost} Demir + ${pickCost.adAstraCost} ADA</span>
            <button class="btn-clean btn-clean-outline btn-modal-repair" data-tool="pickaxe" style="width: auto; padding: 6px 14px;" ${pickaxeTool.durability >= 100 ? 'disabled' : ''}>
              ${pickaxeTool.durability >= 100 ? '✅ Sağlam' : `Onar (${pickCost.resourceCost}⛏️ + ${pickCost.adAstraCost}ADA)`}
            </button>
          </div>
        </div>

        <!-- Balta -->
        <div class="clean-card">
          <div class="card-title-row">
            <div class="card-title">🪓 Balta Bakımı</div>
            <span class="card-badge" style="color: ${axeTool.durability <= 25 ? '#ef4444' : '#22c55e'};">%${axeTool.durability}</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px;">
            <span style="font-size: 0.82rem; color: #cbd5e1;">Maliyet: ${axeCost.resourceCost} Odun + ${axeCost.adAstraCost} ADA</span>
            <button class="btn-clean btn-clean-outline btn-modal-repair" data-tool="axe" style="width: auto; padding: 6px 14px;" ${axeTool.durability >= 100 ? 'disabled' : ''}>
              ${axeTool.durability >= 100 ? '✅ Sağlam' : `Onar (${axeCost.resourceCost}🌲 + ${axeCost.adAstraCost}ADA)`}
            </button>
          </div>
        </div>

        <!-- Orak -->
        <div class="clean-card">
          <div class="card-title-row">
            <div class="card-title">🌾 Orak Bakımı</div>
            <span class="card-badge" style="color: ${sickleTool.durability <= 25 ? '#ef4444' : '#22c55e'};">%${sickleTool.durability}</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px;">
            <span style="font-size: 0.82rem; color: #cbd5e1;">Maliyet: ${sickleCost.resourceCost} Buğday + ${sickleCost.adAstraCost} ADA</span>
            <button class="btn-clean btn-clean-outline btn-modal-repair" data-tool="sickle" style="width: auto; padding: 6px 14px;" ${sickleTool.durability >= 100 ? 'disabled' : ''}>
              ${sickleTool.durability >= 100 ? '✅ Sağlam' : `Onar (${sickleCost.resourceCost}🌾 + ${sickleCost.adAstraCost}ADA)`}
            </button>
          </div>
        </div>
      `;
    } else {
      // ⚒️ DEMİRCİ: 5 PARÇA SİLAH & ZIRH DÖVME
      const equipConfig = GAME_CONFIG.EQUIPMENT_RECIPES;
      const currentEquip = state.equipment || {};
      const totalStats = gameState.getEquipmentBonusStats();
      const slots = ['weapon', 'helmet', 'armor', 'legs', 'boots'];
      const slotNames = { weapon: 'Silah', helmet: 'Miğfer', armor: 'Gövde Zırhı', legs: 'Pantolon', boots: 'Ayakkabı' };

      contentHtml = `
        <div class="clean-card" style="border-color: #f59e0b; background: #1c140c;">
          <div class="card-title-row">
            <div class="card-title">⚒️ Krallık Demircisi - Silah & Zırh Dövme</div>
            <span class="card-badge" style="color: #4ade80;">⚔️ +${totalStats.totalAtk} ATK | ❤️ +${totalStats.totalHp} HP</span>
          </div>
          <div class="clean-desc">
            Demirci ocağında 5 parça teçhizat dövebilir ve seviyelerini yükseltebilirsin. Yeni silah ve zırh döverken veya seviye atlatırken <strong>Demir, Odun, Parça (Fragment) ve ADA</strong> kullanılır.
          </div>
        </div>

        <div class="equip-grid">
          ${slots.map(slot => {
            const recipe = equipConfig[slot];
            const item = currentEquip[slot];
            const currentLvl = item ? item.level : 0;
            const isForged = currentLvl > 0;
            const nextLvl = currentLvl + 1;
            const isMaxLvl = currentLvl >= 10;
            
            let canAfford = false;
            let costHtml = '';

            if (!isForged) {
              // Dövme (Craft) Maliyeti
              const craftCost = recipe.cost;
              canAfford = (state.inventory.iron || 0) >= craftCost.iron &&
                          (state.inventory.wood || 0) >= craftCost.wood &&
                          (state.inventory.fragments || 0) >= craftCost.fragments &&
                          state.adAstraBalance >= craftCost.adAstra;
              costHtml = `${craftCost.iron}⛏️ • ${craftCost.wood}🌲 • ${craftCost.fragments}🧩 • ${craftCost.adAstra}🟣`;
            } else if (!isMaxLvl) {
              // Yükseltme (Upgrade) Maliyeti
              const upCost = gameState.calculateEquipmentUpgradeCost(slot);
              if (upCost) {
                canAfford = (state.inventory.iron || 0) >= upCost.ironCost &&
                            (state.inventory.wood || 0) >= upCost.woodCost &&
                            (state.inventory.fragments || 0) >= upCost.fragmentCost &&
                            state.adAstraBalance >= upCost.adAstraCost;
                costHtml = `${upCost.ironCost}⛏️ • ${upCost.woodCost}🌲 • ${upCost.fragmentCost}🧩 • ${upCost.adAstraCost}🟣`;
              }
            }

            return `
              <div class="equip-card ${isForged ? 'forged' : ''}">
                <div class="equip-icon">${recipe.icon}</div>
                <div class="equip-name">${slotNames[slot]}</div>
                <div class="equip-level">${isForged ? `Seviye ${currentLvl}` : 'Dövülmedi'}</div>

                <div class="equip-stats">
                  ${isForged ? `
                    <div style="color: #4ade80; font-size: 0.8rem; font-weight: 700;">
                      ${item.atkBonus > 0 ? `+${item.atkBonus} ATK` : ''} 
                      ${item.hpBonus > 0 ? `+${item.hpBonus} HP` : ''}
                    </div>
                  ` : `
                    <div style="color: #94a3b8; font-size: 0.78rem;">
                      ${recipe.baseAtk > 0 ? `+${recipe.baseAtk} ATK ` : ''}${recipe.baseHp > 0 ? `+${recipe.baseHp} HP` : ''}
                    </div>
                  `}
                </div>

                <div class="equip-cost-box">
                  ${isMaxLvl ? '<span style="color: #facc15; font-weight: 800;">MAKSİMUM SEVİYE</span>' : `
                    <div style="font-size: 0.75rem; color: #cbd5e1; line-height: 1.3;">
                      ${costHtml}
                    </div>
                  `}
                </div>

                ${isMaxLvl ? '' : (
                  isForged ? `
                    <button class="btn-clean btn-clean-sm btn-upgrade-equipment" data-slot="${slot}" ${canAfford ? '' : 'disabled'}>
                      ✨ Yükselt (Lv.${nextLvl})
                    </button>
                  ` : `
                    <button class="btn-clean btn-clean-sm btn-craft-equipment" data-slot="${slot}" ${canAfford ? '' : 'disabled'}>
                      🔨 Döv (Lv.1)
                    </button>
                  `
                )}
              </div>
            `;
          }).join('')}
        </div>
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

  // 4. AMM PAZAR YERİ (AUTOMATED MARKET MAKER DEX SWAP & P2P MARKET)
  else if (zoneId === 'market') {
    const marketTabsHtml = `
      <div class="phase2-tab-row">
        <button class="phase2-tab-btn market-tab-btn ${marketActiveTab === 'resources' ? 'active' : ''}" data-tab="resources">🪙 Hammadde & Sandık Havuzları</button>
        <button class="phase2-tab-btn market-tab-btn ${marketActiveTab === 'fragments' ? 'active' : ''}" data-tab="fragments">🧩 Parça Ticareti</button>
        <button class="phase2-tab-btn market-tab-btn ${marketActiveTab === 'p2p_collection' ? 'active' : ''}" data-tab="p2p_collection">👑 P2P Koleksiyon Pazarı</button>
      </div>
    `;

    html = `
      <div class="clean-card">
        <div class="card-title-row">
          <div class="card-title">🏪 AMM Pazar Yeri & P2P Koleksiyon Pazarı</div>
          <span style="font-size: 0.85rem; color: #c084fc; font-weight: 700;">Bakiye: ${state.adAstraBalance.toFixed(1)} ADA</span>
        </div>
        <div class="clean-desc">
          Automated Market Maker ($x \\cdot y = k$) DEX likidite havuzlarında hammadde, kilitli sandık ve anahtar ticareti yapabilir veya P2P pazarda koleksiyon eserlerini satabilirsin.
        </div>
      </div>

      ${marketTabsHtml}
    `;

    const renderAmmTradeCard = (resKey) => {
      const pool = ammMarket.pools[resKey];
      if (!pool) return '';
      const price = ammMarket.getPrice(resKey);
      const invAmount = resKey === 'boxes'
        ? (state.lockedBoxes || 0)
        : resKey === 'keys'
          ? (state.arenaKeys || 0)
          : (state.inventory[resKey] || 0);

      const initialBuy = 1;
      const initialSell = Math.min(1, invAmount > 0 ? invAmount : 1);

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

    if (marketActiveTab === 'p2p_collection') {
      const listings = gameState.getP2PArtifactListings();
      const userArtifacts = (state.collectionArtifacts || []).filter(a => a.discovered);

      const listingCards = listings.map(item => {
        const cfg = GAME_CONFIG.COLLECTION_ARTIFACTS.find(c => c.id === item.artifactId);
        if (!cfg) return '';
        const isUser = item.isUserListing;

        return `
          <div class="clean-card" style="margin-bottom:10px; background:#121824; border-color:${isUser ? '#ca8a04' : '#334155'}; padding:12px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div style="display:flex; align-items:center; gap:10px;">
                <span style="font-size:1.8rem;">${cfg.icon}</span>
                <div>
                  <div style="font-weight:800; font-size:0.98rem; color:#fff;">${cfg.name}</div>
                  <div style="font-size:0.75rem; color:#94a3b8;">Satıcı: <strong style="color:${isUser ? '#facc15' : '#38bdf8'};">${item.sellerName} ${isUser ? '(Sen)' : ''}</strong></div>
                </div>
              </div>
              <div style="text-align:right;">
                <span class="card-badge rarity-${cfg.rarity}" style="font-size:0.7rem;">${cfg.rarity.toUpperCase()}</span>
                <div style="font-weight:800; font-size:1.05rem; color:#fde047; margin-top:3px;">🟣 ${item.priceAda.toLocaleString()} ADA</div>
              </div>
            </div>
            <div style="font-size:0.76rem; color:#cbd5e1; margin:8px 0; font-style:italic;">"${cfg.lore}"</div>
            <div style="display:flex; justify-content:flex-end;">
              ${isUser ? `
                <button class="btn-clean btn-clean-sm btn-p2p-cancel-listing" data-id="${item.id}" style="width:auto; padding:6px 14px; background:#7f1d1d; border-color:#ef4444;">
                  ❌ İlanı İptal Et
                </button>
              ` : `
                <button class="btn-clean btn-clean-sm btn-p2p-buy-listing" data-id="${item.id}" style="width:auto; padding:6px 16px; background:#15803d; border-color:#22c55e;">
                  🛒 SATIN AL (${item.priceAda} ADA)
                </button>
              `}
            </div>
          </div>
        `;
      }).join('');

      const userArtifactOptions = userArtifacts.length > 0 ? userArtifacts.map(a => {
        const cfg = GAME_CONFIG.COLLECTION_ARTIFACTS.find(c => c.id === a.id);
        return `<option value="${a.id}">${cfg ? cfg.icon + ' ' + cfg.name : a.id}</option>`;
      }).join('') : '<option value="">Keşfedilmiş eser yok</option>';

      html += `
        <div class="clean-card" style="border-color:#ca8a04; background:#161007; margin-bottom:12px;">
          <div class="card-title-row">
            <div class="card-title">👑 P2P Koleksiyon Eseri Satış İlanı Oluştur</div>
            <span class="card-badge" style="color:#fde047;">${userArtifacts.length} Eser Sahip</span>
          </div>
          <div class="clean-desc">Zindandan veya sandıklardan çıkardığın nadir koleksiyon eserlerini istediğin $ADASTRA fiyatı ile diğer oyunculara sat!</div>
          
          ${userArtifacts.length > 0 ? `
            <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:10px; align-items:center;">
              <select id="p2p-artifact-select" style="flex:1; background:#0f0a06; color:#fff; border:1px solid #ca8a04; padding:8px 12px; border-radius:6px; font-family:var(--font-game);">
                ${userArtifactOptions}
              </select>
              <input type="number" id="p2p-price-input" min="10" value="150" placeholder="ADA Fiyat..." style="width:120px; background:#0f0a06; color:#fde047; border:1px solid #ca8a04; padding:8px 12px; border-radius:6px; font-weight:800; font-family:var(--font-game);" />
              <button id="btn-create-p2p-listing" class="btn-clean btn-clean-gold" style="width:auto; padding:8px 18px;">
                🚀 İLAN VER
              </button>
            </div>
          ` : `
            <div style="color:#94a3b8; font-size:0.82rem; margin-top:8px;">⚠️ Henüz keşfettiğin bir koleksiyon eseri yok. Zindan bosslarını yenerek veya sandık açarak eser kazanabilirsin.</div>
          `}
        </div>

        <div style="font-weight:800; font-size:0.95rem; color:#fde047; margin:14px 0 8px 2px;">🛍️ Canlı Pazar İlanları (${listings.length} İlan):</div>
        <div>
          ${listings.length > 0 ? listingCards : '<div class="clean-card" style="text-align:center; color:#94a3b8;">Pazarda henüz açık ilan bulunmuyor.</div>'}
        </div>
      `;

      dom.modalBody.innerHTML = html;
      displayModal();
      return;
    }

    html += `
      <!-- 5 AMM Likidite Havuzu (Odun, Demir, Buğday, Kilitli Sandık, Arena Anahtarı) -->
      <div class="amm-trade-container">
        ${renderAmmTradeCard('wood')}
        ${renderAmmTradeCard('iron')}
        ${renderAmmTradeCard('wheat')}
        ${renderAmmTradeCard('boxes')}
        ${renderAmmTradeCard('keys')}
      </div>
    `;
  }

  // 5. TAVERNA (MATEMATİKSEL BOOSTLAR & OTOMASYON)
  else if (zoneId === 'tavern') {
    const isBotActive = gameState.isAutoCollectorActive();
    const expiry = gameState.getAutoCollectorExpiry();
    const remainingMs = Math.max(0, expiry - Date.now());
    const remDays = Math.floor(remainingMs / (24 * 3600 * 1000));
    const remHours = Math.floor((remainingMs % (24 * 3600 * 1000)) / (3600 * 1000));
    const remMinutes = Math.floor((remainingMs % (3600 * 1000)) / (60 * 1000));
    const botRemainingText = remDays > 0 ? `${remDays}g ${remHours}s` : `${remHours}s ${remMinutes}d`;

    const isPotion1 = gameState.isBuffActive('speed_potion_1');
    const isPotion2 = gameState.isBuffActive('speed_potion_2');
    const isPotion3 = gameState.isBuffActive('speed_potion_3');

    html = `
      <div class="clean-card">
        <div class="card-title">🍺 Taverna Güçlendirmeleri & Otomasyon</div>
        <div class="clean-desc">
          Ekonomik dengeye göre optimize edilmiş 3 kademeli sefer iksirleri ve 24 saatlik otomatik toplama botu ile sefer verimini katla.
        </div>
      </div>

      <!-- 1. Otomatik Toplayıcı & Tamir Bot Paketleri (3 Kademe) -->
      <div class="clean-card" style="border-color: ${isBotActive ? '#4ade80' : '#ca8a04'}; background: #181109;">
        <div class="card-title-row">
          <div class="card-title">🤖 Otomatik Toplama & Otomatik Tamir Botu</div>
          <div class="card-badge" style="color: ${isBotActive ? '#4ade80' : '#facc15'};">
            ${isBotActive ? `✅ Aktif (${botRemainingText} Kaldı)` : '3 Farklı Paket'}
          </div>
        </div>
        <div class="clean-desc" style="font-size: 0.82rem; line-height: 1.4; color: #cbd5e1;">
          Seferler tamamlandığında kaynakları otomatik toplar. Kazma, balta ve orak aşındığında <strong>depodaki hammadde ve ADA ile aletleri otomatik onarır</strong> ve seferleri kesintisiz sürdürür.
        </div>

        <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 10px;">
          <!-- Günlük Bot -->
          <div style="background: #140e08; padding: 10px 12px; border-radius: 8px; border: 1px solid #583007; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-weight: 800; font-size: 0.92rem; color: #fde047;">🤖 Günlük Bot (24 Saat)</div>
              <div style="font-size: 0.76rem; color: #94a3b8;">1 Günlük Otomasyon • 23.500 $ADASTRA</div>
            </div>
            <button class="btn-clean btn-modal-buybuff" data-buff="auto_collector" style="padding: 6px 14px; font-size: 0.8rem; width: auto;">
              23.500 ADA
            </button>
          </div>

          <!-- Haftalık Bot -->
          <div style="background: #140e08; padding: 10px 12px; border-radius: 8px; border: 1px solid #ca8a04; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-weight: 800; font-size: 0.92rem; color: #38bdf8;">🤖 Haftalık Bot (7 Gün) <span style="font-size: 0.72rem; color: #4ade80; background: rgba(74,222,128,0.15); padding: 2px 6px; border-radius: 4px;">%15 İNDİRİM</span></div>
              <div style="font-size: 0.76rem; color: #94a3b8;">7 Günlük Kesintisiz Otomasyon • 140.000 $ADASTRA</div>
            </div>
            <button class="btn-clean btn-clean-green btn-modal-buybuff" data-buff="auto_collector_weekly" style="padding: 6px 14px; font-size: 0.8rem; width: auto;">
              140.000 ADA
            </button>
          </div>

          <!-- Aylık Bot -->
          <div style="background: #140e08; padding: 10px 12px; border-radius: 8px; border: 1px solid #a855f7; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-weight: 800; font-size: 0.92rem; color: #c084fc;">🤖 Aylık Mega Bot (30 Gün) <span style="font-size: 0.72rem; color: #facc15; background: rgba(250,204,21,0.15); padding: 2px 6px; border-radius: 4px;">%30 İNDİRİM</span></div>
              <div style="font-size: 0.76rem; color: #94a3b8;">30 Günlük Mega Otomasyon & Tamir • 490.000 $ADASTRA</div>
            </div>
            <button class="btn-clean btn-modal-buybuff" data-buff="auto_collector_monthly" style="padding: 6px 14px; font-size: 0.8rem; width: auto; background: linear-gradient(135deg, #9333ea, #6b21a8); border-color: #c084fc;">
              490.000 ADA
            </button>
          </div>
        </div>
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
            <button class="btn-clean btn-clean-outline btn-modal-buybuff" data-buff="speed_potion_1" style="padding: 6px 12px; font-size: 0.8rem; width: auto;" ${isPotion1 ? 'disabled' : ''}>
              ${isPotion1 ? 'Aktif' : '4.500 ADA'}
            </button>
          </div>

          <!-- Standart Sefer -->
          <div style="background: #140e08; padding: 10px 12px; border-radius: 8px; border: 1px solid #583007; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-weight: 800; font-size: 0.95rem; color: #facc15;">⚡ Standart Sefer İksiri (1.75x Hız)</div>
              <div style="font-size: 0.78rem; color: #94a3b8;">6 Saat • 15.000 $ADASTRA</div>
            </div>
            <button class="btn-clean btn-clean-gold btn-modal-buybuff" data-buff="speed_potion_2" style="padding: 6px 12px; font-size: 0.8rem; width: auto;" ${isPotion2 ? 'disabled' : ''}>
              ${isPotion2 ? 'Aktif' : '15.000 ADA'}
            </button>
          </div>

          <!-- Büyük Sefer -->
          <div style="background: #140e08; padding: 10px 12px; border-radius: 8px; border: 1px solid #583007; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-weight: 800; font-size: 0.95rem; color: #c084fc;">⚡ Büyük Sefer İksiri (2.00x Hız - Balina)</div>
              <div style="font-size: 0.78rem; color: #94a3b8;">24 Saat • 45.000 $ADASTRA</div>
            </div>
            <button class="btn-clean btn-clean-purple btn-modal-buybuff" data-buff="speed_potion_3" style="padding: 6px 12px; font-size: 0.8rem; width: auto;" ${isPotion3 ? 'disabled' : ''}>
              ${isPotion3 ? 'Aktif' : '45.000 ADA'}
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

  // 6. KARNAVAL & SİRK (ŞENLİKLER & GÖSTERİLER)
  else if (zoneId === 'carnival') {
    html = `
      <div class="clean-card">
        <div class="card-title-row">
          <div class="card-title">🎪 Krallık Karnavalı & Şenlik Meydanı</div>
          <span class="card-badge" style="color: #ec4899;">🎈 Şenlik Başladı</span>
        </div>
        <div class="clean-desc">
          Palyaçolar, akrobatlar, ateşbazlar ve sıcak hava balonlarıyla dolu büyük AdAstra krallık karnavalı!
        </div>
      </div>

      <div class="clean-card" style="border-color: #ec4899;">
        <div class="card-title-row">
          <div class="card-title">🎁 Günlük Karnaval Çadırı Şansı</div>
          <span class="card-badge" style="color: #facc15;">Ücretsiz</span>
        </div>
        <div class="clean-desc">
          Karnaval çadırına girip falcıdan ve soytarılardan günün moral bonusunu al!
        </div>
        <button class="btn-clean btn-clean-purple" id="btn-carnival-cheer" style="margin-top: 10px; background: linear-gradient(135deg, #ec4899, #8b5cf6);">
          🎪 Karnaval Coşkusuna Katıl (+10 ⚡ Stamina Moral Bonusu)
        </button>
      </div>

      <div class="clean-card">
        <div class="card-title">🎈 Sıcak Hava Balonu Manzarası</div>
        <div style="font-size: 0.85rem; color: #94a3b8; line-height: 1.5;">
          Gökyüzünden tüm AdAstra krallığını, dağ madenlerini ve gladyatör arenasını izle. Yakında özel mini oyunlar ve karnaval turnuvaları burada açılacak!
        </div>
      </div>
    `;
  }

  dom.modalBody.innerHTML = html;
  displayModal();
}

// =========================================================================
// 4.5 PHASE 2: ASKERİ KIŞLA (18 KİŞİLİK ORDU & AKILLI SİLAH DEPOSU)
// =========================================================================
const BARRACKS_CLASS_NAMES = { warrior: 'Asker' };
const BARRACKS_CLASS_ICONS = { warrior: '⚔️' };

function renderBarracksHtml() {
  const state = gameState.state;
  let pendingBannerHtml = '';

  const tabsHtml = `
    <div class="phase2-tab-row">
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
          `).join('') || '<div style="padding:20px; text-align:center; color:#94a3b8; font-size:0.8rem;">Envanterde boş eşya yok. Maden Ocağındaki ⚒️ Demirci sekmesinde yeni eşyalar dövebilirsin!</div>'}
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
  } else {
    // Default Tab: 🛡️ Ordu Yönetimi (army)
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
  if (barracksActiveTab === 'battlefield') barracksActiveTab = 'army';
  dom.modalTitle.innerHTML = `<span>⚔️</span> <span>ASKERİ KIŞLA & TALİM KAMPI</span>`;
  dom.modalBody.innerHTML = renderBarracksHtml();
  displayModal();
}

function openBattlefieldModal() {
  const boss = gameState.getWorldBossInfo();
  const state = gameState.state;
  const soldiers = state.soldierUnits || [];
  const hasSoldiers = soldiers.length > 0;
  const isStaked = boss.userStaked;

  dom.modalTitle.innerHTML = `<span>🌋</span> <span>BÜYÜK SAVAŞ ALANI & WORLD BOSS ETKİNLİĞİ</span>`;

  dom.modalBody.innerHTML = `
    <div class="clean-card" style="border-color: #ef4444; background: #1c0a0a;">
      <div class="card-title-row">
        <div class="card-title">🌋 Haftalık Savaş Alanı & World Boss Etkinliği</div>
        <span class="card-badge" style="color: #fde047;">Ödül Havuzu: 🟣 ${boss.weeklyAdaPool.toLocaleString()} ADA</span>
      </div>
      <div class="clean-desc">
        Pazartesi'den Cumartesi'ye kadar (6 gün) tüm ordunu silah ve zırhlarıyla bu alana kilitle! Pazar günü devasa World Boss uyanır. Orduların vurduğu toplam hasar oranına göre <strong>100.000 $ADASTRA ödül havuzu</strong> hasar payı oranında tüm katılımcılara paylaştırılır.
      </div>
    </div>

    <!-- Toplam Stake Edilen Ordular Widget'ı -->
    <div class="clean-card" style="background: #140e08; border-color: #ca8a04;">
      <div style="font-weight: 800; font-size: 0.95rem; color: #fde047; margin-bottom: 10px;">
        🏰 Krallık Genelinde Kilitlenen Toplam Ordular:
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px;">
        <div style="background: #0f0a06; padding: 10px; border-radius: 6px; border: 1px solid #4a250a; text-align: center;">
          <div style="font-size: 0.75rem; color: #94a3b8;">Kilitlenen Asker</div>
          <div style="font-size: 1.15rem; font-weight: 800; color: #38bdf8;">⚔️ ${boss.stakedArmyCount.toLocaleString()} Asker</div>
        </div>
        <div style="background: #0f0a06; padding: 10px; border-radius: 6px; border: 1px solid #4a250a; text-align: center;">
          <div style="font-size: 0.75rem; color: #94a3b8;">Toplam Ordu Saldırısı</div>
          <div style="font-size: 1.15rem; font-weight: 800; color: #4ade80;">💥 ${boss.totalStakedAtk.toLocaleString()} ATK</div>
        </div>
        <div style="background: #0f0a06; padding: 10px; border-radius: 6px; border: 1px solid #4a250a; text-align: center;">
          <div style="font-size: 0.75rem; color: #94a3b8;">Toplam Ordu Canı</div>
          <div style="font-size: 1.15rem; font-weight: 800; color: #facc15;">❤️ ${boss.totalStakedHp.toLocaleString()} HP</div>
        </div>
      </div>

      <div style="margin-top: 12px; display: flex; justify-content: space-between; align-items: center; background: #0c0805; padding: 10px 14px; border-radius: 8px;">
        <div>
          <div style="font-weight: 700; color: #fff; font-size: 0.88rem;">Senin Kilitlediğin Ordu:</div>
          <div style="font-size: 0.78rem; color: ${isStaked ? '#4ade80' : '#94a3b8'};">
            ${isStaked ? `✅ ${boss.userStakedSoldiersCount} Asker (${boss.userStakedAtk} ATK / ${boss.userStakedHp} HP) Kilitlendi!` : 'Henüz ordunu kilitlemedin.'}
          </div>
        </div>
        <button id="btn-stake-army-boss" class="btn-clean ${isStaked ? 'btn-clean-outline' : 'btn-clean-gold'}" style="width: auto; padding: 8px 18px;" ${!hasSoldiers || isStaked ? 'disabled' : ''}>
          ${isStaked ? '✅ Ordun Kilitlendi' : '🛡️ Tüm Ordumu Kilitle (6 Gün)'}
        </button>
      </div>
    </div>

    <!-- World Boss Savaş Alanı Kartı -->
    <div class="clean-card" style="background: #1c0808; border-color: #ef4444; margin-top: 10px;">
      <div class="card-title-row">
        <div class="card-title">${boss.icon} ${boss.name}</div>
        <span class="card-badge" style="color: #ef4444;">Pazar Günü Savaş Etkinliği</span>
      </div>

      <div style="margin: 10px 0;">
        <div style="display: flex; justify-content: space-between; font-size: 0.82rem; font-weight: 700; margin-bottom: 4px;">
          <span style="color: #fca5a5;">Boss Canı:</span>
          <span style="color: #fde047;">${boss.bossHp.toLocaleString()} / ${boss.maxBossHp.toLocaleString()} HP (%${Math.floor((boss.bossHp / boss.maxBossHp) * 100)})</span>
        </div>
        <div style="background: #2b0c0c; height: 14px; border-radius: 7px; overflow: hidden; border: 1px solid #7f1d1d;">
          <div style="width: ${(boss.bossHp / boss.maxBossHp) * 100}%; background: linear-gradient(90deg, #ef4444, #f59e0b); height: 100%; transition: width 0.3s ease;"></div>
        </div>
      </div>

      <div style="background: #0f0505; padding: 10px; border-radius: 6px; font-size: 0.82rem; color: #cbd5e1; line-height: 1.4; margin-bottom: 10px;">
        📊 <strong>Hasar Başına ADA Dağıtım Oranı:</strong> 1 Hasar = ${(boss.weeklyAdaPool / boss.maxBossHp).toFixed(3)} $ADASTRA
        <br>Senin Verdiğin Toplam Hasar: <span style="color:#4ade80; font-weight:800;">${(boss.userDamage || 0).toLocaleString()} Hasar</span>
        • Kazandığın Ödül: <span style="color:#fde047; font-weight:800;">🟣 ${Math.floor(((boss.userDamage || 0) / boss.maxBossHp) * boss.weeklyAdaPool).toLocaleString()} ADA</span>
      </div>

      <button id="btn-attack-world-boss" class="btn-clean btn-clean-red" style="font-size: 1.02rem; padding: 12px; font-weight: 800;" ${!isStaked || boss.bossHp <= 0 ? 'disabled' : ''}>
        ${!isStaked ? '⚠️ Önce Ordunu Kilitlemelisin' : boss.bossHp <= 0 ? '🏆 Boss Yenildi! Ödüller Dağıtıldı' : '💥 World Boss\'a Saldır & ADA Payını Al'}
      </button>
    </div>
  `;

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

let colosseumActiveTab = 'duel';
let selectedColosseumChampionIdx = 0;

function openColosseumModal() {
  const state = gameState.state;
  const soldiers = state.soldierUnits || [];
  const hasSoldiers = soldiers.length > 0;
  const leaderboard = gameState.getColosseumLeaderboard();
  const cStats = state.colosseumStats || { wins: 0, losses: 0, score: 0, rank: 11 };

  dom.modalTitle.innerHTML = `<span>🏟️</span> <span>BÜYÜK KOLEZYUM: 1v1 PVP & HAFTALIK LİG</span>`;

  const tabsHtml = `
    <div class="phase2-tab-row">
      <button class="phase2-tab-btn colosseum-tab-btn ${colosseumActiveTab === 'duel' ? 'active' : ''}" data-tab="duel">⚔️ 1v1 Gladyatör Düellosu</button>
      <button class="phase2-tab-btn colosseum-tab-btn ${colosseumActiveTab === 'leaderboard' ? 'active' : ''}" data-tab="leaderboard">🏆 Haftalık Liderlik Tablosu</button>
    </div>
  `;

  let contentHtml = '';

  if (colosseumActiveTab === 'leaderboard') {
    // 🏆 HAFTALIK SIRALAMA & ÖDÜLLER
    contentHtml = `
      <div class="clean-card" style="border-color: #f59e0b; background: #1c140c;">
        <div class="card-title-row">
          <div class="card-title">🏆 Haftalık Kolezyum Şampiyonluk Ligi</div>
          <span class="card-badge" style="color: #4ade80;">Pazar 23:59 Sıfırlanır</span>
        </div>
        <div class="clean-desc">
          Kolezyum'da 1v1 maçları kazanarak sıralamada yüksel! Hafta sonunda ilk 10 gladyatöre devasa ödüller dağıtılır:
          <br><strong>🥇 1. Sıra:</strong> 5 Zindan Anahtarı + 15.000 $ADASTRA • <strong>🥈 2. Sıra:</strong> 3 Anahtar + 8.000 ADA • <strong>🥉 3-10. Sıra:</strong> 1 Anahtar + 2.500 ADA
        </div>
      </div>

      <div class="clean-card" style="background: #0f172a; border-color: #38bdf8;">
        <div style="display: flex; justify-content: space-between; align-items: center; font-weight: 800; font-size: 0.95rem;">
          <span style="color: #38bdf8;">🛡️ Senin Derecen: #${cStats.rank || 11} AlphAvax</span>
          <span style="color: #facc15;">⭐ ${cStats.score || 0} Puan (${cStats.wins || 0} Galibiyet / ${cStats.losses || 0} Mağlubiyet)</span>
        </div>
      </div>

      <div class="leaderboard-table-wrap" style="margin-top: 10px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
          <thead>
            <tr style="border-bottom: 2px solid #ca8a04; color: #fde047; text-align: left;">
              <th style="padding: 8px;">Sıra</th>
              <th style="padding: 8px;">Gladyatör / Şampiyon</th>
              <th style="padding: 8px;">Unvan</th>
              <th style="padding: 8px; text-align: center;">Galibiyet</th>
              <th style="padding: 8px; text-align: right;">Haftalık Ödül</th>
            </tr>
          </thead>
          <tbody>
            ${leaderboard.map(row => `
              <tr style="border-bottom: 1px solid #332014; background: ${row.rank === 1 ? 'rgba(234,179,8,0.1)' : row.rank <= 3 ? 'rgba(255,255,255,0.03)' : 'transparent'};">
                <td style="padding: 8px; font-weight: 800; color: ${row.rank === 1 ? '#facc15' : row.rank === 2 ? '#cbd5e1' : row.rank === 3 ? '#b45309' : '#94a3b8'};">
                  ${row.rank === 1 ? '🥇 #1' : row.rank === 2 ? '🥈 #2' : row.rank === 3 ? '🥉 #3' : `#${row.rank}`}
                </td>
                <td style="padding: 8px; font-weight: 700; color: #fff;">${row.icon} ${row.name}</td>
                <td style="padding: 8px; color: #94a3b8; font-size: 0.78rem;">${row.title}</td>
                <td style="padding: 8px; text-align: center; color: #4ade80; font-weight: 800;">${row.wins} G</td>
                <td style="padding: 8px; text-align: right; color: #fde047; font-weight: 700;">
                  🔑 ${row.rewardKeys} Anahtar + 🟣 ${row.rewardAda.toLocaleString()} ADA
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } else {
    // ⚔️ 1v1 GLADYATÖR DÜELLOSU
    const champ = soldiers[selectedColosseumChampionIdx] || soldiers[0];
    const stats = champ ? gameState.getSoldierFullStats(selectedColosseumChampionIdx) : null;
    const isWounded = champ && (champ.hp || champ.maxHp || 100) < (champ.maxHp || 100);

    contentHtml = `
      <div class="clean-card" style="border-color: #ef4444; background: #1c1012;">
        <div class="card-title-row">
          <div class="card-title">⚔️ 1v1 Kolezyum Gladyatör Eşleşmesi</div>
          <span class="card-badge" style="color: #fde047;">🔑 ${state.arenaKeys || 0} Anahtar</span>
        </div>
        <div class="clean-desc">
          En güçlü şampiyonunu kuşanmış 5 parça teçhizatıyla sahaya sür! 'Kolezyuma Çık' düğmesine bastığında sistem canlı eşleşme yapar ve 1v1 savaş başlar. Savaşta yaralanan şampiyonların canı depodaki buğday ile 18 saatlik tedavi sürecinde iyileşir.
        </div>
      </div>

      ${hasSoldiers ? `
        <!-- Şampiyon Seçim Kartı -->
        <div class="clean-card" style="background: #140e08; border-color: #ca8a04;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div style="font-weight: 800; font-size: 0.95rem; color: #fde047;">🛡️ Arenaya Çıkacak Şampiyonun:</div>
            <select id="colosseum-champion-select" style="background: #24140b; color: #fff; border: 1.5px solid #ca8a04; padding: 5px 10px; border-radius: 6px; font-family: var(--font-game); font-size: 0.85rem;">
              ${soldiers.map((s, idx) => `
                <option value="${idx}" ${idx === selectedColosseumChampionIdx ? 'selected' : ''}>
                  ${s.name} (Lv.${s.level} - HP: ${s.hp || s.maxHp || 100}/${s.maxHp || 100})
                </option>
              `).join('')}
            </select>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-top: 8px;">
            <div style="background: #0f0a06; padding: 8px 10px; border-radius: 6px; border: 1px solid #4a250a; text-align: center;">
              <div style="font-size: 0.75rem; color: #94a3b8;">Toplam Saldırı</div>
              <div style="font-size: 1.1rem; font-weight: 800; color: #4ade80;">⚔️ ${stats ? stats.totalAtk : 20} ATK</div>
            </div>
            <div style="background: #0f0a06; padding: 8px 10px; border-radius: 6px; border: 1px solid #4a250a; text-align: center;">
              <div style="font-size: 0.75rem; color: #94a3b8;">Can Durumu</div>
              <div style="font-size: 1.1rem; font-weight: 800; color: ${champ.hp <= 25 ? '#ef4444' : '#38bdf8'};">❤️ ${champ.hp || champ.maxHp || 100}/${champ.maxHp || 100}</div>
            </div>
            <div style="background: #0f0a06; padding: 8px 10px; border-radius: 6px; border: 1px solid #4a250a; text-align: center;">
              <div style="font-size: 0.75rem; color: #94a3b8;">Set Bonusu</div>
              <div style="font-size: 1.1rem; font-weight: 800; color: #facc15;">🛡️ ${stats ? stats.setCount : 0}/5 Dövme</div>
            </div>
          </div>

          ${isWounded ? `
            <div style="background: #2a0a0a; border: 1px solid #ef4444; border-radius: 6px; padding: 8px 12px; margin-top: 10px; display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 0.82rem; color: #fca5a5;">⚠️ Şampiyonun yaralı! Depodaki buğdayla 18 saatlik tedavi uygulayabilirsin.</span>
              <button class="btn-clean btn-clean-sm btn-heal-soldier" data-soldier="${selectedColosseumChampionIdx}" style="width: auto; padding: 5px 12px; background: #15803d; border-color: #22c55e;">
                🌾 Buğdayla İyileştir
              </button>
            </div>
          ` : ''}

          <button id="btn-start-1v1-duel" class="btn-clean btn-clean-green" style="font-size: 1.05rem; padding: 13px; margin-top: 12px; font-weight: 800;" ${(champ.hp || 100) <= 15 ? 'disabled' : ''}>
            ${(champ.hp || 100) <= 15 ? '⚠️ Şampiyon Ağır Yaralı (Önce İyileştir)' : '⚔️ KOLEZYUMA ÇIK (1v1 EŞLEŞ)'}
          </button>
        </div>

        <div id="colosseum-duel-log" class="clean-card" style="background: #0b0704; min-height: 80px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 0.88rem; text-align: center;">
          ⚔️ Arenaya çıkmaya hazır mısın? Rakip gladyatör seni bekliyor!
        </div>
      ` : `
        <div class="clean-card" style="text-align: center; color: #94a3b8; padding: 24px;">
          ⚠️ Kolezyum'da 1v1 savaşmak için önce Kışla'dan asker satın almalısın!
        </div>
      `}
    `;
  }

  dom.modalBody.innerHTML = `${tabsHtml}${contentHtml}`;
  displayModal();

  // Şampiyon Seçimi Değişince
  const champSelect = document.getElementById('colosseum-champion-select');
  if (champSelect) {
    champSelect.addEventListener('change', (e) => {
      selectedColosseumChampionIdx = parseInt(e.target.value, 10) || 0;
      openColosseumModal();
    });
  }

  // 1v1 Kolezyuma Çık Butonu
  const duelBtn = document.getElementById('btn-start-1v1-duel');
  if (duelBtn) {
    duelBtn.addEventListener('click', () => {
      duelBtn.disabled = true;
      duelBtn.innerText = '⚔️ Rakip Eşleşiyor & Savaş Başlıyor...';

      const logEl = document.getElementById('colosseum-duel-log');
      if (logEl) logEl.innerHTML = `🌀 <em>Kolezyum kumlarında rakip aranıyor...</em>`;

      setTimeout(() => {
        const res = gameState.executeColosseum1v1Match(selectedColosseumChampionIdx);
        if (!res.success) {
          showToast(res.message, 'error');
          duelBtn.disabled = false;
          duelBtn.innerText = '⚔️ KOLEZYUMA ÇIK (1v1 EŞLEŞ)';
          return;
        }

        let step = 0;
        const logIv = setInterval(() => {
          if (step < res.combatLog.length) {
            logEl.innerHTML = res.combatLog.slice(0, step + 1).join('<br>');
            step++;
            sound.playPickaxe();
          } else {
            clearInterval(logIv);
            if (res.isVictory) {
              logEl.innerHTML += `<div style="color: #4ade80; font-weight: 800; margin-top: 10px; font-size: 1rem;">🏆 ZAFER! ${res.opponentIcon} ${res.opponentName} yere serildi!<br><span style="color: #fde047; font-size: 0.9rem;">+${res.rewardAda} $ADASTRA ${res.rewardKeys > 0 ? '• 🔑 +1 Arena Anahtarı!' : ''}</span></div>`;
              showToast(`🏆 Zafer! +${res.rewardAda} $ADASTRA kazanıldı!`, 'success');
            } else {
              logEl.innerHTML += `<div style="color: #ef4444; font-weight: 800; margin-top: 10px;">💀 MAĞLUBİYET! Şampiyonun darbe aldı. Kalan Can: ${res.currentHp}/${res.maxHp} (Buğday ile iyileştirilmeli)</div>`;
              showToast('💀 Mağlubiyet! Şampiyonun yaralandı.', 'error');
            }
            duelBtn.innerText = 'YENİDEN DÜELLOYA ÇIK';
            duelBtn.disabled = false;
            duelBtn.onclick = () => openColosseumModal();
            renderTopBar();
          }
        }, 600);
      }, 700);
    });
  }
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
  displayModal();
}

function openTestMenuModal() {
  const state = gameState.state;

  dom.modalTitle.innerHTML = `<span>🧪</span> <span>KRALLIK GELİŞTİRİCİ & TEST CHEAT PANELİ</span>`;

  dom.modalBody.innerHTML = `
    <div class="clean-card" style="border-color: #ec4899; background: #1f0714; margin-bottom: 12px;">
      <div class="card-title-row">
        <div class="card-title" style="color: #f472b6;">🧪 Tüm Mekanizmaları Test Et (Dev Cheat Panel)</div>
        <span class="card-badge" style="color: #f472b6;">Tam Yetkili Test Modu</span>
      </div>
      <div class="clean-desc">
        Oyundaki tüm mekanikleri, ekonomiyi, zindan katlarını, asker donanımlarını, kutuları ve bot otomasyonunu 1-tıkla anında test edebilirsin.
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
      
      <!-- 1. BAKİYE & KAYNAK HİLELERİ -->
      <div class="clean-card" style="background: #140b12; border-color: #a855f7;">
        <div style="font-weight: 800; font-size: 0.9rem; color: #c084fc; margin-bottom: 8px;">💰 1. Bakiye & Kaynak Ekleme</div>
        <div style="display: flex; flex-direction: column; gap: 6px;">
          <button class="btn-clean btn-clean-sm btn-test-action" data-action="add_ada" style="background: #581c87;">🟣 +10.000 $ADASTRA Ekle</button>
          <button class="btn-clean btn-clean-sm btn-test-action" data-action="add_wood" style="background: #14532d;">🌲 +5.000 Odun Ekle</button>
          <button class="btn-clean btn-clean-sm btn-test-action" data-action="add_iron" style="background: #0369a1;">⛏️ +5.000 Demir Ekle</button>
          <button class="btn-clean btn-clean-sm btn-test-action" data-action="add_wheat" style="background: #854d0e;">🌾 +5.000 Buğday Ekle</button>
          <button class="btn-clean btn-clean-sm btn-test-action" data-action="add_fragments" style="background: #7e22ce;">🧩 +500 Parça Ekle</button>
          <button class="btn-clean btn-clean-sm btn-test-action" data-action="add_boxes" style="background: #9a3412;">📦 +50 Kilitli Sandık Ekle</button>
          <button class="btn-clean btn-clean-sm btn-test-action" data-action="add_keys" style="background: #ca8a04;">🔑 +50 Arena Anahtarı Ekle</button>
          <button class="btn-clean btn-clean-sm btn-test-action" data-action="full_stamina" style="background: #047857;">⚡ Stamina %100 Full Yap</button>
        </div>
      </div>

      <!-- 2. ORDU & ŞAMPİYON TESTLERİ -->
      <div class="clean-card" style="background: #0d1512; border-color: #22c55e;">
        <div style="font-weight: 800; font-size: 0.9rem; color: #4ade80; margin-bottom: 8px;">⚔️ 2. Ordu & Şampiyon Testleri</div>
        <div style="display: flex; flex-direction: column; gap: 6px;">
          <button class="btn-clean btn-clean-sm btn-test-action" data-action="buy_soldier" style="background: #166534;">⚔️ +1 Asker Satın Al</button>
          <button class="btn-clean btn-clean-sm btn-test-action" data-action="heal_all_army" style="background: #15803d;">❤️ Tüm Askerleri İyileştir (%100 HP)</button>
          <button class="btn-clean btn-clean-sm btn-test-action" data-action="max_equip_all" style="background: #854d0e;">🛡️ Tüm Askerlere Lv.10 Master Zırh Kuşandır</button>
          <button class="btn-clean btn-clean-sm btn-test-action" data-action="unequip_all" style="background: #991b1b;">🚫 Tüm Askerlerin Zırhlarını Sök</button>
          <button class="btn-clean btn-clean-sm btn-test-action" data-action="auto_equip" style="background: #1d4ed8;">✨ En İyi Eşyaları Otomatik Dağıt</button>
          <button class="btn-clean btn-clean-sm btn-test-action" data-action="level_up_player" style="background: #6b21a8;">👑 Gezgin Seviyesini +1 Yükselt</button>
        </div>
      </div>

      <!-- 3. DEMİRCİ & TEÇHİZAT TESTLERİ -->
      <div class="clean-card" style="background: #170e0b; border-color: #f97316;">
        <div style="font-weight: 800; font-size: 0.9rem; color: #fb923c; margin-bottom: 8px;">⚒️ 3. Demirci & Ekipman Testleri</div>
        <div style="display: flex; flex-direction: column; gap: 6px;">
          <button class="btn-clean btn-clean-sm btn-test-action" data-action="craft_all_equip" style="background: #9a3412;">🔨 1'er Adet Tüm Ekipmanları Döv</button>
          <button class="btn-clean btn-clean-sm btn-test-action" data-action="upgrade_all_equip" style="background: #c2410c;">✨ Kuşanılan Ekipmanları Seviye Atlattır</button>
          <button class="btn-clean btn-clean-sm btn-test-action" data-action="repair_all_tools" style="background: #0369a1;">🔧 Tüm İşçi Aletlerini Onar (%100)</button>
          <button class="btn-clean btn-clean-sm btn-test-action" data-action="upgrade_warehouse" style="background: #a16207;">📦 Depo Seviyesini +1 Yükselt</button>
        </div>
      </div>

      <!-- 4. ZİNDAN & BOSS TESTLERİ -->
      <div class="clean-card" style="background: #170b0f; border-color: #ef4444;">
        <div style="font-weight: 800; font-size: 0.9rem; color: #f87171; margin-bottom: 8px;">💀 4. Zindan & Boss İlerleme</div>
        <div style="display: flex; flex-direction: column; gap: 6px;">
          <button class="btn-clean btn-clean-sm btn-test-action" data-action="dungeon_lv1" style="background: #991b1b;">👹 Zindan: 1. Kat (Lv.1) Yap</button>
          <button class="btn-clean btn-clean-sm btn-test-action" data-action="dungeon_lv9" style="background: #b91c1c;">🗿 Zindan: 3. Kat Ara Boss (Lv.9) Yap</button>
          <button class="btn-clean btn-clean-sm btn-test-action" data-action="dungeon_lv18" style="background: #7f1d1d;">🐉 Zindan: 6. Kat Final Boss IGNIS (Lv.18) Yap</button>
          <button class="btn-clean btn-clean-sm btn-test-action" data-action="dungeon_next" style="background: #dc2626;">⏩ Sonraki Kata Atla (+1 Kat)</button>
        </div>
      </div>

      <!-- 5. KOLEKSİYON & SANDIK TESTLERİ -->
      <div class="clean-card" style="background: #181308; border-color: #eab308;">
        <div style="font-weight: 800; font-size: 0.9rem; color: #facc15; margin-bottom: 8px;">👑 5. Koleksiyon & Sandık Testleri</div>
        <div style="display: flex; flex-direction: column; gap: 6px;">
          <button class="btn-clean btn-clean-sm btn-test-action" data-action="unlock_all_artifacts" style="background: #a16207;">👑 Tüm 18 Koleksiyon Eserini Keşfet (18/18)</button>
          <button class="btn-clean btn-clean-sm btn-test-action" data-action="mint_genesis" style="background: #6b21a8;">🏆 Genesis NFT'yi Ücretsiz Bas</button>
          <button class="btn-clean btn-clean-sm btn-test-action" data-action="open_1_box" style="background: #15803d;">📦 1 Adet Kilitli Sandık Aç</button>
          <button class="btn-clean btn-clean-sm btn-test-action" data-action="open_10_boxes" style="background: #047857;">📦 10 Adet Kilitli Sandık Aç (Toplu)</button>
        </div>
      </div>

      <!-- 6. KOLEZYUM & BOT TESTLERİ -->
      <div class="clean-card" style="background: #0b141a; border-color: #38bdf8;">
        <div style="font-weight: 800; font-size: 0.9rem; color: #38bdf8; margin-bottom: 8px;">🏟️ 6. Kolezyum, Bot & Sistem</div>
        <div style="display: flex; flex-direction: column; gap: 6px;">
          <button class="btn-clean btn-clean-sm btn-test-action" data-action="stake_boss" style="background: #854d0e;">🛡️ Tüm Orduyu World Boss'a Kilitle</button>
          <button class="btn-clean btn-clean-sm btn-test-action" data-action="attack_boss" style="background: #991b1b;">💥 World Boss'a 500.000 Hasar Vur</button>
          <button class="btn-clean btn-clean-sm btn-test-action" data-action="enable_bot" style="background: #0284c7;">🤖 24 Saatlik Otomasyon Botunu Aktifleştir</button>
          <button class="btn-clean btn-clean-sm btn-test-action" data-action="enable_buffs" style="background: #0369a1;">⚡ Tüm Hız İksirlerini Aktifleştir</button>
          <button class="btn-clean btn-clean-sm btn-test-action" data-action="finish_expeditions" style="background: #0f766e;">⏳ Tüm Seferleri Anında Tamamla</button>
          <button class="btn-clean btn-clean-sm btn-test-action" data-action="reset_state" style="background: #450a0a; border-color: #ef4444;">🧹 TÜM STATE'İ SIFIRLA (RESET)</button>
        </div>
      </div>

    </div>
  `;

  displayModal();
}

// =========================================================================
// 4.9 BİLDİRİM MERKEZİ (NOTIFICATION CENTER)
// =========================================================================
const realmNotifications = [
  { id: 1, icon: '🏰', text: 'AdAstra Krallığına hoş geldin! Krallığını büyütmek için sefere çık.', time: 'Şimdi', unread: true }
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
  const botWarning = gameState.getBotResourceDeficitWarning();
  const unreadCount = realmNotifications.filter(n => n.unread).length + (botWarning ? 1 : 0);
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

  const botWarning = gameState.getBotResourceDeficitWarning();
  const botWarningHtml = botWarning ? `
    <div class="notif-item unread" style="background: rgba(239,68,68,0.15); border-left: 3px solid #ef4444;">
      <span class="notif-item-icon">⚠️</span>
      <div class="notif-item-text">
        <div style="color: #fca5a5; font-weight: 700;">${botWarning.title}</div>
        <div style="font-size: 0.76rem; color: #cbd5e1; margin-top: 2px;">${botWarning.text}</div>
        <div class="notif-item-time" style="color: #ef4444;">Aktif Uyarı</div>
      </div>
    </div>
  ` : '';

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
      ${botWarningHtml}
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
// 4.10B KRALLIK HAZİNESİ & ÖDÜL HAVUZLARI MERKEZİ (TREASURY VAULT DASHBOARD)
// =========================================================================
function openTreasuryVaultModal() {
  const summary = gameState.getTreasuryVaultSummary();

  dom.modalTitle.innerHTML = `<span>🏦</span> <span>KRALLIK HAZİNESİ & ÖDÜL HAVUZLARI</span>`;

  const topOverviewHtml = `
    <div class="clean-card" style="background: linear-gradient(135deg, rgba(26,18,8,0.95), rgba(45,28,10,0.95)); border-color: #eab308; box-shadow: 0 0 25px rgba(234,179,8,0.15);">
      <div class="card-title-row">
        <div class="card-title" style="color: #fef08a; font-size: 1.1rem;">👑 Büyük Krallık Kasası & Tokenomics Rezervi</div>
        <span class="card-badge" style="color: #4ade80; background: rgba(74,222,128,0.15); border: 1px solid #4ade80;">10 Yıllık Sürdürülebilir Ekonomi</span>
      </div>
      <div class="clean-desc" style="color: #cbd5e1; font-size: 0.84rem; line-height: 1.5; margin-top: 4px;">
        AdAstra ekosistemindeki tüm harcamalar, pazar vergileri, arena girişleri ve NFT alımları bu ana hazinede toplanır ve topluluğa ödül olarak geri dağıtılır.
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-top: 14px;">
        <div style="background: #140e07; padding: 12px 14px; border-radius: 8px; border: 1px solid #583007;">
          <div style="font-size: 0.76rem; color: #94a3b8; font-weight: 700; text-transform: uppercase;">Toplam Kilitli Ödül & Hazine</div>
          <div style="font-size: 1.3rem; font-weight: 900; color: #fde047; margin-top: 4px;">
            ${summary.totalVaultAda.toLocaleString('tr-TR')} <span style="font-size: 0.85rem; color: #c084fc;">$ADASTRA</span>
          </div>
        </div>
        <div style="background: #140e07; padding: 12px 14px; border-radius: 8px; border: 1px solid #583007;">
          <div style="font-size: 0.76rem; color: #94a3b8; font-weight: 700; text-transform: uppercase;">AMM Likidite Rezervi</div>
          <div style="font-size: 1.3rem; font-weight: 900; color: #38bdf8; margin-top: 4px;">
            ${summary.totalAmmLiquidityAda.toLocaleString('tr-TR')} <span style="font-size: 0.85rem; color: #c084fc;">$ADASTRA</span>
          </div>
        </div>
        <div style="background: #140e07; padding: 12px 14px; border-radius: 8px; border: 1px solid #583007;">
          <div style="font-size: 0.76rem; color: #94a3b8; font-weight: 700; text-transform: uppercase;">Kalıcı Yakılan (Deflasyon)</div>
          <div style="font-size: 1.3rem; font-weight: 900; color: #f97316; margin-top: 4px;">
            🔥 ${summary.burnedNftPool.toLocaleString('tr-TR')} <span style="font-size: 0.85rem; color: #c084fc;">$ADASTRA</span>
          </div>
        </div>
      </div>
    </div>
  `;

  const poolsGridHtml = `
    <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 14px;">
      <div style="font-size: 0.95rem; font-weight: 800; color: #facc15; display: flex; align-items: center; gap: 6px;">
        <span>📊</span> <span>Aktif Ödül Havuzları ve Biriken Miktarlar</span>
      </div>

      ${summary.pools.map(pool => `
        <div class="clean-card" style="border-color: ${pool.color}; background: #150f09; margin: 0; padding: 12px 16px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="font-size: 2rem;">${pool.icon}</span>
              <div>
                <div style="font-weight: 800; font-size: 1rem; color: #fff;">${pool.name}</div>
                <div style="font-size: 0.78rem; color: #94a3b8; margin-top: 2px; max-width: 480px; line-height: 1.3;">
                  ${pool.description}
                </div>
              </div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 1.25rem; font-weight: 900; color: ${pool.color};">
                ${pool.totalPoolAda.toLocaleString('tr-TR')} <span style="font-size: 0.8rem; color: #c084fc;">ADA</span>
              </div>
              <span style="font-size: 0.72rem; padding: 2px 8px; border-radius: 4px; background: rgba(255,255,255,0.08); color: #cbd5e1; font-weight: 700;">
                ${pool.statusBadge}
              </span>
            </div>
          </div>

          <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #2d1806; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
            <div style="font-size: 0.82rem; color: #fde047;">
              <strong>👤 Senin Durumun / Payın:</strong> <span style="color: #cbd5e1;">${pool.userShareText}</span>
            </div>
            <button class="btn-clean btn-clean-outline btn-treasury-action" data-action="${pool.actionType}" style="padding: 6px 14px; font-size: 0.8rem; width: auto; border-color: ${pool.color}; color: #fff;">
              ${pool.actionText} ➔
            </button>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  dom.modalBody.innerHTML = topOverviewHtml + poolsGridHtml;

  document.querySelectorAll('.btn-treasury-action').forEach(btn => {
    btn.addEventListener('click', () => {
      const act = btn.dataset.action;
      if (act === 'boss') {
        openTownZoneModal('barracks', '⚔️ KRALLIK KIŞLASI & ASKERİ KARARGAH');
        barracksActiveTab = 'world_boss';
        renderBarracksContent();
      } else if (act === 'colosseum') {
        openTownZoneModal('colosseum', '🏟️ KOLEZYUM ARENASI & GLADYATÖR');
      } else if (act === 'dungeon') {
        closeModal();
        window.dispatchEvent(new CustomEvent('enter-dungeon-view'));
      } else if (act === 'collection') {
        openCollectionModal();
      } else if (act === 'parliament') {
        showToast('🏛️ AdAstra Meclisi: Topluluk oylamaları ve NFT pazar indirimleri aktiftir.', 'info');
      }
    });
  });

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
let preBattleSelectedSoldiers = [0];

function openPreBattleModal(monster) {
  dom.modalTitle.innerHTML = `<span>⚔️</span> <span>SAVAŞ ÖNCESİ TAKTİK FORMASYON HAZIRLIĞI</span>`;

  const state = gameState.state;
  const soldiers = state.soldierUnits || [];
  const totalSoldiers = soldiers.length;

  // Sadece var olan asker indekslerini seçili tut
  preBattleSelectedSoldiers = preBattleSelectedSoldiers.filter(idx => idx < totalSoldiers);
  if (preBattleSelectedSoldiers.length === 0 && totalSoldiers > 0) {
    preBattleSelectedSoldiers = Array.from({ length: totalSoldiers }, (_, i) => i);
  }

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
        <span class="dashboard-stat-value" style="color:#fde047;">+${monster.rewardAdAstra || monster.rewardAda || (monster.level * 25)} ADA • +${monster.rewardXp} XP</span>
      </div>

      <div class="prebattle-prediction ${prediction.difficulty.toLowerCase()}">
        <div>KAZANMA ŞANSI: %${prediction.winChance} (${prediction.difficulty.toUpperCase()})</div>
        <div style="font-size:0.75rem; font-weight:normal; margin-top:3px; opacity:0.85;">
          ${prediction.winChance >= 75 ? '🔥 Ordun ezici üstünlüğe sahip!' : (prediction.winChance >= 50 ? '⚖️ Dengeli bir savaş, yaralanmalar olabilir.' : '⚠️ Yüksek risk! Ordun yenilgiye uğrayabilir.')}
        </div>
      </div>
    </div>
  `;

  const armySelectHtml = totalSoldiers === 0 ? `
    <div class="prebattle-army-panel" style="display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:24px 16px;">
      <div style="font-size:2.2rem; margin-bottom:6px;">⚠️</div>
      <div style="font-weight:800; font-size:1rem; color:#f87171;">Ordunuzda Asker Bulunmuyor!</div>
      <div style="font-size:0.8rem; color:#cbd5e1; margin-top:6px; max-width:260px; line-height:1.4;">
        Zindan canavarlarıyla savaşmak için Kışla binasından yeni askerler eğitmelisiniz.
      </div>
      <button class="btn-clean btn-clean-gold" id="btn-goto-barracks-prebattle" style="margin-top:14px; width:auto; padding:8px 18px;">
        ⚔️ Kışlaya Git & Asker Eğit
      </button>
    </div>
  ` : `
    <div class="prebattle-army-panel">
      <div style="font-weight:800; font-size:0.9rem; color:#34d399; margin-bottom:6px; display:flex; justify-content:space-between;">
        <span>🛡️ Savaşa Girecek Askerler (${preBattleSelectedSoldiers.length}/${totalSoldiers})</span>
      </div>

      <div class="prebattle-weapon-toggle ${preBattleProtectWeapons ? 'active' : ''}" id="btn-toggle-weapon-protection">
        <span>${preBattleProtectWeapons ? '🛡️' : '⚔️'}</span>
        <div>
          <div style="font-weight:700;">Silah Dayanıklılığı Koruması: ${preBattleProtectWeapons ? 'AÇIK' : 'KAPALI'}</div>
          <div style="font-size:0.72rem; opacity:0.8;">${preBattleProtectWeapons ? 'Silahlar aşınmaz, ancak silah ATK bonusu savaşta kullanılmaz.' : 'Tam güçle savaşılır, silahların dayanıklılığı -1 aşınır.'}</div>
        </div>
      </div>

      <div style="max-height:220px; overflow-y:auto; padding-right:4px;">
        ${soldiers.map((sol, idx) => {
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
      <button class="btn-clean btn-clean-green" id="btn-start-tactical-battle" style="width:auto; padding:10px 28px; font-weight:800; font-size:0.95rem;" ${totalSoldiers === 0 ? 'disabled' : ''}>
        ⚔️ SAVAŞA BAŞLA
      </button>
    </div>
  `;

  const barracksBtn = document.getElementById('btn-goto-barracks-prebattle');
  if (barracksBtn) {
    barracksBtn.addEventListener('click', () => {
      openTownZoneModal('barracks', '⚔️ KRALLIK KIŞLASI & ASKERİ KARARGAH');
    });
  }

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

  let playerSquad = selectedIndices
    .filter(idx => soldiers[idx])
    .map(idx => {
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

  if (playerSquad.length === 0) {
    showToast('Savaşa katılacak geçerli bir asker bulunamadı!', 'error');
    return;
  }

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
        const adaReward = monster.rewardAdAstra || monster.rewardAda || (monster.level * 25);
        state.adAstraBalance += adaReward;

        // Zindan XP'si SADECE savaşa giren askerlere gider (Karakter avatar seviyesine gitmez)
        let levelUpNotice = [];
        selectedIndices.forEach(idx => {
          const sRes = gameState.addSoldierXp(idx, monster.rewardXp);
          if (sRes && sRes.leveledUp) {
            levelUpNotice.push(`Asker #${idx + 1} Lv.${sRes.newLevel}'e Yükseldi!`);
          }
        });

        state.dungeonProgress = Math.max(state.dungeonProgress || 1, monster.level + 1);

        const lvlMsg = levelUpNotice.length > 0 ? ` • 🎉 ${levelUpNotice.join(', ')}` : '';
        addNotification('🏆', `${monster.name} yenildi! +${adaReward} ADA kazandın. Savaşa katılan askerlerin +${monster.rewardXp} Asker XP kazandı.${lvlMsg}`);

        if (logEl) {
          logEl.innerHTML = `
            <div style="color:#4ade80; font-weight:800; font-size:1.1rem; text-align:center;">
              🏆 ZAFER! ${monster.name} yok edildi!
            </div>
            <div style="text-align:center; color:#fde047; margin-top:4px;">
              +${adaReward} $ADASTRA • Savaşa katılan askerlerine +${monster.rewardXp} Asker XP! ${lvlMsg}
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
    case 'treasury': openTreasuryVaultModal(); break;
    case 'forest': openTownZoneModal('forest', '🌲 Zümrüt Ormanı & Oduncu'); break;
    case 'mine': openTownZoneModal('mine', '⛏️ Maden Ocağı & Tamirhane'); break;
    case 'farm': openTownZoneModal('farm', '🌾 Güneş Tarlası & Değirmen'); break;
    case 'barracks': openBarracksModal(); break;
    case 'market': openTownZoneModal('market', '🏪 AMM Pazar Yeri'); break;
    case 'dungeon': enterDungeonScene(); break;
    case 'colosseum': openColosseumModal(); break;
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

  // Test & Dev Cheat Paneli Butonu
  const btnTestMenu = document.getElementById('btn-open-test-menu');
  if (btnTestMenu) btnTestMenu.addEventListener('click', openTestMenuModal);

  // 10B Makro Tokenomics & Canlı Simülatör Butonu
  const btnEconomy = document.getElementById('btn-economy-dashboard');
  if (btnEconomy) btnEconomy.addEventListener('click', () => openEconomyDashboardModal('overview'));

  // ÜST ŞERİT MENÜ BUTONLARI (TOP NAV STRIP BUTTONS)
  const btnNavDash = document.getElementById('btn-nav-dashboard');
  if (btnNavDash) btnNavDash.addEventListener('click', openDashboardModal);

  const btnNavTreasury = document.getElementById('btn-nav-treasury');
  if (btnNavTreasury) btnNavTreasury.addEventListener('click', openTreasuryVaultModal);

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

  // Alt 3D Dock & Sağ Menü Butonları
  const sideBtnInventory = document.getElementById('side-btn-inventory');
  if (sideBtnInventory) sideBtnInventory.addEventListener('click', openInventoryModal);

  const sideBtnWorkers = document.getElementById('side-btn-workers');
  if (sideBtnWorkers) sideBtnWorkers.addEventListener('click', openInventoryModal);

  const sideBtnBarracks = document.getElementById('side-btn-barracks');
  if (sideBtnBarracks) sideBtnBarracks.addEventListener('click', openBarracksModal);

  const sideBtnColosseum = document.getElementById('side-btn-colosseum');
  if (sideBtnColosseum) sideBtnColosseum.addEventListener('click', openColosseumModal);

  const sideBtnCollection = document.getElementById('side-btn-collection');
  if (sideBtnCollection) sideBtnCollection.addEventListener('click', () => openCollectionModal('koleksiyon'));

  const sideBtnBoxes = document.getElementById('side-btn-boxes');
  if (sideBtnBoxes) sideBtnBoxes.addEventListener('click', () => openCollectionModal('kutular'));

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
    if (zoneId === 'dungeon') {
      enterDungeonScene();
      return;
    } else if (zoneId === 'barracks') {
      openBarracksModal();
    } else if (zoneId === 'battlefield') {
      openBattlefieldModal();
    } else if (zoneId === 'colosseum') {
      openColosseumModal();
    } else if (zoneId === 'warehouse' || zoneId === 'silo') {
      openWarehouseModal();
    } else if (zoneId === 'collection') {
      openCollectionModal();
    } else if (zoneId === 'blacksmith') {
      mineActiveTab = 'blacksmith';
      openTownZoneModal('blacksmith', '⚒️ KRALLIK DEMİRCİSİ & TAMİRHANE');
    } else if (zoneId === 'mine') {
      mineActiveTab = 'mining';
      openTownZoneModal('mine', '⛏️ DAĞ MADEN OCAĞI & DEMİR');
    } else {
      openTownZoneModal(zoneId, zoneName);
    }
  });

  window.addEventListener('open-monster-battle', (e) => {
    const { monster } = e.detail;
    const currentLevel = gameState.state.dungeonProgress || 1;
    if (monster.level > currentLevel) {
      showToast(`🔒 Şu an Seviye ${currentLevel}'desiniz! [Seviye ${monster.level}] ${monster.name} bölümüne girmek için önce Seviye ${currentLevel} ve önceki bölümleri tamamlamalısınız.`, 'error');
      return;
    }
    if (monster.level < currentLevel) {
      showToast(`✅ [Seviye ${monster.level}] ${monster.name} zaten tamamlandı! Sıradaki Seviye ${currentLevel}'e ilerleyin.`, 'info');
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

    // 🧪 GELİŞTİRİCİ & TEST CHEAT BUTONLARI
    const testBtn = e.target.closest('.btn-test-action');
    if (testBtn) {
      const act = testBtn.dataset.action;
      let toastMsg = '⚡ Test eylemi tamamlandı.';

      switch (act) {
        case 'add_ada':
          gameState.cheatAddResources(0, 0, 0, 0, 10000, 0, 0);
          toastMsg = '🟣 +10.000 $ADASTRA eklendi!';
          break;
        case 'add_wood':
          gameState.cheatAddResources(5000, 0, 0, 0, 0, 0, 0);
          toastMsg = '🌲 +5.000 Odun eklendi!';
          break;
        case 'add_iron':
          gameState.cheatAddResources(0, 5000, 0, 0, 0, 0, 0);
          toastMsg = '⛏️ +5.000 Demir eklendi!';
          break;
        case 'add_wheat':
          gameState.cheatAddResources(0, 0, 5000, 0, 0, 0, 0);
          toastMsg = '🌾 +5.000 Buğday eklendi!';
          break;
        case 'add_fragments':
          gameState.cheatAddResources(0, 0, 0, 500, 0, 0, 0);
          toastMsg = '🧩 +500 Parça eklendi!';
          break;
        case 'add_boxes':
          gameState.cheatAddResources(0, 0, 0, 0, 0, 50, 0);
          toastMsg = '📦 +50 Kilitli Sandık eklendi!';
          break;
        case 'add_keys':
          gameState.cheatAddResources(0, 0, 0, 0, 0, 0, 50);
          toastMsg = '🔑 +50 Arena Anahtarı eklendi!';
          break;
        case 'full_stamina':
          gameState.cheatRefillStamina();
          toastMsg = '⚡ Stamina %100 dolduruldu!';
          break;
        case 'buy_soldier':
          const sRes = gameState.hireSoldierUnit();
          toastMsg = sRes.message;
          break;
        case 'heal_all_army':
          const hRes = gameState.instantHealAllSoldiers();
          toastMsg = `❤️ Tüm askerler iyileştirildi! (${hRes.healed} asker)`;
          break;
        case 'max_equip_all':
          const mRes = gameState.cheatMaxEquipAllSoldiers();
          toastMsg = mRes.message;
          break;
        case 'unequip_all':
          const uRes = gameState.unequipAllSoldiers();
          toastMsg = uRes.message;
          break;
        case 'auto_equip':
          const aRes = gameState.autoEquipBest();
          toastMsg = aRes.message;
          break;
        case 'level_up_player':
          const lRes = gameState.cheatLevelUpPlayer();
          toastMsg = lRes.message;
          break;
        case 'craft_all_equip':
          ['weapon', 'helmet', 'armor', 'legs', 'boots'].forEach(s => gameState.craftEquipment(s));
          toastMsg = '🔨 1\'er Adet Tüm Ekipmanlar Dövüldü!';
          break;
        case 'upgrade_all_equip':
          ['weapon', 'helmet', 'armor', 'legs', 'boots'].forEach(s => gameState.upgradeEquipment(s));
          toastMsg = '✨ Kuşanılan Ekipmanlar Yükseltildi!';
          break;
        case 'repair_all_tools':
          gameState.repairAllTools();
          toastMsg = '🔧 Tüm İşçi Aletleri Onarıldı!';
          break;
        case 'upgrade_warehouse':
          const wRes = gameState.upgradeWarehouse();
          toastMsg = wRes.message;
          break;
        case 'dungeon_lv1':
          gameState.cheatSetDungeonProgress(1);
          toastMsg = '👹 Zindan 1. Kat (Lv.1) Ayarlandı!';
          break;
        case 'dungeon_lv9':
          gameState.cheatSetDungeonProgress(9);
          toastMsg = '🗿 Zindan 3. Kat Ara Boss (Lv.9) Ayarlandı!';
          break;
        case 'dungeon_lv18':
          gameState.cheatSetDungeonProgress(18);
          toastMsg = '🐉 Zindan 6. Kat Final Boss IGNIS (Lv.18) Ayarlandı!';
          break;
        case 'dungeon_next':
          const nLvl = (gameState.state.dungeonProgress || 1) + 1;
          gameState.cheatSetDungeonProgress(nLvl);
          toastMsg = `⏩ Zindan Seviye ${nLvl}'e Atlatıldı!`;
          break;
        case 'unlock_all_artifacts':
          gameState.cheatUnlockAllArtifacts();
          toastMsg = '👑 Tüm 18 Koleksiyon Eseri Keşfedildi!';
          break;
        case 'mint_genesis':
          const gRes = gameState.mintGenesisNft();
          toastMsg = gRes.message;
          break;
        case 'open_1_box':
          if ((gameState.state.lockedBoxes || 0) <= 0) gameState.state.lockedBoxes = 1;
          const ob1 = gameState.unboxMysteryBox();
          toastMsg = ob1.message;
          break;
        case 'open_10_boxes':
          gameState.cheatAddResources(0, 0, 0, 0, 0, 10, 0);
          for (let b = 0; b < 10; b++) gameState.unboxMysteryBox();
          toastMsg = '📦 10 Adet Kilitli Sandık Açıldı ve Koleksiyon Eserleri Eklendi!';
          break;
        case 'stake_boss':
          const stRes = gameState.stakeArmyForWorldBoss();
          toastMsg = stRes.message;
          break;
        case 'attack_boss':
          if (!gameState.state.worldBoss || !gameState.state.worldBoss.userStaked) {
            gameState.stakeArmyForWorldBoss();
          }
          const atkRes = gameState.attackWorldBoss();
          toastMsg = atkRes.message;
          break;
        case 'enable_bot':
          gameState.activateTavernBuff('auto_collector_monthly', 30);
          toastMsg = '🤖 30 Günlük Otomasyon Botu Aktifleştirildi!';
          break;
        case 'enable_buffs':
          gameState.activateTavernBuff('speed_potion_3', 7);
          toastMsg = '⚡ 2.00x Büyük Sefer İksiri 7 Günlük Aktifleştirildi!';
          break;
        case 'finish_expeditions':
          gameState.cheatFinishAllExpeditions();
          toastMsg = '⏳ Tüm Sefer Zamanlayıcıları Anında Tamamlandı!';
          break;
        case 'reset_state':
          localStorage.clear();
          location.reload();
          return;
      }

      showToast(toastMsg, 'success');
      sound.playLevelUp();
      renderTopBar();
      openTestMenuModal();
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
      let ownedQty = 0;
      if (resKey === 'boxes') ownedQty = gameState.state.lockedBoxes || 0;
      else if (resKey === 'keys') ownedQty = gameState.state.arenaKeys || 0;
      else ownedQty = gameState.state.inventory[resKey] || 0;

      if (ownedQty < qty) {
        showToast(`Yetersiz ${resKey.toUpperCase()}! Envanterinde ${ownedQty} adet var.`, 'error');
        return;
      }

      const res = ammMarket.executeSell(resKey, qty);
      if (res.success) {
        if (resKey === 'boxes') gameState.state.lockedBoxes -= qty;
        else if (resKey === 'keys') gameState.state.arenaKeys -= qty;
        else gameState.state.inventory[resKey] -= qty;

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
        if (resKey === 'boxes') gameState.state.lockedBoxes = (gameState.state.lockedBoxes || 0) + res.resourceReceived;
        else if (resKey === 'keys') gameState.state.arenaKeys = (gameState.state.arenaKeys || 0) + res.resourceReceived;
        else gameState.state.inventory[resKey] = (gameState.state.inventory[resKey] || 0) + res.resourceReceived;

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

    // P2P Koleksiyon Eseri İlanı Ver
    if (e.target.closest('#btn-create-p2p-listing')) {
      const selectEl = dom.modalBody.querySelector('#p2p-artifact-select');
      const inputEl = dom.modalBody.querySelector('#p2p-price-input');
      const artifactId = selectEl ? selectEl.value : '';
      const priceAda = inputEl ? (parseFloat(inputEl.value) || 0) : 0;

      if (!artifactId) {
        showToast('Lütfen satılacak bir eser seçin!', 'error');
        return;
      }
      const res = gameState.createP2PArtifactListing(artifactId, priceAda);
      if (res.success) {
        showToast(res.message, 'success');
        marketActiveTab = 'p2p_collection';
        openTownZoneModal('market', '🏪 AMM Pazar Alanı');
      } else {
        showToast(res.message, 'error');
      }
      renderTopBar();
      return;
    }

    // P2P İlanı Satın Al
    const p2pBuyBtn = e.target.closest('.btn-p2p-buy-listing');
    if (p2pBuyBtn) {
      const id = p2pBuyBtn.dataset.id;
      const res = gameState.buyP2PArtifactListing(id);
      if (res.success) {
        showToast(res.message, 'success');
        marketActiveTab = 'p2p_collection';
        openTownZoneModal('market', '🏪 AMM Pazar Alanı');
      } else {
        showToast(res.message, 'error');
      }
      renderTopBar();
      return;
    }

    // P2P İlanı İptal Et
    const p2pCancelBtn = e.target.closest('.btn-p2p-cancel-listing');
    if (p2pCancelBtn) {
      const id = p2pCancelBtn.dataset.id;
      const res = gameState.cancelP2PArtifactListing(id);
      showToast(res.message, res.success ? 'info' : 'error');
      marketActiveTab = 'p2p_collection';
      openTownZoneModal('market', '🏪 AMM Pazar Alanı');
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
        openTownZoneModal('blacksmith', '⚒️ KRALLIK DEMİRCİSİ & TAMİRHANE');
      } else {
        showToast(res.message, 'error');
      }
      renderTopBar();
      return;
    }

    // Demirci: Ekipmanı Yeniden Dövme / Onarım (Reforge to 13/13)
    const equipReforgeBtn = e.target.closest('.btn-reforge-equipment');
    if (equipReforgeBtn) {
      const slotKey = equipReforgeBtn.dataset.slot;
      const res = gameState.reforgeEquipment(slotKey);
      if (res.success) {
        showToast(res.message, 'success');
        sound.playPickaxe();
        openTownZoneModal('blacksmith', '⚒️ KRALLIK DEMİRCİSİ & TAMİRHANE');
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
        openTownZoneModal('blacksmith', '⚒️ KRALLIK DEMİRCİSİ & TAMİRHANE');
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

    // Karnaval Moral Bonusu
    if (e.target.closest('#btn-carnival-cheer')) {
      gameState.state.stamina = Math.min(gameState.getMaxStamina(), (gameState.state.stamina || 0) + 10);
      gameState.save();
      sound.playLevelUp();
      showToast('🎪 Karnaval coşkusuna katıldın! +10 ⚡ Moral Staminası kazandın!', 'success');
      closeModal();
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


    // Kolezyum: Sekme Geçişi (1v1 Düello / Liderlik Tablosu)
    const colosseumTabBtn = e.target.closest('.colosseum-tab-btn');
    if (colosseumTabBtn) {
      colosseumActiveTab = colosseumTabBtn.dataset.tab;
      openColosseumModal();
      return;
    }

    // AMM Pazar: Sekme Geçişi (Hammadde / Parça Ticareti)
    const marketTabBtn = e.target.closest('.market-tab-btn');
    if (marketTabBtn) {
      marketActiveTab = marketTabBtn.dataset.tab;
      openTownZoneModal('market', '🏪 AMM Pazar Alanı');
      return;
    }

    // Demirci / Tamirhane: Sekme Geçişi
    const mineTabBtn = e.target.closest('.mine-tab-btn');
    if (mineTabBtn) {
      mineActiveTab = mineTabBtn.dataset.tab;
      openTownZoneModal('blacksmith', '⚒️ KRALLIK DEMİRCİSİ & TAMİRHANE');
      return;
    }

    // Kışla: Sekme Geçişi (Ordu Yönetimi / Akıllı Silah Deposu)
    const barracksTabBtn = e.target.closest('.barracks-tab-btn');
    if (barracksTabBtn) {
      barracksActiveTab = barracksTabBtn.dataset.tab;
      openBarracksModal();
      return;
    }

    // World Boss: Ordu Kilitleme (Stake)
    if (e.target.closest('#btn-stake-army-boss')) {
      const res = gameState.stakeArmyForWorldBoss();
      if (res.success) {
        showToast(res.message, 'success');
        openBattlefieldModal();
      } else {
        showToast(res.message, 'error');
      }
      return;
    }

    // World Boss: Saldırı & ADA Ödülü
    if (e.target.closest('#btn-attack-world-boss')) {
      const res = gameState.attackWorldBoss();
      if (res.success) {
        showToast(res.message, 'success');
        openBattlefieldModal();
      } else {
        showToast(res.message, 'error');
      }
      renderTopBar();
      return;
    }

    // World Boss: Saldırı & ADA Ödülü
    if (e.target.closest('#btn-attack-world-boss')) {
      const res = gameState.attackWorldBoss();
      if (res.success) {
        showToast(res.message, 'success');
        openBarracksModal();
      } else {
        showToast(res.message, 'error');
      }
      renderTopBar();
      return;
    }

    // Depo & Silo Yükseltme
    if (e.target.closest('#btn-modal-upgrade-warehouse')) {
      const res = gameState.upgradeWarehouse();
      if (res.success) {
        showToast(res.message, 'success');
        sound.playLevelUp();
        openWarehouseModal();
      } else {
        showToast(res.message, 'error');
      }
      renderTopBar();
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

      case 'vanilla-reset': {
        const confirmReset = window.confirm(
          '🍦 EMİN MİSİN?\n\nBu işlem TÜM ilerlemeni (seviye, XP, ordu, kaynaklar, envanter, teçhizat, zindan ilerlemesi ve aktif seferler) kalıcı olarak silecek ve hesabını sıfırdan vanilla başlangıç profiline (Lv.1, 100 Stamina, 250 ADA) döndürecek.\n\nDevam etmek istiyor musun?'
        );
        if (!confirmReset) break;
        gameState.vanillaReset();
        showToast('🍦 Hesabın tamamen vanilla başlangıç profiline sıfırlandı! Sayfa yenileniyor...', 'success');
        sound.playLevelUp();
        renderTopBar();
        setTimeout(() => location.reload(), 900);
        break;
      }
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

