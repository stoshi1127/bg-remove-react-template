import React from "react";

type GuideCardProps = {
  title: string;
  icon: React.ReactNode;
  color?: string; // アイコン背景色
  className?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

const GuideCard: React.FC<GuideCardProps> = ({ 
  title, 
  icon, 
  className = "", 
  children, 
  footer 
}) => (
  <div className={`bg-white p-6 rounded-xl shadow-soft border border-gray-100 hover:shadow-medium transition-shadow duration-200 ${className}`}>
    <div className="flex items-start mb-4">
      <div className="mr-4 flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1">
        <h3 className="text-xl font-semibold text-gray-900 mb-3">
          {title}
        </h3>
        <div className="text-gray-600 leading-relaxed mb-4">
          {children}
        </div>
        {footer && (
          <div className="pt-3 border-t border-gray-100">
            <div className="text-sm">
              {footer}
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
);

export default GuideCard; 