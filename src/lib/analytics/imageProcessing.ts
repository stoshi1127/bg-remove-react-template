export type ProcessingType =
  | 'background_remove'
  | 'background_composite'
  | 'background_blend'
  | 'ai_background';

export type ProcessingResultStatus = 'success' | 'partial_success' | 'failure';

export type ProcessingFailureStage =
  | 'client_preparation'
  | 'input_upload'
  | 'api_request'
  | 'api_response'
  | 'response_parse'
  | 'post_processing'
  | 'unknown';

export type ProcessingFailureReason =
  | 'input_limit'
  | 'timeout'
  | 'http_error'
  | 'network_error'
  | 'processing_error'
  | 'unknown';

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

export function getProcessingFailureReason(
  error: unknown,
  stage: ProcessingFailureStage,
  httpStatus?: number,
): ProcessingFailureReason {
  if (httpStatus !== undefined) return 'http_error';

  const message = error instanceof Error
    ? `${error.name} ${error.message}`
    : typeof error === 'string' ? error : '';

  if (/timeout|timed out|タイムアウト/i.test(message)) return 'timeout';
  if (/送信上限|大きすぎ|最大\d+.*MB|megapixel|pixel limit/i.test(message)) return 'input_limit';
  if (stage === 'api_request' && (error instanceof TypeError || /fetch|network/i.test(message))) {
    return 'network_error';
  }
  if (message) return 'processing_error';
  return 'unknown';
}
