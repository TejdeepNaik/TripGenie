'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { Badge } from '@tripgenie/ui';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Redirect to login if unauthenticated after loading check finishes
  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // Lock scroll on mobile when menu open
  React.useEffect(() => {
    if (mobileMenuOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setMobileMenuOpen(false);
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [mobileMenuOpen]);

  const navItems = [
    { label: 'Dashboard', href: '/app', icon: '📊', active: pathname === '/app' },
    { label: 'Explore Places', href: '/app/explore', icon: '🧭', active: pathname?.startsWith('/app/explore') },
    { label: 'My Trips', href: '/app/trips', icon: '✈️', active: pathname?.startsWith('/app/trips') },
    { label: 'My Bookings', href: '/app/bookings', icon: '🏨', active: pathname?.startsWith('/app/bookings') },
  ];

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-600 to-indigo-700 animate-pulse mx-auto flex items-center justify-center text-2xl font-bold text-white shadow-xl shadow-brand-600/20">
            ✨
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">TripGenie Workspace</h3>
            <p className="text-xs text-slate-500 mt-1">Authenticating session security...</p>
          </div>
        </div>
      </div>
    );
  }

  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : 'U';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col md:flex-row font-sans selection:bg-brand-500 selection:text-white">
      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between px-4 py-3.5 bg-white border-b border-slate-200/80 sticky top-0 z-40 shadow-xs">
        <Link href="/app" className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center font-bold text-sm text-white shadow-md shadow-brand-600/20">
            ✨
          </div>
          <span className="font-extrabold text-base text-slate-900 tracking-tight">TripGenie</span>
        </Link>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2.5 rounded-xl bg-slate-100 text-slate-700 hover:text-slate-900 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Toggle navigation menu"
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>
      </header>

      {/* Desktop Left Sidebar */}
      <aside className="hidden md:flex md:w-64 flex-col justify-between p-6 bg-white border-r border-slate-200/80 sticky top-0 h-screen shrink-0 shadow-xs">
        <div className="space-y-8">
          {/* Brand Logo */}
          <Link href="/app" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-600 to-indigo-700 flex items-center justify-center font-bold text-xl text-white shadow-lg shadow-brand-600/25 group-hover:scale-105 transition-transform duration-200">
              ✨
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-slate-900 block">TripGenie</span>
              <span className="text-[10px] font-mono text-brand-600 uppercase tracking-widest font-bold">Travel Platform</span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="space-y-1.5" aria-label="Main Navigation">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                  item.active
                    ? 'bg-brand-50 text-brand-700 border-l-4 border-brand-600 shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                }`}
              >
                <span className="text-base leading-none" aria-hidden="true">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        {/* Sidebar Footer / User Profile */}
        <div className="pt-6 border-t border-slate-100 space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-full bg-brand-100 border border-brand-200 flex items-center justify-center font-bold text-xs text-brand-700 shadow-2xs">
              {userInitials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">{user?.name}</p>
              <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => logout()}
            className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors flex items-center space-x-2"
          >
            <span aria-hidden="true">🚪</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Navigation Drawer Overlay & Content */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-30 flex flex-col">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="relative bg-white border-b border-slate-200 p-5 space-y-4 shadow-xl z-40 mt-14 animate-in slide-in-from-top-2 duration-200">
            <nav className="space-y-1.5" aria-label="Mobile Navigation">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-semibold ${
                    item.active ? 'bg-brand-50 text-brand-700' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span aria-hidden="true">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
            <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
              <span className="text-xs text-slate-700 font-bold">{user?.name}</span>
              <button
                type="button"
                onClick={() => logout()}
                className="text-xs text-rose-600 font-semibold px-3.5 py-2 bg-rose-50 border border-rose-200 rounded-xl"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Desktop Bar */}
        <header className="hidden md:flex items-center justify-between px-8 py-3.5 bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-20">
          <div className="flex items-center space-x-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">TripGenie Platform</span>
            <Badge variant="purple" size="sm" dot>
              Phase 16 Polish
            </Badge>
          </div>

          <div className="flex items-center space-x-4">
            <Badge variant="info" size="sm">
              Role: {user?.role || 'CUSTOMER'}
            </Badge>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-10 max-w-7xl w-full mx-auto animate-in fade-in duration-300">
          {children}
        </main>
      </div>
    </div>
  );
};
