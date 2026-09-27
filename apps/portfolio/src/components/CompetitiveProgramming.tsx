import React from 'react';

export function CompetitiveProgramming() {
  const achievements = [
    {
      platform: 'Codeforces',
      rank: 'Specialist',
      color: 'from-cyan-500/20 to-blue-500/20',
      textColor: 'text-cyan-400',
      borderColor: 'border-cyan-500/30',
    },
    {
      platform: 'CodeChef',
      rank: '3 Star',
      color: 'from-amber-500/20 to-orange-500/20',
      textColor: 'text-amber-400',
      borderColor: 'border-amber-500/30',
    },
    {
      platform: 'Problem Solving',
      rank: '600+ Problems Solved',
      color: 'from-emerald-500/20 to-teal-500/20',
      textColor: 'text-emerald-400',
      borderColor: 'border-emerald-500/30',
      subtext: 'Across LeetCode, CodeChef, and Codeforces',
    },
  ];

  return (
    <section className="py-16 bg-[#090d16] border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-400 text-xs font-semibold mb-3">
              ★ Algorithmic Problem Solving
            </div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight">
              Competitive Programming & Data Structures
            </h2>
          </div>
          <p className="text-slate-400 text-xs sm:text-sm max-w-md">
            Demonstrated algorithmic speed, complex data structure implementations, and competitive programming ranks.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {achievements.map((item) => (
            <div
              key={item.platform}
              className={`p-6 rounded-2xl bg-gradient-to-br ${item.color} border ${item.borderColor} flex flex-col justify-between`}
            >
              <div>
                <span className="text-xs font-mono text-slate-300 uppercase tracking-widest block mb-2 font-bold">
                  {item.platform}
                </span>
                <div className={`text-2xl font-extrabold ${item.textColor} mb-1 tracking-tight`}>
                  {item.rank}
                </div>
                {item.subtext && (
                  <p className="text-xs text-slate-300 mt-2 font-medium">{item.subtext}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
