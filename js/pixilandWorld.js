// AdAstra: Genesis Realm - 1:1 Pixiland.app Authentic Pixel World Engine
import { gameState } from './gameState.js';
import { GAME_CONFIG } from './config.js';

export class PixilandWorldEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;

    this.width = this.canvas.width = 1600;
    this.height = this.canvas.height = 900;

    this.tick = 0;
    this.particles = [];
    this.clouds = [
      { x: -50, y: 80, speed: 0.15, scale: 1.2 },
      { x: 300, y: 650, speed: 0.22, scale: 1.5 },
      { x: 1200, y: 120, speed: 0.18, scale: 1.3 },
      { x: 1400, y: 550, speed: 0.12, scale: 1.6 },
      { x: 700, y: 30, speed: 0.25, scale: 1.1 }
    ];

    // Haritadaki İnteraktif Alanlar (Screenshot'taki tam konumlar)
    this.zones = {
      wood: { x: 920, y: 440, radius: 90, name: 'Zümrüt Odun Alanı', type: 'wood' },
      iron: { x: 1240, y: 580, radius: 100, name: 'Taş & Demir Ocağı', type: 'iron' },
      wheat: { x: 420, y: 620, radius: 80, name: 'Güneş Tarlası', type: 'wheat' },
      crystal: { x: 390, y: 210, radius: 85, name: 'Antik Taş Mabedi', type: 'crystal' },
      town: { x: 780, y: 620, radius: 90, name: 'AdAstra Köy Meydanı', type: 'town' }
    };

    // Gezen ve Çalışan Köylüler
    this.villagers = [
      // Madenciler (Sağdaki Taş Ocağında)
      { x: 1200, y: 560, targetX: 1260, targetY: 590, role: 'miner', action: 'mining', dir: 1, tickOffset: 0 },
      { x: 1280, y: 620, targetX: 1220, targetY: 550, role: 'miner', action: 'mining', dir: -1, tickOffset: 15 },
      
      // Oduncular (Ortadaki Kütük Alanında)
      { x: 900, y: 430, targetX: 950, targetY: 450, role: 'lumberjack', action: 'chopping', dir: 1, tickOffset: 5 },
      { x: 970, y: 460, targetX: 910, targetY: 420, role: 'lumberjack', action: 'chopping', dir: -1, tickOffset: 25 },
      
      // Gezginler (Patikalarda Yürüyenler)
      { x: 260, y: 480, targetX: 750, targetY: 600, role: 'wanderer', action: 'walking', dir: 1, progress: 0.2 },
      { x: 1100, y: 350, targetX: 1200, targetY: 700, role: 'wanderer', action: 'walking', dir: 1, progress: 0.6 },
      { x: 600, y: 680, targetX: 300, targetY: 500, role: 'farmer', action: 'walking', dir: -1, progress: 0.8 },
      { x: 400, y: 320, targetX: 700, targetY: 550, role: 'knight', action: 'walking', dir: 1, progress: 0.4 }
    ];

    this.hoveredZone = null;
    this.initInteraction();
  }

  initInteraction() {
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.width / rect.width;
      const scaleY = this.height / rect.height;
      const mouseX = (e.clientX - rect.left) * scaleX;
      const mouseY = (e.clientY - rect.top) * scaleY;

      let found = null;
      for (const [key, zone] of Object.entries(this.zones)) {
        const dist = Math.hypot(mouseX - zone.x, mouseY - zone.y);
        if (dist < zone.radius) {
          found = key;
          break;
        }
      }
      this.hoveredZone = found;
      this.canvas.style.cursor = found ? 'pointer' : 'default';
    });

    this.canvas.addEventListener('click', (e) => {
      if (this.hoveredZone) {
        window.dispatchEvent(new CustomEvent('pixiland-zone-clicked', { detail: { zone: this.hoveredZone } }));
      }
    });
  }

  addParticle(x, y, color, count = 4, speed = 1.5) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x + (Math.random() * 8 - 4),
        y: y + (Math.random() * 8 - 4),
        vx: (Math.random() - 0.5) * speed * 2,
        vy: -Math.random() * speed * 2 - 0.5,
        color,
        size: Math.floor(Math.random() * 3) + 2,
        life: 25 + Math.random() * 15
      });
    }
  }

  render() {
    this.tick++;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // 1. Pixiland Zemin (Yeşil Çimenler ve Organik Turuncu Patikalar)
    this.drawTerrain(ctx);

    // 2. Sol Üst Antik Taş Mabedi ve Su Kanalı
    this.drawStoneShrine(ctx);

    // 3. Sağ Taraf Taş Ocağı (Maden Alanı)
    this.drawStoneQuarry(ctx);

    // 4. Ahşap Köy Evleri & Kütük Alanı
    this.drawVillageCabins(ctx);

    // 5. Çevre Ağaç Kümeleri ve Çalılar
    this.drawDenseForestBorder(ctx);

    // 6. Animasyonlu Köylüler ve İşçiler
    this.drawVillagers(ctx);

    // 7. İnteraktif Bölge Vurguları (Hover Glow)
    this.drawZoneHighlights(ctx);

    // 8. Parçacıklar
    this.drawParticles(ctx);

    // 9. Yüzen Beyaz Bulutlar (Floating Clouds)
    this.drawClouds(ctx);
  }

  // ==========================================
  // 1. ZEMİN & ORGANİK PATİKALAR (PIXILAND STYLE)
  // ==========================================
  drawTerrain(ctx) {
    // Canlı Pixiland Çimen Tonu
    ctx.fillStyle = '#6b9e23';
    ctx.fillRect(0, 0, this.width, this.height);

    // Çimen Detayları (Açık ve koyu benekler)
    ctx.fillStyle = '#78b128';
    for (let x = 0; x < this.width; x += 32) {
      for (let y = 0; y < this.height; y += 32) {
        if ((x * 7 + y * 13) % 4 === 0) {
          ctx.fillRect(x, y, 16, 16);
        }
      }
    }

    // Organik Turuncu Patikalar (Screenshot'taki yumuşak toprak yollar)
    ctx.fillStyle = '#d6833b';
    ctx.strokeStyle = '#a6591f';
    ctx.lineWidth = 4;

    this.drawOrganicPath(ctx, [
      { x: 390, y: 310 },
      { x: 380, y: 480 },
      { x: 490, y: 560 },
      { x: 780, y: 630 },
      { x: 1040, y: 550 },
      { x: 1180, y: 620 }
    ], 52);

    this.drawOrganicPath(ctx, [
      { x: 780, y: 630 },
      { x: 880, y: 460 },
      { x: 1100, y: 360 },
      { x: 1220, y: 220 }
    ], 44);

    this.drawOrganicPath(ctx, [
      { x: 260, y: 660 },
      { x: 420, y: 630 }
    ], 38);
  }

  drawOrganicPath(ctx, points, width) {
    if (points.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      const xc = (points[i - 1].x + points[i].x) / 2;
      const yc = (points[i - 1].y + points[i].y) / 2;
      ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, xc, yc);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = width;
    ctx.stroke();
    ctx.strokeStyle = '#d6833b';
    ctx.lineWidth = width - 6;
    ctx.stroke();
  }

  // ==========================================
  // 2. SOL ÜST: ANTİK TAŞ MABEDİ & SU KANALI
  // ==========================================
  drawStoneShrine(ctx) {
    // Su Kanalı (Mavi Nehir)
    ctx.fillStyle = '#1e88e5';
    ctx.fillRect(290, 80, 200, 160);
    ctx.fillStyle = '#64b5f6';
    const wave = (this.tick * 0.8) % 24;
    for (let i = 0; i < 6; i++) {
      ctx.fillRect(300 + i * 30 + wave, 120 + (i % 3) * 30, 18, 4);
    }

    // Taş Platform
    ctx.fillStyle = '#475569';
    ctx.fillRect(330, 100, 120, 100);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(340, 110, 100, 80);

    // Antik Heykel & Meşaleler
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(380, 120, 20, 35); // Heykel gövdesi
    ctx.fillRect(384, 110, 12, 12); // Heykel başı

    // Meşaleler (Yanan Ateşler)
    const flameFlicker = (this.tick % 8 < 4) ? 2 : 0;
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(350, 130 - flameFlicker, 8, 12);
    ctx.fillRect(422, 130 - flameFlicker, 8, 12);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(352, 134, 4, 6);
    ctx.fillRect(424, 134, 4, 6);

    // Taş Köprü
    ctx.fillStyle = '#64748b';
    ctx.fillRect(375, 200, 30, 45);
    ctx.fillStyle = '#334155';
    ctx.fillRect(370, 200, 5, 45);
    ctx.fillRect(405, 200, 5, 45);

    // Level Rozeti (Screenshot'taki sarı [5] kutusu)
    this.drawLevelBadge(ctx, 390, 90, 5);
  }

  // ==========================================
  // 3. SAĞ TARAF: TAŞ VE MADEN OCAĞI (QUARRY)
  // ==========================================
  drawStoneQuarry(ctx) {
    const qx = 1240;
    const qy = 580;

    // Ahşap Çitlerle Çevrili Alan
    ctx.fillStyle = '#854d0e';
    ctx.strokeStyle = '#583007';
    ctx.lineWidth = 3;
    ctx.strokeRect(qx - 110, qy - 90, 220, 180);

    // Taş Yığınları ve Kayalar
    this.drawRockCluster(ctx, qx - 40, qy - 30);
    this.drawRockCluster(ctx, qx + 40, qy + 20);
    this.drawRockCluster(ctx, qx, qy + 40);

    // Taş Ocağı Kulübesi
    this.drawCabin(ctx, qx - 80, qy - 60, 4);

    // Kırmızı Kristal / Ateş Çukuru
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(qx + 60, qy - 30, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(qx + 60, qy - 30, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  drawRockCluster(ctx, x, y) {
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#64748b';
    ctx.beginPath();
    ctx.arc(x - 4, y - 4, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(x - 8, y - 8, 6, 6);
    ctx.fillRect(x + 4, y - 2, 4, 4);
  }

  // ==========================================
  // 4. KÖY EVLERİ, KÜTÜK ALANI VE SU KUYUSU
  // ==========================================
  drawVillageCabins(ctx) {
    // Sol Taraftaki Kulübeler
    this.drawCabin(ctx, 230, 520, 5);
    this.drawCabin(ctx, 310, 680, 5);
    this.drawCabin(ctx, 500, 710, 5);

    // Üst Orta Kulübe
    this.drawCabin(ctx, 900, 270, 5);

    // Merkez Su Kuyusu (Water Well)
    const wx = 940;
    const wy = 670;
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.arc(wx, wy, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.arc(wx, wy, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#78350f';
    ctx.fillRect(wx - 14, wy - 18, 4, 18);
    ctx.fillRect(wx + 10, wy - 18, 4, 18);
    ctx.fillRect(wx - 14, wy - 20, 28, 4);

    // Kütük ve Ağaç Kesim Alanı (Merkez - Woodcutting Zone)
    const lx = 920;
    const ly = 440;
    // Yere Yatmış Kütükler
    ctx.fillStyle = '#583007';
    ctx.fillRect(lx - 25, ly - 8, 50, 16);
    ctx.fillStyle = '#854d0e';
    ctx.fillRect(lx - 22, ly - 5, 44, 10);
    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.arc(lx + 22, ly, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#583007';
    ctx.fillRect(lx + 10, ly + 14, 40, 14);
    ctx.fillStyle = '#854d0e';
    ctx.fillRect(lx + 12, ly + 16, 36, 10);

    // Kesilmiş Ağaç Kökü
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.arc(lx - 35, ly + 20, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.arc(lx - 35, ly + 20, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  drawCabin(ctx, x, y, level = 5) {
    // Duvarlar (Koyu ahşap)
    ctx.fillStyle = '#451a03';
    ctx.fillRect(x - 30, y - 20, 60, 42);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(x - 26, y - 16, 52, 34);

    // Çatı (Kahverengi Tahta Çatı)
    ctx.fillStyle = '#3d1b06';
    ctx.beginPath();
    ctx.moveTo(x - 36, y - 20);
    ctx.lineTo(x, y - 48);
    ctx.lineTo(x + 36, y - 20);
    ctx.fill();

    ctx.fillStyle = '#5c2b0c';
    ctx.beginPath();
    ctx.moveTo(x - 32, y - 20);
    ctx.lineTo(x, y - 44);
    ctx.lineTo(x + 32, y - 20);
    ctx.fill();

    // Çatı Çizgileri
    ctx.strokeStyle = '#3d1b06';
    ctx.lineWidth = 2;
    for (let i = -24; i <= 24; i += 8) {
      ctx.beginPath();
      ctx.moveTo(x + i, y - 20);
      ctx.lineTo(x, y - 44);
      ctx.stroke();
    }

    // Kapı
    ctx.fillStyle = '#271003';
    ctx.fillRect(x - 7, y + 2, 14, 16);

    // Sarı Seviye Rozeti [5]
    this.drawLevelBadge(ctx, x, y - 54, level);
  }

  drawLevelBadge(ctx, x, y, level) {
    ctx.fillStyle = '#eab308';
    ctx.fillRect(x - 8, y - 8, 16, 16);
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 8, y - 8, 16, 16);

    ctx.font = 'bold 10px "Press Start 2P", monospace';
    ctx.fillStyle = '#451a03';
    ctx.textAlign = 'center';
    ctx.fillText(level.toString(), x, y + 4);
  }

  // ==========================================
  // 5. ÇEVRE ORMAN VE AĞAÇLAR (PIXILAND ROUND TREES)
  // ==========================================
  drawDenseForestBorder(ctx) {
    // Sol ve Üst Kenar Ormanı
    const treePositions = [
      // Sol Taraf
      { x: 80, y: 120 }, { x: 140, y: 80 }, { x: 60, y: 220 }, { x: 120, y: 280 },
      { x: 70, y: 380 }, { x: 130, y: 440 }, { x: 50, y: 540 }, { x: 100, y: 640 },
      { x: 60, y: 780 }, { x: 140, y: 820 },
      // Üst Taraf
      { x: 560, y: 80 }, { x: 640, y: 120 }, { x: 720, y: 70 }, { x: 800, y: 110 },
      { x: 1050, y: 90 }, { x: 1150, y: 130 }, { x: 1250, y: 80 },
      // Sağ Taraf
      { x: 1480, y: 140 }, { x: 1540, y: 240 }, { x: 1460, y: 320 }, { x: 1520, y: 440 },
      { x: 1480, y: 560 }, { x: 1540, y: 680 }, { x: 1460, y: 790 }, { x: 1530, y: 840 }
    ];

    treePositions.forEach(t => {
      this.drawPixilandRoundTree(ctx, t.x, t.y);
    });
  }

  drawPixilandRoundTree(ctx, x, y) {
    // Gövde
    ctx.fillStyle = '#583007';
    ctx.fillRect(x - 5, y + 10, 10, 16);

    // Yuvarlak Çam Ağacı Katmanları (Pixiland Style)
    ctx.fillStyle = '#2d5a1b';
    ctx.beginPath();
    ctx.arc(x, y + 2, 28, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#417a29';
    ctx.beginPath();
    ctx.arc(x, y - 4, 24, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#5c9e37';
    ctx.beginPath();
    ctx.arc(x - 4, y - 10, 18, 0, Math.PI * 2);
    ctx.fill();

    // Açık yeşil parlaklık benekleri
    ctx.fillStyle = '#82c44e';
    ctx.fillRect(x - 8, y - 18, 6, 6);
    ctx.fillRect(x + 2, y - 12, 6, 6);
  }

  // ==========================================
  // 6. ANİMASYONLU KÖYLÜLER & İŞÇİLER
  // ==========================================
  drawVillagers(ctx) {
    this.villagers.forEach(v => {
      if (v.action === 'mining') {
        const swing = Math.sin((this.tick + v.tickOffset) * 0.25) * 6;
        this.drawSpriteCharacter(ctx, v.x, v.y + swing, '#e06d53', '#78350f', true, 'pickaxe');
      } else if (v.action === 'chopping') {
        const swing = Math.sin((this.tick + v.tickOffset) * 0.25) * 6;
        this.drawSpriteCharacter(ctx, v.x, v.y + swing, '#3b82f6', '#d97706', true, 'axe');
      } else {
        // Yürüyen Gezgin
        v.progress = (v.progress + 0.001) % 1;
        const curX = v.x + (v.targetX - v.x) * v.progress;
        const curY = v.y + (v.targetY - v.y) * v.progress;
        const walkBounce = Math.abs(Math.sin(this.tick * 0.15)) * 4;
        this.drawSpriteCharacter(ctx, curX, curY - walkBounce, '#10b981', '#451a03', false);
      }
    });
  }

  drawSpriteCharacter(ctx, x, y, shirtColor, hairColor, isWorking, tool) {
    // Gölge
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.ellipse(x, y + 10, 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bacaklar
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(x - 4, y + 4, 3, 6);
    ctx.fillRect(x + 1, y + 4, 3, 6);

    // Gövde
    ctx.fillStyle = shirtColor;
    ctx.fillRect(x - 5, y - 4, 10, 9);

    // Kafa
    ctx.fillStyle = '#fed7aa';
    ctx.fillRect(x - 4, y - 12, 8, 8);

    // Saç
    ctx.fillStyle = hairColor;
    ctx.fillRect(x - 5, y - 14, 10, 4);

    // Alet
    if (isWorking && tool) {
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(x + 6, y - 8, 3, 10);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(x + 3, y - 12, 8, 4);
    }
  }

  // ==========================================
  // 7. İNTERAKTİF BÖLGE VURGULARI (HOVER)
  // ==========================================
  drawZoneHighlights(ctx) {
    if (!this.hoveredZone) return;
    const z = this.zones[this.hoveredZone];
    if (!z) return;

    ctx.save();
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 4;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.arc(z.x, z.y, z.radius, 0, Math.PI * 2);
    ctx.stroke();

    // Başlık Etiketi
    ctx.fillStyle = '#fbb019';
    ctx.fillRect(z.x - 70, z.y - z.radius - 24, 140, 22);
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 2;
    ctx.strokeRect(z.x - 70, z.y - z.radius - 24, 140, 22);

    ctx.font = 'bold 8px "Press Start 2P", monospace';
    ctx.fillStyle = '#451a03';
    ctx.textAlign = 'center';
    ctx.fillText(z.name, z.x, z.y - z.radius - 10);
    ctx.restore();
  }

  // ==========================================
  // 8. PARÇACIKLAR
  // ==========================================
  drawParticles(ctx) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size);
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  // ==========================================
  // 9. YÜZEN BEYAZ BULUTLAR (PIXILAND CLOUDS)
  // ==========================================
  drawClouds(ctx) {
    this.clouds.forEach(c => {
      c.x += c.speed;
      if (c.x > this.width + 100) c.x = -150;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      const s = c.scale * 30;
      ctx.beginPath();
      ctx.arc(c.x, c.y, s, 0, Math.PI * 2);
      ctx.arc(c.x + s * 0.8, c.y - s * 0.2, s * 0.9, 0, Math.PI * 2);
      ctx.arc(c.x + s * 1.5, c.y, s * 0.8, 0, Math.PI * 2);
      ctx.arc(c.x + s * 0.7, c.y + s * 0.2, s * 0.7, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}
