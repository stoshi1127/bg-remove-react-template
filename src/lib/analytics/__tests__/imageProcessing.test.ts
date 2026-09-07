import {
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
});
