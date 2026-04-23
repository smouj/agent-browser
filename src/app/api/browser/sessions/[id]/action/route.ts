// POST /api/browser/sessions/[id]/action - Execute an action on a session

import { NextRequest, NextResponse } from 'next/server';
import { actionExecutor } from '@/lib/browser/actions';
import type { ActionRequest } from '@/lib/browser/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const actionRequest: ActionRequest = {
      action: body.action,
      target: body.target,
      value: body.value,
      options: body.options,
    };

    if (!actionRequest.action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }

    const result = await actionExecutor.execute(id, actionRequest);

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to execute action';
    return NextResponse.json(
      {
        success: false,
        action: '',
        error: message,
        duration: 0,
      },
      { status: 500 }
    );
  }
}
