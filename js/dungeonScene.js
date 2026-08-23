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
  FLOOR6: 'dungeon_tex_f6'  // Kıyamet Mabedi & Efsanevi Ejderha (BÜYÜK BOSS)
};

// 6 Kat x 3 Seviye = 18 Seviye Tam Konfigürasyonu (2400x1350 referanslı)
const PAGES = [
  // 1. KAT: DOĞAL MAĞARA & GOBLİN İNİ
  {
    floor: 1,
    title: '1. Kat: Kristal Mağarası & Goblin İni',
    badge: '1. KAT (Lv.1 - 3)',
    texture: TEXTURES.FLOOR1,
    slots: [
      { x: 340, y: 550, radius: 200 },  // Sol Yeşil Slime Havuzları (Lv.1)
      { x: 1040, y: 460, radius: 210 }, // Orta Goblin Kampı & Ateş (Lv.2)
      { x: 1680, y: 480, radius: 210 }  // Sağ Mor Kristal Rün Alanı (Lv.3)
    ],
    portal: { x: 2150, y: 350 },        // Sağ Üst Mor Portal Kapısı
    torches: [
      { x: 1030, y: 580 }, { x: 2020, y: 390 }, { x: 2280, y: 390 }, { x: 1960, y: 660 }, { x: 1040, y: 1140 }
    ],
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
    slots: [
      { x: 320, y: 460, radius: 210 },  // Sol Mezar Lahitleri Odası (Lv.4)
      { x: 1040, y: 460, radius: 210 }, // Orta Kemik Ritüel Çemberi (Lv.5)
      { x: 1740, y: 460, radius: 210 }  // Sağ Kemik Taht Salonu (Lv.6)
    ],
    portal: { x: 2240, y: 400 },        // Sağ Üst Kızıl Girdaplı Portal
    torches: [
      { x: 130, y: 240 }, { x: 480, y: 240 },
      { x: 880, y: 160 }, { x: 1200, y: 160 },
      { x: 2100, y: 240 }, { x: 2380, y: 240 },
      { x: 290, y: 840 }, { x: 880, y: 920 }, { x: 1090, y: 920 }
    ],
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
    slots: [
      { x: 320, y: 460, radius: 210 },  // Sol Kadim Rünlü Büyü Odası (Lv.7)
      { x: 1000, y: 440, radius: 210 }, // Orta Lav Kanallı Tazi Salonu (Lv.8)
      { x: 1690, y: 420, radius: 230 }  // Sağ Kadim Taş Golyat Boss Arenası (Lv.9)
    ],
    portal: { x: 2200, y: 350 },        // Sağ Üst Altın Taçlı Portal Kapısı
    torches: [
      { x: 100, y: 220 }, { x: 540, y: 220 },
      { x: 930, y: 150 }, { x: 1090, y: 150 },
      { x: 1470, y: 120 }, { x: 1830, y: 120 },
      { x: 2020, y: 430 }, { x: 2310, y: 430 }
    ],
    levels: [
      { level: 7, name: 'Karanlık Tarikatçı', icon: '🧙‍♂️', hp: 1800, atk: 185, rewardAdAstra: 175, rewardXp: 400, color: 0x22c55e },
      { level: 8, name: 'Cehennem Tazısı', icon: '🐺', hp: 2200, atk: 215, rewardAdAstra: 210, rewardXp: 480, color: 0x06b6d4 },
      { level: 9, name: 'Kadim Taş Golyat', icon: '🗿', hp: 3500, atk: 280, rewardAdAstra: 400, rewardXp: 900, color: 0xef4444, isBoss: true, bossLabel: 'ARA BOSS' }
    ]
  },
  // 4. KAT: LANETLİ FİRAVUN MEZARI & HAYALETLER
  {
    floor: 4,
    title: '4. Kat: Lanetli Firavun Mezarı & Hayaletler',
    badge: '4. KAT (Lv.10 - 12)',
    texture: TEXTURES.FLOOR4,
    slots: [
      { x: 350, y: 440, radius: 220 },  // Sol Mumya & Lahitler Odası (Lv.10)
      { x: 1040, y: 440, radius: 220 }, // Orta Anubis Heykelleri & Hayaletler (Lv.11)
      { x: 1710, y: 440, radius: 220 }  // Sağ Lanetli Firavun & Dikilitaş (Lv.12)
    ],
    portal: { x: 2200, y: 350 },        // Sağ Üst Altın Kanatlı Zümrüt Portal
    torches: [
      { x: 230, y: 190 }, { x: 540, y: 190 },
      { x: 910, y: 180 }, { x: 1170, y: 180 },
      { x: 1580, y: 180 }, { x: 1800, y: 180 },
      { x: 2050, y: 490 }, { x: 2360, y: 490 }
    ],
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
    slots: [
      { x: 350, y: 500, radius: 200 },
      { x: 1200, y: 500, radius: 210 },
      { x: 2000, y: 400, radius: 240 }
    ],
    portal: { x: 2200, y: 200 },
    torches: [{ x: 350, y: 250 }, { x: 1200, y: 220 }, { x: 2000, y: 220 }],
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
    slots: [
      { x: 400, y: 500, radius: 200 },
      { x: 1200, y: 500, radius: 210 },
      { x: 1950, y: 450, radius: 260 }
    ],
    portal: null, // Son kat
    torches: [{ x: 400, y: 250 }, { x: 1200, y: 220 }, { x: 1950, y: 220 }],
    levels: [
      { level: 16, name: 'Kıyamet Şövalyesi', icon: '🛡️', hp: 6000, atk: 430, rewardAdAstra: 550, rewardXp: 1100, color: 0x22c55e },
      { level: 17, name: 'Kadim Gölge Lordu', icon: '👁️', hp: 7000, atk: 470, rewardAdAstra: 650, rewardXp: 1300, color: 0x06b6d4 },
      { level: 18, name: 'Kıyamet Ejderhası IGNIS', icon: '🐉', hp: 12000, atk: 600, rewardAdAstra: 1500, rewardXp: 3000, color: 0xef4444, isBoss: true, bossLabel: 'BÜYÜK BOSS' }
    ]
  }
];

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
  }

  buildPage(pageIndex) {
    const page = PAGES[pageIndex - 1];
    if (!page) return;

    const w = window.innerWidth;
    const h = window.innerHeight;

    const scaleX = w / 2400;
    const scaleY = h / 1350;

    // Arka Plan Haritası (Tek geniş ekran, sıfır kırpılma)
    this.map = this.add.image(0, 0, page.texture).setOrigin(0, 0);
    this.map.setDisplaySize(w, h);

    // Meşaleler & Alev Işıkları (Pürüzsüz & Sıfır Çökme)
    if (page.torches) {
      page.torches.forEach(t => {
        const tx = t.x * scaleX;
        const ty = t.y * scaleY;
        const torchGlow = this.add.circle(tx, ty, 9, 0xf97316, 0.65);
        const torchCore = this.add.circle(tx, ty, 4, 0xfde047, 0.95);
        this.tweens.add({
          targets: [torchGlow, torchCore],
          scale: { from: 0.8, to: 1.4 },
          alpha: { from: 0.8, to: 0.35 },
          duration: 350 + Math.random() * 200,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      });
    }

    // 3 Canavar Odası
    const monsters = page.levels.map((lvl, i) => ({
      ...lvl,
      id: `monster_lv${lvl.level}`,
      x: page.slots[i].x * scaleX,
      y: page.slots[i].y * scaleY,
      radius: Math.min(page.slots[i].radius * scaleX, 150)
    }));

    monsters.forEach(m => this.createMonsterZone(m));

    // Sonraki Kat Portalı
    if (page.portal) {
      this.createNextPortal({
        x: page.portal.x * scaleX,
        y: page.portal.y * scaleY
      }, pageIndex);
    }
  }

  createMonsterZone(m) {
    const currentLevel = gameState.state.dungeonProgress || 1;
    const isCleared = currentLevel > m.level;
    const isCurrent = currentLevel === m.level;
    const isLocked = currentLevel < m.level;

    const zoneColor = isCleared ? 0x64748b : isCurrent ? m.color : 0x475569;
    const zone = this.add.circle(m.x, m.y, m.radius, zoneColor, 0)
      .setInteractive({ useHandCursor: !isCleared });

    const floorBarEl = document.getElementById('dungeon-floor-bar');
    const barSafeBottom = floorBarEl ? floorBarEl.getBoundingClientRect().bottom + 16 : 90;
    const tagHalfHeight = 22;
    const aboveY = m.y - m.radius - 20;
    const flipDown = (aboveY - tagHalfHeight) < barSafeBottom || m.y < 450;
    const restY = flipDown ? m.y + m.radius + 20 : aboveY;
    const hoverY = flipDown ? m.y + m.radius + 26 : m.y - m.radius - 26;

    const hoverTag = this.add.container(m.x, restY);
    const tagBg = this.add.rectangle(0, 0, m.isBoss ? 340 : 280, 44, 0x140e08, 0.96)
      .setStrokeStyle(3, isCleared ? 0x64748b : isCurrent ? m.color : 0x64748b);

    const levelLabel = m.isBoss ? `[SEVİYE ${m.level}] ${m.bossLabel}: ${m.name}` : `[Seviye ${m.level}] ${m.name}`;

    let tagTextStr = '';
    let subTextStr = '';
    let textColor = '#ffffff';
    let subTextColor = '#facc15';

    if (isCleared) {
      tagTextStr = `✅ ${m.icon} ${levelLabel} TAMAMLANDI`;
      subTextStr = 'Zaten tamamlandı';
      subTextColor = '#94a3b8';
    } else if (isCurrent) {
      tagTextStr = `⚔️ ${m.icon} ${levelLabel}`;
      subTextStr = 'Tıkla ve Savaşa Başla!';
    } else {
      tagTextStr = `🔒 [Seviye ${m.level}] KİLİTLİ`;
      textColor = '#94a3b8';
      subTextStr = 'Önceki seviyeleri geçin';
      subTextColor = '#ef4444';
    }

    const tagText = this.add.text(0, -8, tagTextStr,
      { font: 'bold 12px "Fredoka", sans-serif', fill: textColor }
    ).setOrigin(0.5);

    const subText = this.add.text(0, 10, subTextStr,
      { font: '11px "Outfit", sans-serif', fill: subTextColor }
    ).setOrigin(0.5);

    hoverTag.add([tagBg, tagText, subText]);
    hoverTag.setAlpha(0);

    zone.on('pointerover', () => {
      this.tweens.add({ targets: hoverTag, alpha: 1, y: hoverY, duration: 150 });
    });

    zone.on('pointerout', () => {
      this.tweens.add({ targets: hoverTag, alpha: 0, y: restY, duration: 150 });
    });

    zone.on('pointerup', () => {
      // CRITICAL: Check if ANY modal is currently open - if so, IMMEDIATELY RETURN and ignore click
      const rpgModal = document.getElementById('rpg-modal');
      if (rpgModal && rpgModal.classList.contains('active')) return;

      if (isCleared) {
        window.dispatchEvent(new CustomEvent('toast-notify', {
          detail: { message: 'Bu seviye zaten tamamlandı! Sıradaki seviyeye ilerleyin.', type: 'info' }
        }));
        return;
      }
      if (isLocked) {
        window.dispatchEvent(new CustomEvent('toast-notify', {
          detail: { message: 'Bu seviye henüz kilitli. Önceki seviyeleri tamamlamalısın.', type: 'error' }
        }));
        return;
      }
      sound.playPickaxe();
      window.dispatchEvent(new CustomEvent('open-monster-battle', { detail: { monster: m } }));
    });
  }

  createNextPortal(portalCoord, pageIndex) {
    const portalZone = this.add.circle(portalCoord.x, portalCoord.y, 130, 0xa855f7, 0)
      .setInteractive({ useHandCursor: true });

    const nextPage = PAGES[pageIndex + 1];
    const nextFloorNum = pageIndex + 2;
    const nextSubtitle = nextPage && nextPage.title
      ? (nextPage.title.split(': ')[1] || nextPage.title)
      : '';

    // --- Premium Gold-Leaf & Amethyst Ornate Geçiş Kartı ---
    const cardW = 320;
    const cardH = 62;
    const restY = portalCoord.y + 108;
    const hoverY = portalCoord.y + 96;

    const nextBtnTag = this.add.container(portalCoord.x, restY);

    // Yumuşak dış ışıltı (glow) katmanı
    const cardGlow = this.add.graphics();
    cardGlow.fillStyle(0xa855f7, 0.35);
    cardGlow.fillRoundedRect(-cardW / 2 - 10, -cardH / 2 - 10, cardW + 20, cardH + 20, 22);

    // Ametist gradyanlı kart gövdesi
    const cardBg = this.add.graphics();
    cardBg.fillGradientStyle(0x9333ea, 0x9333ea, 0x2e1065, 0x1e0a3c, 1);
    cardBg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 16);
    // Dış altın yaldız çerçeve
    cardBg.lineStyle(3, 0xfbbf24, 1);
    cardBg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 16);
    // İç ince altın yaldız çizgisi (ornate detay)
    cardBg.lineStyle(1, 0xfde68a, 0.7);
    cardBg.strokeRoundedRect(-cardW / 2 + 5, -cardH / 2 + 5, cardW - 10, cardH - 10, 12);
    // Köşe süsleri (altın yaldız detayları)
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => {
      cardBg.fillStyle(0xfde047, 0.9);
      cardBg.fillCircle(sx * (cardW / 2 - 10), sy * (cardH / 2 - 10), 2.5);
    });

    const titleTxt = this.add.text(0, -12, `🌀 [${nextFloorNum}. KATA GEÇİŞ PORTALI]`, {
      font: 'bold 14px "Fredoka", sans-serif',
      fill: '#fde047',
      stroke: '#3b0764',
      strokeThickness: 3
    }).setOrigin(0.5);

    const subTxt = this.add.text(0, 12, `${nextSubtitle} • Tıkla ve Işınlan`, {
      font: '11px "Outfit", sans-serif',
      fill: '#f3e8ff'
    }).setOrigin(0.5);

    nextBtnTag.add([cardGlow, cardBg, titleTxt, subTxt]);
    // Varsayılan olarak gizli; sadece portal alanının üzerine gelince görünür.
    nextBtnTag.setAlpha(0);
    nextBtnTag.setScale(0.9);

    // Kartın yumuşak nefes alan ışıltısı
    this.tweens.add({
      targets: cardGlow,
      alpha: { from: 0.35, to: 0.6 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Portal Işık Halkası
    const portalGlow = this.add.circle(portalCoord.x, portalCoord.y, 70, 0xa855f7, 0.45);
    const portalCore = this.add.circle(portalCoord.x, portalCoord.y, 35, 0x38bdf8, 0.75);
    this.tweens.add({
      targets: [portalGlow, portalCore],
      scale: { from: 0.9, to: 1.25 },
      alpha: { from: 0.6, to: 0.2 },
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    portalZone.on('pointerover', () => {
      this.tweens.add({
        targets: nextBtnTag,
        alpha: 1,
        y: hoverY,
        scale: 1,
        duration: 220,
        ease: 'Back.easeOut'
      });
    });

    portalZone.on('pointerout', () => {
      this.tweens.add({
        targets: nextBtnTag,
        alpha: 0,
        y: restY,
        scale: 0.9,
        duration: 150,
        ease: 'Sine.easeIn'
      });
    });

    portalZone.on('pointerup', () => {
      // CRITICAL: Check if ANY modal is currently open - if so, IMMEDIATELY RETURN and ignore click
      const rpgModal = document.getElementById('rpg-modal');
      if (rpgModal && rpgModal.classList.contains('active')) return;

      sound.playPickaxe();
      this.currentPage = pageIndex + 1;
      this.renderCurrentPage();
    });
  }
}
