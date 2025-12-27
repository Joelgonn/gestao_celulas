// src/app/(app)/admin/eventos-face-a-face/[evento_id]/inscricoes/page.tsx
'use client';

import { format } from 'date-fns';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
    listarInscricoesFaceAFacePorEvento,
    excluirInscricaoFaceAFace,
    getEventoFaceAFace, // Para obter o nome do evento
    listarCelulasParaAdmin, // Para o filtro de células
    exportarInscricoesCSV // <-- NOVO: Função para exportar CSV
} from '@/lib/data';
import {
    InscricaoFaceAFace,
    InscricaoFaceAFaceStatus,
    EventoFaceAFace,
    CelulaOption,
    InscricaoFaceAFaceTipoParticipacao
} from '@/lib/types';
import { 
    formatDateForDisplay, 
    formatPhoneNumberDisplay,
    normalizePhoneNumber 
} from '@/utils/formatters';
import useToast from '@/hooks/useToast';
import LoadingSpinner from '@/components/LoadingSpinner';

import {
    FaArrowLeft,
    FaUsers,
    FaFilter,
    FaSearch,
    FaEdit,
    FaTrash,
    FaFileCsv,
    FaFilePdf,
    FaSync,
    FaEye,
    FaCheckCircle,
    FaTimesCircle,
    FaClock,
    FaMoneyBillWave,
    FaWhatsapp,
    FaPhone,
    FaTransgender
} from 'react-icons/fa';

export default function AdminListagemInscricoesPage() {
    const params = useParams();
    const eventoId = params.evento_id as string;

    const [evento, setEvento] = useState<EventoFaceAFace | null>(null);
    const [inscricoes, setInscricoes] = useState<InscricaoFaceAFace[]>([]);
    const [celulasOptions, setCelulasOptions] = useState<CelulaOption[]>([]); // Para o filtro de células

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false); // Para ações de exclusão

    // Filtros
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<InscricaoFaceAFaceStatus | 'all'>('all');
    const [celulaFilter, setCelulaFilter] = useState<string | 'all'>('all'); // ID da célula
    const [tipoParticipacaoFilter, setTipoParticipacaoFilter] = useState<InscricaoFaceAFaceTipoParticipacao | 'all'>('all'); 

    const router = useRouter();
    const { addToast, ToastContainer } = useToast();

    // Opções para o filtro de status de pagamento
    const statusPagamentoOptions: { id: InscricaoFaceAFaceStatus | 'all'; nome: string }[] = [
        { id: 'all', nome: 'Todos os Status' },
        { id: 'PENDENTE', nome: 'Pendente' },
        { id: 'AGUARDANDO_CONFIRMACAO_ENTRADA', nome: 'Aguardando Conf. Entrada' },
        { id: 'ENTRADA_CONFIRMADA', nome: 'Entrada Confirmada' },
        { id: 'AGUARDANDO_CONFIRMACAO_RESTANTE', nome: 'Aguardando Conf. Restante' },
        { id: 'PAGO_TOTAL', nome: 'Pago Total' },
        { id: 'CANCELADO', nome: 'Cancelado' },
    ];

    // Opções para o filtro de tipo de participação
    const tipoParticipacaoOptions: { id: InscricaoFaceAFaceTipoParticipacao | 'all'; nome: string }[] = [
        { id: 'all', nome: 'Todos os Tipos' },
        { id: 'Encontrista', nome: 'Encontrista' },
        { id: 'Encontreiro', nome: 'Encontreiro' },
    ];

    const fetchInscricoes = useCallback(async () => {
        setLoading(true);
        try {
            if (!eventoId) { // Garante que eventoId exista antes de buscar
                setLoading(false);
                return;
            }

            const fetchedInscricoes = await listarInscricoesFaceAFacePorEvento(eventoId, {
                statusPagamento: statusFilter,
                celulaId: celulaFilter,
                searchTerm: searchTerm.trim() || undefined,
                tipoParticipacao: tipoParticipacaoFilter === 'all' ? undefined : tipoParticipacaoFilter,
            });
            setInscricoes(fetchedInscricoes);
        } catch (e: any) {
            console.error("Erro ao carregar inscrições:", e);
            addToast(`Erro ao carregar inscrições: ${e.message}`, 'error');
        } finally {
            setLoading(false);
        }
    }, [eventoId, statusFilter, celulaFilter, searchTerm, tipoParticipacaoFilter, addToast]); 

    // useEffect para carregamento INICIAL de dados da página (evento e células)
    useEffect(() => {
        async function loadInitialPageData() { // Renomeado para evitar confusão com fetchInscricoes
            setLoading(true);
            try {
                const eventData = await getEventoFaceAFace(eventoId);
                if (!eventData) {
                    addToast('Evento não encontrado ou acesso negado.', 'error');
                    router.replace('/admin/eventos-face-a-face');
                    return;
                }
                setEvento(eventData);

                const celulasData = await listarCelulasParaAdmin();
                setCelulasOptions([{ id: 'all', nome: 'Todas as Células' }, ...celulasData]);

                // Após carregar os dados base, faz o fetch inicial das inscrições
                // A chamada para fetchInscricoes aqui NÃO DEVE ter fetchInscricoes nas suas dependências.
                // Mas como fetchInscricoes é um useCallback, ele já tem suas próprias dependências de estado.
                // Isso significa que ele só será "novo" quando os filtros mudarem.
                // A primeira renderização chamará o fetchInscricoes (a versão inicial).
                // E as mudanças de filtro (no segundo useEffect) chamarão a versão atualizada.
                fetchInscricoes(); // Chama a função useCallback para o carregamento inicial dos dados

            } catch (e: any) {
                console.error("Erro ao carregar dados iniciais da página de inscrições:", e);
                addToast(`Erro ao carregar dados da página: ${e.message}`, 'error');
                router.replace('/admin/eventos-face-a-face');
            }
            // O finally de setLoading(false) já está dentro de fetchInscricoes.
        }

        if (eventoId) {
            loadInitialPageData();
        }
    }, [eventoId, router, addToast]); // <-- fetchInscricoes REMOVIDO daqui. `loading` não está aqui, OK.


    // useEffect para re-fetch das inscrições sempre que os FILTROS mudarem
    useEffect(() => {
        // Este useEffect reage a mudanças nos filtros (searchTerm, statusFilter, etc.).
        // Ele vai chamar `fetchInscricoes` APENAS quando essas variáveis de filtro mudarem.
        // A condição `!loading` garante que não tentamos buscar enquanto já estamos carregando.
        if (eventoId) { 
            const timeoutId = setTimeout(() => { 
                if (!loading) { // DISPARA A BUSCA SOMENTE SE NÃO ESTIVER EM ESTADO DE LOADING
                    fetchInscricoes();
                }
            }, 300); // Debounce para evitar muitas requisições ao digitar no campo de busca

            return () => clearTimeout(timeoutId); // Limpa o timeout em caso de nova mudança ou desmontagem
        }
    }, [statusFilter, celulaFilter, searchTerm, tipoParticipacaoFilter, eventoId]); // <-- `loading` REMOVIDO daqui. `fetchInscricoes` é um useCallback e não precisa ser dependência aqui.


    const handleDelete = async (inscricaoId: string, nomeParticipante: string) => {
        if (!confirm(`Tem certeza que deseja excluir a inscrição de "${nomeParticipante}"? Esta ação é irreversível.`)) {
            return;
        }
        setSubmitting(true);
        try {
            await excluirInscricaoFaceAFace(inscricaoId);
            addToast(`Inscrição de "${nomeParticipante}" excluída com sucesso!`, 'success');
            await fetchInscricoes(); // Recarrega a lista
        } catch (e: any) {
            console.error("Erro ao excluir inscrição:", e);
            addToast(`Falha ao excluir inscrição: ${e.message}`, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusBadge = (status: InscricaoFaceAFaceStatus) => {
        switch (status) {
            case 'PENDENTE': return 'bg-yellow-100 text-yellow-800';
            case 'AGUARDANDO_CONFIRMACAO_ENTRADA': return 'bg-orange-100 text-orange-800';
            case 'ENTRADA_CONFIRMADA': return 'bg-blue-100 text-blue-800';
            case 'AGUARDANDO_CONFIRMACAO_RESTANTE': return 'bg-purple-100 text-purple-800';
            case 'PAGO_TOTAL': return 'bg-green-100 text-green-800';
            case 'CANCELADO': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusText = (status: InscricaoFaceAFaceStatus) => {
        const option = statusPagamentoOptions.find(o => o.id === status);
        return option ? option.nome : status;
    };

    const handleExportCSV = async () => { // <-- Função de exportação CSV agora assíncrona
        if (!eventoId) {
            addToast('ID do evento não disponível para exportação.', 'error');
            return;
        }
        setSubmitting(true);
        try {
            const csvData = await exportarInscricoesCSV(eventoId, {
                statusPagamento: statusFilter,
                celulaId: celulaFilter,
                searchTerm: searchTerm.trim() || undefined,
                tipoParticipacao: tipoParticipacaoFilter === 'all' ? undefined : tipoParticipacaoFilter,
            });

            // Cria um Blob e um URL para download
            const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            if (link.download !== undefined) { // Recurso HTML5
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', `inscricoes_${evento?.nome_evento.replace(/\s/g, '_')}_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url); // Libera o URL
                addToast('Arquivo CSV exportado com sucesso!', 'success');
            } else {
                addToast('Seu navegador não suporta download automático de CSV.', 'warning');
            }
        } catch (e: any) {
            console.error("Erro ao exportar CSV:", e);
            addToast(`Falha ao exportar CSV: ${e.message}`, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleExportPDF = () => {
        // 1. Validação se há dados na tela
        if (inscricoes.length === 0) {
            addToast('Não há dados para exportar com os filtros atuais.', 'warning');
            return;
        }

        try {
            // 2. Criar instância do PDF
            const doc = new jsPDF();

            // 3. Definir Título e Data
            const titulo = `Relatório: ${evento?.nome_evento || 'Evento'}`;
            const dataGeracao = format(new Date(), 'dd/MM/yyyy HH:mm');

            // 4. Lógica Inteligente de Subtítulo (Mostra os filtros usados)
            let filtrosTexto = [];

            if (tipoParticipacaoFilter !== 'all') {
                filtrosTexto.push(`Tipo: ${tipoParticipacaoFilter}`);
            }

            if (statusFilter !== 'all') {
                const statusLabel = statusPagamentoOptions.find(o => o.id === statusFilter)?.nome || statusFilter;
                filtrosTexto.push(`Status: ${statusLabel}`);
            }

            if (celulaFilter !== 'all') {
                // Tenta achar o nome da célula na lista de opções
                const celulaLabel = celulasOptions.find(o => o.id === celulaFilter)?.nome || 'Célula Específica';
                filtrosTexto.push(`Célula: ${celulaLabel}`);
            }

            if (searchTerm) {
                filtrosTexto.push(`Busca: "${searchTerm}"`);
            }

            const subtitulo = filtrosTexto.length > 0
                ? `Filtros aplicados: ${filtrosTexto.join(' | ')}`
                : 'Listagem Completa (Sem filtros)';

            // 5. Escrever Cabeçalho no PDF
            doc.setFontSize(16);
            doc.text(titulo, 14, 20); // Título na posição X=14, Y=20
            
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`Gerado em: ${dataGeracao}`, 14, 27); // Data abaixo do título

            doc.setFontSize(9);
            doc.setTextColor(50); 
            doc.text(subtitulo, 14, 33); // Subtítulo com filtros abaixo da data

            // 6. Preparar Colunas da Tabela
            const tableColumn = [
                "Nome", 
                "Contato", 
                "Célula", 
                "Tipo", 
                "Status Pagto", 
                "Camiseta", 
                "Membro?"
            ];

            // 7. Preparar Linhas (Dados)
            const tableRows: any[] = [];

            inscricoes.forEach(inscricao => {
                const rowData = [
                    inscricao.nome_completo_participante,
                    formatPhoneNumberDisplay(inscricao.contato_pessoal),
                    inscricao.celula_participante_nome || inscricao.celula_inscricao_nome || 'N/A',
                    inscricao.tipo_participacao,
                    getStatusText(inscricao.status_pagamento),
                    inscricao.tamanho_camiseta || '-',
                    inscricao.eh_membro_ib_apascentar ? 'Sim' : 'Não'
                ];
                tableRows.push(rowData);
            });

            // 8. Gerar a Tabela
            autoTable(doc, {
                head: [tableColumn],
                body: tableRows,
                startY: 38, // Começa na altura Y=38 para não cobrir o cabeçalho
                theme: 'grid', // Estilo de grade
                headStyles: { fillColor: [60, 60, 60] }, // Cabeçalho cinza escuro profissional
                styles: { fontSize: 8, cellPadding: 2 },
            });

            // 9. Salvar Arquivo
            const fileName = `relatorio_${evento?.nome_evento.replace(/\s/g, '_')}_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`;
            doc.save(fileName);

            addToast('PDF gerado com sucesso!', 'success');

        } catch (error: any) {
            console.error("Erro ao gerar PDF:", error);
            addToast('Erro ao gerar PDF.', 'error');
        }
    };

    if (loading || !evento) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            <ToastContainer />

            {/* Header */}
            <div className="bg-gradient-to-r from-teal-600 to-cyan-600 shadow-lg px-4 pt-6 pb-12 sm:px-8">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
                            <FaUsers /> Inscrições para: {evento.nome_evento}
                        </h1>
                        <p className="text-teal-100 text-sm mt-1">Gerencie os detalhes e pagamentos das inscrições.</p>
                    </div>
                    
                    <Link
                        href="/admin/eventos-face-a-face"
                        className="inline-flex justify-center items-center px-4 py-3 sm:py-2 bg-white/20 hover:bg-white/30 active:bg-white/40 text-white rounded-lg transition-colors backdrop-blur-sm border border-white/30 text-sm font-medium w-full sm:w-auto"
                    >
                        <FaArrowLeft className="w-3 h-3 mr-2" />
                        Voltar para Eventos
                    </Link>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
                
                {/* Painel de Filtros e Exportação */}
                <div className="bg-white rounded-xl shadow-md p-4 mb-6 border border-gray-100">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3"> {/* Ajustado para 5 colunas */}
                        
                        {/* Busca por Nome/Contato */}
                        <div className="relative">
                            <FaSearch className="absolute left-3 top-3.5 text-gray-400 text-sm" />
                            <input
                                type="text"
                                placeholder="Buscar por nome ou contato..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 w-full border border-gray-300 rounded-lg py-2.5 text-base focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
                            />
                        </div>

                        {/* Filtro por Status de Pagamento */}
                        <div className="relative">
                            <FaFilter className="absolute left-3 top-3.5 text-gray-400 text-sm" />
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as InscricaoFaceAFaceStatus | 'all')}
                                className="pl-9 w-full border border-gray-300 rounded-lg py-2.5 text-base bg-white focus:ring-2 focus:ring-teal-500"
                            >
                                {statusPagamentoOptions.map(option => (
                                    <option key={option.id} value={option.id}>{option.nome}</option>
                                ))}
                            </select>
                        </div>

                        {/* Filtro por Tipo de Participação */}
                        <div className="relative">
                            <FaTransgender className="absolute left-3 top-3.5 text-gray-400 text-sm" />
                            <select
                                value={tipoParticipacaoFilter}
                                onChange={(e) => setTipoParticipacaoFilter(e.target.value as InscricaoFaceAFaceTipoParticipacao | 'all')}
                                className="pl-9 w-full border border-gray-300 rounded-lg py-2.5 text-base bg-white focus:ring-2 focus:ring-teal-500"
                            >
                                {tipoParticipacaoOptions.map(option => (
                                    <option key={option.id} value={option.id}>{option.nome}</option>
                                ))}
                            </select>
                        </div>

                        {/* Filtro por Célula */}
                        <div className="relative">
                            <FaUsers className="absolute left-3 top-3.5 text-gray-400 text-sm" />
                            <select
                                value={celulaFilter}
                                onChange={(e) => setCelulaFilter(e.target.value)}
                                className="pl-9 w-full border border-gray-300 rounded-lg py-2.5 text-base bg-white focus:ring-2 focus:ring-teal-500"
                            >
                                {celulasOptions.map(option => (
                                    <option key={option.id} value={option.id}>{option.nome}</option>
                                ))}
                            </select>
                        </div>
                        
                        {/* Botão de Limpar Filtros / Atualizar */}
                        <button
                            onClick={() => {
                                setSearchTerm('');
                                setStatusFilter('all');
                                setTipoParticipacaoFilter('all'); 
                                setCelulaFilter('all');
                                fetchInscricoes(); // Força o re-fetch
                            }}
                            className="bg-gray-100 text-gray-700 py-2.5 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm flex items-center justify-center gap-2 active:scale-95"
                        >
                            <FaSync /> Limpar / Atualizar
                        </button>
                    </div>

                    {/* Botões de Exportação */}
                    <div className="flex flex-wrap gap-3 mt-4 justify-end border-t border-gray-100 pt-4">
                        <button 
                            onClick={handleExportCSV} 
                            className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2 text-sm font-medium"
                            disabled={submitting || inscricoes.length === 0 || loading}
                        >
                            <FaFileCsv /> Exportar CSV
                        </button>
                        <button 
                            onClick={handleExportPDF} 
                            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 text-sm font-medium"
                            disabled={submitting || inscricoes.length === 0 || loading}
                        >
                            <FaFilePdf /> Exportar PDF
                        </button>
                    </div>
                </div>

                {/* Empty State */}
                {inscricoes.length === 0 && (
                    <div className="text-center p-12 bg-white border-2 border-dashed border-gray-200 rounded-2xl">
                        <FaUsers className="text-4xl text-gray-300 mx-auto mb-3" />
                        <h3 className="lg:text-lg font-semibold text-gray-700">Nenhuma inscrição encontrada</h3>
                        <p className="text-gray-500 text-sm mb-6">Nenhum líder realizou inscrições para este evento ainda ou os filtros estão muito restritivos.</p>
                        <button 
                            onClick={fetchInscricoes} 
                            className="bg-teal-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-teal-700 inline-flex items-center gap-2 shadow-md"
                        >
                            <FaSync /> Recarregar Inscrições
                        </button>
                    </div>
                )}

                {/* Tabela de Inscrições (Desktop) */}
                <div className="hidden md:block bg-white shadow-sm rounded-2xl overflow-hidden border border-gray-200">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Participante</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Contato / Célula</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Tipo Participação</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status Pagamento</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {inscricoes.map((inscricao) => (
                                    <tr key={inscricao.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{inscricao.nome_completo_participante}</div>
                                            {inscricao.eh_membro_ib_apascentar ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                                                    Membro IBA
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-800">
                                                    Não Membro
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            <div className="flex items-center gap-1">
                                                <FaPhone className="text-gray-400 text-xs" /> {formatPhoneNumberDisplay(inscricao.contato_pessoal)}
                                                {/* Botão para WhatsApp */}
                                                <a 
                                                    href={`https://wa.me/55${normalizePhoneNumber(inscricao.contato_pessoal)}`} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    className="text-green-500 hover:text-green-600 ml-1"
                                                    title="Enviar WhatsApp"
                                                >
                                                    <FaWhatsapp size={16} />
                                                </a>
                                            </div>
                                            <div className="flex items-center gap-1 mt-1">
                                                <FaUsers className="text-gray-400 text-xs" /> {inscricao.celula_participante_nome || inscricao.celula_inscricao_nome || 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{inscricao.tipo_participacao}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusBadge(inscricao.status_pagamento)}`}>
                                                {getStatusText(inscricao.status_pagamento)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <Link 
                                                    href={`/admin/eventos-face-a-face/${eventoId}/inscricoes/editar/${inscricao.id}`}
                                                    className="p-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100" title="Ver/Editar Detalhes"
                                                >
                                                    <FaEye />
                                                </Link>
                                                <button 
                                                    onClick={() => handleDelete(inscricao.id, inscricao.nome_completo_participante)}
                                                    disabled={submitting}
                                                    className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100" title="Excluir Inscrição"
                                                >
                                                    <FaTrash />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Cards de Inscrições (Mobile) */}
                <div className="md:hidden space-y-4 mt-8">
                    {inscricoes.map((inscricao) => (
                        <div key={inscricao.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col gap-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-gray-900 text-lg leading-tight">{inscricao.nome_completo_participante}</h3>
                                    <div className="flex flex-wrap gap-2 mt-1.5">
                                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${getStatusBadge(inscricao.status_pagamento)}`}>
                                            {getStatusText(inscricao.status_pagamento)}
                                        </span>
                                        {inscricao.eh_membro_ib_apascentar ? (
                                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                                                Membro IBA
                                            </span>
                                        ) : (
                                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">
                                                Não Membro
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-gray-700 font-bold text-sm">{inscricao.tipo_participacao}</p>
                                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1 justify-end">
                                        <FaUsers /> {inscricao.celula_participante_nome || inscricao.celula_inscricao_nome || 'N/A'}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="space-y-2 text-sm text-gray-700">
                                <p className="flex items-center gap-2">
                                    <FaPhone className="text-gray-500" /> Contato: {formatPhoneNumberDisplay(inscricao.contato_pessoal)}
                                    <a 
                                        href={`https://wa.me/55${normalizePhoneNumber(inscricao.contato_pessoal)}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="text-green-500 hover:text-green-600 ml-1"
                                        title="Enviar WhatsApp"
                                    >
                                        <FaWhatsapp size={16} />
                                    </a>
                                </p>
                            </div>

                            <div className="flex gap-2 border-t border-gray-100 pt-3">
                                <Link 
                                    href={`/admin/eventos-face-a-face/${eventoId}/inscricoes/editar/${inscricao.id}`}
                                    className="flex-1 bg-blue-50 text-blue-600 py-2.5 rounded-lg flex items-center justify-center gap-2 font-medium text-sm"
                                >
                                    <FaEye size={16} /> Ver/Editar
                                </Link>
                                <button 
                                    onClick={() => handleDelete(inscricao.id, inscricao.nome_completo_participante)}
                                    disabled={submitting}
                                    className="w-12 bg-red-50 text-red-600 py-2.5 rounded-lg flex items-center justify-center"
                                    title="Excluir Inscrição"
                                >
                                    <FaTrash size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

            </div>
        </div>
    );
}