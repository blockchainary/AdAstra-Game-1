import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GAME_CONFIG } from '../js/config.js';

describe('Ekran Üstü Canlı Duyuru ve Risk Bildirim Paneli Testi', () => {
  it('GAME_CONFIG.ANNOUNCEMENTS dizisi tanımlı ve en az 1 aktif duyuru içeriyor olmalı', () => {
    assert.ok(Array.isArray(GAME_CONFIG.ANNOUNCEMENTS), 'ANNOUNCEMENTS bir dizi olmalı');
    assert.ok(GAME_CONFIG.ANNOUNCEMENTS.length > 0, 'En az 1 duyuru tanımlı olmalı');
  });

  it('Kullanıcının talep ettiği güvenlik açığı, audit ve web3 cüzdan risk uyarısı metnini tam içermeli', () => {
    const riskWarning = GAME_CONFIG.ANNOUNCEMENTS.find(a => a.id === 'audit_risk_warning');
    assert.ok(riskWarning, 'audit_risk_warning idli duyuru mevcut olmalı');
    assert.strictEqual(riskWarning.active, true, 'Risk uyarısı aktif olmalı');
    assert.ok(riskWarning.badge.includes('GÜVENLİK') || riskWarning.badge.includes('RİSK'), 'Rozet güvenlik/risk içermeli');

    // Metin içerik kontrolü
    assert.ok(riskWarning.text.includes('antigravity ide gemini 3.8 flash botu ile yazılmıştır'), 'Metin bot geliştirme bilgisini içermeli');
    assert.ok(riskWarning.text.includes('hiçbir audit yapılmamıştır'), 'Metin audit bilgisini içermeli');
    assert.ok(riskWarning.text.includes('lütfen oyuna ana web3 cüzdanınızla bağlanmayın'), 'Metin ana web3 cüzdan uyarısını içermeli');
    assert.ok(riskWarning.text.includes('şuan bu oyun tamamen deneysel bir süreçtir'), 'Metin deneysel süreç uyarısını içermeli');
    assert.ok(riskWarning.text.includes('anlayısınız ve ilginiz için teşekkür ederim'), 'Metin teşekkür mesajını içermeli');
  });

  it('Duyurular filtreleme ve duplicate (seamless marquee) döngüsü için geçerli olmalı', () => {
    const activeItems = GAME_CONFIG.ANNOUNCEMENTS.filter(a => a.active !== false);
    assert.ok(activeItems.length >= 1, 'En az 1 aktif duyuru kalmalı');
    activeItems.forEach(item => {
      assert.ok(typeof item.text === 'string' && item.text.length > 10, 'Metin uzunluğu geçerli olmalı');
      assert.ok(typeof item.badge === 'string' && item.badge.length > 0, 'Rozet metni bulunmalı');
    });
  });
});
