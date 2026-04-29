const fetch = require('node-fetch');
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

console.log("TYPE OF FETCH:", typeof fetch);
console.log("Loaded key:", process.env.GROQ_API_KEY ? "YES" : "NO");
const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(cors());
app.use(express.static(path.join(__dirname)));

async function callGroq(messages, model) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + process.env.GROQ_API_KEY
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.3
    })
  });

  const data = await response.json();
  console.log("Groq raw:", JSON.stringify(data, null, 2));

  if (!data.choices || !data.choices[0]) {
    throw new Error(JSON.stringify(data));
  }

  const clean = data.choices[0].message.content
    .trim()
    .replace(/json|/g, '')
    .trim();

  try {
    return JSON.parse(clean);
  } catch (e) {
    throw new Error("Invalid JSON from AI: " + clean);
  }
}

// ================= TEXT ANALYSIS =================
app.post('/analyze', async (req, res) => {
  try {
    console.log("TEXT BODY:", req.body);

    const { title, description } = req.body;

    const prompt = `You are an Amazon SEO expert. Analyze this product listing.
Title: ${title}
Description: ${description}

Reply ONLY valid JSON:
{"titleScore":7,"descScore":6,"keywordScore":5,"improvedTitle":"example","keywords":["k1","k2","k3","k4","k5"],"improvedDescription":"example.","suggestions":"example."}`;

    const result = await callGroq([
      { role: 'system', content: 'Return raw JSON only.' },
      { role: 'user', content: prompt }
    ], 'llama-3.3-70b-versatile');

    res.json(result);

  } catch (err) {
   console.error("FULL ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================= IMAGE ANALYSIS =================
app.post('/analyze-image', async (req, res) => {
  try {
    console.log("IMAGE BODY RECEIVED");

    const { imageBase64, imageType } = req.body;

    const prompt = `You are an Amazon SEO expert. Look at this Amazon product screenshot.
Extract title and description, analyze and improve.

Reply ONLY valid JSON:
{"titleScore":7,"descScore":6,"keywordScore":5,"improvedTitle":"example","keywords":["k1","k2","k3","k4","k5"],"improvedDescription":"example.","suggestions":"example."}`;

    const result = await callGroq([
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: data:${imageType};base64,${imageBase64}
            }
          },
          {
            type: 'text',
            text: prompt
          }
        ]
      }
    ], 'meta-llama/llama-4-scout-17b-16e-instruct');

    res.json(result);

  } catch (err) {
    console.error("IMAGE ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ================= START SERVER =================
app.listen(3000, () => {
  console.log('✅ Server running at http://localhost:3000');
});