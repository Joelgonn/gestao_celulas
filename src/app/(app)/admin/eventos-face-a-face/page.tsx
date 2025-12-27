// src/app/(app)/admin/eventos-face-a-face/page.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
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
    FaPlus,
    FaEdit,
    FaTrash,
    FaToggleOn,
    FaToggleOff,
    FaSearch,
    FaFilter,
    FaCalendarCheck,
    FaUsers,
    FaCheckCircle,
    FaTimesCircle,
    FaSync
} from 'react-icons/fa';

export default function AdminEventosFaceAFacePage() {
    const [eventos, setEventos] = useState<EventoFaceAFaceOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false); // Para ações de exclusão/toggle

    // Filtros
    const [searchTerm, setSearchTerm] = useState('');
    const [tipoFilter, setTipoFilter] = useState<EventoFaceAFaceTipo | 'all'>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'ativo' | 'inativo'>('all');

    const router = useRouter();
    const { addToast, ToastContainer } = useToast();

    const fetchEventos = useCallback(async () => {
        setLoading(true);
        try {
            const data = await listarEventosFaceAFaceAdmin(
                searchTerm,
                tipoFilter,
                statusFilter
            );
            setEventos(data);
            // addToast('Eventos carregados!', 'success'); // Opcional, para não poluir
        } catch (e: any) {
            console.error("Erro ao carregar eventos:", e);
            addToast(`Erro ao carregar eventos: ${e.message}`, 'error');
        } finally {
            setLoading(false);
        }
    }, [searchTerm, tipoFilter, statusFilter, addToast]);

    useEffect(() => {
        fetchEventos();
    }, [fetchEventos]);

    const handleDelete = async (eventoId: string, nomeEvento: string) => {
        if (!confirm(`Tem certeza que deseja excluir o evento "${nomeEvento}"? Isso removerá TODAS as inscrições associadas.`)) {
            return;
        }
        setSubmitting(true);
        try {
            await excluirEventoFaceAFace(eventoId);
            addToast(`Evento "${nomeEvento}" excluído com sucesso!`, 'success');
            await fetchEventos(); // Recarrega a lista
        } catch (e: any) {
            console.error("Erro ao excluir evento:", e);
            addToast(`Falha ao excluir evento: ${e.message}`, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggleAtivacao = async (eventoId: string, nomeEvento: string, currentStatus: boolean) => {
        const confirmMsg = currentStatus 
            ? `Desativar as inscrições para "${nomeEvento}"? Líderes não poderão mais inscrever.`
            : `Ativar as inscrições para "${nomeEvento}"? Líderes poderão inscrever.`
        
        if (!confirm(confirmMsg)) {
            return;
        }
        setSubmitting(true);
        try {
            await toggleAtivacaoEventoFaceAFace(eventoId, currentStatus);
            addToast(`Inscrições para "${nomeEvento}" ${currentStatus ? 'desativadas' : 'ativadas'}!`, 'success');
            await fetchEventos(); // Recarrega a lista
        } catch (e: any) {
            console.error("Erro ao alternar ativação:", e);
            addToast(`Falha ao ${currentStatus ? 'desativar' : 'ativar'} inscrições: ${e.message}`, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusBadge = (isActive: boolean) => {
        return isActive 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800';
    };
    
    const getTypeBadge = (type: EventoFaceAFaceTipo) => {
        return type === 'Mulheres'
            ? 'bg-pink-100 text-pink-800'
            : 'bg-blue-100 text-blue-800';
    };


    if (loading) {
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
            <div className="bg-gradient-to-r from-orange-600 to-amber-600 shadow-lg px-4 pt-6 pb-12 sm:px-8">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
                            <FaCalendarCheck /> Eventos Face a Face
                        </h1>
                        <p className="text-orange-100 text-sm mt-1">Gerencie as edições e inscrições</p>
                    </div>
                    
                    <Link
                        href="/admin/eventos-face-a-face/novo"
                        className="bg-white text-orange-700 py-2.5 px-6 rounded-xl hover:bg-orange-50 transition-colors font-bold flex items-center justify-center gap-2 shadow-md active:scale-95 w-full md:w-auto"
                    >
                        <FaPlus /> Nova Edição
                    </Link>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
                
                {/* Painel de Filtros */}
                <div className="bg-white rounded-xl shadow-md p-4 mb-6 border border-gray-100">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        
                        {/* Busca por Nome do Evento */}
                        <div className="relative">
                            <FaSearch className="absolute left-3 top-3.5 text-gray-400 text-sm" />
                            <input
                                type="text"
                                placeholder="Buscar evento..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 w-full border border-gray-300 rounded-lg py-2.5 text-base focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                            />
                        </div>

                        {/* Filtro por Tipo */}
                        <div className="relative">
                            <FaUsers className="absolute left-3 top-3.5 text-gray-400 text-sm" />
                            <select
                                value={tipoFilter}
                                onChange={(e) => setTipoFilter(e.target.value as EventoFaceAFaceTipo | 'all')}
                                className="pl-9 w-full border border-gray-300 rounded-lg py-2.5 text-base bg-white focus:ring-2 focus:ring-orange-500"
                            >
                                <option value="all">Todos os Tipos</option>
                                <option value="Mulheres">Mulheres</option>
                                <option value="Homens">Homens</option>
                            </select>
                        </div>

                        {/* Filtro por Status */}
                        <div className="relative">
                            <FaCalendarCheck className="absolute left-3 top-3.5 text-gray-400 text-sm" />
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'ativo' | 'inativo')}
                                className="pl-9 w-full border border-gray-300 rounded-lg py-2.5 text-base bg-white focus:ring-2 focus:ring-orange-500"
                            >
                                <option value="all">Todos os Status</option>
                                <option value="ativo">Inscrições Ativas</option>
                                <option value="inativo">Inscrições Inativas</option>
                            </select>
                        </div>
                        
                        {/* Botão de Limpar Filtros / Atualizar */}
                        <button
                            onClick={() => {
                                setSearchTerm('');
                                setTipoFilter('all');
                                setStatusFilter('all');
                                fetchEventos(); // Força o re-fetch
                            }}
                            className="bg-gray-100 text-gray-700 py-2.5 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm flex items-center justify-center gap-2 active:scale-95"
                        >
                            <FaSync /> Limpar / Atualizar
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

                {/* Tabela de Eventos (Desktop) */}
                <div className="hidden md:block bg-white shadow-sm rounded-2xl overflow-hidden border border-gray-200">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Evento</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Datas</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Valor</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status Inscrições</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {eventos.map((evento) => (
                                    <tr key={evento.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{evento.nome}</div>
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${getTypeBadge(evento.tipo)}`}>
                                                {evento.tipo}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {formatDateForDisplay(evento.data_inicio)} a {formatDateForDisplay(evento.data_fim)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            R$ {evento.valor_total.toFixed(2).replace('.', ',')}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusBadge(evento.ativa_para_inscricao)}`}>
                                                {evento.ativa_para_inscricao ? 'Ativas' : 'Inativas'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <Link 
                                                    href={`/admin/eventos-face-a-face/editar/${evento.id}`}
                                                    className="p-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100" title="Editar"
                                                >
                                                    <FaEdit />
                                                </Link>
                                                <button 
                                                    onClick={() => handleToggleAtivacao(evento.id, evento.nome, evento.ativa_para_inscricao)}
                                                    disabled={submitting}
                                                    className={`p-2 rounded-lg ${evento.ativa_para_inscricao ? 'text-red-600 bg-red-50 hover:bg-red-100' : 'text-green-600 bg-green-50 hover:bg-green-100'}`}
                                                    title={evento.ativa_para_inscricao ? 'Desativar Inscrições' : 'Ativar Inscrições'}
                                                >
                                                    {evento.ativa_para_inscricao ? <FaToggleOff /> : <FaToggleOn />}
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(evento.id, evento.nome)}
                                                    disabled={submitting}
                                                    className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100" title="Excluir"
                                                >
                                                    <FaTrash />
                                                </button>
                                                {/* Botão de visualizar inscrições (Módulo 3) */}
                                                <Link 
                                                    href={`/admin/eventos-face-a-face/${evento.id}/inscricoes`}
                                                    className="p-2 text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100" title="Ver Inscrições"
                                                >
                                                    <FaUsers />
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Cards de Eventos (Mobile) */}
                <div className="md:hidden space-y-4">
                    {eventos.map((evento) => (
                        <div key={evento.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col gap-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-gray-900 text-lg leading-tight">{evento.nome}</h3>
                                    <div className="flex flex-wrap gap-2 mt-1.5">
                                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${getTypeBadge(evento.tipo)}`}>
                                            {evento.tipo}
                                        </span>
                                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${getStatusBadge(evento.ativa_para_inscricao)}`}>
                                            Inscrições: {evento.ativa_para_inscricao ? 'Ativas' : 'Inativas'}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-gray-700 font-bold">R$ {evento.valor_total.toFixed(2).replace('.', ',')}</p>
                                    <p className="text-xs text-gray-500 mt-1">{formatDateForDisplay(evento.data_inicio)} - {formatDateForDisplay(evento.data_fim)}</p>
                                </div>
                            </div>
                            
                            <div className="flex gap-2 border-t border-gray-100 pt-3">
                                <Link 
                                    href={`/admin/eventos-face-a-face/editar/${evento.id}`}
                                    className="flex-1 bg-blue-50 text-blue-600 py-2.5 rounded-lg flex items-center justify-center gap-2 font-medium text-sm"
                                >
                                    <FaEdit size={16} /> Editar
                                </Link>
                                <button 
                                    onClick={() => handleToggleAtivacao(evento.id, evento.nome, evento.ativa_para_inscricao)}
                                    disabled={submitting}
                                    className={`w-12 py-2.5 rounded-lg flex items-center justify-center ${evento.ativa_para_inscricao ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}
                                    title={evento.ativa_para_inscricao ? 'Desativar Inscrições' : 'Ativar Inscrições'}
                                >
                                    {evento.ativa_para_inscricao ? <FaToggleOff size={18} /> : <FaToggleOn size={18} />}
                                </button>
                                <button 
                                    onClick={() => handleDelete(evento.id, evento.nome)}
                                    disabled={submitting}
                                    className="w-12 bg-red-50 text-red-600 py-2.5 rounded-lg flex items-center justify-center"
                                    title="Excluir"
                                >
                                    <FaTrash size={16} />
                                </button>
                                {/* Link para visualizar inscrições no mobile */}
                                <Link 
                                    href={`/admin/eventos-face-a-face/${evento.id}/inscricoes`}
                                    className="w-12 bg-gray-50 text-gray-600 py-2.5 rounded-lg flex items-center justify-center" title="Ver Inscrições"
                                >
                                    <FaUsers size={16} />
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>

            </div>
        </div>
    );
}