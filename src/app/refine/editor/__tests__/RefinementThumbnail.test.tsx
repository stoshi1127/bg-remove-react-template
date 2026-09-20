import { createThumbnailCache, thumbnailKey } from '../RefinementThumbnail';
import { composeRefinementOutput } from '@/lib/refinement/imageComposition';
import { readRefinementAsset } from '@/lib/refinement/workspaceStorage';
import type { RefinementWorkspaceItem } from '@/lib/refinement/workspace';

jest.mock('@/lib/refinement/imageComposition', () => ({ composeRefinementOutput: jest.fn() }));
jest.mock('@/lib/refinement/workspaceStorage', () => ({
  readRefinementAsset: jest.fn(),
  assetValueToUrl: jest.fn((value: string) => ({ url: value, revoke: false })),
}));

const item: RefinementWorkspaceItem = {
  id: 'one', workspaceId: 'workspace', name: 'one.png', order: 0, eligible: true,
  ineligibleReason: null, processingMode: 'standard', source: { kind: 'url', url: 'source' },
  transparent: { kind: 'url', url: 'transparent' }, refined: null, background: null,
  backgroundValue: '#ffffff', ratio: 'original', status: 'unmodified', draftStrokes: [],
};

beforeEach(() => {
  jest.clearAllMocks();
  (readRefinementAsset as jest.Mock).mockImplementation(async ref => ref?.kind === 'url' ? ref.url : null);
  (composeRefinementOutput as jest.Mock).mockResolvedValue(new Blob(['preview'], { type: 'image/png' }));
});

test('uses the current finished asset and a small output size', async () => {
  const cache = createThumbnailCache();
  const refined = { ...item, refined: { kind: 'url' as const, url: 'refined' }, status: 'refined' as const };
  await cache.get(refined);
  expect(composeRefinementOutput).toHaveBeenCalledWith(expect.objectContaining({ transparentUrl: 'refined', maxSide: 160 }));
  cache.dispose();
});

test('caches the same image across draft changes and refreshes only a changed finish', async () => {
  const cache = createThumbnailCache();
  await cache.get(item);
  await cache.get({ ...item, status: 'editing', draftStrokes: [{ tool: 'erase', size: 0.1, points: [{ x: 0, y: 0 }] }] });
  expect(composeRefinementOutput).toHaveBeenCalledTimes(1);
  const refined = { ...item, refined: { kind: 'url' as const, url: 'refined' }, status: 'refined' as const };
  expect(thumbnailKey(refined)).not.toBe(thumbnailKey(item));
  await cache.get(refined);
  expect(composeRefinementOutput).toHaveBeenCalledTimes(2);
  cache.dispose();
  expect(URL.revokeObjectURL).toHaveBeenCalled();
});
