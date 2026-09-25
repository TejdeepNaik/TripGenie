'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Card, Badge } from '@tripgenie/ui';
import { APP_CONFIG } from '@tripgenie/config';
import { useAuth } from '../context/auth-context';

export default function HomePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  const [searchWhere, setSearchWhere] = useState('');
  const [searchGuests, setSearchGuests] = useState('2');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const queryParams = new URLSearchParams();
    if (searchWhere) queryParams.set('q', searchWhere);
    router.push(`/app/explore?${queryParams.toString()}`);
  };

  const featuredDestinations = [
    {
      name: 'Goa',
      country: 'India',
      category: 'Beach & Nightlife',
      rating: 4.8,
      price: '₹4,500 / night',
      image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=600&auto=format&fit=crop&q=80',
    },
    {
      name: 'Kyoto',
      country: 'Japan',
      category: 'Culture & Temples',
      rating: 4.9,
      price: '¥12,000 / night',
      image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=600&auto=format&fit=crop&q=80',
    },
    {
      name: 'Paris',
      country: 'France',
      category: 'Heritage & Dining',
      rating: 4.7,
      price: '€180 / night',
      image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&auto=format&fit=crop&q=80',
    },
    {
      name: 'Bali',
      country: 'Indonesia',
      category: 'Resorts & Nature',
      rating: 4.8,
      price: '$95 / night',
      image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=600&auto=format&fit=crop&q=80',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-brand-500 selection:text-white">
      {/* Navigation Header */}
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-600 to-indigo-700 flex items-center justify-center font-bold text-xl text-white shadow-md shadow-brand-600/20 group-hover:scale-105 transition-transform duration-200">
              ✨
            </div>
            <span className="text-xl font-extrabold tracking-tight text-slate-900">
              {APP_CONFIG.name}
            </span>
          </Link>

          <div className="hidden md:flex items-center space-x-6 text-xs font-semibold text-slate-600">
            <Link href="/app/explore" className="hover:text-brand-600 transition-colors">
              Explore
            </Link>
            <Link href="/app/trips" className="hover:text-brand-600 transition-colors">
              Trips
            </Link>
            <Link href="/app/bookings" className="hover:text-brand-600 transition-colors">
              Bookings
            </Link>
          </div>

          <div className="flex items-center space-x-3">
            {isLoading ? (
              <span className="text-xs text-slate-400">Verifying session...</span>
            ) : isAuthenticated && user ? (
              <div className="flex items-center space-x-3">
                <Link href="/app">
                  <Button variant="primary" size="sm">
                    Open Workspace →
                  </Button>
                </Link>
                <Button variant="outline" size="sm" onClick={() => logout()}>
                  Sign Out
                </Button>
              </div>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="outline" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link href="/register">
                  <Button variant="primary" size="sm">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 sm:py-24 px-6 text-center max-w-5xl mx-auto space-y-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
          Discover • Decide • Book • Travel
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-slate-900 leading-tight">
          Your next journey{' '}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-600 via-indigo-600 to-violet-600">
            starts here.
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Intelligent travel planning, destination discovery, transactional bookings, and seamless experience management.
        </p>

        {/* Prominent Travel Search Box */}
        <div className="max-w-3xl mx-auto bg-white border border-slate-200 p-3 sm:p-4 rounded-3xl shadow-xl shadow-slate-200/50">
          <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
            {/* Where Field */}
            <div className="sm:col-span-5 text-left px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-2xl">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                📍 Where to?
              </label>
              <input
                type="text"
                value={searchWhere}
                onChange={(e) => setSearchWhere(e.target.value)}
                placeholder="Search city or destination..."
                className="w-full bg-transparent text-xs sm:text-sm font-semibold text-slate-900 outline-none placeholder-slate-400 mt-0.5"
              />
            </div>

            {/* Guests Field */}
            <div className="sm:col-span-4 text-left px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-2xl">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                👥 Travelers
              </label>
              <select
                value={searchGuests}
                onChange={(e) => setSearchGuests(e.target.value)}
                className="w-full bg-transparent text-xs sm:text-sm font-semibold text-slate-900 outline-none mt-0.5"
              >
                <option value="1">1 Guest</option>
                <option value="2">2 Guests</option>
                <option value="4">4 Guests</option>
                <option value="6">6+ Group</option>
              </select>
            </div>

            {/* Search Submit CTA */}
            <div className="sm:col-span-3">
              <Button type="submit" variant="primary" size="lg" className="w-full py-3 text-sm">
                Search 🔍
              </Button>
            </div>
          </form>
        </div>
      </section>

      {/* Featured Destinations Section */}
      <section className="max-w-7xl mx-auto px-6 py-12 w-full">
        <div className="flex justify-between items-end mb-8">
          <div>
            <Badge variant="purple" size="sm" className="mb-2">Popular Destinations</Badge>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Explore Top Travel Spots
            </h2>
          </div>
          <Link href="/app/explore" className="text-xs font-bold text-brand-600 hover:text-brand-700">
            View All Places →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredDestinations.map((dest) => (
            <Card key={dest.name} hoverable className="overflow-hidden p-0 border-slate-200">
              <div className="relative h-48 w-full overflow-hidden">
                <img
                  src={dest.image}
                  alt={dest.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-3 left-3">
                  <Badge variant="neutral" size="sm">{dest.category}</Badge>
                </div>
                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-2 py-0.5 rounded-full text-xs font-bold text-slate-800 border border-slate-200">
                  ★ {dest.rating}
                </div>
              </div>

              <div className="p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <h3 className="text-base font-bold text-slate-900">{dest.name}</h3>
                  <span className="text-xs text-slate-500">📍 {dest.country}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                  <span className="text-xs font-semibold text-emerald-600">{dest.price}</span>
                  <Link href={`/app/explore?q=${dest.name}`}>
                    <Button variant="outline" size="sm">
                      Explore
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-8 px-6 text-center text-xs text-slate-500 space-y-2">
        <p>TripGenie Platform &copy; 2026. Built with Next.js 14, Fastify, Prisma ORM & Tailwind CSS.</p>
      </footer>
    </div>
  );
}
