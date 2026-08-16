const express = require('express');
const fetch = require('node-fetch');
const Parser = require('rss-parser');
const router = express.Router();
const parser = new Parser();

// Free, no-key, CORS-friendly — safe to call from anywhere, but the RSS
// fetch below has to happen server-side since most podcast hosts don't set
// CORS headers, which is exactly what blocked the browser prototype's demo.
router.get('/feeds/search', async (req, res) => {
  const { term } = req.query;
  if (!term) return res.status(400).json({ error: 'Missing term' });
  try {
    const searchRes = await fetch(
      `https://itunes.apple.com/search?media=podcast&limit=5&term=${encodeURIComponent(term)}`
    );
    const data = await searchRes.json();
    res.json(data.results ?? []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/feeds/latest-episode', async (req, res) => {
  const { feedUrl } = req.query;
  if (!feedUrl) return res.status(400).json({ error: 'Missing feedUrl' });
  try {
    const feed = await parser.parseURL(feedUrl);
    const latest = feed.items?.[0];
    if (!latest) return res.json(null);
    res.json({
      title: latest.title,
      audioUrl: latest.enclosure?.url ?? null,
      pubDate: latest.pubDate,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
