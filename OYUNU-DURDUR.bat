@echo off
rem Realm of Astra - arka plandaki yerel sunucuyu durdurur ve otomatik baslatmayi kapatir.
setlocal
cd /d "%~dp0"
set "PIDFILE=%~dp0logs\server.pid"
set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"

if not exist "%PIDFILE%" goto killport
set /p WPID=<"%PIDFILE%"
taskkill /PID %WPID% /T /F >nul 2>&1
del "%PIDFILE%" >nul 2>&1

:killport
rem Bekci disinda 5180 portunu dinleyen kalan surec varsa onu da kapat
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5180" ^| findstr "LISTENING"') do taskkill /PID %%a /T /F >nul 2>&1

if exist "%STARTUP%\RealmOfAstra-Sunucu.vbs" del "%STARTUP%\RealmOfAstra-Sunucu.vbs"

echo Sunucu durduruldu ve otomatik baslatma kapatildi.
echo Tekrar acmak icin: OYUNU-BASLAT.bat
timeout /t 5 >nul
endlocal
