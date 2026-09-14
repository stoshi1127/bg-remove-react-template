import {
  getProcessingFailureReason,
  getProcessingResultStatus,
  getProcessingType,
} from '../imageProcessing';

describe('image processing analytics', () => {
  test.each([
    [{ backgroundMode: 'normal', hasSelectedTemplate: false, blendEnabled: false }, 'background_remove'],
    [{ backgroundMode: 'normal', hasSelectedTemplate: true, blendEnabled: false }, 'background_composite'],
    [{ backgroundMode: 'normal', hasSelectedTemplate: true, blendEnabled: true }, 'background_blend'],
    [{ backgroundMode: 'ai_generate', hasSelectedTemplate: false, blendEnabled: false }, 'ai_background'],
  ] as const)('classifies the processing type', (input, expected) => {
    expect(getProcessingType(input)).toBe(expected);
  });

  test.each([
    [2, 0, 'success'],
    [1, 1, 'partial_success'],
    [0, 2, 'failure'],
  ] as const)('classifies the batch result', (successCount, failureCount, expected) => {
    expect(getProcessingResultStatus(successCount, failureCount)).toBe(expected);
  });

  test.each([
    [new Error('処理タイムアウト'), 'api_request', undefined, 'timeout'],
    [new Error('無料プランの送信上限 4MB を超えています。'), 'client_preparation', undefined, 'input_limit'],
    [new TypeError('Failed to fetch'), 'api_request', undefined, 'network_error'],
    [new Error('upstream failed'), 'api_response', 504, 'http_error'],
    [new Error('画像を読み込めません'), 'post_processing', undefined, 'processing_error'],
  ] as const)('classifies a safe failure reason', (error, stage, status, expected) => {
    expect(getProcessingFailureReason(error, stage, status)).toBe(expected);
  });
});
