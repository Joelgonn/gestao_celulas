// src/components/AuthLayout.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/utils/supabase/client';
import { useRouter, usePathname } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner'; // Importação absoluta para padronizar

// Rotas que exigem uma celula_id no perfil do usuário (APENAS PARA LÍDERES)
const PROTECTED_ROUTES_FOR_APP_CONTENT = [
    '/dashboard',
    '/membros', '/membros/novo', '/membros/editar',
    '/visitantes', '/visitantes/novo', '/visitantes/editar', '/visitantes/converter',
    '/reunioes', '/reunioes/novo', '/reunioes/editar', '/reunioes/presenca',
    '/relatorios',
    '/profile',
    '/admin/celulas',
    '/admin/users',
    '/admin/palavra-semana'
];
const AUTH_ROUTES = ['/login', '/'];
const ACTIVATE_ACCOUNT_ROUTE = '/activate-account';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<{ celula_id: string | null; role: 'admin' | 'líder' | null } | null>(null);

  const router = useRouter();
  const pathname = usePathname();

  // Função para criar o perfil no Supabase se não existir, ou buscá-lo
  const createOrFetchProfile = useCallback(async (userId: string, userEmail: string | undefined | null) => {
    const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('celula_id, role')
        .eq('id', userId)
        .single();

    if (fetchError && fetchError.code === 'PGRST116') {
      // Perfil não encontrado, cria perfil básico
      const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({
              id: userId,
              email: userEmail || null,
              role: 'líder', // Default role
              celula_id: null
          })
          .select('celula_id, role')
          .single();

      if (insertError) {
          console.error("AuthLayout: Erro ao criar perfil básico:", insertError);
          return null;
      }
      return newProfile;
    } else if (fetchError) {
      console.error("AuthLayout: Erro ao buscar perfil existente:", fetchError);
      return null;
    }
    return existingProfile;
  }, []);

  // Lógica de redirecionamento (useRef para evitar loops de dependência no useEffect)
  const handleRedirectRef = useRef(async (
      currentSession: any, 
      currentPath: string, 
      profile: { celula_id: string | null; role: 'admin' | 'líder' | null } | null
  ): Promise<boolean> => {
    const isAuthRoute = AUTH_ROUTES.includes(currentPath);
    const isActivateRoute = currentPath === ACTIVATE_ACCOUNT_ROUTE;
    
    // 1. Não logado
    if (!currentSession) {
      if (!isAuthRoute) {
        router.replace('/login');
        return true;
      }
      return false;
    }

    // 2. Logado, mas perfil null (erro ou delay)
    if (profile === null) {
        if (isActivateRoute) {
            setLoading(false);
            return false;
        }
        router.replace(ACTIVATE_ACCOUNT_ROUTE);
        return true;
    }

    // 3. Logado e com perfil
    
    // Admin
    if (profile.role === 'admin') {
        if (isAuthRoute || isActivateRoute) {
            router.replace('/dashboard');
            return true;
        }
        return false; // Permite acesso a tudo
    }

    // Líder
    if (!profile.celula_id) {
      // Líder sem célula (não ativado)
      if (!isActivateRoute) {
        router.replace(ACTIVATE_ACCOUNT_ROUTE);
        return true;
      }
      return false;
    } else {
      // Líder ativado
      if (isActivateRoute || isAuthRoute) {
        router.replace('/dashboard');
        return true;
      }
      if (currentPath.startsWith('/admin')) {
        router.replace('/dashboard');
        return true;
      }
      return false;
    }
  });

  // Listener de Autenticação
  useEffect(() => {
    let subscription: any;
    const currentHandleRedirect = handleRedirectRef.current;

    const setupAuthAndRedirect = async () => {
      setLoading(true);

      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) console.error("AuthLayout: Erro de sessão:", sessionError);
      
      setSession(currentSession);

      let fetchedProfile = null;
      if (currentSession?.user) {
        fetchedProfile = await createOrFetchProfile(currentSession.user.id, currentSession.user.email);
        setUserProfile(fetchedProfile);
      } else {
        setUserProfile(null);
      }

      const needsRedirect = await currentHandleRedirect(currentSession, pathname, fetchedProfile);

      if (needsRedirect) {
        setLoading(false);
        return;
      }

      const { data } = supabase.auth.onAuthStateChange(
        async (event, currentSession) => {
          setSession(currentSession);
          
          let updatedFetchedProfile = null;
          if (currentSession?.user) {
            updatedFetchedProfile = await createOrFetchProfile(currentSession.user.id, currentSession.user.email);
            setUserProfile(updatedFetchedProfile);
          } else {
            setUserProfile(null);
          }
          await currentHandleRedirect(currentSession, pathname, updatedFetchedProfile);
        }
      );
      subscription = data.subscription;

      setLoading(false);
    };

    setupAuthAndRedirect();

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, [pathname, createOrFetchProfile]);


  const isLoggedIn = !!session?.user;
  const isActivateRoute = pathname === ACTIVATE_ACCOUNT_ROUTE;
  const hasProfileData = userProfile !== null;
  const hasCelulaId = userProfile?.celula_id !== null && userProfile?.celula_id !== undefined;
  const isAdmin = userProfile?.role === 'admin';

  // Renderiza spinner de TELA CHEIA durante verificação inicial
  if (loading && !(isLoggedIn && isActivateRoute && !hasProfileData)) {
      return <LoadingSpinner fullScreen text="Verificando acesso..." />;
  }

  // Renderização de conteúdo baseada no estado
  if (isLoggedIn && isActivateRoute && (!hasProfileData || !hasCelulaId && !isAdmin)) {
      return <>{children}</>;
  }

  if (!isLoggedIn && AUTH_ROUTES.includes(pathname)) {
      return <>{children}</>;
  }

  return <>{children}</>;
}