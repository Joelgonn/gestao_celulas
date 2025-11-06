// src/lib/data.ts
'use server';

import { createServerClient, createAdminClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

// Tipos locais para os parâmetros
type CelulaData = { id: string; nome: string };
type MemberData = { id: string; nome: string; telefone: string | null };
type CelulaProfile = { celula_id: string | null };

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
    const { data, error } = await supabaseInstance.from('celulas').select('id, nome').in('id', Array.from(celulaIds));
    if (error) { 
        console.error("Erro ao buscar nomes de células (getCelulasNamesMap):", error); 
    } else {
        data?.forEach((c: CelulaData) => namesMap.set(c.id, c.nome));
    }
    return namesMap;
}

async function getMemberNamesMap(memberIds: Set<string>, supabaseInstance: any): Promise<Map<string, string>> {
    let namesMap = new Map<string, string>();
    if (memberIds.size === 0) return namesMap;
    const { data, error } = await supabaseInstance.from('membros').select('id, nome').in('id', Array.from(memberIds));
    if (error) {
        console.error("Erro ao buscar nomes de membros (getMemberNamesMap):", error);
    } else {
        data?.forEach((m: { id: string, nome: string }) => namesMap.set(m.id, m.nome));
    }
    return namesMap;
}

// ============================================================================
//                                SERVER ACTIONS
// ============================================================================
// ... (O restante das funções permanece o mesmo)

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

export async function listarMembros(celulaIdFilter: string | null = null): Promise<Membro[]> {
    const { supabase, celulaId: userCelulaId, isAuthorized, role } = await checkUserAuthorization();
    if (!isAuthorized) {
        throw new Error("Não autorizado.");
    }
    let query = supabase.from('membros').select('id, nome, telefone, endereco, data_nascimento, data_ingresso, created_at, celula_id');
    if (role === 'líder') {
        if (!userCelulaId) return [];
        query = query.eq('celula_id', userCelulaId);
    } else if (role === 'admin' && celulaIdFilter) {
        query = query.eq('celula_id', celulaIdFilter);
    }
    const { data, error } = await query.order('nome');
    if (error) { throw new Error(`Falha ao carregar membros: ${error.message}`); }
    const membros = data || [];
    const celulaIds = new Set(membros.map((m: ProfileData) => m.celula_id).filter(Boolean) as string[]);
    const celulasNamesMap = await getCelulasNamesMap(celulaIds, supabase);
    return membros.map((m: any) => ({ ...m, celula_nome: celulasNamesMap.get(m.celula_id) || null }));
}

// ... (As demais funções continuam aqui)
export async function getReuniao(id: string): Promise<Reuniao | null> {
    // ...
    const { supabase, isAuthorized } = await checkUserAuthorization();
    if (!isAuthorized) {
        throw new Error("Não autorizado.");
    }
    const { data, error } = await supabase.from('reunioes').select('*').eq('id', id).single();
    if (error) {
        console.error(`Erro ao buscar reunião ${id}:`, error);
        return null;
    }
    return data;
}

export async function atualizarReuniao(id: string, formData: ReuniaoFormData): Promise<void> {
    const { supabase, isAuthorized } = await checkUserAuthorization();
    if (!isAuthorized) {
        throw new Error("Não autorizado.");
    }
    const { error } = await supabase.from('reunioes').update(formData).eq('id', id);
    if (error) {
        throw new Error(`Falha ao atualizar reunião: ${error.message}`);
    }
    revalidatePath('/reunioes');
    revalidatePath(`/reunioes/editar/${id}`);
}

export async function verificarDuplicidadeReuniao(data_reuniao: string, tema: string, currentId?: string): Promise<boolean> {
    // ...
    const { supabase, isAuthorized } = await checkUserAuthorization();
    if (!isAuthorized) {
        throw new Error("Não autorizado.");
    }
    let query = supabase.from('reunioes').select('id', { count: 'exact', head: true }).eq('data_reuniao', data_reuniao).eq('tema', tema);
    if (currentId) {
        query = query.not('id', 'eq', currentId);
    }
    const { count, error } = await query;
    if (error) {
        throw new Error(`Erro ao verificar duplicidade: ${error.message}`);
    }
    return (count || 0) > 0;
}

export async function uploadMaterialReuniao(reuniaoId: string, file: File): Promise<string> {
    // ...
    const { supabase, isAuthorized } = await checkUserAuthorization();
    if (!isAuthorized) {
        throw new Error("Não autorizado.");
    }
    const fileExt = file.name.split('.').pop();
    const fileName = `${reuniaoId}-${Math.random()}.${fileExt}`;
    const filePath = `reunioes-materiais/${fileName}`;
    const { error: uploadError } = await supabase.storage.from('materiais').upload(filePath, file);
    if (uploadError) {
        throw new Error(`Falha no upload do arquivo: ${uploadError.message}`);
    }
    const { data: { publicUrl } } = supabase.storage.from('materiais').getPublicUrl(filePath);
    return publicUrl;
}

export async function adicionarVisitante(visitanteData: any): Promise<void> {
    // ...
    const { supabase, celulaId, isAuthorized } = await checkUserAuthorization();
    if (!isAuthorized || !celulaId) {
        throw new Error("Não autorizado ou célula não definida.");
    }
    const { error } = await supabase.from('visitantes').insert({ ...visitanteData, celula_id: celulaId });
    if (error) {
        throw error;
    }
    revalidatePath('/visitantes');
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