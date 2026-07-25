'use client';
import { useState, useTransition, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { Input, Label, Textarea, Select, FieldError } from '@/components/ui/Input';
import { ReceiptUploader, type UploadedAttachment } from '@/components/admin/ReceiptUploader';
import { createExpenseAction } from './actions';
import { todayISO } from '@/lib/format';
import { computeSplits } from '@/lib/money';

export function ExpenseForm({
  propertyId,
  participants,
  categories,
}: {
  propertyId: string;
  participants: { id: string; name: string }[];
  categories: { id: string; name: string }[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'EQUAL' | 'PERCENTAGE' | 'EXACT'>('EQUAL');
  const [selected, setSelected] = useState<Record<string, boolean>>(() => Object.fromEntries(participants.map((p) => [p.id, true])));
  const [percentages, setPercentages] = useState<Record<string, number>>(() => Object.fromEntries(participants.map((p) => [p.id, +(100 / participants.length).toFixed(2)])));
  const [exactAmounts, setExactAmounts] = useState<Record<string, string>>({});
  const [attachments, setAttachments] = useState<UploadedAttachment[]>([]);

  const selectedIds = useMemo(() => participants.filter((p) => selected[p.id]).map((p) => p.id), [participants, selected]);
  const sumPct = useMemo(() => selectedIds.reduce((a, id) => a + (percentages[id] ?? 0), 0), [selectedIds, percentages]);
  const sumExact = useMemo(() => selectedIds.reduce((a, id) => a + (Number(exactAmounts[id] ?? 0) || 0), 0), [selectedIds, exactAmounts]);

  function buildSplit() {
    if (method === 'EQUAL') return { method: 'EQUAL' as const, participantIds: selectedIds };
    if (method === 'PERCENTAGE') {
      return {
        method: 'PERCENTAGE' as const,
        participantIds: selectedIds,
        percentages: selectedIds.map((id) => +(percentages[id] ?? 0).toFixed(2)),
      };
    }
    return {
      method: 'EXACT' as const,
      participantIds: selectedIds,
      amounts: selectedIds.map((id) => BigInt(Math.round((Number(exactAmounts[id] ?? 0) || 0) * 100))),
    };
  }

  function onSubmit(form: FormData) {
    setError(null); setSuccess(null);
    const payload: any = {
      propertyId,
      occurredOn: String(form.get('occurredOn') ?? todayISO()),
      description: String(form.get('description') ?? ''),
      amount: String(form.get('amount') ?? ''),
      categoryId: String(form.get('categoryId') ?? ''),
      paidById: String(form.get('paidById') ?? ''),
      split: buildSplit(),
      notes: String(form.get('notes') ?? ''),
    };
    if (attachments.length) {
      payload.attachmentIds = attachments.map((a) => a.id);
    }
    startTransition(async () => {
      const res = await createExpenseAction(payload);
      if (!res.ok) setError(res.error ?? 'Failed to save');
      else {
        setSuccess('Expense recorded.');
        setAmount('');
      }
    });
  }

  return (
    <form action={onSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="occurredOn">Date</Label>
          <Input id="occurredOn" name="occurredOn" type="date" defaultValue={todayISO()} required />
        </div>
        <div>
          <Label htmlFor="amount">Amount (₹)</Label>
          <Input id="amount" name="amount" type="text" inputMode="decimal" placeholder="0.00" required value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="description">Description</Label>
          <Input id="description" name="description" required placeholder="e.g. Electricity bill — March" />
        </div>
        <div>
          <Label htmlFor="categoryId">Category</Label>
          <Select id="categoryId" name="categoryId">
            <option value="">— Select —</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
        <div>
          <Label htmlFor="paidById">Paid by</Label>
          <Select id="paidById" name="paidById" required>
            <option value="">— Select —</option>
            {participants.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea id="notes" name="notes" placeholder="Reference, vendor, etc." />
        </div>
      </div>

      <div className="admin-panel p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-lg">Split</h3>
          <div className="flex gap-1 rounded-full bg-admin-bg p-1 text-xs">
            {(['EQUAL', 'PERCENTAGE', 'EXACT'] as const).map((m) => (
              <button
                type="button"
                key={m}
                onClick={() => setMethod(m)}
                className={`px-3 py-1.5 rounded-full ${method === m ? 'bg-admin-panel shadow-sm font-medium' : 'text-admin-muted'}`}
              >{m}</button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          {participants.map((p) => {
            const checked = !!selected[p.id];
            return (
              <div key={p.id} className="grid grid-cols-12 gap-3 items-center py-2 border-b border-admin-border last:border-0">
                <label className="col-span-5 flex items-center gap-2">
                  <input type="checkbox" checked={checked} onChange={(e) => setSelected((s) => ({ ...s, [p.id]: e.target.checked }))} />
                  <span className="text-sm">{p.name}</span>
                </label>
                <div className="col-span-4">
                  {method === 'EQUAL' ? (
                    <span className="text-xs text-admin-muted">Equal share</span>
                  ) : method === 'PERCENTAGE' ? (
                    <div className="flex items-center gap-2">
                      <Input type="number" step="0.01" min="0" max="100" disabled={!checked} value={percentages[p.id] ?? 0} onChange={(e) => setPercentages((m) => ({ ...m, [p.id]: Number(e.target.value) }))} />
                      <span className="text-xs text-admin-muted">%</span>
                    </div>
                  ) : (
                    <Input type="text" inputMode="decimal" placeholder="0.00" disabled={!checked} value={exactAmounts[p.id] ?? ''} onChange={(e) => setExactAmounts((m) => ({ ...m, [p.id]: e.target.value }))} />
                  )}
                </div>
                <div className="col-span-3 text-right text-sm text-admin-muted">
                  {(() => {
                    if (!checked || !amount) return '—';
                    try {
                      const amounts = computeSplits(BigInt(Math.round(Number(amount) * 100)), buildSplit()).map((x) => x.amountMinor);
                      const idx = selectedIds.indexOf(p.id);
                      if (idx === -1) return '—';
                      const rupees = Number(amounts[idx]) / 100;
                      return `₹${rupees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                    } catch { return '—'; }
                  })()}
                </div>
              </div>
            );
          })}
        </div>
        {method === 'PERCENTAGE' ? (
          <div className="mt-3 text-xs text-admin-muted">Sum: {sumPct.toFixed(2)}% {Math.abs(sumPct - 100) < 0.001 ? '✓' : '(must equal 100)'}</div>
        ) : method === 'EXACT' ? (
          <div className="mt-3 text-xs text-admin-muted">Sum: ₹{sumExact.toFixed(2)} {Math.abs(sumExact - Number(amount || 0)) < 0.01 ? '✓' : '(must equal total)'}</div>
        ) : null}
      </div>

      <FieldError>{error ?? undefined}</FieldError>
      {success ? <p className="text-sm text-emerald-700">{success}</p> : null}

      <ReceiptUploader propertyId={propertyId} uploaded={attachments} onChange={setAttachments} />

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isPending}>{isPending ? 'Saving…' : 'Save expense'}</Button>
      </div>
    </form>
  );
}