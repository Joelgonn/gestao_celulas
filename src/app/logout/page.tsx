// src/app/logout/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner'; // Garanta o caminho correto
import { supabase } from '@/utils/supabase/client'; // Para signOut final

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    const performFinalLogoutAndRedirect = async () => {
      // 1. Deslogar do Supabase (para invalidar o token no servidor, se ainda for válido)
      try {
        await supabase.auth.signOut();
      } catch (signOutError) {
        console.warn('LogoutPage: Erro no supabase.auth.signOut (provavelmente token já expirado):', signOutError);
      }

      // 2. Limpeza FORÇADA e completa do localStorage/sessionStorage
      if (typeof window !== 'undefined') {
        try {
          // Limpa TUDO relacionado ao Supabase que possa estar no storage
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('sb:') || key.includes('supabase')) {
              localStorage.removeItem(key);
            }
          });
          Object.keys(sessionStorage).forEach(key => {
            if (key.startsWith('sb:') || key.includes('supabase')) {
              sessionStorage.removeItem(key);
            }
          });
          
          // E, como medida extra de segurança para alguns navegadores/cookies
          document.cookie.split(';').forEach(cookie => {
              const cookieName = cookie.split('=')[0].trim();
              // Ajuste o regex ou string para capturar seus cookies de sessão se tiver
              if (cookieName.includes('supabase')) { // Exemplo: se Supabase usa cookies
                  document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
              }
          });

        } catch (storageError) {
          console.error('LogoutPage: Erro ao limpar storage/cookies:', storageError);
        }
      }

      // 3. Redirecionamento final para /login com um HARD RELOAD
      // Isso é o MAIS IMPORTANTE para zerar o estado do Next.js
      if (typeof window !== 'undefined') {
        window.location.replace('/login'); // Usar replace para não adicionar ao histórico
      }
    };

    performFinalLogoutAndRedirect();
  }, [router]); // Dependências: apenas router (para o linter)

  return <LoadingSpinner fullScreen text="Finalizando sessão..." />;
}