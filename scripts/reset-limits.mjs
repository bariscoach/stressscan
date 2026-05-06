// One-shot script: deletes all ratelimit:ip:* keys from Upstash Redis
// Usage: node scripts/reset-limits.mjs
import { Redis } from '@upstash/redis';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Parse .env.local manually
const envPath = resolve(process.cwd(), '.env.local');
const env = {};
readFileSync(envPath, 'utf8').split('\n').forEach((line) => {
  const eq = line.indexOf('=');
  if (eq > 0) {
    const val = line.slice(eq + 1).trim();
    env[line.slice(0, eq).trim()] = val.replace(/^["']|["']$/g, '');
  }
});

const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
});

let cursor = 0;
let deleted = 0;

do {
  const [next, keys] = await redis.scan(cursor, { match: 'ratelimit:ip:*', count: 200 });
  cursor = Number(next);
  if (keys.length) {
    await redis.del(...keys);
    deleted += keys.length;
    console.log(`Deleted: ${keys.join(', ')}`);
  }
} while (cursor !== 0);

console.log(`\nDone — ${deleted} rate-limit key(s) reset. All users start fresh at 20 scans.`);
