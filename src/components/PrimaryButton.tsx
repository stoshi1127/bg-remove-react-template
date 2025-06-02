import React from "react";

type PrimaryButtonProps = {
  children: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  className?: string;
  variant?: "primary" | "outline";
  size?: "sm" | "md" | "lg";
  colorVariant?: 'blue' | 'purple';
};

const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  children,
  onClick,
  disabled = false,
  type = "button",
  className = "",
  variant = "primary",
  size,
  colorVariant = 'blue'
}) => {
  const base =
    "w-full rounded-lg font-bold shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 ease-in-out transform hover:scale-105 active:scale-100";
  
  const getVariantClasses = () => {
    if (colorVariant === 'purple') {
      return {
        primary: "text-white bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 focus:ring-purple-500 disabled:opacity-60 disabled:cursor-not-allowed",
        outline: "border border-purple-600 text-purple-600 bg-white hover:bg-purple-50 focus:ring-purple-500 disabled:opacity-60 disabled:cursor-not-allowed"
      };
    }
    // デフォルトはブルー系
    return {
      primary: "text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed",
      outline: "border border-blue-600 text-blue-600 bg-white hover:bg-blue-50 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
    };
  };

  const variantClasses = getVariantClasses();
  const sizeClasses = size === 'sm' ? 'py-1.5 px-3 text-sm' : size === 'lg' ? 'py-4 px-8 text-lg' : 'py-3.5 px-4 text-base';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variant === "primary" ? variantClasses.primary : variantClasses.outline} ${sizeClasses} ${className}`}
    >
      {children}
    </button>
  );
};

export default PrimaryButton; 