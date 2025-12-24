// src/app/(app)/visitantes/page.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/utils/supabase/client';
import Link from 'next/link';
import { 
    FaPhone, 
    FaWhatsapp, 
    FaPlus, 
    FaEdit, 
    FaTrash, 
    FaUserPlus, 
    FaUsers, 
    FaSearch, 
    FaFilter, 
    FaCalendarAlt, 
    FaComment,
    FaClock
} from 'react-icons/fa';

import { listarVisitantes, excluirVisitante, listarCelulasParaAdmin } from '@/lib/data';
import { CelulaOption, Visitante } from '@/lib/types';
import { formatPhoneNumberDisplay, formatDateForDisplay } from '@/utils/formatters';
import useToast from '@/hooks/useToast';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function VisitantesPage() {
    const [visitantes, setVisitantes] = useState<Visitante[]>([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<'admin' | 'líder' | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [celulasOptions, setCelulasOptions] = useState<CelulaOption[]>([]);
    const [selectedCelulaId, setSelectedCelulaId] = useState<string>('');
    const [minDaysSinceLastContact, setMinDaysSinceLastContact] = useState<string>('');

    const [submitting, setSubmitting] = useState(false);

    const { addToast, ToastContainer } = useToast();

    const fetchVisitantesAndCelulas = useCallback(async () => {
        setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();
                if (!profileError && profile) {
                    setUserRole(profile.role as 'admin' | 'líder');
                    if (profile.role === 'admin') {
                        const celulasData = await listarCelulasParaAdmin();
                        setCelulasOptions(celulasData);
                    }
                }
            } else {
                setUserRole(null);
            }

            const data = await listarVisitantes(
                selectedCelulaId === "" ? null : selectedCelulaId,
                null,
                minDaysSinceLastContact === "" ? null : parseInt(minDaysSinceLastContact)
            );
            setVisitantes(data);
            
        } catch (e: any) {
            console.error("Erro fetch:", e);
            addToast('Erro ao carregar dados', 'error');
        } finally {
            setLoading(false);
        }
    }, [selectedCelulaId, minDaysSinceLastContact, addToast]); 

    useEffect(() => {
        fetchVisitantesAndCelulas();
    }, [fetchVisitantesAndCelulas]);

    const handleDelete = async (visitanteId: string, nome: string) => {
        if (!confirm(`Remover visitante ${nome}? Ação irreversível.`)) return;
        setSubmitting(true);
        try {
            await excluirVisitante(visitanteId);
            setVisitantes(prev => prev.filter(v => v.id !== visitanteId));
            addToast(`${nome} removido!`, 'success');
        } catch (e: any) {
            console.error("Erro delete:", e);
            addToast('Falha ao excluir visitante', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const filteredVisitantes = useMemo(() => {
        if (!searchTerm) return visitantes;
        const term = searchTerm.toLowerCase();
        return visitantes.filter(v =>
            v.nome.toLowerCase().includes(term) ||
            (v.telefone && v.telefone.includes(term)) ||
            (userRole === 'admin' && v.celula_nome?.toLowerCase().includes(term))
        );
    }, [visitantes, searchTerm, userRole]);

    if (loading && visitantes.length === 0) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <ToastContainer />

            {/* Header Responsivo */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 shadow-lg px-4 pt-6 pb-12 sm:px-8">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
                            <FaUsers /> {userRole === 'admin' ? 'Todos Visitantes' : 'Meus Visitantes'}
                        </h1>
                        <p className="text-green-100 text-sm mt-1 flex items-center gap-2">
                            <span>{filteredVisitantes.length} encontrados</span>
                        </p>
                    </div>
                    {userRole === 'admin' && (
                        <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-white text-xs font-bold uppercase">
                            Administrador
                        </div>
                    )}
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
                
                {/* Filtros Mobile-Friendly */}
                <div className="bg-white rounded-xl shadow-md p-4 mb-6 border border-gray-100">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        
                        {/* Busca */}
                        <div className="relative">
                            <FaSearch className="absolute left-3 top-3.5 text-gray-400 text-sm" />
                            <input
                                type="text"
                                placeholder="Nome ou telefone..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 w-full border border-gray-300 rounded-lg py-2.5 text-base focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                            />
                        </div>

                        {/* Filtro Célula (Admin) */}
                        {userRole === 'admin' && (
                            <div className="relative">
                                <FaFilter className="absolute left-3 top-3.5 text-gray-400 text-sm" />
                                <select
                                    value={selectedCelulaId}
                                    onChange={(e) => setSelectedCelulaId(e.target.value)}
                                    className="pl-9 w-full border border-gray-300 rounded-lg py-2.5 text-base bg-white focus:ring-2 focus:ring-green-500"
                                >
                                    <option value="">Todas as Células</option>
                                    {celulasOptions.map(c => (
                                        <option key={c.id} value={c.id}>{c.nome}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Filtro Dias sem Contato */}
                        <div className="relative">
                            <FaClock className="absolute left-3 top-3.5 text-gray-400 text-sm" />
                            <input
                                type="number"
                                placeholder="Dias sem contato"
                                value={minDaysSinceLastContact}
                                onChange={(e) => setMinDaysSinceLastContact(e.target.value)}
                                className="pl-9 w-full border border-gray-300 rounded-lg py-2.5 text-base focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                min="0"
                            />
                        </div>

                        {/* Botão Novo */}
                        {userRole !== 'admin' && (
                            <Link
                                href="/visitantes/novo"
                                className="bg-green-600 text-white py-2.5 px-4 rounded-lg hover:bg-green-700 transition-colors font-bold flex items-center justify-center gap-2 shadow-sm active:scale-95"
                            >
                                <FaPlus /> Novo Visitante
                            </Link>
                        )}
                    </div>
                </div>

                {/* Empty State */}
                {filteredVisitantes.length === 0 && (
                    <div className="text-center p-12 bg-white border-2 border-dashed border-gray-200 rounded-2xl">
                        <FaUsers className="text-4xl text-gray-300 mx-auto mb-3" />
                        <h3 className="text-lg font-semibold text-gray-700">Nenhum visitante encontrado</h3>
                        <p className="text-gray-500 text-sm mb-6">Verifique os filtros ou cadastre um novo.</p>
                        {userRole !== 'admin' && (
                            <Link href="/visitantes/novo" className="text-green-600 font-medium hover:underline">
                                Cadastrar Visitante
                            </Link>
                        )}
                    </div>
                )}

                {/* === VISUALIZAÇÃO DESKTOP (TABELA) === */}
                <div className="hidden md:block bg-white shadow-sm rounded-2xl overflow-hidden border border-gray-200">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Nome</th>
                                    {userRole === 'admin' && <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Célula</th>}
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Contato</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">1ª Visita</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Últ. Contato</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Obs</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredVisitantes.map((v) => (
                                    <tr key={v.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900">{v.nome}</td>
                                        {userRole === 'admin' && (
                                            <td className="px-6 py-4">
                                                <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs font-semibold">
                                                    {v.celula_nome || 'N/A'}
                                                </span>
                                            </td>
                                        )}
                                        <td className="px-6 py-4 text-sm">
                                            <div className="flex items-center gap-2">
                                                <span>{formatPhoneNumberDisplay(v.telefone)}</span>
                                                {v.telefone && (
                                                    <div className="flex gap-1">
                                                        <a href={`tel:${v.telefone}`} className="text-blue-500 p-1 hover:bg-blue-50 rounded"><FaPhone size={12} /></a>
                                                        <a href={`https://wa.me/${v.telefone.replace(/\D/g, '')}`} target="_blank" className="text-green-500 p-1 hover:bg-green-50 rounded"><FaWhatsapp size={14} /></a>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{formatDateForDisplay(v.data_primeira_visita)}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${v.data_ultimo_contato ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                                                {formatDateForDisplay(v.data_ultimo_contato) || 'Nunca'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-[150px]" title={v.observacoes || ''}>{v.observacoes || '-'}</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <Link href={`/visitantes/converter/${v.id}`} className="text-emerald-600 p-2 hover:bg-emerald-50 rounded" title="Converter"><FaUserPlus /></Link>
                                                <Link href={`/visitantes/editar/${v.id}`} className="text-blue-600 p-2 hover:bg-blue-50 rounded" title="Editar"><FaEdit /></Link>
                                                <button onClick={() => handleDelete(v.id, v.nome)} disabled={submitting} className="text-red-600 p-2 hover:bg-red-50 rounded" title="Excluir"><FaTrash /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* === VISUALIZAÇÃO MOBILE (CARDS) === */}
                <div className="md:hidden space-y-4">
                    {filteredVisitantes.map((v) => (
                        <div key={v.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col gap-4">
                            
                            {/* Header Card */}
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-gray-900 text-lg leading-tight">{v.nome}</h3>
                                    <div className="flex flex-wrap gap-2 mt-1.5">
                                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${v.data_ultimo_contato ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                                            Contato: {formatDateForDisplay(v.data_ultimo_contato) || 'Pendente'}
                                        </span>
                                        {userRole === 'admin' && v.celula_nome && (
                                            <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                                                {v.celula_nome}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <Link href={`/visitantes/converter/${v.id}`} className="bg-emerald-50 text-emerald-600 p-2.5 rounded-lg hover:bg-emerald-100" title="Converter em Membro">
                                    <FaUserPlus size={18} />
                                </Link>
                            </div>

                            {/* Informações */}
                            <div className="grid grid-cols-2 gap-3 text-sm text-gray-600 border-t border-gray-100 pt-3">
                                <div className="flex items-center gap-2">
                                    <FaCalendarAlt className="text-gray-400" />
                                    <span className="text-xs">1ª Visita: {formatDateForDisplay(v.data_primeira_visita)}</span>
                                </div>
                                {v.observacoes && (
                                    <div className="flex items-center gap-2 col-span-2">
                                        <FaComment className="text-gray-400" />
                                        <span className="text-xs italic truncate">{v.observacoes}</span>
                                    </div>
                                )}
                            </div>

                            {/* Botões de Ação */}
                            <div className="flex gap-2 pt-1">
                                {v.telefone ? (
                                    <>
                                        <a href={`https://wa.me/${v.telefone.replace(/\D/g, '')}`} target="_blank" className="flex-1 bg-green-50 text-green-700 py-2.5 rounded-lg flex items-center justify-center gap-2 font-medium text-sm">
                                            <FaWhatsapp size={16} /> WhatsApp
                                        </a>
                                        <a href={`tel:${v.telefone}`} className="w-12 bg-gray-50 text-gray-600 rounded-lg flex items-center justify-center">
                                            <FaPhone size={14} />
                                        </a>
                                    </>
                                ) : (
                                    <div className="flex-1 bg-gray-50 text-gray-400 py-2.5 rounded-lg text-center text-sm italic">Sem telefone</div>
                                )}
                                
                                <Link href={`/visitantes/editar/${v.id}`} className="w-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                                    <FaEdit size={16} />
                                </Link>
                                
                                <button onClick={() => handleDelete(v.id, v.nome)} disabled={submitting} className="w-12 bg-red-50 text-red-600 rounded-lg flex items-center justify-center">
                                    <FaTrash size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

            </div>
        </div>
    );
}