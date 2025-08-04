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

  const validateStepData = useCallback((step: WorkflowStep, data?: unknown): boolean => {
    switch (step) {
      case 'upload':
        // アップロードステップでは画像データが必要
        return Array.isArray(data) && data.length > 0;
      case 'preset':
        // プリセット選択ステップではプリセットオブジェクトが必要
        return data !== null && typeof data === 'object';
      case 'download':
        // ダウンロードステップでは処理済み画像データが必要
        return Array.isArray(data) && data.length > 0;
      default:
        return false;
    }
  }, []);

  const completeStep = useCallback((step: WorkflowStep) => {
    setCompletedSteps(prev => {
      if (!prev.includes(step)) {
        const newCompletedSteps = [...prev, step];
        
        // 自動的に次のステップに進む
        const stepOrder: WorkflowStep[] = ['upload', 'preset', 'download'];
        const currentIndex = stepOrder.indexOf(step);
        
        if (currentIndex < stepOrder.length - 1) {
          const nextStepValue = stepOrder[currentIndex + 1];
          // 次のステップに進む条件をチェック
          let canProceedToNext = false;
          
          switch (nextStepValue) {
            case 'preset':
              canProceedToNext = newCompletedSteps.includes('upload');
              break;
            case 'download':
              canProceedToNext = newCompletedSteps.includes('upload') && newCompletedSteps.includes('preset');
              break;
          }
          
          if (canProceedToNext) {
            // 少し遅延を入れてスムーズな遷移を実現
            setTimeout(() => {
              setCurrentStep(nextStepValue);
            }, 300);
          }
        }
        
        return newCompletedSteps;
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
    validateStepData,
  };
};