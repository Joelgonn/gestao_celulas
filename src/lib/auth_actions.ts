'use server'; // Indica que este é um arquivo de Server Actions

import { createServerClient, createAdminClient } from '@/utils/supabase/server'; // Clientes Supabase para SSR e Admin
import { revalidatePath } from 'next/cache'; // Para invalidar cache quando dados mudam
// import { subDays } from 'date-fns'; // Para manipulação de datas, se necessário em futuras ações

// Interface para o retorno das Server Actions de autenticação
interface ActivationResult {
    success: boolean;
    message: string;
}

// ============================================================================
//                             SERVER ACTION DE ATIVAÇÃO DE CONTA
// ============================================================================

export async function activateAccountWithKey(activationKey: string): Promise<ActivationResult> {
    // Usa o cliente Supabase com contexto do usuário logado para operações que dependem de RLS (atualizar o próprio perfil)
    const supabaseUserClient = createServerClient(); 
    // Usa o cliente Supabase com Service Role Key para bypassar RLS (buscar/marcar chaves de ativação)
    const supabaseAdmin = createAdminClient(); 

    // 1. Verifica a sessão do usuário logado
    const { data: { user }, error: userError } = await supabaseUserClient.auth.getUser();

    if (userError || !user) {
        console.error("Auth_actions: Erro ao obter usuário logado durante a ativação:", userError?.message);
        return { success: false, message: "Usuário não autenticado. Por favor, faça login novamente." };
    }

    // Validação básica da chave
    if (!activationKey.trim()) {
        return { success: false, message: "A chave de ativação não pode ser vazia." };
    }

    try {
        // 2. Verifica a chave de ativação usando o cliente Admin (para bypassar RLS e buscar a chave, mesmo que "usada")
        const { data: keyData, error: keyError } = await supabaseAdmin // Usando cliente Admin
            .from('chaves_ativacao')
            .select('chave, celula_id, usada') // Seleciona as colunas relevantes
            .eq('chave', activationKey.trim()) // Busca a chave específica
            .single();

        // Tratamento de erro para chave inválida ou não encontrada
        if (keyError) {
            console.error("Auth_actions: ERRO AO BUSCAR CHAVE DE ATIVAÇÃO:", keyError?.message);
            // Mensagem genérica para o usuário final para não expor detalhes do banco de dados
            return { success: false, message: "Chave de ativação inválida ou não encontrada." };
        }
        if (!keyData) { // Caso a query retorne nenhum dado
            return { success: false, message: "Chave de ativação inválida ou não encontrada." };
        }

        // Verifica se a chave já foi usada
        if (keyData.usada) {
            return { success: false, message: "Esta chave de ativação já foi utilizada." };
        }

        // 3. Vincula a `celula_id` ao perfil do usuário usando o cliente com contexto do usuário (respeita RLS)
        const { error: updateProfileError } = await supabaseUserClient
            .from('profiles')
            .update({ celula_id: keyData.celula_id }) // Atualiza o campo celula_id
            .eq('id', user.id); // Onde o ID do perfil corresponde ao ID do usuário logado

        if (updateProfileError) {
            console.error("Auth_actions: ERRO AO ATUALIZAR PERFIL DO USUÁRIO:", updateProfileError?.message);
            return { success: false, message: `Falha ao vincular sua conta à célula: ${updateProfileError.message}` };
        }

        // 4. Marca a chave de ativação como usada usando o cliente Admin e registra o usuário e data
        const { error: markKeyUsedError } = await supabaseAdmin
            .from('chaves_ativacao')
            .update({ 
                usada: true,
                data_uso: new Date().toISOString(), // Registra a data de uso
                usada_por_id: user.id // Registra quem usou a chave
            }) 
            .eq('chave', keyData.chave); // Usa a chave para identificar o registro

        if (markKeyUsedError) {
            // Este não é um erro fatal para o usuário, mas deve ser logado e investigado manualmente.
            console.error("Auth_actions: ERRO AO MARCAR CHAVE COMO USADA:", markKeyUsedError?.message);
            console.warn(`AVISO CRÍTICO: Chave ${keyData.chave} não pôde ser marcada como usada, mas o perfil do usuário ${user.id} foi atualizado. Investigar manualmente.`);
        }

        // 5. Revalida os caminhos após uma atualização bem-sucedida
        // Isso garante que o cache da aplicação seja atualizado com os novos dados (ex: role, celula_id)
        revalidatePath('/', 'layout'); // Revalida o layout principal e as rotas pai
        revalidatePath('/dashboard'); // Revalida o dashboard, onde a nova role/celula_id pode ser usada
        revalidatePath('/activate-account'); // Revalida a própria página de ativação
        revalidatePath('/relatorios'); // Revalida a página de relatórios (especificamente o de chaves de ativação)
        revalidatePath('/admin/celulas'); // Revalida a lista de células admin para refletir status da chave

        // Retorna sucesso e uma mensagem amigável
        return { success: true, message: "Conta ativada com sucesso!" };

    } catch (e: any) {
        console.error("Auth_actions: ERRO INESPERADO no fluxo de ativação de conta:", e?.message, e);
        // Retorna uma mensagem de erro genérica para o usuário
        return { success: false, message: `Erro inesperado: ${e.message}` };
    }
}