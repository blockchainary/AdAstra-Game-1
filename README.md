# 🌌 AdAstra: Genesis Realm (v1.0.0 Master)

> **Avalanche (AVAX) Ekosistemi için Web3 RPG & GameFi Strateji Oyunu**

Bu depo, **AdAstra Token ($ADASTRA)** ekonomisi üzerine kurulu, Phaser 3 Canvas grafik motoru ve Vanilla ES6+ modüler State Yönetim Mimarisiyle geliştirilmiş **AdAstra: Genesis Realm** oyununun tam kaynak kodlarını içerir.

---

## 🏗️ Proje Mimarisi ve Teknoloji Yığını

* **Frontend & Rendering:** Vanilla JavaScript (ES Modules), HTML5 Canvas, Phaser 3.80.1, CSS3 (Glassmorphism & Pixel-Art Custom Design System).
* **Build & Dev Server:** Vite 5 (`vite --port 5173`).
* **Test & Doğrulama:** Node.js ES Modules test suiteleri & Playwright E2E otomasyon testleri.
* **Blockchain Entegrasyonu:** Avalanche C-Chain ($ADASTRA Tokenomics, Pangolin DEX AMM modeli, Hazine & Burn Mekanizması).

---

## 📁 Dizin ve Dosya Yapısı

```
adastra-realm/
├── index.html                 # Ana HTML5 UI Shell, Üst Bilgi Barı, HUD & Modal İskeleti
├── vite.config.js             # Vite geliştirme ve port yapılandırması
├── package.json               # Bağımlılıklar ve npm scriptleri
│
├── js/                        # 🧠 Oyun Motoru ve Mantık Katmanı
│   ├── config.js              # Oyun sabitleri, haftalık limitler, sefer süreleri, ekipman tarifleri
│   ├── gameState.js           # Ana State Manager (LocalStorage v6, can, iyileşme, seviye, envanter, 1-Click)
│   ├── globalPool.js          # Küresel Kıtlık Havuzları & 10B Makro Tokenomics Simülatörü
│   ├── ammMarket.js           # Automated Market Maker (x * y = k DEX Swap & Likidite Havuzu)
│   ├── audio.js               # Web Audio API tabanlı sentezlenmiş SFX ses motoru
│   ├── grandTownScene.js      # Phaser 3 Kasaba / Krallık Açık Dünya Sahnesi
│   ├── dungeonScene.js        # Phaser 3 Zindan Katları & Canavar Savaş Sahnesi
│   └── app.js                 # Ana UI Controller, Modal Yöneticisi, Klavye Kısayolları & Event Loop
│
├── css/
│   └── style.css              # Tasarım Sistemi, Dashboard Grid, Kolezyum, Zindan ve UI Teması
│
├── assets/                    # Pixel art sprite'lar, arkaplan haritaları ve ses efektleri
│
└── tests / test scripts/      # Doğrulama ve Test Dosyaları
    ├── test_mechanics.mjs     # Kaynak limitleri, asker alımı ve savaş tahmin testleri
    ├── test_ui_overhaul.mjs   # Dashboard, 1-Click eylemleri, Akıllı Silah Deposu testleri
    └── e2e_full_test.mjs      # Kapsamlı E2E test paketi
```

---

## ⚙️ Temel Sistemler ve Matematiksel Modeller

### 1. 📈 Hassas Sefer Süresi Formülü (Exponential Scaling)
* **Seviye 1:** 18 Dakika (`1.080` saniye)
* **Seviye 81:** 72 Saat (`259.200` saniye)
* Formül: `1080 + (level - 1) * 3226.5` saniye (Seviye başına `+53.775` dakika artış).

### 2. 🌾 Buğday Tabanlı Pasif İyileşme (Auto-Heal Engine)
* 0 HP'den %100 cana ulaşma süresi: **18 Saat** (`64.800` saniye).
* Buğday Tüketimi: Eksik 1 HP başına **0.5 Buğday** (0 ADA). Depoda buğday biterse iyileşme duraklar.
* Hızlı Doyur & İyileştir: **Buğday + ADA** (1 HP başına 1.5 ADA).

### 3. 📊 Haftalık Kaynak Limitleri
* **Güneş Buğdayı (Wheat):** `490.000`
* **Zümrüt Meşe Odunu (Wood):** `180.000`
* **Derin Demir Cevheri (Iron):** `130.000`

### 4. 💱 AMM DEX Likidite Havuzları ($x \cdot y = k$)
* Havuzlar `ammMarket.js` üzerinden sabit çarpım formülüyle anlık fiyat hesaplar.

---

## 🚀 Projeyi Yerelde Çalıştırma

Projeyi yerel makinenizde çalıştırmak için:

```bash
# 1. Bağımlılıkları yükleyin (varsa)
npm install

# 2. Geliştirme sunucusunu başlatın
npm run dev

# 3. Tarayıcıda açın
http://localhost:5173/
```

### 🧪 Testleri Çalıştırma:

```bash
# Mekanik & Kaynak Limitleri Testi
node test_mechanics.mjs

# UI Overhaul & Dashboard Engine Testi
node test_ui_overhaul.mjs

# Syntax Doğrulama
node --check js/app.js js/config.js js/gameState.js js/ammMarket.js js/globalPool.js
```

---

## ⌨️ Klavye Kısayolları

| Kısayol | Açıklama |
| :--- | :--- |
| **`TAB`** | 🏰 Krallık Dashboard (1-Click Yönetim Merkezi) |
| **`Ctrl + K`** | 🔍 Komut Paleti (Hızlı Arama & Navigasyon) |
| **`1` / `S`** | 🌲 Zümrüt Ormanı & Oduncu |
| **`2` / `I`** | ⛏️ Maden Ocağı & Tamirhane |
| **`3` / `F`** | 🌾 Güneş Tarlası & Değirmen |
| **`4` / `B`** | ⚔️ Askeri Kışla & Ordu Yönetimi |
| **`5` / `M`** | 🏪 AMM Pazar Yeri |
| **`6` / `D`** | 💀 Dağ Zindanı Sahnesi |
| **`7` / `C`** | 🏟️ Büyük Gladyatör Kolezyumu |
| **`Q`** | 📜 Günlük & Haftalık Görevler |
| **`E`** | 🎒 Karakter Envanteri & Eserler |
| **`T`** | 🧪 Geliştirici & Test Paneli |
| **`Esc`** | ✕ Tüm Açık Modalleri / Pencereleri Kapat |

---

## 📜 Lisans & Telif
© 2026 **AlphAvax & AdAstra Realm Ekosistemi**. Tüm hakları saklıdır.
