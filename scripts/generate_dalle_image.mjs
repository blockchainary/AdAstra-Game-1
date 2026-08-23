// AdAstra: Genesis Realm - OpenAI Automated Image Generator
import fs from 'fs';
import path from 'path';

const apiKey = process.env.OPENAI_API_KEY || '';

async function generateOpenAIImage(prompt, outputPath, size = '1792x1024') {
  console.log(`🎨 Generating image with OpenAI (Size: ${size})...`);
  console.log(`📝 Prompt: ${prompt.substring(0, 100)}...`);

  // Model list includes: gpt-image-1.5, chatgpt-image-latest, gpt-image-1, gpt-image-2
  const modelToUse = 'gpt-image-1.5';

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: modelToUse,
      prompt: prompt,
      n: 1,
      size: size
    })
  });

  const data = await response.json();

  if (data.error) {
    console.error('❌ OpenAI Error:', data.error);
    process.exit(1);
  }

  const imageUrl = data.data[0].url || (data.data[0].b64_json ? null : null);
  
  if (imageUrl) {
    console.log(`⬇️ Downloading generated image from OpenAI...`);
    const imgRes = await fetch(imageUrl);
    const arrayBuffer = await imgRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, buffer);
    console.log(`✅ Image successfully saved to: ${outputPath}`);
  } else if (data.data[0].b64_json) {
    const buffer = Buffer.from(data.data[0].b64_json, 'base64');
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(outputPath, buffer);
    console.log(`✅ Image successfully saved to: ${outputPath}`);
  } else {
    console.error('Unknown response structure:', data);
  }
}

const promptArg = process.argv[2];
const outputArg = process.argv[3] || './assets/openai_generated.jpg';
const sizeArg = process.argv[4] || '1792x1024';

if (!promptArg) {
  console.error('Please provide a prompt.');
  process.exit(1);
}

generateOpenAIImage(promptArg, outputArg, sizeArg).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
