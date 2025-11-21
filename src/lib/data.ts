// src/lib/data.ts
'use server';

import { createServerClient, createAdminClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { format, isSameMonth, parseISO, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Importe todos os tipos necessários do seu arquivo de tipos centralizado
import type { // Usar 'type' import para clareza, pois são apenas tipos.
    CelulaNomeId,
    CelulaOption,
    Membro,
    Visitante,
    ReuniaoComNomes,
    ReuniaoFormData,
    ReuniaoParaEdicao,
    ReuniaoDetalhesParaResumo,
    CriancasReuniaoData,
    MembroComPresenca,
    VisitanteComPresenca,
    ReuniaoDB,
    ImportMembroResult,
    Profile,
    PalavraDaSemana
} from '@/lib/types';


// ============================================================================
//                          FUNÇÕES AUXILIARES
// ============================================================================

/**
 * Verifica a autorização do usuário logado e retorna seu perfil básico e clientes Supabase.
 * @returns Um objeto contendo os clientes Supabase, o role do usuário e o celulaId.
 */
async function checkUserAuthorization(): Promise<{
    supabase: ReturnType<typeof createServerClient>; // Cliente com RLS para o user logado
    role: 'admin' | 'líder' | null;
    celulaId: string | null;
    adminSupabase: ReturnType<typeof createAdminClient> | null; // Cliente admin (ignora RLS)
}> {
    const supabaseUser = createServerClient();
    const adminSupabase = createAdminClient(); 
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();

    if (userError || !user) {
        console.warn('checkUserAuthorization (data.ts): Usuário não autenticado.');
        // console.log('checkUserAuthorization (data.ts): userError:', userError); // Desativado para produção
        return { supabase: supabaseUser, role: null, celulaId: null, adminSupabase: adminSupabase }; 
    }

    const { data: profileData, error: profileError } = await supabaseUser
        .from('profiles')
        .select('celula_id, role')
        .eq('id', user.id)
        .single();

    if (profileError || !profileData) {
        console.error('checkUserAuthorization (data.ts): Erro ao buscar perfil:', profileError?.message || 'Perfil não encontrado.');
        // console.log('checkUserAuthorization (data.ts): profileError:', profileError); // Desativado para produção
        // console.log('checkUserAuthorization (data.ts): profileData:', profileData); // Desativado para produção
        return { supabase: supabaseUser, role: null, celulaId: null, adminSupabase: adminSupabase };
    }
    
    const role = profileData.role as 'admin' | 'líder';
    const celulaId = profileData.celula_id;
    console.log(`checkUserAuthorization (data.ts): Usuário ${user.email} autenticado. Role: ${role}, Celula ID: ${celulaId}`);

    return {
        supabase: supabaseUser,
        role: role,
        celulaId: celulaId,
        adminSupabase: role === 'admin' ? adminSupabase : null 
    };
}

/**
 * Busca nomes de células dado um conjunto de IDs de célula.
 * Usa o cliente Supabase fornecido, que pode ser RLS ou admin.
 * @param supabaseInstance Instância do cliente Supabase (RLS ou admin).
 * @param celulaIds Conjunto de IDs de célula para buscar os nomes.
 * @returns Um mapa onde a chave é o ID da célula e o valor é o nome da célula.
 */
async function getCelulasNamesMap(
    supabaseInstance: ReturnType<typeof createServerClient> | ReturnType<typeof createAdminClient> | null, 
    celulaIds: Set<string>
): Promise<Map<string, string>> {
    const namesMap = new Map<string, string>();
    if (!supabaseInstance || celulaIds.size === 0) return namesMap;

    // Nota: Comparar `supabaseInstance === createAdminClient()` sempre criará uma nova instância
    // e resultará em `false` para comparação de referência.
    // Para simplificar, o log pode apenas indicar que está sendo usado um cliente (assumindo que o `adminSupabase` 
    // ou `supabase` do `checkUserAuthorization` é passado corretamente).
    console.log(`getCelulasNamesMap (data.ts): Buscando nomes para ${celulaIds.size} IDs de célula.`); 
    
    const { data, error } = await supabaseInstance
        .from('celulas')
        .select('id, nome')
        .in('id', Array.from(celulaIds));

    if (error) {
        console.error("getCelulasNamesMap (data.ts): Erro ao buscar nomes de células:", error);
    } else {
        console.log(`getCelulasNamesMap (data.ts): Encontrados ${data?.length} nomes de células.`);
        data?.forEach((c: CelulaNomeId) => namesMap.set(c.id, c.nome));
    }
    return namesMap;
}

/**
 * Sanitiza um nome de arquivo para ser usado em URLs ou caminhos de armazenamento.
 * Remove caracteres especiais, acentos e espaços, substituindo-os por underscores.
 * @param fileName O nome do arquivo original.
 * @returns O nome do arquivo sanitizado.
 */
function sanitizeFileName(fileName: string): string {
    return fileName
        .normalize("NFD") // Normaliza caracteres unicode para decompor acentos
        .replace(/[\u0300-\u036f]/g, "") // Remove acentos
        .replace(/[^a-zA-Z0-9.\-_]/g, "_") // Substitui caracteres inválidos por underscore
        .replace(/_{2,}/g, "_") // Substitui múltiplos underscores por um único
        .toLowerCase(); // Converte para minúsculas
}


// ============================================================================
//                            FUNÇÕES DE CÉLULAS
// ============================================================================

/**
 * Lista todas as células disponíveis para usuários com role 'admin'.
 * @returns Uma promessa que resolve para um array de objetos CelulaOption.
 * @throws Erro se o usuário não for admin ou se houver falha na comunicação com o Supabase.
 */
export async function listarCelulasParaAdmin(): Promise<CelulaOption[]> {
    const { supabase, role, adminSupabase } = await checkUserAuthorization();

    console.log(`listarCelulasParaAdmin (data.ts): Chamada. Role detectado: ${role}`);
    if (role !== 'admin') {
        console.warn("listarCelulasParaAdmin (data.ts): Acesso negado. Apenas administradores podem listar todas as células.");
        return [];
    }

    try {
        const clientToUse = adminSupabase; 
        if (!clientToUse) {
            console.error("listarCelulasParaAdmin (data.ts): adminSupabase não disponível para admin. Erro interno.");
            throw new Error("Erro interno: Cliente admin não disponível.");
        }

        console.log(`listarCelulasParaAdmin (data.ts): Buscando todas as células como admin. Usando client: admin (ignoring RLS)`);
        const { data, error } = await clientToUse
            .from('celulas')
            .select('id, nome')
            .order('nome', { ascending: true });

        if (error) {
            console.error("listarCelulasParaAdmin (data.ts): Erro ao listar células:", error);
            throw new Error("Falha ao carregar células: " + error.message);
        }
        console.log(`listarCelulasParaAdmin (data.ts): Retornando ${data?.length} células.`);
        return data || [];
    } catch (e: any) {
        console.error("Erro na Server Action listarCelulasParaAdmin (data.ts):", e.message, e);
        throw e;
    }
}

/**
 * Lista a célula associada ao usuário com role 'líder'.
 * @returns Uma promessa que resolve para um array de objetos CelulaOption (contendo a célula do líder).
 * @throws Erro se o usuário for líder mas não tiver celulaId associado, ou falha na comunicação com o Supabase.
 */
export async function listarCelulasParaLider(): Promise<CelulaOption[]> {
    const { supabase, role, celulaId } = await checkUserAuthorization();

    console.log(`listarCelulasParaLider (data.ts): Chamada. Role detectado: ${role}, Celula ID: ${celulaId}`);
    if (role === 'líder' && celulaId) {
        try {
            console.log(`listarCelulasParaLider (data.ts): Buscando célula para líder com ID ${celulaId}.`);
            const { data, error } = await supabase // Líder usa o cliente com RLS
                .from('celulas')
                .select('id, nome')
                .eq('id', celulaId)
                .single();

            if (error) {
                console.error("listarCelulasParaLider (data.ts): Erro ao listar célula para líder:", error);
                throw new Error("Falha ao carregar sua célula: " + error.message);
            }
            console.log(`listarCelulasParaLider (data.ts): Retornando ${data ? 1 : 0} célula(s).`);
            return data ? [{ id: data.id, nome: data.nome }] : [];
        } catch (e: any) {
            console.error("Erro na Server Action listarCelulasParaLider (data.ts):", e.message, e);
            throw e;
        }
    }
    console.warn("listarCelulasParaLider (data.ts): Retornando lista vazia (Não é líder ou não tem celulaId).");
    return [];
}

// ... (RPC functions get_members_birthday_ids_in_month etc. - permanecem iguais) ...


// ============================================================================
//                               FUNÇÕES DE MEMBROS
// ============================================================================

/**
 * Lista membros com base em filtros de célula, termo de busca, mês de aniversário e status.
 * @param celulaIdFilter ID da célula para filtrar (apenas para admin).
 * @param searchTerm Termo de busca para nome ou telefone.
 * @param birthdayMonth Mês de aniversário para filtrar (1-12).
 * @param statusFilter Status do membro para filtrar ('Ativo', 'Inativo', 'Em transição', 'all').
 * @returns Uma promessa que resolve para um array de objetos Membro.
 * @throws Erro se o usuário não tiver role ou falha na comunicação com o Supabase.
 */
export async function listarMembros(
    celulaIdFilter: string | null = null,
    searchTerm: string | null = null,
    birthdayMonth: number | null = null,
    statusFilter: Membro['status'] | 'all' = 'all',
): Promise<Membro[]> {
    const { supabase, role, celulaId, adminSupabase } = await checkUserAuthorization(); 
    if (!role) { return []; }

    const clientToUseForDataFetch = (role === 'admin' && adminSupabase) ? adminSupabase : supabase;
    if (!clientToUseForDataFetch) {
        console.error("listarMembros (data.ts): Cliente Supabase não disponível. Erro interno.");
        throw new Error("Erro interno: Cliente Supabase não disponível.");
    }

    let query = clientToUseForDataFetch.from('membros').select('*');
    
    // Aplicar filtro de Aniversário via RPC se birthdayMonth for fornecido
    if (birthdayMonth !== null && birthdayMonth >= 1 && birthdayMonth <= 12) {
        console.log(`listarMembros (data.ts): Aplicando filtro de aniversário para o mês ${birthdayMonth}. Role: ${role}, celulaIdFilter: ${celulaIdFilter}`);
        let rpcCelulaIdParam: string | null | undefined = undefined; 
        if (role === 'líder' && celulaId) {
            rpcCelulaIdParam = celulaId;
        } else if (role === 'admin' && celulaIdFilter) {
            rpcCelulaIdParam = celulaIdFilter;
        } else if (role === 'admin' && celulaIdFilter === null) {
            rpcCelulaIdParam = null; 
        }
        
        const { data: rpcMemberIds, error: rpcError } = await clientToUseForDataFetch.rpc('get_members_birthday_ids_in_month', { 
            p_month: birthdayMonth, 
            p_celula_id: rpcCelulaIdParam 
        });

        if (rpcError) {
            console.error("listarMembros (data.ts): Erro na RPC get_members_birthday_ids_in_month:", rpcError);
            throw new Error(`Falha ao carregar membros por mês de aniversário: ${rpcError.message}`);
        }
        
        const memberIdsToFilter: string[] = rpcMemberIds || []; 

        if (memberIdsToFilter.length === 0) { 
            console.log("listarMembros (data.ts): Nenhuns membros encontrados para o mês de aniversário filtrado.");
            return []; 
        }
        query = query.in('id', memberIdsToFilter);
    }

    // Aplicar filtro de Célula (APENAS se for admin COM celulaIdFilter. Líder é tratado pela RLS)
    if (role === 'admin' && celulaIdFilter) {
        query = query.eq('celula_id', celulaIdFilter);
    } 

    // Aplicar filtro de SearchTerm
    if (searchTerm) { 
        query = query.or(`nome.ilike.%${searchTerm}%,telefone.ilike.%${searchTerm}%`); 
    }

    // Aplicar filtro de Status
    if (statusFilter !== 'all') { 
        query = query.eq('status', statusFilter); 
    }
    
    // Executar a query final
    const { data, error } = await query.order('nome', { ascending: true });

    if (error) { 
        console.error("listarMembros (data.ts): Erro ao listar membros:", error); 
        throw new Error(`Falha ao carregar membros: ${error.message}`); 
    }

    const membros: Membro[] = data || [];
    if (membros.length === 0) return [];
    
    // Buscar nomes das células para exibição
    const celulaIds = new Set<string>(membros.map((m: Membro) => m.celula_id));
    const celulasNamesMap = await getCelulasNamesMap(clientToUseForDataFetch, celulaIds); 
    
    return membros.map((m: Membro) => ({ ...m, celula_nome: celulasNamesMap.get(m.celula_id) || null }));
}

/**
 * Adiciona um novo membro ao banco de dados.
 * @param newMembroData Dados do novo membro (excluindo id, created_at, celula_nome).
 * @returns O ID do membro recém-criado.
 * @throws Erro se não autorizado, se o cliente Supabase não estiver disponível ou falha na inserção.
 */
export async function adicionarMembro(newMembroData: Omit<Membro, 'id' | 'created_at' | 'celula_nome'>): Promise<string> {
    const { supabase, role, celulaId, adminSupabase } = await checkUserAuthorization(); 
    if (!role) { throw new Error("Não autorizado: Usuário não autenticado ou role inválida."); }

    const clientToUseForDataInsert = (role === 'admin' && adminSupabase) ? adminSupabase : supabase;
    if (!clientToUseForDataInsert) {
        console.error("adicionarMembro (data.ts): Cliente Supabase não disponível. Erro interno.");
        throw new Error("Erro interno: Cliente Supabase não disponível.");
    }

    let targetCelulaIdForInsert: string | null = (role === 'líder') 
        ? celulaId 
        : (newMembroData.celula_id ?? null); 

    if (!targetCelulaIdForInsert) {
        throw new Error("ID da célula é necessário para adicionar um membro.");
    }

    const dataToInsert = {
        ...newMembroData,
        celula_id: targetCelulaIdForInsert,
        status: newMembroData.status || 'Ativo'
    };

    const { data, error } = await clientToUseForDataInsert.from('membros').insert(dataToInsert).select('id').single();

    if (error) { console.error("adicionarMembro (data.ts): Erro ao adicionar membro:", error); throw error; }
    revalidatePath('/membros');
    return data.id;
}

/**
 * Obtém os detalhes de um membro específico.
 * @param membroId O ID do membro a ser buscado.
 * @returns Uma promessa que resolve para o objeto Membro ou null se não encontrado ou não autorizado.
 * @throws Erro se o cliente Supabase não estiver disponível ou falha na comunicação.
 */
export async function getMembro(membroId: string): Promise<Membro | null> {
    const { supabase, role, celulaId, adminSupabase } = await checkUserAuthorization(); 
    if (!role) return null;

    const clientToUseForDataFetch = (role === 'admin' && adminSupabase) ? adminSupabase : supabase;
    if (!clientToUseForDataFetch) {
        console.error("getMembro (data.ts): Cliente Supabase não disponível. Erro interno.");
        throw new Error("Erro interno: Cliente Supabase não disponível.");
    }

    let query = clientToUseForDataFetch.from('membros').select('*').eq('id', membroId);
    if (role === 'líder') { 
        if (!celulaId) return null; 
        query = query.eq('celula_id', celulaId); 
    }

    const { data, error } = await query.single();
    if (error) { 
        console.error("getMembro (data.ts): Erro ao buscar membro:", error); 
        if (error.code === 'PGRST116') return null; 
        throw error; 
    }
    return data;
}

/**
 * Atualiza os dados de um membro existente.
 * @param membroId O ID do membro a ser atualizado.
 * @param updatedMembroData Os dados atualizados do membro (excluindo id, celula_id, created_at, celula_nome).
 * @throws Erro se não autorizado, se o cliente Supabase não estiver disponível ou falha na atualização.
 */
export async function atualizarMembro(membroId: string, updatedMembroData: Omit<Membro, 'id' | 'celula_id' | 'created_at' | 'celula_nome'>): Promise<void> {
    const { supabase, role, celulaId, adminSupabase } = await checkUserAuthorization(); 
    if (!role) throw new Error("Não autorizado");

    const clientToUseForDataUpdate = (role === 'admin' && adminSupabase) ? adminSupabase : supabase;
    if (!clientToUseForDataUpdate) {
        console.error("atualizarMembro (data.ts): Cliente Supabase não disponível. Erro interno.");
        throw new Error("Erro interno: Cliente Supabase não disponível.");
    }

    let query = clientToUseForDataUpdate.from('membros').update(updatedMembroData).eq('id', membroId);
    if (role === 'líder') { 
        if (!celulaId) throw new Error("Não autorizado"); 
        query = query.eq('celula_id', celulaId); 
    }

    const { error } = await query;
    if (error) { console.error("atualizarMembro (data.ts): Erro ao atualizar membro:", error); throw error; }
    revalidatePath('/membros');
    revalidatePath(`/membros/editar/${membroId}`);
}

/**
 * Exclui um membro do banco de dados.
 * @param membroId O ID do membro a ser excluído.
 * @throws Erro se não autorizado, se o cliente Supabase não estiver disponível ou falha na exclusão.
 */
export async function excluirMembro(membroId: string): Promise<void> {
    const { supabase, role, celulaId, adminSupabase } = await checkUserAuthorization(); 
    if (!role) throw new Error("Não autorizado");

    const clientToUseForDataDelete = (role === 'admin' && adminSupabase) ? adminSupabase : supabase;
    if (!clientToUseForDataDelete) {
        console.error("excluirMembro (data.ts): Cliente Supabase não disponível. Erro interno.");
        throw new Error("Erro interno: Cliente Supabase não disponível.");
    }

    let query = clientToUseForDataDelete.from('membros').delete().eq('id', membroId);
    if (role === 'líder') { 
        if (!celulaId) throw new Error("Não autorizado"); 
        query = query.eq('celula_id', celulaId); 
    }

    const { error } = await query;
    if (error) { console.error("excluirMembro (data.ts): Erro ao excluir membro:", error); throw new Error(`Falha ao excluir membro: ${error.message}`); }
    revalidatePath('/membros');
}

/**
 * Importa membros a partir de uma string CSV. Esta função é restrita a líderes.
 * @param csvString A string contendo os dados CSV dos membros.
 * @returns Um objeto ImportMembroResult indicando o sucesso da importação, mensagens e erros.
 * @throws Erro se o cliente Supabase não estiver disponível.
 */
export async function importarMembrosCSV(csvString: string): Promise<ImportMembroResult> {
    const { supabase, role, celulaId } = await checkUserAuthorization(); 
    // Esta função é APENAS para líderes, por isso a verificação inicial é rigorosa.
    if (!role || role !== 'líder' || !celulaId) {
        return { success: false, message: "Não autorizado. Esta função é apenas para líderes.", importedCount: 0, errors: [] };
    }

    // Se o código chegou aqui, 'role' é garantidamente 'líder'.
    // Portanto, SEMPRE usamos o cliente 'supabase' (com RLS) para o líder.
    const clientToUseForDataInsert = supabase; 

    if (!clientToUseForDataInsert) {
        console.error("importarMembrosCSV (data.ts): Cliente Supabase não disponível. Erro interno.");
        throw new Error("Erro interno: Cliente Supabase não disponível.");
    }

    const lines = csvString.trim().split('\n');
    if (lines.length === 0) return { success: false, message: "CSV vazio.", importedCount: 0, errors: [] };
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const expectedHeaders = ['nome', 'telefone', 'data_ingresso', 'data_nascimento', 'endereco', 'status'];
    const missingHeaders = expectedHeaders.filter(eh => !headers.includes(eh));
    if (missingHeaders.length > 0) return { success: false, message: `Cabeçalhos ausentes: ${missingHeaders.join(', ').replace(/, ([^,]*)$/, ' e $1')}. Certifique-se de que todos os cabeçalhos obrigatórios (${expectedHeaders.join(', ')}) estão presentes e corretos.`, importedCount: 0, errors: [] };

    let importedCount = 0;
    const errors: { rowIndex: number; data: any; error: string }[] = [];
    const membersToInsert: Omit<Membro, 'id' | 'created_at' | 'celula_nome'>[] = [];

    const parseCSVLine = (line: string): (string | null)[] => {
        const result: (string | null)[] = []; let inQuote = false; let currentField = '';
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') { 
                if (i < line.length - 1 && line[i+1] === '"') { 
                    currentField += '"'; i++; 
                } else { 
                    inQuote = !inQuote; 
                } 
            }
            else if (char === ',' && !inQuote) { 
                result.push(currentField.trim() === '' ? null : currentField.trim()); 
                currentField = ''; 
            }
            else { 
                currentField += char; 
            }
        }
        result.push(currentField.trim() === '' ? null : currentField.trim());
        return result;
    };

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i]; 
        if (!line.trim()) continue;

        const values = parseCSVLine(line); 
        const rowData: { [key: string]: string | null } = {};
        headers.forEach((header, index) => { rowData[header] = values[index]; });
        
        let newMembro: Omit<Membro, 'id' | 'created_at' | 'celula_nome'>;
        try {
            const nome = rowData.nome; 
            const data_ingresso = rowData.data_ingresso; 
            const telefone = rowData.telefone; 
            const data_nascimento = rowData.data_nascimento; 
            const endereco = rowData.endereco; 
            const status = rowData.status || 'Ativo';

            if (!nome) throw new Error("Nome é obrigatório."); 
            if (!data_ingresso) throw new Error("Data de ingresso é obrigatória.");
            if (telefone && !/^\d{10,11}$/.test(telefone.replace(/\D/g, ''))) throw new Error("Telefone inválido (deve ter 10 ou 11 dígitos).");
            if (data_nascimento && isNaN(new Date(data_nascimento).getTime())) throw new Error("Data de nascimento inválida.");
            if (isNaN(new Date(data_ingresso).getTime())) throw new Error("Data de ingresso inválida.");
            if (!['Ativo', 'Inativo', 'Em transição'].includes(status || '')) throw new Error("Status inválido. Use 'Ativo', 'Inativo' ou 'Em transição'.");
            
            newMembro = { 
                celula_id: celulaId, 
                nome: nome, 
                telefone: telefone ? telefone.replace(/\D/g, '') : null, 
                data_ingresso: data_ingresso, 
                data_nascimento: data_nascimento, 
                endereco: endereco, 
                status: status as Membro['status'], 
            };
            membersToInsert.push(newMembro);
        } catch (e: any) { 
            errors.push({ rowIndex: i + 1, data: rowData, error: e.message }); 
        }
    }

    if (membersToInsert.length > 0) {
        const { error: batchError } = await clientToUseForDataInsert.from('membros').insert(membersToInsert);
        if (batchError) {
            console.error("importarMembrosCSV (data.ts): Erro na inserção em lote:", batchError);
            for (let j = 0; j < membersToInsert.length; j++) {
                const member = membersToInsert[j];
                const { error: singleInsertError } = await clientToUseForDataInsert.from('membros').insert(member);
                if (singleInsertError) { 
                    errors.push({ rowIndex: errors.length + 1, data: member, error: "Falha: " + singleInsertError.message }); 
                } else { 
                    importedCount++; 
                }
            }
            if (errors.length === 0) { 
                errors.push({ rowIndex: -1, data: null, error: "Erro em lote: " + batchError.message }); 
            }
        } else { 
            importedCount = membersToInsert.length; 
        }
    }
    revalidatePath('/membros');
    return { success: errors.length === 0 && importedCount > 0, message: `Importação com ${importedCount} sucessos e ${errors.length} erros.`, importedCount, errors };
}

/**
 * Exporta dados de membros para um arquivo CSV, aplicando filtros.
 * @param celulaIdFilter ID da célula para filtrar (apenas para admin).
 * @param searchTerm Termo de busca para nome ou telefone.
 * @param birthdayMonth Mês de aniversário para filtrar.
 * @param statusFilter Status do membro para filtrar.
 * @returns Uma string contendo os dados CSV.
 * @throws Erro se não autorizado ou falha na comunicação com o Supabase.
 */
export async function exportarMembrosCSV(
    celulaIdFilter: string | null, 
    searchTerm: string | null, 
    birthdayMonth: number | null, 
    statusFilter: Membro['status'] | 'all'
): Promise<string> {
    const { supabase, role, celulaId, adminSupabase } = await checkUserAuthorization(); 
    if (!role) { throw new Error("Não autorizado."); }
    
    const clientToUse = (role === 'admin' && adminSupabase) ? adminSupabase : supabase;
    if (!clientToUse) {
        console.error("exportarMembrosCSV (data.ts): Cliente Supabase não disponível. Erro interno.");
        throw new Error("Erro interno: Cliente Supabase não disponível.");
    }

    let query = clientToUse.from('membros').select('*');
    
    if (role === 'líder') { 
        if (!celulaId) { throw new Error("ID da célula é necessário."); } 
        query = query.eq('celula_id', celulaId); 
    }
    else if (role === 'admin' && celulaIdFilter) { 
        query = query.eq('celula_id', celulaIdFilter); 
    }

    if (searchTerm) { 
        query = query.or(`nome.ilike.%${searchTerm}%,telefone.ilike.%${searchTerm}%`); 
    }
    
    if (statusFilter !== 'all') { 
        query = query.eq('status', statusFilter); 
    }
    
    if (birthdayMonth !== null && birthdayMonth >= 1 && birthdayMonth <= 12) {
        let rpcCelulaIdParam: string | null | undefined = undefined; 
        if (role === 'líder' && celulaId) {
            rpcCelulaIdParam = celulaId;
        } else if (role === 'admin' && celulaIdFilter) {
            rpcCelulaIdParam = celulaIdFilter;
        } else if (role === 'admin' && celulaIdFilter === null) {
            rpcCelulaIdParam = null; 
        }

        const { data: rpcMemberIds, error: rpcError } = await clientToUse.rpc('get_members_birthday_ids_in_month', {
            p_month: birthdayMonth,
            p_celula_id: rpcCelulaIdParam
        });

        if (rpcError) {
            console.error("exportarMembrosCSV: Erro na RPC get_members_birthday_ids_in_month:", rpcError);
            throw new Error(`Falha ao exportar membros por mês de aniversário: ${rpcError.message}`);
        }
        const memberIdsToFilter: string[] = rpcMemberIds || []; 
        if (memberIdsToFilter.length === 0) {
            return "Nome,Telefone,Data de Ingresso,Data de Nascimento,Endereço,Status,Célula\n"; 
        }
        query = query.in('id', memberIdsToFilter);
    }
    
    const { data: membrosData, error } = await query.order('nome', { ascending: true });
    if (error) { console.error("exportarMembrosCSV: Erro ao carregar membros para exportação:", error); throw new Error(`Falha ao carregar membros para exportação: ${error.message}`); }
    const membros: Membro[] = membrosData || [];
    if (!membros || membros.length === 0) return "Nome,Telefone,Data de Ingresso,Data de Nascimento,Endereço,Status,Célula\n";
    
    const celulaIds = new Set<string>(membros.map((m: Membro) => m.celula_id));
    const celulasNamesMap = await getCelulasNamesMap(clientToUse, celulaIds); 
    
    const headers = ["Nome", "Telefone", "Data de Ingresso", "Data de Nascimento", "Endereço", "Status", "Célula"]; 
    let csv = headers.join(',') + '\n';
    membros.forEach((m: Membro) => {
        const row = [
            `"${m.nome}"`,
            `"${m.telefone || ''}"`,
            `"${m.data_ingresso}"`,
            `"${m.data_nascimento || ''}"`,
            `"${m.endereco || ''}"`,
            `"${m.status || 'Ativo'}"`,
            `"${celulasNamesMap.get(m.celula_id) || 'N/A'}"`
        ];
        csv += row.join(',') + '\n';
    });
    return csv;
}

// ============================================================================
//                               FUNÇÕES DE VISITANTES
// ============================================================================

/**
 * Lista visitantes com base em filtros de célula, termo de busca e tempo desde o último contato.
 * @param celulaIdFilter ID da célula para filtrar (apenas para admin).
 * @param searchTerm Termo de busca para nome ou telefone.
 * @param minDaysSinceLastContact Número mínimo de dias desde o último contato para filtrar.
 * @returns Uma promessa que resolve para um array de objetos Visitante.
 * @throws Erro se não autorizado ou falha na comunicação com o Supabase.
 */
export async function listarVisitantes(
    celulaIdFilter: string | null = null, 
    searchTerm: string | null = null, 
    minDaysSinceLastContact: number | null = null
): Promise<Visitante[]> {
    const { supabase, role, celulaId, adminSupabase } = await checkUserAuthorization(); 
    if (!role) { return []; }

    const clientToUse = (role === 'admin' && adminSupabase) ? adminSupabase : supabase;
    if (!clientToUse) {
        console.error("listarVisitantes (data.ts): Cliente Supabase não disponível. Erro interno.");
        throw new Error("Erro interno: Cliente Supabase não disponível.");
    }

    let query = clientToUse.from('visitantes').select('*');
    
    if (role === 'líder') { 
        if (!celulaId) { return []; } 
        query = query.eq('celula_id', celulaId); 
    }
    else if (role === 'admin' && celulaIdFilter) { 
        query = query.eq('celula_id', celulaIdFilter); 
    }

    if (searchTerm) { 
        query = query.or(`nome.ilike.%${searchTerm}%,telefone.ilike.%${searchTerm}%`); 
    }
    if (minDaysSinceLastContact !== null && minDaysSinceLastContact > 0) { 
        const cutoffDate = subDays(new Date(), minDaysSinceLastContact).toISOString().split('T')[0]; 
        query = query.or(`data_ultimo_contato.is.null,data_ultimo_contato.lt.${cutoffDate}`); 
    }
    
    const { data, error } = await query.order('nome', { ascending: true });
    if (error) { console.error("listarVisitantes (data.ts): Erro ao listar visitantes:", error); throw new Error(`Falha ao carregar visitantes: ${error.message}`); }
    
    const visitantes: Visitante[] = data || [];
    if (visitantes.length === 0) return [];
    
    const celulaIds = new Set<string>(visitantes.map((v: Visitante) => v.celula_id));
    const celulasNamesMap = await getCelulasNamesMap(clientToUse, celulaIds); 
    
    return visitantes.map((v: Visitante) => ({ ...v, celula_nome: celulasNamesMap.get(v.celula_id) || null }));
}

/**
 * Adiciona um novo visitante ao banco de dados.
 * @param newVisitanteData Dados do novo visitante (excluindo id, created_at, celula_nome).
 * @returns O ID do visitante recém-criado.
 * @throws Erro se não autorizado, se o cliente Supabase não estiver disponível ou falha na inserção.
 */
export async function adicionarVisitante(newVisitanteData: Omit<Visitante, 'id' | 'created_at' | 'celula_nome'>): Promise<string> {
    const { supabase, role, celulaId, adminSupabase } = await checkUserAuthorization(); 
    if (!role) throw new Error("Não autorizado");
    
    const clientToUseForDataInsert = (role === 'admin' && adminSupabase) ? adminSupabase : supabase;
    if (!clientToUseForDataInsert) {
        console.error("adicionarVisitante (data.ts): Cliente Supabase não disponível. Erro interno.");
        throw new Error("Erro interno: Cliente Supabase não disponível.");
    }

    let targetCelulaIdForInsert: string | null = (role === 'líder') 
        ? celulaId 
        : (newVisitanteData.celula_id ?? null); 

    if (!targetCelulaIdForInsert) {
        throw new Error("ID da célula é necessário.");
    }
    const { data, error } = await clientToUseForDataInsert.from('visitantes').insert({
        ...newVisitanteData,
        celula_id: targetCelulaIdForInsert
    }).select('id').single();
    
    if (error) { console.error("adicionarVisitante (data.ts): Erro ao adicionar visitante:", error); throw error; } 
    revalidatePath('/visitantes'); 
    return data.id;
}

/**
 * Obtém os detalhes de um visitante específico.
 * @param visitanteId O ID do visitante a ser buscado.
 * @returns Uma promessa que resolve para o objeto Visitante ou null se não encontrado ou não autorizado.
 * @throws Erro se o cliente Supabase não estiver disponível ou falha na comunicação.
 */
export async function getVisitante(visitanteId: string): Promise<Visitante | null> {
    const { supabase, role, celulaId, adminSupabase } = await checkUserAuthorization(); 
    if (!role) return null;
    
    const clientToUseForDataFetch = (role === 'admin' && adminSupabase) ? adminSupabase : supabase;
    if (!clientToUseForDataFetch) {
        console.error("getVisitante (data.ts): Cliente Supabase não disponível. Erro interno.");
        throw new Error("Erro interno: Cliente Supabase não disponível.");
    }

    let query = clientToUseForDataFetch.from('visitantes').select('id, celula_id, nome, telefone, data_primeira_visita, endereco, data_ultimo_contato, observacoes, data_nascimento, created_at').eq('id', visitanteId);
    if (role === 'líder') { 
        if (!celulaId) return null; 
        query = query.eq('celula_id', celulaId); 
    }
    const { data, error } = await query.single(); 
    if (error) { 
        console.error("getVisitante (data.ts): Erro ao buscar visitante:", error); 
        if (error.code === 'PGRST116') return null; 
        throw error; 
    } 
    return data;
}

/**
 * Atualiza os dados de um visitante existente.
 * @param updatedVisitanteData Os dados atualizados do visitante (excluindo id, celula_id, created_at, celula_nome).
 * @param visitanteId O ID do visitante a ser atualizado.
 * @throws Erro se não autorizado, se o cliente Supabase não estiver disponível ou falha na atualização.
 */
export async function atualizarVisitante(
    updatedVisitanteData: Omit<Visitante, 'id' | 'celula_id' | 'created_at' | 'celula_nome'>, 
    visitanteId: string
): Promise<void> {
    const { supabase, role, celulaId, adminSupabase } = await checkUserAuthorization(); 
    if (!role) throw new Error("Não autorizado"); 
    
    const clientToUseForDataUpdate = (role === 'admin' && adminSupabase) ? adminSupabase : supabase;
    if (!clientToUseForDataUpdate) {
        console.error("atualizarVisitante (data.ts): Cliente Supabase não disponível. Erro interno.");
        throw new Error("Erro interno: Cliente Supabase não disponível.");
    }

    let query = clientToUseForDataUpdate.from('visitantes').update(updatedVisitanteData).eq('id', visitanteId);
    if (role === 'líder') { 
        if (!celulaId) throw new Error("Não autorizado"); 
        query = query.eq('celula_id', celulaId); 
    }
    const { error } = await query; 
    if (error) { console.error("atualizarVisitante (data.ts): Erro ao atualizar visitante:", error); throw error; }
    revalidatePath('/visitantes'); 
    revalidatePath(`/visitantes/editar/${visitanteId}`);
}

/**
 * Exclui um visitante do banco de dados.
 * @param visitanteId O ID do visitante a ser excluído.
 * @throws Erro se não autorizado, se o cliente Supabase não estiver disponível ou falha na exclusão.
 */
export async function excluirVisitante(visitanteId: string): Promise<void> {
    const { supabase, role, celulaId, adminSupabase } = await checkUserAuthorization(); 
    if (!role) throw new Error("Não autorizado"); 
    
    const clientToUseForDataDelete = (role === 'admin' && adminSupabase) ? adminSupabase : supabase;
    if (!clientToUseForDataDelete) {
        console.error("excluirVisitante (data.ts): Cliente Supabase não disponível. Erro interno.");
        throw new Error("Erro interno: Cliente Supabase não disponível.");
    }

    let query = clientToUseForDataDelete.from('visitantes').delete().eq('id', visitanteId);
    if (role === 'líder') { 
        if (!celulaId) throw new Error("Não autorizado"); 
        query = query.eq('celula_id', celulaId); 
    }
    const { error } = await query; 
    if (error) { console.error("excluirVisitante (data.ts): Erro ao excluir visitante:", error); throw new Error(`Falha ao excluir visitante: ${error.message}`); } 
    revalidatePath('/visitantes');
}

/**
 * Converte um visitante em membro, excluindo o registro de visitante após a conversão bem-sucedida.
 * @param visitanteId O ID do visitante a ser convertido.
 * @param newMembroData Os dados para o novo membro.
 * @returns Um objeto com `success` e uma `message`.
 */
export async function converterVisitanteEmMembro(
    visitanteId: string, 
    newMembroData: Omit<Membro, 'id' | 'created_at' | 'celula_nome'>
): Promise<{ success: boolean; message: string }> {
    const { supabase, role, celulaId, adminSupabase } = await checkUserAuthorization(); 
    if (!role) return { success: false, message: "Não autorizado" };

    const clientToUseForDataOp = (role === 'admin' && adminSupabase) ? adminSupabase : supabase;
    if (!clientToUseForDataOp) {
        console.error("converterVisitanteEmMembro (data.ts): Cliente Supabase não disponível. Erro interno.");
        return { success: false, message: "Erro interno: Cliente Supabase não disponível." };
    }

    const { data: visitanteOriginal, error: getVisitanteError } = await clientToUseForDataOp.from('visitantes').select('celula_id').eq('id', visitanteId).single();
    if (getVisitanteError || !visitanteOriginal?.celula_id) return { success: false, message: "Visitante não encontrado." };
    const targetCelulaIdForConversion = visitanteOriginal.celula_id;

    if (role === 'líder' && (!celulaId || celulaId !== targetCelulaIdForConversion)) return { success: false, message: "Não autorizado." };

    try {
        const { count, error: checkError } = await clientToUseForDataOp.from('membros').select('id', { count: 'exact', head: true }).eq('nome', newMembroData.nome).eq('celula_id', targetCelulaIdForConversion);
        if (checkError) throw checkError; 
        if (count && count > 0) return { success: false, message: `Já existe um membro com o nome '${newMembroData.nome}'.` };

        const { data: membroInserido, error: insertMembroError } = await clientToUseForDataOp.from('membros').insert({
            ...newMembroData,
            celula_id: targetCelulaIdForConversion,
            status: newMembroData.status || 'Ativo'
        }).select('id').single();

        if (insertMembroError) throw insertMembroError;
        
        const { error: deleteVisitanteError } = await clientToUseForDataOp.from('visitantes').delete().eq('id', visitanteId).eq('celula_id', targetCelulaIdForConversion);
        if (deleteVisitanteError) { 
            // Se falhar a exclusão do visitante, tenta reverter a inserção do membro
            await clientToUseForDataOp.from('membros').delete().eq('id', membroInserido.id); 
            throw new Error("Falha ao excluir visitante: " + deleteVisitanteError.message + "."); 
        }
        revalidatePath('/membros'); 
        revalidatePath('/visitantes'); 
        return { success: true, message: "Convertido com sucesso!" };
    } catch (e: any) { 
        console.error("Falha ao converter visitante em membro:", e); 
        return { success: false, message: e.message }; 
    }
}

// ============================================================================
//                               FUNÇÕES DE REUNIÕES
// ============================================================================

/**
 * Lista todas as reuniões, enriquecidas com nomes de ministradores, responsáveis e número de crianças.
 * @returns Uma promessa que resolve para um array de objetos ReuniaoComNomes.
 * @throws Erro se não autorizado ou falha na comunicação com o Supabase.
 */
export async function listarReunioes(): Promise<ReuniaoComNomes[]> {
    const { supabase, role, celulaId, adminSupabase } = await checkUserAuthorization(); 
    if (!role) return [];

    const clientToUseForDataFetch = (role === 'admin' && adminSupabase) ? adminSupabase : supabase;
    if (!clientToUseForDataFetch) {
        console.error("listarReunioes (data.ts): Cliente Supabase não disponível. Erro interno.");
        throw new Error("Erro interno: Cliente Supabase não disponível.");
    }

    let query = clientToUseForDataFetch.from('reunioes').select(`
        id, data_reuniao, tema, caminho_pdf, celula_id, created_at,

        ministrador_principal_alias:membros!ministrador_principal(nome),
        ministrador_secundario_alias:membros!ministrador_secundario(nome),
        responsavel_kids_alias:membros!responsavel_kids(nome)
    `);

    if (role === 'líder') { // Líder só vê as reuniões da sua célula
        if (!celulaId) return []; 
        query = query.eq('celula_id', celulaId); 
    }
    
    const { data: reunioesData, error } = await query.order('data_reuniao', { ascending: false });
    if (error) { console.error("listarReunioes (data.ts): Erro ao listar reuniões:", error); throw new Error(`Falha ao carregar reuniões: ${error.message}`); }

    const reunioesComObjetosAninhados: any[] = reunioesData || [];

    if (reunioesComObjetosAninhados.length === 0) return [];

    const reuniaoIds = new Set<string>(reunioesComObjetosAninhados.map((r: any) => r.id));
    const { data: criancasData, error: criancasError } = await clientToUseForDataFetch.from('criancas_reuniao').select('reuniao_id, numero_criancas').in('reuniao_id', Array.from(reuniaoIds)); 
    if (criancasError) console.warn("listarReunioes (data.ts): Aviso: Erro ao buscar contagem de crianças:", criancasError.message);
    const criancasMap = new Map((criancasData || []).map((c: CriancasReuniaoData) => [c.reuniao_id, c.numero_criancas]));

    const celulaIds = new Set<string>(reunioesComObjetosAninhados.map((r: any) => r.celula_id));
    const celulasNamesMap = await getCelulasNamesMap(clientToUseForDataFetch, celulaIds); 

    const result = reunioesComObjetosAninhados.map((reuniao: any) => ({
        id: reuniao.id,
        data_reuniao: reuniao.data_reuniao,
        tema: reuniao.tema,
        caminho_pdf: reuniao.caminho_pdf,
        celula_id: reuniao.celula_id,
        celula_nome: celulasNamesMap.get(reuniao.celula_id) || null,
        ministrador_principal_nome: reuniao.ministrador_principal_alias?.nome || null,
        ministrador_secundario_nome: reuniao.ministrador_secundario_alias?.nome || null,
        responsavel_kids_nome: reuniao.responsavel_kids_alias?.nome || null,
        num_criancas: Number(criancasMap.get(reuniao.id)) || 0,
        created_at: reuniao.created_at,
    }));

    revalidatePath('/reunioes');
    revalidatePath('/dashboard');
    return result;
}

/**
 * Obtém detalhes de uma reunião para fins de resumo (exibição de presença).
 * @param reuniaoId O ID da reunião.
 * @returns Uma promessa que resolve para um objeto ReuniaoDetalhesParaResumo ou null se não encontrado/acessível.
 * @throws Erro se o cliente Supabase não estiver disponível ou falha na comunicação.
 */
export async function getReuniaoDetalhesParaResumo(reuniaoId: string): Promise<ReuniaoDetalhesParaResumo | null> {
    const { supabase, role, celulaId, adminSupabase } = await checkUserAuthorization(); 
    if (!role) return null;

    let targetCelulaIdForQuery: string | null = (role === 'líder') ? celulaId : null;
    const clientToUseForDataFetch = (role === 'admin' && adminSupabase) ? adminSupabase : supabase; 
    if (!clientToUseForDataFetch) {
        console.error("getReuniaoDetalhesParaResumo (data.ts): Cliente Supabase não disponível. Erro interno.");
        throw new Error("Erro interno: Cliente Supabase não disponível.");
    }

    if (role === 'admin' && !targetCelulaIdForQuery) {
        const { data: reuniaoDataCheck, error: reuniaoCheckError } = await clientToUseForDataFetch.from('reunioes').select('celula_id').eq('id', reuniaoId).single();
        if (reuniaoCheckError || !reuniaoDataCheck?.celula_id) { 
            console.error("getReuniaoDetalhesParaResumo (data.ts): Reunião não encontrada ou inacessível para admin:", reuniaoCheckError);
            return null;
        }
        targetCelulaIdForQuery = reuniaoDataCheck.celula_id;
    }
    if (!targetCelulaIdForQuery) {
        console.warn("getReuniaoDetalhesParaResumo (data.ts): ID da célula não definido para a query.");
        return null;
    }

    try {
        const [reuniaoDetailsResult, criancasResult] = await Promise.all([
            clientToUseForDataFetch.from('reunioes').select(`
                id, data_reuniao, tema, caminho_pdf, celula_id,
                ministrador_principal_alias:membros!ministrador_principal(id, nome, telefone),
                ministrador_secundario_alias:membros!ministrador_secundario(id, nome, telefone),
                responsavel_kids_alias:membros!responsavel_kids(id, nome, telefone)`
            ).eq('id', reuniaoId).eq('celula_id', targetCelulaIdForQuery).single(),
            clientToUseForDataFetch.from('criancas_reuniao').select('numero_criancas').eq('reuniao_id', reuniaoId).maybeSingle()
        ]);

        const { data: reuniaoDataRaw, error: reuniaoError } = reuniaoDetailsResult;

        if (reuniaoError || !reuniaoDataRaw) {
            console.error("getReuniaoDetalhesParaResumo (data.ts): Erro ao buscar detalhes da reunião:", reuniaoError?.message);
            return null;
        }

        const reuniaoDataMapped: Omit<ReuniaoDB, 'ministrador_principal' | 'ministrador_secundario' | 'responsavel_kids'> & {
            ministrador_principal_alias: { id: string, nome: string, telefone: string | null } | null;
            ministrador_secundario_alias: { id: string, nome: string, telefone: string | null } | null;
            responsavel_kids_alias: { id: string, nome: string, telefone: string | null } | null;
        } = reuniaoDataRaw as any;

        const { data: criancasData } = criancasResult;
        const numCriancas = Number(criancasData?.numero_criancas) || 0;

        const [presMembros, allMems, visPres, celNames] = await Promise.all([
            clientToUseForDataFetch.from('presencas_membros').select('membro_id, membro_data:membros(id, nome, telefone)').eq('reuniao_id', reuniaoId).eq('presente', true),
            clientToUseForDataFetch.from('membros').select('id, nome, telefone').eq('celula_id', targetCelulaIdForQuery).order('nome', { ascending: true }),
            clientToUseForDataFetch.from('presencas_visitantes').select('visitante_id, visitante_data:visitantes(id, nome, telefone)').eq('reuniao_id', reuniaoId).eq('presente', true),
            getCelulasNamesMap(clientToUseForDataFetch, new Set([reuniaoDataMapped.celula_id]))
        ]);

        if (presMembros.error || allMems.error || visPres.error) {
            console.error("getReuniaoDetalhesParaResumo (data.ts): Erro ao buscar dados de presença:", presMembros.error || allMems.error || visPres.error);
            throw new Error('Erro ao buscar dados de presença.');
        }

        const membrosPresentes = (presMembros.data || []).map(p => ({
            id: p.membro_id,
            nome: (p as any).membro_data?.nome || 'N/A',
            telefone: (p as any).membro_data?.telefone || null
        }));

        const presentMemberIds = new Set(membrosPresentes.map(m => m.id));
        const membrosAusentes = (allMems.data || []).filter(m => !presentMemberIds.has(m.id)).map(m => ({ id: m.id, nome: m.nome, telefone: m.telefone }));

        const visitantesPresentes = (visPres.data || []).map(p => ({
            id: p.visitante_id,
            nome: (p as any).visitante_data?.nome || 'N/A',
            telefone: (p as any).visitante_data?.telefone || null
        }));
        const celulaNome = celNames.get(reuniaoDataMapped.celula_id) || null;

        return {
            id: reuniaoDataMapped.id,
            data_reuniao: reuniaoDataMapped.data_reuniao,
            tema: reuniaoDataMapped.tema,
            caminho_pdf: reuniaoDataMapped.caminho_pdf,
            ministrador_principal_nome: reuniaoDataMapped.ministrador_principal_alias?.nome || null,
            ministrador_secundario_nome: reuniaoDataMapped.ministrador_secundario_alias?.nome || null,
            responsavel_kids_nome: reuniaoDataMapped.responsavel_kids_alias?.nome || null,
            num_criancas: numCriancas,
            celula_nome: celulaNome,
            membros_presentes: membrosPresentes,
            membros_ausentes: membrosAusentes,
            visitantes_presentes: visitantesPresentes,
        };
    } catch (error: any) {
        console.error("Erro em getReuniaoDetalhesParaResumo (data.ts):", error.message);
        return null;
    }
}

/**
 * Adiciona uma nova reunião ao banco de dados.
 * @param newReuniaoData Dados da nova reunião.
 * @returns O ID da reunião recém-criada.
 * @throws Erro se não autorizado, se o cliente Supabase não estiver disponível ou falha na inserção.
 */
export async function adicionarReuniao(newReuniaoData: ReuniaoFormData): Promise<string> {
    const { supabase, role, celulaId, adminSupabase } = await checkUserAuthorization(); 
    if (!role) throw new Error("Não autorizado");
    
    const clientToUseForDataInsert = (role === 'admin' && adminSupabase) ? adminSupabase : supabase;
    if (!clientToUseForDataInsert) {
        console.error("adicionarReuniao (data.ts): Cliente Supabase não disponível. Erro interno.");
        throw new Error("Erro interno: Cliente Supabase não disponível.");
    }

    let targetCelulaIdForInsert: string | null = (role === 'líder') 
        ? celulaId 
        : (newReuniaoData.celula_id ?? null); 

    if (!targetCelulaIdForInsert) {
        throw new Error("ID da célula é necessário.");
    }

    const dataToInsert = {
        ...newReuniaoData,
        celula_id: targetCelulaIdForInsert,
    };

    const { data, error } = await clientToUseForDataInsert.from('reunioes').insert(dataToInsert).select('id').single();
    if (error) { console.error("adicionarReuniao (data.ts): Erro ao adicionar reunião:", error); throw error; }
    const newReuniaoId = data.id;
    await clientToUseForDataInsert.from('criancas_reuniao').insert({ reuniao_id: newReuniaoId, numero_criancas: 0 });
    revalidatePath('/reunioes'); revalidatePath('/dashboard');
    return newReuniaoId;
}

/**
 * Obtém os detalhes de uma reunião específica para edição.
 * @param reuniaoId O ID da reunião a ser buscada.
 * @returns Uma promessa que resolve para um objeto ReuniaoParaEdicao ou null se não encontrado/acessível.
 * @throws Erro se o cliente Supabase não estiver disponível ou falha na comunicação.
 */
export async function getReuniao(reuniaoId: string): Promise<ReuniaoParaEdicao | null> {
    const { supabase, role, celulaId, adminSupabase } = await checkUserAuthorization(); 
    if (!role) return null;

    const clientToUseForDataFetch = (role === 'admin' && adminSupabase) ? adminSupabase : supabase;
    if (!clientToUseForDataFetch) {
        console.error("getReuniao (data.ts): Cliente Supabase não disponível. Erro interno.");
        throw new Error("Erro interno: Cliente Supabase não disponível.");
    }

    let query = clientToUseForDataFetch.from('reunioes').select(`
        id, celula_id, data_reuniao, tema, caminho_pdf, created_at,
        ministrador_principal,
        ministrador_secundario,
        responsavel_kids,

        ministrador_principal_nome:membros!ministrador_principal(nome),
        ministrador_secundario_nome:membros!ministrador_secundario(nome),
        responsavel_kids_nome:membros!responsavel_kids(nome),

        celula_nome:celulas(nome)
    `).eq('id', reuniaoId);

    if (role === 'líder') { 
        if (!celulaId) return null; 
        query = query.eq('celula_id', celulaId); 
    }

    const { data: reuniaoRawData, error } = await query.single();
    if (error) {
        console.error("getReuniao (data.ts): Erro em getReuniao:", error);
        if (error.code === 'PGRST116') return null; 
        throw new Error("Falha ao carregar reunião: " + error.message);
    }

    const reuniaoData: ReuniaoParaEdicao = {
        id: reuniaoRawData.id,
        celula_id: reuniaoRawData.celula_id,
        data_reuniao: reuniaoRawData.data_reuniao,
        tema: reuniaoRawData.tema,
        caminho_pdf: reuniaoRawData.caminho_pdf,
        created_at: reuniaoRawData.created_at,

        ministrador_principal: reuniaoRawData.ministrador_principal,
        ministrador_secundario: reuniaoRawData.ministrador_secundario,
        responsavel_kids: reuniaoRawData.responsavel_kids,

        ministrador_principal_nome: (reuniaoRawData as any).ministrador_principal_nome?.nome || null,
        ministrador_secundario_nome: (reuniaoRawData as any).ministrador_secundario_nome?.nome || null,
        responsavel_kids_nome: (reuniaoRawData as any).responsavel_kids_nome?.nome || null,
        celula_nome: (reuniaoRawData as any).celula_nome?.nome || null,
    };

    return reuniaoData;
}

/**
 * Atualiza os dados de uma reunião existente.
 * @param reuniaoId O ID da reunião a ser atualizada.
 * @param updatedReuniaoData Os dados atualizados da reunião.
 * @throws Erro se não autorizado, se o cliente Supabase não estiver disponível ou falha na atualização.
 */
export async function atualizarReuniao(reuniaoId: string, updatedReuniaoData: ReuniaoFormData): Promise<void> {
    const { supabase, role, celulaId, adminSupabase } = await checkUserAuthorization(); 
    if (!role) throw new Error("Não autorizado");

    const clientToUseForDataUpdate = (role === 'admin' && adminSupabase) ? adminSupabase : supabase;
    if (!clientToUseForDataUpdate) {
        console.error("atualizarReuniao (data.ts): Cliente Supabase não disponível. Erro interno.");
        throw new Error("Erro interno: Cliente Supabase não disponível.");
    }

    const dataToUpdate = {
        data_reuniao: updatedReuniaoData.data_reuniao,
        tema: updatedReuniaoData.tema,
        ministrador_principal: updatedReuniaoData.ministrador_principal,
        ministrador_secundario: updatedReuniaoData.ministrador_secundario,
        responsavel_kids: updatedReuniaoData.responsavel_kids,
        caminho_pdf: updatedReuniaoData.caminho_pdf || null,
    };

    let query = clientToUseForDataUpdate.from('reunioes').update(dataToUpdate).eq('id', reuniaoId);
    if (role === 'líder') { 
        if (!celulaId) throw new Error("Não autorizado"); 
        query = query.eq('celula_id', celulaId); 
    }
    const { error } = await query;
    if (error) { console.error("atualizarReuniao (data.ts): Erro ao atualizar reunião:", error); throw error; }
    revalidatePath('/reunioes'); revalidatePath(`/reunioes/editar/${reuniaoId}`); revalidatePath('/dashboard');
}

/**
 * Exclui uma reunião do banco de dados.
 * @param reuniaoId O ID da reunião a ser excluída.
 * @throws Erro se não autorizado, se o cliente Supabase não estiver disponível ou falha na exclusão.
 */
export async function excluirReuniao(reuniaoId: string): Promise<void> {
    const { supabase, role, celulaId, adminSupabase } = await checkUserAuthorization(); 
    if (!role) throw new Error("Não autorizado");
    
    const clientToUseForDataDelete = (role === 'admin' && adminSupabase) ? adminSupabase : supabase;
    if (!clientToUseForDataDelete) {
        console.error("excluirReuniao (data.ts): Cliente Supabase não disponível. Erro interno.");
        throw new Error("Erro interno: Cliente Supabase não disponível.");
    }

    let query = clientToUseForDataDelete.from('reunioes').delete().eq('id', reuniaoId);
    if (role === 'líder') { 
        if (!celulaId) throw new Error("Não autorizado"); 
        query = query.eq('celula_id', celulaId); 
    }
    const { error } = await query;
    if (error) { console.error("excluirReuniao (data.ts): Erro ao excluir reunião:", error); throw new Error(`Falha ao excluir reunião: ${error.message}`); }
    revalidatePath('/reunioes'); revalidatePath('/dashboard');
}

/**
 * Verifica se uma reunião com a mesma data e tema já existe (ignorando um ID específico, se fornecido).
 * @param dataReuniao A data da reunião a ser verificada.
 * @param tema O tema da reunião a ser verificado.
 * @param excludeId Opcional. O ID da reunião a ser excluída da verificação de duplicidade (útil na edição).
 * @returns Uma promessa que resolve para true se houver duplicidade, false caso contrário.
 * @throws Erro se não autorizado ou falha na comunicação com o Supabase.
 */
export async function verificarDuplicidadeReuniao(dataReuniao: string, tema: string, excludeId?: string): Promise<boolean> {
    const { supabase, role, celulaId, adminSupabase } = await checkUserAuthorization(); 
    if (!role) throw new Error("Não autorizado");
    
    const clientToUseForDataFetch = (role === 'admin' && adminSupabase) ? adminSupabase : supabase;
    if (!clientToUseForDataFetch) {
        console.error("verificarDuplicidadeReuniao (data.ts): Cliente Supabase não disponível. Erro interno.");
        throw new Error("Erro interno: Cliente Supabase não disponível.");
    }

    let query = clientToUseForDataFetch.from('reunioes').select('id', { count: 'exact', head: true });
    if (role === 'líder') { 
        if (!celulaId) throw new Error("ID da célula é necessário para verificar duplicidade."); 
        query = query.eq('celula_id', celulaId); 
    }
    query = query.eq('data_reuniao', dataReuniao).ilike('tema', tema);
    if (excludeId) query = query.neq('id', excludeId);
    const { count, error } = await query;
    if (error) { console.error("verificarDuplicidadeReuniao (data.ts): Erro ao verificar duplicidade de reunião:", error); throw error; }
    return (count || 0) > 0;
}

/**
 * Lista todos os membros de uma célula específica com seu status de presença para uma reunião.
 * @param reuniaoId O ID da reunião.
 * @returns Uma promessa que resolve para um array de objetos MembroComPresenca.
 * @throws Erro se não autorizado ou falha na comunicação com o Supabase.
 */
export async function listarTodosMembrosComPresenca(reuniaoId: string): Promise<MembroComPresenca[]> {
    const { supabase, role, celulaId, adminSupabase } = await checkUserAuthorization(); 
    if (!role) return [];
    let targetCelulaIdForQuery: string | null = (role === 'líder') ? celulaId : null;
    const clientToUseForDataFetch = (role === 'admin' && adminSupabase) ? adminSupabase : supabase; 
    if (!clientToUseForDataFetch) {
        console.error("listarTodosMembrosComPresenca (data.ts): Cliente Supabase não disponível. Erro interno.");
        throw new Error("Erro interno: Cliente Supabase não disponível.");
    }

    if (role === 'admin' && !targetCelulaIdForQuery) {
        const { data: reuniaoDataCheck, error: reuniaoCheckError } = await clientToUseForDataFetch.from('reunioes').select('celula_id').eq('id', reuniaoId).single();
        if (reuniaoCheckError || !reuniaoDataCheck?.celula_id) { console.error("listarTodosMembrosComPresenca (data.ts): Reunião não encontrada ou inacessível para admin:", reuniaoCheckError); return []; }
        targetCelulaIdForQuery = reuniaoDataCheck.celula_id;
    }
    if (!targetCelulaIdForQuery) { return []; }
    try {
        const { data: members, error: membersError } = await clientToUseForDataFetch.from('membros').select('id, celula_id, nome, telefone, data_ingresso, data_nascimento, endereco, status, created_at').eq('celula_id', targetCelulaIdForQuery).order('nome', { ascending: true });
        if (membersError) { console.error("listarTodosMembrosComPresenca (data.ts): Erro ao listar membros com presença:", membersError); throw membersError; }
        const memberIds = (members || []).map((m: Membro) => m.id);
        const { data: presences, error: presencesError } = await clientToUseForDataFetch.from('presencas_membros').select('membro_id, presente').eq('reuniao_id', reuniaoId).in('membro_id', Array.from(memberIds)); 
        if (presencesError) { console.error("listarTodosMembrosComPresenca (data.ts): Erro ao listar presenças de membros:", presencesError); throw presencesError; }
        const presenceMap = new Map((presences || []).map(p => [p.membro_id, p.presente]));
        return (members || []).map(membro => ({ ...membro, presente: presenceMap.get(membro.id) || false }));
    } catch (e: any) { console.error("Falha ao carregar membros para presença (listarTodosMembrosComPresenca):", e); throw new Error("Falha ao carregar membros para presença: " + e.message); }
}

/**
 * Registra a presença de um membro em uma reunião.
 * @param reuniaoId O ID da reunião.
 * @param membroId O ID do membro.
 * @param presente O status de presença (true para presente, false para ausente).
 * @throws Erro se não autorizado, se o cliente Supabase não estiver disponível ou falha no registro.
 */
export async function registrarPresencaMembro(reuniaoId: string, membroId: string, presente: boolean): Promise<void> {
    const { supabase, role, celulaId, adminSupabase } = await checkUserAuthorization(); 
    if (!role) throw new Error("Não autorizado");
    let targetCelulaIdForValidation: string | null = (role === 'líder') ? celulaId : null;
    const clientToUseForDataOp = (role === 'admin' && adminSupabase) ? adminSupabase : supabase; 
    if (!clientToUseForDataOp) {
        console.error("registrarPresencaMembro (data.ts): Cliente Supabase não disponível. Erro interno.");
        throw new Error("Erro interno: Cliente Supabase não disponível.");
    }

    if (role === 'admin') {
        const { data: reuniaoDataCheck, error: reuniaoCheckError } = await clientToUseForDataOp.from('reunioes').select('celula_id').eq('id', reuniaoId).single();
        if (reuniaoCheckError || !reuniaoDataCheck?.celula_id) { throw new Error("Reunião não encontrada ou inacessível."); }
        targetCelulaIdForValidation = reuniaoDataCheck.celula_id;
    }
    if (!targetCelulaIdForValidation) { throw new Error("Nenhum ID de célula para validar a presença do membro."); }
    
    const { data: memberCheck, error: memberCheckError } = await clientToUseForDataOp.from('membros').select('id').eq('id', membroId).eq('celula_id', targetCelulaIdForValidation).single();
    if (memberCheckError || !memberCheck) { throw new Error("Membro não pertence à célula da reunião ou não encontrado."); }
    try {
        const { error } = await clientToUseForDataOp.from('presencas_membros').upsert({ reuniao_id: reuniaoId, membro_id: membroId, presente: presente }, { onConflict: 'reuniao_id, membro_id' });
        if (error) { console.error("registrarPresencaMembro (data.ts): Erro ao registrar presença de membro:", error); throw error; }
        revalidatePath(`/reunioes/presenca/${reuniaoId}`); revalidatePath('/dashboard'); revalidatePath('/relatorios');
    } catch (e: any) { console.error("Falha ao registrar presença de membro (registrarPresencaMembro):", e); throw e; }
}

/**
 * Lista todos os visitantes de uma célula específica com seu status de presença para uma reunião.
 * @param reuniaoId O ID da reunião.
 * @returns Uma promessa que resolve para um array de objetos VisitanteComPresenca.
 * @throws Erro se não autorizado ou falha na comunicação com o Supabase.
 */
export async function listarTodosVisitantesComPresenca(reuniaoId: string): Promise<VisitanteComPresenca[]> {
    const { supabase, role, celulaId, adminSupabase } = await checkUserAuthorization(); 
    if (!role) return [];
    let targetCelulaIdForQuery: string | null = (role === 'líder') ? celulaId : null;
    const clientToUseForDataFetch = (role === 'admin' && adminSupabase) ? adminSupabase : supabase; 
    if (!clientToUseForDataFetch) {
        console.error("listarTodosVisitantesComPresenca (data.ts): Cliente Supabase não disponível. Erro interno.");
        throw new Error("Erro interno: Cliente Supabase não disponível.");
    }

    if (role === 'admin') {
        const { data: reuniaoDataCheck, error: reuniaoCheckError } = await clientToUseForDataFetch.from('reunioes').select('celula_id').eq('id', reuniaoId).single();
        if (reuniaoCheckError || !reuniaoDataCheck?.celula_id) { console.error("listarTodosVisitantesComPresenca (data.ts): Reunião não encontrada ou inacessível para admin:", reuniaoCheckError); return []; }
        targetCelulaIdForQuery = reuniaoDataCheck.celula_id;
    }
    if (!targetCelulaIdForQuery) { return []; }
    try {
        const { data: visitors, error: visitorsError } = await clientToUseForDataFetch.from('visitantes').select('id, celula_id, nome, telefone, data_primeira_visita, endereco, data_ultimo_contato, observacoes, data_nascimento, created_at').eq('celula_id', targetCelulaIdForQuery).order('nome', { ascending: true });
        if (visitorsError) { console.error("listarTodosVisitantesComPresenca (data.ts): Erro ao listar visitantes com presença:", visitorsError); throw visitorsError; }
        const visitorIds = (visitors || []).map((v: Visitante) => v.id);
        const { data: presences, error: presencesError } = await clientToUseForDataFetch.from('presencas_visitantes').select('visitante_id, presente').eq('reuniao_id', reuniaoId).in('visitante_id', Array.from(visitorIds)); 
        if (presencesError) { console.error("listarTodosVisitantesComPresenca (data.ts): Erro ao listar presenças de visitantes:", presencesError); throw presencesError; }
        const presenceMap = new Map((presences || []).map(p => [p.visitante_id, p.presente]));
        return (visitors || []).map(visitante => ({ visitante_id: visitante.id, nome: visitante.nome, telefone: visitante.telefone, presente: presenceMap.get(visitante.id) || false }));
    } catch (e: any) { console.error("Falha ao carregar visitantes para presença (listarTodosVisitantesComPresenca):", e); throw new Error("Falha ao carregar visitantes para presença: " + e.message); }
}

/**
 * Registra a presença de um visitante em uma reunião.
 * @param reuniaoId O ID da reunião.
 * @param visitanteId O ID do visitante.
 * @param presente O status de presença (true para presente, false para ausente).
 * @throws Erro se não autorizado, se o cliente Supabase não estiver disponível ou falha no registro.
 */
export async function registrarPresencaVisitante(reuniaoId: string, visitanteId: string, presente: boolean): Promise<void> {
    const { supabase, role, celulaId, adminSupabase } = await checkUserAuthorization(); 
    if (!role) throw new Error("Não autorizado");
    let targetCelulaIdForValidation: string | null = (role === 'líder') ? celulaId : null;
    const clientToUseForDataOp = (role === 'admin' && adminSupabase) ? adminSupabase : supabase; 
    if (!clientToUseForDataOp) {
        console.error("registrarPresencaVisitante (data.ts): Cliente Supabase não disponível. Erro interno.");
        throw new Error("Erro interno: Cliente Supabase não disponível.");
    }

    if (role === 'admin') {
        const { data: reuniaoDataCheck, error: reuniaoCheckError } = await clientToUseForDataOp.from('reunioes').select('celula_id').eq('id', reuniaoId).single();
        if (reuniaoCheckError || !reuniaoDataCheck?.celula_id) { throw new Error("Reunião não encontrada ou inacessível."); }
        targetCelulaIdForValidation = reuniaoDataCheck.celula_id;
    }
    if (!targetCelulaIdForValidation) { throw new Error("Nenhum ID de célula para validar a presença do visitante."); }
    
    const { data: visitorCheck, error: visitorCheckError } = await clientToUseForDataOp.from('visitantes').select('id').eq('id', visitanteId).eq('celula_id', targetCelulaIdForValidation).single();
    if (visitorCheckError || !visitorCheck) { throw new Error("Visitante não pertence à célula da reunião ou não encontrado."); }
    try {
        const { error } = await clientToUseForDataOp.from('presencas_visitantes').upsert({ reuniao_id: reuniaoId, visitante_id: visitanteId, presente: presente }, { onConflict: 'reuniao_id, visitante_id' });
        if (error) { console.error("registrarPresencaVisitante (data.ts): Erro ao registrar presença de visitante:", error); throw error; }
        revalidatePath(`/reunioes/presenca/${reuniaoId}`); revalidatePath('/dashboard'); revalidatePath('/relatorios');
    } catch (e: any) { console.error("Falha ao registrar presença de visitante (registrarPresencaVisitante):", e); throw e; }
}

/**
 * Obtém o número de crianças registradas para uma reunião específica.
 * @param reuniaoId O ID da reunião.
 * @returns Uma promessa que resolve para o número de crianças.
 * @throws Erro se não autorizado ou falha na comunicação com o Supabase.
 */
export async function getNumCriancasReuniao(reuniaoId: string): Promise<number> {
    const { supabase, role, celulaId, adminSupabase } = await checkUserAuthorization(); 
    if (!role) return 0;
    let targetCelulaIdForQuery: string | null = (role === 'líder') ? celulaId : null;
    const clientToUseForDataFetch = (role === 'admin' && adminSupabase) ? adminSupabase : supabase; 
    if (!clientToUseForDataFetch) {
        console.error("getNumCriancasReuniao (data.ts): Cliente Supabase não disponível. Erro interno.");
        throw new Error("Erro interno: Cliente Supabase não disponível.");
    }

    if (role === 'admin') {
        const { data: reuniaoDataCheck, error: reuniaoCheckError } = await clientToUseForDataFetch.from('reunioes').select('celula_id').eq('id', reuniaoId).single();
        if (reuniaoCheckError || !reuniaoDataCheck?.celula_id) { console.error("getNumCriancasReuniao (data.ts): Reunião não encontrada ou inacessível para admin:", reuniaoCheckError); return 0; }
        targetCelulaIdForQuery = reuniaoDataCheck.celula_id;
    }
    if (!targetCelulaIdForQuery) return 0;
    try {
        const { data, error } = await clientToUseForDataFetch.from('criancas_reuniao').select('numero_criancas').eq('reuniao_id', reuniaoId).maybeSingle();
        if (error) { console.error("getNumCriancasReuniao (data.ts): Erro ao buscar número de crianças da reunião:", error); throw error; } return Number(data?.numero_criancas) || 0;
    } catch (e: any) { console.error("Falha ao obter número de crianças (getNumCriancasReuniao):", e); throw e; }
}

/**
 * Define o número de crianças para uma reunião específica.
 * @param reuniaoId O ID da reunião.
 * @param numeroCriancas O número de crianças a ser definido.
 * @throws Erro se não autorizado ou falha na comunicação com o Supabase.
 */
export async function setNumCriancasReuniao(reuniaoId: string, numeroCriancas: number): Promise<void> {
    const { supabase, role, celulaId, adminSupabase } = await checkUserAuthorization(); 
    if (!role) throw new Error("Não autorizado");
    let targetCelulaIdForValidation: string | null = (role === 'líder') ? celulaId : null;
    const clientToUseForDataOp = (role === 'admin' && adminSupabase) ? adminSupabase : supabase; 
    if (!clientToUseForDataOp) {
        console.error("setNumCriancasReuniao (data.ts): Cliente Supabase não disponível. Erro interno.");
        throw new Error("Erro interno: Cliente Supabase não disponível.");
    }

    if (role === 'admin') {
        const { data: reuniaoDataCheck, error: reuniaoCheckError } = await clientToUseForDataOp.from('reunioes').select('celula_id').eq('id', reuniaoId).single();
        if (reuniaoCheckError || !reuniaoDataCheck?.celula_id) { throw new Error("Reunião não encontrada ou inacessível."); }
        targetCelulaIdForValidation = reuniaoDataCheck.celula_id;
    }
    if (!targetCelulaIdForValidation) { throw new Error("Nenhum ID de célula para validar o número de crianças."); }
    
    try {
        const { error } = await clientToUseForDataOp.from('criancas_reuniao').upsert({ reuniao_id: reuniaoId, numero_criancas: Math.max(0, numeroCriancas) }, { onConflict: 'reuniao_id' });
        if (error) { console.error("setNumCriancasReuniao (data.ts): Erro ao definir número de crianças da reunião:", error); throw error; }
        revalidatePath(`/reunioes/presenca/${reuniaoId}`); revalidatePath('/dashboard'); revalidatePath('/relatorios');
    } catch (e: any) { console.error("Falha ao definir número de crianças (setNumCriancasReuniao):", e); throw e; }
}

/**
 * Duplica uma reunião existente, criando uma nova reunião com os mesmos dados, mas com data de hoje.
 * Tenta garantir um tema único adicionando "(Cópia N)" se necessário.
 * @param reuniaoId O ID da reunião a ser duplicada.
 * @returns O ID da nova reunião duplicada.
 * @throws Erro se não autorizado ou falha na comunicação com o Supabase.
 */
export async function duplicarReuniao(reuniaoId: string): Promise<string> {
    const { supabase, role, celulaId, adminSupabase } = await checkUserAuthorization(); 
    if (!role) throw new Error("Não autorizado");
    let targetCelulaIdForValidation: string | null = (role === 'líder') ? celulaId : null;
    const clientToUseForDataOp = (role === 'admin' && adminSupabase) ? adminSupabase : supabase; 
    if (!clientToUseForDataOp) {
        console.error("duplicarReuniao (data.ts): Cliente Supabase não disponível. Erro interno.");
        throw new Error("Erro interno: Cliente Supabase não disponível.");
    }

    if (role === 'admin') {
        const { data: reuniaoDataCheck, error: reuniaoCheckError } = await clientToUseForDataOp.from('reunioes').select('celula_id').eq('id', reuniaoId).single();
        if (reuniaoCheckError || !reuniaoDataCheck?.celula_id) { throw new Error("Reunião não encontrada ou inacessível."); }
        targetCelulaIdForValidation = reuniaoDataCheck.celula_id;
    }
    if (!targetCelulaIdForValidation) { throw new Error("Nenhum ID de célula para validar a duplicação da reunião."); }
    
    try {
        const { data: originalReuniaoRaw, error: fetchError } = await clientToUseForDataOp.from('reunioes').select(`
            id, celula_id, data_reuniao, tema, caminho_pdf, created_at,
            ministrador_principal,
            ministrador_secundario,
            responsavel_kids
        `).eq('id', reuniaoId).eq('celula_id', targetCelulaIdForValidation).single();

        if (fetchError || !originalReuniaoRaw) { console.error("duplicarReuniao (data.ts): Erro ao buscar reunião para duplicação:", fetchError); throw new Error("Falha ao buscar reunião para duplicação: " + (fetchError?.message || 'Reunião não encontrada')); }

        const originalReuniao: ReuniaoDB = originalReuniaoRaw as ReuniaoDB;

        const today = new Date().toISOString().split('T')[0];
        let newTheme = originalReuniao.tema;
        let counter = 1;
        while (await verificarDuplicidadeReuniao(today, newTheme)) {
            newTheme = `${originalReuniao.tema} (Cópia ${counter})`;
            counter++;
        }

        const newReuniaoData = {
            celula_id: originalReuniao.celula_id,
            data_reuniao: today,
            tema: newTheme,
            ministrador_principal: originalReuniao.ministrador_principal,
            ministrador_secundario: originalReuniao.ministrador_secundario,
            responsavel_kids: originalReuniao.responsavel_kids,
            caminho_pdf: null
        };

        const { data: newReuniao, error: insertError } = await clientToUseForDataOp.from('reunioes').insert(newReuniaoData).select('id').single();
        if (insertError) { console.error("duplicarReuniao (data.ts): Erro ao criar reunião duplicada:", insertError); throw new Error("Falha ao criar reunião duplicada: " + insertError.message); }
        const newReuniaoId = newReuniao.id;
        const { data: originalCriancas, error: criancasError } = await clientToUseForDataOp.from('criancas_reuniao').select('numero_criancas').eq('reuniao_id', reuniaoId).maybeSingle();
        if (!criancasError && originalCriancas?.numero_criancas) { await clientToUseForDataOp.from('criancas_reuniao').insert({ reuniao_id: newReuniaoId, numero_criancas: originalCriancas.numero_criancas }); }
        revalidatePath('/reunioes'); revalidatePath('/dashboard'); return newReuniaoId;
    } catch (e: any) { console.error("Falha ao duplicar reunião (duplicarReuniao):", e); throw e; }
}

/**
 * Faz upload de um material (PDF) para uma reunião específica.
 * @param reuniaoId O ID da reunião à qual o material pertence.
 * @param file O arquivo a ser carregado.
 * @returns A URL pública do arquivo carregado.
 * @throws Erro se não autorizado, se o arquivo for inválido ou falha no upload/atualização.
 */
export async function uploadMaterialReuniao(reuniaoId: string, file: File): Promise<string> {
    const { supabase, role, celulaId, adminSupabase } = await checkUserAuthorization(); 
    if (!role) throw new Error("Não autorizado.");
    let targetCelulaIdForValidation: string | null = (role === 'líder') ? celulaId : null;
    const clientToUseForDataOp = (role === 'admin' && adminSupabase) ? adminSupabase : supabase; 
    if (!clientToUseForDataOp) {
        console.error("uploadMaterialReuniao (data.ts): Cliente Supabase não disponível. Erro interno.");
        throw new Error("Erro interno: Cliente Supabase não disponível.");
    }

    if (role === 'admin') {
        const { data: reuniaoDataCheck, error: reuniaoCheckError } = await clientToUseForDataOp.from('reunioes').select('celula_id').eq('id', reuniaoId).single();
        if (reuniaoCheckError || !reuniaoDataCheck?.celula_id) { throw new Error("Reunião não encontrada ou inacessível."); }
        targetCelulaIdForValidation = reuniaoDataCheck.celula_id;
    }
    if (!targetCelulaIdForValidation) { throw new Error("Nenhum ID de célula para validar o upload de material."); }
    
    const { data: reunionCheck, error: reunionCheckError } = await clientToUseForDataOp.from('reunioes').select('id').eq('id', reuniaoId).eq('celula_id', targetCelulaIdForValidation).single();
    if (reunionCheckError || !reunionCheck) { throw new Error("Reunião não pertence à sua célula ou não encontrada."); }
    try {
        const fileExtension = file.name.split('.').pop(); 
        const path = `${targetCelulaIdForValidation}/${reuniaoId}.${fileExtension}`;
        const { data, error: uploadError } = await createServerClient().storage.from('reunion_materials').upload(path, file, { cacheControl: '3600', upsert: true });
        if (uploadError) { console.error("uploadMaterialReuniao (data.ts): Erro no upload do arquivo:", uploadError); throw new Error("Falha no upload do arquivo: " + uploadError.message); }
        const { data: publicUrlData } = createServerClient().storage.from('reunion_materials').getPublicUrl(path);
        if (!publicUrlData || !publicUrlData.publicUrl) { throw new Error("Não foi possível obter a URL pública do arquivo."); }
        const { error: updateError } = await clientToUseForDataOp.from('reunioes').update({ caminho_pdf: publicUrlData.publicUrl }).eq('id', reuniaoId);
        if (updateError) { console.error("uploadMaterialReuniao (data.ts): Erro ao atualizar o registro da reunião com o caminho do PDF:", updateError); throw new Error("Falha ao atualizar o registro da reunião com o caminho do PDF: " + updateError.message); }
        revalidatePath(`/reunioes/editar/${reuniaoId}`); revalidatePath(`/reunioes/resumo/${reuniaoId}`); return publicUrlData.publicUrl;
    } catch (e: any) { console.error("Falha ao fazer upload do material da reunião (uploadMaterialReuniao):", e); throw e; }
}

// ============================================================================
//                               FUNÇÕES DE USUÁRIO E PERFIL
// ============================================================================

/**
 * Obtém o perfil completo do usuário logado.
 * @returns Uma promessa que resolve para um objeto Profile ou null se não autenticado.
 * @throws Erro se o cliente Supabase não estiver disponível ou falha na comunicação.
 */
export async function getUserProfile(): Promise<Profile | null> {
    const { supabase, role, adminSupabase } = await checkUserAuthorization(); 
    if (!role) { throw new Error("Usuário não autenticado ou perfil inacessível."); }

    const { data: { user }, error: userError } = await createServerClient().auth.getUser();
    if (userError || !user) { throw new Error("Usuário não autenticado."); }

    try {
        const clientToUseForDataFetch = (role === 'admin' && adminSupabase) ? adminSupabase : supabase; 
        if (!clientToUseForDataFetch) {
            console.error("getUserProfile (data.ts): Cliente Supabase não disponível. Erro interno.");
            throw new Error("Erro interno: Cliente Supabase não disponível.");
        }

        const { data: profileData, error: profileError } = await clientToUseForDataFetch.from('profiles').select('id, email, nome_completo, telefone, role, celula_id, created_at').eq('id', user.id).single();
        if (profileError || !profileData) {
            if (profileError?.code === 'PGRST116') {
                 return { id: user.id, email: user.email || 'email@example.com', nome_completo: null, telefone: null, role: null, celula_id: null, celula_nome: null, created_at: user.created_at };
            }
            console.error("getUserProfile (data.ts): Erro ao carregar perfil:", profileError);
            throw new Error("Falha ao carregar perfil: " + profileError?.message);
        }
        let celulaName: string | null = null;
        if (profileData.celula_id) {
            const celulasNamesMap = await getCelulasNamesMap(clientToUseForDataFetch, new Set([profileData.celula_id])); 
            celulaName = celulasNamesMap.get(profileData.celula_id) || null;
        }
        return { id: profileData.id, email: profileData.email || 'N/A', nome_completo: profileData.nome_completo, telefone: profileData.telefone, role: profileData.role, celula_id: profileData.celula_id, celula_nome: celulaName, created_at: profileData.created_at };
    } catch (e: any) { console.error("Falha ao carregar perfil de usuário (getUserProfile):", e); throw new Error("Falha ao carregar perfil: " + e.message); }
}

/**
 * Atualiza os dados de nome completo e telefone do perfil do usuário logado.
 * @param profileId O ID do perfil a ser atualizado.
 * @param data Os dados a serem atualizados (nome_completo, telefone).
 * @throws Erro se não autorizado ou falha na comunicação com o Supabase.
 */
export async function updateUserProfileData(profileId: string, data: { nome_completo: string; telefone: string | null }): Promise<void> {
    const { supabase, role, adminSupabase } = await checkUserAuthorization(); 
    if (!role) { throw new Error("Não autorizado."); }
    const { data: { user }, error: userError } = await createServerClient().auth.getUser();
    if (userError || !user || user.id !== profileId) { throw new Error("Não autorizado."); }
    const clientToUseForDataOp = (role === 'admin' && adminSupabase) ? adminSupabase : supabase;
    if (!clientToUseForDataOp) {
        console.error("updateUserProfileData (data.ts): Cliente Supabase não disponível. Erro interno.");
        throw new Error("Erro interno: Cliente Supabase não disponível.");
    }
    try {
        const { error } = await clientToUseForDataOp.from('profiles').update({ nome_completo: data.nome_completo, telefone: data.telefone }).eq('id', profileId);
        if (error) { console.error("updateUserProfileData (data.ts): Erro ao atualizar perfil:", error); throw new Error("Falha ao atualizar perfil: " + error.message); }
        revalidatePath('/profile'); revalidatePath('/dashboard');
    } catch (e: any) { console.error("Falha ao atualizar perfil de usuário (updateUserProfileData):", e); throw new Error("Falha ao atualizar perfil: " + e.message); }
}

/**
 * Atualiza a senha do usuário logado.
 * @param newPassword A nova senha.
 * @returns Um objeto com `success` e uma `message`.
 */
export async function updateUserPassword(newPassword: string): Promise<{ success: boolean; message: string }> {
    const { supabase } = await checkUserAuthorization();
    const { data: { user }, error: userError } = await createServerClient().auth.getUser();
    if (userError || !user) { return { success: false, message: "Usuário não autenticado." }; }
    if (newPassword.length < 6) { return { success: false, message: "A senha deve ter no mínimo 6 caracteres." }; }
    try {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) {
            if (error.message.includes('Password should be at least')) { return { success: false, message: "A senha é muito curta. Deve ter no mínimo 6 caracteres." }; }
            console.error("updateUserPassword (data.ts): Erro ao trocar senha:", error);
            return { success: false, message: "Falha ao trocar senha: " + error.message };
        }
        return { success: true, message: "Senha atualizada com sucesso!" };
    } catch (e: any) { console.error("Erro inesperado ao trocar senha (updateUserPassword):", e); return { success: false, message: "Erro inesperado ao trocar senha: " + e.message }; }
}

// ============================================================================
//                               FUNÇÕES PALAVRA DA SEMANA
// ============================================================================

/**
 * Faz upload ou atualiza a "Palavra da Semana". Restrito a administradores.
 * Permite anexar um arquivo PDF e define título, descrição e data.
 * @param formData FormData contendo 'titulo', 'descricao', 'data_semana' e 'file' (opcional).
 * @returns Um objeto com `success`, `message` e a URL do arquivo (se houver).
 */
export async function uploadPalavraDaSemana(formData: FormData): Promise<{ success: boolean; message: string; url?: string }> {
    const { supabase, role, adminSupabase } = await checkUserAuthorization(); 

    if (role !== 'admin') {
        return { success: false, message: "Não autorizado: Apenas administradores podem gerenciar a Palavra da Semana." };
    }

    const { data: { user }, error: userError } = await createServerClient().auth.getUser();
    if (userError || !user) {
        return { success: false, message: "Usuário não autenticado." };
    }

    const titulo = formData.get('titulo') as string;
    const descricao = formData.get('descricao') as string | null;
    const data_semana = formData.get('data_semana') as string;
    const file = formData.get('file') as File | null;

    if (!titulo || !data_semana) {
        return { success: false, message: "Título e Data da Semana são obrigatórios." };
    }

    try {
        const clientToUseForDataOp = (role === 'admin' && adminSupabase) ? adminSupabase : supabase;
        if (!clientToUseForDataOp) {
            console.error("uploadPalavraDaSemana (data.ts): Cliente Supabase não disponível. Erro interno.");
            throw new Error("Erro interno: Cliente Supabase não disponível.");
        }

        const { data: existingPalavra, error: checkError } = await clientToUseForDataOp
            .from('palavra_semana')
            .select('id, url_arquivo')
            .eq('data_semana', data_semana)
            .maybeSingle();

        if (checkError) {
            console.error("uploadPalavraDaSemana (data.ts): Erro ao verificar Palavra da Semana existente:", checkError);
            throw new Error("Falha ao verificar duplicidade: " + checkError.message);
        }

        let fileUrl: string | null = existingPalavra?.url_arquivo || null;

        if (file && file.size > 0) {
            if (file.type !== 'application/pdf') {
                return { success: false, message: "Apenas arquivos PDF são permitidos." };
            }
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                return { success: false, message: "O arquivo excede o limite de 5MB." };
            }

            const sanitizedFileName = sanitizeFileName(file.name);
            const filePath = `palavra_semana/${data_semana}-${sanitizedFileName}`;

            const { error: uploadError } = await createServerClient().storage
                .from('palavra_semana_files')
                .upload(filePath, file, { upsert: true });

            if (uploadError) {
                console.error("uploadPalavraDaSemana (data.ts): Erro no upload da Palavra da Semana:", uploadError);
                throw new Error("Falha no upload do arquivo: " + uploadError.message);
            }

            const { data: publicUrlData } = createServerClient().storage
                .from('palavra_semana_files')
                .getPublicUrl(filePath);

            fileUrl = publicUrlData?.publicUrl || null;
        }

        if (!fileUrl && !existingPalavra) {
            return { success: false, message: "É necessário enviar um arquivo ao criar uma nova Palavra da Semana." };
        }

        const dataToUpsert = {
            titulo: titulo,
            descricao: descricao,
            url_arquivo: fileUrl,
            data_semana: data_semana,
            created_by: user.id,
        };

        const { error: upsertError } = await clientToUseForDataOp
            .from('palavra_semana')
            .upsert({ ...dataToUpsert, id: existingPalavra?.id }, { onConflict: 'data_semana' });

        if (upsertError) {
            console.error("uploadPalavraDaSemana (data.ts): Erro no upsert da Palavra da Semana:", upsertError);
            throw new Error("Falha ao salvar a Palavra da Semana: " + upsertError.message);
        }

        revalidatePath('/admin/palavra-semana');
        revalidatePath('/dashboard');

        return { success: true, message: "Palavra da Semana salva com sucesso!", url: fileUrl || undefined };

    } catch (e: any) {
        console.error("Erro na Server Action uploadPalavraDaSemana (data.ts):", e);
        return { success: false, message: "Erro: " + e.message };
    }
}

/**
 * Obtém a Palavra da Semana mais recente ou de uma data específica.
 * @param data Opcional. A data para buscar a Palavra da Semana. Se não fornecido, busca a mais recente.
 * @returns Uma promessa que resolve para um objeto PalavraDaSemana ou null.
 * @throws Erro se o cliente Supabase não estiver disponível ou falha na comunicação.
 */
export async function getPalavraDaSemana(data?: string): Promise<PalavraDaSemana | null> {
    const { supabase, role, adminSupabase } = await checkUserAuthorization(); 

    if (!role) {
        console.warn("getPalavraDaSemana (data.ts): Usuário não autenticado. Retornando null.");
        return null;
    }

    try {
        const clientToUseForDataFetch = (role === 'admin' && adminSupabase) ? adminSupabase : supabase;
        if (!clientToUseForDataFetch) {
            console.error("getPalavraDaSemana (data.ts): Cliente Supabase não disponível. Erro interno.");
            throw new Error("Erro interno: Cliente Supabase não disponível.");
        }

        let query = clientToUseForDataFetch
            .from('palavra_semana')
            .select(`
                id,
                titulo,
                descricao,
                url_arquivo,
                data_semana,
                created_at,
                created_by
            `);

        if (data) {
            query = query.eq('data_semana', data);
        } else {
            query = query.order('data_semana', { ascending: false }).limit(1);
        }

        const { data: palavraData, error } = await query.maybeSingle();

        if (error) {
            console.error("getPalavraDaSemana (data.ts): Erro ao buscar Palavra da Semana:", error);
            throw new Error("Falha ao carregar Palavra da Semana: " + error.message);
        }

        if (!palavraData) return null;

        let createdByEmail: string | null = null;
        if (palavraData.created_by) {
            const { data: profileEmailData, error: profileEmailError } = await createServerClient()
                .from('profiles')
                .select('email')
                .eq('id', palavraData.created_by)
                .single();

            if (profileEmailError) {
                console.warn(`getPalavraDaSemana (data.ts): Aviso: Não foi possível buscar o email para created_by ${palavraData.created_by}:`, profileEmailError.message);
            } else {
                createdByEmail = profileEmailData?.email || 'Admin';
            }
        }

        return {
            ...palavraData,
            created_by_email: createdByEmail,
        };

    } catch (e: any) {
        console.error("Erro na Server Action getPalavraDaSemana (data.ts):", e);
        if (e && typeof e === 'object' && 'message' in e) {
            throw new Error("Erro: " + e.message);
        }
        throw new Error("Erro desconhecido ao carregar Palavra da Semana.");
    }
}

/**
 * Exclui uma Palavra da Semana e seu arquivo associado do armazenamento. Restrito a administradores.
 * @param id O ID da Palavra da Semana a ser excluída.
 * @returns Um objeto com `success` e uma `message`.
 */
export async function deletePalavraDaSemana(id: string): Promise<{ success: boolean; message: string }> {
    const { supabase, role, adminSupabase } = await checkUserAuthorization(); 

    if (role !== 'admin') {
        return { success: false, message: "Não autorizado: Apenas administradores podem excluir a Palavra da Semana." };
    }

    try {
        const clientToUseForDataOp = (role === 'admin' && adminSupabase) ? adminSupabase : supabase;
        if (!clientToUseForDataOp) {
            console.error("deletePalavraDaSemana (data.ts): Cliente Supabase não disponível. Erro interno.");
            throw new Error("Erro interno: Cliente Supabase não disponível.");
        }

        const { data: palavra, error: fetchError } = await clientToUseForDataOp
            .from('palavra_semana')
            .select('url_arquivo')
            .eq('id', id)
            .single();

        if (fetchError || !palavra) {
            console.error("deletePalavraDaSemana (data.ts): Erro ao buscar registro da Palavra da Semana para exclusão:", fetchError);
            throw new Error("Falha ao buscar registro: " + (fetchError?.message || 'Palavra da Semana não encontrada'));
        }

        const { error: deleteRecordError } = await clientToUseForDataOp
            .from('palavra_semana')
            .delete()
            .eq('id', id);

        if (deleteRecordError) {
            console.error("deletePalavraDaSemana (data.ts): Erro ao excluir registro da Palavra da Semana:", deleteRecordError);
            throw new Error("Falha ao excluir registro: " + deleteRecordError.message);
        }

        if (palavra.url_arquivo) {
            const storageBucket = 'palavra_semana_files'; 
            const urlParts = palavra.url_arquivo.split(`${storageBucket}/`);
            const storagePath = urlParts.length > 1 ? urlParts[1] : null;

            if (storagePath) {
                const { error: deleteFileError } = await createServerClient().storage
                    .from(storageBucket)
                    .remove([storagePath]);

                if (deleteFileError) {
                    console.warn("deletePalavraDaSemana (data.ts): Aviso: Registro do DB excluído, mas erro ao excluir arquivo do storage:", deleteFileError);
                }
            }
        }
        
        revalidatePath('/admin/palavra-semana');
        revalidatePath('/dashboard');

        return { success: true, message: "Palavra da Semana excluída com sucesso!" };
    } catch (e: any) {
        console.error("Erro na Server Action deletePalavraDaSemana (data.ts):", e);
        return { success: false, message: "Erro: " + e.message };
    }
}