// POST /api/browser/sessions - Create a new browser session
// GET /api/browser/sessions - List all sessions

import { NextRequest, NextResponse } from 'next/server';
import { sessionManager } from '@/lib/browser/session';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const session = await sessionManager.createSession({
      name: body.name,
      browserType: body.browserType,
      headless: body.headless,
      proxy: body.proxy,
      viewport: body.viewport,
      userAgent: body.userAgent,
      locale: body.locale,
      timezone: body.timezone,
    });

    return NextResponse.json(
      {
        id: session.id,
        name: session.config.name,
        browserType: session.config.browserType,
        status: session.status,
        createdAt: session.createdAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create session';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const sessions = await sessionManager.listSessions();
    return NextResponse.json({ sessions });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list sessions';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
