import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import RefinementWorkspaceClient from '../RefinementWorkspaceClient';
import { readRefinementWorkspace, readRefinementAsset, updateRefinementItem } from '@/lib/refinement/workspaceStorage';
import type { RefinementWorkspaceBundle, RefinementWorkspaceItem } from '@/lib/refinement/workspace';

jest.mock('@/components/CutoutRefinementEditor', () => ({
  __esModule: true,
  default: ({ onDraftChange }: { onDraftChange: (strokes: unknown[]) => void }) => <button type="button" onClick={() => onDraftChange([{ tool: 'erase', size: 0.1, points: [{ x: 0, y: 0 }] }])}>テスト用の下書き</button>,
}));
jest.mock('../RefinementThumbnail', () => ({
  __esModule: true,
  default: () => <span>サムネイル</span>,
  createThumbnailCache: () => ({ revive: jest.fn(), dispose: jest.fn() }),
}));
jest.mock('@/lib/refinement/workspaceStorage', () => ({
  readRefinementWorkspace: jest.fn(),
  readRefinementAsset: jest.fn(),
  assetValueToUrl: (value: string) => ({ url: value, revoke: false }),
  updateRefinementItem: jest.fn(async item => item),
  updateRefinementWorkspace: jest.fn(),
}));
jest.mock('@/lib/analytics/events', () => ({ trackAnalyticsEvent: jest.fn() }));

const item = (id: string, status: RefinementWorkspaceItem['status'] = 'unmodified'): RefinementWorkspaceItem => ({
  id, workspaceId: 'workspace', name: `${id}.png`, order: id === 'first' ? 0 : 1,
  eligible: true, ineligibleReason: null, processingMode: 'standard',
  source: { kind: 'url', url: `source-${id}` },
  transparent: { kind: 'url', url: `transparent-${id}` },
  refined: null, background: null, backgroundValue: null, ratio: 'original', status, draftStrokes: [],
});

function bundle(mode: 'pro' | 'trial'): RefinementWorkspaceBundle {
  return {
    workspace: {
      id: 'workspace', schemaVersion: 2, status: 'editing', mode,
      trialItemId: mode === 'trial' ? 'first' : null, batchUnlocked: mode === 'pro',
      createdAt: 1, updatedAt: 1, itemOrder: ['first', 'second'],
    },
    items: [item('first', mode === 'trial' ? 'refined' : 'unmodified'), item('second')],
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  window.sessionStorage.clear();
  (readRefinementAsset as jest.Mock).mockImplementation(async ref => ref?.kind === 'url' ? ref.url : null);
});

test('shows an unwrapped draft dialog and confirms leaving from the new image action', async () => {
  (readRefinementWorkspace as jest.Mock).mockResolvedValue(bundle('pro'));
  render(<RefinementWorkspaceClient workspaceId="workspace" routeMode="pro" isPro />);
  await screen.findByRole('button', { name: 'テスト用の下書き' });

  fireEvent.click(screen.getByRole('button', { name: 'テスト用の下書き' }));
  fireEvent.click(screen.getByRole('button', { name: /second.pngを編集/ }));
  expect(screen.getByRole('dialog', { name: '未適用の修正があります' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '下書きを保存して移動' })).toHaveClass('whitespace-nowrap');
  fireEvent.click(screen.getByRole('button', { name: '戻る' }));

  fireEvent.click(screen.getByRole('button', { name: '新しい画像を処理' }));
  expect(screen.getByRole('dialog', { name: '編集画面を離れますか？' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '編集を続ける' }));
  await waitFor(() => expect(screen.queryByRole('dialog', { name: '編集画面を離れますか？' })).not.toBeInTheDocument());

  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);

  fireEvent.click(screen.getByRole('button', { name: '新しい画像を処理' }));
  fireEvent.click(within(screen.getByRole('dialog', { name: '編集画面を離れますか？' })).getByRole('button', { name: '新しい画像を処理' }));
  await waitFor(() => expect(updateRefinementItem).toHaveBeenCalled());
  await waitFor(() => {
    const confirmedExit = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(confirmedExit);
    expect(confirmedExit.defaultPrevented).toBe(false);
  });
});

test('offers the remaining batch in a dialog instead of a banner', async () => {
  (readRefinementWorkspace as jest.Mock).mockResolvedValue(bundle('trial'));
  render(<RefinementWorkspaceClient workspaceId="workspace" routeMode="trial" isPro={false} />);
  expect(await screen.findByRole('dialog', { name: '残りの画像も仕上げ修正しますか？' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: '広告を見て残りを解放' })).toHaveAttribute('href', '/refine/editor/rewarded?workspace=workspace');
  expect(screen.queryByText(/最初の1枚を無料で修正しました/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '後で決める' }));
  expect(screen.getByRole('button', { name: '残りの画像を解放' })).toBeInTheDocument();
});
