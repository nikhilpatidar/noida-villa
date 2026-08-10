import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { Table, THead, TH, TBody, TR, TD } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { PeopleForm } from './PeopleForm';
import { getActivePropertyId } from '@/lib/authorization';

export default async function PeoplePage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/admin/login');
  // The session JWT already carries the active property id; no DB lookup.
  const propertyId = await getActivePropertyId();
  if (!propertyId) redirect('/admin/login');
  const participants = await prisma.participant.findMany({
    where: { propertyId },
    orderBy: { createdAt: 'asc' },
  });
  const userIds = participants.map((p) => p.userId).filter((u): u is string => !!u);
  // Only the user email is needed for rendering; narrow the select.
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, email: true },
  });
  const userById = new Map(users.map((u) => [u.id, u]));

  return (
    <div className="space-y-8">
      <div>
        <div className="eyebrow">People</div>
        <h1 className="mt-1 font-serif text-3xl text-admin-ink">People</h1>
        <p className="mt-1 text-sm text-admin-muted">Owners, investors and staff who participate financially. Soft-deactivation preserves history.</p>
      </div>

      <div className="admin-panel p-5 max-w-2xl">
        <h2 className="font-serif text-xl">Add participant</h2>
        <PeopleForm propertyId={propertyId} />
      </div>

      <div>
        <Table>
          <THead>
            <TR>
              <TH>Name</TH>
              <TH>Kind</TH>
              <TH>Email</TH>
              <TH>Login</TH>
              <TH>Status</TH>
            </TR>
          </THead>
          <TBody>
            {participants.map((p) => (
              <TR key={p.id}>
                <TD>
                  <div className="font-medium">{p.displayName}</div>
                  {p.notes ? <div className="text-xs text-admin-muted">{p.notes}</div> : null}
                </TD>
                <TD>{p.kind}</TD>
                <TD className="text-admin-muted">{p.email ?? '—'}</TD>
                <TD className="text-admin-muted">{p.userId ? userById.get(p.userId)?.email ?? '—' : '—'}</TD>
                <TD>
                  <Badge variant={p.isActive ? 'success' : 'neutral'}>{p.isActive ? 'Active' : 'Inactive'}</Badge>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </div>
    </div>
  );
}