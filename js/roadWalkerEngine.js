// AdAstra: Genesis Realm - Road Waypoint Engine & Organic Animation Controller
// Bu sistem NPC'lerin kasabanın gerçek taş ve toprak yollarını harfiyen takip etmesini sağlar.
// Karakterler asla nehirlerin, çitlerin veya dağların üzerinden geçmez.

export const TOWN_ROAD_PATHS = {
  // 1. Ana Pazar Meydanı & Taverna Turu (Market Square & Inn Loop)
  marketLoop: [
    { x: 1280, y: 1100 }, // Güney Giriş Kapısı
    { x: 1280, y: 920 },  // Meydan Girişi
    { x: 1420, y: 880 },  // Doğu Pazar Tezgahları
    { x: 1480, y: 760 },  // Kilise Önü
    { x: 1350, y: 640 },  // Taverna Girişi
    { x: 1220, y: 640 },  // Taverna Batısı
    { x: 1100, y: 760 },  // Batı Pazar Tezgahları
    { x: 1180, y: 920 },  // Meydan Kuyusu
    { x: 1280, y: 920 },  // Merkez
    { x: 1280, y: 1100 }  // Güney Kapısı
  ],

  // 2. İskele Yolu (Meydandan İskeledeki Balıkçı Barınağına - Nehire Girmez!)
  pierPath: [
    { x: 1280, y: 780 },  // Kasaba Merkez Yolu
    { x: 1080, y: 780 },  // Köy Evleri Arası Taş Yol
    { x: 880, y: 780 },   // İskele Bağlantı Noktası
    { x: 760, y: 900 },   // Ahşap İskele Girişi (Güvenli)
    { x: 760, y: 980 },   // İskele Ucu (Balıkçı Yanı)
    { x: 760, y: 900 },   // Geri Dönüş
    { x: 880, y: 780 },
    { x: 1080, y: 780 },
    { x: 1280, y: 780 }
  ],

  // 3. Çiftlik Yolu (Tavernadan Güneş Çiftliğine & Değirmene)
  farmPath: [
    { x: 1350, y: 640 },  // Taverna
    { x: 1520, y: 640 },  // Çiftlik Kapı Yolu
    { x: 1780, y: 640 },  // Buğday Tarlası Kenarı
    { x: 1980, y: 640 },  // Çiftlik Evi Önü
    { x: 1980, y: 820 },  // Sebze Bahçeleri Patikası
    { x: 1780, y: 820 },  // Çit Boyu
    { x: 1520, y: 640 },  // Geri Dönüş
    { x: 1350, y: 640 }
  ],

  // 4. Kışla Yolu (Güneyden Askeri Kampa Giriş)
  barracksPath: [
    { x: 1280, y: 1100 }, // Ana Güney Yol
    { x: 1550, y: 1100 }, // Kışla Kapısı
    { x: 1780, y: 1100 }, // Kışla İçi Taş Yol
    { x: 1920, y: 1180 }, // Talim Alanı Yanı
    { x: 1780, y: 1100 }, // Geri Dönüş
    { x: 1550, y: 1100 },
    { x: 1280, y: 1100 }
  ],

  // 5. Maden Yolu (Tavernadan Dağ Maden Tünellerine)
  minePath: [
    { x: 1350, y: 640 },  // Taverna
    { x: 1280, y: 520 },  // Dağ Yolu Başlangıcı
    { x: 1280, y: 380 },  // Maden Rayları Girişi
    { x: 1420, y: 320 },  // Maden Galerisi 1
    { x: 1580, y: 320 },  // Vagon Alanı
    { x: 1420, y: 320 },  // Geri Dönüş
    { x: 1280, y: 380 },
    { x: 1280, y: 520 },
    { x: 1350, y: 640 }
  ]
};

// Organik Yol Takipçisi (Autonomous Waypoint Follower)
export class RoadWalker {
  constructor(scene, sprite, pathKey, speed = 40) {
    this.scene = scene;
    this.sprite = sprite;
    this.waypoints = TOWN_ROAD_PATHS[pathKey];
    this.speed = speed;
    this.currentIndex = 0;
    this.isMoving = true;

    // Başlangıç noktasını ilk waypoint'e koy
    if (this.waypoints && this.waypoints.length > 0) {
      this.sprite.setPosition(this.waypoints[0].x, this.waypoints[0].y);
      this.moveToNext();
    }
  }

  moveToNext() {
    if (!this.isMoving || !this.waypoints) return;

    this.currentIndex = (this.currentIndex + 1) % this.waypoints.length;
    const target = this.waypoints[this.currentIndex];

    const currentX = this.sprite.x;
    const currentY = this.sprite.y;
    const distance = Phaser.Math.Distance.Between(currentX, currentY, target.x, target.y);
    const duration = (distance / this.speed) * 1000;

    // Yön Ayarı (Sola gidiyorsa sola, sağa gidiyorsa sağa dön)
    if (target.x < currentX - 2) {
      this.sprite.setFlipX(true);
    } else if (target.x > currentX + 2) {
      this.sprite.setFlipX(false);
    }

    // Organik Adım Sekmesi (Subtle Footstep Bob)
    this.bobTween = this.scene.tweens.add({
      targets: this.sprite,
      scaleY: this.sprite.scaleY * 0.95,
      yoyo: true,
      duration: 180,
      repeat: Math.floor(duration / 360)
    });

    // Hedef Waypoint'e Yürü
    this.scene.tweens.add({
      targets: this.sprite,
      x: target.x,
      y: target.y,
      duration: duration,
      ease: 'Linear',
      onComplete: () => {
        // Hedefe varınca kısa duraklama (Organik bekleme)
        const pauseTime = Math.random() * 800 + 400;
        this.scene.time.delayedCall(pauseTime, () => {
          this.moveToNext();
        });
      }
    });
  }

  stop() {
    this.isMoving = false;
    if (this.bobTween) this.bobTween.stop();
  }
}
