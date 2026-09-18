import {
  clearOfferwallAccess,
  grantOfferwallAccess,
  hasOfferwallAccess,
  REFINEMENT_DRAFT_MAX_AGE_MS,
} from '../draftStorage';

function createStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
}

describe('Offerwall refinement access', () => {
  afterEach(() => jest.useRealTimers());

  test('grants access only to the matching draft', () => {
    const storage = createStorage();
    expect(grantOfferwallAccess(storage, 'draft-a')).toBe(true);
    expect(hasOfferwallAccess(storage, 'draft-a')).toBe(true);
    expect(hasOfferwallAccess(storage, 'draft-b')).toBe(false);
  });

  test('expires and clears old access', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-18T00:00:00Z'));
    const storage = createStorage();
    grantOfferwallAccess(storage, 'draft-a');
    jest.setSystemTime(new Date(Date.now() + REFINEMENT_DRAFT_MAX_AGE_MS + 1));
    expect(hasOfferwallAccess(storage, 'draft-a')).toBe(false);
  });

  test('can clear an access ticket after applying an edit', () => {
    const storage = createStorage();
    grantOfferwallAccess(storage, 'draft-a');
    clearOfferwallAccess(storage, 'draft-a');
    expect(hasOfferwallAccess(storage, 'draft-a')).toBe(false);
  });
});
