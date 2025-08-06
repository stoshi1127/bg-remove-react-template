/**
 * QuickToolsヘッダーコンポーネント
 * ブランドロゴとナビゲーションリンクを含む統一されたヘッダー
 */

'use client';

import React from 'react';
import Link from 'next/link';
import styles from './QuickToolsHeader.module.css';
import { getOtherServices, trackServiceNavigation, QUICKTOOLS_BRAND } from '../utils/quickToolsIntegration';

interface QuickToolsHeaderProps {
  currentTool?: string;
  className?: string;
}

const QuickToolsHeader: React.FC<QuickToolsHeaderProps> = ({
  currentTool = 'EasyTone',
  className = '',
}) => {
  const otherServices = getOtherServices('tone');
  
  const handleServiceNavigation = (serviceName: string, serviceUrl: string) => {
    trackServiceNavigation('tone', serviceName.toLowerCase().replace(' ', '-'));
    window.open(serviceUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <header className={`${styles.header} ${className}`} role="banner">
      <div className={styles.container}>
        {/* QuickTools Logo */}
        <div className={styles.logoSection}>
          <Link 
            href={QUICKTOOLS_BRAND.homeUrl} 
            className={styles.logoLink}
            aria-label="QuickTools ホームページに戻る"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className={styles.logo}>
              <svg
                className={styles.logoIcon}
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <rect width="32" height="32" rx="8" fill="url(#gradient)" />
                <path
                  d="M8 12h16M8 16h16M8 20h12"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="gradient" x1="0" y1="0" x2="32" y2="32">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#1d4ed8" />
                  </linearGradient>
                </defs>
              </svg>
              <div className={styles.logoText}>
                <span className={styles.brandName}>QuickTools</span>
                <span className={styles.currentTool}>{currentTool}</span>
              </div>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className={styles.navigation} role="navigation" aria-label="QuickToolsナビゲーション">
          <div className={styles.navDropdown}>
            <button
              type="button"
              className={styles.navToggle}
              aria-expanded="false"
              aria-haspopup="true"
              aria-label="他のツールを表示"
            >
              <span className={styles.navToggleText}>他のツール</span>
              <svg
                className={styles.navToggleIcon}
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
            
            <div className={styles.navDropdownMenu} role="menu">
              {otherServices.map((service) => (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => handleServiceNavigation(service.name, service.url)}
                  className={styles.navDropdownItem}
                  role="menuitem"
                >
                  <div className={styles.navDropdownItemContent}>
                    <span className={styles.navDropdownItemName}>
                      {service.icon} {service.name}
                    </span>
                    <span className={styles.navDropdownItemDescription}>
                      {service.description}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            className={styles.mobileMenuButton}
            aria-expanded="false"
            aria-label="メニューを開く"
          >
            <svg
              className={styles.mobileMenuIcon}
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
        </nav>
      </div>

      {/* Mobile Navigation Menu */}
      <div className={styles.mobileNav} role="navigation" aria-label="モバイルナビゲーション">
        <div className={styles.mobileNavContent}>
          <div className={styles.mobileNavHeader}>
            <span className={styles.mobileNavTitle}>QuickTools</span>
            <button
              type="button"
              className={styles.mobileNavClose}
              aria-label="メニューを閉じる"
            >
              <svg
                className={styles.mobileNavCloseIcon}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          
          <div className={styles.mobileNavLinks}>
            {otherServices.map((service) => (
              <button
                key={service.id}
                type="button"
                onClick={() => handleServiceNavigation(service.name, service.url)}
                className={styles.mobileNavLink}
              >
                <div className={styles.mobileNavLinkContent}>
                  <span className={styles.mobileNavLinkName}>
                    {service.icon} {service.name}
                  </span>
                  <span className={styles.mobileNavLinkDescription}>
                    {service.description}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
};

export default QuickToolsHeader;