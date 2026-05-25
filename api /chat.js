// ═══════════════════════════════════════════════════════
//  api/chat.js  —  Vercel Serverless Backend
//
//  Yeh file Vercel pe automatically /api/chat
//  route ban jaati hai. Koi config nahi chahiye.
//
//  ⚠️  API KEY SETUP (ek baar karni hai):
//  Vercel Dashboard → Project → Settings →
//  Environment Variables → Add New Variable:
//    Name:  GEMINI_API_KEY
//    Value: AIza...tumhari_real_key_yahan
//  → Save → Deployments → Redeploy
//
//  KEY KAHAN SE LEIN:
//  aistudio.google.com → Get API Key → Create API Key
//
//  Model used: gemini-3-flash-preview.
// ═══════════════════════════════════════════════════════

export default async function handler(req, res) {

  // ── CORS headers ──
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Only POST requests allowed' });

  // ── Read API key from Vercel env ──
  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) {
    return res.status(500).json({
      error:  'GEMINI_API_KEY missing',
      detail: 'Vercel Dashboard → Settings → Environment Variables mein add karo',
    });
  }

  // ── Validate body ──
  const { system, history } = req.body || {};
  if (!Array.isArray(history) || history.length === 0) {
    return res.status(400).json({ error: 'history array is required and cannot be empty' });
  }
  if (typeof system !== 'string' || !system.trim()) {
    return res.status(400).json({ error: 'system prompt string is required' });
  }

  // ── Build Gemini request ──
  const MODEL = 'gemini-3-flash-preview';
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const payload = {
    systemInstruction: {
      parts: [{ text: system.trim() }],
    },
    contents: history,
    generationConfig: {
      temperature:     0.75,
      maxOutputTokens: 350,
      topP:            0.9,
      topK:            40,
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
    ],
  };

  // ── Call Gemini ──
  try {
    console.log("API URL:", API_URL);
console.log("API KEY EXISTS:", !!process.env.GEMINI_API_KEY);
    const gRes = await fetch(API_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });

    if (!gRes.ok) {
      const errText = await gRes.text();
      console.error(`Gemini error [${gRes.status}]:`, errText);
      return res.status(502).json({
        error:  `Gemini API returned ${gRes.status}`,
        detail: errText,
      });
    
    const data = await gRes.json();

console.log("Gemini Response:", JSON.stringify(data));

const reply =
  data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
  "AI response nahi mila.";


    if (!reply) {
      console.error('Empty Gemini response:', JSON.stringify(data));
      return res.status(502).json({ error: 'Gemini ne empty response diya' });
    }

    return res.status(200).json({ reply });

  } catch (err) {
    console.error('Internal server error:', err.message);
    return res.status(500).json({
      error:  'Internal server error',
      detail: err.message,
    });
  }
}
