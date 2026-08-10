'use client';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import { Input, Label, Textarea, FieldError } from '@/components/ui/Input';
import { updateWebsiteContentAction } from './actions';

export function WebsiteForm({ propertyId, initial }: { propertyId: string; initial: { heroEyebrow: string; heroTitle: string; heroSubtitle: string; heroImagePath: string; aboutTitle: string; aboutBody: string; experienceBody: string; contactBody: string } }) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(fd: FormData) {
    setError(null); setSuccess(null);
    const data: any = { propertyId };
    for (const k of ['heroEyebrow', 'heroTitle', 'heroSubtitle', 'heroImagePath', 'aboutTitle', 'aboutBody', 'experienceBody', 'contactBody']) {
      data[k] = String(fd.get(k) ?? '');
    }
    startTransition(async () => {
      const res = await updateWebsiteContentAction(data);
      if (!res.ok) setError(res.error ?? 'Failed');
      else setSuccess('Saved.');
    });
  }

  return (
    <form action={onSubmit} className="admin-panel p-6 space-y-5">
      <h2 className="font-serif text-xl">Hero</h2>
      <div className="grid gap-3 md:grid-cols-2">
        <div><Label>Eyebrow</Label><Input name="heroEyebrow" defaultValue={initial.heroEyebrow} /></div>
        <div><Label>Hero image path/URL</Label><Input name="heroImagePath" defaultValue={initial.heroImagePath} /></div>
        <div className="md:col-span-2"><Label>Hero title</Label><Input name="heroTitle" defaultValue={initial.heroTitle} /></div>
        <div className="md:col-span-2"><Label>Hero subtitle</Label><Textarea name="heroSubtitle" defaultValue={initial.heroSubtitle} /></div>
      </div>

      <h2 className="font-serif text-xl pt-4 border-t border-admin-border">About / Experience</h2>
      <div className="grid gap-3">
        <div><Label>About title</Label><Input name="aboutTitle" defaultValue={initial.aboutTitle} /></div>
        <div><Label>About body</Label><Textarea name="aboutBody" defaultValue={initial.aboutBody} className="min-h-[180px]" /></div>
        <div><Label>Experience section body</Label><Textarea name="experienceBody" defaultValue={initial.experienceBody} className="min-h-[120px]" /></div>
      </div>

      <h2 className="font-serif text-xl pt-4 border-t border-admin-border">Contact page</h2>
      <div><Label>Contact body</Label><Textarea name="contactBody" defaultValue={initial.contactBody} className="min-h-[120px]" /></div>

      <FieldError>{error ?? undefined}</FieldError>
      {success ? <p className="text-sm text-emerald-700">{success}</p> : null}
      <Button type="submit" disabled={isPending}>{isPending ? 'Saving…' : 'Save website content'}</Button>
    </form>
  );
}