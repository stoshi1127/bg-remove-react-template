/**
 * ワークフローステップ表示コンポーネント
 */

import React from 'react';
import { WorkflowStep } from '../types/workflow';
import { WORKFLOW_STEPS } from '../types/workflow';
import styles from './WorkflowSteps.module.css';

interface WorkflowStepsProps {
  currentStep: WorkflowStep;
  completedSteps: WorkflowStep[];
  onStepClick?: (step: WorkflowStep) => void;
  canProceedToStep: (step: WorkflowStep) => boolean;
}

const WorkflowSteps: React.FC<WorkflowStepsProps> = ({
  currentStep,
  completedSteps,
  onStepClick,
  canProceedToStep,
}) => {
  const getStepStatus = (stepId: WorkflowStep) => {
    if (completedSteps.includes(stepId)) {
      return 'completed';
    }
    if (stepId === currentStep) {
      return 'current';
    }
    if (canProceedToStep(stepId)) {
      return 'available';
    }
    return 'disabled';
  };

  const handleStepClick = (stepId: WorkflowStep) => {
    if (onStepClick && canProceedToStep(stepId)) {
      onStepClick(stepId);
    }
  };

  return (
    <div className={styles.workflowSteps} role="navigation" aria-label="ワークフローステップ">
      <ol className={styles.stepsList}>
        {WORKFLOW_STEPS.map((step, index) => {
          const status = getStepStatus(step.id);
          const isClickable = canProceedToStep(step.id) && onStepClick;
          
          return (
            <li key={step.id} className={styles.stepItem}>
              <div
                className={`${styles.step} ${styles[status]} ${isClickable ? styles.clickable : ''}`}
                onClick={() => handleStepClick(step.id)}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && isClickable) {
                    e.preventDefault();
                    handleStepClick(step.id);
                  }
                }}
                tabIndex={isClickable ? 0 : -1}
                role={isClickable ? 'button' : undefined}
                aria-current={step.id === currentStep ? 'step' : undefined}
                aria-label={`ステップ ${step.stepNumber}: ${step.title}${status === 'completed' ? ' (完了)' : status === 'current' ? ' (現在のステップ)' : ''}`}
              >
                <div className={styles.stepNumber}>
                  {status === 'completed' ? (
                    <svg
                      className={styles.checkIcon}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <span>{step.stepNumber}</span>
                  )}
                </div>
                <div className={styles.stepContent}>
                  <h3 className={styles.stepTitle}>{step.title}</h3>
                  <p className={styles.stepDescription}>{step.description}</p>
                </div>
              </div>
              {index < WORKFLOW_STEPS.length - 1 && (
                <div className={styles.stepConnector} aria-hidden="true" />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export default WorkflowSteps;