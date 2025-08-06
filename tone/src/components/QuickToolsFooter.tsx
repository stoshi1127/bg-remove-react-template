/**
 * QuickToolsフッターコンポーネント
 * ブランド統一されたフッター
 */

'use client';

import React from 'react';
import styles from './QuickToolsFooter.module.css';
import { QUICKTOOLS_SERVICES, QUICKTOOLS_BRAND, trackServiceNavigation } from '../utils/quickToolsIntegration';

interface QuickToolsFooterProps {
  className?: string;
}

const QuickToolsFooter: React.FC<QuickToolsFooterProps> = ({
  className = '',
}) => {
  const currentYear = new Date().getFullYear();

  const handleServiceNavigation = (serviceName: string, serviceUrl: string) => {
    trackServiceNavigation('tone', serviceName.toLowerCase().replace(' ', '-'));
    window.open(serviceUrl, '_blank', 'noopener,noreferrer');
  };

  const supportLinks = [
    { name: 'ヘルプ', href: QUICKTOOLS_BRAND.support.help },
    { name: 'お問い合わせ', href: QUICKTOOLS_BRAND.support.contact },
    { name: 'プライバシーポリシー', href: QUICKTOOLS_BRAND.support.privacy },
    { name: '利用規約', href: QUICKTOOLS_BRAND.support.terms },
  ];

  return (
    <footer className={`${styles.footer} ${className}`} role="contentinfo">
      <div className={styles.container}>
        <div className={styles.content}>
          {/* Brand Section */}
          <div className={styles.brandSection}>
            <div className={styles.logo}>
              <svg
                className={styles.logoIcon}
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <rect width="32" height="32" rx="8" fill="url(#footerGradient)" />
                <path
                  d="M8 12h16M8 16h16M8 20h12"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="footerGradient" x1="0" y1="0" x2="32" y2="32">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#1d4ed8" />
                  </linearGradient>
                </defs>
              </svg>
              <span className={styles.brandName}>QuickTools</span>
            </div>
            <p className={styles.brandDescription}>
              {QUICKTOOLS_BRAND.tagline}
            </p>
          </div>

          {/* Tools Links */}
          <div className={styles.linkSection}>
            <h3 className={styles.linkSectionTitle}>ツール</h3>
            <ul className={styles.linkList} role="list">
              {QUICKTOOLS_SERVICES.map((service) => (
                <li key={service.id}>
                  <button
                    type="button"
                    onClick={() => handleServiceNavigation(service.name, service.url)}
                    className={styles.link}
                    aria-label={`${service.name}ツールに移動`}
                  >
                    {service.icon} {service.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div className={styles.linkSection}>
            <h3 className={styles.linkSectionTitle}>サポート</h3>
            <ul className={styles.linkList} role="list">
              {supportLinks.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className={styles.link}
                    aria-label={`${link.name}ページに移動`}
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Social Links */}
          <div className={styles.linkSection}>
            <h3 className={styles.linkSectionTitle}>フォロー</h3>
            <div className={styles.socialLinks}>
              <a
                href={QUICKTOOLS_BRAND.social.twitter}
                className={styles.socialLink}
                aria-label="TwitterでQuickToolsをフォロー"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg
                  className={styles.socialIcon}
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </a>
              <a
                href={QUICKTOOLS_BRAND.social.github}
                className={styles.socialLink}
                aria-label="GitHubでQuickToolsをフォロー"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg
                  className={styles.socialIcon}
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    clipRule="evenodd"
                  />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className={styles.copyright}>
          <p className={styles.copyrightText}>
            © {currentYear} {QUICKTOOLS_BRAND.name}. All rights reserved.
          </p>
          <p className={styles.madeWith}>
            Made with{' '}
            <span className={styles.heart} aria-label="love">
              ❤️
            </span>{' '}
            for creators
          </p>
        </div>
      </div>
    </footer>
  );
};

export default QuickToolsFooter;