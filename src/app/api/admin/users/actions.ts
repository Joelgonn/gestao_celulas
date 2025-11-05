'use server';

import { createServerClient, createAdminClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

// Reutiliza a interface CelulaOption de lib/data.ts
import { CelulaOption } from '@/lib/data';

// ============================================================================
//                                INTERFACES ESPECÍFICAS DE ADMIN/USERS
// ============================================================================

export interface UserProfile {
    id: string;
    email: string | null;
    role: 'admin' | 'líder' | null;
    celula_id: string | null;
    celula_nome?: string | null; // Nome da célula para exibição
    created_at: string;
    last_sign_in_at: string | null; // Da tabela auth.users
}

export interface UpdateUserProfileData {
    celula_id: string | null;
    role: 'admin' | 'líder';
}

// ============================================================================
//                          FUNÇÃO AUXILIAR DE AUTORIZAÇÃO ADMIN
// ============================================================================

async function checkAdminAuthorizationUsers(): Promise<{
    supabaseAdmin: any; // Sempre o cliente admin aqui
    isAdmin: boolean;
}> {
    const supabaseClient = createServerClient(); // Cliente normal para verificar a sessão
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
        // Se não é admin, retorna false e o cliente admin (para evitar falhas, mas isAdmin=false)
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
        // Busca perfis customizados
        const { data: profiles, error: profilesError } = await supabaseAdmin // USANDO ADMIN CLIENT
            .from('profiles')
            .select('id, email, role, celula_id, created_at')
            .order('created_at', { ascending: false });

        if (profilesError) {
            console.error("listAllProfiles: Erro ao buscar perfis customizados:", profilesError);
            throw new Error(`Falha ao carregar perfis: ${profilesError.message}`);
        }

        // Busca usuários da auth.users (para last_sign_in_at)
        const { data: authUsers, error: authUsersError } = await supabaseAdmin.auth.admin.listUsers(); // USANDO ADMIN CLIENT

        if (authUsersError) {
            console.error("listAllProfiles: Erro ao buscar usuários de auth.users:", authUsersError);
            // Não impede o carregamento dos perfis, mas avisa.
        }

        const authUsersMap = new Map((authUsers?.users || []).map(u => [u.id, u.last_sign_in_at]));

        const celulaIds = new Set((profiles || []).map(p => p.celula_id).filter(Boolean) as string[]);
        const celulasNamesMap = new Map<string, string>();
        if (celulaIds.size > 0) {
             const { data: celulas, error: celulasError } = await supabaseAdmin // USANDO ADMIN CLIENT
                .from('celulas')
                .select('id, nome')
                .in('id', Array.from(celulaIds));
            if (celulasError) {
                console.warn("listAllProfiles: Erro ao buscar nomes de células:", celulasError);
            } else {
                celulas?.forEach(c => celulasNamesMap.set(c.id, c.nome));
            }
        }


        const userProfiles: UserProfile[] = (profiles || []).map(p => ({
            id: p.id,
            email: p.email,
            role: p.role,
            celula_id: p.celula_id,
            celula_nome: p.celula_id ? celulasNamesMap.get(p.celula_id) : null,
            created_at: p.created_at,
            last_sign_in_at: authUsersMap.get(p.id) || null,
        }));
        
        revalidatePath('/admin/users'); // Revalida a página onde a lista de usuários é exibida
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

    // Validação básica para evitar que admin remova o próprio perfil ou altere sua própria role/celula
    const { data: { user } } = await supabaseAdmin.auth.getUser(); // USANDO ADMIN CLIENT (para obter o admin user)
    if (user && user.id === targetUserId) {
        throw new Error("Não é possível alterar seu próprio perfil de usuário por esta interface.");
    }

    try {
        const { error } = await supabaseAdmin // USANDO ADMIN CLIENT
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
        revalidatePath('/admin/users'); // Revalida a página
        revalidatePath('/dashboard'); // Pode afetar o dashboard de um líder
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
        const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email.trim(), { // USANDO ADMIN CLIENT
            redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`, // Redireciona para o dashboard após o login
        });

        if (error) {
            console.error("sendMagicLinkToUser: Erro ao enviar link mágico:", error);
            // Tratamento especial para erro 429 (Too many requests) ou outros erros de SMTP
            if (error.status === 429) {
                 throw new Error("Limite de taxa de envio de email excedido. Tente novamente mais tarde.");
            }
            throw new Error(`Falha ao enviar link mágico: ${error.message}`);
        }

        revalidatePath('/admin/users');
        // Se a resposta for um convite (usuário novo), a mensagem é diferente de um login (usuário existente)
        const isNewUser = data.user.aud === 'authenticated' && data.user.role === 'authenticated';
        
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

    const { data: { user } } = await supabaseAdmin.auth.getUser(); // USANDO ADMIN CLIENT
    if (user && user.id === targetUserId) {
        throw new Error("Não é possível excluir seu próprio perfil de usuário por esta interface.");
    }

    try {
        // Primeiro, exclua o perfil customizado (para evitar problemas de foreign key)
        const { error: profileError } = await supabaseAdmin // USANDO ADMIN CLIENT
            .from('profiles')
            .delete()
            .eq('id', targetUserId);

        if (profileError) {
            console.error("deleteUserAndProfile: Erro ao excluir perfil customizado:", profileError);
            throw new Error(`Falha ao excluir perfil customizado: ${profileError.message}`);
        }

        // Segundo, exclua o usuário da tabela auth.users
        const { error: authUserError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId); // USANDO ADMIN CLIENT

        if (authUserError) {
            console.error("deleteUserAndProfile: Erro ao excluir usuário de auth.users:", authUserError);
            // Nota: Se o erro for "User not found," a exclusão do perfil customizado já é suficiente.
            // Para ser robusto, verificamos o erro, mas o Admin Client geralmente é capaz de forçar a exclusão.
            throw new Error(`Falha ao excluir usuário: ${authUserError.message}`);
        }

        revalidatePath('/admin/users');
    } catch (e: any) {
        console.error("Erro na Server Action deleteUserAndProfile:", e.message);
        throw e;
    }
}