// AdAstra: Genesis Realm - High-Fidelity Pixiland v2.7.0 Master Asset Generator
// Pixiland'in 1:1 ekran görüntüsündeki tüm grafik katmanlarını piksel hassasiyetiyle
// (gölgeli çam ağaçları, falez/uçurum taşları, buğday tarlası, animasyonlu orak savurma,
// su kuyusu, evler ve tam UI buton setini) oluşturan profesyonel render motoru.

export class HighResPixilandAssets {
  static initAll(scene) {
    this.createWorldTiles(scene);
    this.createCharacterSprites(scene);
    this.createUIElements(scene);
  }

  // =========================================================================
  // 1. DÜNYA KATMANLARI (GÖLGELİ ÇAM AĞAÇLARI, EVLER, BUĞDAY TARLASI, KUYU)
  // =========================================================================
  static createWorldTiles(scene) {
    // A) YUVARLAK KATMANLI ÇAM AĞACI (PIXILAND ROUND SHADED TREE - 64x80)
    const treeC = document.createElement('canvas');
    treeC.width = 72; treeC.height = 92;
    const tCtx = treeC.getContext('2d');
    tCtx.imageSmoothingEnabled = false;

    // Ağaç Altı Oval Yumuşak Gölge
    tCtx.fillStyle = 'rgba(15, 30, 10, 0.45)';
    tCtx.beginPath(); tCtx.ellipse(36, 82, 30, 10, 0, 0, Math.PI * 2); tCtx.fill();

    // Gövde
    tCtx.fillStyle = '#3d1d07'; tCtx.fillRect(32, 58, 8, 26);
    tCtx.fillStyle = '#5c2d0c'; tCtx.fillRect(34, 58, 4, 26);

    // Koyu Yeşil Alt Taç
    tCtx.fillStyle = '#1c4516';
    tCtx.beginPath(); tCtx.arc(36, 56, 30, 0, Math.PI * 2); tCtx.fill();

    // Orta Yeşil Gövde
    tCtx.fillStyle = '#2d6824';
    tCtx.beginPath(); tCtx.arc(36, 44, 26, 0, Math.PI * 2); tCtx.fill();

    // Açık Canlı Yeşil Üst Taç
    tCtx.fillStyle = '#489632';
    tCtx.beginPath(); tCtx.arc(34, 32, 20, 0, Math.PI * 2); tCtx.fill();

    // Işık Alan Parlak Yaprak Öbekleri (Highlight Shading)
    tCtx.fillStyle = '#72c846';
    tCtx.beginPath(); tCtx.arc(28, 22, 12, 0, Math.PI * 2); tCtx.fill();
    tCtx.beginPath(); tCtx.arc(42, 36, 10, 0, Math.PI * 2); tCtx.fill();
    tCtx.fillStyle = '#9fe86a';
    tCtx.fillRect(24, 18, 6, 6);
    tCtx.fillRect(38, 32, 6, 6);

    if (scene.textures.exists('tree_pixi_green')) scene.textures.remove('tree_pixi_green');
    scene.textures.addCanvas('tree_pixi_green', treeC);

    // B) TURUNCU / SONBAHAR AĞACI (AUTUMN TREE)
    const treeAutumn = document.createElement('canvas');
    treeAutumn.width = 72; treeAutumn.height = 92;
    const aCtx = treeAutumn.getContext('2d');
    aCtx.imageSmoothingEnabled = false;
    aCtx.drawImage(treeC, 0, 0);
    // Renk filtresiyle turuncuya boya
    aCtx.globalCompositeOperation = 'hue';
    aCtx.fillStyle = '#ea580c';
    aCtx.fillRect(0, 0, 72, 70);
    if (scene.textures.exists('tree_pixi_autumn')) scene.textures.remove('tree_pixi_autumn');
    scene.textures.addCanvas('tree_pixi_autumn', treeAutumn);

    // C) PİKSEL KÖY EVİ (PIXILAND CABIN WITH BLUE WINDOWS & SMOKESTACK - 110x100)
    const cabinC = document.createElement('canvas');
    cabinC.width = 120; cabinC.height = 110;
    const cCtx = cabinC.getContext('2d');
    cCtx.imageSmoothingEnabled = false;

    // Ev Altı Gölge
    cCtx.fillStyle = 'rgba(10, 20, 5, 0.4)';
    cCtx.beginPath(); cCtx.ellipse(60, 98, 52, 12, 0, 0, Math.PI * 2); cCtx.fill();

    // Taş Temel
    cCtx.fillStyle = '#475569'; cCtx.fillRect(16, 84, 88, 14);
    cCtx.fillStyle = '#64748b'; cCtx.fillRect(18, 86, 84, 10);

    // Ahşap Ön Cephe
    cCtx.fillStyle = '#7c3f15'; cCtx.fillRect(20, 48, 80, 38);
    cCtx.fillStyle = '#9a531e'; cCtx.fillRect(24, 50, 72, 34);

    // Ahşap Tahta Çizgileri
    cCtx.strokeStyle = '#5a2b0c'; cCtx.lineWidth = 2;
    for (let y = 56; y <= 80; y += 8) {
      cCtx.beginPath(); cCtx.moveTo(24, y); cCtx.lineTo(96, y); cCtx.stroke();
    }

    // Koyu Kahverengi Çatı
    cCtx.fillStyle = '#3a1a08';
    cCtx.beginPath();
    cCtx.moveTo(10, 48); cCtx.lineTo(60, 14); cCtx.lineTo(110, 48); cCtx.fill();

    cCtx.fillStyle = '#54260d';
    cCtx.beginPath();
    cCtx.moveTo(14, 48); cCtx.lineTo(60, 18); cCtx.lineTo(106, 48); cCtx.fill();

    // Çatı Kiremit Gölgeleri
    cCtx.strokeStyle = '#3a1a08';
    for (let x = 24; x <= 96; x += 10) {
      cCtx.beginPath(); cCtx.moveTo(x, 48); cCtx.lineTo(60, 18); cCtx.stroke();
    }

    // Kırmızı / Mavi Kapı
    cCtx.fillStyle = '#0284c7'; cCtx.fillRect(32, 60, 18, 24);
    cCtx.fillStyle = '#38bdf8'; cCtx.fillRect(34, 62, 14, 20);
    cCtx.fillStyle = '#facc15'; cCtx.fillRect(44, 70, 3, 3); // Kapı kolu

    // Mavi Camlı Çift Pencere
    cCtx.fillStyle = '#38bdf8'; cCtx.fillRect(66, 56, 16, 14);
    cCtx.strokeStyle = '#0369a1'; cCtx.lineWidth = 2; cCtx.strokeRect(66, 56, 16, 14);
    cCtx.beginPath(); cCtx.moveTo(74, 56); cCtx.lineTo(74, 70); cCtx.stroke();
    cCtx.beginPath(); cCtx.moveTo(66, 63); cCtx.lineTo(82, 63); cCtx.stroke();

    // Çatıdaki Sarı Seviye Rozeti [1]
    cCtx.fillStyle = '#facc15'; cCtx.fillRect(20, 26, 18, 18);
    cCtx.strokeStyle = '#854d0e'; cCtx.lineWidth = 2; cCtx.strokeRect(20, 26, 18, 18);
    cCtx.font = 'bold 11px "Press Start 2P", monospace';
    cCtx.fillStyle = '#713f12'; cCtx.textAlign = 'center';
    cCtx.fillText('1', 29, 39);

    if (scene.textures.exists('tile_pixi_cabin')) scene.textures.remove('tile_pixi_cabin');
    scene.textures.addCanvas('tile_pixi_cabin', cabinC);

    // D) ÇİTLERLE ÇEVRİLİ BUĞDAY TARLASI (FENCED WHEAT FARM - 180x130)
    const farmC = document.createElement('canvas');
    farmC.width = 200; farmC.height = 140;
    const fCtx = farmC.getContext('2d');
    fCtx.imageSmoothingEnabled = false;

    // Toprak Zemin
    fCtx.fillStyle = '#8b5321'; fCtx.fillRect(10, 10, 180, 120);
    fCtx.fillStyle = '#ab6c30'; fCtx.fillRect(14, 14, 172, 112);

    // Sıralı Altın Buğday Başakları (Wheat Rows)
    for (let rx = 24; rx <= 164; rx += 14) {
      for (let ry = 22; ry <= 114; ry += 12) {
        fCtx.fillStyle = '#eab308'; fCtx.fillRect(rx, ry - 4, 6, 10);
        fCtx.fillStyle = '#fef08a'; fCtx.fillRect(rx + 1, ry - 6, 4, 4);
        fCtx.fillStyle = '#ca8a04'; fCtx.fillRect(rx + 2, ry + 2, 2, 4);
      }
    }

    // Ahşap Çitler (Wooden Fences Around Perimeter)
    fCtx.fillStyle = '#5c2d0c';
    // Üst & Alt Çit Hatları
    fCtx.fillRect(6, 6, 188, 5); fCtx.fillRect(6, 12, 188, 5);
    fCtx.fillRect(6, 126, 188, 5); fCtx.fillRect(6, 132, 188, 5);
    // Sol & Sağ Çit Hatları
    fCtx.fillRect(6, 6, 5, 130); fCtx.fillRect(12, 6, 5, 130);
    fCtx.fillRect(182, 6, 5, 130); fCtx.fillRect(188, 6, 5, 130);

    // Çit Direkleri
    fCtx.fillStyle = '#854d0e';
    for (let px = 6; px <= 190; px += 26) {
      fCtx.fillRect(px - 2, 2, 6, 18);
      fCtx.fillRect(px - 2, 122, 6, 18);
    }
    for (let py = 6; py <= 130; py += 24) {
      fCtx.fillRect(2, py - 2, 18, 6);
      fCtx.fillRect(180, py - 2, 18, 6);
    }

    if (scene.textures.exists('tile_pixi_farm')) scene.textures.remove('tile_pixi_farm');
    scene.textures.addCanvas('tile_pixi_farm', farmC);

    // E) TAŞ SU KUYUSU (STONE WATER WELL - 48x54)
    const wellC = document.createElement('canvas');
    wellC.width = 48; wellC.height = 54;
    const wCtx = wellC.getContext('2d');
    wCtx.imageSmoothingEnabled = false;

    // Taş Kuyu Havuzu
    wCtx.fillStyle = '#475569'; wCtx.beginPath(); wCtx.arc(24, 40, 18, 0, Math.PI * 2); wCtx.fill();
    wCtx.fillStyle = '#64748b'; wCtx.beginPath(); wCtx.arc(24, 38, 16, 0, Math.PI * 2); wCtx.fill();
    wCtx.fillStyle = '#0284c7'; wCtx.beginPath(); wCtx.arc(24, 38, 11, 0, Math.PI * 2); wCtx.fill();
    wCtx.fillStyle = '#38bdf8'; wCtx.fillRect(20, 34, 8, 4);

    // Ahşap Çatı Direkleri
    wCtx.fillStyle = '#78350f'; wCtx.fillRect(8, 14, 4, 26); wCtx.fillRect(36, 14, 4, 26);
    // Ahşap Çatı
    wCtx.fillStyle = '#5c2d0c'; wCtx.fillRect(4, 6, 40, 8);
    wCtx.fillStyle = '#854d0e'; wCtx.fillRect(6, 8, 36, 4);

    if (scene.textures.exists('tile_pixi_well')) scene.textures.remove('tile_pixi_well');
    scene.textures.addCanvas('tile_pixi_well', wellC);
  }

  // =========================================================================
  // 2. ANİMASYONLU KARAKTERLER & ORAK SALINIM EFEKTİ
  // =========================================================================
  static createCharacterSprites(scene) {
    // Çiftçi / Orakçı Karakter (Scythe Farmer Swinging 16x24 - 4 Frames)
    const scytheC = document.createElement('canvas');
    scytheC.width = 128; scytheC.height = 32;
    const sCtx = scytheC.getContext('2d');
    sCtx.imageSmoothingEnabled = false;

    for (let f = 0; f < 4; f++) {
      const fx = f * 32;
      const angle = (f * 45) * Math.PI / 180;

      // Gölge
      sCtx.fillStyle = 'rgba(0,0,0,0.3)';
      sCtx.beginPath(); sCtx.ellipse(fx + 16, 28, 8, 4, 0, 0, Math.PI * 2); sCtx.fill();

      // Bacaklar
      sCtx.fillStyle = '#1e293b'; sCtx.fillRect(fx + 13, 20, 3, 8); sCtx.fillRect(fx + 17, 20, 3, 8);

      // Gövde (Turuncu Gömlek)
      sCtx.fillStyle = '#ea580c'; sCtx.fillRect(fx + 12, 12, 9, 9);

      // Kafa & Saç
      sCtx.fillStyle = '#fed7aa'; sCtx.fillRect(fx + 13, 5, 7, 7);
      sCtx.fillStyle = '#451a03'; sCtx.fillRect(fx + 12, 3, 9, 4);

      // Orak Salınımı & Beyaz Hilal Kesme İzi (Arcing White Slash)
      sCtx.save();
      sCtx.translate(fx + 16, 14);
      sCtx.rotate(angle - Math.PI / 4);
      sCtx.fillStyle = '#78350f'; sCtx.fillRect(0, -2, 14, 3); // Sap
      sCtx.fillStyle = '#38bdf8'; sCtx.beginPath(); sCtx.arc(14, -4, 8, 0, Math.PI); sCtx.fill(); // Hilal bıçak
      sCtx.restore();

      // Büyük Beyaz Kesme Efekti (Slash Trail)
      if (f === 2 || f === 3) {
        sCtx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        sCtx.lineWidth = 3;
        sCtx.beginPath();
        sCtx.arc(fx + 16, 12, 16, -Math.PI / 3, Math.PI / 3);
        sCtx.stroke();
      }
    }

    if (scene.textures.exists('char_scythe_farmer')) scene.textures.remove('char_scythe_farmer');
    scene.textures.addSpriteSheet('char_scythe_farmer', scytheC, { frameWidth: 32, frameHeight: 32 });
  }

  // =========================================================================
  // 3. PIXILAND 1:1 UI BUTONLARI & ROZETLER
  // =========================================================================
  static createUIElements(scene) {
    // 3D Sarı / Altın Kare Buton Tabanı (Workers, Bag, Gear, Guild, Map)
    const createBtn = (key, iconDraw, isLarge = false) => {
      const size = isLarge ? 56 : 46;
      const c = document.createElement('canvas');
      c.width = size; c.height = size;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = false;

      // 3D Siyah Dış Kenar
      ctx.fillStyle = '#0c0906'; ctx.fillRect(0, 0, size, size);
      // Koyu Ahşap / Sarı İç Kenar
      ctx.fillStyle = isLarge ? '#f59e0b' : '#78350f'; ctx.fillRect(3, 3, size - 6, size - 6);
      // Buton Yüzeyi
      ctx.fillStyle = isLarge ? '#fbbf24' : '#b45309'; ctx.fillRect(5, 5, size - 10, size - 10);
      ctx.fillStyle = isLarge ? '#fef08a' : '#d97706'; ctx.fillRect(7, 7, size - 14, (size - 14) / 2);

      // İkon Çiz
      ctx.save();
      ctx.translate(size / 2, size / 2);
      iconDraw(ctx);
      ctx.restore();

      if (scene.textures.exists(key)) scene.textures.remove(key);
      scene.textures.addCanvas(key, c);
    };

    // Workers Çekiç İkonu
    createBtn('ui_btn_workers', (ctx) => {
      ctx.fillStyle = '#334155'; ctx.fillRect(-10, -12, 20, 10);
      ctx.fillStyle = '#64748b'; ctx.fillRect(-8, -10, 16, 6);
      ctx.fillStyle = '#78350f'; ctx.fillRect(-3, -2, 6, 16);
    }, true);

    // Çanta İkonu
    createBtn('ui_btn_bag', (ctx) => {
      ctx.fillStyle = '#451a03'; ctx.fillRect(-10, -8, 20, 18);
      ctx.fillStyle = '#78350f'; ctx.fillRect(-8, -6, 16, 14);
      ctx.fillStyle = '#facc15'; ctx.fillRect(-3, -1, 6, 4);
    });

    // Miğfer İkonu
    createBtn('ui_btn_helmet', (ctx) => {
      ctx.fillStyle = '#64748b'; ctx.beginPath(); ctx.arc(0, 0, 10, Math.PI, 0); ctx.fill();
      ctx.fillRect(-10, 0, 20, 8);
      ctx.fillStyle = '#0f172a'; ctx.fillRect(-6, 2, 12, 3);
    });

    // Kilitli Bayrak İkonu
    createBtn('ui_btn_guild', (ctx) => {
      ctx.fillStyle = '#334155'; ctx.fillRect(-8, -10, 16, 20);
      ctx.fillStyle = '#cbd5e1'; ctx.fillRect(-5, -3, 10, 8);
      ctx.fillStyle = '#0f172a'; ctx.fillRect(-2, 0, 4, 3);
    });
  }
}
