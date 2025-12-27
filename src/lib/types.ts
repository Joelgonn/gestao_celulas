// src/lib/types.ts

// ============================================================================
//                                INTERFACES GERAIS DO DASHBOARD E ALERTAS
// ============================================================================

// Interface para dados de presença da última reunião no Dashboard
export interface LastMeetingPresence {
  id: string;
  data_reuniao: string;
  num_presentes_membros: number;
  num_ausentes_membros: number;
  num_presentes_visitantes: number;
  num_criancas: number;
  tema?: string; // Opcional no dashboard, pode não ser sempre preenchido na query curta
  ministrador_principal_nome?: string | null;
  celula_nome?: string | null; // Pode ser null ou undefined se o fetch não encontrar na query do dashboard
}

// Interface para exibir membros no Dashboard (dados resumidos)
export interface MembroDashboard {
    id: string;
    nome: string;
    data_ingresso: string;
    celula_nome?: string | null; // Pode ser null ou undefined se o fetch não encontrar
    data_nascimento?: string | null;
}

// Interface para exibir visitantes no Dashboard (dados resumidos)
export interface VisitanteDashboard {
    id: string;
    nome: string;
    data_primeira_visita: string;
    celula_nome?: string | null; // Pode ser null ou undefined se o fetch não encontrar
}

// Interface para alertas de membros faltosos
export interface FaltososAlert {
    count: number;
    members: { id: string; nome: string; telefone: string | null }[];
    totalMeetingsPeriod: number;
    startDate?: string; // Adicione como opcional (?)
    endDate?: string;   // Adicione como opcional (?)
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

// Interface para item de log de atividade (global no dashboard)
export interface ActivityLogItem {
    id: string;
    type: 'member_added' | 'visitor_added' | 'reunion_added' | 'visitor_converted' | 'celula_created' | 'celula_updated' | 'profile_activated';
    description: string;
    created_at: string;
    celula_nome?: string | null; // Pode ser null ou undefined se o fetch não encontrar
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
    created_by?: string | null;
    created_by_email?: string | null;
}

// ============================================================================
//                                INTERFACES DE DADOS E FORMULÁRIOS
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
    last_sign_in_at: string | null;
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
    data_nascimento?: string | null; // Adicionado para pré-preenchimento
    endereco?: string | null;       // Adicionado para pré-preenchimento
    celula_id?: string | null;      // Adicionado para pré-preenchimento
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
    status_conversao?: string | null; // Tipo string | null (ou literal se tiver valores fixos)
}

// Interface para Membros com status de presença
export interface MembroComPresenca extends Membro {
    presente: boolean;
    presenca_registrada: boolean;
}

// Interface para Visitantes com status de presença
export interface VisitanteComPresenca {
    visitante_id: string;
    nome: string;
    telefone: string | null;
    presente: boolean;
    celula_nome?: string | null; // Pode ser null ou undefined se o fetch não encontrar
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
    caminho_pdf?: string | null;
    celula_id?: string;
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
// Estas interfaces devem ser consistentes com o que é retornado pelas funções de relatório
// e o que é esperado pelos componentes de display.

export interface MembroOption {
    id: string;
    nome: string;
    celula_id?: string; // Opcional, listMembros pode não retornar
    celula_nome?: string | null; // Opcional
}

export interface ReuniaoOption {
    id: string;
    data_reuniao: string;
    tema: string;
    ministrador_principal_nome: string | null;
    celula_id?: string; // Opcional
    celula_nome?: string | null; // Opcional
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
        celula_nome: string | null;
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
    membro_data: Membro & { celula_nome: string | null };
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
    data_nascimento: string | null;
    endereco: string | null;
    data_ingresso: string;
    status: 'Ativo' | 'Inativo' | 'Em transição';
    cargo?: string;
    email?: string;
}

// --- Interface para o Formulário de Edição de Visitante ---
export interface VisitanteEditFormData {
    nome: string;
    telefone: string | null;
    data_nascimento: string | null;
    data_primeira_visita: string;
    endereco: string | null;
    status_conversao?: string | null;
    data_ultimo_contato: string | null;
    observacoes: string | null;
}

// --- Interface para o formulário de Adição de Visitante ---
export interface NovoVisitanteFormData {
    nome: string;
    telefone: string | null;
    data_primeira_visita: string;
    data_nascimento: string | null;
    endereco: string | null;
    data_ultimo_contato: string | null;
    observacoes: string | null;
    celula_id: string;
}

// --- Interface para dados básicos de Membro (com ID e Telefone) ---
export interface MemberData {
    id: string;
    nome: string;
    telefone: string | null;
}

// Interface para reuniões com nomes associados (usada em várias listagens)
export interface ReuniaoComNomes {
    id: string;
    data_reuniao: string;
    tema: string;
    ministrador_principal_nome: string | null;
    ministrador_secundario_nome: string | null;
    responsavel_kids_nome: string | null;
    num_criancas: number;
    celula_id: string;
    celula_nome: string | null;
    caminho_pdf: string | null;
    num_presentes_membros?: number;
    num_presentes_visitantes?: number;
    created_at: string;
}

// ============================================================================
//                       NOVAS INTERFACES PARA EVENTOS FACE A FACE (MÓDULO 0)
// ============================================================================

// --- Eventos Face a Face ---
export type EventoFaceAFaceTipo = 'Mulheres' | 'Homens';
export type EventoFaceAFaceTamanhoCamiseta = 'PP' | 'P' | 'M' | 'G' | 'GG' | 'G1' | 'G2' | 'G3' | 'G4' | 'G5'; // <-- NOVO: Tamanho camiseta no EVENTO? Ou na INSCRICAO? Assumindo INSCRICAO

export type EventoFaceAFace = {
    id: string;
    nome_evento: string;
    tipo: EventoFaceAFaceTipo;
    data_inicio: string; // Formato ISO date string (YYYY-MM-DD)
    data_fim: string;    // Formato ISO date string (YYYY-MM-DD)
    data_pre_encontro: string | null;
    local_evento: string;
    valor_total: number; // Decimal (ex: 350.00)
    valor_entrada: number; // Decimal (ex: 150.00)
    data_limite_entrada: string; // Formato ISO date string (YYYY-MM-DD)
    informacoes_adicionais: string | null;
    chave_pix_admin: string | null;
    ativa_para_inscricao: boolean;
    created_at: string;
    updated_at: string;
    criado_por_perfil_id: string | null;
};

// Dados para criação/edição de EventoFaceAFace (sem campos auto-gerados)
export type EventoFaceAFaceFormData = Omit<EventoFaceAFace, 'id' | 'created_at' | 'updated_at' | 'criado_por_perfil_id'>;

// Tipo para opções de select (admin) - **AJUSTADO AQUI** para incluir datas e valor
export type EventoFaceAFaceOption = {
    id: string;
    nome: string; // nome_evento
    tipo: EventoFaceAFaceTipo;
    data_inicio: string; // Adicionado para exibição na listagem
    data_fim: string;     // Adicionado para exibição na listagem
    valor_total: number;  // Adicionado para exibição na listagem
    ativa_para_inscricao: boolean;
};


// --- Inscrições Face a Face ---
export type InscricaoFaceAFaceStatus = 
    'PENDENTE' | 
    'AGUARDANDO_CONFIRMACAO_ENTRADA' | 
    'ENTRADA_CONFIRMADA' | 
    'AGUARDANDO_CONFIRMACAO_RESTANTE' | 
    'PAGO_TOTAL' | 
    'CANCELADO';

export type InscricaoFaceAFaceEstadoCivil = 'SOLTEIRA' | 'CASADA' | 'DIVORCIADA' | 'VIÚVA' | 'UNIÃO ESTÁVEL';

export type InscricaoFaceAFaceTamanhoCamiseta = 'PP' | 'P' | 'M' | 'G' | 'GG' | 'G1' | 'G2' | 'G3' | 'G4' | 'G5';

// NOVO: Tipo de Participação (Encontrista/Encontreiro)
export type InscricaoFaceAFaceTipoParticipacao = 'Encontrista' | 'Encontreiro';

export type InscricaoFaceAFace = {
    id: string;
    evento_id: string;
    membro_id: string | null;
    nome_completo_participante: string;
    cpf: string | null;
    idade: number | null;
    rg: string | null;
    contato_pessoal: string;
    contato_emergencia: string;
    endereco_completo: string | null;
    bairro: string | null;
    cidade: string | null;
    estado_civil: InscricaoFaceAFaceEstadoCivil | null;
    nome_esposo: string | null;
    tamanho_camiseta: InscricaoFaceAFaceTamanhoCamiseta | null;
    eh_membro_ib_apascentar: boolean;
    celula_id: string | null; // Célula do participante
    lider_celula_nome: string | null; // Nome do líder da célula do participante
    pertence_outra_igreja: boolean;
    nome_outra_igreja: string | null;
    dificuldade_dormir_beliche: boolean | null;
    restricao_alimentar: boolean | null;
    deficiencia_fisica_mental: boolean | null;
    toma_medicamento_controlado: boolean | null;
    descricao_sonhos: string;
    tipo_participacao: InscricaoFaceAFaceTipoParticipacao; 
    
    data_nascimento: string | null; // <-- Manter no tipo principal (DB)

    // Campos de pagamento e status
    caminho_comprovante_entrada: string | null;
    data_upload_entrada: string | null;
    admin_confirmou_entrada: boolean;
    caminho_comprovante_restante: string | null;
    data_upload_restante: string | null;
    admin_confirmou_restante: boolean;
    status_pagamento: InscricaoFaceAFaceStatus;
    admin_observacao_pagamento: string | null;

    inscrito_por_perfil_id: string | null; // Quem fez a inscrição (o líder)
    celula_inscricao_id: string | null;   // Célula do líder que fez a inscrição
    created_at: string;
    updated_at: string;

    // Campos adicionais para exibição (joins)
    celula_participante_nome?: string; // Nome da célula do participante, se houver
    celula_inscricao_nome?: string;    // Nome da célula do líder que inscreveu
    evento_nome?: string; // Nome do evento, caso seja necessário em lista de inscrições
    valor_total_evento?: number; // Valor total do evento (para exibir na inscrição)
    valor_entrada_evento?: number; // Valor da entrada do evento (para exibir na inscrição)
};

// Dados para formulário de inscrição (sem campos auto-gerados ou de status de pagamento/comprovante inicial)
// <-- REMOVIDO data_nascimento AQUI!
export type InscricaoFaceAFaceFormData = Omit<
    InscricaoFaceAFace, 
    'id' | 
    'created_at' | 
    'updated_at' | 
    'inscrito_por_perfil_id' | 
    'celula_inscricao_id' | 
    // 'data_nascimento' | // <-- data_nascimento NÃO ESTÁ MAIS NO OMIT. AGORA SERÁ INCLUÍDO NO FORM.
    'caminho_comprovante_entrada' | 
    'data_upload_entrada' | 
    'admin_confirmou_entrada' | 
    'caminho_comprovante_restante' | 
    'data_upload_restante' | 
    'admin_confirmou_restante' | 
    'status_pagamento' |
    'celula_participante_nome' | // Estes são campos de join, não de input
    'celula_inscricao_nome' |
    'evento_nome' |
    'valor_total_evento' |
    'valor_entrada_evento'
>;