export type ProcessingType =
  | 'background_remove'
  | 'background_composite'
  | 'background_blend'
  | 'ai_background';

export type ProcessingResultStatus = 'success' | 'partial_success' | 'failure';

export function getProcessingType({
  backgroundMode,
  hasSelectedTemplate,
  blendEnabled,
}: {
  backgroundMode: 'normal' | 'ai_generate';
  hasSelectedTemplate: boolean;
  blendEnabled: boolean;
}): ProcessingType {
  if (backgroundMode === 'ai_generate') return 'ai_background';
  if (!hasSelectedTemplate) return 'background_remove';
  return blendEnabled ? 'background_blend' : 'background_composite';
}

export function getProcessingResultStatus(
  successCount: number,
  failureCount: number,
): ProcessingResultStatus {
  if (failureCount === 0) return 'success';
  return successCount > 0 ? 'partial_success' : 'failure';
}
