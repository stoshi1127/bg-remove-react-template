import {
  getRefinementAccess,
  readRefinementTrialUsed,
  REFINEMENT_TRIAL_STORAGE_KEY,
  writeRefinementTrialUsed,
} from '../entitlement';

describe('refinement entitlement', () => {
  test('Pro is always allowed', () => {
    expect(getRefinementAccess({ isPro: true, hasRefinement: false, trialUsed: true, rewardedForImage: false })).toBe('pro');
  });

  test('the first image uses the trial and later images require a reward', () => {
    expect(getRefinementAccess({ isPro: false, hasRefinement: false, trialUsed: false, rewardedForImage: false })).toBe('trial');
    expect(getRefinementAccess({ isPro: false, hasRefinement: false, trialUsed: true, rewardedForImage: false })).toBe('reward_required');
  });

  test('an already refined or rewarded image can be reopened', () => {
    expect(getRefinementAccess({ isPro: false, hasRefinement: true, trialUsed: true, rewardedForImage: false })).toBe('existing_image');
    expect(getRefinementAccess({ isPro: false, hasRefinement: false, trialUsed: true, rewardedForImage: true })).toBe('existing_image');
  });

  test('trial storage is resilient', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
    };
    expect(readRefinementTrialUsed(storage)).toBe(false);
    expect(writeRefinementTrialUsed(storage)).toBe(true);
    expect(values.get(REFINEMENT_TRIAL_STORAGE_KEY)).toBe('1');
    expect(readRefinementTrialUsed(storage)).toBe(true);
  });
});
