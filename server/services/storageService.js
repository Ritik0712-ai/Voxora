const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { AppError } = require('../utils/errors');

/**
 * Audio persistence.
 *
 * Local disk is fine for development, but hosts like Render and Railway have
 * ephemeral filesystems: the directory is wiped on every restart, redeploy and
 * idle-sleep, so History playback would 404 on anything older than the current
 * instance. When S3-compatible credentials are present (Cloudflare R2, S3,
 * Backblaze), audio goes there instead and survives.
 */

const AUDIO_DIR = path.join(__dirname, '..', 'audio');

const s3Config = () => ({
  bucket: process.env.S3_BUCKET,
  accountId: process.env.R2_ACCOUNT_ID,
  endpoint: process.env.S3_ENDPOINT,
  accessKeyId: process.env.S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  publicUrl: process.env.S3_PUBLIC_URL,
  region: process.env.S3_REGION || 'auto',
});

const isS3Configured = () => {
  const c = s3Config();
  // An endpoint can be derived from a Cloudflare account id, so either works.
  return Boolean(c.bucket && c.accessKeyId && c.secretAccessKey && (c.endpoint || c.accountId));
};

let cachedClient = null;

const getClient = () => {
  if (cachedClient) return cachedClient;

  const c = s3Config();
  const { S3Client } = require('@aws-sdk/client-s3');

  cachedClient = new S3Client({
    region: c.region,
    endpoint: c.endpoint || `https://${c.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: c.accessKeyId,
      secretAccessKey: c.secretAccessKey,
    },
    // R2 rejects the virtual-host style buckets the SDK defaults to.
    forcePathStyle: true,
  });

  return cachedClient;
};

const CONTENT_TYPES = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
};

/**
 * @returns {{ key, url, storage: 'local'|'s3' }}
 *   `url` is absolute for s3 and root-relative for local, because the local
 *   host origin is only known per-request.
 */
const saveAudio = async (buffer, format = 'mp3') => {
  const key = `${crypto.randomUUID()}.${format}`;
  const contentType = CONTENT_TYPES[format] || 'application/octet-stream';

  if (!isS3Configured()) {
    await fs.promises.mkdir(AUDIO_DIR, { recursive: true });
    await fs.promises.writeFile(path.join(AUDIO_DIR, key), buffer);
    return { key, url: `/audio/${key}`, storage: 'local' };
  }

  const c = s3Config();
  const { PutObjectCommand } = require('@aws-sdk/client-s3');

  try {
    await getClient().send(
      new PutObjectCommand({
        Bucket: c.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        // Audio is immutable once written, so let clients cache it hard.
        CacheControl: 'public, max-age=31536000, immutable',
      })
    );
  } catch (err) {
    throw new AppError(`Failed to store audio: ${err.message}`, 502);
  }

  const base = (c.publicUrl || '').replace(/\/$/, '');
  if (!base) {
    throw new AppError(
      'S3_PUBLIC_URL is not set, so stored audio has no reachable URL.',
      500
    );
  }

  return { key, url: `${base}/${key}`, storage: 's3' };
};

const deleteAudio = async (audioUrl) => {
  if (!audioUrl) return;

  const key = audioUrl.split('/').pop().split('?')[0];
  if (!key) return;

  if (!isS3Configured()) {
    await fs.promises.unlink(path.join(AUDIO_DIR, key)).catch(() => {});
    return;
  }

  const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
  await getClient()
    .send(new DeleteObjectCommand({ Bucket: s3Config().bucket, Key: key }))
    .catch(() => {});
};

/**
 * Local URLs are stored root-relative, so they need the request origin to be
 * playable. PUBLIC_URL wins when set, because req.protocol can report http
 * behind a proxy and browsers block mixed content on an https page.
 */
const toAbsoluteUrl = (url, req) => {
  if (!url || /^https?:\/\//i.test(url)) return url;

  const configured = (process.env.PUBLIC_URL || '').replace(/\/$/, '');
  if (configured) return `${configured}${url}`;

  return `${req.protocol}://${req.get('host')}${url}`;
};

const describe = () => ({
  driver: isS3Configured() ? 's3' : 'local',
  bucket: isS3Configured() ? s3Config().bucket : null,
  ephemeral: !isS3Configured(),
});

module.exports = {
  saveAudio,
  deleteAudio,
  toAbsoluteUrl,
  isS3Configured,
  describe,
  AUDIO_DIR,
};
