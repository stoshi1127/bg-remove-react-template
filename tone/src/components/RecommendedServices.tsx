/**
 * 推奨サービスコンポーネント
 * EasyTone使用後に推奨される他のQuickToolsサービスを表示
 */

import React from 'react';
import styles from './RecommendedServices.module.css';
import { getRecommendedWorkflow, trackServiceNavigation, shareImageWithService } from '../utils/quickToolsIntegration';
import { ImageMetadata } from '../types/processing';

interface RecommendedServicesProps {
  className?: string;
  onServiceSelect?: (serviceId: string) => void;
  processedImages?: Array<{
    id: string;
    url: string;
    name: string;
    metadata?: ImageMetadata;
  }>;
}

const RecommendedServices: React.FC<RecommendedServicesProps> = ({
  className = '',
  onServiceSelect,
  processedImages = [],
}) => {
  const recommendedServices = getRecommendedWorkflow('tone');

  const handleServiceClick = (serviceId: string, serviceUrl: string) => {
    trackServiceNavigation('tone', serviceId);
    onServiceSelect?.(serviceId);
    
    // 処理済み画像がある場合は、最初の画像を共有
    if (processedImages.length > 0) {
      try {
        const sharedUrl = shareImageWithService(serviceId, processedImages[0]);
        window.open(sharedUrl, '_blank', 'noopener,noreferrer');
      } catch (error) {
        console.warn('Failed to share image with service:', error);
        window.open(serviceUrl, '_blank', 'noopener,noreferrer');
      }
    } else {
      window.open(serviceUrl, '_blank', 'noopener,noreferrer');
    }
  };

  if (recommendedServices.length === 0) {
    return null;
  }

  return (
    <div className={`${styles.container} ${className}`}>
      <div className={styles.header}>
        <h3 className={styles.title}>次におすすめのツール</h3>
        <p className={styles.description}>
          画像処理を続けて、さらにプロフェッショナルな仕上がりに
        </p>
      </div>

      <div className={styles.serviceGrid}>
        {recommendedServices.map((service) => (
          <button
            key={service.id}
            type="button"
            onClick={() => handleServiceClick(service.id, service.url)}
            className={styles.serviceCard}
            aria-label={`${service.name}ツールを開く`}
          >
            <div className={styles.serviceIcon}>
              {service.icon}
            </div>
            <div className={styles.serviceContent}>
              <h4 className={styles.serviceName}>{service.name}</h4>
              <p className={styles.serviceDescription}>{service.description}</p>
            </div>
            <div className={styles.serviceArrow}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M6 12L10 8L6 4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </button>
        ))}
      </div>

      <div className={styles.footer}>
        <p className={styles.footerText}>
          すべてのツールは無料で、ブラウザ上で完結します
        </p>
      </div>
    </div>
  );
};

export default RecommendedServices;