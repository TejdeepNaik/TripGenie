import React from 'react';

export interface CardProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  glass?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  action,
  children,
  className = '',
  hoverable = false,
  glass = false,
  onClick,
}) => {
  const hoverStyles = hoverable
    ? 'transition-all duration-200 hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5 cursor-pointer'
    : '';

  const bgStyles = glass
    ? 'bg-white/90 backdrop-blur-md border-slate-200/80 shadow-sm'
    : 'bg-white border-slate-200/80 shadow-sm';

  return (
    <div
      onClick={onClick}
      className={`p-6 rounded-2xl border ${bgStyles} ${hoverStyles} ${className}`}
    >
      {(title || subtitle || action) && (
        <div className="flex justify-between items-start mb-4 gap-4 pb-3 border-b border-slate-100">
          <div>
            {title && (
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};
