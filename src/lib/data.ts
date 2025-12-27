'use server';

import { createServerClient, createAdminClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { format, isSameMonth, parseISO, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// IMPORTAR TODOS OS TIPOS NECESSÁRIOS DE types.ts
import {
    Membro,
    Visitante,
    ReuniaoDB,
    ReuniaoComNomes,
    ReuniaoParaEdicao,
    ReuniaoFormData,
    MembroComPresenca,
    VisitanteComPresenca,
    CelulaOption,
    ReuniaoDetalhesParaResumo,
    Profile,
    PalavraDaSemana,
    CelulaNomeId,
    ImportMembroResult,
    CriancasReuniaoData,
    MembroNomeTelefoneId, 
    // TIPOS PARA EVENTOS FACE A FACE
    EventoFaceAFace,
    EventoFaceAFaceFormData,
    EventoFaceAFaceTipo,
    EventoFaceAFaceOption,
    InscricaoFaceAFaceStatus,
    InscricaoFaceAFaceEstadoCivil,
    InscricaoFaceAFaceTamanhoCamiseta,
    InscricaoFaceAFaceTipoParticipacao, 
    InscricaoFaceAFace,
    InscricaoFaceAFaceFormData,
} from './types';


// ============================================================================
//                            FUNÇÕES AUXILIARES
// ============================================================================

async function checkUserAuthorization(): Promise<{
    supabase: ReturnType<typeof createServerClient>;
    role: 'admin' | 'líder' | null;
    celulaId: string | null;
    profileId: string | null; // Adicionado para quem fez a ação
    adminSupabase: ReturnType<typeof createAdminClient> | null; 
}> {
    const supabaseUser = createServerClient();
    const adminSupabase = createAdminClient(); 
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();

    if (userError || !user) {
        console.warn('checkUserAuthorization: Usuário não autenticado.');
        return { supabase: supabaseUser, role: null, celulaId: null, profileId: null, adminSupabase: adminSupabase }; 
    }

    const { data: profileData, error: profileError } = await supabaseUser
        .from('profiles')
        .select('celula_id, role')
        .eq('id', user.id)
        .single();

    if (profileError || !profileData) {
        console.error('checkUserAuthorization: Erro ao buscar perfil:', profileError?.message || 'Perfil não encontrado.');
        return { supabase: supabaseUser, role: null, celulaId: null, profileId: user.id, adminSupabase: adminSupabase };
    }
    
    const role = profileData.role as 'admin' | 'líder';
    const celulaId = profileData.celula_id;
    // console.log(`checkUserAuthorization: Usuário ${user.email} autenticado. Role: ${role}, Celula ID: ${celulaId}`); // Log detalhado, pode ser comentado em produção

    return {
        supabase: supabaseUser,
        role: role,
        celulaId: celulaId,
        profileId: user.id, // Retorna o ID do perfil também
        adminSupabase: role === 'admin' ? adminSupabase : null 
    };
}

async function getCelulasNamesMap(supabaseInstance: ReturnType<typeof createServerClient> | ReturnType<typeof createAdminClient> | null, celulaIds: Set<string>): Promise<Map<string, string>> {
    const namesMap = new Map<string, string>();
    if (!supabaseInstance || celulaIds.size === 0) return namesMap;

    // console.log(`getCelulasNamesMap: Buscando nomes para ${celulaIds.size} IDs de célula.`); // Log detalhado
    const { data, error } = await supabaseInstance
        .from('celulas')
        .select('id, nome')
        .in('id', Array.from(celulaIds));

    if (error) {
        console.error("Erro ao buscar nomes de células (getCelulasNamesMap):", error);
    } else {
        // console.log(`getCelulasNamesMap: Encontrados ${data?.length} nomes de células.`); // Log detalhado
        data?.forEach((c: CelulaNomeId) => namesMap.set(c.id, c.nome));
    }
    return namesMap;
}

function sanitizeFileName(fileName: string): string {
    const normalized = fileName.normalize('NFD');
    const withoutAccents = normalized.replace(/[\u0300-\u036f]/g, '');
    const sanitized = withoutAccents.replace(/[^a-zA-Z0-9._-]/g, '_'); 
    return sanitized;
}


// ============================================================================
//                            FUNÇÃO: listarCelulasParaAdmin
// ============================================================================
export async function listarCelulasParaAdmin(): Promise<CelulaOption[]> {
    const { supabase, role, adminSupabase } = await checkUserAuthorization();

    // console.log(`listarCelulasParaAdmin: Chamada. Role detectado: ${role}`); // Log detalhado
    if (role !== 'admin') {
        console.warn("listarCelulasParaAdmin: Acesso negado. Apenas administradores podem listar todas as células.");
        return [];
    }

    try {
        const clientToUse = adminSupabase || supabase; 

        // console.log(`listarCelulasParaAdmin: Buscando todas as células como admin. Usando client: ${adminSupabase ? 'admin' : 'RLS'}`); // Log detalhado
        const { data, error } = await clientToUse
            .from('celulas')
            .select('id, nome')
            .order('nome', { ascending: true });

        if (error) {
            console.error("listarCelulasParaAdmin: Erro ao listar células:", error);
            throw new Error("Falha ao carregar células: " + error.message);
        }
        // console.log(`listarCelulasParaAdmin: Retornando ${data?.length} células.`); // Log detalhado
        return data || [];
    } catch (e: any) {
        console.error("Erro na Server Action listarCelulasParaAdmin:", e.message, e);
        throw e;
    }
}

// ============================================================================
//                            FUNÇÃO: listarCelulasParaLider
// ============================================================================
export async function listarCelulasParaLider(): Promise<CelulaOption[]> {
    const { supabase, role, celulaId } = await checkUserAuthorization();

    // console.log(`listarCelulasParaLider: Chamada. Role detectado: ${role}, Celula ID: ${celulaId}`); // Log detalhado
    if (role === 'líder' && celulaId) {
        try {
            // console.log(`listarCelulasParaLider: Buscando célula para líder com ID ${celulaId}.`); // Log detalhado
            const { data, error } = await supabase
                .from('celulas')
                .select('id, nome')
                .eq('id', celulaId)
                .single();

            if (error) {
                console.error("listarCelulasParaLider: Erro ao listar célula para líder:", error);
                throw new Error("Falha ao carregar sua célula: " + error.message);
            }
            // console.log(`listarCelulasParaLider: Retornando ${data ? 1 : 0} célula(s).`); // Log detalhado
            return data ? [{ id: data.id, nome: data.nome }] : [];
        } catch (e: any) {
        console.error("Erro na Server Action listarCelulasParaLider:", e.message, e);
        throw e;
    }
    }
    console.warn("listarCelulasParaLider: Retornando lista vazia (Não é líder ou não tem celulaId).");
    return [];
}

// ============================================================================
//                          RPC para Filtro de Aniversário (Adicionado aqui para reutilização)
// ============================================================================
/*
// CRIE ESTAS FUNÇÕES NO SEU BANCO DE DADOS SUPABASE (SQL Editor) SE AINDA NÃO EXISTIREM:

-- Função para membros
CREATE OR REPLACE FUNCTION public.get_members_birthday_ids_in_month(p_month INT, p_celula_id UUID DEFAULT NULL)
RETURNS SETOF uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT id
  FROM public.membros
  WHERE
    EXTRACT(MONTH FROM data_nascimento) = p_month
    AND (p_celula_id IS NULL OR celula_id = p_celula_id);
END;
$$;

-- Grant EXECUTE permission to authenticated role
GRANT EXECUTE ON FUNCTION public.get_members_birthday_ids_in_month(p_month INT, p_celula_id UUID) TO authenticated;


-- Função para visitantes (se você tiver dados de nascimento para visitantes e quiser filtrá-los)
CREATE OR REPLACE FUNCTION public.get_visitors_birthday_ids_in_month(p_month INT, p_celula_id UUID DEFAULT NULL)
RETURNS SETOF uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT id
  FROM public.visitantes
  WHERE
    EXTRACT(MONTH FROM data_nascimento) = p_month
    AND (p_celula_id IS NULL OR celula_id = p_celula_id);
END;
$$;

-- Grant EXECUTE permission to authenticated role
GRANT EXECUTE ON FUNCTION public.get_visitors_birthday_ids_in_month(p_month INT, p_celula_id UUID) TO authenticated;
*/


// ============================================================================
//                               FUNÇÕES DE MEMBROS
// ============================================================================
export async function listarMembros(
    celulaIdFilter: string | null = null,
    searchTerm: string | null = null,
    birthdayMonth: number | null = null,
    statusFilter: Membro['status'] | 'all' = 'all',
): Promise<Membro[]> {
    const { supabase, role, celulaId, adminSupabase } = await checkUserAuthorization(); 
    if (!role) { return []; }

    const clientToUse = adminSupabase || supabase;
    let query = clientToUse.from('membros').select('*');
    
    // Aplicar filtro de Aniversário via RPC se birthdayMonth for fornecido
    if (birthdayMonth !== null && birthdayMonth >= 1 && birthdayMonth <= 12) {
        // console.log(`listarMembros: Aplicando filtro de aniversário para o mês ${birthdayMonth}`); // Log detalhado
        let rpcCelulaIdParam: string | null | undefined = undefined; // Undefined para global
        if (role === 'líder' && celulaId) {
            rpcCelulaIdParam = celulaId;
        } else if (role === 'admin' && celulaIdFilter) {
            rpcCelulaIdParam = celulaIdFilter;
        } else if (role === 'admin' && celulaIdFilter === null) {
            rpcCelulaIdParam = null; // Admin sem filtro global
        }
        
        const { data: rpcMemberIds, error: rpcError } = await clientToUse.rpc('get_members_birthday_ids_in_month', { 
            p_month: birthdayMonth, 
            p_celula_id: rpcCelulaIdParam 
        });

        if (rpcError) {
            console.error("listarMembros: Erro na RPC get_members_birthday_ids_in_month:", rpcError);
            throw new Error(`Falha ao carregar membros por mês de aniversário: ${rpcError.message}`);
        }
        
        const memberIdsToFilter: string[] = rpcMemberIds || []; 

        if (memberIdsToFilter.length === 0) { 
            // console.log("listarMembros: Nenhuns membros encontrados para o mês de aniversário filtrado."); // Log detalhado
            return []; // Nenhuns membros encontrados para o mês, retorna cedo
        }
        // Adiciona um filtro WHERE IN (memberIdsToFilter)
        query = query.in('id', memberIdsToFilter);
    }

    // Aplicar filtro de Célula (se não for líder, ou se for admin com filtro específico)
    if (role === 'líder') {
        if (!celulaId) {
            console.warn("listarMembros: Líder sem ID de célula. Retornando lista vazia.");
            return [];
        }
        query = query.eq('celula_id', celulaId);
    } else if (role === 'admin' && celulaIdFilter) {
        query = query.eq('celula_id', celulaIdFilter);
    } 
    // Para admin sem celulaIdFilter, a RLS e o comportamento padrão do select já buscam todos.

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
        console.error("Erro ao listar membros:", error); 
        throw new Error(`Falha ao carregar membros: ${error.message}`); 
    }

    const membros: Membro[] = data || [];
    if (membros.length === 0) return [];
    
    // Buscar nomes das células para exibição
    const celulaIds = new Set<string>(membros.map((m: Membro) => m.celula_id));
    const celulasNamesMap = await getCelulasNamesMap(clientToUse, celulaIds); 
    
    return membros.map((m: Membro) => ({ ...m, celula_nome: celulasNamesMap.get(m.celula_id) || null }));
}

/**
 * Lista membros de uma célula específica para um líder.
 * Retorna apenas o ID, nome e telefone, útil para dropdowns de seleção.
 *
 * @returns Uma lista de membros da célula do líder.
 * @throws Erro se não autorizado ou se a busca falhar.
 */
export async function listarMembrosDaCelulaDoLider(): Promise<MembroNomeTelefoneId[]> {
    const { supabase, role, celulaId } = await checkUserAuthorization();

    if (role !== 'líder' || !celulaId) {
        console.warn("listarMembrosDaCelulaDoLider: Acesso negado. Apenas líderes com ID de célula podem listar membros.");
        return [];
    }

    try {
        const { data, error } = await supabase
            .from('membros')
            .select('id, nome, telefone, data_nascimento, endereco, celula_id') // Incluí mais campos para pré-preenchimento
            .eq('celula_id', celulaId)
            .order('nome', { ascending: true });

        if (error) {
            console.error("Erro ao listar membros da célula do líder:", error);
            throw new Error(`Falha ao carregar membros da sua célula: ${error.message}`);
        }

        // Mapeia para incluir campos adicionais necessários no formulário de inscrição
        return data.map(membro => ({
            id: membro.id,
            nome: membro.nome,
            telefone: membro.telefone,
            // Adicione outros campos que você pode precisar pré-preencher
            data_nascimento: membro.data_nascimento,
            endereco: membro.endereco,
            celula_id: membro.celula_id,
            // celula_nome: (membro as any).celula_nome, // Assumindo que o select já faz o join ou que getMembro fará
        })) as MembroNomeTelefoneId[]; // Cast para o tipo correto
    } catch (e: any) {
        console.error("Falha na Server Action listarMembrosDaCelulaDoLider:", e);
        throw e;
    }
}


export async function adicionarMembro(newMembroData: Omit<Membro, 'id' | 'created_at' | 'celula_nome'>): Promise<string> {
    const { supabase, role, celulaId } = await checkUserAuthorization();
    if (!role) { throw new Error("Não autorizado: Usuário não autenticado ou role inválida."); }

    let targetCelulaIdForInsert: string | null = (role === 'líder') 
        ? celulaId 
        : (newMembroData.celula_id ?? null); // Converte undefined para null

    if (!targetCelulaIdForInsert) {
        throw new Error("ID da célula é necessário para adicionar um membro.");
    }

    const dataToInsert = {
        ...newMembroData,
        celula_id: targetCelulaIdForInsert,
        status: newMembroData.status || 'Ativo'
    };

    const { data, error } = await supabase.from('membros').insert(dataToInsert).select('id').single();

    if (error) { console.error("Erro ao adicionar membro:", error); throw error; }
    revalidatePath('/membros');
    return data.id;
}


export async function getMembro(membroId: string): Promise<Membro | null> {
    const { supabase, role, celulaId } = await checkUserAuthorization();
    if (!role) return null;
    let query = supabase.from('membros').select('*, celulas(nome)').eq('id', membroId); // Adicionado join para celula_nome
    if (role === 'líder') { if (!celulaId) return null; query = query.eq('celula_id', celulaId); }
    const { data, error } = await query.single();
    if (error) { console.error("Erro ao buscar membro:", error); if (error.code === 'PGRST116') return null; throw error; }
    
    // Mapeia o resultado para a interface Membro, incluindo celula_nome
    if (data) {
        return {
            ...data,
            celula_nome: (data as any).celulas?.nome || null // Acessa o nome da célula através do join
        } as Membro;
    }
    return null;
}

export async function atualizarMembro(membroId: string, updatedMembroData: Omit<Membro, 'id' | 'celula_id' | 'created_at' | 'celula_nome'>): Promise<void> {
    const { supabase, role, celulaId } = await checkUserAuthorization();
    if (!role) throw new Error("Não autorizado");
    let query = supabase.from('membros').update(updatedMembroData).eq('id', membroId);
    if (role === 'líder') { if (!celulaId) throw new Error("Não autorizado"); query = query.eq('celula_id', celulaId); }
    const { error } = await query;
    if (error) { console.error("Erro ao atualizar membro:", error); throw error; }
    revalidatePath('/membros');
    revalidatePath(`/membros/editar/${membroId}`);
}

export async function excluirMembro(membroId: string): Promise<void> {
    const { supabase, role, celulaId } = await checkUserAuthorization();
    if (!role) throw new Error("Não autorizado");
    let query = supabase.from('membros').delete().eq('id', membroId);
    if (role === 'líder') { if (!celulaId) throw new Error("Não autorizado"); query = query.eq('celula_id', celulaId); }
    const { error } = await query;
    if (error) { console.error("Erro ao excluir membro:", error); throw new Error(`Falha ao excluir membro: ${error.message}`); }
    revalidatePath('/membros');
}

export async function importarMembrosCSV(csvString: string): Promise<ImportMembroResult> {
    const { supabase, role, celulaId } = await checkUserAuthorization();
    if (!role || role !== 'líder' || !celulaId) return { success: false, message: "Não autorizado.", importedCount: 0, errors: [] };
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
            if (char === '"') { if (i < line.length - 1 && line[i+1] === '"') { currentField += '"'; i++; } else { inQuote = !inQuote; } }
            else if (char === ',' && !inQuote) { result.push(currentField.trim() === '' ? null : currentField.trim()); currentField = ''; }
            else { currentField += char; }
        }
        result.push(currentField.trim() === '' ? null : currentField.trim());
        return result;
    };
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i]; if (!line.trim()) continue;
        const values = parseCSVLine(line); const rowData: { [key: string]: string | null } = {};
        headers.forEach((header, index) => { rowData[header] = values[index]; });
        let newMembro: Omit<Membro, 'id' | 'created_at' | 'celula_nome'>;
        try {
            const nome = rowData.nome; const data_ingresso = rowData.data_ingresso; const telefone = rowData.telefone; const data_nascimento = rowData.data_nascimento; const endereco = rowData.endereco; const status = rowData.status || 'Ativo';
            if (!nome) throw new Error("Nome é obrigatório."); if (!data_ingresso) throw new Error("Data de ingresso é obrigatória.");
            if (telefone && !/^\d{10,11}$/.test(telefone.replace(/\D/g, ''))) throw new Error("Telefone inválido (deve ter 10 ou 11 dígitos).");
            if (data_nascimento && isNaN(new Date(data_nascimento).getTime())) throw new Error("Data de nascimento inválida.");
            if (isNaN(new Date(data_ingresso).getTime())) throw new Error("Data de ingresso inválida.");
            if (!['Ativo', 'Inativo', 'Em transição'].includes(status || '')) throw new Error("Status inválido. Use 'Ativo', 'Inativo' ou 'Em transição'.");
            newMembro = { celula_id: celulaId, nome: nome, telefone: telefone ? telefone.replace(/\D/g, '') : null, data_ingresso: data_ingresso, data_nascimento: data_nascimento, endereco: endereco, status: status as Membro['status'], };
            membersToInsert.push(newMembro);
        } catch (e: any) { errors.push({ rowIndex: i + 1, data: rowData, error: e.message }); }
    }
    if (membersToInsert.length > 0) {
        const { error: batchError } = await supabase.from('membros').insert(membersToInsert);
        if (batchError) {
            console.error("Erro na inserção em lote:", batchError);
            for (let j = 0; j < membersToInsert.length; j++) {
                const member = membersToInsert[j];
                const { error: singleInsertError } = await supabase.from('membros').insert(member);
                if (singleInsertError) { errors.push({ rowIndex: errors.length + 1, data: member, error: "Falha: " + singleInsertError.message }); }
                else { importedCount++; }
            }
            if (errors.length === 0) { errors.push({ rowIndex: -1, data: null, error: "Erro em lote: " + batchError.message }); }
        } else { importedCount = membersToInsert.length; }
    }
    revalidatePath('/membros');
    return { success: errors.length === 0 && importedCount > 0, message: `Importação com ${importedCount} sucessos e ${errors.length} erros.`, importedCount, errors };
}

export async function exportarMembrosCSV(celulaIdFilter: string | null, searchTerm: string | null, birthdayMonth: number | null, statusFilter: Membro['status'] | 'all'): Promise<string> {
    const { supabase, role, celulaId, adminSupabase } = await checkUserAuthorization(); 
    if (!role) { throw new Error("Não autorizado."); }
    let query = supabase.from('membros').select('*');
    if (role === 'líder') { if (!celulaId) { throw new Error("ID da célula é necessário."); } query = query.eq('celula_id', celulaId); }
    else if (role === 'admin' && celulaIdFilter) { query = query.eq('celula_id', celulaIdFilter); }
    else if (role === 'admin' && !celulaIdFilter) { /* Admin sem filtro vê todos, então não adiciona eq('celula_id') */ }

    if (searchTerm) { query = query.or(`nome.ilike.%${searchTerm}%,telefone.ilike.%${searchTerm}%`); }
    
    if (statusFilter !== 'all') { query = query.eq('status', statusFilter); }
    
    // SE O FILTRO DE ANIVERSÁRIO FOR USADO, DEVE SER VIA RPC AQUI
    if (birthdayMonth !== null && birthdayMonth >= 1 && birthdayMonth >= 1 && birthdayMonth <= 12) {
        let rpcCelulaIdParam: string | null | undefined = undefined; 
        if (role === 'líder' && celulaId) {
            rpcCelulaIdParam = celulaId;
        } else if (role === 'admin' && celulaIdFilter) {
            rpcCelulaIdParam = celulaIdFilter;
        } else if (role === 'admin' && celulaIdFilter === null) {
            rpcCelulaIdParam = null; 
        }

        const { data: rpcMemberIds, error: rpcError } = await (adminSupabase || supabase).rpc('get_members_birthday_ids_in_month', {
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
    if (error) { console.error("Erro ao carregar membros para exportação:", error); throw new Error(`Falha ao carregar membros para exportação: ${error.message}`); }
    const membros: Membro[] = membrosData || [];
    if (!membros || membros.length === 0) return "Nome,Telefone,Data de Ingresso,Data de Nascimento,Endereço,Status,Célula\n";
    const celulaIds = new Set<string>(membros.map((m: Membro) => m.celula_id));
    const celulasNamesMap = await getCelulasNamesMap(adminSupabase || supabase, celulaIds); 
    const headers = ["Nome", "Telefone", "Data de Ingresso", "Data de Nascimento", "Endereço", "Status", "Célula"]; let csv = headers.join(',') + '\n';
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

export async function listarVisitantes(celulaIdFilter: string | null = null, searchTerm: string | null = null, minDaysSinceLastContact: number | null = null): Promise<Visitante[]> {
    const { supabase, role, celulaId, adminSupabase } = await checkUserAuthorization(); 
    if (!role) { return []; }
    let query = supabase.from('visitantes').select('id, celula_id, nome, telefone, data_primeira_visita, data_nascimento, endereco, data_ultimo_contato, observacoes, status_conversao, created_at'); // Incluido status_conversao
    if (role === 'líder') { if (!celulaId) { return []; } query = query.eq('celula_id', celulaId); }
    else if (role === 'admin' && celulaIdFilter) { query = query.eq('celula_id', celulaIdFilter); }
    else if (role === 'admin' && !celulaIdFilter) { /* Admin sem filtro vê todos, então não adiciona eq('celula_id') */ }

    if (searchTerm) { query = query.or(`nome.ilike.%${searchTerm}%,telefone.ilike.%${searchTerm}%`); }
    if (minDaysSinceLastContact !== null && minDaysSinceLastContact > 0) { const cutoffDate = subDays(new Date(), minDaysSinceLastContact).toISOString().split('T')[0]; query = query.or(`data_ultimo_contato.is.null,data_ultimo_contato.lt.${cutoffDate}`); }
    const { data, error } = await query.order('nome', { ascending: true });
    if (error) { console.error("Erro ao listar visitantes:", error); throw new Error(`Falha ao carregar visitantes: ${error.message}`); }
    const visitantes: Visitante[] = data || [];
    if (visitantes.length === 0) return [];
    const celulaIds = new Set<string>(visitantes.map((v: Visitante) => v.celula_id));
    const celulasNamesMap = await getCelulasNamesMap(adminSupabase || supabase, celulaIds); 
    return visitantes.map((v: Visitante) => ({ ...v, celula_nome: celulasNamesMap.get(v.celula_id) || null }));
}

export async function adicionarVisitante(newVisitanteData: Omit<Visitante, 'id' | 'created_at' | 'celula_nome' | 'status_conversao'>): Promise<string> { // status_conversao removido do Omit
    const { supabase, role, celulaId } = await checkUserAuthorization();
    if (!role) throw new Error("Não autorizado");
    
    let targetCelulaIdForInsert: string | null = (role === 'líder') 
        ? celulaId 
        : (newVisitanteData.celula_id ?? null); // Converte undefined para null

    if (!targetCelulaIdForInsert) {
        throw new Error("ID da célula é necessário.");
    }
    const { data, error } = await supabase.from('visitantes').insert({
        ...newVisitanteData,
        celula_id: targetCelulaIdForInsert,
        status_conversao: 'Em Contato' // Valor padrão ao adicionar
    }).select('id').single();
    if (error) { console.error("Erro ao adicionar visitante:", error); throw error; } revalidatePath('/visitantes'); return data.id;
}


export async function getVisitante(visitanteId: string): Promise<Visitante | null> {
    const { supabase, role, celulaId } = await checkUserAuthorization();
    if (!role) return null;
    let query = supabase.from('visitantes').select('id, celula_id, nome, telefone, data_primeira_visita, endereco, data_ultimo_contato, observacoes, data_nascimento, status_conversao, created_at').eq('id', visitanteId); // Adicionado status_conversao
    if (role === 'líder') { if (!celulaId) return null; query = query.eq('celula_id', celulaId); }
    const { data, error } = await query.single(); if (error) { if (error.code === 'PGRST116') return null; throw error; } return data;
}

export async function atualizarVisitante(updatedVisitanteData: Omit<Visitante, 'id' | 'celula_id' | 'created_at' | 'celula_nome'>, visitanteId: string): Promise<void> {
    const { supabase, role, celulaId } = await checkUserAuthorization();
    if (!role) throw new Error("Não autorizado"); let query = supabase.from('visitantes').update(updatedVisitanteData).eq('id', visitanteId);
    if (role === 'líder') { if (!celulaId) throw new Error("Não autorizado"); query = query.eq('celula_id', celulaId); }
    const { error } = await query; if (error) { console.error("Erro ao atualizar visitante:", error); throw error; }
    revalidatePath('/visitantes'); revalidatePath(`/visitantes/editar/${visitanteId}`);
}
export async function excluirVisitante(visitanteId: string): Promise<void> {
    const { supabase, role, celulaId } = await checkUserAuthorization();
    if (!role) throw new Error("Não autorizado"); let query = supabase.from('visitantes').delete().eq('id', visitanteId);
    if (role === 'líder') { if (!celulaId) throw new Error("Não autorizado"); query = query.eq('celula_id', celulaId); }
    const { error } = await query; if (error) { console.error("Erro ao excluir visitante:", error); throw new Error(`Falha ao excluir visitante: ${error.message}`); } revalidatePath('/visitantes');
}

export async function converterVisitanteEmMembro(visitanteId: string, newMembroData: Omit<Membro, 'id' | 'created_at' | 'celula_nome'>): Promise<{ success: boolean; message: string }> {
    const { supabase, role, celulaId } = await checkUserAuthorization();
    if (!role) return { success: false, message: "Não autorizado" };

    const { data: visitanteOriginal, error: getVisitanteError } = await supabase.from('visitantes').select('celula_id').eq('id', visitanteId).single();
    if (getVisitanteError || !visitanteOriginal?.celula_id) return { success: false, message: "Visitante não encontrado." };
    const targetCelulaIdForConversion = visitanteOriginal.celula_id;

    if (role === 'líder' && (!celulaId || celulaId !== targetCelulaIdForConversion)) return { success: false, message: "Não autorizado." };

    try {
        const { count, error: checkError } = await supabase.from('membros').select('id', { count: 'exact', head: true }).eq('nome', newMembroData.nome).eq('celula_id', targetCelulaIdForConversion);
        if (checkError) throw checkError; if (count && count > 0) return { success: false, message: `Já existe um membro com o nome '${newMembroData.nome}'.` };

        const { data: membroInserido, error: insertMembroError } = await supabase.from('membros').insert({
            ...newMembroData,
            celula_id: targetCelulaIdForConversion,
            status: newMembroData.status || 'Ativo'
        }).select('id').single();

        if (insertMembroError) throw insertMembroError;
        const { error: deleteVisitanteError } = await supabase.from('visitantes').delete().eq('id', visitanteId).eq('celula_id', targetCelulaIdForConversion);
        if (deleteVisitanteError) { await supabase.from('membros').delete().eq('id', membroInserido.id); throw new Error("Falha ao excluir visitante: " + deleteVisitanteError.message + "."); }
        revalidatePath('/membros'); revalidatePath('/visitantes'); return { success: true, message: "Convertido com sucesso!" };
    } catch (e: any) { return { success: false, message: e.message }; }
}

// ============================================================================
//                               FUNÇÕES DE REUNIÕES
// ============================================================================

export async function listarReunioes(): Promise<ReuniaoComNomes[]> {
    const { supabase, role, celulaId, adminSupabase } = await checkUserAuthorization(); 
    if (!role) return [];

    const clientToUse = adminSupabase || supabase; 

    let query = clientToUse.from('reunioes').select(`
        id, data_reuniao, tema, caminho_pdf, celula_id, created_at,

        ministrador_principal_alias:membros!ministrador_principal(nome),
        ministrador_secundario_alias:membros!ministrador_secundario(nome),
        responsavel_kids_alias:membros!responsavel_kids(nome),
        celula_nome_alias:celulas(nome)
    `);

    if (role === 'líder') { if (!celulaId) return []; query = query.eq('celula_id', celulaId); }
    
    const { data: reunioesData, error } = await query.order('data_reuniao', { ascending: false });
    if (error) { console.error("Erro ao listar reuniões:", error); throw new Error(`Falha ao carregar reuniões: ${error.message}`); }

    const reunioesComObjetosAninhados: any[] = reunioesData || [];

    if (reunioesComObjetosAninhados.length === 0) return [];

    const reuniaoIds = new Set<string>(reunioesComObjetosAninhados.map((r: any) => r.id));
    const { data: criancasData, error: criancasError } = await clientToUse.from('criancas_reuniao').select('reuniao_id, numero_criancas').in('reuniao_id', Array.from(reuniaoIds)); 
    if (criancasError) console.warn("Aviso: Erro ao buscar contagem de crianças:", criancasError.message);
    const criancasMap = new Map((criancasData || []).map((c: CriancasReuniaoData) => [c.reuniao_id, c.numero_criancas]));

    const result = reunioesComObjetosAninhados.map((reuniao: any) => ({
        id: reuniao.id,
        data_reuniao: reuniao.data_reuniao,
        tema: reuniao.tema,
        caminho_pdf: reuniao.caminho_pdf,
        celula_id: reuniao.celula_id,
        celula_nome: reuniao.celula_nome_alias?.nome || null, // <- Corrigido para acessar o alias
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

export async function getReuniaoDetalhesParaResumo(reuniaoId: string): Promise<ReuniaoDetalhesParaResumo | null> {
    const { supabase, role, celulaId, adminSupabase } = await checkUserAuthorization(); 
    if (!role) return null;

    let targetCelulaIdForQuery: string | null = (role === 'líder') ? celulaId : null;
    const clientToUse = adminSupabase || supabase; 

    if (role === 'admin' && !targetCelulaIdForQuery) {
        const { data: reuniaoDataCheck, error: reuniaoCheckError } = await clientToUse.from('reunioes').select('celula_id').eq('id', reuniaoId).single();
        if (reuniaoCheckError || !reuniaoDataCheck?.celula_id) { 
            console.error("Reunião não encontrada ou inacessível para admin:", reuniaoCheckError);
            return null;
        }
        targetCelulaIdForQuery = reuniaoDataCheck.celula_id;
    }
    if (!targetCelulaIdForQuery) {
        console.warn("getReuniaoDetalhesParaResumo: ID da célula não definido para a query.");
        return null;
    }

    try {
        const [reuniaoDetailsResult, criancasResult] = await Promise.all([
            clientToUse.from('reunioes').select(`
                id, data_reuniao, tema, caminho_pdf, celula_id,
                ministrador_principal_alias:membros!ministrador_principal(id, nome, telefone),
                ministrador_secundario_alias:membros!ministrador_secundario(id, nome, telefone),
                responsavel_kids_alias:membros!responsavel_kids(id, nome, telefone),
                celula_nome_alias:celulas(nome)` 
            ).eq('id', reuniaoId).eq('celula_id', targetCelulaIdForQuery).single(),
            clientToUse.from('criancas_reuniao').select('numero_criancas').eq('reuniao_id', reuniaoId).maybeSingle()
        ]);

        const { data: reuniaoDataRaw, error: reuniaoError } = reuniaoDetailsResult;

        if (reuniaoError || !reuniaoDataRaw) {
            console.error("Erro ao buscar detalhes da reunião:", reuniaoError?.message);
            return null;
        }

        const reuniaoDataMapped: Omit<ReuniaoDB, 'ministrador_principal' | 'ministrador_secundario' | 'responsavel_kids'> & {
            ministrador_principal_alias: { id: string, nome: string, telefone: string | null } | null;
            ministrador_secundario_alias: { id: string, nome: string, telefone: string | null } | null;
            responsavel_kids_alias: { id: string, nome: string, telefone: string | null } | null;
            celula_nome_alias: { nome: string } | null; 
        } = reuniaoDataRaw as any;

        const { data: criancasData } = criancasResult;
        const numCriancas = Number(criancasData?.numero_criancas) || 0;

        const [presMembros, allMems, visPres] = await Promise.all([
            clientToUse.from('presencas_membros').select('membro_id, membro_data:membros(id, nome, telefone)').eq('reuniao_id', reuniaoId).eq('presente', true),
            clientToUse.from('membros').select('id, nome, telefone').eq('celula_id', targetCelulaIdForQuery).order('nome', { ascending: true }),
            clientToUse.from('presencas_visitantes').select('visitante_id, visitante_data:visitantes(id, nome, telefone)').eq('reuniao_id', reuniaoId).eq('presente', true),
        ]);

        if (presMembros.error || allMems.error || visPres.error) {
            console.error("Erro ao buscar dados de presença:", presMembros.error || allMems.error || visPres.error);
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
        
        const celulaNome = reuniaoDataMapped.celula_nome_alias?.nome || null; // <-- Acessa o nome da célula pelo alias

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
        console.error("Erro em getReuniaoDetalhesParaResumo:", error.message);
        return null;
    }
}

export async function adicionarReuniao(newReuniaoData: ReuniaoFormData): Promise<string> {
    const { supabase, role, celulaId } = await checkUserAuthorization();
    if (!role) throw new Error("Não autorizado");
    
    let targetCelulaIdForInsert: string | null = (role === 'líder') 
        ? celulaId 
        : (newReuniaoData.celula_id ?? null); // Converte undefined para null

    if (!targetCelulaIdForInsert) {
        throw new Error("ID da célula é necessário.");
    }

    const dataToInsert = {
        data_reuniao: newReuniaoData.data_reuniao,
        tema: newReuniaoData.tema,
        ministrador_principal: newReuniaoData.ministrador_principal,
        ministrador_secundario: newReuniaoData.ministrador_secundario,
        responsavel_kids: newReuniaoData.responsavel_kids,
        caminho_pdf: newReuniaoData.caminho_pdf || null,
        celula_id: targetCelulaIdForInsert,
    };

    const { data, error } = await supabase.from('reunioes').insert(dataToInsert).select('id').single();
    if (error) { console.error("Erro ao adicionar reunião:", error); throw error; }
    const newReuniaoId = data.id;
    await supabase.from('criancas_reuniao').insert({ reuniao_id: newReuniaoId, numero_criancas: 0 });
    revalidatePath('/reunioes'); revalidatePath('/dashboard');
    return newReuniaoId;
}


export async function getReuniao(reuniaoId: string): Promise<ReuniaoParaEdicao | null> {
    const { supabase, role, celulaId, adminSupabase } = await checkUserAuthorization(); 
    if (!role) return null;

    let query = supabase.from('reunioes').select(`
        id, celula_id, data_reuniao, tema, caminho_pdf, created_at,
        ministrador_principal,
        ministrador_secundario,
        responsavel_kids,

        ministrador_principal_nome_alias:membros!ministrador_principal(nome),
        ministrador_secundario_nome_alias:membros!ministrador_secundario(nome),
        responsavel_kids_nome_alias:membros!responsavel_kids(nome),

        celula_nome_alias:celulas(nome)
    `).eq('id', reuniaoId);

    if (role === 'líder') { if (!celulaId) return null; query = query.eq('celula_id', celulaId); }
    // Para admin, permite ver a reunião, e a RLS em celulas cuidará da visibilidade do celula_nome

    const { data: reuniaoRawData, error } = await query.single();
    if (error) {
        console.error("Erro em getReuniao:", error);
        if (error.code === 'PGRST116') return null; 
        throw new Error("Falha ao carregar reunião: " + error.message);
    }

    // Mapeamento explícito para garantir `null` para campos não encontrados, em vez de `undefined`
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

        ministrador_principal_nome: (reuniaoRawData as any).ministrador_principal_nome_alias?.nome || null,
        ministrador_secundario_nome: (reuniaoRawData as any).ministrador_secundario_nome_alias?.nome || null,
        responsavel_kids_nome: (reuniaoRawData as any).responsavel_kids_nome_alias?.nome || null,
        celula_nome: (reuniaoRawData as any).celula_nome_alias?.nome || null, // <- Corrigido para acessar o alias e garantir null
    };

    return reuniaoData;
}

export async function atualizarReuniao(reuniaoId: string, updatedReuniaoData: ReuniaoFormData): Promise<void> {
    const { supabase, role, celulaId } = await checkUserAuthorization();
    if (!role) throw new Error("Não autorizado");

    const dataToUpdate = {
        data_reuniao: updatedReuniaoData.data_reuniao,
        tema: updatedReuniaoData.tema,
        ministrador_principal: updatedReuniaoData.ministrador_principal,
        ministrador_secundario: updatedReuniaoData.ministrador_secundario,
        responsavel_kids: updatedReuniaoData.responsavel_kids,
        caminho_pdf: updatedReuniaoData.caminho_pdf || null,
    };

    let query = supabase.from('reunioes').update(dataToUpdate).eq('id', reuniaoId);
    if (role === 'líder') { if (!celulaId) throw new Error("Não autorizado"); query = query.eq('celula_id', celulaId); }
    const { error } = await query;
    if (error) { console.error("Erro ao atualizar reunião:", error); throw error; }
    revalidatePath('/reunioes'); revalidatePath(`/reunioes/editar/${reuniaoId}`); revalidatePath('/dashboard');
}

export async function excluirReuniao(reuniaoId: string): Promise<void> {
    const { supabase, role, celulaId } = await checkUserAuthorization();
    if (!role) throw new Error("Não autorizado");
    let query = supabase.from('reunioes').delete().eq('id', reuniaoId);
    if (role === 'líder') { if (!celulaId) throw new Error("Não autorizado"); query = query.eq('celula_id', celulaId); }
    const { error } = await query;
    if (error) { console.error("Erro ao excluir reunião:", error); throw new Error(`Falha ao excluir reunião: ${error.message}`); }
    revalidatePath('/reunioes'); revalidatePath('/dashboard');
}

export async function verificarDuplicidadeReuniao(dataReuniao: string, tema: string, excludeId?: string): Promise<boolean> {
    const { supabase, role, celulaId } = await checkUserAuthorization();
    if (!role) throw new Error("Não autorizado");
    let query = supabase.from('reunioes').select('id', { count: 'exact', head: true });
    if (role === 'líder') { if (!celulaId) throw new Error("ID da célula é necessário para verificar duplicidade."); }
    query = query.eq('data_reuniao', dataReuniao).ilike('tema', tema);
    if (excludeId) query = query.neq('id', excludeId);
    const { count, error } = await query;
    if (error) { console.error("Erro ao verificar duplicidade de reunião:", error); throw error; }
    return (count || 0) > 0;
}

export async function listarTodosMembrosComPresenca(reuniaoId: string): Promise<MembroComPresenca[]> {
    const { supabase, role, celulaId, adminSupabase } = await checkUserAuthorization(); 
    if (!role) return [];
    let targetCelulaIdForQuery: string | null = (role === 'líder') ? celulaId : null;
    
    // Lógica de validação do Admin (mantida)
    if (role === 'admin') {
        const clientToUse = adminSupabase || supabase;
        const { data: reuniaoDataCheck, error: reuniaoCheckError } = await clientToUse.from('reunioes').select('celula_id').eq('id', reuniaoId).single();
        if (reuniaoCheckError || !reuniaoDataCheck?.celula_id) { console.error("Reunião não encontrada ou inacessível para admin:", reuniaoCheckError); return []; }
        targetCelulaIdForQuery = reuniaoDataCheck.celula_id;
    }
    if (!targetCelulaIdForQuery) { return []; }
    
    try {
        const clientToUse = adminSupabase || supabase;
        const { data: members, error: membersError } = await clientToUse
            .from('membros')
            .select('id, celula_id, nome, telefone, data_ingresso, data_nascimento, endereco, status, created_at')
            .eq('celula_id', targetCelulaIdForQuery)
            .order('nome', { ascending: true });
        
        if (membersError) { console.error("Erro ao listar membros com presença:", membersError); throw membersError; }
        
        const memberIds = (members || []).map((m: Membro) => m.id);
        
        // Busca as presenças existentes
        const { data: presences, error: presencesError } = await clientToUse
            .from('presencas_membros')
            .select('membro_id, presente')
            .eq('reuniao_id', reuniaoId)
            .in('membro_id', Array.from(memberIds)); 
            
        if (presencesError) { console.error("Erro ao listar presenças de membros:", presencesError); throw presencesError; }
        
        // Mapeia para saber o status (true/false) e se o registro existe (has)
        const presenceMap = new Map((presences || []).map(p => [p.membro_id, p.presente]));
        
        return (members || []).map(membro => ({ 
            ...membro, 
            presente: presenceMap.get(membro.id) || false,
            presenca_registrada: presenceMap.has(membro.id) 
        }));
        
    } catch (e: any) { 
        console.error("Falha ao carregar membros para presença:", e); 
        throw new Error("Falha ao carregar membros para presença: " + e.message); 
    }
}

export async function registrarPresencaMembro(reuniaoId: string, membroId: string, presente: boolean): Promise<void> {
    const { supabase, role, celulaId, adminSupabase } = await checkUserAuthorization(); 
    if (!role) throw new Error("Não autorizado");
    let targetCelulaIdForValidation: string | null = (role === 'líder') ? celulaId : null;
    if (role === 'admin') {
        const clientToUse = adminSupabase || supabase;
        const { data: reuniaoDataCheck, error: reuniaoCheckError } = await clientToUse.from('reunioes').select('celula_id').eq('id', reuniaoId).single();
        if (reuniaoCheckError || !reuniaoDataCheck?.celula_id) { throw new Error("Reunião não encontrada ou inacessível."); }
        targetCelulaIdForValidation = reuniaoDataCheck.celula_id;
    }
    if (!targetCelulaIdForValidation) { throw new Error("Nenhum ID de célula para validar a presença do membro."); }
    const clientToUse = adminSupabase || supabase;
    const { data: memberCheck, error: memberCheckError } = await clientToUse.from('membros').select('id').eq('id', membroId).eq('celula_id', targetCelulaIdForValidation).single();
    if (memberCheckError || !memberCheck) { throw new Error("Membro não pertence à célula da reunião ou não encontrado."); }
    try {
        const { error } = await clientToUse.from('presencas_membros').upsert({ reuniao_id: reuniaoId, membro_id: membroId, presente: presente }, { onConflict: 'reuniao_id, membro_id' });
        if (error) { console.error("Erro ao registrar presença de membro:", error); throw error; }
        revalidatePath(`/reunioes/presenca/${reuniaoId}`); revalidatePath('/dashboard'); revalidatePath('/relatorios');
    } catch (e: any) { console.error("Falha ao registrar presença de membro:", e); throw e; }
}

export async function listarTodosVisitantesComPresenca(reuniaoId: string): Promise<VisitanteComPresenca[]> {
    const { supabase, role, celulaId, adminSupabase } = await checkUserAuthorization(); 
    if (!role) return [];
    let targetCelulaIdForQuery: string | null = (role === 'líder') ? celulaId : null;
    if (role === 'admin') {
        const clientToUse = adminSupabase || supabase;
        const { data: reuniaoDataCheck, error: reuniaoCheckError } = await clientToUse.from('reunioes').select('celula_id').eq('id', reuniaoId).single();
        if (reuniaoCheckError || !reuniaoDataCheck?.celula_id) { console.error("Reunião não encontrada ou inacessível para admin:", reuniaoCheckError); return []; }
        targetCelulaIdForQuery = reuniaoDataCheck.celula_id;
    }
    if (!targetCelulaIdForQuery) { return []; }
    try {
        const clientToUse = adminSupabase || supabase;
        const { data: visitors, error: visitorsError } = await clientToUse.from('visitantes').select('id, celula_id, nome, telefone, data_primeira_visita, endereco, data_ultimo_contato, observacoes, data_nascimento, status_conversao, created_at').eq('celula_id', targetCelulaIdForQuery).order('nome', { ascending: true }); // Incluido status_conversao
        if (visitorsError) { console.error("Erro ao listar visitantes com presença:", visitorsError); throw visitorsError; }
        const visitorIds = (visitors || []).map((v: Visitante) => v.id);
        const { data: presences, error: presencesError } = await clientToUse.from('presencas_visitantes').select('visitante_id, presente').eq('reuniao_id', reuniaoId).in('visitante_id', Array.from(visitorIds)); 
        if (presencesError) { console.error("Erro ao listar presenças de visitantes:", presencesError); throw presencesError; }
        const presenceMap = new Map((presences || []).map(p => [p.visitante_id, p.presente]));
        return (visitors || []).map(visitante => ({ visitante_id: visitante.id, nome: visitante.nome, telefone: visitante.telefone, presente: presenceMap.get(visitante.id) || false }));
    } catch (e: any) { console.error("Falha ao carregar visitantes para presença:", e); throw new Error("Falha ao carregar visitantes para presença: " + e.message); }
}

export async function registrarPresencaVisitante(reuniaoId: string, visitanteId: string, presente: boolean): Promise<void> {
    const { supabase, role, celulaId, adminSupabase } = await checkUserAuthorization(); 
    if (!role) throw new Error("Não autorizado");
    let targetCelulaIdForValidation: string | null = (role === 'líder') ? celulaId : null;
    if (role === 'admin') {
        const clientToUse = adminSupabase || supabase;
        const { data: reuniaoDataCheck, error: reuniaoCheckError } = await clientToUse.from('reunioes').select('celula_id').eq('id', reuniaoId).single();
        if (reuniaoCheckError || !reuniaoDataCheck?.celula_id) { throw new Error("Reunião não encontrada ou inacessível."); }
        targetCelulaIdForValidation = reuniaoDataCheck.celula_id;
    }
    if (!targetCelulaIdForValidation) { throw new Error("Nenhum ID de célula para validar a presença do visitante."); }
    const clientToUse = adminSupabase || supabase;
    const { data: visitorCheck, error: visitorCheckError } = await clientToUse.from('visitantes').select('id').eq('id', visitanteId).eq('celula_id', targetCelulaIdForValidation).single();
    if (visitorCheckError || !visitorCheck) { throw new Error("Visitante não pertence à célula da reunião ou não encontrado."); }
    try {
        const { error } = await clientToUse.from('presencas_visitantes').upsert({ reuniao_id: reuniaoId, visitante_id: visitanteId, presente: presente }, { onConflict: 'reuniao_id, visitante_id' });
        if (error) { console.error("Erro ao registrar presença de visitante:", error); throw error; }
        revalidatePath(`/reunioes/presenca/${reuniaoId}`); revalidatePath('/dashboard'); revalidatePath('/relatorios');
    } catch (e: any) { console.error("Falha ao registrar presença de visitante:", e); throw e; }
}

export async function getNumCriancasReuniao(reuniaoId: string): Promise<number> {
    const { supabase, role, celulaId, adminSupabase } = await checkUserAuthorization(); 
    if (!role) return 0;
    let targetCelulaIdForQuery: string | null = (role === 'líder') ? celulaId : null;
    if (role === 'admin') {
        const clientToUse = adminSupabase || supabase;
        const { data: reuniaoDataCheck, error: reuniaoCheckError } = await clientToUse.from('reunioes').select('celula_id').eq('id', reuniaoId).single();
        if (reuniaoCheckError || !reuniaoDataCheck?.celula_id) { console.error("Reunião não encontrada ou inacessível para admin:", reuniaoCheckError); return 0; }
        targetCelulaIdForQuery = reuniaoDataCheck.celula_id;
    }
    if (!targetCelulaIdForQuery) return 0;
    try {
        const clientToUse = adminSupabase || supabase;
        const { data, error } = await clientToUse.from('criancas_reuniao').select('numero_criancas').eq('reuniao_id', reuniaoId).maybeSingle();
        if (error) { console.error("Erro ao buscar número de crianças da reunião:", error); throw error; } return Number(data?.numero_criancas) || 0;
    } catch (e: any) { console.error("Falha ao obter número de crianças:", e); throw e; }
}

export async function setNumCriancasReuniao(reuniaoId: string, numeroCriancas: number): Promise<void> {
    const { supabase, role, celulaId, adminSupabase } = await checkUserAuthorization(); 
    if (!role) throw new Error("Não autorizado");
    let targetCelulaIdForValidation: string | null = (role === 'líder') ? celulaId : null;
    if (role === 'admin') {
        const clientToUse = adminSupabase || supabase;
        const { data: reuniaoDataCheck, error: reuniaoCheckError } = await clientToUse.from('reunioes').select('celula_id').eq('id', reuniaoId).single();
        if (reuniaoCheckError || !reuniaoDataCheck?.celula_id) { throw new Error("Reunião não encontrada ou inacessível."); }
        targetCelulaIdForValidation = reuniaoDataCheck.celula_id;
    }
    if (!targetCelulaIdForValidation) { throw new Error("Nenhum ID de célula para validar o número de crianças."); }
    const clientToUse = adminSupabase || supabase;
    try {
        const { error } = await clientToUse.from('criancas_reuniao').upsert({ reuniao_id: reuniaoId, numero_criancas: Math.max(0, numeroCriancas) }, { onConflict: 'reuniao_id' });
        if (error) { console.error("Erro ao definir número de crianças da reunião:", error); throw error; }
        revalidatePath(`/reunioes/presenca/${reuniaoId}`); revalidatePath('/dashboard'); revalidatePath('/relatorios');
    } catch (e: any) { console.error("Falha ao definir número de crianças:", e); throw e; }
}

export async function duplicarReuniao(reuniaoId: string): Promise<string> {
    const { supabase, role, celulaId, adminSupabase } = await checkUserAuthorization(); 
    if (!role) throw new Error("Não autorizado");
    let targetCelulaIdForValidation: string | null = (role === 'líder') ? celulaId : null;
    if (role === 'admin') {
        const clientToUse = adminSupabase || supabase;
        const { data: reuniaoDataCheck, error: reuniaoCheckError } = await clientToUse.from('reunioes').select('celula_id').eq('id', reuniaoId).single();
        if (reuniaoCheckError || !reuniaoDataCheck?.celula_id) { throw new Error("Reunião não encontrada ou inacessível."); }
        targetCelulaIdForValidation = reuniaoDataCheck.celula_id;
    }
    if (!targetCelulaIdForValidation) { throw new Error("Nenhum ID de célula para validar a duplicação da reunião."); }
    const clientToUse = adminSupabase || supabase;
    try {
        const { data: originalReuniaoRaw, error: fetchError } = await clientToUse.from('reunioes').select(`
            id, celula_id, data_reuniao, tema, caminho_pdf, created_at,
            ministrador_principal,
            ministrador_secundario,
            responsavel_kids
        `).eq('id', reuniaoId).eq('celula_id', targetCelulaIdForValidation).single();

        if (fetchError || !originalReuniaoRaw) { console.error("Erro ao buscar reunião para duplicação:", fetchError); throw new Error("Falha ao buscar reunião para duplicação: " + (fetchError?.message || 'Reunião não encontrada')); }

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

        const { data: newReuniao, error: insertError } = await clientToUse.from('reunioes').insert(newReuniaoData).select('id').single();
        if (insertError) { console.error("Erro ao criar reunião duplicada:", insertError); throw new Error("Falha ao criar reunião duplicada: " + insertError.message); }
        const newReuniaoId = newReuniao.id;
        const { data: originalCriancas, error: criancasError } = await clientToUse.from('criancas_reuniao').select('numero_criancas').eq('reuniao_id', reuniaoId).maybeSingle();
        if (!criancasError && originalCriancas?.numero_criancas) { await clientToUse.from('criancas_reuniao').insert({ reuniao_id: newReuniaoId, numero_criancas: originalCriancas.numero_criancas }); }
        revalidatePath('/reunioes');
        revalidatePath('/dashboard');
        return newReuniaoId;
    } catch (e: any) { console.error("Falha ao duplicar reunião:", e); throw e; }
}

export async function uploadMaterialReuniao(reuniaoId: string, file: File): Promise<string> {
    const { supabase, role, celulaId, adminSupabase } = await checkUserAuthorization(); 
    if (!role) throw new Error("Não autorizado.");
    let targetCelulaIdForValidation: string | null = (role === 'líder') ? celulaId : null;
    if (role === 'admin') {
        const clientToUse = adminSupabase || supabase;
        const { data: reuniaoDataCheck, error: reuniaoCheckError } = await clientToUse.from('reunioes').select('celula_id').eq('id', reuniaoId).single();
        if (reuniaoCheckError || !reuniaoDataCheck?.celula_id) { throw new Error("Reunião não encontrada ou inacessível."); }
        targetCelulaIdForValidation = reuniaoDataCheck.celula_id;
    }
    if (!targetCelulaIdForValidation) { throw new Error("Nenhum ID de célula para validar o upload de material."); }
    const clientToUse = adminSupabase || supabase;
    const { data: reunionCheck, error: reunionCheckError } = await clientToUse.from('reunioes').select('id').eq('id', reuniaoId).eq('celula_id', targetCelulaIdForValidation).single();
    if (reunionCheckError || !reunionCheck) { throw new Error("Reunião não pertence à sua célula ou não encontrada."); }
    try {
        const fileExtension = file.name.split('.').pop(); const path = `${targetCelulaIdForValidation}/${reuniaoId}.${fileExtension}`;
        const { data, error: uploadError } = await createServerClient().storage.from('reunion_materials').upload(path, file, { cacheControl: '3600', upsert: true });
        if (uploadError) { console.error("Erro no upload do arquivo:", uploadError); throw new Error("Falha no upload do arquivo: " + uploadError.message); }
        const { data: publicUrlData } = createServerClient().storage.from('reunion_materials').getPublicUrl(path);
        if (!publicUrlData || !publicUrlData.publicUrl) { throw new Error("Não foi possível obter a URL pública do arquivo."); }
        const { error: updateError } = await clientToUse.from('reunioes').update({ caminho_pdf: publicUrlData.publicUrl }).eq('id', reuniaoId);
        if (updateError) { console.error("Erro ao atualizar o registro da reunião com o caminho do PDF:", updateError); throw new Error("Falha ao atualizar o registro da reunião com o caminho do PDF: " + updateError.message); }
        revalidatePath(`/reunioes/editar/${reuniaoId}`); revalidatePath(`/reunioes/resumo/${reuniaoId}`); return publicUrlData.publicUrl;
    } catch (e: any) { console.error("Falha ao fazer upload do material da reunião:", e); throw e; }
}

// ============================================================================
//                               FUNÇÕES DE USUÁRIO E PERFIL
// ============================================================================

export async function getUserProfile(): Promise<Profile | null> {
    const { supabase, role, adminSupabase } = await checkUserAuthorization(); 
    if (!role) { throw new Error("Usuário não autenticado ou perfil inacessível."); }

    const { data: { user }, error: userError } = await createServerClient().auth.getUser();
    if (userError || !user) { throw new Error("Usuário não autenticado."); }

    try {
        const clientToUse = adminSupabase || supabase; 
        const { data: profileData, error: profileError } = await clientToUse.from('profiles').select('id, email, nome_completo, telefone, role, celula_id, created_at').eq('id', user.id).single(); // Removido last_sign_in_at da query
        if (profileError || !profileData) {
            if (profileError?.code === 'PGRST116') {
                 return { id: user.id, email: user.email || 'email@example.com', nome_completo: null, telefone: null, role: null, celula_id: null, celula_nome: null, created_at: user.created_at, last_sign_in_at: user.last_sign_in_at || null }; 
            }
            console.error("Erro ao carregar perfil:", profileError);
            throw new Error("Falha ao carregar perfil: " + profileError?.message);
        }
        let celulaName: string | null = null;
        if (profileData.celula_id) {
            const celulasNamesMap = await getCelulasNamesMap(clientToUse, new Set([profileData.celula_id])); 
            celulaName = celulasNamesMap.get(profileData.celula_id) || null;
        }
        return { 
            id: profileData.id, 
            email: profileData.email || 'N/A', 
            nome_completo: profileData.nome_completo, 
            telefone: profileData.telefone, 
            role: profileData.role, 
            celula_id: profileData.celula_id, 
            celula_nome: celulaName, 
            created_at: profileData.created_at, 
            last_sign_in_at: user.last_sign_in_at || null 
        };
    } catch (e: any) { console.error("Falha ao carregar perfil de usuário:", e); throw new Error("Falha ao carregar perfil: " + e.message); }
}

export async function updateUserProfileData(profileId: string, data: { nome_completo: string; telefone: string | null }): Promise<void> {
    const { supabase, role, adminSupabase } = await checkUserAuthorization(); 
    if (!role) { throw new Error("Não autorizado."); }
    const { data: { user }, error: userError } = await createServerClient().auth.getUser();
    if (userError || !user || user.id !== profileId) { throw new Error("Não autorizado."); }
    const clientToUse = adminSupabase || supabase;
    try {
        const { error } = await clientToUse.from('profiles').update({ nome_completo: data.nome_completo, telefone: data.telefone }).eq('id', profileId);
        if (error) { console.error("Erro ao atualizar perfil:", error); throw new Error("Falha ao atualizar perfil: " + error.message); }
        revalidatePath('/profile'); revalidatePath('/dashboard');
    } catch (e: any) { console.error("Falha ao atualizar perfil de usuário:", e); throw new Error("Falha ao atualizar perfil: " + e.message); }
}

export async function updateUserPassword(newPassword: string): Promise<{ success: boolean; message: string }> {
    const { supabase } = await checkUserAuthorization();
    const { data: { user }, error: userError } = await createServerClient().auth.getUser();
    if (userError || !user) { return { success: false, message: "Usuário não autenticado." }; }
    if (newPassword.length < 6) { return { success: false, message: "A senha deve ter no mínimo 6 caracteres." }; }
    try {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) {
            if (error.message.includes('Password should be at least')) { return { success: false, message: "A senha é muito curta. Deve ter no mínimo 6 caracteres." }; }
            console.error("Erro ao trocar senha:", error);
            return { success: false, message: "Falha ao trocar senha: " + error.message };
        }
        return { success: true, message: "Senha atualizada com sucesso!" };
    } catch (e: any) { console.error("Erro inesperado ao trocar senha:", e); return { success: false, message: "Erro inesperado ao trocar senha: " + e.message }; }
}

// ============================================================================
//                               FUNÇÕES PALAVRA DA SEMANA
// ============================================================================

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
        const clientToUse = adminSupabase || supabase;
        const { data: existingPalavra, error: checkError } = await clientToUse
            .from('palavra_semana')
            .select('id, url_arquivo')
            .eq('data_semana', data_semana)
            .maybeSingle();

        if (checkError) {
            console.error("Erro ao verificar Palavra da Semana existente:", checkError);
            throw new Error("Falha ao verificar duplicidade: " + checkError.message);
        }

        let fileUrl: string | null = existingPalavra?.url_arquivo || null;

        if (file && file.size > 0) {
            if (!['application/pdf', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'].includes(file.type)) {
                return { success: false, message: "Apenas arquivos PDF, PPT ou PPTX são permitidos." }; // Corrigido a validação
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
                console.error("Erro no upload da Palavra da Semana:", uploadError);
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

        const { error: upsertError } = await clientToUse
            .from('palavra_semana')
            .upsert({ ...dataToUpsert, id: existingPalavra?.id }, { onConflict: 'data_semana' });

        if (upsertError) {
            console.error("Erro no upsert da Palavra da Semana:", upsertError);
            throw new Error("Falha ao salvar a Palavra da Semana: " + upsertError.message);
        }

        revalidatePath('/admin/palavra-semana');
        revalidatePath('/dashboard');

        return { success: true, message: "Palavra da Semana salva com sucesso!", url: fileUrl || undefined };

    } catch (e: any) {
        console.error("Erro na Server Action uploadPalavraDaSemana:", e);
        return { success: false, message: "Erro: " + e.message };
    }
}

export async function getPalavraDaSemana(data?: string): Promise<PalavraDaSemana | null> {
    const { supabase, role, adminSupabase } = await checkUserAuthorization(); 

    if (!role) {
        console.warn("getPalavraDaSemana: Usuário não autenticado. Retornando null.");
        return null;
    }

    try {
        const clientToUse = adminSupabase || supabase;
        let query = clientToUse
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
            console.error("Erro ao buscar Palavra da Semana:", error);
            throw new Error("Falha ao carregar Palavra da Semana: " + error.message);
        }

        if (!palavraData) return null;

        let createdByEmail: string | null = null;
        if (palavraData.created_by) {
            const { data: profileEmailData, error: profileEmailError } = await createServerClient()
                .from('profiles')
                .select('email')
                .eq('id', palavraData.created_by)
                .maybeSingle();

            if (profileEmailError) {
                console.warn(`Aviso: Não foi possível buscar o email para created_by ${palavraData.created_by}:`, profileEmailError.message);
            } else {
                createdByEmail = profileEmailData?.email || null;
            }
        }

        return {
            ...palavraData,
            created_by_email: createdByEmail,
        };

    } catch (e: any) {
        console.error("Falha na Server Action getPalavraDaSemana:", e);
        if (e && typeof e === 'object' && 'message' in e) {
            throw new Error("Erro: " + e.message);
        }
        throw new Error("Erro desconhecido ao carregar Palavra da Semana.");
    }
}

export async function deletePalavraDaSemana(id: string): Promise<{ success: boolean; message: string }> {
    const { supabase, role, adminSupabase } = await checkUserAuthorization(); 

    if (role !== 'admin') {
        return { success: false, message: "Não autorizado: Apenas administradores podem excluir a Palavra da Semana." };
    }

    try {
        const clientToUse = adminSupabase || supabase;
        const { data: palavra, error: fetchError } = await clientToUse
            .from('palavra_semana')
            .select('url_arquivo')
            .eq('id', id)
            .single();

        if (fetchError || !palavra) {
            console.error("Erro ao buscar registro da Palavra da Semana para exclusão:", fetchError);
            throw new Error("Falha ao buscar registro: " + (fetchError?.message || 'Palavra da Semana não encontrada'));
        }

        const { error: deleteRecordError } = await clientToUse
            .from('palavra_semana')
            .delete()
            .eq('id', id);

        if (deleteRecordError) {
            console.error("Erro ao excluir registro da Palavra da Semana:", deleteRecordError);
            throw new Error("Falha ao excluir registro: " + deleteRecordError.message);
        }

        const urlSegments = palavra.url_arquivo.split('/');
        const publicIndex = urlSegments.indexOf('public'); 
        const bucketName = publicIndex > 0 ? urlSegments[publicIndex - 1] : null;

        let filePath = '';
        if (publicIndex > -1) { 
            const bucketSegmentIndex = urlSegments.indexOf('palavra_semana_files'); 
            if (bucketSegmentIndex > -1) {
                filePath = urlSegments.slice(bucketSegmentIndex + 1).join('/'); 
            } else {
                const objectPublicIndex = urlSegments.indexOf('object');
                if (objectPublicIndex > -1 && objectPublicIndex + 2 < urlSegments.length) {
                    filePath = urlSegments.slice(objectPublicIndex + 3).join('/'); 
                }
            }
        } else { 
             const bucketSegmentIndex = urlSegments.indexOf('palavra_semana_files');
             if (bucketSegmentIndex > -1) {
                 filePath = urlSegments.slice(bucketSegmentIndex + 1).join('/');
             }
        }


        if (bucketName && filePath) {
            const { error: deleteFileError } = await createServerClient().storage
                .from(bucketName)
                .remove([filePath]);

            if (deleteFileError) {
                console.warn("Aviso: Registro do DB excluído, mas erro ao excluir arquivo do storage:", deleteFileError);
            }
        }

        revalidatePath('/admin/palavra-semana');
        revalidatePath('/dashboard');

        return { success: true, message: "Palavra da Semana excluída com sucesso!" };
    } catch (e: any) {
        console.error("Falha na Server Action deletePalavraDaSemana:", e);
        return { success: false, message: "Erro: " + e.message };
    }
}

// ============================================================================
//                       NOVAS FUNÇÕES PARA EVENTOS FACE A FACE (MÓDULO 1)
// ============================================================================

/**
 * Cria um novo evento Face a Face.
 * Apenas administradores podem criar eventos.
 * O 'ativa_para_inscricao' é definido como false por padrão na criação.
 *
 * @param newEventoData Os dados do novo evento.
 * @returns O ID do evento criado.
 * @throws Erro se não autorizado ou se a criação falhar.
 */
export async function criarEventoFaceAFace(newEventoData: EventoFaceAFaceFormData): Promise<string> {
    const { supabase, role, profileId, adminSupabase } = await checkUserAuthorization();

    if (role !== 'admin') {
        throw new Error("Não autorizado: Apenas administradores podem criar eventos Face a Face.");
    }

    if (!profileId) {
        throw new Error("ID do perfil do criador não disponível.");
    }

    try {
        const clientToUse = adminSupabase || supabase; // Admin client para garantir permissão
        const { data, error } = await clientToUse
            .from('eventos_face_a_face') // Corrigido o nome da tabela
            .insert({
                ...newEventoData,
                criado_por_perfil_id: profileId,
                ativa_para_inscricao: false, // Força desativação na criação, Admin ativa depois
            })
            .select('id')
            .single();

        if (error) {
            console.error("Erro ao criar evento Face a Face:", error);
            throw new Error(`Falha ao criar evento: ${error.message}`);
        }

        revalidatePath('/admin/eventos-face-a-face');
        return data.id;
    } catch (e: any) {
        console.error("Falha na Server Action criarEventoFaceAFace:", e);
        throw e;
    }
}

/**
 * Lista eventos Face a Face para administradores, com filtros opcionais.
 *
 * @param searchTerm Termo de busca para nome do evento.
 * @param tipoFilter Filtro por tipo ('Mulheres', 'Homens', ou 'all').
 * @param statusFilter Filtro por status de ativação ('ativo', 'inativo', ou 'all').
 * @returns Uma lista de eventos Face a Face (resumido para exibição).
 * @throws Erro se não autorizado ou se a busca falhar.
 */
export async function listarEventosFaceAFaceAdmin(
    searchTerm: string | null = null,
    tipoFilter: EventoFaceAFaceTipo | 'all' = 'all',
    statusFilter: 'all' | 'ativo' | 'inativo' = 'all'
): Promise<EventoFaceAFaceOption[]> {
    const { supabase, role, adminSupabase } = await checkUserAuthorization();

    if (role !== 'admin') {
        console.warn("listarEventosFaceAFaceAdmin: Acesso negado. Apenas administradores podem listar eventos Face a Face.");
        return [];
    }

    try {
        const clientToUse = adminSupabase || supabase; // Admin client para garantir permissão

        let query = clientToUse
            .from('eventos_face_a_face') // Corrigido o nome da tabela
            .select('id, nome_evento, tipo, data_inicio, data_fim, valor_total, ativa_para_inscricao')
            .order('data_inicio', { ascending: false });

        if (searchTerm) {
            query = query.ilike('nome_evento', `%${searchTerm}%`);
        }

        if (tipoFilter !== 'all') {
            query = query.eq('tipo', tipoFilter);
        }

        if (statusFilter !== 'all') {
            query = query.eq('ativa_para_inscricao', statusFilter === 'ativo');
        }

        const { data, error } = await query;

        if (error) {
            console.error("Erro ao listar eventos Face a Face para admin:", error);
            throw new Error(`Falha ao carregar eventos: ${error.message}`);
        }

        // Mapeia para o tipo EventoFaceAFaceOption, que agora inclui data_inicio, data_fim e valor_total
        return data.map(evento => ({
            id: evento.id,
            nome: evento.nome_evento,
            tipo: evento.tipo,
            data_inicio: evento.data_inicio,
            data_fim: evento.data_fim,
            valor_total: evento.valor_total,
            ativa_para_inscricao: evento.ativa_para_inscricao,
        }));
    } catch (e: any) {
        console.error("Falha na Server Action listarEventosFaceAFaceAdmin:", e);
        throw e;
    }
}

/**
 * Obtém detalhes de um evento Face a Face específico.
 * Esta função agora permite que LÍDERES busquem eventos, desde que estejam ativos e com data de inscrição válida.
 *
 * @param eventoId O ID do evento.
 * @returns Os detalhes completos do evento ou null se não encontrado/não autorizado.
 * @throws Erro se a busca falhar.
 */
export async function getEventoFaceAFace(eventoId: string): Promise<EventoFaceAFace | null> {
    const { supabase, role, adminSupabase } = await checkUserAuthorization();

    if (!role) { // Se não está autenticado, não deve ver nenhum evento
        console.warn("getEventoFaceAFace: Usuário não autenticado. Retornando null.");
        return null;
    }

    try {
        const clientToUse = adminSupabase || supabase; 
        let query = clientToUse
            .from('eventos_face_a_face') // Corrigido o nome da tabela
            .select('*') // Seleciona todos os campos
            .eq('id', eventoId);

        // Se o usuário é um LÍDER, aplica filtros adicionais para garantir que o evento esteja apto para inscrição
        if (role === 'líder') {
            query = query
                .eq('ativa_para_inscricao', true) // Deve estar ativo para inscrição
                .gte('data_limite_entrada', format(new Date(), 'yyyy-MM-dd')); // Data limite de inscrição ainda não pode ter passado
        }
        // Se for ADMIN, a query original (select * .eq('id', eventoId)) combinada com adminSupabase
        // já garante acesso a eventos mesmo que não estejam ativos.

        const { data, error } = await query.single();

        if (error) {
            if (error.code === 'PGRST116') { // Não encontrado
                console.warn(`Evento Face a Face com ID ${eventoId} não encontrado ou não está ativo/disponível para este usuário.`);
                return null;
            }
            console.error("Erro ao buscar evento Face a Face:", error);
            throw new Error(`Falha ao carregar evento: ${error.message}`);
        }

        return data as EventoFaceAFace; // Retorna o objeto completo
    } catch (e: any) {
        console.error("Falha na Server Action getEventoFaceAFace:", e);
        throw e;
    }
}

/**
 * Atualiza os detalhes de um evento Face a Face.
 * Apenas administradores podem atualizar eventos.
 *
 * @param eventoId O ID do evento a ser atualizado.
 * @param updatedData Os dados atualizados do evento.
 * @throws Erro se não autorizado ou se a atualização falhar.
 */
export async function atualizarEventoFaceAFace(eventoId: string, updatedData: EventoFaceAFaceFormData): Promise<void> {
    const { supabase, role, adminSupabase } = await checkUserAuthorization();

    if (role !== 'admin') {
        throw new Error("Não autorizado: Apenas administradores podem atualizar eventos Face a Face.");
    }

    try {
        const clientToUse = adminSupabase || supabase; // Admin client para garantir permissão
        const { error } = await clientToUse
            .from('eventos_face_a_face') // Corrigido o nome da tabela
            .update(updatedData)
            .eq('id', eventoId);

        if (error) {
            console.error("Erro ao atualizar evento Face a Face:", error);
            throw new Error(`Falha ao atualizar evento: ${error.message}`);
        }

        revalidatePath('/admin/eventos-face-a-face');
        revalidatePath(`/admin/eventos-face-a-face/editar/${eventoId}`);
        revalidatePath('/eventos-face-a-face'); // Revalida a lista de eventos para líderes
    } catch (e: any) {
        console.error("Falha na Server Action atualizarEventoFaceAFace:", e);
        throw e;
    }
}

/**
 * Exclui um evento Face a Face e todas as suas inscrições associadas.
 * Apenas administradores podem excluir eventos.
 *
 * @param eventoId O ID do evento a ser excluído.
 * @throws Erro se não autorizado ou se a exclusão falhar.
 */
export async function excluirEventoFaceAFace(eventoId: string): Promise<void> {
    const { supabase, role, adminSupabase } = await checkUserAuthorization();

    if (role !== 'admin') {
        throw new Error("Não autorizado: Apenas administradores podem excluir eventos Face a Face.");
    }

    try {
        const clientToUse = adminSupabase || supabase; // Admin client para garantir permissão

        // ATENÇÃO: Se suas tabelas não tiverem CASCADE DELETE configurado,
        // você precisaria excluir as inscrições primeiro manualmente.
        // Por exemplo:
        // await clientToUse.from('inscricoes_face_a_face').delete().eq('evento_id', eventoId); // Corrigido o nome da tabela

        const { error } = await clientToUse
            .from('eventos_face_a_face') // Corrigido o nome da tabela
            .delete()
            .eq('id', eventoId);

        if (error) {
            console.error("Erro ao excluir evento Face a Face:", error);
            throw new Error(`Falha ao excluir evento: ${error.message}`);
        }

        revalidatePath('/admin/eventos-face-a-face');
        revalidatePath('/eventos-face-a-face'); // Revalida a lista de eventos para líderes
    } catch (e: any) {
        console.error("Falha na Server Action excluirEventoFaceAFace:", e);
        throw e;
    }
}

/**
 * Alterna o status de ativação (ativa_para_inscricao) de um evento Face a Face.
 * Apenas administradores podem fazer isso.
 *
 * @param eventoId O ID do evento.
 * @param currentStatus O status de ativação atual do evento.
 * @throws Erro se não autorizado ou se a atualização falhar.
 */
export async function toggleAtivacaoEventoFaceAFace(eventoId: string, currentStatus: boolean): Promise<void> {
    const { supabase, role, adminSupabase } = await checkUserAuthorization();

    if (role !== 'admin') {
        throw new Error("Não autorizado: Apenas administradores podem alterar o status de ativação de eventos.");
    }

    try {
        const clientToUse = adminSupabase || supabase; // Admin client para garantir permissão
        const { error } = await clientToUse
            .from('eventos_face_a_face') // Corrigido o nome da tabela
            .update({ ativa_para_inscricao: !currentStatus }) // Inverte o status
            .eq('id', eventoId);

        if (error) {
            console.error("Erro ao alternar ativação do evento Face a Face:", error);
            throw new Error(`Falha ao alternar ativação: ${error.message}`);
        }

        revalidatePath('/admin/eventos-face-a-face');
        revalidatePath(`/admin/eventos-face-a-face/editar/${eventoId}`); // Também revalida a página de edição se estiver aberta
        revalidatePath('/eventos-face-a-face'); // Revalida a rota de listagem de eventos para líderes
    } catch (e: any) {
        console.error("Falha na Server Action toggleAtivacaoEventoFaceAFace:", e);
        throw e;
    }
}

// ============================================================================
//               NOVAS FUNÇÕES PARA INSCRIÇÕES FACE A FACE (MÓDULO 2, 3, 4 e 5)
// ============================================================================

/**
 * Lista eventos Face a Face ATIVOS para líderes.
 * Eventos são considerados ativos se `ativa_para_inscricao` for `true` e a `data_limite_entrada` ainda não passou.
 *
 * @returns Uma lista de eventos Face a Face ativos.
 * @throws Erro se a busca falhar.
 */
export async function listarEventosFaceAFaceAtivos(): Promise<EventoFaceAFace[]> {
    const { supabase, role } = await checkUserAuthorization();

    // Líder ou Admin pode ver eventos ativos (embora o Admin tenha sua própria listagem completa)
    // Se for admin, pode estar navegando como "líder" para testar
    if (!role) {
        console.warn("listarEventosFaceAFaceAtivos: Usuário não autenticado. Retornando lista vazia.");
        return [];
    }

    try {
        const today = format(new Date(), 'yyyy-MM-dd'); // Obtém a data de hoje no formato YYYY-MM-DD

        // A RLS da tabela 'eventos_face_a_face' deve garantir que apenas eventos ativos sejam retornados
        // para usuários autenticados que não são admin (ou seja, líderes).
        // Se a RLS não cobrir isso, seria necessário adicionar .eq('ativa_para_inscricao', true) aqui.
        // Também filtramos pela data limite de entrada para que não apareçam eventos com inscrições vencidas.
        const { data, error } = await supabase
            .from('eventos_face_a_face')
            .select('*')
            .eq('ativa_para_inscricao', true) // Filtra explicitamente por eventos ativos
            .gte('data_limite_entrada', today) // A data limite de entrada deve ser hoje ou no futuro
            .order('data_inicio', { ascending: true });

        if (error) {
            console.error("Erro ao listar eventos Face a Face ativos:", error);
            throw new Error(`Falha ao carregar eventos ativos: ${error.message}`);
        }

        revalidatePath('/eventos-face-a-face'); // Revalida a página de listagem de eventos para líderes
        return data as EventoFaceAFace[];
    } catch (e: any) {
        console.error("Falha na Server Action listarEventosFaceAFaceAtivos:", e);
        throw e;
    }
}

/**
 * Cria uma nova inscrição para um evento Face a Face.
 * Apenas líderes podem criar inscrições para os membros da sua célula.
 *
 * @param inscricaoData Os dados da inscrição a serem criados.
 * @returns O ID da inscrição criada.
 * @throws Erro se não autorizado, se a inscrição falhar, ou se o evento não estiver ativo.
 */
export async function criarInscricaoFaceAFace(inscricaoData: InscricaoFaceAFaceFormData): Promise<string> {
    const { supabase, role, profileId, celulaId } = await checkUserAuthorization();

    if (role !== 'líder' || !profileId || !celulaId) {
        throw new Error("Não autorizado: Apenas líderes com célula atribuída podem criar inscrições.");
    }

    // 1. Verificar se o evento está ativo e as inscrições estão abertas
    const { data: evento, error: eventoError } = await supabase
        .from('eventos_face_a_face')
        .select('id, nome_evento, ativa_para_inscricao, data_limite_entrada')
        .eq('id', inscricaoData.evento_id)
        .eq('ativa_para_inscricao', true)
        .gte('data_limite_entrada', format(new Date(), 'yyyy-MM-dd')) // Garante que a data limite não passou
        .single();

    if (eventoError || !evento) {
        console.error("Evento não encontrado, inativo ou data limite de inscrição expirada:", eventoError);
        throw new Error("Não foi possível realizar a inscrição. O evento pode não estar ativo ou as inscrições foram encerradas.");
    }

    // 2. Preencher campos automáticos da inscrição
    const dataToInsert = {
        ...inscricaoData,
        inscrito_por_perfil_id: profileId,
        celula_inscricao_id: celulaId,
        status_pagamento: 'PENDENTE' as InscricaoFaceAFaceStatus, // Status inicial padrão
        admin_confirmou_entrada: false,
        admin_confirmou_restante: false,
        caminho_comprovante_entrada: null,
        data_upload_entrada: null,
        caminho_comprovante_restante: null,
        data_upload_restante: null,
        // data_nascimento agora virá do inscricaoData se o formulário o incluiu.
        // Se a interface InscricaoFaceAFaceFormData não tem data_nascimento, então ele não será enviado.
        // Se ela tem e o formulário preencheu, será enviado.
    };

    // 3. Inserir a inscrição
    const { data, error: insertError } = await supabase
        .from('inscricoes_face_a_face') // Nome da tabela no Supabase
        .insert(dataToInsert)
        .select('id')
        .single();

    if (insertError) {
        console.error("Erro ao criar inscrição Face a Face:", insertError);
        throw new Error(`Falha ao criar inscrição: ${insertError.message}`);
    }

    revalidatePath(`/eventos-face-a-face/${inscricaoData.evento_id}/novo`); // Revalida a página de formulário
    revalidatePath(`/eventos-face-a-face/${inscricaoData.evento_id}/minhas-inscricoes`); // Futuro: para o líder ver suas inscrições
    revalidatePath(`/admin/eventos-face-a-face/${inscricaoData.evento_id}/inscricoes`); // Futuro: para o admin ver todas as inscrições
    
    return data.id;
}


/**
 * Lista todas as inscrições para um evento específico (apenas para Admin).
 * Inclui nomes das células e do evento para facilitar a exibição.
 *
 * @param eventoId O ID do evento.
 * @param filters Filtros opcionais por status de pagamento, célula, nome do participante, tipo de participação.
 * @returns Uma lista de inscrições detalhadas.
 * @throws Erro se não autorizado ou se a busca falhar.
 */
export async function listarInscricoesFaceAFacePorEvento(
    eventoId: string,
    filters?: {
        statusPagamento?: InscricaoFaceAFaceStatus | 'all';
        celulaId?: string | 'all';
        searchTerm?: string; // Busca por nome ou contato do participante
        tipoParticipacao?: InscricaoFaceAFaceTipoParticipacao; // <-- NOVO: Filtro por tipo de participação
    }
): Promise<InscricaoFaceAFace[]> {
    const { supabase, role, adminSupabase } = await checkUserAuthorization();

    if (role !== 'admin') {
        throw new Error("Não autorizado: Apenas administradores podem listar inscrições.");
    }

    try {
        const clientToUse = adminSupabase || supabase; // Admin client para garantir permissão

        let query = clientToUse
            .from('inscricoes_face_a_face')
            .select(`
                *,
                celula_participante_nome:celulas!celula_id(nome),
                celula_inscricao_nome:celulas!celula_inscricao_id(nome),
                evento_nome:eventos_face_a_face(nome_evento)
            `)
            .eq('evento_id', eventoId);

        if (filters?.statusPagamento && filters.statusPagamento !== 'all') {
            query = query.eq('status_pagamento', filters.statusPagamento);
        }
        if (filters?.celulaId && filters.celulaId !== 'all') {
            // CORREÇÃO: Filtra se a célula é do participante OU se foi a célula que fez a inscrição
            query = query.or(`celula_id.eq.${filters.celulaId},celula_inscricao_id.eq.${filters.celulaId}`);
        }
        if (filters?.searchTerm) {
            query = query.or(
                `nome_completo_participante.ilike.%${filters.searchTerm}%,contato_pessoal.ilike.%${filters.searchTerm}%`
            );
        }
        if (filters?.tipoParticipacao) { // <-- NOVO: Aplica o filtro de tipo de participação
            query = query.eq('tipo_participacao', filters.tipoParticipacao);
        }

        const { data, error } = await query.order('nome_completo_participante', { ascending: true });

        if (error) {
            console.error("Erro ao listar inscrições para o evento:", error);
            throw new Error(`Falha ao carregar inscrições: ${error.message}`);
        }

        // Mapeia os dados para a interface InscricaoFaceAFace
        return data.map(inscricao => ({
            ...inscricao,
            celula_participante_nome: (inscricao as any).celula_participante_nome?.nome || null,
            celula_inscricao_nome: (inscricao as any).celula_inscricao_nome?.nome || null,
            evento_nome: (inscricao as any).evento_nome?.nome_evento || null,
        })) as InscricaoFaceAFace[];

    } catch (e: any) {
        console.error("Falha na Server Action listarInscricoesFaceAFacePorEvento:", e);
        throw e;
    }
}

/**
 * Obtém os detalhes de uma inscrição específica (apenas para Admin).
 *
 * @param inscricaoId O ID da inscrição.
 * @returns Os detalhes completos da inscrição ou null se não encontrado/não autorizado.
 * @throws Erro se a busca falhar.
 */
export async function getInscricaoFaceAFace(inscricaoId: string): Promise<InscricaoFaceAFace | null> {
    const { supabase, role, adminSupabase } = await checkUserAuthorization();

    if (role !== 'admin') {
        throw new Error("Não autorizado: Apenas administradores podem ver detalhes de inscrições.");
    }

    try {
        const clientToUse = adminSupabase || supabase; // Admin client para garantir permissão
        const { data, error } = await clientToUse
            .from('inscricoes_face_a_face')
            .select(`
                *,
                celula_participante_nome:celulas!celula_id(nome),
                celula_inscricao_nome:celulas!celula_inscricao_id(nome),
                evento_nome:eventos_face_a_face(nome_evento, valor_total, valor_entrada)
            `)
            .eq('id', inscricaoId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                console.warn(`Inscrição com ID ${inscricaoId} não encontrada.`);
                return null;
            }
            console.error("Erro ao buscar inscrição Face a Face:", error);
            throw new Error(`Falha ao carregar inscrição: ${error.message}`);
        }

        // Mapeia os dados para a interface InscricaoFaceAFace
        return {
            ...data,
            celula_participante_nome: (data as any).celula_participante_nome?.nome || null,
            celula_inscricao_nome: (data as any).celula_inscricao_nome?.nome || null,
            evento_nome: (data as any).evento_nome?.nome_evento || null,
            // Adicione os valores do evento se for útil na visualização da inscrição
            valor_total_evento: (data as any).evento_nome?.valor_total || 0,
            valor_entrada_evento: (data as any).evento_nome?.valor_entrada || 0,
        } as InscricaoFaceAFace;

    } catch (e: any) {
        console.error("Falha na Server Action getInscricaoFaceAFace:", e);
        throw e;
    }
}

/**
 * Atualiza o status de pagamento e informações de comprovante de uma inscrição (apenas para Admin).
 * Permite ao admin confirmar pagamentos e adicionar observações.
 *
 * @param inscricaoId O ID da inscrição a ser atualizada.
 * @param updatedFields Os campos a serem atualizados (status_pagamento, admin_confirmou_entrada, etc.).
 * @throws Erro se não autorizado ou se a atualização falhar.
 */
export async function atualizarInscricaoFaceAFaceAdmin(
    inscricaoId: string,
    updatedFields: Partial<Omit<InscricaoFaceAFace, 'id' | 'created_at' | 'updated_at' | 'evento_id' | 'inscrito_por_perfil_id' | 'celula_inscricao_id' | 'membro_id'>>
): Promise<void> {
    const { supabase, role, adminSupabase } = await checkUserAuthorization();

    if (role !== 'admin') {
        throw new Error("Não autorizado: Apenas administradores podem atualizar inscrições.");
    }

    try {
        const clientToUse = adminSupabase || supabase; // Admin client para garantir permissão
        const { error } = await clientToUse
            .from('inscricoes_face_a_face')
            .update(updatedFields)
            .eq('id', inscricaoId);

        if (error) {
            console.error("Erro ao atualizar inscrição Face a Face (Admin):", error);
            throw new Error(`Falha ao atualizar inscrição: ${error.message}`);
        }

        revalidatePath(`/admin/eventos-face-a-face/*/inscricoes`); // Revalida listagens de inscrições
        revalidatePath(`/admin/eventos-face-a-face/*/inscricoes/editar/${inscricaoId}`); // Revalida a página de edição
        revalidatePath(`/eventos-face-a-face/*/minhas-inscricoes`); // Revalida para o líder também, se houver
    } catch (e: any) {
        console.error("Falha na Server Action atualizarInscricaoFaceAFaceAdmin:", e);
        throw e;
    }
}


/**
 * Exclui uma inscrição Face a Face (apenas para Admin).
 *
 * @param inscricaoId O ID da inscrição a ser excluída.
 * @throws Erro se não autorizado ou se a exclusão falhar.
 */
export async function excluirInscricaoFaceAFace(inscricaoId: string): Promise<void> {
    const { supabase, role, adminSupabase } = await checkUserAuthorization();

    if (role !== 'admin') {
        throw new Error("Não autorizado: Apenas administradores podem excluir inscrições.");
    }

    try {
        const clientToUse = adminSupabase || supabase; // Admin client para garantir permissão
        const { error } = await clientToUse
            .from('inscricoes_face_a_face')
            .delete()
            .eq('id', inscricaoId);

        if (error) {
            console.error("Erro ao excluir inscrição Face a Face:", error);
            throw new Error(`Falha ao excluir inscrição: ${error.message}`);
        }

        revalidatePath(`/admin/eventos-face-a-face/*/inscricoes`); // Revalida listagens de inscrições
        revalidatePath(`/eventos-face-a-face/*/minhas-inscricoes`); // Revalida para o líder também
    } catch (e: any) {
        console.error("Falha na Server Action excluirInscricaoFaceAFace:", e);
        throw e;
    }
}

/**
 * Gera um arquivo CSV com todas as inscrições para um evento, aplicando os mesmos filtros da listagem.
 * Esta função é para ser chamada apenas por administradores.
 *
 * @param eventoId O ID do evento.
 * @param filters Filtros opcionais por status de pagamento, célula, termo de busca, tipo de participação.
 * @returns Uma string formatada como CSV.
 * @throws Erro se não autorizado ou se a geração falhar.
 */
export async function exportarInscricoesCSV(
    eventoId: string,
    filters?: {
        statusPagamento?: InscricaoFaceAFaceStatus | 'all';
        celulaId?: string | 'all';
        searchTerm?: string;
        tipoParticipacao?: InscricaoFaceAFaceTipoParticipacao;
    }
): Promise<string> {
    const { supabase, role, adminSupabase } = await checkUserAuthorization();

    if (role !== 'admin') {
        throw new Error("Não autorizado: Apenas administradores podem exportar inscrições para CSV.");
    }

    try {
        const clientToUse = adminSupabase || supabase;

        // REMOVIDOS OS COMENTÁRIOS DA STRING DO SELECT PARA EVITAR ERRO DE PARSE
        let query = clientToUse
            .from('inscricoes_face_a_face')
            .select(`
                id,
                nome_completo_participante,
                cpf,
                idade,
                rg,
                contato_pessoal,
                contato_emergencia,
                endereco_completo,
                bairro,
                cidade,
                data_nascimento,
                estado_civil,
                nome_esposo,
                tamanho_camiseta,
                eh_membro_ib_apascentar,
                celula_id,
                lider_celula_nome,
                pertence_outra_igreja,
                nome_outra_igreja,
                dificuldade_dormir_beliche,
                restricao_alimentar,
                deficiencia_fisica_mental,
                toma_medicamento_controlado,
                descricao_sonhos,
                tipo_participacao,
                status_pagamento,
                admin_confirmou_entrada,
                data_upload_entrada,
                caminho_comprovante_entrada,
                admin_confirmou_restante,
                data_upload_restante,
                caminho_comprovante_restante,
                admin_observacao_pagamento,
                inscrito_por_perfil_id,
                celula_inscricao_id,
                created_at,
                updated_at,
                celula_participante_nome:celulas!celula_id(nome),
                celula_inscricao_nome:celulas!celula_inscricao_id(nome),
                evento_detalhes:eventos_face_a_face(nome_evento,tipo,data_inicio,data_fim,valor_total,valor_entrada,data_limite_entrada,chave_pix_admin)
            `)
            .eq('evento_id', eventoId);

        if (filters?.statusPagamento && filters.statusPagamento !== 'all') {
            query = query.eq('status_pagamento', filters.statusPagamento);
        }
        
        // CORREÇÃO APLICADA AQUI TAMBÉM: Filtro OR para pegar Célula do Participante OU Célula da Inscrição
        if (filters?.celulaId && filters.celulaId !== 'all') {
            query = query.or(`celula_id.eq.${filters.celulaId},celula_inscricao_id.eq.${filters.celulaId}`);
        }

        if (filters?.searchTerm) {
            query = query.or(
                `nome_completo_participante.ilike.%${filters.searchTerm}%,contato_pessoal.ilike.%${filters.searchTerm}%`
            );
        }
        if (filters?.tipoParticipacao) {
            query = query.eq('tipo_participacao', filters.tipoParticipacao);
        }

        const { data, error } = await query.order('nome_completo_participante', { ascending: true });

        if (error) {
            console.error("Erro ao buscar inscrições para exportação CSV:", error);
            throw new Error(`Falha ao carregar inscrições para CSV: ${error.message}`);
        }

        if (!data || data.length === 0) {
            return "Nenhuma inscrição encontrada para os filtros selecionados.\n";
        }

        // --- Geração do CSV ---
        const escapeCsvValue = (value: any): string => {
            if (value === null || value === undefined) return '';
            let stringValue = String(value);
            if (stringValue.includes('"') || stringValue.includes(',') || stringValue.includes('\n')) {
                stringValue = `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
        };

        const getStatusTextExport = (status: InscricaoFaceAFaceStatus): string => {
            const options = [
                { id: 'PENDENTE', nome: 'Pendente' },
                { id: 'AGUARDANDO_CONFIRMACAO_ENTRADA', nome: 'Aguardando Conf. Entrada' },
                { id: 'ENTRADA_CONFIRMADA', nome: 'Entrada Confirmada' },
                { id: 'AGUARDANDO_CONFIRMACAO_RESTANTE', nome: 'Aguardando Conf. Restante' },
                { id: 'PAGO_TOTAL', nome: 'Pago Total' },
                { id: 'CANCELADO', nome: 'Cancelado' },
            ];
            const option = options.find(o => o.id === status);
            return option ? option.nome : status;
        };

        const headers = [
            "ID Inscrição",
            "Nome do Participante",
            "Idade",
            "Data de Nascimento",
            "CPF",
            "RG",
            "Contato Pessoal",
            "Contato Emergência",
            "Endereço Completo",
            "Bairro",
            "Cidade",
            "Estado Civil",
            "Nome do Esposo",
            "Tamanho Camiseta",
            "Tipo Participação",
            "Membro IBA?",
            "Célula do Participante", // Nome da célula
            "Pertence Outra Igreja?",
            "Nome Outra Igreja",
            "Dificuldade Beliche?",
            "Restrição Alimentar?",
            "Deficiência Física/Mental?",
            "Usa Medicamento Controlado?",
            "Descrição Sonhos",
            "Status Pagamento",
            "Admin Confirmou Entrada?",
            "Data Upload Entrada",
            "URL Comprovante Entrada",
            "Admin Confirmou Restante?",
            "Data Upload Restante",
            "URL Comprovante Restante",
            "Obs. Pagamento Admin",
            "ID Líder Inscrição",
            "Célula Líder (Nome)",
            "Data Inscrição",
            "Última Atualização",
            "Nome Evento",
            "Tipo Evento",
            "Data Início Evento",
            "Data Fim Evento",
            "Valor Total Evento",
            "Valor Entrada Evento",
            "Data Limite Entrada Evento",
            "Chave PIX Admin Evento"
        ];

        let csv = headers.map(escapeCsvValue).join(',') + '\n';

        data.forEach((inscricao: any) => {
            const row = [
                escapeCsvValue(inscricao.id),
                escapeCsvValue(inscricao.nome_completo_participante),
                escapeCsvValue(inscricao.idade),
                inscricao.data_nascimento ? escapeCsvValue(format(parseISO(inscricao.data_nascimento), 'dd/MM/yyyy')) : '',
                escapeCsvValue(inscricao.cpf),
                escapeCsvValue(inscricao.rg),
                escapeCsvValue(inscricao.contato_pessoal),
                escapeCsvValue(inscricao.contato_emergencia),
                escapeCsvValue(inscricao.endereco_completo),
                escapeCsvValue(inscricao.bairro),
                escapeCsvValue(inscricao.cidade),
                escapeCsvValue(inscricao.estado_civil),
                escapeCsvValue(inscricao.nome_esposo),
                escapeCsvValue(inscricao.tamanho_camiseta),
                escapeCsvValue(inscricao.tipo_participacao),
                escapeCsvValue(inscricao.eh_membro_ib_apascentar ? 'Sim' : 'Não'),
                escapeCsvValue(inscricao.celula_participante_nome?.nome || 'N/A'),
                escapeCsvValue(inscricao.pertence_outra_igreja ? 'Sim' : 'Não'),
                escapeCsvValue(inscricao.nome_outra_igreja),
                escapeCsvValue(inscricao.dificuldade_dormir_beliche ? 'Sim' : 'Não'),
                escapeCsvValue(inscricao.restricao_alimentar ? 'Sim' : 'Não'),
                escapeCsvValue(inscricao.deficiencia_fisica_mental ? 'Sim' : 'Não'),
                escapeCsvValue(inscricao.toma_medicamento_controlado ? 'Sim' : 'Não'),
                escapeCsvValue(inscricao.descricao_sonhos),
                escapeCsvValue(getStatusTextExport(inscricao.status_pagamento)),
                escapeCsvValue(inscricao.admin_confirmou_entrada ? 'Sim' : 'Não'),
                inscricao.data_upload_entrada ? escapeCsvValue(format(parseISO(inscricao.data_upload_entrada), 'dd/MM/yyyy HH:mm')) : '',
                escapeCsvValue(inscricao.caminho_comprovante_entrada),
                escapeCsvValue(inscricao.admin_confirmou_restante ? 'Sim' : 'Não'),
                inscricao.data_upload_restante ? escapeCsvValue(format(parseISO(inscricao.data_upload_restante), 'dd/MM/yyyy HH:mm')) : '',
                escapeCsvValue(inscricao.caminho_comprovante_restante),
                escapeCsvValue(inscricao.admin_observacao_pagamento),
                escapeCsvValue(inscricao.inscrito_por_perfil_id),
                escapeCsvValue(inscricao.celula_inscricao_nome?.nome || 'N/A'),
                escapeCsvValue(format(parseISO(inscricao.created_at), 'dd/MM/yyyy HH:mm')),
                escapeCsvValue(format(parseISO(inscricao.updated_at), 'dd/MM/yyyy HH:mm')),
                escapeCsvValue(inscricao.evento_detalhes?.nome_evento || 'N/A'),
                escapeCsvValue(inscricao.evento_detalhes?.tipo || 'N/A'),
                inscricao.evento_detalhes?.data_inicio ? escapeCsvValue(format(parseISO(inscricao.evento_detalhes.data_inicio), 'dd/MM/yyyy')) : '',
                inscricao.evento_detalhes?.data_fim ? escapeCsvValue(format(parseISO(inscricao.evento_detalhes.data_fim), 'dd/MM/yyyy')) : '',
                inscricao.evento_detalhes?.valor_total !== null ? escapeCsvValue(inscricao.evento_detalhes?.valor_total.toFixed(2).replace('.', ',')) : '',
                inscricao.evento_detalhes?.valor_entrada !== null ? escapeCsvValue(inscricao.evento_detalhes?.valor_entrada.toFixed(2).replace('.', ',')) : '',
                inscricao.evento_detalhes?.data_limite_entrada ? escapeCsvValue(format(parseISO(inscricao.evento_detalhes.data_limite_entrada), 'dd/MM/yyyy')) : '',
                escapeCsvValue(inscricao.evento_detalhes?.chave_pix_admin)
            ];
            csv += row.join(',') + '\n';
        });

        return csv;

    } catch (e: any) {
        console.error("Falha na Server Action exportarInscricoesCSV:", e);
        throw e;
    }
}

// ============================================================================
//           FUNÇÕES DE INSCRIÇÃO PARA O LÍDER (Adicione ao final de data.ts)
// ============================================================================

/**
 * Lista as inscrições feitas pelo perfil logado (Líder) para um evento específico.
 */
export async function listarMinhasInscricoesFaceAFacePorEvento(eventoId: string): Promise<InscricaoFaceAFace[]> {
    const { supabase, profileId } = await checkUserAuthorization();

    if (!profileId) {
        return [];
    }

    try {
        const { data, error } = await supabase
            .from('inscricoes_face_a_face')
            .select(`
                *,
                celula_participante_nome:celulas!celula_id(nome),
                celula_inscricao_nome:celulas!celula_inscricao_id(nome),
                evento_nome:eventos_face_a_face(nome_evento, valor_total, valor_entrada)
            `)
            .eq('evento_id', eventoId)
            .eq('inscrito_por_perfil_id', profileId) // Filtra apenas as feitas pelo usuário atual
            .order('nome_completo_participante', { ascending: true });

        if (error) {
            console.error("Erro ao listar minhas inscrições:", error);
            throw new Error(`Falha ao carregar suas inscrições: ${error.message}`);
        }

        return data.map(inscricao => ({
            ...inscricao,
            celula_participante_nome: (inscricao as any).celula_participante_nome?.nome || null,
            celula_inscricao_nome: (inscricao as any).celula_inscricao_nome?.nome || null,
            evento_nome: (inscricao as any).evento_nome?.nome_evento || null,
            valor_total_evento: (inscricao as any).evento_nome?.valor_total || 0,
            valor_entrada_evento: (inscricao as any).evento_nome?.valor_entrada || 0,
        })) as InscricaoFaceAFace[];

    } catch (e: any) {
        console.error("Falha na Server Action listarMinhasInscricoesFaceAFacePorEvento:", e);
        throw e;
    }
}

/**
 * Obtém uma inscrição específica para edição pelo Líder.
 * Garante que a inscrição pertence ao líder logado antes de retornar.
 */
export async function getInscricaoFaceAFaceParaLider(inscricaoId: string): Promise<InscricaoFaceAFace | null> {
    const { supabase, profileId } = await checkUserAuthorization();

    if (!profileId) {
        return null;
    }

    try {
        const { data, error } = await supabase
            .from('inscricoes_face_a_face')
            .select(`
                *,
                celula_participante_nome:celulas!celula_id(nome),
                celula_inscricao_nome:celulas!celula_inscricao_id(nome),
                evento_detalhes:eventos_face_a_face(nome_evento, valor_total, valor_entrada, chave_pix_admin, data_limite_entrada)
            `)
            .eq('id', inscricaoId)
            .eq('inscrito_por_perfil_id', profileId) // Segurança: garante que é dono da inscrição
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            console.error("Erro ao buscar inscrição para líder:", error);
            throw new Error(`Falha ao carregar inscrição: ${error.message}`);
        }

        return {
            ...data,
            celula_participante_nome: (data as any).celula_participante_nome?.nome || null,
            celula_inscricao_nome: (data as any).celula_inscricao_nome?.nome || null,
            evento_nome: (data as any).evento_detalhes?.nome_evento || null,
            valor_total_evento: (data as any).evento_detalhes?.valor_total || 0,
            valor_entrada_evento: (data as any).evento_detalhes?.valor_entrada || 0,
            chave_pix_admin_evento: (data as any).evento_detalhes?.chave_pix_admin || null,
            data_limite_entrada_evento: (data as any).evento_detalhes?.data_limite_entrada || null,
        } as InscricaoFaceAFace;

    } catch (e: any) {
        console.error("Falha na Server Action getInscricaoFaceAFaceParaLider:", e);
        throw e;
    }
}

/**
 * Atualiza dados da inscrição (Líder).
 * O líder só pode alterar dados pessoais. Status de pagamento é controlado pelo Admin/Uploads.
 */
export async function atualizarInscricaoFaceAFaceLider(
    inscricaoId: string, 
    updatedData: Partial<InscricaoFaceAFace>
): Promise<void> {
    const { supabase, profileId } = await checkUserAuthorization();

    if (!profileId) throw new Error("Não autorizado.");

    try {
        // Remover campos que o líder NÃO pode alterar diretamente via update manual
        const { 
            status_pagamento, 
            admin_confirmou_entrada, 
            admin_confirmou_restante,
            inscrito_por_perfil_id,
            // outros campos sensíveis...
            ...safeData 
        } = updatedData;

        const { error } = await supabase
            .from('inscricoes_face_a_face')
            .update(safeData)
            .eq('id', inscricaoId)
            .eq('inscrito_por_perfil_id', profileId); // Segurança extra

        if (error) throw error;

        revalidatePath(`/eventos-face-a-face/*/minhas-inscricoes`);
        revalidatePath(`/eventos-face-a-face/*/minhas-inscricoes/editar/${inscricaoId}`);
    } catch (e: any) {
        console.error("Erro ao atualizar inscrição (Líder):", e);
        throw e;
    }
}

/**
 * Realiza o upload de comprovante (Entrada ou Restante) e atualiza o status.
 */
export async function uploadComprovanteFaceAFace(
    inscricaoId: string, 
    tipo: 'entrada' | 'restante', 
    file: File
): Promise<string> {
    const { supabase, profileId } = await checkUserAuthorization();
    if (!profileId) throw new Error("Não autorizado.");

    // Verifica propriedade da inscrição
    const { data: inscricao, error: checkError } = await supabase
        .from('inscricoes_face_a_face')
        .select('id, evento_id, status_pagamento')
        .eq('id', inscricaoId)
        .eq('inscrito_por_perfil_id', profileId)
        .single();

    if (checkError || !inscricao) throw new Error("Inscrição não encontrada ou não autorizada.");

    const fileName = `${tipo}_${Date.now()}_${sanitizeFileName(file.name)}`;
    const filePath = `comprovantes/${inscricao.evento_id}/${inscricao.id}/${fileName}`;

    // Upload Storage
    const { error: uploadError } = await createServerClient().storage
        .from('comprovantes_face_a_face') // Certifique-se de criar este bucket no Supabase e deixá-lo público ou com policies corretas
        .upload(filePath, file);

    if (uploadError) throw new Error("Erro no upload: " + uploadError.message);

    const { data: publicUrlData } = createServerClient().storage
        .from('comprovantes_face_a_face')
        .getPublicUrl(filePath);

    const fileUrl = publicUrlData.publicUrl;

    // Atualiza tabela com URL e muda Status
    const updateData: any = {};
    const now = new Date().toISOString();

    if (tipo === 'entrada') {
        updateData.caminho_comprovante_entrada = fileUrl;
        updateData.data_upload_entrada = now;
        // Se estava pendente, muda para aguardando
        if (inscricao.status_pagamento === 'PENDENTE') {
            updateData.status_pagamento = 'AGUARDANDO_CONFIRMACAO_ENTRADA';
        }
    } else {
        updateData.caminho_comprovante_restante = fileUrl;
        updateData.data_upload_restante = now;
        // Se já pagou entrada, muda para aguardando restante
        if (inscricao.status_pagamento === 'ENTRADA_CONFIRMADA') {
            updateData.status_pagamento = 'AGUARDANDO_CONFIRMACAO_RESTANTE';
        }
    }

    const { error: dbError } = await supabase
        .from('inscricoes_face_a_face')
        .update(updateData)
        .eq('id', inscricaoId);

    if (dbError) throw new Error("Erro ao atualizar registro: " + dbError.message);

    revalidatePath(`/eventos-face-a-face/*/minhas-inscricoes`);
    return fileUrl;
}