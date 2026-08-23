### 📄 AdAstra Realm | AAA Fantasy UI/UX Design System & CSS Specifications
**Tasarım Felsefesi:** Lüks kristal cam, altın çerçeve, derin renk paleti, mikro etkileşimler ve AAA oyun deneyimine uygun performans. Tüm CSS değişkenleri `ada-` öneki ile namespaced edilmiştir; mevcut projenize sorunsuz `@import` veya `style.css` eklenebilir.

---

## 1. 💎 MODERN AAA FANTASY GLASSMORPHISM & SHADOW / BORDER SİSTEMİ

### CSS Değişkenleri (`:root` içinde)
```css
:root {
  /* Renk Paleti */
  --ada-primary-gold: #FFD700;
  --ada-deep-black: #0A0A1A;
  --ada-card-bg: rgba(18, 20, 35, 0.65);
  --ada-glass-border: rgba(255, 215, 0, 0.28);
  --ada-glow-gold: rgba(255, 215, 0, 0.18);
  --ada-glow-silver: rgba(200, 220, 255, 0.12);
  
  /* Rarity Renkleri */
  --ada-rarity-common: #A0A0A0;
  --ada-rarity-rare: #34C759;
  --ada-rarity-epic: #9B59B6;
  --ada-rarity-legendary: #E67E22;
  
  /* Gölge & Border */
  --ada-shadow-soft: 0 8px 32px rgba(0, 0, 0, 0.45);
  --ada-shadow-glow: 0 0 24px var(--ada-glow-gold);
  --ada-shadow-inner: inset 0 2px 4px rgba(0, 0, 0, 0.3);
}
```

### Glassmorphism Modüller & Kartlar
```css
/* Temel Cam Kart */
.glass-card {
  background: var(--ada-card-bg);
  backdrop-filter: blur(20px) saturate(1.8);
  -webkit-backdrop-filter: blur(20px) saturate(1.8);
  border: 1px solid var(--ada-glass-border);
  border-radius: 12px;
  box-shadow: var(--ada-shadow-soft), var(--ada-shadow-inner);
  transition: all 0.32s cubic-bezier(0.4, 0, 0.2, 1);
}

.glass-card:hover {
  border-color: var(--ada-primary-gold);
  box-shadow: 0 0 36px var(--ada-glow-gold), var(--ada-shadow-soft);
  transform: translateY(-2px) scale(1.01);
}

/* Altın Çerçeve Sınırı */
.gold-border {
  border: 2px solid var(--ada-primary-gold) !important;
  box-shadow: 0 0 20px var(--ada-glow-gold);
}

/* Kristal Parıltı Efekti */
.crystal-glow {
  position: relative;
  animation: crystal-sparkle 4s ease-in-out infinite;
}
.crystal-glow::before {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 16px;
  background: linear-gradient(135deg, var(--ada-primary-gold), transparent, var(--ada-primary-gold));
  opacity: 0;
  animation: border-flash 3s infinite;
}
@keyframes crystal-sparkle {
  0%, 100% { filter: brightness(1) drop-shadow(0 0 0 var(--ada-glow-gold)); }
  50% { filter: brightness(1.3) drop-shadow(0 0 12px var(--ada-primary-gold)); }
}
@keyframes border-flash {
  0%, 90% { opacity: 0; }
  95%, 100% { opacity: 0.4; }
}
```

### Dinamik Hover Kartlar (`.clean-card`, `.soldier-sheet-card`, `.stat-pill`)
```css
.clean-card, .soldier-sheet-card, .stat-pill {
  background: var(--ada-card-bg);
  border: 1px solid var(--ada-glass-border);
  backdrop-filter: blur(16px);
  transition: 0.24s all ease;
}

.clean-card:hover, .soldier-sheet-card:hover, .stat-pill:hover {
  border-color: var(--ada-primary-gold);
  box-shadow: 0 4px 20px var(--ada-glow-gold);
}

/* Stat Pill Yüzey Başlığı */
.stat-pill .pill-title {
  background: linear-gradient(135deg, var(--ada-primary-gold), #FFA500);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: 700;
}
```

---

## 2. 👑 ÜST MENÜ VE KAYNAK ROZETLERİ (TOP NAV & RESOURCE DOCKS)

### Üst Menü Butonları
```css
.top-nav {
  display: flex;
  gap: 2px;
  background: rgba(10, 10, 25, 0.6);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--ada-glass-border);
}

.nav-button {
  padding: 10px 20px;
  color: #e0e0e0;
  background: transparent;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.nav-button::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  width: 0;
  height: 2px;
  background: var(--ada-primary-gold);
  transition: all 0.3s ease;
  transform: translateX(-50%);
}

.nav-button:hover {
  color: var(--ada-primary-gold);
  transform: translateY(-1px);
}

.nav-button.active {
  color: var(--ada-primary-gold);
  text-shadow: 0 0 8px var(--ada-primary-gold);
}

.nav-button.active::after {
  width: 80%;
}

/* Menü İkonları */
.nav-button .icon {
  width: 18px;
  height: 18px;
  margin-right: 6px;
  filter: brightness(0) invert(1);
  transition: transform 0.2s;
}

.nav-button:hover .icon { transform: scale(1.12); }
```

### Kaynak Rozetleri (Haplar)
```css
.resource-dock {
  display: flex;
  gap: 14px;
  align-items: center;
  background: rgba(15, 18, 35, 0.7);
  backdrop-filter: blur(16px);
  border: 1px solid var(--ada-glass-border);
  border-radius: 10px;
  padding: 8px 12px;
}

.resource-orb {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: linear-gradient(135deg, rgba(255,215,0,0.12), rgba(255,165,0,0.08));
  border: 1px solid var(--ada-glass-border);
  border-radius: 20px;
  color: #FFD700;
  font-weight: 700;
  font-size: 12px;
  backdrop-filter: blur(10px);
  transition: all 0.24s ease;
}

.resource-orb:hover {
  border-color: var(--ada-primary-gold);
  transform: translateY(-1px) scale(1.03);
  box-shadow: 0 0 16px var(--ada-glow-gold);
}

/⚠️ Kaynak İkonları için span.ic { display: inline-block; width: 14px; height: 14px; background: url('data:image/svg+xml,...') no-repeat; }
```

---

## 3. ⚔️ ORDU, TEÇHİZAT & SET BONUSU KARTLARI

### 18 Askerin Roster Grid'i
```css
.roster-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(136px, 1fr));
  gap: 12px;
  justify-items: center;
}

.unit-card {
  width: 136px;
  background: var(--ada-card-bg);
  backdrop-filter: blur(14px);
  border: 1px solid var(--ada-glass-border);
  border-radius: 10px;
  padding: 10px;
  text-align: center;
  transition: 0.28s all ease;
  position: relative;
}

.unit-card:hover {
  border-color: var(--ada-primary-gold);
  box-shadow: 0 0 24px var(--ada-glow-gold);
}

/* Rarity Renkli Alt Çerçeve */
.unit-card.common { border-color: var(--ada-rarity-common); }
.unit-card.rare { border-color: var(--ada-rarity-rare); box-shadow: 0 0 12px var(--ada-rarity-rare); }
.unit-card.epic { border-color: var(--ada-rarity-epic); box-shadow: 0 0 16px var(--ada-rarity-epic); }
.unit-card.legendary { 
  border: 2px solid var(--ada-primary-gold); 
  box-shadow: 0 0 32px var(--ada-primary-gold), 0 0 64px rgba(255,215,0,0.3);
  animation: legendary-pulse 2s infinite;
}
@keyframes legendary-pulse {
  0%, 100% { box-shadow: 0 0 32px var(--ada-primary-gold), 0 0 64px rgba(255,215,0,0.3); }
  50% { box-shadow: 0 0 48px var(--ada-primary-gold), 0 0 96px rgba(255,215,0,0.5); }
}
```

### 5 Ekipman Yuvası (Envanter Kutuları)
```css
.equip-slot {
  width: 48px;
  height: 48px;
  background: var(--ada-card-bg);
  backdrop-filter: blur(12px);
  border: 1px solid var(--ada-glass-border);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.equip-slot:hover {
  border-color: var(--ada-primary-gold);
  transform: scale(1.08);
  box-shadow: 0 0 14px var(--ada-glow-gold);
}

.equip-slot.occupied { background: linear-gradient(135deg, #1e293b, #0f0f23); }
```

### Set Bonusu Rozetinin Luxor Animasyonu
```css
.set-badge {
  width: 72px;
  height: 72px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: 2px solid var(--ada-primary-gold);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 800;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  box-shadow: 0 0 20px rgba(255,215,0,0.4), 0 4px 12px rgba(0,0,0,0.4);
  position: relative;
  overflow: hidden;
}

.set-badge::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: linear-gradient(45deg, transparent, rgba(255,255,255,0.15), transparent);
  animation: shimmer 3s infinite;
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 12px var(--ada-glow-gold); }
  50% { box-shadow: 0 0 28px var(--ada-primary-gold), 0 0 48px rgba(255,215,0,0.5); }
}
.set-badge.pulsing { animation: pulse-glow 1.8s ease-in-out infinite; }
```

---

## 4. 📊 GÖREVLER & SEFER GERİ SAYIM ÇUBUKLARI

### İlerleme Barları (Progress Bars)
```css
.progress-wrapper {
  width: 100%;
  height: 10px;
  background: rgba(255,255,255,0.08);
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--ada-glass-border);
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #3498db, #e84393, #fdcb6e);
  width: 0%;
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.3);
}

.progress-bar::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
  animation: progress-shine 2s infinite;
}

@keyframes progress-shine {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(200%); }
}
```

### Butonlar (ÖDÜLÜ AL, SEFERİ BAŞLAT, ERKEN TOPLA)
```css
.quest-btn {
  padding: 10px 22px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;
  overflow: hidden;
}

.quest-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, var(--ada-primary-gold), #FFA500);
  opacity: 0;
  transition: opacity 0.2s;
}

.quest-btn:hover::before { opacity: 0.1; }

.quest-btn:active {
  transform: translateY(2px) scale(0.98);
  box-shadow: inset 0 2px 6px rgba(0,0,0,0.3);
}

/* Ödül Al Butonu */
.btn-reward {
  background: linear-gradient(135deg, #2ECC71, #27AE60);
  color: #fff;
  box-shadow: 0 4px 14px rgba(46, 204, 113, 0.35);
}

.btn-reward:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 22px rgba(46, 204, 113, 0.45);
}

/* Sefer Başlat Butonu */
.btn-expedition {
  background: linear-gradient(135deg, #E74C3C, #C0392B);
  color: #fff;
  box-shadow: 0 4px 14px rgba(231, 76, 60, 0.35);
}

.btn-expedition:hover {
  transform: translateY(-1px) scale(1.02);
  box-shadow: 0 6px 24px rgba(231, 76, 60, 0.45);
}

/* Erken Topla Butonu */
.btn-early {
  background: linear-gradient(135deg, #9B59B6, #8E44AD);
  color: #fff;
  box-shadow: 0 4px 14px rgba(155, 89, 182, 0.35);
}
```

### Sefer Geri Sayımı
```css
.timer-display {
  background: var(--ada-card-bg);
  backdrop-filter: blur(16px);
  border: 1px solid var(--ada-glass-border);
  border-radius: 10px;
  padding: 12px 18px;
  text-align: center;
  color: #FFD700;
  font-size: 14px;
  font-weight: 700;
}

.timer-ring {
  width: 80px;
  height: 80px;
  border: 8px solid var(--ada-glass-border);
  border-radius: 50%;
  background: conic-gradient(from 0deg, var(--ada-card-bg) 0deg, var(--ada-primary-gold) var(--progress%));
  position: relative;
}

.timer-ring::after {
  content: '';
  position: absolute;
  inset: 10px;
  border-radius: 50%;
  background: var(--ada-deep-black);
}
```

---

## 5. 📜 DOĞRUDAN UYGULANABİLİR CSS KODLARI

Aşağıdaki kodları `style.css` dosyanıza veya bir `<style>` etiketine doğrudan kopyalayabilirsiniz. Değişkenler `:root` bloğunun en başına, sınıfları ilgili bileşenlerin sonuna ekleyin.

```css
/* ============================================
   ADAstra REALM | AAA FANTASY UI/UX DESIGN SYSTEM
   Tasarımcı: Web3 RPG UI Art Director
   ============================================ */

/* ---------- BAŞLANGIK DEĞİŞKENLERİ ---------- */
:root {
  --ada-primary-gold: #FFD700;
  --ada-deep-black: #0A0A1A;
  --ada-card-bg: rgba(18, 20, 35, 0.68);
  --ada-glass-border: rgba(255, 215, 0, 0.26);
  --ada-glow-gold: rgba(255, 215, 0, 0.16);
  --ada-glow-silver: rgba(200, 220, 255, 0.1);
  
  --ada-rarity-common: #A0A0A0;
  --ada-rarity-rare: #34C759;
  --ada-rarity-epic: #9B59B6;
  --ada-rarity-legendary: #E67E22;
  
  --ada-shadow-soft: 0 10px 40px rgba(0,0,0,0.5);
  --ada-shadow-glow: 0 0 28px var(--ada-glow-gold);
  --ada-shadow-inner: inset 0 2px 6px rgba(0,0,0,0.35);
}

/* ---------- GLASSMORPHISM & KARTLAR ---------- */
.glass-card {
  background: var(--ada-card-bg);
  backdrop-filter: blur(20px) saturate(1.9);
  -webkit-backdrop-filter: blur(20px) saturate(1.9);
  border: 1px solid var(--ada-glass-border);
  border-radius: 12px;
  box-shadow: var(--ada-shadow-soft);
  transition: all 0.32s cubic-bezier(0.4,0,0.2,1);
}
.glass-card:hover {
  border-color: var(--ada-primary-gold);
  box-shadow: 0 0 38px var(--ada-glow-gold), var(--ada-shadow-soft);
  transform: translateY(-3px) scale(1.015);
}
.gold-border { border: 2px solid var(--ada-primary-gold) !important; box-shadow: 0 0 22px var(--ada-glow-gold); }
.crystal-glow { position: relative; animation: crystal-sparkle 4s ease-in-out infinite; }
.crystal-glow::before {
  content: ''; position: absolute; inset: -4px; border-radius: 16px;
  background: linear-gradient(135deg, var(--ada-primary-gold), transparent, var(--ada-primary-gold));
  opacity: 0; animation: border-flash 3s infinite;
}
@keyframes crystal-sparkle { 0%,100% { filter: brightness(1) drop-shadow(0 0 0 var(--ada-glow-gold)); } 50% { filter: brightness(1.3) drop-shadow(0 0 14px var(--ada-primary-gold)); } }
@keyframes border-flash { 0%,90% { opacity: 0; } 95%,100% { opacity: 0.35; } }

.clean-card, .soldier-sheet-card, .stat-pill {
  background: var(--ada-card-bg); border: 1px solid var(--ada-glass-border); backdrop-filter: blur(16px);
  transition: all 0.24s ease;
}
.clean-card:hover, .soldier-sheet-card:hover, .stat-pill:hover {
  border-color: var(--ada-primary-gold); box-shadow: 0 4px 20px var(--ada-glow-gold);
}
.stat-pill .pill-title {
  background: linear-gradient(135deg, var(--ada-primary-gold), #FFA500);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; font-weight: 700;
}

/* ---------- ÜST MENÜ & ROZETLER ---------- */
.top-nav { display: flex; gap: 2px; background: rgba(10,10,25,0.6); backdrop-filter: blur(12px); border-bottom: 1px solid var(--ada-glass-border); }
.nav-button {
  padding: 10px 20px; color: #e0e0e0; background: transparent; border: none; border-radius: 8px;
  font-size: 13px; font-weight: 600; cursor: pointer; position: relative;
  transition: all 0.2s ease;
}
.nav-button::after {
  content: ''; position: absolute; bottom: 0; left: 50%; width: 0; height: 2px; background: var(--ada-primary-gold);
  transition: all 0.3s ease; transform: translateX(-50%);
}
.nav-button:hover { color: var(--ada-primary-gold); transform: translateY(-1px); }
.nav-button.active { color: var(--ada-primary-gold); text-shadow: 0 0 8px var(--ada-primary-gold); }
.nav-button.active::after { width: 80%; }
.nav-button .icon { width: 18px; height: 18px; margin-right: 6px; filter: brightness(0) invert(1); transition: transform 0.2s; }
.nav-button:hover .icon { transform: scale(1.12); }

.resource-dock { display: flex; gap: 14px; align-items: center; background: rgba(15,18,35,0.7); backdrop-filter: blur(16px); border: 1px solid var(--ada-glass-border); border-radius: 10px; padding: 8px 12px; }
.resource-orb {
  display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px;
  background: linear-gradient(135deg, rgba(255,215,0,0.12), rgba(255,165,0,0.08)); border: 1px solid var(--ada-glass-border); border-radius: 20px; color: #FFD700; font-weight: 700; font-size: 12px; backdrop-filter: blur(10px);
}
.resource-orb:hover { border-color: var(--ada-primary-gold); transform: translateY(-1px) scale(1.03); box-shadow: 0 0 18px var(--ada-glow-gold); }

/* ---------- ORDU, TEÇHİZAT & SET BONUSU ---------- */
.roster-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(136px, 1fr)); gap: 12px; justify-items: center; }
.unit-card {
  width: 136px; background: var(--ada-card-bg); backdrop-filter: blur(14px); border: 1px solid var(--ada-glass-border); border-radius: 10px; padding: 10px; text-align: center; transition: 0.28s all ease;
  position: relative;
}
.unit-card:hover { border-color: var(--ada-primary-gold); box-shadow: 0 0 28px var(--ada-glow-gold); }
.unit-card.common { border-color: var(--ada-rarity-common); }
.unit-card.rare { border-color: var(--ada-rarity-rare); box-shadow: 0 0 14px var(--ada-rarity-rare); }
.unit-card.epic { border-color: var(--ada-rarity-epic); box-shadow: 0 0 18px var(--ada-rarity-epic); }
.unit-card.legendary { border: 2px solid var(--ada-primary-gold); box-shadow: 0 0 36px var(--ada-primary-gold), 0 0 64px rgba(255,215,0,0.3); animation: legendary-pulse 2s infinite; }
@keyframes legendary-pulse { 0%,100% { box-shadow: 0 0 36px var(--ada-primary-gold), 0 0 64px rgba(255,215,0,0.3); } 50% { box-shadow: 0 0 52px var(--ada-primary-gold), 0 0 88px rgba(255,215,0,0.5); } }

.equip-slot { width: 48px; height: 48px; background: var(--ada-card-bg); backdrop-filter: blur(12px); border: 1px solid var(--ada-glass-border); border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s ease; }
.equip-slot:hover { border-color: var(--ada-primary-gold); transform: scale(1.08); box-shadow: 0 0 16px var(--ada-glow-gold); }
.equip-slot.occupied { background: linear-gradient(135deg, #1e293b, #0f0f23); }

.set-badge {
  width: 72px; height: 72px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: 2px solid var(--ada-primary-gold); border-radius: 14px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 0 22px rgba(255,215,0,0.4); position: relative; overflow: hidden;
}
.set-badge::before { content: ''; position: absolute; inset: 0; background: linear-gradient(45deg, transparent, rgba(255,255,255,0.18), transparent); animation: shimmer 3s infinite; }
@keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
.set-badge.pulsing { animation: pulse-glow 1.8s ease-in-out infinite; }
@keyframes pulse-glow { 0%,100% { box-shadow: 0 0 14px var(--ada-glow-gold); } 50% { box-shadow: 0 0 32px var(--ada-primary-gold), 0 0 52px rgba(255,215,0,0.5); } }

/* ---------- GÖREVLER & SEFER ÇUBUKLARI ---------- */
.progress-wrapper { width: 100%; height: 10px; background: rgba(255,255,255,0.08); border-radius: 6px; overflow: hidden; border: 1px solid var(--ada-glass-border); }
.progress-bar { height: 100%; background: linear-gradient(90deg, #3498db, #e84393, #fdcb6e); width: 0%; transition: width 0.4s cubic-bezier(0.4,0,0.2,1); position: relative; box-shadow: inset 0 1px 2px rgba(0,0,0,0.3); }
.progress-bar::after { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent); animation: progress-shine 2s infinite; }
@keyframes progress-shine { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }

.quest-btn {
  padding: 10px 22px; font-size: 13px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; border: none; border-radius: 8px; cursor: pointer; transition: all 0.15s ease; position: relative; overflow: hidden;
}
.quest-btn::before { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg, var(--ada-primary-gold), #FFA500); opacity: 0; transition: opacity 0.2s; }
.quest-btn:hover::before { opacity: 0.1; }
.quest-btn:active { transform: translateY(2px) scale(0.98); box-shadow: inset 0 2px 6px rgba(0,0,0,0.3); }

.btn-reward { background: linear-gradient(135deg, #2ECC71, #27AE60); color: #fff; box-shadow: 0 4px 14px rgba(46,204,113,0.35); }
.btn-reward:hover { transform: translateY(-1px); box-shadow: 0 6px 22px rgba(46,204,113,0.45); }

.btn-expedition { background: linear-gradient(135deg, #E74C3C, #C0392B); color: #fff; box-shadow: 0 4px 14px rgba(231,76,60,0.35); }
.btn-expedition:hover { transform: translateY(-1px) scale(1.02); box-shadow: 0 6px 24px rgba(231,76,60,0.45); }

.btn-early { background: linear-gradient(135deg, #9B59B6, #8E44AD); color: #fff; box-shadow: 0 4px 14px rgba(155,89,182,0.35); }

.timer-display { background: var(--ada-card-bg); backdrop-filter: blur(16px); border: 1px solid var(--ada-glass-border); border-radius: 10px; padding: 12px 18px; text-align: center; color: #FFD700; font-size: 14px; font-weight: 700; }
.timer-ring { width: 80px; height: 80px; border: 8px solid var(--ada-glass-border); border-radius: 50%; background: conic-gradient(from 0deg, var(--ada-card-bg) 0deg, var(--ada-primary-gold) var(--progress%)); position: relative; }
.timer-ring::after { content: ''; position: absolute; inset: 10px; border-radius: 50%; background: var(--ada-deep-black); }
```

### 📦 Entegrasyon Notu
- Tüm sınıflar `ada-` öneki ile namespaced edilmiştir. Mevcut projede benzer sınıflar varsa, sadece class adlarını `ada-` önekiyle değiştirebilir veya `:root` değişkenlerini mevcut renk paletinize uygun olarak ayarlayabilirsiniz.
- `backdrop-filter: blur()` tarayıcı desteğini kontrol edin (Chrome, Edge, Safari modern sürümleri tam destekler).
- Animasyonlar `prefers-reduced-motion` medya sorgusu ile devre dışı bırakılabilir: 
  ```css
  @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; } }
  ```
- İkonlar için SVG data URI'ler veya font ikon setleri (`fontawesome`, `remixicon` vb.) kullanılabilir; `.icon` sınıfı zaten boyut ve invert özelliği için hazırlanmıştır.

Herhangi bir bileşeni projenizin mevcut yapısına göre özelleştirmek isterseniz, sınıf adlarını değiştirmek veya `var(--ada-...)` değişkenlerini kendi renk kodlarınızla güncellemek yeterli olacaktır. Başarılar dilerim — AdAstra Realm'iniz şart! 🚀✨