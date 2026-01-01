'use server'; // Indica que este é um arquivo de Server Actions

import { createServerClient, createAdminClient } from '@/utils/supabase/server'; // Clientes Supabase para SSR e Admin
import { revalidatePath } from 'next/cache'; // Para invalidar cache quando dados mudam

// Interface para o retorno das Server Actions de autenticação
interface ActivationResult {
    success: boolean;
    message: string;
}

// ============================================================================
//                             SERVER ACTION DE ATIVAÇÃO DE CONTA
// ============================================================================

export async function activateAccountWithKey(activationKey: string): Promise<ActivationResult> {
    // Cliente com contexto do usuário (para verificar quem está tentando ativar)
    const supabaseUserClient = createServerClient(); 
    // Cliente Admin (Service Role) para bypassar RLS e garantir a escrita de campos sensíveis
    const supabaseAdmin = createAdminClient(); 

    // 1. Verifica a sessão do usuário logado
    const { data: { user }, error: userError } = await supabaseUserClient.auth.getUser();

    if (userError || !user) {
        console.error("Auth_actions: Usuário não encontrado na sessão:", userError?.message);
        return { success: false, message: "Usuário não autenticado. Por favor, faça login novamente." };
    }

    if (!activationKey.trim()) {
        return { success: false, message: "A chave de ativação não pode ser vazia." };
    }

    try {
        // 2. Busca os dados da chave de ativação
        const { data: keyData, error: keyError } = await supabaseAdmin
            .from('chaves_ativacao')
            .select('chave, celula_id, usada')
            .eq('chave', activationKey.trim())
            .single();

        if (keyError || !keyData) {
            console.error("Auth_actions: Chave inválida ou erro na busca:", keyError?.message);
            return { success: false, message: "Chave de ativação inválida ou não encontrada." };
        }

        if (keyData.usada) {
            return { success: false, message: "Esta chave de ativação já foi utilizada." };
        }

        // 3. Atualiza o perfil usando o cliente ADMIN
        // Importante: Usamos o Admin aqui porque usuários comuns geralmente não 
        // têm permissão de escrita (UPDATE) no campo 'celula_id' via RLS.
        const { error: updateProfileError } = await supabaseAdmin
            .from('profiles')
            .update({ 
                celula_id: keyData.celula_id,
                // Garantimos que a role seja 'líder' ao usar uma chave, 
                // a menos que já seja admin.
                role: 'líder' 
            })
            .eq('id', user.id);

        if (updateProfileError) {
            console.error("Auth_actions: Erro ao atualizar perfil via Admin:", updateProfileError.message);
            return { success: false, message: "Erro ao configurar sua conta. Contate o suporte." };
        }

        // 4. Marca a chave como usada
        const { error: markKeyUsedError } = await supabaseAdmin
            .from('chaves_ativacao')
            .update({ 
                usada: true,
                data_uso: new Date().toISOString(),
                usada_por_id: user.id
            }) 
            .eq('chave', keyData.chave);

        if (markKeyUsedError) {
            console.error("Auth_actions: Chave marcada com erro (não fatal para o user):", markKeyUsedError.message);
        }

        // 5. Limpa caches do Next.js para garantir que o AuthLayout veja os novos dados
        revalidatePath('/', 'layout');
        revalidatePath('/dashboard');
        revalidatePath('/activate-account');

        return { success: true, message: "Conta ativada com sucesso!" };

    } catch (e: any) {
        console.error("Auth_actions: Erro inesperado:", e);
        return { success: false, message: `Erro inesperado: ${e.message}` };
    }
}