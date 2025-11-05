// src/app/login/page.tsx
'use client';

import AuthForm from '@/components/AuthForm'; // Importa o componente do formulário de autenticação

export default function LoginPage() {
  // O AuthLayout já gerencia a lógica de autenticação, redirecionamentos e o estado de carregamento.
  // Esta página simplesmente renderiza o AuthForm centralizado.
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center"> {/* Container que ocupa toda a altura, com flexbox para centralizar o conteúdo */}
      <AuthForm /> {/* O componente do formulário de autenticação */}
    </div>
  );
}