# Deploying Voxora

Frontend on Vercel, API on Render, audio on Cloudflare R2, database on Neon.
All four have free tiers that cover this app.

Deploy the API first — the frontend needs its URL at build time.

---

## 1. Cloudflare R2 (audio storage)

Skippable, but without it audio is written to Render's disk, which is wiped on
every restart, redeploy and idle-sleep. History playback then 404s on anything
older than the current instance.

1. https://dash.cloudflare.com → **R2** → **Create bucket**, name it `voxora-audio`
2. Bucket → **Settings** → **Public access** → enable the **r2.dev subdomain**,
   copy the public URL (`https://pub-xxxx.r2.dev`)
3. R2 home → **Manage API Tokens** → **Create API Token**
   - Permission: **Object Read & Write**, scoped to that bucket
   - Copy the Access Key ID and Secret Access Key (the secret is shown once)
4. Your Account ID is on the R2 overview page

## 2. Render (API)

**New → Web Service**, connect the repo, then:

| Setting | Value |
|---|---|
| Root Directory | `server` |
| Build Command | `npm ci` |
| Start Command | `npm start` |
| Health Check Path | `/api/health` |

Environment variables:

```
NODE_ENV               production
NODE_VERSION           20
TTS_PROVIDER           edge
DATABASE_URL           <Neon POOLED connection string>
JWT_SECRET             <openssl rand -base64 48>
FRONTEND_URL           https://<your-app>.vercel.app
PUBLIC_URL             https://<your-api>.onrender.com
S3_BUCKET              voxora-audio
R2_ACCOUNT_ID          <cloudflare account id>
S3_ACCESS_KEY_ID       <r2 access key id>
S3_SECRET_ACCESS_KEY   <r2 secret access key>
S3_PUBLIC_URL          https://pub-xxxx.r2.dev
```

`FRONTEND_URL` is a chicken-and-egg: deploy, get the Vercel URL in step 3, then
come back and set it. Set `ALLOW_VERCEL_PREVIEWS=true` to also allow preview
deployments.

Use Neon's **pooled** connection string — the host containing `-pooler`. The
direct one exhausts connections.

Confirm with `curl https://<your-api>.onrender.com/api/health`:

```json
{ "status": "healthy", "database": "connected",
  "storage": { "driver": "s3", "ephemeral": false } }
```

`"driver": "local"` or `"ephemeral": true` means the R2 variables are wrong —
audio will not survive a restart.

## 3. Vercel (frontend)

**Add New → Project**, import the repo:

| Setting | Value |
|---|---|
| Root Directory | `client` |
| Framework Preset | Vite |

One environment variable:

```
VITE_API_URL   https://<your-api>.onrender.com/api
```

**Vite inlines this at build time, not runtime.** If you add it after a build
you must redeploy. Include the `/api` suffix, no trailing slash.

It is optional in practice: production builds fall back to the deployed API URL
in `src/api.js`, so a forgotten variable cannot ship a bundle that calls
localhost. Set it explicitly to point a build at a different API.

Then set `FRONTEND_URL` on Render to the Vercel URL and let it redeploy.

## 4. Migrations

Run once against the production database, from a machine with `DATABASE_URL` set:

```bash
cd server
node migrations/001_add_translation_columns.js
node migrations/002_translation_cache.js
npm run seed:voices
```

All are idempotent, so re-running is safe.

---

## Known limits

**Render free tier sleeps after 15 minutes idle.** The first request then takes
around 50 seconds. The client timeout is 60s, so it survives, but barely — a
cold start plus translation plus synthesis can feel broken. Paid tier or an
uptime pinger fixes it.

**Edge TTS and the translation endpoint are undocumented.** Both are free and
keyless, both work from datacenter IPs today, and neither carries a guarantee.
Translations are cached in Postgres so repeat text costs nothing. To move to a
contractual API, set `TTS_PROVIDER=elevenlabs` with a key and reseed voices;
translation is isolated in `services/translationService.js`.

**Rate limiting is 100 requests per 15 minutes per IP**, which counts every API
call, not just generations. Raise it in `server.js` if that bites.

**CORS allows one origin list.** A custom domain has to be added to
`FRONTEND_URL` as a comma-separated entry.

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| Frontend calls `localhost:5000` | `VITE_API_URL` set after the build. Redeploy. |
| CORS errors in console | `FRONTEND_URL` missing, wrong, or has a trailing slash |
| Refreshing `/history` 404s | SPA rewrites missing — `client/vercel.json` handles this |
| Audio 404s after a while | `"ephemeral": true` in `/api/health`; R2 vars not set |
| `npm ci` fails on Render | Lockfile not committed |
| Routes 404 that exist | Stale process on the port: `lsof -ti:5000 \| xargs kill -9` |
| Login works, then 401s | `JWT_SECRET` changed between deploys, invalidating tokens |
