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
import ConfirmationModal from '@/components/ui/ConfirmationModal';

import {
    FaArrowLeft, FaUsers, FaFilter, FaSearch, FaEdit, FaTrash, FaFileCsv, 
    FaFilePdf, FaSync, FaWhatsapp, FaTransgender, FaChevronDown,
    FaMoneyBillWave, FaCheckCircle, FaSpinner, FaInfoCircle
} from 'react-icons/fa';

// --- COMPONENTES VISUAIS ---

const SearchInput = ({ value, onChange, placeholder }: any) => (
    <div className="relative group flex-1">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <FaSearch className="text-gray-400 group-focus-within:text-purple-500 transition-colors" />
        </div>
        <input
            type="text"
            className="block w-full pl-11 pr-3 py-3.5 border border-gray-200 rounded-2xl leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all sm:text-sm font-medium"
            placeholder={placeholder}
            value={value}
            onChange={onChange}
        />
    </div>
);

const FilterSelect = ({ icon: Icon, value, onChange, options }: any) => (
    <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
            <Icon className="text-gray-400 group-hover:text-purple-500 transition-colors" />
        </div>
        <select
            value={value}
            onChange={onChange}
            className="block w-full pl-11 pr-10 py-3.5 text-sm border-gray-200 focus:outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 rounded-2xl appearance-none bg-gray-50 border hover:border-purple-300 transition-all cursor-pointer font-bold text-gray-600"
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
    const [allInscricoes, setAllInscricoes] = useState<InscricaoFaceAFace[]>([]);
    const [filteredInscricoes, setFilteredInscricoes] = useState<InscricaoFaceAFace[]>([]);
    const [celulasOptions, setCelulasOptions] = useState<CelulaOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Estado para o Modal de Confirmação
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string; name: string }>({
        isOpen: false, id: '', name: ''
    });

    // Filtros
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<InscricaoFaceAFaceStatus | 'all'>('all');
    const [celulaFilter, setCelulaFilter] = useState<string | 'all'>('all');
    const [tipoParticipacaoFilter, setTipoParticipacaoFilter] = useState<InscricaoFaceAFaceTipoParticipacao | 'all'>('all'); 

    const router = useRouter();
    const { addToast, ToastContainer } = useToast();

    const fetchAllData = useCallback(async () => {
        setLoading(true);
        try {
            if (!eventoId) return;
            const fetchedInscricoes = await listarInscricoesFaceAFacePorEvento(eventoId);
            setAllInscricoes(fetchedInscricoes);
            setFilteredInscricoes(fetchedInscricoes);
        } catch (e: any) {
            addToast(`Erro ao carregar: ${e.message}`, 'error');
        } finally { setLoading(false); }
    }, [eventoId, addToast]); 

    useEffect(() => {
        let result = allInscricoes;
        if (searchTerm.trim() !== '') {
            const term = searchTerm.toLowerCase();
            result = result.filter(i => i.nome_completo_participante.toLowerCase().includes(term) || (i.contato_pessoal && i.contato_pessoal.includes(term)));
        }
        if (statusFilter !== 'all') result = result.filter(i => i.status_pagamento === statusFilter);
        if (tipoParticipacaoFilter !== 'all') result = result.filter(i => i.tipo_participacao === tipoParticipacaoFilter);
        if (celulaFilter !== 'all') result = result.filter(i => i.celula_id === celulaFilter || i.celula_inscricao_id === celulaFilter);
        setFilteredInscricoes(result);
    }, [allInscricoes, searchTerm, statusFilter, tipoParticipacaoFilter, celulaFilter]);

    useEffect(() => {
        async function loadInitialPageData() {
            setLoading(true);
            try {
                const eventData = await getEventoFaceAFace(eventoId);
                if (!eventData) { router.replace('/admin/eventos-face-a-face'); return; }
                setEvento(eventData);
                const celulasData = await listarCelulasParaAdmin();
                setCelulasOptions([{ id: 'all', nome: 'Todas as Células' }, ...celulasData]);
                await fetchAllData();
            } catch (e) { router.replace('/admin/eventos-face-a-face'); }
        }
        if (eventoId) loadInitialPageData();
    }, [eventoId, router, fetchAllData]); 

    const confirmDelete = (id: string, name: string) => setDeleteModal({ isOpen: true, id, name });

    const executeDelete = async () => {
        setSubmitting(true);
        try {
            await excluirInscricaoFaceAFace(deleteModal.id);
            addToast('Inscrição removida!', 'success');
            await fetchAllData();
        } catch (e: any) { addToast(`Erro ao excluir: ${e.message}`, 'error'); } finally { 
            setSubmitting(false); 
            setDeleteModal({ isOpen: false, id: '', name: '' });
        }
    };

    const getStatusStyle = (status: InscricaoFaceAFaceStatus) => {
        switch (status) {
            case 'PENDENTE': return 'bg-amber-50 text-amber-700 border-amber-100';
            case 'ENTRADA_CONFIRMADA': return 'bg-blue-50 text-blue-700 border-blue-100';
            case 'PAGO_TOTAL': return 'bg-green-50 text-green-700 border-green-100';
            case 'CANCELADO': return 'bg-red-50 text-red-700 border-red-100';
            default: return 'bg-gray-50 text-gray-700 border-gray-100';
        }
    };

    const handleExportCSV = async () => {
        setSubmitting(true);
        try {
            const csvData = await exportarInscricoesCSV(eventoId, { statusPagamento: statusFilter, celulaId: celulaFilter, searchTerm: searchTerm.trim() || undefined });
            const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `inscricoes_${evento?.nome_evento.replace(/\s/g, '_')}.csv`;
            link.click();
            addToast('CSV exportado!', 'success');
        } catch (e: any) { addToast('Erro no CSV', 'error'); } finally { setSubmitting(false); }
    };

    if (loading || !evento) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><LoadingSpinner /></div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-12 font-sans">
            <ToastContainer />
            <ConfirmationModal 
                isOpen={deleteModal.isOpen}
                title="Excluir Inscrição?"
                message={`Deseja realmente remover a inscrição de ${deleteModal.name}? Esta ação é definitiva.`}
                variant="danger"
                onConfirm={executeDelete}
                onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
                loading={submitting}
            />

            {/* Header Admin */}
            <div className="bg-gradient-to-br from-purple-700 to-indigo-800 shadow-lg px-4 pt-8 pb-20 sm:px-8 border-b border-indigo-500/20">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-5">
                        <Link href="/admin/eventos-face-a-face" className="bg-white/20 p-3 rounded-2xl text-white hover:bg-white/30 transition-all active:scale-90 backdrop-blur-md border border-white/10">
                            <FaArrowLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-black text-white tracking-tight">{evento.nome_evento}</h1>
                            <p className="text-purple-100 text-sm font-bold opacity-80 uppercase tracking-widest">Painel Administrativo de Inscrições</p>
                        </div>
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                        <button onClick={handleExportCSV} disabled={submitting} className="flex-1 md:flex-none bg-white/10 hover:bg-white/20 text-white px-5 py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 border border-white/10 transition-all">
                            <FaFileCsv /> CSV
                        </button>
                        <button onClick={fetchAllData} className="p-3.5 bg-white/10 text-white rounded-2xl border border-white/10 hover:bg-white/20 transition-all"><FaSync className={loading ? 'animate-spin' : ''}/></button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-8 -mt-10">
                
                {/* Filtros */}
                <div className="bg-white rounded-[2rem] shadow-xl p-5 mb-8 border border-gray-100 flex flex-col gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <SearchInput value={searchTerm} onChange={(e: any) => setSearchTerm(e.target.value)} placeholder="Buscar nome..." />
                        <FilterSelect icon={FaMoneyBillWave} value={statusFilter} onChange={(e: any) => setStatusFilter(e.target.value)} options={[{id:'all',nome:'Todos os Status'},{id:'PENDENTE',nome:'Pendente'},{id:'ENTRADA_CONFIRMADA',nome:'Entrada OK'},{id:'PAGO_TOTAL',nome:'Pago Total'}]} />
                        <FilterSelect icon={FaTransgender} value={tipoParticipacaoFilter} onChange={(e: any) => setTipoParticipacaoFilter(e.target.value)} options={[{id:'all',nome:'Todos os Papéis'},{id:'Encontrista',nome:'Encontrista'},{id:'Encontreiro',nome:'Encontreiro'}]} />
                        <FilterSelect icon={FaUsers} value={celulaFilter} onChange={(e: any) => setCelulaFilter(e.target.value)} options={celulasOptions} />
                    </div>
                </div>

                {/* Listagem em Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {filteredInscricoes.map((inscricao) => (
                        <div key={inscricao.id} className="bg-white rounded-[2rem] shadow-lg border border-gray-100 p-6 flex flex-col hover:shadow-2xl transition-all duration-300 group">
                            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                                <div className="flex items-center gap-5 min-w-0 flex-1">
                                    <div className="w-16 h-16 rounded-2xl shrink-0 flex items-center justify-center text-2xl font-black shadow-inner transform -rotate-3 group-hover:rotate-0 transition-transform bg-purple-100 text-purple-600">
                                        {inscricao.nome_completo_participante.charAt(0)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="text-xl font-black text-gray-900 truncate group-hover:text-purple-600 transition-colors">{inscricao.nome_completo_participante}</h3>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border ${getStatusStyle(inscricao.status_pagamento)}`}>
                                                {inscricao.status_pagamento.replace(/_/g, ' ')}
                                            </span>
                                            <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border bg-indigo-50 text-indigo-600 border-indigo-100">
                                                {inscricao.tipo_participacao}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 rounded-3xl p-5 mb-6 border border-gray-100">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Célula Responsável</p>
                                    <p className="text-sm font-bold text-gray-700 truncate">{inscricao.celula_participante_nome || inscricao.celula_inscricao_nome || 'N/A'}</p>
                                </div>
                                <div className="space-y-1 border-l border-gray-200 pl-5">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Contato</p>
                                    <p className="text-sm font-bold text-gray-700">{formatPhoneNumberDisplay(inscricao.contato_pessoal)}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0 border-t border-gray-50 pt-4 mt-auto">
                                <a href={`https://wa.me/55${normalizePhoneNumber(inscricao.contato_pessoal)}`} target="_blank" className="p-4 bg-green-50 text-green-600 rounded-2xl hover:bg-green-100 transition-all active:scale-90"><FaWhatsapp size={20} /></a>
                                <div className="flex-1" />
                                <Link href={`/admin/eventos-face-a-face/${eventoId}/inscricoes/editar/${inscricao.id}`} className="p-4 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-100 transition-all active:scale-90"><FaEdit size={20} /></Link>
                                <button onClick={() => confirmDelete(inscricao.id, inscricao.nome_completo_participante)} disabled={submitting} className="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition-all active:scale-90"><FaTrash size={18} /></button>
                            </div>
                        </div>
                    ))}
                </div>

                {filteredInscricoes.length === 0 && !loading && (
                    <div className="text-center py-20 bg-white rounded-[3rem] shadow-inner border border-dashed border-gray-200">
                        <FaUsers size={48} className="mx-auto text-gray-200 mb-4" />
                        <h3 className="text-lg font-bold text-gray-400">Nenhuma inscrição encontrada para os filtros aplicados</h3>
                    </div>
                )}
            </div>
        </div>
    );
}