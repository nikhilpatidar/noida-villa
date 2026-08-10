import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { ExpenseForm } from '../ExpenseForm';
import { getActivePropertyId } from '@/lib/authorization';

export default async function NewExpensePage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/admin/login');
  // The session JWT already carries the active property id; no DB lookup.
  const propertyId = await getActivePropertyId();
  if (!propertyId) redirect('/admin/login');

  // Participants and categories are independent — fetch in parallel.
  const [participants, categories] = await Promise.all([
    prisma.participant.findMany({
      where: { propertyId, isActive: true },
      orderBy: { displayName: 'asc' },
    }),
    prisma.category.findMany({
      where: { propertyId, kind: 'EXPENSE', isActive: true },
      orderBy: { sortOrder: 'asc' },
    }),
  ]);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <div className="eyebrow">Add</div>
        <h1 className="mt-1 font-serif text-3xl text-admin-ink">New expense</h1>
      </div>
      <ExpenseForm
        propertyId={propertyId}
        participants={participants.map((p) => ({ id: p.id, name: p.displayName }))}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      />
    </div>
  );
}