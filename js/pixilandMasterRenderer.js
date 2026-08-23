// AdAstra: Genesis Realm - Master Pixel Art Tileset & Shading Engine (1:1 Pixiland Fidelity)
// Bu modül Pixiland v2.7.0'ın el çizimi zenginliğini, falez katmanlarını,
// çok katmanlı çam ağaçlarını, çitleri ve mikro detayları piksel piksel render eder.

export class PixilandMasterRenderer {
  static createMasterAssets(scene) {
    this.createGrassAndFlora(scene);
    this.createLayeredTrees(scene);
    this.createMasterCabin(scene);
    this.createMasterWheatFarm(scene);
    this.createCliffsAndWater(scene);
    this.createAnimatedFarmer(scene);
    this.createMasterUIElements(scene);
  }

  // =========================================================================
  // 1. ÇİMEN, TOPRAK VE ÇİÇEK/MANTAR DETAYLARI
  // =========================================================================
  static createGrassAndFlora(scene) {
    // Çiçek ve Mantar Dekoru (Kırmızı Lale, Papatya, Mantar)
    const floraC = document.createElement('canvas');
    floraC.width = 48; floraC.height = 16;
    const ctx = floraC.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    // Kırmızı Çiçekler (0-16)
    ctx.fillStyle = '#ef4444'; ctx.fillRect(4, 4, 3, 3); ctx.fillRect(10, 6, 3, 3);
    ctx.fillStyle = '#fef08a'; ctx.fillRect(5, 5, 1, 1); ctx.fillRect(11, 7, 1, 1);
    ctx.fillStyle = '#16a34a'; ctx.fillRect(5, 7, 1, 3); ctx.fillRect(11, 9, 1, 3);

    // Beyaz Papatyalar (16-32)
    ctx.fillStyle = '#f8fafc'; ctx.fillRect(20, 5, 4, 4); ctx.fillRect(26, 8, 3, 3);
    ctx.fillStyle = '#facc15'; ctx.fillRect(21, 6, 2, 2); ctx.fillRect(27, 9, 1, 1);
    ctx.fillStyle = '#16a34a'; ctx.fillRect(21, 9, 1, 3);

    // Mantarlar (32-48)
    ctx.fillStyle = '#dc2626'; ctx.fillRect(36, 4, 6, 4); ctx.fillRect(43, 7, 4, 3);
    ctx.fillStyle = '#f8fafc'; ctx.fillRect(38, 5, 1, 1); ctx.fillRect(40, 5, 1, 1);
    ctx.fillStyle = '#fed7aa'; ctx.fillRect(38, 8, 2, 4); ctx.fillRect(44, 10, 2, 3);

    if (scene.textures.exists('deco_flora')) scene.textures.remove('deco_flora');
    scene.textures.addCanvas('deco_flora', floraC);
  }

  // =========================================================================
  // 2. ÇOK KATMANLI GÖLGELİ ÇAM VE SONBAHAR AĞAÇLARI
  // =========================================================================
  static createLayeredTrees(scene) {
    // 84x104 Yüksek Çözünürlüklü Pixiland Çam Ağacı
    const createTree = (key, baseColor, midColor, lightColor, highlight) => {
      const c = document.createElement('canvas');
      c.width = 84; c.height = 104;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = false;

      // 1. Zemin Yumuşak Oval Gölgesi
      ctx.fillStyle = 'rgba(12, 24, 8, 0.45)';
      ctx.beginPath(); ctx.ellipse(42, 92, 34, 10, 0, 0, Math.PI * 2); ctx.fill();

      // 2. Ahşap Gövde & Doku
      ctx.fillStyle = '#2e1505'; ctx.fillRect(38, 64, 8, 30);
      ctx.fillStyle = '#4a250b'; ctx.fillRect(40, 64, 4, 30);

      // 3. Alt Katman Koyu Taç
      ctx.fillStyle = baseColor;
      ctx.beginPath(); ctx.arc(42, 62, 34, 0, Math.PI * 2); ctx.fill();

      // 4. Orta Katman
      ctx.fillStyle = midColor;
      ctx.beginPath(); ctx.arc(42, 48, 28, 0, Math.PI * 2); ctx.fill();

      // 5. Üst Katman
      ctx.fillStyle = lightColor;
      ctx.beginPath(); ctx.arc(40, 34, 22, 0, Math.PI * 2); ctx.fill();

      // 6. Işık Alan Detay Öbekleri (Highlights)
      ctx.fillStyle = highlight;
      ctx.beginPath(); ctx.arc(32, 22, 12, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(48, 38, 10, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(28, 48, 10, 0, Math.PI * 2); ctx.fill();

      // En Üst Parlak Piksel Vurguları
      ctx.fillStyle = '#d9f99d';
      if (key.includes('autumn')) ctx.fillStyle = '#fed7aa';
      ctx.fillRect(28, 16, 6, 6);
      ctx.fillRect(44, 32, 6, 6);

      if (scene.textures.exists(key)) scene.textures.remove(key);
      scene.textures.addCanvas(key, c);
    };

    // Yeşil Çam Ağacı
    createTree('master_tree_green', '#15380f', '#255e1b', '#3b8627', '#62b53b');
    // Koyu Orman Çamı
    createTree('master_tree_dark', '#0f290b', '#1a4713', '#2a6a1e', '#489c33');
    // Turuncu Sonbahar Ağacı
    createTree('master_tree_autumn', '#4a1506', '#872b0c', '#c2410c', '#f97316');
  }

  // =========================================================================
  // 3. MASTER KÖY EVİ (BLUE WINDOWS, SHINGLE ROOF, BARREL & WATER BUCKET)
  // =========================================================================
  static createMasterCabin(scene) {
    const c = document.createElement('canvas');
    c.width = 130; c.height = 120;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    // Gölge
    ctx.fillStyle = 'rgba(10, 20, 5, 0.45)';
    ctx.beginPath(); ctx.ellipse(65, 106, 56, 12, 0, 0, Math.PI * 2); ctx.fill();

    // Taş Temel
    ctx.fillStyle = '#334155'; ctx.fillRect(16, 90, 96, 16);
    ctx.fillStyle = '#64748b'; ctx.fillRect(18, 92, 92, 12);

    // Ahşap Duvarlar (Kütük Dokusu)
    ctx.fillStyle = '#68330e'; ctx.fillRect(20, 52, 88, 40);
    ctx.fillStyle = '#8f4714'; ctx.fillRect(24, 54, 80, 36);

    ctx.strokeStyle = '#4a2208'; ctx.lineWidth = 2;
    for (let y = 62; y <= 86; y += 8) {
      ctx.beginPath(); ctx.moveTo(24, y); ctx.lineTo(104, y); ctx.stroke();
    }

    // Shingle Kiremit Çatı
    ctx.fillStyle = '#2c1204';
    ctx.beginPath(); ctx.moveTo(8, 52); ctx.lineTo(65, 14); ctx.lineTo(122, 52); ctx.fill();

    ctx.fillStyle = '#4d2007';
    ctx.beginPath(); ctx.moveTo(12, 52); ctx.lineTo(65, 18); ctx.lineTo(118, 52); ctx.fill();

    // Çatı Kiremit Çizgileri
    ctx.strokeStyle = '#2c1204';
    for (let x = 20; x <= 110; x += 10) {
      ctx.beginPath(); ctx.moveTo(x, 52); ctx.lineTo(65, 18); ctx.stroke();
    }

    // Taş Baca
    ctx.fillStyle = '#334155'; ctx.fillRect(86, 18, 14, 22);
    ctx.fillStyle = '#64748b'; ctx.fillRect(88, 16, 10, 4);

    // Mavi Camlı Pencereler
    ctx.fillStyle = '#0284c7'; ctx.fillRect(30, 62, 18, 16);
    ctx.fillStyle = '#38bdf8'; ctx.fillRect(32, 64, 14, 12);
    ctx.fillStyle = '#0284c7'; ctx.fillRect(78, 62, 18, 16);
    ctx.fillStyle = '#38bdf8'; ctx.fillRect(80, 64, 14, 12);

    // Ahşap Kapı
    ctx.fillStyle = '#2c1204'; ctx.fillRect(54, 66, 18, 26);
    ctx.fillStyle = '#d97706'; ctx.fillRect(56, 68, 14, 24);
    ctx.fillStyle = '#fef08a'; ctx.fillRect(66, 78, 3, 3); // Kapı kolu

    // Seviye [1] Rozeti
    ctx.fillStyle = '#facc15'; ctx.fillRect(20, 26, 20, 20);
    ctx.strokeStyle = '#713f12'; ctx.lineWidth = 2; ctx.strokeRect(20, 26, 20, 20);
    ctx.font = 'bold 11px "Press Start 2P", monospace';
    ctx.fillStyle = '#451a03'; ctx.textAlign = 'center';
    ctx.fillText('1', 30, 41);

    if (scene.textures.exists('master_cabin')) scene.textures.remove('master_cabin');
    scene.textures.addCanvas('master_cabin', c);
  }

  // =========================================================================
  // 4. MASTER BUĞDAY TARLASI (HASAT EDİLMİŞ & DOLU BUĞDAY DESENİ)
  // =========================================================================
  static createMasterWheatFarm(scene) {
    const c = document.createElement('canvas');
    c.width = 220; c.height = 150;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    // Toprak Zemin
    ctx.fillStyle = '#783e15'; ctx.fillRect(10, 10, 200, 130);
    ctx.fillStyle = '#9e5520'; ctx.fillRect(14, 14, 192, 122);

    // Sıralı Buğday Başakları ve Hasat Edilmiş Saplar
    for (let rx = 24; rx <= 184; rx += 14) {
      for (let ry = 24; ry <= 124; ry += 12) {
        if ((rx + ry) % 28 === 0) {
          // Kesilmiş Buğday Sapı (Stubble)
          ctx.fillStyle = '#783e15'; ctx.fillRect(rx, ry + 2, 6, 4);
          ctx.fillStyle = '#ca8a04'; ctx.fillRect(rx + 1, ry + 1, 4, 3);
        } else {
          // Dolgun Altın Buğday
          ctx.fillStyle = '#ca8a04'; ctx.fillRect(rx, ry - 2, 6, 8);
          ctx.fillStyle = '#eab308'; ctx.fillRect(rx + 1, ry - 6, 5, 6);
          ctx.fillStyle = '#fef08a'; ctx.fillRect(rx + 2, ry - 8, 3, 3);
        }
      }
    }

    // Ahşap Çitler
    ctx.fillStyle = '#4a250b';
    ctx.fillRect(8, 8, 204, 5); ctx.fillRect(8, 14, 204, 5);
    ctx.fillRect(8, 134, 204, 5); ctx.fillRect(8, 140, 204, 5);
    ctx.fillRect(8, 8, 5, 136); ctx.fillRect(14, 8, 5, 136);
    ctx.fillRect(202, 8, 5, 136); ctx.fillRect(208, 8, 5, 136);

    // Çit Direkleri
    ctx.fillStyle = '#6b3710';
    for (let px = 8; px <= 210; px += 28) {
      ctx.fillRect(px - 2, 4, 6, 18);
      ctx.fillRect(px - 2, 130, 6, 18);
    }
    for (let py = 8; py <= 140; py += 26) {
      ctx.fillRect(4, py - 2, 18, 6);
      ctx.fillRect(200, py - 2, 18, 6);
    }

    if (scene.textures.exists('master_farm')) scene.textures.remove('master_farm');
    scene.textures.addCanvas('master_farm', c);
  }

  // =========================================================================
  // 5. FALEZ TAŞLARI, TAŞ OCAĞI VE NİLÜFERLİ SU HAVUZU
  // =========================================================================
  static createCliffsAndWater(scene) {
    // Nilüferli Su Havuzu Dokusu
    const waterC = document.createElement('canvas');
    waterC.width = 90; waterC.height = 180;
    const wCtx = waterC.getContext('2d');
    wCtx.imageSmoothingEnabled = false;

    // Taş Kıyı Kenarları
    wCtx.fillStyle = '#334155'; wCtx.fillRect(0, 0, 90, 180);
    wCtx.fillStyle = '#64748b'; wCtx.fillRect(4, 4, 82, 172);

    // Derin Su & Açık Mavi Yüzey
    wCtx.fillStyle = '#0284c7'; wCtx.fillRect(8, 8, 74, 164);
    wCtx.fillStyle = '#38bdf8'; wCtx.fillRect(14, 14, 62, 152);

    // Nilüfer Yaprakları & Pembe Çiçek
    wCtx.fillStyle = '#16a34a';
    wCtx.beginPath(); wCtx.arc(32, 40, 12, 0, Math.PI * 2); wCtx.fill();
    wCtx.beginPath(); wCtx.arc(54, 100, 14, 0, Math.PI * 2); wCtx.fill();

    wCtx.fillStyle = '#f472b6';
    wCtx.fillRect(52, 96, 6, 6);
    wCtx.fillStyle = '#fdf2f8';
    wCtx.fillRect(54, 98, 2, 2);

    if (scene.textures.exists('master_pond')) scene.textures.remove('master_pond');
    scene.textures.addCanvas('master_pond', waterC);
  }

  // =========================================================================
  // 6. ANİMASYONLU ORAKÇI & HİLAL KESME EFEKTİ
  // =========================================================================
  static createAnimatedFarmer(scene) {
    const scytheC = document.createElement('canvas');
    scytheC.width = 160; scytheC.height = 40;
    const sCtx = scytheC.getContext('2d');
    sCtx.imageSmoothingEnabled = false;

    for (let f = 0; f < 4; f++) {
      const fx = f * 40;
      const angle = (f * 50) * Math.PI / 180;

      // Gölge
      sCtx.fillStyle = 'rgba(0,0,0,0.35)';
      sCtx.beginPath(); sCtx.ellipse(fx + 20, 35, 10, 4, 0, 0, Math.PI * 2); sCtx.fill();

      // Bacaklar
      sCtx.fillStyle = '#1e293b'; sCtx.fillRect(fx + 16, 26, 3, 9); sCtx.fillRect(fx + 21, 26, 3, 9);

      // Gövde (Turuncu/Kahve Gömlek)
      sCtx.fillStyle = '#ea580c'; sCtx.fillRect(fx + 15, 16, 10, 11);

      // Kafa & Saç
      sCtx.fillStyle = '#fed7aa'; sCtx.fillRect(fx + 16, 7, 8, 9);
      sCtx.fillStyle = '#451a03'; sCtx.fillRect(fx + 15, 5, 10, 4);

      // Tırpan (Scythe)
      sCtx.save();
      sCtx.translate(fx + 20, 18);
      sCtx.rotate(angle - Math.PI / 3);
      sCtx.fillStyle = '#78350f'; sCtx.fillRect(0, -2, 18, 3);
      sCtx.fillStyle = '#e2e8f0'; sCtx.beginPath(); sCtx.arc(18, -4, 10, 0, Math.PI); sCtx.fill();
      sCtx.restore();

      // Parlak Beyaz Kesme İzi (Slash Arc)
      if (f === 2 || f === 3) {
        sCtx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        sCtx.lineWidth = 3;
        sCtx.beginPath();
        sCtx.arc(fx + 20, 16, 20, -Math.PI / 3, Math.PI / 3);
        sCtx.stroke();
      }
    }

    if (scene.textures.exists('master_scythe_farmer')) scene.textures.remove('master_scythe_farmer');
    scene.textures.addSpriteSheet('master_scythe_farmer', scytheC, { frameWidth: 40, frameHeight: 40 });
  }

  // =========================================================================
  // 7. MASTER UI BUTONLARI & ROZETLER
  // =========================================================================
  static createMasterUIElements(scene) {
    // Workers Butonu
    const wC = document.createElement('canvas');
    wC.width = 64; wC.height = 64;
    const wCtx = wC.getContext('2d');
    wCtx.imageSmoothingEnabled = false;

    wCtx.fillStyle = '#0c0906'; wCtx.fillRect(0, 0, 64, 64);
    wCtx.fillStyle = '#f59e0b'; wCtx.fillRect(3, 3, 58, 58);
    wCtx.fillStyle = '#fbbf24'; wCtx.fillRect(5, 5, 54, 54);
    wCtx.fillStyle = '#fef08a'; wCtx.fillRect(7, 7, 50, 26);

    // Çekiç & Örs İkonu
    wCtx.fillStyle = '#334155'; wCtx.fillRect(18, 16, 28, 14);
    wCtx.fillStyle = '#64748b'; wCtx.fillRect(22, 18, 20, 10);
    wCtx.fillStyle = '#78350f'; wCtx.fillRect(29, 28, 6, 22);

    if (scene.textures.exists('master_btn_workers')) scene.textures.remove('master_btn_workers');
    scene.textures.addCanvas('master_btn_workers', wC);
  }
}
