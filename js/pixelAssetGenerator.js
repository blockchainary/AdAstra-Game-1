// AdAstra: Genesis Realm - Profesyonel Piksel Asset & Spritesheet Üreteci
// Bu modül Phaser 3 için yüksek kaliteli 16-bit / 32-bit el çizimi standartlarında
// Retina-ready piksel dokuları ve animasyonlu sprite sheet'leri oluşturur.

export class PixelAssetGenerator {
  static createAllTextures(scene) {
    this.createHeroSpritesheet(scene);
    this.createWorkerSpritesheets(scene);
    this.createWorldTileset(scene);
    this.createItemIcons(scene);
    this.createUIElements(scene);
  }

  // 1. ANİMASYONLU KAHRAMAN SPRITESHEET (16x24 frame, 4 yön ve aksiyon)
  static createHeroSpritesheet(scene) {
    const canvas = document.createElement('canvas');
    canvas.width = 128; // 8 frame (16px her biri)
    canvas.height = 48; // 2 satır (Idle & Walk/Attack)
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    // 8 Frame Çiz: 0-3 Idle, 4-7 Walk
    for (let f = 0; f < 8; f++) {
      const fx = f * 16;
      const bounce = (f >= 4) ? (f % 2 === 0 ? 1 : 0) : ((f % 2 === 0) ? 0 : 1);

      // Gölge
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(fx + 3, 21, 10, 3);

      // Pelerin (Mavi / Altın kenarlı)
      ctx.fillStyle = '#1d4ed8';
      ctx.fillRect(fx + 2, 8 + bounce, 12, 11);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(fx + 2, 17 + bounce, 12, 2);

      // Bacaklar / Zırh
      ctx.fillStyle = '#334155';
      if (f >= 4 && f % 2 === 0) {
        ctx.fillRect(fx + 4, 16 + bounce, 3, 6);
        ctx.fillRect(fx + 9, 14 + bounce, 3, 6);
      } else {
        ctx.fillRect(fx + 4, 15 + bounce, 3, 6);
        ctx.fillRect(fx + 9, 15 + bounce, 3, 6);
      }

      // Göğüs Zırhı
      ctx.fillStyle = '#64748b';
      ctx.fillRect(fx + 4, 7 + bounce, 8, 8);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(fx + 5, 8 + bounce, 6, 4);

      // Miğfer & Kafa
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(fx + 4, 1 + bounce, 8, 7);
      ctx.fillStyle = '#0f172a'; // Vizör
      ctx.fillRect(fx + 5, 4 + bounce, 6, 2);

      // Miğfer Kırmızı Tüyü (Plume)
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(fx + 6, bounce, 4, 3);

      // AdAstra Kılıcı (Sırtında)
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(fx + 12, 4 + bounce, 2, 10);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(fx + 11, 7 + bounce, 4, 2);
    }

    if (scene.textures.exists('hero_spritesheet')) {
      scene.textures.remove('hero_spritesheet');
    }
    scene.textures.addSpriteSheet('hero_spritesheet', canvas, {
      frameWidth: 16,
      frameHeight: 24
    });
  }

  // 2. MADENCİ & ODUNCU İŞÇİ SPRITESHEETLERİ
  static createWorkerSpritesheets(scene) {
    const roles = [
      { key: 'miner_sprite', shirt: '#ea580c', hair: '#78350f', tool: 'pickaxe', toolColor: '#94a3b8' },
      { key: 'lumberjack_sprite', shirt: '#dc2626', hair: '#451a03', tool: 'axe', toolColor: '#d97706' },
      { key: 'farmer_sprite', shirt: '#16a34a', hair: '#b45309', tool: 'sickle', toolColor: '#cbd5e1' },
      { key: 'mage_sprite', shirt: '#9333ea', hair: '#fef08a', tool: 'staff', toolColor: '#c084fc' }
    ];

    roles.forEach(role => {
      const canvas = document.createElement('canvas');
      canvas.width = 64; // 4 frame aksiyon
      canvas.height = 24;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;

      for (let f = 0; f < 4; f++) {
        const fx = f * 16;
        const swing = f * 2;

        // Bacaklar
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(fx + 4, 16, 3, 6);
        ctx.fillRect(fx + 9, 16, 3, 6);

        // Gövde
        ctx.fillStyle = role.shirt;
        ctx.fillRect(fx + 4, 8, 8, 8);

        // Kafa
        ctx.fillStyle = '#fed7aa';
        ctx.fillRect(fx + 5, 2, 6, 6);
        ctx.fillStyle = role.hair;
        ctx.fillRect(fx + 4, 1, 8, 3);

        // Tool Vurma Animasyonu
        ctx.fillStyle = '#78350f';
        ctx.fillRect(fx + 10 - swing, 6 + swing, 2, 8);
        ctx.fillStyle = role.toolColor;
        ctx.fillRect(fx + 9 - swing, 4 + swing, 6, 3);
      }

      if (scene.textures.exists(role.key)) scene.textures.remove(role.key);
      scene.textures.addSpriteSheet(role.key, canvas, { frameWidth: 16, frameHeight: 24 });
    });
  }

  // 3. DÜNYA TILESETLERİ (Binalar, Ağaçlar, Köprü, Su, Çitler)
  static createWorldTileset(scene) {
    // Çam Ağacı Dokusu
    const treeCanvas = document.createElement('canvas');
    treeCanvas.width = 64;
    treeCanvas.height = 80;
    const tCtx = treeCanvas.getContext('2d');
    tCtx.imageSmoothingEnabled = false;

    // Ağaç Gövdesi
    tCtx.fillStyle = '#451a03';
    tCtx.fillRect(28, 50, 8, 26);

    // Ağaç Katmanları (Pixiland Tarzı Koyu & Açık Yeşil)
    tCtx.fillStyle = '#1e3a12';
    tCtx.beginPath(); tCtx.arc(32, 52, 26, 0, Math.PI * 2); tCtx.fill();
    tCtx.fillStyle = '#2f5e1c';
    tCtx.beginPath(); tCtx.arc(32, 42, 22, 0, Math.PI * 2); tCtx.fill();
    tCtx.fillStyle = '#4d8a2a';
    tCtx.beginPath(); tCtx.arc(30, 32, 18, 0, Math.PI * 2); tCtx.fill();
    tCtx.fillStyle = '#71b83a';
    tCtx.beginPath(); tCtx.arc(28, 22, 12, 0, Math.PI * 2); tCtx.fill();

    if (scene.textures.exists('tile_tree')) scene.textures.remove('tile_tree');
    scene.textures.addCanvas('tile_tree', treeCanvas);

    // Ortaçağ Köy Evi Dokusu
    const cabinCanvas = document.createElement('canvas');
    cabinCanvas.width = 96;
    cabinCanvas.height = 96;
    const cCtx = cabinCanvas.getContext('2d');
    cCtx.imageSmoothingEnabled = false;

    // Ahşap Gövde
    cCtx.fillStyle = '#3d1c06';
    cCtx.fillRect(16, 44, 64, 48);
    cCtx.fillStyle = '#6b330c';
    cCtx.fillRect(20, 48, 56, 40);

    // Kiremit / Tahta Çatı
    cCtx.fillStyle = '#541f08';
    cCtx.beginPath();
    cCtx.moveTo(8, 44);
    cCtx.lineTo(48, 12);
    cCtx.lineTo(88, 44);
    cCtx.fill();

    cCtx.fillStyle = '#80330f';
    cCtx.beginPath();
    cCtx.moveTo(12, 44);
    cCtx.lineTo(48, 16);
    cCtx.lineTo(84, 44);
    cCtx.fill();

    // Kapı & Işıklı Pencere
    cCtx.fillStyle = '#241004';
    cCtx.fillRect(40, 64, 16, 24);
    cCtx.fillStyle = '#fef08a';
    cCtx.fillRect(24, 56, 10, 10);
    cCtx.fillRect(62, 56, 10, 10);

    if (scene.textures.exists('tile_cabin')) scene.textures.remove('tile_cabin');
    scene.textures.addCanvas('tile_cabin', cabinCanvas);
  }

  // 4. EŞYA & KAYNAK İKONLARI (32x32)
  static createItemIcons(scene) {
    const items = [
      { key: 'icon_axe', draw: (ctx) => {
        ctx.fillStyle = '#78350f'; ctx.fillRect(8, 14, 16, 4);
        ctx.fillStyle = '#94a3b8'; ctx.fillRect(20, 8, 8, 12);
        ctx.fillStyle = '#f8fafc'; ctx.fillRect(26, 8, 2, 12);
      }},
      { key: 'icon_pickaxe', draw: (ctx) => {
        ctx.fillStyle = '#78350f'; ctx.fillRect(14, 14, 4, 14);
        ctx.fillStyle = '#94a3b8'; ctx.fillRect(6, 8, 20, 6);
        ctx.fillStyle = '#38bdf8'; ctx.fillRect(8, 8, 4, 4);
      }},
      { key: 'icon_wood', draw: (ctx) => {
        ctx.fillStyle = '#5c2b0c'; ctx.fillRect(6, 10, 20, 12);
        ctx.fillStyle = '#d97706'; ctx.beginPath(); ctx.arc(24, 16, 5, 0, Math.PI * 2); ctx.fill();
      }},
      { key: 'icon_iron', draw: (ctx) => {
        ctx.fillStyle = '#475569'; ctx.fillRect(6, 12, 18, 14);
        ctx.fillStyle = '#94a3b8'; ctx.fillRect(10, 8, 12, 10);
        ctx.fillStyle = '#f1f5f9'; ctx.fillRect(12, 10, 4, 4);
      }},
      { key: 'icon_crystal', draw: (ctx) => {
        ctx.fillStyle = '#7e22ce'; ctx.beginPath(); ctx.moveTo(16, 4); ctx.lineTo(26, 16); ctx.lineTo(16, 28); ctx.lineTo(6, 16); ctx.fill();
        ctx.fillStyle = '#c084fc'; ctx.beginPath(); ctx.moveTo(16, 6); ctx.lineTo(23, 16); ctx.lineTo(16, 25); ctx.lineTo(9, 16); ctx.fill();
        ctx.fillStyle = '#f3e8ff'; ctx.fillRect(14, 10, 4, 8);
      }}
    ];

    items.forEach(item => {
      const canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      item.draw(ctx);

      if (scene.textures.exists(item.key)) scene.textures.remove(item.key);
      scene.textures.addCanvas(item.key, canvas);
    });
  }

  // 5. 9-SLICE UI ÇERÇEVE DOKULARI
  static createUIElements(scene) {
    const frameCanvas = document.createElement('canvas');
    frameCanvas.width = 48;
    frameCanvas.height = 48;
    const ctx = frameCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    // Altın Ahşap 9-Slice Çerçeve
    ctx.fillStyle = '#1c150c';
    ctx.fillRect(4, 4, 40, 40);
    ctx.strokeStyle = '#fbb019';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, 44, 44);

    // 4 Köşe Yakut Mücevherler
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(0, 0, 8, 8);
    ctx.fillRect(40, 0, 8, 8);
    ctx.fillRect(0, 40, 8, 8);
    ctx.fillRect(40, 40, 8, 8);

    if (scene.textures.exists('dfk_frame_texture')) scene.textures.remove('dfk_frame_texture');
    scene.textures.addCanvas('dfk_frame_texture', frameCanvas);
  }
}
