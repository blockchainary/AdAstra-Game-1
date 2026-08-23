// AdAstra: Genesis Realm - Silent Audio Engine (Sesler Tamamen Kapatıldı)
// Bu modül oyun içi tüm ses efektlerini devre dışı bırakır
class SoundManager {
  constructor() {
    this.ctx = null;
    this.isMuted = true; // 100% Sessiz
  }

  init() {}
  playTone() {}
  playChop() {}
  playPickaxe() {}
  playHarvest() {}
  playCrystal() {}
  playRepair() {}
  playStaminaRefill() {}
  playBurn() {}
  playLevelUp() {}
  playBreakWarning() {}
}

export const sound = new SoundManager();