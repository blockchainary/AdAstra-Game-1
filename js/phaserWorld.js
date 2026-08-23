// AdAstra: Genesis Realm - Master 1:1 Pixiland AAA Phaser Scene
import { HighResPixilandAssets } from './highResPixilandAssets.js';
import { PixelAssetGenerator } from './pixelAssetGenerator.js';
import { PixilandMasterRenderer } from './pixilandMasterRenderer.js';
import { gameState } from './gameState.js';
import { globalPool } from './globalPool.js';

export class PixilandPhaserScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PixilandPhaserScene' });
  }

  preload() {
    // Master 1:1 Pixel Art Dünya Haritasını Yükle
    this.load.image('pixiland_master_map', 'assets/pixiland_world.jpg');

    // UI & Karakter Dokuları
    HighResPixilandAssets.initAll(this);
    PixelAssetGenerator.createAllTextures(this);
    PixilandMasterRenderer.createMasterAssets(this);
  }

  create() {
    // 1. Master Piksel Harita Arka Planı
    const map = this.add.image(800, 450, 'pixiland_master_map');
    map.setDisplaySize(1600, 900);

    // 2. Canlı Animasyonlu Karakterler (Orakçı, Oduncu, Şövalye)
    this.createAnimatedCharacters();

    // 3. Gerçek Zamanlı Parçacık Sistemleri (Baca Dumanı, Su Kıvılcımları)
    this.createLiveParticleSystems();

    // 4. Sefer Gösterge Baloncukları (+66/min, +21/min)
    this.createProductionBubbles();

    // 5. İnteraktif Tıklama Alanları
    this.createInteractiveClickZones();

    // 6. Pixiland 1:1 Master Oyun Arayüzü (HUD)
    this.createPixilandHUD();

    // Kamera
    this.cameras.main.fadeIn(500, 0, 0, 0);
  }

  // =========================================================================
  // 1. ANİMASYONLU KARAKTERLER (ORAKÇI & ODUNCU)
  // =========================================================================
  createAnimatedCharacters() {
    // Tarlada Orak Sallayan Çiftçi (Tarlanın Tam Ortası)
    this.anims.create({
      key: 'farmer_scythe_swing',
      frames: this.anims.generateFrameNumbers('master_scythe_farmer', { start: 0, end: 3 }),
      frameRate: 4,
      repeat: -1
    });

    this.scytheFarmer = this.add.sprite(815, 430, 'master_scythe_farmer').setScale(2.1);
    this.scytheFarmer.play('farmer_scythe_swing');

    // Sağ Üst Kulübe Yanında Balta Vuran Oduncu
    this.lumberjack = this.add.sprite(1320, 290, 'master_scythe_farmer').setScale(2.0);
    this.lumberjack.play('farmer_scythe_swing');

    // Patikada Gezen AlphAvax Şövalyesi
    this.wanderer = this.add.sprite(1050, 480, 'hero_spritesheet').setScale(2.4);
    this.wanderer.play('hero_walk');

    this.tweens.add({
      targets: this.wanderer,
      x: 1250,
      duration: 5000,
      yoyo: true,
      repeat: -1,
      onYoyo: () => { this.wanderer.setFlipX(true); },
      onRepeat: () => { this.wanderer.setFlipX(false); }
    });
  }

  // =========================================================================
  // 2. PARÇACIK SİSTEMLERİ (BACA DUMANI, SU IŞILTILARI)
  // =========================================================================
  createLiveParticleSystems() {
    // 1. Baca Dumanları (Evlerin Bacalarından Yükselen Dumanlar)
    const chimneys = [
      { x: 580, y: 100 },
      { x: 1475, y: 195 },
      { x: 1315, y: 645 }
    ];

    chimneys.forEach(ch => {
      this.add.particles(ch.x, ch.y, 'particle_smoke', {
        speedY: { min: -25, max: -45 },
        speedX: { min: -6, max: 6 },
        scale: { start: 0.8, end: 2.0 },
        alpha: { start: 0.75, end: 0 },
        lifespan: 2200,
        frequency: 280
      });
    });

    // 2. Şelale ve Gölet Su Parıltıları
    this.add.particles(220, 520, 'particle_crystal', {
      speedX: { min: -15, max: 15 },
      speedY: { min: -10, max: 10 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 0.9, end: 0 },
      lifespan: 800,
      frequency: 150
    });
  }

  // =========================================================================
  // 3. ÜRETİM GÖSTERGE BALONCUKLARI (+66/min, +21/min)
  // =========================================================================
  createProductionBubbles() {
    // 1. Tarladaki Buğday Baloncuğu
    const wBox = this.add.container(815, 305);
    const bg1 = this.add.rectangle(0, 0, 130, 40, 0x1a120b, 0.95)
      .setStrokeStyle(2, 0xfacc15);
    const ic1 = this.add.text(-50, -10, '🌾', { fontSize: '18px' });
    const tx1 = this.add.text(-24, -10, '0', { font: 'bold 12px "Press Start 2P"', fill: '#ffffff' });
    const sb1 = this.add.text(-24, 3, '+66/min', { font: '9px "Silkscreen"', fill: '#22c55e' });
    wBox.add([bg1, ic1, tx1, sb1]);

    this.tweens.add({
      targets: wBox,
      y: 298,
      duration: 1500,
      yoyo: true,
      repeat: -1
    });

    // 2. Oduncu Kulübesindeki Odun Baloncuğu
    const lBox = this.add.container(1420, 160);
    const bg2 = this.add.rectangle(0, 0, 130, 40, 0x1a120b, 0.95)
      .setStrokeStyle(2, 0xfacc15);
    const ic2 = this.add.text(-50, -10, '🌲', { fontSize: '18px' });
    const tx2 = this.add.text(-24, -10, '0', { font: 'bold 12px "Press Start 2P"', fill: '#ffffff' });
    const sb2 = this.add.text(-24, 3, '+21/min', { font: '9px "Silkscreen"', fill: '#22c55e' });
    lBox.add([bg2, ic2, tx2, sb2]);

    this.tweens.add({
      targets: lBox,
      y: 153,
      duration: 1700,
      yoyo: true,
      repeat: -1
    });
  }

  // =========================================================================
  // 4. İNTERAKTİF TIKLAMA ALANLARI
  // =========================================================================
  createInteractiveClickZones() {
    const zones = [
      { x: 815, y: 430, radius: 100, name: 'Güneş Tarlası (Buğday)' },
      { x: 1320, y: 290, radius: 90, name: 'Odun Sahası' },
      { x: 580, y: 200, radius: 90, name: 'Ana Köşk' },
      { x: 1000, y: 350, radius: 60, name: 'Su Kuyusu' }
    ];

    zones.forEach(z => {
      const circle = this.add.circle(z.x, z.y, z.radius, 0xfacc15, 0)
        .setInteractive({ useHandCursor: true });

      circle.on('pointerover', () => { circle.setFillStyle(0xfacc15, 0.2); });
      circle.on('pointerout', () => { circle.setFillStyle(0xfacc15, 0); });
      circle.on('pointerdown', () => {
        const dash = document.getElementById('dashboard');
        if (dash) dash.scrollIntoView({ behavior: 'smooth' });
      });
    });
  }

  // =========================================================================
  // 5. 1:1 PIXILAND OYUN İÇİ HUD (ARAYÜZÜ)
  // =========================================================================
  createPixilandHUD() {
    // A) ÜST AHŞAP KAYNAK BARI
    const topBar = this.add.graphics();
    topBar.fillStyle(0xfde047, 0.96);
    topBar.fillRect(20, 10, 1560, 44);
    topBar.lineStyle(3, 0x583007, 1);
    topBar.strokeRect(20, 10, 1560, 44);

    const resList = [
      { icon: '🌾', count: '264', x: 80 },
      { icon: '🌲', count: '0', x: 380 },
      { icon: '⛏️', count: '1000', x: 720 },
      { icon: '💎', count: '0', x: 1100 }
    ];

    resList.forEach(r => {
      this.add.text(r.x, 20, r.icon, { fontSize: '22px' });
      this.add.text(r.x + 32, 24, r.count, {
        font: 'bold 14px "Press Start 2P"',
        fill: '#451a03'
      });
    });

    // B) SOL ÜST OYUNCU PROFİLİ (AVATAR & TOKEN BARI)
    const pBox = this.add.container(70, 115);
    const avFrame = this.add.rectangle(0, 0, 58, 58, 0xdc2626)
      .setStrokeStyle(3, 0xfacc15);
    const avIcon = this.add.text(-16, -18, '🧙‍♂️', { fontSize: '32px' });

    const wBg = this.add.rectangle(170, 0, 260, 46, 0x18120b, 0.95)
      .setStrokeStyle(2, 0xfacc15);
    const wTxt = this.add.text(60, -16, '0xA7...AE56', {
      font: 'bold 11px "Press Start 2P"',
      fill: '#ffffff'
    });
    const tTxt = this.add.text(60, 3, '🟣 250   🔥 %18   🏆 %82', {
      font: '10px "Silkscreen"',
      fill: '#fde047'
    });

    pBox.add([avFrame, avIcon, wBg, wTxt, tTxt]);

    // C) AYARLAR ⚙️
    this.add.rectangle(1520, 115, 46, 46, 0xfacc15)
      .setStrokeStyle(3, 0x451a03)
      .setInteractive({ useHandCursor: true });
    this.add.text(1506, 101, '⚙️', { fontSize: '26px' });

    // D) SOL YAN MENÜ BUTONLARI (SHOP, INVITE, EARN)
    const leftBtns = [
      { name: 'SHOP', icon: '🏪', y: 460 },
      { name: 'INVITE', icon: '👥', y: 570 },
      { name: 'EARN', icon: '📜', y: 680 }
    ];

    leftBtns.forEach(b => {
      const btn = this.add.container(80, b.y);
      const bg = this.add.rectangle(0, 0, 68, 68, 0xfef08a)
        .setStrokeStyle(3, 0x451a03)
        .setInteractive({ useHandCursor: true });
      const ic = this.add.text(-16, -24, b.icon, { fontSize: '28px' });
      const txt = this.add.text(0, 16, b.name, {
        font: 'bold 9px "Press Start 2P"',
        fill: '#451a03'
      }).setOrigin(0.5);

      btn.add([bg, ic, txt]);

      bg.on('pointerdown', () => {
        const dash = document.getElementById('dashboard');
        if (dash) dash.scrollIntoView({ behavior: 'smooth' });
      });
    });

    // E) SAĞ YAN MENÜ BUTONLARI (PIXI+, HOT, GOAL)
    const rightBtns = [
      { name: 'PIXI+', icon: '⭐', y: 480, color: 0xfacc15 },
      { name: 'HOT', icon: '🎁', y: 590, color: 0xef4444 },
      { name: 'GOAL', icon: '🎯', y: 700, color: 0x38bdf8 }
    ];

    rightBtns.forEach(b => {
      const btn = this.add.container(1520, b.y);
      const bg = this.add.circle(0, 0, 30, b.color)
        .setStrokeStyle(3, 0x451a03)
        .setInteractive({ useHandCursor: true });
      const ic = this.add.text(-14, -16, b.icon, { fontSize: '26px' });
      const txt = this.add.text(0, 24, b.name, {
        font: 'bold 8px "Press Start 2P"',
        fill: '#ffffff'
      }).setOrigin(0.5);

      btn.add([bg, ic, txt]);
    });

    // F) ALT AKSİYON DOCK BARI (WORKERS, BAG, GEAR, GUILD, MAP)
    this.add.image(100, 840, 'master_btn_workers').setScale(1.3)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        const dash = document.getElementById('dashboard');
        if (dash) dash.scrollIntoView({ behavior: 'smooth' });
      });
    this.add.text(100, 886, 'WORKERS', {
      font: 'bold 9px "Press Start 2P"',
      fill: '#ffffff'
    }).setOrigin(0.5);

    this.add.image(180, 840, 'ui_btn_bag').setScale(1.3);
    this.add.image(250, 840, 'ui_btn_helmet').setScale(1.3);
    this.add.image(320, 840, 'ui_btn_guild').setScale(1.3);

    // Kırmızı Harita Butonu (Sağ Alt)
    this.add.rectangle(1500, 840, 68, 68, 0xdc2626)
      .setStrokeStyle(4, 0x451a03)
      .setInteractive({ useHandCursor: true });
    this.add.text(1484, 822, '🗺️', { fontSize: '32px' });
  }
}
