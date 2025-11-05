// src/lib/data.ts

'use server';

import { createServerClient, createAdminClient } from '@/utils/supabase/server'; 
import { revalidatePath } from 'next/cache';
import { format, isSameMonth, parseISO, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ============================================================================
//                                DEFINIÇÕES DE TIPOS
// ============================================================================

export interface Membro {
  id: string;
  celula_id: string;
  nome: string;
  telefone: string | null;
  data_ingresso: string;
  data_nascimento: string | null;
  endereco: string | null;
  status: 'Ativo' | 'Inativo' | 'Em transição'; 
  celula_nome?: string | null; 
}

export interface Visitante {
  id: string;
  celula_id: string;
  nome: string;
  telefone: string | null;
  data_primeira_visita: string;
  endereco: string | null;
  data_ultimo_contato: string | null;
  observacoes: string | null;
  celula_nome?: string | null; 
}

export interface Reuniao {
  id: string;
  celula_id: string;
  data_reuniao: string;
  tema: string;
  ministrador_principal: string | null;
  ministrador_secundario: string | null;
  responsavel_kids: string | null;
  caminho_pdf: string | null;
  created_at: string;
}

export interface ReuniaoComNomes extends Omit<Reuniao, 'ministrador_principal' | 'ministrador_secundario' | 'responsavel_kids'> {
    ministrador_principal_nome: string | null;
    ministrador_secundario_nome: string | null;
    responsavel_kids_nome: string | null;
    num_criancas: number;
    celula_nome?: string | null; 
}

export interface ReuniaoFormData {
    data_reuniao: string;
    tema: string;
    ministrador_principal: string | null;
    ministrador_secundario: string | null;
    responsavel_kids: string | null;
    caminho_pdf?: string | null;
    celula_id?: string;
}

export interface MembroComPresenca extends Membro {
    presente: boolean;
}

export interface VisitanteComPresenca {
    visitante_id: string;
    nome: string;
    telefone: string | null;
    presente: boolean;
    celula_nome?: string | null; 
}

export interface CelulaOption {
    id: string;
    nome: string;
}

export interface ReuniaoDetalhesParaResumo {
    id: string;
    data_reuniao: string;
    tema: string;
    ministrador_principal_nome: string | null;
    ministrador_secundario_nome: string | null;
    responsavel_kids_nome: string | null;
    num_criancas: number;
    celula_nome: string | null;
    caminho_pdf: string | null;
    membros_presentes: { id: string; nome: string; telefone: string | null }[];
    membros_ausentes: { id: string; nome: string; telefone: string | null }[];
    visitantes_presentes: { id: string; nome: string; telefone: string | null }[];
}

export interface Profile {
    id: string;
    email: string;
    nome_completo: string | null;
    telefone: string | null;
    role: 'admin' | 'líder' | null;
    celula_id: string | null;
    celula_nome: string | null;
    created_at: string;
}

export interface PalavraDaSemana {
    id: string;
    titulo: string;
    descricao: string | null;
    url_arquivo: string;
    data_semana: string;
    created_at: string;
    created_by?: string | null;
    created_by_email?: string | null;
}


// ============================================================================
//                          FUNÇÕES AUXILIARES
// ============================================================================

async function checkUserAuthorization(): Promise<{
    supabaseUser: any;
    supabaseAdmin: any;
    role: 'admin' | 'líder' | null;
    celulaId: string | null;
}> {
    const supabaseUser = createServerClient(); 
    const supabaseAdmin = createAdminClient();
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();

    if (userError || !user) {
        console.warn('checkUserAuthorization: Usuário não autenticado.');
        return { supabaseUser, supabaseAdmin, role: null, celulaId: null };
    }

    const { data: profileData, error: profileError } = await supabaseUser
        .from('profiles')
        .select('celula_id, role')
        .eq('id', user.id)
        .single();

    if (profileError || !profileData) {
        console.error('checkUserAuthorization: Erro ao buscar perfil:', profileError?.message || 'Perfil não encontrado.');
        return { supabaseUser, supabaseAdmin, role: null, celulaId: null };
    }

    return { 
        supabaseUser, 
        supabaseAdmin, 
        role: profileData.role as 'admin' | 'líder', 
        celulaId: profileData.celula_id 
    };
}

async function getCelulasNamesMap(celulaIds: Set<string>, supabaseInstance: any): Promise<Map<string, string>> {
    let namesMap = new Map<string, string>();
    if (celulaIds.size === 0) return namesMap;

    const { data, error } = await supabaseInstance
        .from('celulas')
        .select('id, nome')
        .in('id', Array.from(celulaIds));

    if (error) {
        console.error("Erro ao buscar nomes de células (getCelulasNamesMap):", error);
    } else {
        data?.forEach(c => namesMap.set(c.id, c.nome));
    }
    return namesMap;
}

// --- INÍCIO DA CORREÇÃO ---
// Função auxiliar para sanitizar nomes de arquivos
function sanitizeFileName(fileName: string): string {
    // Normaliza para decompor caracteres acentuados (ex: 'é' -> 'e' + '´')
    const normalized = fileName.normalize('NFD');
    // Remove os diacríticos (acentos)
    const withoutAccents = normalized.replace(/[\u0300-\u036f]/g, '');
    // Substitui espaços e caracteres não alfanuméricos (exceto ponto e hífen) por underscore
    const sanitized = withoutAccents.replace(/[^a-zA-Z0-9._-]/g, '_');
    return sanitized;
}
// --- FIM DA CORREÇÃO ---


// ============================================================================
//                            FUNÇÃO: listarCelulasParaAdmin
// ============================================================================
export async function listarCelulasParaAdmin(): Promise<CelulaOption[]> {
    const { supabaseAdmin, role } = await checkUserAuthorization();

    if (role !== 'admin') {
        console.warn("listarCelulasParaAdmin: Apenas administradores podem listar todas as células.");
        return []; 
    }

    try {
        const { data, error } = await supabaseAdmin 
            .from('celulas')
            .select('id, nome')
            .order('nome', { ascending: true });

        if (error) {
            console.error("Erro ao listar células para admin:", error);
            throw new Error(`Falha ao carregar células: ${error.message}`);
        }
        return data || [];
    } catch (e: any) {
        console.error("Erro na Server Action listarCelulasParaAdmin:", e.message);
        throw e;
    }
}


// ============================================================================
//                               FUNÇÕES DE MEMBROS
// (Omitidas para brevidade, mas devem ser mantidas no seu arquivo como estavam)
// ============================================================================
export async function listarMembros(
    celulaIdFilter: string | null = null,
    searchTerm: string | null = null, 
    birthdayMonth: number | null = null,
    statusFilter: Membro['status'] | 'all' = 'all',
): Promise<Membro[]> {
    const { supabaseUser, supabaseAdmin, role, celulaId } = await checkUserAuthorization();
    const supabase = role === 'admin' ? supabaseAdmin : supabaseUser;
    if (!role) { return []; }
    let query = supabase.from('membros').select('*');
    if (role === 'líder') { if (!celulaId) { return []; } query = query.eq('celula_id', celulaId); } 
    else if (role === 'admin' && celulaIdFilter) { query = query.eq('celula_id', celulaIdFilter); }
    if (birthdayMonth !== null && birthdayMonth >= 1 && birthdayMonth <= 12) { query = query.filter('EXTRACT(MONTH FROM data_nascimento)::int', 'eq', birthdayMonth); }
    if (statusFilter !== 'all') { query = query.eq('status', statusFilter); }
    const { data, error } = await query.order('nome', { ascending: true });
    if (error) { throw new Error(`Falha ao carregar membros: ${error.message}`); }
    const membros = data || [];
    if (membros.length === 0) return [];
    const celulaIds = new Set(membros.map(m => m.celula_id));
    const celulasNamesMap = await getCelulasNamesMap(celulaIds, supabase);
    return membros.map(m => ({ ...m, celula_nome: celulasNamesMap.get(m.celula_id) || null }));
}

export async function adicionarMembro(newMembroData: Omit<Membro, 'id' | 'celula_id' | 'created_at' | 'celula_nome'> & { celula_id?: string }): Promise<string> {
    const { supabaseUser, supabaseAdmin, role, celulaId } = await checkUserAuthorization();
    const supabase = role === 'admin' ? supabaseAdmin : supabaseUser;
    if (!role) { throw new Error("Não autorizado: Usuário não autenticado ou role inválida."); }
    let targetCelulaIdForInsert: string | null = (role === 'líder') ? celulaId : newMembroData.celula_id || celulaId;
    if (!targetCelulaIdForInsert) { throw new Error("ID da célula é necessário para adicionar um membro."); }
    const { data, error } = await supabase.from('membros').insert({ ...newMembroData, celula_id: targetCelulaIdForInsert, status: newMembroData.status || 'Ativo' }).select('id').single();
    if (error) { console.error("Erro ao adicionar membro:", error); throw error; }
    revalidatePath('/membros');
    return data.id;
}

export async function getMembro(membroId: string): Promise<Membro | null> {
    const { supabaseUser, supabaseAdmin, role, celulaId } = await checkUserAuthorization();
    const supabase = role === 'admin' ? supabaseAdmin : supabaseUser;
    if (!role) return null;
    let query = supabase.from('membros').select('*').eq('id', membroId);
    if (role === 'líder') { if (!celulaId) return null; query = query.eq('celula_id', celulaId); }
    const { data, error } = await query.single();
    if (error) { console.error("Erro ao buscar membro:", error); if (error.code === 'PGRST116') return null; throw error; }
    return data;
}

export async function atualizarMembro(membroId: string, updatedMembroData: Omit<Membro, 'id' | 'celula_id' | 'created_at' | 'celula_nome'>): Promise<void> {
    const { supabaseUser, supabaseAdmin, role, celulaId } = await checkUserAuthorization();
    const supabase = role === 'admin' ? supabaseAdmin : supabaseUser;
    if (!role) throw new Error("Não autorizado");
    let query = supabase.from('membros').update(updatedMembroData).eq('id', membroId);
    if (role === 'líder') { if (!celulaId) throw new Error("Não autorizado"); query = query.eq('celula_id', celulaId); }
    const { error } = await query;
    if (error) { console.error("Erro ao atualizar membro:", error); throw error; }
    revalidatePath('/membros');
    revalidatePath(`/membros/editar/${membroId}`);
}

export async function excluirMembro(membroId: string): Promise<void> {
    const { supabaseUser, supabaseAdmin, role, celulaId } = await checkUserAuthorization();
    const supabase = role === 'admin' ? supabaseAdmin : supabaseUser;
    if (!role) throw new Error("Não autorizado");
    let query = supabase.from('membros').delete().eq('id', membroId);
    if (role === 'líder') { if (!celulaId) throw new Error("Não autorizado"); query = query.eq('celula_id', celulaId); }
    const { error } = await query;
    if (error) { console.error("Erro ao excluir membro:", error); throw new Error(`Falha ao excluir membro: ${error.message}`); }
    revalidatePath('/membros');
}
export async function importarMembrosCSV(csvString: string): Promise<ImportMembroResult> {
    const { supabaseUser, role, celulaId } = await checkUserAuthorization();
    const supabase = supabaseUser; // usa cliente de usuário
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
            if (!['Ativo', 'Inativo', 'Em transição'].includes(status)) throw new Error("Status inválido. Use 'Ativo', 'Inativo' ou 'Em transição'.");
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
                if (singleInsertError) { errors.push({ rowIndex: errors.length + 1, data: member, error: `Falha: ${singleInsertError.message}` }); }
                else { importedCount++; }
            }
            if (errors.length === 0) { errors.push({ rowIndex: -1, data: null, error: `Erro em lote: ${batchError.message}` }); }
        } else { importedCount = membersToInsert.length; }
    }
    revalidatePath('/membros');
    return { success: errors.length === 0 && importedCount > 0, message: `Importação com ${importedCount} sucessos e ${errors.length} erros.`, importedCount, errors };
}
export async function exportarMembrosCSV(celulaIdFilter: string | null, searchTerm: string | null, birthdayMonth: number | null, statusFilter: Membro['status'] | 'all'): Promise<string> {
    const { supabaseUser, supabaseAdmin, role, celulaId } = await checkUserAuthorization();
    const supabase = role === 'admin' ? supabaseAdmin : supabaseUser;
    if (!role) { throw new Error("Não autorizado."); }
    let query = supabase.from('membros').select('*');
    if (role === 'líder') { if (!celulaId) { throw new Error("ID da célula é necessário."); } query = query.eq('celula_id', celulaId); } 
    else if (role === 'admin' && celulaIdFilter) { query = query.eq('celula_id', celulaIdFilter); }
    if (searchTerm) { query = query.or(`nome.ilike.%${searchTerm}%,telefone.ilike.%${searchTerm}%`); }
    if (birthdayMonth !== null && birthdayMonth >= 1 && birthdayMonth <= 12) { query = query.filter('EXTRACT(MONTH FROM data_nascimento)::int', 'eq', birthdayMonth); }
    if (statusFilter !== 'all') { query = query.eq('status', statusFilter); }
    const { data: membros, error } = await query.order('nome', { ascending: true });
    if (error) { throw new Error(`Falha ao carregar membros para exportação: ${error.message}`); }
    if (!membros || membros.length === 0) return "Nome,Telefone,Data de Ingresso,Data de Nascimento,Endereço,Status,Célula\n";
    const celulaIds = new Set(membros.map(m => m.celula_id)); const celulasNamesMap = await getCelulasNamesMap(celulaIds, supabase);
    const headers = ["Nome", "Telefone", "Data de Ingresso", "Data de Nascimento", "Endereço", "Status", "Célula"]; let csv = headers.join(',') + '\n';
    membros.forEach(m => { const row = [`"${m.nome}"`, `"${m.telefone || ''}"`, `"${m.data_ingresso}"`, `"${m.data_nascimento || ''}"`, `"${m.endereco || ''}"`, `"${m.status || 'Ativo'}"`, `"${celulasNamesMap.get(m.celula_id) || 'N/A'}"`]; csv += row.join(',') + '\n'; });
    return csv;
}

export async function listarVisitantes(celulaIdFilter: string | null = null, searchTerm: string | null = null, minDaysSinceLastContact: number | null = null): Promise<Visitante[]> {
    const { supabaseUser, supabaseAdmin, role, celulaId } = await checkUserAuthorization();
    const supabase = role === 'admin' ? supabaseAdmin : supabaseUser;
    if (!role) { return []; }
    let query = supabase.from('visitantes').select('*');
    if (role === 'líder') { if (!celulaId) { return []; } query = query.eq('celula_id', celulaId); }
    else if (role === 'admin' && celulaIdFilter) { query = query.eq('celula_id', celulaIdFilter); }
    if (minDaysSinceLastContact !== null && minDaysSinceLastContact > 0) { const cutoffDate = subDays(new Date(), minDaysSinceLastContact).toISOString().split('T')[0]; query = query.or(`data_ultimo_contato.is.null,data_ultimo_contato.lt.${cutoffDate}`); }
    const { data, error } = await query.order('nome', { ascending: true });
    if (error) { throw new Error(`Falha ao carregar visitantes: ${error.message}`); }
    const visitantes = data || []; if (visitantes.length === 0) return [];
    const celulaIds = new Set(visitantes.map(v => v.celula_id)); const celulasNamesMap = await getCelulasNamesMap(celulaIds, supabase);
    return visitantes.map(v => ({ ...v, celula_nome: celulasNamesMap.get(v.celula_id) || null }));
}

export async function adicionarVisitante(newVisitanteData: Omit<Visitante, 'id' | 'celula_id' | 'created_at' | 'celula_nome'> & { celula_id?: string }): Promise<string> {
    const { supabaseUser, supabaseAdmin, role, celulaId } = await checkUserAuthorization();
    const supabase = role === 'admin' ? supabaseAdmin : supabaseUser;
    if (!role) throw new Error("Não autorizado"); let targetCelulaIdForInsert: string | null = (role === 'líder') ? celulaId : newVisitanteData.celula_id || celulaId;
    if (!targetCelulaIdForInsert) throw new Error("ID da célula é necessário.");
    const { data, error } = await supabase.from('visitantes').insert({ ...newVisitanteData, celula_id: targetCelulaIdForInsert }).select('id').single();
    if (error) { console.error("Erro ao adicionar visitante:", error); throw error; } revalidatePath('/visitantes'); return data.id;
}
export async function getVisitante(visitanteId: string): Promise<Visitante | null> {
    const { supabaseUser, supabaseAdmin, role, celulaId } = await checkUserAuthorization();
    const supabase = role === 'admin' ? supabaseAdmin : supabaseUser;
    if (!role) return null; let query = supabase.from('visitantes').select('*').eq('id', visitanteId);
    if (role === 'líder') { if (!celulaId) return null; query = query.eq('celula_id', celulaId); }
    const { data, error } = await query.single(); if (error) { if (error.code === 'PGRST116') return null; throw error; } return data;
}
export async function atualizarVisitante(updatedVisitanteData: Omit<Visitante, 'id' | 'celula_id' | 'created_at' | 'celula_nome'>, visitanteId: string): Promise<void> {
    const { supabaseUser, supabaseAdmin, role, celulaId } = await checkUserAuthorization();
    const supabase = role === 'admin' ? supabaseAdmin : supabaseUser;
    if (!role) throw new Error("Não autorizado"); let query = supabase.from('visitantes').update(updatedVisitanteData).eq('id', visitanteId);
    if (role === 'líder') { if (!celulaId) throw new Error("Não autorizado"); query = query.eq('celula_id', celulaId); }
    const { error } = await query; if (error) { console.error("Erro ao atualizar visitante:", error); throw error; }
    revalidatePath('/visitantes'); revalidatePath(`/visitantes/editar/${visitanteId}`);
}
export async function excluirVisitante(visitanteId: string): Promise<void> {
    const { supabaseUser, supabaseAdmin, role, celulaId } = await checkUserAuthorization();
    const supabase = role === 'admin' ? supabaseAdmin : supabaseUser;
    if (!role) throw new Error("Não autorizado"); let query = supabase.from('visitantes').delete().eq('id', visitanteId);
    if (role === 'líder') { if (!celulaId) throw new Error("Não autorizado"); query = query.eq('celula_id', celulaId); }
    const { error } = await query; if (error) { console.error("Erro ao excluir visitante:", error); throw error; } revalidatePath('/visitantes');
}
export async function converterVisitanteEmMembro(visitanteId: string, newMembroData: Omit<Membro, 'id' | 'celula_id' | 'created_at' | 'celula_nome' | 'status'>): Promise<{ success: boolean; message: string }> {
    const { supabaseUser, supabaseAdmin, role, celulaId } = await checkUserAuthorization();
    const supabase = role === 'admin' ? supabaseAdmin : supabaseUser;
    if (!role) return { success: false, message: "Não autorizado" };
    const { data: visitanteOriginal, error: getVisitanteError } = await supabase.from('visitantes').select('celula_id').eq('id', visitanteId).single();
    if (getVisitanteError || !visitanteOriginal?.celula_id) return { success: false, message: "Visitante não encontrado." };
    const targetCelulaIdForConversion = visitanteOriginal.celula_id;
    if (role === 'líder' && (!celulaId || celulaId !== targetCelulaIdForConversion)) return { success: false, message: "Não autorizado." };
    try {
        const { count, error: checkError } = await supabase.from('membros').select('id', { count: 'exact', head: true }).eq('nome', newMembroData.nome).eq('celula_id', targetCelulaIdForConversion); 
        if (checkError) throw checkError; if (count && count > 0) return { success: false, message: `Já existe um membro com o nome '${newMembroData.nome}'.` };
        const { data: membroInserido, error: insertMembroError } = await supabase.from('membros').insert({ ...newMembroData, celula_id: targetCelulaIdForConversion, status: 'Ativo' }).select('id').single();
        if (insertMembroError) throw insertMembroError;
        const { error: deleteVisitanteError } = await supabase.from('visitantes').delete().eq('id', visitanteId).eq('celula_id', targetCelulaIdForConversion); 
        if (deleteVisitanteError) { await supabase.from('membros').delete().eq('id', membroInserido.id); throw new Error(`Falha ao excluir visitante: ${deleteVisitanteError.message}.`); }
        revalidatePath('/membros'); revalidatePath('/visitantes'); return { success: true, message: "Convertido com sucesso!" };
    } catch (e: any) { return { success: false, message: e.message }; }
}

export async function listarReunioes(): Promise<ReuniaoComNomes[]> {
    const { supabaseUser, supabaseAdmin, role, celulaId } = await checkUserAuthorization();
    const supabase = role === 'admin' ? supabaseAdmin : supabaseUser;
    if (!role) return [];
    let query = supabase.from('reunioes').select(`id, data_reuniao, tema, caminho_pdf, celula_id, ministrador_principal:membros!ministrador_principal(nome), ministrador_secundario:membros!ministrador_secundario(nome), responsavel_kids:membros!responsavel_kids(nome)`);
    if (role === 'líder') { if (!celulaId) return []; query = query.eq('celula_id', celulaId); }
    const { data: reunioesData, error } = await query.order('data_reuniao', { ascending: false });
    if (error) { throw new Error(`Falha ao carregar reuniões: ${error.message}`); }
    const reunioes = reunioesData || [];
    if (reunioes.length === 0) return [];
    const reuniaoIds = reunioes.map(r => r.id);
    const { data: criancasData, error: criancasError } = await supabase.from('criancas_reuniao').select('reuniao_id, numero_criancas').in('reuniao_id', reuniaoIds);
    if (criancasError) console.warn("Aviso: Erro ao buscar contagem de crianças:", criancasError.message);
    const criancasMap = new Map((criancasData || []).map(c => [c.reuniao_id, c.numero_criancas]));
    const celulaIds = new Set(reunioes.map(r => r.celula_id));
    const celulasNamesMap = await getCelulasNamesMap(celulaIds, supabase);
    const result = reunioes.map((reuniao) => ({
        id: reuniao.id, data_reuniao: reuniao.data_reuniao, tema: reuniao.tema, caminho_pdf: reuniao.caminho_pdf, celula_id: reuniao.celula_id,
        celula_nome: celulasNamesMap.get(reuniao.celula_id) || null,
        ministrador_principal_nome: reuniao.ministrador_principal?.nome || null,
        ministrador_secundario_nome: reuniao.ministrador_secundario?.nome || null,
        responsavel_kids_nome: reuniao.responsavel_kids?.nome || null,
        num_criancas: criancasMap.get(reuniao.id) ?? 0,
    }));
    revalidatePath('/reunioes');
    revalidatePath('/dashboard'); 
    return result;
}

export async function getReuniaoDetalhesParaResumo(reuniaoId: string): Promise<ReuniaoDetalhesParaResumo | null> {
    const { supabaseUser, supabaseAdmin, role, celulaId } = await checkUserAuthorization();
    const supabase = role === 'admin' ? supabaseAdmin : supabaseUser;
    if (!role) return null;
    let targetCelulaIdForQuery: string | null = (role === 'líder') ? celulaId : null;
    if (role === 'admin') {
        const { data: reuniaoDataCheck, error: reuniaoCheckError } = await supabase.from('reunioes').select('celula_id').eq('id', reuniaoId).single();
        if (reuniaoCheckError || !reuniaoDataCheck?.celula_id) return null;
        targetCelulaIdForQuery = reuniaoDataCheck.celula_id;
    }
    if (!targetCelulaIdForQuery) return null;
    try {
        const [reuniaoDetailsResult, criancasResult] = await Promise.all([
            supabase.from('reunioes').select(`id, data_reuniao, tema, caminho_pdf, celula_id, ministrador_principal:membros!ministrador_principal(nome, telefone), ministrador_secundario:membros!ministrador_secundario(nome, telefone), responsavel_kids:membros!responsavel_kids(nome, telefone)`).eq('id', reuniaoId).eq('celula_id', targetCelulaIdForQuery).single(),
            supabase.from('criancas_reuniao').select('numero_criancas').eq('reuniao_id', reuniaoId).maybeSingle()
        ]);
        const { data: reuniaoData, error: reuniaoError } = reuniaoDetailsResult;
        if (reuniaoError || !reuniaoData) { return null; }
        const { data: criancasData } = criancasResult;
        const numCriancas = criancasData?.numero_criancas ?? 0;
        const [presMembros, allMems, visPres, celNames] = await Promise.all([
            supabase.from('presencas_membros').select('membro_id, membros(nome, telefone)').eq('reuniao_id', reuniaoId).eq('presente', true),
            supabase.from('membros').select('id, nome, telefone').eq('celula_id', targetCelulaIdForQuery).order('nome', { ascending: true }),
            supabase.from('presencas_visitantes').select('visitante_id, visitantes(nome, telefone)').eq('reuniao_id', reuniaoId).eq('presente', true),
            getCelulasNamesMap(new Set([reuniaoData.celula_id]), supabase)
        ]);
        if (presMembros.error || allMems.error || visPres.error) throw new Error('Erro ao buscar dados de presença.');
        const membrosPresentes = (presMembros.data || []).map(p => ({ id: p.membro_id, nome: p.membros?.nome || 'N/A', telefone: p.membros?.telefone || null }));
        const presentMemberIds = new Set(membrosPresentes.map(m => m.id));
        const membrosAusentes = (allMems.data || []).filter(m => !presentMemberIds.has(m.id)).map(m => ({ id: m.id, nome: m.nome, telefone: m.telefone }));
        const visitantesPresentes = (visPres.data || []).map(p => ({ id: p.visitante_id, nome: p.visitantes?.nome || 'N/A', telefone: p.visitantes?.telefone || null }));
        const celulaNome = celNames.get(reuniaoData.celula_id) || null;
        return {
            id: reuniaoData.id, data_reuniao: reuniaoData.data_reuniao, tema: reuniaoData.tema, caminho_pdf: reuniaoData.caminho_pdf,
            ministrador_principal_nome: reuniaoData.ministrador_principal?.nome || null,
            ministrador_secundario_nome: reuniaoData.ministrador_secundario?.nome || null,
            responsavel_kids_nome: reuniaoData.responsavel_kids?.nome || null,
            num_criancas: numCriancas, celula_nome: celulaNome,
            membros_presentes: membrosPresentes,
            membros_ausentes: membrosAusentes,
            visitantes_presentes: visitantesPresentes,
        };
    } catch (error: any) { return null; }
}

export async function adicionarReuniao(newReuniaoData: Omit<ReuniaoFormData, 'caminho_pdf'> & { celula_id?: string }): Promise<string> {
    const { supabaseUser, supabaseAdmin, role, celulaId } = await checkUserAuthorization();
    const supabase = role === 'admin' ? supabaseAdmin : supabaseUser;
    if (!role) throw new Error("Não autorizado");
    let targetCelulaIdForInsert: string | null = (role === 'líder') ? celulaId : newReuniaoData.celula_id || celulaId;
    if (!targetCelulaIdForInsert) throw new Error("ID da célula é necessário.");
    const { data, error } = await supabase.from('reunioes').insert({ ...newReuniaoData, celula_id: targetCelulaIdForInsert }).select('id').single();
    if (error) { throw error; }
    const newReuniaoId = data.id;
    await supabase.from('criancas_reuniao').insert({ reuniao_id: newReuniaoId, numero_criancas: 0 });
    revalidatePath('/reunioes'); revalidatePath('/dashboard');
    return newReuniaoId;
}

export async function getReuniao(reuniaoId: string): Promise<Reuniao | null> {
    const { supabaseUser, supabaseAdmin, role, celulaId } = await checkUserAuthorization();
    const supabase = role === 'admin' ? supabaseAdmin : supabaseUser;
    if (!role) return null;
    let query = supabase.from('reunioes').select('*').eq('id', reuniaoId);
    if (role === 'líder') { if (!celulaId) return null; query = query.eq('celula_id', celulaId); }
    const { data, error } = await query.single();
    if (error) { if (error.code === 'PGRST116') return null; throw error; }
    return data;
}

export async function atualizarReuniao(reuniaoId: string, updatedReuniaoData: Omit<ReuniaoFormData, 'caminho_pdf'>): Promise<void> {
    const { supabaseUser, supabaseAdmin, role, celulaId } = await checkUserAuthorization();
    const supabase = role === 'admin' ? supabaseAdmin : supabaseUser;
    if (!role) throw new Error("Não autorizado");
    let query = supabase.from('reunioes').update(updatedReuniaoData).eq('id', reuniaoId);
    if (role === 'líder') { if (!celulaId) throw new Error("Não autorizado"); query = query.eq('celula_id', celulaId); }
    const { error } = await query;
    if (error) { throw error; }
    revalidatePath('/reunioes'); revalidatePath(`/reunioes/editar/${reuniaoId}`); revalidatePath('/dashboard');
}

export async function excluirReuniao(reuniaoId: string): Promise<void> {
    const { supabaseUser, supabaseAdmin, role, celulaId } = await checkUserAuthorization();
    const supabase = role === 'admin' ? supabaseAdmin : supabaseUser;
    if (!role) throw new Error("Não autorizado");
    let query = supabase.from('reunioes').delete().eq('id', reuniaoId);
    if (role === 'líder') { if (!celulaId) throw new Error("Não autorizado"); query = query.eq('celula_id', celulaId); }
    const { error } = await query;
    if (error) { throw new Error(`Falha ao excluir reunião: ${error.message}`); }
    revalidatePath('/reunioes'); revalidatePath('/dashboard');
}

export async function verificarDuplicidadeReuniao(dataReuniao: string, tema: string, excludeId?: string): Promise<boolean> {
    const { supabaseUser, supabaseAdmin, role, celulaId } = await checkUserAuthorization();
    const supabase = role === 'admin' ? supabaseAdmin : supabaseUser;
    if (!role) throw new Error("Não autorizado");
    let query = supabase.from('reunioes').select('id', { count: 'exact', head: true });
    if (role === 'líder') { if (!celulaId) return null; query = query.eq('celula_id', celulaId); }
    query = query.eq('data_reuniao', dataReuniao).ilike('tema', tema);
    if (excludeId) query = query.neq('id', excludeId);
    const { count, error } = await query;
    if (error) { throw error; }
    return (count || 0) > 0;
}

export async function listarTodosMembrosComPresenca(reuniaoId: string): Promise<MembroComPresenca[]> {
    const { supabaseUser, supabaseAdmin, role, celulaId } = await checkUserAuthorization();
    const supabase = role === 'admin' ? supabaseAdmin : supabaseUser;
    if (!role) return [];
    let targetCelulaIdForQuery: string | null = (role === 'líder') ? celulaId : null;
    if (role === 'admin') {
        const { data: reuniaoDataCheck, error: reuniaoCheckError } = await supabase.from('reunioes').select('celula_id').eq('id', reuniaoId).single();
        if (reuniaoCheckError || !reuniaoDataCheck?.celula_id) { return []; }
        targetCelulaIdForQuery = reuniaoDataCheck.celula_id;
    }
    if (!targetCelulaIdForQuery) { return []; }
    try {
        const { data: members, error: membersError } = await supabase.from('membros').select('id, nome, telefone, data_ingresso, data_nascimento, endereco, status').eq('celula_id', targetCelulaIdForQuery).order('nome', { ascending: true });
        if (membersError) throw membersError;
        const memberIds = (members || []).map(m => m.id);
        const { data: presences, error: presencesError } = await supabase.from('presencas_membros').select('membro_id, presente').eq('reuniao_id', reuniaoId).in('membro_id', memberIds);
        if (presencesError) throw presencesError;
        const presenceMap = new Map((presences || []).map(p => [p.membro_id, p.presente]));
        return (members || []).map(membro => ({ ...membro, presente: presenceMap.get(membro.id) || false }));
    } catch (e: any) { throw new Error(`Falha ao carregar membros para presença: ${e.message}`); }
}

export async function registrarPresencaMembro(reuniaoId: string, membroId: string, presente: boolean): Promise<void> {
    const { supabaseUser, supabaseAdmin, role, celulaId } = await checkUserAuthorization();
    const supabase = role === 'admin' ? supabaseAdmin : supabaseUser;
    if (!role) throw new Error("Não autorizado");
    let targetCelulaIdForValidation: string | null = (role === 'líder') ? celulaId : null;
    if (role === 'admin') {
        const { data: reuniaoDataCheck, error: reuniaoCheckError } = await supabase.from('reunioes').select('celula_id').eq('id', reuniaoId).single();
        if (reuniaoCheckError || !reuniaoDataCheck?.celula_id) { throw new Error("Reunião não encontrada ou inacessível."); }
        targetCelulaIdForValidation = reuniaoDataCheck.celula_id;
    }
    if (!targetCelulaIdForValidation) { throw new Error("Nenhum ID de célula para validar a presença do membro."); }
    const { data: memberCheck, error: memberCheckError } = await supabase.from('membros').select('id').eq('id', membroId).eq('celula_id', targetCelulaIdForValidation).single();
    if (memberCheckError || !memberCheck) { throw new Error("Membro não pertence à célula da reunião ou não encontrado."); }
    try {
        const { error } = await supabase.from('presencas_membros').upsert({ reuniao_id: reuniaoId, membro_id: membroId, presente: presente }, { onConflict: 'reuniao_id, membro_id' });
        if (error) { throw error; }
        revalidatePath(`/reunioes/presenca/${reuniaoId}`); revalidatePath('/dashboard'); revalidatePath('/relatorios');
    } catch (e: any) { throw e; }
}

export async function listarTodosVisitantesComPresenca(reuniaoId: string): Promise<VisitanteComPresenca[]> {
    const { supabaseUser, supabaseAdmin, role, celulaId } = await checkUserAuthorization();
    const supabase = role === 'admin' ? supabaseAdmin : supabaseUser;
    if (!role) return [];
    let targetCelulaIdForQuery: string | null = (role === 'líder') ? celulaId : null;
    if (role === 'admin') {
        const { data: reuniaoDataCheck, error: reuniaoCheckError } = await supabase.from('reunioes').select('celula_id').eq('id', reuniaoId).single();
        if (reuniaoCheckError || !reuniaoDataCheck?.celula_id) { return []; }
        targetCelulaIdForQuery = reuniaoDataCheck.celula_id;
    }
    if (!targetCelulaIdForQuery) { return []; }
    try {
        const { data: visitors, error: visitorsError } = await supabase.from('visitantes').select('id, nome, telefone').eq('celula_id', targetCelulaIdForQuery).order('nome', { ascending: true });
        if (visitorsError) throw visitorsError;
        const visitorIds = (visitors || []).map(v => v.id);
        const { data: presences, error: presencesError } = await supabase.from('presencas_visitantes').select('visitante_id, presente').eq('reuniao_id', reuniaoId).in('visitante_id', visitorIds);
        if (presencesError) throw presencesError;
        const presenceMap = new Map((presences || []).map(p => [p.visitante_id, p.presente]));
        return (visitors || []).map(visitante => ({ visitante_id: visitante.id, nome: visitante.nome, telefone: visitante.telefone, presente: presenceMap.get(visitante.id) || false }));
    } catch (e: any) { throw new Error(`Falha ao carregar visitantes para presença: ${e.message}`); }
}

export async function registrarPresencaVisitante(reuniaoId: string, visitanteId: string, presente: boolean): Promise<void> {
    const { supabaseUser, supabaseAdmin, role, celulaId } = await checkUserAuthorization();
    const supabase = role === 'admin' ? supabaseAdmin : supabaseUser;
    if (!role) throw new Error("Não autorizado");
    let targetCelulaIdForValidation: string | null = (role === 'líder') ? celulaId : null;
    if (role === 'admin') {
        const { data: reuniaoDataCheck, error: reuniaoCheckError } = await supabase.from('reunioes').select('celula_id').eq('id', reuniaoId).single();
        if (reuniaoCheckError || !reuniaoDataCheck?.celula_id) { throw new Error("Reunião não encontrada ou inacessível."); }
        targetCelulaIdForValidation = reuniaoDataCheck.celula_id;
    }
    if (!targetCelulaIdForValidation) { throw new Error("Nenhum ID de célula para validar a presença do visitante."); }
    const { data: visitorCheck, error: visitorCheckError } = await supabase.from('visitantes').select('id').eq('id', visitanteId).eq('celula_id', targetCelulaIdForValidation).single();
    if (visitorCheckError || !visitorCheck) { throw new Error("Visitante não pertence à célula da reunião ou não encontrado."); }
    try {
        const { error } = await supabase.from('presencas_visitantes').upsert({ reuniao_id: reuniaoId, visitante_id: visitanteId, presente: presente }, { onConflict: 'reuniao_id, visitante_id' });
        if (error) { throw error; }
        revalidatePath(`/reunioes/presenca/${reuniaoId}`); revalidatePath('/dashboard'); revalidatePath('/relatorios');
    } catch (e: any) { throw e; }
}

export async function getNumCriancasReuniao(reuniaoId: string): Promise<number> {
    const { supabaseUser, supabaseAdmin, role, celulaId } = await checkUserAuthorization();
    const supabase = role === 'admin' ? supabaseAdmin : supabaseUser;
    if (!role) return 0;
    let targetCelulaIdForQuery: string | null = (role === 'líder') ? celulaId : null;
    if (role === 'admin') {
        const { data: reuniaoDataCheck, error: reuniaoCheckError } = await supabase.from('reunioes').select('celula_id').eq('id', reuniaoId).single();
        if (reuniaoCheckError || !reuniaoDataCheck?.celula_id) { return 0; }
        targetCelulaIdForQuery = reuniaoDataCheck.celula_id;
    }
    if (!targetCelulaIdForQuery) return 0;
    try {
        const { data, error } = await supabase.from('criancas_reuniao').select('numero_criancas').eq('reuniao_id', reuniaoId).maybeSingle();
        if (error) { throw error; } return data?.numero_criancas || 0;
    } catch (e: any) { throw e; }
}

export async function setNumCriancasReuniao(reuniaoId: string, numeroCriancas: number): Promise<void> {
    const { supabaseUser, supabaseAdmin, role, celulaId } = await checkUserAuthorization();
    const supabase = role === 'admin' ? supabaseAdmin : supabaseUser;
    if (!role) throw new Error("Não autorizado");
    let targetCelulaIdForValidation: string | null = (role === 'líder') ? celulaId : null;
    if (role === 'admin') {
        const { data: reuniaoDataCheck, error: reuniaoCheckError } = await supabase.from('reunioes').select('celula_id').eq('id', reuniaoId).single();
        if (reuniaoCheckError || !reuniaoDataCheck?.celula_id) { throw new Error("Reunião não encontrada ou inacessível."); }
        targetCelulaIdForValidation = reuniaoDataCheck.celula_id;
    }
    if (!targetCelulaIdForValidation) { throw new Error("Nenhum ID de célula para validar o número de crianças."); }
    try {
        const { error } = await supabase.from('criancas_reuniao').upsert({ reuniao_id: reuniaoId, numero_criancas: Math.max(0, numeroCriancas) }, { onConflict: 'reuniao_id' });
        if (error) { throw error; }
        revalidatePath(`/reunioes/presenca/${reuniaoId}`); revalidatePath('/dashboard'); revalidatePath('/relatorios');
    } catch (e: any) { throw e; }
}

export async function duplicarReuniao(reuniaoId: string): Promise<string> {
    const { supabaseUser, supabaseAdmin, role, celulaId } = await checkUserAuthorization();
    const supabase = role === 'admin' ? supabaseAdmin : supabaseUser;
    if (!role) throw new Error("Não autorizado");
    let targetCelulaIdForValidation: string | null = (role === 'líder') ? celulaId : null;
    if (role === 'admin') {
        const { data: reuniaoDataCheck, error: reuniaoCheckError } = await supabase.from('reunioes').select('celula_id').eq('id', reuniaoId).single();
        if (reuniaoCheckError || !reuniaoDataCheck?.celula_id) { throw new Error("Reunião não encontrada ou inacessível."); }
        targetCelulaIdForValidation = reuniaoDataCheck.celula_id;
    }
    if (!targetCelulaIdForValidation) { throw new Error("Nenhum ID de célula para validar a duplicação da reunião."); }
    try {
        const { data: originalReuniao, error: fetchError } = await supabase.from('reunioes').select('*').eq('id', reuniaoId).eq('celula_id', targetCelulaIdForValidation).single();
        if (fetchError || !originalReuniao) { throw new Error(`Falha ao buscar reunião para duplicação: ${fetchError?.message || 'Reunião não encontrada'}`); }
        const today = new Date().toISOString().split('T')[0];
        let newTheme = originalReuniao.tema; let counter = 1; while (await verificarDuplicidadeReuniao(today, newTheme)) { newTheme = `${originalReuniao.tema} (Cópia ${counter})`; counter++; }
        const newReuniaoData = { celula_id: originalReuniao.celula_id, data_reuniao: today, tema: newTheme, ministrador_principal: originalReuniao.ministrador_principal, ministrador_secundario: originalReuniao.ministrador_secundario, responsavel_kids: originalReuniao.responsavel_kids, caminho_pdf: null };
        const { data: newReuniao, error: insertError } = await supabase.from('reunioes').insert(newReuniaoData).select('id').single();
        if (insertError) { throw new Error(`Falha ao criar reunião duplicada: ${insertError.message}`); }
        const newReuniaoId = newReuniao.id;
        const { data: originalCriancas, error: criancasError } = await supabase.from('criancas_reuniao').select('numero_criancas').eq('reuniao_id', reuniaoId).maybeSingle();
        if (!criancasError && originalCriancas?.numero_criancas) { await supabase.from('criancas_reuniao').insert({ reuniao_id: newReuniaoId, numero_criancas: originalCriancas.numero_criancas }); }
        revalidatePath('/reunioes'); revalidatePath('/dashboard'); return newReuniaoId;
    } catch (e: any) { throw e; }
}

export async function uploadMaterialReuniao(reuniaoId: string, file: File): Promise<string> {
    const { supabaseUser, supabaseAdmin, role, celulaId } = await checkUserAuthorization();
    const supabase = role === 'admin' ? supabaseAdmin : supabaseUser;
    if (!role) throw new Error("Não autorizado.");
    let targetCelulaIdForValidation: string | null = (role === 'líder') ? celulaId : null;
    if (role === 'admin') {
        const { data: reuniaoDataCheck, error: reuniaoCheckError } = await supabase.from('reunioes').select('celula_id').eq('id', reuniaoId).single();
        if (reuniaoCheckError || !reuniaoDataCheck?.celula_id) { throw new Error("Reunião não encontrada ou inacessível."); }
        targetCelulaIdForValidation = reuniaoDataCheck.celula_id;
    }
    if (!targetCelulaIdForValidation) { throw new Error("Nenhum ID de célula para validar o upload de material."); }
    const { data: reunionCheck, error: reunionCheckError } = await supabase.from('reunioes').select('id').eq('id', reuniaoId).eq('celula_id', targetCelulaIdForValidation).single();
    if (reunionCheckError || !reunionCheck) { throw new Error("Reunião não pertence à sua célula ou não encontrada."); }
    try {
        const fileExtension = file.name.split('.').pop(); const path = `${targetCelulaIdForValidation}/${reuniaoId}.${fileExtension}`;
        const { data, error: uploadError } = await supabase.storage.from('reunion_materials').upload(path, file, { cacheControl: '3600', upsert: true });
        if (uploadError) { throw new Error(`Falha no upload do arquivo: ${uploadError.message}`); }
        const { data: publicUrlData } = supabase.storage.from('reunion_materials').getPublicUrl(path);
        if (!publicUrlData || !publicUrlData.publicUrl) { throw new Error("Não foi possível obter a URL pública do arquivo."); }
        const { error: updateError } = await supabase.from('reunioes').update({ caminho_pdf: publicUrlData.publicUrl }).eq('id', reuniaoId);
        if (updateError) { throw new Error(`Falha ao atualizar o registro da reunião com o caminho do PDF: ${updateError.message}`); }
        revalidatePath(`/reunioes/editar/${reuniaoId}`); revalidatePath(`/reunioes/resumo/${reuniaoId}`); return publicUrlData.publicUrl;
    } catch (e: any) { throw e; }
}

export async function getUserProfile(): Promise<Profile | null> {
    const { supabaseUser, role } = await checkUserAuthorization();
    const supabase = supabaseUser;
    if (!role) { throw new Error("Usuário não autenticado."); }
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) { throw new Error("Usuário não autenticado."); }
    try {
        const { data: profileData, error: profileError } = await supabase.from('profiles').select('id, email, nome_completo, telefone, role, celula_id, created_at').eq('id', user.id).single();
        if (profileError || !profileData) {
            if (profileError?.code === 'PGRST116') {
                 return { id: user.id, email: user.email || 'email@example.com', nome_completo: null, telefone: null, role: null, celula_id: null, celula_nome: null, created_at: user.created_at };
            }
            throw new Error(`Falha ao carregar perfil: ${profileError?.message}`);
        }
        let celulaName: string | null = null;
        if (profileData.celula_id) { const celulasNamesMap = await getCelulasNamesMap(new Set([profileData.celula_id]), supabase); celulaName = celulasNamesMap.get(profileData.celula_id) || null; }
        return { id: profileData.id, email: profileData.email || 'N/A', nome_completo: profileData.nome_completo, telefone: profileData.telefone, role: profileData.role, celula_id: profileData.celula_id, celula_nome: celulaName, created_at: profileData.created_at };
    } catch (e: any) { throw new Error(`Falha ao carregar perfil: ${e.message}`); }
}

export async function updateUserProfileData(profileId: string, data: { nome_completo: string; telefone: string | null }): Promise<void> {
    const { supabaseUser, role } = await checkUserAuthorization();
    const supabase = supabaseUser;
    if (!role) { throw new Error("Não autorizado."); }
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user || user.id !== profileId) { throw new Error("Não autorizado."); }
    try {
        const { error } = await supabase.from('profiles').update({ nome_completo: data.nome_completo, telefone: data.telefone }).eq('id', profileId);
        if (error) { throw new Error(`Falha ao atualizar perfil: ${error.message}`); }
        revalidatePath('/profile'); revalidatePath('/dashboard');
    } catch (e: any) { throw new Error(`Falha ao atualizar perfil: ${e.message}`); }
}

export async function updateUserPassword(newPassword: string): Promise<{ success: boolean; message: string }> {
    const { supabaseUser } = await checkUserAuthorization();
    const supabase = supabaseUser;
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) { return { success: false, message: "Usuário não autenticado." }; }
    if (newPassword.length < 6) { return { success: false, message: "A senha deve ter no mínimo 6 caracteres." }; }
    try {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) {
            if (error.message.includes('Password should be at least')) { return { success: false, message: "A senha é muito curta. Deve ter no mínimo 6 caracteres." }; }
            return { success: false, message: `Falha ao trocar senha: ${error.message}` };
        }
        return { success: true, message: "Senha atualizada com sucesso!" };
    } catch (e: any) { return { success: false, message: `Erro inesperado ao trocar senha: ${e.message}` }; }
}

export async function uploadPalavraDaSemana(formData: FormData): Promise<{ success: boolean; message: string; url?: string }> {
    const { supabaseUser, supabaseAdmin, role } = await checkUserAuthorization();

    if (role !== 'admin') {
        return { success: false, message: "Não autorizado: Apenas administradores podem gerenciar a Palavra da Semana." };
    }

    const user = (await supabaseUser.auth.getUser()).data.user;
    if (!user) {
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
        const { data: existingPalavra, error: checkError } = await supabaseAdmin
            .from('palavra_semana')
            .select('id, url_arquivo')
            .eq('data_semana', data_semana)
            .maybeSingle();

        if (checkError) {
            console.error("Erro ao verificar Palavra da Semana existente:", checkError);
            throw new Error(`Falha ao verificar duplicidade: ${checkError.message}`);
        }

        let fileUrl: string | null = existingPalavra?.url_arquivo || null;

        if (file && file.size > 0) {
            if (file.type !== 'application/pdf') {
                return { success: false, message: "Apenas arquivos PDF são permitidos." };
            }
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                return { success: false, message: "O arquivo excede o limite de 5MB." };
            }

            // --- CORREÇÃO APLICADA AQUI ---
            const sanitizedFileName = sanitizeFileName(file.name);
            const filePath = `palavra_semana/${data_semana}-${sanitizedFileName}`;
            // --- FIM DA CORREÇÃO ---

            const { error: uploadError } = await supabaseUser.storage
                .from('palavra_semana_files')
                .upload(filePath, file, { upsert: true });

            if (uploadError) {
                console.error("Erro no upload da Palavra da Semana:", uploadError);
                throw new Error(`Falha no upload do arquivo: ${uploadError.message}`);
            }

            const { data: publicUrlData } = supabaseAdmin.storage
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
        
        const { error: upsertError } = await supabaseAdmin
            .from('palavra_semana')
            .upsert({ ...dataToUpsert, id: existingPalavra?.id }, { onConflict: 'data_semana' });

        if (upsertError) {
            console.error("Erro no upsert da Palavra da Semana:", upsertError);
            throw new Error(`Falha ao salvar a Palavra da Semana: ${upsertError.message}`);
        }

        revalidatePath('/admin/palavra-semana');
        revalidatePath('/dashboard');

        return { success: true, message: "Palavra da Semana salva com sucesso!", url: fileUrl || undefined };

    } catch (e: any) {
        console.error("Erro na Server Action uploadPalavraDaSemana:", e);
        return { success: false, message: `Erro: ${e.message}` };
    }
}

export async function getPalavraDaSemana(data?: string): Promise<PalavraDaSemana | null> {
    const { supabaseUser, role } = await checkUserAuthorization();
    const supabase = supabaseUser;

    if (!role) {
        console.warn("getPalavraDaSemana: Usuário não autenticado. Retornando null.");
        return null;
    }

    try {
        let query = supabase
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
            throw new Error(`Falha ao carregar Palavra da Semana: ${error.message}`);
        }

        if (!palavraData) return null;

        let createdByEmail: string | null = null;
        if (palavraData.created_by) {
            const { data: profileEmailData, error: profileEmailError } = await supabase
                .from('profiles')
                .select('email')
                .eq('id', palavraData.created_by)
                .single();

            if (profileEmailError) {
                console.warn(`Aviso: Não foi possível buscar o email para created_by ${palavraData.created_by}:`, profileEmailError.message);
            } else {
                createdByEmail = profileEmailData?.email || 'Admin';
            }
        }

        return {
            ...palavraData,
            created_by_email: createdByEmail,
        };

    } catch (e: any) {
        console.error("Erro na Server Action getPalavraDaSemana:", e);
        throw new Error(`Erro: ${e.message}`);
    }
}

export async function deletePalavraDaSemana(id: string): Promise<{ success: boolean; message: string }> {
    const { supabaseUser, supabaseAdmin, role } = await checkUserAuthorization();

    if (role !== 'admin') {
        return { success: false, message: "Não autorizado: Apenas administradores podem excluir a Palavra da Semana." };
    }

    try {
        const { data: palavra, error: fetchError } = await supabaseAdmin
            .from('palavra_semana')
            .select('url_arquivo')
            .eq('id', id)
            .single();

        if (fetchError || !palavra) {
            throw new Error(`Falha ao buscar registro: ${fetchError?.message || 'Palavra da Semana não encontrada'}`);
        }

        const { error: deleteRecordError } = await supabaseAdmin
            .from('palavra_semana')
            .delete()
            .eq('id', id);

        if (deleteRecordError) {
            throw new Error(`Falha ao excluir registro: ${deleteRecordError.message}`);
        }
        
        const urlSegments = palavra.url_arquivo.split('/');
        const bucketName = urlSegments.find(seg => seg === 'palavra_semana_files');
        const filePath = urlSegments.slice(urlSegments.indexOf(bucketName!) + 1).join('/');
        
        if (bucketName && filePath) {
            const { error: deleteFileError } = await supabaseUser.storage
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
        console.error("Erro na Server Action deletePalavraDaSemana:", e);
        return { success: false, message: `Erro: ${e.message}` };
    }
}