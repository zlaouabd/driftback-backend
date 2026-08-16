const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();

// Turns article/podcast-transcript text into a short, audio-friendly summary.
// Haiku is the right model here — cheap and fast for a high-volume task like
// this, not Sonnet/Opus (see the cost modeling this app's pricing is based on).
router.post('/summarize', express.json({ limit: '2mb' }), async (req, res) => {
  const { text, sourceType } = req.body; // sourceType: 'article' | 'podcast_transcript'
  if (!text) return res.status(400).json({ error: 'Missing text' });

  try {
    const prompt = sourceType === 'podcast_transcript'
      ? `Summarize this podcast transcript in 3-4 short sentences written to be read aloud by a TTS voice — no bullet points, no headers, plain spoken sentences:\n\n${text.slice(0, 15000)}`
      : `Summarize this article in 3-4 short sentences written to be read aloud by a TTS voice — no bullet points, no headers, plain spoken sentences:\n\n${text.slice(0, 15000)}`;

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!anthropicRes.ok) {
      const errBody = await anthropicRes.text();
      return res.status(502).json({ error: 'Claude API error', detail: errBody });
    }

    const data = await anthropicRes.json();
    const summary = data.content?.map((b) => b.text || '').join('') ?? '';
    res.json({ summary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
