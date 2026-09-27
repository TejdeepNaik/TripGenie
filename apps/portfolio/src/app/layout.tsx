import './globals.css';
import React from 'react';

export const metadata = {
  title: 'Banoth Tejdeep Naik — Full-Stack Developer & AI Systems Engineer',
  description: 'Personal portfolio of Banoth Tejdeep Naik, B.Tech student at IIIT Lucknow specializing in full-stack applications, scalable backend systems, security, and AI-powered platforms.',
  keywords: ['Banoth Tejdeep Naik', 'Tejdeep Naik', 'IIIT Lucknow', 'Full-Stack Developer', 'Backend Engineering', 'TripGenie', 'CivicFix'],
  openGraph: {
    title: 'Banoth Tejdeep Naik — Full-Stack Developer',
    description: 'Portfolio showcasing TripGenie, backend architectures, AI integrations, and full-stack engineering work.',
    siteName: 'Tejdeep Naik Portfolio',
    locale: 'en_US',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body className="bg-[#090d16] text-slate-100 antialiased selection:bg-indigo-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
