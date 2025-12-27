'use server';

import { createServerClient, createAdminClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { format, isSameMonth, parseISO, subDays, addHours, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { v4 as uuidv4 } from 'uuid';

import type {
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
    ConviteInscricao
} from './types';

// ============================================================================
//                            FUNÇÕES AUXILIARES
// ============================================================================

async function checkUserAuthorization(): Promise<{
    supabase: ReturnType<typeof createServerClient>;
    role: 'admin' | 'líder' | null;
    celulaId: string | null;
    profileId: string | null;
    adminSupabase: ReturnType<typeof createAdminClient>;
}> {
    const supabaseUser = createServerClient();
    const adminSupabase = createAdminClient();
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();

    if (userError || !user) {
        return { supabase: supabaseUser, role: null, celulaId: null, profileId: null, adminSupabase };
    }

    const { data: profileData, error: profileError } = await supabaseUser
        .from('profiles')
        .select('celula_id, role')
        .eq('id', user.id)
        .single();

    if (profileError || !profileData) {
        return { supabase: supabaseUser, role: null, celulaId: null, profileId: user.id, adminSupabase };
    }

    const role = profileData.role as 'admin' | 'líder';
    const celulaId = profileData.celula_id;

    return {
        supabase: supabaseUser,
        role,
        celulaId,
        profileId: user.id,
        adminSupabase
    };
}

async function getCelulasNamesMap(supabaseInstance: ReturnType<typeof createServerClient> | ReturnType<typeof createAdminClient>, celulaIds: Set<string>): Promise<Map<string, string>> {
    const namesMap = new Map<string, string>();
    if (celulaIds.size === 0) return namesMap;

    const { data, error } = await supabaseInstance
        .from('celulas')
        .select('id, nome')
        .in('id', Array.from(celulaIds));

    if (error) {
        console.error("Erro ao buscar nomes de células:", error);
    } else {
        data?.forEach((c: CelulaNomeId) => namesMap.set(c.id, c.nome));
    }
    return namesMap;
}

function sanitizeFileName(fileName: string): string {
    const normalized = fileName.normalize('NFD');
    const withoutAccents = normalized.replace(/[\u0300-\u036f]/g, '');
    return withoutAccents.replace(/[^a-zA-Z0-9._-]/g, '_');
}

// ============================================================================
//                            FUNÇÕES DE CÉLULAS
// ============================================================================

export async function listarCelulasParaAdmin(): Promise<CelulaOption[]> {
    const { adminSupabase, role } = await checkUserAuthorization();
    if (role !== 'admin') return [];

    const { data, error } = await adminSupabase
        .from('celulas')
        .select('id, nome')
        .order('nome', { ascending: true });

    if (error) throw new Error("Falha ao carregar células: " + error.message);
    return data || [];
}

export async function listarCelulasParaLider(): Promise<CelulaOption[]> {
    const { supabase, role, celulaId } = await checkUserAuthorization();
    if (role === 'líder' && celulaId) {
        const { data, error } = await supabase.from('celulas').select('id, nome').eq('id', celulaId).single();
        if (error) throw new Error("Falha ao carregar sua célula: " + error.message);
        return data ? [{ id: data.id, nome: data.nome }] : [];
    }
    return [];
}

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
    if (!role) return [];

    const clientToUse = role === 'admin' ? adminSupabase : supabase;
    let query = clientToUse.from('membros').select('*');

    if (birthdayMonth && birthdayMonth >= 1 && birthdayMonth <= 12) {
        let rpcCelulaIdParam = (role === 'líder' && celulaId) ? celulaId : (role === 'admin' && celulaIdFilter) ? celulaIdFilter : null;
        const { data: rpcMemberIds, error: rpcError } = await clientToUse.rpc('get_members_birthday_ids_in_month', {
            p_month: birthdayMonth,
            p_celula_id: rpcCelulaIdParam
        });
        if (rpcError) throw new Error(`Falha ao carregar aniversariantes: ${rpcError.message}`);
        if (!rpcMemberIds || rpcMemberIds.length === 0) return [];
        query = query.in('id', rpcMemberIds);
    }

    if (role === 'líder') {
        if (!celulaId) return [];
        query = query.eq('celula_id', celulaId);
    } else if (role === 'admin' && celulaIdFilter) {
        query = query.eq('celula_id', celulaIdFilter);
    }

    if (searchTerm) query = query.or(`nome.ilike.%${searchTerm}%,telefone.ilike.%${searchTerm}%`);
    if (statusFilter !== 'all') query = query.eq('status', statusFilter);

    const { data, error } = await query.order('nome', { ascending: true });
    if (error) throw new Error(`Falha ao carregar membros: ${error.message}`);

    const membros: Membro[] = data || [];
    if (membros.length === 0) return [];

    const celulaIds = new Set<string>(membros.map(m => m.celula_id));
    const celulasNamesMap = await getCelulasNamesMap(clientToUse, celulaIds);
    return membros.map(m => ({ ...m, celula_nome: celulasNamesMap.get(m.celula_id) || null }));
}

export async function listarMembrosDaCelulaDoLider(): Promise<MembroNomeTelefoneId[]> {
    const { supabase, role, celulaId } = await checkUserAuthorization();
    if (role !== 'líder' || !celulaId) return [];

    const { data, error } = await supabase
        .from('membros')
        .select('id, nome, telefone, data_nascimento, endereco, celula_id')
        .eq('celula_id', celulaId)
        .order('nome', { ascending: true });

    if (error) throw new Error(`Falha ao carregar membros: ${error.message}`);
    return data as MembroNomeTelefoneId[];
}

export async function adicionarMembro(newMembroData: Omit<Membro, 'id' | 'created_at' | 'celula_nome'>): Promise<string> {
    const { supabase, role, celulaId } = await checkUserAuthorization();
    if (!role) throw new Error("Não autorizado.");

    const targetCelulaId = role === 'líder' ? celulaId : newMembroData.celula_id;
    if (!targetCelulaId) throw new Error("ID da célula é necessário.");

    const { data, error } = await supabase.from('membros').insert({
        ...newMembroData,
        celula_id: targetCelulaId,
        status: newMembroData.status || 'Ativo'
    }).select('id').single();

    if (error) throw error;
    revalidatePath('/membros');
    return data.id;
}

export async function getMembro(membroId: string): Promise<Membro | null> {
    const { supabase, role, celulaId } = await checkUserAuthorization();
    if (!role) return null;

    let query = supabase.from('membros').select('*, celulas(nome)').eq('id', membroId);
    if (role === 'líder') {
        if (!celulaId) return null;
        query = query.eq('celula_id', celulaId);
    }

    const { data, error } = await query.single();
    if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
    }
    return { ...data, celula_nome: (data as any).celulas?.nome || null } as Membro;
}

export async function atualizarMembro(membroId: string, updatedMembroData: Omit<Membro, 'id' | 'celula_id' | 'created_at' | 'celula_nome'>): Promise<void> {
    const { supabase, role, celulaId } = await checkUserAuthorization();
    if (!role) throw new Error("Não autorizado");

    let query = supabase.from('membros').update(updatedMembroData).eq('id', membroId);
    if (role === 'líder') {
        if (!celulaId) throw new Error("Não autorizado");
        query = query.eq('celula_id', celulaId);
    }

    const { error } = await query;
    if (error) throw error;
    revalidatePath('/membros');
    revalidatePath(`/membros/editar/${membroId}`);
}

export async function excluirMembro(membroId: string): Promise<void> {
    const { supabase, role, celulaId } = await checkUserAuthorization();
    if (!role) throw new Error("Não autorizado");

    let query = supabase.from('membros').delete().eq('id', membroId);
    if (role === 'líder') {
        if (!celulaId) throw new Error("Não autorizado");
        query = query.eq('celula_id', celulaId);
    }

    const { error } = await query;
    if (error) throw new Error(`Falha ao excluir membro: ${error.message}`);
    revalidatePath('/membros');
}

export async function importarMembrosCSV(csvString: string): Promise<ImportMembroResult> {
    const { supabase, role, celulaId } = await checkUserAuthorization();
    if (role !== 'líder' || !celulaId) return { success: false, message: "Não autorizado.", importedCount: 0, errors: [] };

    const lines = csvString.trim().split('\n');
    if (lines.length === 0) return { success: false, message: "CSV vazio.", importedCount: 0, errors: [] };

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const expectedHeaders = ['nome', 'telefone', 'data_ingresso', 'data_nascimento', 'endereco', 'status'];
    const missingHeaders = expectedHeaders.filter(eh => !headers.includes(eh));

    if (missingHeaders.length > 0) {
        return { success: false, message: `Cabeçalhos ausentes: ${missingHeaders.join(', ')}.`, importedCount: 0, errors: [] };
    }

    let importedCount = 0;
    const errors: { rowIndex: number; data: any; error: string }[] = [];
    const membersToInsert: any[] = [];

    const parseCSVLine = (line: string) => {
        const result = [];
        let inQuote = false;
        let currentField = '';
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                if (i < line.length - 1 && line[i + 1] === '"') {
                    currentField += '"';
                    i++;
                } else {
                    inQuote = !inQuote;
                }
            } else if (char === ',' && !inQuote) {
                result.push(currentField.trim() === '' ? null : currentField.trim());
                currentField = '';
            } else {
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
        const rowData: any = {};
        headers.forEach((header, index) => { rowData[header] = values[index]; });

        try {
            if (!rowData.nome) throw new Error("Nome é obrigatório.");
            if (!rowData.data_ingresso) throw new Error("Data de ingresso é obrigatória.");
            
            membersToInsert.push({
                celula_id: celulaId,
                nome: rowData.nome,
                telefone: rowData.telefone ? rowData.telefone.replace(/\D/g, '') : null,
                data_ingresso: rowData.data_ingresso,
                data_nascimento: rowData.data_nascimento,
                endereco: rowData.endereco,
                status: rowData.status || 'Ativo',
            });
        } catch (e: any) {
            errors.push({ rowIndex: i + 1, data: rowData, error: e.message });
        }
    }

    if (membersToInsert.length > 0) {
        const { error } = await supabase.from('membros').insert(membersToInsert);
        if (error) {
            // Fallback: tentar um por um se o lote falhar
            for (const member of membersToInsert) {
                const { error: singleError } = await supabase.from('membros').insert(member);
                if (singleError) errors.push({ rowIndex: -1, data: member, error: singleError.message });
                else importedCount++;
            }
        } else {
            importedCount = membersToInsert.length;
        }
    }

    revalidatePath('/membros');
    return { success: errors.length === 0 && importedCount > 0, message: `Importados: ${importedCount}, Erros: ${errors.length}`, importedCount, errors };
}

export async function exportarMembrosCSV(celulaIdFilter: string | null, searchTerm: string | null, birthdayMonth: number | null, statusFilter: Membro['status'] | 'all'): Promise<string> {
    const { supabase, role, celulaId, adminSupabase } = await checkUserAuthorization();
    if (!role) throw new Error("Não autorizado.");

    const clientToUse = role === 'admin' ? adminSupabase : supabase;
    let query = clientToUse.from('membros').select('*');

    if (birthdayMonth) {
        const rpcParam = (role === 'líder' && celulaId) ? celulaId : (role === 'admin' ? celulaIdFilter : null);
        const { data: ids } = await clientToUse.rpc('get_members_birthday_ids_in_month', { p_month: birthdayMonth, p_celula_id: rpcParam });
        if (!ids || ids.length === 0) return "Nome,Telefone\n";
        query = query.in('id', ids);
    }

    if (role === 'líder') query = query.eq('celula_id', celulaId);
    else if (role === 'admin' && celulaIdFilter) query = query.eq('celula_id', celulaIdFilter);

    if (searchTerm) query = query.or(`nome.ilike.%${searchTerm}%,telefone.ilike.%${searchTerm}%`);
    if (statusFilter !== 'all') query = query.eq('status', statusFilter);

    const { data: membros } = await query.order('nome', { ascending: true });
    if (!membros || membros.length === 0) return "Nome,Telefone,Data Ingresso,Status\n";

    const celulaIds = new Set<string>(membros.map((m: any) => m.celula_id));
    const celulasMap = await getCelulasNamesMap(clientToUse, celulaIds);

    let csv = "Nome,Telefone,Data de Ingresso,Data de Nascimento,Endereço,Status,Célula\n";
    membros.forEach((m: any) => {
        csv += `"${m.nome}","${m.telefone || ''}","${m.data_ingresso}","${m.data_nascimento || ''}","${m.endereco || ''}","${m.status}","${celulasMap.get(m.celula_id) || ''}"\n`;
    });
    return csv;
}

// ============================================================================
//                               FUNÇÕES DE VISITANTES
// ============================================================================

export async function listarVisitantes(celulaIdFilter: string | null = null, searchTerm: string | null = null, minDaysSinceLastContact: number | null = null): Promise<Visitante[]> {
    const { supabase, role, celulaId, adminSupabase } = await checkUserAuthorization();
    if (!role) return [];

    const clientToUse = role === 'admin' ? adminSupabase : supabase;
    let query = clientToUse.from('visitantes').select('*');

    if (role === 'líder') {
        if (!celulaId) return [];
        query = query.eq('celula_id', celulaId);
    } else if (role === 'admin' && celulaIdFilter) {
        query = query.eq('celula_id', celulaIdFilter);
    }

    if (searchTerm) query = query.or(`nome.ilike.%${searchTerm}%,telefone.ilike.%${searchTerm}%`);
    if (minDaysSinceLastContact) {
        const cutoff = subDays(new Date(), minDaysSinceLastContact).toISOString();
        query = query.or(`data_ultimo_contato.is.null,data_ultimo_contato.lt.${cutoff}`);
    }

    const { data, error } = await query.order('nome', { ascending: true });
    if (error) throw new Error("Falha ao carregar visitantes.");

    const visitantes: Visitante[] = data || [];
    if (visitantes.length === 0) return [];

    const celulaIds = new Set<string>(visitantes.map(v => v.celula_id));
    const celulasMap = await getCelulasNamesMap(clientToUse, celulaIds);
    return visitantes.map(v => ({ ...v, celula_nome: celulasMap.get(v.celula_id) || null }));
}

export async function adicionarVisitante(newVisitanteData: Omit<Visitante, 'id' | 'created_at' | 'celula_nome' | 'status_conversao'>): Promise<string> {
    const { supabase, role, celulaId } = await checkUserAuthorization();
    if (!role) throw new Error("Não autorizado");

    const targetCelulaId = role === 'líder' ? celulaId : newVisitanteData.celula_id;
    if (!targetCelulaId) throw new Error("ID da célula é necessário.");

    const { data, error } = await supabase.from('visitantes').insert({
        ...newVisitanteData,
        celula_id: targetCelulaId,
        status_conversao: 'Em Contato'
    }).select('id').single();

    if (error) throw error;
    revalidatePath('/visitantes');
    return data.id;
}

export async function getVisitante(visitanteId: string): Promise<Visitante | null> {
    const { supabase, role, celulaId } = await checkUserAuthorization();
    if (!role) return null;

    let query = supabase.from('visitantes').select('*').eq('id', visitanteId);
    if (role === 'líder') {
        if (!celulaId) return null;
        query = query.eq('celula_id', celulaId);
    }

    const { data, error } = await query.single();
    if (error && error.code === 'PGRST116') return null;
    if (error) throw error;
    return data;
}

export async function atualizarVisitante(updatedVisitanteData: Omit<Visitante, 'id' | 'celula_id' | 'created_at' | 'celula_nome'>, visitanteId: string): Promise<void> {
    const { supabase, role, celulaId } = await checkUserAuthorization();
    if (!role) throw new Error("Não autorizado");

    let query = supabase.from('visitantes').update(updatedVisitanteData).eq('id', visitanteId);
    if (role === 'líder') {
        if (!celulaId) throw new Error("Não autorizado");
        query = query.eq('celula_id', celulaId);
    }

    const { error } = await query;
    if (error) throw error;
    revalidatePath('/visitantes');
    revalidatePath(`/visitantes/editar/${visitanteId}`);
}

export async function excluirVisitante(visitanteId: string): Promise<void> {
    const { supabase, role, celulaId } = await checkUserAuthorization();
    if (!role) throw new Error("Não autorizado");

    let query = supabase.from('visitantes').delete().eq('id', visitanteId);
    if (role === 'líder') {
        if (!celulaId) throw new Error("Não autorizado");
        query = query.eq('celula_id', celulaId);
    }

    const { error } = await query;
    if (error) throw new Error("Falha ao excluir visitante.");
    revalidatePath('/visitantes');
}

export async function converterVisitanteEmMembro(visitanteId: string, newMembroData: Omit<Membro, 'id' | 'created_at' | 'celula_nome'>): Promise<{ success: boolean; message: string }> {
    const { supabase, role, celulaId } = await checkUserAuthorization();
    if (!role) return { success: false, message: "Não autorizado" };

    const { data: vis, error: visError } = await supabase.from('visitantes').select('celula_id').eq('id', visitanteId).single();
    if (visError || !vis) return { success: false, message: "Visitante não encontrado." };

    if (role === 'líder' && celulaId !== vis.celula_id) return { success: false, message: "Não autorizado." };

    try {
        const { count } = await supabase.from('membros').select('id', { count: 'exact', head: true }).eq('nome', newMembroData.nome).eq('celula_id', vis.celula_id);
        if (count && count > 0) return { success: false, message: "Membro já existe." };

        const { data: novoMembro, error: insertError } = await supabase.from('membros').insert({ ...newMembroData, celula_id: vis.celula_id }).select('id').single();
        if (insertError) throw insertError;

        await supabase.from('visitantes').delete().eq('id', visitanteId);
        revalidatePath('/membros');
        revalidatePath('/visitantes');
        return { success: true, message: "Convertido com sucesso!" };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
}

// ============================================================================
//                               FUNÇÕES DE REUNIÕES
// ============================================================================

export async function listarReunioes(): Promise<ReuniaoComNomes[]> {
    const { supabase, role, celulaId, adminSupabase } = await checkUserAuthorization();
    if (!role) return [];

    const clientToUse = role === 'admin' ? adminSupabase : supabase;
    let query = clientToUse.from('reunioes').select(`
        id, data_reuniao, tema, caminho_pdf, celula_id, created_at,
        ministrador_principal_alias:membros!ministrador_principal(nome),
        ministrador_secundario_alias:membros!ministrador_secundario(nome),
        responsavel_kids_alias:membros!responsavel_kids(nome),
        celula_nome_alias:celulas(nome)
    `);

    if (role === 'líder') {
        if (!celulaId) return [];
        query = query.eq('celula_id', celulaId);
    }

    const { data, error } = await query.order('data_reuniao', { ascending: false });
    if (error) throw new Error("Erro ao listar reuniões: " + error.message);

    const reunioes = data || [];
    if (reunioes.length === 0) return [];

    const reuniaoIds = reunioes.map((r: any) => r.id);
    const { data: criancasData } = await clientToUse.from('criancas_reuniao').select('reuniao_id, numero_criancas').in('reuniao_id', reuniaoIds);
    const criancasMap = new Map((criancasData || []).map((c: any) => [c.reuniao_id, c.numero_criancas]));

    return reunioes.map((r: any) => ({
        id: r.id,
        data_reuniao: r.data_reuniao,
        tema: r.tema,
        caminho_pdf: r.caminho_pdf,
        celula_id: r.celula_id,
        celula_nome: r.celula_nome_alias?.nome || null,
        ministrador_principal_nome: r.ministrador_principal_alias?.nome || null,
        ministrador_secundario_nome: r.ministrador_secundario_alias?.nome || null,
        responsavel_kids_nome: r.responsavel_kids_alias?.nome || null,
        num_criancas: Number(criancasMap.get(r.id)) || 0,
        created_at: r.created_at,
    }));
}

export async function getReuniaoDetalhesParaResumo(reuniaoId: string): Promise<ReuniaoDetalhesParaResumo | null> {
    const { supabase, role, celulaId, adminSupabase } = await checkUserAuthorization();
    if (!role) return null;

    const clientToUse = role === 'admin' ? adminSupabase : supabase;
    let targetCelulaId = role === 'líder' ? celulaId : null;

    if (role === 'admin') {
        const { data } = await clientToUse.from('reunioes').select('celula_id').eq('id', reuniaoId).single();
        if (!data) return null;
        targetCelulaId = data.celula_id;
    }

    if (!targetCelulaId) return null;

    try {
        const [reuniaoResult, criancasResult] = await Promise.all([
            clientToUse.from('reunioes').select(`
                id, data_reuniao, tema, caminho_pdf, celula_id,
                ministrador_principal_alias:membros!ministrador_principal(id, nome, telefone),
                ministrador_secundario_alias:membros!ministrador_secundario(id, nome, telefone),
                responsavel_kids_alias:membros!responsavel_kids(id, nome, telefone),
                celula_nome_alias:celulas(nome)
            `).eq('id', reuniaoId).eq('celula_id', targetCelulaId).single(),
            clientToUse.from('criancas_reuniao').select('numero_criancas').eq('reuniao_id', reuniaoId).maybeSingle()
        ]);

        const reuniaoData = reuniaoResult.data;
        if (!reuniaoData) return null;

        const [membrosPres, todosMembros, visitPres] = await Promise.all([
            clientToUse.from('presencas_membros').select('membro_id, membro_data:membros(id, nome, telefone)').eq('reuniao_id', reuniaoId).eq('presente', true),
            clientToUse.from('membros').select('id, nome, telefone').eq('celula_id', targetCelulaId),
            clientToUse.from('presencas_visitantes').select('visitante_id, visitante_data:visitantes(id, nome, telefone)').eq('reuniao_id', reuniaoId).eq('presente', true)
        ]);

        const presentesIds = new Set(membrosPres.data?.map((p: any) => p.membro_id));
        const membrosAusentes = (todosMembros.data || []).filter((m: any) => !presentesIds.has(m.id)).map((m: any) => ({ id: m.id, nome: m.nome, telefone: m.telefone }));
        
        return {
            id: reuniaoData.id,
            data_reuniao: reuniaoData.data_reuniao,
            tema: reuniaoData.tema,
            caminho_pdf: reuniaoData.caminho_pdf,
            ministrador_principal_nome: (reuniaoData as any).ministrador_principal_alias?.nome || null,
            ministrador_secundario_nome: (reuniaoData as any).ministrador_secundario_alias?.nome || null,
            responsavel_kids_nome: (reuniaoData as any).responsavel_kids_alias?.nome || null,
            num_criancas: Number(criancasResult.data?.numero_criancas) || 0,
            celula_nome: (reuniaoData as any).celula_nome_alias?.nome || null,
            membros_presentes: (membrosPres.data || []).map((p: any) => ({ id: p.membro_id, nome: p.membro_data?.nome, telefone: p.membro_data?.telefone })),
            membros_ausentes: membrosAusentes,
            visitantes_presentes: (visitPres.data || []).map((p: any) => ({ id: p.visitante_id, nome: p.visitante_data?.nome, telefone: p.visitante_data?.telefone })),
        };
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function adicionarReuniao(newReuniaoData: ReuniaoFormData): Promise<string> {
    const { supabase, role, celulaId } = await checkUserAuthorization();
    if (!role) throw new Error("Não autorizado");

    const targetCelulaId = role === 'líder' ? celulaId : newReuniaoData.celula_id;
    if (!targetCelulaId) throw new Error("ID da célula é necessário.");

    const { data, error } = await supabase.from('reunioes').insert({
        ...newReuniaoData,
        celula_id: targetCelulaId
    }).select('id').single();

    if (error) throw error;
    await supabase.from('criancas_reuniao').insert({ reuniao_id: data.id, numero_criancas: 0 });
    revalidatePath('/reunioes');
    return data.id;
}

export async function getReuniao(reuniaoId: string): Promise<ReuniaoParaEdicao | null> {
    const { supabase, role, celulaId } = await checkUserAuthorization();
    if (!role) return null;

    let query = supabase.from('reunioes').select(`
        *,
        ministrador_principal_nome_alias:membros!ministrador_principal(nome),
        ministrador_secundario_nome_alias:membros!ministrador_secundario(nome),
        responsavel_kids_nome_alias:membros!responsavel_kids(nome),
        celula_nome_alias:celulas(nome)
    `).eq('id', reuniaoId);

    if (role === 'líder') {
        if (!celulaId) return null;
        query = query.eq('celula_id', celulaId);
    }

    const { data, error } = await query.single();
    if (error) { if (error.code === 'PGRST116') return null; throw error; }

    return {
        ...data,
        ministrador_principal_nome: (data as any).ministrador_principal_nome_alias?.nome || null,
        ministrador_secundario_nome: (data as any).ministrador_secundario_nome_alias?.nome || null,
        responsavel_kids_nome: (data as any).responsavel_kids_nome_alias?.nome || null,
        celula_nome: (data as any).celula_nome_alias?.nome || null
    };
}

export async function atualizarReuniao(reuniaoId: string, updatedReuniaoData: ReuniaoFormData): Promise<void> {
    const { supabase, role, celulaId } = await checkUserAuthorization();
    if (!role) throw new Error("Não autorizado");

    let query = supabase.from('reunioes').update(updatedReuniaoData).eq('id', reuniaoId);
    if (role === 'líder') {
        if (!celulaId) throw new Error("Não autorizado");
        query = query.eq('celula_id', celulaId);
    }

    const { error } = await query;
    if (error) throw error;
    revalidatePath('/reunioes');
    revalidatePath(`/reunioes/editar/${reuniaoId}`);
}

export async function excluirReuniao(reuniaoId: string): Promise<void> {
    const { supabase, role, celulaId } = await checkUserAuthorization();
    if (!role) throw new Error("Não autorizado");

    let query = supabase.from('reunioes').delete().eq('id', reuniaoId);
    if (role === 'líder') {
        if (!celulaId) throw new Error("Não autorizado");
        query = query.eq('celula_id', celulaId);
    }

    const { error } = await query;
    if (error) throw error;
    revalidatePath('/reunioes');
}

export async function verificarDuplicidadeReuniao(dataReuniao: string, tema: string, excludeId?: string): Promise<boolean> {
    const { supabase, role, celulaId } = await checkUserAuthorization();
    if (!role) throw new Error("Não autorizado");

    let query = supabase.from('reunioes').select('id', { count: 'exact', head: true }).eq('data_reuniao', dataReuniao).ilike('tema', tema);
    if (role === 'líder') {
        if (!celulaId) throw new Error("ID de célula necessário.");
        query = query.eq('celula_id', celulaId);
    }
    if (excludeId) query = query.neq('id', excludeId);

    const { count } = await query;
    return (count || 0) > 0;
}

export async function listarTodosMembrosComPresenca(reuniaoId: string): Promise<MembroComPresenca[]> {
    const { supabase, role, celulaId, adminSupabase } = await checkUserAuthorization();
    if (!role) return [];

    let targetCelulaId = role === 'líder' ? celulaId : null;
    const clientToUse = role === 'admin' ? adminSupabase : supabase;

    if (role === 'admin') {
        const { data } = await clientToUse.from('reunioes').select('celula_id').eq('id', reuniaoId).single();
        if (data) targetCelulaId = data.celula_id;
    }

    if (!targetCelulaId) return [];

    const { data: membros } = await clientToUse.from('membros').select('*').eq('celula_id', targetCelulaId).order('nome', { ascending: true });
    if (!membros) return [];

    const { data: presencas } = await clientToUse.from('presencas_membros').select('membro_id, presente').eq('reuniao_id', reuniaoId);
    const presencaMap = new Map((presencas || []).map((p: any) => [p.membro_id, p.presente]));

    return membros.map((m: any) => ({
        ...m,
        presente: presencaMap.get(m.id) || false,
        presenca_registrada: presencaMap.has(m.id)
    }));
}

export async function registrarPresencaMembro(reuniaoId: string, membroId: string, presente: boolean): Promise<void> {
    const { supabase, role, celulaId, adminSupabase } = await checkUserAuthorization();
    if (!role) throw new Error("Não autorizado");

    const clientToUse = role === 'admin' ? adminSupabase : supabase;
    const { error } = await clientToUse.from('presencas_membros').upsert({ reuniao_id: reuniaoId, membro_id: membroId, presente }, { onConflict: 'reuniao_id, membro_id' });
    if (error) throw error;
    revalidatePath(`/reunioes/presenca/${reuniaoId}`);
}

export async function listarTodosVisitantesComPresenca(reuniaoId: string): Promise<VisitanteComPresenca[]> {
    const { supabase, role, celulaId, adminSupabase } = await checkUserAuthorization();
    if (!role) return [];

    let targetCelulaId = role === 'líder' ? celulaId : null;
    const clientToUse = role === 'admin' ? adminSupabase : supabase;

    if (role === 'admin') {
        const { data } = await clientToUse.from('reunioes').select('celula_id').eq('id', reuniaoId).single();
        if (data) targetCelulaId = data.celula_id;
    }

    if (!targetCelulaId) return [];

    const { data: visitantes } = await clientToUse.from('visitantes').select('*').eq('celula_id', targetCelulaId).order('nome', { ascending: true });
    const { data: presencas } = await clientToUse.from('presencas_visitantes').select('visitante_id, presente').eq('reuniao_id', reuniaoId);
    const presencaMap = new Map((presencas || []).map((p: any) => [p.visitante_id, p.presente]));

    return (visitantes || []).map((v: any) => ({
        visitante_id: v.id,
        nome: v.nome,
        telefone: v.telefone,
        presente: presencaMap.get(v.id) || false
    }));
}

export async function registrarPresencaVisitante(reuniaoId: string, visitanteId: string, presente: boolean): Promise<void> {
    const { supabase, role, celulaId, adminSupabase } = await checkUserAuthorization();
    if (!role) throw new Error("Não autorizado");

    const clientToUse = role === 'admin' ? adminSupabase : supabase;
    const { error } = await clientToUse.from('presencas_visitantes').upsert({ reuniao_id: reuniaoId, visitante_id: visitanteId, presente }, { onConflict: 'reuniao_id, visitante_id' });
    if (error) throw error;
    revalidatePath(`/reunioes/presenca/${reuniaoId}`);
}

export async function getNumCriancasReuniao(reuniaoId: string): Promise<number> {
    const { supabase, role, adminSupabase } = await checkUserAuthorization();
    if (!role) return 0;
    const clientToUse = role === 'admin' ? adminSupabase : supabase;
    const { data } = await clientToUse.from('criancas_reuniao').select('numero_criancas').eq('reuniao_id', reuniaoId).maybeSingle();
    return Number(data?.numero_criancas) || 0;
}

export async function setNumCriancasReuniao(reuniaoId: string, numeroCriancas: number): Promise<void> {
    const { supabase, role, adminSupabase } = await checkUserAuthorization();
    if (!role) throw new Error("Não autorizado");
    const clientToUse = role === 'admin' ? adminSupabase : supabase;
    const { error } = await clientToUse.from('criancas_reuniao').upsert({ reuniao_id: reuniaoId, numero_criancas: Math.max(0, numeroCriancas) }, { onConflict: 'reuniao_id' });
    if (error) throw error;
    revalidatePath(`/reunioes/presenca/${reuniaoId}`);
}

export async function duplicarReuniao(reuniaoId: string): Promise<string> {
    const { supabase, role, celulaId } = await checkUserAuthorization();
    if (!role) throw new Error("Não autorizado");

    const { data: original } = await supabase.from('reunioes').select('*').eq('id', reuniaoId).single();
    if (!original) throw new Error("Reunião original não encontrada.");

    if (role === 'líder' && original.celula_id !== celulaId) throw new Error("Não autorizado.");

    let newTheme = original.tema;
    const today = new Date().toISOString().split('T')[0];
    let counter = 1;
    while (await verificarDuplicidadeReuniao(today, newTheme)) {
        newTheme = `${original.tema} (Cópia ${counter})`;
        counter++;
    }

    const { data: nova } = await supabase.from('reunioes').insert({
        celula_id: original.celula_id,
        data_reuniao: today,
        tema: newTheme,
        ministrador_principal: original.ministrador_principal,
        ministrador_secundario: original.ministrador_secundario,
        responsavel_kids: original.responsavel_kids
    }).select('id').single();

    if (!nova) throw new Error("Erro ao criar cópia.");

    const { data: criancas } = await supabase.from('criancas_reuniao').select('numero_criancas').eq('reuniao_id', reuniaoId).single();
    if (criancas) {
        await supabase.from('criancas_reuniao').insert({ reuniao_id: nova.id, numero_criancas: criancas.numero_criancas });
    }

    revalidatePath('/reunioes');
    return nova.id;
}

export async function uploadMaterialReuniao(reuniaoId: string, file: File): Promise<string> {
    const { supabase, role, celulaId } = await checkUserAuthorization();
    if (!role) throw new Error("Não autorizado.");

    const { data: reuniao } = await supabase.from('reunioes').select('celula_id').eq('id', reuniaoId).single();
    if (!reuniao) throw new Error("Reunião não encontrada.");
    if (role === 'líder' && reuniao.celula_id !== celulaId) throw new Error("Não autorizado.");

    const ext = file.name.split('.').pop();
    const path = `${reuniao.celula_id}/${reuniaoId}.${ext}`;
    const { error: uploadError } = await createServerClient().storage.from('reunion_materials').upload(path, file, { upsert: true });
    if (uploadError) throw new Error("Erro no upload: " + uploadError.message);

    const { data: urlData } = createServerClient().storage.from('reunion_materials').getPublicUrl(path);
    await supabase.from('reunioes').update({ caminho_pdf: urlData.publicUrl }).eq('id', reuniaoId);
    revalidatePath(`/reunioes/resumo/${reuniaoId}`);
    return urlData.publicUrl;
}

// ============================================================================
//                               FUNÇÕES DE USUÁRIO E PERFIL
// ============================================================================

export async function getUserProfile(): Promise<Profile | null> {
    const { supabase, role, adminSupabase } = await checkUserAuthorization();
    if (!role) throw new Error("Usuário não autenticado.");

    const { data: { user } } = await createServerClient().auth.getUser();
    if (!user) throw new Error("Usuário não autenticado.");

    const clientToUse = role === 'admin' ? adminSupabase : supabase;
    const { data: profile } = await clientToUse.from('profiles').select('*').eq('id', user.id).single();

    if (!profile) {
        return {
            id: user.id,
            email: user.email || '',
            nome_completo: null,
            telefone: null,
            role: null,
            celula_id: null,
            celula_nome: null,
            created_at: user.created_at,
            last_sign_in_at: user.last_sign_in_at || null
        };
    }

    let celulaNome = null;
    if (profile.celula_id) {
        const map = await getCelulasNamesMap(clientToUse, new Set([profile.celula_id]));
        celulaNome = map.get(profile.celula_id) || null;
    }

    return { ...profile, celula_nome: celulaNome, last_sign_in_at: user.last_sign_in_at };
}

export async function updateUserProfileData(profileId: string, data: { nome_completo: string; telefone: string | null }): Promise<void> {
    const { supabase, role } = await checkUserAuthorization();
    if (!role) throw new Error("Não autorizado.");
    const { error } = await supabase.from('profiles').update(data).eq('id', profileId);
    if (error) throw error;
    revalidatePath('/profile');
}

export async function updateUserPassword(newPassword: string): Promise<{ success: boolean; message: string }> {
    const { supabase } = await checkUserAuthorization();
    if (newPassword.length < 6) return { success: false, message: "Senha muito curta." };
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { success: false, message: error.message };
    return { success: true, message: "Senha atualizada." };
}

// ============================================================================
//                               FUNÇÕES PALAVRA DA SEMANA
// ============================================================================

export async function uploadPalavraDaSemana(formData: FormData): Promise<{ success: boolean; message: string; url?: string }> {
    const { supabase, role, adminSupabase } = await checkUserAuthorization();
    if (role !== 'admin') return { success: false, message: "Não autorizado." };

    const { data: { user } } = await createServerClient().auth.getUser();
    if (!user) return { success: false, message: "Usuário inválido." };

    const titulo = formData.get('titulo') as string;
    const data_semana = formData.get('data_semana') as string;
    const descricao = formData.get('descricao') as string;
    const file = formData.get('file') as File | null;

    if (!titulo || !data_semana) return { success: false, message: "Dados incompletos." };

    const clientToUse = adminSupabase;
    const { data: existing } = await clientToUse.from('palavra_semana').select('*').eq('data_semana', data_semana).maybeSingle();

    let fileUrl = existing?.url_arquivo;

    if (file && file.size > 0) {
        const fileName = `${data_semana}-${sanitizeFileName(file.name)}`;
        const { error } = await createServerClient().storage.from('palavra_semana_files').upload(`palavra_semana/${fileName}`, file, { upsert: true });
        if (error) return { success: false, message: "Erro no upload." };
        const { data: url } = createServerClient().storage.from('palavra_semana_files').getPublicUrl(`palavra_semana/${fileName}`);
        fileUrl = url.publicUrl;
    }

    if (!fileUrl) return { success: false, message: "Arquivo obrigatório." };

    const { error } = await clientToUse.from('palavra_semana').upsert({
        id: existing?.id,
        titulo,
        descricao,
        data_semana,
        url_arquivo: fileUrl,
        created_by: user.id
    }, { onConflict: 'data_semana' });

    if (error) return { success: false, message: error.message };
    revalidatePath('/admin/palavra-semana');
    return { success: true, message: "Salvo com sucesso.", url: fileUrl };
}

export async function getPalavraDaSemana(data?: string): Promise<PalavraDaSemana | null> {
    const { supabase, role, adminSupabase } = await checkUserAuthorization();
    if (!role) return null;

    const clientToUse = role === 'admin' ? adminSupabase : supabase;
    let query = clientToUse.from('palavra_semana').select('*');

    if (data) query = query.eq('data_semana', data);
    else query = query.order('data_semana', { ascending: false }).limit(1);

    const { data: result, error } = await query.maybeSingle();
    if (error) throw error;
    return result;
}

export async function deletePalavraDaSemana(id: string): Promise<{ success: boolean; message: string }> {
    const { adminSupabase, role } = await checkUserAuthorization();
    if (role !== 'admin') return { success: false, message: "Não autorizado." };

    const { error } = await adminSupabase.from('palavra_semana').delete().eq('id', id);
    if (error) return { success: false, message: error.message };
    revalidatePath('/admin/palavra-semana');
    return { success: true, message: "Excluído." };
}

// ============================================================================
//                       FUNÇÕES PARA EVENTOS FACE A FACE
// ============================================================================

export async function criarEventoFaceAFace(newEventoData: EventoFaceAFaceFormData): Promise<string> {
    const { adminSupabase, role, profileId } = await checkUserAuthorization();
    if (role !== 'admin' || !profileId) throw new Error("Não autorizado.");

    const { data, error } = await adminSupabase.from('eventos_face_a_face').insert({
        ...newEventoData,
        criado_por_perfil_id: profileId,
        ativa_para_inscricao: false
    }).select('id').single();

    if (error) throw new Error("Erro ao criar evento: " + error.message);
    revalidatePath('/admin/eventos-face-a-face');
    return data.id;
}

export async function listarEventosFaceAFaceAdmin(searchTerm: string | null = null, tipoFilter: EventoFaceAFaceTipo | 'all' = 'all', statusFilter: 'all' | 'ativo' | 'inativo' = 'all'): Promise<EventoFaceAFaceOption[]> {
    const { adminSupabase, role } = await checkUserAuthorization();
    if (role !== 'admin') return [];

    let query = adminSupabase.from('eventos_face_a_face').select('id, nome_evento, tipo, data_inicio, data_fim, valor_total, ativa_para_inscricao').order('data_inicio', { ascending: false });

    if (searchTerm) query = query.ilike('nome_evento', `%${searchTerm}%`);
    if (tipoFilter !== 'all') query = query.eq('tipo', tipoFilter);
    if (statusFilter !== 'all') query = query.eq('ativa_para_inscricao', statusFilter === 'ativo');

    const { data, error } = await query;
    if (error) throw error;

    return data.map((e: any) => ({
        id: e.id,
        nome: e.nome_evento,
        tipo: e.tipo,
        data_inicio: e.data_inicio,
        data_fim: e.data_fim,
        valor_total: e.valor_total,
        ativa_para_inscricao: e.ativa_para_inscricao
    }));
}

export async function getEventoFaceAFace(eventoId: string): Promise<EventoFaceAFace | null> {
    const { supabase, role, adminSupabase } = await checkUserAuthorization();
    if (!role) return null;

    const clientToUse = role === 'admin' ? adminSupabase : supabase;
    let query = clientToUse.from('eventos_face_a_face').select('*').eq('id', eventoId);

    if (role === 'líder') {
        query = query.eq('ativa_para_inscricao', true).gte('data_limite_entrada', format(new Date(), 'yyyy-MM-dd'));
    }

    const { data, error } = await query.single();
    if (error && error.code === 'PGRST116') return null;
    if (error) throw error;
    return data as EventoFaceAFace;
}

export async function atualizarEventoFaceAFace(eventoId: string, updatedData: EventoFaceAFaceFormData): Promise<void> {
    const { adminSupabase, role } = await checkUserAuthorization();
    if (role !== 'admin') throw new Error("Não autorizado.");

    const { error } = await adminSupabase.from('eventos_face_a_face').update(updatedData).eq('id', eventoId);
    if (error) throw error;
    revalidatePath('/admin/eventos-face-a-face');
}

export async function excluirEventoFaceAFace(eventoId: string): Promise<void> {
    const { adminSupabase, role } = await checkUserAuthorization();
    if (role !== 'admin') throw new Error("Não autorizado.");

    const { error } = await adminSupabase.from('eventos_face_a_face').delete().eq('id', eventoId);
    if (error) throw error;
    revalidatePath('/admin/eventos-face-a-face');
}

export async function toggleAtivacaoEventoFaceAFace(eventoId: string, currentStatus: boolean): Promise<void> {
    const { adminSupabase, role } = await checkUserAuthorization();
    if (role !== 'admin') throw new Error("Não autorizado.");

    const { error } = await adminSupabase.from('eventos_face_a_face').update({ ativa_para_inscricao: !currentStatus }).eq('id', eventoId);
    if (error) throw error;
    revalidatePath('/admin/eventos-face-a-face');
}

// ============================================================================
//               FUNÇÕES PARA INSCRIÇÕES FACE A FACE
// ============================================================================

export async function listarEventosFaceAFaceAtivos(): Promise<EventoFaceAFace[]> {
    const { supabase, role } = await checkUserAuthorization();
    if (!role) return [];

    const today = format(new Date(), 'yyyy-MM-dd');
    const { data, error } = await supabase
        .from('eventos_face_a_face')
        .select('*')
        .eq('ativa_para_inscricao', true)
        .gte('data_limite_entrada', today)
        .order('data_inicio', { ascending: true });

    if (error) throw error;
    return data as EventoFaceAFace[];
}

export async function criarInscricaoFaceAFace(inscricaoData: InscricaoFaceAFaceFormData): Promise<string> {
    const { supabase, role, profileId, celulaId } = await checkUserAuthorization();
    if (role !== 'líder' || !profileId || !celulaId) throw new Error("Não autorizado.");

    const { data: evento } = await supabase.from('eventos_face_a_face')
        .select('id')
        .eq('id', inscricaoData.evento_id)
        .eq('ativa_para_inscricao', true)
        .gte('data_limite_entrada', format(new Date(), 'yyyy-MM-dd'))
        .single();

    if (!evento) throw new Error("Evento indisponível.");

    const { data, error } = await supabase.from('inscricoes_face_a_face').insert({
        ...inscricaoData,
        inscrito_por_perfil_id: profileId,
        celula_inscricao_id: celulaId,
        status_pagamento: 'PENDENTE',
        admin_confirmou_entrada: false,
        admin_confirmou_restante: false
    }).select('id').single();

    if (error) throw error;
    revalidatePath(`/eventos-face-a-face/${inscricaoData.evento_id}/minhas-inscricoes`);
    return data.id;
}

export async function listarInscricoesFaceAFacePorEvento(
    eventoId: string,
    filters?: { statusPagamento?: InscricaoFaceAFaceStatus | 'all'; celulaId?: string | 'all'; searchTerm?: string; tipoParticipacao?: InscricaoFaceAFaceTipoParticipacao; }
): Promise<InscricaoFaceAFace[]> {
    const { adminSupabase, role } = await checkUserAuthorization();
    if (role !== 'admin') throw new Error("Não autorizado.");

    let query = adminSupabase.from('inscricoes_face_a_face').select(`
        *,
        celula_participante_nome:celulas!celula_id(nome),
        celula_inscricao_nome:celulas!celula_inscricao_id(nome),
        evento_nome:eventos_face_a_face(nome_evento)
    `).eq('evento_id', eventoId);

    if (filters?.statusPagamento && filters.statusPagamento !== 'all') query = query.eq('status_pagamento', filters.statusPagamento);
    if (filters?.celulaId && filters.celulaId !== 'all') query = query.or(`celula_id.eq.${filters.celulaId},celula_inscricao_id.eq.${filters.celulaId}`);
    if (filters?.searchTerm) query = query.or(`nome_completo_participante.ilike.%${filters.searchTerm}%,contato_pessoal.ilike.%${filters.searchTerm}%`);
    if (filters?.tipoParticipacao) query = query.eq('tipo_participacao', filters.tipoParticipacao);

    const { data, error } = await query.order('nome_completo_participante', { ascending: true });
    if (error) throw error;

    return data.map((i: any) => ({
        ...i,
        celula_participante_nome: i.celula_participante_nome?.nome,
        celula_inscricao_nome: i.celula_inscricao_nome?.nome,
        evento_nome: i.evento_nome?.nome_evento
    })) as InscricaoFaceAFace[];
}

export async function getInscricaoFaceAFace(inscricaoId: string): Promise<InscricaoFaceAFace | null> {
    const { adminSupabase, role } = await checkUserAuthorization();
    if (role !== 'admin') throw new Error("Não autorizado.");

    const { data, error } = await adminSupabase.from('inscricoes_face_a_face').select(`
        *,
        celula_participante_nome:celulas!celula_id(nome),
        celula_inscricao_nome:celulas!celula_inscricao_id(nome),
        evento_nome:eventos_face_a_face(nome_evento, valor_total, valor_entrada)
    `).eq('id', inscricaoId).single();

    if (error && error.code === 'PGRST116') return null;
    if (error) throw error;

    return {
        ...data,
        celula_participante_nome: (data as any).celula_participante_nome?.nome,
        celula_inscricao_nome: (data as any).celula_inscricao_nome?.nome,
        evento_nome: (data as any).evento_nome?.nome_evento,
        valor_total_evento: (data as any).evento_nome?.valor_total,
        valor_entrada_evento: (data as any).evento_nome?.valor_entrada
    } as InscricaoFaceAFace;
}

export async function atualizarInscricaoFaceAFaceAdmin(inscricaoId: string, updatedFields: any): Promise<void> {
    const { adminSupabase, role } = await checkUserAuthorization();
    if (role !== 'admin') throw new Error("Não autorizado.");
    const { error } = await adminSupabase.from('inscricoes_face_a_face').update(updatedFields).eq('id', inscricaoId);
    if (error) throw error;
    revalidatePath('/admin/eventos-face-a-face');
}

export async function excluirInscricaoFaceAFace(inscricaoId: string): Promise<void> {
    const { adminSupabase, role } = await checkUserAuthorization();
    if (role !== 'admin') throw new Error("Não autorizado.");
    const { error } = await adminSupabase.from('inscricoes_face_a_face').delete().eq('id', inscricaoId);
    if (error) throw error;
    revalidatePath('/admin/eventos-face-a-face');
}

export async function exportarInscricoesCSV(eventoId: string, filters?: any): Promise<string> {
    const { adminSupabase, role } = await checkUserAuthorization();
    if (role !== 'admin') throw new Error("Não autorizado.");

    // (Reutilizando a lógica da função original para CSV que já era bem extensa,
    // mas garantindo que usamos o adminSupabase)
    let query = adminSupabase.from('inscricoes_face_a_face').select(`
        id, nome_completo_participante, cpf, idade, rg, contato_pessoal, contato_emergencia,
        endereco_completo, bairro, cidade, data_nascimento, estado_civil, nome_esposo, tamanho_camiseta,
        eh_membro_ib_apascentar, celula_id, lider_celula_nome, pertence_outra_igreja, nome_outra_igreja,
        dificuldade_dormir_beliche, restricao_alimentar, deficiencia_fisica_mental, toma_medicamento_controlado,
        descricao_sonhos, tipo_participacao, status_pagamento, admin_confirmou_entrada, data_upload_entrada,
        caminho_comprovante_entrada, admin_confirmou_restante, data_upload_restante, caminho_comprovante_restante,
        admin_observacao_pagamento, inscrito_por_perfil_id, celula_inscricao_id, created_at, updated_at,
        celula_participante_nome:celulas!celula_id(nome),
        celula_inscricao_nome:celulas!celula_inscricao_id(nome),
        evento_detalhes:eventos_face_a_face(nome_evento,tipo,data_inicio,data_fim,valor_total,valor_entrada,data_limite_entrada,chave_pix_admin)
    `).eq('evento_id', eventoId);

    if (filters?.statusPagamento && filters.statusPagamento !== 'all') query = query.eq('status_pagamento', filters.statusPagamento);
    if (filters?.celulaId && filters.celulaId !== 'all') query = query.or(`celula_id.eq.${filters.celulaId},celula_inscricao_id.eq.${filters.celulaId}`);
    if (filters?.searchTerm) query = query.or(`nome_completo_participante.ilike.%${filters.searchTerm}%,contato_pessoal.ilike.%${filters.searchTerm}%`);
    if (filters?.tipoParticipacao) query = query.eq('tipo_participacao', filters.tipoParticipacao);

    const { data, error } = await query.order('nome_completo_participante', { ascending: true });
    if (error) throw error;
    if (!data || data.length === 0) return "Nenhuma inscrição encontrada.\n";

    const escape = (val: any) => {
        if (val === null || val === undefined) return '';
        const s = String(val);
        return (s.includes(',') || s.includes('"') || s.includes('\n')) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const headers = [
        "ID", "Nome", "Idade", "Nascimento", "CPF", "RG", "Contato", "Emergência", "Endereço", "Bairro", "Cidade",
        "Estado Civil", "Cônjuge", "Camiseta", "Tipo", "Membro IBA", "Célula Part.", "Outra Igreja", "Nome Igreja",
        "Beliche", "Alimentação", "Deficiência", "Remédio", "Sonhos", "Status", "Conf. Entrada", "Data Entrada", "URL Entrada",
        "Conf. Restante", "Data Restante", "URL Restante", "Obs Admin", "Líder ID", "Célula Líder", "Criado em", "Evento"
    ];

    let csv = headers.join(',') + '\n';
    data.forEach((i: any) => {
        csv += [
            i.id, i.nome_completo_participante, i.idade, i.data_nascimento, i.cpf, i.rg, i.contato_pessoal, i.contato_emergencia,
            i.endereco_completo, i.bairro, i.cidade, i.estado_civil, i.nome_esposo, i.tamanho_camiseta, i.tipo_participacao,
            i.eh_membro_ib_apascentar ? 'Sim' : 'Não', i.celula_participante_nome?.nome, i.pertence_outra_igreja ? 'Sim' : 'Não', i.nome_outra_igreja,
            i.dificuldade_dormir_beliche ? 'Sim' : 'Não', i.restricao_alimentar ? 'Sim' : 'Não', i.deficiencia_fisica_mental ? 'Sim' : 'Não', i.toma_medicamento_controlado ? 'Sim' : 'Não',
            i.descricao_sonhos, i.status_pagamento, i.admin_confirmou_entrada ? 'Sim' : 'Não', i.data_upload_entrada, i.caminho_comprovante_entrada,
            i.admin_confirmou_restante ? 'Sim' : 'Não', i.data_upload_restante, i.caminho_comprovante_restante, i.admin_observacao_pagamento,
            i.inscrito_por_perfil_id, i.celula_inscricao_nome?.nome, i.created_at, i.evento_detalhes?.nome_evento
        ].map(escape).join(',') + '\n';
    });
    return csv;
}

export async function listarMinhasInscricoesFaceAFacePorEvento(eventoId: string): Promise<InscricaoFaceAFace[]> {
    const { supabase, profileId } = await checkUserAuthorization();
    if (!profileId) return [];

    const { data, error } = await supabase.from('inscricoes_face_a_face').select(`
        *,
        celula_participante_nome:celulas!celula_id(nome),
        celula_inscricao_nome:celulas!celula_inscricao_id(nome),
        evento_nome:eventos_face_a_face(nome_evento, valor_total, valor_entrada)
    `).eq('evento_id', eventoId).eq('inscrito_por_perfil_id', profileId).order('nome_completo_participante', { ascending: true });

    if (error) throw error;

    return data.map((i: any) => ({
        ...i,
        celula_participante_nome: i.celula_participante_nome?.nome,
        celula_inscricao_nome: i.celula_inscricao_nome?.nome,
        evento_nome: i.evento_nome?.nome_evento,
        valor_total_evento: i.evento_nome?.valor_total,
        valor_entrada_evento: i.evento_nome?.valor_entrada
    })) as InscricaoFaceAFace[];
}

export async function getInscricaoFaceAFaceParaLider(inscricaoId: string): Promise<InscricaoFaceAFace | null> {
    const { supabase, profileId } = await checkUserAuthorization();
    if (!profileId) return null;

    const { data, error } = await supabase.from('inscricoes_face_a_face').select(`
        *,
        celula_participante_nome:celulas!celula_id(nome),
        celula_inscricao_nome:celulas!celula_inscricao_id(nome),
        evento_detalhes:eventos_face_a_face(nome_evento, valor_total, valor_entrada, chave_pix_admin, data_limite_entrada)
    `).eq('id', inscricaoId).eq('inscrito_por_perfil_id', profileId).single();

    if (error && error.code === 'PGRST116') return null;
    if (error) throw error;

    return {
        ...data,
        celula_participante_nome: (data as any).celula_participante_nome?.nome,
        celula_inscricao_nome: (data as any).celula_inscricao_nome?.nome,
        evento_nome: (data as any).evento_detalhes?.nome_evento,
        valor_total_evento: (data as any).evento_detalhes?.valor_total,
        valor_entrada_evento: (data as any).evento_detalhes?.valor_entrada
    } as InscricaoFaceAFace;
}

export async function atualizarInscricaoFaceAFaceLider(inscricaoId: string, updatedData: Partial<InscricaoFaceAFace>): Promise<void> {
    const { supabase, profileId } = await checkUserAuthorization();
    if (!profileId) throw new Error("Não autorizado.");

    const { status_pagamento, admin_confirmou_entrada, admin_confirmou_restante, inscrito_por_perfil_id, ...safeData } = updatedData;

    const { error } = await supabase.from('inscricoes_face_a_face').update(safeData).eq('id', inscricaoId).eq('inscrito_por_perfil_id', profileId);
    if (error) throw error;
    revalidatePath(`/eventos-face-a-face/*/minhas-inscricoes`);
}

export async function uploadComprovanteFaceAFace(inscricaoId: string, tipo: 'entrada' | 'restante', file: File): Promise<string> {
    const { supabase, profileId } = await checkUserAuthorization();
    if (!profileId) throw new Error("Não autorizado.");

    const { data: inscricao } = await supabase.from('inscricoes_face_a_face').select('id, evento_id, status_pagamento').eq('id', inscricaoId).eq('inscrito_por_perfil_id', profileId).single();
    if (!inscricao) throw new Error("Inscrição não encontrada.");

    const fileName = `${tipo}_${Date.now()}_${sanitizeFileName(file.name)}`;
    const filePath = `comprovantes/${inscricao.evento_id}/${inscricao.id}/${fileName}`;

    const { error: uploadError } = await createServerClient().storage.from('comprovantes_face_a_face').upload(filePath, file);
    if (uploadError) throw new Error("Erro upload: " + uploadError.message);

    const { data: urlData } = createServerClient().storage.from('comprovantes_face_a_face').getPublicUrl(filePath);
    const fileUrl = urlData.publicUrl;

    const updateData: any = {};
    const now = new Date().toISOString();

    if (tipo === 'entrada') {
        updateData.caminho_comprovante_entrada = fileUrl;
        updateData.data_upload_entrada = now;
        if (inscricao.status_pagamento === 'PENDENTE') updateData.status_pagamento = 'AGUARDANDO_CONFIRMACAO_ENTRADA';
    } else {
        updateData.caminho_comprovante_restante = fileUrl;
        updateData.data_upload_restante = now;
        if (inscricao.status_pagamento === 'ENTRADA_CONFIRMADA') updateData.status_pagamento = 'AGUARDANDO_CONFIRMACAO_RESTANTE';
    }

    const { error } = await supabase.from('inscricoes_face_a_face').update(updateData).eq('id', inscricaoId);
    if (error) throw error;
    revalidatePath(`/eventos-face-a-face/*/minhas-inscricoes`);
    return fileUrl;
}

// ============================================================================
//                       FUNÇÕES DE GERAÇÃO E VALIDAÇÃO DE CONVITE (REFEITAS)
// ============================================================================

/**
 * GERA O LINK DE CONVITE.
 * Esta função chama uma RPC no Supabase que cria o convite com token e data de expiração.
 * A lógica crítica de criação está centralizada e segura no banco de dados.
 */
export async function gerarLinkConvite(eventoId: string, nomeCandidato?: string): Promise<{ success: boolean; url?: string; message?: string }> {
    const { supabase, role, celulaId, profileId } = await checkUserAuthorization();
    
    if (role !== 'líder' || !celulaId || !profileId) {
        return { success: false, message: "Apenas líderes com célula podem gerar links." };
    }

    const { data: evento, error: eventoError } = await supabase
        .from('eventos_face_a_face')
        .select('ativa_para_inscricao')
        .eq('id', eventoId)
        .single();
        
    if (eventoError || !evento?.ativa_para_inscricao) {
        return { success: false, message: "Este evento não está aceitando inscrições no momento." };
    }

    try {
        const { data: token, error } = await supabase.rpc('gerar_convite_24h', {
            p_evento_id: eventoId,
            p_celula_id: celulaId,
            p_gerado_por_perfil_id: profileId,
            p_nome_candidato_sugerido: nomeCandidato || null
        });

        if (error) {
            console.error("Erro ao chamar RPC 'gerar_convite_24h':", error);
            return { success: false, message: "Erro ao gerar link no banco de dados." };
        }
        
        if (!token) {
             return { success: false, message: "Falha ao receber o token de volta do banco de dados." };
        }

        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://gestao-celulas.vercel.app';
        const fullUrl = `${baseUrl}/convite/${token}`;

        return { success: true, url: fullUrl };

    } catch (e: any) {
        console.error("Erro inesperado em gerarLinkConvite:", e);
        return { success: false, message: "Ocorreu um erro inesperado." };
    }
}

/**
 * VALIDA O CONVITE NA PÁGINA PÚBLICA.
 * Esta função é chamada pela página do convite para verificar se o token é válido.
 */
export async function validarConvitePublico(token: string) {
    // Usa o Admin Client, pois esta é uma página pública sem usuário logado.
    const supabase = createAdminClient();

    // 1. Busca o convite pelo token.
    const { data: convite, error: conviteError } = await supabase
        .from('convites_inscricao')
        .select('*')
        .eq('token', token)
        .single();

    if (conviteError || !convite) {
        console.error(`Convite não encontrado para o token: ${token}`, conviteError);
        return { valido: false, motivo: 'Convite não encontrado.' };
    }

    // 2. Verifica se o convite já foi usado.
    if (convite.usado) {
        return { valido: false, motivo: 'Este link de convite já foi utilizado.' };
    }

    // 3. Verifica se o convite expirou.
    if (isAfter(new Date(), new Date(convite.expira_em))) {
        return { valido: false, motivo: 'O prazo para usar este convite expirou (validade de 24h).' };
    }

    // 4. Se o convite é válido, busca os dados relacionados em paralelo.
    const [eventoResult, liderResult, celulaResult] = await Promise.all([
        supabase.from('eventos_face_a_face').select('*').eq('id', convite.evento_id).single(),
        supabase.from('profiles').select('nome_completo').eq('id', convite.gerado_por_perfil_id).single(),
        supabase.from('celulas').select('nome').eq('id', convite.celula_id).single()
    ]);

    const { data: evento_detalhes, error: eventoError } = eventoResult;

    if (eventoError || !evento_detalhes) {
        return { valido: false, motivo: 'O evento associado a este convite não foi encontrado ou foi removido.' };
    }
    
    if (!evento_detalhes.ativa_para_inscricao) {
        return { valido: false, motivo: 'As inscrições para este evento foram encerradas pela organização.' };
    }
    
    // 5. Retorna sucesso com todos os dados necessários para a página.
    return { 
        valido: true, 
        dados: {
            evento: evento_detalhes,
            celula: celulaResult.data,
            lider: liderResult.data,
            convite_id: convite.id,
            nome_candidato_sugerido: convite.nome_candidato_sugerido
        }
    };
}

/**
 * Processa a inscrição vinda da página pública.
 */
export async function processarInscricaoPublica(token: string, formData: any): Promise<{ success: boolean; message: string; inscricaoId?: string }> {
    const supabase = createAdminClient();

    const validacao = await validarConvitePublico(token);
    if (!validacao.valido || !validacao.dados) {
        return { success: false, message: validacao.motivo || 'Erro de validação.' };
    }

    const { evento, convite_id } = validacao.dados;

    const { data: conviteOriginal } = await supabase
        .from('convites_inscricao')
        .select('celula_id, gerado_por_perfil_id')
        .eq('id', convite_id)
        .single();

    if (!conviteOriginal) {
        return { success: false, message: "Erro interno: Convite original não localizado." };
    }

    try {
        const dadosInscricao = {
            evento_id: evento.id,
            nome_completo_participante: formData.nome_completo_participante,
            cpf: formData.cpf,
            rg: formData.rg,
            data_nascimento: formData.data_nascimento,
            idade: formData.idade,
            contato_pessoal: formData.contato_pessoal,
            contato_emergencia: formData.contato_emergencia,
            endereco_completo: formData.endereco_completo,
            bairro: formData.bairro,
            cidade: formData.cidade,
            estado_civil: formData.estado_civil,
            nome_esposo: formData.nome_esposo,
            tamanho_camiseta: formData.tamanho_camiseta,
            tipo_participacao: formData.tipo_participacao,
            eh_membro_ib_apascentar: formData.eh_membro_ib_apascentar,
            pertence_outra_igreja: formData.pertence_outra_igreja,
            nome_outra_igreja: formData.nome_outra_igreja,
            dificuldade_dormir_beliche: formData.dificuldade_dormir_beliche,
            restricao_alimentar: formData.restricao_alimentar,
            deficiencia_fisica_mental: formData.deficiencia_fisica_mental,
            toma_medicamento_controlado: formData.toma_medicamento_controlado,
            descricao_sonhos: formData.descricao_sonhos,
            celula_inscricao_id: conviteOriginal.celula_id,
            inscrito_por_perfil_id: conviteOriginal.gerado_por_perfil_id,
            status_pagamento: 'PENDENTE' as InscricaoFaceAFaceStatus,
            admin_confirmou_entrada: false,
            admin_confirmou_restante: false,
            celula_id: formData.eh_membro_ib_apascentar ? formData.celula_id : null, // Associa a célula só se for membro
        };

        const { data: novaInscricao, error: insertError } = await supabase
            .from('inscricoes_face_a_face')
            .insert(dadosInscricao)
            .select('id')
            .single();

        if (insertError) {
            console.error("Erro ao salvar inscrição pública:", insertError);
            return { success: false, message: "Erro ao salvar os dados. Verifique os campos e tente novamente." };
        }

        await supabase.from('convites_inscricao').update({ usado: true, usado_por_inscricao_id: novaInscricao.id }).eq('id', convite_id);

        return { success: true, message: "Inscrição realizada com sucesso!", inscricaoId: novaInscricao.id };

    } catch (e: any) {
        console.error("Falha na server action processarInscricaoPublica:", e);
        return { success: false, message: "Ocorreu um erro inesperado ao processar sua inscrição." };
    }
}