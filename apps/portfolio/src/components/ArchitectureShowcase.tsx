import React from 'react';

export function ArchitectureShowcase() {
  return (
    <section id="architecture" className="py-20 bg-[#090d16] border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">
            System Architecture
          </h2>
          <p className="text-slate-400 text-base sm:text-lg">
            Decoupled full-stack architecture built for strict separation of concerns, transactional persistence, and multi-tenant security.
          </p>
        </div>

        {/* Architecture Topology Visual */}
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 sm:p-10 mb-12 shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 text-center">
            {/* Frontend */}
            <div className="p-6 rounded-xl bg-slate-950 border border-indigo-500/30 flex flex-col justify-between">
              <div>
                <span className="text-xs font-mono text-indigo-400 uppercase tracking-widest font-bold block mb-2">
                  Presentation Layer
                </span>
                <h3 className="text-lg font-bold text-white mb-2">Next.js 14 Web</h3>
                <p className="text-xs text-slate-400">
                  App Router, React 18, Tailwind CSS, HTTP-only Cookie Credentials.
                </p>
              </div>
              <div className="mt-4 text-xs font-mono text-slate-500">Port 3000 / Vercel</div>
            </div>

            {/* API Server */}
            <div className="p-6 rounded-xl bg-slate-950 border border-violet-500/30 flex flex-col justify-between">
              <div>
                <span className="text-xs font-mono text-violet-400 uppercase tracking-widest font-bold block mb-2">
                  Application Server
                </span>
                <h3 className="text-lg font-bold text-white mb-2">Fastify 4 REST API</h3>
                <p className="text-xs text-slate-400">
                  Zod Validation, Session Auth, RBAC, Rate Limiting, Error Sanitization.
                </p>
              </div>
              <div className="mt-4 text-xs font-mono text-slate-500">Port 3001 / Vercel</div>
            </div>

            {/* ORM & DB */}
            <div className="p-6 rounded-xl bg-slate-950 border border-emerald-500/30 flex flex-col justify-between">
              <div>
                <span className="text-xs font-mono text-emerald-400 uppercase tracking-widest font-bold block mb-2">
                  Data Persistence
                </span>
                <h3 className="text-lg font-bold text-white mb-2">Prisma + PostgreSQL</h3>
                <p className="text-xs text-slate-400">
                  PostgreSQL 16 on Neon, Transaction Read-Locks, Migration Safety.
                </p>
              </div>
              <div className="mt-4 text-xs font-mono text-slate-500">Serverless Neon DB</div>
            </div>

            {/* Integrations */}
            <div className="p-6 rounded-xl bg-slate-950 border border-amber-500/30 flex flex-col justify-between">
              <div>
                <span className="text-xs font-mono text-amber-400 uppercase tracking-widest font-bold block mb-2">
                  Integrations
                </span>
                <h3 className="text-lg font-bold text-white mb-2">External Providers</h3>
                <p className="text-xs text-slate-400">
                  Google Places, Gemini AI, Razorpay Engine & Mock Provider.
                </p>
              </div>
              <div className="mt-4 text-xs font-mono text-slate-500">Server-Side APIs</div>
            </div>
          </div>
        </div>

        {/* Technical Breakdown Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800">
            <h4 className="font-bold text-white mb-2 text-base">Frontend Responsibilities</h4>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Manages client-side navigation, interactive visual trip day timelines, drawer menus, theme states, and submits requests with credentials included.
            </p>
          </div>
          <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800">
            <h4 className="font-bold text-white mb-2 text-base">API Server & Auth Pipeline</h4>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Validates all request bodies via Zod, authenticates session hashes against PostgreSQL, checks user status, and enforces server-authoritative prices.
            </p>
          </div>
          <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800">
            <h4 className="font-bold text-white mb-2 text-base">Database Transaction Isolation</h4>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Executes seat availability validation and booking creation inside atomic transaction read-locks to prevent overbooking races under load.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
