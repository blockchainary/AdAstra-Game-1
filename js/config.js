// AdAstra: Genesis Realm - Karakter Seviyesi, Kışla Ordusu, Taverna Güçlendirmeleri & AMM Konfigürasyonu
export const GAME_CONFIG = {
  EPOCH_DURATION_SECONDS: 24 * 3600, // 24 Saatlik Günlük Havuz
  
  // Stamina
  MAX_STAMINA: 100,
  STAMINA_COST_PER_EXPEDITION: 25,
  STAMINA_NATURAL_REGEN_INTERVAL: 180,
  STAMINA_INSTANT_REFILL_ADASTRA_COST: 50,
  
  // %18 Matematiksel Denge
  TOKEN_BURN_RATE: 0.18,
  TOKEN_REWARD_POOL_RATE: 0.82,
  TOOL_REPAIR_RESOURCE_RATIO: 0.18,

  // =========================================================================
  // 📈 MATEMATİKSEL EKONOMİ VE ÜRETİM MODELİ
  // =========================================================================
  BASE_PRODUCTION: {
    wood: 18,
    iron: 12,
    wheat: 15
  },
  GROWTH_FACTORS: {
    wood: 1.078,
    iron: 1.082,
    wheat: 1.080
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

  // Kaynak Alanları (Haftalık Limitler)
  GLOBAL_RESOURCE_CAPS: {
    wood: {
      id: 'wood',
      name: 'Zümrüt Meşe Odunu',
      icon: '🌲',
      color: '#4ade80',
      totalCap: 180000, // Haftalık Çıkarım Limiti
      baseYieldPerHour: 30,
      requiredTool: 'axe'
    },
    iron: {
      id: 'iron',
      name: 'Derin Demir Cevheri',
      icon: '⛏️',
      color: '#94a3b8',
      totalCap: 130000, // Haftalık Çıkarım Limiti
      baseYieldPerHour: 25,
      requiredTool: 'pickaxe'
    },
    wheat: {
      id: 'wheat',
      name: 'Güneş Buğdayı',
      icon: '🌾',
      color: '#facc15',
      totalCap: 490000, // Haftalık Çıkarım Limiti
      baseYieldPerHour: 50,
      requiredTool: 'sickle'
    }
  },
  
  // Aletler & Tamir Maliyetleri (Odun + Demir + AdAstra)
  TOOLS: {
    axe: {
      id: 'axe',
      name: 'Acemi Baltası',
      icon: '🪓',
      maxDurability: 100,
      durabilityLossPerExpedition: 25,
      producedResource: 'wood',
      fullRepairCost: { wood: 20, iron: 15, adAstra: 10 }
    },
    pickaxe: {
      id: 'pickaxe',
      name: 'Bronz Kazma',
      icon: '⛏️',
      maxDurability: 100,
      durabilityLossPerExpedition: 25,
      producedResource: 'iron',
      fullRepairCost: { wood: 15, iron: 25, adAstra: 15 }
    },
    sickle: {
      id: 'sickle',
      name: 'Demir Orak',
      icon: '🌾',
      maxDurability: 100,
      durabilityLossPerExpedition: 25,
      producedResource: 'wheat',
      fullRepairCost: { wood: 25, iron: 10, adAstra: 5 }
    }
  },

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
  SOLDIER_PRICE: 18000,
  MAX_SOLDIERS: 18,
  SOLDIER_MAX_HP: 100,
  SOLDIER_HEAL_DURATION_MINUTES: 1080,
  SOLDIER_HEAL_TICK_MINUTES: 18,
  SOLDIER_HEAL_HP_PER_TICK: 1.667,

  // =========================================================================
  // 🌾 18 KİŞİLİK ORDU: OTOMATİK BUĞDAY İLE PASİF İYİLEŞME & ANINDA İYİLEŞTİRME
  // =========================================================================
  SOLDIER_PASSIVE_HEAL: {
    FULL_HEAL_SECONDS: 64800,     // 0 HP'den %100 cana kadar tam iyileşme süresi (18 saat)
    WHEAT_PER_HP: 0.5,            // Eksik HP başına gereken Buğday (100 HP tam can = 50 Buğday, askerin Max HP'sine göre orantılı)
    INSTANT_HEAL_ADA_PER_HP: 1.5  // '⚡ Anında Doyur & İyileştir' ile eksik HP başına ekstra $ADASTRA bedeli
  },

  // =========================================================================
  // WAREHOUSE STORAGE & UPGRADES
  // =========================================================================
  WAREHOUSE: {
    baseLevels: 5,
    capacities: {
      1: { iron: 500, wood: 500, wheat: 500 },
      2: { iron: 1000, wood: 1000, wheat: 1000 },
      3: { iron: 2000, wood: 2000, wheat: 2000 },
      4: { iron: 3500, wood: 3500, wheat: 3500 },
      5: { iron: 5000, wood: 5000, wheat: 5000 }
    },
    upgradeCosts: {
      2: { wood: 100, wheat: 150, iron: 120, adAstra: 300 },
      3: { wood: 250, wheat: 350, iron: 280, adAstra: 700 },
      4: { wood: 500, wheat: 700, iron: 600, adAstra: 1500 },
      5: { wood: 1000, wheat: 1400, iron: 1200, adAstra: 3000 }
    }
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

  // Taverna 24 Saatlik Güçlendirmeleri (Tavern 24h Buffs)
  TAVERN_BUFFS: {
    auto_collector: {
      id: 'auto_collector',
      name: '24 Saatlik Otomatik Toplama Botu',
      icon: '🤖',
      durationSeconds: 24 * 3600,
      costAdAstra: 23500,
      desc: 'Seferler bittiğinde kaynakları otomatik toplar ve alet sağlam oldukça görevi yeniden başlatır.'
    },
    speed_wood: {
      id: 'speed_wood',
      name: '24 Saatlik 1.5x Hızlı Odunculuk',
      icon: '🌲',
      durationSeconds: 24 * 3600,
      costAdAstra: 40,
      desc: 'Odun toplama görev süresini 1.5 kat hızlandırır (%33 süre avantajı).'
    },
    speed_iron: {
      id: 'speed_iron',
      name: '24 Saatlik 1.5x Hızlı Madencilik',
      icon: '⛏️',
      durationSeconds: 24 * 3600,
      costAdAstra: 40,
      desc: 'Demir madeni görev süresini 1.5 kat hızlandırır.'
    },
    speed_wheat: {
      id: 'speed_wheat',
      name: '24 Saatlik 1.5x Hızlı Hasat',
      icon: '🌾',
      durationSeconds: 24 * 3600,
      costAdAstra: 40,
      desc: 'Buğday hasadı süresini 1.5 kat hızlandırır.'
    }
  },
  
  // =========================================================================
  // GAMEFI & RPG EKONOMİSİ (PHASE 1): ZİNDAN GANİMET ORANLARI
  // =========================================================================
  // Level-scaled drop rates (Lv 1 to Lv 81)
  FRAGMENT_DROP_MIN: 0.018,       // 1.8% at Lv 1
  FRAGMENT_DROP_MAX: 0.18,        // 18% at Lv 81
  BOX_DROP_MIN: 0.000018,         // 0.0018% at Lv 1
  BOX_DROP_MAX: 0.0018,           // 0.18% at Lv 81
  // Koleksiyon Eseri (artifact) keşif olasılığı = ARTIFACT_BASE_RATE * seviye (yalnızca boss canavarlarda)
  ARTIFACT_BASE_RATE: 0.0009,
  // Boss canavarlarda tüm ganimet oranlarına uygulanan çarpan
  BOSS_DROP_MULTIPLIER: 6,

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
      axe: { durability: 100, totalGathered: 0 },
      pickaxe: { durability: 100, totalGathered: 0 },
      sickle: { durability: 100, totalGathered: 0 }
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
