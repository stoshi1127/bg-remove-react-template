/**
 * WorkflowContainerコンポーネントのテスト
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import WorkflowContainer from '../WorkflowContainer';

// useWorkflowフックをモック
jest.mock('../../hooks/useWorkflow', () => ({
  useWorkflow: () => ({
    currentStep: 'upload',
    completedSteps: [],
    completeStep: jest.fn(),
    goToStep: jest.fn(),
    nextStep: jest.fn(),
    previousStep: jest.fn(),
    resetWorkflow: jest.fn(),
    canProceedToStep: jest.fn((step) => step === 'upload'),
  }),
}));

describe('WorkflowContainer', () => {
  const mockChildren = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockChildren.mockReturnValue(<div data-testid="workflow-content">Test Content</div>);
  });

  it('should render header with title and subtitle', () => {
    render(<WorkflowContainer>{mockChildren}</WorkflowContainer>);

    expect(screen.getByText('EasyTone')).toBeInTheDocument();
    expect(screen.getByText('3ステップで簡単に画像にプロのようなトーンを適用')).toBeInTheDocument();
  });

  it('should render workflow steps component', () => {
    render(<WorkflowContainer>{mockChildren}</WorkflowContainer>);

    // WorkflowStepsコンポーネントが含まれていることを確認
    expect(screen.getByRole('navigation', { name: 'ワークフローステップ' })).toBeInTheDocument();
  });

  it('should render children with workflow props', () => {
    render(<WorkflowContainer>{mockChildren}</WorkflowContainer>);

    expect(mockChildren).toHaveBeenCalledWith(
      expect.objectContaining({
        currentStep: 'upload',
        completedSteps: [],
        completeStep: expect.any(Function),
        goToStep: expect.any(Function),
        nextStep: expect.any(Function),
        previousStep: expect.any(Function),
        resetWorkflow: expect.any(Function),
        canProceedToStep: expect.any(Function),
      })
    );

    expect(screen.getByTestId('workflow-content')).toBeInTheDocument();
  });

  it('should render navigation buttons', () => {
    render(<WorkflowContainer>{mockChildren}</WorkflowContainer>);

    const previousButton = screen.getByLabelText('前のステップに戻る');
    const nextButton = screen.getByLabelText('次のステップに進む');

    expect(previousButton).toBeInTheDocument();
    expect(nextButton).toBeInTheDocument();
  });

  it('should disable previous button on first step', () => {
    render(<WorkflowContainer>{mockChildren}</WorkflowContainer>);

    const previousButton = screen.getByLabelText('前のステップに戻る');
    expect(previousButton).toBeDisabled();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <WorkflowContainer className="custom-class">{mockChildren}</WorkflowContainer>
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should have proper semantic structure', () => {
    render(<WorkflowContainer>{mockChildren}</WorkflowContainer>);

    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'ワークフローステップ' })).toBeInTheDocument();
  });

  it('should render navigation icons', () => {
    render(<WorkflowContainer>{mockChildren}</WorkflowContainer>);

    const previousButton = screen.getByLabelText('前のステップに戻る');
    const nextButton = screen.getByLabelText('次のステップに進む');

    // SVGアイコンが含まれていることを確認
    expect(previousButton.querySelector('svg')).toBeInTheDocument();
    expect(nextButton.querySelector('svg')).toBeInTheDocument();
  });
});

// useWorkflowフックの実際の動作をテストするための統合テスト
describe('WorkflowContainer Integration', () => {
  // 実際のuseWorkflowフックを使用
  jest.unmock('../../hooks/useWorkflow');

  const mockChildren = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockChildren.mockReturnValue(<div data-testid="workflow-content">Test Content</div>);
  });

  it('should handle navigation button clicks', () => {
    const mockChildren = jest.fn((props) => {
      return (
        <div>
          <div data-testid="current-step">{props.currentStep}</div>
          <button onClick={() => props.completeStep('upload')}>Complete Upload</button>
        </div>
      );
    });

    render(<WorkflowContainer>{mockChildren}</WorkflowContainer>);

    expect(screen.getByTestId('current-step')).toHaveTextContent('upload');

    // Complete upload step
    fireEvent.click(screen.getByText('Complete Upload'));

    // Try to go to next step
    const nextButton = screen.getByLabelText('次のステップに進む');
    fireEvent.click(nextButton);

    expect(screen.getByTestId('current-step')).toHaveTextContent('preset');
  });

  it('should handle previous button click', () => {
    const mockChildren = jest.fn((props) => {
      return (
        <div>
          <div data-testid="current-step">{props.currentStep}</div>
          <button onClick={() => props.completeStep('upload')}>Complete Upload</button>
          <button onClick={() => props.goToStep('preset')}>Go to Preset</button>
        </div>
      );
    });

    render(<WorkflowContainer>{mockChildren}</WorkflowContainer>);

    // Complete upload and go to preset
    fireEvent.click(screen.getByText('Complete Upload'));
    fireEvent.click(screen.getByText('Go to Preset'));

    expect(screen.getByTestId('current-step')).toHaveTextContent('preset');

    // Go back to previous step
    const previousButton = screen.getByLabelText('前のステップに戻る');
    fireEvent.click(previousButton);

    expect(screen.getByTestId('current-step')).toHaveTextContent('upload');
  });
});