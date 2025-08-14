/**
 * QuickToolsヘッダーコンポーネント
 * ブランドロゴとナビゲーションリンクを含む統一されたヘッダー
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { getOtherServices, trackServiceNavigation, QUICKTOOLS_BRAND } from '../utils/quickToolsIntegration';

interface QuickToolsHeaderProps {
  currentTool?: string;
  className?: string;
}

const QuickToolsHeader: React.FC<QuickToolsHeaderProps> = ({
  currentTool = 'BG Remove',
  className = '',
}) => {
  const otherServices = getOtherServices('bg-remove');
  
  const handleServiceNavigation = (serviceName: string, serviceUrl: string) => {
    trackServiceNavigation('bg-remove', serviceName.toLowerCase().replace(' ', '-'));
    window.open(serviceUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 ${className}`} role="banner">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* QuickTools Logo */}
          <div className="flex items-center space-x-3">
            <Link 
              href={QUICKTOOLS_BRAND.homeUrl} 
              className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
              aria-label="QuickTools ホームページに戻る"
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-white"
                  viewBox="0 0 32 32"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M8 12h16M8 16h16M8 20h12"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-gray-900">QuickTools</span>
                <span className="text-sm text-gray-600">{currentTool}</span>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-6" role="navigation" aria-label="QuickToolsナビゲーション">
            <div className="relative group">
              <button
                type="button"
                className="flex items-center space-x-1 px-3 py-2 text-gray-700 hover:text-blue-600 transition-colors"
                aria-expanded="false"
                aria-haspopup="true"
                aria-label="他のツールを表示"
              >
                <span>他のツール</span>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              
              <div className="absolute top-full right-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200" role="menu">
                <div className="p-2">
                  {otherServices.map((service) => (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => handleServiceNavigation(service.name, service.url)}
                      className="w-full text-left p-3 rounded-md hover:bg-gray-50 transition-colors"
                      role="menuitem"
                    >
                      <div className="flex items-start space-x-3">
                        <span className="text-xl">{service.icon}</span>
                        <div>
                          <div className="font-medium text-gray-900">{service.name}</div>
                          <div className="text-sm text-gray-600">{service.description}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </nav>

          {/* Mobile Menu Button */}
          <button
            type="button"
            className="md:hidden p-2 text-gray-600 hover:text-gray-900"
            aria-expanded="false"
            aria-label="メニューを開く"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
};

export default QuickToolsHeader;