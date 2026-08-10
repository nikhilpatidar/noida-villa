'use client';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select, FieldError } from '@/components/ui/Input';
import { createParticipantAction } from './actions';

export function PeopleForm({ propertyId }: { propertyId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  function onSubmit(fd: FormData) {
    setError(null); setSuccess(null);
    const payload = {
      propertyId,
      displayName: String(fd.get('displayName') ?? ''),
      email: String(fd.get('email') ?? ''),
      phone: String(fd.get('phone') ?? ''),
      kind: String(fd.get('kind') ?? 'OWNER') as 'OWNER' | 'INVESTOR' | 'STAFF' | 'OTHER',
      notes: String(fd.get('notes') ?? ''),
    };
    startTransition(async () => {
      const res = await createParticipantAction(payload);
      if (!res.ok) setError(res.error ?? 'Failed');
      else setSuccess('Participant added.');
      (document.getElementById('people-form') as HTMLFormElement)?.reset();
    });
  }
  return (
    <form id="people-form" action={onSubmit} className="mt-4 grid gap-3 md:grid-cols-2">
      <div><Label>Name</Label><Input name="displayName" required /></div>
      <div><Label>Email</Label><Input name="email" type="email" /></div>
      <div><Label>Phone</Label><Input name="phone" /></div>
      <div>
        <Label>Kind</Label>
        <Select name="kind" defaultValue="OWNER">
          <option value="OWNER">Owner</option>
          <option value="INVESTOR">Investor</option>
          <option value="STAFF">Staff</option>
          <option value="OTHER">Other</option>
        </Select>
      </div>
      <div className="md:col-span-2"><Label>Notes</Label><Input name="notes" /></div>
      <FieldError>{error ?? undefined}</FieldError>
      {success ? <p className="text-sm text-emerald-700 md:col-span-2">{success}</p> : null}
      <div className="md:col-span-2"><Button type="submit" disabled={isPending}>{isPending ? 'Saving…' : 'Add participant'}</Button></div>
    </form>
  );
}