import { redirect } from 'next/navigation';

export default async function OuvrageDetailRedirectPage({ params }) {
  const { metierId } = await params;
  redirect(`/ouvrages/${metierId}`);
}
