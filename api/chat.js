export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'API Key Gemini belum di-set di Vercel!' });
  }

  try {
    const { messages } = req.body;
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

    // FIX 1: Ganti endpoint ke gemini-flash-latest
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent`;

    let requestBody = { contents: contents };
    if (systemInstruction) {
        requestBody.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      // FIX 2: Ganti header jadi X-goog-api-key
      headers: { 
        'Content-Type': 'application/json',
        'X-goog-api-key': GEMINI_API_KEY
      },
      body: JSON.stringify(requestBody)
    });
    
    const data = await response.json();
    
    if (data.error) {
        throw new Error(data.error.message || "Google API Error");
    }

    let aiText = data.candidates[0].content.parts[0].text;
    
    res.status(200).json({
        choices: [{ message: { content: aiText } }]
    });

  } catch (error) {
    res.status(500).json({ error: error.message || "Terjadi kesalahan di server" });
  }
}
