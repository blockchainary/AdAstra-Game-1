@echo off
chcp 65001 > nul
title AdAstra - Sınırsız Yerel Ollama Kodlama Paneli
echo ===================================================
echo ⚔️  ADASTRA: GENESIS REALM - YEREL OLLAMA KODLAYICI
echo    (Sıfır IDE Limiti - Sınırsız Yerel AI Gücü)
echo ===================================================
echo.
echo [1/2] Ollama servisi kontrol ediliyor...
start /B ollama serve > nul 2>&1
timeout /t 2 /nobreak > nul

cd /d "C:\Users\AlphAvax\.gemini\antigravity-ide\scratch\adastra-realm"

echo [2/2] Kodlama Paneli baslatiliyor (http://localhost:4000)...
start http://localhost:4000
node local_coder_server.mjs
pause
