export const REFINEMENT_TRIAL_STORAGE_KEY = 'easycut_refinement_trial_used_v1';

export type RefinementAccess = 'pro' | 'existing_image' | 'trial' | 'offerwall' | 'reward_required';

export function getRefinementAccess({
  isPro,
  hasRefinement,
  trialUsed,
  rewardedForImage,
}: {
  isPro: boolean;
  hasRefinement: boolean;
  trialUsed: boolean;
  rewardedForImage: boolean;
}): RefinementAccess {
  if (isPro) return 'pro';
  if (hasRefinement || rewardedForImage) return 'existing_image';
  if (!trialUsed) return 'trial';
  return 'reward_required';
}

export function readRefinementTrialUsed(storage: Pick<Storage, 'getItem'> | null): boolean {
  if (!storage) return false;
  try {
    return storage.getItem(REFINEMENT_TRIAL_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeRefinementTrialUsed(storage: Pick<Storage, 'setItem'> | null): boolean {
  if (!storage) return false;
  try {
    storage.setItem(REFINEMENT_TRIAL_STORAGE_KEY, '1');
    return true;
  } catch {
    return false;
  }
}
