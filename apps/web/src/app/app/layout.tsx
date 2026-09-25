import React from 'react';
import { AppShell } from '../../components/layout/AppShell';

export default function CustomerAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
