import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import RefinementWorkspaceClient from '../RefinementWorkspaceClient';
import type { RefinementWorkspaceMode } from '@/lib/refinement/workspace';

export const metadata: Metadata = {
  title: '一括仕上げ修正 | イージーカット',
  robots: { index: false, follow: false },
};

const MODES = new Set<RefinementWorkspaceMode>(['trial', 'rewarded', 'pro']);

export default async function RefinementEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ mode: string }>;
  searchParams: Promise<{ workspace?: string; from_unlock?: string }>;
}) {
  const [{ mode }, { workspace = '', from_unlock }, user] = await Promise.all([params, searchParams, getCurrentUser()]);
  if (!MODES.has(mode as RefinementWorkspaceMode)) notFound();
  return (
    <RefinementWorkspaceClient
      workspaceId={workspace}
      routeMode={mode as RefinementWorkspaceMode}
      isPro={!!user?.isPro}
      offerwallRequested={from_unlock === '1'}
    />
  );
}
