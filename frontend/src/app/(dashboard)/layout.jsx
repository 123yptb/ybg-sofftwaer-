import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import Header  from '@/components/layout/Header';
import { BusinessProvider } from '@/lib/context/BusinessContext';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }) {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  // Read businessType directly from DB — never stale, unlike JWT
  let businessType = 'TRADING';
  try {
    if (session.user?.organizationId) {
      const org = await prisma.organization.findUnique({
        where: { id: session.user.organizationId },
        select: { businessType: true },
      });
      businessType = org?.businessType || 'TRADING';
    }
  } catch {
    // If column doesn't exist yet (migration pending), fall back gracefully
    businessType = session.user?.businessType || 'TRADING';
  }

  return (
    <BusinessProvider initialType={businessType}>
      <div className="flex h-screen overflow-hidden bg-background">
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <Header/>
          <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto w-full animate-fade-in">
              {children}
            </div>
          </main>
        </div>
      </div>
    </BusinessProvider>
  );
}
