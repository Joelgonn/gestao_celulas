// src/app/(app)/layout.tsx
'use client'; // Necessário para usar hooks do React como useState, useEffect etc.

import React from 'react';
import MainLayout from '@/components/MainLayout'; // Importa o layout principal que contém a navegação e a estrutura geral

interface AppLayoutProps {
  children: React.ReactNode; // O conteúdo das páginas filhas (ex: Dashboard, Membros, etc.)
}

export default function AppLayout({ children }: AppLayoutProps) {
  // O MainLayout é aplicado a todas as rotas dentro de (app)
  // Ele gerencia a exibição da sidebar, cabeçalho e o conteúdo principal.
  return (
    <MainLayout>
      {children}
    </MainLayout>
  );
}