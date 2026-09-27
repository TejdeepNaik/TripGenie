'use client';

import React, { useState } from 'react';

export function FlagshipProject() {
  const [activeTab, setActiveTab] = useState(0);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const techStack = [
    'Next.js 14',
    'TypeScript',
    'Fastify 4',
    'Prisma ORM',
    'PostgreSQL / Neon',
    'Gemini AI',
    'Google Places',
    'Razorpay Architecture',
    'Vercel',
  ];

  const engineeringHighlights = [
    {
      title: 'Authentication & Session Invalidation',
      desc: 'HTTP-only cookie sessions, RBAC (Customer/Owner/Admin), and immediate session token invalidation upon user blocking.',
      badge: 'Security',
    },
    {
      title: 'Authorization & IDOR Protection',
      desc: 'Server-side ownership checks on direct resource requests (/bookings/:id, /places/owner/:id) returning 404/403 on unauthorized access.',
      badge: 'Security',
    },
    {
      title: 'Transactional Availability',
      desc: 'Seat and date capacity validation executes inside database transaction read-locks to prevent overbooking races under concurrency.',
      badge: 'Data Integrity',
    },
    {
      title: 'Server-Authoritative Pricing',
      desc: 'Bookings lock unitPrice and totalAmount upon creation. Retroactive listing price edits do not mutate historical financial records.',
      badge: 'Data Integrity',
    },
    {
      title: 'Payment State Machine',
      desc: 'Enforced status transitions (PENDING → SUCCESS | FAILED), HMAC SHA256 webhook signature verification, and ProviderEventLog idempotency.',
      badge: 'Payments',
    },
    {
      title: 'Grounded AI Copilot',
      desc: 'Gemini LLM trip generation evaluating intent and selecting exclusively from real candidate places returned by DatabasePlaceProvider.',
      badge: 'AI Systems',
    },
  ];

  const galleryViews = [
    {
      id: 'discovery',
      name: 'Customer Discovery',
      role: 'Customer',
      description: 'Destination search, category filtering (Beach, Culture, Mountain), featured travel places, and availability-aware cards.',
      previewText: 'Explore Places • Search Goa, Tokyo • Responsive Cards',
      color: 'from-indigo-600/20 to-blue-600/20',
    },
    {
      id: 'itinerary',
      name: 'Visual Planner & AI Copilot',
      role: 'Customer',
      description: 'Day-by-day activity timelines, duration & cost calculation, and natural language AI trip generation grounded in database candidate places.',
      previewText: 'Day 1-3 Activity Timelines • Gemini AI Generator',
      color: 'from-violet-600/20 to-purple-600/20',
    },
    {
      id: 'checkout',
      name: 'Booking & Checkout',
      role: 'Customer',
      description: 'Date selection, guest capacity locking, server-calculated totals, payment intent execution, and historical booking snapshots.',
      previewText: 'Transactional Guest Capacity Lock • Historical Price Snapshot',
      color: 'from-emerald-600/20 to-teal-600/20',
    },
    {
      id: 'owner',
      name: 'Business Owner Portal',
      role: 'Owner',
      description: 'Listing submission into PENDING_APPROVAL status, address/price configuration, image URL inputs, and reservation oversight for owned listings.',
      previewText: 'Create Listing • PENDING_APPROVAL Status • View Reservations',
      color: 'from-amber-600/20 to-orange-600/20',
    },
    {
      id: 'admin',
      name: 'Admin Moderation Workspace',
      role: 'Admin',
      description: 'Platform listing moderation queue (Approve/Reject/Suspend), status state machine enforcement, user blocking, and session invalidation.',
      previewText: 'Listing Moderation Queue • Block User & Purge Sessions',
      color: 'from-rose-600/20 to-red-600/20',
    },
  ];

  return (
    <section id="tripgenie" className="py-20 bg-[#0c1220] border-y border-slate-800/80 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold mb-3">
              ★ Flagship Portfolio Project
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              TripGenie
            </h2>
            <p className="text-lg text-indigo-400 font-medium mt-1">
              Production-Style Full-Stack Travel &amp; AI Platform
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href="https://trip-genie-web-seven.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-indigo-600/30 transition flex items-center gap-2"
            >
              <span>Live Demo</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>

            <a
              href="https://github.com/TejdeepNaik/TripGenie"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-semibold border border-slate-700 transition flex items-center gap-2"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              <span>GitHub</span>
            </a>

            <button
              onClick={() => setIsDetailOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-indigo-400 hover:text-indigo-300 text-xs sm:text-sm font-semibold border border-slate-800 transition"
            >
              Case Study Details
            </button>
          </div>
        </div>

        {/* Tech Stack Pills */}
        <div className="flex flex-wrap gap-2 mb-10">
          {techStack.map((tech) => (
            <span
              key={tech}
              className="px-3 py-1 rounded-md bg-slate-800/90 text-slate-300 text-xs font-mono border border-slate-700/80"
            >
              {tech}
            </span>
          ))}
        </div>

        {/* Product Overview */}
        <div className="bg-slate-900/80 rounded-2xl p-6 sm:p-8 border border-slate-800 mb-12">
          <h3 className="text-xl font-bold text-white mb-3">Product Capabilities</h3>
          <p className="text-slate-300 leading-relaxed text-sm sm:text-base mb-4">
            TripGenie is a decoupled monorepo travel application unifying destination discovery, visual trip itinerary timelines, grounded AI travel generation, guest capacity locking under database transaction read-locks, a Business Owner portal, and an Admin moderation workspace with strict HTTP-only cookie authentication and RBAC.
          </p>
          <div className="flex flex-wrap gap-4 text-xs font-mono text-slate-400 pt-2 border-t border-slate-800">
            <div><span className="text-slate-500">Production Web:</span> <a href="https://trip-genie-web-seven.vercel.app/" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">trip-genie-web-seven.vercel.app</a></div>
            <div><span className="text-slate-500">Production API:</span> <a href="https://tripgenieapi-psi.vercel.app/health" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">tripgenieapi-psi.vercel.app</a></div>
          </div>
        </div>

        {/* Engineering Highlights Grid */}
        <h3 className="text-2xl font-bold text-white mb-6">Engineering &amp; Security Highlights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {engineeringHighlights.map((item, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold font-mono uppercase tracking-wider text-indigo-400 px-2 py-0.5 rounded bg-indigo-950/60 border border-indigo-800/50">
                    {item.badge}
                  </span>
                </div>
                <h4 className="text-base font-bold text-white mb-2">{item.title}</h4>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Platform Views Gallery */}
        <h3 className="text-2xl font-bold text-white mb-6">Platform Views Showcase</h3>
        <div className="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden">
          <div className="flex flex-wrap border-b border-slate-800 bg-slate-950/60 p-2 gap-2">
            {galleryViews.map((tab, idx) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(idx)}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition ${
                  activeTab === idx
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </div>

          <div className="p-6 sm:p-8">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-800 text-slate-300 font-mono">
                Role: {galleryViews[activeTab].role}
              </span>
              <span className="text-xs text-indigo-400 font-medium">
                {galleryViews[activeTab].previewText}
              </span>
            </div>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6">
              {galleryViews[activeTab].description}
            </p>

            <div
              className={`w-full h-64 sm:h-80 rounded-xl bg-gradient-to-br ${galleryViews[activeTab].color} border border-slate-700/60 p-6 flex flex-col justify-between relative overflow-hidden`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                </div>
                <div className="text-xs font-mono text-slate-400 bg-slate-900/80 px-3 py-1 rounded-md border border-slate-800">
                  TripGenie Platform View — {galleryViews[activeTab].name}
                </div>
              </div>

              <div className="my-auto text-center p-4">
                <div className="inline-block px-4 py-2 rounded-xl bg-slate-900/90 text-white font-bold text-lg mb-2 shadow-xl border border-slate-800">
                  {galleryViews[activeTab].name}
                </div>
                <p className="text-xs text-slate-300 max-w-lg mx-auto">
                  {galleryViews[activeTab].previewText}
                </p>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>Status: Verified Production UI</span>
                <span>Role Scoped: {galleryViews[activeTab].role}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Case Study Modal */}
      {isDetailOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0c1220] border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto p-6 sm:p-8 shadow-2xl relative">
            <button
              onClick={() => setIsDetailOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              aria-label="Close modal"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-2xl font-bold text-white mb-1">TripGenie — Detailed Case Study</h3>
            <p className="text-xs font-mono text-indigo-400 mb-6">Full-Stack Architecture &amp; System Engineering</p>

            <div className="space-y-6 text-sm text-slate-300">
              <div>
                <h4 className="text-base font-bold text-white mb-2">Problem</h4>
                <p className="leading-relaxed text-slate-300">
                  Standard travel planning tools either provide static listings without real booking transactions, or ungrounded AI itinerary tools that hallucinate non-existent hotels and attractions. Furthermore, multi-role platforms often lack robust IDOR prevention and race-condition safety during concurrent checkout.
                </p>
              </div>

              <div>
                <h4 className="text-base font-bold text-white mb-2">Product Capabilities</h4>
                <p className="leading-relaxed text-slate-300">
                  TripGenie provides complete trip discovery, day-by-day visual itinerary planning, grounded AI generation using real database places, transactional booking availability protection, business owner portal for listing management, and an admin moderation dashboard.
                </p>
              </div>

              <div>
                <h4 className="text-base font-bold text-white mb-2">Engineering &amp; Security Decisions</h4>
                <ul className="list-disc pl-5 space-y-1 text-slate-300">
                  <li>Decoupled Next.js 14 frontend and Fastify 4 backend monorepo with pnpm workspaces.</li>
                  <li>HTTP-only cookie authentication with server-side session hashing in PostgreSQL.</li>
                  <li>Server-authoritative RBAC enforcing role boundaries (Customer, Owner, Admin).</li>
                  <li>Database transaction read-locks during booking creation to guarantee guest capacity locking.</li>
                  <li>Server-authoritative price snapshotting to ensure historical financial invariance.</li>
                </ul>
              </div>

              <div className="pt-4 border-t border-slate-800 flex flex-wrap gap-4">
                <a
                  href="https://trip-genie-web-seven.vercel.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition"
                >
                  Open Live Application
                </a>
                <a
                  href="https://github.com/TejdeepNaik/TripGenie"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition"
                >
                  Inspect Monorepo on GitHub
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
