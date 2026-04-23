// POST /api/browser/sessions/[id]/vision - Get full vision data for AI

import { NextRequest, NextResponse } from 'next/server';
import browserEngine from '@/lib/browser/engine';
import visionSystem from '@/lib/browser/vision';
import type { ScreenshotOptions } from '@/lib/browser/types';

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

    const body = await request.json().catch(() => ({}));
    const options: ScreenshotOptions = {
      fullPage: body.fullPage,
      element: body.element,
      quality: body.quality,
      type: body.type,
    };

    const visionResult = await visionSystem.captureVision(session.page, options);

    return NextResponse.json(visionResult);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to capture vision';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
