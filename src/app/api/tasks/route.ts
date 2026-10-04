import { NextRequest, NextResponse } from 'next/server';
import {
  createBackgroundTask,
  getAllTasks,
  getTask,
  cancelTask,
} from '@/lib/tasks/task-manager';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/tasks?id=xxx or GET /api/tasks (list all)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (id) {
    const task = getTask(id);
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, task });
  }

  const tasks = getAllTasks();
  return NextResponse.json({ success: true, tasks });
}

// POST /api/tasks -> create a background download task
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, title, formatId, formatLabel, isAudioOnly, directUrl, expectedFilesize } = body;

    if (!url) {
      return NextResponse.json({ error: 'Missing target URL' }, { status: 400 });
    }

    const task = createBackgroundTask({
      url,
      title: title || 'Media Download',
      formatId: formatId || 'best',
      formatLabel: formatLabel || 'Best Quality',
      isAudioOnly: !!isAudioOnly,
      directUrl,
      expectedFilesize,
    });

    return NextResponse.json({ success: true, task });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create background download task';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/tasks?id=xxx -> cancel task
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Task ID required' }, { status: 400 });
  }

  const cancelled = cancelTask(id);
  return NextResponse.json({ success: cancelled });
}
