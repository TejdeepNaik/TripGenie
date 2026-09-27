import React from 'react';

export function TechnicalSkills() {
  const skillCategories = [
    {
      category: 'Languages',
      skills: ['C++', 'Python', 'JavaScript', 'TypeScript', 'SQL', 'HTML/CSS'],
    },
    {
      category: 'Backend',
      skills: ['FastAPI', 'Fastify', 'REST APIs', 'PostgreSQL', 'Prisma', 'SQLAlchemy', 'Alembic', 'RBAC'],
    },
    {
      category: 'Frontend',
      skills: ['React', 'Next.js', 'Vite', 'Tailwind CSS', 'Leaflet', 'Google Maps'],
    },
    {
      category: 'AI / Data',
      skills: ['Embeddings', 'pgvector', 'HNSW', 'Gemini AI', 'TensorFlow.js', 'OpenCV'],
    },
    {
      category: 'Tools / Cloud',
      skills: ['Git', 'GitHub', 'Docker', 'Vercel', 'Railway', 'Neon', 'Linux'],
    },
  ];

  return (
    <section id="skills" className="py-20 bg-[#0c1220] border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-2">
            Technical Capabilities
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            Software engineering tools, frameworks, database engines, and AI systems exercised across full-stack applications.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {skillCategories.map((cat) => (
            <div
              key={cat.category}
              className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition"
            >
              <h3 className="text-lg font-bold text-white mb-4 pb-2 border-b border-slate-800 flex items-center justify-between">
                <span>{cat.category}</span>
                <span className="text-xs font-mono text-indigo-400">{cat.skills.length} skills</span>
              </h3>
              <div className="flex flex-wrap gap-2">
                {cat.skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-3 py-1.5 rounded-lg bg-slate-950 text-slate-200 text-xs font-medium border border-slate-800 hover:border-indigo-500/50 hover:text-indigo-300 transition"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
