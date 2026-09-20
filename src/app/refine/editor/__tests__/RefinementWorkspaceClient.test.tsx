import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { saveAs } from 'file-saver';
import RefinementWorkspaceClient from '../RefinementWorkspaceClient';
import { readRefinementWorkspace, readRefinementAsset, updateRefinementItem } from '@/lib/refinement/workspaceStorage';
import type { RefinementWorkspaceBundle, RefinementWorkspaceItem } from '@/lib/refinement/workspace';

jest.mock('@/components/CutoutRefinementEditor', () => ({
  __esModule: true,
  default: ({ onDraftChange, onApply, applyLabel }: { onDraftChange: (strokes: unknown[]) => void; onApply: (blob: Blob, tool: 'erase') => void; applyLabel: string }) => <div>
    <button type="button" onClick={() => onDraftChange([{ tool: 'erase', size: 0.1, points: [{ x: 0, y: 0 }] }])}>テスト用の下書き</button>
    <button type="button" onClick={() => onApply(new Blob(['edited'], { type: 'image/png' }), 'erase')}>{applyLabel}</button>
  </div>,
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
jest.mock('file-saver', () => ({ saveAs: jest.fn() }));
jest.mock('jszip', () => ({ __esModule: true, default: jest.fn().mockImplementation(() => ({
  file: jest.fn(),
  generateAsync: jest.fn(async () => new Blob(['zip'], { type: 'application/zip' })),
})) }));
jest.mock('@/lib/refinement/imageComposition', () => ({
  calculateAlphaBoundingBox: jest.fn(async () => ({ x: 0, y: 0, width: 10, height: 10 })),
  composeRefinementOutput: jest.fn(async () => new Blob(['image'], { type: 'image/png' })),
}));

const item = (id: string, status: RefinementWorkspaceItem['status'] = 'unmodified'): RefinementWorkspaceItem => ({
  id, workspaceId: 'workspace', name: `${id}.png`, order: id === 'first' ? 0 : 1,
  eligible: true, ineligibleReason: null, processingMode: 'standard',
  source: { kind: 'url', url: `source-${id}` },
  transparent: { kind: 'url', url: `transparent-${id}` },
  refined: null, background: null, backgroundValue: null, ratio: 'original', status, draftStrokes: [],
});

function bundle(mode: 'pro' | 'trial' | 'rewarded'): RefinementWorkspaceBundle {
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
  window.localStorage.clear();
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
  expect(screen.getByRole('link', { name: '広告の対象ページへ進む' })).toHaveAttribute('href', '/refine/editor/rewarded?workspace=workspace&from_unlock=1');
  expect(screen.queryByText(/最初の1枚を無料で修正しました/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '後で決める' }));
  expect(screen.getByRole('button', { name: '残りの画像を解放' })).toBeInTheDocument();
});

test('keeps the next image locked after the free apply instead of advancing', async () => {
  const data = bundle('trial');
  data.workspace.trialItemId = null;
  data.items[0] = item('first');
  (readRefinementWorkspace as jest.Mock).mockResolvedValue(data);
  render(<RefinementWorkspaceClient workspaceId="workspace" routeMode="trial" isPro={false} />);
  fireEvent.click(await screen.findByRole('button', { name: 'この画像に適用' }));
  expect(await screen.findByRole('dialog', { name: '残りの画像も仕上げ修正しますか？' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /second.pngを編集/ })).toBeDisabled();
  expect(screen.getByText('1 / 2・修正済み 1枚')).toBeInTheDocument();
});

test('thumbnail switch with a draft cannot bypass the unlock prompt on apply', async () => {
  const data = bundle('trial');
  data.workspace.trialItemId = null;
  data.items[0] = item('first');
  (readRefinementWorkspace as jest.Mock).mockResolvedValue(data);
  render(<RefinementWorkspaceClient workspaceId="workspace" routeMode="trial" isPro={false} />);
  fireEvent.click(await screen.findByRole('button', { name: 'テスト用の下書き' }));
  fireEvent.click(screen.getByRole('button', { name: /second.pngを編集/ }));
  fireEvent.click(within(screen.getByRole('dialog', { name: '未適用の修正があります' })).getByRole('button', { name: '下書きを保存して移動' }));
  await waitFor(() => expect(screen.getByText('2 / 2・修正済み 0枚')).toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: 'この画像に適用' }));
  expect(await screen.findByRole('dialog', { name: '残りの画像も仕上げ修正しますか？' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /first.pngを編集/ })).toBeDisabled();
  expect(screen.getByText('2 / 2・修正済み 1枚')).toBeInTheDocument();
});

test('does not unlock a rewarded workspace opened without the Offerwall entry action', async () => {
  const legacy = bundle('rewarded');
  legacy.workspace.batchUnlocked = true;
  (readRefinementWorkspace as jest.Mock).mockResolvedValue(legacy);
  render(<RefinementWorkspaceClient workspaceId="workspace" routeMode="rewarded" isPro={false} />);
  expect(await screen.findByRole('dialog', { name: '残りの画像も仕上げ修正しますか？' })).toBeInTheDocument();
  expect(screen.getByText('この画像はまだ編集できません')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '適用して次へ' })).not.toBeInTheDocument();
});

test('advances only after entering the rewarded page through the explicit action', async () => {
  (readRefinementWorkspace as jest.Mock).mockResolvedValue(bundle('rewarded'));
  render(<RefinementWorkspaceClient workspaceId="workspace" routeMode="rewarded" offerwallRequested isPro={false} />);
  fireEvent.click(await screen.findByRole('button', { name: '適用して次へ' }));
  await waitFor(() => expect(screen.getByText('2 / 2・修正済み 1枚')).toBeInTheDocument());
});

test('confirms before saving an image with an immediate unsaved draft', async () => {
  (readRefinementWorkspace as jest.Mock).mockResolvedValue(bundle('pro'));
  render(<RefinementWorkspaceClient workspaceId="workspace" routeMode="pro" isPro />);
  fireEvent.click(await screen.findByRole('button', { name: 'テスト用の下書き' }));
  fireEvent.click(screen.getByRole('button', { name: '現在画像を保存' }));
  const dialog = screen.getByRole('dialog', { name: '下書き中の修正は書き出されません' });
  expect(within(dialog).getByText(/first.png/)).toBeInTheDocument();
  expect(saveAs).not.toHaveBeenCalled();
  fireEvent.click(within(dialog).getByRole('button', { name: '編集に戻る' }));
  expect(saveAs).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '現在画像を保存' }));
  fireEvent.click(within(screen.getByRole('dialog', { name: '下書き中の修正は書き出されません' })).getByRole('button', { name: '下書きを含めず画像を保存' }));
  await waitFor(() => expect(saveAs).toHaveBeenCalledWith(expect.any(Blob), 'refined_first.png'));
});

test('confirms before saving an image whose draft was already stored', async () => {
  const data = bundle('pro');
  data.items[0] = { ...item('first', 'editing'), draftStrokes: [{ tool: 'erase', size: 0.1, points: [{ x: 0, y: 0 }] }] };
  (readRefinementWorkspace as jest.Mock).mockResolvedValue(data);
  render(<RefinementWorkspaceClient workspaceId="workspace" routeMode="pro" isPro />);
  fireEvent.click(await screen.findByRole('button', { name: '現在画像を保存' }));
  expect(screen.getByRole('dialog', { name: '下書き中の修正は書き出されません' })).toBeInTheDocument();
  expect(saveAs).not.toHaveBeenCalled();
});

test('confirms saved drafts before entering ZIP mode without asking twice for the same drafts', async () => {
  const data = bundle('pro');
  data.items[1] = { ...item('second', 'editing'), draftStrokes: [{ tool: 'erase', size: 0.1, points: [{ x: 0, y: 0 }] }] };
  (readRefinementWorkspace as jest.Mock).mockResolvedValue(data);
  render(<RefinementWorkspaceClient workspaceId="workspace" routeMode="pro" isPro />);
  fireEvent.click(await screen.findByRole('button', { name: 'ZIPを書き出す' }));
  const dialog = screen.getByRole('dialog', { name: '下書き中の修正は書き出されません' });
  expect(within(dialog).getByText(/second.png/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '2枚をZIP保存' })).not.toBeInTheDocument();
  fireEvent.click(within(dialog).getByRole('button', { name: '編集に戻る' }));
  expect(screen.queryByRole('button', { name: '2枚をZIP保存' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'ZIPを書き出す' }));
  fireEvent.click(within(screen.getByRole('dialog', { name: '下書き中の修正は書き出されません' })).getByRole('button', { name: 'ZIP選択へ進む' }));
  fireEvent.click(screen.getByRole('button', { name: '2枚をZIP保存' }));
  expect(screen.queryByRole('dialog', { name: '下書き中の修正は書き出されません' })).not.toBeInTheDocument();
  await waitFor(() => expect(saveAs).toHaveBeenCalledWith(expect.any(Blob), 'refined_images.zip'));
});

test('confirms a draft created after entering ZIP mode before saving', async () => {
  (readRefinementWorkspace as jest.Mock).mockResolvedValue(bundle('pro'));
  render(<RefinementWorkspaceClient workspaceId="workspace" routeMode="pro" isPro />);
  fireEvent.click(await screen.findByRole('button', { name: 'ZIPを書き出す' }));
  expect(screen.queryByRole('dialog', { name: '下書き中の修正は書き出されません' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'テスト用の下書き' }));
  fireEvent.click(screen.getByRole('button', { name: '2枚をZIP保存' }));
  expect(screen.getByRole('dialog', { name: '下書き中の修正は書き出されません' })).toBeInTheDocument();
  expect(saveAs).not.toHaveBeenCalled();
});
