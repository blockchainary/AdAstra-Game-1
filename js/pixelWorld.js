// AdAstra: Genesis Realm - Pixiland x DeFi Kingdoms 16-Bit Pixel Art World Engine
import { gameState } from './gameState.js';
import { GAME_CONFIG } from './config.js';

export class PixelWorldEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false; // Crisp pixel art

    this.width = this.canvas.width = 1100;
    this.height = this.canvas.height = 360;

    this.tick = 0;
    this.particles = [];
    this.floatingTexts = [];

    // Node Alanlarının Koordinatları
    this.nodes = {
      wood: { x: 180, y: 150, type: 'forest', name: 'Zümrüt Ormanı', icon: '🌲' },
      iron: { x: 420, y: 140, type: 'mine', name: 'Taş Ocağı', icon: '⛏️' },
      wheat: { x: 680, y: 160, type: 'farm', name: 'Güneş Tarlası', icon: '🌾' },
      crystal: { x: 920, y: 130, type: 'crystal', name: 'Mistik Krater', icon: '💎' }
    };

    // Kasaba Merkezi (Town Hub)
    this.townCenter = { x: 550, y: 270 };
    
    // İşçi / Gezgin Sprite Durumları
    this.workers = {
      wood: { x: 180, y: 175, frame: 0, state: 'idle', actionTick: 0 },
      iron: { x: 420, y: 165, frame: 0, state: 'idle', actionTick: 0 },
      wheat: { x: 680, y: 185, frame: 0, state: 'idle', actionTick: 0 },
      crystal: { x: 920, y: 155, frame: 0, state: 'idle', actionTick: 0 },
      hero: { x: 550, y: 250, targetX: 550, targetY: 250, frame: 0, dir: 1, state: 'idle' }
    };

    this.initCanvasResize();
  }

  initCanvasResize() {
    window.addEventListener('resize', () => {
      // Responsive oran koruma
    });
  }

  // Piksel Parçacığı Ekleme (Taş Kıvılcımı, Odun Talaşı, Büyü Işıltısı)
  addParticle(x, y, color, count = 4, speed = 1.5) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x + (Math.random() * 8 - 4),
        y: y + (Math.random() * 8 - 4),
        vx: (Math.random() - 0.5) * speed * 2,
        vy: -Math.random() * speed * 2 - 0.5,
        color,
        size: Math.floor(Math.random() * 3) + 2,
        life: 25 + Math.random() * 15,
        maxLife: 40
      });
    }
  }

  // Dünya Animasyon Döngüsü
  render() {
    this.tick++;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // 1. Zemin ve Çevre (Lush Pixiland Grass & DFK Castle Paths)
    this.drawTerrain(ctx);

    // 2. Binalar ve Çevre Unsurları
    this.drawTownElements(ctx);

    // 3. Toplama Alanları (Ağaçlar, Maden Girişi, Buğdaylar, Kristal Sütunları)
    this.drawNodes(ctx);

    // 4. Karakterler & İşçiler
    this.drawWorkers(ctx);

    // 5. Parçacıklar ve Büyülü Işıltılar
    this.drawParticles(ctx);

    // 6. UI Efektleri ve Vignette
    this.drawRetroVignette(ctx);
  }

  // ==========================================
  // 1. ZEMİN & PİKSEL ÇEVRE (PIXILAND STYLE)
  // ==========================================
  drawTerrain(ctx) {
    // Canlı Çimen Zemin (Damlalı tonlama)
    ctx.fillStyle = '#1b3b22';
    ctx.fillRect(0, 0, this.width, this.height);

    // Çimen Detayları (16-bit dama deseni)
    ctx.fillStyle = '#244e2e';
    for (let x = 0; x < this.width; x += 16) {
      for (let y = 0; y < this.height; y += 16) {
        if ((x + y) % 32 === 0) {
          ctx.fillRect(x, y, 16, 16);
        }
      }
    }

    // Taş Patikalar (Cobblestone Paths connecting Hub to Nodes)
    ctx.fillStyle = '#475569';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;

    // Patika yolları çiz
    const paths = [
      { from: this.townCenter, to: this.nodes.wood },
      { from: this.townCenter, to: this.nodes.iron },
      { from: this.townCenter, to: this.nodes.wheat },
      { from: this.townCenter, to: this.nodes.crystal }
    ];

    paths.forEach(p => {
      ctx.beginPath();
      ctx.moveTo(p.from.x, p.from.y);
      const midX = (p.from.x + p.to.x) / 2;
      const midY = (p.from.y + p.to.y) / 2 + 20;
      ctx.quadraticCurveTo(midX, midY, p.to.x, p.to.y + 20);
      ctx.stroke();

      // Taş Çakıl Noktaları
      ctx.fillStyle = '#64748b';
      for (let t = 0; t <= 1; t += 0.1) {
        const px = (1 - t) * (1 - t) * p.from.x + 2 * (1 - t) * t * midX + t * t * p.to.x;
        const py = (1 - t) * (1 - t) * p.from.y + 2 * (1 - t) * t * midY + t * t * (p.to.y + 20);
        ctx.fillRect(Math.floor(px - 6), Math.floor(py - 2), 12, 6);
        ctx.fillStyle = (t * 10) % 2 === 0 ? '#94a3b8' : '#475569';
      }
    });

    // Akan Nehir (Animated Pixel River)
    const riverY = 320;
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(0, riverY, this.width, 40);
    ctx.fillStyle = '#38bdf8';
    const waveOffset = (this.tick * 1.5) % 32;
    for (let x = -32; x < this.width; x += 32) {
      ctx.fillRect(x + waveOffset, riverY + 8, 16, 4);
      ctx.fillRect(x + waveOffset + 8, riverY + 22, 12, 4);
    }
  }

  // ==========================================
  // 2. KASABA MERKEZİ & DEMİRCİ (DFK STYLE)
  // ==========================================
  drawTownElements(ctx) {
    const cx = this.townCenter.x;
    const cy = this.townCenter.y;

    // Ana Kasaba Binası (Town Hall / Guild Tavern)
    ctx.fillStyle = '#1e1b4b'; // Koyu taş
    ctx.fillRect(cx - 36, cy - 65, 72, 50);

    // Çatı (Kırmızı/Altın DeFi Kingdoms Çatısı)
    ctx.fillStyle = '#991b1b';
    ctx.beginPath();
    ctx.moveTo(cx - 44, cy - 65);
    ctx.lineTo(cx, cy - 95);
    ctx.lineTo(cx + 44, cy - 65);
    ctx.fill();

    // Altın Çatı Süslemesi
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(cx - 4, cy - 98, 8, 8);
    ctx.fillRect(cx - 36, cy - 67, 72, 3);

    // Kapı & Pencereler (Işıklı)
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(cx - 10, cy - 35, 20, 20); // Sarı Işıklı Kapı
    ctx.fillRect(cx - 24, cy - 55, 12, 12); // Sol Pencere
    ctx.fillRect(cx + 12, cy - 55, 12, 12); // Sağ Pencere

    // Duman Animasyonu (Chimney Smoke)
    const smokeY = cy - 95 - ((this.tick * 0.8) % 30);
    const smokeSize = 4 + Math.floor(((this.tick * 0.8) % 30) / 6);
    ctx.fillStyle = 'rgba(203, 213, 225, 0.6)';
    ctx.fillRect(cx + 22, smokeY, smokeSize, smokeSize);
    ctx.fillRect(cx + 26, smokeY - 6, smokeSize - 1, smokeSize - 1);

    // Kasaba Binası Başlığı
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.fillStyle = '#fbbf24';
    ctx.textAlign = 'center';
    ctx.fillText('ADASTRA KALESİ', cx, cy + 18);
  }

  // ==========================================
  // 3. TOPLAMA ALANLARI (NODES)
  // ==========================================
  drawNodes(ctx) {
    const state = gameState.state;

    // --- A) ZÜMRÜT ORMANI (Wood) ---
    const w = this.nodes.wood;
    const woodActive = !!state.activeExpeditions.wood;
    this.drawPixelTree(ctx, w.x - 28, w.y - 40, '#15803d', '#166534');
    this.drawPixelTree(ctx, w.x + 24, w.y - 45, '#16a34a', '#14532d');
    this.drawPixelTree(ctx, w.x, w.y - 55, '#22c55e', '#15803d');

    // Kütük & Odun Yığını
    ctx.fillStyle = '#78350f';
    ctx.fillRect(w.x - 14, w.y - 6, 28, 10);
    ctx.fillStyle = '#b45309';
    ctx.fillRect(w.x - 10, w.y - 4, 20, 6);

    if (woodActive && this.tick % 20 === 0) {
      this.addParticle(w.x + 4, w.y - 10, '#fcd34d', 2, 1);
    }

    // --- B) DERİN TAŞ OCAĞI (Iron Ore) ---
    const iron = this.nodes.iron;
    const ironActive = !!state.activeExpeditions.iron;
    // Mağara Girişi & Kayalar
    ctx.fillStyle = '#334155';
    ctx.fillRect(iron.x - 30, iron.y - 40, 60, 45);
    ctx.fillStyle = '#0f172a'; // Mağara karanlığı
    ctx.fillRect(iron.x - 16, iron.y - 25, 32, 30);

    // Demir Damarları (Parlak gri/gümüş)
    ctx.fillStyle = (this.tick % 30 < 15) ? '#e2e8f0' : '#94a3b8';
    ctx.fillRect(iron.x - 26, iron.y - 35, 8, 6);
    ctx.fillRect(iron.x + 18, iron.y - 30, 8, 6);
    ctx.fillRect(iron.x + 10, iron.y - 10, 6, 6);

    if (ironActive && this.tick % 15 === 0) {
      this.addParticle(iron.x + (Math.random() * 20 - 10), iron.y - 15, '#e2e8f0', 3, 2);
    }

    // --- C) GÜNEŞ TARLASI (Wheat Farm) ---
    const wheat = this.nodes.wheat;
    const wheatActive = !!state.activeExpeditions.wheat;
    // Çitler & Tarlalar
    ctx.fillStyle = '#854d0e';
    ctx.fillRect(wheat.x - 35, wheat.y - 20, 70, 26);
    // Buğday Başakları (Rüzgarda Dalgalanan)
    const sway = Math.sin(this.tick * 0.08) * 3;
    ctx.fillStyle = '#eab308';
    for (let bx = wheat.x - 30; bx <= wheat.x + 30; bx += 8) {
      ctx.fillRect(bx + sway, wheat.y - 26, 4, 16);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(bx + sway - 1, wheat.y - 30, 6, 6);
      ctx.fillStyle = '#eab308';
    }

    if (wheatActive && this.tick % 18 === 0) {
      this.addParticle(wheat.x + sway, wheat.y - 20, '#fef08a', 2, 1);
    }

    // --- D) MİSTİK KRATER (AdAstra Crystal) ---
    const crystal = this.nodes.crystal;
    const crystalActive = !!state.activeExpeditions.crystal;
    // Büyülü Kristal Sütunları
    const glowIntensity = Math.abs(Math.sin(this.tick * 0.05));
    ctx.fillStyle = '#4c1d95';
    ctx.fillRect(crystal.x - 24, crystal.y - 25, 48, 30);

    // Ana Kristal Spire
    ctx.fillStyle = `rgba(168, 85, 247, ${0.7 + glowIntensity * 0.3})`;
    ctx.beginPath();
    ctx.moveTo(crystal.x, crystal.y - 50);
    ctx.lineTo(crystal.x + 16, crystal.y - 10);
    ctx.lineTo(crystal.x - 16, crystal.y - 10);
    ctx.fill();

    // Kristal İçi Parlama
    ctx.fillStyle = '#f3e8ff';
    ctx.fillRect(crystal.x - 3, crystal.y - 38, 6, 18);

    if (crystalActive || this.tick % 10 === 0) {
      this.addParticle(crystal.x + (Math.random() * 20 - 10), crystal.y - 30, '#c084fc', 2, 1.2);
    }

    // Alan İsim Etiketleri
    ctx.font = '6.5px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f8fafc';
    ctx.fillText('ZÜMRÜT ORMANI', w.x, w.y + 26);
    ctx.fillText('DERİN MADEN', iron.x, iron.y + 26);
    ctx.fillText('GÜNEŞ TARLASI', wheat.x, wheat.y + 26);
    ctx.fillText('MİSTİK KRATER', crystal.x, crystal.y + 26);
  }

  // Piksel Ağaç Çizim Yardımcısı
  drawPixelTree(ctx, x, y, crownColor, shadowColor) {
    // Gövde
    ctx.fillStyle = '#5c2b0c';
    ctx.fillRect(x - 3, y + 14, 6, 16);

    // Taç Katmanları
    ctx.fillStyle = shadowColor;
    ctx.fillRect(x - 16, y + 2, 32, 14);
    ctx.fillRect(x - 12, y - 10, 24, 14);
    ctx.fillRect(x - 8, y - 20, 16, 12);

    ctx.fillStyle = crownColor;
    ctx.fillRect(x - 14, y + 4, 28, 10);
    ctx.fillRect(x - 10, y - 8, 20, 10);
    ctx.fillRect(x - 6, y - 18, 12, 8);
  }

  // ==========================================
  // 4. KARAKTERLER & ANİMASYONLU İŞÇİLER
  // ==========================================
  drawWorkers(ctx) {
    const state = gameState.state;

    // Seferde olan alanlara işçi yerleştir
    for (const [nodeId, node] of Object.entries(this.nodes)) {
      const active = state.activeExpeditions[nodeId];
      const toolId = GAME_CONFIG.GLOBAL_RESOURCE_CAPS[nodeId].requiredTool;
      const toolBroken = (state.tools[toolId]?.durability || 0) <= 0;

      if (active) {
        // Aktif Çalışan Mini Sprite (Oduncu, Madenci, Çiftçi, Büyücü)
        const isWorking = !active.isCompleted;
        this.drawPixelCharacter(ctx, node.x, node.y + 2, nodeId, isWorking, this.tick);

        if (active.isCompleted) {
          // Başının üstünde "!" işareti
          ctx.fillStyle = '#fbbf24';
          ctx.fillRect(node.x - 2, node.y - 28 + (Math.sin(this.tick * 0.15) * 3), 4, 8);
          ctx.fillRect(node.x - 2, node.y - 18 + (Math.sin(this.tick * 0.15) * 3), 4, 3);
        }
      } else if (toolBroken) {
        // Kırık Tool Uyarısı (Karakter üstünde ter/kırık alet)
        ctx.font = '10px sans-serif';
        ctx.fillText('❌', node.x - 6, node.y - 2);
      }
    }

    // Ana Kahraman (AlphAvax Gezgini - Kasaba Önünde Devriye Gezen)
    const hero = this.workers.hero;
    const heroPatrolOffset = Math.sin(this.tick * 0.03) * 60;
    this.drawMainHero(ctx, hero.x + heroPatrolOffset, hero.y, this.tick);
  }

  // Mini İşçi Sprite Çizimi
  drawPixelCharacter(ctx, x, y, role, isWorking, tick) {
    const bounce = isWorking ? Math.abs(Math.sin(tick * 0.2)) * 4 : 0;
    const py = y - bounce;

    // Renk Temaları
    let shirtColor = '#3b82f6';
    let hairColor = '#78350f';
    if (role === 'wood') shirtColor = '#dc2626'; // Oduncu Kırmızı Gömlek
    if (role === 'iron') shirtColor = '#64748b'; // Madenci Gri
    if (role === 'wheat') shirtColor = '#d97706'; // Çiftçi Kahve
    if (role === 'crystal') shirtColor = '#9333ea'; // Büyücü Mor Cübbe

    // Bacaklar & Pantolon
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(x - 4, py + 10, 3, 6);
    ctx.fillRect(x + 1, py + 10, 3, 6);

    // Gövde / Gömlek
    ctx.fillStyle = shirtColor;
    ctx.fillRect(x - 5, py + 2, 10, 9);

    // Kafa / Ten
    ctx.fillStyle = '#fed7aa';
    ctx.fillRect(x - 4, py - 6, 8, 8);

    // Saç / Başlık
    ctx.fillStyle = hairColor;
    ctx.fillRect(x - 5, py - 8, 10, 4);

    // Alet Vurma Animasyonu (Tool Swing)
    if (isWorking) {
      const swingAngle = Math.sin(tick * 0.25) * 35;
      ctx.save();
      ctx.translate(x + 5, py + 4);
      ctx.rotate((swingAngle * Math.PI) / 180);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(0, -6, 2, 8); // Alet sapı
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-2, -9, 6, 4); // Alet ucu
      ctx.restore();
    }
  }

  // Ana Karakter (AlphAvax - Pelerinli Şövalye)
  drawMainHero(ctx, x, y, tick) {
    const legSwing = Math.sin(tick * 0.08) * 3;

    // Mavi Pelerin
    ctx.fillStyle = '#1d4ed8';
    ctx.fillRect(x - 6, y - 2, 12, 16);

    // Zırhlı Bacaklar
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(x - 4, y + 12 + legSwing, 3, 6);
    ctx.fillRect(x + 1, y + 12 - legSwing, 3, 6);

    // Göğüs Zırhı & Altın İşleme
    ctx.fillStyle = '#475569';
    ctx.fillRect(x - 6, y + 2, 12, 11);
    ctx.fillStyle = '#fbbf24'; // Altın arma
    ctx.fillRect(x - 2, y + 5, 4, 5);

    // Kafa & Miğfer
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(x - 5, y - 8, 10, 10);
    ctx.fillStyle = '#0f172a'; // Göz vizörü
    ctx.fillRect(x - 3, y - 4, 6, 2);

    // Miğfer Tüyü (Kırmızı Plume)
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(x - 2, y - 12, 4, 4);

    // Sırtındaki AdAstra Kılıcı
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(x + 6, y - 4, 2, 12);
  }

  // ==========================================
  // 5. PARÇACIKLAR
  // ==========================================
  drawParticles(ctx) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;

      ctx.fillStyle = p.color;
      ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size);

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  // ==========================================
  // 6. RETRO PİKSEL VIGNETTE
  // ==========================================
  drawRetroVignette(ctx) {
    // Hafif kenar karartması & Altın Çerçeve Çizgisi
    ctx.strokeStyle = '#c6934b';
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, this.width - 4, this.height - 4);

    // 4 Köşe Altın/Yakut Mücevher Süsleri (DeFi Kingdoms Corner Gems)
    const corners = [
      { x: 6, y: 6 },
      { x: this.width - 12, y: 6 },
      { x: 6, y: this.height - 12 },
      { x: this.width - 12, y: this.height - 12 }
    ];

    corners.forEach(c => {
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(c.x, c.y, 8, 8);
      ctx.fillStyle = '#ef4444'; // Yakut merkez
      ctx.fillRect(c.x + 2, c.y + 2, 4, 4);
    });
  }
}
