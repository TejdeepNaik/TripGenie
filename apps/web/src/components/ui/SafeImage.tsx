'use client';

import React, { useState } from 'react';

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  alt: string;
  fallbackText?: string;
  aspectRatio?: string;
  className?: string;
}

export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt,
  fallbackText,
  aspectRatio = 'aspect-video',
  className = '',
  ...props
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const displayText = fallbackText || alt || 'TripGenie Destination';

  if (!src || hasError) {
    return (
      <div
        className={`w-full ${aspectRatio} rounded-xl bg-gradient-to-br from-brand-50 via-slate-100 to-indigo-50 border border-slate-200/80 flex flex-col items-center justify-center p-4 text-center ${className}`}
      >
        <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center mb-2 font-bold text-lg shadow-2xs">
          ✈️
        </div>
        <span className="text-xs font-bold text-slate-800 line-clamp-1">{displayText}</span>
        <span className="text-[10px] font-mono font-semibold text-brand-600 mt-0.5 uppercase tracking-wider">TripGenie Visual</span>
      </div>
    );
  }

  return (
    <div className={`relative w-full ${aspectRatio} overflow-hidden rounded-xl bg-slate-100 ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-slate-100 animate-pulse flex items-center justify-center">
          <span className="text-xs text-slate-400">Loading visual...</span>
        </div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        onLoad={() => setIsLoading(false)}
        onError={() => setHasError(true)}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        }`}
        {...props}
      />
    </div>
  );
};
