'use client';

import { format } from 'date-fns';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
    listarInscricoesFaceAFacePorEvento,
    excluirInscricaoFaceAFace,
    getEventoFaceAFace,
    listarCelulasParaAdmin,
    exportarInscricoesCSV
} from '@/lib/data';
import {
    InscricaoFaceAFace,
    InscricaoFaceAFaceStatus,
    EventoFaceAFace,
    CelulaOption,
    InscricaoFaceAFaceTipoParticipacao
} from '@/lib/types';
import { 
    formatPhoneNumberDisplay,
    normalizePhoneNumber 
} from '@/utils/formatters';
import useToast from '@/hooks/useToast';
import LoadingSpinner from '@/components/LoadingSpinner';

import {
    FaArrowLeft, FaUsers, FaFilter, FaSearch, FaEdit, FaTrash, FaFileCsv, 
    FaFilePdf, FaSync, FaEye, FaWhatsapp, FaPhone, FaTransgender, FaChevronDown,
    FaMoneyBillWave
} from 'react-icons/fa';

// --- COMPONENTES VISUAIS INTERNOS ---

const SearchInput = ({ value, onChange, placeholder }: any) => (
    <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FaSearch className="text-gray-400 group-focus-within:text-purple-500 transition-colors" />
        </div>
        <input
            type="text"
            className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 sm:text-sm"
            placeholder={placeholder}
            value={value}
            onChange={onChange}
        />
    </div>
);

const FilterSelect = ({ icon: Icon, value, onChange, options }: any) => (
    <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
            <Icon className="text-gray-400 group-hover:text-purple-500 transition-colors" />
        </div>
        <select
            value={value}
            onChange={onChange}
            className="block w-full pl-10 pr-10 py-2.5 text-base border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-xl appearance-none bg-white border hover:border-purple-300 transition-all cursor-pointer truncate"
        >
            {options.map((opt: any) => (
                <option key={opt.id} value={opt.id}>{opt.nome}</option>
            ))}
        </select>
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <FaChevronDown className="h-3 w-3 text-gray-400" />
        </div>
    </div>
);

// --- PÁGINA PRINCIPAL ---

export default function AdminListagemInscricoesPage() {
    const params = useParams();
    const eventoId = params.evento_id as string;

    const [evento, setEvento] = useState<EventoFaceAFace | null>(null);
    
    // Separação de dados: Todos vs Filtrados
    const [allInscricoes, setAllInscricoes] = useState<InscricaoFaceAFace[]>([]);
    const [filteredInscricoes, setFilteredInscricoes] = useState<InscricaoFaceAFace[]>([]);
    
    const [celulasOptions, setCelulasOptions] = useState<CelulaOption[]>([]);

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Filtros
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<InscricaoFaceAFaceStatus | 'all'>('all');
    const [celulaFilter, setCelulaFilter] = useState<string | 'all'>('all');
    const [tipoParticipacaoFilter, setTipoParticipacaoFilter] = useState<InscricaoFaceAFaceTipoParticipacao | 'all'>('all'); 

    const router = useRouter();
    const { addToast, ToastContainer } = useToast();

    const statusPagamentoOptions = [
        { id: 'all', nome: 'Status: Todos' },
        { id: 'PENDENTE', nome: 'Pendente' },
        { id: 'AGUARDANDO_CONFIRMACAO_ENTRADA', nome: 'Aguard. Entrada' },
        { id: 'ENTRADA_CONFIRMADA', nome: 'Entrada OK' },
        { id: 'AGUARDANDO_CONFIRMACAO_RESTANTE', nome: 'Aguard. Restante' },
        { id: 'PAGO_TOTAL', nome: 'Pago Total' },
        { id: 'CANCELADO', nome: 'Cancelado' },
    ];

    const tipoParticipacaoOptions = [
        { id: 'all', nome: 'Tipo: Todos' },
        { id: 'Encontrista', nome: 'Encontrista' },
        { id: 'Encontreiro', nome: 'Encontreiro' },
    ];

    // Carrega TODOS os dados do servidor uma única vez (ou ao forçar atualização)
    const fetchAllData = useCallback(async () => {
        setLoading(true);
        try {
            if (!eventoId) return;

            // Busca SEM filtros no servidor para pegar tudo
            const fetchedInscricoes = await listarInscricoesFaceAFacePorEvento(eventoId);
            setAllInscricoes(fetchedInscricoes);
            setFilteredInscricoes(fetchedInscricoes); // Inicialmente, filtrados = todos
        } catch (e: any) {
            console.error("Erro ao carregar inscrições:", e);
            addToast(`Erro ao carregar: ${e.message}`, 'error');
        } finally { setLoading(false); }
    }, [eventoId, addToast]); 

    // Lógica de Filtragem Local (Executa instantaneamente quando um filtro muda)
    useEffect(() => {
        let result = allInscricoes;

        // 1. Filtro de Texto (Nome ou Contato)
        if (searchTerm.trim() !== '') {
            const term = searchTerm.toLowerCase();
            result = result.filter(i => 
                i.nome_completo_participante.toLowerCase().includes(term) ||
                (i.contato_pessoal && i.contato_pessoal.includes(term))
            );
        }

        // 2. Filtro de Status
        if (statusFilter !== 'all') {
            result = result.filter(i => i.status_pagamento === statusFilter);
        }

        // 3. Filtro de Tipo
        if (tipoParticipacaoFilter !== 'all') {
            result = result.filter(i => i.tipo_participacao === tipoParticipacaoFilter);
        }

        // 4. Filtro de Célula
        if (celulaFilter !== 'all') {
            result = result.filter(i => 
                i.celula_id === celulaFilter || i.celula_inscricao_id === celulaFilter
            );
        }

        setFilteredInscricoes(result);
    }, [allInscricoes, searchTerm, statusFilter, tipoParticipacaoFilter, celulaFilter]);


    // Carregamento Inicial da Página
    useEffect(() => {
        async function loadInitialPageData() {
            setLoading(true);
            try {
                const eventData = await getEventoFaceAFace(eventoId);
                if (!eventData) {
                    addToast('Evento não encontrado.', 'error');
                    router.replace('/admin/eventos-face-a-face');
                    return;
                }
                setEvento(eventData);
                const celulasData = await listarCelulasParaAdmin();
                setCelulasOptions([{ id: 'all', nome: 'Célula: Todas' }, ...celulasData]);
                
                await fetchAllData(); // Busca inscrições
            } catch (e: any) {
                addToast(`Erro: ${e.message}`, 'error');
                router.replace('/admin/eventos-face-a-face');
            }
        }
        if (eventoId) loadInitialPageData();
    }, [eventoId, router, addToast, fetchAllData]); 

    const handleDelete = async (inscricaoId: string, nomeParticipante: string) => {
        if (!confirm(`Excluir a inscrição de "${nomeParticipante}"?`)) return;
        setSubmitting(true);
        try {
            await excluirInscricaoFaceAFace(inscricaoId);
            addToast('Inscrição excluída.', 'success');
            await fetchAllData(); // Recarrega do servidor para garantir sincronia
        } catch (e: any) {
            addToast(`Erro ao excluir: ${e.message}`, 'error');
        } finally { setSubmitting(false); }
    };

    const getStatusBadge = (status: InscricaoFaceAFaceStatus) => {
        switch (status) {
            case 'PENDENTE': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'AGUARDANDO_CONFIRMACAO_ENTRADA': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'ENTRADA_CONFIRMADA': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'AGUARDANDO_CONFIRMACAO_RESTANTE': return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'PAGO_TOTAL': return 'bg-green-100 text-green-800 border-green-200';
            case 'CANCELADO': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusText = (status: InscricaoFaceAFaceStatus) => {
        const option = statusPagamentoOptions.find(o => o.id === status);
        return option ? option.nome.replace('Status: ', '').replace('Aguard.', 'Aguardando') : status;
    };

    const handleExportCSV = async () => {
        if (!eventoId) return;
        setSubmitting(true);
        try {
            // Nota: Continuamos exportando via servidor para garantir formato correto,
            // mas enviamos os filtros atuais para o servidor processar igual.
            const csvData = await exportarInscricoesCSV(eventoId, {
                statusPagamento: statusFilter,
                celulaId: celulaFilter,
                searchTerm: searchTerm.trim() || undefined,
                tipoParticipacao: tipoParticipacaoFilter === 'all' ? undefined : tipoParticipacaoFilter,
            });
            const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', `inscricoes_${evento?.nome_evento.replace(/\s/g, '_')}_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                addToast('CSV exportado!', 'success');
            }
        } catch (e: any) { addToast(`Erro CSV: ${e.message}`, 'error'); } finally { setSubmitting(false); }
    };

    const handleExportPDF = () => {
        if (filteredInscricoes.length === 0) return addToast('Sem dados para exportar.', 'warning');
        try {
            const doc = new jsPDF();
            doc.setFontSize(16); doc.text(`Relatório: ${evento?.nome_evento}`, 14, 20);
            doc.setFontSize(10); doc.setTextColor(100); doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')} | Filtros Aplicados`, 14, 27);
            
            autoTable(doc, {
                head: [["Nome", "Contato", "Célula", "Tipo", "Status", "Membro?"]],
                body: filteredInscricoes.map(i => [
                    i.nome_completo_participante,
                    formatPhoneNumberDisplay(i.contato_pessoal),
                    i.celula_participante_nome || i.celula_inscricao_nome || '-',
                    i.tipo_participacao,
                    getStatusText(i.status_pagamento),
                    i.eh_membro_ib_apascentar ? 'Sim' : 'Não'
                ]),
                startY: 35, theme: 'grid', headStyles: { fillColor: [100, 50, 150] }, styles: { fontSize: 8 }
            });
            doc.save(`relatorio_${evento?.nome_evento}_.pdf`);
            addToast('PDF gerado!', 'success');
        } catch (error: any) { addToast('Erro ao gerar PDF.', 'error'); }
    };

    if (loading || !evento) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><LoadingSpinner /></div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            <ToastContainer />

            {/* Header Admin (Roxo) */}
            <div className="bg-gradient-to-r from-purple-700 to-pink-600 shadow-xl px-4 pt-8 pb-16 sm:px-8">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
                            <FaUsers /> {evento.nome_evento}
                        </h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="bg-white/20 text-white px-2 py-0.5 rounded text-xs font-semibold backdrop-blur-md">Admin Dashboard</span>
                            <p className="text-purple-100 text-sm">Gerencie todas as inscrições</p>
                        </div>
                    </div>
                    
                    <Link
                        href="/admin/eventos-face-a-face"
                        className="inline-flex justify-center items-center px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors backdrop-blur-sm border border-white/20 text-sm font-medium"
                    >
                        <FaArrowLeft className="w-3 h-3 mr-2" /> Voltar
                    </Link>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10">
                
                {/* Painel de Controle */}
                <div className="bg-white rounded-2xl shadow-lg p-5 mb-6 border border-gray-100">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        <SearchInput value={searchTerm} onChange={(e: any) => setSearchTerm(e.target.value)} placeholder="Buscar nome..." />
                        <FilterSelect icon={FaMoneyBillWave} value={statusFilter} onChange={(e: any) => setStatusFilter(e.target.value)} options={statusPagamentoOptions} />
                        <FilterSelect icon={FaTransgender} value={tipoParticipacaoFilter} onChange={(e: any) => setTipoParticipacaoFilter(e.target.value)} options={tipoParticipacaoOptions} />
                        <FilterSelect icon={FaUsers} value={celulaFilter} onChange={(e: any) => setCelulaFilter(e.target.value)} options={celulasOptions} />
                        
                        <button onClick={() => { setSearchTerm(''); setStatusFilter('all'); setTipoParticipacaoFilter('all'); setCelulaFilter('all'); fetchAllData(); }}
                            className="bg-gray-100 text-gray-700 py-2.5 rounded-xl hover:bg-gray-200 transition-colors font-medium text-sm flex items-center justify-center gap-2 active:scale-95 border border-gray-200"
                        >
                            <FaSync /> Limpar
                        </button>
                    </div>

                    <div className="flex flex-wrap gap-3 mt-5 justify-end border-t border-gray-100 pt-4">
                        <span className="text-xs text-gray-400 self-center mr-auto font-medium">
                            Exibindo: {filteredInscricoes.length} de {allInscricoes.length}
                        </span>
                        <button onClick={handleExportCSV} disabled={submitting || !filteredInscricoes.length} className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900 transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-wide">
                            <FaFileCsv /> CSV
                        </button>
                        <button onClick={handleExportPDF} disabled={submitting || !filteredInscricoes.length} className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-wide">
                            <FaFilePdf /> PDF
                        </button>
                    </div>
                </div>

                {/* Empty State */}
                {filteredInscricoes.length === 0 && !loading && (
                    <div className="text-center p-12 bg-white border-2 border-dashed border-gray-200 rounded-2xl">
                        <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FaUsers className="text-2xl text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-700">Nenhum resultado</h3>
                        <p className="text-gray-500 text-sm mb-6">Tente ajustar os filtros ou busque por outro nome.</p>
                        <button onClick={() => {setSearchTerm(''); setStatusFilter('all');}} className="text-purple-600 font-bold text-sm hover:underline">Limpar filtros</button>
                    </div>
                )}

                {/* Tabela Desktop */}
                <div className="hidden md:block bg-white shadow-sm rounded-2xl overflow-hidden border border-gray-200">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Participante</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Contato / Célula</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tipo</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status Financeiro</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredInscricoes.map((inscricao) => (
                                    <tr key={inscricao.id} className="hover:bg-purple-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-900">{inscricao.nome_completo_participante}</div>
                                            <div className="mt-1">
                                                {inscricao.eh_membro_ib_apascentar ? 
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">MEMBRO</span> : 
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-100">EXTERNO</span>
                                                }
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            <div className="flex items-center gap-2 mb-1">
                                                <a href={`https://wa.me/55${normalizePhoneNumber(inscricao.contato_pessoal)}`} target="_blank" className="text-green-600 hover:text-green-700 bg-green-50 p-1 rounded-full"><FaWhatsapp /></a>
                                                {formatPhoneNumberDisplay(inscricao.contato_pessoal)}
                                            </div>
                                            <div className="text-xs text-gray-500 flex items-center gap-1">
                                                <FaUsers className="text-gray-300" /> {inscricao.celula_participante_nome || inscricao.celula_inscricao_nome || '-'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-700">{inscricao.tipo_participacao}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${getStatusBadge(inscricao.status_pagamento)}`}>
                                                {getStatusText(inscricao.status_pagamento)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <Link href={`/admin/eventos-face-a-face/${eventoId}/inscricoes/editar/${inscricao.id}`} className="p-2 text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors border border-purple-100"><FaEdit /></Link>
                                                <button onClick={() => handleDelete(inscricao.id, inscricao.nome_completo_participante)} disabled={submitting} className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors border border-red-100"><FaTrash /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Cards Mobile (Otimizados) */}
                <div className="md:hidden space-y-4 mt-6">
                    {filteredInscricoes.map((inscricao) => (
                        <div key={inscricao.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 flex flex-col gap-4 active:border-purple-300 transition-colors">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-gray-900 text-lg leading-snug">{inscricao.nome_completo_participante}</h3>
                                    <div className="flex gap-2 mt-2">
                                        {inscricao.eh_membro_ib_apascentar ? 
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">MEMBRO</span> : 
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-100">EXTERNO</span>
                                        }
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">{inscricao.tipo_participacao}</span>
                                    </div>
                                </div>
                                <div className="bg-gray-50 p-2 rounded-lg">
                                    <FaUsers className="text-gray-400" />
                                </div>
                            </div>
                            
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${getStatusBadge(inscricao.status_pagamento)}`}>
                                        {getStatusText(inscricao.status_pagamento)}
                                    </span>
                                    <a href={`https://wa.me/55${normalizePhoneNumber(inscricao.contato_pessoal)}`} target="_blank" className="flex items-center gap-1 text-green-600 text-sm font-bold bg-green-50 px-2 py-1 rounded-lg border border-green-100">
                                        <FaWhatsapp /> WhatsApp
                                    </a>
                                </div>
                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                    Célula: <span className="text-gray-700 font-medium">{inscricao.celula_participante_nome || inscricao.celula_inscricao_nome || 'N/A'}</span>
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                                <Link href={`/admin/eventos-face-a-face/${eventoId}/inscricoes/editar/${inscricao.id}`} className="bg-purple-50 text-purple-700 py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm border border-purple-100">
                                    <FaEdit /> Detalhes
                                </Link>
                                <button onClick={() => handleDelete(inscricao.id, inscricao.nome_completo_participante)} disabled={submitting} className="bg-red-50 text-red-600 py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm border border-red-100">
                                    <FaTrash /> Excluir
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

            </div>
        </div>
    );
}