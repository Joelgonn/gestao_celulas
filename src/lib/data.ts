'use server';

import { createServerClient, createAdminClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

// ============================================================================
//                                INTERFACES EXPORTADAS
// ============================================================================

/**
 * Interface para a entidade Membro no banco de dados.
 */
export interface Membro {
  id: string;
  nome: string;
  telefone: string | null;
  endereco: string | null;
  data_nascimento: string | null;
  data_ingresso: string | null;
  created_at: string;
  celula_id: string | null;
  celula_nome?: string | null; // Adicionado para facilitar exibição
  status: 'Ativo' | 'Inativo' | 'Em transição';
}

/**
 * Interface para a entidade Visitante no banco de dados.
 */
export interface Visitante {
  id: string;
  nome: string;
  telefone: string | null;
  endereco: string | null;
  data_primeira_visita: string;
  data_ultimo_contato: string | null;
  observacoes: string | null;
  celula_id: string | null;
  celula_nome?: string | null; // Adicionado para facilitar exibição
}

/**
 * Interface para a entidade Reuniao no banco de dados.
 */
export interface Reuniao {
  id: string;
  data_reuniao: string;
  tema: string;
  ministrador_principal: string | null;
  ministrador_secundario: string | null;
  responsavel_kids: string | null;
  caminho_pdf: string | null;
  created_at: string;
  celula_id: string | null;
}

/**
 * Interface para os dados de formulário de uma Reunião.
 */
export interface ReuniaoFormData {
  data_reuniao: string;
  tema: string;
  ministrador_principal: string | null;
  ministrador_secundario: string | null;
  responsavel_kids: string | null;
  caminho_pdf: string | null;
}

/**
 * Interface para a entidade Palavra da Semana.
 */
export interface PalavraDaSemana {
  id: string;
  titulo: string;
  descricao: string | null;
  data_semana: string;
  url_arquivo: string;
  created_by_email?: string;
}

/**
 * Interface simplificada para opções de seleção de Células.
 */
export interface CelulaOption {
  id: string;
  nome: string;
}

/**
 * Interface simplificada para opções de seleção de Reuniões.
 */
export interface ReuniaoOption {
  id: string;
  data_reuniao: string;
  tema: string;
  ministrador_principal_nome: string | null;
}

/**
 * Interface para Reunião com nomes de relacionados expandidos.
 */
export interface ReuniaoComNomes {
  id: string;
  data_reuniao: string;
  tema: string;
  celula_id: string | null; // Mantém o ID para consistência e futuras queries
  celula_nome: string | null;
  ministrador_principal_nome: string | null;
  ministrador_secundario_nome?: string | null;
  responsavel_kids_nome?: string | null;
  num_criancas?: number;
  num_presentes_membros: number;
  num_presentes_visitantes: number;
  caminho_pdf: string | null; // Adicionado aqui para refletir o select
}

/**
 * Interface para Membro com status de presença.
 */
export interface MembroComPresenca extends Membro {
  presente: boolean;
}

/**
 * Interface para Visitante com status de presença.
 */
export interface VisitanteComPresenca extends Visitante {
  presente: boolean;
}

/**
 * Interface para detalhes completos de uma Reunião para resumo.
 */
export interface ReuniaoDetalhesParaResumo {
  reuniao: {
    id: string;
    data_reuniao: string;
    tema: string;
    celula_nome: string | null;
    ministrador_principal_nome: string | null;
    ministrador_secundario_nome: string | null;
    responsavel_kids_nome: string | null;
    num_criancas: number;
    caminho_pdf: string | null;
  };
  membros_presentes: { id: string; nome: string; telefone: string | null }[];
  membros_ausentes: { id: string; nome: string; telefone: string | null }[];
  visitantes_presentes: { id: string; nome: string; telefone: string | null }[];
}

/**
 * **CORREÇÃO APLICADA AQUI:**
 * Interface para o perfil do usuário, incluindo 'created_at'.
 */
export interface Profile {
  id: string;
  email: string;
  role: string | null;
  celula_id: string | null;
  celula_nome?: string;
  nome_completo?: string | null;
  telefone?: string | null;
  created_at: string; // <-- Propriedade 'created_at' adicionada!
}

// ============================================================================
//                          FUNÇÕES AUXILIARES
// ============================================================================

/**
 * Verifica a autorização do usuário logado e retorna o cliente Supabase apropriado.
 * @returns Um objeto com o cliente Supabase, ID da célula, status de autorização e papel do usuário.
 * @throws {Error} Se o usuário não for encontrado ou houver erro no perfil.
 */
async function checkUserAuthorization(): Promise<{
  supabase: any;
  celulaId: string | null;
  isAuthorized: boolean;
  role: 'admin' | 'líder' | null;
}> {
  const supabaseClient = createServerClient();
  const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

  if (userError || !user) {
    // Não lança erro aqui, pois algumas funções podem precisar disso para redirecionamento.
    return { supabase: supabaseClient, celulaId: null, isAuthorized: false, role: null };
  }

  const { data: profile, error: profileError } = await supabaseClient
    .from('profiles')
    .select('celula_id, role, nome_completo, telefone, created_at') // Incluído created_at
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    console.error("Erro ao buscar perfil do usuário para autorização:", profileError);
    // Para evitar que a aplicação quebre, retorna não autorizado se o perfil não for encontrado.
    return { supabase: supabaseClient, celulaId: null, isAuthorized: false, role: null };
  }

  const role = profile.role as 'admin' | 'líder';
  
  // Se for admin, usa o cliente admin para bypassar RLS
  if (role === 'admin') {
    const supabaseAdmin = createAdminClient();
    return { supabase: supabaseAdmin, celulaId: profile.celula_id, isAuthorized: true, role: 'admin' };
  }
  
  // Para líderes, usa o cliente normal, confiando nas RLS para segurança
  return { supabase: supabaseClient, celulaId: profile.celula_id, isAuthorized: true, role: role };
}

/**
 * Obtém um mapa de IDs de células para nomes de células.
 * @param celulaIds Um Set de IDs de células.
 * @param supabaseInstance A instância do Supabase a ser usada.
 * @returns Um Map onde a chave é o ID da célula e o valor é o nome da célula.
 */
async function getCelulasNamesMap(celulaIds: Set<string>, supabaseInstance: any): Promise<Map<string, string>> {
  const namesMap = new Map<string, string>();
  if (celulaIds.size === 0) return namesMap;
  
  const { data, error } = await supabaseInstance
    .from('celulas')
    .select('id, nome')
    .in('id', Array.from(celulaIds));
  
  if (error) { 
    console.error("Erro ao buscar nomes de células (getCelulasNamesMap):", error); 
  } else {
    data?.forEach((c: { id: string; nome: string }) => namesMap.set(c.id, c.nome));
  }
  return namesMap;
}

/**
 * Obtém um mapa de IDs de membros para nomes e telefones de membros.
 * Esta função foi refatorada para retornar também o telefone, conforme necessário no resumo.
 * @param memberIds Um Set de IDs de membros.
 * @param supabaseInstance A instância do Supabase a ser usada.
 * @returns Um Map onde a chave é o ID do membro e o valor é o nome do membro ou telefone.
 *          (Originalmente retornava apenas nome, adaptado para uso com telefone no resumo).
 */
async function getMemberDataMap(memberIds: Set<string>, supabaseInstance: any): Promise<Map<string, { nome: string; telefone: string | null }>> {
  const dataMap = new Map<string, { nome: string; telefone: string | null }>();
  if (memberIds.size === 0) return dataMap;
  
  const { data, error } = await supabaseInstance
    .from('membros')
    .select('id, nome, telefone')
    .in('id', Array.from(memberIds));
  
  if (error) {
    console.error("Erro ao buscar dados de membros (getMemberDataMap):", error);
  } else {
    data?.forEach((m: { id: string; nome: string; telefone: string | null }) => dataMap.set(m.id, { nome: m.nome, telefone: m.telefone }));
  }
  return dataMap;
}


// ============================================================================
//                                FUNÇÕES DE MEMBROS
// ============================================================================

/**
 * Lista os membros, com opções de filtro.
 * @param celulaIdFilter ID da célula para filtrar (apenas para admin).
 * @param searchTerm Termo de busca por nome ou telefone.
 * @param birthdayMonth Mês de aniversário para filtrar.
 * @param statusFilter Filtro por status do membro.
 * @returns Uma lista de membros.
 * @throws {Error} Se não autorizado ou falha na consulta.
 */
export async function listarMembros(
    celulaIdFilter: string | null = null,
    searchTerm: string | null = null,
    birthdayMonth: number | null = null,
    statusFilter: Membro['status'] | 'all' = 'all'
): Promise<Membro[]> {
  const { supabase, celulaId: userCelulaId, isAuthorized, role } = await checkUserAuthorization();
  if (!isAuthorized) throw new Error("Não autorizado.");
  
  let query = supabase
    .from('membros')
    .select('id, nome, telefone, endereco, data_nascimento, data_ingresso, created_at, celula_id, status');
  
  if (role === 'líder') {
    if (!userCelulaId) return [];
    query = query.eq('celula_id', userCelulaId);
  } else if (role === 'admin' && celulaIdFilter) {
    query = query.eq('celula_id', celulaIdFilter);
  }
  
  if (searchTerm) {
    query = query.or(`nome.ilike.%${searchTerm}%,telefone.ilike.%${searchTerm}%`);
  }

  if (birthdayMonth) {
    const { data: membroIds, error: rpcError } = await supabase.rpc('get_members_birthday_ids_in_month', {
      p_month: birthdayMonth,
      p_celula_id: role === 'líder' ? userCelulaId : celulaIdFilter
    });

    if (rpcError) {
      console.error("Erro ao buscar IDs de membros por mês de aniversário:", rpcError);
      throw new Error(`Falha ao filtrar por mês de aniversário: ${rpcError.message}`);
    }
    
    if (!membroIds || membroIds.length === 0) {
      return []; 
    }
    query = query.in('id', membroIds);
  }

  if (statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }

  const { data, error } = await query.order('nome');
  if (error) { 
    throw new Error(`Falha ao carregar membros: ${error.message}`); 
  }
  
  const membros = data || [];
  const celulaIds = new Set(membros.map((m: Membro) => m.celula_id).filter(Boolean) as string[]);
  const celulasNamesMap = await getCelulasNamesMap(celulaIds, supabase);
  
  return membros.map((m: Membro) => ({ 
    ...m, 
    celula_nome: celulasNamesMap.get(m.celula_id!) || null 
  }));
}

/**
 * Adiciona um novo membro.
 * @param membroData Os dados do membro a ser adicionado.
 * @throws {Error} Se não autorizado, célula não definida ou falha na inserção.
 */
export async function adicionarMembro(membroData: Omit<Membro, 'id' | 'created_at' | 'celula_id'>): Promise<void> {
  const { supabase, celulaId, isAuthorized } = await checkUserAuthorization();
  if (!isAuthorized || !celulaId) { 
    throw new Error("Não autorizado ou célula não definida."); 
  }
  
  const { error } = await supabase
    .from('membros')
    .insert({ ...membroData, celula_id: celulaId });
  
  if (error) { 
    throw error; 
  }
  revalidatePath('/membros');
}

/**
 * Atualiza um membro existente.
 * @param id O ID do membro a ser atualizado.
 * @param membroData Os dados parciais do membro para atualização.
 * @throws {Error} Se não autorizado ou falha na atualização.
 */
export async function atualizarMembro(id: string, membroData: Partial<Membro>): Promise<void> {
  const { supabase, isAuthorized } = await checkUserAuthorization();
  if (!isAuthorized) { 
    throw new Error("Não autorizado."); 
  }
  
  const { error } = await supabase
    .from('membros')
    .update(membroData)
    .eq('id', id);
  
  if (error) { 
    throw new Error(`Falha ao atualizar membro: ${error.message}`); 
  }
  revalidatePath('/membros');
  revalidatePath(`/membros/editar/${id}`);
}

/**
 * Obtém os detalhes de um membro pelo ID.
 * @param id O ID do membro.
 * @returns Os dados do membro ou null se não encontrado.
 * @throws {Error} Se não autorizado.
 */
export async function getMembro(id: string): Promise<Membro | null> {
  const { supabase, isAuthorized } = await checkUserAuthorization();
  if (!isAuthorized) { 
    throw new Error("Não autorizado."); 
  }
  
  const { data, error } = await supabase
    .from('membros')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) { 
    console.error("Erro ao buscar membro:", error); 
    return null; 
  }
  return data;
}

/**
 * Exclui um membro.
 * @param id O ID do membro a ser excluído.
 * @throws {Error} Se não autorizado ou falha na exclusão.
 */
export async function excluirMembro(id: string): Promise<void> {
  const { supabase, isAuthorized } = await checkUserAuthorization();
  if (!isAuthorized) { 
    throw new Error("Não autorizado."); 
  }
  
  const { error } = await supabase
    .from('membros')
    .delete()
    .eq('id', id);
  
  if (error) { 
    throw new Error(`Falha ao excluir membro: ${error.message}`); 
  }
  revalidatePath('/membros');
}

// ============================================================================
//                                FUNÇÕES DE VISITANTES
// ============================================================================

/**
 * Lista os visitantes, com opções de filtro.
 * @param celulaIdFilter ID da célula para filtrar (apenas para admin).
 * @param searchTerm Termo de busca por nome ou telefone.
 * @param minDaysSinceLastContact Número mínimo de dias desde o último contato.
 * @returns Uma lista de visitantes.
 * @throws {Error} Se não autorizado ou falha na consulta.
 */
export async function listarVisitantes(
    celulaIdFilter: string | null = null,
    searchTerm: string | null = null,
    minDaysSinceLastContact: number | null = null
): Promise<Visitante[]> {
  const { supabase, celulaId: userCelulaId, isAuthorized, role } = await checkUserAuthorization();
  if (!isAuthorized) {
    throw new Error("Não autorizado.");
  }
  
  let query = supabase
    .from('visitantes')
    .select('id, nome, telefone, endereco, data_primeira_visita, data_ultimo_contato, observacoes, celula_id');
  
  if (role === 'líder') {
    if (!userCelulaId) return [];
    query = query.eq('celula_id', userCelulaId);
  } else if (role === 'admin' && celulaIdFilter) {
    query = query.eq('celula_id', celulaIdFilter);
  }

  if (searchTerm) {
    query = query.or(`nome.ilike.%${searchTerm}%,telefone.ilike.%${searchTerm}%`);
  }

  if (minDaysSinceLastContact !== null) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - minDaysSinceLastContact);
    query = query.lte('data_ultimo_contato', cutoffDate.toISOString());
  }
  
  const { data, error } = await query.order('nome');
  if (error) { 
    throw new Error(`Falha ao carregar visitantes: ${error.message}`); 
  }
  
  const visitantes = data || [];
  const celulaIds = new Set(visitantes.map((v: Visitante) => v.celula_id).filter(Boolean) as string[]);
  const celulasNamesMap = await getCelulasNamesMap(celulaIds, supabase);
  
  return visitantes.map((v: Visitante) => ({ 
    ...v, 
    celula_nome: celulasNamesMap.get(v.celula_id!) || null 
  }));
}

/**
 * Adiciona um novo visitante.
 * @param visitanteData Os dados do visitante a ser adicionado.
 * @throws {Error} Se não autorizado, célula não definida ou falha na inserção.
 */
export async function adicionarVisitante(visitanteData: Omit<Visitante, 'id' | 'celula_id'>): Promise<void> {
  const { supabase, celulaId, isAuthorized } = await checkUserAuthorization();
  if (!isAuthorized || !celulaId) {
    throw new Error("Não autorizado ou célula não definida.");
  }
  
  const now = new Date().toISOString().split('T')[0];
  const visitanteCompleto = {
    ...visitanteData,
    celula_id: celulaId,
    data_primeira_visita: visitanteData.data_primeira_visita || now,
    data_ultimo_contato: visitanteData.data_ultimo_contato || now,
    observacoes: visitanteData.observacoes || null,
  };

  const { error } = await supabase
    .from('visitantes')
    .insert(visitanteCompleto);
  
  if (error) {
    throw new Error(`Falha ao adicionar visitante: ${error.message}`);
  }
  revalidatePath('/visitantes');
}

/**
 * Obtém os detalhes de um visitante pelo ID.
 * @param id O ID do visitante.
 * @returns Os dados do visitante ou null se não encontrado.
 * @throws {Error} Se não autorizado.
 */
export async function getVisitante(id: string): Promise<Visitante | null> {
  const { supabase, isAuthorized } = await checkUserAuthorization();
  if (!isAuthorized) { 
    throw new Error("Não autorizado."); 
  }
  
  const { data, error } = await supabase
    .from('visitantes')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) { 
    console.error("Erro ao buscar visitante:", error); 
    return null; 
  }
  return data;
}

/**
 * Atualiza um visitante existente.
 * @param visitanteData Os dados parciais do visitante para atualização.
 * @param id O ID do visitante a ser atualizado.
 * @throws {Error} Se não autorizado ou falha na atualização.
 */
export async function atualizarVisitante(visitanteData: Partial<Visitante>, id: string): Promise<void> {
  const { supabase, isAuthorized } = await checkUserAuthorization();
  if (!isAuthorized) { 
    throw new Error("Não autorizado."); 
  }
  
  const { error } = await supabase
    .from('visitantes')
    .update(visitanteData)
    .eq('id', id);
  
  if (error) { 
    throw new Error(`Falha ao atualizar visitante: ${error.message}`); 
  }
  revalidatePath('/visitantes');
  revalidatePath(`/visitantes/editar/${id}`);
}

/**
 * Exclui um visitante.
 * @param id O ID do visitante a ser excluído.
 * @throws {Error} Se não autorizado ou falha na exclusão.
 */
export async function excluirVisitante(id: string): Promise<void> {
  const { supabase, isAuthorized } = await checkUserAuthorization();
  if (!isAuthorized) { 
    throw new Error("Não autorizado."); 
  }
  
  const { error } = await supabase
    .from('visitantes')
    .delete()
    .eq('id', id);
  
  if (error) { 
    throw new Error(`Falha ao excluir visitante: ${error.message}`); 
  }
  revalidatePath('/visitantes');
}

/**
 * Converte um visitante em membro, excluindo o registro do visitante.
 * @param visitanteId ID do visitante a ser convertido.
 * @param membroData Dados do novo membro.
 * @returns Um objeto indicando sucesso e uma mensagem.
 */
export async function converterVisitanteEmMembro(
    visitanteId: string, 
    membroData: Omit<Membro, 'id' | 'created_at' | 'celula_id' | 'status'>
): Promise<{ success: boolean; message: string }> {
  const { supabase, celulaId, isAuthorized } = await checkUserAuthorization();
  if (!isAuthorized || !celulaId) {
    return { success: false, message: "Não autorizado ou célula não definida." };
  }

  try {
    const { error: membroError } = await supabase
        .from('membros')
        .insert({
            nome: membroData.nome,
            telefone: membroData.telefone,
            data_ingresso: membroData.data_ingresso,
            data_nascimento: membroData.data_nascimento,
            endereco: membroData.endereco,
            celula_id: celulaId,
            status: 'Ativo',
        });

    if (membroError) {
        if (membroError.code === '23505') {
            return { success: false, message: "Já existe um membro com este nome na sua célula." };
        }
        throw membroError;
    }

    const { error: visitanteError } = await supabase
        .from('visitantes')
        .delete()
        .eq('id', visitanteId)
        .eq('celula_id', celulaId);

    if (visitanteError) {
        console.error("Erro ao excluir visitante após criar membro. Verifique o banco manualmente:", visitanteError);
        return { success: false, message: `Membro criado, mas falha ao remover visitante original: ${visitanteError.message}. Por favor, remova o visitante manualmente.` };
    }
  
    revalidatePath('/visitantes');
    revalidatePath('/membros');
    return { success: true, message: "Visitante convertido em membro com sucesso!" };

  } catch (e: any) {
    console.error("Erro na conversão de visitante:", e);
    return { success: false, message: `Falha ao converter visitante: ${e.message}` };
  }
}

// ============================================================================
//                                FUNÇÕES DE REUNIÕES
// ============================================================================

/**
 * Adiciona uma nova reunião.
 * @param formData Os dados da reunião a ser adicionada.
 * @returns A reunião criada.
 * @throws {Error} Se não autorizado, célula não definida ou falha na inserção.
 */
export async function adicionarReuniao(formData: Omit<ReuniaoFormData, 'caminho_pdf'>): Promise<Reuniao> {
  const { supabase, celulaId, isAuthorized } = await checkUserAuthorization();
  if (!isAuthorized || !celulaId) {
    throw new Error("Não autorizado ou célula não definida.");
  }
  
  const { data, error } = await supabase
    .from('reunioes')
    .insert({ ...formData, celula_id: celulaId })
    .select()
    .single();
  
  if (error) {
    throw error;
  }
  revalidatePath('/reunioes');
  return data;
}

/**
 * Lista as reuniões com nomes de relacionados expandidos e contagem de presenças.
 * @param celulaIdFilter ID da célula para filtrar (apenas para admin).
 * @param searchTermTema Termo de busca por tema da reunião.
 * @param searchTermMinistrador Termo de busca por nome do ministrador.
 * @returns Uma lista de reuniões com nomes e contagens de presença.
 * @throws {Error} Se não autorizado ou falha na consulta.
 */
export async function listarReunioes(
    celulaIdFilter: string | null = null,
    searchTermTema: string | null = null,
    searchTermMinistrador: string | null = null
): Promise<ReuniaoComNomes[]> {
  const { supabase, celulaId: userCelulaId, isAuthorized, role } = await checkUserAuthorization();
  if (!isAuthorized) { 
    throw new Error("Não autorizado."); 
  }
  
  let query = supabase
    .from('reunioes')
    .select(`
        id, data_reuniao, tema, caminho_pdf, celula_id, 
        ministrador_principal:membros!ministrador_principal(nome), 
        ministrador_secundario:membros!ministrador_secundario(nome), 
        responsavel_kids:membros!responsavel_kids(nome)
    `);
  
  if (role === 'líder') {
    if (!userCelulaId) return [];
    query = query.eq('celula_id', userCelulaId);
  } else if (role === 'admin' && celulaIdFilter) {
    query = query.eq('celula_id', celulaIdFilter);
  }
  
  if (searchTermTema) {
    query = query.ilike('tema', `%${searchTermTema}%`);
  }

  // Refatorado o filtro de ministrador para usar a relação corretamente no Supabase
  if (searchTermMinistrador) {
    // Para filtros mais complexos em relações, é melhor criar uma RPC ou fazer o filtro client-side.
    // Para simplificar, estamos buscando membros cujos nomes correspondem e filtrando as reuniões depois
    // ou usando o operador 'or' com a notação de relação, que pode ter limitações com RLS.
    // Uma abordagem mais robusta para RLS seria ter uma função de banco de dados.
    query = query.or(`ministrador_principal.nome.ilike.%${searchTermMinistrador}%,ministrador_secundario.nome.ilike.%${searchTermMinistrador}%`);
  }

  const { data: reunioes, error } = await query.order('data_reuniao', { descending: true });
  if (error) { 
    throw new Error(`Falha ao carregar reuniões: ${error.message}`); 
  }
  
  if (!reunioes || reunioes.length === 0) return [];
  
  const celulaIds = new Set(reunioes.map((r: any) => r.celula_id).filter(Boolean));
  const [celulasMap] = await Promise.all([
    getCelulasNamesMap(celulaIds, supabase),
  ]);

  const presencasPromises = reunioes.map(async (reuniao) => {
    // Usando `count` com `head: true` para obter apenas a contagem e não os dados
    const [membrosCount, visitantesCount, criancasData] = await Promise.all([
      supabase
        .from('presencas_membros')
        .select('id', { count: 'exact', head: true })
        .eq('reuniao_id', reuniao.id)
        .eq('presente', true),
      supabase
        .from('presencas_visitantes')
        .select('id', { count: 'exact', head: true })
        .eq('reuniao_id', reuniao.id)
        .eq('presente', true),
      supabase
        .from('criancas_reuniao')
        .select('numero_criancas')
        .eq('reuniao_id', reuniao.id)
        .maybeSingle()
    ]);
    
    return {
      id: reuniao.id,
      data_reuniao: reuniao.data_reuniao,
      tema: reuniao.tema,
      caminho_pdf: reuniao.caminho_pdf,
      celula_id: reuniao.celula_id,
      celula_nome: celulasMap.get(reuniao.celula_id) || null,
      ministrador_principal_nome: reuniao.ministrador_principal?.nome || null,
      ministrador_secundario_nome: reuniao.ministrador_secundario?.nome || null,
      responsavel_kids_nome: reuniao.responsavel_kids?.nome || null,
      num_criancas: criancasData.data?.numero_criancas || 0,
      num_presentes_membros: membrosCount.count || 0,
      num_presentes_visitantes: visitantesCount.count || 0,
    };
  });
  
  return Promise.all(presencasPromises);
}

/**
 * Obtém os detalhes de uma reunião pelo ID.
 * @param id O ID da reunião.
 * @returns Os dados da reunião ou null se não encontrada.
 * @throws {Error} Se não autorizado.
 */
export async function getReuniao(id: string): Promise<Reuniao | null> {
  const { supabase, isAuthorized } = await checkUserAuthorization();
  if (!isAuthorized) {
    throw new Error("Não autorizado.");
  }
  
  const { data, error } = await supabase
    .from('reunioes')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error("Erro ao buscar reunião:", error);
    return null;
  }
  return data;
}

/**
 * Atualiza uma reunião existente.
 * @param id O ID da reunião a ser atualizada.
 * @param reuniaoData Os dados parciais da reunião para atualização.
 * @throws {Error} Se não autorizado ou falha na atualização.
 */
export async function atualizarReuniao(id: string, reuniaoData: Partial<ReuniaoFormData>): Promise<void> {
  const { supabase, isAuthorized } = await checkUserAuthorization();
  if (!isAuthorized) {
    throw new Error("Não autorizado.");
  }
  
  const { error } = await supabase
    .from('reunioes')
    .update(reuniaoData)
    .eq('id', id);

  if (error) {
    throw new Error(`Falha ao atualizar reunião: ${error.message}`);
  }
  revalidatePath('/reunioes');
  revalidatePath(`/reunioes/editar/${id}`);
  revalidatePath(`/reunioes/resumo/${id}`);
}

/**
 * Exclui uma reunião.
 * @param id O ID da reunião a ser excluída.
 * @throws {Error} Se não autorizado ou falha na exclusão.
 */
export async function excluirReuniao(id: string): Promise<void> {
  const { supabase, isAuthorized } = await checkUserAuthorization();
  if (!isAuthorized) { 
    throw new Error("Não autorizado."); 
  }
  
  const { error } = await supabase
    .from('reunioes')
    .delete()
    .eq('id', id);
  
  if (error) { 
    throw new Error(`Falha ao excluir reunião: ${error.message}`); 
  }
  revalidatePath('/reunioes');
}

/**
 * Duplica uma reunião existente.
 * @param reuniaoId ID da reunião a ser duplicada.
 * @returns O ID da nova reunião criada.
 * @throws {Error} Se não autorizado, célula não definida ou falha na duplicação.
 */
export async function duplicarReuniao(reuniaoId: string): Promise<string> {
  const { supabase, celulaId, isAuthorized } = await checkUserAuthorization();
  if (!isAuthorized || !celulaId) { 
    throw new Error("Não autorizado ou célula não definida."); 
  }
  
  const { data: reuniaoOriginal, error: fetchError } = await supabase
    .from('reunioes')
    .select('*')
    .eq('id', reuniaoId)
    .eq('celula_id', celulaId)
    .single();
  
  if (fetchError || !reuniaoOriginal) { 
    throw new Error("Reunião original não encontrada ou você não tem permissão para duplicá-la."); 
  }
  
  const { id, created_at, caminho_pdf, ...newReuniaoDataOriginal } = reuniaoOriginal;
  const newDate = new Date().toISOString().split('T')[0];

  const newReuniaoToInsert = {
      ...newReuniaoDataOriginal,
      tema: `${newReuniaoDataOriginal.tema} (Cópia - ${newDate})`,
      data_reuniao: newDate,
      caminho_pdf: null,
      celula_id: celulaId
  };

  const { data: newReuniao, error: insertError } = await supabase
    .from('reunioes')
    .insert(newReuniaoToInsert)
    .select('id')
    .single();
  
  if (insertError) { 
    throw new Error(`Falha ao duplicar reunião: ${insertError.message}`); 
  }

  const { data: criancasOriginal, error: criancasError } = await supabase
    .from('criancas_reuniao')
    .select('numero_criancas')
    .eq('reuniao_id', reuniaoId)
    .maybeSingle();

  if (!criancasError && criancasOriginal) {
      await supabase.from('criancas_reuniao').insert({
          reuniao_id: newReuniao.id,
          numero_criancas: criancasOriginal.numero_criancas
      });
  }

  revalidatePath('/reunioes');
  return newReuniao.id;
}

/**
 * Verifica a existência de uma reunião duplicada para uma dada data e tema.
 * @param dataReuniao A data da reunião.
 * @param tema O tema da reunião.
 * @param reuniaoId ID da reunião atual (para exclusão na verificação de edição).
 * @returns True se houver duplicidade, false caso contrário.
 * @throws {Error} Se não autorizado, célula não definida ou falha na consulta.
 */
export async function verificarDuplicidadeReuniao(dataReuniao: string, tema: string, reuniaoId?: string): Promise<boolean> {
  const { supabase, celulaId, isAuthorized } = await checkUserAuthorization();
  if (!isAuthorized || !celulaId) {
    throw new Error("Não autorizado ou célula não definida.");
  }

  let query = supabase
    .from('reunioes')
    .select('id')
    .eq('data_reuniao', dataReuniao)
    .ilike('tema', tema)
    .eq('celula_id', celulaId);

  if (reuniaoId) {
    query = query.neq('id', reuniaoId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Erro ao verificar duplicidade:", error);
    throw new Error(`Falha ao verificar duplicidade de reunião: ${error.message}`);
  }

  return (data?.length || 0) > 0;
}

/**
 * Realiza o upload de um arquivo de material de reunião (PDF, etc.).
 * @param reuniaoId ID da reunião à qual o material será anexado.
 * @param file O arquivo a ser carregado.
 * @returns A URL pública do arquivo.
 * @throws {Error} Se não autorizado, reunião não encontrada ou falha no upload/atualização.
 */
export async function uploadMaterialReuniao(reuniaoId: string, file: File): Promise<string> {
  const { supabase, isAuthorized, celulaId } = await checkUserAuthorization();
  if (!isAuthorized || !celulaId) {
    throw new Error("Não autorizado.");
  }

  const { data: reuniao, error: reuniaoError } = await supabase
    .from('reunioes')
    .select('id, celula_id')
    .eq('id', reuniaoId)
    .eq('celula_id', celulaId)
    .single();

  if (reuniaoError || !reuniao) {
    throw new Error("Reunião não encontrada ou você não tem permissão para anexar material a ela.");
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${reuniaoId}.${fileExt}`;
  const filePath = `reunioes/${reuniao.celula_id}/${fileName}`;

  const { error: uploadError } = await supabase
    .storage
    .from('materiais')
    .upload(filePath, file, { 
      upsert: true,
      contentType: file.type
    });

  if (uploadError) {
    throw new Error(`Erro no upload do material: ${uploadError.message}`);
  }

  const { data: { publicUrl } } = supabase
    .storage
    .from('materiais')
    .getPublicUrl(filePath);

  const { error: updateError } = await supabase
    .from('reunioes')
    .update({ caminho_pdf: publicUrl })
    .eq('id', reuniaoId);

  if (updateError) {
    throw new Error(`Erro ao atualizar reunião: ${updateError.message}`);
  }

  revalidatePath('/reunioes');
  revalidatePath(`/reunioes/editar/${reuniaoId}`);
  revalidatePath(`/reunioes/resumo/${reuniaoId}`);

  return publicUrl;
}

// ============================================================================
//                                FUNÇÕES DE PRESENÇA
// ============================================================================

/**
 * Lista todos os membros de uma célula com seu status de presença para uma reunião específica.
 * Ministradores e responsável Kids são automaticamente marcados como presentes.
 * @param reuniaoId ID da reunião.
 * @returns Uma lista de membros com status de presença.
 * @throws {Error} Se não autorizado, reunião não encontrada ou falha na consulta.
 */
export async function listarTodosMembrosComPresenca(reuniaoId: string): Promise<MembroComPresenca[]> {
  const { supabase, isAuthorized, celulaId } = await checkUserAuthorization();
  if (!isAuthorized || !celulaId) { 
    throw new Error("Não autorizado."); 
  }
  
  const { data: reuniao, error: reuniaoError } = await supabase
    .from('reunioes')
    .select('celula_id, ministrador_principal, ministrador_secundario, responsavel_kids')
    .eq('id', reuniaoId)
    .eq('celula_id', celulaId)
    .single();
  
  if (reuniaoError || !reuniao) { 
    throw new Error("Reunião não encontrada ou você não tem permissão para gerenciar a presença desta reunião."); 
  }
  
  const { data: membros, error: membrosError } = await supabase
    .from('membros')
    .select('*')
    .eq('celula_id', reuniao.celula_id)
    .order('nome');
  
  if (membrosError) { 
    throw new Error("Erro ao listar membros da célula."); 
  }
  
  const { data: presencas, error: presencasError } = await supabase
    .from('presencas_membros')
    .select('membro_id, presente')
    .eq('reuniao_id', reuniaoId);
  
  if (presencasError) { 
    throw new Error("Erro ao buscar presenças de membros."); 
  }
  
  const presencasMap = new Map(presencas.map(p => [p.membro_id, p.presente]));
  
  return (membros || []).map(membro => {
      let presente = presencasMap.get(membro.id) || false;
      if (membro.id === reuniao.ministrador_principal || 
          membro.id === reuniao.ministrador_secundario || 
          membro.id === reuniao.responsavel_kids) {
          presente = true;
      }
      return { 
          ...membro, 
          presente: presente 
      };
  });
}

/**
 * Lista todos os visitantes de uma célula com seu status de presença para uma reunião específica.
 * @param reuniaoId ID da reunião.
 * @returns Uma lista de visitantes com status de presença.
 * @throws {Error} Se não autorizado, reunião não encontrada ou falha na consulta.
 */
export async function listarTodosVisitantesComPresenca(reuniaoId: string): Promise<VisitanteComPresenca[]> {
  const { supabase, isAuthorized, celulaId } = await checkUserAuthorization();
  if (!isAuthorized || !celulaId) { 
    throw new Error("Não autorizado."); 
  }
  
  const { data: reuniao, error: reuniaoError } = await supabase
    .from('reunioes')
    .select('celula_id')
    .eq('id', reuniaoId)
    .eq('celula_id', celulaId)
    .single();
  
  if (reuniaoError || !reuniao) { 
    throw new Error("Reunião não encontrada ou você não tem permissão para gerenciar a presença desta reunião."); 
  }
  
  const { data: visitantes, error: visitantesError } = await supabase
    .from('visitantes')
    .select('*')
    .eq('celula_id', reuniao.celula_id)
    .order('nome');
  
  if (visitantesError) { 
    throw new Error("Erro ao listar visitantes da célula."); 
  }
  
  const { data: presencas, error: presencasError } = await supabase
    .from('presencas_visitantes')
    .select('visitante_id, presente')
    .eq('reuniao_id', reuniaoId);
  
  if (presencasError) { 
    throw new Error("Erro ao buscar presenças de visitantes."); 
  }
  
  const presencasMap = new Map(presencas.map(p => [p.visitante_id, p.presente]));
  return (visitantes || []).map(visitante => ({ 
    ...visitante, 
    presente: presencasMap.get(visitante.id) || false 
  }));
}

/**
 * Registra ou atualiza a presença de um membro em uma reunião.
 * @param reuniaoId ID da reunião.
 * @param membroId ID do membro.
 * @param presente Status de presença (true/false).
 * @throws {Error} Se não autorizado, reunião não encontrada ou falha no registro.
 */
export async function registrarPresencaMembro(reuniaoId: string, membroId: string, presente: boolean): Promise<void> {
  const { supabase, isAuthorized, celulaId } = await checkUserAuthorization();
  if (!isAuthorized || !celulaId) { 
    throw new Error("Não autorizado."); 
  }
  
  const { data: reuniaoCheck, error: reuniaoCheckError } = await supabase
    .from('reunioes')
    .select('id')
    .eq('id', reuniaoId)
    .eq('celula_id', celulaId)
    .single();

  if (reuniaoCheckError || !reuniaoCheck) {
      throw new Error("Reunião não encontrada ou você não tem permissão para gerenciar a presença.");
  }

  const { error } = await supabase
    .from('presencas_membros')
    .upsert(
      { reuniao_id: reuniaoId, membro_id: membroId, presente: presente }, 
      { onConflict: 'reuniao_id, membro_id' }
    );
  
  if (error) { 
    throw new Error(`Erro ao registrar presença de membro: ${error.message}`); 
  }
  revalidatePath(`/reunioes/presenca/${reuniaoId}`);
  revalidatePath(`/reunioes/resumo/${reuniaoId}`);
  revalidatePath('/dashboard');
}

/**
 * Registra ou atualiza a presença de um visitante em uma reunião.
 * @param reuniaoId ID da reunião.
 * @param visitanteId ID do visitante.
 * @param presente Status de presença (true/false).
 * @throws {Error} Se não autorizado, reunião não encontrada ou falha no registro.
 */
export async function registrarPresencaVisitante(reuniaoId: string, visitanteId: string, presente: boolean): Promise<void> {
  const { supabase, isAuthorized, celulaId } = await checkUserAuthorization();
  if (!isAuthorized || !celulaId) { 
    throw new Error("Não autorizado."); 
  }

  const { data: reuniaoCheck, error: reuniaoCheckError } = await supabase
    .from('reunioes')
    .select('id')
    .eq('id', reuniaoId)
    .eq('celula_id', celulaId)
    .single();

  if (reuniaoCheckError || !reuniaoCheck) {
      throw new Error("Reunião não encontrada ou você não tem permissão para gerenciar a presença.");
  }
  
  const { error } = await supabase
    .from('presencas_visitantes')
    .upsert(
      { reuniao_id: reuniaoId, visitante_id: visitanteId, presente: presente }, 
      { onConflict: 'reuniao_id, visitante_id' }
    );
  
  if (error) { 
    throw new Error(`Erro ao registrar presença de visitante: ${error.message}`); 
  }
  revalidatePath(`/reunioes/presenca/${reuniaoId}`);
  revalidatePath(`/reunioes/resumo/${reuniaoId}`);
  revalidatePath('/dashboard');
}

/**
 * Obtém o número de crianças registradas para uma reunião.
 * @param reuniaoId ID da reunião.
 * @returns O número de crianças ou 0 se não houver registro ou não autorizado.
 * @throws {Error} Se não autorizado.
 */
export async function getNumCriancasReuniao(reuniaoId: string): Promise<number> {
  const { supabase, isAuthorized, celulaId } = await checkUserAuthorization();
  if (!isAuthorized || !celulaId) { 
    return 0; // Se não autorizado, não deve ver número de crianças
  }
  
  const { data: reuniaoCheck, error: reuniaoCheckError } = await supabase
    .from('reunioes')
    .select('id')
    .eq('id', reuniaoId)
    .eq('celula_id', celulaId)
    .single();

  if (reuniaoCheckError || !reuniaoCheck) {
      return 0; 
  }

  const { data, error } = await supabase
    .from('criancas_reuniao')
    .select('numero_criancas')
    .eq('reuniao_id', reuniaoId)
    .single();
  
  if (error) { 
    console.error("Erro ao buscar número de crianças:", error);
    return 0; 
  }
  return data?.numero_criancas || 0;
}

/**
 * Define o número de crianças para uma reunião.
 * @param reuniaoId ID da reunião.
 * @param numCriancas O número de crianças.
 * @throws {Error} Se não autorizado, reunião não encontrada ou falha no registro.
 */
export async function setNumCriancasReuniao(reuniaoId: string, numCriancas: number): Promise<void> {
  const { supabase, isAuthorized, celulaId } = await checkUserAuthorization();
  if (!isAuthorized || !celulaId) { 
    throw new Error("Não autorizado."); 
  }

  const { data: reuniaoCheck, error: reuniaoCheckError } = await supabase
    .from('reunioes')
    .select('id')
    .eq('id', reuniaoId)
    .eq('celula_id', celulaId)
    .single();

  if (reuniaoCheckError || !reuniaoCheck) {
      throw new Error("Reunião não encontrada ou você não tem permissão para gerenciar a presença.");
  }
  
  const { error } = await supabase
    .from('criancas_reuniao')
    .upsert(
      { reuniao_id: reuniaoId, numero_criancas: numCriancas }, 
      { onConflict: 'reuniao_id' }
    );
  
  if (error) { 
    throw new Error(`Erro ao registrar número de crianças: ${error.message}`); 
  }
  revalidatePath(`/reunioes/presenca/${reuniaoId}`);
  revalidatePath(`/reunioes/resumo/${reuniaoId}`);
  revalidatePath('/dashboard');
}

/**
 * Obtém detalhes completos de uma reunião para fins de resumo, incluindo listas de presentes/ausentes.
 * @param reuniaoId ID da reunião.
 * @returns Os detalhes da reunião para resumo ou null se não autorizado/não encontrada.
 * @throws {Error} Se não autorizado ou falha na consulta RPC.
 */
export async function getReuniaoDetalhesParaResumo(reuniaoId: string): Promise<ReuniaoDetalhesParaResumo | null> {
  const { supabase, isAuthorized, celulaId } = await checkUserAuthorization();
  if (!isAuthorized || !celulaId) { 
    throw new Error("Não autorizado."); 
  }

  const { data: reuniaoCheck, error: reuniaoCheckError } = await supabase
    .from('reunioes')
    .select('id')
    .eq('id', reuniaoId)
    .eq('celula_id', celulaId)
    .single();

  if (reuniaoCheckError || !reuniaoCheck) {
      console.error("getReuniaoDetalhesParaResumo: Reunião não encontrada ou não pertence à célula do usuário.", reuniaoCheckError);
      return null;
  }
  
  const { data, error } = await supabase.rpc('get_reuniao_summary', { p_reuniao_id: reuniaoId });
  
  if (error || !data || data.length === 0) { 
    console.error("Erro ao buscar resumo da reunião:", error); 
    return null; 
  }

  const resumoRaw = data[0];
  
  const allMemberIds = new Set([
    ...resumoRaw.membros_presentes.map((m: any) => m.id),
    ...resumoRaw.membros_ausentes.map((m: any) => m.id)
  ]);
  const allVisitorIds = new Set(resumoRaw.visitantes_presentes.map((v: any) => v.id));

  // Usa getMemberDataMap para obter nome E telefone
  const [memberDataMap, visitorDataMap] = await Promise.all([
      getMemberDataMap(allMemberIds, supabase),
      getMemberDataMap(allVisitorIds, supabase) // Pode reutilizar para visitantes se a estrutura for similar
  ]);
  
  const membrosPresentesComTelefone = resumoRaw.membros_presentes.map((m: any) => ({
    id: m.id,
    nome: memberDataMap.get(m.id)?.nome || m.nome, // Fallback para nome original
    telefone: memberDataMap.get(m.id)?.telefone || null,
  }));

  const membrosAusentesComTelefone = resumoRaw.membros_ausentes.map((m: any) => ({
    id: m.id,
    nome: memberDataMap.get(m.id)?.nome || m.nome,
    telefone: memberDataMap.get(m.id)?.telefone || null,
  }));

  const visitantesPresentesComTelefone = resumoRaw.visitantes_presentes.map((v: any) => ({
    id: v.id,
    nome: visitorDataMap.get(v.id)?.nome || v.nome,
    telefone: visitorDataMap.get(v.id)?.telefone || null,
  }));

  return { 
    reuniao: {
      id: resumoRaw.reuniao_id,
      data_reuniao: resumoRaw.data_reuniao,
      tema: resumoRaw.tema,
      celula_nome: resumoRaw.celula_nome,
      ministrador_principal_nome: resumoRaw.ministrador_principal_nome,
      ministrador_secundario_nome: resumoRaw.ministrador_secundario_nome,
      responsavel_kids_nome: resumoRaw.responsavel_kids_nome,
      num_criancas: resumoRaw.num_criancas,
      caminho_pdf: resumoRaw.caminho_pdf,
    },
    membros_presentes: membrosPresentesComTelefone,
    membros_ausentes: membrosAusentesComTelefone,
    visitantes_presentes: visitantesPresentesComTelefone,
  };
}

// ============================================================================
//                                FUNÇÕES DE PERFIL
// ============================================================================

/**
 * Obtém os dados do perfil do usuário logado.
 * @returns Os dados do perfil ou null se não autorizado.
 * @throws {Error} Se não autorizado.
 */
export async function getUserProfile(): Promise<Profile | null> {
  const { supabase, isAuthorized, role, celulaId } = await checkUserAuthorization();
  const { data: { user } } = await supabase.auth.getUser(); // Reobtém o user para ter `email`

  if (!isAuthorized || !user) {
    // Se checkUserAuthorization já falhou, relança a não autorização.
    throw new Error("Não autorizado.");
  }
  
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('nome_completo, telefone, created_at') // Incluído created_at aqui também
    .eq('id', user.id)
    .single();

  if (profileError || !profileData) {
      console.error("Erro ao buscar detalhes adicionais do perfil:", profileError);
      // Retorna com campos opcionais nulos se der erro, mas mantém o `created_at` vazio.
      return { 
          id: user.id, 
          email: user.email!, 
          role, 
          celula_id: celulaId, 
          celula_nome: undefined, 
          nome_completo: null, 
          telefone: null,
          created_at: '' // Valor padrão para created_at se não puder ser obtido.
      };
  }

  let celulaNome = undefined; // Alterado para undefined para corresponder à interface
  if (celulaId) {
    const { data: celulaData, error: celulaError } = await supabase
      .from('celulas')
      .select('nome')
      .eq('id', celulaId)
      .single();
    
    if (!celulaError && celulaData) {
      celulaNome = celulaData.nome;
    }
  }
  
  return { 
    id: user.id, 
    email: user.email!, 
    role, 
    celula_id: celulaId, 
    celula_nome: celulaNome,
    nome_completo: profileData.nome_completo,
    telefone: profileData.telefone,
    created_at: profileData.created_at // Atribuindo o valor correto
  };
}

/**
 * Atualiza os dados do perfil de um usuário.
 * @param userId ID do usuário.
 * @param profileData Dados do perfil a serem atualizados.
 * @throws {Error} Se não autorizado ou falha na atualização.
 */
export async function updateUserProfileData(userId: string, profileData: Partial<Profile>): Promise<void> {
  const { supabase, isAuthorized } = await checkUserAuthorization();
  if (!isAuthorized) { 
    throw new Error("Não autorizado."); 
  }
  
  const { error } = await supabase
    .from('profiles')
    .update(profileData)
    .eq('id', userId);
  
  if (error) { 
    throw new Error(`Erro ao atualizar perfil: ${error.message}`); 
  }
  revalidatePath('/profile');
  revalidatePath('/dashboard');
}

/**
 * Atualiza a senha do usuário logado.
 * @param newPassword A nova senha.
 * @returns Um objeto indicando sucesso e uma mensagem.
 * @throws {Error} Se não autorizado.
 */
export async function updateUserPassword(newPassword: string): Promise<{ success: boolean; message: string }> {
  const { supabase, isAuthorized } = await checkUserAuthorization();
  if (!isAuthorized) { 
    return { success: false, message: "Não autorizado." };
  }
  
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) { 
    console.error("Erro ao atualizar senha:", error);
    return { success: false, message: `Erro ao atualizar senha: ${error.message}` };
  }
  return { success: true, message: "Senha atualizada com sucesso!" };
}

// ============================================================================
//                        FUNÇÕES ADMINISTRATIVAS
// ============================================================================

/**
 * Realiza o upload ou atualização da Palavra da Semana (apenas para admin).
 * @param formData FormData contendo título, descrição, data e opcionalmente o arquivo.
 * @returns Um objeto indicando sucesso e uma mensagem.
 * @throws {Error} Se acesso negado ou falha no upload/salvamento.
 */
export async function uploadPalavraDaSemana(formData: FormData): Promise<{ success: boolean; message: string }> {
  const { supabase, role } = await checkUserAuthorization();
  if (role !== 'admin') { 
    return { success: false, message: "Acesso negado. Apenas administradores podem fazer upload." };
  }
  
  const file = formData.get('file') as File | null;
  const titulo = formData.get('titulo') as string;
  const data_semana = formData.get('data_semana') as string;
  const descricao = formData.get('descricao') as string;
  
  if (!titulo || !data_semana) { 
    return { success: false, message: "Título e data da semana são obrigatórios." };
  }

  try {
    let publicUrl = '';
    
    if (file && file.size > 0) { // Verifica se um arquivo foi realmente enviado
      const fileExt = file.name.split('.').pop();
      const filePath = `palavra_semana/${data_semana}-${titulo.replace(/\s/g, '_')}.${fileExt}`;
      const { error: uploadError } = await supabase
        .storage
        .from('materiais')
        .upload(filePath, file, { 
          upsert: true,
          contentType: file.type
        });
      
      if (uploadError) { 
        return { success: false, message: `Erro no upload do arquivo: ${uploadError.message}` };
      }
      
      const { data: urlData } = supabase
        .storage
        .from('materiais')
        .getPublicUrl(filePath);
      
      publicUrl = urlData.publicUrl;
    }

    const { data: existingPalavra } = await supabase
      .from('palavra_semana')
      .select('id, url_arquivo') // Seleciona url_arquivo para usar em caso de update
      .eq('data_semana', data_semana)
      .maybeSingle(); // Usar maybeSingle se não tem certeza que existirá

    let dbError;
    
    if (existingPalavra) {
      // Se existe uma palavra, atualiza
      const updateData: {
        titulo: string;
        descricao: string;
        url_arquivo?: string;
      } = { 
        titulo, 
        descricao, 
      };
      if (publicUrl) { // Só atualiza URL se um novo arquivo foi carregado
        updateData.url_arquivo = publicUrl;
      } else if (existingPalavra.url_arquivo) {
        // Se nenhum novo arquivo foi carregado, mas já existia um, mantém o antigo
        updateData.url_arquivo = existingPalavra.url_arquivo;
      } else {
        // Se não tinha arquivo e nenhum novo foi carregado, mantém como null
        updateData.url_arquivo = null;
      }

      const { error } = await supabase
        .from('palavra_semana')
        .update(updateData)
        .eq('id', existingPalavra.id);
      
      dbError = error;
    } else {
      // Cria novo
      if (!file || file.size === 0) { // Arquivo obrigatório para nova palavra
        return { success: false, message: "Um arquivo é obrigatório para publicar uma nova Palavra da Semana." };
      }
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      const createdByEmail = userError ? null : user?.email || null;

      const { error } = await supabase
        .from('palavra_semana')
        .insert({ 
          titulo, 
          descricao, 
          data_semana, 
          url_arquivo: publicUrl,
          created_by_email: createdByEmail
        });
      
      dbError = error;
    }
    
    if (dbError) { 
      return { success: false, message: `Erro ao salvar no banco: ${dbError.message}` };
    }
    
    revalidatePath('/admin/palavra-semana');
    revalidatePath('/dashboard');
    return { 
      success: true, 
      message: existingPalavra 
        ? 'Palavra da Semana atualizada com sucesso!' 
        : 'Palavra da Semana publicada com sucesso!' 
    };
    
  } catch (error: any) {
    console.error("Erro inesperado em uploadPalavraDaSemana:", error);
    return { success: false, message: `Erro inesperado: ${error.message}` };
  }
}

/**
 * Exclui a Palavra da Semana (apenas para admin), incluindo o arquivo de storage associado.
 * @param id ID da Palavra da Semana a ser excluída.
 * @returns Um objeto indicando sucesso e uma mensagem.
 * @throws {Error} Se acesso negado ou falha na exclusão.
 */
export async function deletePalavraDaSemana(id: string): Promise<{ success: boolean; message: string }> {
  const { supabase, role } = await checkUserAuthorization();
  if (role !== 'admin') { 
    return { success: false, message: "Acesso negado." };
  }
  
  try {
    const { data: palavra, error: fetchError } = await supabase
      .from('palavra_semana')
      .select('url_arquivo')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      return { success: false, message: `Erro ao buscar palavra: ${fetchError.message}` };
    }
    
    if (palavra?.url_arquivo) {
      const pathSegments = palavra.url_arquivo.split('/materiais/');
      const filePath = pathSegments.length > 1 ? pathSegments[1] : null;

      if (filePath) {
        const { error: storageError } = await supabase
          .storage
          .from('materiais')
          .remove([filePath]);
        
        if (storageError) { 
          console.warn(`Aviso: não foi possível deletar o arquivo '${filePath}' do storage: ${storageError.message}`);
        }
      } else {
          console.warn(`Aviso: Não foi possível extrair o caminho do arquivo da URL: ${palavra.url_arquivo}`);
      }
    }
    
    const { error: dbError } = await supabase
      .from('palavra_semana')
      .delete()
      .eq('id', id);
    
    if (dbError) { 
      return { success: false, message: `Erro ao deletar: ${dbError.message}` };
    }
    
    revalidatePath('/admin/palavra-semana');
    revalidatePath('/dashboard');
    return { success: true, message: 'Palavra da Semana excluída com sucesso!' };
    
  } catch (error: any) {
    console.error("Erro inesperado em deletePalavraDaSemana:", error);
    return { success: false, message: `Erro inesperado: ${error.message}` };
  }
}

/**
 * Lista todas as células para administradores.
 * @returns Uma lista de opções de células.
 * @throws {Error} Se acesso negado ou falha na consulta.
 */
export async function listarCelulasParaAdmin(): Promise<CelulaOption[]> {
  const { supabase, role } = await checkUserAuthorization();
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

/**
 * Obtém a Palavra da Semana mais recente.
 * @returns A Palavra da Semana ou null se não encontrada ou não autorizado.
 */
export async function getPalavraDaSemana(): Promise<PalavraDaSemana | null> {
  const { supabase, isAuthorized } = await checkUserAuthorization();
  if (!isAuthorized) return null; // Se não autorizado, não retorna a palavra
  
  const { data, error } = await supabase
    .from('palavra_semana')
    .select('*')
    .order('data_semana', { ascending: false })
    .limit(1)
    .maybeSingle(); // Use maybeSingle para lidar com a ausência de dados sem erro

  if (error) {
    console.error("Erro ao buscar palavra da semana:", error);
    return null;
  }
  return data;
}

// ============================================================================
//                        FUNÇÕES DE IMPORT/EXPORT CSV
// ============================================================================

/**
 * Escapa um valor para ser usado em CSV, tratando aspas duplas e valores nulos.
 * @param value O valor a ser escapado.
 * @returns O valor formatado para CSV.
 */
function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const strValue = String(value).replace(/"/g, '""');
  return `"${strValue}"`;
}

/**
 * Importa membros a partir de um conteúdo CSV.
 * @param csvContent O conteúdo do arquivo CSV.
 * @returns Um objeto com a contagem de sucessos e uma lista de erros.
 * @throws {Error} Se não autorizado, célula não definida ou cabeçalhos ausentes.
 */
export async function importarMembrosCSV(csvContent: string): Promise<{ success: number; errors: { rowIndex: number; data: any; error: string }[] }> {
  const { supabase, celulaId, isAuthorized } = await checkUserAuthorization();
  if (!isAuthorized || !celulaId) { 
    throw new Error("Não autorizado ou célula não definida."); 
  }
  
  const lines = csvContent.split('\n').filter(line => line.trim() !== '');
  if (lines.length <= 1) { // Pelo menos uma linha de cabeçalho e uma de dados
      return { success: 0, errors: [], message: "Nenhum dado encontrado no CSV para importação." } as any;
  }

  const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
  const expectedHeaders = ['nome', 'telefone', 'data_ingresso', 'data_nascimento', 'endereco', 'status'];

  const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
  if (missingHeaders.length > 0) {
      throw new Error(`Cabeçalhos ausentes no CSV: ${missingHeaders.join(', ')}. Esperados: ${expectedHeaders.join(', ')}`);
  }

  let successCount = 0;
  let errors: { rowIndex: number; data: any; error: string }[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    if (row.trim() === '') continue; // Pula linhas vazias
    const values = row.split(',').map(v => v.trim().replace(/^"|"$/g, '').replace(/""/g, '"')); // Remove aspas duplas e desescapa
    const rowData: { [key: string]: string | null } = {};

    headers.forEach((header, index) => {
        rowData[header] = values[index] === undefined ? null : values[index];
    });

    try {
      if (!rowData.nome || !rowData.data_ingresso) {
        throw new Error("Nome e data_ingresso são obrigatórios.");
      }

      const validStatuses: Membro['status'][] = ['Ativo', 'Inativo', 'Em transição'];
      const status = (rowData.status && validStatuses.includes(rowData.status as Membro['status']) ? rowData.status : 'Ativo') as Membro['status'];
      
      const { error } = await supabase.from('membros').insert({
        nome: rowData.nome,
        telefone: rowData.telefone || null,
        data_ingresso: rowData.data_ingresso,
        data_nascimento: rowData.data_nascimento || null,
        endereco: rowData.endereco || null,
        status: status,
        celula_id: celulaId
      });
      
      if (error) {
        // Trata erro de duplicidade de forma mais específica, se desejar
        if (error.code === '23505') { // Código de erro para violação de unique constraint
          throw new Error("Membro com nome e/ou telefone já existente na célula.");
        }
        throw error;
      }
      successCount++;
    } catch (e: any) {
      errors.push({
          rowIndex: i + 1,
          data: rowData,
          error: e.message
      });
    }
  }
  
  revalidatePath('/membros');
  return { success: successCount, errors };
}

/**
 * Exporta membros para um formato CSV.
 * @param celulaIdFilter ID da célula para filtrar.
 * @param searchTerm Termo de busca por nome ou telefone.
 * @param birthdayMonth Mês de aniversário para filtrar.
 * @param statusFilter Status do membro para filtrar.
 * @returns Uma string no formato CSV.
 */
export async function exportarMembrosCSV(
    celulaIdFilter: string | null = null,
    searchTerm: string | null = null,
    birthdayMonth: number | null = null,
    statusFilter: Membro['status'] | 'all' = 'all'
): Promise<string> {
  const membros = await listarMembros(celulaIdFilter, searchTerm, birthdayMonth, statusFilter);
  
  const headers = "Nome,Telefone,Endereço,Data de Nascimento,Data de Ingresso,Status,Célula";
  const rows = membros.map(m => 
    `${escapeCsv(m.nome)},${escapeCsv(m.telefone)},${escapeCsv(m.endereco)},${escapeCsv(m.data_nascimento)},${escapeCsv(m.data_ingresso)},${escapeCsv(m.status)},${escapeCsv(m.celula_nome)}`
  );
  return [headers, ...rows].join('\n');
}