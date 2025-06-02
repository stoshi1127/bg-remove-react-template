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
  <div className={`group relative bg-white/90 backdrop-blur-sm p-8 rounded-3xl shadow-soft border border-gray-100/50 hover:shadow-large transition-all duration-500 ease-out hover:-translate-y-2 ${className}`}>
    {/* 背景グラデーション */}
    <div className="absolute inset-0 bg-gradient-to-br from-white via-gray-50/30 to-gray-100/30 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
    
    {/* 装飾的な要素 */}
    <div className="absolute top-4 right-4 w-20 h-20 bg-gradient-to-br from-indigo-100/30 to-purple-100/30 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-x-4 group-hover:translate-x-0"></div>
    
    <div className="relative z-10">
      <div className="flex items-start mb-6">
        <div className="mr-6 transform group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-indigo-700 transition-colors duration-300">
            {title}
          </h3>
        </div>
      </div>
      
      <div className="text-gray-700 text-lg leading-relaxed mb-6">
        {children}
      </div>
      
      {footer && (
        <div className="mt-6 pt-4 border-t border-gray-200/50">
          <div className="text-sm font-medium">
            {footer}
          </div>
        </div>
      )}
    </div>
    
    {/* ホバー時の輝き効果 */}
    <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 transform -skew-x-12 group-hover:animate-pulse"></div>
  </div>
);

export default GuideCard; 