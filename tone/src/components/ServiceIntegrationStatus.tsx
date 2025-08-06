/**
 * サービス統合状態表示コンポーネント
 * QuickToolsサービス間の統合状態を表示
 */

import React, { useEffect, useState } from 'react';
import styles from './ServiceIntegrationStatus.module.css';
import { checkServiceIntegration } from '../utils/quickToolsIntegration';

interface ServiceIntegrationStatusProps {
  className?: string;
  showDetails?: boolean;
}

const ServiceIntegrationStatus: React.FC<ServiceIntegrationStatusProps> = ({
  className = '',
  showDetails = false,
}) => {
  const [integrationStatus, setIntegrationStatus] = useState<{
    isIntegrated: boolean;
    availableServices: Array<{
      id: string;
      name: string;
      icon: string;
    }>;
    errors: string[];
  } | null>(null);

  useEffect(() => {
    const status = checkServiceIntegration();
    setIntegrationStatus(status);
  }, []);

  if (!integrationStatus) {
    return null;
  }

  const { isIntegrated, availableServices, errors } = integrationStatus;

  return (
    <div className={`${styles.container} ${className}`}>
      <div className={styles.statusIndicator}>
        <div className={`${styles.statusIcon} ${isIntegrated ? styles.integrated : styles.error}`}>
          {isIntegrated ? (
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M13.5 4.5L6 12L2.5 8.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M12 4L4 12M4 4L12 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
        <span className={styles.statusText}>
          {isIntegrated 
            ? `QuickTools統合 (${availableServices.length}サービス利用可能)`
            : 'QuickTools統合エラー'
          }
        </span>
      </div>

      {showDetails && (
        <div className={styles.details}>
          {errors.length > 0 && (
            <div className={styles.errorList}>
              <h4 className={styles.errorTitle}>統合エラー:</h4>
              <ul className={styles.errors}>
                {errors.map((error, index) => (
                  <li key={index} className={styles.error}>
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {availableServices.length > 0 && (
            <div className={styles.serviceList}>
              <h4 className={styles.serviceTitle}>利用可能なサービス:</h4>
              <ul className={styles.services}>
                {availableServices.map((service) => (
                  <li key={service.id} className={styles.service}>
                    {service.icon} {service.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ServiceIntegrationStatus;