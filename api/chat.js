export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Ambil API Key dari Environment Variables Vercel
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) return res.status(500).json({ error: 'API Key Gemini belum di-set di Vercel' });

  try {
    // Ambil model dan messages dari body request
    const { model, messages } = req.body;
    
    // Format pesan ke standar Gemini
    let contents = [];
    let systemInstruction = "";
    
    messages.forEach(msg => {
      if (msg.role === 'system') {
        systemInstruction = msg.content;
      } else {
        let parts = [];
        // Kalau formatnya array (ada gambar)
        if (Array.isArray(msg.content)) {
            msg.content.forEach(c => {
                if (c.type === 'text') parts.push({ text: c.text });
                else if (c.type === 'image_url') {
                    // Ubah base64 jadi format yang diminta Gemini
                    let base64Data = c.image_url.url.split(',')[1];
                    let mimeType = c.image_url.url.split(';')[0].split(':')[1];
                    parts.push({ inline_data: { mime_type: mimeType, data: base64Data } });
                }
            });
        } else {
            parts.push({ text: msg.content || msg.text || "" });
        }
        contents.push({ role: msg.role === 'assistant' ? 'model' : 'user', parts: parts });
      }
    });

    // Tentukan model Gemini
    // Kalau ada gambar pake flash, kalau teks doang bisa pake flash-lite (lebih cepet)
    const isImage = JSON.stringify(messages).includes('image_url');
    const geminiModel = isImage ? 'gemini-2.5-flash' : 'gemini-2.5-flash';
    
    // Endpoint API Gemini
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${GEMINI_API_KEY}`;

    let requestBody = { contents: contents };
    if (systemInstruction) {
        requestBody.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
    
    const data = await response.json();
    
    if (data.error) {
        throw new Error(data.error.message);
    }

    // Ubah balasan Gemini ke format yang dipahami chat.html lu
    let aiText = data.candidates[0].content.parts[0].text;
    
    res.status(200).json({
        choices: [{
            message: { content: aiText }
        }]
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}






