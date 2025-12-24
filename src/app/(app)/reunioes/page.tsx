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
  FaCheckCircle, 
  FaExclamationTriangle, 
  FaInfoCircle, 
  FaTimes,
  FaSearch 
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

// ADICIONAR IMPORTS DO TOAST GLOBAL
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
    const { addToast, removeToast, ToastContainer } = useToast();

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
                    console.error("Erro ao buscar perfil do usuário:", profileError);
                    setUserRole(null);
                    addToast('Erro ao carregar perfil do usuário', 'error');
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
            console.error("Erro ao buscar reuniões ou opções:", e);
            setError(e.message || "Erro ao carregar reuniões ou opções.");
            addToast(`Erro ao carregar reuniões: ${e.message || 'Erro desconhecido.'}`, 'error');
        } finally {
            setLoading(false);
        }
    }, [addToast]);

    useEffect(() => {
        fetchReunioesAndOptions();
    }, [fetchReunioesAndOptions]);

    const handleDelete = async (reuniaoId: string, dataReuniao: string) => {
        if (!confirm(`Tem certeza que deseja remover a reunião de ${formatDateForDisplay(dataReuniao)}? Esta ação é irreversível e excluirá presenças e crianças associadas.`)) {
            return;
        }
        setSubmitting(true);
        try {
            await excluirReuniao(reuniaoId);
            setReunioes(reunioes.filter(r => r.id !== reuniaoId));
            addToast(`Reunião de ${formatDateForDisplay(dataReuniao)} removida com sucesso!`, 'success');
        } catch (e: any) {
            console.error("Erro ao excluir reunião:", e);
            addToast(`Falha ao excluir reunião: ${e.message || "Erro desconhecido."}`, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDuplicarReuniao = async (reuniaoId: string, dataReuniao: string) => {
        if (!confirm(`Deseja duplicar a reunião de ${formatDateForDisplay(dataReuniao)}? Uma nova reunião será criada com a data de hoje.`)) {
            return;
        }
        setSubmitting(true);
        try {
            await duplicarReuniao(reuniaoId);
            await fetchReunioesAndOptions();
            addToast('Reunião duplicada com sucesso!', 'success');
        } catch (e: any) {
            console.error("Erro ao duplicar reunião:", e);
            addToast(`Falha ao duplicar reunião: ${e.message || "Erro desconhecido."}`, 'error');
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
            const lowerCaseSearchTermTema = searchTermTema.toLowerCase();
            currentFiltered = currentFiltered.filter(reuniao => 
                reuniao.tema.toLowerCase().includes(lowerCaseSearchTermTema)
            );
        }

        if (searchTermMinistrador) {
            const lowerCaseSearchTermMinistrador = searchTermMinistrador.toLowerCase();
            currentFiltered = currentFiltered.filter(reuniao => 
                (reuniao.ministrador_principal_nome && reuniao.ministrador_principal_nome.toLowerCase().includes(lowerCaseSearchTermMinistrador)) ||
                (reuniao.ministrador_secundario_nome && reuniao.ministrador_secundario_nome.toLowerCase().includes(lowerCaseSearchTermMinistrador))
            );
        }

        return currentFiltered;
    }, [reunioes, selectedCelulaId, searchTermTema, searchTermMinistrador]);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <LoadingSpinner />
        </div>
    );
    
    if (error) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center p-8">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FaExclamationTriangle className="text-2xl text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-red-600 mb-2">Erro ao carregar</h2>
                <p className="text-gray-600 mb-4">{error}</p>
                <button
                    onClick={fetchReunioesAndOptions}
                    className="bg-gradient-to-r from-red-600 to-orange-600 text-white py-2 px-6 rounded-lg hover:from-red-700 hover:to-orange-700 transition-all duration-200 font-medium"
                >
                    Tentar Novamente
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header com gradiente verde */}
                <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl shadow-xl p-6 sm:p-8 mb-8 text-white">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold mb-2">
                                {userRole === 'admin' ? 'Todas as Reuniões' : 'Minhas Reuniões'}
                            </h1>
                            <p className="text-green-100 text-sm sm:text-base">Gerencie as reuniões da célula de forma eficiente</p>
                        </div>
                        
                        {userRole !== 'admin' && ( 
                            <Link 
                                href="/reunioes/novo" 
                                className="bg-white text-green-700 py-2.5 px-6 rounded-xl hover:bg-green-50 transition-all duration-200 flex items-center space-x-2 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm w-full sm:w-auto justify-center"
                            >
                                <FaFileUpload className="text-base" />
                                <span>Nova Reunião</span>
                            </Link>
                        )}
                    </div>
                </div>

                {/* Filtros em Card */}
                <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 mb-8 border border-gray-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-x-4 sm:gap-y-4">
                        {userRole === 'admin' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <FaUsers className="inline mr-2 text-gray-500 text-base" />
                                    Filtrar por Célula
                                </label>
                                <select
                                    value={selectedCelulaId}
                                    onChange={(e) => setSelectedCelulaId(e.target.value)}
                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white transition-all duration-200 text-sm"
                                >
                                    <option value="">Todas as Células</option>
                                    {celulasOptions.map(celula => (
                                        <option key={celula.id} value={celula.id}>{celula.nome}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <FaSearch className="inline mr-2 text-gray-500 text-base" />
                                Pesquisar por Tema
                            </label>
                            <input
                                type="text"
                                placeholder="Digite o tema..."
                                value={searchTermTema}
                                onChange={(e) => setSearchTermTema(e.target.value)}
                                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white transition-all duration-200 text-sm"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <FaUsers className="inline mr-2 text-gray-500 text-base" />
                                Pesquisar Ministrador
                            </label>
                            <input
                                type="text"
                                placeholder="Digite o nome..."
                                value={searchTermMinistrador}
                                onChange={(e) => setSearchTermMinistrador(e.target.value)}
                                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white transition-all duration-200 text-sm"
                            />
                        </div>

                        <div className="flex items-end">
                            <button
                                onClick={() => {
                                    setSelectedCelulaId('');
                                    setSearchTermTema('');
                                    setSearchTermMinistrador('');
                                }}
                                className="w-full bg-gradient-to-r from-gray-600 to-gray-700 text-white py-2.5 px-4 rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:-translate-y-0.5 text-sm"
                            >
                                Limpar Filtros
                            </button>
                        </div>
                    </div>
                </div>

                {/* Conteúdo Principal */}
                {filteredReunioes.length === 0 && !searchTermTema && !searchTermMinistrador && !selectedCelulaId ? ( 
                    <div className="bg-white rounded-2xl shadow-lg p-8 sm:p-12 text-center border-2 border-dashed border-gray-300">
                        <div className="max-w-md mx-auto">
                            <div className="w-14 h-14 sm:w-20 sm:h-20 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                                <FaUsers className="text-2xl sm:text-3xl text-green-600" />
                            </div>
                            <h3 className="text-lg sm:text-2xl font-bold text-gray-800 mb-2 sm:mb-3">
                                {userRole === 'admin' ? 'Nenhuma reunião encontrada' : 'Nenhuma reunião em sua célula'}
                            </h3>
                            <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8">
                                {userRole !== 'admin' ? 'Comece registrando a primeira reunião da sua célula!' : 'As reuniões aparecerão aqui quando forem registradas pelas células.'}
                            </p>
                            {userRole !== 'admin' && (
                                <Link 
                                    href="/reunioes/novo" 
                                    className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-5 py-2.5 sm:px-8 sm:py-4 rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 font-semibold inline-flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm sm:text-lg"
                                >
                                    <FaFileUpload className="text-base sm:text-xl" />
                                    <span>Registrar Primeira Reunião</span>
                                </Link>
                            )}
                        </div>
                    </div>
                ) : filteredReunioes.length === 0 && (searchTermTema || searchTermMinistrador || selectedCelulaId) ? ( 
                    <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-2xl shadow-lg p-8 sm:p-12 text-center border border-yellow-200">
                        <div className="max-w-md mx-auto">
                            <div className="w-14 h-14 sm:w-20 sm:h-20 bg-gradient-to-br from-yellow-100 to-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                                <FaEye className="text-2xl sm:text-3xl text-yellow-600" />
                            </div>
                            <h3 className="text-lg sm:text-2xl font-bold text-gray-800 mb-2 sm:mb-3">Nenhuma reunião encontrada</h3>
                            <p className="text-sm sm:text-base text-gray-600 mb-4">Não encontramos reuniões com os filtros aplicados.</p>
                            <p className="text-xs sm:text-sm text-gray-500">Tente ajustar os critérios de pesquisa ou limpar os filtros</p>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                                    <tr>
                                        <th scope="col" className="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">Data</th>
                                        {userRole === 'admin' && (
                                            <th scope="col" className="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200 hidden sm:table-cell">
                                                Célula {/* Oculta em mobile */}
                                            </th>
                                        )}
                                        <th scope="col" className="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">Tema</th>
                                        <th scope="col" className="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200 hidden md:table-cell">
                                            Min. 1 {/* Oculta em sm: */}
                                        </th>
                                        <th scope="col" className="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200 hidden lg:table-cell">
                                            Min. 2 {/* Oculta em md: */}
                                        </th>
                                        <th scope="col" className="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200 hidden md:table-cell">
                                            Kids {/* Oculta em sm: */}
                                        </th>
                                        <th scope="col" className="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200 hidden sm:table-cell">
                                            Material {/* Oculta em mobile */}
                                        </th>
                                        <th scope="col" className="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredReunioes.map((reuniao) => (
                                        <tr key={reuniao.id} className="hover:bg-gray-50 transition-all duration-200 group">
                                            <td className="py-3 px-4 whitespace-nowrap border-r border-gray-100 text-sm">
                                                <span className="font-semibold text-gray-900">{formatDateForDisplay(reuniao.data_reuniao)}</span>
                                            </td>
                                            {userRole === 'admin' && ( 
                                                <td className="py-3 px-4 whitespace-nowrap border-r border-gray-100 hidden sm:table-cell text-sm">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-200">
                                                        {reuniao.celula_nome || 'N/A'}
                                                    </span>
                                                </td>
                                            )}
                                            <td className="py-3 px-4 border-r border-gray-100 text-sm">
                                                <div className="max-w-[150px] sm:max-w-xs">
                                                    <span className="text-gray-900 font-medium text-sm line-clamp-2 group-hover:text-green-700 transition-colors duration-200">{reuniao.tema}</span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 whitespace-nowrap border-r border-gray-100 hidden md:table-cell text-sm">
                                                <span className="text-gray-700">{reuniao.ministrador_principal_nome || 'N/A'}</span>
                                            </td>
                                            <td className="py-3 px-4 whitespace-nowrap border-r border-gray-100 hidden lg:table-cell text-sm">
                                                <span className="text-gray-700">{reuniao.ministrador_secundario_nome || 'N/A'}</span>
                                            </td>
                                            <td className="py-3 px-4 whitespace-nowrap border-r border-gray-100 hidden md:table-cell text-sm">
                                                <span className="text-gray-700">{reuniao.responsavel_kids_nome || 'N/A'}</span>
                                            </td>
                                            <td className="py-3 px-4 whitespace-nowrap border-r border-gray-100 hidden sm:table-cell text-sm">
                                                {reuniao.caminho_pdf ? (
                                                    <a 
                                                        href={reuniao.caminho_pdf} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer" 
                                                        className="inline-flex items-center space-x-1 p-1.5 text-green-600 hover:text-green-800 hover:underline font-medium text-xs sm:text-sm transition-all duration-200 group"
                                                    >
                                                        <FaEye className="text-xs sm:text-sm group-hover:scale-110 transition-transform duration-200" />
                                                        <span className="hidden sm:inline">Ver PDF</span>
                                                    </a>
                                                ) : (
                                                    <span className="text-gray-400 italic text-xs sm:text-sm">
                                                        Nenhum {/* Fonte ajustada */}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 whitespace-nowrap text-sm">
                                                <div className="flex flex-wrap gap-1 justify-center sm:justify-start">
                                                    <Link 
                                                        href={`/reunioes/resumo/${reuniao.id}`} 
                                                        className="inline-flex items-center space-x-1 p-1.5 text-gray-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-all duration-200 group"
                                                        title="Ver Resumo"
                                                    >
                                                        <FaEye className="text-xs group-hover:scale-110 transition-transform duration-200" />
                                                        <span className="hidden md:inline">Resumo</span>
                                                    </Link>
                                                    
                                                    {userRole !== 'admin' && (
                                                        <>
                                                            <Link 
                                                                href={`/reunioes/editar/${reuniao.id}`} 
                                                                className="inline-flex items-center space-x-1 p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-all duration-200 group"
                                                                title="Editar Reunião"
                                                            >
                                                                <FaEdit className="text-xs group-hover:scale-110 transition-transform duration-200" />
                                                                <span className="hidden md:inline">Editar</span>
                                                            </Link>
                                                            
                                                            <Link 
                                                                href={`/reunioes/presenca/${reuniao.id}`} 
                                                                className="inline-flex items-center space-x-1 p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-all duration-200 group"
                                                                title="Gerenciar Presença"
                                                            >
                                                                <FaUsers className="text-xs group-hover:scale-110 transition-transform duration-200" />
                                                                <span className="hidden md:inline">Presença</span>
                                                            </Link>
                                                            
                                                            <button
                                                                onClick={() => handleDuplicarReuniao(reuniao.id, reuniao.data_reuniao)}
                                                                className="inline-flex items-center space-x-1 p-1.5 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
                                                                title="Duplicar Reunião"
                                                                disabled={submitting}
                                                            >
                                                                <FaCopy className="text-xs group-hover:scale-110 transition-transform duration-200" />
                                                                <span className="hidden md:inline">Duplicar</span>
                                                            </button>
                                                            
                                                            <button 
                                                                onClick={() => handleDelete(reuniao.id, reuniao.data_reuniao)}
                                                                className="inline-flex items-center space-x-1 p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
                                                                title="Excluir Reunião"
                                                                disabled={submitting}
                                                            >
                                                                <FaTrash className="text-xs group-hover:scale-110 transition-transform duration-200" />
                                                                <span className="hidden md:inline">Excluir</span>
                                                            </button>
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
                )}
            </div>

            {/* Renderiza o ToastContainer do hook global */}
            <ToastContainer />
        </div>
    );
}