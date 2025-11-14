// src/components/AuthLayout.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/utils/supabase/client';
import { useRouter, usePathname } from 'next/navigation';
import LoadingSpinner from './LoadingSpinner'; // Importe o LoadingSpinner

// Rotas que exigem uma celula_id no perfil do usuário (APENAS PARA LÍDERES)
const PROTECTED_ROUTES_FOR_APP_CONTENT = [
    '/dashboard',
    '/membros', '/membros/novo', '/membros/editar',
    '/visitantes', '/visitantes/novo', '/visitantes/editar', '/visitantes/converter',
    '/reunioes', '/reunioes/novo', '/reunioes/editar', '/reunioes/presenca',
    '/relatorios',
    '/profile',
    '/admin/celulas',
    '/admin/users', // NOVO: Adicionado para garantir que admin/users é uma rota protegida
    '/admin/palavra-semana' // NOVO: Adicionado para garantir que admin/palavra-semana é uma rota protegida
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
      // Perfil não encontrado, cria perfil básico (role 'líder' por padrão, celula_id nulo)
      const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({
              id: userId,
              email: userEmail || null,
              role: 'líder', // Default role is 'líder'
              celula_id: null
          })
          .select('celula_id, role')
          .single();

      if (insertError) {
          console.error("AuthLayout: Erro ao criar perfil básico:", insertError);
          return null;
      }
      return newProfile; // Retorna o perfil recém-criado
    } else if (fetchError) {
      console.error("AuthLayout: Erro ao buscar perfil existente:", fetchError);
      return null; // Erro genérico na busca
    }
    return existingProfile; // Retorna o perfil encontrado
  }, []);

  // Ref para armazenar a lógica de redirecionamento, para evitar reexecução em cada renderização
  const handleRedirectRef = useRef(async (
      currentSession: any, 
      currentPath: string, 
      profile: { celula_id: string | null; role: 'admin' | 'líder' | null } | null
  ): Promise<boolean> => { // Retorna boolean para indicar se um redirecionamento ocorreu
    const isAuthRoute = AUTH_ROUTES.includes(currentPath);
    const isActivateRoute = currentPath === ACTIVATE_ACCOUNT_ROUTE;
    const isAppContentRoute = PROTECTED_ROUTES_FOR_APP_CONTENT.some(route => currentPath.startsWith(route));

    // 1. Se não está logado (sem sessão)
    if (!currentSession) {
      if (!isAuthRoute) { // Se não está em uma rota de autenticação (login, /)
        router.replace('/login'); // Redireciona para login
        return true; // Indica que houve um redirecionamento
      }
      return false; // Já está em uma rota de autenticação, permite renderizar (ex: login page)
    }

    // 2. Se está logado, mas o perfil é null (pode acontecer logo após login, antes de createOrFetchProfile)
    if (profile === null) {
        // Se o usuário está na rota de ativação, permite que a página de ativação carregue.
        // A página de ativação lidará com seu próprio estado de carregamento.
        if (isActivateRoute) {
            setLoading(false); // Permite renderizar a página de ativação
            return false; // Não redirecionar aqui
        }
        // Se estiver em qualquer outra rota protegida e o perfil for null, assume que precisa ativar.
        // Isso é uma salvaguarda.
        router.replace(ACTIVATE_ACCOUNT_ROUTE);
        return true;
    }

    // 3. Se está logado E tem um perfil:
    
    // Redirecionamentos específicos para Admin
    if (profile.role === 'admin') {
        // Admins devem ser redirecionados de rotas de autenticação ou ativação
        if (isAuthRoute || isActivateRoute) {
            router.replace('/dashboard');
            return true;
        }
        // Admins podem acessar rotas de admin
        if (currentPath.startsWith('/admin')) {
            return false; // Permite acesso
        }
        // Admins também podem acessar o conteúdo normal da aplicação (dashboard, membros, etc.)
        return false; // Permite acesso ao resto da aplicação
    }

    // Redirecionamentos para Líder (ou qualquer usuário que não seja admin)
    if (!profile.celula_id) {
      // Se o usuário é líder (ou não admin) e NÃO tem celula_id no perfil
      if (!isActivateRoute) { // E NÃO está na rota de ativação
        router.replace(ACTIVATE_ACCOUNT_ROUTE); // Redireciona para a página de ativação
        return true;
      }
      return false; // Já está na rota de ativação, permite renderizar
    } else {
      // Se o usuário é líder E tem celula_id (ativado):
      // Redireciona de rotas de autenticação ou ativação para o dashboard
      if (isActivateRoute || isAuthRoute) {
        router.replace('/dashboard');
        return true;
      }
      // Líderes ATIVADOS NÃO DEVEM acessar rotas de admin
      if (currentPath.startsWith('/admin')) {
        router.replace('/dashboard'); // Redireciona para o dashboard
        return true;
      }
      return false; // Permite renderizar o conteúdo da aplicação
    }
  });

  // Efeito para setup inicial e listener de autenticação
  useEffect(() => {
    let subscription: any; // Para guardar a assinatura do listener do Supabase
    const currentHandleRedirect = handleRedirectRef.current; // Captura a referência da função

    const setupAuthAndRedirect = async () => {
      setLoading(true); // Inicia o carregamento

      // Obtém a sessão atual
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error("AuthLayout: Erro ao obter sessão inicial:", sessionError);
      }
      setSession(currentSession); // Atualiza o estado da sessão

      // Tenta buscar ou criar o perfil do usuário
      let fetchedProfile = null;
      if (currentSession?.user) {
        fetchedProfile = await createOrFetchProfile(currentSession.user.id, currentSession.user.email);
        setUserProfile(fetchedProfile); // Atualiza o estado do perfil
      } else {
        setUserProfile(null); // Limpa o perfil se não houver sessão
      }

      // Executa a lógica de redirecionamento com base no estado atual
      const needsRedirect = await currentHandleRedirect(currentSession, pathname, fetchedProfile);

      if (needsRedirect) {
        setLoading(false); // Se houve redirecionamento, para o loading
        return; // Não precisa configurar o listener ou continuar
      }

      // Se não houve redirecionamento imediato, configura o listener para mudanças de estado de autenticação
      const { data } = supabase.auth.onAuthStateChange(
        async (event, currentSession) => {
          // console.log("Auth State Change:", event, currentSession?.user?.email); // Debug
          setSession(currentSession); // Atualiza a sessão quando muda
          
          let updatedFetchedProfile = null;
          if (currentSession?.user) {
            updatedFetchedProfile = await createOrFetchProfile(currentSession.user.id, currentSession.user.email);
            setUserProfile(updatedFetchedProfile);
          } else {
            setUserProfile(null);
          }
          // Reexecuta a lógica de redirecionamento após a mudança de estado
          await currentHandleRedirect(currentSession, pathname, updatedFetchedProfile);
        }
      );
      subscription = data.subscription; // Guarda a função de unsubscribe

      setLoading(false); // Finaliza o carregamento inicial
    };

    setupAuthAndRedirect();

    // Limpa o listener quando o componente é desmontado
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [pathname, createOrFetchProfile]); // Dependências do efeito


  // Lógica para renderizar o spinner de carregamento ou o conteúdo
  // Se estiver carregando E não estivermos na rota de ativação E o perfil ainda não estiver ok: mostra o spinner.
  // Se estiver na rota de ativação e perfil ainda não estiver ok, permite renderizar a página de ativação.
  const isLoggedIn = !!session?.user;
  const isActivateRoute = pathname === ACTIVATE_ACCOUNT_ROUTE;
  const hasProfileData = userProfile !== null; // Verifica se o perfil foi obtido (mesmo que null, indica que a busca terminou)
  const hasCelulaId = userProfile?.celula_id !== null && userProfile?.celula_id !== undefined;
  const isAdmin = userProfile?.role === 'admin';

  // Renderiza o spinner se estivermos em carregamento E não nos cenários de exceção
  if (loading && !(isLoggedIn && isActivateRoute && !hasProfileData)) {
      return <LoadingSpinner />;
  }

  // Se estiver logado, na rota de ativação, e o perfil ainda não foi carregado ou não tem celula_id
  // (o que significa que o usuário está no fluxo de ativação), renderiza os filhos (ActivateAccountPage).
  if (isLoggedIn && isActivateRoute && (!hasProfileData || !hasCelulaId && !isAdmin)) {
      return <>{children}</>;
  }

  // Se não está logado E está em uma rota de autenticação (login, /), renderiza os filhos (AuthForm).
  if (!isLoggedIn && AUTH_ROUTES.includes(pathname)) {
      return <>{children}</>;
  }

  // Se todas as verificações de redirecionamento foram satisfeitas e loading é falso, renderiza os filhos.
  // Isso ocorre quando o usuário está logado e tem o perfil completo, ou quando está em uma rota pública.
  return <>{children}</>;
}