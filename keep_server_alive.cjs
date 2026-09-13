const { spawn } = require('child_process');

console.log('🛡️ [AdAstra Realm] 7/24 Kesintisiz Dev Server Watchdog Aktif Edildi...');

function startVite() {
  const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  console.log('🚀 Vite dev server başlatılıyor (http://localhost:5173/)...');
  
  const child = spawn(npxCmd, ['vite', '--host', '0.0.0.0', '--port', '5173'], {
    cwd: __dirname,
    stdio: 'inherit',
    shell: true
  });

  child.on('exit', (code, signal) => {
    console.warn(`⚠️ Vite dev server durdu (kod: ${code}, sinyal: ${signal}). Otomatik olarak 1 saniye içinde yeniden ayağa kaldırılıyor...`);
    setTimeout(startVite, 1000);
  });

  child.on('error', (err) => {
    console.error('❌ Vite işlem hatası:', err);
    setTimeout(startVite, 2000);
  });
}

startVite();
