const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();

// Converts a summary to speech and streams the audio bytes back.
// Swap ELEVENLABS_VOICE_ID / model_id for cheaper alternatives (Amazon Polly,
// Gemini Flash TTS) if margin matters more than voice quality at scale —
// see the cost breakdown this app's pricing tiers are based on.
router.post('/tts', express.json({ limit: '200kb' }), async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Missing text' });

  const voiceId = process.env.ELEVENLABS_VOICE_ID;

  try {
    const ttsRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_flash_v2_5', // cheaper tier — fine for short summaries
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });

    if (!ttsRes.ok) {
      const errBody = await ttsRes.text();
      return res.status(502).json({ error: 'ElevenLabs API error', detail: errBody });
    }

    res.set('Content-Type', 'audio/mpeg');
    ttsRes.body.pipe(res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
