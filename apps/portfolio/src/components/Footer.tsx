import React from 'react';

export function Footer() {
  return (
    <footer className="py-8 bg-[#060910] border-t border-slate-800/60 text-center text-xs text-slate-500">
      <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          © {new Date().getFullYear()} Banoth Tejdeep Naik. Engineered with Next.js, React, and Tailwind CSS.
        </div>
        <div className="flex gap-4">
          <a href="#home" className="hover:text-slate-300 transition">Back to top</a>
          <span>•</span>
          <a href="https://github.com/TejdeepNaik/tripgenie" target="_blank" rel="noopener noreferrer" className="hover:text-slate-300 transition">TripGenie Monorepo</a>
        </div>
      </div>
    </footer>
  );
}
