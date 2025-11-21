// src/lib/types.ts

// ============================================================================
//                                INTERFACES GERAIS
// ============================================================================

// Interface para dados de presença da última reunião no Dashboard
export interface LastMeetingPresence {
  id: string;
  data_reuniao: string;
  num_presentes_membros: number;
  num_ausentes_membros: number; // Pode não ser usado diretamente aqui, mas útil
  num_presentes_visitantes: number;
  num_criancas: number;
  tema?: string;
  ministrador_principal_nome?: string | null;
  celula_nome?: string | null;
}

// Interface para exibir membros no Dashboard (dados resumidos)
export interface MembroDashboard {
    id: string;
    nome: string;
    data_ingresso: string;
    celula_nome?: string | null;
    data_nascimento?: string | null;
}

// Interface para exibir visitantes no Dashboard (dados resumidos)
export interface VisitanteDashboard {
    id: string;
    nome: string;
    data_primeira_visita: string;
    celula_nome?: string | null;
}

// Interface para reuniões com nomes associados (usada em várias listagens)
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
    num_presentes_membros?: number; // Opcional, pode ser calculado na query
    num_presentes_visitantes?: number; // Opcional, pode ser calculado na query
    created_at: string; // Adicionado, estava em ReuniaoDB mas é útil em listagens
}

// Interface para alertas de membros faltosos
export interface FaltososAlert {
    count: number;
    members: { id: string; nome: string; telefone: string | null }[];
    startDate: string;
    endDate: string;
    totalMeetingsPeriod: number;
}

// Interface para alertas de visitantes não convertidos
export interface UnconvertedVisitorsAlert {
    count: number;
    visitors: { id: string; nome: string; data_primeira_visita: string; telefone: string | null }[];
}

// Interface para alertas de aniversariantes
export interface BirthdayAlert {
    count: number;
    members: { id: string; nome: string; data_nascimento: string }[];
}

// Interface para dados de taxa de presença média (para gráficos)
export interface AveragePresenceRateData {
    labels: string[];
    data: number[];
}

// Interface para resumo de células no Admin Dashboard
export interface CelulasSummary {
    totalCelulas: number;
    celulasWithoutLeaders: number;
}

// Interface para top/flop de presença de células
export interface TopFlopPresence {
    celula_id: string;
    celula_nome: string;
    avg_presence: number;
}

// Interface para crescimento de membros/visitantes por célula
export interface CelulaGrowth {
    celula_id: string;
    celula_nome: string;
    growth_members: number;
    growth_visitors: number;
}

// Interface para distribuição de membros por célula (para gráficos)
export interface MembersByCelulaDistribution {
    celula_nome: string;
    count: number;
}

// Interface para distribuição de visitantes por célula (para gráficos)
export interface VisitorsByCelulaDistribution {
    celula_nome: string;
    count: number;
}

// Interface para item de log de atividade
export interface ActivityLogItem {
    id: string;
    type: 'member_added' | 'visitor_added' | 'reunion_added' | 'visitor_converted' | 'celula_created' | 'celula_updated' | 'profile_activated';
    description: string;
    created_at: string;
    celula_nome?: string | null;
}

// Interface para análise de conversão de visitantes
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

// Interface para tendência de novos visitantes (para gráficos)
export interface NewVisitorsTrendData {
    labels: string[];
    data: number[];
}

// Interface para grupos de visitantes duplicados detectados
export interface DuplicateVisitorGroup {
    group_id: string;
    visitors: { id: string; nome: string; telefone: string | null; celula_nome: string | null }[];
    common_value: string;
    type: 'nome' | 'telefone';
}


// --- Interfaces para CHAVES DE ATIVAÇÃO ---
export interface ChaveAtivacao {
    chave: string;
    celula_id: string;
    usada: boolean;
    created_at: string;
    data_uso?: string | null;
    usada_por_email?: string | null;
    usada_por_id?: string | null;
}

// --- Interface para PALAVRA DA SEMANA ---
export interface PalavraDaSemana {
    id: string;
    titulo: string;
    descricao: string | null;
    url_arquivo: string;
    data_semana: string;
    created_at: string;
    created_by?: string | null; // <--- CORREÇÃO AQUI: Use '?' para marcar como opcional
    created_by_email: string | null;
}

// ============================================================================
//               Interfaces de DADOS DO BANCO DE DADOS (DB) ou FORMULÁRIOS
// ============================================================================

// Interface para perfil de usuário (para admin/profile pages)
export interface Profile {
    id: string;
    email: string;
    nome_completo: string | null;
    telefone: string | null;
    role: 'admin' | 'líder' | null;
    celula_id: string | null;
    celula_nome: string | null;
    created_at: string;
    last_sign_in_at?: string | null;
}

// Interface para Usuário/Perfil retornado por admin/users/actions
export interface UserProfile {
    id: string;
    email: string | null;
    nome_completo: string | null;
    telefone: string | null;
    role: 'admin' | 'líder' | null;
    celula_id: string | null;
    celula_nome: string | null;
    created_at: string;
    last_sign_in_at: string | null;
}

// Interface para opções de seleção de Célula (dropdowns)
export interface CelulaOption {
    id: string;
    nome: string;
}

// Para uso interno em funções de dados onde apenas ID e nome são necessários (ex: getCelulasNamesMap)
// REMOVIDA DUPLICAÇÃO - JÁ EXISTE UMA CelulaNomeId GLOBALMENTE
// export interface CelulaNomeId { id: string; nome: string; }

// Para uso interno em funções de dados onde apenas ID, nome e telefone de membro são necessários
// REMOVIDA DUPLICAÇÃO - JÁ EXISTE UMA MembroNomeTelefoneId GLOBALMENTE
// export interface MembroNomeTelefoneId { id: string; nome: string; telefone: string | null; }

// Para uso interno em funções de dados onde apenas ID, nome e telefone de visitante são necessários
// REMOVIDA DUPLICAÇÃO - JÁ EXISTE UMA VisitanteNomeTelefoneId GLOBALMENTE
// export interface VisitanteNomeTelefoneId { id: string; nome: string; telefone: string | null; }


// Interface para detalhes de uma Célula (para admin/celulas/actions)
export interface Celula {
    id: string;
    nome: string;
    lider_principal: string | null;
    endereco: string | null;
    created_at: string;
}

// Interface base para membros
export interface Membro {
    id: string;
    celula_id: string;
    nome: string;
    telefone: string | null;
    data_ingresso: string;
    data_nascimento: string | null;
    endereco: string | null;
    status: 'Ativo' | 'Inativo' | 'Em transição';
    created_at: string;
    celula_nome?: string | null; // Adicionado para facilitar a exibição
}

// Interface para visitantes
export interface Visitante {
    id: string;
    celula_id: string;
    nome: string;
    telefone: string | null;
    data_primeira_visita: string;
    data_nascimento: string | null;
    endereco: string | null;
    data_ultimo_contato: string | null;
    observacoes: string | null;
    created_at: string;
    celula_nome?: string | null; // Adicionado para facilitar a exibição
}

// Interface para Membros com status de presença
export interface MembroComPresenca extends Membro {
    presente: boolean;
}

// Interface para Visitantes com status de presença
export interface VisitanteComPresenca {
    visitante_id: string; // ID do visitante
    nome: string;
    telefone: string | null;
    presente: boolean;
}


// Interface para dados de reunião como são armazenados no DB (antes de mapear nomes)
// Inclui os IDs de membros para os ministradores/responsáveis
export interface ReuniaoDB {
    id: string;
    celula_id: string;
    data_reuniao: string;
    tema: string;
    caminho_pdf: string | null;
    ministrador_principal: string | null; // Membro ID
    ministrador_secundario: string | null; // Membro ID
    responsavel_kids: string | null; // Membro ID
    created_at: string;
}

// Interface para o formulário de reunião (recebe IDs de membros)
export interface ReuniaoFormData {
    data_reuniao: string;
    tema: string;
    ministrador_principal: string | null;
    ministrador_secundario: string | null;
    responsavel_kids: string | null;
    caminho_pdf?: string | null; // Pode ser opcional no form, mas no DB é string | null
    celula_id?: string; // Opcional, será preenchido pelo Server Action se for líder
}

// Interface para dados de reunião para edição (inclui nomes e IDs)
export interface ReuniaoParaEdicao {
    id: string;
    celula_id: string;
    data_reuniao: string;
    tema: string;
    caminho_pdf: string | null;
    created_at: string;

    ministrador_principal: string | null;
    ministrador_secundario: string | null;
    responsavel_kids: string | null;

    ministrador_principal_nome: string | null;
    ministrador_secundario_nome: string | null;
    responsavel_kids_nome: string | null;
    celula_nome: string | null;
}

// Interface para resumo de reunião para exibição
export interface ReuniaoDetalhesParaResumo {
    id: string;
    data_reuniao: string;
    tema: string;
    caminho_pdf: string | null;
    ministrador_principal_nome: string | null;
    ministrador_secundario_nome: string | null;
    responsavel_kids_nome: string | null;
    num_criancas: number;
    celula_nome: string | null;
    membros_presentes: { id: string; nome: string; telefone: string | null }[];
    membros_ausentes: { id: string; nome: string; telefone: string | null }[];
    visitantes_presentes: { id: string; nome: string; telefone: string | null }[];
}

// Interface para dados de crianças por reunião
export interface CriancasReuniaoData {
    reuniao_id: string;
    numero_criancas: number;
}

// Interface para resultados de importação de membros CSV
export interface ImportMembroResult {
    success: boolean;
    message: string;
    importedCount: number;
    errors: { rowIndex: number; data: any; error: string }[];
}

// --- Interfaces para Relatórios ---
// NOTA: Muitas dessas interfaces são duplicadas das "Interfaces Gerais" acima.
// Idealmente, as interfaces should ser definidas apenas uma vez e reutilizadas.
// Mantendo a estrutura atual para o propósito da refatoração solicitada.

// MembroOption já definida acima
// ReuniaoOption já definida acima, mas sem celula_id e celula_nome. Ajustando aqui.
export interface ReuniaoOptionRelatorio { // Renomeado para evitar conflito
    id: string;
    data_reuniao: string;
    tema: string;
    ministrador_principal_nome: string | null;
    celula_id: string;
    celula_nome: string | null;
}


// ReportDataPresencaReuniao já definida acima, mas é mais específica para o relatório
// Mantendo a definição mais específica aqui se for estritamente para relatórios
// export interface ReportDataPresencaReuniao { ... }


// RelatorioPresencaMembroItem já definida acima
// export interface RelatorioPresencaMembroItem { ... }

// ReportDataPresencaMembro já definida acima
// export interface ReportDataPresencaMembro { ... }

// MembroFaltoso já definida acima
// export interface MembroFaltoso { ... }

// ReportDataFaltososPeriodo já definida acima, corrigida estrutura para 'periodo' aninhado
export interface ReportDataFaltososPeriodo {
    start_date: string; // Mover para o nível superior, ou remover se 'periodo' for preferido
    end_date: string;   // Mover para o nível superior, ou remover se 'periodo' for preferido
    periodo: { // Adicionar o objeto 'periodo' conforme definido em reports_data.ts
        start_date: string;
        end_date: string;
        total_reunioes: number;
    };
    faltosos: MembroFaltoso[];
}

// VisitantePorPeriodo já definida acima
// export interface VisitantePorPeriodo { ... }

// ReportDataVisitantesPeriodo já definida acima, corrigida estrutura para 'periodo' aninhado
export interface ReportDataVisitantesPeriodo {
    start_date: string; // Mover para o nível superior, ou remover se 'periodo' for preferido
    end_date: string;   // Mover para o nível superior, ou remover se 'periodo' for preferido
    periodo: { // Adicionar o objeto 'periodo' conforme definido em reports_data.ts
        start_date: string;
        end_date: string;
        total_visitantes: number;
    };
    visitantes: VisitantePorPeriodo[];
}

// MembroAniversariante já definida acima
// export interface MembroAniversariante { ... }

// VisitanteAniversariante já definida acima
// export interface VisitanteAniversariante { ... }

// ReportDataAniversariantes já definida acima
// export interface ReportDataAniversariantes { ... }

// LiderAlocacaoItem já definida acima
// export interface LiderAlocacaoItem { ... }

// CelulaSemLiderItem já definida acima
// export interface CelulaSemLiderItem { ... }

// ReportDataAlocacaoLideres já definida acima
// export interface ReportDataAlocacaoLideres { ... }

// ChaveAtivacaoItem já definida acima
// export interface ChaveAtivacaoItem { ... }

// ReportDataChavesAtivacao já definida acima
// export interface ReportDataChavesAtivacao { ... }