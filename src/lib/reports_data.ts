'use server';

import { createServerClient, createAdminClient } from '@/utils/supabase/server'; 
import { format, isSameMonth, parseISO, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ============================================================================
//                                DEFINIÇÕES DE TIPOS (Importadas ou Locais)
// ============================================================================

// Tipos base importados de `src/lib/types.ts` ou definidos aqui se não forem compartilhados amplamente.
// Para manter a modularidade e evitar dependências circulares com `src/lib/types.ts`
// vamos definir os tipos específicos de relatório aqui, ou importar se for o caso.
// Nota: Algumas interfaces como Membro, Visitante, ReuniaoComNomes podem ser importadas
// se já estiverem em `src/lib/types.ts` e forem idênticas.
// Para este arquivo, vou incluir as interfaces completas que são usadas aqui.

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

export type CelulaOption = {
    id: string;
    nome: string;
};


// --- Interfaces de Dados de Relatório ---

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
    celula_nome?: string | null;
}

export interface ReportDataFaltososPeriodo {
    faltosos: MembroFaltoso[];
    start_date: string;
    end_date: string;
}

export interface VisitantePorPeriodo {
    id: string;
    nome: string;
    telefone: string | null;
    data_primeira_visita: string;
    celula_nome?: string | null;
}

export interface ReportDataVisitantesPeriodo {
    visitantes: VisitantePorPeriodo[];
    start_date: string;
    end_date: string;
}

export interface MembroAniversariante {
    id: string;
    nome: string;
    data_nascimento: string; // YYYY-MM-DD
    telefone: string | null;
    celula_nome?: string | null;
}

export interface VisitanteAniversariante {
    id: string;
    nome: string;
    data_primeira_visita: string; // YYYY-MM-DD
    data_nascimento: string; // YYYY-MM-DD
    telefone: string | null;
    celula_nome?: string | null;
}

export interface ReportDataAniversariantes {
    mes: number; // 1-12
    ano_referencia: number; // Ano atual para exibição
    membros: MembroAniversariante[];
    visitantes: VisitanteAniversariante[];
}

export interface LiderAlocacaoItem {
    id: string; // user_id do perfil
    email: string;
    role: 'admin' | 'líder';
    celula_id: string | null;
    celula_nome: string | null; // Nome da célula se alocado
    data_criacao_perfil: string;
    ultimo_login: string | null;
}

export interface CelulaSemLiderItem {
    id: string; // celula_id
    nome: string; // nome da célula
    lider_principal_cadastrado_na_celula: string | null; // Nome do líder principal registrado na tabela 'celulas'
}

export interface ReportDataAlocacaoLideres {
    lideres_alocados: LiderAlocacaoItem[];
    lideres_nao_alocados: LiderAlocacaoItem[];
    celulas_sem_lider_atribuido: CelulaSemLiderItem[];
    total_perfis_lider: number;
    total_celulas: number;
}

// --- NOVAS INTERFACES PARA RELATÓRIO DE CHAVES DE ATIVAÇÃO (Fase 4.2) ---
export interface ChaveAtivacaoItem {
    chave: string;
    celula_id: string;
    celula_nome: string | null; // Nome da célula
    usada: boolean;
    data_uso: string | null; // Quando foi usada (se usada)
    usada_por_email: string | null; // Email do usuário que usou (se usada)
    usada_por_id: string | null; // ID do perfil do usuário que usou (se usada)
}

export interface ReportDataChavesAtivacao {
    chaves_ativas: ChaveAtivacaoItem[];
    chaves_usadas: ChaveAtivacaoItem[];
    total_chaves: number;
}
// --- FIM NOVAS INTERFACES ---


// ============================================================================
//                          FUNÇÕES AUXILIARES DE SUPABASE (Server Actions)
// ============================================================================

// Esta função verifica a autorização do usuário e retorna o cliente Supabase apropriado.
// Para administradores, usa `createAdminClient` para ignorar RLS, para líderes, usa `createServerClient` (com RLS).
// Retorna também a role e o celulaId do usuário logado.
async function checkUserAuthorizationReports(): Promise<{
    supabase: any; // Pode ser createServerClient ou createAdminClient
    role: 'admin' | 'líder' | null;
    celulaId: string | null;
    adminSupabase?: any; // Opcional, para admin ter acesso direto ao adminSupabase se precisar de operações cruas
}> {
    const supabaseClient = createServerClient();
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
        console.warn('checkUserAuthorizationReports: Usuário não autenticado.');
        return { supabase: supabaseClient, role: null, celulaId: null };
    }

    const { data: profileData, error: profileError } = await supabaseClient
        .from('profiles')
        .select('celula_id, role')
        .eq('id', user.id)
        .single();

    if (profileError || !profileData) {
        console.error('checkUserAuthorizationReports: Erro ao buscar perfil do usuário:', profileError?.message || 'Perfil não encontrado.');
        return { supabase: supabaseClient, role: null, celulaId: null };
    }

    const role = profileData.role as 'admin' | 'líder';
    const celulaId = profileData.celula_id;

    if (role === 'admin') {
        const supabaseAdmin = createAdminClient();
        return { supabase: supabaseAdmin, role: 'admin', celulaId: celulaId, adminSupabase: supabaseAdmin }; 
    } else {
        return { supabase: supabaseClient, role: 'líder', celulaId: celulaId };
    }
}

// Busca nomes e telefones de membros
async function getMemberNamesMapWithPhone(memberIds: Set<string>, celulaId: string | null, supabaseInstance: any): Promise<Map<string, { nome: string; telefone: string | null }>> {
    let namesMap = new Map<string, { nome: string; telefone: string | null }>();

    if (memberIds.size === 0) return namesMap;

    let query = supabaseInstance
        .from('membros')
        .select('id, nome, telefone')
        .in('id', Array.from(memberIds));
    
    if (celulaId !== null) { 
        query = query.eq('celula_id', celulaId);
    }

    const { data: membersData, error: membersError } = await query;

    if (membersError) {
        console.error("Erro ao buscar nomes e telefones de membros (getMemberNamesMapWithPhone):", membersError);
    } else {
        membersData?.forEach(m => namesMap.set(m.id, { nome: m.nome, telefone: m.telefone }));
    }
    return namesMap;
}

// Busca nomes e telefones de visitantes
async function getVisitorNamesMap(visitorIds: Set<string>, celulaId: string | null, supabaseInstance: any): Promise<Map<string, { nome: string; telefone: string | null }>> {
    let namesMap = new Map<string, { nome: string; telefone: string | null }>();

    if (visitorIds.size === 0) return namesMap;

    let query = supabaseInstance
        .from('visitantes')
        .select('id, nome, telefone')
        .in('id', Array.from(visitorIds));
    
    if (celulaId !== null) {
        query = query.eq('celula_id', celulaId);
    }

    const { data: visitorsData, error: visitorsError } = await query;

    if (visitorsError) {
        console.error("Erro ao buscar nomes e telefones de visitantes:", visitorsError);
    } else {
        visitorsData?.forEach(v => namesMap.set(v.id, { nome: v.nome, telefone: v.telefone }));
    }
    return namesMap;
}

// Busca nomes de células
async function getCelulasNamesMap(celulaIds: Set<string>, supabaseInstance: any, adminSupabase?: any): Promise<Map<string, string>> {
    let namesMap = new Map<string, string>();
    if (celulaIds.size === 0) return namesMap;

    // Se adminSupabase estiver disponível, use-o para buscar nomes de células sem RLS
    // Isso é útil em relatórios globais para admins
    const clientToUse = adminSupabase || supabaseInstance; 

    const { data, error } = await clientToUse
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
// ============================================================================
//                          FUNÇÕES DE DADOS PARA RELATÓRIOS (SERVER ACTIONS)
// ============================================================================

// Lista membros para os selects de filtro
export async function listMembros(celulaIdParaFiltrar?: string | null): Promise<MembroOption[]> {
    const { supabase, role, celulaId } = await checkUserAuthorizationReports();

    if (!role) { 
        console.warn("listMembros (reports_data): Usuário não autenticado. Retornando lista vazia.");
        return [];
    }

    let query = supabase.from('membros').select('id, nome');

    if (role === 'líder') {
        if (!celulaId) {
            console.warn("listMembros (reports_data): Líder sem ID de célula. Retornando lista vazia.");
            return [];
        }
        query = query.eq('celula_id', celulaId);
    } else if (role === 'admin' && celulaIdParaFiltrar) {
        // Se admin e um filtro de célula é fornecido, usa-o
        query = query.eq('celula_id', celulaIdParaFiltrar);
    } else if (role === 'admin' && !celulaIdParaFiltrar) {
        // Se admin e nenhum filtro de célula, pega todos os membros
        // Nenhuma condição adicional de celula_id
    }
    
    const { data, error } = await query.order('nome', { ascending: true });

    if (error) {
        console.error("Erro ao listar membros (reports_data):", error);
        throw new Error(`Falha ao carregar membros: ${error.message}`);
    }
    return data || [];
}

// Lista reuniões para os selects de filtro
export async function listReunioes(celulaIdParaFiltrar?: string | null): Promise<ReuniaoOption[]> {
    const { supabase, role, celulaId } = await checkUserAuthorizationReports();

    if (!role) {
        console.warn("listReunioes (reports_data): Usuário não autenticado. Retornando lista vazia.");
        return [];
    }

    let query = supabase
        .from('reunioes')
        .select(`
            id, data_reuniao, tema,
            ministrador_principal:membros!ministrador_principal(nome)
        `);

    if (role === 'líder') {
        if (!celulaId) {
            console.warn("listReunioes (reports_data): Líder sem ID de célula. Retornando lista vazia.");
            return [];
        }
        query = query.eq('celula_id', celulaId);
    } else if (role === 'admin' && celulaIdParaFiltrar) {
        query = query.eq('celula_id', celulaIdParaFiltrar);
    } else if (role === 'admin' && !celulaIdParaFiltrar) {
        // Se admin e nenhum filtro, pega todas as reuniões
    }


    const { data, error } = await query.order('data_reuniao', { ascending: false });

    if (error) {
        console.error("Erro ao listar reuniões (reports_data):", error);
        throw new Error(`Falha ao carregar reuniões: ${error.message}`);
    }

    return data?.map(r => ({
        id: r.id,
        data_reuniao: r.data_reuniao,
        tema: r.tema,
        ministrador_principal_nome: r.ministrador_principal?.nome || null
    })) || [];
}

// Lista células para o filtro de admin (NOVO)
export async function listarCelulasParaAdmin(): Promise<CelulaOption[]> {
    const { supabase, role } = await checkUserAuthorizationReports();
    if (role !== 'admin') {
        throw new Error("Acesso negado. Apenas administradores podem listar todas as células.");
    }
    
    const { data, error } = await supabase
        .from('celulas')
        .select('id, nome')
        .order('nome');
  
    if (error) {
      throw new Error(`Falha ao carregar células para admin: ${error.message}`);
    }
    return data || [];
  }


// --- Relatório de Presença por Reunião ---
export async function fetchReportDataPresencaReuniao(reuniaoId: string, celulaIdParaFiltrar?: string | null): Promise<ReportDataPresencaReuniao | null> {
    const { supabase, role, celulaId, adminSupabase } = await checkUserAuthorizationReports();

    if (!role) {
        console.warn("fetchReportDataPresencaReuniao: Usuário não autenticado. Retornando null.");
        return null;
    }

    let targetCelulaIdForQuery: string | null = null;
    const clientToUse = role === 'admin' ? adminSupabase : supabase; // Usa adminSupabase para admin para evitar RLS na verificação inicial

    if (role === 'líder') {
        if (!celulaId) {
            console.warn("fetchReportDataPresencaReuniao: Líder sem ID de célula. Retornando null.");
            return null;
        }
        targetCelulaIdForQuery = celulaId;
    } else { // Admin
        // Admin pode querer filtrar, mas a reunião já tem uma célula associada.
        // Precisamos verificar se a reunião existe e qual sua célula, e se o filtro do admin se aplica.
        const { data: reuniaoDataCheck, error: reuniaoCheckError } = await clientToUse
            .from('reunioes')
            .select('celula_id')
            .eq('id', reuniaoId)
            .single();

        if (reuniaoCheckError || !reuniaoDataCheck?.celula_id) {
            console.warn("fetchReportDataPresencaReuniao: Reunião não encontrada ou inacessível para o admin. Erro:", reuniaoCheckError?.message);
            return null;
        }
        
        // Se o admin forneceu um filtro de célula e ele não corresponde à célula da reunião, retorna nulo
        if (celulaIdParaFiltrar && celulaIdParaFiltrar !== reuniaoDataCheck.celula_id) {
             console.warn("fetchReportDataPresencaReuniao: Admin tentou filtrar por célula diferente da reunião selecionada.");
             return null;
        }
        targetCelulaIdForQuery = reuniaoDataCheck.celula_id; // Define a célula da reunião como alvo
    }

    if (!targetCelulaIdForQuery) {
        console.warn("fetchReportDataPresencaReuniao: Nenhum celula_id para buscar detalhes. Retornando null.");
        return null;
    }

    try {
        const [reuniaoDetailsResult, criancasResult] = await Promise.all([
            clientToUse // Usa o cliente apropriado para buscar detalhes da reunião
                .from('reunioes')
                .select(`
                    id, data_reuniao, tema, caminho_pdf, created_at, celula_id,
                    ministrador_principal:membros!ministrador_principal(nome, telefone),
                    ministrador_secundario:membros!ministrador_secundario(nome, telefone),
                    responsavel_kids:membros!responsavel_kids(nome, telefone)
                `)
                .eq('id', reuniaoId)
                .eq('celula_id', targetCelulaIdForQuery) // Garante que a reunião pertence à célula alvo
                .single(),
            clientToUse // Usa o cliente apropriado para buscar contagem de crianças
                .from('criancas_reuniao')
                .select('numero_criancas')
                .eq('reuniao_id', reuniaoId)
                .maybeSingle()
        ]);
        
        const { data: reuniaoData, error: reuniaoError } = reuniaoDetailsResult;
        if (reuniaoError || !reuniaoData) {
            console.error("fetchReportDataPresencaReuniao: Erro ao buscar detalhes da reunião:", reuniaoError);
            throw new Error(`Falha ao carregar detalhes da reunião: ${reuniaoError?.message || 'Reunião não encontrada'}`);
        }
        
        const { data: criancasData, error: criancasError } = criancasResult;
        if (criancasError) {
            console.warn("fetchReportDataPresencaReuniao: Erro ao buscar contagem de crianças:", criancasError.message);
        }
        const numCriancas = criancasData?.numero_criancas ?? 0;

        const [
            presentesMembrosRaw,
            allMembersData,
            visitantesPresentesRaw,
            celulasNamesMap
        ] = await Promise.all([
            clientToUse.from('presencas_membros').select('membro_id, membros(nome, telefone)').eq('reuniao_id', reuniaoId).eq('presente', true),
            clientToUse.from('membros').select('id, nome, telefone').eq('celula_id', targetCelulaIdForQuery).order('nome', { ascending: true }),
            clientToUse.from('presencas_visitantes').select('visitante_id, visitantes(nome, telefone)').eq('reuniao_id', reuniaoId).eq('presente', true),
            getCelulasNamesMap(new Set([reuniaoData.celula_id]), clientToUse, adminSupabase) // Passa adminSupabase aqui também
        ]);

        if (presentesMembrosRaw.error) throw presentesMembrosRaw.error;
        const membrosPresentes = (presentesMembrosRaw.data || []).map(p => ({ id: p.membro_id, nome: p.membros?.nome || 'N/A', telefone: p.membros?.telefone || null }));

        if (allMembersData.error) throw allMembersData.error;
        const presentMemberIds = new Set(membrosPresentes.map(m => m.id));
        const membrosAusentes = (allMembersData.data || []).filter(m => !presentMemberIds.has(m.id)).map(m => ({ id: m.id, nome: m.nome, telefone: m.telefone }));

        if (visitantesPresentesRaw.error) throw visitantesPresentesRaw.error;
        const visitantesPresentes = (visitantesPresentesRaw.data || []).map(p => ({ id: p.visitante_id, nome: p.visitantes?.nome || 'N/A', telefone: p.visitantes?.telefone || null }));
        
        const celulaNome = celulasNamesMap.get(reuniaoData.celula_id) || null;

        const reuniaoDetalhesFormatted: ReportDataPresencaReuniao['reuniao_detalhes'] = {
            id: reuniaoData.id,
            data_reuniao: reuniaoData.data_reuniao,
            tema: reuniaoData.tema,
            caminho_pdf: reuniaoData.caminho_pdf,
            ministrador_principal_nome: reuniaoData.ministrador_principal?.nome || 'Não Definido',
            ministrador_principal_telefone: reuniaoData.ministrador_principal?.telefone || null,
            ministrador_secundario_nome: reuniaoData.ministrador_secundario?.nome || null,
            ministrador_secundario_telefone: reuniaoData.ministrador_secundario?.telefone || null,
            responsavel_kids_nome: reuniaoData.responsavel_kids?.nome || null,
            responsavel_kids_telefone: reuniaoData.responsavel_kids?.telefone || null,
            num_criancas: numCriancas,
            celula_nome: celulaNome,
        };

        return {
            reuniao_detalhes: reuniaoDetalhesFormatted,
            membros_presentes: membrosPresentes,
            membros_ausentes: membrosAusentes,
            visitantes_presentes: visitantesPresentes,
        };
    } catch (error: any) {
        console.error('Erro ao gerar relatório de presença da reunião:', error);
        throw error;
    }
}

// --- Relatório de Presença por Membro ---
export async function fetchReportDataPresencaMembro(membroId: string, celulaIdParaFiltrar?: string | null): Promise<ReportDataPresencaMembro | null> {
    const { supabase, role, celulaId, adminSupabase } = await checkUserAuthorizationReports();

    if (!role) {
        console.warn("fetchReportDataPresencaMembro: Usuário não autenticado. Retornando null.");
        return null;
    }

    let targetCelulaIdForQuery: string | null = null;
    const clientToUse = role === 'admin' ? adminSupabase : supabase; // Usa adminSupabase para admin

    if (role === 'líder') {
        if (!celulaId) {
            console.warn("fetchReportDataPresencaMembro: Líder sem ID de célula. Retornando null.");
            return null;
        }
        targetCelulaIdForQuery = celulaId;
    } else { // Admin
        const { data: membroDataCheck, error: membroCheckError } = await clientToUse
            .from('membros')
            .select('celula_id')
            .eq('id', membroId)
            .single();
        if (membroCheckError || !membroDataCheck?.celula_id) {
            console.warn("fetchReportDataPresencaMembro: Membro não encontrado ou inacessível para o admin. Erro:", membroCheckError?.message);
            return null;
        }
        if (celulaIdParaFiltrar && celulaIdParaFiltrar !== membroDataCheck.celula_id) {
            console.warn("fetchReportDataPresencaMembro: Admin tentou filtrar por célula diferente do membro selecionado.");
            return null;
        }
        targetCelulaIdForQuery = membroDataCheck.celula_id;
    }
    
    if (!targetCelulaIdForQuery) {
        console.warn("fetchReportDataPresencaMembro: Nenhum ID de célula disponível para filtrar membro. Retornando null.");
        return null;
    }

    try {
        const { data: membroData, error: membroError } = await clientToUse
            .from('membros')
            .select('id, nome, telefone, data_ingresso, data_nascimento, endereco, celula_id')
            .eq('id', membroId)
            .eq('celula_id', targetCelulaIdForQuery)
            .single();

        if (membroError) {
            console.error("fetchReportDataPresencaMembro: Erro ao buscar detalhes do membro:", membroError);
            throw new Error(`Falha ao carregar detalhes do membro: ${membroError.message}`);
        }
        if (!membroData) return null;

        const celulasNamesMap = await getCelulasNamesMap(new Set([membroData.celula_id]), clientToUse, adminSupabase);
        const celulaNome = celulasNamesMap.get(membroData.celula_id) || null;
        
        const membroDataWithCelularName = { ...membroData, celula_nome: celulaNome } as Membro & { celula_nome?: string | null };


        const { data: allReunioesData, error: allReunioesError } = await clientToUse
            .from('reunioes')
            .select('id, data_reuniao, tema')
            .eq('celula_id', targetCelulaIdForQuery)
            .order('data_reuniao', { ascending: false });

        if (allReunioesError) { 
            console.error("fetchReportDataPresencaMembro: Erro ao buscar todas as reuniões da célula:", allReunioesError); 
            throw new Error(`Falha ao carregar reuniões da célula: ${allReunioesError.message}`);
        }
        const allReunioes = allReunioesData || [];

        const { data: memberPresencesData, error: memberPresencesError } = await clientToUse
            .from('presencas_membros')
            .select('reuniao_id, presente')
            .eq('membro_id', membroId);

        if (memberPresencesError) { 
            console.error("fetchReportDataPresencaMembro: Erro ao buscar presenças do membro:", memberPresencesError); 
            throw new Error(`Falha ao carregar presenças do membro: ${memberPresencesError.message}`);
        }
        const memberPresencesMap = new Map((memberPresencesData || []).map(p => [p.reuniao_id, p.presente]));

        const historicoPresenca: RelatorioPresencaMembroItem[] = allReunioes.map(reuniao => ({
            data_reuniao: reuniao.data_reuniao,
            tema: reuniao.tema,
            presente: memberPresencesMap.get(reuniao.id) || false,
        }));

        return { membro_data: membroDataWithCelularName, historico_presenca: historicoPresenca };

    } catch (error: any) {
        console.error('Erro ao gerar relatório de presença de membro:', error);
        throw error;
    }
}

// --- Relatório de Membros Faltosos por Período ---
export async function fetchReportDataFaltososPeriodo(startDate: string, endDate: string, celulaIdParaFiltrar?: string | null): Promise<ReportDataFaltososPeriodo> {
    const { supabase, role, celulaId, adminSupabase } = await checkUserAuthorizationReports();

    if (!role) {
        console.warn("fetchReportDataFaltososPeriodo: Usuário não autenticado. Retornando relatório vazio.");
        return { faltosos: [], start_date: startDate, end_date: endDate };
    }

    let targetCelulaIdForQuery: string | null = null;
    const clientToUse = role === 'admin' ? adminSupabase : supabase; // Usa adminSupabase para admin

    if (role === 'líder') {
        if (!celulaId) {
            console.warn("fetchReportDataFaltososPeriodo: Líder sem ID de célula. Retornando relatório vazio.");
            return { faltosos: [], start_date: startDate, end_date: endDate };
        }
        targetCelulaIdForQuery = celulaId;
    } else { // Admin
        targetCelulaIdForQuery = celulaIdParaFiltrar; // Admin pode escolher filtrar por célula ou não
    }

    try {
        let reunioesQuery = clientToUse.from('reunioes').select('id, celula_id');
        if (targetCelulaIdForQuery) { 
            reunioesQuery = reunioesQuery.eq('celula_id', targetCelulaIdForQuery);
        }
        
        const { data: reunioesNoPeriodo, error: reunioesError } = await reunioesQuery
            .gte('data_reuniao', startDate)
            .lte('data_reuniao', endDate);
        
        if (reunioesError) {
            console.error("fetchReportDataFaltososPeriodo: Erro ao buscar reuniões no período:", reunioesError);
            throw new Error(`Falha ao carregar reuniões do período: ${reunioesError.message}`);
        }
        
        // Agrupa as reuniões por celula_id para saber quais reuniões cada célula teve no período
        const reunioesPorCelula = (reunioesNoPeriodo || []).reduce((acc, r) => {
            if (!acc.has(r.celula_id)) acc.set(r.celula_id, []);
            acc.get(r.celula_id)!.push(r.id);
            return acc;
        }, new Map<string, string[]>());

        if (reunioesPorCelula.size === 0) {
            return { faltosos: [], start_date: startDate, end_date: endDate };
        }

        let membersQuery = clientToUse.from('membros').select('id, nome, telefone, celula_id');
        if (targetCelulaIdForQuery) { 
            membersQuery = membersQuery.eq('celula_id', targetCelulaIdForQuery);
        }
        
        const { data: allMembers, error: allMembersError } = await membersQuery;
        
        if (allMembersError) {
            console.error("fetchReportDataFaltososPeriodo: Erro ao buscar todos os membros:", allMembersError);
            throw new Error(`Falha ao carregar todos os membros: ${allMembersError.message}`);
        }

        const faltososList: MembroFaltoso[] = [];
        const celulaIds = new Set((allMembers || []).map(m => m.celula_id)); // Coleta todos os IDs de célula dos membros
        const celulasNamesMap = await getCelulasNamesMap(celulaIds, clientToUse, adminSupabase); // Busca os nomes das células

        for (const membro of allMembers || []) {
            const reunioesDaCelulaDoMembro = reunioesPorCelula.get(membro.celula_id) || [];
            const totalReunioesNoPeriodoParaMembro = reunioesDaCelulaDoMembro.length;

            if (totalReunioesNoPeriodoParaMembro === 0) continue; // Se a célula não teve reuniões no período, o membro não é 'faltoso' nele.

            const { count: totalPresencasMembro, error: presencasCountError } = await clientToUse
                .from('presencas_membros')
                .select('id', { count: 'exact' })
                .eq('membro_id', membro.id)
                .eq('presente', true)
                .in('reuniao_id', reunioesDaCelulaDoMembro);

            if (presencasCountError) {
                console.error(`fetchReportDataFaltososPeriodo: Erro ao contar presenças para o membro ${membro.nome}:`, presencasCountError);
                continue; // Pula este membro em caso de erro
            }
            
            // Um membro é considerado faltoso se o número de presenças é menor que o total de reuniões no período.
            // Para relatório, listamos todos que não foram 100% presentes
            if ((totalPresencasMembro ?? 0) < totalReunioesNoPeriodoParaMembro) {
                faltososList.push({
                    id: membro.id,
                    nome: membro.nome,
                    telefone: membro.telefone,
                    total_presencas: totalPresencasMembro ?? 0,
                    total_reunioes_no_periodo: totalReunioesNoPeriodoParaMembro,
                    celula_nome: celulasNamesMap.get(membro.celula_id) || null,
                });
            }
        }

        faltososList.sort((a, b) => a.nome.localeCompare(b.nome)); // Ordena por nome
        return { faltosos: faltososList, start_date: startDate, end_date: endDate };
    } catch (error: any) {
        console.error('Erro ao gerar relatório de faltosos:', error);
        throw error;
    }
}

// --- Relatório de Visitantes por Período ---
export async function fetchReportDataVisitantesPeriodo(startDate: string, endDate: string, celulaIdParaFiltrar?: string | null): Promise<ReportDataVisitantesPeriodo> {
    const { supabase, role, celulaId, adminSupabase } = await checkUserAuthorizationReports();

    if (!role) {
        console.warn("fetchReportDataVisitantesPeriodo: Usuário não autenticado. Retornando relatório vazio.");
        return { visitantes: [], start_date: startDate, end_date: endDate };
    }

    let query = supabase
            .from('visitantes')
            .select('id, nome, telefone, data_primeira_visita, celula_id');
    
    const clientToUse = role === 'admin' ? adminSupabase : supabase; // Usa adminSupabase para admin

    if (role === 'líder') {
        if (!celulaId) return { visitantes: [], start_date: startDate, end_date: endDate };
        query = query.eq('celula_id', celulaId);
    } else if (role === 'admin' && celulaIdParaFiltrar) {
        query = query.eq('celula_id', celulaIdParaFiltrar);
    } // Se admin sem filtro, pega todos os visitantes.

    try {
        const { data, error } = await query
            .gte('data_primeira_visita', startDate)
            .lte('data_primeira_visita', endDate)
            .order('data_primeira_visita', { ascending: true });
        
        if (error) {
            console.error('fetchReportDataVisitantesPeriodo: Erro ao buscar visitantes por período:', error);
            throw new Error(`Falha ao carregar visitantes por período: ${error.message}`);
        }

        const visitantes = data || [];
        if (visitantes.length === 0) return { visitantes: [], start_date: startDate, end_date: endDate };

        const celulaIds = new Set(visitantes.map(v => v.celula_id));
        const celulasNamesMap = await getCelulasNamesMap(celulaIds, clientToUse, adminSupabase); // Passa adminSupabase aqui também

        const visitantesWithCelularName = visitantes.map(v => ({
            ...v,
            celula_nome: celulasNamesMap.get(v.celula_id) || null,
        }));

        return { visitantes: visitantesWithCelularName, start_date: startDate, end_date: endDate };

    } catch (error: any) {
        console.error('Erro ao gerar relatório de visitantes por período:', error);
        throw error;
    }
}

// --- Relatório de Aniversariantes por Mês ---
export async function fetchReportDataAniversariantes(mes: number, celulaIdParaFiltrar?: string | null): Promise<ReportDataAniversariantes | null> {
    const { supabase, role, celulaId, adminSupabase } = await checkUserAuthorizationReports();

    if (!role) {
        console.warn("fetchReportDataAniversariantes: Usuário não autenticado. Retornando null.");
        return null;
    }
    if (mes < 1 || mes > 12) {
        throw new Error("Mês inválido. Deve ser entre 1 e 12.");
    }

    let targetCelulaIdForQuery: string | null = null;
    const clientToUse = role === 'admin' ? adminSupabase : supabase; // Usa adminSupabase para admin

    if (role === 'líder') {
        if (!celulaId) {
            console.warn("fetchReportDataAniversariantes: Líder sem ID de célula. Retornando null.");
            return null;
        }
        targetCelulaIdForQuery = celulaId;
    } else { // Admin
        targetCelulaIdForQuery = celulaIdParaFiltrar; // Admin pode escolher filtrar por célula ou não
    }

    if (!targetCelulaIdForQuery && role !== 'admin') { 
        console.warn("fetchReportDataAniversariantes: ID da célula não definido para líder.");
        return null;
    }

    try {
        const anoAtual = new Date().getFullYear();

        let membrosRaw: any[] | null = [];
        let visitantesRaw: any[] | null = [];

        // --- BUSCA DE MEMBROS (usando RPC para filtrar por mês de aniversário eficientemente com RLS) ---
        let membroIds: string[] = [];
        const { data: membroIdsRaw, error: rpcMembrosError } = await clientToUse.rpc('get_members_birthday_ids_in_month', { 
            p_month: mes, 
            p_celula_id: targetCelulaIdForQuery // RPC aplica o filtro de célula
        });
        if (rpcMembrosError) {
            console.error("RPC Error get_members_birthday_ids_in_month:", rpcMembrosError);
            throw rpcMembrosError;
        }
        membroIds = membroIdsRaw || [];
        
        if (membroIds.length > 0) {
            const { data, error } = await clientToUse
                .from('membros')
                .select('id, nome, telefone, data_nascimento, celula_id')
                .in('id', membroIds); // Filtra pelos IDs retornados pela RPC
            if (error) {
                console.error("Erro ao buscar detalhes dos membros aniversariantes:", error);
                throw error;
            }
            membrosRaw = data;
        }


        // --- BUSCA DE VISITANTES (usando RPC) ---
        let visitanteIds: string[] = [];
        const { data: visitanteIdsRaw, error: rpcVisitantesError } = await clientToUse.rpc('get_visitors_birthday_ids_in_month', { 
            p_month: mes, 
            p_celula_id: targetCelulaIdForQuery // RPC aplica o filtro de célula
        });
        if (rpcVisitantesError) {
            console.error("RPC Error get_visitors_birthday_ids_in_month:", rpcVisitantesError);
            throw rpcVisitantesError;
        }
        visitanteIds = visitanteIdsRaw || [];

        if (visitanteIds.length > 0) {
            const { data, error } = await clientToUse
                .from('visitantes')
                .select('id, nome, telefone, data_primeira_visita, data_nascimento, celula_id')
                .in('id', visitanteIds); // Filtra pelos IDs retornados pela RPC
            if (error) {
                console.error("Erro ao buscar detalhes dos visitantes aniversariantes:", error);
                throw error;
            }
            visitantesRaw = data;
        }

        // Coleta todos os IDs de células envolvidas para buscar os nomes
        const allCelulaIds = new Set<string>();
        membrosRaw?.forEach(m => m.celula_id && allCelulaIds.add(m.celula_id));
        visitantesRaw?.forEach(v => v.celula_id && allCelulaIds.add(v.celula_id));
        
        const celulasNamesMap = await getCelulasNamesMap(allCelulaIds, clientToUse, adminSupabase);

        const membrosAniversariantes: MembroAniversariante[] = (membrosRaw || []).map(m => ({
            id: m.id,
            nome: m.nome,
            data_nascimento: m.data_nascimento!,
            telefone: m.telefone,
            celula_nome: celulasNamesMap.get(m.celula_id) || null,
        }));

        const visitantesAniversariantes: VisitanteAniversariante[] = (visitantesRaw || []).map(v => ({
            id: v.id,
            nome: v.nome,
            data_primeira_visita: v.data_primeira_visita,
            data_nascimento: v.data_nascimento!, // Assume que data_nascimento existe para aniversariantes
            telefone: v.telefone,
            celula_nome: celulasNamesMap.get(v.celula_id) || null,
        }));

        // Ordena por dia do mês
        membrosAniversariantes.sort((a, b) => {
            const dateA = parseISO(a.data_nascimento);
            const dateB = parseISO(b.data_nascimento);
            return dateA.getDate() - dateB.getDate();
        });

        visitantesAniversariantes.sort((a, b) => {
            const dateA = parseISO(a.data_nascimento);
            const dateB = parseISO(b.data_nascimento);
            return dateA.getDate() - dateB.getDate();
        });


        return {
            mes: mes,
            ano_referencia: anoAtual,
            membros: membrosAniversariantes,
            visitantes: visitantesAniversariantes,
        };

    } catch (error: any) {
        console.error("Erro ao gerar relatório de aniversariantes:", error);
        throw error;
    }
}

// --- Relatório de Alocação de Líderes (NOVO) ---
export async function fetchReportDataAlocacaoLideres(): Promise<ReportDataAlocacaoLideres | null> {
    const { role, adminSupabase } = await checkUserAuthorizationReports();

    // Apenas administradores podem acessar este relatório global
    if (role !== 'admin' || !adminSupabase) {
        console.warn("fetchReportDataAlocacaoLideres: Apenas administradores podem acessar este relatório. Retornando null.");
        return null;
    }

    try {
        const [
            allProfilesResult, // Perfis customizados
            allCelulasResult,  // Todas as células
            authUsersResult    // Usuários de autenticação (para last_sign_in_at)
        ] = await Promise.all([
            adminSupabase.from('profiles').select('id, email, role, celula_id, created_at, nome_completo'),
            adminSupabase.from('celulas').select('id, nome, lider_principal'),
            adminSupabase.auth.admin.listUsers() // Para obter `last_sign_in_at`
        ]);

        if (allProfilesResult.error) throw allProfilesResult.error;
        const profiles = allProfilesResult.data || [];

        if (allCelulasResult.error) throw allCelulasResult.error;
        const celulas = allCelulasResult.data || [];
        const celulasNamesMap = new Map(celulas.map(c => [c.id, c.nome]));

        // Mapeia last_sign_in_at dos usuários de autenticação
        const authUsersMap = new Map((authUsersResult.data?.users || []).map(u => [u.id, u.last_sign_in_at]));

        const lideresAlocados: LiderAlocacaoItem[] = [];
        const lideresNaoAlocados: LiderAlocacaoItem[] = [];
        
        // Mantém um registro dos IDs das células que têm um líder atribuído em um perfil
        const celulasComLiderAtribuidoEmPerfil = new Set<string>();

        const totalPerfisLider = profiles.filter(p => p.role === 'líder' || p.role === 'admin').length;
        const totalCelulas = celulas.length;

        for (const profile of profiles) {
            if (profile.role === 'líder' || profile.role === 'admin') {
                const liderItem: LiderAlocacaoItem = {
                    id: profile.id,
                    email: profile.email || profile.nome_completo || 'N/A', // Usa nome_completo se email não disponível
                    role: profile.role,
                    celula_id: profile.celula_id,
                    celula_nome: profile.celula_id ? celulasNamesMap.get(profile.celula_id) || null : null,
                    data_criacao_perfil: profile.created_at,
                    ultimo_login: authUsersMap.get(profile.id) || null,
                };

                if (profile.celula_id) {
                    lideresAlocados.push(liderItem);
                    celulasComLiderAtribuidoEmPerfil.add(profile.celula_id);
                } else {
                    lideresNaoAlocados.push(liderItem);
                }
            }
        }

        // Encontra células que não têm nenhum perfil de líder associado
        const celulasSemLiderAtribuido: CelulaSemLiderItem[] = celulas
            .filter(celula => !celulasComLiderAtribuidoEmPerfil.has(celula.id))
            .map(celula => ({
                id: celula.id,
                nome: celula.nome,
                lider_principal_cadastrado_na_celula: celula.lider_principal || null,
            }));
        
        // Ordena as listas para apresentação
        lideresAlocados.sort((a,b) => (a.celula_nome || '').localeCompare(b.celula_nome || 'N/A') || a.email.localeCompare(b.email));
        lideresNaoAlocados.sort((a,b) => a.email.localeCompare(b.email));
        celulasSemLiderAtribuido.sort((a,b) => a.nome.localeCompare(b.nome));

        return {
            lideres_alocados: lideresAlocados,
            lideres_nao_alocados: lideresNaoAlocados,
            celulas_sem_lider_atribuido: celulasSemLiderAtribuido,
            total_perfis_lider: totalPerfisLider,
            total_celulas: totalCelulas,
        };

    } catch (error: any) {
        console.error("fetchReportDataAlocacaoLideres: Erro ao buscar dados de alocação de líderes:", error);
        throw new Error(`Falha ao carregar relatório de alocação de líderes: ${error.message}`);
    }
}

// --- Relatório de Chaves de Ativação (NOVO) ---
export async function fetchReportDataChavesAtivacao(): Promise<ReportDataChavesAtivacao | null> {
    const { role, adminSupabase } = await checkUserAuthorizationReports();

    if (role !== 'admin' || !adminSupabase) {
        console.warn("fetchReportDataChavesAtivacao: Apenas administradores podem acessar este relatório. Retornando null.");
        return null;
    }

    try {
        // Busca todas as chaves de ativação
        const { data: chavesData, error: chavesError } = await adminSupabase
            .from('chaves_ativacao')
            .select(`
                chave,
                celula_id,
                usada,
                created_at,
                data_uso,
                usada_por_id,
                profiles(email) // Faz um join para buscar o email do usuário que usou a chave
            `);

        if (chavesError) throw chavesError;
        const allChaves = chavesData || [];

        const total_chaves = allChaves.length;

        // Coleta IDs de células para buscar os nomes
        const celulaIds = new Set(allChaves.map(c => c.celula_id));
        const celulasNamesMap = await getCelulasNamesMap(celulaIds, adminSupabase);

        const chavesAtivas: ChaveAtivacaoItem[] = [];
        const chavesUsadas: ChaveAtivacaoItem[] = [];

        for (const chave of allChaves) {
            const formattedChave: ChaveAtivacaoItem = {
                chave: chave.chave,
                celula_id: chave.celula_id,
                celula_nome: celulasNamesMap.get(chave.celula_id) || 'N/A',
                usada: chave.usada,
                data_uso: chave.data_uso ? new Date(chave.data_uso).toISOString().split('T')[0] : null,
                usada_por_id: chave.usada_por_id,
                usada_por_email: chave.profiles?.email || null, // Email vindo do join
            };

            if (chave.usada) {
                chavesUsadas.push(formattedChave);
            } else {
                chavesAtivas.push(formattedChave);
            }
        }
        
        // Ordena as listas para melhor visualização
        chavesAtivas.sort((a,b) => a.celula_nome.localeCompare(b.celula_nome || 'N/A') || a.chave.localeCompare(b.chave));
        chavesUsadas.sort((a,b) => (b.data_uso || '').localeCompare(a.data_uso || '')); // Mais recentes primeiro

        return {
            chaves_ativas: chavesAtivas,
            chaves_usadas: chavesUsadas,
            total_chaves: total_chaves,
        };

    } catch (error: any) {
        console.error("fetchReportDataChavesAtivacao: Erro ao buscar dados de chaves de ativação:", error);
        throw new Error(`Falha ao carregar relatório de chaves de ativação: ${error.message}`);
    }
}


// ============================================================================
//                          FUNÇÕES DE EXPORTAÇÃO CSV (SERVER ACTIONS)
// ============================================================================

// Importa funções de formatação (assumindo que já existem ou serão criadas)
import { formatPhoneNumberDisplay, formatDateForDisplay } from '@/utils/formatters';

// Função auxiliar para escapar valores para CSV
function escapeCsv(value: string | number | null | undefined): string {
    if (value === null || value === undefined) return '';
    const strValue = String(value).replace(/"/g, '""'); // Escapa aspas duplas
    return `"${strValue}"`; // Envolve em aspas duplas
}

export async function exportReportDataPresencaReuniaoCSV(reuniaoId: string, celulaIdParaFiltrar?: string | null): Promise<string> {
    const reportData = await fetchReportDataPresencaReuniao(reuniaoId, celulaIdParaFiltrar);
    if (!reportData) return "Nenhum dado encontrado para exportação CSV.";

    let csv = '';

    csv += 'Detalhes da Reunião:\n';
    csv += `Data,${escapeCsv(reportData.reuniao_detalhes.data_reuniao)}\n`;
    csv += `Tema,${escapeCsv(reportData.reuniao_detalhes.tema)}\n`;
    csv += `Ministrador Principal,${escapeCsv(reportData.reuniao_detalhes.ministrador_principal_nome)}\n`;
    csv += `Ministrador Secundário,${escapeCsv(reportData.reuniao_detalhes.ministrador_secundario_nome)}\n`;
    csv += `Responsável Kids,${escapeCsv(reportData.reuniao_detalhes.responsavel_kids_nome)}\n`;
    csv += `Crianças Presentes,${escapeCsv(reportData.reuniao_detalhes.num_criancas)}\n`;
    csv += `Célula,${escapeCsv(reportData.reuniao_detalhes.celula_nome)}\n`;
    csv += '\n';

    csv += 'Membros Presentes:\n';
    csv += 'Nome,Telefone\n';
    reportData.membros_presentes.forEach(m => {
        csv += `${escapeCsv(m.nome)},${escapeCsv(formatPhoneNumberDisplay(m.telefone))}\n`;
    });
    csv += '\n';

    csv += 'Membros Ausentes:\n';
    csv += 'Nome,Telefone\n';
    reportData.membros_ausentes.forEach(m => {
        csv += `${escapeCsv(m.nome)},${escapeCsv(formatPhoneNumberDisplay(m.telefone))}\n`;
    });
    csv += '\n';

    csv += 'Visitantes Presentes:\n';
    csv += 'Nome,Telefone\n';
    reportData.visitantes_presentes.forEach(v => {
        csv += `${escapeCsv(v.nome)},${escapeCsv(formatPhoneNumberDisplay(v.telefone))}\n`;
    });
    csv += '\n';

    return csv;
}

export async function exportReportDataPresencaMembroCSV(membroId: string, celulaIdParaFiltrar?: string | null): Promise<string> {
    const reportData = await fetchReportDataPresencaMembro(membroId, celulaIdParaFiltrar);
    if (!reportData || !reportData.membro_data) return "Nenhum dado encontrado para exportação CSV.";

    let csv = '';

    csv += 'Detalhes do Membro:\n';
    csv += `Nome,${escapeCsv(reportData.membro_data.nome)}\n`;
    csv += `Telefone,${escapeCsv(formatPhoneNumberDisplay(reportData.membro_data.telefone))}\n`;
    csv += `Data de Ingresso,${escapeCsv(formatDateForDisplay(reportData.membro_data.data_ingresso))}\n`;
    csv += `Data de Nascimento,${escapeCsv(formatDateForDisplay(reportData.membro_data.data_nascimento))}\n`;
    csv += `Célula,${escapeCsv(reportData.membro_data.celula_nome)}\n`;
    csv += '\n';

    csv += 'Histórico de Presença:\n';
    csv += 'Data da Reunião,Tema,Presente?\n';
    reportData.historico_presenca.forEach(h => {
        csv += `${escapeCsv(formatDateForDisplay(h.data_reuniao))},${escapeCsv(h.tema)},${escapeCsv(h.presente ? 'Sim' : 'Não')}\n`;
    });
    csv += '\n';

    return csv;
}

export async function exportReportDataFaltososPeriodoCSV(startDate: string, endDate: string, celulaIdParaFiltrar?: string | null): Promise<string> {
    const reportData = await fetchReportDataFaltososPeriodo(startDate, endDate, celulaIdParaFiltrar);
    if (!reportData || reportData.faltosos.length === 0) return "Nenhum dado encontrado para exportação CSV.";

    let csv = '';

    csv += `Relatório de Membros Faltosos entre ${formatDateForDisplay(reportData.start_date)} e ${formatDateForDisplay(reportData.end_date)}\n\n`;
    csv += 'Nome,Telefone,Presenças,Reuniões no Período,Célula\n';
    reportData.faltosos.forEach(f => {
        csv += `${escapeCsv(f.nome)},${escapeCsv(formatPhoneNumberDisplay(f.telefone))},${escapeCsv(f.total_presencas)},${escapeCsv(f.total_reunioes_no_periodo)},${escapeCsv(f.celula_nome)}\n`;
    });
    csv += '\n';

    return csv;
}

export async function exportReportDataVisitantesPeriodoCSV(startDate: string, endDate: string, celulaIdParaFiltrar?: string | null): Promise<string> {
    const reportData = await fetchReportDataVisitantesPeriodo(startDate, endDate, celulaIdParaFiltrar);
    if (!reportData || reportData.visitantes.length === 0) return "Nenhum dado encontrado para exportação CSV.";

    let csv = '';

    csv += `Relatório de Visitantes entre ${formatDateForDisplay(reportData.start_date)} e ${formatDateForDisplay(reportData.end_date)}\n\n`;
    csv += 'Nome,Telefone,Primeira Visita,Célula\n';
    reportData.visitantes.forEach(v => {
        csv += `${escapeCsv(v.nome)},${escapeCsv(formatPhoneNumberDisplay(v.telefone))},${escapeCsv(formatDateForDisplay(v.data_primeira_visita))},${escapeCsv(v.celula_nome)}\n`;
    });
    csv += '\n';

    return csv;
}

export async function exportReportDataAniversariantesCSV(mes: number, celulaIdParaFiltrar?: string | null): Promise<string> {
    const reportData = await fetchReportDataAniversariantes(mes, celulaIdParaFiltrar);
    if (!reportData) return "Nenhum dado encontrado para exportação CSV.";

    let csv = '';
    const mesNome = new Date(reportData.ano_referencia, reportData.mes - 1).toLocaleString('pt-BR', { month: 'long' });

    csv += `Aniversariantes de ${mesNome} de ${reportData.ano_referencia}\n\n`;

    if (reportData.membros.length > 0) {
        csv += 'Membros Aniversariantes:\n';
        csv += 'Nome,Data Nasc.,Telefone,Célula\n';
        reportData.membros.forEach(m => {
            csv += `${escapeCsv(m.nome)},${escapeCsv(formatDateForDisplay(m.data_nascimento))},${escapeCsv(formatPhoneNumberDisplay(m.telefone))},${escapeCsv(m.celula_nome)}\n`;
        });
        csv += '\n';
    } else {
        csv += 'Nenhum membro aniversariante neste mês.\n\n';
    }

    if (reportData.visitantes.length > 0) {
        csv += 'Visitantes Aniversariantes:\n';
        csv += 'Nome,Data Nasc.,Telefone,Célula\n';
        reportData.visitantes.forEach(v => {
            csv += `${escapeCsv(v.nome)},${escapeCsv(formatDateForDisplay(v.data_nascimento))},${escapeCsv(formatPhoneNumberDisplay(v.telefone))},${escapeCsv(v.celula_nome)}\n`;
        });
        csv += '\n';
    } else {
        csv += 'Nenhum visitante aniversariante neste mês.\n\n';
    }

    return csv;
}

// --- NOVO: Função de exportação CSV para Relatório de Alocação de Líderes ---
export async function exportReportDataAlocacaoLideresCSV(): Promise<string> {
    const reportData = await fetchReportDataAlocacaoLideres();
    if (!reportData) return "Nenhum dado encontrado para exportação CSV.";

    let csv = '';
    const dataGeracao = formatDateForDisplay(new Date().toISOString());

    csv += `Relatório de Alocação de Líderes - Gerado em: ${dataGeracao}\n`;
    csv += `Total de Perfis de Líder/Admin: ${reportData.total_perfis_lider}\n`;
    csv += `Total de Células Registradas: ${reportData.total_celulas}\n\n`;

    // Líderes Alocados
    if (reportData.lideres_alocados.length > 0) {
        csv += 'Líderes Alocados em Células:\n';
        csv += 'Email,Role,Célula Associada,Último Login\n';
        reportData.lideres_alocados.forEach(l => {
            csv += `${escapeCsv(l.email)},${escapeCsv(l.role)},${escapeCsv(l.celula_nome)},${escapeCsv(formatDateForDisplay(l.ultimo_login))}\n`;
        });
        csv += '\n';
    } else {
        csv += 'Nenhum líder alocado em célula encontrado.\n\n';
    }

    // Líderes Não Alocados
    if (reportData.lideres_nao_alocados.length > 0) {
        csv += 'Líderes sem Célula Alocada no Perfil:\n';
        csv += 'Email,Role,Data Criação Perfil,Último Login\n';
        reportData.lideres_nao_alocados.forEach(l => {
            csv += `${escapeCsv(l.email)},${escapeCsv(l.role)},${escapeCsv(formatDateForDisplay(l.data_criacao_perfil))},${escapeCsv(formatDateForDisplay(l.ultimo_login))}\n`;
        });
        csv += '\n';
    } else {
        csv += 'Nenhum líder sem célula alocada encontrado.\n\n';
    }

    // Células sem Líder Atribuído
    if (reportData.celulas_sem_lider_atribuido.length > 0) {
        csv += 'Células sem Líder Atribuído em Perfis:\n';
        csv += 'Nome da Célula,Líder Principal (no registro da célula)\n';
        reportData.celulas_sem_lider_atribuido.forEach(c => {
            csv += `${escapeCsv(c.nome)},${escapeCsv(c.lider_principal_cadastrado_na_celula)}\n`;
        });
        csv += '\n';
    } else {
        csv += 'Nenhuma célula sem líder atribuído encontrada.\n\n';
    }

    return csv;
}
// --- FIM NOVO ---

// --- NOVO: Função de exportação CSV para Relatório de Chaves de Ativação ---
export async function exportReportDataChavesAtivacaoCSV(): Promise<string> {
    const reportData = await fetchReportDataChavesAtivacao();
    if (!reportData) return "Nenhum dado encontrado para exportação CSV.";

    let csv = '';
    const dataGeracao = formatDateForDisplay(new Date().toISOString());

    csv += `Relatório de Chaves de Ativação - Gerado em: ${dataGeracao}\n`;
    csv += `Total de Chaves Registradas: ${reportData.total_chaves}\n\n`;

    // Chaves Ativas
    if (reportData.chaves_ativas.length > 0) {
        csv += 'Chaves Ativas:\n';
        csv += 'Chave,Célula Associada\n';
        reportData.chaves_ativas.forEach(c => {
            csv += `${escapeCsv(c.chave)},${escapeCsv(c.celula_nome)}\n`;
        });
        csv += '\n';
    } else {
        csv += 'Nenhuma chave de ativação ativa encontrada.\n\n';
    }

    // Chaves Usadas
    if (reportData.chaves_usadas.length > 0) {
        csv += 'Chaves Usadas:\n';
        csv += 'Chave,Célula Original,Usada Por (Email),Data de Uso\n';
        reportData.chaves_usadas.forEach(c => {
            csv += `${escapeCsv(c.chave)},${escapeCsv(c.celula_nome)},${escapeCsv(c.usada_por_email)},${escapeCsv(formatDateForDisplay(c.data_uso))}\n`;
        });
        csv += '\n';
    } else {
        csv += 'Nenhuma chave de ativação usada encontrada.\n\n';
    }

    return csv;
}
// --- FIM NOVO ---