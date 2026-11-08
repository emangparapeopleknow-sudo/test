export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  
  // 1. Cek API Key
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'API Key Gemini belum di-set di Vercel! Cek Environment Variables.' });
  }

  try {
    const { messages } = req.body;
    
    // Format pesan ke Gemini
    let contents = [];
    let systemInstruction = "";
    
    messages.forEach(msg => {
      if (msg.role === 'system') {
        systemInstruction = msg.content;
      } else {
        let parts = [];
        if (Array.isArray(msg.content)) {
            msg.content.forEach(c => {
                if (c.type === 'text') parts.push({ text: c.text });
                else if (c.type === 'image_url') {
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

    // 2. Nembak ke Gemini API (Pake format ?key=)
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

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
    
    // 3. Lempar error asli dari Google kalau gagal
    if (data.error) {
        throw new Error(data.error.message || "Google API Error");
    }

    let aiText = data.candidates[0].content.parts[0].text;
    
    res.status(200).json({
        choices: [{ message: { content: aiText } }]
    });

  } catch (error) {
    // 4. Kirim pesan error ke frontend
    res.status(500).json({ error: error.message || "Terjadi kesalahan di server" });
  }
}
