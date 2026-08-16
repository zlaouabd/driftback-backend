const express = require('express');
const db = require('../db');
const router = express.Router();

// Called by the summarization pipeline whenever a new episode is processed,
// so future recall queries have something to find.
router.post('/memory/event', express.json(), (req, res) => {
  const { userId, episodeId, concept, explanation, tsSeconds } = req.body;
  if (!userId || !episodeId || !concept || tsSeconds == null) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const stmt = db.prepare(
    `INSERT INTO memory_events (user_id, episode_id, concept, explanation, ts_seconds) VALUES (?, ?, ?, ?, ?)`
  );
  const result = stmt.run(userId, episodeId, concept, explanation, tsSeconds);
  res.json({ id: result.lastInsertRowid });
});

// "What was mentioned around this timestamp" — powers both the Travel Mode
// "explain that again" voice command and the Dashboard "last time..." banner.
router.get('/memory/recall', (req, res) => {
  const { userId, ts } = req.query;
  if (!userId || ts == null) return res.status(400).json({ error: 'Missing userId or ts' });

  const row = db
    .prepare(
      `SELECT concept, explanation, ts_seconds, episode_id FROM memory_events
       WHERE user_id = ? ORDER BY ABS(ts_seconds - ?) ASC LIMIT 1`
    )
    .get(userId, Number(ts));

  res.json(row || null);
});

// Most recent thing a user learned, across any episode — the Dashboard banner.
router.get('/memory/latest', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  const row = db
    .prepare(`SELECT * FROM memory_events WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`)
    .get(userId);

  res.json(row || null);
});

module.exports = router;
