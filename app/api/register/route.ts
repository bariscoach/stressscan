import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  return new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN });
}

export async function POST(request: NextRequest) {
  let body: { email?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'invalid_body' }, { status: 400 }); }

  const email = body.email?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
  }

  const redis = getRedis();
  if (redis) {
    // Store in a sorted set keyed by timestamp — deduplicates by email
    await redis.zadd('stressscan:emails', { score: Date.now(), member: email });
  }

  return NextResponse.json({ ok: true });
}
