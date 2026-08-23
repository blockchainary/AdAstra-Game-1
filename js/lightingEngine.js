// AdAstra: Genesis Realm - Masterclass WebGL 2D Dynamic Lighting & Volumetric Atmosphere Engine
export class LightingEngine {
  constructor(scene) {
    this.scene = scene;
    this.currentMode = 'day'; // 'day', 'sunset', 'night'
    this.lights = [];
    this.embers = null;
    this.ambientLayer = null;
    this.init();
  }

  init() {
    this.createRadialLightTexture();
    this.createAmbientAtmosphereLayer();
    this.placeTownLights();
    this.createCampfireEmbers();
  }

  // 1. Yumuşak Radyal Işık Dokusu (Multi-Stop Soft Radial Glow)
  createRadialLightTexture() {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    const ctx = c.getContext('2d');

    const grad = ctx.createRadialGradient(128, 128, 8, 128, 128, 128);
    grad.addColorStop(0, 'rgba(255, 245, 180, 1.0)');
    grad.addColorStop(0.2, 'rgba(251, 191, 36, 0.8)');
    grad.addColorStop(0.5, 'rgba(245, 158, 11, 0.35)');
    grad.addColorStop(0.8, 'rgba(180, 83, 9, 0.1)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    if (this.scene.textures.exists('radial_light_glow')) {
      this.scene.textures.remove('radial_light_glow');
    }
    this.scene.textures.addCanvas('radial_light_glow', c);
  }

  // 2. Ambiyans Katmanı (Multiply Blend ile Doğal Gece)
  createAmbientAtmosphereLayer() {
    this.ambientLayer = this.scene.add.rectangle(
      this.scene.worldWidth / 2,
      this.scene.worldHeight / 2,
      this.scene.worldWidth,
      this.scene.worldHeight,
      0x000000,
      0
    );
    this.ambientLayer.setDepth(50);
  }

  // 3. Kasaba Işık Kaynakları
  placeTownLights() {
    this.lightContainer = this.scene.add.container(0, 0).setDepth(55);

    const lightPositions = [
      // 🍺 Taverna Pencereleri & Fenerleri
      { x: 1485, y: 660, scale: 2.2, color: 0xfef08a, alpha: 0.9, flicker: true },
      { x: 1350, y: 640, scale: 1.5, color: 0xfbbf24, alpha: 0.8, flicker: true },

      // ⛏️ Maden Ocağı & Kristal Mağarası (Mistik Mavi/Mor Parıltı)
      { x: 1395, y: 285, scale: 2.6, color: 0x38bdf8, alpha: 0.95, flicker: false },
      { x: 1540, y: 260, scale: 1.8, color: 0xc084fc, alpha: 0.9, flicker: false },

      // ⚔️ Askeri Kışla Kamp Ateşi
      { x: 2085, y: 1305, scale: 2.4, color: 0xf97316, alpha: 1.0, flicker: true },

      // 🎣 Balıkçı İskelesi Feneri
      { x: 870, y: 960, scale: 1.7, color: 0xfde047, alpha: 0.85, flicker: true },

      // 🏪 Pazar Meydanı Fenerleri & Çeşme
      { x: 1395, y: 960, scale: 2.0, color: 0xfbbf24, alpha: 0.85, flicker: true },
      { x: 1280, y: 920, scale: 1.5, color: 0xfde047, alpha: 0.8, flicker: true },

      // 🌾 Çiftlik Evi & Rüzgar Değirmeni Feneri
      { x: 2210, y: 360, scale: 1.6, color: 0xfde047, alpha: 0.85, flicker: true },

      // 🌲 Orman Oduncu Kulübesi Feneri
      { x: 210, y: 840, scale: 1.6, color: 0xfbbf24, alpha: 0.85, flicker: true }
    ];

    lightPositions.forEach(lp => {
      const light = this.scene.add.image(lp.x, lp.y, 'radial_light_glow')
        .setScale(lp.scale)
        .setAlpha(0)
        .setBlendMode(Phaser.BlendModes.ADD);

      this.lightContainer.add(light);
      this.lights.push({ sprite: light, baseAlpha: lp.alpha, flicker: lp.flicker });

      if (lp.flicker) {
        this.scene.tweens.add({
          targets: light,
          scaleX: lp.scale * 1.1,
          scaleY: lp.scale * 1.1,
          duration: Phaser.Math.Between(500, 1100),
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      }
    });
  }

  // 4. Gece Uçuşan Ateş Kıvılcımları (Campfire Embers)
  createCampfireEmbers() {
    this.embers = this.scene.add.particles(2085, 1305, 'particle_spark', {
      speedY: { min: -30, max: -80 },
      speedX: { min: -15, max: 15 },
      scale: { start: 0.7, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 1600,
      frequency: 180,
      blendMode: Phaser.BlendModes.ADD
    });
    this.embers.setDepth(56);
    this.embers.stop(); // Başlangıçta gündüz
  }

  // Atmosfer Modunu Değiştir
  setAtmosphereMode(mode) {
    this.currentMode = mode;

    if (mode === 'day') {
      // ☀️ Parlak Canlı Gündüz
      this.scene.tweens.add({
        targets: this.ambientLayer,
        alpha: 0,
        duration: 1200
      });
      this.lights.forEach(l => {
        this.scene.tweens.add({ targets: l.sprite, alpha: 0, duration: 900 });
      });
      if (this.embers) this.embers.stop();
    } else if (mode === 'sunset') {
      // 🌅 Sıcak Kehribar / Altın Saat (Golden Hour)
      this.ambientLayer.setFillStyle(0xc2410c);
      this.scene.tweens.add({
        targets: this.ambientLayer,
        alpha: 0.35,
        duration: 1200
      });
      this.lights.forEach(l => {
        this.scene.tweens.add({ targets: l.sprite, alpha: l.baseAlpha * 0.65, duration: 900 });
      });
      if (this.embers) this.embers.start();
    } else if (mode === 'night') {
      // 🌙 Büyüleyici Lacivert Gece & Parlayan Sıcak Pencereler
      this.ambientLayer.setFillStyle(0x070c1e);
      this.scene.tweens.add({
        targets: this.ambientLayer,
        alpha: 0.72,
        duration: 1200
      });
      this.lights.forEach(l => {
        this.scene.tweens.add({ targets: l.sprite, alpha: l.baseAlpha, duration: 900 });
      });
      if (this.embers) this.embers.start();
    }
  }

  cycleNextAtmosphere() {
    if (this.currentMode === 'day') this.setAtmosphereMode('sunset');
    else if (this.currentMode === 'sunset') this.setAtmosphereMode('night');
    else this.setAtmosphereMode('day');
    return this.currentMode;
  }
}
