# SDLC (Software Development Life Cycle) Doktrini

Bu kural, projede yapılan HER güncelleme, özellik ekleme ve hata düzeltme için zorunludur.

## 5 Aşamalı SDLC Döngüsü:

1. **Analiz & Gereksinim Tespiti (Analysis):**
   - Kullanıcının talebi, görseller ve mevcut kod yapısı detaylı incelenir.

2. **Geliştirme & Entegrasyon (Implementation):**
   - Kod temiz, modüler ve AAA standartlarında yazılır.

3. **Statik & Sözdizimi Doğrulaması (Static Validation):**
   - `node --check` ile tüm JS dosyalarının sözdizimi taranır.

4. **Otomasyon Testi & Canlı Doğrulama (E2E & Runtime QA Verification):**
   - Değişiklik kullanıcıya sunulmadan önce Playwright / Node otomasyon testleri (`sdlc_runner.mjs`) çalıştırılır.
   - Tarayıcı konsol logları taranır (`Errors count === 0`).
   - UI render ve etkileşimleri otomatik olarak test edilip doğrulanır.
   - Hata varsa kullanıcıya bildirmeden önce kod üzerinde düzeltilir ve test tekrarlanır.

5. **Canlıya Teslim & Raporlama (Delivery & Review):**
   - Sadece testleri %100 başarıyla geçen, 0 hata veren ve doğrulanmış sürümler kullanıcıya sunulur.

6. **Sürüm ve Güncelleme Günlüğü Takibi (Version & Changelog Tracking):**
   - Yapılan her güncelleme, özellik ve hata düzeltmesi, `js/config.js` içindeki `GAME_CONFIG.CHANGELOG` dizinine yeni versiyon adı altında (örn. `v1.07`, `v1.08`...) tarih, başlık ve maddeleriyle eksiksiz eklenir.
   - `index.html` üst barındaki sürüm rozeti ve modal başlıkları her yeni sürümle senkronize edilir.
