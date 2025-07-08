import React from 'react';

type RatioButtonProps = {
  label: string;
  isActive: boolean;
  onClick: () => void;
};

const RatioButton: React.FC<RatioButtonProps> = ({ label, isActive, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        px-4 py-2 text-sm font-semibold rounded-lg border-2 transition-colors
        ${
          isActive
            ? 'bg-blue-600 text-white border-blue-600 shadow'
            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100 hover:border-gray-400'
        }
      `}
    >
      {label}
    </button>
  );
};

export default RatioButton; 