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
  <div className={`bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-xl border border-white/50 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] group ${className}`}>
    <div className="flex items-center mb-6">
      <div className={`${color} p-4 rounded-2xl mr-6 group-hover:scale-110 transition-transform duration-300`}>
        {icon}
      </div>
      <h3 className="text-xl font-bold text-gray-800 group-hover:text-blue-600 transition-colors duration-300">{title}</h3>
    </div>
    <div className="text-gray-700 leading-relaxed mb-4">{children}</div>
    {footer && (
      <div className="mt-6 pt-4 border-t border-gray-100">
        <div className="text-sm text-gray-600 font-medium">{footer}</div>
      </div>
    )}
  </div>
);

export default GuideCard; 