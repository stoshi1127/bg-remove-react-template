/**
 * メインワークフローコンテナコンポーネント
 */

import React from 'react';
import { WorkflowStep } from '../types/workflow';
import { useWorkflow } from '../hooks/useWorkflow';
import WorkflowSteps from './WorkflowSteps';
import styles from './WorkflowContainer.module.css';

interface WorkflowContainerProps {
  children: (workflowProps: {
    currentStep: WorkflowStep;
    completedSteps: WorkflowStep[];
    completeStep: (step: WorkflowStep) => void;
    goToStep: (step: WorkflowStep) => void;
    nextStep: () => void;
    previousStep: () => void;
    resetWorkflow: () => void;
    canProceedToStep: (step: WorkflowStep) => boolean;
    validateStepData: (step: WorkflowStep, data?: unknown) => boolean;
  }) => React.ReactNode;
  className?: string;
}

const WorkflowContainer: React.FC<WorkflowContainerProps> = ({
  children,
  className = '',
}) => {
  const workflowProps = useWorkflow();

  return (
    <div className={`${styles.workflowContainer} ${className}`}>
      <header className={styles.header}>
        <h1 className={styles.title}>EasyTone</h1>
        <p className={styles.subtitle}>
          3ステップで簡単に画像にプロのようなトーンを適用
        </p>
      </header>

      <div className={styles.stepsContainer}>
        <WorkflowSteps
          currentStep={workflowProps.currentStep}
          completedSteps={workflowProps.completedSteps}
          onStepClick={workflowProps.goToStep}
          canProceedToStep={workflowProps.canProceedToStep}
        />
      </div>

      <main className={styles.content} role="main">
        {children(workflowProps)}
      </main>

      <div className={styles.navigation}>
        <button
          type="button"
          onClick={workflowProps.previousStep}
          disabled={workflowProps.currentStep === 'upload'}
          className={`${styles.navButton} ${styles.previousButton}`}
          aria-label="前のステップに戻る"
        >
          <svg
            className={styles.navIcon}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          前へ
        </button>

        <button
          type="button"
          onClick={workflowProps.nextStep}
          disabled={
            workflowProps.currentStep === 'download' ||
            !workflowProps.canProceedToStep(
              workflowProps.currentStep === 'upload'
                ? 'preset'
                : workflowProps.currentStep === 'preset'
                ? 'download'
                : 'download'
            )
          }
          className={`${styles.navButton} ${styles.nextButton}`}
          aria-label="次のステップに進む"
        >
          次へ
          <svg
            className={styles.navIcon}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default WorkflowContainer;