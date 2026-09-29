@echo off
rem Realm of Astra - yerel sunucuyu arka planda baslatir (pencere kapansa da calisir)
rem Bilgisayar her acildiginda da otomatik baslamasi icin Baslangic klasorune kayit ekler.
setlocal
cd /d "%~dp0"
set "ROOT=%~dp0"
set "URL=http://localhost:5180/"
set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"

where node >nul 2>&1
if errorlevel 1 (
  echo [HATA] Node.js bulunamadi. https://nodejs.org adresinden LTS surumunu kurup tekrar deneyin.
  pause
  exit /b 1
)

if not exist "node_modules\vite" (
  echo Ilk kurulum yapiliyor: npm install ...
  call npm install
)

echo Sunucu arka planda baslatiliyor...
wscript //nologo "%ROOT%scripts\windows\server-hidden.vbs"

rem Windows her acildiginda sunucu kendiliginden baslasin
> "%STARTUP%\RealmOfAstra-Sunucu.vbs" echo CreateObject("WScript.Shell").Run "wscript //nologo ""%ROOT%scripts\windows\server-hidden.vbs""", 0, False

timeout /t 4 /nobreak >nul
start "" "%URL%"

echo.
echo  Oyun acik: %URL%
echo  Sunucu arka planda calisiyor; bu pencereyi kapatabilirsin.
echo  Bilgisayar yeniden acildiginda da kendiliginden baslar.
echo  Tamamen durdurmak icin: OYUNU-DURDUR.bat
echo  Gunluk: logs\server.log
echo.
timeout /t 8 >nul
endlocal
