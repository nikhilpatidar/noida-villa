'use client';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import { Input, Label, Textarea, Select, FieldError } from '@/components/ui/Input';
import { createSettlementAction } from './actions';
import { todayISO } from '@/lib/format';

export function SettlementsActions({
  propertyId,
  participants,
}: {
  propertyId: string;
  participants: { id: string; name: string }[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(fd: FormData) {
    setError(null); setSuccess(null);
    const payload = {
      propertyId,
      fromId: String(fd.get('fromId') ?? ''),
      toId: String(fd.get('toId') ?? ''),
      amount: String(fd.get('amount') ?? ''),
      occurredOn: String(fd.get('occurredOn') ?? todayISO()),
      notes: String(fd.get('notes') ?? ''),
    };
    startTransition(async () => {
      const res = await createSettlementAction(payload);
      if (!res.ok) setError(res.error ?? 'Failed');
      else setSuccess('Settlement recorded.');
    });
  }

  return (
    <form action={onSubmit} className="mt-4 space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label>From</Label>
          <Select name="fromId" required>
            <option value="">— Select —</option>
            {participants.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </div>
        <div>
          <Label>To</Label>
          <Select name="toId" required>
            <option value="">— Select —</option>
            {participants.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </div>
        <div>
          <Label>Amount (₹)</Label>
          <Input name="amount" required inputMode="decimal" placeholder="0.00" />
        </div>
        <div>
          <Label>Date</Label>
          <Input name="occurredOn" type="date" defaultValue={todayISO()} required />
        </div>
      </div>
      <div>
        <Label>Notes</Label>
        <Textarea name="notes" placeholder="UPI ref, etc." />
      </div>
      <FieldError>{error ?? undefined}</FieldError>
      {success ? <p className="text-sm text-emerald-700">{success}</p> : null}
      <Button type="submit" disabled={isPending}>{isPending ? 'Saving…' : 'Record settlement'}</Button>
    </form>
  );
}