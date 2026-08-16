/**
 * Driftback Backend
 * Founder: Zakaria Laouabdia Sellami
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use('/clips', express.static(path.join(__dirname, 'clips')));

app.use('/api', require('./routes/summarize'));
app.use('/api', require('./routes/tts'));
app.use('/api', require('./routes/identify'));
app.use('/api', require('./routes/transcribe'));
app.use('/api', require('./routes/notesCapture'));
app.use('/api', require('./routes/memory'));
app.use('/api', require('./routes/notes'));
app.use('/api', require('./routes/feeds'));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Driftback backend listening on :${PORT}`));
