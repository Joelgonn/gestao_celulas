'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    listarEventosFaceAFaceAdmin,
    excluirEventoFaceAFace,
    toggleAtivacaoEventoFaceAFace,
} from '@/lib/data';
import {
    EventoFaceAFaceOption,
    EventoFaceAFaceTipo,
} from '@/lib/types';
import { formatDateForDisplay } from '@/utils/formatters';
import useToast from '@/hooks/useToast';
import LoadingSpinner from '@/components/LoadingSpinner';
import ConfirmationModal from '@/components/ui/ConfirmationModal';

import {
    FaPlus, FaEdit, FaTrash, FaToggleOn, FaToggleOff, FaSearch, FaFilter, 
    FaCalendarCheck, FaUsers, FaSync, FaChevronDown, FaArrowLeft, FaMoneyBillWave, FaClock,
    FaCheckCircle // Adicionado para corrigir o erro de build
} from 'react-icons/fa';

// --- COMPONENTES VISUAIS DE FILTRO ---

const SearchInput = ({ value, onChange, placeholder }: any) => (
    <div className="relative group flex-1">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <FaSearch className="text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
        </div>
        <input
            type="text"
            className="block w-full pl-11 pr-3 py-3.5 border border-gray-200 rounded-2xl leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all sm:text-sm font-medium"
            placeholder={placeholder}
            value={value}
            onChange={onChange}
        />
    </div>
);

const FilterSelect = ({ icon: Icon, value, onChange, children }: any) => (
    <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
            <Icon className="text-gray-400 group-hover:text-emerald-500 transition-colors" />
        </div>
        <select
            value={value}
            onChange={onChange}
            className="block w-full pl-11 pr-10 py-3.5 text-sm border-gray-200 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 rounded-2xl appearance-none bg-gray-50 border hover:border-emerald-300 transition-all cursor-pointer font-bold text-gray-600"
        >
            {children}
        </select>
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <FaChevronDown className="h-3 w-3 text-gray-400" />
        </div>
    </div>
);

// --- PÁGINA ---

export default function AdminEventosFaceAFacePage() {
    const [eventos, setEventos] = useState<EventoFaceAFaceOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Estados para o Modal de Confirmação Único
    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        variant: 'danger' | 'warning' | 'info';
        onConfirm: () => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        variant: 'info',
        onConfirm: () => {},
    });

    // Filtros
    const [searchTerm, setSearchTerm] = useState('');
    const [tipoFilter, setTipoFilter] = useState<EventoFaceAFaceTipo | 'all'>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'ativo' | 'inativo'>('all');

    const { addToast, ToastContainer } = useToast();

    const fetchEventos = useCallback(async () => {
        setLoading(true);
        try {
            const data = await listarEventosFaceAFaceAdmin(searchTerm, tipoFilter, statusFilter);
            setEventos(data);
        } catch (e: any) {
            addToast(`Erro: ${e.message}`, 'error');
        } finally { setLoading(false); }
    }, [searchTerm, tipoFilter, statusFilter, addToast]);

    useEffect(() => { fetchEventos(); }, [fetchEventos]);

    // Modal de Exclusão
    const confirmDelete = (evento: EventoFaceAFaceOption) => {
        setModalConfig({
            isOpen: true,
            title: 'Excluir Evento?',
            message: `Tem certeza que deseja apagar permanentemente o evento "${evento.nome}"? Todas as inscrições associadas serão perdidas.`,
            variant: 'danger',
            onConfirm: async () => {
                setModalConfig(prev => ({ ...prev, isOpen: false }));
                setSubmitting(true);
                try {
                    await excluirEventoFaceAFace(evento.id);
                    addToast(`Evento excluído!`, 'success');
                    await fetchEventos();
                } catch (e: any) {
                    addToast(`Erro: ${e.message}`, 'error');
                } finally { setSubmitting(false); }
            }
        });
    };

    // Modal de Ativação/Desativação
    const confirmToggleStatus = (evento: EventoFaceAFaceOption) => {
        const novoStatus = !evento.ativa_para_inscricao;
        setModalConfig({
            isOpen: true,
            title: novoStatus ? 'Ativar Inscrições?' : 'Desativar Inscrições?',
            message: novoStatus 
                ? `Ao ativar, o link público permitirá novas inscrições para o evento "${evento.nome}".`
                : `Ao desativar, ninguém poderá se inscrever no evento "${evento.nome}" através do link público.`,
            variant: novoStatus ? 'info' : 'warning',
            onConfirm: async () => {
                setModalConfig(prev => ({ ...prev, isOpen: false }));
                setSubmitting(true);
                try {
                    await toggleAtivacaoEventoFaceAFace(evento.id, evento.ativa_para_inscricao);
                    addToast(`Status atualizado!`, 'success');
                    await fetchEventos();
                } catch (e: any) {
                    addToast(`Erro: ${e.message}`, 'error');
                } finally { setSubmitting(false); }
            }
        });
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><LoadingSpinner /></div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-12 font-sans">
            <ToastContainer />

            <ConfirmationModal 
                isOpen={modalConfig.isOpen}
                title={modalConfig.title}
                message={modalConfig.message}
                variant={modalConfig.variant}
                onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
                onConfirm={modalConfig.onConfirm}
                loading={submitting}
            />

            {/* Header Emerald */}
            <div className="bg-gradient-to-br from-emerald-600 to-green-700 shadow-lg px-4 pt-8 pb-20 sm:px-8">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md border border-white/10 text-white">
                            <FaCalendarCheck size={24} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-white tracking-tight">Eventos Face a Face</h1>
                            <p className="text-emerald-50 text-sm font-bold opacity-80 uppercase tracking-widest">Gestão de Edições</p>
                        </div>
                    </div>
                    
                    <div className="flex gap-3 w-full md:w-auto">
                        <Link
                            href="/admin/eventos-face-a-face/novo"
                            className="flex-1 md:flex-none bg-white text-emerald-700 py-3.5 px-8 rounded-2xl hover:bg-emerald-50 transition-all font-black text-sm shadow-xl flex items-center justify-center gap-2 active:scale-95"
                        >
                            <FaPlus /> Nova Edição
                        </Link>
                        <Link 
                            href="/dashboard"
                            className="bg-white/10 hover:bg-white/20 text-white p-3.5 rounded-2xl transition-all backdrop-blur-md border border-white/10"
                        >
                            <FaArrowLeft />
                        </Link>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-8 -mt-10">
                
                {/* Filtros Modernos */}
                <div className="bg-white rounded-3xl shadow-xl p-5 mb-8 border border-gray-100 flex flex-col lg:flex-row gap-4">
                    <SearchInput value={searchTerm} onChange={(e: any) => setSearchTerm(e.target.value)} placeholder="Qual edição você procura?" />
                    
                    <div className="flex flex-col sm:flex-row gap-4">
                        <FilterSelect icon={FaUsers} value={tipoFilter} onChange={(e: any) => setTipoFilter(e.target.value as any)}>
                            <option value="all">Todos os Tipos</option>
                            <option value="Mulheres">Mulheres</option>
                            <option value="Homens">Homens</option>
                        </FilterSelect>

                        <FilterSelect icon={FaCheckCircle} value={statusFilter} onChange={(e: any) => setStatusFilter(e.target.value as any)}>
                            <option value="all">Todos os Status</option>
                            <option value="ativo">Inscrições Abertas</option>
                            <option value="inativo">Inscrições Fechadas</option>
                        </FilterSelect>
                        
                        <button 
                            onClick={() => { setSearchTerm(''); setTipoFilter('all'); setStatusFilter('all'); }}
                            className="bg-gray-100 text-gray-500 p-4 rounded-2xl hover:bg-gray-200 transition-all active:scale-95 flex items-center justify-center"
                            title="Limpar Filtros"
                        >
                            <FaSync />
                        </button>
                    </div>
                </div>

                {/* Listagem em Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {eventos.map((evento) => {
                        const isActive = evento.ativa_para_inscricao;
                        return (
                            <div key={evento.id} className="bg-white rounded-[2.5rem] shadow-lg border border-gray-100 overflow-hidden hover:shadow-2xl transition-all duration-300 group">
                                <div className="p-8 space-y-6">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-2">
                                            <div className="flex gap-2">
                                                <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border ${
                                                    evento.tipo === 'Mulheres' ? 'bg-pink-50 text-pink-600 border-pink-100' : 'bg-blue-50 text-blue-600 border-blue-100'
                                                }`}>
                                                    {evento.tipo}
                                                </span>
                                                <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border ${
                                                    isActive ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'
                                                }`}>
                                                    {isActive ? 'Aberto' : 'Fechado'}
                                                </span>
                                            </div>
                                            <h3 className="text-2xl font-black text-gray-900 group-hover:text-emerald-600 transition-colors leading-tight">
                                                {evento.nome}
                                            </h3>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xl font-black text-gray-800">R$ {evento.valor_total.toFixed(2).replace('.', ',')}</p>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase">Valor Total</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-3xl p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white rounded-xl shadow-sm text-emerald-600"><FaCalendarCheck size={14}/></div>
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-black text-gray-400 uppercase truncate">Início</p>
                                                <p className="text-sm font-bold text-gray-700">{formatDateForDisplay(evento.data_inicio)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white rounded-xl shadow-sm text-orange-600"><FaClock size={14}/></div>
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-black text-gray-400 uppercase truncate">Encerramento</p>
                                                <p className="text-sm font-bold text-gray-700">{formatDateForDisplay(evento.data_fim)}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-50">
                                        <Link 
                                            href={`/admin/eventos-face-a-face/${evento.id}/inscricoes`}
                                            className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
                                        >
                                            <FaUsers /> Inscrições
                                        </Link>
                                        
                                        <div className="flex gap-2 w-full sm:w-auto">
                                            <Link 
                                                href={`/admin/eventos-face-a-face/editar/${evento.id}`}
                                                className="p-4 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-100 transition-colors"
                                                title="Editar Edição"
                                            >
                                                <FaEdit size={20} />
                                            </Link>
                                            <button 
                                                onClick={() => confirmToggleStatus(evento)}
                                                className={`p-4 rounded-2xl transition-all active:scale-90 ${
                                                    isActive ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                                }`}
                                                title={isActive ? "Desativar Inscrições" : "Ativar Inscrições"}
                                            >
                                                {isActive ? <FaToggleOn size={20} /> : <FaToggleOff size={20} />}
                                            </button>
                                            <button 
                                                onClick={() => confirmDelete(evento)}
                                                className="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition-colors"
                                                title="Excluir Evento"
                                            >
                                                <FaTrash size={20} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {eventos.length === 0 && (
                    <div className="text-center py-20 bg-white rounded-[3rem] shadow-inner border border-dashed border-gray-200">
                        <FaCalendarCheck size={48} className="mx-auto text-gray-200 mb-4" />
                        <h3 className="text-lg font-bold text-gray-400">Nenhum evento encontrado</h3>
                    </div>
                )}
            </div>
        </div>
    );
}