'use client';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import { Input, Label, Textarea, FieldError } from '@/components/ui/Input';
import { updateSeoAction } from './actions';

export function SeoForm({ propertyId, initial }: { propertyId: string; initial: { defaultTitle: string; defaultDescription: string; defaultOgImagePath: string; twitterHandle: string } }) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  function onSubmit(fd: FormData) {
    setError(null); setSuccess(null);
    const data = {
      propertyId,
      defaultTitle: String(fd.get('defaultTitle') ?? ''),
      defaultDescription: String(fd.get('defaultDescription') ?? ''),
      defaultOgImagePath: String(fd.get('defaultOgImagePath') ?? ''),
      twitterHandle: String(fd.get('twitterHandle') ?? ''),
    };
    startTransition(async () => {
      const res = await updateSeoAction(data);
      if (!res.ok) setError(res.error ?? 'Failed');
      else setSuccess('Saved.');
    });
  }
  return (
    <form action={onSubmit} className="admin-panel p-6 space-y-4">
      <h2 className="font-serif text-xl">SEO defaults</h2>
      <p className="text-sm text-admin-muted">Default title and description. Avoid fabricating ratings, reviews or prices.</p>
      <div><Label>Default title</Label><Input name="defaultTitle" defaultValue={initial.defaultTitle} maxLength={200} /></div>
      <div><Label>Default description</Label><Textarea name="defaultDescription" defaultValue={initial.defaultDescription} maxLength={500} /></div>
      <div><Label>Default OG image path/URL</Label><Input name="defaultOgImagePath" defaultValue={initial.defaultOgImagePath} /></div>
      <div><Label>Twitter handle</Label><Input name="twitterHandle" defaultValue={initial.twitterHandle} placeholder="@yourhandle" /></div>
      <FieldError>{error ?? undefined}</FieldError>
      {success ? <p className="text-sm text-emerald-700">{success}</p> : null}
      <Button type="submit" disabled={isPending}>{isPending ? 'Saving…' : 'Save SEO'}</Button>
    </form>
  );
}