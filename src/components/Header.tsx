import HeaderClient from '@/components/HeaderClient';
import { getCurrentUser } from '@/lib/auth/session';

export default async function Header() {
  const user = await getCurrentUser();
  return <HeaderClient isLoggedIn={!!user} isPro={!!user?.isPro} />;
}