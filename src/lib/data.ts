// src/lib/data.ts
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
}

export interface Visitante {
  id: string;
  nome: string;
  telefone: string | null;
  endereco: string | null;
  data_primeira_visita: string;
  data_ultimo_contato: string | null;
  observacoes: string | null;
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

export interface PalavraDaSemana {
  id: string;
  titulo: string;
  descricao: string | null;
  data_semana: string;
  url_arquivo: string;
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

export interface ReuniaoComNomes {
  id: string;
  data_reuniao: string;
  tema: string;
  celula_nome: string | null;
  ministrador_principal_nome: string | null;
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
  };
  presentes: {
    membros: { id: string; nome: string }[];
    visitantes: { id: string; nome: string }[];
  };
  ausentes: {
    membros: { id: string; nome: string }[];
  };
}

export interface Profile {
  id: string;
  email: string;
  role: string | null;
  celula_id: string | null;
  celula_nome?: string;
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
    .select('celula_id, role')
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

export async function listarMembros(celulaIdFilter: string | null = null): Promise<Membro[]> {
  const { supabase, celulaId: userCelulaId, isAuthorized, role } = await checkUserAuthorization();
  if (!isAuthorized) throw new Error("Não autorizado.");
  
  let query = supabase
    .from('membros')
    .select('id, nome, telefone, endereco, data_nascimento, data_ingresso, created_at, celula_id');
  
  if (role === 'líder') {
    if (!userCelulaId) return [];
    query = query.eq('celula_id', userCelulaId);
  } else if (role === 'admin' && celulaIdFilter) {
    query = query.eq('celula_id', celulaIdFilter);
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

export async function listarVisitantes(celulaIdFilter: string | null = null): Promise<Visitante[]> {
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

export async function adicionarVisitante(visitanteData: Omit<Visitante, 'id' | 'data_primeira_visita' | 'data_ultimo_contato'>): Promise<void> {
  const { supabase, celulaId, isAuthorized } = await checkUserAuthorization();
  if (!isAuthorized || !celulaId) {
    throw new Error("Não autorizado ou célula não definida.");
  }
  
  const visitanteCompleto = {
    ...visitanteData,
    celula_id: celulaId,
    data_primeira_visita: new Date().toISOString().split('T')[0],
    data_ultimo_contato: new Date().toISOString().split('T')[0]
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

export async function atualizarVisitante(id: string, visitanteData: Partial<Visitante>): Promise<void> {
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

export async function converterVisitanteEmMembro(visitanteId: string, data_ingresso: string): Promise<void> {
  const { supabase, isAuthorized } = await checkUserAuthorization();
  if (!isAuthorized) {
    throw new Error("Não autorizado.");
  }
  
  const { error } = await supabase.rpc('converter_visitante_para_membro', {
    p_visitante_id: visitanteId,
    p_data_ingresso: data_ingresso,
  });
  
  if (error) {
    throw new Error(`Falha ao converter visitante: ${error.message}`);
  }
  revalidatePath('/visitantes');
  revalidatePath('/membros');
}

// ============================================================================
//                                FUNÇÕES DE REUNIÕES
// ============================================================================

export async function adicionarReuniao(formData: ReuniaoFormData): Promise<Reuniao> {
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

export async function listarReunioes(celulaIdFilter: string | null = null): Promise<ReuniaoComNomes[]> {
  const { supabase, celulaId: userCelulaId, isAuthorized, role } = await checkUserAuthorization();
  if (!isAuthorized) { 
    throw new Error("Não autorizado."); 
  }
  
  let query = supabase
    .from('reunioes')
    .select('id, data_reuniao, tema, celula_id, ministrador_principal');
  
  if (role === 'líder') {
    if (!userCelulaId) return [];
    query = query.eq('celula_id', userCelulaId);
  } else if (role === 'admin' && celulaIdFilter) {
    query = query.eq('celula_id', celulaIdFilter);
  }
  
  const { data: reunioes, error } = await query.order('data_reuniao', { descending: true });
  if (error) { 
    throw new Error(`Falha ao carregar reuniões: ${error.message}`); 
  }
  
  if (!reunioes || reunioes.length === 0) return [];
  
  const ministradorIds = new Set(reunioes.map((r: any) => r.ministrador_principal).filter(Boolean));
  const celulaIds = new Set(reunioes.map((r: any) => r.celula_id).filter(Boolean));
  
  const [ministradoresMap, celulasMap] = await Promise.all([
    getMemberNamesMap(ministradorIds, supabase),
    getCelulasNamesMap(celulaIds, supabase),
  ]);

  const presencasPromises = reunioes.map(async (reuniao) => {
    const [membrosCount, visitantesCount] = await Promise.all([
      supabase
        .from('presencas_membros')
        .select('id', { count: 'exact', head: true })
        .eq('reuniao_id', reuniao.id)
        .eq('presente', true),
      supabase
        .from('presencas_visitantes')
        .select('id', { count: 'exact', head: true })
        .eq('reuniao_id', reuniao.id)
        .eq('presente', true)
    ]);
    
    return {
      ...reuniao,
      ministrador_principal_nome: ministradoresMap.get(reuniao.ministrador_principal) || null,
      celula_nome: celulasMap.get(reuniao.celula_id) || null,
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

export async function duplicarReuniao(reuniaoId: string): Promise<void> {
  const { supabase, isAuthorized } = await checkUserAuthorization();
  if (!isAuthorized) { 
    throw new Error("Não autorizado."); 
  }
  
  const { data: reuniaoOriginal, error: fetchError } = await supabase
    .from('reunioes')
    .select('*')
    .eq('id', reuniaoId)
    .single();
  
  if (fetchError || !reuniaoOriginal) { 
    throw new Error("Reunião original não encontrada."); 
  }
  
  const { id, created_at, ...newReuniaoData } = reuniaoOriginal;
  newReuniaoData.tema = `${newReuniaoData.tema} (Cópia)`;
  
  const { error: insertError } = await supabase
    .from('reunioes')
    .insert(newReuniaoData);
  
  if (insertError) { 
    throw new Error(`Falha ao duplicar reunião: ${insertError.message}`); 
  }
  revalidatePath('/reunioes');
}

export async function verificarDuplicidadeReuniao(dataReuniao: string, reuniaoId?: string): Promise<boolean> {
  const { supabase, celulaId, isAuthorized } = await checkUserAuthorization();
  if (!isAuthorized || !celulaId) {
    throw new Error("Não autorizado ou célula não definida.");
  }

  let query = supabase
    .from('reunioes')
    .select('id')
    .eq('data_reuniao', dataReuniao)
    .eq('celula_id', celulaId);

  if (reuniaoId) {
    query = query.neq('id', reuniaoId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Erro ao verificar duplicidade:", error);
    return false;
  }

  return (data?.length || 0) > 0;
}

export async function uploadMaterialReuniao(reuniaoId: string, file: File): Promise<string> {
  const { supabase, isAuthorized } = await checkUserAuthorization();
  if (!isAuthorized) {
    throw new Error("Não autorizado.");
  }

  // Verificar se a reunião existe
  const { data: reuniao, error: reuniaoError } = await supabase
    .from('reunioes')
    .select('id, celula_id')
    .eq('id', reuniaoId)
    .single();

  if (reuniaoError || !reuniao) {
    throw new Error("Reunião não encontrada.");
  }

  // Fazer upload do arquivo
  const fileExt = file.name.split('.').pop();
  const fileName = `${reuniaoId}.${fileExt}`;
  const filePath = `reunioes/${fileName}`;

  const { error: uploadError } = await supabase
    .storage
    .from('materiais')
    .upload(filePath, file, { upsert: true });

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

  return publicUrl;
}

// ============================================================================
//                                FUNÇÕES DE PRESENÇA
// ============================================================================

export async function listarTodosMembrosComPresenca(reuniaoId: string): Promise<MembroComPresenca[]> {
  const { supabase, isAuthorized } = await checkUserAuthorization();
  if (!isAuthorized) { 
    throw new Error("Não autorizado."); 
  }
  
  const { data: reuniao, error: reuniaoError } = await supabase
    .from('reunioes')
    .select('celula_id')
    .eq('id', reuniaoId)
    .single();
  
  if (reuniaoError || !reuniao) { 
    throw new Error("Reunião não encontrada."); 
  }
  
  const { data: membros, error: membrosError } = await supabase
    .from('membros')
    .select('*')
    .eq('celula_id', reuniao.celula_id)
    .order('nome');
  
  if (membrosError) { 
    throw new Error("Erro ao listar membros."); 
  }
  
  const { data: presencas, error: presencasError } = await supabase
    .from('presencas_membros')
    .select('membro_id, presente')
    .eq('reuniao_id', reuniaoId);
  
  if (presencasError) { 
    throw new Error("Erro ao buscar presenças."); 
  }
  
  const presencasMap = new Map(presencas.map(p => [p.membro_id, p.presente]));
  return (membros || []).map(membro => ({ 
    ...membro, 
    presente: presencasMap.get(membro.id) || false 
  }));
}

export async function listarTodosVisitantesComPresenca(reuniaoId: string): Promise<VisitanteComPresenca[]> {
  const { supabase, isAuthorized } = await checkUserAuthorization();
  if (!isAuthorized) { 
    throw new Error("Não autorizado."); 
  }
  
  const { data: reuniao, error: reuniaoError } = await supabase
    .from('reunioes')
    .select('celula_id')
    .eq('id', reuniaoId)
    .single();
  
  if (reuniaoError || !reuniao) { 
    throw new Error("Reunião não encontrada."); 
  }
  
  const { data: visitantes, error: visitantesError } = await supabase
    .from('visitantes')
    .select('*')
    .eq('celula_id', reuniao.celula_id)
    .order('nome');
  
  if (visitantesError) { 
    throw new Error("Erro ao listar visitantes."); 
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
  const { supabase, isAuthorized } = await checkUserAuthorization();
  if (!isAuthorized) { 
    throw new Error("Não autorizado."); 
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
}

export async function registrarPresencaVisitante(reuniaoId: string, visitanteId: string, presente: boolean): Promise<void> {
  const { supabase, isAuthorized } = await checkUserAuthorization();
  if (!isAuthorized) { 
    throw new Error("Não autorizado."); 
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
}

export async function getNumCriancasReuniao(reuniaoId: string): Promise<number> {
  const { supabase, isAuthorized } = await checkUserAuthorization();
  if (!isAuthorized) { 
    throw new Error("Não autorizado."); 
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
  const { supabase, isAuthorized } = await checkUserAuthorization();
  if (!isAuthorized) { 
    throw new Error("Não autorizado."); 
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
}

export async function getReuniaoDetalhesParaResumo(reuniaoId: string): Promise<ReuniaoDetalhesParaResumo | null> {
  const { supabase, isAuthorized } = await checkUserAuthorization();
  if (!isAuthorized) { 
    throw new Error("Não autorizado."); 
  }
  
  const { data, error } = await supabase.rpc('get_reuniao_summary', { p_reuniao_id: reuniaoId });
  if (error || !data) { 
    console.error("Erro ao buscar resumo da reunião:", error); 
    return null; 
  }
  return data as ReuniaoDetalhesParaResumo;
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
    celula_nome: celulaNome || undefined 
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
}

export async function updateUserPassword(newPassword: string): Promise<void> {
  const { supabase, isAuthorized } = await checkUserAuthorization();
  if (!isAuthorized) { 
    throw new Error("Não autorizado."); 
  }
  
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) { 
    throw new Error(`Erro ao atualizar senha: ${error.message}`); 
  }
}

// ============================================================================
//                        FUNÇÕES ADMINISTRATIVAS
// ============================================================================

export async function uploadPalavraDaSemana(formData: FormData): Promise<void> {
  const { supabase, role } = await checkUserAuthorization();
  if (role !== 'admin') { 
    throw new Error("Acesso negado."); 
  }
  
  const file = formData.get('file') as File;
  const titulo = formData.get('titulo') as string;
  const data_semana = formData.get('data_semana') as string;
  const descricao = formData.get('descricao') as string;
  
  if (!file || !titulo || !data_semana) { 
    throw new Error("Campos obrigatórios faltando."); 
  }
  
  const filePath = `palavra_semana/${file.name}`;
  const { error: uploadError } = await supabase
    .storage
    .from('materiais')
    .upload(filePath, file, { upsert: true });
  
  if (uploadError) { 
    throw new Error(`Erro no upload: ${uploadError.message}`); 
  }
  
  const { data: { publicUrl } } = supabase
    .storage
    .from('materiais')
    .getPublicUrl(filePath);
  
  const { error: dbError } = await supabase
    .from('palavra_semana')
    .insert({ titulo, descricao, data_semana, url_arquivo: publicUrl });
  
  if (dbError) { 
    throw new Error(`Erro ao salvar no banco: ${dbError.message}`); 
  }
  revalidatePath('/admin/palavra-semana');
}

export async function deletePalavraDaSemana(id: string, url_arquivo: string): Promise<void> {
  const { supabase, role } = await checkUserAuthorization();
  if (role !== 'admin') { 
    throw new Error("Acesso negado."); 
  }
  
  const filePath = url_arquivo.split('/materiais/')[1];
  const { error: storageError } = await supabase
    .storage
    .from('materiais')
    .remove([filePath]);
  
  if (storageError) { 
    console.warn(`Aviso: não foi possível deletar o arquivo do storage: ${storageError.message}`); 
  }
  
  const { error: dbError } = await supabase
    .from('palavra_semana')
    .delete()
    .eq('id', id);
  
  if (dbError) { 
    throw new Error(`Erro ao deletar do banco de dados: ${dbError.message}`); 
  }
  revalidatePath('/admin/palavra-semana');
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
  if (!isAuthorized) return null;
  
  const { data, error } = await supabase
    .from('palavra_semana')
    .select('*')
    .order('data_semana', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error("Erro ao buscar palavra da semana:", error);
    return null;
  }
  return data;
}

// ============================================================================
//                        FUNÇÕES DE IMPORT/EXPORT
// ============================================================================

export async function importarMembrosCSV(csvContent: string): Promise<{ success: number; errors: number; errorDetails: string[] }> {
  const { supabase, celulaId, isAuthorized } = await checkUserAuthorization();
  if (!isAuthorized || !celulaId) { 
    throw new Error("Não autorizado ou célula não definida."); 
  }
  
  const lines = csvContent.split('\n').slice(1);
  let success = 0;
  let errors = 0;
  let errorDetails: string[] = [];
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    const [nome, telefone, endereco, data_nascimento, data_ingresso] = line.split(',');
    
    try {
      const { error } = await supabase.from('membros').insert({
        nome: nome.trim(),
        telefone: telefone ? telefone.trim() : null,
        endereco: endereco ? endereco.trim() : null,
        data_nascimento: data_nascimento ? data_nascimento.trim() : null,
        data_ingresso: data_ingresso ? data_ingresso.trim() : new Date().toISOString().split('T')[0],
        celula_id: celulaId
      });
      
      if (error) throw error;
      success++;
    } catch (e: any) {
      errors++;
      errorDetails.push(`Linha "${nome}": ${e.message}`);
    }
  }
  
  revalidatePath('/membros');
  return { success, errors, errorDetails };
}

export async function exportarMembrosCSV(celulaIdFilter: string | null = null): Promise<string> {
  const membros = await listarMembros(celulaIdFilter);
  const headers = "nome,telefone,endereco,data_nascimento,data_ingresso,celula_nome";
  const rows = membros.map(m => 
    `${m.nome},${m.telefone || ''},${m.endereco || ''},${m.data_nascimento || ''},${m.data_ingresso || ''},${m.celula_nome || ''}`
  );
  return [headers, ...rows].join('\n');
}