import { redirect } from 'next/navigation';

export default async function ArticlesMetierRedirectPage({ params }) {
  const { metierId } = await params;
  redirect(`/ouvrages/${metierId}`);
}
