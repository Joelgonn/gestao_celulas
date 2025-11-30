// src/lib/reports_data.ts
'use server';

import { createServerClient, createAdminClient } from '@/utils/supabase/server';
import { parseISO } from 'date-fns';
import { formatPhoneNumberDisplay, formatDateForDisplay } from '@/utils/formatters';

import {
    Membro,
    Visitante,
    CelulaOption as BaseCelulaOption
} from '@/lib/data';

// ============================================================================
//                                DEFINIÇÕES DE TIPOS
// ============================================================================

export interface MembroOption {
    id: string;
    nome: string;
}

export type ReuniaoOption = {
    id: string;
    data_reuniao: string;
    tema: string;
    ministrador_principal_nome: string | null;
};

export type CelulaOption = BaseCelulaOption;

interface MembroNomeTelefoneId {
    id: string;
    nome: string;
    telefone: string | null;
}

interface VisitanteNomeTelefoneId {
    id: string;
    nome: string;
    telefone: string | null;
}

interface CelulaNomeId {
    id: string;
    nome: string;
}

export interface ReportDataPresencaReuniao {
    reuniao_detalhes: {
        id: string;
        data_reuniao: string;
        tema: string;
        caminho_pdf: string | null;
        ministrador_principal_nome: string | null;
        ministrador_principal_telefone: string | null;
        ministrador_secundario_nome: string | null;
        ministrador_secundario_telefone: string | null;
        responsavel_kids_nome: string | null;
        responsavel_kids_telefone: string | null;
        num_criancas: number;
        celula_nome?: string | null;
    };
    membros_presentes: { id: string; nome: string; telefone: string | null }[];
    membros_ausentes: { id: string; nome: string; telefone: string | null }[];
    visitantes_presentes: { id: string; nome: string; telefone: string | null }[];
}

export interface RelatorioPresencaMembroItem {
    data_reuniao: string;
    tema: string;
    presente: boolean;
}

export interface ReportDataPresencaMembro {
    membro_data: Membro & { celula_nome?: string | null };
    historico_presenca: RelatorioPresencaMembroItem[];
}

export interface MembroFaltoso {
    id: string;
    nome: string;
    telefone: string | null;
    total_presencas: number;
    total_reunioes_no_periodo: number;
    celula_nome: string | null;
}

export interface ReportDataFaltososPeriodo {
    faltosos: MembroFaltoso[];
    periodo: {
        start_date: string;
        end_date: string;
        total_reunioes: number;
    }
}

export interface VisitantePorPeriodo {
    id: string;
    nome: string;
    telefone: string | null;
    data_primeira_visita: string;
    celula_nome: string | null;
}

export interface ReportDataVisitantesPeriodo {
    visitantes: VisitantePorPeriodo[];
    periodo: {
        start_date: string;
        end_date: string;
        total_visitantes: number;
    }
}

export interface MembroAniversariante {
    id: string;
    nome: string;
    data_nascimento: string;
    telefone: string | null;
    celula_nome: string | null;
    celula_id?: string | null;
}

export interface VisitanteAniversariante {
    id: string;
    nome: string;
    data_primeira_visita: string;
    data_nascimento: string;
    telefone: string | null;
    celula_nome: string | null;
    celula_id?: string | null;
}

export interface ReportDataAniversariantes {
    mes: number;
    ano_referencia: number;
    membros: MembroAniversariante[];
    visitantes: VisitanteAniversariante[];
}

export interface LiderAlocacaoItem {
    id: string;
    email: string;
    role: 'admin' | 'líder';
    celula_id: string | null;
    celula_nome: string | null;
    data_criacao_perfil: string;
    ultimo_login: string | null;
}

export interface CelulaSemLiderItem {
    id: string;
    nome: string;
    lider_principal_cadastrado_na_celula: string | null;
}

export interface ReportDataAlocacaoLideres {
    lideres_alocados: LiderAlocacaoItem[];
    lideres_nao_alocados: LiderAlocacaoItem[];
    celulas_sem_lider_atribuido: CelulaSemLiderItem[];
    total_perfis_lider: number;
    total_celulas: number;
}

export interface ChaveAtivacaoItem {
    chave: string;
    celula_id: string;
    celula_nome: string | null;
    usada: boolean;
    data_uso: string | null;
    usada_por_email: string | null;
    usada_por_id: string | null;
}

export interface ReportDataChavesAtivacao {
    chaves_ativas: ChaveAtivacaoItem[];
    chaves_usadas: ChaveAtivacaoItem[];
    total_chaves: number;
}


// ============================================================================
//                          FUNÇÕES AUXILIARES DE SUPABASE
// ============================================================================

async function checkUserAuthorizationReports() {
    const supabaseClient = createServerClient();
    const adminSupabaseClient = createAdminClient();
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
        return { supabase: supabaseClient, role: null, celulaId: null, adminSupabase: null };
    }

    const { data: profileData } = await supabaseClient
        .from('profiles')
        .select('celula_id, role')
        .eq('id', user.id)
        .single();

    if (!profileData) {
        return { supabase: supabaseClient, role: null, celulaId: null, adminSupabase: null };
    }

    const role = profileData.role as 'admin' | 'líder';
    
    return {
        supabase: supabaseClient,
        role: role,
        celulaId: profileData.celula_id,
        adminSupabase: role === 'admin' ? adminSupabaseClient : null
    };
}

async function getCelulasNamesMap(celulaIds: Set<string>, supabaseInstance: any, adminSupabase: any): Promise<Map<string, string>> {
    let namesMap = new Map<string, string>();
    if (celulaIds.size === 0) return namesMap;

    const clientToUse = adminSupabase ?? supabaseInstance;

    const { data, error } = await clientToUse
        .from('celulas')
        .select('id, nome')
        .in('id', Array.from(celulaIds));

    if (!error) {
        data?.forEach((c: CelulaNomeId) => namesMap.set(c.id, c.nome));
    }
    return namesMap;
}

// ============================================================================
//                          FUNÇÕES DE DADOS PARA RELATÓRIOS
// ============================================================================

export async function listMembros(celulaIdParaFiltrar?: string | null): Promise<MembroOption[]> {
    const { supabase, role, celulaId, adminSupabase } = await checkUserAuthorizationReports();

    if (!role) return [];

    const clientToUse = adminSupabase || supabase;
    let query = clientToUse.from('membros').select('id, nome');

    if (role === 'líder') {
        if (!celulaId) return [];
        query = query.eq('celula_id', celulaId);
    } else if (role === 'admin' && celulaIdParaFiltrar) {
        query = query.eq('celula_id', celulaIdParaFiltrar);
    }

    const { data } = await query.order('nome', { ascending: true });
    return data || [];
}

export async function listReunioes(celulaIdParaFiltrar?: string | null): Promise<ReuniaoOption[]> {
    const { supabase, role, celulaId, adminSupabase } = await checkUserAuthorizationReports();

    if (!role) return [];

    const clientToUse = (role === 'admin' && adminSupabase) ? adminSupabase : supabase;
    if (!clientToUse) throw new Error("Erro interno: Cliente Supabase não disponível.");

    let query = clientToUse
        .from('reunioes')
        .select(`
            id, data_reuniao, tema,
            ministrador_principal_ref:membros!ministrador_principal(nome)
        `);

    if (role === 'líder') {
        if (!celulaId) return [];
        query = query.eq('celula_id', celulaId);
    } else if (role === 'admin' && celulaIdParaFiltrar) {
        query = query.eq('celula_id', celulaIdParaFiltrar);
    }

    const { data } = await query.order('data_reuniao', { ascending: false });

    return data?.map((r: any) => ({
        id: r.id,
        data_reuniao: r.data_reuniao,
        tema: r.tema,
        ministrador_principal_nome: r.ministrador_principal_ref?.nome || null
    })) || [];
}

export async function listarCelulasParaAdmin(): Promise<CelulaOption[]> {
    const { supabase, role, adminSupabase } = await checkUserAuthorizationReports();
    if (role !== 'admin') throw new Error("Acesso negado.");

    const clientToUse = adminSupabase || supabase;
    const { data, error } = await clientToUse.from('celulas').select('id, nome').order('nome');

    if (error) throw new Error("Falha ao carregar células: " + error.message);
    return data || [];
}

export async function fetchReportDataPresencaReuniao(reuniaoId: string, celulaIdParaFiltrar?: string | null): Promise<ReportDataPresencaReuniao | null> {
    const { supabase, role, celulaId, adminSupabase } = await checkUserAuthorizationReports();
    if (!role) return null;

    const clientToUse = role === 'admin' && adminSupabase ? adminSupabase : supabase;
    let targetCelulaIdForQuery: string | null = null;

    if (role === 'líder') {
        if (!celulaId) return null;
        targetCelulaIdForQuery = celulaId;
    } else {
        const { data } = await clientToUse.from('reunioes').select('celula_id').eq('id', reuniaoId).single();
        if (!data?.celula_id) return null;
        if (celulaIdParaFiltrar && celulaIdParaFiltrar !== data.celula_id) return null;
        targetCelulaIdForQuery = data.celula_id;
    }

    try {
        const [reuniaoResult, criancasResult] = await Promise.all([
            clientToUse.from('reunioes').select(`
                    id, data_reuniao, tema, caminho_pdf, created_at, celula_id,
                    ministrador_principal_alias:membros!ministrador_principal(nome, telefone),
                    ministrador_secundario_alias:membros!ministrador_secundario(nome, telefone),
                    responsavel_kids_alias:membros!responsavel_kids(nome, telefone)
                `).eq('id', reuniaoId).eq('celula_id', targetCelulaIdForQuery).single(),
            clientToUse.from('criancas_reuniao').select('numero_criancas').eq('reuniao_id', reuniaoId).maybeSingle()
        ]);

        if (!reuniaoResult.data) throw new Error('Reunião não encontrada');

        const [presentesMembrosRaw, allMembersData, visitantesPresentesRaw, celulasNamesMap] = await Promise.all([
            clientToUse.from('presencas_membros').select('membro_id, membros(nome, telefone)').eq('reuniao_id', reuniaoId).eq('presente', true),
            clientToUse.from('membros').select('id, nome, telefone').eq('celula_id', targetCelulaIdForQuery).order('nome', { ascending: true }),
            clientToUse.from('presencas_visitantes').select('visitante_id, visitantes(nome, telefone)').eq('reuniao_id', reuniaoId).eq('presente', true),
            getCelulasNamesMap(new Set([reuniaoResult.data.celula_id]), clientToUse, adminSupabase)
        ]);

        const membrosPresentes = (presentesMembrosRaw.data || []).map((p: any) => ({
            id: p.membro_id,
            nome: p.membros?.nome || 'N/A',
            telefone: p.membros?.telefone || null
        }));

        const presentMemberIds = new Set(membrosPresentes.map(m => m.id));
        const membrosAusentes = (allMembersData.data || []).filter(m => !presentMemberIds.has(m.id)).map(m => ({
            id: m.id, nome: m.nome, telefone: m.telefone
        }));

        const visitantesPresentes = (visitantesPresentesRaw.data || []).map((p: any) => ({
            id: p.visitante_id,
            nome: p.visitantes?.nome || 'N/A',
            telefone: p.visitantes?.telefone || null
        }));

        return {
            reuniao_detalhes: {
                id: reuniaoResult.data.id,
                data_reuniao: reuniaoResult.data.data_reuniao,
                tema: reuniaoResult.data.tema,
                caminho_pdf: reuniaoResult.data.caminho_pdf,
                ministrador_principal_nome: (reuniaoResult.data as any).ministrador_principal_alias?.nome || 'Não Definido',
                ministrador_principal_telefone: (reuniaoResult.data as any).ministrador_principal_alias?.telefone || null,
                ministrador_secundario_nome: (reuniaoResult.data as any).ministrador_secundario_alias?.nome || null,
                ministrador_secundario_telefone: (reuniaoResult.data as any).ministrador_secundario_alias?.telefone || null,
                responsavel_kids_nome: (reuniaoResult.data as any).responsavel_kids_alias?.nome || null,
                responsavel_kids_telefone: (reuniaoResult.data as any).responsavel_kids_alias?.telefone || null,
                num_criancas: criancasResult.data?.numero_criancas ?? 0,
                celula_nome: celulasNamesMap.get(reuniaoResult.data.celula_id) || null,
            },
            membros_presentes: membrosPresentes,
            membros_ausentes: membrosAusentes,
            visitantes_presentes: visitantesPresentes,
        };
    } catch (error) {
        console.error('Erro ao gerar relatório reunião:', error);
        throw error;
    }
}

export async function fetchReportDataPresencaMembro(membroId: string, celulaIdParaFiltrar?: string | null): Promise<ReportDataPresencaMembro | null> {
    const { supabase, role, celulaId, adminSupabase } = await checkUserAuthorizationReports();
    if (!role) return null;

    const clientToUse = role === 'admin' && adminSupabase ? adminSupabase : supabase;
    let targetCelulaIdForQuery: string | null = null;

    if (role === 'líder') {
        if (!celulaId) return null;
        targetCelulaIdForQuery = celulaId;
    } else {
        const { data } = await clientToUse.from('membros').select('celula_id').eq('id', membroId).single();
        if (!data?.celula_id) return null;
        if (celulaIdParaFiltrar && celulaIdParaFiltrar !== data.celula_id) return null;
        targetCelulaIdForQuery = data.celula_id;
    }

    try {
        const { data: membroData } = await clientToUse
            .from('membros')
            .select('*')
            .eq('id', membroId)
            .eq('celula_id', targetCelulaIdForQuery)
            .single();

        if (!membroData) return null;

        const celulasNamesMap = await getCelulasNamesMap(new Set([membroData.celula_id]), clientToUse, adminSupabase);
        const membroDataWithCelularName = { ...membroData, celula_nome: celulasNamesMap.get(membroData.celula_id) || null };

        const { data: allReunioes } = await clientToUse
            .from('reunioes')
            .select('id, data_reuniao, tema')
            .eq('celula_id', targetCelulaIdForQuery)
            .order('data_reuniao', { ascending: false });

        const { data: memberPresences } = await clientToUse
            .from('presencas_membros')
            .select('reuniao_id, presente')
            .eq('membro_id', membroId);

        const memberPresencesMap = new Map((memberPresences || []).map(p => [p.reuniao_id, p.presente]));

        return {
            membro_data: membroDataWithCelularName,
            historico_presenca: (allReunioes || []).map(r => ({
                data_reuniao: r.data_reuniao,
                tema: r.tema,
                presente: memberPresencesMap.get(r.id) || false,
            }))
        };
    } catch (error) {
        console.error('Erro ao gerar relatório membro:', error);
        throw error;
    }
}

export async function fetchReportDataFaltososPeriodo(startDate: string, endDate: string, celulaIdParaFiltrar?: string | null): Promise<ReportDataFaltososPeriodo> {
    const { supabase, role, celulaId, adminSupabase } = await checkUserAuthorizationReports();
    // Retorno padrão vazio corrigido
    const emptyReturn = { 
        faltosos: [], 
        periodo: { start_date: startDate, end_date: endDate, total_reunioes: 0 } 
    };

    if (!role) return emptyReturn;

    const clientToUse = role === 'admin' && adminSupabase ? adminSupabase : supabase;
    let targetCelulaIdForQuery: string | null = (role === 'líder') ? celulaId : (celulaIdParaFiltrar ?? null);

    if (role === 'líder' && !celulaId) return emptyReturn;

    try {
        let reunioesQuery = clientToUse.from('reunioes').select('id, celula_id');
        if (targetCelulaIdForQuery) reunioesQuery = reunioesQuery.eq('celula_id', targetCelulaIdForQuery);

        const { data: reunioesNoPeriodo } = await reunioesQuery.gte('data_reuniao', startDate).lte('data_reuniao', endDate);

        const reunioesPorCelula = (reunioesNoPeriodo || []).reduce((acc, r) => {
            if (!acc.has(r.celula_id)) acc.set(r.celula_id, []);
            acc.get(r.celula_id)!.push(r.id);
            return acc;
        }, new Map<string, string[]>());

        if (reunioesPorCelula.size === 0) return emptyReturn;

        let membersQuery = clientToUse.from('membros').select('id, nome, telefone, celula_id');
        if (targetCelulaIdForQuery) membersQuery = membersQuery.eq('celula_id', targetCelulaIdForQuery);

        const { data: allMembers } = await membersQuery;
        const celulasNamesMap = await getCelulasNamesMap(new Set((allMembers || []).map(m => m.celula_id)), clientToUse, adminSupabase);

        const faltososList: MembroFaltoso[] = [];

        for (const membro of allMembers || []) {
            const reunioesDaCelula = reunioesPorCelula.get(membro.celula_id) || [];
            const totalReunioes = reunioesDaCelula.length;
            if (totalReunioes === 0) continue;

            const { count: totalPresencas } = await clientToUse
                .from('presencas_membros')
                .select('id', { count: 'exact' })
                .eq('membro_id', membro.id)
                .eq('presente', true)
                .in('reuniao_id', reunioesDaCelula);

            if ((totalPresencas ?? 0) < totalReunioes) {
                faltososList.push({
                    id: membro.id,
                    nome: membro.nome,
                    telefone: membro.telefone,
                    total_presencas: totalPresencas ?? 0,
                    total_reunioes_no_periodo: totalReunioes,
                    celula_nome: celulasNamesMap.get(membro.celula_id) || null,
                });
            }
        }

        faltososList.sort((a, b) => a.nome.localeCompare(b.nome));
        
        return { 
            faltosos: faltososList, 
            periodo: {
                start_date: startDate, 
                end_date: endDate,
                total_reunioes: reunioesNoPeriodo?.length || 0 
            } 
        };
    } catch (error) {
        console.error('Erro faltosos:', error);
        throw error;
    }
}

export async function fetchReportDataVisitantesPeriodo(startDate: string, endDate: string, celulaIdParaFiltrar?: string | null): Promise<ReportDataVisitantesPeriodo> {
    const { supabase, role, celulaId, adminSupabase } = await checkUserAuthorizationReports();
    const emptyReturn = { visitantes: [], periodo: { start_date: startDate, end_date: endDate, total_visitantes: 0 } };

    if (!role) return emptyReturn;

    // CORRIGIDO: Definição única do cliente
    const clientToUse = role === 'admin' && adminSupabase ? adminSupabase : supabase;
    if (!clientToUse) throw new Error("Erro interno: Cliente indisponível");

    // CORRIGIDO: Construção da query após ter o cliente
    let query = clientToUse.from('visitantes').select('id, nome, telefone, data_primeira_visita, celula_id');

    if (role === 'líder') {
        if (!celulaId) return emptyReturn;
        query = query.eq('celula_id', celulaId);
    } else if (role === 'admin' && celulaIdParaFiltrar) {
        query = query.eq('celula_id', celulaIdParaFiltrar);
    }

    try {
        const { data, error } = await query
            .gte('data_primeira_visita', startDate)
            .lte('data_primeira_visita', endDate)
            .order('data_primeira_visita', { ascending: true });

        if (error) throw error;

        const visitantes = data || [];
        if (visitantes.length === 0) return emptyReturn;

        const celulasNamesMap = await getCelulasNamesMap(new Set(visitantes.map(v => v.celula_id)), clientToUse, adminSupabase);

        const visitantesWithCelularName = visitantes.map(v => ({
            ...v,
            celula_nome: celulasNamesMap.get(v.celula_id) || null,
        }));

        return {
            visitantes: visitantesWithCelularName,
            periodo: {
                start_date: startDate,
                end_date: endDate,
                total_visitantes: visitantes.length
            }
        };
    } catch (error) {
        console.error('Erro visitantes periodo:', error);
        throw error;
    }
}

export async function fetchReportDataAniversariantes(mes: number, celulaIdParaFiltrar?: string | null): Promise<ReportDataAniversariantes | null> {
    const { supabase, role, celulaId, adminSupabase } = await checkUserAuthorizationReports();
    if (!role) return null;

    const clientToUse = role === 'admin' && adminSupabase ? adminSupabase : supabase;
    let targetCelulaId = (role === 'líder') ? celulaId : (celulaIdParaFiltrar ?? null);
    if (!targetCelulaId && role !== 'admin') return null;

    try {
        // RPC Membros
        const { data: membroIds } = await clientToUse.rpc('get_members_birthday_ids_in_month', {
            p_month: mes,
            p_celula_id: targetCelulaId
        });

        let membrosRaw: Membro[] = [];
        if (membroIds && membroIds.length > 0) {
            const res = await clientToUse.from('membros').select('id, nome, telefone, data_nascimento, celula_id').in('id', membroIds);
            membrosRaw = res.data as Membro[] || [];
        }

        // RPC Visitantes
        const { data: visitanteIds } = await clientToUse.rpc('get_visitors_birthday_ids_in_month', {
            p_month: mes,
            p_celula_id: targetCelulaId
        });

        let visitantesRaw: Visitante[] = [];
        if (visitanteIds && visitanteIds.length > 0) {
            const res = await clientToUse.from('visitantes').select('id, nome, telefone, data_primeira_visita, data_nascimento, celula_id').in('id', visitanteIds);
            visitantesRaw = res.data as Visitante[] || [];
        }

        const allCelulaIds = new Set<string>();
        membrosRaw.forEach(m => m.celula_id && allCelulaIds.add(m.celula_id));
        visitantesRaw.forEach(v => v.celula_id && allCelulaIds.add(v.celula_id));

        const celulasNamesMap = await getCelulasNamesMap(allCelulaIds, clientToUse, adminSupabase);

        const mapMembro = (m: Membro): MembroAniversariante => ({
            id: m.id, nome: m.nome, data_nascimento: m.data_nascimento!, telefone: m.telefone,
            celula_id: m.celula_id, celula_nome: celulasNamesMap.get(m.celula_id!) || null
        });

        const mapVisitante = (v: Visitante): VisitanteAniversariante => ({
            id: v.id, nome: v.nome, data_primeira_visita: v.data_primeira_visita, data_nascimento: v.data_nascimento!, telefone: v.telefone,
            celula_id: v.celula_id, celula_nome: celulasNamesMap.get(v.celula_id!) || null
        });

        const sortDate = (a: any, b: any) => parseISO(a.data_nascimento).getDate() - parseISO(b.data_nascimento).getDate();

        return {
            mes,
            ano_referencia: new Date().getFullYear(),
            membros: membrosRaw.map(mapMembro).sort(sortDate),
            visitantes: visitantesRaw.map(mapVisitante).sort(sortDate),
        };
    } catch (error) {
        console.error("Erro aniversariantes:", error);
        throw error;
    }
}

export async function fetchReportDataAlocacaoLideres(): Promise<ReportDataAlocacaoLideres | null> {
    const { role, adminSupabase } = await checkUserAuthorizationReports();
    if (role !== 'admin' || !adminSupabase) return null;

    try {
        const [allProfiles, allCelulas, authUsers] = await Promise.all([
            adminSupabase.from('profiles').select('id, email, role, celula_id, created_at, nome_completo'),
            adminSupabase.from('celulas').select('id, nome, lider_principal'),
            adminSupabase.auth.admin.listUsers()
        ]);

        const profiles = allProfiles.data || [];
        const celulas = allCelulas.data || [];
        const celulasNamesMap = await getCelulasNamesMap(new Set(celulas.map(c => c.id)), adminSupabase, adminSupabase);
        const authUsersMap = new Map((authUsers.data?.users || []).map(u => [u.id, u.last_sign_in_at]));

        const lideresAlocados: LiderAlocacaoItem[] = [];
        const lideresNaoAlocados: LiderAlocacaoItem[] = [];
        const celulasComLider = new Set<string>();

        for (const profile of profiles) {
            if (profile.role === 'líder' || profile.role === 'admin') {
                const item: LiderAlocacaoItem = {
                    id: profile.id,
                    email: profile.email || profile.nome_completo || 'N/A',
                    role: profile.role,
                    celula_id: profile.celula_id,
                    celula_nome: profile.celula_id ? celulasNamesMap.get(profile.celula_id) || null : null,
                    data_criacao_perfil: profile.created_at,
                    ultimo_login: authUsersMap.get(profile.id) || null,
                };

                if (profile.celula_id) {
                    lideresAlocados.push(item);
                    celulasComLider.add(profile.celula_id);
                } else {
                    lideresNaoAlocados.push(item);
                }
            }
        }

        const celulasSemLider = celulas
            .filter(c => !celulasComLider.has(c.id))
            .map(c => ({ id: c.id, nome: c.nome, lider_principal_cadastrado_na_celula: c.lider_principal || null }));

        return {
            lideres_alocados: lideresAlocados,
            lideres_nao_alocados: lideresNaoAlocados,
            celulas_sem_lider_atribuido: celulasSemLider,
            total_perfis_lider: profiles.filter(p => p.role === 'líder' || p.role === 'admin').length,
            total_celulas: celulas.length,
        };
    } catch (error) {
        console.error("Erro alocação lideres:", error);
        throw error;
    }
}

export async function fetchReportDataChavesAtivacao(): Promise<ReportDataChavesAtivacao | null> {
    const { role, adminSupabase } = await checkUserAuthorizationReports();
    if (role !== 'admin' || !adminSupabase) return null;

    try {
        const { data: chaves } = await adminSupabase.from('chaves_ativacao').select(`
            chave, celula_id, usada, created_at, data_uso, usada_por_id, profiles(email)
        `);

        const allChaves = chaves || [];
        const celulasNamesMap = await getCelulasNamesMap(new Set(allChaves.map(c => c.celula_id)), adminSupabase, adminSupabase);

        const chavesAtivas: ChaveAtivacaoItem[] = [];
        const chavesUsadas: ChaveAtivacaoItem[] = [];

        for (const chave of allChaves) {
            const item: ChaveAtivacaoItem = {
                chave: chave.chave,
                celula_id: chave.celula_id,
                celula_nome: celulasNamesMap.get(chave.celula_id) || 'N/A',
                usada: chave.usada,
                data_uso: chave.data_uso ? new Date(chave.data_uso).toISOString().split('T')[0] : null,
                usada_por_id: chave.usada_por_id,
                usada_por_email: (chave as any).profiles?.email || null,
            };
            chave.usada ? chavesUsadas.push(item) : chavesAtivas.push(item);
        }

        return {
            chaves_ativas: chavesAtivas,
            chaves_usadas: chavesUsadas,
            total_chaves: allChaves.length,
        };
    } catch (error) {
        console.error("Erro chaves ativação:", error);
        throw error;
    }
}


// ============================================================================
//                          FUNÇÕES DE EXPORTAÇÃO CSV
// ============================================================================

function escapeCsv(value: string | number | null | undefined): string {
    if (value === null || value === undefined) return '';
    const strValue = String(value).replace(/"/g, '""');
    return `"${strValue}"`;
}

export async function exportReportDataPresencaReuniaoCSV(reuniaoId: string, celulaIdParaFiltrar?: string | null): Promise<string> {
    const reportData = await fetchReportDataPresencaReuniao(reuniaoId, celulaIdParaFiltrar);
    if (!reportData) return "Nenhum dado encontrado para exportação CSV.";

    let csv = `Detalhes da Reunião:
Data,${escapeCsv(reportData.reuniao_detalhes.data_reuniao)}
Tema,${escapeCsv(reportData.reuniao_detalhes.tema)}
Ministrador Principal,${escapeCsv(reportData.reuniao_detalhes.ministrador_principal_nome)}
Ministrador Secundário,${escapeCsv(reportData.reuniao_detalhes.ministrador_secundario_nome)}
Responsável Kids,${escapeCsv(reportData.reuniao_detalhes.responsavel_kids_nome)}
Crianças Presentes,${escapeCsv(reportData.reuniao_detalhes.num_criancas)}
Célula,${escapeCsv(reportData.reuniao_detalhes.celula_nome)}

Membros Presentes:
Nome,Telefone
${reportData.membros_presentes.map(m => `${escapeCsv(m.nome)},${escapeCsv(formatPhoneNumberDisplay(m.telefone))}`).join('\n')}

Membros Ausentes:
Nome,Telefone
${reportData.membros_ausentes.map(m => `${escapeCsv(m.nome)},${escapeCsv(formatPhoneNumberDisplay(m.telefone))}`).join('\n')}

Visitantes Presentes:
Nome,Telefone
${reportData.visitantes_presentes.map(v => `${escapeCsv(v.nome)},${escapeCsv(formatPhoneNumberDisplay(v.telefone))}`).join('\n')}
`;
    return csv;
}

export async function exportReportDataPresencaMembroCSV(membroId: string, celulaIdParaFiltrar?: string | null): Promise<string> {
    const reportData = await fetchReportDataPresencaMembro(membroId, celulaIdParaFiltrar);
    if (!reportData || !reportData.membro_data) return "Nenhum dado encontrado para exportação CSV.";

    const { membro_data, historico_presenca } = reportData;

    let csv = `Detalhes do Membro:
Nome,${escapeCsv(membro_data.nome)}
Telefone,${escapeCsv(formatPhoneNumberDisplay(membro_data.telefone))}
Data de Ingresso,${escapeCsv(formatDateForDisplay(membro_data.data_ingresso))}
Data de Nascimento,${escapeCsv(formatDateForDisplay(membro_data.data_nascimento))}
Célula,${escapeCsv(membro_data.celula_nome)}

Histórico de Presença:
Data da Reunião,Tema,Presente?
${historico_presenca.map(h => `${escapeCsv(formatDateForDisplay(h.data_reuniao))},${escapeCsv(h.tema)},${escapeCsv(h.presente ? 'Sim' : 'Não')}`).join('\n')}
`;
    return csv;
}

export async function exportReportDataFaltososPeriodoCSV(startDate: string, endDate: string, celulaIdParaFiltrar?: string | null): Promise<string> {
    const reportData = await fetchReportDataFaltososPeriodo(startDate, endDate, celulaIdParaFiltrar);
    if (!reportData || reportData.faltosos.length === 0) return "Nenhum dado encontrado para exportação CSV.";

    // CORREÇÃO AQUI: Usando .periodo.start_date
    return `Relatório de Membros Faltosos entre ${formatDateForDisplay(reportData.periodo.start_date)} e ${formatDateForDisplay(reportData.periodo.end_date)}

Nome,Telefone,Presenças,Reuniões no Período,Célula
${reportData.faltosos.map(f => `${escapeCsv(f.nome)},${escapeCsv(formatPhoneNumberDisplay(f.telefone))},${escapeCsv(f.total_presencas)},${escapeCsv(f.total_reunioes_no_periodo)},${escapeCsv(f.celula_nome)}`).join('\n')}
`;
}

export async function exportReportDataVisitantesPeriodoCSV(startDate: string, endDate: string, celulaIdParaFiltrar?: string | null): Promise<string> {
    const reportData = await fetchReportDataVisitantesPeriodo(startDate, endDate, celulaIdParaFiltrar);
    if (!reportData || reportData.visitantes.length === 0) return "Nenhum dado encontrado para exportação CSV.";

    return `Relatório de Visitantes entre ${formatDateForDisplay(reportData.periodo.start_date)} e ${formatDateForDisplay(reportData.periodo.end_date)}

Nome,Telefone,Primeira Visita,Célula
${reportData.visitantes.map(v => `${escapeCsv(v.nome)},${escapeCsv(formatPhoneNumberDisplay(v.telefone))},${escapeCsv(formatDateForDisplay(v.data_primeira_visita))},${escapeCsv(v.celula_nome)}`).join('\n')}
`;
}

export async function exportReportDataAniversariantesCSV(mes: number, celulaIdParaFiltrar?: string | null): Promise<string> {
    const reportData = await fetchReportDataAniversariantes(mes, celulaIdParaFiltrar);
    if (!reportData) return "Nenhum dado encontrado para exportação CSV.";

    const mesNome = new Date(reportData.ano_referencia, reportData.mes - 1).toLocaleString('pt-BR', { month: 'long' });
    let csv = `Aniversariantes de ${mesNome} de ${reportData.ano_referencia}\n\n`;

    if (reportData.membros.length > 0) {
        csv += `Membros Aniversariantes:\nNome,Data Nasc.,Telefone,Célula\n`;
        csv += reportData.membros.map(m => `${escapeCsv(m.nome)},${escapeCsv(formatDateForDisplay(m.data_nascimento))},${escapeCsv(formatPhoneNumberDisplay(m.telefone))},${escapeCsv(m.celula_nome)}`).join('\n');
    } else {
        csv += `Nenhum membro aniversariante neste mês.\n`;
    }

    csv += `\n\n`;

    if (reportData.visitantes.length > 0) {
        csv += `Visitantes Aniversariantes:\nNome,Data Nasc.,Telefone,Célula\n`;
        csv += reportData.visitantes.map(v => `${escapeCsv(v.nome)},${escapeCsv(formatDateForDisplay(v.data_nascimento))},${escapeCsv(formatPhoneNumberDisplay(v.telefone))},${escapeCsv(v.celula_nome)}`).join('\n');
    } else {
        csv += `Nenhum visitante aniversariante neste mês.\n`;
    }

    return csv;
}

export async function exportReportDataAlocacaoLideresCSV(): Promise<string> {
    const reportData = await fetchReportDataAlocacaoLideres();
    if (!reportData) return "Nenhum dado encontrado para exportação CSV.";

    const dataGeracao = formatDateForDisplay(new Date().toISOString());
    let csv = `Relatório de Alocação de Líderes - Gerado em: ${dataGeracao}
Total de Perfis de Líder/Admin: ${reportData.total_perfis_lider}
Total de Células Registradas: ${reportData.total_celulas}\n\n`;

    if (reportData.lideres_alocados.length > 0) {
        csv += `Líderes Alocados em Células:\nEmail,Role,Célula Associada,Último Login\n`;
        csv += reportData.lideres_alocados.map(l => `${escapeCsv(l.email)},${escapeCsv(l.role)},${escapeCsv(l.celula_nome)},${escapeCsv(formatDateForDisplay(l.ultimo_login))}`).join('\n');
    } else {
        csv += `Nenhum líder alocado em célula encontrado.\n`;
    }

    csv += `\n\n`;

    if (reportData.lideres_nao_alocados.length > 0) {
        csv += `Líderes sem Célula Alocada no Perfil:\nEmail,Role,Data Criação Perfil,Último Login\n`;
        csv += reportData.lideres_nao_alocados.map(l => `${escapeCsv(l.email)},${escapeCsv(l.role)},${escapeCsv(formatDateForDisplay(l.data_criacao_perfil))},${escapeCsv(formatDateForDisplay(l.ultimo_login))}`).join('\n');
    } else {
        csv += `Nenhum líder sem célula alocada encontrado.\n`;
    }

    csv += `\n\n`;

    if (reportData.celulas_sem_lider_atribuido.length > 0) {
        csv += `Células sem Líder Atribuído em Perfis:\nNome da Célula,Líder Principal (no registro da célula)\n`;
        csv += reportData.celulas_sem_lider_atribuido.map(c => `${escapeCsv(c.nome)},${escapeCsv(c.lider_principal_cadastrado_na_celula)}`).join('\n');
    } else {
        csv += `Nenhuma célula sem líder atribuído encontrada.\n`;
    }

    return csv;
}

export async function exportReportDataChavesAtivacaoCSV(): Promise<string> {
    const reportData = await fetchReportDataChavesAtivacao();
    if (!reportData) return "Nenhum dado encontrado para exportação CSV.";

    const dataGeracao = formatDateForDisplay(new Date().toISOString());
    let csv = `Relatório de Chaves de Ativação - Gerado em: ${dataGeracao}
Total de Chaves Registradas: ${reportData.total_chaves}\n\n`;

    if (reportData.chaves_ativas.length > 0) {
        csv += `Chaves Ativas:\nChave,Célula Associada\n`;
        csv += reportData.chaves_ativas.map(c => `${escapeCsv(c.chave)},${escapeCsv(c.celula_nome)}`).join('\n');
    } else {
        csv += `Nenhuma chave de ativação ativa encontrada.\n`;
    }

    csv += `\n\n`;

    if (reportData.chaves_usadas.length > 0) {
        csv += `Chaves Usadas:\nChave,Célula Original,Usada Por (Email),Data de Uso\n`;
        csv += reportData.chaves_usadas.map(c => `${escapeCsv(c.chave)},${escapeCsv(c.celula_nome)},${escapeCsv(c.usada_por_email)},${escapeCsv(formatDateForDisplay(c.data_uso))}`).join('\n');
    } else {
        csv += `Nenhuma chave de ativação usada encontrada.\n`;
    }

    return csv;
}