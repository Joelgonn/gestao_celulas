'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/utils/supabase/client';
import { useRouter, usePathname } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';

const AUTH_ROUTES = ['/login', '/'];
const ACTIVATE_ACCOUNT_ROUTE = '/activate-account';
const LOGOUT_ROUTE = '/logout';
const PUBLIC_INVITE_ROUTE_PREFIX = '/convite/';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    // Inicializamos como true apenas se não houver indício de sessão
    const [loading, setLoading] = useState(true);
    const [session, setSession] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    
    // Ref para evitar múltiplas verificações simultâneas
    const isChecking = useRef(false);

    const router = useRouter();
    const pathname = usePathname();

    const fetchProfile = useCallback(async (userId: string, email: string | undefined) => {
        const { data, error } = await supabase
            .from('profiles')
            .select('celula_id, role')
            .eq('id', userId)
            .single();

        if (error && error.code === 'PGRST116') {
            const { data: newProfile, error: insertError } = await supabase
                .from('profiles')
                .insert({
                    id: userId,
                    email: email || null,
                    role: 'líder',
                    celula_id: null
                })
                .select('celula_id, role')
                .single();
            
            if (insertError) return null;
            return newProfile;
        }
        return data || null;
    }, []);

    const checkAccess = useCallback(async (isInitialLoad = false) => {
        if (isChecking.current) return;
        isChecking.current = true;

        // Só mostramos o loading de tela cheia no primeiro carregamento
        // ou se não houver dados de sessão/perfil salvos.
        if (isInitialLoad) setLoading(true);
        
        try {
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            setSession(currentSession);

            const isPublicInvite = pathname.startsWith(PUBLIC_INVITE_ROUTE_PREFIX);
            const isAuthRoute = AUTH_ROUTES.includes(pathname);
            const isActivateRoute = pathname === ACTIVATE_ACCOUNT_ROUTE;

            if (!currentSession) {
                if (!isAuthRoute && !isPublicInvite) {
                    router.replace('/login');
                }
                setLoading(false);
                return;
            }

            // Busca o perfil
            const userProfile = await fetchProfile(currentSession.user.id, currentSession.user.email);
            setProfile(userProfile);

            if (isPublicInvite) {
                setLoading(false);
                return;
            }

            // Lógica de Redirecionamento (Sem interromper a UI se já estiver correto)
            if (!userProfile || (userProfile.role === 'líder' && !userProfile.celula_id)) {
                if (!isActivateRoute) {
                    router.replace(ACTIVATE_ACCOUNT_ROUTE);
                }
            } else {
                if (isAuthRoute || isActivateRoute) {
                    router.replace('/dashboard');
                }
            }
        } catch (err) {
            console.error("Erro no checkAccess:", err);
        } finally {
            setLoading(false);
            isChecking.current = false;
        }
    }, [pathname, router, fetchProfile]);

    useEffect(() => {
        if (pathname === LOGOUT_ROUTE) {
            setLoading(false);
            return;
        }

        // Executa a verificação inicial
        checkAccess(true);

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                // Verificação silenciosa nas mudanças de estado
                checkAccess(false);
            }
            if (event === 'SIGNED_OUT') {
                setSession(null);
                setProfile(null);
                setLoading(false);
                router.replace('/login');
            }
        });

        return () => subscription.unsubscribe();
    }, [pathname, checkAccess, router]);

    // O segredo está aqui: Se já temos uma sessão, não mostramos o loading 
    // mesmo que o checkAccess esteja rodando em background (comum no mobile).
    if (loading && !session && !pathname.startsWith(PUBLIC_INVITE_ROUTE_PREFIX)) {
        return <LoadingSpinner fullScreen text="Carregando dados..." />;
    }

    return <>{children}</>;
}