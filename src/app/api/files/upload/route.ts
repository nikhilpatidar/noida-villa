/**
 * Receipt upload route.
 *
 * Accepts a multipart/form-data POST with a `file` field and `propertyId`.
 * Verifies:
 *   - the user is authenticated
 *   - the user is a member of the property
 *   - the file passes MIME / size / filename validation
 * Writes the file under STORAGE_ROOT (path-traversal protected) and creates
 * an Attachment row.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireMember, AuthorizationError } from '@/lib/authorization';
import { saveReceipt } from '@/lib/services/storage';
import { prisma } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';
import { auth } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await auth();
  const rl = rateLimit(`upload:${session?.user?.id ?? req.headers.get('x-forwarded-for') ?? 'anon'}`, {
    limit: 30,
    windowMs: 60_000,
  });
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  let propertyId: string | null = null;
  let file: File | null = null;
  try {
    const form = await req.formData();
    propertyId = String(form.get('propertyId') ?? '');
    const rawFile = form.get('file');
    if (rawFile && typeof rawFile !== 'string' && 'arrayBuffer' in rawFile) {
      file = rawFile as File;
    }
    if (!file) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }
  if (!propertyId) {
    return NextResponse.json({ error: 'Missing propertyId' }, { status: 400 });
  }

  // The buffer may be a Blob in edge runtimes; we set runtime=nodejs so File is fine.
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const ctx = await requireMember(propertyId, 'OWNER');
    const saved = await saveReceipt({
      propertyId,
      fileName: file.name || 'receipt',
      mimeType: file.type || 'application/octet-stream',
      buffer,
    });
    const att = await prisma.attachment.create({
      data: {
        propertyId,
        kind: 'RECEIPT',
        fileName: file.name || 'receipt',
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: saved.sizeBytes,
        storageKey: saved.storageKey,
        uploadedById: ctx.userId,
      },
      select: { id: true, fileName: true, mimeType: true, sizeBytes: true, createdAt: true },
    });
    return NextResponse.json({ attachment: att }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthorizationError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: (e as Error).message || 'Upload failed' }, { status: 400 });
  }
}