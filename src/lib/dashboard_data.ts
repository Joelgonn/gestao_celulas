// src/lib/dashboard_data.ts



import { createServerClient, createAdminClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { startOfWeek, endOfWeek, format, getDay, isSameDay, subMonths, eachWeekOfInterval, subWeeks, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// --- REMOÇÃO DA IMPORTAÇÃO INCORRETA ---
// A linha 'import { getPalavraDaSemana } from '@/lib/data';' foi removida daqui,
// pois esta função não é usada neste arquivo.

// ============================================================================
//                                INTERFACES EXPORTADAS
// ============================================================================

export interface LastMeetingPresence {
  id: string;
  data_reuniao: string;
  num_presentes_membros: number;
  num_ausentes_membros: number;
  num_presentes_visitantes: number;
  num_criancas: number;
  tema?: string;
  ministrador_principal_nome?: string | null; 
  celula_nome?: string | null;
}

export interface MembroDashboard {
    id: string;
    nome: string;
    data_ingresso: string;
    celula_nome?: string | null;
    data_nascimento?: string | null;
}

export interface VisitanteDashboard {
    id: string;
    nome: string;
    data_primeira_visita: string;
    celula_nome?: string | null;
}

export interface ReuniaoComNomes {
    id: string;
    data_reuniao: string;
    tema: string;
    ministrador_principal_nome?: string | null;
    ministrador_secundario_nome?: string | null;
    responsavel_kids_nome?: string | null;
    num_criancas: number;
    celula_id: string; 
    celula_nome?: string | null; 
    caminho_pdf: string | null; 
+   num_presentes_membros: number; // ADICIONADO AQUI!
+   num_presentes_visitantes: number; // ADICIONADO AQUI!
}
export interface FaltososAlert {
    count: number;
    members: { id: string; nome: string; telefone: string | null }[];
    startDate: string;
    endDate: string;
    totalMeetingsPeriod: number;
}

export interface UnconvertedVisitorsAlert {
    count: number;
    visitors: { id: string; nome: string; data_primeira_visita: string; telefone: string | null }[];
}

export interface BirthdayAlert {
    count: number;
    members: { id: string; nome: string; data_nascimento: string }[];
}

export interface AveragePresenceRateData {
    labels: string[];
    data: number[];
}

export interface CelulasSummary {
    totalCelulas: number;
    celulasWithoutLeaders: number;
}

export interface TopFlopPresence {
    celula_id: string;
    celula_nome: string;
    avg_presence: number;
}

export interface CelulaGrowth {
    celula_id: string;
    celula_nome: string;
    growth_members: number;
    growth_visitors: number;
}

export interface MembersByCelulaDistribution {
    celula_nome: string;
    count: number;
}

export interface VisitorsByCelulaDistribution {
    celula_nome: string;
    count: number;
}

export interface VisitorsConversionAnalysis {
    celula_id: string;
    celula_nome: string;
    visitors: {
        id: string;
        nome: string;
        telefone: string | null;
        total_presences: number;
        data_primeira_visita: string;
    }[];
    total_unconverted_with_presences: number;
}

export interface NewVisitorsTrendData {
    labels: string[];
    data: number[];
}

export interface DuplicateVisitorGroup {
    group_id: string;
    visitors: { id: string; nome: string; telefone: string | null; celula_nome: string | null }[];
    common_value: string;
    type: 'nome' | 'telefone';
}

export interface ActivityLogItem {
    id: string;
    type: 'member_added' | 'visitor_added' | 'reunion_added' | 'visitor_converted' | 'celula_created' | 'celula_updated' | 'profile_activated';
    description: string;
    created_at: string;
    celula_nome?: string | null;
}

// ============================================================================
//                          FUNÇÕES AUXILIARES (INTERNAS)
// ============================================================================

async function checkUserAuthorizationDashboard(): Promise<{
    supabase: any;
    role: 'admin' | 'líder' | null;
    celulaId: string | null;
}> {
    const supabaseClient = createServerClient();
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
        console.warn('checkUserAuthorizationDashboard: Usuário não autenticado.');
        return { supabase: supabaseClient, role: null, celulaId: null };
    }

    const { data: profileData, error: profileError } = await supabaseClient
        .from('profiles')
        .select('celula_id, role')
        .eq('id', user.id)
        .single();

    if (profileError || !profileData) {
        console.error('checkUserAuthorizationDashboard: Erro ao buscar perfil do usuário:', profileError?.message || 'Perfil não encontrado.');
        return { supabase: supabaseClient, role: null, celulaId: null };
    }

    const role = profileData.role as 'admin' | 'líder';
    const celulaId = profileData.celula_id;

    if (role === 'admin') {
        const supabaseAdmin = createAdminClient();
        return { supabase: supabaseAdmin, role: 'admin', celulaId: celulaId }; 
    } else {
        return { supabase: supabaseClient, role: 'líder', celulaId: celulaId };
    }
}


async function getMemberNamesMap(memberIds: Set<string>, celulaId: string | null, supabaseInstance: any): Promise<Map<string, { nome: string; telefone: string | null }>> {
    let namesMap = new Map<string, { nome: string; telefone: string | null }>();
    if (memberIds.size === 0) return namesMap;
    let query = supabaseInstance.from('membros').select('id, nome, telefone').in('id', Array.from(memberIds));
    if (celulaId !== null) { query = query.eq('celula_id', celulaId); }
    const { data: membersData, error: membersError } = await query;
    if (membersError) { console.error("Erro ao buscar nomes e telefones de membros (getMemberNamesMap):", membersError); } 
    else { membersData?.forEach(m => namesMap.set(m.id, { nome: m.nome, telefone: m.telefone })); }
    return namesMap;
}

async function getCelulasNamesMap(celulaIds: Set<string>, supabaseInstance: any): Promise<Map<string, string>> {
    let namesMap = new Map<string, string>();
    if (celulaIds.size === 0) return namesMap;
    const { data, error } = await supabaseInstance.from('celulas').select('id, nome').in('id', Array.from(celulaIds));
    if (error) { console.error("Erro ao buscar nomes de células (getCelulasNamesMap):", error); } 
    else { data?.forEach(c => namesMap.set(c.id, c.nome)); }
    return namesMap;
}


// ============================================================================
//                               FUNÇÕES DE DASHBOARD (Server Actions)
// ============================================================================
// (O restante das funções permanece o mesmo)

export async function getTotalMembros(celulaIdFilter: string | null = null): Promise<number> {
  const { supabase, role, celulaId: userCelulaId } = await checkUserAuthorizationDashboard();
  if (!role) { return 0; }
  let query = supabase.from('membros').select('id', { count: 'exact', head: true });
  if (role === 'líder') { if (!userCelulaId) { return 0; } query = query.eq('celula_id', userCelulaId); } 
  else if (role === 'admin' && celulaIdFilter) { query = query.eq('celula_id', celulaIdFilter); }
  const { count, error } = await query;
  if (error) { throw new Error(`Falha ao carregar total de membros: ${error.message}`); }
  return count || 0;
}

export async function getTotalVisitantesDistintos(celulaIdFilter: string | null = null): Promise<number> {
  const { supabase, role, celulaId: userCelulaId } = await checkUserAuthorizationDashboard();
  if (!role) { return 0; }
  let query = supabase.from('visitantes').select('id', { count: 'exact', head: true });
  if (role === 'líder') { if (!userCelulaId) { return 0; } query = query.eq('celula_id', userCelulaId); } 
  else if (role === 'admin' && celulaIdFilter) { query = query.eq('celula_id', celulaIdFilter); }
  const { count, error } = await query;
  if (error) { throw new Error(`Falha ao carregar total de visitantes: ${error.message}`); }
  return count || 0;
}

export async function getPresenceCountsLastMeeting(celulaIdFilter: string | null = null): Promise<LastMeetingPresence | null> {
  const { supabase, role, celulaId: userCelulaId } = await checkUserAuthorizationDashboard();
  if (!role) { return null; }
  let targetCelulaId: string | null = null;
  if (role === 'líder') { if (!userCelulaId) { return null; } targetCelulaId = userCelulaId; } 
  else if (role === 'admin' && celulaIdFilter) { targetCelulaId = celulaIdFilter; } 
  let lastMeetingQuery = supabase.from('reunioes').select('id, data_reuniao, tema, celula_id, ministrador_principal');
  if (targetCelulaId) { lastMeetingQuery = lastMeetingQuery.eq('celula_id', targetCelulaId); }
  const { data: lastMeetingRaw, error: lastMeetingError } = await lastMeetingQuery.order('data_reuniao', { ascending: false }).limit(1).maybeSingle();
  if (lastMeetingError) { throw new Error(`Falha ao carregar última reunião: ${lastMeetingError.message}`); }
  if (!lastMeetingRaw) { return null; }
  const reuniaoId = lastMeetingRaw.id;
  const dataReuniao = lastMeetingRaw.data_reuniao;
  const temaReuniao = lastMeetingRaw.tema;
  const reuniaoCelulaId = lastMeetingRaw.celula_id;
  let celulaName: string | null = null;
  if (reuniaoCelulaId) { const celulaNamesMap = await getCelulasNamesMap(new Set([reuniaoCelulaId]), supabase); celulaName = celulaNamesMap.get(reuniaoCelulaId) || null; }
  let ministradorPrincipalNome: string | null = null;
  if (lastMeetingRaw.ministrador_principal) { const memberNamesMap = await getMemberNamesMap(new Set([lastMeetingRaw.ministrador_principal]), reuniaoCelulaId, supabase); ministradorPrincipalNome = memberNamesMap.get(lastMeetingRaw.ministrador_principal)?.nome || null; }
  const { count: presentesMembrosCount, error: pmError } = await supabase.from('presencas_membros').select('id', { count: 'exact', head: true }).eq('reuniao_id', reuniaoId).eq('presente', true);
  if (pmError) { throw new Error(`Falha ao contar membros presentes: ${pmError.message}`); }
  const numPresentesMembros = presentesMembrosCount || 0;
  let totalMembrosCelula = 0;
  if (reuniaoCelulaId) { const { count, error } = await supabase.from('membros').select('id', { count: 'exact', head: true }).eq('celula_id', reuniaoCelulaId); if (error) console.error("Erro ao obter total de membros da célula para ausentes:", error); totalMembrosCelula = count || 0; }
  const numAusentesMembros = Math.max(0, totalMembrosCelula - numPresentesMembros);
  const { count: presentesVisitantesCount, error: pvError } = await supabase.from('presencas_visitantes').select('id', { count: 'exact', head: true }).eq('reuniao_id', reuniaoId).eq('presente', true);
  if (pvError) { throw new Error(`Falha ao contar visitantes presentes: ${pvError.message}`); }
  const numPresentesVisitantes = presentesVisitantesCount || 0;
  const { data: criancasData, error: criancasError } = await supabase.from('criancas_reuniao').select('numero_criancas').eq('reuniao_id', reuniaoId).maybeSingle();
  if (criancasError) { throw new Error(`Falha ao obter número de crianças: ${criancasError.message}`); }
  const numCriancas = criancasData?.numero_criancas || 0;
  return { id: reuniaoId, data_reuniao: dataReuniao, tema: temaReuniao, ministrador_principal_nome: ministradorPrincipalNome, celula_nome: celulaName, num_presentes_membros: numPresentesMembros, num_ausentes_membros: numAusentesMembros, num_presentes_visitantes: numPresentesVisitantes, num_criancas: numCriancas, };
}

export async function getRecentesMembros(limit: number = 5, celulaIdFilter: string | null = null): Promise<MembroDashboard[]> {
  const { supabase, role, celulaId: userCelulaId } = await checkUserAuthorizationDashboard();
  if (!role) { return []; }
  let query = supabase.from('membros').select('id, nome, data_ingresso, celula_id, data_nascimento'); 
  if (role === 'líder') { if (!userCelulaId) { return []; } query = query.eq('celula_id', userCelulaId); } 
  else if (role === 'admin' && celulaIdFilter) { query = query.eq('celula_id', celulaIdFilter); }
  const { data, error } = await query.order('created_at', { ascending: false }).limit(limit);
  if (error) { throw new Error(`Falha ao carregar membros recentes: ${error.message}`); }
  const membros = data || []; if (membros.length === 0) return [];
  const celulaIds = new Set(membros.map(m => m.celula_id)); const celulasNamesMap = await getCelulasNamesMap(celulaIds, supabase); 
  return membros.map(m => ({ id: m.id, nome: m.nome, data_ingresso: m.data_ingresso, celula_nome: celulasNamesMap.get(m.celula_id) || null, data_nascimento: m.data_nascimento, }));
}

export async function getRecentesVisitantes(limit: number = 5, celulaIdFilter: string | null = null): Promise<VisitanteDashboard[]> {
  const { supabase, role, celulaId: userCelulaId } = await checkUserAuthorizationDashboard();
  if (!role) { return []; }
  let query = supabase.from('visitantes').select('id, nome, data_primeira_visita, celula_id'); 
  if (role === 'líder') { if (!userCelulaId) { return []; } query = query.eq('celula_id', userCelulaId); } 
  else if (role === 'admin' && celulaIdFilter) { query = query.eq('celula_id', celulaIdFilter); }
  const { data, error } = await query.order('created_at', { ascending: false }).limit(limit);
  if (error) { throw new Error(`Falha ao carregar visitantes recentes: ${error.message}`); }
  const visitantes = data || []; if (visitantes.length === 0) return [];
  const celulaIds = new Set(visitantes.map(v => v.celula_id)); const celulasNamesMap = await getCelulasNamesMap(celulaIds, supabase); 
  return visitantes.map(v => ({ id: v.id, nome: v.nome, data_primeira_visita: v.data_primeira_visita, celula_nome: celulasNamesMap.get(v.celula_id) || null, }));
}

export async function getUltimasReunioes(limit: number = 5, celulaIdFilter: string | null = null): Promise<ReuniaoComNomes[]> {
    const { supabase, role, celulaId: userCelulaId } = await checkUserAuthorizationDashboard();
    if (!role) { return []; }
    let query = supabase.from('reunioes').select(`id, data_reuniao, tema, caminho_pdf, celula_id, ministrador_principal:membros!ministrador_principal(nome), ministrador_secundario:membros!ministrador_secundario(nome), responsavel_kids:membros!responsavel_kids(nome), criancas_reuniao(numero_criancas)`);
    let targetCelulaId: string | null = null;
    if (role === 'líder') { if (!userCelulaId) { return []; } targetCelulaId = userCelulaId; } 
    else if (role === 'admin' && celulaIdFilter) { targetCelulaId = celulaIdFilter; }
    if (targetCelulaId) { query = query.eq('celula_id', targetCelulaId); }
    const { data, error } = await query.order('data_reuniao', { ascending: false }).limit(limit);
    if (error) { throw new Error(`Falha ao carregar últimas reuniões: ${error.message}`); }
    if (!data || data.length === 0) { return []; }
    const celulaIds = new Set(data.map(item => item.celula_id)); const celulasNamesMap = await getCelulasNamesMap(celulaIds, supabase); 
    const processedData: ReuniaoComNomes[] = data.map((item) => {
        const numCriancas = item.criancas_reuniao?.[0]?.numero_criancas || 0;
        return {
            id: item.id, data_reuniao: item.data_reuniao, tema: item.tema, caminho_pdf: item.caminho_pdf, celula_id: item.celula_id,
            celula_nome: celulasNamesMap.get(item.celula_id) || null, 
            ministrador_principal_nome: item.ministrador_principal?.nome || null,
            ministrador_secundario_nome: item.ministrador_secundario?.nome || null,
            responsavel_kids_nome: item.responsavel_kids?.nome || null,
            num_criancas: numCriancas,
        };
    });
    return processedData;
}

export async function getFaltososAlert(celulaIdFilter: string | null = null, minAbsences: number = 3, numLastMeetings: number = 3): Promise<FaltososAlert> {
    const { supabase, role, celulaId: userCelulaId } = await checkUserAuthorizationDashboard();
    if (!role) { return { count: 0, members: [], startDate: '', endDate: '', totalMeetingsPeriod: 0 }; }
    let targetCelulaId: string | null = null;
    if (role === 'líder') { if (!userCelulaId) { return { count: 0, members: [], startDate: '', endDate: '', totalMeetingsPeriod: 0 }; } targetCelulaId = userCelulaId; } 
    else if (role === 'admin' && celulaIdFilter) { targetCelulaId = celulaIdFilter; }
    if (!targetCelulaId) { return { count: 0, members: [], startDate: '', endDate: '', totalMeetingsPeriod: 0 }; }
    try {
        const { data: lastMeetings, error: meetingsError } = await supabase.from('reunioes').select('id, data_reuniao').eq('celula_id', targetCelulaId).order('data_reuniao', { ascending: false }).limit(numLastMeetings);
        if (meetingsError) throw meetingsError;
        if (!lastMeetings || lastMeetings.length === 0) { return { count: 0, members: [], startDate: '', endDate: '', totalMeetingsPeriod: 0 }; }
        const reuniaoIds = lastMeetings.map(m => m.id);
        const startDate = lastMeetings[lastMeetings.length - 1].data_reuniao;
        const endDate = lastMeetings[0].data_reuniao;
        const totalMeetingsPeriod = lastMeetings.length;
        const { data: allMembers, error: membersError } = await supabase.from('membros').select('id, nome, telefone').eq('celula_id', targetCelulaId);
        if (membersError) throw membersError;
        const membersList = allMembers || [];
        const faltosos: { id: string; nome: string; telefone: string | null }[] = [];
        for (const member of membersList) {
            const { count: presencesCount, error: presencesError } = await supabase.from('presencas_membros').select('id', { count: 'exact', head: true }).eq('membro_id', member.id).eq('presente', true).in('reuniao_id', reuniaoIds);
            if (presencesError) throw presencesError;
            if ((totalMeetingsPeriod - (presencesCount || 0)) >= minAbsences) { faltosos.push({ id: member.id, nome: member.nome, telefone: member.telefone }); }
        }
        return { count: faltosos.length, members: faltosos.sort((a, b) => a.nome.localeCompare(b.nome)), startDate: startDate, endDate: endDate, totalMeetingsPeriod: totalMeetingsPeriod, };
    } catch (e: any) { throw new Error(`Falha ao obter alerta de faltosos: ${e.message}`); }
}

export async function getUnconvertedVisitorsAlert(celulaIdFilter: string | null = null, minDaysOld: number = 30): Promise<UnconvertedVisitorsAlert> {
    const { supabase, role, celulaId: userCelulaId } = await checkUserAuthorizationDashboard();
    if (!role) { return { count: 0, visitors: [] }; }
    let targetCelulaId: string | null = null;
    if (role === 'líder') { if (!userCelulaId) { return { count: 0, visitors: [] }; } targetCelulaId = userCelulaId; } 
    else if (role === 'admin' && celulaIdFilter) { targetCelulaId = celulaIdFilter; }
    if (!targetCelulaId) { return { count: 0, visitors: [] }; }
    try {
        const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - minDaysOld);
        const thirtyDaysAgoISO = thirtyDaysAgo.toISOString().split('T')[0];
        const { data: visitors, error } = await supabase.from('visitantes').select('id, nome, data_primeira_visita, telefone').eq('celula_id', targetCelulaId).lt('data_primeira_visita', thirtyDaysAgoISO).order('data_primeira_visita', { ascending: true });
        if (error) throw error;
        const unconvertedVisitors = visitors || [];
        return { count: unconvertedVisitors.length, visitors: unconvertedVisitors.sort((a, b) => a.nome.localeCompare(b.nome)), };
    } catch (e: any) { throw new Error(`Falha ao obter alerta de visitantes não convertidos: ${e.message}`); }
}

export async function getBirthdaysThisWeek(celulaIdFilter: string | null = null): Promise<BirthdayAlert> {
    const { supabase, role, celulaId: userCelulaId } = await checkUserAuthorizationDashboard();
    if (!role) { return { count: 0, members: [] }; }
    let targetCelulaId: string | null = null;
    if (role === 'líder') { if (!userCelulaId) { return { count: 0, members: [] }; } targetCelulaId = userCelulaId; } 
    else if (role === 'admin' && celulaIdFilter) { targetCelulaId = celulaIdFilter; }
    if (!targetCelulaId) { return { count: 0, members: [] }; }
    try {
        const today = new Date();
        const startOfThisWeek = startOfWeek(today, { locale: ptBR });
        const endOfThisWeek = endOfWeek(today, { locale: ptBR });
        const { data: members, error } = await supabase.from('membros').select('id, nome, data_nascimento').eq('celula_id', targetCelulaId).not('data_nascimento', 'is', null);
        if (error) throw error;
        const birthdaysThisWeek = (members || []).filter(member => {
            if (!member.data_nascimento) return false;
            const birthDate = new Date(member.data_nascimento);
            const currentYearBirthDate = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
            return currentYearBirthDate >= startOfThisWeek && currentYearBirthDate <= endOfThisWeek;
        });
        return {
            count: birthdaysThisWeek.length,
            members: birthdaysThisWeek.map(m => ({ id: m.id, nome: m.nome, data_nascimento: m.data_nascimento! })).sort((a, b) => {
                const dateA = new Date(a.data_nascimento); const dateB = new Date(b.data_nascimento);
                if (dateA.getMonth() !== dateB.getMonth()) { return dateA.getMonth() - dateB.getMonth(); }
                return dateA.getDate() - dateB.getDate();
            }),
        };
    } catch (e: any) { throw new Error(`Falha ao obter alerta de aniversariantes: ${e.message}`); }
}

export async function getCelulasOptionsForAdmin(): Promise<{id: string; nome: string}[]> {
    const { supabase, role } = await checkUserAuthorizationDashboard();
    if (role !== 'admin') { return []; }
    try {
        const { data, error } = await supabase.from('celulas').select('id, nome').order('nome', { ascending: true });
        if (error) { throw new Error(`Falha ao carregar células: ${error.message}`); }
        return data || [];
    } catch (e: any) { throw e; }
}

export async function getAveragePresenceRate(celulaIdFilter: string | null = null, numWeeks: number = 8): Promise<AveragePresenceRateData | null> {
    const { supabase, role, celulaId: userCelulaId } = await checkUserAuthorizationDashboard();
    if (!role) { return null; }
    let targetCelulaId: string | null = null;
    if (role === 'líder') { if (!userCelulaId) { return null; } targetCelulaId = userCelulaId; } 
    else if (role === 'admin' && celulaIdFilter) { targetCelulaId = celulaIdFilter; }
    if (!targetCelulaId) { return null; }
    try {
        const today = new Date(); const startOfPeriod = subWeeks(today, numWeeks); 
        const startOfPeriodISO = startOfPeriod.toISOString().split('T')[0];
        const { data: meetings, error: meetingsError } = await supabase.from('reunioes').select('id, data_reuniao').eq('celula_id', targetCelulaId).gte('data_reuniao', startOfPeriodISO).order('data_reuniao', { ascending: true });
        if (meetingsError) throw meetingsError;
        if (!meetings || meetings.length === 0) { return { labels: [], data: [] }; }
        const reunionsMap = new Map(meetings.map(m => [m.id, m.data_reuniao]));
        const reunionIds = meetings.map(m => m.id);
        const { count: totalMembersInCell, error: membersCountError } = await supabase.from('membros').select('id', { count: 'exact', head: true }).eq('celula_id', targetCelulaId);
        if (membersCountError) throw membersCountError;
        const totalMembers = totalMembersInCell || 0;
        if (totalMembers === 0) { const labels = eachWeekOfInterval({ start: startOfPeriod, end: today }, { locale: ptBR }).map((weekStart) => format(weekStart, 'dd/MM', { locale: ptBR })); return { labels, data: labels.map(() => 0) }; }
        const { data: presences, error: presencesError } = await supabase.from('presencas_membros').select('reuniao_id, membro_id, presente').in('reuniao_id', reunionIds).eq('presente', true);
        if (presencesError) throw presencesError;
        const presencesPerReunion = (presences || []).reduce((acc, p) => { acc.set(p.reuniao_id, (acc.get(p.reuniao_id) || 0) + 1); return acc; }, new Map<string, number>());
        const weeks = eachWeekOfInterval({ start: startOfPeriod, end: today }, { locale: ptBR });
        const labels: string[] = []; const data: number[] = [];
        for (const weekStart of weeks) {
            const weekEnd = endOfWeek(weekStart, { locale: ptBR });
            labels.push(format(weekStart, 'dd/MM', { locale: ptBR }));
            let totalPresencesInWeek = 0; let totalMeetingsInWeek = 0;
            for (const [reunionId, reunionDateStr] of reunionsMap.entries()) {
                const reunionDate = new Date(reunionDateStr);
                if (reunionDate >= weekStart && reunionDate <= weekEnd) { totalPresencesInWeek += (presencesPerReunion.get(reunionId) || 0); totalMeetingsInWeek++; }
            }
            if (totalMeetingsInWeek > 0) { const averagePresence = (totalPresencesInWeek / (totalMeetingsInWeek * totalMembers)) * 100; data.push(parseFloat(averagePresence.toFixed(0))); } 
            else { data.push(0); }
        }
        return { labels, data };
    } catch (e: any) { throw new Error(`Falha ao obter média de presença: ${e.message}`); }
}

export async function getCelulasSummary(): Promise<CelulasSummary> {
    const { supabase, role } = await checkUserAuthorizationDashboard();
    if (role !== 'admin') { return { totalCelulas: 0, celulasWithoutLeaders: 0 }; }
    try {
        const { count: totalCelulas, error: totalCelulasError } = await supabase.from('celulas').select('id', { count: 'exact', head: true });
        if (totalCelulasError) throw totalCelulasError;
        const { data: celulasComLideresRaw, error: lideresError } = await supabase.from('profiles').select('celula_id').eq('role', 'líder').not('celula_id', 'is', null);
        if (lideresError) throw lideresError;
        const celulaIdsComLideres = new Set((celulasComLideresRaw || []).map(p => p.celula_id));
        const { data: allCelulas, error: allCelulasError } = await supabase.from('celulas').select('id');
        if (allCelulasError) throw allCelulasError;
        const celulasWithoutLeaders = (allCelulas || []).filter(celula => !celulaIdsComLideres.has(celula.id)).length;
        return { totalCelulas: totalCelulas || 0, celulasWithoutLeaders: celulasWithoutLeaders, };
    } catch (e: any) { throw new Error(`Falha ao obter resumo de células: ${e.message}`); }
}
export async function getTopBottomPresence(numMeetings: number = 5, limit: number = 3): Promise<{ top: TopFlopPresence[]; bottom: TopFlopPresence[] }> {
    const { supabase, role } = await checkUserAuthorizationDashboard();
    if (role !== 'admin') { return { top: [], bottom: [] }; }
    try {
        const { data: celulas, error: celulasError } = await supabase.from('celulas').select('id, nome');
        if (celulasError) throw celulasError;
        const celulasList = celulas || [];
        const presenceData: TopFlopPresence[] = [];
        for (const celula of celulasList) {
            const { data: lastMeetings, error: meetingsError } = await supabase.from('reunioes').select('id, data_reuniao').eq('celula_id', celula.id).order('data_reuniao', { ascending: false }).limit(numMeetings);
            if (meetingsError) console.warn(`Erro ao buscar reuniões para célula ${celula.nome}: ${meetingsError.message}`);
            const relevantReunionIds = (lastMeetings || []).map(m => m.id);
            const totalMeetingsConsidered = relevantReunionIds.length;
            if (totalMeetingsConsidered === 0) { presenceData.push({ celula_id: celula.id, celula_nome: celula.nome, avg_presence: 0 }); continue; }
            const { count: totalMembersInCell, error: membersCountError } = await supabase.from('membros').select('id', { count: 'exact', head: true }).eq('celula_id', celula.id);
            if (membersCountError) console.warn(`Erro ao contar membros para célula ${celula.nome}: ${membersCountError.message}`);
            const totalMembers = totalMembersInCell || 0;
            if (totalMembers === 0) { presenceData.push({ celula_id: celula.id, celula_nome: celula.nome, avg_presence: 0 }); continue; }
            const { count: totalPresences, error: presencesError } = await supabase.from('presencas_membros').select('id', { count: 'exact', head: true }).in('reuniao_id', relevantReunionIds).eq('presente', true);
            if (presencesError) console.warn(`Erro ao contar presenças para célula ${celula.nome}: ${presencesError.message}`);
            const numPresences = totalPresences || 0;
            const avgPresence = (numPresences / (totalMeetingsConsidered * totalMembers)) * 100;
            presenceData.push({ celula_id: celula.id, celula_nome: celula.nome, avg_presence: parseFloat(avgPresence.toFixed(0)) });
        }
        presenceData.sort((a, b) => b.avg_presence - a.avg_presence);
        return { top: presenceData.slice(0, limit), bottom: presenceData.slice(-limit).reverse(), };
    } catch (e: any) { throw new Error(`Falha ao obter Top/Flop Presença: ${e.message}`); }
}
export async function getCelulaGrowth(numDays: number = 30, limit: number = 3): Promise<{ top_members: CelulaGrowth[]; top_visitors: CelulaGrowth[] }> {
    const { supabase, role } = await checkUserAuthorizationDashboard();
    if (role !== 'admin') { return { top_members: [], top_visitors: [] }; }
    try {
        const today = new Date(); const startOfPeriod = subDays(today, numDays); 
        const startOfPeriodISO = startOfPeriod.toISOString().split('T')[0];
        const { data: celulas, error: celulasError } = await supabase.from('celulas').select('id, nome');
        if (celulasError) throw celulasError;
        const celulasList = celulas || [];
        const growthMembers: CelulaGrowth[] = []; const growthVisitors: CelulaGrowth[] = [];
        for (const celula of celulasList) {
            const { count: newMembers, error: membersError } = await supabase.from('membros').select('id', { count: 'exact', head: true }).eq('celula_id', celula.id).gte('data_ingresso', startOfPeriodISO);
            if (membersError) console.warn(`Erro ao contar novos membros para célula ${celula.nome}: ${membersError.message}`);
            growthMembers.push({ celula_id: celula.id, celula_nome: celula.nome, growth_members: newMembers || 0, growth_visitors: 0 });
            const { count: newVisitors, error: visitorsError } = await supabase.from('visitantes').select('id', { count: 'exact', head: true }).eq('celula_id', celula.id).gte('data_primeira_visita', startOfPeriodISO);
            if (visitorsError) console.warn(`Erro ao contar novos visitantes para célula ${celula.nome}: ${visitorsError.message}`);
            growthVisitors.push({ celula_id: celula.id, celula_nome: celula.nome, growth_members: 0, growth_visitors: newVisitors || 0 });
        }
        growthMembers.sort((a, b) => b.growth_members - a.growth_members);
        growthVisitors.sort((a, b) => b.growth_visitors - a.growth_visitors);
        return { top_members: growthMembers.slice(0, limit), top_visitors: growthVisitors.slice(0, limit) };
    } catch (e: any) { throw new Error(`Falha ao obter Crescimento de Célula: ${e.message}`); }
}
export async function getMembersByCelulaDistribution(): Promise<MembersByCelulaDistribution[]> {
    const { supabase, role } = await checkUserAuthorizationDashboard();
    if (role !== 'admin') { return []; }
    try {
        const { data: allMembers, error } = await supabase.from('membros').select('celula_id');
        if (error) throw error;
        const countsMap = (allMembers || []).reduce((acc, member) => { acc.set(member.celula_id, (acc.get(member.celula_id) || 0) + 1); return acc; }, new Map<string, number>());
        const celulaIds = new Set(Array.from(countsMap.keys())); const celulasNamesMap = await getCelulasNamesMap(celulaIds, supabase);
        const result: MembersByCelulaDistribution[] = [];
        for (const [celula_id, count] of countsMap.entries()) { result.push({ celula_nome: celulasNamesMap.get(celula_id) || 'Célula Desconhecida', count: count }); }
        return result.sort((a, b) => a.celula_nome.localeCompare(b.celula_nome));
    } catch (e: any) { throw new Error(`Falha ao obter distribuição de membros por célula: ${e.message}`); }
}
export async function getVisitorsByCelulaDistribution(): Promise<VisitorsByCelulaDistribution[]> {
    const { supabase, role } = await checkUserAuthorizationDashboard();
    if (role !== 'admin') { return []; }
    try {
        const { data: allVisitors, error } = await supabase.from('visitantes').select('celula_id');
        if (error) throw error;
        const countsMap = (allVisitors || []).reduce((acc, visitor) => { acc.set(visitor.celula_id, (acc.get(visitor.celula_id) || 0) + 1); return acc; }, new Map<string, number>());
        const celulaIds = new Set(Array.from(countsMap.keys())); const celulasNamesMap = await getCelulasNamesMap(celulaIds, supabase);
        const result: VisitorsByCelulaDistribution[] = [];
        for (const [celula_id, count] of countsMap.entries()) { result.push({ celula_nome: celulasNamesMap.get(celula_id) || 'Célula Desconhecida', count: count }); }
        return result.sort((a, b) => a.celula_nome.localeCompare(b.celula_nome));
    } catch (e: any) { throw new Error(`Falha ao obter distribuição de visitantes por célula: ${e.message}`); }
}
export async function getGlobalRecentActivity(limit: number = 10): Promise<ActivityLogItem[]> {
    const { supabase, role } = await checkUserAuthorizationDashboard();
    if (role !== 'admin') { return []; }
    try {
        const activities: (ActivityLogItem & { raw_date: Date })[] = [];
        const { data: newMembers, error: membersError } = await supabase.from('membros').select('id, nome, celula_id, created_at').order('created_at', { ascending: false }).limit(limit);
        if (membersError) console.warn("Erro ao buscar membros recentes para atividade:", membersError.message);
        const { data: newVisitors, error: visitorsError } = await supabase.from('visitantes').select('id, nome, celula_id, created_at').order('created_at', { ascending: false }).limit(limit);
        if (visitorsError) console.warn("Erro ao buscar visitantes recentes para atividade:", visitorsError.message);
        const { data: newReunions, error: reunionsError } = await supabase.from('reunioes').select('id, tema, celula_id, created_at, data_reuniao').order('created_at', { ascending: false }).limit(limit);
        if (reunionsError) console.warn("Erro ao buscar reuniões recentes para atividade:", reunionsError.message);
        const { data: newCelulas, error: celulasError } = await supabase.from('celulas').select('id, nome, created_at').order('created_at', { ascending: false }).limit(limit);
        if (celulasError) console.warn("Erro ao buscar novas células para atividade:", celulasError.message);
        const allCelulaIds = new Set<string>();
        [newMembers, newVisitors, newReunions].forEach(arr => { arr?.forEach(item => { if (item.celula_id) allCelulaIds.add(item.celula_id); }); });
        const celulasNamesMap = await getCelulasNamesMap(allCelulaIds, supabase);
        newMembers?.forEach(m => activities.push({ id: m.id, type: 'member_added', description: `Novo membro: ${m.nome}`, created_at: m.created_at, celula_nome: celulasNamesMap.get(m.celula_id) || 'N/A', raw_date: new Date(m.created_at) }));
        newVisitors?.forEach(v => activities.push({ id: v.id, type: 'visitor_added', description: `Novo visitante: ${v.nome}`, created_at: v.created_at, celula_nome: celulasNamesMap.get(v.celula_id) || 'N/A', raw_date: new Date(v.created_at) }));
        newReunions?.forEach(r => activities.push({ id: r.id, type: 'reunion_added', description: `Nova reunião: ${r.tema}`, created_at: r.created_at, celula_nome: celulasNamesMap.get(r.celula_id) || 'N/A', raw_date: new Date(r.created_at) }));
        newCelulas?.forEach(c => activities.push({ id: c.id, type: 'celula_created', description: `Nova célula: ${c.nome}`, created_at: c.created_at, celula_nome: c.nome, raw_date: new Date(c.created_at) }));
        activities.sort((a, b) => b.raw_date.getTime() - a.raw_date.getTime());
        return activities.slice(0, limit);
    } catch (e: any) { throw e; }
}
export async function getVisitorsConversionAnalysis(): Promise<VisitorsConversionAnalysis[] | null> {
    const { supabase, role } = await checkUserAuthorizationDashboard();
    if (role !== 'admin') return null;
    try {
        const { data: allVisitors, error: visitorsError } = await supabase.from('visitantes').select('id, nome, telefone, data_primeira_visita, celula_id');
        if (visitorsError) throw visitorsError;
        const visitorsList = allVisitors || [];
        const visitorIds = visitorsList.map(v => v.id);
        if (visitorIds.length === 0) return [];
        const { data: presencesCount, error: presencesError } = await supabase.from('presencas_visitantes').select('visitante_id').in('visitante_id', visitorIds).eq('presente', true);
        if (presencesError) throw presencesError;
        const countMap = (presencesCount || []).reduce((acc, p) => { acc.set(p.visitante_id, (acc.get(p.visitante_id) || 0) + 1); return acc; }, new Map<string, number>());
        const unconvertedHighPresenceVisitors = visitorsList.filter(v => (countMap.get(v.id) || 0) >= 2);
        if (unconvertedHighPresenceVisitors.length === 0) return [];
        const analysisMap = new Map<string, VisitorsConversionAnalysis>();
        const celulaIds = new Set(unconvertedHighPresenceVisitors.map(v => v.celula_id));
        const celulasNamesMap = await getCelulasNamesMap(celulaIds, supabase);
        for (const visitor of unconvertedHighPresenceVisitors) {
            const celulaId = visitor.celula_id;
            const celulaName = celulasNamesMap.get(celulaId) || 'Célula Desconhecida';
            if (!analysisMap.has(celulaId)) { analysisMap.set(celulaId, { celula_id: celulaId, celula_nome: celulaName, visitors: [], total_unconverted_with_presences: 0 }); }
            const currentAnalysis = analysisMap.get(celulaId);
            if(currentAnalysis) {
                currentAnalysis.visitors.push({ id: visitor.id, nome: visitor.nome, telefone: visitor.telefone, total_presences: countMap.get(visitor.id) || 0, data_primeira_visita: visitor.data_primeira_visita });
                currentAnalysis.total_unconverted_with_presences++;
            }
        }
        return Array.from(analysisMap.values()).sort((a, b) => b.total_unconverted_with_presences - a.total_unconverted_with_presences);
    } catch (e: any) { return null; }
}
export async function getNewVisitorsTrend(numMonths: number = 6): Promise<NewVisitorsTrendData | null> {
    const { supabase, role } = await checkUserAuthorizationDashboard();
    if (role !== 'admin') return null;
    try {
        const today = new Date(); const startOfPeriod = subMonths(today, numMonths - 1); 
        const startOfPeriodFormatted = format(startOfPeriod, 'yyyy-MM-01');
        const { data: visitorsData, error } = await supabase.from('visitantes').select('data_primeira_visita').gte('data_primeira_visita', startOfPeriodFormatted);
        if (error) throw error;
        const countsByMonth = new Map<string, number>();
        (visitorsData || []).forEach(v => { const monthKey = format(new Date(v.data_primeira_visita), 'yyyy-MM'); countsByMonth.set(monthKey, (countsByMonth.get(monthKey) || 0) + 1); });
        const labels: string[] = []; const data: number[] = [];
        let currentDate = startOfPeriod;
        for (let i = 0; i < numMonths; i++) {
            const monthKey = format(currentDate, 'yyyy-MM');
            labels.push(format(currentDate, 'MMM yy', { locale: ptBR })); 
            data.push(countsByMonth.get(monthKey) || 0);
            currentDate = subMonths(currentDate, -1);
        }
        return { labels, data };
    } catch (e: any) { return null; }
}
export async function detectDuplicateVisitors(): Promise<DuplicateVisitorGroup[] | null> {
    const { supabase, role } = await checkUserAuthorizationDashboard();
    if (role !== 'admin') return null;
    try {
        const { data: allVisitors, error: visitorsError } = await supabase.from('visitantes').select('id, nome, telefone, celula_id');
        if (visitorsError) throw visitorsError;
        const visitorsList = allVisitors || [];
        const celulaIds = new Set(visitorsList.map(v => v.celula_id)); const celulasNamesMap = await getCelulasNamesMap(celulaIds, supabase);
        const groupsByName = new Map<string, typeof visitorsList>(); const groupsByPhone = new Map<string, typeof visitorsList>();
        visitorsList.forEach(v => {
            const normalizedName = v.nome.trim().toLowerCase();
            const normalizedPhone = v.telefone ? v.telefone.replace(/\D/g, '') : null;
            if (normalizedName) { if (!groupsByName.has(normalizedName)) groupsByName.set(normalizedName, []); groupsByName.get(normalizedName)?.push(v); }
            if (normalizedPhone && normalizedPhone.length > 5) { if (!groupsByPhone.has(normalizedPhone)) groupsByPhone.set(normalizedPhone, []); groupsByPhone.get(normalizedPhone)?.push(v); }
        });
        const duplicateGroups: DuplicateVisitorGroup[] = [];
        groupsByName.forEach((visitors, common_value) => {
            if (visitors.length > 1) { duplicateGroups.push({ group_id: `name-${common_value}`, common_value: common_value, type: 'nome', visitors: visitors.map(v => ({ ...v, celula_nome: celulasNamesMap.get(v.celula_id) || 'N/A' })) }); }
        });
        groupsByPhone.forEach((visitors, common_value) => {
            if (visitors.length > 1) { duplicateGroups.push({ group_id: `phone-${common_value}`, common_value: common_value, type: 'telefone', visitors: visitors.map(v => ({ ...v, celula_nome: celulasNamesMap.get(v.celula_id) || 'N/A' })) }); }
        });
        const finalGroupsMap = new Map<string, DuplicateVisitorGroup>();
        duplicateGroups.forEach(group => { if (!finalGroupsMap.has(group.group_id)) { finalGroupsMap.set(group.group_id, group); } });
        return Array.from(finalGroupsMap.values());
    } catch (e: any) { return null; }
}