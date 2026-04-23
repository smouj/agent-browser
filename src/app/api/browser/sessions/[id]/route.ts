// GET /api/browser/sessions/[id] - Get session details
// DELETE /api/browser/sessions/[id] - Close and delete a session

import { NextRequest, NextResponse } from 'next/server';
import { sessionManager } from '@/lib/browser/session';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await sessionManager.getSessionDetail(id);

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json(session);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get session';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = await sessionManager.deleteSession(id);

    if (!deleted) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: `Session ${id} deleted` });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete session';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
