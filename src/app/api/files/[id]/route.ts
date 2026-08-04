/**
 * Authenticated file download / preview route.
 *
 * GET /api/files/[id]
 *
 * Verifies the requesting user is a member of the property that owns the
 * attachment. Streams the file with proper Content-Type.
 *
 * To prevent abuse:
 *   - the attachment must exist
 *   - the user must be authenticated
 *   - the user must be a member of the attachment's property
 *   - the file is served with `private, no-store` cache headers
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireMember, AuthorizationError } from '@/lib/authorization';
import { prisma } from '@/lib/db';
import { readReceipt } from '@/lib/services/storage';
import { rateLimit } from '@/lib/rate-limit';
import { auth } from '@/lib/auth';
import { existsSync } from 'node:fs';
import { safeContentDisposition } from '@/lib/content-disposition';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const rl = rateLimit(`download:${session?.user?.id ?? req.headers.get('x-forwarded-for') ?? 'anon'}`, {
    limit: 120,
    windowMs: 60_000,
  });
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const att = await prisma.attachment.findUnique({
    where: { id },
    select: { propertyId: true, storageKey: true, mimeType: true, fileName: true, sizeBytes: true },
  });
  if (!att) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  try {
    await requireMember(att.propertyId, 'OWNER');
  } catch (e) {
    if (e instanceof AuthorizationError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    // Re-check file existence to avoid crashing on missing files.
    const { storageConfig } = await import('@/lib/env');
    const path = await import('node:path');
    const fullPath = path.join(storageConfig.root, att.storageKey);
    if (!existsSync(fullPath)) {
      return NextResponse.json({ error: 'File missing on storage' }, { status: 410 });
    }
    const data = await readReceipt(att.storageKey);
    return new NextResponse(new Uint8Array(data), {
      status: 200,
      headers: {
        'Content-Type': att.mimeType || 'application/octet-stream',
        'Content-Length': String(att.sizeBytes ?? data.byteLength),
        'Content-Disposition': safeContentDisposition(att.fileName),
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (e) {
    return NextResponse.json({ error: 'Could not read file' }, { status: 500 });
  }
}