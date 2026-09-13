@echo off
title AdAstra Realm - 7/24 Kesintisiz Oyun Sunucusu
cd /d "%~dp0"
cls
echo ====================================================================
echo   ADASTRA: GENESIS REALM - 7/24 KESINTISIZ YEREL SUNUCU (WATCHDOG)
echo   Adres: http://localhost:5173/
echo ====================================================================
node keep_server_alive.cjs
pause
