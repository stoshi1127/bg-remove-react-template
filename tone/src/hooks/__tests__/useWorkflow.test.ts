/**
 * useWorkflowフックのテスト
 */

import { renderHook, act } from '@testing-library/react';
import { useWorkflow } from '../useWorkflow';

describe('useWorkflow', () => {
  it('should initialize with upload step and no completed steps', () => {
    const { result } = renderHook(() => useWorkflow());

    expect(result.current.currentStep).toBe('upload');
    expect(result.current.completedSteps).toEqual([]);
  });

  it('should allow proceeding to upload step initially', () => {
    const { result } = renderHook(() => useWorkflow());

    expect(result.current.canProceedToStep('upload')).toBe(true);
    expect(result.current.canProceedToStep('preset')).toBe(false);
    expect(result.current.canProceedToStep('download')).toBe(false);
  });

  it('should complete steps and update completed steps array', () => {
    const { result } = renderHook(() => useWorkflow());

    act(() => {
      result.current.completeStep('upload');
    });

    expect(result.current.completedSteps).toContain('upload');
    expect(result.current.canProceedToStep('preset')).toBe(true);
  });

  it('should not add duplicate completed steps', () => {
    const { result } = renderHook(() => useWorkflow());

    act(() => {
      result.current.completeStep('upload');
      result.current.completeStep('upload');
    });

    expect(result.current.completedSteps).toEqual(['upload']);
  });

  it('should allow going to next step when conditions are met', () => {
    const { result } = renderHook(() => useWorkflow());

    act(() => {
      result.current.completeStep('upload');
    });

    act(() => {
      result.current.nextStep();
    });

    expect(result.current.currentStep).toBe('preset');
  });

  it('should not proceed to next step if conditions are not met', () => {
    const { result } = renderHook(() => useWorkflow());

    act(() => {
      result.current.nextStep();
    });

    expect(result.current.currentStep).toBe('upload');
  });

  it('should allow going to previous step', () => {
    const { result } = renderHook(() => useWorkflow());

    act(() => {
      result.current.completeStep('upload');
      result.current.goToStep('preset');
      result.current.previousStep();
    });

    expect(result.current.currentStep).toBe('upload');
  });

  it('should not go to previous step from upload', () => {
    const { result } = renderHook(() => useWorkflow());

    act(() => {
      result.current.previousStep();
    });

    expect(result.current.currentStep).toBe('upload');
  });

  it('should allow direct navigation to available steps', () => {
    const { result } = renderHook(() => useWorkflow());

    act(() => {
      result.current.completeStep('upload');
    });

    act(() => {
      result.current.goToStep('preset');
    });

    expect(result.current.currentStep).toBe('preset');
  });

  it('should not allow direct navigation to unavailable steps', () => {
    const { result } = renderHook(() => useWorkflow());

    act(() => {
      result.current.goToStep('download');
    });

    expect(result.current.currentStep).toBe('upload');
  });

  it('should reset workflow to initial state', () => {
    const { result } = renderHook(() => useWorkflow());

    act(() => {
      result.current.completeStep('upload');
      result.current.completeStep('preset');
      result.current.goToStep('download');
      result.current.resetWorkflow();
    });

    expect(result.current.currentStep).toBe('upload');
    expect(result.current.completedSteps).toEqual([]);
  });

  it('should handle complete workflow progression', () => {
    const { result } = renderHook(() => useWorkflow());

    // Complete upload step
    act(() => {
      result.current.completeStep('upload');
    });

    act(() => {
      result.current.nextStep();
    });

    expect(result.current.currentStep).toBe('preset');
    expect(result.current.canProceedToStep('download')).toBe(false);

    // Complete preset step
    act(() => {
      result.current.completeStep('preset');
    });

    act(() => {
      result.current.nextStep();
    });

    expect(result.current.currentStep).toBe('download');
    expect(result.current.canProceedToStep('download')).toBe(true);

    // Try to go beyond last step
    act(() => {
      result.current.nextStep();
    });

    expect(result.current.currentStep).toBe('download');
  });

  it('should validate step progression logic', () => {
    const { result } = renderHook(() => useWorkflow());

    // Upload completed, can proceed to preset
    act(() => {
      result.current.completeStep('upload');
    });

    expect(result.current.canProceedToStep('upload')).toBe(true);
    expect(result.current.canProceedToStep('preset')).toBe(true);
    expect(result.current.canProceedToStep('download')).toBe(false);

    // Both upload and preset completed, can proceed to download
    act(() => {
      result.current.completeStep('preset');
    });

    expect(result.current.canProceedToStep('upload')).toBe(true);
    expect(result.current.canProceedToStep('preset')).toBe(true);
    expect(result.current.canProceedToStep('download')).toBe(true);
  });
});