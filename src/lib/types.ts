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

export interface ActivityLogItem {
    id: string;
    type: 'member_added' | 'visitor_added' | 'reunion_added' | 'visitor_converted' | 'celula_created' | 'celula_updated' | 'profile_activated';
    description: string;
    created_at: string;
    celula_nome?: string | null;
}

// --- Interfaces para CHAVES DE ATIVAÇÃO ---
// Usada em `src/app/(app)/admin/celulas/page.tsx` e `src/app/api/admin/chaves-ativacao/actions.ts`
export interface ChaveAtivacao {
    chave: string;
    celula_id: string;
    usada: boolean;
    created_at: string; // <-- **CORREÇÃO APLICADA AQUI**
    // Adicionado para relatório de chaves de ativação
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
    created_by?: string | null;      // <--- AQUI: Adicionei a interrogação (?)
    created_by_email?: string | null; // <--- AQUI: Adicionei também por garantia
}

// --- Interfaces de DADOS DO BANCO DE DADOS (DB) ou FORMULÁRIOS ---

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
    last_sign_in_at?: string | null; // Adicionado do UserProfile do admin/users/actions
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
export interface CelulaNomeId {
    id: string;
    nome: string;
}

// Para uso interno em funções de dados onde apenas ID, nome e telefone de membro são necessários
export interface MembroNomeTelefoneId { 
    id: string;
    nome: string;
    telefone: string | null;
}

// Para uso interno em funções de dados onde apenas ID, nome e telefone de visitante são necessários
export interface VisitanteNomeTelefoneId { 
    id: string;
    nome: string;
    telefone: string | null;
}


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

export interface MembroOption {
    id: string;
    nome: string;
    celula_id: string; 
    celula_nome: string | null;
}

export interface ReuniaoOption {
    id: string;
    data_reuniao: string;
    tema: string;
    ministrador_principal_nome: string | null;
    celula_id: string;
    celula_nome: string | null;
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
    periodo: {
        start_date: string;
        end_date: string;
        total_reunioes: number;
    };
    faltosos: MembroFaltoso[];
}

export interface VisitantePorPeriodo {
    id: string;
    nome: string;
    telefone: string | null;
    data_primeira_visita: string;
    celula_nome: string | null;
}

export interface ReportDataVisitantesPeriodo {
    periodo: {
        start_date: string;
        end_date: string;
        total_visitantes: number;
    };
    visitantes: VisitantePorPeriodo[];
}

export interface MembroAniversariante {
    id: string;
    nome: string;
    data_nascimento: string; // YYYY-MM-DD
    telefone: string | null;
    celula_id: string;
    celula_nome: string | null;
}

export interface VisitanteAniversariante {
    id: string;
    nome: string;
    data_primeira_visita: string; // YYYY-MM-DD
    data_nascimento: string; // YYYY-MM-DD
    telefone: string | null;
    celula_id: string;
    celula_nome: string | null;
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

// --- Interface para o Formulário de Edição de Membro ---
export interface MembroEditFormData {
    nome: string;
    telefone: string;
    data_nascimento: string;
    endereco: string;
    data_ingresso: string;
    status: string; // 'ativo' | 'inativo'
    cargo: string;  // 'membro' | 'líder' | 'anfitrião'
    email: string;
}

// --- Interface para o Formulário de Edição de Visitante ---
export interface VisitanteEditFormData {
    nome: string;
    telefone: string | null;
    data_nascimento: string | null;
    data_primeira_visita: string;
    endereco: string | null;
    status_conversao: string | null; // ex: 'membro', 'em contato', 'sem retorno'
    data_ultimo_contato: string | null; 
    observacoes: string | null;
}

// --- Interface para dados básicos de Membro (com ID e Telefone) ---
export interface MemberData {
    id: string;
    nome: string;
    telefone: string | null;
}