import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  return new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN });
}

export async function POST(request: NextRequest) {
  let body: { email?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ valid: false }, { status: 400 }); }

  const email = body.email?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ valid: false });
  }

  const redis = getRedis();
  if (!redis) {
    // No Redis configured — allow access (dev mode)
    return NextResponse.json({ valid: true });
  }

  const score = await redis.zscore('stressscan:emails', email);
  return NextResponse.json({ valid: score !== null });
}
