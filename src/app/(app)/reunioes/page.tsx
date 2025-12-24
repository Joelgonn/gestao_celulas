// src/app/(app)/reunioes/page.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react'; 
import { supabase } from '@/utils/supabase/client'; 
import Link from 'next/link';
import { 
  FaEye, 
  FaCopy, 
  FaFileUpload, 
  FaEdit, 
  FaTrash, 
  FaUsers, 
  FaExclamationTriangle, 
  FaSearch,
  FaCalendarAlt,
  FaChild,
  FaFilePdf
} from 'react-icons/fa';

// Importa funções de data.ts
import {
    listarReunioes,
    excluirReuniao,
    listarCelulasParaAdmin, 
    duplicarReuniao,
} from '@/lib/data'; 

// Importa interfaces de types.ts
import { 
    ReuniaoComNomes,    
    CelulaOption,       
} from '@/lib/types';

import { formatDateForDisplay } from '@/utils/formatters'; 
import LoadingSpinner from '@/components/LoadingSpinner'; 
import useToast from '@/hooks/useToast';

export default function ReunioesPage() {
    const [reunioes, setReunioes] = useState<ReuniaoComNomes[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<'admin' | 'líder' | null>(null);
    
    const [celulasOptions, setCelulasOptions] = useState<CelulaOption[]>([]);
    const [selectedCelulaId, setSelectedCelulaId] = useState<string>('');
    const [searchTermTema, setSearchTermTema] = useState('');
    const [searchTermMinistrador, setSearchTermMinistrador] = useState('');

    const [submitting, setSubmitting] = useState(false);
    const { addToast, ToastContainer } = useToast();

    const fetchReunioesAndOptions = useCallback(async () => { 
        setLoading(true);
        setError(null);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();
                if (profileError || !profile) {
                    console.error("Erro ao buscar perfil:", profileError);
                    setUserRole(null);
                    addToast('Erro ao carregar perfil', 'error');
                } else {
                    setUserRole(profile.role as 'admin' | 'líder');
                    if (profile.role === 'admin') {
                        const celulasData = await listarCelulasParaAdmin();
                        setCelulasOptions(celulasData);
                    }
                }
            } else {
                setUserRole(null);
            }

            const data = await listarReunioes();
            setReunioes(data);
        } catch (e: any) {
            console.error("Erro ao buscar dados:", e);
            setError(e.message);
            addToast(`Erro ao carregar dados: ${e.message}`, 'error');
        } finally {
            setLoading(false);
        }
    }, [addToast]);

    useEffect(() => {
        fetchReunioesAndOptions();
    }, [fetchReunioesAndOptions]);

    const handleDelete = async (reuniaoId: string, dataReuniao: string) => {
        if (!confirm(`Remover reunião de ${formatDateForDisplay(dataReuniao)}? Irreversível.`)) {
            return;
        }
        setSubmitting(true);
        try {
            await excluirReuniao(reuniaoId);
            setReunioes(prev => prev.filter(r => r.id !== reuniaoId));
            addToast('Reunião removida!', 'success');
        } catch (e: any) {
            console.error("Erro delete:", e);
            addToast(`Erro: ${e.message}`, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDuplicarReuniao = async (reuniaoId: string, dataReuniao: string) => {
        if (!confirm(`Duplicar a reunião de ${formatDateForDisplay(dataReuniao)} para hoje?`)) {
            return;
        }
        setSubmitting(true);
        try {
            await duplicarReuniao(reuniaoId);
            await fetchReunioesAndOptions();
            addToast('Reunião duplicada!', 'success');
        } catch (e: any) {
            console.error("Erro duplicar:", e);
            addToast(`Erro: ${e.message}`, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const filteredReunioes = useMemo(() => {
        let currentFiltered = reunioes;

        if (selectedCelulaId) {
            currentFiltered = currentFiltered.filter(reuniao => reuniao.celula_id === selectedCelulaId);
        }
        if (searchTermTema) {
            const term = searchTermTema.toLowerCase();
            currentFiltered = currentFiltered.filter(reuniao => 
                reuniao.tema.toLowerCase().includes(term)
            );
        }
        if (searchTermMinistrador) {
            const term = searchTermMinistrador.toLowerCase();
            currentFiltered = currentFiltered.filter(reuniao => 
                (reuniao.ministrador_principal_nome?.toLowerCase().includes(term)) ||
                (reuniao.ministrador_secundario_nome?.toLowerCase().includes(term))
            );
        }
        return currentFiltered;
    }, [reunioes, selectedCelulaId, searchTermTema, searchTermMinistrador]);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <LoadingSpinner />
        </div>
    );
    
    if (error) return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="text-center bg-white p-6 rounded-xl shadow-lg border border-red-100 max-w-sm w-full">
                <FaExclamationTriangle className="text-4xl text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-gray-800 mb-2">Erro ao carregar</h2>
                <p className="text-sm text-gray-600 mb-4">{error}</p>
                <button
                    onClick={fetchReunioesAndOptions}
                    className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 font-medium"
                >
                    Tentar Novamente
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <ToastContainer />

            {/* Header Responsivo */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 shadow-lg pb-6 pt-6 px-4 sm:px-8">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-white">
                            {userRole === 'admin' ? 'Todas as Reuniões' : 'Minhas Reuniões'}
                        </h1>
                        <p className="text-green-100 text-sm mt-1">Gerencie as células e atividades</p>
                    </div>
                    
                    {userRole !== 'admin' && ( 
                        <Link 
                            href="/reunioes/novo" 
                            className="w-full md:w-auto bg-white text-green-700 py-3 px-6 rounded-xl hover:bg-green-50 transition-all font-bold shadow-md active:scale-95 flex items-center justify-center gap-2"
                        >
                            <FaFileUpload />
                            <span>Nova Reunião</span>
                        </Link>
                    )}
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4">
                
                {/* Filtros em Card Mobile-Friendly */}
                <div className="bg-white rounded-xl shadow-md p-4 mb-6 border border-gray-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {userRole === 'admin' && (
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Célula</label>
                                <select
                                    value={selectedCelulaId}
                                    onChange={(e) => setSelectedCelulaId(e.target.value)}
                                    // text-base previne zoom no iOS
                                    className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                                >
                                    <option value="">Todas</option>
                                    {celulasOptions.map(c => (
                                        <option key={c.id} value={c.id}>{c.nome}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Tema</label>
                            <div className="relative">
                                <FaSearch className="absolute left-3 top-3.5 text-gray-400 text-sm" />
                                <input
                                    type="text"
                                    placeholder="Buscar tema..."
                                    value={searchTermTema}
                                    onChange={(e) => setSearchTermTema(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2.5 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                />
                            </div>
                        </div>
                        
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Ministrador</label>
                            <div className="relative">
                                <FaUsers className="absolute left-3 top-3.5 text-gray-400 text-sm" />
                                <input
                                    type="text"
                                    placeholder="Buscar nome..."
                                    value={searchTermMinistrador}
                                    onChange={(e) => setSearchTermMinistrador(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2.5 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                />
                            </div>
                        </div>

                        <div className="flex items-end">
                            <button
                                onClick={() => {
                                    setSelectedCelulaId('');
                                    setSearchTermTema('');
                                    setSearchTermMinistrador('');
                                }}
                                className="w-full bg-gray-100 text-gray-600 py-2.5 rounded-lg hover:bg-gray-200 font-medium text-sm transition-colors h-[42px] mt-1" // Altura fixa para alinhar
                            >
                                Limpar Filtros
                            </button>
                        </div>
                    </div>
                </div>

                {/* Empty State */}
                {filteredReunioes.length === 0 && (
                    <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-dashed border-gray-300">
                        <FaUsers className="text-4xl text-gray-300 mx-auto mb-3" />
                        <h3 className="text-lg font-semibold text-gray-700">Nenhuma reunião encontrada</h3>
                        <p className="text-gray-500 text-sm">Tente ajustar os filtros ou crie uma nova reunião.</p>
                    </div>
                )}

                {/* --- VISUALIZAÇÃO DESKTOP (TABELA) --- */}
                <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Data</th>
                                    {userRole === 'admin' && <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Célula</th>}
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tema</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Ministrantes</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Material</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredReunioes.map((reuniao) => (
                                    <tr key={reuniao.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {formatDateForDisplay(reuniao.data_reuniao)}
                                        </td>
                                        {userRole === 'admin' && (
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-semibold">
                                                    {reuniao.celula_nome || 'N/A'}
                                                </span>
                                            </td>
                                        )}
                                        <td className="px-6 py-4 text-sm text-gray-700 font-medium">
                                            {reuniao.tema}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            <div className="flex flex-col">
                                                <span>{reuniao.ministrador_principal_nome}</span>
                                                {reuniao.ministrador_secundario_nome && (
                                                    <span className="text-xs text-gray-400">+ {reuniao.ministrador_secundario_nome}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            {reuniao.caminho_pdf ? (
                                                <a href={reuniao.caminho_pdf} target="_blank" rel="noreferrer" className="text-green-600 hover:text-green-800 flex items-center gap-1">
                                                    <FaFilePdf /> PDF
                                                </a>
                                            ) : <span className="text-gray-300">-</span>}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end gap-2">
                                                <Link href={`/reunioes/resumo/${reuniao.id}`} className="text-gray-500 hover:text-gray-700 p-2 bg-gray-100 rounded-lg" title="Resumo"><FaEye /></Link>
                                                {userRole !== 'admin' && (
                                                    <>
                                                        <Link href={`/reunioes/editar/${reuniao.id}`} className="text-blue-600 hover:text-blue-800 p-2 bg-blue-50 rounded-lg" title="Editar"><FaEdit /></Link>
                                                        <Link href={`/reunioes/presenca/${reuniao.id}`} className="text-green-600 hover:text-green-800 p-2 bg-green-50 rounded-lg" title="Presença"><FaUsers /></Link>
                                                        <button onClick={() => handleDuplicarReuniao(reuniao.id, reuniao.data_reuniao)} disabled={submitting} className="text-purple-600 hover:text-purple-800 p-2 bg-purple-50 rounded-lg" title="Duplicar"><FaCopy /></button>
                                                        <button onClick={() => handleDelete(reuniao.id, reuniao.data_reuniao)} disabled={submitting} className="text-red-600 hover:text-red-800 p-2 bg-red-50 rounded-lg" title="Excluir"><FaTrash /></button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* --- VISUALIZAÇÃO MOBILE (CARDS) --- */}
                <div className="md:hidden space-y-4">
                    {filteredReunioes.map((reuniao) => (
                        <div key={reuniao.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col gap-4">
                            
                            {/* Cabeçalho do Card */}
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="bg-green-100 text-green-800 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                                            <FaCalendarAlt className="text-[10px]" />
                                            {formatDateForDisplay(reuniao.data_reuniao)}
                                        </span>
                                        {userRole === 'admin' && (
                                            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-1 rounded-full">
                                                {reuniao.celula_nome}
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="font-bold text-gray-900 text-lg leading-tight">{reuniao.tema}</h3>
                                </div>
                                
                                {reuniao.caminho_pdf && (
                                    <a href={reuniao.caminho_pdf} target="_blank" rel="noreferrer" className="text-red-500 hover:text-red-600 bg-red-50 p-2 rounded-lg" title="Ver Material">
                                        <FaFilePdf size={18} />
                                    </a>
                                )}
                            </div>

                            {/* Informações */}
                            <div className="grid grid-cols-2 gap-3 text-sm text-gray-600 border-t border-gray-100 pt-3">
                                <div>
                                    <span className="text-xs text-gray-400 block mb-0.5">Ministrador</span>
                                    <span className="font-medium text-gray-800">{reuniao.ministrador_principal_nome}</span>
                                </div>
                                {reuniao.responsavel_kids_nome && (
                                    <div>
                                        <span className="text-xs text-gray-400 block mb-0.5">Kids</span>
                                        <span className="font-medium text-gray-800 flex items-center gap-1">
                                            <FaChild className="text-purple-400" />
                                            {reuniao.responsavel_kids_nome}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Botões de Ação Mobile */}
                            <div className="grid grid-cols-5 gap-2 pt-1">
                                <Link 
                                    href={`/reunioes/resumo/${reuniao.id}`} 
                                    className="col-span-1 bg-gray-100 text-gray-600 rounded-lg flex items-center justify-center py-3 hover:bg-gray-200 transition-colors"
                                    title="Resumo"
                                >
                                    <FaEye size={18} />
                                </Link>

                                {userRole !== 'admin' ? (
                                    <>
                                        <Link href={`/reunioes/presenca/${reuniao.id}`} className="col-span-1 bg-green-50 text-green-600 rounded-lg flex items-center justify-center py-3 hover:bg-green-100">
                                            <FaUsers size={18} />
                                        </Link>
                                        <Link href={`/reunioes/editar/${reuniao.id}`} className="col-span-1 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center py-3 hover:bg-blue-100">
                                            <FaEdit size={18} />
                                        </Link>
                                        <button onClick={() => handleDuplicarReuniao(reuniao.id, reuniao.data_reuniao)} disabled={submitting} className="col-span-1 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center py-3 hover:bg-purple-100">
                                            <FaCopy size={18} />
                                        </button>
                                        <button onClick={() => handleDelete(reuniao.id, reuniao.data_reuniao)} disabled={submitting} className="col-span-1 bg-red-50 text-red-600 rounded-lg flex items-center justify-center py-3 hover:bg-red-100">
                                            <FaTrash size={18} />
                                        </button>
                                    </>
                                ) : (
                                    // Se for admin, o botão de Resumo ocupa mais espaço ou é o único
                                    <div className="col-span-4 flex items-center text-sm text-gray-400 italic justify-center bg-gray-50 rounded-lg">
                                        Ações restritas ao líder
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

            </div>
        </div>
    );
}