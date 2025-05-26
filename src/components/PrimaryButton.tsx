import React from "react";

type PrimaryButtonProps = {
  children: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  className?: string;
  variant?: "primary" | "outline";
};

const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  children,
  onClick,
  disabled = false,
  type = "button",
  className = "",
  variant = "primary",
}) => {
  const base =
    "w-full py-3.5 px-4 rounded-lg font-bold shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 ease-in-out transform hover:scale-105 active:scale-100 text-base";
  const primary =
    "text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed";
  const outline =
    "border border-blue-600 text-blue-600 bg-white hover:bg-blue-50 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variant === "primary" ? primary : outline} ${className}`}
    >
      {children}
    </button>
  );
};

export default PrimaryButton; 