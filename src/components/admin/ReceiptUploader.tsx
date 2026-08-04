'use client';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import { Paperclip, X } from 'lucide-react';

export interface UploadedAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export function ReceiptUploader({
  propertyId,
  uploaded,
  onChange,
  maxBytes = 10 * 1024 * 1024,
}: {
  propertyId: string;
  uploaded: UploadedAttachment[];
  onChange: (next: UploadedAttachment[]) => void;
  maxBytes?: number;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [, startTransition] = useTransition();

  async function onSelect(file: File) {
    setError(null);
    if (file.size > maxBytes) {
      setError(`File is too large (max ${Math.round(maxBytes / 1024 / 1024)}MB).`);
      return;
    }
    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.set('propertyId', propertyId);
      fd.set('file', file);
      const res = await fetch('/api/files/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Upload failed');
        return;
      }
      const att = data.attachment as UploadedAttachment;
      startTransition(() => onChange([...uploaded, att]));
    } catch (e) {
      setError('Upload failed');
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <label className="label">Receipts (optional)</label>
      <div className="flex flex-wrap gap-2">
        {uploaded.map((a) => (
          <div key={a.id} className="flex items-center gap-2 rounded-md border border-ink-200 bg-white px-3 py-1.5 text-xs">
            <Paperclip className="h-3.5 w-3.5 text-ink-500" />
            <a
              href={`/api/files/${a.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-ink-800 hover:underline"
            >
              {a.fileName}
            </a>
            <button
              type="button"
              aria-label="Remove attachment"
              className="text-ink-500 hover:text-red-700"
              onClick={() => onChange(uploaded.filter((x) => x.id !== a.id))}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/heic,application/pdf"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onSelect(f);
          e.target.value = '';
        }}
        disabled={isUploading}
        className="block text-xs text-ink-600 file:mr-3 file:rounded-full file:border-0 file:bg-ink-900 file:px-4 file:py-1.5 file:text-xs file:font-medium file:text-cream-50 hover:file:bg-ink-800"
      />
      {isUploading ? <p className="text-xs text-admin-muted">Uploading…</p> : null}
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
    </div>
  );
}