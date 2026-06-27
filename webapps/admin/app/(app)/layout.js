import { redirect } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import EntrepriseBrandHeader from '@/components/layout/EntrepriseBrandHeader';
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

  return (
    <div className="app-shell">
      <Sidebar session={session} />
      <div className="app-main">
        <EntrepriseBrandHeader session={session} />
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}
