// GET /api/browser/sessions/[id]/logs - Get paginated action logs

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { safeJsonParse } from '@/lib/browser/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const actionType = searchParams.get('action');

    // Verify session exists
    const session = await db.browserSession.findUnique({ where: { id } });
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Build query filter
    const where = {
      sessionId: id,
      ...(actionType ? { action: actionType } : {}),
    };

    // Get total count
    const total = await db.actionLog.count({ where });

    // Get logs
    const logs = await db.actionLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return NextResponse.json({
      logs: logs.map((log) => ({
        id: log.id,
        sessionId: log.sessionId,
        action: log.action,
        target: log.target,
        value: log.value,
        result: log.result,
        duration: log.duration,
        createdAt: log.createdAt.toISOString(),
        metadata: safeJsonParse<Record<string, unknown>>(log.metadata, {}),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get action logs';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
