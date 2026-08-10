import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { Table, THead, TH, TBody, TR, TD } from '@/components/ui/Table';
import { formatDateTime } from '@/lib/format';
import { requireRole, getActivePropertyId } from '@/lib/authorization';

export default async function AuditPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/admin/login');
  // The session JWT already carries the active property id; no DB lookup.
  const propertyId = await getActivePropertyId();
  if (!propertyId) redirect('/admin/login');
  try { await requireRole(propertyId, 'PROPERTY_ADMIN'); }
  catch { return <div className="max-w-md"><h1 className="font-serif text-2xl">Forbidden</h1></div>; }

  const logs = await prisma.auditLog.findMany({
    where: { propertyId },
    include: { actor: true },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <div>
        <div className="eyebrow">Trail</div>
        <h1 className="mt-1 font-serif text-3xl text-admin-ink">Audit log</h1>
        <p className="mt-1 text-sm text-admin-muted">Every important change in the property is recorded here.</p>
      </div>
      <Table>
        <THead>
          <TR>
            <TH>When</TH>
            <TH>Actor</TH>
            <TH>Action</TH>
            <TH>Entity</TH>
            <TH>Entity ID</TH>
          </TR>
        </THead>
        <TBody>
          {logs.map((l) => (
            <TR key={l.id}>
              <TD className="text-admin-muted">{formatDateTime(l.createdAt)}</TD>
              <TD>{l.actor?.name ?? l.actor?.email ?? '—'}</TD>
              <TD><code className="text-xs bg-admin-bg px-1.5 py-0.5 rounded">{l.action}</code></TD>
              <TD className="text-admin-muted">{l.entity}</TD>
              <TD className="font-mono text-xs text-admin-muted">{l.entityId}</TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}