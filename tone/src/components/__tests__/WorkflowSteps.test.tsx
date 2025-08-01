/**
 * WorkflowStepsコンポーネントのテスト
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkflowStep } from '../../types/workflow';
import WorkflowSteps from '../WorkflowSteps';

describe('WorkflowSteps', () => {
  const mockCanProceedToStep = jest.fn();
  const mockOnStepClick = jest.fn();

  const defaultProps = {
    currentStep: 'upload' as WorkflowStep,
    completedSteps: [] as WorkflowStep[],
    canProceedToStep: mockCanProceedToStep,
    onStepClick: mockOnStepClick,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCanProceedToStep.mockImplementation((step: WorkflowStep) => {
      switch (step) {
        case 'upload':
          return true;
        case 'preset':
          return defaultProps.completedSteps.includes('upload');
        case 'download':
          return defaultProps.completedSteps.includes('upload') && defaultProps.completedSteps.includes('preset');
        default:
          return false;
      }
    });
  });

  it('should render all workflow steps', () => {
    render(<WorkflowSteps {...defaultProps} />);

    expect(screen.getByText('画像をアップロード')).toBeInTheDocument();
    expect(screen.getByText('プリセットを選択')).toBeInTheDocument();
    expect(screen.getByText('ダウンロード')).toBeInTheDocument();
  });

  it('should highlight current step', () => {
    render(<WorkflowSteps {...defaultProps} />);

    const uploadStep = screen.getByLabelText(/ステップ 1: 画像をアップロード.*現在のステップ/);
    expect(uploadStep).toBeInTheDocument();
    expect(uploadStep).toHaveAttribute('aria-current', 'step');
  });

  it('should show completed steps with check icon', () => {
    const props = {
      ...defaultProps,
      currentStep: 'preset' as WorkflowStep,
      completedSteps: ['upload'] as WorkflowStep[],
    };

    render(<WorkflowSteps {...props} />);

    const completedStep = screen.getByLabelText(/ステップ 1: 画像をアップロード.*完了/);
    expect(completedStep).toBeInTheDocument();
    
    // Check icon should be present
    const checkIcon = completedStep.querySelector('svg');
    expect(checkIcon).toBeInTheDocument();
  });

  it('should disable unavailable steps', () => {
    render(<WorkflowSteps {...defaultProps} />);

    const presetStep = screen.getByText('プリセットを選択').closest('[role="button"]');
    const downloadStep = screen.getByText('ダウンロード').closest('[role="button"]');

    expect(presetStep).toBeNull(); // Should not be clickable
    expect(downloadStep).toBeNull(); // Should not be clickable
  });

  it('should make available steps clickable', () => {
    const props = {
      ...defaultProps,
      completedSteps: ['upload'] as WorkflowStep[],
    };

    mockCanProceedToStep.mockImplementation((step: WorkflowStep) => {
      return step === 'upload' || step === 'preset';
    });

    render(<WorkflowSteps {...props} />);

    const uploadStep = screen.getByLabelText(/ステップ 1: 画像をアップロード/);
    const presetStep = screen.getByLabelText(/ステップ 2: プリセットを選択/);

    expect(uploadStep).toHaveAttribute('tabIndex', '0');
    expect(presetStep).toHaveAttribute('tabIndex', '0');
  });

  it('should call onStepClick when clicking available step', () => {
    const props = {
      ...defaultProps,
      completedSteps: ['upload'] as WorkflowStep[],
    };

    mockCanProceedToStep.mockImplementation((step: WorkflowStep) => {
      return step === 'upload' || step === 'preset';
    });

    render(<WorkflowSteps {...props} />);

    const presetStep = screen.getByLabelText(/ステップ 2: プリセットを選択/);
    fireEvent.click(presetStep);

    expect(mockOnStepClick).toHaveBeenCalledWith('preset');
  });

  it('should not call onStepClick when clicking unavailable step', () => {
    render(<WorkflowSteps {...defaultProps} />);

    const downloadStepText = screen.getByText('ダウンロード');
    fireEvent.click(downloadStepText);

    expect(mockOnStepClick).not.toHaveBeenCalled();
  });

  it('should handle keyboard navigation', () => {
    const props = {
      ...defaultProps,
      completedSteps: ['upload'] as WorkflowStep[],
    };

    mockCanProceedToStep.mockImplementation((step: WorkflowStep) => {
      return step === 'upload' || step === 'preset';
    });

    render(<WorkflowSteps {...props} />);

    const presetStep = screen.getByLabelText(/ステップ 2: プリセットを選択/);
    
    // Test Enter key
    fireEvent.keyDown(presetStep, { key: 'Enter' });
    expect(mockOnStepClick).toHaveBeenCalledWith('preset');

    // Test Space key
    fireEvent.keyDown(presetStep, { key: ' ' });
    expect(mockOnStepClick).toHaveBeenCalledWith('preset');

    // Test other key (should not trigger)
    fireEvent.keyDown(presetStep, { key: 'Tab' });
    expect(mockOnStepClick).toHaveBeenCalledTimes(2); // Only the previous two calls
  });

  it('should work without onStepClick prop', () => {
    const props = {
      ...defaultProps,
      onStepClick: undefined,
    };

    render(<WorkflowSteps {...props} />);

    const uploadStep = screen.getByText('画像をアップロード');
    expect(() => fireEvent.click(uploadStep)).not.toThrow();
  });

  it('should have proper accessibility attributes', () => {
    render(<WorkflowSteps {...defaultProps} />);

    const navigation = screen.getByRole('navigation');
    expect(navigation).toHaveAttribute('aria-label', 'ワークフローステップ');

    const stepsList = navigation.querySelector('ol');
    expect(stepsList).toBeInTheDocument();
  });

  it('should show step numbers correctly', () => {
    render(<WorkflowSteps {...defaultProps} />);

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should show step descriptions', () => {
    render(<WorkflowSteps {...defaultProps} />);

    expect(screen.getByText('処理したい画像を選択してください')).toBeInTheDocument();
    expect(screen.getByText('お好みのフィルターを選んでください')).toBeInTheDocument();
    expect(screen.getByText('処理済み画像をダウンロードしてください')).toBeInTheDocument();
  });
});