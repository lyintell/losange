import { redirect } from 'next/navigation';

export default async function ArticleDetailRedirectPage({ params }) {
  const { metierId } = await params;
  redirect(`/ouvrages/${metierId}`);
}
