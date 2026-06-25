import { redirect } from 'next/navigation';
import { getSession, clearSession } from '@/lib/auth/session';
import { canAccessAdminWeb } from '@/lib/auth/webAccess';

export default async function DocumentLayout({ children }) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  if (!canAccessAdminWeb(session)) {
    await clearSession();
    redirect('/login');
  }

  return <div className="document-shell">{children}</div>;
}
