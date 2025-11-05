'use server';

import { createServerClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { customAlphabet } from 'nanoid';

// Função auxiliar para verificar se o usuário logado TEM role 'admin'
async function checkAdminAuthorizationKeys(): Promise<{
    supabaseAdmin: any; // Agora é explicitamente o AdminClient
    isAdmin: boolean;
}> {
    const supabaseClient = createServerClient();
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
        console.warn("checkAdminAuthorizationKeys: Usuário não autenticado ou erro:", userError);
        return { supabaseAdmin: createAdminClient(), isAdmin: false };
    }

    const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profileError || !profile) {
        console.error("checkAdminAuthorizationKeys: Erro ao buscar perfil do usuário:", profileError);
        return { supabaseAdmin: createAdminClient(), isAdmin: false };
    }

    if (profile.role === 'admin') {
        return { supabaseAdmin: createAdminClient(), isAdmin: true };
    } else {
        return { supabaseAdmin: createAdminClient(), isAdmin: false };
    }
}

// MODIFICADO: 'chave' é agora o identificador único, removido 'id'
export interface ChaveAtivacao {
    chave: string; // Este é o identificador único e valor da chave
    celula_id: string;
    usada: boolean;
    // 'created_at: string;' não existe na sua tabela, conforme a imagem.
}

// Exporta generateNanoId para ser usada em outras Server Actions (como createCelulaAdmin)
export const generateNanoId = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 12);

export async function createChaveAtivacaoAdmin(celulaId: string): Promise<ChaveAtivacao> {
    const { supabaseAdmin, isAdmin } = await checkAdminAuthorizationKeys();

    if (!isAdmin) {
        throw new Error("Não autorizado: Apenas administradores podem gerar chaves de ativação.");
    }

    try {
        const novaChave = generateNanoId();

        const { data, error } = await supabaseAdmin // USANDO ADMIN CLIENT
            .from('chaves_ativacao')
            .insert({
                chave: novaChave, // Inserindo a chave gerada
                celula_id: celulaId,
                usada: false,
            })
            .select('chave, celula_id, usada') // Seleciona as colunas existentes
            .single();

        if (error) {
            console.error("createChaveAtivacaoAdmin (Server Action): Erro ao gerar chave de ativação:", error);
            throw new Error(`Falha ao gerar chave de ativação: ${error.message}`);
        }
        revalidatePath('/admin/celulas'); // Revalida a página onde a lista de chaves é exibida
        return data;
    } catch (e: any) {
        console.error("Erro na Server Action createChaveAtivacaoAdmin:", e.message);
        throw e;
    }
}

export async function listChavesAtivacaoAdmin(celulaId?: string): Promise<ChaveAtivacao[]> {
    const { supabaseAdmin, isAdmin } = await checkAdminAuthorizationKeys();

    if (!isAdmin) {
        throw new Error("Não autorizado: Apenas administradores podem listar chaves de ativação.");
    }

    try {
        // MODIFICADO: Seleciona as colunas existentes, não um 'id' que não existe
        let query = supabaseAdmin.from('chaves_ativacao').select('chave, celula_id, usada'); // USANDO ADMIN CLIENT

        if (celulaId) {
            query = query.eq('celula_id', celulaId);
        }

        const { data, error } = await query;

        if (error) {
            console.error("listChavesAtivacaoAdmin (Server Action): Erro ao listar chaves de ativação:", error);
            throw new Error(`Falha ao listar chaves de ativação: ${error.message}`);
        }
        return data || [];
    } catch (e: any) {
        console.error("Erro na Server Action listChavesAtivacaoAdmin:", e.message);
        throw e;
    }
}