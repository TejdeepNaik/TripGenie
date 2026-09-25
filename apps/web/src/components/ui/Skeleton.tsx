import React from 'react';

export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`p-6 rounded-2xl border border-slate-200/80 bg-white animate-pulse space-y-4 shadow-xs ${className}`}>
      <div className="h-40 bg-slate-100 rounded-xl w-full" />
      <div className="h-5 bg-slate-100 rounded-lg w-3/4" />
      <div className="h-4 bg-slate-100 rounded-lg w-1/2" />
      <div className="flex gap-2 pt-2">
        <div className="h-9 bg-slate-100 rounded-xl w-1/3" />
        <div className="h-9 bg-slate-100 rounded-xl w-1/3" />
      </div>
    </div>
  );
};

export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({
  lines = 3,
  className = '',
}) => {
  return (
    <div className={`space-y-2 animate-pulse ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-slate-100 rounded-lg"
          style={{ width: `${100 - i * 15}%` }}
        />
      ))}
    </div>
  );
};
