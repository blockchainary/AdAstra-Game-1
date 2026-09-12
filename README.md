# 🌌 AdAstra: Genesis Realm (v2.0.0 Enterprise)

> **Avalanche (AVAX) Ekosistemi için Yeni Nesil Web3 GameFi & Strateji RPG Oyunu**

Bu depo, **AdAstra Token ($ADASTRA)** hiper-deflasyonist mikro/makro ekonomisi üzerine kurulu, Phaser 3 Canvas grafik motoru ve Vanilla ES6+ modüler State Yönetim Mimarisiyle geliştirilmiş **AdAstra: Genesis Realm** oyununun tam ve optimize edilmiş kurumsal kaynak kodlarını içerir.

📖 **Kapsamlı Ekonomi & Oyun Tasarım Dokümanı (Whitepaper):** [docs/GAME_DESIGN_AND_ECONOMY_WHITEPAPER.md](docs/GAME_DESIGN_AND_ECONOMY_WHITEPAPER.md)

---

## 🏛️ Mimari ve Teknoloji Yığını

* **Frontend & Engine:** Vanilla JavaScript (ES Modules), HTML5 Canvas, Phaser 3.80.1, Vanilla CSS (Glassmorphism & Pixel-Art Custom Design System).
* **Build & Dev Tooling:** Vite 5 (`vite --port 5173`).
* **AMM DEX Pazar Motoru:** $x \cdot y = k$ Constant Product Market Maker (Pangolin & Uniswap v2 tabanlı AMM Likidite Havuzları).
* **Otomatik Canlı Piyasa Botu:** Saniye başı AMM DEX fiyatlarını dinleyerek Silo ve Seviye Atlama ADA maliyetlerini gerçek zamanlı güncelleyen entegre bot.
* **Blockchain Entegrasyonu:** Avalanche C-Chain ($ADASTRA Tokenomics, Hazine & Otomatik %18 / %82 Burn/Hazine Mekanizması).
* **Test & Kalite Güvencesi:** Node.js ES Modules birim & entegrasyon test suiteleri.

---

## 📁 Sistem ve Dizin Yapısı

```
adastra-realm/
├── index.html                 # Ana HTML5 UI Shell, Üst Bilgi Barı, HUD & Modal İskeleti
├── vite.config.js             # Vite geliştirme ve yerel sunucu yapılandırması
├── package.json               # Bağımlılıklar, ortam ayarları ve npm test/dev scriptleri
├── .gitignore                 # Kurumsal dosya dışlama yapılandırması
│
├── docs/                      # 📚 Kapsamlı Dokümantasyon & Whitepaper
│   └── GAME_DESIGN_AND_ECONOMY_WHITEPAPER.md # Oyun Tasarımı, Kıtlık Modeli & 10 Yıllık Tokenomics
│
├── js/                        # 🧠 Oyun Motoru ve Mantık Katmanı (State & Logic)
│   ├── config.js              # Oyun sabitleri, havuz koridorları, sefer süreleri, ekipman ve asker dengeleri
│   ├── gameState.js           # Ana State Manager (Can, iyileşme, seviye atlama, envanter, AMM canlı botu)
│   ├── ammMarket.js           # Automated Market Maker (x * y = k DEX Swap, likidite havuzları, spot/çıkış fiyatları)
│   ├── globalPool.js          # Küresel Kıtlık Havuzları, Hazine & 10B Makro Tokenomics Yöneticisi
│   ├── bestiary.js            # Canavar veritabanı, boss dövüş mekanikleri, taktiksel kart & aksiyon havuzu
│   ├── audio.js               # Web Audio API tabanlı dinamik sentezlenmiş SFX ses motoru
│   ├── grandTownScene.js      # Phaser 3 Krallık / Kasaba Açık Dünya Sahnesi
│   ├── dungeonScene.js        # Phaser 3 Zindan Katları & Boss Haritaları Sahnesi
│   └── app.js                 # UI Controller, Canlı Ticker, Modal Yöneticisi, Kısayollar & Game Loop
│
├── css/
│   └── style.css              # Tasarım Sistemi, Dashboard Grid, Kolezyum, Zindan ve UI Teması
│
├── assets/                    # Pixel art sprite'lar, harita dokuları ve ses efektleri
└── public/                    # Statik web varlıkları ve ikonlar
```

---

## ⚙️ Temel Sistemler ve Yenilikler (v2.0)

### 1. 🤖 AMM DEX Canlı Fiyat Botu & Dinamik Yükseltme Maliyeti
- **Silo & Seviye Atlama Maliyetleri:** Seviye atlamak ve Silo kapasitesini büyütmek için istenen Odun, Demir ve Buğday hammaddelerinin **AMM DEX Pazar Yeri'ndeki anlık toplam $ADASTRA değeri** ekstra token maliyeti olarak talep edilir.
- **Saniyelik Canlı Bot (`tickUpgradeCostBot`):** Oyun döngüsünde saniyede bir otomatik çalışan bot, AMM havuzlarındaki anlık likidite ve fiyat hareketlerini okur; açık pencerelerdeki maliyetleri canlı borsa ticker'ı gibi günceller.
- Harcanan tüm $ADASTRA tokenları protokol kuralları uyarınca yakım ve hazine havuzlarına aktarılır.

### 2. ⚔️ Sınırsız Ordu & 180.000 ADA Asker Alımı
- Eski ordu sınırı kaldırılmış olup oyuncular sınırsız sayıda asker alabilmektedir.
- Her 1 askerin satın alma maliyeti sabit **180.000 $ADASTRA** olarak yapılandırılmıştır.
- Askerler savaştan sonra kışlada depodaki buğdayla pasif olarak veya anında ADA ile iyileştirilebilir.

### 3. 💀 Zindan Sistemi, Boss Çarpanları & Nadir Ganimetler
- **Teçhizat Parçaları & Pandora Kutusu:** Zindanlardan düşen parçaların ve kutuların düşme oranları zindan seviyesinden bağımsız, doğrudan **Hesap Seviyesine** bağlanmıştır.
  - Seviye 1'den Seviye 81'e kadar tam **100 kat** artış:
    - *Teçhizat Parçaları:* `%0,18` $\rightarrow$ `%18,00`
    - *Pandora Kutusu:* `%0,0018` $\rightarrow$ `%0,18`
- **Kat 3 (Kadim Taş Golyat) ve Kat 6 (Kıyamet Ejderhası IGNIS) Bossları:**
  - Özel **+%100 Düşürme Çarpanı (2.0x)** tanımlanmıştır (Lv.81'de Parça %36, Kutu %0,36).
  - Bosslar çoklu tur aksiyonları ve yüksek can havuzu ile stratejik meydan okuma sunar.
  - Kat 5'ten Kat 6'ya geçiş portalı taş butonu ile doğrudan ışınlanma desteklenmektedir.

### 4. 🌾 Sefer Taşma Koruması & Krallık Merkezi
- Seferden dönen kaynak oyuncunun silosunu taşıracaksa sistem otomatik koruma uyarısı verir: *"Silo'nuz dolu! Lütfen ilgili kaynağın seferini tamamlamak için silonuzu büyütün ve yer açın."*
- Krallık merkezinde *"Tüm Seferleri Başlat"* tuşunda stamina yetersizliği kontrolü ve net kullanıcı bilgilendirmesi bulunur.

### 5. 🍦 Vanilla Sıfırlama
- Test menüsünde yer alan Vanilla Sıfırlama, oyun ekonomisini ve AMM havuzlarını bozmadan yalnızca kişisel hesap ilerlemesini sıfırlar.

---

## 🚀 Kurulum ve Çalıştırma

### Gereksinimler
* Node.js (v18+ önerilir)
* npm veya pnpm

### Projeyi Başlatma
```bash
# Bağımlılıkları yükleyin
npm install

# Yerel geliştirme sunucusunu başlatın (Port: 5173)
npm run dev

# Doğrulama testlerini çalıştırın
npm test
```

---

## 📜 Lisans & Telif Hakkı
Bu proje **AdAstra Ekosistemi & AlphAvax** tarafından geliştirilmiştir. Tüm hakları saklıdır.
