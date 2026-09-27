import React from 'react';

export function About() {
  const highlights = [
    {
      title: 'Full-Stack Architecture',
      description: 'Building end-to-end web applications with Next.js App Router, React, Fastify, and FastAPI with clean type-safe boundaries.',
    },
    {
      title: 'Backend & Data Engineering',
      description: 'Designing transactional database schemas with PostgreSQL, Prisma, SQLAlchemy, and pgvector HNSW indexing.',
    },
    {
      title: 'AI & Vector Systems',
      description: 'Integrating LLM copilots (Gemini), vector embeddings, and spatial search for grounded recommendation engines.',
    },
    {
      title: 'Algorithmic Foundation',
      description: 'Active competitive programmer with 600+ problems solved across Codeforces (Specialist) and CodeChef (3-Star).',
    },
  ];

  return (
    <section id="about" className="py-20 bg-[#0c1220] border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold mb-4">
              About Tejdeep
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-6">
              Engineering practical, production-oriented software.
            </h2>
            <p className="text-slate-300 text-base leading-relaxed mb-4">
              I am a B.Tech student at IIIT Lucknow focused on full-stack development, database systems, and AI applications.
            </p>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              My approach prioritizes system correctness, transaction isolation, authorization integrity, and clear API boundaries—building web platforms that perform reliably under real-world conditions.
            </p>
            <div className="flex items-center gap-4 text-xs font-mono text-slate-400 border-t border-slate-800 pt-4">
              <div>
                <span className="text-indigo-400 font-bold block text-sm">IIIT Lucknow</span>
                <span>B.Tech 2024–2028</span>
              </div>
              <div className="w-px h-8 bg-slate-800" />
              <div>
                <span className="text-emerald-400 font-bold block text-sm">7.5 CGPA</span>
                <span>Academic Record</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {highlights.map((item, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-mono font-bold text-xs mb-3">
                  0{idx + 1}
                </div>
                <h3 className="font-bold text-white text-base mb-2">{item.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
