// GET /api/browser/sessions/[id]/cookies - Get session cookies
// POST /api/browser/sessions/[id]/cookies - Set session cookies

import { NextRequest, NextResponse } from 'next/server';
import browserEngine from '@/lib/browser/engine';
import { normalizeCookies } from '@/lib/browser/utils';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = browserEngine.getSession(id);

    if (!session) {
      return NextResponse.json(
        { error: `Session ${id} not found or not active` },
        { status: 404 }
      );
    }

    const cookies = await session.context.cookies();
    return NextResponse.json({ cookies: normalizeCookies(cookies) });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get cookies';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = browserEngine.getSession(id);

    if (!session) {
      return NextResponse.json(
        { error: `Session ${id} not found or not active` },
        { status: 404 }
      );
    }

    const body = await request.json();
    const cookies = body.cookies;

    if (!Array.isArray(cookies)) {
      return NextResponse.json(
        { error: 'cookies must be an array' },
        { status: 400 }
      );
    }

    const normalized = normalizeCookies(cookies);
    await session.context.addCookies(
      normalized as Parameters<typeof session.context.addCookies>[0]
    );

    // Verify by getting all cookies back
    const allCookies = await session.context.cookies();
    return NextResponse.json({
      success: true,
      cookiesSet: normalized.length,
      totalCookies: allCookies.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to set cookies';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
