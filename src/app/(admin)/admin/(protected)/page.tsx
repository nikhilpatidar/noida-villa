import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { loadDashboard } from '@/lib/services/dashboard';
import { DashboardView } from './DashboardView';
import { formatINR } from '@/lib/money';

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/admin/login');

  const property = await prisma.property.findFirst({
    where: {
      memberships: { some: { userId: session.user.id, isActive: true } },
    },
  });
  if (!property) redirect('/admin/login');

  const data = await loadDashboard(property.id);
  const myParticipant = await prisma.participant.findFirst({
    where: { propertyId: property.id, userId: session.user.id, isActive: true },
  });
  const myNet = myParticipant ? data.participants.find((p) => p.id === myParticipant.id)?.netMinor ?? 0n : null;

  // Serialise BigInts for client component safety
  const serialised = JSON.parse(JSON.stringify(data, (_, v) => (typeof v === 'bigint' ? v.toString() : v)));
  return <DashboardView data={serialised} myNetMinor={myNet !== null ? myNet.toString() : null} formattedNet={myNet !== null ? formatINR(myNet) : null} />;
}