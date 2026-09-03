import fs from 'fs';

async function askOllama() {
  const prompt = `AdAstra Realm ortaçağ Web3 RPG oyunudur.
Kullanıcı geri bildirimi: "açılır pencereler menüler ve binalara tıklayınca açılan sekmeler çok karmaşık bunları çok çok daha iyileştirip kullanıcı dostu hale getirmek lazım. çok daha sade ve basit arayüzler tasarlamak lazım."

Bunu çözmek için UI/UX sadeleştirme stratejisini maddeler halinde çıkar:
1. Görsel hiyerarşi & sadeleştirme (Aşırı parlak/karmaşık bordür ve kartların temizlenmesi).
2. Sekmeler (Tabs) ve navigasyonun basitleştirilmesi.
3. Kartların ve butonların daha az yorucu, minimal ve net hale getirilmesi.
Yanıtı Türkçe ver.`;

  console.log('🤖 Ollama (qwen2.5-coder:3b) düşünülüyor...');
  const res = await fetch('http://127.0.0.1:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'qwen2.5-coder:3b',
      prompt: prompt,
      stream: false
    })
  });
  const data = await res.json();
  console.log('--- OLLAMA DANIŞMA RAPORU ---');
  console.log(data.response);
  fs.writeFileSync('ollama_ui_ux_report.txt', data.response, 'utf8');
}

askOllama();
