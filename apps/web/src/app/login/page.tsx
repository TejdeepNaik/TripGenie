'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Card, Input, Alert } from '@tripgenie/ui';
import { useAuth } from '../../context/auth-context';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please enter your email address and password.');
      return;
    }

    setIsSubmitting(true);
    const result = await login({ email, password });
    setIsSubmitting(false);

    if (result.success) {
      router.push('/app');
    } else {
      setError(result.error || 'Email address or password is incorrect.');
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4 selection:bg-brand-500 selection:text-white">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-600 to-indigo-700 flex items-center justify-center font-bold text-2xl text-white shadow-xl shadow-brand-600/30 group-hover:scale-105 transition-transform">
              ✨
            </div>
          </Link>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Welcome Back</h1>
          <p className="text-xs sm:text-sm text-slate-500">Sign in to your TripGenie travel workspace</p>
        </div>

        <Card className="border-slate-200/80 shadow-md">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="danger" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            <Input
              label="Email Address"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@example.com"
              leftIcon={<span className="text-xs">✉️</span>}
            />

            <Input
              label="Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              leftIcon={<span className="text-xs">🔒</span>}
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isSubmitting}
              className="w-full mt-2"
            >
              Sign In to TripGenie
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
            Don&apos;t have an account yet?{' '}
            <Link href="/register" className="text-brand-600 hover:text-brand-700 font-semibold underline underline-offset-4">
              Create an account
            </Link>
          </div>
        </Card>
      </div>
    </main>
  );
}
