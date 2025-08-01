/**
 * ワークフロー管理のためのカスタムフック
 */

import { useState, useCallback } from 'react';
import { WorkflowStep, WorkflowState } from '../types/workflow';

export const useWorkflow = () => {
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('upload');
  const [completedSteps, setCompletedSteps] = useState<WorkflowStep[]>([]);

  const canProceedToStep = useCallback((step: WorkflowStep): boolean => {
    switch (step) {
      case 'upload':
        return true;
      case 'preset':
        return completedSteps.includes('upload');
      case 'download':
        return completedSteps.includes('upload') && completedSteps.includes('preset');
      default:
        return false;
    }
  }, [completedSteps]);

  const completeStep = useCallback((step: WorkflowStep) => {
    setCompletedSteps(prev => {
      if (!prev.includes(step)) {
        return [...prev, step];
      }
      return prev;
    });
  }, []);

  const goToStep = useCallback((step: WorkflowStep) => {
    let canProceed = false;
    switch (step) {
      case 'upload':
        canProceed = true;
        break;
      case 'preset':
        canProceed = completedSteps.includes('upload');
        break;
      case 'download':
        canProceed = completedSteps.includes('upload') && completedSteps.includes('preset');
        break;
    }
    
    if (canProceed) {
      setCurrentStep(step);
    }
  }, [completedSteps]);

  const nextStep = useCallback(() => {
    const stepOrder: WorkflowStep[] = ['upload', 'preset', 'download'];
    const currentIndex = stepOrder.indexOf(currentStep);
    
    if (currentIndex < stepOrder.length - 1) {
      const nextStepValue = stepOrder[currentIndex + 1];
      // Check if we can proceed to the next step based on completed steps
      let canProceed = false;
      switch (nextStepValue) {
        case 'upload':
          canProceed = true;
          break;
        case 'preset':
          canProceed = completedSteps.includes('upload');
          break;
        case 'download':
          canProceed = completedSteps.includes('upload') && completedSteps.includes('preset');
          break;
      }
      
      if (canProceed) {
        setCurrentStep(nextStepValue);
      }
    }
  }, [currentStep, completedSteps]);

  const previousStep = useCallback(() => {
    const stepOrder: WorkflowStep[] = ['upload', 'preset', 'download'];
    const currentIndex = stepOrder.indexOf(currentStep);
    
    if (currentIndex > 0) {
      const prevStepValue = stepOrder[currentIndex - 1];
      setCurrentStep(prevStepValue);
    }
  }, [currentStep]);

  const resetWorkflow = useCallback(() => {
    setCurrentStep('upload');
    setCompletedSteps([]);
  }, []);

  const workflowState: WorkflowState = {
    currentStep,
    completedSteps,
    canProceedToStep,
  };

  return {
    ...workflowState,
    completeStep,
    goToStep,
    nextStep,
    previousStep,
    resetWorkflow,
  };
};