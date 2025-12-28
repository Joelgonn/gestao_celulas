'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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

import {
    FaPlus, FaEdit, FaTrash, FaToggleOn, FaToggleOff, FaSearch, FaFilter, 
    FaCalendarCheck, FaUsers, FaSync, FaChevronDown
} from 'react-icons/fa';

// --- COMPONENTES VISUAIS DE FILTRO ---

const SearchInput = ({ value, onChange, placeholder }: any) => (
    <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FaSearch className="text-gray-400 group-focus-within:text-orange-500 transition-colors" />
        </div>
        <input
            type="text"
            className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 sm:text-sm"
            placeholder={placeholder}
            value={value}
            onChange={onChange}
        />
    </div>
);

const FilterSelect = ({ icon: Icon, value, onChange, children }: any) => (
    <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
            <Icon className="text-gray-400 group-hover:text-orange-500 transition-colors" />
        </div>
        <select
            value={value}
            onChange={onChange}
            className="block w-full pl-10 pr-10 py-2.5 text-base border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 sm:text-sm rounded-xl appearance-none bg-white border hover:border-orange-300 transition-all cursor-pointer truncate"
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

    // Filtros
    const [searchTerm, setSearchTerm] = useState('');
    const [tipoFilter, setTipoFilter] = useState<EventoFaceAFaceTipo | 'all'>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'ativo' | 'inativo'>('all');

    const router = useRouter();
    const { addToast, ToastContainer } = useToast();

    const fetchEventos = useCallback(async () => {
        setLoading(true);
        try {
            const data = await listarEventosFaceAFaceAdmin(searchTerm, tipoFilter, statusFilter);
            setEventos(data);
        } catch (e: any) {
            console.error("Erro ao carregar eventos:", e);
            addToast(`Erro ao carregar eventos: ${e.message}`, 'error');
        } finally { setLoading(false); }
    }, [searchTerm, tipoFilter, statusFilter, addToast]);

    useEffect(() => { fetchEventos(); }, [fetchEventos]);

    const handleDelete = async (eventoId: string, nomeEvento: string) => {
        if (!confirm(`Tem certeza que deseja excluir o evento "${nomeEvento}"? Isso removerá TODAS as inscrições associadas.`)) return;
        setSubmitting(true);
        try {
            await excluirEventoFaceAFace(eventoId);
            addToast(`Evento "${nomeEvento}" excluído com sucesso!`, 'success');
            await fetchEventos();
        } catch (e: any) {
            addToast(`Falha ao excluir evento: ${e.message}`, 'error');
        } finally { setSubmitting(false); }
    };

    const handleToggleAtivacao = async (eventoId: string, nomeEvento: string, currentStatus: boolean) => {
        const confirmMsg = currentStatus 
            ? `Desativar as inscrições para "${nomeEvento}"? Líderes não poderão mais inscrever.`
            : `Ativar as inscrições para "${nomeEvento}"? Líderes poderão inscrever.`
        
        if (!confirm(confirmMsg)) return;
        setSubmitting(true);
        try {
            await toggleAtivacaoEventoFaceAFace(eventoId, currentStatus);
            addToast(`Inscrições para "${nomeEvento}" ${currentStatus ? 'desativadas' : 'ativadas'}!`, 'success');
            await fetchEventos();
        } catch (e: any) {
            addToast(`Falha ao alterar status: ${e.message}`, 'error');
        } finally { setSubmitting(false); }
    };

    const getStatusBadge = (isActive: boolean) => isActive ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200';
    const getTypeBadge = (type: EventoFaceAFaceTipo) => type === 'Mulheres' ? 'bg-pink-100 text-pink-800 border-pink-200' : 'bg-blue-100 text-blue-800 border-blue-200';

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><LoadingSpinner /></div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            <ToastContainer />

            {/* Header Laranja */}
            <div className="bg-gradient-to-r from-orange-600 to-amber-600 shadow-lg px-4 pt-6 pb-12 sm:px-8">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
                            <FaCalendarCheck /> Eventos Face a Face
                        </h1>
                        <p className="text-orange-100 text-sm mt-1">Gerencie as edições e inscrições</p>
                    </div>
                    <Link href="/admin/eventos-face-a-face/novo" className="bg-white text-orange-700 py-2.5 px-6 rounded-xl hover:bg-orange-50 transition-colors font-bold flex items-center justify-center gap-2 shadow-md active:scale-95 w-full md:w-auto">
                        <FaPlus /> Nova Edição
                    </Link>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
                
                {/* Filtros */}
                <div className="bg-white rounded-xl shadow-md p-4 mb-6 border border-gray-100">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <SearchInput value={searchTerm} onChange={(e: any) => setSearchTerm(e.target.value)} placeholder="Buscar evento..." />
                        
                        <FilterSelect icon={FaUsers} value={tipoFilter} onChange={(e: any) => setTipoFilter(e.target.value)}>
                            <option value="all">Tipo: Todos</option>
                            <option value="Mulheres">Mulheres</option>
                            <option value="Homens">Homens</option>
                        </FilterSelect>

                        <FilterSelect icon={FaCalendarCheck} value={statusFilter} onChange={(e: any) => setStatusFilter(e.target.value)}>
                            <option value="all">Status: Todos</option>
                            <option value="ativo">Inscrições Ativas</option>
                            <option value="inativo">Inscrições Inativas</option>
                        </FilterSelect>
                        
                        <button onClick={() => { setSearchTerm(''); setTipoFilter('all'); setStatusFilter('all'); fetchEventos(); }}
                            className="bg-gray-100 text-gray-700 py-2.5 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm flex items-center justify-center gap-2 active:scale-95"
                        >
                            <FaSync /> Limpar
                        </button>
                    </div>
                </div>

                {/* Empty State */}
                {eventos.length === 0 && (
                    <div className="text-center p-12 bg-white border-2 border-dashed border-gray-200 rounded-2xl">
                        <FaCalendarCheck className="text-4xl text-gray-300 mx-auto mb-3" />
                        <h3 className="text-lg font-semibold text-gray-700">Nenhum evento encontrado</h3>
                        <p className="text-gray-500 text-sm mb-6">Comece criando a primeira edição do Face a Face.</p>
                        <Link href="/admin/eventos-face-a-face/novo" className="bg-orange-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-orange-700 inline-flex items-center gap-2 shadow-md">
                            <FaPlus /> Nova Edição
                        </Link>
                    </div>
                )}

                {/* Tabela Desktop */}
                <div className="hidden md:block bg-white shadow-sm rounded-2xl overflow-hidden border border-gray-200">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Evento</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Datas</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Valor</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status Inscrições</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {eventos.map((evento) => (
                                    <tr key={evento.id} className="hover:bg-orange-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-900">{evento.nome}</div>
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border mt-1 ${getTypeBadge(evento.tipo)}`}>
                                                {evento.tipo}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {formatDateForDisplay(evento.data_inicio)} a {formatDateForDisplay(evento.data_fim)}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                            R$ {evento.valor_total.toFixed(2).replace('.', ',')}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${getStatusBadge(evento.ativa_para_inscricao)}`}>
                                                {evento.ativa_para_inscricao ? 'Ativas' : 'Inativas'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <Link href={`/admin/eventos-face-a-face/editar/${evento.id}`} className="p-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 border border-blue-100" title="Editar"><FaEdit /></Link>
                                                <button onClick={() => handleToggleAtivacao(evento.id, evento.nome, evento.ativa_para_inscricao)} disabled={submitting} className={`p-2 rounded-lg border ${evento.ativa_para_inscricao ? 'text-red-600 bg-red-50 hover:bg-red-100 border-red-100' : 'text-green-600 bg-green-50 hover:bg-green-100 border-green-100'}`} title="Ativar/Desativar">
                                                    {evento.ativa_para_inscricao ? <FaToggleOff /> : <FaToggleOn />}
                                                </button>
                                                <button onClick={() => handleDelete(evento.id, evento.nome)} disabled={submitting} className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 border border-red-100" title="Excluir"><FaTrash /></button>
                                                <Link href={`/admin/eventos-face-a-face/${evento.id}/inscricoes`} className="p-2 text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 border border-gray-200" title="Ver Inscrições"><FaUsers /></Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Cards Mobile */}
                <div className="md:hidden space-y-4">
                    {eventos.map((evento) => (
                        <div key={evento.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 flex flex-col gap-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-gray-900 text-lg leading-snug">{evento.nome}</h3>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getTypeBadge(evento.tipo)}`}>{evento.tipo}</span>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getStatusBadge(evento.ativa_para_inscricao)}`}>
                                            {evento.ativa_para_inscricao ? 'Inscrições Ativas' : 'Inscrições Fechadas'}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-gray-900 font-bold">R$ {evento.valor_total.toFixed(2).replace('.', ',')}</p>
                                </div>
                            </div>
                            
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                                <FaCalendarCheck /> {formatDateForDisplay(evento.data_inicio)} - {formatDateForDisplay(evento.data_fim)}
                            </p>

                            <div className="flex gap-2 border-t border-gray-100 pt-3">
                                <Link href={`/admin/eventos-face-a-face/editar/${evento.id}`} className="flex-1 bg-blue-50 text-blue-600 py-2.5 rounded-lg flex items-center justify-center gap-2 font-bold text-sm border border-blue-100"><FaEdit /> Editar</Link>
                                <button onClick={() => handleToggleAtivacao(evento.id, evento.nome, evento.ativa_para_inscricao)} disabled={submitting} className={`w-12 py-2.5 rounded-lg flex items-center justify-center border ${evento.ativa_para_inscricao ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                                    {evento.ativa_para_inscricao ? <FaToggleOff size={18} /> : <FaToggleOn size={18} />}
                                </button>
                                <Link href={`/admin/eventos-face-a-face/${evento.id}/inscricoes`} className="w-12 bg-gray-50 text-gray-600 py-2.5 rounded-lg flex items-center justify-center border border-gray-200"><FaUsers size={16} /></Link>
                                <button onClick={() => handleDelete(evento.id, evento.nome)} disabled={submitting} className="w-12 bg-red-50 text-red-600 py-2.5 rounded-lg flex items-center justify-center border border-red-100"><FaTrash size={16} /></button>
                            </div>
                        </div>
                    ))}
                </div>

            </div>
        </div>
    );
}