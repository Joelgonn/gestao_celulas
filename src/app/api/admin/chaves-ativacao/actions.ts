// src/app/api/admin/chaves-ativacao/actions.ts
'use server';

import { createAdminClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid'; // Para gerar a chave

// --- IMPORTAÇÃO DE CHAVEATIVACAO DO NOVO ARQUIVO types.ts (ALTERADO AQUI) ---
import { ChaveAtivacao } from '@/lib/types'; // Importado de types.ts
// --- FIM DA ALTERAÇÃO ---

// REMOVIDO AQUI: A definição da interface ChaveAtivacao não está mais aqui.
// Ela agora está em src/lib/types.ts

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

    revalidatePath('/admin/celulas'); // Revalida a página para mostrar a nova chave

    return data; // Já tipado como ChaveAtivacao
}

export async function listChavesAtivacaoAdmin(): Promise<ChaveAtivacao[]> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
        .from('chaves_ativacao')
        .select('*') // Seleciona todas as colunas
        .order('created_at', { ascending: false }); // Ordena pela data de criação

    if (error) {
        throw new Error(`Falha ao listar chaves de ativação: ${error.message}`);
    }

    return data || [];
}