'use server';

import { createAdminClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid'; // Para gerar a chave

// --- IMPORTAÇÃO DE CHAVEATIVACAO DO NOVO ARQUIVO types.ts (ALTERADO AQUI) ---
import { ChaveAtivacao } from '@/lib/types'; // Importado de types.ts
// --- FIM DA ALTERAÇÃO ---

export async function createChaveAtivacaoAdmin(celulaId: string): Promise<ChaveAtivacao> {
    const supabase = createAdminClient();
    const newChave = uuidv4();

    const { data, error } = await supabase
        .from('chaves_ativacao')
        .insert({ chave: newChave, celula_id: celulaId })
        .select('*')
        .single();

    if (error) {
        throw new Error(`Falha ao criar chave de ativação: ${error.message}`);
    }

    revalidatePath('/admin/celulas'); // Revalida a página para mostrar a nova chave (onde a chave pode ser exibida)
    revalidatePath('/relatorios'); // Revalida relatórios, caso haja um de chaves de ativação

    return data; // Já tipado como ChaveAtivacao
}

export async function listChavesAtivacaoAdmin(): Promise<ChaveAtivacao[]> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
        .from('chaves_ativacao')
        .select(`
            chave,
            celula_id,
            usada,
            created_at,
            data_uso,
            usada_por_id,
            profiles(email)
        `) // Seleciona todas as colunas relevantes e faz join com profiles
        .order('created_at', { ascending: false }); // Ordena pela data de criação

    if (error) {
        throw new Error(`Falha ao listar chaves de ativação: ${error.message}`);
    }

    // Mapeia os dados para o tipo ChaveAtivacao, incluindo o email do perfil
    return data?.map(chave => ({
        chave: chave.chave,
        celula_id: chave.celula_id,
        usada: chave.usada,
        created_at: chave.created_at,
        data_uso: chave.data_uso,
        usada_por_id: chave.usada_por_id,
        usada_por_email: chave.profiles?.email || null, // Pega o email do relacionamento
    })) || [];
}