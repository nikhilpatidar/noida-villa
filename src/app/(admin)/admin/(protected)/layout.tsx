import { redirect } from 'next/navigation';
import { auth, signOut } from '@/lib/auth';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { prisma } from '@/lib/db';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/admin/login');

  const memberships = await prisma.propertyMembership.findMany({
    where: { userId: session.user.id, isActive: true },
    include: { property: true },
  });
  if (memberships.length === 0) redirect('/admin/login?error=no_membership');

  return (
    <div className="admin-shell">
      <div className="flex min-h-screen">
        <AdminSidebar propertyName={memberships[0].property.name} />
        <div className="flex-1 flex flex-col min-w-0">
          <AdminHeader
            userName={session.user.name ?? session.user.email ?? 'Owner'}
            role={session.user.role ?? 'OWNER'}
            onSignOut={async () => { 'use server'; await signOut({ redirectTo: '/admin/login' }); }}
          />
          <main className="flex-1 px-4 md:px-8 py-8 max-w-[1400px] w-full mx-auto">{children}</main>
        </div>
      </div>
    </div>
  );
}