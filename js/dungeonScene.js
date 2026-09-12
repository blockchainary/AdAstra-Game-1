// AdAstra: Genesis Realm - 6 Eşsiz Katlı & 18 Seviyeli Master Zindan Motoru (Kilitli Tek Ekran / Sıfır Çökme)
import { gameState } from './gameState.js';
import { sound } from './audio.js';

const MAX_LEVEL = 18;

// 6 KATIN TAMAMI İÇİN 6 FARKLI VE EŞSİZ MASTER GÖRSEL
const TEXTURES = {
  FLOOR1: 'dungeon_tex_f1', // Goblin & Örümcek Doğal Mağarası
  FLOOR2: 'dungeon_tex_f2', // Kemik Mahzeni & İskelet Kriptosu
  FLOOR3: 'dungeon_tex_f3', // Kadim Tapınak & Taş Golyat (ARA BOSS)
  FLOOR4: 'dungeon_tex_f4', // Lanetli Firavun Mezarı & Hayaletler
  FLOOR5: 'dungeon_tex_f5', // Kaynayan Lav Çukuru & İblisler
  FLOOR6: 'dungeon_tex_f6'  // Kıyamet Mabedi & Efsanevi Ejderha
};

// 6 Kat x 3 Seviye = 18 Seviye Tam Konfigürasyonu (Her Katın Kendi Taş Levha Koordinatlarıyla)
const PAGES = [
  // 1. KAT: DOĞAL MAĞARA & GOBLİN İNİ
  {
    floor: 1,
    title: '1. Kat: Kristal Mağarası & Goblin İni',
    badge: '1. KAT (Lv.1 - 3)',
    texture: TEXTURES.FLOOR1,
    chambers: [
      { px: 0.200, py: 0.720, bw: 0.250, bh: 0.085 },
      { px: 0.520, py: 0.720, bw: 0.250, bh: 0.085 },
      { px: 0.785, py: 0.720, bw: 0.250, bh: 0.085 }
    ],
    portal: { px: 0.940, py: 0.945, bw: 0.115, bh: 0.085 },
    levels: [
      { level: 1, name: 'Bataklık Balçığı', icon: '🟢', hp: 200, atk: 30, rewardAdAstra: 15, rewardXp: 40, color: 0x22c55e },
      { level: 2, name: 'Mağara Goblini', icon: '👺', hp: 380, atk: 50, rewardAdAstra: 30, rewardXp: 80, color: 0x06b6d4 },
      { level: 3, name: 'Gölge Kurdu', icon: '🐺', hp: 600, atk: 75, rewardAdAstra: 55, rewardXp: 130, color: 0xf59e0b }
    ]
  },
  // 2. KAT: KEMİK MAHZENİ & İSKELET KRİPTOSU
  {
    floor: 2,
    title: '2. Kat: Kemik Mahzeni & İskelet Kriptosu',
    badge: '2. KAT (Lv.4 - 6)',
    texture: TEXTURES.FLOOR2,
    chambers: [
      { px: 0.185, py: 0.952, bw: 0.250, bh: 0.085 },
      { px: 0.500, py: 0.952, bw: 0.250, bh: 0.085 },
      { px: 0.770, py: 0.952, bw: 0.250, bh: 0.085 }
    ],
    portal: { px: 0.940, py: 0.952, bw: 0.115, bh: 0.085 },
    levels: [
      { level: 4, name: 'Kemik Mahzeni İskeletleri', icon: '💀', hp: 850, atk: 105, rewardAdAstra: 85, rewardXp: 200, color: 0x22c55e },
      { level: 5, name: 'Lanetli Kemik Büyücüsü', icon: '🧙‍♂️', hp: 1150, atk: 130, rewardAdAstra: 110, rewardXp: 260, color: 0x06b6d4 },
      { level: 6, name: 'Kemik Taht Muhafızı', icon: '🗡️', hp: 1450, atk: 155, rewardAdAstra: 140, rewardXp: 320, color: 0xf59e0b }
    ]
  },
  // 3. KAT: KADİM TAPINAK & TAŞ GOLYAT (ARA BOSS)
  {
    floor: 3,
    title: '3. Kat: Kadim Tapınak & Taş Golyat (ARA BOSS)',
    badge: '3. KAT (Lv.7 - 9 ARA BOSS)',
    texture: TEXTURES.FLOOR3,
    chambers: [
      { px: 0.180, py: 0.865, bw: 0.250, bh: 0.078 },
      { px: 0.490, py: 0.865, bw: 0.250, bh: 0.078 },
      { px: 0.775, py: 0.865, bw: 0.250, bh: 0.078 }
    ],
    portal: { px: 0.950, py: 0.970, bw: 0.098, bh: 0.060 },
    levels: [
      { level: 7, name: 'Karanlık Tarikatçı', icon: '🧙‍♂️', hp: 1800, atk: 185, rewardAdAstra: 175, rewardXp: 400, color: 0x22c55e },
      { level: 8, name: 'Cehennem Tazısı', icon: '🐺', hp: 2200, atk: 215, rewardAdAstra: 210, rewardXp: 480, color: 0x06b6d4 },
      { level: 9, name: 'Kadim Taş Golyat', icon: '🗿', hp: 9500, atk: 520, rewardAdAstra: 800, rewardXp: 1800, color: 0xef4444, isBoss: true, bossLabel: 'ARA BOSS' }
    ]
  },
  // 4. KAT: LANETLİ FİRAVUN MEZARI & HAYALETLER
  {
    floor: 4,
    title: '4. Kat: Lanetli Firavun Mezarı & Hayaletler',
    badge: '4. KAT (Lv.10 - 12)',
    texture: TEXTURES.FLOOR4,
    chambers: [
      { px: 0.185, py: 0.952, bw: 0.250, bh: 0.085 },
      { px: 0.500, py: 0.952, bw: 0.250, bh: 0.085 },
      { px: 0.770, py: 0.952, bw: 0.250, bh: 0.085 }
    ],
    portal: { px: 0.940, py: 0.952, bw: 0.115, bh: 0.085 },
    levels: [
      { level: 10, name: 'Sargılı Mumyalar', icon: '🧟', hp: 2800, atk: 245, rewardAdAstra: 260, rewardXp: 560, color: 0x22c55e },
      { level: 11, name: 'Gölge Hayaletler', icon: '👻', hp: 3200, atk: 270, rewardAdAstra: 300, rewardXp: 640, color: 0x06b6d4 },
      { level: 12, name: 'Lanetli Firavun', icon: '👑', hp: 3700, atk: 300, rewardAdAstra: 340, rewardXp: 720, color: 0xf59e0b }
    ]
  },
  // 5. KAT: KAYNAYAN LAV MAĞARASI & İBLİSLER
  {
    floor: 5,
    title: '5. Kat: Kaynayan Lav Çukuru & İblisler',
    badge: '5. KAT (Lv.13 - 15)',
    texture: TEXTURES.FLOOR5,
    chambers: [
      { px: 0.180, py: 0.865, bw: 0.250, bh: 0.078 },
      { px: 0.490, py: 0.865, bw: 0.250, bh: 0.078 },
      { px: 0.775, py: 0.865, bw: 0.250, bh: 0.078 }
    ],
    portal: [
      { px: 0.945, py: 0.865, bw: 0.115, bh: 0.085 }, // Floor 6 Taş Butonu
      { px: 0.955, py: 0.460, bw: 0.090, bh: 0.220 }  // Sağdaki Lav Portal Kapısı
    ],
    levels: [
      { level: 13, name: 'Ateş İblisleri', icon: '😈', hp: 4200, atk: 330, rewardAdAstra: 380, rewardXp: 800, color: 0x22c55e },
      { level: 14, name: 'Lav Elementalleri', icon: '🌋', hp: 4700, atk: 360, rewardAdAstra: 420, rewardXp: 880, color: 0x06b6d4 },
      { level: 15, name: 'Obsidyen Berserker', icon: '⚔️', hp: 5300, atk: 395, rewardAdAstra: 470, rewardXp: 960, color: 0xf59e0b }
    ]
  },
  // 6. KAT: KIYAMET MABEDİ & BÜYÜK BOSS (EFSANEVİ EJDERHA)
  {
    floor: 6,
    title: '6. Kat: Kıyamet Mabedi & BÜYÜK BOSS',
    badge: '6. KAT (Lv.16 - 18 FİNAL)',
    texture: TEXTURES.FLOOR6,
    chambers: [
      { px: 0.185, py: 0.952, bw: 0.250, bh: 0.085 },
      { px: 0.500, py: 0.952, bw: 0.250, bh: 0.085 },
      { px: 0.770, py: 0.952, bw: 0.250, bh: 0.085 }
    ],
    portal: null, // Son kat
    levels: [
      { level: 16, name: 'Kıyamet Şövalyesi', icon: '🛡️', hp: 6000, atk: 430, rewardAdAstra: 550, rewardXp: 1100, color: 0x22c55e },
      { level: 17, name: 'Kadim Gölge Lordu', icon: '👁️', hp: 7000, atk: 470, rewardAdAstra: 650, rewardXp: 1300, color: 0x06b6d4 },
      { level: 18, name: 'Kıyamet Ejderhası IGNIS', icon: '🐉', hp: 38000, atk: 1250, rewardAdAstra: 3000, rewardXp: 6000, color: 0xef4444, isBoss: true, bossLabel: 'BÜYÜK BOSS' }
    ]
  }
];

const TOP_BAR_HEIGHT = 56;
function getViewportSize() {
  return {
    w: window.innerWidth,
    h: Math.max(300, window.innerHeight - TOP_BAR_HEIGHT)
  };
}

export class DungeonScene extends Phaser.Scene {
  constructor() {
    super({ key: 'DungeonScene' });
    this.currentPage = 1;
    this.maxUnlockedLevel = gameState.state.dungeonProgress || 1;
  }

  preload() {
    this.load.image(TEXTURES.FLOOR1, 'assets/dungeon_map.jpg');
    this.load.image(TEXTURES.FLOOR2, 'assets/dungeon_floor2.jpg');
    this.load.image(TEXTURES.FLOOR3, 'assets/dungeon_floor3.jpg');
    this.load.image(TEXTURES.FLOOR4, 'assets/dungeon_floor4.jpg');
    this.load.image(TEXTURES.FLOOR5, 'assets/dungeon_floor5.jpg');
    this.load.image(TEXTURES.FLOOR6, 'assets/dungeon_floor6.jpg');
  }

  create() {
    // Sabit HTML Kat Seçici Barını Göster, Kasaba Menüsünü Gizle
    const floorBar = document.getElementById('dungeon-floor-bar');
    const topNavMenu = document.querySelector('.top-nav-menu');
    if (floorBar) floorBar.classList.remove('hidden');
    if (topNavMenu) topNavMenu.classList.add('hidden');

    // Tek geniş ekran kilitli kamera (Fareyle büyütme/küçültme/sürükleme yok)
    this.setupFixedScreen();

    // Zindan Sayfasını Çiz
    this.renderCurrentPage();

    this.resizeHandler = () => {
      this.setupFixedScreen();
      this.renderCurrentPage();
    };
    this.scale.on('resize', this.resizeHandler);

    // Kat Değiştirme Olayını Dinle
    this.floorSwitchHandler = (e) => {
      const targetFloor = e.detail.floor;
      if (targetFloor >= 1 && targetFloor <= 6 && this.currentPage !== targetFloor) {
        this.currentPage = targetFloor;
        this.renderCurrentPage();
      }
    };
    window.addEventListener('switch-dungeon-floor', this.floorSwitchHandler);

    this.monsterDefeatedHandler = (e) => {
      const defeatedLvl = e.detail.level;
      if (defeatedLvl >= this.maxUnlockedLevel && this.maxUnlockedLevel <= MAX_LEVEL) {
        this.maxUnlockedLevel = Math.min(MAX_LEVEL, defeatedLvl + 1);
        gameState.state.dungeonProgress = this.maxUnlockedLevel;
        gameState.saveState();
        this.renderCurrentPage();
      }
    };
    window.addEventListener('monster-defeated', this.monsterDefeatedHandler);

    this.events.once('shutdown', () => {
      if (floorBar) floorBar.classList.add('hidden');
      if (topNavMenu) topNavMenu.classList.remove('hidden');
      this.scale.off('resize', this.resizeHandler);
      window.removeEventListener('switch-dungeon-floor', this.floorSwitchHandler);
      window.removeEventListener('monster-defeated', this.monsterDefeatedHandler);
    });
  }

  setupFixedScreen() {
    // NOT: this.scale.resize() BURADA ÇAĞRILMAZ. ScaleManager.resize() her
    // çağrıldığında (boyut değişmese bile) 'resize' event'ini tekrar fırlatır;
    // bu metod zaten o event'in handler'ı olduğundan sonsuz senkron döngü ve
    // sekme çökmesine (kara ekran) yol açar. Gerçek canvas boyutlandırması
    // zaten Phaser'ın RESIZE scale modu ve app.js'teki window resize
    // dinleyicisi tarafından yapılıyor; burada sadece kamerayı güncel boyuta göre kilitliyoruz.
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.cameras.main.setSize(w, h);
    this.cameras.main.setScroll(0, 0);
    this.cameras.main.setZoom(1);
  }

  renderCurrentPage() {
    this.tweens.killAll();
    if (this.activeZones) {
      this.activeZones.forEach(z => {
        if (z) {
          try {
            z.disableInteractive();
            z.removeAllListeners();
            z.destroy();
          } catch (_) {}
        }
      });
    }
    this.activeZones = [];
    this.children.removeAll(true);
    this.buildPage(this.currentPage);
    this.syncHTMLFloorTabs();
  }

  syncHTMLFloorTabs() {
    document.querySelectorAll('.floor-tab').forEach(tab => {
      const f = parseInt(tab.dataset.floor, 10);
      if (f === this.currentPage) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });
    window.dispatchEvent(new CustomEvent('switch-dungeon-floor', { detail: { floor: this.currentPage } }));
  }

  buildPage(pageIndex) {
    const page = PAGES[pageIndex - 1];
    if (!page) return;

    const { w, h } = getViewportSize();

    // Arka Plan Haritası (Tek geniş ekran, sıfır kırpılma)
    this.map = this.add.image(0, 0, page.texture).setOrigin(0, 0);
    this.map.setDisplaySize(w, h);

    // 3 Canavar Odası (Taş Levhaları 100% Tam Kapatan 3D Katı Altın Çerçeveli Butonlar)
    const monsters = page.levels.map((lvl, i) => {
      const layout = page.chambers[i];
      return {
        ...lvl,
        id: `monster_lv${lvl.level}`,
        x: layout.px * w,
        y: layout.py * h,
        bw: layout.bw * w,
        bh: layout.bh * h
      };
    });

    monsters.forEach((m, idx) => this.createMonsterZone(m, idx));

    // Sonraki Kat Portalı (Sağ Alttaki Taş Levha & Portal)
    if (page.portal) {
      const portalList = Array.isArray(page.portal) ? page.portal : [page.portal];
      portalList.forEach(p => {
        this.createNextPortal({
          x: p.px * w,
          y: p.py * h,
          bw: p.bw * w,
          bh: p.bh * h
        }, pageIndex);
      });
    }
  }

  createMonsterZone(m, chamberIndex = 0) {
    // Şeffaf İnteraktif Tıklama Alanı (Görseldeki taş kartların üzerine %100 oturur)
    const zone = this.add.rectangle(m.x, m.y, m.bw, m.bh, 0x000000, 0)
      .setInteractive({ useHandCursor: true });

    if (!this.activeZones) this.activeZones = [];
    this.activeZones.push(zone);

    // Hover esnasında dinamik kontrol ile tooltip göster
    zone.on('pointerover', (pointer) => {
      const currentLevel = gameState.state.dungeonProgress || 1;
      const isCleared = currentLevel > m.level;
      const isCurrent = currentLevel === m.level;
      const isLocked = currentLevel < m.level;

      const tooltipEl = document.getElementById('realm-hover-tooltip');
      const titleEl = document.getElementById('realm-tooltip-title');
      const subEl = document.getElementById('realm-tooltip-sub');
      if (tooltipEl && titleEl && subEl) {
        titleEl.textContent = `Chamber ${chamberIndex + 1} — Lv.${m.level}: ${m.name}`;
        titleEl.style.color = isCurrent ? '#fde047' : (isCleared ? '#4ade80' : '#a8a29e');
        subEl.textContent = isLocked ? `🔒 Kilitli (Önce Seviye ${currentLevel} tamamlanmalı)` : (isCurrent ? '⚔️ Tıkla ve Savaşa Gir!' : '⚔️ Tamamlandı (Tekrar Savaş)');
        tooltipEl.classList.remove('hidden');
        tooltipEl.classList.add('visible');
        tooltipEl.style.left = `${pointer.x}px`;
        tooltipEl.style.top = `${pointer.y - 45}px`;
      }
    });

    zone.on('pointermove', (pointer) => {
      const tooltipEl = document.getElementById('realm-hover-tooltip');
      if (tooltipEl && tooltipEl.classList.contains('visible')) {
        tooltipEl.style.left = `${pointer.x}px`;
        tooltipEl.style.top = `${pointer.y - 45}px`;
      }
    });

    zone.on('pointerout', () => {
      const tooltipEl = document.getElementById('realm-hover-tooltip');
      if (tooltipEl) {
        tooltipEl.classList.remove('visible');
        tooltipEl.classList.add('hidden');
      }
    });

    zone.on('pointerup', () => {
      const tooltipEl = document.getElementById('realm-hover-tooltip');
      if (tooltipEl) {
        tooltipEl.classList.remove('visible');
        tooltipEl.classList.add('hidden');
      }

      const rpgModal = document.getElementById('rpg-modal');
      if (rpgModal && rpgModal.classList.contains('active')) return;

      const currentLevel = gameState.state.dungeonProgress || 1;
      if (m.level > currentLevel) {
        window.dispatchEvent(new CustomEvent('toast-notify', {
          detail: {
            message: `🔒 Şu an Seviye ${currentLevel}'desiniz! [Seviye ${m.level}] ${m.name} bölümüne girmek için önce Seviye ${currentLevel} ve önceki bölümleri tamamlamalısınız.`,
            type: 'error'
          }
        }));
        return;
      }

      sound.playPickaxe();
      window.dispatchEvent(new CustomEvent('open-monster-battle', { detail: { monster: m } }));
    });
  }

  createNextPortal(portalCoord, pageIndex) {
    if (!portalCoord) return;
    const targetFloor = pageIndex + 1;
    if (targetFloor > 6) return;

    // Şeffaf Portal Tıklama Alanı (Sağ alttaki Floor N taş kartının üzerine %100 oturur)
    const portalZone = this.add.rectangle(portalCoord.x, portalCoord.y, portalCoord.bw, portalCoord.bh, 0x000000, 0)
      .setInteractive({ useHandCursor: true });

    if (!this.activeZones) this.activeZones = [];
    this.activeZones.push(portalZone);

    portalZone.on('pointerover', (pointer) => {
      const tooltipEl = document.getElementById('realm-hover-tooltip');
      const titleEl = document.getElementById('realm-tooltip-title');
      const subEl = document.getElementById('realm-tooltip-sub');
      if (tooltipEl && titleEl && subEl) {
        titleEl.textContent = `🌀 ${targetFloor}. KAT PORTALI`;
        titleEl.style.color = '#c084fc';
        subEl.textContent = 'Tıkla ve Sonraki Kata Işınlan';
        tooltipEl.classList.remove('hidden');
        tooltipEl.classList.add('visible');
        const posX = Math.min(window.innerWidth - 130, Math.max(130, pointer.x));
        tooltipEl.style.left = `${posX}px`;
        tooltipEl.style.top = `${pointer.y - 45}px`;
      }
    });

    portalZone.on('pointermove', (pointer) => {
      const tooltipEl = document.getElementById('realm-hover-tooltip');
      if (tooltipEl && tooltipEl.classList.contains('visible')) {
        const posX = Math.min(window.innerWidth - 130, Math.max(130, pointer.x));
        tooltipEl.style.left = `${posX}px`;
        tooltipEl.style.top = `${pointer.y - 45}px`;
      }
    });

    portalZone.on('pointerout', () => {
      const tooltipEl = document.getElementById('realm-hover-tooltip');
      if (tooltipEl) {
        tooltipEl.classList.remove('visible');
        tooltipEl.classList.add('hidden');
      }
    });

    portalZone.on('pointerup', () => {
      const tooltipEl = document.getElementById('realm-hover-tooltip');
      if (tooltipEl) {
        tooltipEl.classList.remove('visible');
        tooltipEl.classList.add('hidden');
      }

      const rpgModal = document.getElementById('rpg-modal');
      if (rpgModal && rpgModal.classList.contains('active')) return;

      sound.playLevelUp();
      window.dispatchEvent(new CustomEvent('switch-dungeon-floor', { detail: { floor: targetFloor } }));
      window.dispatchEvent(new CustomEvent('toast-notify', { detail: { message: `🌀 ${targetFloor}. Kata Işınlanıldı!`, type: 'success' } }));
    });
  }
}
