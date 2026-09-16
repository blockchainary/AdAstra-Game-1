// AdAstra: Genesis Realm - Grand Kingdom Scene (Kusursuz Tıklama Engelleme & Tam Ekran Motoru)
import { gameState } from './gameState.js';
import { sound } from './audio.js';

export class GrandTownScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GrandTownScene' });
    this.zones = [];
  }

  preload() {
    const v = Date.now();
    this.load.image('grand_town_map', 'assets/adastra_grand_town.jpg?v=' + v);
    // NOT: Bu katlar DungeonScene.preload() içinde de aynı anahtarlarla
    // yükleniyor, ancak Phaser zaten kayıtlı bir texture anahtarını tekrar
    // indirmiyor. Bu yüzden cache-busting sorgu parametresi burada da
    // eklenmeli; aksi halde DungeonScene tarafındaki cache-busting hiç
    // devreye girmez (anahtar zaten burada, sorgusuz olarak kayıtlı olur).
    this.load.image('dungeon_tex_f1', 'assets/dungeon_map.jpg?v=' + v);
    this.load.image('dungeon_tex_f2', 'assets/dungeon_floor2.jpg?v=' + v);
    this.load.image('dungeon_tex_f3', 'assets/dungeon_floor3.jpg?v=' + v);
    this.load.image('dungeon_tex_f4', 'assets/dungeon_floor4.jpg?v=' + v);
    this.load.image('dungeon_tex_f5', 'assets/dungeon_floor5.jpg?v=' + v);
    this.load.image('dungeon_tex_f6', 'assets/dungeon_floor6.jpg?v=' + v);

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

    // 2. Krallık Haritası Bölge Koordinatları (Tüm Görsellerle 100% Milimetrik Senkronize)
    this.zoneDefs = [
      // 1. GÖRSEL (Önceki 1): DAĞ ZİNDAN MAĞARASI (Sol Üst Mor Kristalli Mağara)
      {
        id: 'dungeon',
        name: '💀 DAĞ ZİNDAN MAĞARASI',
        sub: '🔮 Tıkla ve 18 Seviyeli Zindana Gir!',
        px: 0.078,
        py: 0.295,
        pr: 0.055,
        colorHex: '#a855f7'
      },

      // 2. GÖRSEL (Önceki 2): KRALLIK SİLOSU & DEPO (Sol Orta Silolar & Ahşap Depo)
      {
        id: 'warehouse',
        name: '📦 KRALLIK SİLOSU & DEPO',
        sub: '🛡️ Envanter, Hammaddeler & Teçhizat',
        px: 0.105,
        py: 0.550,
        pr: 0.065,
        colorHex: '#fbbf24'
      },

      // 3. GÖRSEL (Önceki 3): ASKERİ KIŞLA & TALİM KAMPI (Sol Alt Surlu Talim Kalesi)
      {
        id: 'barracks',
        name: '⚔️ ASKERİ KIŞLA & TALİM KAMPI',
        sub: '🛡️ Asker Alma, Okçuluk & Ordu Yönetimi',
        px: 0.160,
        py: 0.840,
        pr: 0.090,
        colorHex: '#3b82f6'
      },

      // 4. GÖRSEL (Önceki 4): DAĞ MADEN OCAĞI (Sol Üst Dağ Tepesi Tüneller & Raylar)
      {
        id: 'mine',
        name: '⛏️ DAĞ MADEN OCAĞI & DEMİR',
        sub: '💎 Demir ve Değerli Cevher Seferleri',
        px: 0.275,
        py: 0.185,
        pr: 0.065,
        colorHex: '#38bdf8'
      },

      // 5. GÖRSEL (Önceki 5): DEMİRCİ FIRINI & TAMİRHANE (Şehir İçi Sol Yanan Ocak & Örs)
      {
        id: 'blacksmith',
        name: '⚒️ KRALLIK DEMİRCİSİ & TAMİRHANE',
        sub: '🔥 Silah & Zırh Dövme, Ekipman Onarımı',
        px: 0.275,
        py: 0.515,
        pr: 0.045,
        colorHex: '#f97316'
      },

      // 6. YENİ GÖRSEL 1: KRALLIK MEYDANI PAZARI (Şehir Merkezi Çeşme & Tezgahlar)
      {
        id: 'market',
        name: '🏪 KRALLIK MEYDANI PAZARI',
        sub: '🪙 AMM DEX & Ticaret Çadırları',
        px: 0.380,
        py: 0.535,
        pr: 0.065,
        colorHex: '#e11d48'
      },

      // 7. YENİ GÖRSEL 2: KRALLIK KARNAVALI & SİRK (Şehir İçi Çizgili Sirk Çadırı)
      {
        id: 'carnival',
        name: '🎪 KRALLIK KARNAVALI & SİRK',
        sub: '🎈 Şenlikler, Gösteriler & Sürprizler',
        px: 0.465,
        py: 0.415,
        pr: 0.050,
        colorHex: '#ec4899'
      },

      // 8. YENİ GÖRSEL 3: KRALLIK TAVERNASI & HAN (Şehir İçi Kuzeydoğu İki Katlı Han)
      {
        id: 'tavern',
        name: '🍺 KRALLIK TAVERNASI & HAN',
        sub: '🍗 Günlük Güçlendirmeler & Dinlenme',
        px: 0.585,
        py: 0.275,
        pr: 0.065,
        colorHex: '#eab308'
      },

      // 9. YENİ GÖRSEL 4: BÜYÜK GLADYATÖR KOLEZYUMU (Şehir Sağı Devasa Arena)
      {
        id: 'colosseum',
        name: '🏟️ BÜYÜK GLADYATÖR KOLEZYUMU',
        sub: '⚔️ Gladyatör Düelloları & Ordu Arenası',
        px: 0.745,
        py: 0.535,
        pr: 0.110,
        colorHex: '#ef4444'
      },

      // 10. YENİ GÖRSEL 5: GÜNEŞ TARLASI & DEĞİRMEN (Sağ Taraf Yel Değirmeni & Hasat)
      {
        id: 'farm',
        name: '🌾 GÜNEŞ TARLASI & DEĞİRMEN',
        sub: '🥖 Buğday ve Tarım Hasadı',
        px: 0.945,
        py: 0.540,
        pr: 0.065,
        colorHex: '#facc15'
      },

      // 11. ZÜMRÜT ORMANI & ODUNCU KULÜBESİ (Sağ Üst Çam Ormanı & Kütükler)
      {
        id: 'forest',
        name: '🌲 ZÜMRÜT ORMANI & ODUNCU KULÜBESİ',
        sub: '🪓 Odun & Kereste Toplama',
        px: 0.845,
        py: 0.165,
        pr: 0.070,
        colorHex: '#22c55e'
      },

      // 12. GÖRSEL 1: BÜYÜK SAVAŞ ALANI & CEPHE (Alt Orta Ordu Formasyonları)
      {
        id: 'battlefield',
        name: '⚔️ BÜYÜK SAVAŞ ALANI & CEPHE',
        sub: '🚩 Krallık Orduları Meydan Savaşı',
        px: 0.530,
        py: 0.860,
        pr: 0.120,
        colorHex: '#dc2626'
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
    const h = Math.max(300, window.innerHeight - 92);

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

      const zoneCircle = this.add.circle(cx, cy, radius, 0x000000, 0.001)
        .setInteractive({ cursor: 'pointer', useHandCursor: true });

      const isAnyModalActive = () => {
        const rpgModal = document.getElementById('rpg-modal');
        const devModal = document.getElementById('dev-modal');
        return (rpgModal && rpgModal.classList.contains('active')) ||
               (devModal && !devModal.classList.contains('hidden')) ||
               document.body.classList.contains('modal-open');
      };

      zoneCircle.on('pointerover', (pointer) => {
        if (isAnyModalActive()) return;

        // Menü açıksa veya fare menü bölgesindeyse arka plan hoverını engelle
        const sidebar = document.getElementById('realm-sidebar');
        const isSidebarOpen = sidebar && sidebar.classList.contains('open');
        if (isSidebarOpen && pointer.x > w - 380) return;
        if (pointer.y < 70 && (pointer.x > w - 140 || (isSidebarOpen && pointer.x > w - 420))) return;

        // Fare imlecini el (pointer) yap
        if (this.input) this.input.setDefaultCursor('pointer');
        if (this.game && this.game.canvas) this.game.canvas.style.cursor = 'pointer';

        if (!tooltipEl) return;

        const clampedX = Phaser.Math.Clamp(cx, 190, w - 190);

        // Canvas'ın viewport üzerindeki başlangıcı (Marquee Ticker + Header = 92px)
        const canvasTop = (this.game && this.game.canvas) ? this.game.canvas.getBoundingClientRect().top : 92;

        // dungeon, mine, carnival için yukarıda; forest için ise menünün altında (aşağıda) göster
        const forceAbove = def.id === 'dungeon' || def.id === 'mine' || def.id === 'carnival';
        const isForest = def.id === 'forest';
        const tooltipCy = forceAbove ? Math.max(cy, 110) : (isForest ? cy + 30 : cy);

        titleEl.textContent = def.name;
        subEl.textContent = def.sub;
        tooltipEl.style.borderColor = def.colorHex;
        tooltipEl.style.left = `${clampedX}px`;
        tooltipEl.style.top = `${tooltipCy + canvasTop}px`;

        if (isForest || (!forceAbove && (def.flipDown || cy < 160))) {
          tooltipEl.classList.add('flip-down');
        } else {
          tooltipEl.classList.remove('flip-down');
        }

        tooltipEl.classList.remove('hidden');
        tooltipEl.classList.add('visible');
      });

      zoneCircle.on('pointerout', () => {
        if (this.input) this.input.setDefaultCursor('default');
        if (this.game && this.game.canvas) this.game.canvas.style.cursor = 'default';

        if (tooltipEl) {
          tooltipEl.classList.remove('visible');
          tooltipEl.classList.add('hidden');
        }
      });

      zoneCircle.on('pointerup', (pointer) => {
        if (this.input) this.input.setDefaultCursor('default');
        if (this.game && this.game.canvas) this.game.canvas.style.cursor = 'default';

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
          window.dispatchEvent(new CustomEvent('enter-dungeon-view'));
          this.scene.start('DungeonScene');
        } else {
          window.dispatchEvent(new CustomEvent('open-town-modal', { detail: { zoneId: def.id, zoneName: def.name } }));
        }
      });

      this.zones.push(zoneCircle);
    });
  }
}
