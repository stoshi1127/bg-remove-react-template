/**
 * ワークフロー関連の型定義
 */

export type WorkflowStep = 'upload' | 'preset' | 'download';

export interface WorkflowState {
  currentStep: WorkflowStep;
  completedSteps: WorkflowStep[];
  canProceedToStep: (step: WorkflowStep) => boolean;
}

export interface WorkflowActions {
  completeStep: (step: WorkflowStep) => void;
  goToStep: (step: WorkflowStep) => void;
  nextStep: () => void;
  previousStep: () => void;
  resetWorkflow: () => void;
  validateStepData: (step: WorkflowStep, data?: unknown) => boolean;
}

export interface WorkflowStepInfo {
  id: WorkflowStep;
  title: string;
  description: string;
  stepNumber: number;
}

export const WORKFLOW_STEPS: WorkflowStepInfo[] = [
  {
    id: 'upload',
    title: '画像をアップロード',
    description: '処理したい画像を選択してください',
    stepNumber: 1,
  },
  {
    id: 'preset',
    title: 'プリセットを選択',
    description: 'お好みのフィルターを選んでください',
    stepNumber: 2,
  },
  {
    id: 'download',
    title: 'ダウンロード',
    description: '処理済み画像をダウンロードしてください',
    stepNumber: 3,
  },
];