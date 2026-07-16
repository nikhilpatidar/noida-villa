/**
 * File storage for receipts.
 *
 * Files are written under STORAGE_ROOT (./storage by default).
 * Database stores the relative `storageKey`.
 * Access is gated through an authenticated route: /api/files/[id].
 */
import { promises as fs } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { storageConfig } from '@/lib/env';

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/heic',
  'application/pdf',
]);

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export interface SavedFile {
  storageKey: string;
  sizeBytes: number;
  hash: string;
}

export async function saveReceipt(input: {
  propertyId: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}): Promise<SavedFile> {
  if (!ALLOWED_MIME.has(input.mimeType)) {
    throw new Error(`Unsupported file type: ${input.mimeType}`);
  }
  if (input.buffer.byteLength > MAX_BYTES) {
    throw new Error(`File exceeds ${MAX_BYTES / 1024 / 1024}MB limit`);
  }
  const hash = createHash('sha256').update(input.buffer).digest('hex');
  const ext = path.extname(input.fileName).toLowerCase() || mimeExt(input.mimeType);
  const safeExt = ext.replace(/[^a-z0-9.]/g, '').slice(0, 8) || '.bin';
  const dir = path.join(storageConfig.root, 'receipts', input.propertyId);
  const fileName = `${Date.now()}-${hash.slice(0, 12)}${safeExt}`;
  const fullPath = path.join(dir, fileName);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(fullPath, input.buffer);
  const rel = path.relative(storageConfig.root, fullPath).split(path.sep).join('/');
  return { storageKey: rel, sizeBytes: input.buffer.byteLength, hash };
}

export async function readReceipt(storageKey: string): Promise<Buffer> {
  // Defensive: prevent path traversal.
  if (storageKey.includes('..')) throw new Error('Invalid storage key');
  const fullPath = path.join(storageConfig.root, storageKey);
  return fs.readFile(fullPath);
}

function mimeExt(mime: string): string {
  switch (mime) {
    case 'image/jpeg': return '.jpg';
    case 'image/png': return '.png';
    case 'image/webp': return '.webp';
    case 'image/avif': return '.avif';
    case 'image/heic': return '.heic';
    case 'application/pdf': return '.pdf';
    default: return '';
  }
}