import './globals.css';
import React from 'react';
import { AuthProvider } from '../context/auth-context';

export const metadata = {
  title: 'TripGenie — AI-Powered Travel & Experience Platform',
  description: 'Plan trips, discover destinations, book stays, and explore experiences with AI.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased selection:bg-indigo-600 selection:text-white">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
