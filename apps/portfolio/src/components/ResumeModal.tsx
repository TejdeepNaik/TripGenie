'use client';

import React from 'react';

interface ResumeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ResumeModal({ isOpen, onClose }: ResumeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0c1220] border border-slate-800 rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          aria-label="Close modal"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Banoth Tejdeep Naik — Resume</h3>
            <p className="text-xs text-indigo-400 font-mono">B.Tech Student · IIIT Lucknow</p>
          </div>
        </div>

        <p className="text-slate-300 text-sm leading-relaxed mb-6">
          The verified engineering summary and project details presented in this portfolio reflect Tejdeep&apos;s active resume for software development and internship roles.
        </p>

        <div className="space-y-3 mb-6 bg-slate-900/90 p-4 rounded-xl border border-slate-800 text-xs text-slate-300 font-mono">
          <div className="flex justify-between">
            <span className="text-slate-500">Education:</span>
            <span className="text-slate-200">IIIT Lucknow (B.Tech 2024–2028)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">CGPA:</span>
            <span className="text-emerald-400 font-bold">7.5</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Flagship:</span>
            <span className="text-indigo-300">TripGenie (Next.js + Fastify + Postgres)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Contact:</span>
            <span className="text-slate-200">tejdeepbanoth2@gmail.com</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href="mailto:tejdeepbanoth2@gmail.com?subject=Resume%20Request%20-%20Banoth%20Tejdeep%20Naik"
            className="flex-1 px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-white text-center text-sm transition shadow-lg shadow-indigo-600/20"
          >
            Request Official Resume PDF
          </a>
          <button
            onClick={onClose}
            className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-center text-sm font-semibold transition"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
}
