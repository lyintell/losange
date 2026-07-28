import { redirect } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import { getSession, clearSession } from '@/lib/auth/session';
import { canAccessAdminWeb } from '@/lib/auth/webAccess';

export default async function AppLayout({ children }) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  if (!canAccessAdminWeb(session)) {
    await clearSession();
    redirect('/login');
  }

  return <AppShell session={session}>{children}</AppShell>;
}
