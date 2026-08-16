const express = require('express');
const fetch = require('node-fetch');
const FormData = require('form-data');
const { execFile } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const execFileAsync = promisify(execFile);
const router = express.Router();

async function downloadToFile(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download source audio: ${res.status}`);
  const buffer = await res.buffer();
  fs.writeFileSync(destPath, buffer);
}

// Requires ffmpeg installed on the server (apt-get install ffmpeg / included
// in most Docker base images with it added). Slices [start, end] out of the
// full episode so only that window gets sent to Whisper — matches the
// save-note feature's 45-second window.
router.post('/transcribe', express.json(), async (req, res) => {
  const { audioUrl, start, end } = req.body;
  if (!audioUrl || start == null || end == null) {
    return res.status(400).json({ error: 'Missing audioUrl, start, or end' });
  }

  const tmpId = crypto.randomUUID();
  const sourcePath = path.join(os.tmpdir(), `${tmpId}-source`);
  const slicePath = path.join(os.tmpdir(), `${tmpId}-slice.mp3`);

  try {
    await downloadToFile(audioUrl, sourcePath);

    const duration = Math.max(0.5, end - start);
    await execFileAsync('ffmpeg', [
      '-y', '-ss', String(start), '-i', sourcePath, '-t', String(duration),
      '-acodec', 'libmp3lame', slicePath,
    ]);

    const form = new FormData();
    form.append('file', fs.createReadStream(slicePath));
    form.append('model', 'whisper-1');

    const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, ...form.getHeaders() },
      body: form,
    });

    if (!whisperRes.ok) {
      const errBody = await whisperRes.text();
      return res.status(502).json({ error: 'Whisper API error', detail: errBody });
    }

    const result = await whisperRes.json();
    res.json({ transcript: result.text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    [sourcePath, slicePath].forEach((p) => fs.existsSync(p) && fs.unlinkSync(p));
  }
});

module.exports = router;
