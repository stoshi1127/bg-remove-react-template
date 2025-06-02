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
  <div className={`bg-white p-8 lg:p-10 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] group ${className}`}>
    <div className="flex items-center mb-8">
      <div className={`${color} p-4 rounded-xl mr-6 group-hover:scale-110 transition-transform duration-300 flex-shrink-0`}>
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-slate-800 group-hover:text-blue-600 transition-colors duration-300">{title}</h3>
    </div>
    <div className="text-slate-700 leading-relaxed mb-6">{children}</div>
    {footer && (
      <div className="mt-8 pt-6 border-t border-slate-100">
        <div className="text-sm text-slate-600 font-medium">{footer}</div>
      </div>
    )}
  </div>
);

export default GuideCard; 