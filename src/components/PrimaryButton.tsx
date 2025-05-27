import React from "react";

type PrimaryButtonProps = {
  children: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  className?: string;
  variant?: "primary" | "outline";
  size?: "sm" | "md" | "lg";
};

const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  children,
  onClick,
  disabled = false,
  type = "button",
  className = "",
  variant = "primary",
  size,
}) => {
  const base =
    "w-full rounded-lg font-bold shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 ease-in-out transform hover:scale-105 active:scale-100";
  const primary =
    "text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed";
  const outline =
    "border border-blue-600 text-blue-600 bg-white hover:bg-blue-50 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed";

  const sizeClasses = size === 'sm' ? 'py-1.5 px-3 text-sm' : size === 'lg' ? 'py-4 px-8 text-lg' : 'py-3.5 px-4 text-base';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variant === "primary" ? primary : outline} ${sizeClasses} ${className}`}
    >
      {children}
    </button>
  );
};

export default PrimaryButton; 