'use server';

import { createServerClient, createAdminClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import type { User } from '@supabase/supabase-js';

// No longer needs explicit CelulaOption import if it's derived internally or used from data.ts
// import { CelulaOption } from '@/lib/data';

// ============================================================================
//                                INTERFACES ESPECÍFICAS DE ADMIN/USERS
// ============================================================================

export interface UserProfile {
    id: string;
    email: string | null;
    role: 'admin' | 'líder' | null;
    celula_id: string | null;
    celula_nome?: string | null; // Adicionado nome da célula
    created_at: string;
    last_sign_in_at: string | null;
}

export interface UpdateUserProfileData {
    celula_id: string | null;
    role: 'admin' | 'líder';
}

// ============================================================================
//                          FUNÇÃO AUXILIAR DE AUTORIZAÇÃO ADMIN
// ============================================================================

async function checkAdminAuthorizationUsers(): Promise<{
    supabaseAdmin: any;
    isAdmin: boolean;
}> {
    const supabaseClient = createServerClient();
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
        console.warn("checkAdminAuthorizationUsers: Usuário não autenticado ou erro:", userError);
        return { supabaseAdmin: createAdminClient(), isAdmin: false };
    }

    const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profileError || !profile) {
        console.error("checkAdminAuthorizationUsers: Erro ao buscar perfil do usuário:", profileError);
        return { supabaseAdmin: createAdminClient(), isAdmin: false };
    }

    if (profile.role === 'admin') {
        return { supabaseAdmin: createAdminClient(), isAdmin: true };
    } else {
        return { supabaseAdmin: createAdminClient(), isAdmin: false };
    }
}


// ============================================================================
//                                SERVER ACTIONS ADMIN/USERS
// ============================================================================

export async function listAllProfiles(): Promise<UserProfile[]> {
    const { supabaseAdmin, isAdmin } = await checkAdminAuthorizationUsers();

    if (!isAdmin) {
        throw new Error("Não autorizado: Apenas administradores podem listar todos os perfis.");
    }

    try {
        // Busca os perfis customizados
        const { data: profiles, error: profilesError } = await supabaseAdmin
            .from('profiles')
            .select('id, email, role, celula_id, created_at')
            .order('created_at', { ascending: false });

        if (profilesError) {
            console.error("listAllProfiles: Erro ao buscar perfis customizados:", profilesError);
            throw new Error(`Falha ao carregar perfis: ${profilesError.message}`);
        }

        // Busca todos os usuários do sistema de autenticação para obter last_sign_in_at
        const { data: authUsers, error: authUsersError } = await supabaseAdmin.auth.admin.listUsers();

        if (authUsersError) {
            console.error("listAllProfiles: Erro ao buscar usuários de auth.users:", authUsersError);
            // Continua, mas com last_sign_in_at faltando ou null
        }
        
        const authUsersMap = new Map((authUsers?.users || []).map((u: User) => [u.id, u.last_sign_in_at]));

        // Coleta todos os celula_id únicos dos perfis para buscar os nomes das células
        const celulaIds = new Set((profiles || []).map((p: { celula_id: string | null }) => p.celula_id).filter(Boolean) as string[]);
        
        const celulasNamesMap = new Map<string, string>();
        if (celulaIds.size > 0) {
             const { data: celulas, error: celulasError } = await supabaseAdmin
                .from('celulas')
                .select('id, nome')
                .in('id', Array.from(celulaIds));
            if (celulasError) {
                console.warn("listAllProfiles: Erro ao buscar nomes de células:", celulasError);
            } else {
                celulas?.forEach((c: { id: string; nome: string }) => celulasNamesMap.set(c.id, c.nome));
            }
        }


        // Mapeia os dados para o formato UserProfile
        const userProfiles: UserProfile[] = (profiles || []).map((p: any) => ({
            id: p.id,
            email: p.email,
            role: p.role,
            celula_id: p.celula_id,
            celula_nome: p.celula_id ? celulasNamesMap.get(p.celula_id) : null,
            created_at: p.created_at,
            last_sign_in_at: authUsersMap.get(p.id) || null, // Adiciona o last_sign_in_at
        }));
        
        revalidatePath('/admin/users');
        return userProfiles;

    } catch (e: any) {
        console.error("Erro na Server Action listAllProfiles:", e.message);
        throw e;
    }
}

export async function updateUserProfile(targetUserId: string, data: UpdateUserProfileData): Promise<void> {
    const { supabaseAdmin, isAdmin } = await checkAdminAuthorizationUsers();

    if (!isAdmin) {
        throw new Error("Não autorizado: Apenas administradores podem atualizar perfis.");
    }

    // Previne que um admin tente alterar o próprio perfil por esta interface (segurança)
    const { data: { user } } = await supabaseAdmin.auth.getUser();
    if (user && user.id === targetUserId) {
        throw new Error("Não é possível alterar seu próprio perfil de usuário por esta interface. Use a página 'Meu Perfil'.");
    }

    try {
        const { error } = await supabaseAdmin
            .from('profiles')
            .update({
                celula_id: data.celula_id,
                role: data.role,
            })
            .eq('id', targetUserId);

        if (error) {
            console.error("updateUserProfile: Erro ao atualizar perfil:", error);
            throw new Error(`Falha ao atualizar perfil: ${error.message}`);
        }
        revalidatePath('/admin/users'); // Revalida a lista de usuários admin
        revalidatePath('/dashboard'); // Revalida o dashboard, caso o perfil afetado seja o do usuário logado
    } catch (e: any) {
        console.error("Erro na Server Action updateUserProfile:", e.message);
        throw e;
    }
}

export async function sendMagicLinkToUser(email: string): Promise<{ success: boolean; message: string }> {
    const { supabaseAdmin, isAdmin } = await checkAdminAuthorizationUsers();

    if (!isAdmin) {
        return { success: false, message: "Não autorizado: Apenas administradores podem enviar links mágicos." };
    }

    if (!email || !email.trim()) {
        return { success: false, message: "Email inválido." };
    }

    try {
        const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email.trim(), {
            // Redireciona para o dashboard após o login, onde a ativação da conta será verificada
            redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`, 
        });

        if (error) {
            console.error("sendMagicLinkToUser: Erro ao enviar link mágico:", error);
            if (error.status === 429) {
                 throw new Error("Limite de taxa de envio de email excedido. Tente novamente mais tarde.");
            }
            throw new Error(`Falha ao enviar link mágico: ${error.message}`);
        }

        revalidatePath('/admin/users'); // Revalida a lista de usuários admin
        
        return { 
            success: true, 
            message: `Link mágico/Convite enviado para ${email}. O usuário precisará ativar a conta.` 
        };

    } catch (e: any) {
        console.error("Erro na Server Action sendMagicLinkToUser:", e.message);
        return { success: false, message: `Erro ao enviar link mágico: ${e.message}` };
    }
}

export async function deleteUserAndProfile(targetUserId: string): Promise<void> {
    const { supabaseAdmin, isAdmin } = await checkAdminAuthorizationUsers();

    if (!isAdmin) {
        throw new Error("Não autorizado: Apenas administradores podem excluir usuários.");
    }

    // Previne que um admin tente deletar o próprio perfil (segurança)
    const { data: { user } } = await supabaseAdmin.auth.getUser();
    if (user && user.id === targetUserId) {
        throw new Error("Não é possível excluir seu próprio perfil de usuário por esta interface.");
    }

    try {
        // Primeiro, exclui o perfil customizado da tabela 'profiles'
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .delete()
            .eq('id', targetUserId);

        if (profileError) {
            console.error("deleteUserAndProfile: Erro ao excluir perfil customizado:", profileError);
            throw new Error(`Falha ao excluir perfil customizado: ${profileError.message}`);
        }

        // Em seguida, exclui o usuário do sistema de autenticação (auth.users)
        const { error: authUserError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);

        if (authUserError) {
            console.error("deleteUserAndProfile: Erro ao excluir usuário de auth.users:", authUserError);
            throw new Error(`Falha ao excluir usuário: ${authUserError.message}`);
        }

        revalidatePath('/admin/users'); // Revalida a lista de usuários admin
    } catch (e: any) {
        console.error("Erro na Server Action deleteUserAndProfile:", e.message);
        throw e;
    }
}