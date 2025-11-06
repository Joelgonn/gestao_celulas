'use server';

import { createServerClient, createAdminClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

// ============================================================================
//                                INTERFACES EXPORTADAS
// ============================================================================

export interface Membro {
  id: string;
  nome: string;
  telefone: string | null;
  endereco: string | null;
  data_nascimento: string | null;
  data_ingresso: string | null;
  created_at: string;
  celula_id: string | null;
  celula_nome?: string | null;
  status: 'Ativo' | 'Inativo' | 'Em transição'; // Adicionado status
}

export interface Visitante {
  id: string;
  nome: string;
  telefone: string | null;
  endereco: string | null;
  data_primeira_visita: string;
  data_ultimo_contato: string | null; // Adicionado
  observacoes: string | null; // Adicionado
  celula_id: string | null;
  celula_nome?: string | null;
}

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

export interface ReuniaoFormData {
  data_reuniao: string;
  tema: string;
  ministrador_principal: string | null;
  ministrador_secundario: string | null;
  responsavel_kids: string | null;
  caminho_pdf: string | null;
}

// Interface para a Palavra da Semana (NOVO)
export interface PalavraDaSemana {
  id: string;
  titulo: string;
  descricao: string | null;
  data_semana: string;
  url_arquivo: string;
  created_by_email?: string;
}

export interface CelulaOption {
  id: string;
  nome: string;
}

export interface ReuniaoOption {
  id: string;
  data_reuniao: string;
  tema: string;
  ministrador_principal_nome: string | null;
}

// ReuniaoComNomes já está definida em src/lib/types.ts, pode ser importada
// ou mantida aqui se for exclusiva desta Server Action.
// Para este exemplo, vou assumir que ela é usada aqui diretamente se não for importada.
export interface ReuniaoComNomes {
  id: string;
  data_reuniao: string;
  tema: string;
  celula_nome: string | null;
  ministrador_principal_nome: string | null;
  ministrador_secundario_nome?: string | null; // Adicionado
  responsavel_kids_nome?: string | null; // Adicionado
  num_criancas?: number; // Adicionado
  num_presentes_membros: number;
  num_presentes_visitantes: number;
}


export interface MembroComPresenca extends Membro {
  presente: boolean;
}

export interface VisitanteComPresenca extends Visitante {
  presente: boolean;
}

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
    caminho_pdf: string | null; // Adicionado caminho do PDF
  };
  membros_presentes: { id: string; nome: string; telefone: string | null }[];
  membros_ausentes: { id: string; nome: string; telefone: string | null }[];
  visitantes_presentes: { id: string; nome: string; telefone: string | null }[];
}


export interface Profile {
  id: string;
  email: string;
  role: string | null;
  celula_id: string | null;
  celula_nome?: string;
  nome_completo?: string | null; // Adicionado nome_completo
  telefone?: string | null; // Adicionado telefone
}

// ============================================================================
//                          FUNÇÕES AUXILIARES
// ============================================================================

async function checkUserAuthorization(): Promise<{
  supabase: any;
  celulaId: string | null;
  isAuthorized: boolean;
  role: 'admin' | 'líder' | null;
}> {
  const supabaseClient = createServerClient();
  const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

  if (userError || !user) {
    return { supabase: supabaseClient, celulaId: null, isAuthorized: false, role: null };
  }

  const { data: profile, error: profileError } = await supabaseClient
    .from('profiles')
    .select('celula_id, role, nome_completo, telefone') // Incluído nome_completo e telefone
    .eq('id', user.id)
    .single();
  
  if (profileError || !profile) {
    return { supabase: supabaseClient, celulaId: null, isAuthorized: false, role: null };
  }

  const role = profile.role as 'admin' | 'líder';
  if (role === 'admin') {
    const supabaseAdmin = createAdminClient();
    return { supabase: supabaseAdmin, celulaId: profile.celula_id, isAuthorized: true, role: 'admin' };
  }
  
  return { supabase: supabaseClient, celulaId: profile.celula_id, isAuthorized: true, role: role };
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
    data?.forEach((c: { id: string; nome: string }) => namesMap.set(c.id, c.nome));
  }
  return namesMap;
}

async function getMemberNamesMap(memberIds: Set<string>, supabaseInstance: any): Promise<Map<string, string>> {
  let namesMap = new Map<string, string>();
  if (memberIds.size === 0) return namesMap;
  
  const { data, error } = await supabaseInstance
    .from('membros')
    .select('id, nome')
    .in('id', Array.from(memberIds));
  
  if (error) {
    console.error("Erro ao buscar nomes de membros (getMemberNamesMap):", error);
  } else {
    data?.forEach((m: { id: string; nome: string }) => namesMap.set(m.id, m.nome));
  }
  return namesMap;
}

// ============================================================================
//                                FUNÇÕES DE MEMBROS
// ============================================================================

export async function listarMembros(
    celulaIdFilter: string | null = null,
    searchTerm: string | null = null, // Novo parâmetro
    birthdayMonth: number | null = null, // Novo parâmetro
    statusFilter: Membro['status'] | 'all' = 'all' // Novo parâmetro
): Promise<Membro[]> {
  const { supabase, celulaId: userCelulaId, isAuthorized, role } = await checkUserAuthorization();
  if (!isAuthorized) throw new Error("Não autorizado.");
  
  let query = supabase
    .from('membros')
    .select('id, nome, telefone, endereco, data_nascimento, data_ingresso, created_at, celula_id, status'); // Incluído 'status'
  
  if (role === 'líder') {
    if (!userCelulaId) return [];
    query = query.eq('celula_id', userCelulaId);
  } else if (role === 'admin' && celulaIdFilter) {
    query = query.eq('celula_id', celulaIdFilter);
  }
  
  if (searchTerm) {
    // Busca por nome ou telefone
    query = query.or(`nome.ilike.%${searchTerm}%,telefone.ilike.%${searchTerm}%`);
  }

  if (birthdayMonth) {
    // Filtro por mês de aniversário (RPC para desempenho em RLS)
    const { data: membroIds, error: rpcError } = await supabase.rpc('get_members_birthday_ids_in_month', {
      p_month: birthdayMonth,
      p_celula_id: role === 'líder' ? userCelulaId : celulaIdFilter // Passa o ID da célula se for líder ou admin com filtro
    });

    if (rpcError) {
      console.error("Erro ao buscar IDs de membros por mês de aniversário:", rpcError);
      // Decide se deve lançar erro ou apenas ignorar o filtro
      throw new Error(`Falha ao filtrar por mês de aniversário: ${rpcError.message}`);
    }
    
    // Se nenhum ID for retornado, ou o array for vazio, retornamos uma lista vazia.
    // Isso evita que a cláusula 'in' com array vazio cause erro ou retorne tudo.
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

export async function listarVisitantes(
    celulaIdFilter: string | null = null,
    searchTerm: string | null = null, // Novo parâmetro
    minDaysSinceLastContact: number | null = null // Novo parâmetro
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
    query = query.lte('data_ultimo_contato', cutoffDate.toISOString()); // Ultimo contato foi antes da data limite
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

export async function adicionarVisitante(visitanteData: Omit<Visitante, 'id' | 'celula_id'>): Promise<void> {
  const { supabase, celulaId, isAuthorized } = await checkUserAuthorization();
  if (!isAuthorized || !celulaId) {
    throw new Error("Não autorizado ou célula não definida.");
  }
  
  // Garantir que data_primeira_visita e data_ultimo_contato tenham valores válidos, se não fornecidos
  const now = new Date().toISOString().split('T')[0];
  const visitanteCompleto = {
    ...visitanteData,
    celula_id: celulaId,
    data_primeira_visita: visitanteData.data_primeira_visita || now,
    data_ultimo_contato: visitanteData.data_ultimo_contato || now, // Define como 'now' se nulo
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

export async function converterVisitanteEmMembro(
    visitanteId: string, 
    membroData: Omit<Membro, 'id' | 'created_at' | 'celula_id' | 'status'> // Dados para o novo membro
): Promise<{ success: boolean; message: string }> {
  const { supabase, celulaId, isAuthorized } = await checkUserAuthorization();
  if (!isAuthorized || !celulaId) {
    return { success: false, message: "Não autorizado ou célula não definida." };
  }

  try {
    // 1. Inserir o novo membro
    const { error: membroError } = await supabase
        .from('membros')
        .insert({
            nome: membroData.nome,
            telefone: membroData.telefone,
            data_ingresso: membroData.data_ingresso,
            data_nascimento: membroData.data_nascimento,
            endereco: membroData.endereco,
            celula_id: celulaId,
            status: 'Ativo', // Membros convertidos começam como 'Ativo'
        });

    if (membroError) {
        if (membroError.code === '23505') { // Código de erro para violação de unique constraint
            return { success: false, message: "Já existe um membro com este nome na sua célula." };
        }
        throw membroError;
    }

    // 2. Excluir o visitante
    const { error: visitanteError } = await supabase
        .from('visitantes')
        .delete()
        .eq('id', visitanteId)
        .eq('celula_id', celulaId); // Garante que apenas o visitante da própria célula é excluído

    if (visitanteError) {
        // Se a exclusão do visitante falhar, mas o membro foi criado, isso é um problema.
        // Seria ideal ter uma transação de banco de dados aqui. No Supabase, RPCs podem simular.
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

export async function listarReunioes(
    celulaIdFilter: string | null = null,
    searchTermTema: string | null = null, // Novo parâmetro
    searchTermMinistrador: string | null = null // Novo parâmetro
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

  if (searchTermMinistrador) {
    // Para buscar por ministrador, precisamos usar o filtro de texto no relacionamento
    // Isso é mais complexo em RLS, então para admin podemos usar o adminSupabase,
    // para líderes podemos tentar um RPC ou buscar todos os membros e filtrar.
    // Aqui, vamos simplificar para o propósito do filtro básico no lado do banco de dados,
    // e deixar um filtro mais avançado se necessário para uma RPC.
    // Para 'ilike' em relações é mais performático no client-side após o fetch,
    // mas vamos tentar uma query composta se possível.
    query = query.or(`ministrador_principal.nome.ilike.%${searchTermMinistrador}%,ministrador_secundario.nome.ilike.%${searchTermMinistrador}%`);
  }


  const { data: reunioes, error } = await query.order('data_reuniao', { descending: true });
  if (error) { 
    throw new Error(`Falha ao carregar reuniões: ${error.message}`); 
  }
  
  if (!reunioes || reunioes.length === 0) return [];
  
  const ministradorIds = new Set([
      ...reunioes.map((r: any) => r.ministrador_principal?.id).filter(Boolean),
      ...reunioes.map((r: any) => r.ministrador_secundario?.id).filter(Boolean),
      ...reunioes.map((r: any) => r.responsavel_kids?.id).filter(Boolean)
  ]);
  const celulaIds = new Set(reunioes.map((r: any) => r.celula_id).filter(Boolean));
  
  const [celulasMap] = await Promise.all([
    getCelulasNamesMap(celulaIds, supabase),
  ]);

  const presencasPromises = reunioes.map(async (reuniao) => {
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
  revalidatePath(`/reunioes/resumo/${id}`); // Revalida o resumo
}

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

export async function duplicarReuniao(reuniaoId: string): Promise<string> { // Retorna o ID da nova reunião
  const { supabase, celulaId, isAuthorized } = await checkUserAuthorization();
  if (!isAuthorized || !celulaId) { 
    throw new Error("Não autorizado ou célula não definida."); 
  }
  
  const { data: reuniaoOriginal, error: fetchError } = await supabase
    .from('reunioes')
    .select('*')
    .eq('id', reuniaoId)
    .eq('celula_id', celulaId) // Garante que a célula original pertence ao usuário
    .single();
  
  if (fetchError || !reuniaoOriginal) { 
    throw new Error("Reunião original não encontrada ou você não tem permissão para duplicá-la."); 
  }
  
  // Prepara os dados para a nova reunião, ajustando o tema e a data para hoje
  const { id, created_at, caminho_pdf, ...newReuniaoDataOriginal } = reuniaoOriginal;
  const newDate = new Date().toISOString().split('T')[0];

  const newReuniaoToInsert = {
      ...newReuniaoDataOriginal,
      tema: `${newReuniaoDataOriginal.tema} (Cópia - ${newDate})`,
      data_reuniao: newDate, // Nova reunião com data de hoje
      caminho_pdf: null, // Cópia não deve ter o mesmo PDF, pois é um novo evento
      celula_id: celulaId // Garante que a nova reunião pertence à célula do usuário
  };

  const { data: newReuniao, error: insertError } = await supabase
    .from('reunioes')
    .insert(newReuniaoToInsert)
    .select('id')
    .single();
  
  if (insertError) { 
    throw new Error(`Falha ao duplicar reunião: ${insertError.message}`); 
  }

  // Duplicar contagem de crianças (opcional, mas comum para duplicação)
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
  return newReuniao.id; // Retorna o ID da nova reunião
}

export async function verificarDuplicidadeReuniao(dataReuniao: string, tema: string, reuniaoId?: string): Promise<boolean> {
  const { supabase, celulaId, isAuthorized } = await checkUserAuthorization();
  if (!isAuthorized || !celulaId) {
    throw new Error("Não autorizado ou célula não definida.");
  }

  let query = supabase
    .from('reunioes')
    .select('id')
    .eq('data_reuniao', dataReuniao)
    .ilike('tema', tema) // Compara temas de forma case-insensitive
    .eq('celula_id', celulaId);

  if (reuniaoId) {
    query = query.neq('id', reuniaoId); // Exclui a própria reunião em edição
  }

  const { data, error } = await query;

  if (error) {
    console.error("Erro ao verificar duplicidade:", error);
    // Em caso de erro, é mais seguro assumir que não é duplicado para não bloquear a criação/edição
    // ou lançar o erro se for um problema crítico do banco.
    throw new Error(`Falha ao verificar duplicidade de reunião: ${error.message}`);
  }

  return (data?.length || 0) > 0;
}

export async function uploadMaterialReuniao(reuniaoId: string, file: File): Promise<string> {
  const { supabase, isAuthorized, celulaId } = await checkUserAuthorization();
  if (!isAuthorized || !celulaId) {
    throw new Error("Não autorizado.");
  }

  // Verificar se a reunião existe e pertence à célula do usuário
  const { data: reuniao, error: reuniaoError } = await supabase
    .from('reunioes')
    .select('id, celula_id')
    .eq('id', reuniaoId)
    .eq('celula_id', celulaId) // Garante que a reunião pertence à célula do usuário
    .single();

  if (reuniaoError || !reuniao) {
    throw new Error("Reunião não encontrada ou você não tem permissão para anexar material a ela.");
  }

  // Fazer upload do arquivo
  const fileExt = file.name.split('.').pop();
  const fileName = `${reuniaoId}.${fileExt}`; // Nome do arquivo será o ID da reunião para unicidade
  const filePath = `reunioes/${reuniao.celula_id}/${fileName}`; // Organiza por célula

  const { error: uploadError } = await supabase
    .storage
    .from('materiais') // Seu bucket de storage
    .upload(filePath, file, { 
      upsert: true, // Se já existir um arquivo com o mesmo nome, ele será substituído
      contentType: file.type
    });

  if (uploadError) {
    throw new Error(`Erro no upload do material: ${uploadError.message}`);
  }

  // Obter URL pública
  const { data: { publicUrl } } = supabase
    .storage
    .from('materiais')
    .getPublicUrl(filePath);

  // Atualizar reunião com o caminho do PDF
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

export async function listarTodosMembrosComPresenca(reuniaoId: string): Promise<MembroComPresenca[]> {
  const { supabase, isAuthorized, celulaId } = await checkUserAuthorization();
  if (!isAuthorized || !celulaId) { 
    throw new Error("Não autorizado."); 
  }
  
  // Verifica se a reunião existe e pertence à célula do usuário logado
  const { data: reuniao, error: reuniaoError } = await supabase
    .from('reunioes')
    .select('celula_id, ministrador_principal, ministrador_secundario, responsavel_kids')
    .eq('id', reuniaoId)
    .eq('celula_id', celulaId)
    .single();
  
  if (reuniaoError || !reuniao) { 
    throw new Error("Reunião não encontrada ou você não tem permissão para gerenciar a presença desta reunião."); 
  }
  
  // Busca todos os membros da célula da reunião
  const { data: membros, error: membrosError } = await supabase
    .from('membros')
    .select('*')
    .eq('celula_id', reuniao.celula_id)
    .order('nome');
  
  if (membrosError) { 
    throw new Error("Erro ao listar membros da célula."); 
  }
  
  // Busca as presenças já registradas para esta reunião
  const { data: presencas, error: presencasError } = await supabase
    .from('presencas_membros')
    .select('membro_id, presente')
    .eq('reuniao_id', reuniaoId);
  
  if (presencasError) { 
    throw new Error("Erro ao buscar presenças de membros."); 
  }
  
  const presencasMap = new Map(presencas.map(p => [p.membro_id, p.presente]));
  
  // Combina dados dos membros com o status de presença
  return (membros || []).map(membro => {
      // Força a presença para ministradores e responsável Kids, se existirem
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

export async function listarTodosVisitantesComPresenca(reuniaoId: string): Promise<VisitanteComPresenca[]> {
  const { supabase, isAuthorized, celulaId } = await checkUserAuthorization();
  if (!isAuthorized || !celulaId) { 
    throw new Error("Não autorizado."); 
  }
  
  // Verifica se a reunião existe e pertence à célula do usuário logado
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

export async function registrarPresencaMembro(reuniaoId: string, membroId: string, presente: boolean): Promise<void> {
  const { supabase, isAuthorized, celulaId } = await checkUserAuthorization();
  if (!isAuthorized || !celulaId) { 
    throw new Error("Não autorizado."); 
  }
  
  // Verifica se a reunião pertence à célula do usuário logado
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

export async function registrarPresencaVisitante(reuniaoId: string, visitanteId: string, presente: boolean): Promise<void> {
  const { supabase, isAuthorized, celulaId } = await checkUserAuthorization();
  if (!isAuthorized || !celulaId) { 
    throw new Error("Não autorizado."); 
  }

  // Verifica se a reunião pertence à célula do usuário logado
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

export async function getNumCriancasReuniao(reuniaoId: string): Promise<number> {
  const { supabase, isAuthorized, celulaId } = await checkUserAuthorization();
  if (!isAuthorized || !celulaId) { 
    throw new Error("Não autorizado."); 
  }
  
  // Verifica se a reunião pertence à célula do usuário logado
  const { data: reuniaoCheck, error: reuniaoCheckError } = await supabase
    .from('reunioes')
    .select('id')
    .eq('id', reuniaoId)
    .eq('celula_id', celulaId)
    .single();

  if (reuniaoCheckError || !reuniaoCheck) {
      // Se a reunião não for encontrada ou não pertencer ao usuário, retorna 0 crianças
      return 0; 
  }

  const { data, error } = await supabase
    .from('criancas_reuniao')
    .select('numero_criancas')
    .eq('reuniao_id', reuniaoId)
    .single();
  
  if (error) { 
    return 0; 
  }
  return data?.numero_criancas || 0;
}

export async function setNumCriancasReuniao(reuniaoId: string, numCriancas: number): Promise<void> {
  const { supabase, isAuthorized, celulaId } = await checkUserAuthorization();
  if (!isAuthorized || !celulaId) { 
    throw new Error("Não autorizado."); 
  }

  // Verifica se a reunião pertence à célula do usuário logado
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

export async function getReuniaoDetalhesParaResumo(reuniaoId: string): Promise<ReuniaoDetalhesParaResumo | null> {
  const { supabase, isAuthorized, celulaId } = await checkUserAuthorization();
  if (!isAuthorized || !celulaId) { 
    throw new Error("Não autorizado."); 
  }

  // Verifica se a reunião pertence à célula do usuário logado
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
  
  // Chama a RPC para obter o resumo (otimizado no banco)
  const { data, error } = await supabase.rpc('get_reuniao_summary', { p_reuniao_id: reuniaoId });
  
  if (error || !data) { 
    console.error("Erro ao buscar resumo da reunião:", error); 
    return null; 
  }

  // A RPC retorna um array de um objeto. Precisa pegar o primeiro item.
  // Também precisa mapear o formato da RPC para a interface ReuniaoDetalhesParaResumo.
  const resumoRaw = data[0]; // Assumindo que a RPC retorna um array com um único objeto
  if (!resumoRaw) return null;

  // Processa membros e visitantes para adicionar telefones
  const allMemberIds = new Set([...resumoRaw.membros_presentes.map((m: any) => m.id), ...resumoRaw.membros_ausentes.map((m: any) => m.id)]);
  const allVisitorIds = new Set(resumoRaw.visitantes_presentes.map((v: any) => v.id));

  const [memberPhonesMap, visitorPhonesMap] = await Promise.all([
      getMemberNamesMap(allMemberIds, supabase), // Reutiliza getMemberNamesMap (que retorna nome e telefone)
      getMemberNamesMap(allVisitorIds, supabase) // Reutiliza para visitantes, pois retorna a mesma estrutura
  ]);
  
  const membrosPresentesComTelefone = resumoRaw.membros_presentes.map((m: any) => ({
    id: m.id,
    nome: m.nome,
    telefone: memberPhonesMap.get(m.id) || null, // Atualiza com o telefone
  }));

  const membrosAusentesComTelefone = resumoRaw.membros_ausentes.map((m: any) => ({
    id: m.id,
    nome: m.nome,
    telefone: memberPhonesMap.get(m.id) || null,
  }));

  const visitantesPresentesComTelefone = resumoRaw.visitantes_presentes.map((v: any) => ({
    id: v.id,
    nome: v.nome,
    telefone: visitorPhonesMap.get(v.id) || null,
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

export async function getUserProfile(): Promise<Profile | null> {
  const { supabase, isAuthorized, role, celulaId } = await checkUserAuthorization();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!isAuthorized || !user) {
    throw new Error("Não autorizado.");
  }
  
  // Busca o perfil completo do usuário para ter nome_completo e telefone
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('nome_completo, telefone')
    .eq('id', user.id)
    .single();

  if (profileError || !profileData) {
      console.error("Erro ao buscar detalhes adicionais do perfil:", profileError);
      // Retorna com campos opcionais nulos se der erro
      return { 
          id: user.id, 
          email: user.email!, 
          role, 
          celula_id: celulaId, 
          celula_nome: undefined, 
          nome_completo: null, 
          telefone: null 
      };
  }

  let celulaNome = null;
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
    celula_nome: celulaNome || undefined,
    nome_completo: profileData.nome_completo,
    telefone: profileData.telefone
  };
}

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
  revalidatePath('/dashboard'); // Para atualizar o nome no dashboard
}

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

export async function uploadPalavraDaSemana(formData: FormData): Promise<{ success: boolean; message: string }> {
  const { supabase, role } = await checkUserAuthorization();
  if (role !== 'admin') { 
    return { success: false, message: "Acesso negado. Apenas administradores podem fazer upload." };
  }
  
  const file = formData.get('file') as File | null; // Pode ser nulo se for só atualização de texto
  const titulo = formData.get('titulo') as string;
  const data_semana = formData.get('data_semana') as string;
  const descricao = formData.get('descricao') as string;
  
  if (!titulo || !data_semana) { 
    return { success: false, message: "Título e data da semana são obrigatórios." };
  }

  try {
    let publicUrl = '';
    
    // Se há um arquivo, faz o upload
    if (file) {
      const fileExt = file.name.split('.').pop();
      const filePath = `palavra_semana/${data_semana}-${titulo.replace(/\s/g, '_')}.${fileExt}`; // Nome único
      const { error: uploadError } = await supabase
        .storage
        .from('materiais') // Seu bucket de storage
        .upload(filePath, file, { 
          upsert: true, // Se já existir um arquivo com o mesmo nome, ele será substituído
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

    // Verifica se já existe uma palavra da semana para esta data
    const { data: existingPalavra } = await supabase
      .from('palavra_semana')
      .select('id')
      .eq('data_semana', data_semana)
      .single();

    let dbError;
    
    if (existingPalavra) {
      // Atualiza existente
      const { error } = await supabase
        .from('palavra_semana')
        .update({ 
          titulo, 
          descricao, 
          ...(file && { url_arquivo: publicUrl }) // Só atualiza URL se houver novo arquivo
        })
        .eq('id', existingPalavra.id);
      
      dbError = error;
    } else {
      // Cria novo - arquivo é obrigatório para nova Palavra da Semana
      if (!file) {
        return { success: false, message: "Um arquivo é obrigatório para publicar uma nova Palavra da Semana." };
      }
      
      // Obtém o email do usuário logado para created_by_email
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
    revalidatePath('/dashboard'); // Para atualizar o card no dashboard
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

export async function deletePalavraDaSemana(id: string): Promise<{ success: boolean; message: string }> {
  const { supabase, role } = await checkUserAuthorization();
  if (role !== 'admin') { 
    return { success: false, message: "Acesso negado." };
  }
  
  try {
    // Primeiro busca a palavra para obter a URL do arquivo
    const { data: palavra, error: fetchError } = await supabase
      .from('palavra_semana')
      .select('url_arquivo')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      return { success: false, message: `Erro ao buscar palavra: ${fetchError.message}` };
    }
    
    // Tenta deletar o arquivo do storage se existir
    if (palavra?.url_arquivo) {
      // Extrai o caminho do arquivo do URL público
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
    
    // Deleta do banco de dados
    const { error: dbError } = await supabase
      .from('palavra_semana')
      .delete()
      .eq('id', id);
    
    if (dbError) { 
      return { success: false, message: `Erro ao deletar: ${dbError.message}` };
    }
    
    revalidatePath('/admin/palavra-semana');
    revalidatePath('/dashboard'); // Para atualizar o card no dashboard
    return { success: true, message: 'Palavra da Semana excluída com sucesso!' };
    
  } catch (error: any) {
    console.error("Erro inesperado em deletePalavraDaSemana:", error);
    return { success: false, message: `Erro inesperado: ${error.message}` };
  }
}

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

export async function getPalavraDaSemana(): Promise<PalavraDaSemana | null> {
  const { supabase, isAuthorized } = await checkUserAuthorization();
  // Se não estiver autorizado, não deve ver a palavra da semana (embora para líderes possa ser público)
  // Mas a regra atual do `checkUserAuthorization` já cuida disso.
  if (!isAuthorized) return null;
  
  const { data, error } = await supabase
    .from('palavra_semana')
    .select('*')
    .order('data_semana', { ascending: false }) // Pega a mais recente
    .limit(1)
    .single();

  if (error) {
    // console.error("Erro ao buscar palavra da semana:", error); // Pode ser que não haja nenhuma, não é um erro crítico
    return null;
  }
  return data;
}

// ============================================================================
//                        FUNÇÕES DE IMPORT/EXPORT CSV
// ============================================================================

function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const strValue = String(value).replace(/"/g, '""'); // Escapa aspas duplas
  return `"${strValue}"`; // Envolve em aspas duplas
}

export async function importarMembrosCSV(csvContent: string): Promise<{ success: number; errors: { rowIndex: number; data: any; error: string }[] }> {
  const { supabase, celulaId, isAuthorized } = await checkUserAuthorization();
  if (!isAuthorized || !celulaId) { 
    throw new Error("Não autorizado ou célula não definida."); 
  }
  
  const lines = csvContent.split('\n').filter(line => line.trim() !== '');
  if (lines.length === 0) {
      return { success: 0, errors: [], message: "Nenhum dado encontrado no CSV." } as any; // Ajuste para o tipo correto
  }

  const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
  const expectedHeaders = ['nome', 'telefone', 'data_ingresso', 'data_nascimento', 'endereco', 'status'];

  // Verifica se todos os cabeçalhos esperados estão presentes
  const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
  if (missingHeaders.length > 0) {
      throw new Error(`Cabeçalhos ausentes no CSV: ${missingHeaders.join(', ')}. Esperados: ${expectedHeaders.join(', ')}`);
  }

  let successCount = 0;
  let errors: { rowIndex: number; data: any; error: string }[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    const values = row.split(',').map(v => v.trim());
    const rowData: { [key: string]: string | null } = {};

    // Mapeia os valores para os cabeçalhos
    headers.forEach((header, index) => {
        rowData[header] = values[index] || null;
    });

    try {
      if (!rowData.nome || !rowData.data_ingresso) {
        throw new Error("Nome e data_ingresso são obrigatórios.");
      }

      // Validação do status
      const validStatuses: Membro['status'][] = ['Ativo', 'Inativo', 'Em transição'];
      const status = (rowData.status || 'Ativo') as Membro['status'];
      if (!validStatuses.includes(status)) {
          throw new Error(`Status inválido: ${rowData.status}. Deve ser 'Ativo', 'Inativo' ou 'Em transição'.`);
      }

      const { error } = await supabase.from('membros').insert({
        nome: rowData.nome,
        telefone: rowData.telefone,
        data_ingresso: rowData.data_ingresso,
        data_nascimento: rowData.data_nascimento,
        endereco: rowData.endereco,
        status: status,
        celula_id: celulaId
      });
      
      if (error) throw error;
      successCount++;
    } catch (e: any) {
      errors.push({
          rowIndex: i + 1, // +1 para corresponder ao número da linha no CSV
          data: rowData,
          error: e.message
      });
    }
  }
  
  revalidatePath('/membros');
  return { success: successCount, errors };
}

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