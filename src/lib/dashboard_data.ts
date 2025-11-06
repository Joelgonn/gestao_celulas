'use server';

import { createServerClient, createAdminClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { startOfWeek, endOfWeek, format, getDay, isSameDay, subMonths, eachWeekOfInterval, subWeeks, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import {
    LastMeetingPresence,
    MembroDashboard,
    VisitanteDashboard,
    ReuniaoComNomes,
    FaltososAlert,
    UnconvertedVisitorsAlert,
    BirthdayAlert,
    AveragePresenceRateData,
    CelulasSummary,
    TopFlopPresence,
    CelulaGrowth,
    MembersByCelulaDistribution,
    VisitorsByCelulaDistribution,
    VisitorsConversionAnalysis,
    NewVisitorsTrendData,
    DuplicateVisitorGroup,
    ActivityLogItem
} from './types';

// Tipos locais para os parâmetros das funções
type MemberData = { id: string; nome: string; telefone: string | null };
type CelulaData = { id: string; nome: string };
type ReuniaoSimple = { id: string };
type ProfileData = { celula_id: string | null };
type ReuniaoDate = { id: string; data_reuniao: string };
type PresenceData = { reuniao_id: string };

// Função auxiliar para verificar a autorização e retornar o cliente Supabase apropriado
async function checkUserAuthorizationDashboard(): Promise<{
    supabase: any; // Pode ser createServerClient ou createAdminClient
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
        // Para administradores, usamos o cliente com service_role_key para acesso completo
        const supabaseAdmin = createAdminClient();
        return { supabase: supabaseAdmin, role: 'admin', celulaId: celulaId }; 
    } else {
        // Para líderes, usamos o cliente com contexto do usuário (RLS aplicado)
        return { supabase: supabaseClient, role: 'líder', celulaId: celulaId };
    }
}

// Funções auxiliares para buscar nomes (reutilizáveis e otimizadas)
async function getMemberNamesMap(memberIds: Set<string>, celulaId: string | null, supabaseInstance: any): Promise<Map<string, { nome: string; telefone: string | null }>> {
    const namesMap = new Map<string, { nome: string; telefone: string | null }>();
    if (memberIds.size === 0) return namesMap;
    
    let query = supabaseInstance.from('membros').select('id, nome, telefone').in('id', Array.from(memberIds));
    if (celulaId !== null) { 
        query = query.eq('celula_id', celulaId); 
    }
    
    const { data: membersData, error: membersError } = await query;
    
    if (membersError) { 
        console.error("Erro ao buscar nomes e telefones de membros (getMemberNamesMap):", membersError); 
    } else { 
        membersData?.forEach((m: MemberData) => namesMap.set(m.id, { nome: m.nome, telefone: m.telefone })); 
    }
    return namesMap;
}

async function getCelulasNamesMap(celulaIds: Set<string>, supabaseInstance: any): Promise<Map<string, string>> {
    const namesMap = new Map<string, string>();
    if (celulaIds.size === 0) return namesMap;
    
    const { data, error } = await supabaseInstance.from('celulas').select('id, nome').in('id', Array.from(celulaIds));
    
    if (error) { 
        console.error("Erro ao buscar nomes de células (getCelulasNamesMap):", error); 
    } else { 
        data?.forEach((c: CelulaData) => namesMap.set(c.id, c.nome)); 
    }
    return namesMap;
}

// ============================================================================
//                               FUNÇÕES DO DASHBOARD
// ============================================================================

export async function getTotalMembros(celulaIdFilter: string | null = null): Promise<number> {
  const { supabase, role, celulaId: userCelulaId } = await checkUserAuthorizationDashboard();
  if (!role) { return 0; } // Não autorizado, retorna 0

  let query = supabase.from('membros').select('id', { count: 'exact', head: true });
  
  if (role === 'líder') { 
    if (!userCelulaId) { return 0; } // Líder sem célula, retorna 0
    query = query.eq('celula_id', userCelulaId); 
  } else if (role === 'admin' && celulaIdFilter) { 
    query = query.eq('celula_id', celulaIdFilter); 
  }
  
  const { count, error } = await query;
  if (error) { throw new Error(`Falha ao carregar total de membros: ${error.message}`); }
  
  return count || 0;
}

export async function getTotalVisitantesDistintos(celulaIdFilter: string | null = null): Promise<number> {
  const { supabase, role, celulaId: userCelulaId } = await checkUserAuthorizationDashboard();
  if (!role) { return 0; }

  let query = supabase.from('visitantes').select('id', { count: 'exact', head: true });
  
  if (role === 'líder') { 
    if (!userCelulaId) { return 0; }
    query = query.eq('celula_id', userCelulaId); 
  } else if (role === 'admin' && celulaIdFilter) { 
    query = query.eq('celula_id', celulaIdFilter); 
  }
  
  const { count, error } = await query;
  if (error) { throw new Error(`Falha ao carregar total de visitantes: ${error.message}`); }
  
  return count || 0;
}

export async function getPresenceCountsLastMeeting(celulaIdFilter: string | null = null): Promise<LastMeetingPresence | null> {
  const { supabase, role, celulaId: userCelulaId } = await checkUserAuthorizationDashboard();
  if (!role) { return null; }

  let targetCelulaId: string | null = null;
  if (role === 'líder') { 
    if (!userCelulaId) { return null; }
    targetCelulaId = userCelulaId; 
  } else if (role === 'admin' && celulaIdFilter) { 
    targetCelulaId = celulaIdFilter; 
  } 
  // Se admin sem filtro, pode retornar nulo ou buscar a reunião mais recente em geral
  // Para este widget, é melhor filtrar.
  if (!targetCelulaId && role !== 'admin') {
      return null;
  }


  let lastMeetingQuery = supabase.from('reunioes').select('id, data_reuniao, tema, celula_id, ministrador_principal');
  if (targetCelulaId) { 
      lastMeetingQuery = lastMeetingQuery.eq('celula_id', targetCelulaId); 
  }

  const { data: lastMeetingRaw, error: lastMeetingError } = await lastMeetingQuery
    .order('data_reuniao', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastMeetingError) { throw new Error(`Falha ao carregar última reunião: ${lastMeetingError.message}`); }
  if (!lastMeetingRaw) { return null; }

  const reuniaoId = lastMeetingRaw.id;
  const dataReuniao = lastMeetingRaw.data_reuniao;
  const temaReuniao = lastMeetingRaw.tema;
  const reuniaoCelulaId = lastMeetingRaw.celula_id;

  let celulaName: string | null = null;
  if (reuniaoCelulaId) {
    const celulaNamesMap = await getCelulasNamesMap(new Set([reuniaoCelulaId]), supabase);
    celulaName = celulaNamesMap.get(reuniaoCelulaId) || null;
  }

  let ministradorPrincipalNome: string | null = null;
  if (lastMeetingRaw.ministrador_principal) {
    const memberNamesMap = await getMemberNamesMap(new Set([lastMeetingRaw.ministrador_principal]), reuniaoCelulaId, supabase);
    ministradorPrincipalNome = memberNamesMap.get(lastMeetingRaw.ministrador_principal)?.nome || null;
  }

  // Contagem de membros presentes
  const { count: presentesMembrosCount, error: pmError } = await supabase.from('presencas_membros').select('id', { count: 'exact', head: true }).eq('reuniao_id', reuniaoId).eq('presente', true);
  if (pmError) { throw new Error(`Falha ao contar membros presentes: ${pmError.message}`); }
  const numPresentesMembros = presentesMembrosCount || 0;

  // Contagem de membros ausentes
  let totalMembrosCelula = 0;
  if (reuniaoCelulaId) {
    const { count, error } = await supabase.from('membros').select('id', { count: 'exact', head: true }).eq('celula_id', reuniaoCelulaId);
    if (error) console.error("Erro ao obter total de membros da célula para ausentes:", error);
    totalMembrosCelula = count || 0;
  }
  const numAusentesMembros = Math.max(0, totalMembrosCelula - numPresentesMembros);

  // Contagem de visitantes presentes
  const { count: presentesVisitantesCount, error: pvError } = await supabase.from('presencas_visitantes').select('id', { count: 'exact', head: true }).eq('reuniao_id', reuniaoId).eq('presente', true);
  if (pvError) { throw new Error(`Falha ao contar visitantes presentes: ${pvError.message}`); }
  const numPresentesVisitantes = presentesVisitantesCount || 0;

  // Contagem de crianças
  const { data: criancasData, error: criancasError } = await supabase.from('criancas_reuniao').select('numero_criancas').eq('reuniao_id', reuniaoId).maybeSingle();
  if (criancasError) { throw new Error(`Falha ao obter número de crianças: ${criancasError.message}`); }
  const numCriancas = criancasData?.numero_criancas || 0;

  return {
    id: reuniaoId,
    data_reuniao: dataReuniao,
    tema: temaReuniao,
    ministrador_principal_nome: ministradorPrincipalNome,
    celula_nome: celulaName,
    num_presentes_membros: numPresentesMembros,
    num_ausentes_membros: numAusentesMembros,
    num_presentes_visitantes: numPresentesVisitantes,
    num_criancas: numCriancas,
  };
}

export async function getRecentesMembros(limit: number = 5, celulaIdFilter: string | null = null): Promise<MembroDashboard[]> {
    const { supabase, role, celulaId: userCelulaId } = await checkUserAuthorizationDashboard();
    if (!role) { return []; }

    let query = supabase.from('membros').select('id, nome, data_ingresso, celula_id, data_nascimento'); 
    
    if (role === 'líder') { 
        if (!userCelulaId) { return []; }
        query = query.eq('celula_id', userCelulaId); 
    } else if (role === 'admin' && celulaIdFilter) { 
        query = query.eq('celula_id', celulaIdFilter); 
    }

    const { data, error } = await query.order('created_at', { ascending: false }).limit(limit);
    if (error) { throw new Error(`Falha ao carregar membros recentes: ${error.message}`); }
    
    const membros = data || [];
    if (membros.length === 0) return [];

    const celulaIds = new Set(membros.map((m: any) => m.celula_id).filter(Boolean) as string[]);
    const celulasNamesMap = await getCelulasNamesMap(celulaIds, supabase); 
    
    return membros.map((m: any) => ({ 
        id: m.id, 
        nome: m.nome, 
        data_ingresso: m.data_ingresso, 
        celula_nome: celulasNamesMap.get(m.celula_id) || null, 
        data_nascimento: m.data_nascimento, 
    }));
}

export async function getRecentesVisitantes(limit: number = 5, celulaIdFilter: string | null = null): Promise<VisitanteDashboard[]> {
    const { supabase, role, celulaId: userCelulaId } = await checkUserAuthorizationDashboard();
    if (!role) { return []; }

    let query = supabase.from('visitantes').select('id, nome, data_primeira_visita, celula_id'); 
    
    if (role === 'líder') { 
        if (!userCelulaId) { return []; }
        query = query.eq('celula_id', userCelulaId); 
    } else if (role === 'admin' && celulaIdFilter) { 
        query = query.eq('celula_id', celulaIdFilter); 
    }

    const { data, error } = await query.order('created_at', { ascending: false }).limit(limit);
    if (error) { throw new Error(`Falha ao carregar visitantes recentes: ${error.message}`); }
    
    const visitantes = data || [];
    if (visitantes.length === 0) return [];

    const celulaIds = new Set(visitantes.map((v: any) => v.celula_id).filter(Boolean) as string[]);
    const celulasNamesMap = await getCelulasNamesMap(celulaIds, supabase); 
    
    return visitantes.map((v: any) => ({ 
        id: v.id, 
        nome: v.nome, 
        data_primeira_visita: v.data_primeira_visita, 
        celula_nome: celulasNamesMap.get(v.celula_id) || null, 
    }));
}

export async function getUltimasReunioes(limit: number = 5, celulaIdFilter: string | null = null): Promise<ReuniaoComNomes[]> {
    const { supabase, role, celulaId: userCelulaId } = await checkUserAuthorizationDashboard();
    if (!role) { return []; }

    let query = supabase.from('reunioes').select(`
        id, data_reuniao, tema, caminho_pdf, celula_id, 
        ministrador_principal:membros!ministrador_principal(nome), 
        ministrador_secundario:membros!ministrador_secundario(nome), 
        responsavel_kids:membros!responsavel_kids(nome), 
        criancas_reuniao(numero_criancas)
    `);
    
    let targetCelulaId: string | null = null;
    if (role === 'líder') { 
        if (!userCelulaId) { return []; }
        targetCelulaId = userCelulaId; 
    } else if (role === 'admin' && celulaIdFilter) { 
        targetCelulaId = celulaIdFilter; 
    }

    if (targetCelulaId) { 
        query = query.eq('celula_id', targetCelulaId); 
    }

    const { data, error } = await query.order('data_reuniao', { ascending: false }).limit(limit);
    if (error) { throw new Error(`Falha ao carregar últimas reuniões: ${error.message}`); }
    
    if (!data || data.length === 0) { return []; }

    const celulaIds = new Set(data.map((item: any) => item.celula_id).filter(Boolean) as string[]);
    const celulasNamesMap = await getCelulasNamesMap(celulaIds, supabase); 
    
    const processedData: ReuniaoComNomes[] = [];
    for (const item of data) {
        const numCriancas = item.criancas_reuniao?.[0]?.numero_criancas || 0;

        // Fetch presence counts for members and visitors
        const { count: presentesMembrosCount, error: pmError } = await supabase.from('presencas_membros')
            .select('id', { count: 'exact', head: true })
            .eq('reuniao_id', item.id)
            .eq('presente', true);
        if (pmError) { console.error(`Falha ao contar membros presentes para reunião ${item.id}: ${pmError.message}`); }

        const { count: presentesVisitantesCount, error: pvError } = await supabase.from('presencas_visitantes')
            .select('id', { count: 'exact', head: true })
            .eq('reuniao_id', item.id)
            .eq('presente', true);
        if (pvError) { console.error(`Falha ao contar visitantes presentes para reunião ${item.id}: ${pvError.message}`); }

        processedData.push({
            id: item.id,
            data_reuniao: item.data_reuniao,
            tema: item.tema,
            caminho_pdf: item.caminho_pdf,
            celula_id: item.celula_id,
            celula_nome: celulasNamesMap.get(item.celula_id) || null,
            ministrador_principal_nome: item.ministrador_principal?.nome || null,
            ministrador_secundario_nome: item.ministrador_secundario?.nome || null,
            responsavel_kids_nome: item.responsavel_kids?.nome || null,
            num_criancas: numCriancas,
            num_presentes_membros: presentesMembrosCount || 0,
            num_presentes_visitantes: presentesVisitantesCount || 0,
        });
    }
    return processedData;
}

export async function getFaltososAlert(celulaIdFilter: string | null = null, minAbsences: number = 3, numLastMeetings: number = 3): Promise<FaltososAlert> {
    const { supabase, role, celulaId: userCelulaId } = await checkUserAuthorizationDashboard();
    if (!role) { return { count: 0, members: [], startDate: '', endDate: '', totalMeetingsPeriod: 0 }; }

    let targetCelulaId: string | null = null;
    if (role === 'líder') { 
        if (!userCelulaId) { return { count: 0, members: [], startDate: '', endDate: '', totalMeetingsPeriod: 0 }; }
        targetCelulaId = userCelulaId; 
    } else if (role === 'admin' && celulaIdFilter) { 
        targetCelulaId = celulaIdFilter; 
    }

    if (!targetCelulaId) { return { count: 0, members: [], startDate: '', endDate: '', totalMeetingsPeriod: 0 }; }

    try {
        const { data: lastMeetings, error: meetingsError } = await supabase.from('reunioes')
            .select('id, data_reuniao')
            .eq('celula_id', targetCelulaId)
            .order('data_reuniao', { ascending: false })
            .limit(numLastMeetings);
        if (meetingsError) throw meetingsError;
        
        if (!lastMeetings || lastMeetings.length === 0) { 
            return { count: 0, members: [], startDate: '', endDate: '', totalMeetingsPeriod: 0 }; 
        }

        const reuniaoIds = lastMeetings.map((m: ReuniaoSimple) => m.id);
        const startDate = lastMeetings[lastMeetings.length - 1].data_reuniao; // Data da reunião mais antiga no período
        const endDate = lastMeetings[0].data_reuniao; // Data da reunião mais recente no período
        const totalMeetingsPeriod = lastMeetings.length;

        const { data: allMembers, error: membersError } = await supabase.from('membros')
            .select('id, nome, telefone')
            .eq('celula_id', targetCelulaId);
        if (membersError) throw membersError;
        
        const membersList = allMembers || [];
        const faltosos: { id: string; nome: string; telefone: string | null }[] = [];

        for (const member of membersList) {
            const { count: presencesCount, error: presencesError } = await supabase.from('presencas_membros')
                .select('id', { count: 'exact', head: true })
                .eq('membro_id', member.id)
                .eq('presente', true)
                .in('reuniao_id', reuniaoIds);
            if (presencesError) throw presencesError;
            
            // Se o número de ausências (total reuniões - presenças) for maior ou igual a minAbsences
            if ((totalMeetingsPeriod - (presencesCount || 0)) >= minAbsences) { 
                faltosos.push({ id: member.id, nome: member.nome, telefone: member.telefone }); 
            }
        }
        
        return { 
            count: faltosos.length, 
            members: faltosos.sort((a, b) => a.nome.localeCompare(b.nome)), // Ordena por nome
            startDate: startDate,
            endDate: endDate,
            totalMeetingsPeriod: totalMeetingsPeriod,
        };
    } catch (e: any) { 
        throw new Error(`Falha ao obter alerta de faltosos: ${e.message}`); 
    }
}

export async function getUnconvertedVisitorsAlert(celulaIdFilter: string | null = null, minDaysOld: number = 30): Promise<UnconvertedVisitorsAlert> {
    const { supabase, role, celulaId: userCelulaId } = await checkUserAuthorizationDashboard();
    if (!role) { return { count: 0, visitors: [] }; }

    let targetCelulaId: string | null = null;
    if (role === 'líder') { 
        if (!userCelulaId) { return { count: 0, visitors: [] }; }
        targetCelulaId = userCelulaId; 
    } else if (role === 'admin' && celulaIdFilter) { 
        targetCelulaId = celulaIdFilter; 
    }

    if (!targetCelulaId) { return { count: 0, visitors: [] }; }

    try {
        const thirtyDaysAgo = new Date(); 
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - minDaysOld);
        const thirtyDaysAgoISO = thirtyDaysAgo.toISOString().split('T')[0]; // Formato 'YYYY-MM-DD'

        const { data: visitors, error } = await supabase.from('visitantes')
            .select('id, nome, data_primeira_visita, telefone')
            .eq('celula_id', targetCelulaId)
            .lt('data_primeira_visita', thirtyDaysAgoISO) // Visitantes cuja primeira visita foi antes de X dias atrás
            .order('data_primeira_visita', { ascending: true }); // Ordena pelo mais antigo primeiro
        if (error) throw error;
        
        const unconvertedVisitors = visitors || [];
        type VisitorSort = { nome: string }; // Tipo auxiliar para a ordenação
        
        return { 
            count: unconvertedVisitors.length, 
            visitors: unconvertedVisitors.sort((a: VisitorSort, b: VisitorSort) => a.nome.localeCompare(b.nome)), 
        };
    } catch (e: any) { 
        throw new Error(`Falha ao obter alerta de visitantes não convertidos: ${e.message}`); 
    }
}

export async function getBirthdaysThisWeek(celulaIdFilter: string | null = null): Promise<BirthdayAlert> {
    const { supabase, role, celulaId: userCelulaId } = await checkUserAuthorizationDashboard();
    if (!role) { return { count: 0, members: [] }; }

    let targetCelulaId: string | null = null;
    if (role === 'líder') { 
        if (!userCelulaId) { return { count: 0, members: [] }; }
        targetCelulaId = userCelulaId; 
    } else if (role === 'admin' && celulaIdFilter) { 
        targetCelulaId = celulaIdFilter; 
    }

    if (!targetCelulaId) { return { count: 0, members: [] }; }

    try {
        const today = new Date();
        const startOfThisWeek = startOfWeek(today, { locale: ptBR });
        const endOfThisWeek = endOfWeek(today, { locale: ptBR });

        const { data: members, error } = await supabase.from('membros')
            .select('id, nome, data_nascimento')
            .eq('celula_id', targetCelulaId)
            .not('data_nascimento', 'is', null); // Garante que só pega membros com data de nascimento
        if (error) throw error;
        
        const birthdaysThisWeek = (members || []).filter((member: { data_nascimento: string | null }) => {
            if (!member.data_nascimento) return false;
            
            const birthDate = new Date(member.data_nascimento);
            // Cria uma data com o ano atual, mas mês e dia do aniversário
            const currentYearBirthDate = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
            
            // Verifica se a data de aniversário no ano atual está dentro da semana atual
            return currentYearBirthDate >= startOfThisWeek && currentYearBirthDate <= endOfThisWeek;
        });

        type BirthdaySort = { data_nascimento: string }; // Tipo auxiliar para a ordenação
        
        return {
            count: birthdaysThisWeek.length,
            members: birthdaysThisWeek.map((m: any) => ({ id: m.id, nome: m.nome, data_nascimento: m.data_nascimento! }))
                                    .sort((a: BirthdaySort, b: BirthdaySort) => {
                                        const dateA = new Date(a.data_nascimento);
                                        const dateB = new Date(b.data_nascimento);
                                        // Compara apenas mês e dia para ordenar aniversários
                                        if (dateA.getMonth() !== dateB.getMonth()) {
                                            return dateA.getMonth() - dateB.getMonth();
                                        }
                                        return dateA.getDate() - dateB.getDate();
                                    }),
        };
    } catch (e: any) { 
        throw new Error(`Falha ao obter alerta de aniversariantes: ${e.message}`); 
    }
}

export async function getCelulasOptionsForAdmin(): Promise<{id: string; nome: string}[]> {
    const { supabase, role } = await checkUserAuthorizationDashboard();
    if (role !== 'admin') { 
        return []; 
    }
    
    try {
        const { data, error } = await supabase.from('celulas').select('id, nome').order('nome', { ascending: true });
        if (error) { throw new Error(`Falha ao carregar células: ${error.message}`); }
        
        return data || [];
    } catch (e: any) { 
        throw e; 
    }
}

export async function getAveragePresenceRate(celulaIdFilter: string | null = null, numWeeks: number = 8): Promise<AveragePresenceRateData | null> {
    const { supabase, role, celulaId: userCelulaId } = await checkUserAuthorizationDashboard();
    if (!role) { return null; }

    let targetCelulaId: string | null = null;
    if (role === 'líder') { 
        if (!userCelulaId) { return null; }
        targetCelulaId = userCelulaId; 
    } else if (role === 'admin' && celulaIdFilter) { 
        targetCelulaId = celulaIdFilter; 
    }

    if (!targetCelulaId) { return null; }

    try {
        const today = new Date();
        const startOfPeriod = subWeeks(today, numWeeks - 1); // Queremos N semanas, então subtrai N-1 para incluir a semana atual.
        const startOfPeriodISO = format(startOfPeriod, 'yyyy-MM-dd'); // Formato 'YYYY-MM-DD'

        // Busca as reuniões da célula no período
        const { data: meetings, error: meetingsError } = await supabase.from('reunioes')
            .select('id, data_reuniao')
            .eq('celula_id', targetCelulaId)
            .gte('data_reuniao', startOfPeriodISO)
            .order('data_reuniao', { ascending: true });
        if (meetingsError) throw meetingsError;
        
        if (!meetings || meetings.length === 0) { 
            // Se não há reuniões, retorna labels para as semanas, mas com dados zerados
            const labels = eachWeekOfInterval({ start: startOfPeriod, end: today }, { locale: ptBR }).map((weekStart) => format(weekStart, 'dd/MM', { locale: ptBR }));
            return { labels, data: labels.map(() => 0) };
        }

        const reunionsMap = new Map<string, string>(meetings.map((m: ReuniaoDate) => [m.id, m.data_reuniao]));
        const reunionIds = meetings.map((m: ReuniaoSimple) => m.id);

        // Pega o total de membros ativos na célula
        const { count: totalMembersInCell, error: membersCountError } = await supabase.from('membros')
            .select('id', { count: 'exact', head: true })
            .eq('celula_id', targetCelulaId);
        if (membersCountError) throw membersCountError;
        const totalMembers = totalMembersInCell || 0;

        if (totalMembers === 0) {
            // Se não há membros, a taxa de presença é sempre 0
            const labels = eachWeekOfInterval({ start: startOfPeriod, end: today }, { locale: ptBR }).map((weekStart) => format(weekStart, 'dd/MM', { locale: ptBR }));
            return { labels, data: labels.map(() => 0) };
        }

        // Pega todas as presenças de membros para as reuniões no período
        const { data: presences, error: presencesError } = await supabase.from('presencas_membros')
            .select('reuniao_id')
            .in('reuniao_id', reunionIds)
            .eq('presente', true);
        if (presencesError) throw presencesError;

        // Conta presenças por reunião
        const presencesPerReunion = (presences || []).reduce((acc: Map<string, number>, p: PresenceData) => {
            acc.set(p.reuniao_id, (acc.get(p.reuniao_id) || 0) + 1);
            return acc;
        }, new Map<string, number>());

        const weeks = eachWeekOfInterval({ start: startOfPeriod, end: today }, { locale: ptBR });
        const labels: string[] = [];
        const data: number[] = [];

        for (const weekStart of weeks) {
            const weekEnd = endOfWeek(weekStart, { locale: ptBR });
            labels.push(format(weekStart, 'dd/MM', { locale: ptBR })); // Formato da label da semana

            let totalPresencesInWeek = 0;
            let totalMeetingsInWeek = 0;

            // Agrega as presenças das reuniões que caem dentro desta semana
            for (const [reunionId, reunionDateStr] of reunionsMap.entries()) {
                const reunionDate = new Date(reunionDateStr);
                if (reunionDate >= weekStart && reunionDate <= weekEnd) {
                    totalPresencesInWeek += (presencesPerReunion.get(reunionId) || 0);
                    totalMeetingsInWeek++;
                }
            }

            if (totalMeetingsInWeek > 0) {
                // Calcula a média de presença para a semana
                const averagePresence = (totalPresencesInWeek / (totalMeetingsInWeek * totalMembers)) * 100;
                data.push(parseFloat(averagePresence.toFixed(0))); // Arredonda para inteiro
            } else {
                data.push(0); // Nenhuma reunião na semana
            }
        }
        
        return { labels, data };
    } catch (e: any) { 
        throw new Error(`Falha ao obter média de presença: ${e.message}`); 
    }
}

// --- Funções EXCLUSIVAS para ADMIN (visão global) ---

export async function getCelulasSummary(): Promise<CelulasSummary> {
    const { supabase, role } = await checkUserAuthorizationDashboard();
    if (role !== 'admin') { return { totalCelulas: 0, celulasWithoutLeaders: 0 }; }

    try {
        // Total de células
        const { count: totalCelulas, error: totalCelulasError } = await supabase.from('celulas').select('id', { count: 'exact', head: true });
        if (totalCelulasError) throw totalCelulasError;

        // Células com líderes atribuídos no perfil
        const { data: celulasComLideresRaw, error: lideresError } = await supabase.from('profiles')
            .select('celula_id')
            .eq('role', 'líder') // Considera apenas perfis de líderes
            .not('celula_id', 'is', null); // Que tenham uma célula atribuída
        if (lideresError) throw lideresError;

        const celulaIdsComLideres = new Set((celulasComLideresRaw || []).map((p: ProfileData) => p.celula_id));

        // Todas as células para identificar as que não têm líder no perfil
        const { data: allCelulas, error: allCelulasError } = await supabase.from('celulas').select('id');
        if (allCelulasError) throw allCelulasError;

        const celulasWithoutLeaders = (allCelulas || []).filter((celula: ReuniaoSimple) => !celulaIdsComLideres.has(celula.id)).length;
        
        return { 
            totalCelulas: totalCelulas || 0, 
            celulasWithoutLeaders: celulasWithoutLeaders, 
        };
    } catch (e: any) { 
        throw new Error(`Falha ao obter resumo de células: ${e.message}`); 
    }
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
            // Pega as últimas N reuniões da célula
            const { data: lastMeetings, error: meetingsError } = await supabase.from('reunioes')
                .select('id, data_reuniao')
                .eq('celula_id', celula.id)
                .order('data_reuniao', { ascending: false })
                .limit(numMeetings);
            if (meetingsError) console.warn(`Erro ao buscar reuniões para célula ${celula.nome}: ${meetingsError.message}`);

            const relevantReunionIds = (lastMeetings || []).map((m: ReuniaoSimple) => m.id);
            const totalMeetingsConsidered = relevantReunionIds.length;

            if (totalMeetingsConsidered === 0) {
                presenceData.push({ celula_id: celula.id, celula_nome: celula.nome, avg_presence: 0 });
                continue;
            }

            // Total de membros na célula
            const { count: totalMembersInCell, error: membersCountError } = await supabase.from('membros')
                .select('id', { count: 'exact', head: true })
                .eq('celula_id', celula.id);
            if (membersCountError) console.warn(`Erro ao contar membros para célula ${celula.nome}: ${membersCountError.message}`);
            const totalMembers = totalMembersInCell || 0;

            if (totalMembers === 0) {
                presenceData.push({ celula_id: celula.id, celula_nome: celula.nome, avg_presence: 0 });
                continue;
            }

            // Total de presenças para essas reuniões
            const { count: totalPresences, error: presencesError } = await supabase.from('presencas_membros')
                .select('id', { count: 'exact', head: true })
                .in('reuniao_id', relevantReunionIds)
                .eq('presente', true);
            if (presencesError) console.warn(`Erro ao contar presenças para célula ${celula.nome}: ${presencesError.message}`);
            const numPresences = totalPresences || 0;

            const avgPresence = (numPresences / (totalMeetingsConsidered * totalMembers)) * 100;
            presenceData.push({ celula_id: celula.id, celula_nome: celula.nome, avg_presence: parseFloat(avgPresence.toFixed(0)) });
        }

        // Ordena para pegar o top e o bottom
        presenceData.sort((a, b) => b.avg_presence - a.avg_presence); // Decrescente para o top

        return { 
            top: presenceData.slice(0, limit), 
            bottom: presenceData.slice(-limit).reverse(), // Pega os últimos e inverte para ordem crescente
        };
    } catch (e: any) { 
        throw new Error(`Falha ao obter Top/Flop Presença: ${e.message}`); 
    }
}

export async function getCelulaGrowth(numDays: number = 30, limit: number = 3): Promise<{ top_members: CelulaGrowth[]; top_visitors: CelulaGrowth[] }> {
    const { supabase, role } = await checkUserAuthorizationDashboard();
    if (role !== 'admin') { return { top_members: [], top_visitors: [] }; }

    try {
        const today = new Date();
        const startOfPeriod = subDays(today, numDays); // N dias atrás
        const startOfPeriodISO = format(startOfPeriod, 'yyyy-MM-dd'); // Formato 'YYYY-MM-DD'

        const { data: celulas, error: celulasError } = await supabase.from('celulas').select('id, nome');
        if (celulasError) throw celulasError;
        const celulasList = celulas || [];

        const growthMembers: CelulaGrowth[] = [];
        const growthVisitors: CelulaGrowth[] = [];

        for (const celula of celulasList) {
            // Novos Membros na célula no período
            const { count: newMembers, error: membersError } = await supabase.from('membros')
                .select('id', { count: 'exact', head: true })
                .eq('celula_id', celula.id)
                .gte('data_ingresso', startOfPeriodISO); // Data de ingresso no período
            if (membersError) console.warn(`Erro ao contar novos membros para célula ${celula.nome}: ${membersError.message}`);
            growthMembers.push({ celula_id: celula.id, celula_nome: celula.nome, growth_members: newMembers || 0, growth_visitors: 0 });

            // Novos Visitantes na célula no período
            const { count: newVisitors, error: visitorsError } = await supabase.from('visitantes')
                .select('id', { count: 'exact', head: true })
                .eq('celula_id', celula.id)
                .gte('data_primeira_visita', startOfPeriodISO); // Primeira visita no período
            if (visitorsError) console.warn(`Erro ao contar novos visitantes para célula ${celula.nome}: ${visitorsError.message}`);
            growthVisitors.push({ celula_id: celula.id, celula_nome: celula.nome, growth_members: 0, growth_visitors: newVisitors || 0 });
        }

        // Ordena e pega o top N para cada categoria
        growthMembers.sort((a, b) => b.growth_members - a.growth_members);
        growthVisitors.sort((a, b) => b.growth_visitors - a.growth_visitors);

        return { 
            top_members: growthMembers.slice(0, limit), 
            top_visitors: growthVisitors.slice(0, limit) 
        };
    } catch (e: any) { 
        throw new Error(`Falha ao obter Crescimento de Célula: ${e.message}`); 
    }
}

export async function getMembersByCelulaDistribution(): Promise<MembersByCelulaDistribution[]> {
    const { supabase, role } = await checkUserAuthorizationDashboard();
    if (role !== 'admin') { return []; }

    try {
        const { data: allMembers, error } = await supabase.from('membros').select('celula_id');
        if (error) throw error;

        // Conta quantos membros em cada célula
        const countsMap = (allMembers || []).reduce((acc: Map<string, number>, member: { celula_id: string | null }) => { 
            if (member.celula_id) { 
                acc.set(member.celula_id, (acc.get(member.celula_id) || 0) + 1); 
            } 
            return acc; 
        }, new Map<string, number>());

        const celulaIds = new Set(Array.from(countsMap.keys()).filter(Boolean) as string[]);
        const celulasNamesMap = await getCelulasNamesMap(celulaIds, supabase);
        
        const result: MembersByCelulaDistribution[] = [];
        for (const [celula_id, count] of countsMap.entries()) { 
            result.push({ celula_nome: celulasNamesMap.get(celula_id) || 'Célula Desconhecida', count: count }); 
        }

        return result.sort((a, b) => a.celula_nome.localeCompare(b.celula_nome)); // Ordena por nome da célula
    } catch (e: any) { 
        throw new Error(`Falha ao obter distribuição de membros por célula: ${e.message}`); 
    }
}

export async function getVisitorsByCelulaDistribution(): Promise<VisitorsByCelulaDistribution[]> {
    const { supabase, role } = await checkUserAuthorizationDashboard();
    if (role !== 'admin') { return []; }

    try {
        const { data: allVisitors, error } = await supabase.from('visitantes').select('celula_id');
        if (error) throw error;

        // Conta quantos visitantes em cada célula
        const countsMap = (allVisitors || []).reduce((acc: Map<string, number>, visitor: { celula_id: string | null }) => { 
            if (visitor.celula_id) { 
                acc.set(visitor.celula_id, (acc.get(visitor.celula_id) || 0) + 1); 
            } 
            return acc; 
        }, new Map<string, number>());

        const celulaIds = new Set(Array.from(countsMap.keys()).filter(Boolean) as string[]);
        const celulasNamesMap = await getCelulasNamesMap(celulaIds, supabase);
        
        const result: VisitorsByCelulaDistribution[] = [];
        for (const [celula_id, count] of countsMap.entries()) { 
            result.push({ celula_nome: celulasNamesMap.get(celula_id) || 'Célula Desconhecida', count: count }); 
        }

        return result.sort((a, b) => a.celula_nome.localeCompare(b.celula_nome)); // Ordena por nome da célula
    } catch (e: any) { 
        throw new Error(`Falha ao obter distribuição de visitantes por célula: ${e.message}`); 
    }
}

export async function getGlobalRecentActivity(limit: number = 10): Promise<ActivityLogItem[]> {
    const { supabase, role } = await checkUserAuthorizationDashboard();
    if (role !== 'admin') { return []; }

    try {
        const activities: (ActivityLogItem & { raw_date: Date })[] = [];

        // Busca novos membros
        const { data: newMembers, error: membersError } = await supabase.from('membros')
            .select('id, nome, celula_id, created_at')
            .order('created_at', { ascending: false })
            .limit(limit);
        if (membersError) console.warn("Erro ao buscar membros recentes para atividade:", membersError.message);

        // Busca novos visitantes
        const { data: newVisitors, error: visitorsError } = await supabase.from('visitantes')
            .select('id, nome, celula_id, created_at')
            .order('created_at', { ascending: false })
            .limit(limit);
        if (visitorsError) console.warn("Erro ao buscar visitantes recentes para atividade:", visitorsError.message);

        // Busca novas reuniões
        const { data: newReunions, error: reunionsError } = await supabase.from('reunioes')
            .select('id, tema, celula_id, created_at, data_reuniao')
            .order('created_at', { ascending: false })
            .limit(limit);
        if (reunionsError) console.warn("Erro ao buscar reuniões recentes para atividade:", reunionsError.message);
        
        // Busca novas células
        const { data: newCelulas, error: celulasError } = await supabase.from('celulas')
            .select('id, nome, created_at')
            .order('created_at', { ascending: false })
            .limit(limit);
        if (celulasError) console.warn("Erro ao buscar novas células para atividade:", celulasError.message);


        // Coleta todos os IDs de células para buscar os nomes
        const allCelulaIds = new Set<string>();
        newMembers?.forEach((item: any) => { if (item.celula_id) allCelulaIds.add(item.celula_id); });
        newVisitors?.forEach((item: any) => { if (item.celula_id) allCelulaIds.add(item.celula_id); });
        newReunions?.forEach((item: any) => { if (item.celula_id) allCelulaIds.add(item.celula_id); });
        // Para novas células, o nome já está no item, mas vamos buscar para padronizar
        newCelulas?.forEach((item: any) => { if (item.id) allCelulaIds.add(item.id); });


        const celulasNamesMap = await getCelulasNamesMap(allCelulaIds, supabase);

        // Adiciona as atividades à lista
        newMembers?.forEach((m: any) => activities.push({ id: m.id, type: 'member_added', description: `Novo membro: ${m.nome}`, created_at: m.created_at, celula_nome: celulasNamesMap.get(m.celula_id) || 'N/A', raw_date: new Date(m.created_at) }));
        newVisitors?.forEach((v: any) => activities.push({ id: v.id, type: 'visitor_added', description: `Novo visitante: ${v.nome}`, created_at: v.created_at, celula_nome: celulasNamesMap.get(v.celula_id) || 'N/A', raw_date: new Date(v.created_at) }));
        newReunions?.forEach((r: any) => activities.push({ id: r.id, type: 'reunion_added', description: `Nova reunião: ${r.tema}`, created_at: r.created_at, celula_nome: celulasNamesMap.get(r.celula_id) || 'N/A', raw_date: new Date(r.created_at) }));
        newCelulas?.forEach((c: any) => activities.push({ id: c.id, type: 'celula_created', description: `Nova célula: ${c.nome}`, created_at: c.created_at, celula_nome: c.nome, raw_date: new Date(c.created_at) }));

        // Ordena todas as atividades por data de criação (mais recente primeiro)
        activities.sort((a, b) => b.raw_date.getTime() - a.raw_date.getTime());
        
        return activities.slice(0, limit); // Limita ao número desejado
    } catch (e: any) { 
        console.error("Erro em getGlobalRecentActivity:", e);
        throw e; 
    }
}

export async function getVisitorsConversionAnalysis(): Promise<VisitorsConversionAnalysis[] | null> {
    const { supabase, role } = await checkUserAuthorizationDashboard();
    if (role !== 'admin') return null;

    try {
        // Busca todos os visitantes
        const { data: allVisitors, error: visitorsError } = await supabase.from('visitantes')
            .select('id, nome, telefone, data_primeira_visita, celula_id');
        if (visitorsError) throw visitorsError;
        const visitorsList = allVisitors || [];

        // IDs dos visitantes
        const visitorIds = visitorsList.map((v: { id: string }) => v.id);
        if (visitorIds.length === 0) return [];

        // Conta o número de presenças para cada visitante
        const { data: presencesCount, error: presencesError } = await supabase.from('presencas_visitantes')
            .select('visitante_id')
            .in('visitante_id', visitorIds)
            .eq('presente', true);
        if (presencesError) throw presencesError;
        
        const countMap = (presencesCount || []).reduce((acc: Map<string, number>, p: { visitante_id: string }) => { 
            acc.set(p.visitante_id, (acc.get(p.visitante_id) || 0) + 1); 
            return acc; 
        }, new Map<string, number>());

        // Filtra visitantes que tiveram 2 ou mais presenças e ainda não são membros
        // (A lógica de "não convertidos" é implícita aqui, pois eles ainda estão na tabela de visitantes)
        const unconvertedHighPresenceVisitors = visitorsList.filter((v: { id: string }) => (countMap.get(v.id) || 0) >= 2);

        if (unconvertedHighPresenceVisitors.length === 0) return [];

        // Agrupa os visitantes por célula para a análise
        const analysisMap = new Map<string, VisitorsConversionAnalysis>();
        const celulaIds = new Set(unconvertedHighPresenceVisitors.map((v: { celula_id: string }) => v.celula_id).filter(Boolean) as string[]);
        const celulasNamesMap = await getCelulasNamesMap(celulaIds, supabase);

        for (const visitor of unconvertedHighPresenceVisitors) {
            const celulaId = visitor.celula_id;
            const celulaName = celulasNamesMap.get(celulaId) || 'Célula Desconhecida';

            if (!analysisMap.has(celulaId)) { 
                analysisMap.set(celulaId, { celula_id: celulaId, celula_nome: celulaName, visitors: [], total_unconverted_with_presences: 0 }); 
            }
            
            const currentAnalysis = analysisMap.get(celulaId);
            if(currentAnalysis) { // Garante que currentAnalysis não é undefined
                currentAnalysis.visitors.push({ 
                    id: visitor.id, 
                    nome: visitor.nome, 
                    telefone: visitor.telefone, 
                    total_presences: countMap.get(visitor.id) || 0, 
                    data_primeira_visita: visitor.data_primeira_visita 
                });
                currentAnalysis.total_unconverted_with_presences++;
            }
        }
        
        // Retorna a análise ordenada pelo total de visitantes com alta presença
        return Array.from(analysisMap.values()).sort((a, b) => b.total_unconverted_with_presences - a.total_unconverted_with_presences);
    } catch (e: any) { 
        console.error("Erro em getVisitorsConversionAnalysis:", e);
        return null; 
    }
}

export async function getNewVisitorsTrend(numMonths: number = 6): Promise<NewVisitorsTrendData | null> {
    const { supabase, role } = await checkUserAuthorizationDashboard();
    if (role !== 'admin') return null;

    try {
        const today = new Date();
        const startOfPeriod = subMonths(today, numMonths - 1); // Pega 6 meses (incluindo o mês atual)
        const startOfPeriodFormatted = format(startOfPeriod, 'yyyy-MM-01'); // Início do primeiro mês

        const { data: visitorsData, error } = await supabase.from('visitantes')
            .select('data_primeira_visita')
            .gte('data_primeira_visita', startOfPeriodFormatted);
        if (error) throw error;

        const countsByMonth = new Map<string, number>();
        (visitorsData || []).forEach((v: { data_primeira_visita: string }) => { 
            const monthKey = format(new Date(v.data_primeira_visita), 'yyyy-MM'); // Ex: '2023-10'
            countsByMonth.set(monthKey, (countsByMonth.get(monthKey) || 0) + 1); 
        });

        const labels: string[] = [];
        const data: number[] = [];
        let currentDate = startOfPeriod;

        // Itera pelos últimos N meses para construir os labels e os dados
        for (let i = 0; i < numMonths; i++) {
            const monthKey = format(currentDate, 'yyyy-MM');
            labels.push(format(currentDate, 'MMM yy', { locale: ptBR })); // Ex: 'Out 23'
            data.push(countsByMonth.get(monthKey) || 0); // Pega a contagem ou 0
            
            currentDate = subMonths(currentDate, -1); // Avança para o próximo mês
        }
        
        return { labels, data };
    } catch (e: any) { 
        console.error("Erro em getNewVisitorsTrend:", e);
        return null; 
    }
}

export async function detectDuplicateVisitors(): Promise<DuplicateVisitorGroup[] | null> {
    const { supabase, role } = await checkUserAuthorizationDashboard();
    if (role !== 'admin') return null;

    try {
        // Busca todos os visitantes com os campos relevantes
        const { data: allVisitors, error: visitorsError } = await supabase.from('visitantes')
            .select('id, nome, telefone, celula_id');
        if (visitorsError) throw visitorsError;
        const visitorsList = allVisitors || [];

        // Mapeia IDs de células para nomes de células
        const celulaIds = new Set(visitorsList.map((v: { celula_id: string | null }) => v.celula_id).filter(Boolean) as string[]);
        const celulasNamesMap = await getCelulasNamesMap(celulaIds, supabase);

        // Agrupa visitantes por nome normalizado e por telefone normalizado
        const groupsByName = new Map<string, any[]>(); 
        const groupsByPhone = new Map<string, any[]>();

        visitorsList.forEach((v: { nome: string; telefone: string | null; celula_id: string | null; id: string; }) => {
            const normalizedName = v.nome.trim().toLowerCase();
            // Remove caracteres não numéricos do telefone
            const normalizedPhone = v.telefone ? v.telefone.replace(/\D/g, '') : null; 

            if (normalizedName) {
                if (!groupsByName.has(normalizedName)) groupsByName.set(normalizedName, []);
                groupsByName.get(normalizedName)?.push(v);
            }
            if (normalizedPhone && normalizedPhone.length > 5) { // Ignora telefones muito curtos
                if (!groupsByPhone.has(normalizedPhone)) groupsByPhone.set(normalizedPhone, []);
                groupsByPhone.get(normalizedPhone)?.push(v);
            }
        });

        const duplicateGroups: DuplicateVisitorGroup[] = [];

        // Processa grupos por nome
        groupsByName.forEach((visitors, common_value) => {
            if (visitors.length > 1) { // Mais de um visitante com o mesmo nome
                duplicateGroups.push({ 
                    group_id: `name-${common_value}`, 
                    common_value: common_value, 
                    type: 'nome', 
                    visitors: visitors.map((v: any) => ({ ...v, celula_nome: celulasNamesMap.get(v.celula_id) || 'N/A' })) 
                }); 
            }
        });

        // Processa grupos por telefone
        groupsByPhone.forEach((visitors, common_value) => {
            if (visitors.length > 1) { // Mais de um visitante com o mesmo telefone
                duplicateGroups.push({ 
                    group_id: `phone-${common_value}`, 
                    common_value: common_value, 
                    type: 'telefone', 
                    visitors: visitors.map((v: any) => ({ ...v, celula_nome: celulasNamesMap.get(v.celula_id) || 'N/A' })) 
                }); 
            }
        });

        // Remove duplicatas de grupos se o mesmo conjunto de visitantes aparecer em diferentes grupos (ex: nome e telefone iguais)
        const finalGroupsMap = new Map<string, DuplicateVisitorGroup>();
        duplicateGroups.forEach(group => { 
            // Uma heurística simples para evitar grupos completamente duplicados:
            // Se o ID do grupo já existe (ex: name-joao), ou se a lista de visitantes (ordenada) já foi vista.
            // Para simplicidade, vamos usar o group_id gerado.
            if (!finalGroupsMap.has(group.group_id)) {
                finalGroupsMap.set(group.group_id, group);
            }
        });
        
        return Array.from(finalGroupsMap.values());
    } catch (e: any) { 
        console.error("Erro em detectDuplicateVisitors:", e);
        return null; 
    }
}