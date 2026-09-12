// AdAstra: Genesis Realm - Karakter Seviyesi, Kışla Ordusu, Taverna Güçlendirmeleri & AMM Konfigürasyonu
export const GAME_CONFIG = {
  EPOCH_DURATION_SECONDS: 24 * 3600, // 24 Saatlik Günlük Havuz
  
  // Stamina — v2: 3 paralel sefer HER seviyede mümkün olacak şekilde kalibre edildi.
  // v1'de max = 100+20(L-1) iken maliyet = 25+12(L-1) idi; 3 sefer Lv.3'ten itibaren
  // imkânsız hâle geliyordu (bkz. denetim bulgusu F-14).
  MAX_STAMINA: 100,
  STAMINA_MAX_PER_LEVEL: 25,          // max = 100 + 25·(L-1)
  STAMINA_COST_PER_EXPEDITION: 20,    // maliyet = 20 + 8·(L-1)
  STAMINA_COST_PER_LEVEL: 8,
  STAMINA_NATURAL_REGEN_INTERVAL: 150,
  STAMINA_INSTANT_REFILL_ADASTRA_COST: 50,
  WHEAT_REFILL_RATIO: 0.21,           // 1 Stamina = Dk başı buğday (15) * %21 = 3.15 Buğday
  WHEAT_PER_STAMINA: 3.15,            // 1 Stamina doldurmak için gereken buğday miktarı (Fix 3.15)

  // %22 Yakım — v2: sink kapsamı genişletildiği için oran yükseltildi.
  // Artık asker alımı, AMM ücreti, iyileştirme ve tamir de muhasebeleşiyor (F-06).
  TOKEN_BURN_RATE: 0.22,
  TOKEN_REWARD_POOL_RATE: 0.78,

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
    boxes:     { minPriceAda: 400,  maxPriceAda: 2500,  defaultPriceAda: 900 },
    keys:      { minPriceAda: 150,  maxPriceAda: 900,   defaultPriceAda: 350 }
  },

  // Swap ücreti: yarısı yakılır, yarısı likiditeye kalır (F-07)
  AMM_FEE_RATE: 0.003,
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
  // SOLDIER & MILITARY SYSTEM (SOLDIERS)
  // =========================================================================
  // 1 asker satın almanın maliyeti 180.000 $ADASTRA (180 bin ADA).
  // Sınırsız ordu ve her asker alımı sabit 180.000 ADA olarak belirlendi.
  SOLDIER_PRICE: 180000,              // 1 askerin fiyatı: 180.000 ADA
  SOLDIER_COST_BASE: 180000,
  SOLDIER_COST_EXPONENT: 0,           // Sabit 180.000 ADA
  MAX_SOLDIERS: Infinity,             // Sınırsız ordu ve asker alımı
  SOLDIER_MAX_HP: 100,
  SOLDIER_HEAL_DURATION_MINUTES: 1080,
  SOLDIER_HEAL_TICK_MINUTES: 18,
  SOLDIER_HEAL_HP_PER_TICK: 1.667,

  // =========================================================================
  // 🌾 ORDU: OTOMATİK BUĞDAY İLE PASİF İYİLEŞME & ANINDA İYİLEŞTİRME
  // =========================================================================
  SOLDIER_PASSIVE_HEAL: {
    FULL_HEAL_SECONDS: 64800,     // 0 HP'den %100 cana kadar tam iyileşme süresi (18 saat)
    WHEAT_PER_HP: 0.5,            // Eksik HP başına gereken Buğday (100 HP tam can = 50 Buğday, askerin Max HP'sine göre orantılı)
    INSTANT_HEAL_ADA_PER_HP: 1.5  // '⚡ Anında Doyur & İyileştir' ile eksik HP başına ekstra $ADASTRA bedeli
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
    },
    speed_potion_1: {
      id: 'speed_potion_1',
      name: 'Kısa Darbe İksiri (1.50x Hız & Verim)',
      icon: '⚡',
      durationSeconds: 2 * 3600,
      costAdAstra: 350,
      speedMultiplier: 1.50,
      desc: '2 saat boyunca seferlerin hem süresini hem verimini 1.50 kat artırır.'
    },
    speed_potion_2: {
      id: 'speed_potion_2',
      name: 'Standart Sefer İksiri (1.75x Hız & Verim)',
      icon: '⚡',
      durationSeconds: 6 * 3600,
      costAdAstra: 1200,
      speedMultiplier: 1.75,
      desc: '6 saat boyunca seferlerin hem süresini hem verimini 1.75 kat artırır.'
    },
    speed_potion_3: {
      id: 'speed_potion_3',
      name: 'Büyük Sefer İksiri (2.00x Hız & Verim)',
      icon: '⚡',
      durationSeconds: 24 * 3600,
      costAdAstra: 4200,
      speedMultiplier: 2.00,
      desc: '24 saat boyunca seferlerin hem süresini hem verimini 2.00 kat artırır.'
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
  TREASURY_ALLOCATION: { dungeon: 0.34, arena: 0.22, worldBoss: 0.20, ammBuyback: 0.16, season: 0.08 },
  TREASURY_POOL_NAMES: {
    dungeon: 'Zindan Ganimet Kasası',
    arena: 'Kolezyum Şampiyonluk Havuzu',
    worldBoss: 'World Boss Ödül Havuzu',
    ammBuyback: 'AMM Likidite & Buyback Rezervi',
    season: 'Sezon & Staking Havuzu'
  },
  TREASURY_TARGET_RESERVE: { dungeon: 180000, arena: 120000, worldBoss: 110000, ammBuyback: 90000, season: 45000 },
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
    genesisNftMinted: false,
    activeBuffs: {},
    activeExpeditions: {}
  }
};
