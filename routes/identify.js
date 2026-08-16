const express = require('express');
const multer = require('multer');
const fetch = require('node-fetch');
const FormData = require('form-data');
const router = express.Router();

const upload = multer();

router.post('/identify', upload.single('audio'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Missing audio file' });

  try {
    const form = new FormData();
    form.append('api_token', process.env.AUDD_API_TOKEN);
    form.append('file', req.file.buffer, 'clip.m4a');
    form.append('return', 'apple_music,spotify');

    const auddRes = await fetch('https://api.audd.io/', { method: 'POST', body: form });
    const result = await auddRes.json();

    // Plug in a per-user daily/monthly quota check here before calling AudD,
    // so a single user can't run up the bill — flagged in the cost model
    // this app's pricing tiers assume.
    res.json(result);
  } catch (err) {
    console.error('AudD identify error:', err.message);
    res.status(500).json({ error: 'Identification failed', detail: err.message });
  }
});

module.exports = router;
