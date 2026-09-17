# 🌌 Realm of Astra (v2.4.0 Enterprise)

> **Avalanche (AVAX) Ekosisteminde Yeni Nesil Web3 GameFi & Strateji RPG Başyapıtı**  
> *DeFi Kingdoms standartlarında hiper-deflasyonist mikro/makro ekonomi, Phaser 3 Canvas rendering motoru ve Vanilla ES6+ modüler State mimarisi.*  
> *Aşama: **Genesis Devnet / Client-Side Sandbox Simulation** (Sunucu & Akıllı Kontrat Otoritesine Geçişe Tam Uyumlu Altyapı).*

---

## 📚 Kapsamlı Dokümantasyon & Referanslar

* 📖 **[Master Whitepaper & Oyun Tasarımı](docs/GAME_DESIGN_AND_ECONOMY_WHITEPAPER.md):** 10 Yıllık Makro Ekonomi, AMM Likidite Modeli, Hazine Anayasası, Anti-Tamper Zaman Protokolü ve Tüm Sistemlerin Detaylı Rehberi.
* 📊 **[Tüm Sistemlerin Seviye Atlama & Denge Tabloları](docs/LEVEL_PROGRESSION_TABLES.md):** Hesap Seviyesi (1-81), Silo (1-18), Asker Alımı (1-18), Asker Statları (1-81), 5 Ekipman Parçası (1-10) ve Zindan Seviyelerinin tek tek matematiksel tabloları.

---

## 🌟 Öne Çıkan Temel Sistemler ve Güncel Mekanikler (v2.4.0)

### 1. 🔥 Evrensel Hammadde Yakımı (Universal Resource Burn)
Oyunda harcama olarak tüketilen **tüm Odun, Demir ve Buğdaylar kalıcı olarak yakılır (burn)** ve küresel haftalık toplam arzdan silinir:
- Silo yükseltme, hesap seviyesi atlama, alet tamiri, teçhizat dövme (craft), teçhizat seviye yükseltme, teçhizat onarımı, stamina doldurma, asker iyileştirme ve çark çevirme harcamaları anında yakılarak deflasyona uğrar.
- Küresel havuzdaki kaynak kotası (`totalCap`) harcanan miktar kadar küçülür; hiçbir kaynak havuza geri dönmez.

### 2. 🤝 Adil Evrensel Temel Gelir (UBI) & Balina Koruması
- **Adil Kök Modeli:** $W(L) = 1 + \sqrt{L - 1} \times 0.75$. Üstel balina sübvansiyonu kaldırılmış; yeni başlayanlar ile son seviye arasında sürdürülebilir bir denge kurulmuştur.
- **Tek Çekim Tavanı:** Hiçbir hesap tek talepte UBI havuzunun **%5'inden fazlasını** çekemez.
- **Havuz Emniyet Tamponu:** Havuz bakiyesi %50 seviyesine indiğinde ödemeler orantılı dengelenir, havuz asla sıfırlanmaz.

### 3. ⚔️ Tek Tip Asker + Yetenek Yükü (Skill Loadout) & Formasyon
- **Tek Tip Asker Stat Modeli:** Askerler sınıf kısıtı olmadan aynı temel eğriyi ($100 + 25 \cdot (L - 1)$ HP, $25 + 6 \cdot (L - 1)$ ATK) takip eder. Ordu sınırı kaldırılmıştır; ilk asker 5.000 ADA, 18. asker 1.800.000 ADA'dır.
- **Taktiksel Skill Loadout:** Her asker 1-3 aktif ve 1 pasif yetenek taşır (`shieldWall`, `shockwave`, `fieldMedic`, `armorBreaker`, `stunStrike`, `bloodFrenzy`, `lastStand`).
- **Doğal Kilit Açımı:** Lv.10, Lv.25, Lv.45 ve Lv.65'te yeni yetenekler otomatik açılır; parşömenler ve dövülen eşyalar askere özel yetenek kazandırır.
- **Taktik Formasyon (Ön / Arka Saf):** Oyuncu savaştan önce askerlerini sürükle-bırak / tek tıkla Ön Saf (`front`) veya Arka Saf (`back`) olarak dizer. `selectTarget()` algoritması ön saf ayaktayken saldırıların %85'ini ön safa yönlendirerek arkadaki birimleri korur.
- **🛡️ Kolezyum Sabit Lig Kademeleri:** Bronz, Gümüş, Altın, Elmas ve Şampiyon sabit ELO bandları tanımlanmıştır. Askerler asla ölmez (No Permadeath), canları minimum 1 HP'de korunur.
- **🌋 Dünya Bossu Yetenek Çeşitliliği:** Stake edilen ordudaki farklı rol sayısı (Tank, AoE, Şifa, Kırıcı) hesaplanarak **+%30'a varan hasar bonusu** verilir.

### 4. 🤖 Taverna: 24 Saatlik Otonom Sefer & Tamir Botu
- **Saf Kâr Ortaklığı (%50):** 24 saatlik tahmini net saf kâr üzerinden hesaplanan adil ortaklık bedeli.
- **50x Kaynak Önkoşul ve Süre Dondurma (Freeze):** Depoda en az 50 Odun, Demir veya Buğday kalmadığında bot süresi anında dondurulur; süre boşa akmaz.
- **Yetersiz ADA Oto-Finansmanı:** Bot çalışırken ADA yetersizliği oluşursa depodaki malzemelerden eşit miktarda satarak 50 ADA temin eder ve çalışmayı sürdürür.
- **Akıllı Silo Alanı Yönetimi:** %80 barajı koruması, erken panik satışının engellenmesi ve ambar yetersizliğinde kısmi hasadın seferde bekletilmesi.

### 5. 💱 AMM DEX ($x \cdot y = k$) & Canlı Maliyet Botu
- Spot piyasa fiyatları sabit çarpım formülüyle belirlenir; her işlemden **%2.00 AMM Harcı** ve hammadde işlemlerinden **%2.00 Hammadde Yakımı** alınır.
- Tüm havuzlar `derivePool()` ile `AMM_CORRIDORS`'tan türetilir.
- Saniyelik canlı bot (`tickUpgradeCostBot`), silo ve seviye atlama için talep edilen hammaddelerin borsa değerini anlık ADA maliyeti olarak yansıtır.

### 6. 💀 6 Katlı & 18 Seviyeli Zindan & Boss Çarpanları
- Seviye 1'den Seviye 81'e kadar Teçhizat Parçası düşme oranı **%0.18 $\to$ %18.00**'e, Pandora Sandığı oranı **%0.0018 $\to$ %0.18**'e (tam 100 kat) ölçeklenir.
- Seviye 9 (Kadim Taş Golyat) ve Seviye 18 (Kıyamet Ejderhası IGNIS) bossları **+%100 Düşürme Çarpanı (2.0x)** ve garanti anahtar ganimeti sunar.

### 7. 🪙 10 Milyar Makro Tokenomics & Hazine
- **Sabit Maksimum Arz:** 10.000.000.000 $ADASTRA.
- **Gelir Dağılım Anayasası:** %13 Kalıcı Yakım • %78 Krallık Hazinesi • %6 Evrensel Temel Gelir (UBI) • %3 Yapımcı Telifi.
- **Anti-Tamper & HTTP Network Saati:** Sistem saati manipülasyonu ve haftalık kotaları sonsuz re-farm etme istismarı sunucu HTTP Date başlığı doğrulamasıyla engellenmiştir.

---

## 📁 Dizin ve Mimari Yapısı

```
adastra-realm/
├── index.html                 # Ana HTML5 UI Shell, HUD & Modal İskeleti
├── vite.config.js             # Vite 5 derleyici yapılandırması
├── package.json               # Paket bağımlılıkları ve test komutları
│
├── docs/                      # 📚 Kapsamlı Dokümantasyon & Whitepaper
│   ├── GAME_DESIGN_AND_ECONOMY_WHITEPAPER.md # DeFi Kingdoms Tarzı Master Whitepaper
│   └── LEVEL_PROGRESSION_TABLES.md           # Seviye 1-81 Tüm Denge Tabloları
│
├── js/                        # 🧠 Oyun Mantığı ve State Motoru (ES Modules)
│   ├── config.js              # Oyun sabitleri, havuz kotaları, scaling formülleri
│   ├── gameState.js           # Ana State Manager, ordu, envanter, yakım ve tamirat
│   ├── ammMarket.js           # AMM DEX motoru (x * y = k), harçlar ve fiyat hesaplama
│   ├── globalPool.js          # Küresel havuzlar, hammadde arzı silme ve 10B muhasebe
│   ├── bestiary.js            # 18 Seviyeli canavar kütüğü, elementler ve yetenekler
│   ├── combat.js              # Sıra tabanlı taktiksel zindan savaş motoru
│   ├── audio.js               # Dinamik sentezlenmiş Web Audio API SFX motoru
│   ├── grandTownScene.js      # Phaser 3 Krallık / Kasaba sahnesi
│   ├── dungeonScene.js        # Phaser 3 Zindan ve Boss dövüşü sahnesi
│   └── app.js                 # UI Controller, HUD, Modal ve Oyun Döngüsü
│
├── tests/                     # 🧪 Kapsamlı Birim ve Entegrasyon Testleri (36 Paket)
│   ├── test_universal_resource_burn.mjs        # Evrensel hammadde yakımı testleri
│   ├── test_tiered_soldier_recruitment_cost.mjs # 18. Asker 1.8M ADA maliyet testleri
│   ├── test_taverna_24h_bot_complete.mjs       # Otonom bot tam doğrulama testleri
│   ├── test_bot_auto_fund_ada_deficit.mjs      # ADA oto-finansman testleri
│   └── ... (36 test dosyası)
│
├── css/style.css              # Glassmorphism, pixel art & RPG UI tasarım sistemi
├── assets/                    # Pixel art sprite'lar, sesler ve harita dokuları
└── scripts/                   # Tablo ve veri üretim otomasyon araçları
```

---

## 🚀 Kurulum ve Çalıştırma

### Gereksinimler:
* **Node.js:** v18.0.0 veya üzeri
* **Paket Yöneticisi:** `npm` veya `pnpm`

### Yerel Geliştirme:
```bash
# 1. Depoyu klonlayın veya dizine geçin
cd adastra-realm

# 2. Bağımlılıkları yükleyin
npm install

# 3. Geliştirme sunucusunu başlatın (Port: 5173)
npm run dev

# 4. Tarayıcınızda açın:
# http://localhost:5173/
```

### Kalite Güvencesi & Testler:
```bash
# Tüm 36 birim ve entegrasyon test paketini çalıştırın:
npm test

# Üretim derlemesini (Production Build) doğrulayın:
npm run build
```

---

## 📜 Lisans & Telif

© 2026 **AlphAvax (Kağan)**. Tüm hakları saklıdır. Avalanche ekosistemi için geliştirilmiştir.
