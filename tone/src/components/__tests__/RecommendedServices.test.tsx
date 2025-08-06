/**
 * RecommendedServicesコンポーネントのテスト
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import RecommendedServices from '../RecommendedServices';
import * as quickToolsIntegration from '../../utils/quickToolsIntegration';

// Mock the integration utility
jest.mock('../../utils/quickToolsIntegration');

const mockGetRecommendedWorkflow = quickToolsIntegration.getRecommendedWorkflow as jest.MockedFunction<
  typeof quickToolsIntegration.getRecommendedWorkflow
>;

const mockTrackServiceNavigation = quickToolsIntegration.trackServiceNavigation as jest.MockedFunction<
  typeof quickToolsIntegration.trackServiceNavigation
>;

// Mock window.open
const mockWindowOpen = jest.fn();
Object.defineProperty(window, 'open', {
  value: mockWindowOpen,
  writable: true,
});

describe('RecommendedServices', () => {
  const mockServices = [
    {
      id: 'bg-remove',
      name: 'BG Remove',
      description: '背景除去ツール',
      url: 'https://quicktools.example.com/bg-remove',
      icon: '🖼️',
      category: 'image' as const,
      isActive: true,
    },
    {
      id: 'resize',
      name: 'Image Resize',
      description: '画像リサイズツール',
      url: 'https://quicktools.example.com/resize',
      icon: '📏',
      category: 'image' as const,
      isActive: true,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetRecommendedWorkflow.mockReturnValue(mockServices);
  });

  it('should render recommended services', () => {
    render(<RecommendedServices />);

    expect(screen.getByText('次におすすめのツール')).toBeInTheDocument();
    expect(screen.getByText('画像処理を続けて、さらにプロフェッショナルな仕上がりに')).toBeInTheDocument();
    expect(screen.getByText('BG Remove')).toBeInTheDocument();
    expect(screen.getByText('Image Resize')).toBeInTheDocument();
    expect(screen.getByText('背景除去ツール')).toBeInTheDocument();
    expect(screen.getByText('画像リサイズツール')).toBeInTheDocument();
  });

  it('should render footer text', () => {
    render(<RecommendedServices />);

    expect(screen.getByText('すべてのツールは無料で、ブラウザ上で完結します')).toBeInTheDocument();
  });

  it('should handle service click', () => {
    const mockOnServiceSelect = jest.fn();
    render(<RecommendedServices onServiceSelect={mockOnServiceSelect} />);

    const bgRemoveButton = screen.getByLabelText('BG Removeツールを開く');
    fireEvent.click(bgRemoveButton);

    expect(mockTrackServiceNavigation).toHaveBeenCalledWith('tone', 'bg-remove');
    expect(mockOnServiceSelect).toHaveBeenCalledWith('bg-remove');
    expect(mockWindowOpen).toHaveBeenCalledWith(
      'https://quicktools.example.com/bg-remove',
      '_blank',
      'noopener,noreferrer'
    );
  });

  it('should not render when no services are available', () => {
    mockGetRecommendedWorkflow.mockReturnValue([]);
    
    const { container } = render(<RecommendedServices />);
    
    expect(container.firstChild).toBeNull();
  });

  it('should apply custom className', () => {
    const { container } = render(<RecommendedServices className="custom-class" />);
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should have proper accessibility attributes', () => {
    render(<RecommendedServices />);

    const bgRemoveButton = screen.getByLabelText('BG Removeツールを開く');
    expect(bgRemoveButton).toHaveAttribute('type', 'button');
    expect(bgRemoveButton).toHaveAttribute('aria-label', 'BG Removeツールを開く');
  });

  it('should render service icons and arrows', () => {
    render(<RecommendedServices />);

    // Check for service names
    expect(screen.getByText('BG Remove')).toBeInTheDocument();
    expect(screen.getByText('Image Resize')).toBeInTheDocument();

    // Check for arrow icons (SVG elements)
    const arrows = document.querySelectorAll('svg[aria-hidden="true"]');
    expect(arrows.length).toBeGreaterThan(0);
  });

  it('should call getRecommendedWorkflow with correct service ID', () => {
    render(<RecommendedServices />);

    expect(mockGetRecommendedWorkflow).toHaveBeenCalledWith('tone');
  });

  it('should handle service click without onServiceSelect callback', () => {
    render(<RecommendedServices />);

    const bgRemoveButton = screen.getByLabelText('BG Removeツールを開く');
    
    expect(() => fireEvent.click(bgRemoveButton)).not.toThrow();
    expect(mockTrackServiceNavigation).toHaveBeenCalledWith('tone', 'bg-remove');
    expect(mockWindowOpen).toHaveBeenCalledWith(
      'https://quicktools.example.com/bg-remove',
      '_blank',
      'noopener,noreferrer'
    );
  });

  it('should render multiple services in grid layout', () => {
    const manyServices = [
      ...mockServices,
      {
        id: 'compress',
        name: 'Compress',
        description: '画像圧縮ツール',
        url: 'https://quicktools.example.com/compress',
        icon: '📦',
        category: 'utility' as const,
        isActive: true,
      },
    ];
    
    mockGetRecommendedWorkflow.mockReturnValue(manyServices);
    
    render(<RecommendedServices />);

    expect(screen.getByText('BG Remove')).toBeInTheDocument();
    expect(screen.getByText('Image Resize')).toBeInTheDocument();
    expect(screen.getByText('Compress')).toBeInTheDocument();
  });
});