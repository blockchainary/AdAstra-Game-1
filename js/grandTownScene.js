// AdAstra: Genesis Realm - Grand Kingdom Scene (Kusursuz Tıklama Engelleme & Tam Ekran Motoru)
import { gameState } from './gameState.js';
import { sound } from './audio.js';

export class GrandTownScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GrandTownScene' });
    this.zones = [];
  }

  preload() {
    this.load.image('grand_town_map', 'assets/adastra_grand_town.jpg');
    this.load.image('dungeon_tex_f1', 'assets/dungeon_map.jpg');
    this.load.image('dungeon_tex_f2', 'assets/dungeon_floor2.jpg');
    this.load.image('dungeon_tex_f3', 'assets/dungeon_floor3.jpg');
    this.load.image('dungeon_tex_f4', 'assets/dungeon_floor4.jpg');
    this.load.image('dungeon_tex_f5', 'assets/dungeon_floor5.jpg');
    this.load.image('dungeon_tex_f6', 'assets/dungeon_floor6.jpg');

    this.load.on('progress', (value) => {
      if (window.__updateLoadingBar) window.__updateLoadingBar(30 + value * 60);
    });

    this.load.on('loaderror', (file) => {
      console.error('[Phaser Preload ERROR] Failed to load:', file.key, file.src);
    });

    this.load.on('complete', () => {
      console.log('[Phaser] All assets loaded successfully!');
    });
  }

  create() {
    if (window.__finishLoadingBar) {
      window.__finishLoadingBar();
    }

    const w = this.scale.width || window.innerWidth;
    const h = this.scale.height || window.innerHeight;

    // 1. Arka Plan Haritası - Güvenli Yükleme
    if (this.textures.exists('grand_town_map')) {
      this.map = this.add.image(0, 0, 'grand_town_map').setOrigin(0, 0);
      console.log('[GrandTownScene] Map texture loaded OK');
    } else {
      // Fallback: imaj yoksa koyu arka plan dikdörtgeni çiz
      console.warn('[GrandTownScene] grand_town_map texture not found! Using fallback background.');
      this.add.rectangle(w / 2, h / 2, w, h, 0x1a0f08);
      this.map = { setDisplaySize: () => {} }; // dummy
    }

    // 2. 8 Ana Bölgenin Yüzdesel Koordinatları (Menü butonlarından uzak ve tam bina merkezli)
    this.zoneDefs = [
      // 1. ODUNCU KULÜBESİ & ZÜMRÜT ORMANI (Sol Orta)
      {
        id: 'forest',
        name: '🌲 ZÜMRÜT ORMANI & ODUNCU KULÜBESİ',
        sub: '🪓 Odun & Kereste Toplama',
        px: 0.075,
        py: 0.385,
        pr: 0.070,
        colorHex: '#22c55e'
      },

      // 2. ASKERİ KIŞLA & TALİM KAMPI (Sol Alt)
      {
        id: 'barracks',
        name: '⚔️ ASKERİ KIŞLA & TALİM KAMPI',
        sub: '🛡️ Asker Alma, Okçuluk & Talim',
        px: 0.179,
        py: 0.800,
        pr: 0.100,
        colorHex: '#3b82f6'
      },

      // 3. DAĞ ZİNDAN MAĞARASI (Sol Üst)
      {
        id: 'dungeon',
        name: '💀 DAĞ ZİNDAN MAĞARASI',
        sub: '🔮 Tıkla ve 18 Seviyeli Zindana Gir!',
        px: 0.200,
        py: 0.118,
        pr: 0.065,
        colorHex: '#a855f7',
        flipDown: true
      },

      // 4. DAĞ MADEN OCAĞI (Kuzey)
      {
        id: 'mine',
        name: '⛏️ DAĞ MADEN OCAĞI & DEMİR',
        sub: '💎 Demir ve Değerli Cevherler',
        px: 0.387,
        py: 0.104,
        pr: 0.055,
        colorHex: '#38bdf8',
        flipDown: true
      },

      // 5. KRALLIK TAVERNASI & HAN (Kuzey-Orta)
      {
        id: 'tavern',
        name: '🍺 KRALLIK TAVERNASI & HAN',
        sub: '🍗 Günlük Güçlendirmeler & Dinlenme',
        px: 0.525,
        py: 0.207,
        pr: 0.068,
        colorHex: '#eab308'
      },

      // 6. KRALLIK MEYDANI PAZARI (Tam Merkez)
      {
        id: 'market',
        name: '🏪 KRALLIK MEYDANI PAZARI',
        sub: '🪙 AMM DEX & Ticaret Çadırları',
        px: 0.492,
        py: 0.578,
        pr: 0.115,
        colorHex: '#f97316'
      },

      // 7. BÜYÜK GLADYATÖR KOLEZYUMU (Sağ Alt)
      {
        id: 'colosseum',
        name: '🏟️ BÜYÜK GLADYATÖR KOLEZYUMU',
        sub: '⚔️ Gladyatör Düelloları & Ordu Arenası',
        px: 0.833,
        py: 0.778,
        pr: 0.110,
        colorHex: '#ef4444'
      },

      // 8. GÜNEŞ TARLASI & DEĞİRMEN (Sağ Üst - Menü butonuna taşmayacak şekilde ayarlandı)
      {
        id: 'farm',
        name: '🌾 GÜNEŞ TARLASI & DEĞİRMEN',
        sub: '🥖 Buğday ve Tarım Hasadı',
        px: 0.760,
        py: 0.220,
        pr: 0.075,
        colorHex: '#facc15',
        flipDown: true
      }
    ];

    // 3. Ekranı 100% Doldur & Bölgeleri Oluştur
    this.layoutScreen();

    // 4. Pencere Boyutu Değiştiğinde Otomatik Uyum
    // NOT: this.scale (ScaleManager) sahneler arası paylaşılan/global bir
    // nesnedir. create() her scene.start() çağrısında yeniden çalıştığı için
    // (Phaser aynı sahne örneğini yeniden kullanır), dinleyici shutdown'da
    // temizlenmezse kasaba<->zindan geçişleri arttıkça aynı olay için
    // katlanarak çoğalan dinleyiciler birikir. Bu yüzden referansı saklayıp
    // sahne kapanırken kaldırıyoruz.
    this.resizeHandler = () => this.layoutScreen();
    this.scale.on('resize', this.resizeHandler);

    this.events.once('shutdown', () => {
      this.scale.off('resize', this.resizeHandler);
    });
  }

  layoutScreen() {
    const w = window.innerWidth;
    const h = Math.max(300, window.innerHeight - 56);

    try {
      if (this.scale && (this.scale.width !== w || this.scale.height !== h)) {
        this.scale.resize(w, h);
      }
    } catch(e) {}

    this.cameras.main.setSize(w, h);
    this.cameras.main.setScroll(0, 0);
    this.cameras.main.setZoom(1);

    if (this.map && typeof this.map.setDisplaySize === 'function') {
      this.map.setDisplaySize(w, h);
    }

    // Eski bölgeleri temizle
    this.zones.forEach(z => z.destroy());
    this.zones = [];

    const tooltipEl = document.getElementById('realm-hover-tooltip');
    const titleEl = document.getElementById('realm-tooltip-title');
    const subEl = document.getElementById('realm-tooltip-sub');

    // Yeni ekran boyutuna göre bölgeleri tam yerlerine koy
    this.zoneDefs.forEach(def => {
      const cx = def.px * w;
      const cy = def.py * h;
      const radius = Math.min(def.pr * w, 150);

      const zoneCircle = this.add.circle(cx, cy, radius, 0x000000, 0)
        .setInteractive({ useHandCursor: true });

      const isAnyModalActive = () => {
        const rpgModal = document.getElementById('rpg-modal');
        const devModal = document.getElementById('dev-modal');
        return (rpgModal && rpgModal.classList.contains('active')) ||
               (devModal && !devModal.classList.contains('hidden')) ||
               document.body.classList.contains('modal-open');
      };

      zoneCircle.on('pointerover', (pointer) => {
        if (!tooltipEl || isAnyModalActive()) return;

        // Menü açıksa veya fare menü bölgesindeyse arka plan hoverını engelle
        const sidebar = document.getElementById('realm-sidebar');
        const isSidebarOpen = sidebar && sidebar.classList.contains('open');
        if (isSidebarOpen && pointer.x > w - 380) return;
        if (pointer.y < 70 && (pointer.x > w - 140 || (isSidebarOpen && pointer.x > w - 420))) return;

        const clampedX = Phaser.Math.Clamp(cx, 190, w - 190);

        titleEl.textContent = def.name;
        subEl.textContent = def.sub;
        tooltipEl.style.borderColor = def.colorHex;
        tooltipEl.style.left = `${clampedX}px`;
        tooltipEl.style.top = `${cy}px`;

        if (def.flipDown || cy < 160) {
          tooltipEl.classList.add('flip-down');
        } else {
          tooltipEl.classList.remove('flip-down');
        }

        tooltipEl.classList.remove('hidden');
        tooltipEl.classList.add('visible');
      });

      zoneCircle.on('pointerout', () => {
        if (tooltipEl) {
          tooltipEl.classList.remove('visible');
          tooltipEl.classList.add('hidden');
        }
      });

      zoneCircle.on('pointerup', (pointer) => {
        if (tooltipEl) {
          tooltipEl.classList.remove('visible');
          tooltipEl.classList.add('hidden');
        }

        // CRITICAL: Check if ANY modal is currently open - if so, IMMEDIATELY RETURN and ignore click
        if (isAnyModalActive()) return;

        // KORUMA: Menü açıksa veya fare menü toggle butonuna basıyorsa haritayı ASLA tetikleme
        const sidebar = document.getElementById('realm-sidebar');
        const isSidebarOpen = sidebar && sidebar.classList.contains('open');
        if (isSidebarOpen && pointer.x > w - 380) return;
        if (pointer.y < 75 && (pointer.x > w - 150 || (isSidebarOpen && pointer.x > w - 430))) return;

        sound.playPickaxe();
        if (def.id === 'dungeon') {
          this.scene.start('DungeonScene');
        } else {
          window.dispatchEvent(new CustomEvent('open-town-modal', { detail: { zoneId: def.id, zoneName: def.name } }));
        }
      });

      this.zones.push(zoneCircle);
    });
  }
}
