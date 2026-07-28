import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { Table, THead, TH, TBody, TR, TD } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { requireRole } from '@/lib/authorization';

export default async function OwnersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/admin/login');
  const property = await prisma.property.findFirst({
    where: { memberships: { some: { userId: session.user.id, isActive: true } } },
  });
  if (!property) redirect('/admin/login');

  // Only admin can manage owners
  try {
    await requireRole(property.id, 'PROPERTY_ADMIN');
  } catch {
    return (
      <div className="max-w-md">
        <h1 className="font-serif text-2xl text-admin-ink">Forbidden</h1>
        <p className="mt-2 text-sm text-admin-muted">Only property admins can manage owner accounts.</p>
      </div>
    );
  }

  const memberships = await prisma.propertyMembership.findMany({
    where: { propertyId: property.id },
    include: { user: true },
    orderBy: { invitedAt: 'asc' },
  });

  return (
    <div className="space-y-8">
      <div>
        <div className="eyebrow">Access</div>
        <h1 className="mt-1 font-serif text-3xl text-admin-ink">Owners & Roles</h1>
        <p className="mt-1 text-sm text-admin-muted">Each owner has an individual login. Deactivating preserves history.</p>
      </div>

      <div>
        <Table>
          <THead>
            <TR>
              <TH>Name</TH>
              <TH>Email</TH>
              <TH>Role</TH>
              <TH>Status</TH>
              <TH>Joined</TH>
            </TR>
          </THead>
          <TBody>
            {memberships.map((m) => (
              <TR key={m.id}>
                <TD className="font-medium">{m.user.name ?? '—'}</TD>
                <TD className="text-admin-muted">{m.user.email}</TD>
                <TD><Badge variant={m.role === 'PROPERTY_ADMIN' ? 'accent' : 'neutral'}>{m.role}</Badge></TD>
                <TD><Badge variant={m.isActive ? 'success' : 'neutral'}>{m.isActive ? 'Active' : 'Inactive'}</Badge></TD>
                <TD className="text-admin-muted">{m.joinedAt ? m.joinedAt.toLocaleDateString('en-IN') : '—'}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </div>
    </div>
  );
}