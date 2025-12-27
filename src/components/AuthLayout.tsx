'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/utils/supabase/client';
import { useRouter, usePathname } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner'; // Assumindo que este componente existe

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
    '/admin/palavra-semana',
    '/eventos-face-a-face', // Adicionado para eventos
    '/admin/eventos-face-a-face' // Adicionado para admin de eventos
];
const AUTH_ROUTES = ['/login', '/'];
const ACTIVATE_ACCOUNT_ROUTE = '/activate-account';
const LOGOUT_ROUTE = '/logout';

// NOVO: Prefixo da Rota de Convite Pública
const PUBLIC_INVITE_ROUTE_PREFIX = '/convite/';

// Função auxiliar para verificar se a rota é pública (login, /, ou convite)
const isPublicRoute = (path: string): boolean => {
    return AUTH_ROUTES.includes(path) || path.startsWith(PUBLIC_INVITE_ROUTE_PREFIX);
};


export default function AuthLayout({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [userProfile, setUserProfile] = useState<{ celula_id: string | null; role: 'admin' | 'líder' | null } | null>(null);

    const router = useRouter();
    const pathname = usePathname();

    const createOrFetchProfile = useCallback(async (userId: string, userEmail: string | undefined | null) => {
        // ... (Mantenha a lógica de criação/busca de perfil inalterada)
        const { data: existingProfile, error: fetchError } = await supabase
            .from('profiles')
            .select('celula_id, role')
            .eq('id', userId)
            .single();

        if (fetchError && fetchError.code === 'PGRST116') {
            const { data: newProfile, error: insertError } = await supabase
                .from('profiles')
                .insert({
                    id: userId,
                    email: userEmail || null,
                    role: 'líder',
                    celula_id: null
                })
                .select('celula_id, role')
                .single();

            if (insertError) {
                console.error("AuthLayout: Erro ao criar perfil:", insertError);
                return null;
            }
            return newProfile;
        } else if (fetchError) {
            console.error("AuthLayout: Erro ao buscar perfil:", fetchError);
            return null;
        }
        return existingProfile;
    }, []);

    const handleRedirectRef = useRef(async (
        currentSession: any,
        currentPath: string,
        profile: { celula_id: string | null; role: 'admin' | 'líder' | null } | null
    ): Promise<boolean> => {

        // 0. Rotas Ignoradas
        if (currentPath === LOGOUT_ROUTE) {
            return false; 
        }
        
        // NOVO: Se for rota de convite, NUNCA redirecione.
        if (currentPath.startsWith(PUBLIC_INVITE_ROUTE_PREFIX)) {
            // Se chegamos aqui, o convite será renderizado. Não precisa de mais checks.
            return false;
        }

        const isAuthRoute = AUTH_ROUTES.includes(currentPath);
        const isActivateRoute = currentPath === ACTIVATE_ACCOUNT_ROUTE;

        // 1. Não logado
        if (!currentSession) {
            if (!isAuthRoute) {
                router.replace('/login');
                return true;
            }
            return false; // Permite renderizar login/home
        }

        // --- Lógica para usuário logado ---
        
        // 2. Logado, mas perfil null ou em ativação
        if (profile === null || (profile.role === 'líder' && !profile.celula_id)) {
            if (isActivateRoute) {
                // Está na rota correta para ativação, deixe renderizar
                return false;
            }
            // Não está na rota correta, redireciona para ativação
            router.replace(ACTIVATE_ACCOUNT_ROUTE);
            return true;
        }

        // 3. Logado e com perfil (Admin ou Líder Atribuído)
        
        // Se for admin, mas está na rota de auth/ativação, redireciona para dashboard
        if (profile.role === 'admin') {
            if (isAuthRoute || isActivateRoute) {
                router.replace('/dashboard');
                return true;
            }
            return false;
        }

        // Se for líder Atribuído, mas está na rota de auth/ativação, redireciona para dashboard
        if (profile.celula_id) {
            if (isActivateRoute || isAuthRoute) {
                router.replace('/dashboard');
                return true;
            }
            // Se tentar acessar /admin, redireciona para dashboard
            if (currentPath.startsWith('/admin')) {
                router.replace('/dashboard');
                return true;
            }
            return false;
        }
        
        return false; // Catch-all: permite a navegação normal.
    });

    useEffect(() => {
        // Ignora o processamento do useEffect na rota de logout para evitar corrida
        if (pathname === LOGOUT_ROUTE) {
            setLoading(false);
            return;
        }
        
        const currentHandleRedirect = handleRedirectRef.current;
        let subscription: any;

        const setupAuthAndRedirect = async () => {
            setLoading(true);

            const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError) {
                console.warn("AuthLayout: Sessão inválida detectada. Forçando limpeza.", sessionError.message);
                await supabase.auth.signOut();
                setSession(null);
                setUserProfile(null);
                // NOTA: Se a rota atual for de convite, não queremos redirecionar para login aqui
                if (!isPublicRoute(pathname)) {
                    router.replace('/login');
                }
                setLoading(false);
                return;
            }

            setSession(currentSession);

            let fetchedProfile = null;
            if (currentSession?.user) {
                fetchedProfile = await createOrFetchProfile(currentSession.user.id, currentSession.user.email);
                setUserProfile(fetchedProfile);
            } else {
                setUserProfile(null);
            }

            // AQUI OCORRE A VALIDAÇÃO E POSSÍVEL REDIRECIONAMENTO INICIAL
            const needsRedirect = await currentHandleRedirect(currentSession, pathname, fetchedProfile);

            if (needsRedirect) {
                setLoading(false);
                return;
            }

            // Inicia o listener de mudança de estado de autenticação
            const { data } = supabase.auth.onAuthStateChange(
                async (event, currentSession) => {
                    if (event === 'SIGNED_OUT') {
                        setSession(null);
                        setUserProfile(null);
                        router.replace('/login');
                        return;
                    }

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
    }, [pathname, createOrFetchProfile, router]);


    const isLoggedIn = !!session?.user;
    const isActivateRoute = pathname === ACTIVATE_ACCOUNT_ROUTE;
    const isInviteRoute = pathname.startsWith(PUBLIC_INVITE_ROUTE_PREFIX);

    // Renderiza spinner de TELA CHEIA durante verificação inicial
    if (loading) {
        // Exibe spinner exceto se estiver na rota de convite E o loading já está desativado pelo handler
        if (!isInviteRoute) {
            return <LoadingSpinner fullScreen text="Verificando acesso..." />;
        }
    }

    // Se estiver em rota pública (login, / ou /convite) e não estiver logado, renderiza os filhos.
    if (!isLoggedIn && (AUTH_ROUTES.includes(pathname) || isInviteRoute)) {
        return <>{children}</>;
    }
    
    // Se o usuário está logado, mas está na etapa de ativação, renderiza os filhos (ActivateAccountPage).
    if (isLoggedIn && isActivateRoute) {
         return <>{children}</>;
    }

    // Se estiver logado, tem perfil completo, e não houve redirecionamento (lógica de handleRedirectRef)
    // ou se a rota atual é pública e o handleRedirectRef já terminou, renderiza os filhos.
    // Se loading for false, o fluxo do handleRedirectRef foi completado.
    if (!loading) {
        return <>{children}</>;
    }

    // Caso de fallback (nunca deveria acontecer se o handleRedirectRef estiver completo)
    return <LoadingSpinner fullScreen text="Carregando..." />;
}