const express = require('express');
const fetch = require('node-fetch');
const FormData = require('form-data');
const { execFile } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const db = require('../db');

const execFileAsync = promisify(execFile);
const router = express.Router();
const CLIPS_DIR = path.join(__dirname, '..', 'clips');

async function downloadToFile(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download source audio: ${res.status}`);
  const buffer = await res.buffer();
  fs.writeFileSync(destPath, buffer);
}

// One call does everything Airr's "tap to save" does: slices [start, end]
// out of the source episode, keeps that clip permanently (so it's still
// playable even if the original episode disappears), transcribes it via
// Whisper, and writes the note row with the real transcript + a URL to the
// saved clip. Requires ffmpeg on the server.
router.post('/notes/capture', express.json(), async (req, res) => {
  const { userId, episodeId, episodeTitle, audioUrl, start, end, caption } = req.body;
  if (!userId || !episodeId || !audioUrl || start == null || end == null) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const tmpId = crypto.randomUUID();
  const sourcePath = path.join(os.tmpdir(), `${tmpId}-source`);
  const clipFilename = `${tmpId}.mp3`;
  const clipPath = path.join(CLIPS_DIR, clipFilename);

  try {
    await downloadToFile(audioUrl, sourcePath);

    const duration = Math.max(0.5, end - start);
    await execFileAsync('ffmpeg', [
      '-y', '-ss', String(start), '-i', sourcePath, '-t', String(duration),
      '-acodec', 'libmp3lame', clipPath,
    ]);

    const form = new FormData();
    form.append('file', fs.createReadStream(clipPath));
    form.append('model', 'whisper-1');

    const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, ...form.getHeaders() },
      body: form,
    });

    let transcript = null;
    if (whisperRes.ok) {
      const result = await whisperRes.json();
      transcript = result.text;
    }
    // Whisper failure isn't fatal — still save the clip + note, just without
    // a transcript, rather than losing the user's saved moment entirely.

    const clipUrl = `/clips/${clipFilename}`;
    const stmt = db.prepare(
      `INSERT INTO notes (user_id, episode_id, episode_title, start_seconds, end_seconds, transcript, caption, clip_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const result = stmt.run(userId, episodeId, episodeTitle ?? null, start, end, transcript, caption ?? null, clipUrl);

    res.json({ id: result.lastInsertRowid, transcript, clipUrl });
  } catch (err) {
    if (fs.existsSync(clipPath)) fs.unlinkSync(clipPath); // don't keep a broken clip file
    res.status(500).json({ error: err.message });
  } finally {
    if (fs.existsSync(sourcePath)) fs.unlinkSync(sourcePath);
  }
});

module.exports = router;
