import React from 'react';

export function Education() {
  const leadershipRoles = [
    {
      title: 'Google Developer Groups (GDG)',
      role: 'Member',
      period: 'September 2025 – Present',
      badgeColor: 'text-indigo-400 bg-indigo-950/60 border-indigo-800/50',
      description: 'Engaged member of GDG on campus, participating in technical workshops, developer meetups, and open-source hackathons.',
    },
    {
      title: 'Utkrisht Fine Arts Society',
      role: 'Coordinator — IIIT Lucknow',
      period: '2024 – Present',
      badgeColor: 'text-violet-400 bg-violet-950/60 border-violet-800/50',
      description: 'Managed end-to-end logistics, team coordination, and on-site operations for flagship cultural exhibitions and events engaging over 500+ participants.',
    },
    {
      title: 'Eifer Sports Society',
      role: 'Cricket Lead — IIIT Lucknow',
      period: '2024 – Present',
      badgeColor: 'text-amber-400 bg-amber-950/60 border-amber-800/50',
      description: 'Organized inter-college and intra-campus tournament logistics, team selection, and competitive sports events for student athletes.',
    },
  ];

  return (
    <section id="education" className="py-20 bg-[#0c1220] border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Education Column */}
          <div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight mb-8">
              Education
            </h2>

            <div className="space-y-6">
              {/* IIIT Lucknow */}
              <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-indigo-400 font-bold px-2 py-0.5 rounded bg-indigo-950/60 border border-indigo-800/50">
                    2024 – 2028
                  </span>
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50">
                    CGPA: 7.5
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mb-1">
                  Indian Institute of Information Technology, Lucknow
                </h3>
                <p className="text-sm font-medium text-slate-300">
                  Bachelor of Technology (B.Tech)
                </p>
              </div>

              {/* JNV Andhra Pradesh */}
              <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-slate-400 font-bold px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
                    Senior Secondary
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mb-1">
                  Jawahar Navodaya Vidyalaya, Andhra Pradesh
                </h3>
                <p className="text-sm font-medium text-slate-300">
                  Senior Secondary Education (Class XI - XII)
                </p>
              </div>
            </div>
          </div>

          {/* Positions of Responsibility Column */}
          <div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight mb-8">
              Leadership &amp; Activities
            </h2>

            <div className="space-y-6">
              {leadershipRoles.map((item, idx) => (
                <div key={idx} className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${item.badgeColor}`}>
                      {item.role}
                    </span>
                    <span className="text-xs font-mono text-slate-500">{item.period}</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
