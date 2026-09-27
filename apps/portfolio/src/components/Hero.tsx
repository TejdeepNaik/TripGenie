'use client';

import React, { useState } from 'react';
import { ResumeModal } from './ResumeModal';

export function Hero() {
  const [isResumeOpen, setIsResumeOpen] = useState(false);

  return (
    <section id="home" className="pt-32 pb-20 md:pt-40 md:pb-28 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-[300px] h-[300px] bg-violet-600/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-950/60 border border-indigo-800/50 text-indigo-300 text-xs font-semibold mb-6">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              IIIT Lucknow — B.Tech Candidate (2024–2028)
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white mb-4">
              Banoth Tejdeep Naik
            </h1>

            <p className="text-xl sm:text-2xl font-semibold text-indigo-400 mb-6 tracking-tight">
              Full-Stack Developer · AI Systems · Backend Engineering
            </p>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed mb-8 max-w-2xl">
              Full-stack developer building production-oriented web applications with Next.js, Fastify, PostgreSQL, and AI-powered features. Flagship creator of <span className="text-indigo-300 font-semibold">TripGenie</span>.
            </p>

            {/* Action CTAs */}
            <div className="flex flex-wrap items-center gap-3">
              <a
                href="#tripgenie"
                className="px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-white transition shadow-lg shadow-indigo-600/30 flex items-center gap-2 text-sm"
              >
                <span>View Projects</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </a>

              <button
                onClick={() => setIsResumeOpen(true)}
                className="px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 font-semibold text-slate-200 transition border border-slate-700 flex items-center gap-2 text-sm"
              >
                <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>View Resume</span>
              </button>

              <a
                href="https://github.com/TejdeepNaik"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition border border-slate-800"
                aria-label="GitHub Profile"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
              </a>

              <a
                href="https://www.linkedin.com/in/tejdeepnaik/"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition border border-slate-800"
                aria-label="LinkedIn Profile"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.25V10.9H6.46M7.86 6.74a1.6 1.6 0 0 0-1.6 1.6c0 .88.71 1.6 1.6 1.6.89 0 1.6-.72 1.6-1.6 0-.89-.71-1.6-1.6-1.6z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Developer Micro-Widget Terminal Element */}
          <div className="lg:col-span-5">
            <div className="bg-slate-950/90 rounded-2xl border border-slate-800 p-5 font-mono text-xs shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                </div>
                <span className="text-[11px] text-slate-500">tejdeep@iiitl:~</span>
              </div>

              <div className="space-y-2">
                <div className="text-slate-400">
                  <span className="text-indigo-400 font-bold">$</span> cat developer_profile.json
                </div>
                <div className="text-slate-300 pl-2 border-l border-indigo-500/30 space-y-1">
                  <div><span className="text-indigo-300">&quot;engineer&quot;</span>: <span className="text-emerald-400">&quot;Banoth Tejdeep Naik&quot;</span>,</div>
                  <div><span className="text-indigo-300">&quot;institution&quot;</span>: <span className="text-emerald-400">&quot;IIIT Lucknow (B.Tech)&quot;</span>,</div>
                  <div><span className="text-indigo-300">&quot;cgpa&quot;</span>: <span className="text-amber-300">7.5</span>,</div>
                  <div><span className="text-indigo-300">&quot;primary_stack&quot;</span>: [<span className="text-slate-400">&quot;Next.js&quot;, &quot;Fastify&quot;, &quot;PostgreSQL&quot;, &quot;Prisma&quot;</span>],</div>
                  <div><span className="text-indigo-300">&quot;flagship_app&quot;</span>: <span className="text-emerald-400">&quot;TripGenie Travel Platform&quot;</span>,</div>
                  <div><span className="text-indigo-300">&quot;codeforces&quot;</span>: <span className="text-cyan-400">&quot;Specialist&quot;</span>,</div>
                  <div><span className="text-indigo-300">&quot;codechef&quot;</span>: <span className="text-amber-400">&quot;3-Star&quot;</span></div>
                </div>
                <div className="text-slate-400 pt-1">
                  <span className="text-indigo-400 font-bold">$</span> status --verified
                </div>
                <div className="text-emerald-400 flex items-center gap-2 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                  <span>Ready for Full-Stack &amp; Software Internships</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ResumeModal isOpen={isResumeOpen} onClose={() => setIsResumeOpen(false)} />
    </section>
  );
}
