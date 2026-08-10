import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { ExpenseForm } from '../ExpenseForm';

export default async function NewExpensePage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/admin/login');
  const property = await prisma.property.findFirst({
    where: { memberships: { some: { userId: session.user.id, isActive: true } } },
    include: {
      participants: { where: { isActive: true }, orderBy: { displayName: 'asc' } },
      categories: { where: { kind: 'EXPENSE', isActive: true }, orderBy: { sortOrder: 'asc' } },
    },
  });
  if (!property) redirect('/admin/login');
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <div className="eyebrow">Add</div>
        <h1 className="mt-1 font-serif text-3xl text-admin-ink">New expense</h1>
      </div>
      <ExpenseForm
        propertyId={property.id}
        participants={property.participants.map((p) => ({ id: p.id, name: p.displayName }))}
        categories={property.categories.map((c) => ({ id: c.id, name: c.name }))}
      />
    </div>
  );
}