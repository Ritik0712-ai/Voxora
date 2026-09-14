# Voxora

Full-stack text-to-speech app. React + Vite frontend, Express + Neon Postgres backend,
pluggable TTS provider (Google Cloud TTS, ElevenLabs, or an offline mock).

## Running locally

One-time install:

```bash
npm run install:all
```

Configure the backend — copy the example and fill it in:

```bash
cp server/.env.example server/.env
```

You need `DATABASE_URL` (Neon connection string) and `JWT_SECRET`. That is it —
the default TTS provider needs no key.

Then start both servers:

```bash
npm run dev
```

- Frontend: http://localhost:5173
- API:      http://localhost:5000/api
- Health:   http://localhost:5000/api/health

`npm run dev:server` and `npm run dev:client` run them separately.

### If routes 404 that should exist

Almost always a stale server still holding port 5000, so `npm run dev` never
actually bound and the browser is talking to something older:

```bash
lsof -ti:5000 | xargs kill -9
npm run dev
```

On macOS, port 5000 is also claimed by AirPlay Receiver
(System Settings → General → AirDrop & Handoff). Either turn it off or run on
another port with `PORT=5001 npm run dev` and point `client/.env` at it.

A healthy start prints the port, environment and active TTS provider. A port
clash now fails loudly instead of dying quietly behind `concurrently`.

## TTS providers

Set `TTS_PROVIDER` in `server/.env`:

| Value        | Needs                | Notes |
|--------------|----------------------|-------|
| `edge`       | nothing              | **Default.** Microsoft Edge neural voices. No API key, no account, no billing. Neural voices for all 15 seeded languages including Hindi, Gujarati, Marathi, Tamil, Telugu and Bengali. |
| `mock`       | nothing              | Synthesises a tone-based WAV offline. Useful when there is no network at all. |
| `elevenlabs` | `ELEVENLABS_API_KEY` | Better quality, free tier is 10k characters/month. Requires reseeding `voices` with ElevenLabs voice IDs. |
| `google`     | `GOOGLE_TTS_API_KEY` | Google Cloud TTS. Requires a billing account even on the free tier. |

`GET /api/health` reports the active provider and whether it has what it needs.

### A caveat on `edge`

The Edge provider talks to the same endpoint that Microsoft Edge's Read Aloud
feature uses. It is not a documented public API, so Microsoft could change it
without notice. That is a fine trade for a portfolio or college project, but if
this ever needs a contractual uptime guarantee, switch to `elevenlabs` (free
tier, no card required) or `google` and reseed the voices table.

### Reseeding voices

The `voices` table holds provider-specific voice IDs, so it must match the
active provider:

```bash
cd server && npm run seed:voices
```

This updates rows in place and disables ones it no longer needs, rather than
deleting them, so existing `speech_generations` rows keep resolving a voice name.

## Translation

Text-to-speech only reads text aloud, it never rewrites it. Selecting a Bengali
voice for English text gives you English in a Bengali accent, not Bengali. So
speech generation runs an optional translation step first.

The UI exposes this as a "Translate into <language>" toggle, on by default:

- **On** — the text is translated into the selected language, then spoken. The
  translated text is shown next to the player and can be edited and re-spoken.
- **Off** — the text is read exactly as written, in the selected voice's accent.
  This is what you want when the text is already in the target language.

Text already in the target language is detected and passed through untouched
rather than round-tripped.

Translation uses Google's public translate endpoint. Like the Edge TTS
provider, it needs no key and no billing, and carries the same caveat: it is
undocumented and could change. Two endpoints are tried with backoff, and a
failure surfaces a message telling the user to turn translation off rather than
silently speaking the wrong language.

`POST /tts` takes `translate` (default `true`) and returns `sourceText`,
`spokenText`, `translated` and `detectedLanguage`. Both texts are stored on
`speech_generations`, so History shows what was typed and what was spoken.

## Migrations

```bash
cd server && node migrations/001_add_translation_columns.js
```

Migrations are idempotent (`ADD COLUMN IF NOT EXISTS`), so re-running is safe.

## API

All routes are prefixed `/api`. Authenticated routes need `Authorization: Bearer <token>`.

| Method | Route                   | Auth     | Purpose |
|--------|-------------------------|----------|---------|
| GET    | `/health`               | –        | Status, DB connectivity, TTS provider |
| POST   | `/auth/register`        | –        | `{ name, email, password }` → token |
| POST   | `/auth/login`           | –        | `{ email, password }` → token |
| GET    | `/auth/me`              | required | Current user |
| POST   | `/tts`                  | optional | `{ text, language, voice, speed, pitch }` → audio URL. Saves to history when signed in. |
| GET    | `/voices`               | –        | Voices, filterable by `?language=en-US` |
| GET    | `/voices/languages`     | –        | Enabled languages |
| GET    | `/history`              | required | Paginated past generations |
| DELETE | `/history/:id`          | required | Delete a generation |
| GET    | `/favorites`            | required | Saved generations and voices |
| POST   | `/favorites`            | required | `{ speechGenerationId }` or `{ voiceId }` |
| DELETE | `/favorites/:id`        | required | Remove a favorite |
| GET    | `/preferences`          | required | Default language, voice, speed, pitch |
| PUT    | `/preferences`          | required | Update defaults |

Generating speech works signed out; history and favorites require an account.

## Layout

```
client/          React + Vite + Tailwind
  src/services/  One module per API resource
  src/hooks/     useAuth (auth context)
  src/pages/     TTS, History, Favorites, Settings
server/
  routes/        Express routers
  controllers/   Request/response handling
  services/      Business logic and SQL
  audio/         Generated audio (gitignored)
```

## Database

Neon Postgres. Tables: `users`, `languages`, `voices`, `speech_generations`,
`favorites`, `user_preferences`. `speech_generations` references languages and
voices by UUID foreign key — not by code or name.

## Notes for deployment

- `server/audio/` is local disk. On an ephemeral host (Render, Railway, Vercel)
  generated files disappear on restart. Move to S3/R2/Cloudinary before going live,
  or accept that history playback only works for the current instance's lifetime.
- Set `FRONTEND_URL` to the deployed frontend origin so CORS allows it.
- Set `NODE_ENV=production` so stack traces stop leaking in error responses.
- Use a long random `JWT_SECRET` in production, not the dev value.
