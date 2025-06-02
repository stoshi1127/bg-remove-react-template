import React from "react";

type GuideCardProps = {
  title: string;
  icon: React.ReactNode;
  color?: string; // アイコン背景色
  className?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

const GuideCard: React.FC<GuideCardProps> = ({ title, icon, color = "bg-blue-50", className = "", children, footer }) => (
  <div className={`bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] group ${className}`}>
    <div className="flex flex-col sm:flex-row items-start sm:items-center mb-4 sm:mb-6">
      <div className={`${color} p-3 sm:p-4 rounded-xl mb-4 sm:mb-0 sm:mr-4 lg:mr-6 group-hover:scale-110 transition-transform duration-300`}>
        {icon}
      </div>
      <h3 className="text-lg sm:text-xl font-semibold text-slate-800 group-hover:text-blue-600 transition-colors duration-300">{title}</h3>
    </div>
    <div className="text-sm sm:text-base text-slate-700 leading-relaxed mb-4">{children}</div>
    {footer && (
      <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-slate-100">
        <div className="text-xs sm:text-sm text-slate-600 font-medium">{footer}</div>
      </div>
    )}
  </div>
);

export default GuideCard; 