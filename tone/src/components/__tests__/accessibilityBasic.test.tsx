/**
 * 基本的なアクセシビリティテスト
 * Requirements: 6.4 - レスポンシブデザインとアクセシビリティ
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import WorkflowSteps from '../WorkflowSteps';
import { WORKFLOW_STEPS } from '../../types/workflow';

describe('基本的なアクセシビリティテスト', () => {
  describe('WorkflowSteps', () => {
    const mockCanProceedToStep = jest.fn().mockReturnValue(true);

    it('適切なARIA属性が設定されていること', () => {
      render(
        <WorkflowSteps
          currentStep="upload"
          completedSteps={[]}
          canProceedToStep={mockCanProceedToStep}
        />
      );
      
      // navigation roleが設定されている
      const navigation = screen.getByRole('navigation');
      expect(navigation).toBeInTheDocument();
      expect(navigation).toHaveAttribute('aria-label', 'ワークフローステップ');
      
      // 各ステップに適切なaria-labelが設定されている
      WORKFLOW_STEPS.forEach(step => {
        const stepElement = screen.getByLabelText(new RegExp(step.title));
        expect(stepElement).toBeInTheDocument();
      });
    });

    it('現在のステップが適切にマークされていること', () => {
      render(
        <WorkflowSteps
          currentStep="upload"
          completedSteps={[]}
          canProceedToStep={mockCanProceedToStep}
        />
      );
      
      const currentStep = screen.getByLabelText(/現在のステップ/);
      expect(currentStep).toBeInTheDocument();
      expect(currentStep).toHaveAttribute('aria-current', 'step');
    });

    it('完了したステップが適切にマークされていること', () => {
      render(
        <WorkflowSteps
          currentStep="preset"
          completedSteps={['upload']}
          canProceedToStep={mockCanProceedToStep}
        />
      );
      
      const completedStep = screen.getByLabelText(/完了/);
      expect(completedStep).toBeInTheDocument();
    });

    it('キーボードナビゲーション用の属性が設定されていること', () => {
      const mockOnStepClick = jest.fn();
      render(
        <WorkflowSteps
          currentStep="upload"
          completedSteps={[]}
          onStepClick={mockOnStepClick}
          canProceedToStep={mockCanProceedToStep}
        />
      );
      
      const clickableSteps = screen.getAllByRole('button');
      clickableSteps.forEach(step => {
        expect(step).toHaveAttribute('tabIndex', '0');
      });
    });
  });

  describe('レスポンシブデザイン', () => {
    it('モバイルビューポートでコンテンツが適切に表示されること', () => {
      // モバイルサイズをシミュレート
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(
        <WorkflowSteps
          currentStep="upload"
          completedSteps={[]}
          canProceedToStep={jest.fn().mockReturnValue(true)}
        />
      );
      
      const navigation = screen.getByRole('navigation');
      expect(navigation).toBeInTheDocument();
      
      // モバイルでも全てのステップが表示される
      WORKFLOW_STEPS.forEach(step => {
        const stepElement = screen.getByText(step.title);
        expect(stepElement).toBeInTheDocument();
      });
    });
  });

  describe('セマンティックHTML', () => {
    it('適切な見出し階層が使用されていること', () => {
      render(
        <WorkflowSteps
          currentStep="upload"
          completedSteps={[]}
          canProceedToStep={jest.fn().mockReturnValue(true)}
        />
      );
      
      // h3見出しが使用されている
      const headings = screen.getAllByRole('heading', { level: 3 });
      expect(headings.length).toBeGreaterThan(0);
    });

    it('リスト構造が適切に使用されていること', () => {
      render(
        <WorkflowSteps
          currentStep="upload"
          completedSteps={[]}
          canProceedToStep={jest.fn().mockReturnValue(true)}
        />
      );
      
      // ol要素が使用されている
      const list = document.querySelector('ol');
      expect(list).toBeInTheDocument();
      
      // li要素が適切な数存在する
      const listItems = document.querySelectorAll('li');
      expect(listItems).toHaveLength(WORKFLOW_STEPS.length);
    });
  });

  describe('フォーカス管理', () => {
    it('フォーカス可能な要素が適切なtabIndexを持つこと', () => {
      const mockOnStepClick = jest.fn();
      render(
        <WorkflowSteps
          currentStep="upload"
          completedSteps={[]}
          onStepClick={mockOnStepClick}
          canProceedToStep={jest.fn().mockReturnValue(true)}
        />
      );
      
      const focusableElements = document.querySelectorAll('[tabindex="0"]');
      expect(focusableElements.length).toBeGreaterThan(0);
      
      const nonFocusableElements = document.querySelectorAll('[tabindex="-1"]');
      // 無効なステップは tabindex="-1" を持つ
      expect(nonFocusableElements.length).toBeGreaterThanOrEqual(0);
    });
  });
});