import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Paramètres — Losange Admin',
};

/** Ancienne route : redirige vers Configuration. */
export default function ParametresPage() {
  redirect('/configuration');
}
