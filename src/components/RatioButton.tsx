import React from "react";

type RatioButtonProps = {
  selected?: boolean;
  children: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  className?: string;
  colorVariant?: 'blue' | 'purple';
};

const RatioButton: React.FC<RatioButtonProps> = ({ 
  selected = false, 
  children, 
  onClick, 
  className = "",
  colorVariant = 'blue'
}) => {
  const getColorClasses = () => {
    if (colorVariant === 'purple') {
      return selected
        ? "bg-purple-600 text-white border-purple-600 shadow"
        : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-purple-50";
    }
    // デフォルトはブルー系
    return selected
      ? "bg-blue-600 text-white border-blue-600 shadow"
      : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-blue-50";
  };

  const getFocusClasses = () => {
    return colorVariant === 'purple' 
      ? "focus:ring-purple-500" 
      : "focus:ring-blue-500";
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-medium border transition-colors duration-150 text-base focus:outline-none focus:ring-2 ${getColorClasses()} ${getFocusClasses()} ${className}`}
    >
      {children}
    </button>
  );
};

export default RatioButton; 