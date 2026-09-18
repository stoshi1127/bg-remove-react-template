import { getRequiredBlobBytes, isRemoteAsset } from '../workspaceStorage';
import type { WorkspaceSaveItem } from '../workspace';

function item(overrides: Partial<WorkspaceSaveItem> = {}): WorkspaceSaveItem {
  return {
    id: 'image-1',
    name: 'sample.png',
    order: 0,
    eligible: true,
    ineligibleReason: null,
    processingMode: 'standard',
    source: null,
    transparent: null,
    background: null,
    backgroundValue: null,
    ratio: 'original',
    ...overrides,
  };
}

describe('refinement workspace storage helpers', () => {
  test('keeps only HTTPS assets as re-fetchable URLs', () => {
    expect(isRemoteAsset('https://example.com/image.png')).toBe(true);
    expect(isRemoteAsset('http://example.com/image.png')).toBe(false);
    expect(isRemoteAsset('/templates/background.jpg')).toBe(false);
    expect(isRemoteAsset('blob:local-image')).toBe(false);
  });

  test('calculates required storage from blobs without counting URLs', () => {
    const source = new Blob(['source']);
    const transparent = new Blob(['transparent']);
    const background = new Blob(['background']);
    expect(getRequiredBlobBytes([
      item({ source, transparent, background }),
      item({ id: 'image-2', source: 'https://example.com/source.jpg', transparent: new Blob(['x']) }),
    ])).toBe(source.size + transparent.size + background.size + 1);
  });
});

