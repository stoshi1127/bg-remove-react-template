/**
 * 再利用可能なローディングスピナーコンポーネント
 */

import React from 'react';
import styles from './LoadingSpinner.module.css';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'secondary' | 'neutral';
  className?: string;
  label?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  color = 'primary',
  className = '',
  label = '読み込み中...',
}) => {
  return (
    <div 
      className={`${styles.container} ${className}`}
      role="status"
      aria-label={label}
    >
      <div 
        className={`${styles.spinner} ${styles[size]} ${styles[color]}`}
        aria-hidden="true"
      />
      <span className={styles.label}>{label}</span>
    </div>
  );
};

export default LoadingSpinner;