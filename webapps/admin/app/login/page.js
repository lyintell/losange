import { redirect } from 'next/navigation';
import LoginForm from '@/components/auth/LoginForm';
import { getSession } from '@/lib/auth/session';

export const metadata = {
  title: 'Connexion — Losange Admin',
};

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    redirect('/tableau-de-bord');
  }

  return <LoginForm />;
}
