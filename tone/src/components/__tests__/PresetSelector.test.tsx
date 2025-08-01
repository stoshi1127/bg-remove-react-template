import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PresetSelector } from '../PresetSelector';
import { FILTER_PRESETS } from '../../constants/presets';

describe('PresetSelector', () => {
  const mockOnPresetSelect = jest.fn();
  
  const defaultProps = {
    presets: FILTER_PRESETS,
    selectedPreset: null,
    onPresetSelect: mockOnPresetSelect,
  };

  beforeEach(() => {
    mockOnPresetSelect.mockClear();
  });

  describe('Rendering', () => {
    it('should render the component with title and description', () => {
      render(<PresetSelector {...defaultProps} />);
      
      expect(screen.getByText('フィルタープリセットを選択')).toBeInTheDocument();
      expect(screen.getByText(/お好みのスタイルを選んで/)).toBeInTheDocument();
    });

    it('should render all preset options', () => {
      render(<PresetSelector {...defaultProps} />);
      
      // 4つのプリセットが表示されることを確認
      expect(screen.getByText('商品をくっきりと')).toBeInTheDocument();
      expect(screen.getByText('明るくクリアに')).toBeInTheDocument();
      expect(screen.getByText('暖かみのある雰囲気')).toBeInTheDocument();
      expect(screen.getByText('クールで都会的')).toBeInTheDocument();
    });

    it('should render preset icons and descriptions', () => {
      render(<PresetSelector {...defaultProps} />);
      
      // アイコンが表示されることを確認
      expect(screen.getByText('📦')).toBeInTheDocument();
      expect(screen.getByText('✨')).toBeInTheDocument();
      expect(screen.getByText('🌅')).toBeInTheDocument();
      expect(screen.getByText('🏙️')).toBeInTheDocument();
      
      // 説明文が表示されることを確認
      expect(screen.getByText(/コントラストとシャープネス/)).toBeInTheDocument();
      expect(screen.getByText(/清潔感と透明感/)).toBeInTheDocument();
    });
  });

  describe('Selection Behavior', () => {
    it('should call onPresetSelect when a preset is clicked', () => {
      render(<PresetSelector {...defaultProps} />);
      
      const crispProductButton = screen.getByText('商品をくっきりと').closest('button');
      fireEvent.click(crispProductButton!);
      
      expect(mockOnPresetSelect).toHaveBeenCalledWith('crisp-product');
    });

    it('should highlight the selected preset', () => {
      render(
        <PresetSelector 
          {...defaultProps} 
          selectedPreset="bright-clear" 
        />
      );
      
      const selectedButton = screen.getByText('明るくクリアに').closest('button');
      expect(selectedButton).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByText('✓')).toBeInTheDocument();
    });

    it('should not call onPresetSelect when disabled', () => {
      render(<PresetSelector {...defaultProps} disabled={true} />);
      
      const crispProductButton = screen.getByText('商品をくっきりと').closest('button');
      fireEvent.click(crispProductButton!);
      
      expect(mockOnPresetSelect).not.toHaveBeenCalled();
    });

    it('should disable all buttons when disabled prop is true', () => {
      render(<PresetSelector {...defaultProps} disabled={true} />);
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <PresetSelector 
          {...defaultProps} 
          selectedPreset="crisp-product" 
        />
      );
      
      const selectedButton = screen.getByText('商品をくっきりと').closest('button');
      expect(selectedButton).toHaveAttribute('aria-pressed', 'true');
      expect(selectedButton).toHaveAttribute('aria-describedby', 'preset-crisp-product-description');
    });

    it('should have proper description IDs', () => {
      render(<PresetSelector {...defaultProps} />);
      
      expect(screen.getByText(/コントラストとシャープネス/)).toHaveAttribute(
        'id', 
        'preset-crisp-product-description'
      );
    });

    it('should have proper keyboard navigation support', () => {
      render(<PresetSelector {...defaultProps} />);
      
      const firstButton = screen.getByText('商品をくっきりと').closest('button');
      firstButton!.focus();
      
      expect(document.activeElement).toBe(firstButton);
    });
  });

  describe('Requirements Compliance', () => {
    // Requirement 2.1: システムは4つのプリセットオプションを表示する
    it('should display exactly 4 preset options (Requirement 2.1)', () => {
      render(<PresetSelector {...defaultProps} />);
      
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(4);
    });

    // Requirement 2.2-2.5: 各プリセットの適切な表示
    it('should display correct preset names and descriptions (Requirements 2.2-2.5)', () => {
      render(<PresetSelector {...defaultProps} />);
      
      // 商品をくっきりと
      expect(screen.getByText('商品をくっきりと')).toBeInTheDocument();
      expect(screen.getByText(/コントラストとシャープネス/)).toBeInTheDocument();
      
      // 明るくクリアに
      expect(screen.getByText('明るくクリアに')).toBeInTheDocument();
      expect(screen.getByText(/清潔感と透明感/)).toBeInTheDocument();
      
      // 暖かみのある雰囲気
      expect(screen.getByText('暖かみのある雰囲気')).toBeInTheDocument();
      expect(screen.getByText(/暖色系のトーン/)).toBeInTheDocument();
      
      // クールで都会的
      expect(screen.getByText('クールで都会的')).toBeInTheDocument();
      expect(screen.getByText(/寒色系のクール/)).toBeInTheDocument();
    });

    // Requirement 2.6: 手動調整スライダーを提供しない
    it('should not provide manual adjustment sliders (Requirement 2.6)', () => {
      render(<PresetSelector {...defaultProps} />);
      
      // スライダー要素が存在しないことを確認
      expect(screen.queryByRole('slider')).not.toBeInTheDocument();
      expect(screen.queryByText(/手動調整/)).not.toBeInTheDocument();
      expect(screen.queryByText(/スライダー/)).not.toBeInTheDocument();
    });
  });
});