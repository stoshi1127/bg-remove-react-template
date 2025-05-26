import React from "react";

type RatioButtonProps = {
  selected?: boolean;
  children: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  className?: string;
};

const RatioButton: React.FC<RatioButtonProps> = ({ selected = false, children, onClick, className = "" }) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-4 py-2 rounded-lg font-medium border transition-colors duration-150 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 ${
      selected
        ? "bg-blue-600 text-white border-blue-600 shadow"
        : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-blue-50"
    } ${className}`}
  >
    {children}
  </button>
);

export default RatioButton; 