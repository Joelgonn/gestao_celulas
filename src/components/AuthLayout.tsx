'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/utils/supabase/client';
import { useRouter, usePathname } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';

const AUTH_ROUTES = ['/login', '/'];
const ACTIVATE_ACCOUNT_ROUTE = '/activate-account';
const LOGOUT_ROUTE = '/logout';
const PUBLIC_INVITE_ROUTE_PREFIX = '/convite/';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    const [loading, setLoading] = useState(true);
    const [session, setSession] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);

    const router = useRouter();
    const pathname = usePathname();

    // Função para buscar ou criar o perfil do usuário
    const fetchProfile = useCallback(async (userId: string, email: string | undefined) => {
        const { data, error } = await supabase
            .from('profiles')
            .select('celula_id, role')
            .eq('id', userId)
            .single();

        if (error && error.code === 'PGRST116') {
            // Perfil não existe, cria um novo como líder sem célula
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

    const checkAccess = useCallback(async () => {
        setLoading(true);
        
        // 1. Obter sessão atual
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);

        if (!currentSession) {
            // Não logado: permite apenas rotas de auth ou convite
            if (!AUTH_ROUTES.includes(pathname) && !pathname.startsWith(PUBLIC_INVITE_ROUTE_PREFIX)) {
                router.replace('/login');
            }
            setLoading(false);
            return;
        }

        // 2. Logado: Buscar Perfil
        const userProfile = await fetchProfile(currentSession.user.id, currentSession.user.email);
        setProfile(userProfile);

        // 3. Lógica de Redirecionamento
        const isAuthRoute = AUTH_ROUTES.includes(pathname);
        const isActivateRoute = pathname === ACTIVATE_ACCOUNT_ROUTE;
        const isPublicInvite = pathname.startsWith(PUBLIC_INVITE_ROUTE_PREFIX);

        // Se for rota de convite, permite visualizar independente de estar logado ou não
        if (isPublicInvite) {
            setLoading(false);
            return;
        }

        // Se não tem perfil ou é líder sem célula -> Forçar Ativação
        if (!userProfile || (userProfile.role === 'líder' && !userProfile.celula_id)) {
            if (!isActivateRoute) {
                router.replace(ACTIVATE_ACCOUNT_ROUTE);
            }
        } 
        // Se já está ativo (Admin ou Líder com célula) -> Tirar da tela de Login/Ativação
        else {
            if (isAuthRoute || isActivateRoute) {
                router.replace('/dashboard');
            }
        }

        setLoading(false);
    }, [pathname, router, fetchProfile]);

    useEffect(() => {
        if (pathname === LOGOUT_ROUTE) {
            setLoading(false);
            return;
        }

        checkAccess();

        // Escuta mudanças na autenticação (login/logout)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                checkAccess();
            }
            if (event === 'SIGNED_OUT') {
                setSession(null);
                setProfile(null);
                router.replace('/login');
            }
        });

        return () => subscription.unsubscribe();
    }, [pathname, checkAccess, router]);

    // Renderização
    if (loading && !pathname.startsWith(PUBLIC_INVITE_ROUTE_PREFIX)) {
        return <LoadingSpinner fullScreen text="Verificando permissões..." />;
    }

    return <>{children}</>;
}