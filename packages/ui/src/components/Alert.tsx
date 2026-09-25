import React from 'react';

export interface AlertProps {
  variant?: 'info' | 'success' | 'warning' | 'danger';
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  title,
  children,
  onClose,
  className = '',
}) => {
  const styles = {
    info: 'bg-sky-50 border-sky-200 text-sky-900',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    warning: 'bg-amber-50 border-amber-200 text-amber-900',
    danger: 'bg-rose-50 border-rose-200 text-rose-900',
  };

  const icons = {
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
    danger: '❌',
  };

  return (
    <div
      role="alert"
      className={`p-4 rounded-xl border flex items-start gap-3 text-sm ${styles[variant]} ${className}`}
    >
      <span className="text-base leading-none select-none" aria-hidden="true">
        {icons[variant]}
      </span>
      <div className="flex-1">
        {title && <h4 className="font-semibold mb-1 text-xs uppercase tracking-wider">{title}</h4>}
        <div className="text-xs leading-relaxed opacity-90">{children}</div>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss alert"
          className="opacity-60 hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-black/5"
        >
          ✕
        </button>
      )}
    </div>
  );
};

