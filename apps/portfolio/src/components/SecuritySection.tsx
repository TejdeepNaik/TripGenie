import React from 'react';

export function SecuritySection() {
  const securityFeatures = [
    {
      title: 'HTTP-Only Session Cookies',
      desc: '32-byte cryptographic session tokens stored as hashed records in PostgreSQL and delivered via HttpOnly, SameSite=Lax cookies.',
    },
    {
      title: 'Server-Authoritative RBAC',
      desc: 'Strict role hierarchy (CUSTOMER, OWNER, ADMIN) verified on backend routes. Frontend hiding is treated purely as UX.',
    },
    {
      title: 'Cross-Tenant IDOR Prevention',
      desc: 'Direct resource requests (/bookings/:id, /places/owner/:id) validate userId or ownerId. Unauthorized access attempts return 404/403.',
    },
    {
      title: 'Transactional Booking Capacity',
      desc: 'Seat availability and guest counts execute inside isolated database transaction read-locks to prevent overbooking races under concurrency.',
    },
    {
      title: 'Financial Price Snapshot Invariance',
      desc: 'Bookings lock unitPrice and totalAmount upon creation. Retroactive listing price updates do not mutate historical records.',
    },
    {
      title: 'Payment Webhook Idempotency',
      desc: 'HMAC SHA256 signature verification and ProviderEventLog audit tracking prevent duplicate webhook execution or payment spoofing.',
    },
    {
      title: 'Rate Limiting & DDoS Protection',
      desc: 'Global rate limiting (100 requests / minute) enforced via @fastify/rate-limit returning machine-readable RATE_LIMITED error payloads.',
    },
    {
      title: 'Security Headers & Log Redaction',
      desc: 'Fastify headers (nosniff, DENY, Referrer-Policy) injected on all responses. Fastify logger redacts passwords, session tokens, and signatures.',
    },
  ];

  return (
    <section className="py-20 bg-[#0c1220] border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-3">
              ✓ Production Reliability & Security
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Built for correctness, not just demos
            </h2>
          </div>
          <p className="text-slate-400 text-xs sm:text-sm max-w-md">
            Every backend endpoint, session token, and booking transaction is engineered to prevent security breaches and race conditions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {securityFeatures.map((feat, idx) => (
            <div
              key={idx}
              className="p-6 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold text-sm mb-4">
                0{idx + 1}
              </div>
              <h3 className="font-bold text-white text-base mb-2">{feat.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
