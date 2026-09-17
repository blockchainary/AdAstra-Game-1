// AdAstra: Genesis Realm - Karakter Seviyesi, Kışla Ordusu, Taverna Güçlendirmeleri & AMM Konfigürasyonu
export const GAME_CONFIG = {
  EPOCH_DURATION_SECONDS: 24 * 3600, // 24 Saatlik Günlük Havuz
  
  // 📢 CANLI DUYURU & RİSK BİLDİRİM PANELİ KONFİGÜRASYONU
  ANNOUNCEMENT_TICKER: {
    enabled: true,
    speedSeconds: 55, // 55 saniyede akış hızı (okunabilir pürüzsüz marquee)
    pauseOnHover: true,
    separator: '✦'
  },

  // 🚨 CANLI MARQUEE DUYURU & UYARI METİNLERİ LİSTESİ
  ANNOUNCEMENTS: [
    {
      id: 'audit_risk_warning',
      badge: '🚨 GÜVENLİK & RİSK UYARISI',
      badgeColor: '#ef4444',
      text: 'bu oyun tamamen antigravity ide gemini 3.8 flash botu ile yazılmıştır. hiçbir audit yapılmamıştır ve yazılım/kodlama bilmeyen tek bir kullanıcı tarafından geliştirilmektedir, bu sebepten bir çok güvenik açığı bulunabilir. bu güvenlik açıkları tamamen tespit edilip oyun audit edilene kadar lütfen oyuna ana web3 cüzdanınızla bağlanmayın. sadece bu oyunda kullancağınız yeni bir web3 cüzdan açın, yapacağınız yatırımlarda olası bir hacklenme veya güvenlik zaafında yatırımlarınızın gidebileceğini unutmayın. şuan bu oyun tamamen deneysel bir süreçtir lütfen riskinizi gözeterek yatırım yapın. eğer sürece ve şu anki duruma güvenmiyorsanız lütfen oyunu oynamayın, yatırıp yapmayın veya tamamen free to play olarak oynayın. anlayısınız ve ilginiz için teşekkür ederim',
      active: true,
      timestamp: 1726488000000
    }
  ],
  
  // Stamina — v2.5: Seferler ve Zindan savaşları için genişletilmiş stamina havuzu.
  // Her seviye atlandığında Max Stamina +50 artar (Lv 1: 100, Lv 2: 150, Lv 3: 200, Lv 10: 550, Lv 81: 4.100).
  // Böylece 3 paralel sefer gönderilse dahi geriye zindan katları ve boss savaşları için bol miktarda stamina kalır.
  MAX_STAMINA: 100,
  STAMINA_MAX_PER_LEVEL: 50,          // max = 100 + 50·(L-1)
  STAMINA_COST_PER_EXPEDITION: 20,    // maliyet = 20 + 8·(L-1)
  STAMINA_COST_PER_LEVEL: 8,
  STAMINA_NATURAL_REGEN_INTERVAL: 150,
  // Stamina artık AdAstra ile doldurulamaz, yalnızca buğday ile doldurulabilir:
  WHEAT_REFILL_RATIO: 0.21,           // 1 Stamina = Dk başı buğday (15) * %21 = 3.15 Buğday
  WHEAT_PER_STAMINA: 3.15,            // 1 Stamina doldurmak için gereken buğday miktarı (Fix 3.15)

  // ⚔️ ZİNDAN SAVAŞI STAMİNA MEKANİĞİ
  // Formül: Asker Sayısı × (BASE_PER_SOLDIER + Zindan Seviyesi × LEVEL_SCALING_PER_SOLDIER)
  // Dengeli RPG Modeli: Asker Başına 5 Stamina + Canavar Seviyesi Başına 1 Stamina
  // Örn: Lv.1'de 2 asker = 12 Stamina; Lv.9 Ara Boss'ta 8 asker = 112 Stamina; Lv.18 Büyük Boss'ta 15 asker = 345 Stamina
  DUNGEON_COMBAT_STAMINA: {
    BASE_PER_SOLDIER: 5,
    LEVEL_SCALING_PER_SOLDIER: 1
  },

  // %13 Yakım, %3 Yapımcı/Geliştirici Telifi, %6 Evrensel Temel Gelir (UBI) Seviye Havuzu, %78 Hazine
  TOKEN_BURN_RATE: 0.13,
  CREATOR_ROYALTY_RATE: 0.03,
  CREATOR_WALLET_ADDRESS: '0x58DBCF66bdd7BfA9da98aDba1965b3794321087C',
  UBI_POOL_RATE: 0.06,
  TOKEN_REWARD_POOL_RATE: 0.78,

  // 🏛️ EVRENSEL TEMEL GELİR (UBI) & SEVİYE STAKE HAVUZU PARAMETRELERİ
  // Havuzdaki para anında tükenmez; 3 ayda (12 haftada) dağıtılacak eğriyle her hafta 1/12'si açılır.
  // Seviye 1'den Seviye 81'e kadar ağırlık fonksiyonu: W(L) = L^1.85 (Lv 81 katlanarak daha fazla pay alır)
  UBI_CONFIG: {
    POOL_RATE: 0.06,
    AMORTIZATION_WEEKS: 12,              // 3 Ayda dağıtım takvimi (haftalık 1/12 bütçe)
    LEVEL_WEIGHT_EXPONENT: 1.85,         // Üssel seviye katsayısı (Lv 81 ~ 3.375x çarpan)
    BASE_WEIGHT_DIVISOR: 1000,           // 1000 pay tabanı (Lv 1: %0.1, Lv 3: %0.76, Lv 10: %7.1, Lv 81: 3.375x)
    BASE_REALM_ACTIVE_WEIGHT: 12500,     // Krallık aktif ağırlık pay tabanı
    INITIAL_SEED_POOL: 2400000           // Başlangıç tohum fonu: 2.4 Milyon $ADASTRA
  },

  // =========================================================================
  // 📈 MATEMATİKSEL EKONOMİ VE FİX ÜRETİM MODELİ
  // Seviye arttıkça dakika başına üretim hızı ARTMAZ, sabittir.
  // Seviye arttıkça sadece sefer süresi uzar (Lv 1: 18 dk -> Lv 81: 72 saat).
  // =========================================================================
  BASE_PRODUCTION: {
    wood: 18,  // 18 Odun / dakika (1.080 Odun / saat) - Fix
    iron: 12,  // 12 Demir / dakika (720 Demir / saat) - Fix
    wheat: 30  // 30 Buğday / dakika (1.800 Buğday / saat) - Fix (Haftalık 490k kota ve ordu tüketimiyle uyumlu)
  },
  TAVERNA_BOT: {
    REQUIRED_PREREQUISITES: {
      iron: 50,
      wood: 50,
      wheat: 50,
      adAstra: 50
    }
  },
  TAVERN_BOOSTS: {
    short: {
      id: 'short',
      name: '⚡ Kısa Darbe İksiri',
      multiplier: 1.5,
      durationHours: 2,
      maxExpeditions: 8,
      costAdAstra: 4500,
      desc: '2 saat boyunca kaynak seferlerine 1.50x hız ve verim kazandırır.'
    },
    standard: {
      id: 'standard',
      name: '⚡ Standart Sefer İksiri',
      multiplier: 1.75,
      durationHours: 6,
      maxExpeditions: 20,
      costAdAstra: 15000,
      desc: '6 saat boyunca kaynak seferlerine 1.75x hız ve verim kazandırır.'
    },
    long: {
      id: 'long',
      name: '⚡ Büyük Sefer İksiri (Balina)',
      multiplier: 2.0,
      durationHours: 24,
      maxExpeditions: 60,
      costAdAstra: 45000,
      desc: '24 saat boyunca kaynak seferlerine 2.00x hız ve verim kazandırır.'
    }
  },
  // 🏰 ZİNDAN ORDU YORULMASI & STAMİNA MALİYETİ MATRİSİ
  // Her kat için asker başına harcanan stamina: Taban (5) + Canavar Seviyesi (Level)
  DUNGEON_STAMINA_COST_PER_SOLDIER: {
    BASE_PER_SOLDIER: 5,
    1: 6,   // Kat 1 (Bataklık Balçığı): 6 Stamina / asker
    2: 7,   // Kat 2 (Mağara Goblini): 7 Stamina / asker
    3: 8,   // Kat 3 (Gölge Kurdu): 8 Stamina / asker
    4: 9,   // Kat 4 (Kemik Mahzeni İskeletleri): 9 Stamina / asker
    5: 10,  // Kat 5 (Lanetli Kemik Büyücüsü): 10 Stamina / asker
    6: 11,  // Kat 6 (Kemik Taht Muhafızı): 11 Stamina / asker
    7: 12,  // Kat 7 (Karanlık Tarikatçı): 12 Stamina / asker
    8: 13,  // Kat 8 (Cehennem Tazısı): 13 Stamina / asker
    9: 14,  // Kat 9 (Kadim Taş Golyat - ARA BOSS): 14 Stamina / asker
    10: 15, // Kat 10 (Sargılı Mumyalar): 15 Stamina / asker
    11: 16, // Kat 11 (Gölge Hayaletler): 16 Stamina / asker
    12: 17, // Kat 12 (Lanetli Firavun): 17 Stamina / asker
    13: 18, // Kat 13 (Ateş İblisleri): 18 Stamina / asker
    14: 19, // Kat 14 (Lav Elementalleri): 19 Stamina / asker
    15: 20, // Kat 15 (Obsidyen Berserker): 20 Stamina / asker
    16: 21, // Kat 16 (Kıyamet Şövalyesi): 21 Stamina / asker
    17: 22, // Kat 17 (Kadim Gölge Lordu): 22 Stamina / asker
    18: 23  // Kat 18 (Kıyamet Ejderhası IGNIS - BÜYÜK BOSS): 23 Stamina / asker
  },

  // Sefer Süreleri (Level 1: 18 Dakika, Level 81: 72 Saat)
  EXPEDITION_MIN_LEVEL: 1,
  EXPEDITION_MAX_LEVEL: 81,
  EXPEDITION_MIN_DURATION_MINUTES: 18,     // Seviye 1: 18 Dakika (0.3 Saat)
  EXPEDITION_MAX_DURATION_MINUTES: 4320,   // Seviye 81: 72 Saat (4320 Dakika)

  // Kaynak Alanları (Haftalık Limitler & Fix Üretim Hızları)
  GLOBAL_RESOURCE_CAPS: {
    wood: {
      id: 'wood',
      name: 'Zümrüt Meşe Odunu',
      icon: '🌲',
      color: '#4ade80',
      totalCap: 180000, // Haftalık Çıkarım Limiti
      ratePerMinute: 18,
      baseYieldPerHour: 1080,
      requiredTool: 'axe'
    },
    iron: {
      id: 'iron',
      name: 'Derin Demir Cevheri',
      icon: '⛏️',
      color: '#94a3b8',
      totalCap: 130000, // Haftalık Çıkarım Limiti
      ratePerMinute: 12,
      baseYieldPerHour: 720,
      requiredTool: 'pickaxe'
    },
    wheat: {
      id: 'wheat',
      name: 'Güneş Buğdayı',
      icon: '🌾',
      color: '#facc15',
      totalCap: 490000, // Haftalık Çıkarım Limiti
      ratePerMinute: 30,
      baseYieldPerHour: 1800,
      requiredTool: 'sickle'
    }
  },
  
  // Aletler & Tamir Maliyetleri (72 saat = 4320 dakika dayanıklılık; dakika başına 1 durability kaybı)
  // Onarım Kuralı: Dk başı Odun ve Demir üretiminin %25'i / 3 alet + 1 ADA
  // Balta, Kazma ve Orak için dk başı: 1.5 Odun, 1.0 Demir, 0 Buğday, 1.0 ADA
  TOOLS: {
    axe: {
      id: 'axe',
      name: 'Acemi Baltası',
      icon: '🪓',
      maxDurability: 4320, // 72 saat = 4320 dakika
      durabilityLossPerMinute: 1,
      producedResource: 'wood',
      repairCostPerMinute: { wood: 1.5, iron: 1.0, wheat: 0, adAstra: 1.0 }
    },
    pickaxe: {
      id: 'pickaxe',
      name: 'Bronz Kazma',
      icon: '⛏️',
      maxDurability: 4320,
      durabilityLossPerMinute: 1,
      producedResource: 'iron',
      repairCostPerMinute: { wood: 1.5, iron: 1.0, wheat: 0, adAstra: 1.0 }
    },
    sickle: {
      id: 'sickle',
      name: 'Demir Orak',
      icon: '🌾',
      maxDurability: 4320,
      durabilityLossPerMinute: 1,
      producedResource: 'wheat',
      repairCostPerMinute: { wood: 1.5, iron: 1.0, wheat: 0, adAstra: 1.0 }
    }
  },

  // =========================================================================
  // 📈 DEEPSEEK-R1 10 YILLIK TEÇHİZAT YÜKSELTME MATRİKSİ (LV.1 -> LV.10)
  // =========================================================================
  EQUIPMENT_MAX_LEVEL: 10,
  EQUIPMENT_UPGRADE_TIERS: {
    2: { iron: 20, wood: 15, fragments: 0, adAstra: 50 },
    3: { iron: 35, wood: 25, fragments: 0, adAstra: 100 },
    4: { iron: 50, wood: 40, fragments: 5, adAstra: 250 },
    5: { iron: 75, wood: 55, fragments: 10, adAstra: 500 },
    6: { iron: 110, wood: 80, fragments: 15, adAstra: 850 },
    7: { iron: 160, wood: 115, fragments: 25, adAstra: 1350 },
    8: { iron: 230, wood: 160, fragments: 35, adAstra: 2100 },
    9: { iron: 320, wood: 225, fragments: 50, adAstra: 3200 },
    10: { iron: 450, wood: 300, fragments: 80, adAstra: 5000 }
  },

  // ═══════════════════════════════════════════════════════════════════════
  // AMM FİYAT KORİDORU — v2: ARTIK GERÇEKTEN UYGULANIYOR (F-04)
  // ═══════════════════════════════════════════════════════════════════════
  // YASA 3: "Kıt olan pahalıdır." Haftalık küresel kota 180.000 odunsa odun
  // ucuz olamaz. Fiyatlar kota kıtlığına göre yeniden türetildi:
  //   odun  180.000/hafta × 2,50 =   450.000 ADA
  //   demir 130.000/hafta × 4,00 =   520.000 ADA
  //   buğday 490.000/hafta × 0,90 = 441.000 ADA
  //   ────────────────────────────────────────────
  //   Tüm evrenin haftalık emek geliri = 1.411.000 ADA (v1'de 6.264 ADA idi)
  AMM_CORRIDORS: {
    wood:      { minPriceAda: 1.20, maxPriceAda: 6.00,  defaultPriceAda: 2.50 },
    iron:      { minPriceAda: 2.00, maxPriceAda: 9.00,  defaultPriceAda: 4.00 },
    wheat:     { minPriceAda: 0.45, maxPriceAda: 2.20,  defaultPriceAda: 0.90 },
    fragments: { minPriceAda: 20.0, maxPriceAda: 120.0, defaultPriceAda: 45.0 },
    boxes:     { minPriceAda: 5000, maxPriceAda: 35000, defaultPriceAda: 10000 },
    keys:      { minPriceAda: 500,  maxPriceAda: 3500,  defaultPriceAda: 1000 },
    scroll_heal:    { minPriceAda: 15.0, maxPriceAda: 90.0,  defaultPriceAda: 30.0 },
    scroll_stamina: { minPriceAda: 30.0, maxPriceAda: 180.0, defaultPriceAda: 60.0 }
  },

  // Swap ücreti: %2.00 piyasa komisyonu (Hazine Ödül Kasaları, Kalıcı Yakım & UBI'ye aktarılır)
  AMM_FEE_RATE: 0.02,
  // Hammadde Yakım Ücreti: Alınan ve satılan tüm hammaddelerden (odun, demir, buğday vb.) %2.00 kesilir ve anında yakılır
  AMM_RESOURCE_FEE_RATE: 0.02,
  AMM_FEE_BURN_SHARE: 0.5,
  // Fiyat koridoru dışına çıkan işlemler reddedilir; hazine buyback devreye girer
  AMM_MAX_SLIPPAGE_PER_TX: 0.12,

  // Karakter Seviye Atlama Maliyetleri (Level Up Requirements)
  MAX_PLAYER_LEVEL: 81,
  LEVEL_UP_REQUIREMENTS: {
    2: { xp: 100, wood: 30, iron: 20, wheat: 40, adAstra: 25, durationHours: 1.5 },
    3: { xp: 250, wood: 60, iron: 45, wheat: 80, adAstra: 50, durationHours: 2.0 },
    4: { xp: 500, wood: 120, iron: 90, wheat: 150, adAstra: 100, durationHours: 2.5 },
    5: { xp: 900, wood: 200, iron: 160, wheat: 260, adAstra: 200, durationHours: 3.0 },
    6: { xp: 1500, wood: 350, iron: 280, wheat: 450, adAstra: 350, durationHours: 3.5 }
  },

  // =========================================================================
  // SOLDIER & MILITARY SYSTEM (TEK TİP ADASTRA ŞAMPİYONU)
  // =========================================================================
  // Tek bir asker türü: AdAstra Şampiyonu. Level 1'de fix 100 HP ve fix 25 ATK.
  SOLDIER_PRICE: 5000,                // 1. askerin başlangıç fiyatı: 5.000 ADA
  SOLDIER_COST_BASE: 5000,            // Taban maliyet: 5.000 ADA (1. asker)
  SOLDIER_COST_EXPONENT: 2.0364522367650437, // Kademeli artış üssü (1. asker: 5.000 ADA, 18. asker: 1.800.000 ADA)
  SOLDIER_18_TARGET_COST: 1800000,    // 18. asker maliyeti: 1.8 Milyon ADA
  MAX_SOLDIERS: Infinity,             // Sınırsız ordu ve asker alımı
  SOLDIER_MAX_HP: 100,                // Fix Level 1 HP
  SOLDIER_BASE_ATK: 25,               // Fix Level 1 ATK
  SOLDIER_HP_PER_LEVEL: 25,           // Her seviye atlayışta +25 HP
  SOLDIER_ATK_PER_LEVEL: 6,           // Her seviye atlayışta +6 ATK
  SOLDIER_HEAL_DURATION_MINUTES: 1440, // 24 Saat (1440 dk)
  SOLDIER_HEAL_TICK_MINUTES: 24,
  SOLDIER_HEAL_HP_PER_TICK: 1.667,

  // 24 Saatlik Otomatik Asker Doyurma (Pasif İyileşme) Kuralı:
  // 24 saat (1440 dk / 86400 sn) içinde asker kendi kendini otomatik iyileştirirken:
  // Her 1 HP için: 0.30 Buğday + 0.10 ADA tüketilir. Yetersiz bakiye veya buğdayda iyileşme durdurulur.
  SOLDIER_PASSIVE_HEAL: {
    FULL_HEAL_SECONDS: 86400,     // 0 HP'den %100 cana kadar tam iyileşme süresi (24 saat)
    wheatPerHp: 0.30,             // 24 saatte 1 HP başına 0.30 Buğday
    WHEAT_PER_HP: 0.30,           // Geriye dönük uyumluluk
    adaPerHp: 0.10,               // 24 saatte 1 HP başına 0.10 ADA
    ADA_PER_HP: 0.10
  },

  // Hızlı Asker Doyurma (Instant / Fast Heal) Kuralı:
  // 24 saatlik otomatik formülün 10 katı (Deflasyonist Zaman Satın Alma & Hazine Besleme):
  // Her 1 HP için: 3.0 Buğday (0.30 * 10) + 1.0 ADA (0.10 * 10)
  SOLDIER_FAST_HEAL: {
    wheatPerHp: 3.0,             // 24 saatlik formülün 10 katı (3 Buğday / HP)
    adAstraPerHp: 1.0            // 24 saatlik formülün 10 katı (1 ADA / HP)
  },

  // =========================================================================
  // KRALLIK DEMİRCİSİ YENİ CRAFT, UPGRADE VE DAYANIKLILIK MATEMATİĞİ
  // =========================================================================
  // 1 ATK = 18 dk Odun (324) + 18 dk Demir (216) + AMM DEX ADA + 1 Parça
  // 1 HP  = 21 dk Odun (378) + 21 dk Demir (252) + AMM DEX ADA + 1 Parça
  // Upgrade: Hammadde +%18, Parça 2 katı (1 -> 2 -> 4 -> 8 -> 16)
  // Dayanıklılık: 13/13 (Zindan zaferinde -1). Sıfırlanınca yenileme: Toplam üretimin %10'u
  EQUIPMENT_RULES: {
    maxDurability: 13,
    durabilityLossPerVictory: 1,
    baseMinutesPerAtk: 18,
    baseMinutesPerHp: 21,
    upgradeResourceMultiplier: 1.18, // %18 kaynak artışı
    upgradeFragmentMultiplier: 2.0,  // Parça 2 katına çıkar
    zeroDurabilityRestoreRatio: 0.10 // Sıfırlanınca %10 üretim maliyeti
  },

  // =========================================================================
  // =========================================================================
  // SİLO / DEPO KAPASİTE & YÜKSELTMELERİ (İSTİFÇİLİK ÖNLEME MODELİ)
  // Maksimum Seviye: 18
  // Başlangıç (Lv 1): 1080 Odun, 720 Demir, 900 Buğday
  // Maksimum (Lv 18): Haftalık havuz tavanının %50'si (90k Odun, 65k Demir, 245k Buğday)
  // Yükseltme Şartı: Tüm depolar %80 dolu olmak zorunda
  // Yükseltme Maliyeti: Mevcut kapasitenin yarısı (%50) + Anlık DEX Pazar ADA karşılığı
  // =========================================================================
  WAREHOUSE: {
    baseLevels: 18,
    initialCapacities: {
      wood: 1080,
      iron: 720,
      wheat: 900,
      fragments: 100
    },
    maxCapacities: {
      wood: 90000,
      iron: 65000,
      wheat: 245000,
      fragments: 2500
    },
    fillRequirementRatio: 0.80, // %80 Doluluk Şartı
    costRatio: 0.50             // %50 Kapasite Maliyeti
  },

  // =========================================================================
  // EQUIPMENT DURABILITY & REPAIR
  // =========================================================================
  EQUIPMENT: {
    maxDurability: 100,
    durabilityLossPerBattle: 15,
    repairCosts: {
      durabilityPerPoint: { iron: 1, wood: 0.5 }
    }
  },
  MAX_EQUIPMENT_REPAIRS: 18,

  // =========================================================================
  // AUTOMATION BOTS
  // =========================================================================
  AUTOMATION_BOTS: {
    auto_soldier_heal: {
      id: 'auto_soldier_heal',
      name: '24 Saatlik Otomatik Asker İyileştirmesi',
      icon: '⚕️',
      durationSeconds: 24 * 3600,
      costAdAstra: 150,
      desc: 'Askerleri otomatik olarak iyileştirir, uçurumda kalmaz.'
    },
    auto_expedition_claim: {
      id: 'auto_expedition_claim',
      name: '24 Saatlik Otomatik Sefer Toplama',
      icon: '🤖',
      durationSeconds: 24 * 3600,
      costAdAstra: 100,
      desc: 'Seferler bittiğinde otomatik olarak kaynakları toplar.'
    }
  },

  // Kışla Asker Tipleri (Barracks Troops)
  TROOP_TYPES: {
    infantry: {
      id: 'infantry',
      name: 'Kraliyet Muhafızı',
      icon: '🛡️',
      costAdAstra: 30,
      hp: 120,
      atk: 25,
      desc: 'Yüksek can havuzuyla ön safta düşman darbelerini karşılar.'
    },
    archer: {
      id: 'archer',
      name: 'Zümrüt Okçusu',
      icon: '🏹',
      costAdAstra: 50,
      hp: 80,
      atk: 45,
      desc: 'Uzaktan yüksek kritik hasar vurur.'
    },
    knight: {
      id: 'knight',
      name: 'Paladin Şampiyonu',
      icon: '⚔️',
      costAdAstra: 100,
      hp: 250,
      atk: 80,
      desc: 'Ağır zırhlı ve yüksek saldırı gücüne sahip efsanevi savaşçı.'
    }
  },

  // ═══════════════════════════════════════════════════════════════════════
  // TAVERNA — v2 fiyatlaması (F-17)
  // ═══════════════════════════════════════════════════════════════════════
  // v1'de 45.000 ADA'lık iksir verimi HİÇ artırmıyordu; 40 ADA'lık eski
  // `speed_wood` buff'ı ise hem süreyi hem verimi 1,5× yapıyordu. Yani pahalı
  // ürün ucuzdan 1.125 kat daha kötüydü. Eski buff'lar kaldırıldı, iksirler
  // artık HEM süreyi HEM verimi çarpıyor ve yeni gelir düzeyine göre fiyatlandı.
  TAVERN_BUFFS: {
    auto_collector: {
      id: 'auto_collector',
      name: 'Günlük Otomatik Toplama & Tamir Botu (24 Saat)',
      icon: '🤖',
      durationSeconds: 24 * 3600,
      costAdAstra: 1800,
      desc: 'Seferler bittiğinde kaynakları otomatik toplar, aletleri depodaki hammaddeyle otomatik tamir eder ve seferi kesintisiz sürdürür.'
    },
    auto_collector_weekly: {
      id: 'auto_collector_weekly',
      name: 'Haftalık Otomatik Toplama & Tamir Botu (7 Gün)',
      icon: '🤖',
      durationSeconds: 7 * 24 * 3600,
      costAdAstra: 10700,
      desc: '7 gün boyunca tüm seferleri otomatik toplar, depodaki hammaddeyle aletleri otomatik onarır ve seferleri sürdürür (%15 İndirimli).'
    },
    auto_collector_monthly: {
      id: 'auto_collector_monthly',
      name: 'Aylık Otomatik Toplama & Tamir Botu (30 Gün)',
      icon: '🤖',
      durationSeconds: 30 * 24 * 3600,
      costAdAstra: 37800,
      desc: '30 gün boyunca kesintisiz tam otomasyon! Kaynakları toplar, aletleri otomatik tamir eder ve seferleri yönetir (%30 İndirimli).'
    }
  },
  
  // =========================================================================
  // GAMEFI & RPG EKONOMİSİ (PHASE 1): ZİNDAN GANİMET ORANLARI
  // =========================================================================
  // Level-scaled drop rates (Lv 1 to Lv 81)
  FRAGMENT_DROP_MIN: 0.0018,       // 0.18% at Lv 1 (Hesap Lv.1'de %0.18)
  FRAGMENT_DROP_MAX: 0.18,         // 18.0% at Lv 81 (Hesap Lv.81'de %18 - 100 kat artış)
  BOX_DROP_MIN: 0.000018,          // 0.0018% at Lv 1 (Hesap Lv.1'de %0.0018)
  BOX_DROP_MAX: 0.0018,            // 0.18% at Lv 81 (Hesap Lv.81'de %0.18 - 100 kat artış)
  // Koleksiyon Eseri (artifact) keşif olasılığı = ARTIFACT_BASE_RATE * seviye (yalnızca boss canavarlarda)
  ARTIFACT_BASE_RATE: 0.0009,
  // Kat 3 ve Kat 6 Bosslarında %100 çarpan etkisi (2.0x - 2 katı düşürme oranı)
  BOSS_DROP_MULTIPLIER: 2.0,

  // 5 Adet Dövülebilir & Geliştirilebilir Ekipman (1 Silah, 1 Miğfer, 1 Zırh, 1 Pantolon, 1 Ayakkabı)
  // Tüm eşyalar 13/13 Durability ile başlar, seviye yükseltilebilir ve bittiğinde tekrar dövülebilir!
  EQUIPMENT_RECIPES: {
    weapon: {
      id: 'weapon',
      slot: 'weapon',
      name: 'Efsanevi Savaş Kılıcı',
      icon: '🗡️',
      baseAtk: 25,
      baseHp: 0,
      maxDurability: 13,
      cost: { fragments: 18, iron: 60, wood: 40, adAstra: 50 },
      desc: 'Yüksek hasar veren, demir ve huş odunuyla dövülmüş efsanevi savaş kılıcı (+25 Saldırı, 13/13 Dayanıklılık).'
    },
    helmet: {
      id: 'helmet',
      slot: 'helmet',
      name: 'Kraliyet Miğferi',
      icon: '🪖',
      baseAtk: 10,
      baseHp: 30,
      maxDurability: 13,
      cost: { fragments: 12, iron: 40, wood: 20, adAstra: 35 },
      desc: 'Kritik darbeleri savuşturan dövme çelik miğfer (+10 Saldırı, +30 Can, 13/13 Dayanıklılık).'
    },
    armor: {
      id: 'armor',
      slot: 'armor',
      name: 'Ağır Çelik Gövde Zırhı',
      icon: '🛡️',
      baseAtk: 0,
      baseHp: 60,
      maxDurability: 13,
      cost: { fragments: 20, iron: 80, wood: 30, adAstra: 60 },
      desc: 'Zindan darbelerini emen kalın demir plaka gövde zırhı (+60 Can, 13/13 Dayanıklılık).'
    },
    legs: {
      id: 'legs',
      slot: 'legs',
      name: 'Muhafız Zırhlı Pantolonu',
      icon: '👖',
      baseAtk: 5,
      baseHp: 40,
      maxDurability: 13,
      cost: { fragments: 14, iron: 50, wood: 25, adAstra: 40 },
      desc: 'Hareket kabiliyeti sağlayan zırh plakalı pantolon (+5 Saldırı, +40 Can, 13/13 Dayanıklılık).'
    },
    boots: {
      id: 'boots',
      slot: 'boots',
      name: 'Seferci Savaş Çizmeleri',
      icon: '👢',
      baseAtk: 8,
      baseHp: 20,
      maxDurability: 13,
      cost: { fragments: 10, iron: 30, wood: 35, adAstra: 30 },
      desc: 'Hızlı manevra ve zırh desteği veren çelik burunlu çizmeler (+8 Saldırı, +20 Can, 13/13 Dayanıklılık).'
    }
  },

  // Asker Ekipman Küme (Set) Bonusları: Kuşanılan yuva sayısına göre ATK/HP çarpanı verir
  EQUIPMENT_SET_BONUSES: {
    2: { name: '⚔️ İkili Küme Bonusu', desc: '2 parça kuşanıldığında +%5 Saldırı & +%5 Can', atkMultiplier: 1.05, hpMultiplier: 1.05 },
    4: { name: '🛡️ Dörtlü Küme Bonusu', desc: '4 parça kuşanıldığında +%12 Saldırı & +%12 Can', atkMultiplier: 1.12, hpMultiplier: 1.12 },
    5: { name: '👑 Tam Takım Şampiyon Bonusu', desc: 'Tam 5 parça kuşanıldığında +%25 Saldırı & +%25 Can', atkMultiplier: 1.25, hpMultiplier: 1.25 }
  },

  // 18 Eşsiz Koleksiyon Eseri (6 Kat x 3 Seviyelik Zindanın Her Katından Bir Ganimet)
  COLLECTION_ARTIFACTS: [
    { id: 'artifact_01', name: 'Balçık Özü Kristali', icon: '🟢', dropLevel: 1, rarity: 'common', lore: 'Bataklık Balçığının çekirdeğinde donmuş, hafif nabız atan yeşil bir öz.' },
    { id: 'artifact_02', name: 'Goblin Reis Diş Kolyesi', icon: '🦷', dropLevel: 2, rarity: 'common', lore: 'Mağara Goblini reisinin ganimet kolyesinden kalma ürkütücü bir diş.' },
    { id: 'artifact_03', name: 'Gölge Kurdu Pençesi', icon: '🐾', dropLevel: 3, rarity: 'common', lore: 'Karanlıkta parıldayan, Gölge Kurdundan kopan keskin bir pençe.' },
    { id: 'artifact_04', name: 'Mahzen Anahtarı Kemiği', icon: '🦴', dropLevel: 4, rarity: 'common', lore: 'Kemik Mahzeni iskeletlerinin koruduğu unutulmuş bir lahit anahtarı.' },
    { id: 'artifact_05', name: "Büyücünün Kırık Asası", icon: '🪄', dropLevel: 5, rarity: 'common', lore: 'Lanetli Kemik Büyücüsünden kalan, hâlâ hafif titreşen kırık bir asa parçası.' },
    { id: 'artifact_06', name: 'Taht Muhafızı Mührü', icon: '🔱', dropLevel: 6, rarity: 'rare', lore: 'Kemik Taht Muhafızının zırhına kazınmış kadim bir mühür.' },
    { id: 'artifact_07', name: 'Tarikat Ritüel Maskesi', icon: '🎭', dropLevel: 7, rarity: 'rare', lore: 'Karanlık Tarikatçının ayinlerde taktığı, kehribar gözlü bir maske.' },
    { id: 'artifact_08', name: 'Cehennem Tazısı Zinciri', icon: '⛓️', dropLevel: 8, rarity: 'rare', lore: 'Hâlâ sıcak, Cehennem Tazısının boynundan kopan kor zincir halkası.' },
    { id: 'artifact_09', name: 'Golyat Kalp Taşı', icon: '🗿', dropLevel: 9, rarity: 'epic', lore: 'Kadim Taş Golyatın göğsünde nabız gibi atan devasa bir çekirdek taş.' },
    { id: 'artifact_10', name: 'Firavun Sargı Bezi Parçası', icon: '🧻', dropLevel: 10, rarity: 'rare', lore: 'Sargılı Mumyaların binlerce yıllık lanetli sargı bezinden bir parça.' },
    { id: 'artifact_11', name: 'Hayalet Feneri Alevi', icon: '🕯️', dropLevel: 11, rarity: 'rare', lore: 'Gölge Hayaletlerin peşinden sürüklediği, hiç sönmeyen mavi alev.' },
    { id: 'artifact_12', name: 'Lanetli Firavun Tacı', icon: '👑', dropLevel: 12, rarity: 'epic', lore: 'Lanetli Firavunun başından düşen, hâlâ kadim bir güçle titreyen altın taç.' },
    { id: 'artifact_13', name: 'İblis Boynuzu Külü', icon: '🔥', dropLevel: 13, rarity: 'epic', lore: 'Ateş İblislerinin boynuzlarından arta kalan, sıcaklığını hiç kaybetmeyen kül.' },
    { id: 'artifact_14', name: 'Erimiş Obsidyen Damlası', icon: '🌋', dropLevel: 14, rarity: 'epic', lore: 'Lav Elementallerinin özünden damlayan, katılaşmış obsidyen bir damla.' },
    { id: 'artifact_15', name: 'Berserker Kırık Baltası', icon: '🪓', dropLevel: 15, rarity: 'epic', lore: 'Obsidyen Berserkerin son darbesinde ikiye kırılan savaş baltasının ağzı.' },
    { id: 'artifact_16', name: 'Kıyamet Şövalyesi Kalkanı', icon: '🛡️', dropLevel: 16, rarity: 'epic', lore: 'Kıyamet Şövalyesinin asla kırılmayan kalkanından kopan bir parça.' },
    { id: 'artifact_17', name: "Gölge Lordu'nun Gözü", icon: '👁️', dropLevel: 17, rarity: 'legendary', lore: 'Kadim Gölge Lordunun düşmüşken bile karanlıkta parıldayan tek gözü.' },
    { id: 'artifact_18', name: 'Ejderha Kristali IGNIS', icon: '💎', dropLevel: 18, rarity: 'legendary', lore: 'Kıyamet Ejderhası IGNIS yenildiğinde küllerinden doğan efsanevi kristal.' }
  ],

  // Genesis NFT: Tüm 18 Koleksiyon Eserini Toplayınca Basılabilen Efsanevi Mühür
  GENESIS_NFT: {
    id: 'genesis_champion',
    name: 'AdAstra Genesis Şampiyonu',
    icon: '🏆',
    requiredArtifacts: 18,
    adAstraCost: 500
  },

  // ═══════════════════════════════════════════════════════════════════════
  // ⚔️  SAVAŞ MOTORU v2 — SINIFLAR, ELEMENTLER, MEVZİ
  // ═══════════════════════════════════════════════════════════════════════
  // v1'de her asker `class: 'warrior'`, `baseAtk: 20` idi; savaş iki HP
  // yığınının toplamıydı ve "tüm askerleri gönder" baskın stratejiydi (F-19).
  // v2'de dört sınıfın dört ayrı rolü, gerçek bir tur sırası ve mevzi var.
  COMBAT: {
    ARMOR_CONSTANT: 120,        // zırh azaltması: 1 - zırh/(zırh+120), asla %100 olmaz
    BASE_CRIT_DAMAGE: 1.75,
    FRONTLINE_COVER: 0.85,      // ön saf ayaktayken saldırıların %85'i ön safa gider
    MAX_ROUNDS: 30,
    // Alan hasarı en fazla 4 hedef vurur. Sınırsız bırakılırsa "yarma" saldırısı
    // ordu büyüklüğüyle doğrusal ölçeklenir ve 18 kişilik kadro cezalandırılır.
    MAX_AOE_TARGETS: 4,
    RAGE_AFTER_ROUND: 12,       // 12. turdan sonra düşman her tur güçlenir
    RAGE_PER_ROUND: 0.18,
    // Yenilgi bedeli: ölüm yok ama "yaralı" durumu var
    WOUNDED_RECOVERY_HOURS: 6,
    FIELD_HOSPITAL_ADA_PER_HP: 2.2
  },

  COMBAT_CLASSES: {
    guardian: {
      id: 'guardian', name: 'Kraliyet Muhafızı', icon: '🛡️', preferredRow: 'front',
      hpMult: 1.35, atkMult: 0.75, baseArmor: 55, baseSpeed: 8, baseCrit: 0.05, basePen: 0,
      cooldown: 3,
      ability: 'Kalkan Duvarı',
      desc: 'Düşman ateşini üzerine çeker (taunt), zırhını %45 artırır ve kalkan kazanır. Safı ayakta tutan birim.'
    },
    ranger: {
      id: 'ranger', name: 'Zümrüt Okçusu', icon: '🏹', preferredRow: 'back',
      hpMult: 0.75, atkMult: 1.25, baseArmor: 15, baseSpeed: 14, baseCrit: 0.28, basePen: 40,
      cooldown: 2,
      ability: 'Delici Ok',
      desc: 'Zırhı tamamen yok sayan 1,65× hasar. Arka saftaki büyücü ve şifacıları infaz eder.'
    },
    mage: {
      id: 'mage', name: 'Element Büyücüsü', icon: '🔮', preferredRow: 'back',
      hpMult: 0.70, atkMult: 1.15, baseArmor: 10, baseSpeed: 11, baseCrit: 0.15, basePen: 25,
      cooldown: 3,
      ability: 'Element Patlaması',
      desc: 'Tüm düşman safına 0,8× hasar + elementine göre yanma / donma / zehir uygular.'
    },
    paladin: {
      id: 'paladin', name: 'Paladin Şampiyonu', icon: '⚔️', preferredRow: 'front',
      hpMult: 1.15, atkMult: 1.00, baseArmor: 38, baseSpeed: 10, baseCrit: 0.12, basePen: 15,
      cooldown: 3,
      ability: 'Kutsal Işık',
      desc: 'En yaralı müttefiki iyileştirir, lanetleri temizler. Pasif: savaşta bir kez düşen müttefiki %25 canla ayağa kaldırır.'
    }
  },

  // Element üçgeni: Ateş → Doğa → Buz → Ateş
  ELEMENT_TRIANGLE: {
    fire:    { name: 'Ateş',  icon: '🔥', strongVs: 'nature' },
    nature:  { name: 'Doğa',  icon: '🌿', strongVs: 'ice' },
    ice:     { name: 'Buz',   icon: '❄️', strongVs: 'fire' },
    neutral: { name: 'Nötr',  icon: '⚪', strongVs: null },
    STRONG_MULT: 1.35,
    WEAK_MULT: 0.75
  },

  // Haftalık rotasyonlu kat etkileri — aynı zindan her hafta farklı oynanır
  DUNGEON_MODIFIERS: [
    { id: 'lava', name: 'Kaynayan Zemin', desc: 'Her tur tüm birimler 18 yanma hasarı alır.', kind: 'dot', magnitude: 18 },
    { id: 'gloom', name: 'Kadim Karanlık', desc: 'Tüm iyileştirmeler %50 azalır.', kind: 'healCut', magnitude: 0.5 },
    { id: 'gale', name: 'Fırtına Rüzgârı', desc: 'Arka saf koruması zayıflar: sızma şansı iki katına çıkar.', kind: 'coverCut', magnitude: 0.7 },
    { id: 'ironstorm', name: 'Demir Fırtınası', desc: 'Tüm birimlerin zırhı %25 azalır.', kind: 'armorCut', magnitude: 0.25 },
    { id: 'blessing', name: 'Yıldız Kutsaması', desc: 'Tüm müttefikler +%12 saldırı gücü kazanır.', kind: 'allyBuff', magnitude: 0.12 }
  ],

  // ═══════════════════════════════════════════════════════════════════════
  // 💀 ZİNDAN KOŞUSU — sonsuz farm yerine günlük hak + azalan getiri (F-01)
  // ═══════════════════════════════════════════════════════════════════════
  DUNGEON: {
    DAILY_RUNS: 5,                    // günde 5 koşu hakkı
    RUN_STAMINA_COST: 15,
    ROOMS_PER_RUN: 3,                 // 2 normal oda + 1 kat muhafızı
    FIRST_CLEAR_MULTIPLIER: 1.0,      // ilk temizlemede tam ödül
    REPEAT_MULTIPLIER: 0.15,          // tekrarlarda %15
    // Odalar arası iyileşme YOK — kaynak yönetimi savaşın parçası
    INTER_ROOM_HEAL: 0,
    // Ganimet oranları (v1'de ölü koddaydı, artık canlı savaş yoluna bağlı)
    FRAGMENT_DROP_BASE: 0.35,
    FRAGMENT_DROP_PER_LEVEL: 0.012,
    BOX_DROP_BASE: 0.02,
    BOX_DROP_PER_LEVEL: 0.004,
    BOSS_DROP_MULTIPLIER: 2.5,
    FIRST_CLEAR_GUARANTEED_FRAGMENTS: 3
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 🏟️ KOLEZYUM — anahtar tüketilir, ELO eşleşmesi, beş lig (F-02 / F-20)
  // ═══════════════════════════════════════════════════════════════════════
  COLOSSEUM: {
    ENTRY_KEY_COST: 1,
    ENTRY_STAMINA_COST: 12,
    DAILY_MATCH_CAP: 10,
    STARTING_RATING: 1000,
    K_FACTOR: 32,
    // Rakip artık oyuncudan türetilmez; puana göre NPC kadro havuzundan seçilir
    OPPONENT_POWER_TOLERANCE: 0.18,
    LEAGUES: [
      { id: 'bronze',   name: 'Bronz Lig',        icon: '🥉', minRating: 0,    weeklyAda: 400,   weeklyKeys: 1 },
      { id: 'silver',   name: 'Gümüş Lig',        icon: '🥈', minRating: 1100, weeklyAda: 1200,  weeklyKeys: 2 },
      { id: 'gold',     name: 'Altın Lig',        icon: '🥇', minRating: 1300, weeklyAda: 3500,  weeklyKeys: 3 },
      { id: 'diamond',  name: 'Elmas Lig',        icon: '💎', minRating: 1550, weeklyAda: 9000,  weeklyKeys: 5 },
      { id: 'champion', name: 'Şampiyonlar Ligi', icon: '👑', minRating: 1800, weeklyAda: 25000, weeklyKeys: 8 }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 🌋 WORLD BOSS — gerçek zamanlayıcı, fazlar, gerçek stake kilidi (F-03/F-21)
  // ═══════════════════════════════════════════════════════════════════════
  WORLD_BOSS: {
    BATTLE_DAY_UTC: 0,          // 0 = Pazar
    BATTLE_HOUR_UTC: 15,        // 15:00 UTC = 18:00 TSİ
    BASE_HP: 1000000,
    HP_GROWTH_ON_SURVIVE: 1.25, // öldürülemezse boss güçlenir, havuz devreder
    WEEKLY_DISTRIBUTION_RATE: 0.10, // Kasa ne kadar olursa olsun haftalık World Boss etkinliğinde kasanın sadece %10'u o haftaki etkinlikte dağıtılır
    SEED_VAULT_ADA: 8000000,
    // Stake edilen ordu Pazar'a kadar zindanda ve arenada KULLANILAMAZ
    LOCK_UNTIL_BATTLE: true,
    // Rol katkısı: dengeli kadro tek tip ordudan daha çok hasar üretir
    ROLE_SYNERGY: { guardian: 0.22, ranger: 0.30, mage: 0.28, paladin: 0.20 },
    SYNERGY_MAX_BONUS: 0.35,
    PHASES: [
      { atPct: 0.66, name: 'Kanatlar Açılıyor', text: 'Behemoth arka safı hedeflemeye başladı!' },
      { atPct: 0.33, name: 'Kıyamet Öfkesi',    text: 'Boss çıldırdı — hasarı ve hızı arttı!' }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 🏦 HAZİNE DEFTERİ — YASA 1: ödül basılmaz, transfer edilir (F-05)
  // ═══════════════════════════════════════════════════════════════════════
  // %22 Ebedi Yakım, Kalan %78'lik Gelirin 5 Ana Havuza Dağıtımı (Toplam 40 Milyon ADA Başlangıç Hazine Dağılımı):
  // %35 Zindan (14M ADA), %20 Kolezyum (8M ADA), %20 World Boss (8M ADA), %15 AMM Buyback (6M ADA), %10 Karnaval (4M ADA)
  TREASURY_ALLOCATION: { dungeon: 0.35, arena: 0.20, worldBoss: 0.20, ammBuyback: 0.15, carnival: 0.10 },
  TREASURY_POOL_NAMES: {
    dungeon: 'Zindan Ganimet Kasası',
    arena: 'Kolezyum Şampiyonluk Havuzu',
    worldBoss: 'World Boss Ödül Havuzu',
    ammBuyback: 'AMM Likidite & Buyback Rezervi',
    carnival: 'Sirk & Karnaval Ödül Havuzu'
  },
  TREASURY_TARGET_RESERVE: { dungeon: 14000000, arena: 8000000, worldBoss: 8000000, ammBuyback: 6000000, carnival: 4000000 },
  TREASURY_MIN_PAYOUT_RATIO: 0.15,   // havuz boşalsa bile ödül tamamen sıfırlanmaz
  TREASURY_SINGLE_DRAW_CAP: 0.02,    // tek ödül havuzun en fazla %2'sini çekebilir

  // ═══════════════════════════════════════════════════════════════════════
  // 🎲 EKİPMAN EKLENTİLERİ (AFFIX) — aynı kılıç artık iki oyuncuda aynı değil
  // ═══════════════════════════════════════════════════════════════════════
  EQUIPMENT_AFFIXES: [
    { id: 'sharp',    name: 'Keskin',     icon: '🗡️', stat: 'atk',       tiers: [4, 9, 16],       weight: 22 },
    { id: 'sturdy',   name: 'Sağlam',     icon: '🛡️', stat: 'armor',     tiers: [6, 13, 24],      weight: 22 },
    { id: 'vital',    name: 'Dirençli',   icon: '❤️', stat: 'hp',        tiers: [18, 40, 75],     weight: 20 },
    { id: 'swift',    name: 'Çevik',      icon: '💨', stat: 'speed',     tiers: [2, 4, 7],        weight: 14 },
    { id: 'deadly',   name: 'Ölümcül',    icon: '🎯', stat: 'crit',      tiers: [0.03, 0.06, 0.10], weight: 12 },
    { id: 'piercing', name: 'Delici',     icon: '🔺', stat: 'pen',       tiers: [8, 18, 32],      weight: 7 },
    { id: 'vampiric', name: 'Kan Emici',  icon: '🩸', stat: 'lifesteal', tiers: [0.04, 0.08, 0.14], weight: 3 }
  ],
  AFFIX_RARITY: [
    { id: 'common',    name: 'Yaygın',   color: '#94a3b8', affixCount: 1, tier: 0, weight: 55 },
    { id: 'rare',      name: 'Nadir',    color: '#38bdf8', affixCount: 2, tier: 0, weight: 27 },
    { id: 'epic',      name: 'Epik',     color: '#c084fc', affixCount: 2, tier: 1, weight: 13 },
    { id: 'legendary', name: 'Efsanevi', color: '#fbbf24', affixCount: 3, tier: 2, weight: 5 }
  ],


  // 60 günlük sezon: ücretsiz şerit herkese, premium şerit ADA ile.
  // F2P/P2E dengesinin en temiz kaldıracı — para EKSTRA alır, ZORUNLU değil.
  SEASON: {
    DURATION_DAYS: 60,
    PREMIUM_COST_ADA: 12000,
    TIERS: 30,
    POINTS_PER_TIER: 150,
    FREE_TRACK:    { adaPerTier: 60,  keysEvery: 5, fragmentsEvery: 3, boxEvery: 10 },
    PREMIUM_TRACK: { adaPerTier: 190, keysEvery: 3, fragmentsEvery: 2, boxEvery: 5 }
  },

  // Prestij: Lv.81'e ulaşan oyuncuya yeni ufuk
  PRESTIGE: {
    REQUIRED_LEVEL: 81,
    PRODUCTION_BONUS_PER_STAR: 0.05,
    MAX_STARS: 10,
    COST_ADA: 50000
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 🎪 KRALLIK KARNAVALI: ŞANS ÇARKI & HAFTALIK PİYANGO
  // ═══════════════════════════════════════════════════════════════════════
  CARNIVAL: {
    WHEEL_COST_ADA: 100, // 100 ADA veya dengi hammadde veya 1 Piyango Bileti
    // 14 Potansiyel Ödül (Kasa Asla Kaybetmez - RTP ~%78, Kasa Kârı %22)
    WHEEL_REWARDS: [
      { id: 'frag_1',        name: '1 Teçhizat Parçası',              icon: '🧩', type: 'resource', key: 'fragments', amount: 1,    valAda: 45,   weight: 60 },
      { id: 'frag_10',       name: '10 Teçhizat Parçası',             icon: '🧩', type: 'resource', key: 'fragments', amount: 10,   valAda: 450,  weight: 20 },
      { id: 'raw_1000_wood', name: '1.000 ADA Değerinde Odun',        icon: '🌲', type: 'amm_raw',  key: 'wood',      adaVal: 1000, valAda: 1000, weight: 15 },
      { id: 'raw_1000_iron', name: '1.000 ADA Değerinde Demir',       icon: '⛏️', type: 'amm_raw',  key: 'iron',      adaVal: 1000, valAda: 1000, weight: 15 },
      { id: 'raw_1000_wheat',name: '1.000 ADA Değerinde Buğday',      icon: '🌾', type: 'amm_raw',  key: 'wheat',     adaVal: 1000, valAda: 1000, weight: 15 },
      { id: 'raw_50_wood',   name: 'Amorti: 50 ADA Değerinde Odun',   icon: '🌲', type: 'amm_raw',  key: 'wood',      adaVal: 50,   valAda: 50,   weight: 1320 },
      { id: 'raw_50_iron',   name: 'Amorti: 50 ADA Değerinde Demir',  icon: '⛏️', type: 'amm_raw',  key: 'iron',      adaVal: 50,   valAda: 50,   weight: 1320 },
      { id: 'raw_50_wheat',  name: 'Amorti: 50 ADA Değerinde Buğday', icon: '🌾', type: 'amm_raw',  key: 'wheat',     adaVal: 50,   valAda: 50,   weight: 1320 },
      { id: 'free_bot_24h',  name: '24 Saatlik Otomasyon Botu (Ücretsiz)', icon: '🤖', type: 'bot_free', hours: 24,                  valAda: 200,  weight: 60 },
      { id: 'ada_200',       name: '200 $ADASTRA Nakit Ödül',         icon: '🟣', type: 'ada',      amount: 200,                    valAda: 200,  weight: 475 },
      { id: 'ada_1000',      name: '🏆 1.000 $ADASTRA BÜYÜK İKRAMİYE',icon: '👑', type: 'ada',      amount: 1000,                   valAda: 1000, weight: 10 },
      { id: 'ada_50',        name: '50 $ADASTRA Ödül',                icon: '🟣', type: 'ada',      amount: 50,                     valAda: 50,   weight: 2000 },
      { id: 'box_key',       name: '1 Pandora Kutusu Anahtarı',       icon: '🔑', type: 'key',      amount: 1,                      valAda: 1000, weight: 8 },
      { id: 'wheel_ticket_shard', name: 'Amorti Çark Bileti (10 Adet = 1 Çevirme)', icon: '🎟️', type: 'ticket_shard', amount: 1,  valAda: 10, weight: 3312 },
      { id: 'coin_analysis_code', name: 'AlphAvax Vercel App Özel Coin Analiz Bileti', icon: '🎫', type: 'analysis_code', amount: 1, valAda: 0, weight: 50 }
    ],
    // Haftalık Piyango Sistemi
    LOTTERY: {
      TICKET_COST_ADA: 100,
      SEED_POOL_ADA: 20000000,     // 20.000.000 ADA AlphaVax Tohum Kasa
      MAX_TICKETS_PER_ACCOUNT: 100,// Balina istiflemesini önleme: Hesap başı haftalık max 100 bilet (10.000 ADA)
      WINNER_MULTIPLIER: 2.0,      // Kazanan talihli bilet maliyetinin tam 2 katını (2x) nakit kazanır!
      AMORTI_SHARE: 0.02,          // %2 Amorti Hazinesine
      MAX_ROLLOVER_WEEKS: 4        // Çıkmayan biletler sonraki çekilişe devredebilir veya amorti alınabilir
    }
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 📜 GÜNCELLEME LOGU (CHANGELOG) — v1.00'dan İtibaren Sürüm Tarihçesi
  // ═══════════════════════════════════════════════════════════════════════
  CHANGELOG: [
    {
      version: 'v1.00',
      title: 'Genesis Lansmanı',
      date: 'Ağustos 2026',
      changes: ['Oyunun ilk Alpha sürümü yayınlandı.', 'Temel 3 kaynak seferi (Odun, Demir, Buğday) aktif edildi.', 'Başlangıç Kışla ve Pazar alanı açıldı.']
    },
    {
      version: 'v1.01',
      title: 'Zindan & Pandora Keşfi',
      date: 'Ağustos 2026',
      changes: ['18 Katlı Zindan ve Kat Canavarları sistemi eklendi.', 'Pandora Kutuları ve 18 Koleksiyon Eseri oyuna dahil edildi.', 'Kolezyum ve Şampiyonluk derecesi entegre edildi.']
    },
    {
      version: 'v1.02',
      title: '10 Yıllık Ekonomik Model',
      date: 'Eylül 2026',
      changes: ['4320 Dakikalık (72 saat) alet dayanıklılık sistemi getirildi.', 'Haftalık 490k buğday, 180k odun, 130k demir kotaları bağlandı.', 'Seviye bazlı sefer süresi artışı (18 dk -> 72 saat) tanımlandı.']
    },
    {
      version: 'v1.03',
      title: 'Haftalık Sıfırlama & Vanilla Reset',
      date: 'Eylül 2026',
      changes: ['Haftalık kaynak limitlerinin Pazar/Pazartesi 00:01 TSİ sıfırlanması sağlandı.', 'Vanilla Sıfırlama ile cephanelik ve haftalık limitler sıfırlanabilir hale getirildi.']
    },
    {
      version: 'v1.04',
      title: 'Canlı Düşme Oranları & HUD',
      date: 'Eylül 2026',
      changes: ['Zindan içi ve Seviye Atlama ekranında canlı Pandora ve Parça düşme oranları göstergesi eklendi.', 'Kat 3 ve Kat 6 Boss çarpanları HUD paneline yansıtıldı.']
    },
    {
      version: 'v1.05',
      title: 'Sistem Denetimi & Hazine Güvenliği',
      date: 'Eylül 2026',
      changes: ['Maksimum Seviye 81 tavanı korundu.', 'WHEAT_PER_STAMINA = 3.15 eşitliği sağlandı.', 'Zindan savaş aralığı sızıntıları temizlendi, Hazine Defteri zindan ödüllerine bağlandı.']
    },
    {
      version: 'v1.06',
      title: 'Büyük Krallık Reformu & Karnaval',
      date: 'Eylül 2026',
      changes: [
        'Tek tip elit asker: "AdAstra Şampiyonu" (Lv.1: 100 HP, 25 ATK); 18 saatlik otomatik pasif doyurma (1 HP = 0.30 Buğday + 0.10 ADA) ve 100 katı anında hızlı doyurma (1 HP = 30 Buğday + 10 ADA).',
        'Zindanda Persistent Canavar Canı (kaybedilen savaşta canavarın canı yenilenmez).',
        'Krallık Demircisi "Çantam" kategorik filtreleri, seviye sıralaması ve toplu yükseltme/onarım.',
        'Yeni Teçhizat Craft & Upgrade matematiği (ATK 18 dk, HP 21 dk üretim + AMM ADA + Parça; 13 Dayanıklılık).',
        '24 Saatlik Kâr Ortaklı Taverna Otomasyon Botu (Saf kârın %50\'si) & Silo yönetimi.',
        'Krallık Karnavalı: 14 Ödüllü Şans Çarkı (RTP %78, Kasa Kârı %22) & 1M ADA Tohumlu Haftalık Piyango.',
        'AMM Swap ücreti %1.00 yapıldı; 3 yeni Parşömen likidite havuzu açıldı.',
        '1-Click "Tüm Seferleri Topla" butonu artık bitmemiş seferlerdeki biriken kaynakları da anında topluyor.'
      ]
    },
    {
      version: 'v1.07',
      title: 'Akıllı Silo Botu, Evrensel Parşömenler & Akıcı Şans Çarkı',
      date: 'Eylül 2026',
      changes: [
        '24s Otomasyon Botu Akıllı Silo Satışı: Piyasaya satış baskısı yapmamak için silodaki malların yarısı yerine, tam bir sonraki döngüde üretilecek miktar + %5 güvenlik marjı kadar minimal satış mekanizması getirildi.',
        'Evrensel Parşömen Entegrasyonu: Krallık Dashboard (1-Click), Envanter, Kışla Toplu Doyurma & Bireysel Asker Paneli, Zindan Savaş Öncesi Ekranı ve Orman/Maden/Tarla Sefer pencerelerine parşömen varsa anında kullanım ("Parşömen Kullan") seçenekleri eklendi.',
        'Stamina Parşömeni Dengesi: Parşömen staminayı sınırsız fullemek yerine doğrudan +100 Stamina Doldurma mekaniğine uyarlandı ve tüm arayüzlerde güncellendi.',
        'GPU Donanım Hızlandırmalı Şans Çarkı: Çark çevrilirken yaşanan kasma ve takılmalar giderildi; saniyede 60 kez CPU canvas çizimi yerine GPU kompozitör dönüşü ve fiziksel ibre salınımıyla 60/120 FPS pürüzsüz akıcılık sağlandı.',
        'Karnaval Çarkı İlk Açılış & Merkez Arması: Çark ekranı ilk açıldığında oluşan siyah ekran sorunu anında senkron çizimle çözüldü; çarkın merkezine sabit şık altın "🎪 AdAstra" arması eklendi.'
      ]
    },
    {
      version: 'v1.08',
      title: 'Karnaval Şans Çarkı Ödül Oranları Kalibrasyonu',
      date: 'Eylül 2026',
      changes: [
        'Karnaval Şans Çarkı ödül dağılımı ve ağırlıkları istenen matematiksel sınırlara göre 10.000 taban ağırlıkla yeniden kalibre edildi.',
        '24 Saatlik Otomasyon Botu çıkma oranı %0.60 seviyesine (%1\'in altına) çekildi.',
        'Teçhizat Parçaları (1x ve 10x Parça) toplam çıkma oranı %0.80 seviyesine (%1\'in altına) ayarlandı.',
        '100 Stamina Doldurma Parşömeni çıkma oranı %0.70 seviyesine (%1\'in altına) çekildi.',
        'Pandora Kutusu Anahtarı çıkma oranı %0.08 seviyesine (%0.1\'in altına) çekilerek nadir hazine statüsü pekiştirildi.',
        'AlphAvax Vercel App Özel Coin Analiz Kodu çıkma oranı %0.50 seviyesine (%1\'in altına) kalibre edildi.'
      ]
    },
    {
      version: 'v1.09',
      title: 'Şans Çarkı Arayüz Yüzdeleri Düzeltmesi & Dinamik Hesaplama',
      date: 'Eylül 2026',
      changes: [
        'Karnaval Çarkı 18 Dilim Ödül Tablosundaki eski 1.000 tabanlı bölme hatası düzeltildi; tüm şans oranları 10.000 toplam havuz ağırlığı üzerinden dinamik ve kurallara (%1 altı, %0.1 altı) tam uyumlu olarak ekrana yansıtıldı.',
        'Kutucuklardaki şans yüzdeleri (örn. Anahtar için %0.08, Bot için %0.60, Teçhizat Parçası için %0.60) net 2 basamaklı hassasiyetle gösterildi.',
        'Çark RTP ve Kasa Garantisi metrikleri dinamik ağırlıklı formüle bağlanarak ekranda anlık doğru değer gösterimi sağlandı.'
      ]
    },
    {
      version: 'v1.10',
      title: 'Canlı Amorti Bilet Parçaları & Bilet Rozeti Anlık Senkronizasyonu',
      date: 'Eylül 2026',
      changes: [
        'Karnaval Çarkı amorti bilet parçası (wheel_ticket_shard) kazanıldığında sayfanın veya modalın kapatılıp açılması gerekliliği ortadan kaldırıldı.',
        'Kazanım anında "🎟️ Amorti Bilet Parçaları: X/10" rozeti canlı animasyon ve altın rengi vurgu ile anında güncellenir.',
        '10 Parça tamamlanıp 1 Piyango/Çark Biletine dönüştüğünde, hem amorti sayacı hem de "🎟️ 1 Bilet İle Çevir" butonu anında canlı olarak senkronize edilir.',
        'Kazanılan AlphAvax Vercel App analiz kodları modal açıkken anlık olarak listeye eklenir.'
      ]
    },
    {
      version: 'v1.11',
      title: 'Ordu Hızlı Doyurma Deflasyonist Denge & Hazine Yakımı Reformu',
      date: 'Eylül 2026',
      changes: [
        'Ordu hızlı doyurma (Instant Heal) maliyeti, zindan havuzunu korumak ve deflasyonist yapıyı beslemek amacıyla 10x altın orana (1 HP = 3.0 Buğday + 1.0 ADA) uyarlandı.',
        '100x aşırı çarpan kaldırılarak tek asker tam canı 300 Buğday + 100 ADA, 18 kişilik tüm ordu ise 5.400 Buğday + 1.800 ADA seviyesine kalibre edildi.',
        'Hızlı doyurmada harcanan tüm $ADASTRA anında Hazine Muhasebesine (%22 Kalıcı Yakım + %78 Hazine Havuzları) işlenerek deflasyonist token yakımı ve havuz sponsorluğu sağlandı.',
        '18 saatlik düşük maliyetli pasif doyurma (1 HP = 0.30 Buğday + 0.10 ADA) aynen korunarak sabırlı emek veren oyuncuların zindan kârlılığı teminat altına alındı.'
      ]
    },
    {
      version: 'v1.12',
      title: '100M $ADASTRA Likidite & Hazine Reformu, Zindan Parşömenleri & Alet Tamir Dengelemesi',
      date: 'Eylül 2026',
      changes: [
        'Alet Onarım Parşömeni (scroll_repair) oyundan tamamen kaldırılarak Demirci hammadde tamir ekonomisi güvenceye alındı.',
        'Şans Çarkından tüm parşömenler çıkarıldı; ordu iyileştirme ve stamina parşömenleri yalnızca Zindan canavar & boss zaferlerinden düşen nadir ganimet haline getirildi.',
        'Şans Çarkı ödül dağılımı 15 dilimle 10.000 taban ağırlığa ve kural yüzdelerine tam uyumlu olarak yeniden dengelendi.',
        '100 Milyon $ADASTRA tohum fonu: 40M AMM DEX Havuzları, 40M Hazine Kasaları, 20M Krallık Piyangosu olarak dağıtıldı.',
        'AMM çift taraflı derinlik mimarisiyle, haftalık kotalar hiç yakılmadan ful satılsa dahi havuzların aylar sonra bile %50-60 seviyesinde güvende kalması matematiksel olarak garanti edildi.'
      ]
    },
    {
      version: 'v1.13',
      title: 'Pandora Kutusu & Anahtar AMM Havuzları ve Piyango 2x Kazanç Reformu',
      date: 'Eylül 2026',
      changes: [
        'Pandora Kutusu (10.000 ADA) ve Anahtar (1.000 ADA) AMM DEX havuzları yüksek değerleme ve sanal derinlik modeliyle optimize edildi.',
        'Pandora Kutularını açmak için Anahtar zorunluluğu getirildi. Anahtarların Zindan düşüşü kapatıldı; yalnızca Kolezyum sıralaması ve Şans Çarkından düşebilir hale getirildi.',
        'Koleksiyonu tamamlayan gezginler, düşürdükleri Pandora Kutularını AMM havuzunda ~10.000 $ADASTRA gibi devasa bir bedelle satabilme imkanına kavuştu.',
        'Piyango 2x Kazanç Sistemi: Kazanan kişi havuzun %18\'i yerine satın aldığı bilet tutarının tam 2 katını (2x) nakit kazanır, biletleri yakılır ve devasa 20M+ havuz devrederek büyümeye devam eder.',
        'Balina İstiflemesini Önleme Kotası: Her hesabın haftalık satın alabileceği maksimum bilet sayısı 100 bilet (10.000 ADA) ile sınırlandırıldı.'
      ]
    }
  ],

  // 📢 EKRAN ÜSTÜ CANLI KAYAN DUYURU & RİSK UYARI ŞERİDİ (TICKER)
  ANNOUNCEMENT_TICKER: {
    enabled: true,
    speedSeconds: 65,         // Akış hızı (saniye) - uzun metinler için rahat okunabilir süre
    pauseOnHover: true,       // Fare imleci üzerine geldiğinde kaymayı duraklat
    showLiveBadge: true,      // Sol tarafta yanıp sönen 'CANLI DUYURU' etiketi
    separator: '✦'           // Duyurular arası görsel ayraç
  },

  // 📢 Canlı Gösterge Paneli / Marquee Uyarı ve Duyurular
  ANNOUNCEMENTS: [
    {
      id: 'audit_risk_warning',
      badge: '🚨 GÜVENLİK & RİSK UYARISI',
      text: 'bu oyun tamamen antigravity ide gemini 3.8 flash botu ile yazılmıştır. hiçbir audit yapılmamıştır ve yazılım/kodlama bilmeyen tek bir kullanıcı tarafından geliştirilmektedir, bu sebepten bir çok güvenik açığı bulunabilir. bu güvenlik açıkları tamamen tespit edilip oyun audit edilene kadar lütfen oyuna ana web3 cüzdanınızla bağlanmayın. sadece bu oyunda kullancağınız yeni bir web3 cüzdan açın, yapacağınız yatırımlarda olası bir hacklenme veya güvenlik zaafında yatırımlarınızın gidebileceğini unutmayın. şuan bu oyun tamamen deneysel bir süreçtir lütfen riskinizi gözeterek yatırım yapın. eğer sürece ve şu anki duruma güvenmiyorsanız lütfen oyunu oynamayın, yatırım yapmayın veya tamamen free to play olarak oynayın. anlayısınız ve ilginiz için teşekkür ederim',
      active: true,
      priority: 1
    },
    {
      id: 'f2p_welcome',
      badge: '⚔️ KRALLIK DUYURUSU',
      text: 'AdAstra: Genesis Realm v1.15 devrede! 100M $ADASTRA tohum fonu, dinamik AMM DEX fiyatlandırması ve Krallık Meclisi oylamaları aktiftir.',
      active: true,
      priority: 2
    }
  ],

  // Başlangıç Profili
  STARTING_PROFILE: {
    name: 'AlphAvax Gezgini',
    level: 1,
    currentXp: 0,
    stamina: 100,
    adAstraBalance: 250,
    inventory: {
      wood: 60,
      iron: 40,
      wheat: 80,
      fragments: 0
    },
    tools: {
      axe: { durability: 4320, totalGathered: 0 },
      pickaxe: { durability: 4320, totalGathered: 0 },
      sickle: { durability: 4320, totalGathered: 0 }
    },
    army: {
      infantry: 2,
      archer: 1,
      knight: 0
    },
    equipment: {
      weapon: null,
      helmet: null,
      armor: null,
      legs: null,
      boots: null
    },
    warehouseLevel: 1,
    lockedBoxes: 0,
    arenaKeys: 0,
    activeBuffs: {},
    activeExpeditions: {}
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 📢 CANLI KAYAN DUYURU & RİSK UYARI PANOSU (TOP MARQUEE TICKER)
  // ═══════════════════════════════════════════════════════════════════════
  ANNOUNCEMENTS: [
    {
      id: 'audit_risk_warning',
      badge: '🚨 KRİTİK GÜVENLİK & RİSK UYARISI',
      badgeColor: '#ef4444',
      text: 'bu oyun tamamen antigravity ide gemini 3.8 flash botu ile yazılmıştır. hiçbir audit yapılmamıştır ve yazılım/kodlama bilmeyen tek bir kullanıcı tarafından geliştirilmektedir, bu sebepten bir çok güvenik açığı bulunabilir. bu güvenlik açıkları tamamen tespit edilip oyun audit edilene kadar lütfen oyuna ana web3 cüzdanınızla bağlanmayın. sadece bu oyunda kullancağınız yeni bir web3 cüzdan açın, yapacağınız yatırımlarda olası bir hacklenme veya güvenlik zaafında yatırımlarınızın gidebileceğini unutmayın. şuan bu oyun tamamen deneysel bir süreçtir lütfen riskinizi gözeterek yatırım yapın. eğer sürece ve şu anki duruma güvenmiyorsanız lütfen oyunu oynamayın, yatırıp yapmayın veya tamamen free to play olarak oynayın. anlayısınız ve ilginiz için teşekkür ederim',
      active: true,
      priority: 1
    },
    {
      id: 'ecosystem-notice',
      badge: '👑 ADASTRA REALM',
      badgeColor: '#f59e0b',
      text: 'AdAstra Krallığı v1.15 yayında! 100 Milyon $ADASTRA tohum fonu, AMM DEX canlı pazar entegrasyonu ve haftalık devreden ödül kasaları aktif.',
      active: true,
      priority: 2
    }
  ],
  ANNOUNCEMENT_TICKER: {
    enabled: true,
    speedSeconds: 55,
    pauseOnHover: true,
    showPulseDot: true,
    separator: '✦'
  },
  TICKER_CONFIG: {
    enabled: true,
    speedSeconds: 55,
    pauseOnHover: true,
    showPulseDot: true,
    separator: '✦'
  }
};
