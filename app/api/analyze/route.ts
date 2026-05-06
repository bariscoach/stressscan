import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { Redis } from '@upstash/redis';

const RATE_LIMIT = 20;

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT =
  'You are a physical stress and tension analyzer. Analyze body language, posture, and facial tension only. Never identify who the person is.';

const USER_PROMPT = `Analyze this person for physical stress and tension signals using visual biomechanical cues. Return ONLY valid JSON, no markdown, no explanation:
{
  "stress_score": number (1-10),
  "mood_tag": "Calm" | "Focused" | "Tense" | "Overloaded",
  "nudge": "one short actionable grounding tip max 12 words",
  "signals": [
    {
      "type": one of the signal types below,
      "severity": number (0-10),
      "detected": true,
      "label": "2-5 word clinical description",
      "region": { "x": number, "y": number, "w": number, "h": number }
    }
  ]
}

Signal types to detect (only include detected ones):
- "spine": spinal axial alignment deviation, postural kyphosis or forward lean
- "shoulder": deltoid/supraspinatus tension, bilateral shoulder elevation asymmetry
- "neck": sternocleidomastoid hypertonicity, cervical lateral flexion or forward head posture
- "brow": corrugator supercilii contraction, procerus activation (glabellar furrow)
- "jaw": masseter hypertrophy tension, mandibular clenching or TMJ strain
- "hands": flexor digitorum tension, metacarpal guarding or fist formation
- "frontalis": frontalis muscle activation, horizontal forehead rhytids under emotional load
- "periorbital": orbicularis oculi strain, palpebral fissure narrowing or periorbital tightening
- "nasolabial": orbicularis oris compression, nasolabial fold deepening, lip thinning
- "temporalis": temporalis hypertonicity, temporal region tension indicating bruxism or clenching
- "trapezius": upper trapezius hypertonia, shoulder girdle cranial displacement pattern
- "respiratory": clavicular breathing pattern, thoracic elevation suggesting sympathetic arousal

Region values are 0-1 fractions of image dimensions. Only include signals where detected is true.`;

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1';

  const redis = getRedis();
  let remaining = RATE_LIMIT - 1;

  if (redis) {
    const key = `ratelimit:ip:${ip}`;
    const count = (await redis.get<number>(key)) ?? 0;

    if (count >= RATE_LIMIT) {
      return NextResponse.json({ error: 'limit_reached', remaining: 0 }, { status: 429 });
    }

    await redis.incr(key);
    remaining = RATE_LIMIT - (count + 1);
  }

  let body: { image?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  if (!body.image) {
    return NextResponse.json({ error: 'missing_image' }, { status: 400 });
  }

  let rawText = '';
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: body.image,
              },
            },
            {
              type: 'text',
              text: USER_PROMPT,
            },
          ],
        },
      ],
    });

    const block = response.content[0];
    rawText = block.type === 'text' ? block.text : '';
  } catch (err) {
    console.error('Anthropic API error:', err);
    return NextResponse.json({ error: 'api_error' }, { status: 500 });
  }

  // Strip markdown fences
  const cleaned = rawText
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Retry: try to extract JSON object from response
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        parsed = JSON.parse(match[0]);
      } catch {
        // Skip frame silently
        return NextResponse.json({ error: 'parse_error' }, { status: 500 });
      }
    } else {
      return NextResponse.json({ error: 'parse_error' }, { status: 500 });
    }
  }

  return NextResponse.json({ ...(parsed as object), remaining });
}
