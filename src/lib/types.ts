// src/lib/types.ts

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
    num_presentes_membros: number; // ADICIONADO AQUI! (Já havíamos feito)
    num_presentes_visitantes: number; // ADICIONADO AQUI! (Já havíamos feito)
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

// Interface para ChaveAtivacao (também deve ser movida para cá se for compartilhada)
export interface ChaveAtivacao {
    chave: string;
    celula_id: string;
    usada: boolean;
    created_at: string;
}