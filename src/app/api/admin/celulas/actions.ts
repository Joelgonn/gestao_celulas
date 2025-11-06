'use server';

import { createServerClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

// Importa a Server Action para criar chaves de ativação
import { createChaveAtivacaoAdmin } from '@/app/api/admin/chaves-ativacao/actions';


export interface Celula {
    id: string;
    nome: string;
    lider_principal: string | null;
    endereco: string | null;
    created_at: string; // Reflete a coluna created_at da tabela celulas
}

// Função auxiliar para verificar se o usuário logado TEM role 'admin'
async function checkAdminAuthorization(): Promise<{
    supabaseAdmin: any; // Agora é explicitamente o AdminClient
    isAdmin: boolean;
}> {
    const supabaseClient = createServerClient();
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
        console.warn("checkAdminAuthorization: Usuário não autenticado ou erro:", userError);
        // Retorna o AdminClient, mas isAdmin=false, garantindo que o AdminClient só seja usado se autorizado.
        return { supabaseAdmin: createAdminClient(), isAdmin: false }; 
    }

    const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profileError || !profile) {
        console.error("checkAdminAuthorization: Erro ao buscar perfil do usuário:", profileError);
        return { supabaseAdmin: createAdminClient(), isAdmin: false };
    }

    if (profile.role === 'admin') {
        return { supabaseAdmin: createAdminClient(), isAdmin: true };
    } else {
        // Se não for admin, retorna o AdminClient (para não falhar o código) mas com isAdmin=false
        return { supabaseAdmin: createAdminClient(), isAdmin: false };
    }
}


// --- Server Actions para Gerenciamento de Células (Admin) ---

export async function fetchCelulasAdmin(): Promise<Celula[]> {
    const { supabaseAdmin, isAdmin } = await checkAdminAuthorization();

    if (!isAdmin) {
        throw new Error("Não autorizado: Apenas administradores podem listar todas as células.");
    }

    try {
        const { data, error } = await supabaseAdmin // USANDO ADMIN CLIENT
            .from('celulas')
            .select('*')
            .order('nome', { ascending: true });

        if (error) {
            console.error("fetchCelulasAdmin (Server Action): Erro ao buscar células:", error);
            throw new Error(`Falha ao carregar células: ${error.message}`);
        }
        revalidatePath('/admin/celulas');
        return data || [];
    } catch (e: any) {
        console.error("Erro na Server Action fetchCelulasAdmin:", e.message);
        throw e;
    }
}

// Cria a célula e, em seguida, chama a criação da chave de ativação
export async function createCelulaAdmin(name: string, liderPrincipal: string | null, endereco: string | null): Promise<Celula> {
    const { supabaseAdmin, isAdmin } = await checkAdminAuthorization();

    if (!isAdmin) {
        throw new Error("Não autorizado: Apenas administradores podem criar células.");
    }

    try {
        // Inserir novo registro na tabela 'celulas'
        const { data: newCelula, error: celulaError } = await supabaseAdmin // USANDO ADMIN CLIENT
            .from('celulas')
            .insert({
                nome: name,
                lider_principal: liderPrincipal,
                endereco: endereco,
            })
            .select('*') // Retorna todos os campos da célula criada, incluindo o 'id'
            .single();

        if (celulaError) {
            console.error("createCelulaAdmin (Server Action): Erro ao criar célula:", celulaError);
            throw new Error(`Falha ao criar célula: ${celulaError.message}`);
        }

        // Criar a chave de ativação e vincular com a celula_id
        // NOTE: A função createChaveAtivacaoAdmin já garante que usa o AdminClient internamente.
        try {
            await createChaveAtivacaoAdmin(newCelula.id);
        } catch (keyError: any) {
            console.warn("Aviso: Célula criada, mas falha ao gerar chave de ativação:", keyError.message);
            // Decide se quer lançar o erro aqui ou apenas registrar.
            // Para este cenário, como a célula foi criada, apenas o aviso é suficiente.
        }

        revalidatePath('/admin/celulas');
        return newCelula;
    } catch (e: any) {
        console.error("Erro na Server Action createCelulaAdmin:", e.message);
        throw e;
    }
}

export async function updateCelulaAdmin(id: string, name: string, liderPrincipal: string | null, endereco: string | null): Promise<Celula> {
    const { supabaseAdmin, isAdmin } = await checkAdminAuthorization();

    if (!isAdmin) {
        throw new Error("Não autorizado: Apenas administradores podem atualizar células.");
    }

    try {
        const { data, error } = await supabaseAdmin // USANDO ADMIN CLIENT
            .from('celulas')
            .update({
                nome: name,
                lider_principal: liderPrincipal,
                endereco: endereco,
            })
            .eq('id', id)
            .select('*')
            .single();

        if (error) {
            console.error("updateCelulaAdmin (Server Action): Erro ao atualizar célula:", error);
            throw new Error(`Falha ao atualizar célula: ${error.message}`);
        }
        revalidatePath('/admin/celulas');
        return data;
    } catch (e: any) {
        console.error("Erro na Server Action updateCelulaAdmin:", e.message);
        throw e;
    }
}

export async function deleteCelulaAdmin(id: string): Promise<void> {
    const { supabaseAdmin, isAdmin } = await checkAdminAuthorization();

    if (!isAdmin) {
        throw new Error("Não autorizado: Apenas administradores podem excluir células.");
    }

    try {
        const { error } = await supabaseAdmin // USANDO ADMIN CLIENT
            .from('celulas')
            .delete()
            .eq('id', id);

        if (error) {
            console.error("deleteCelulaAdmin (Server Action): Erro ao excluir célula:", error);
            throw new Error(`Falha ao excluir célula: ${error.message}`);
        }
        revalidatePath('/admin/celulas');
    } catch (e: any) {
        console.error("Erro na Server Action deleteCelulaAdmin:", e.message);
        throw e;
    }
}