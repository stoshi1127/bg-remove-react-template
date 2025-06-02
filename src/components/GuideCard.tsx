import React from "react";

type GuideCardProps = {
  title: string;
  icon: React.ReactNode;
  color?: string; // アイコン背景色
  className?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

const GuideCard: React.FC<GuideCardProps> = ({ title, icon, color = "bg-blue-100", className = "", children, footer }) => (
  <div className={`bg-white p-6 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow ${className}`}>
    <div className="flex items-center mb-4">
      <div className={`${color} p-3 rounded-full mr-4`}>{icon}</div>
      <h3 className="text-xl font-semibold">{title}</h3>
    </div>
    <div className="text-gray-700">{children}</div>
    {footer && <div className="mt-4 text-sm text-gray-500">{footer}</div>}
  </div>
);

export default GuideCard; 