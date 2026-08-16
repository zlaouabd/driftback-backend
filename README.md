# Driftback Backend

**Founder:** Zakaria Laouabdia Sellami

Real Express server. Verified working end-to-end in this environment:
health check, memory event/recall (SQLite), notes save/list (SQLite) all
tested with live curl requests, not just syntax-checked.

`/api/feeds/search` and `/api/feeds/latest-episode` call external APIs
(iTunes Search, podcast RSS feeds) — these need normal outbound internet
access to work, which this development sandbox restricts. They'll work
on any normal server/hosting provider.

## Setup

```bash
npm install
cp .env.example .env
# fill in .env with real keys: ANTHROPIC_API_KEY, ELEVENLABS_API_KEY, OPENAI_API_KEY, AUDD_API_TOKEN
npm start
```

`/api/transcribe` requires `ffmpeg` installed on the server:
```bash
apt-get install ffmpeg   # Debian/Ubuntu
brew install ffmpeg      # macOS
```

## Endpoints

| Route | Calls | Purpose |
|---|---|---|
| `POST /api/summarize` | Claude API (Haiku) | Article/transcript → short spoken-style summary |
| `POST /api/tts` | ElevenLabs | Summary text → audio |
| `POST /api/identify` | AudD | Audio fingerprint identification |
| `POST /api/transcribe` | ffmpeg + Whisper | Slices an episode by timestamp, transcribes it — powers save-note |
| `POST /api/memory/event`, `GET /api/memory/recall`, `GET /api/memory/latest` | SQLite | Memory recall feature |
| `POST /api/notes`, `GET /api/notes` | SQLite | Save-note feature |
| `GET /api/feeds/search`, `GET /api/feeds/latest-episode` | iTunes Search, RSS | Podcast lookup, avoids the CORS issue the browser prototype hit |

## Not included

Authentication/user accounts (every route currently trusts a `userId` the
client sends — add real auth, e.g. Firebase Auth or a JWT scheme, before this
touches real users), rate limiting/quota enforcement per user, RSS ingestion
scheduling (a cron job or queue that periodically pulls new episodes from
subscribed feeds and runs them through summarize+tts automatically),
deployment config (this runs locally; needs a real host — Railway, Render,
Fly.io, or similar).
