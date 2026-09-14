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

You need `DATABASE_URL` (Neon connection string) and `JWT_SECRET` at minimum.

Then start both servers:

```bash
npm run dev
```

- Frontend: http://localhost:5173
- API:      http://localhost:5000/api
- Health:   http://localhost:5000/api/health

`npm run dev:server` and `npm run dev:client` run them separately.

## TTS providers

Set `TTS_PROVIDER` in `server/.env`:

| Value        | Needs                 | Notes |
|--------------|-----------------------|-------|
| `mock`       | nothing               | Generates a real playable WAV locally. Use this to test the app without a key or billing. |
| `google`     | `GOOGLE_TTS_API_KEY`  | Google Cloud Text-to-Speech. Matches the `voices` table, which is seeded with Google voice IDs. |
| `elevenlabs` | `ELEVENLABS_API_KEY`  | The seeded voice IDs are Google-format, so the `voices` table needs reseeding first. |

To get a Google key: enable [Cloud Text-to-Speech](https://console.cloud.google.com/apis/library/texttospeech.googleapis.com),
then create an API key under **APIs & Services → Credentials**. Free tier covers
1M standard characters per month.

`GET /api/health` reports which provider is active and whether it has a key.

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
