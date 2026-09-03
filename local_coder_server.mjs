import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = 4000;
const OLLAMA_HOST = 'http://127.0.0.1:11434';

const editableFiles = [
  'js/app.js',
  'js/gameState.js',
  'css/style.css',
  'index.html',
  'test_weapon_durability_dungeon.mjs',
  'tools_balance_calibration.mjs'
];

const htmlContent = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>AdAstra • Yerel Ollama Kodlama Asistanı (Sıfır Token)</title>
  <style>
    :root {
      --bg: #09060f;
      --card-bg: rgba(22, 14, 32, 0.85);
      --border: rgba(234, 179, 8, 0.4);
      --gold: #fde047;
      --green: #4ade80;
      --purple: #c084fc;
      --text: #f1f5f9;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', system-ui, sans-serif; }
    body { background: var(--bg); color: var(--text); padding: 24px; min-height: 100vh; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid var(--border); padding-bottom: 16px; margin-bottom: 20px; }
    .header h1 { font-size: 1.4rem; color: var(--gold); display: flex; align-items: center; gap: 8px; }
    .status-badge { background: rgba(74, 222, 128, 0.15); color: var(--green); border: 1px solid var(--green); padding: 4px 12px; border-radius: 8px; font-size: 0.82rem; font-weight: 800; }
    .layout { display: grid; grid-template-columns: 280px 1fr; gap: 20px; }
    .sidebar { background: var(--card-bg); border: 1px solid var(--border); border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
    .sidebar h3 { font-size: 0.9rem; color: var(--gold); margin-bottom: 4px; }
    .file-btn { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); color: var(--text); padding: 10px 12px; border-radius: 8px; cursor: pointer; text-align: left; font-size: 0.85rem; font-weight: 600; transition: all 0.2s ease; }
    .file-btn:hover { background: rgba(234, 179, 8, 0.15); border-color: var(--gold); color: var(--gold); }
    .file-btn.active { background: linear-gradient(135deg, rgba(234,179,8,0.25), rgba(69,26,3,0.4)); border-color: var(--gold); color: #fff; box-shadow: 0 0 10px rgba(250,204,21,0.2); }
    .main-panel { display: flex; flex-direction: column; gap: 16px; }
    .prompt-box { background: var(--card-bg); border: 1.5px solid var(--border); border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 10px; box-shadow: 0 4px 16px rgba(0,0,0,0.5); }
    textarea { width: 100%; height: 110px; background: #0c0814; border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; padding: 12px; color: #fff; font-size: 0.95rem; resize: vertical; outline: none; }
    textarea:focus { border-color: var(--gold); }
    .btn-row { display: flex; justify-content: space-between; align-items: center; }
    .btn-primary { background: linear-gradient(180deg, #eab308 0%, #a16207 100%); color: #1e0e04; font-weight: 900; border: none; padding: 10px 20px; border-radius: 9px; cursor: pointer; font-size: 0.92rem; transition: all 0.2s ease; }
    .btn-primary:hover { filter: brightness(1.15); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(234,179,8,0.4); }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-save { background: linear-gradient(180deg, #22c55e 0%, #15803d 100%); color: #fff; font-weight: 900; border: none; padding: 10px 20px; border-radius: 9px; cursor: pointer; font-size: 0.92rem; display: none; }
    .output-card { background: #08040d; border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; padding: 16px; max-height: 500px; overflow-y: auto; font-family: monospace; font-size: 0.88rem; line-height: 1.5; color: #cbd5e1; white-space: pre-wrap; word-break: break-word; }
    .model-select { background: #0c0814; color: var(--gold); border: 1px solid var(--border); padding: 6px 12px; border-radius: 8px; font-weight: 700; outline: none; }
  </style>
</head>
<body>
  <div class="header">
    <h1>⚔️ AdAstra • Sınırsız Yerel Ollama Kodlayıcı</h1>
    <div style="display: flex; align-items: center; gap: 12px;">
      <select id="model-select" class="model-select">
        <option value="qwen2.5-coder:3b">Qwen 2.5 Coder (3B - Önerilen)</option>
        <option value="qwen2.5-coder:1.5b">Qwen 2.5 Coder (1.5B - Ultra Hızlı)</option>
        <option value="llama3.2">Llama 3.2 (3B - Genel)</option>
      </select>
      <span class="status-badge" id="ollama-status">⚡ Ollama Aktif (Sıfır Token)</span>
    </div>
  </div>

  <div class="layout">
    <div class="sidebar">
      <h3>📁 Düzenlenecek Dosya:</h3>
      <div id="file-list" style="display: flex; flex-direction: column; gap: 6px;"></div>
    </div>

    <div class="main-panel">
      <div class="prompt-box">
        <div style="font-weight: 800; font-size: 0.92rem; color: var(--gold);">💬 Ne Kodlamak / Değiştirmek İstiyorsun?</div>
        <textarea id="prompt-input" placeholder="Örnek: Kışla ekranındaki onarım butonunun arka planını altın sarısı yap ve tıklandığında hafifçe zıplasın..."></textarea>
        <div class="btn-row">
          <span id="selected-file-label" style="font-size: 0.82rem; color: #94a3b8;">Seçili Dosya: <strong>js/app.js</strong></span>
          <div style="display: flex; gap: 10px;">
            <button id="btn-generate" class="btn-primary">⚡ Ollama ile Kodla</button>
            <button id="btn-save" class="btn-save">💾 Dosyaya Kaydet & Uygula</button>
          </div>
        </div>
      </div>

      <div style="font-weight: 800; font-size: 0.9rem; color: var(--purple);">📄 Ollama Yanıtı & Kod Çıktısı:</div>
      <div id="output-area" class="output-card">Burada Ollama'nın tamamen yerel olarak ürettiği kod veya cevap görüntülenecek...</div>
    </div>
  </div>

  <script>
    const files = ${JSON.stringify(editableFiles)};
    let currentFile = files[0];
    let lastGeneratedCode = '';

    const fileListEl = document.getElementById('file-list');
    files.forEach(f => {
      const btn = document.createElement('button');
      btn.className = 'file-btn' + (f === currentFile ? ' active' : '');
      btn.innerText = '📄 ' + f;
      btn.onclick = () => {
        document.querySelectorAll('.file-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFile = f;
        document.getElementById('selected-file-label').innerHTML = 'Seçili Dosya: <strong>' + f + '</strong>';
      };
      fileListEl.appendChild(btn);
    });

    const promptEl = document.getElementById('prompt-input');
    const btnGen = document.getElementById('btn-generate');
    const btnSave = document.getElementById('btn-save');
    const outEl = document.getElementById('output-area');
    const modelSelect = document.getElementById('model-select');

    btnGen.onclick = async () => {
      const prompt = promptEl.value.trim();
      if (!prompt) return alert('Lütfen yapmak istediğin değişikliği yaz!');

      btnGen.disabled = true;
      btnGen.innerText = '⏳ Ollama Kodluyor...';
      outEl.innerText = 'Yerel yapay zeka dosyayı inceliyor ve kodu üretiyor...\\n';
      btnSave.style.display = 'none';

      try {
        const res = await fetch('/api/code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file: currentFile, prompt, model: modelSelect.value })
        });
        const data = await res.json();
        if (data.error) {
          outEl.innerText = '❌ Hata: ' + data.error;
        } else {
          lastGeneratedCode = data.response;
          outEl.innerText = data.response;
          btnSave.style.display = 'inline-block';
        }
      } catch (err) {
        outEl.innerText = '❌ Bağlantı hatası: ' + err.message;
      } finally {
        btnGen.disabled = false;
        btnGen.innerText = '⚡ Ollama ile Kodla';
      }
    };

    btnSave.onclick = async () => {
      if (!lastGeneratedCode) return;
      btnSave.disabled = true;
      try {
        const res = await fetch('/api/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file: currentFile, code: lastGeneratedCode })
        });
        const data = await res.json();
        if (data.success) {
          alert('✅ ' + currentFile + ' başarıyla güncellendi!');
          btnSave.style.display = 'none';
        } else {
          alert('❌ Kaydedilemedi: ' + data.error);
        }
      } catch (err) {
        alert('❌ Hata: ' + err.message);
      } finally {
        btnSave.disabled = false;
      }
    };
  </script>
</body>
</html>`;

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(htmlContent);
    return;
  }

  if (req.method === 'POST' && req.url === '/api/code') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { file, prompt, model } = JSON.parse(body);
        const filePath = path.join(__dirname, file);
        let fileContent = '';
        if (fs.existsSync(filePath)) {
          fileContent = fs.readFileSync(filePath, 'utf8');
        }

        const systemPrompt = `Sen AdAstra: Genesis Realm oyununun uzman kodlayıcısısın.
Kullanıcı "${file}" dosyasında bir geliştirme veya düzenleme istiyor.
Mevcut dosya içeriğine bakarak tam çalışan çözümü üret.`;

        const userMsg = `Dosya: ${file}\n\nMevcut Dosya İçeriği:\n\`\`\`\n${fileContent.slice(0, 12000)}\n\`\`\`\n\nİstek:\n${prompt}`;

        const ollamaRes = await fetch(`${OLLAMA_HOST}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: model || 'qwen2.5-coder:3b',
            prompt: `${systemPrompt}\n\n${userMsg}`,
            stream: false
          })
        });

        if (!ollamaRes.ok) {
          const errText = await ollamaRes.text();
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `Ollama hatası (${ollamaRes.status}): ${errText}` }));
          return;
        }

        const ollamaData = await ollamaRes.json();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ response: ollamaData.response }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/api/save') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { file, code } = JSON.parse(body);
        const filePath = path.join(__dirname, file);
        fs.writeFileSync(filePath, code, 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`🚀 AdAstra Local Ollama Coder hazır: http://localhost:${PORT}`);
});
