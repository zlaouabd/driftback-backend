const express = require('express');
const db = require('../db');
const router = express.Router();

router.post('/notes', express.json(), (req, res) => {
  const { userId, episodeId, episodeTitle, start, end, transcript, caption } = req.body;
  if (!userId || !episodeId || start == null || end == null) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const stmt = db.prepare(
    `INSERT INTO notes (user_id, episode_id, episode_title, start_seconds, end_seconds, transcript, caption)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const result = stmt.run(userId, episodeId, episodeTitle ?? null, start, end, transcript ?? null, caption ?? null);
  res.json({ id: result.lastInsertRowid });
});

router.get('/notes', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });
  const rows = db
    .prepare(`SELECT * FROM notes WHERE user_id = ? ORDER BY created_at DESC`)
    .all(userId);
  res.json(rows);
});

// Lets the user add/edit a caption after the note's already been saved —
// matches Airr's "add a caption" step without blocking the initial save.
router.patch('/notes/:id', express.json(), (req, res) => {
  const { caption } = req.body;
  const result = db.prepare(`UPDATE notes SET caption = ? WHERE id = ?`).run(caption ?? null, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Note not found' });
  res.json({ updated: true });
});

module.exports = router;
