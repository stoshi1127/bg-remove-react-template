import type { Metadata } from 'next';
import RefinementAccessClient from './RefinementAccessClient';

export const metadata: Metadata = {
  title: '画像の仕上げ修正 | イージーカット',
  robots: { index: false, follow: false },
};

export default async function RefinementAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ draft?: string }>;
}) {
  const { draft = '' } = await searchParams;
  return <RefinementAccessClient draftId={draft} />;
}
