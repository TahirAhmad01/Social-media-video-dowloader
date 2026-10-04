import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { getTask } from '@/lib/tasks/task-manager';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
  }

  const task = getTask(id);
  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  if (task.status !== 'ready' || !task.filePath || !fs.existsSync(task.filePath)) {
    return NextResponse.json(
      { error: 'File is not ready for delivery yet', status: task.status },
      { status: 425 }
    );
  }

  const stat = fs.statSync(task.filePath);
  const nodeStream = fs.createReadStream(task.filePath);

  const webStream = new ReadableStream({
    start(controller) {
      nodeStream.on('data', (chunk) => controller.enqueue(chunk));
      nodeStream.on('end', () => controller.close());
      nodeStream.on('error', (err) => controller.error(err));
    },
    cancel() {
      nodeStream.destroy();
    },
  });

  const ext = task.ext || (task.isAudioOnly ? 'mp3' : 'mp4');
  const asciiName = task.filename.replace(/[^\x20-\x7E]/g, '_') || `video.${ext}`;
  const headers = new Headers();
  headers.set(
    'Content-Disposition',
    `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(task.filename)}`
  );
  headers.set('Content-Type', task.isAudioOnly ? 'audio/mpeg' : 'video/mp4');
  headers.set('Content-Length', stat.size.toString());
  headers.set('Cache-Control', 'private, max-age=86400');

  return new NextResponse(webStream, { headers });
}
