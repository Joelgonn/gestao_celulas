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

// Importa interfaces de types.ts <--- CORREÇÃO AQUI
import { 
    ReuniaoComNomes,    // Adicionado
    CelulaOption,       // Adicionado
} from '@/lib/types';


import { formatDateForDisplay } from '@/utils/formatters'; 
import LoadingSpinner from '@/components/LoadingSpinner'; 

// REMOVER ESTE BLOCO: Sistema de Toast integrado, será substituído pelo global
// interface Toast {
//   id: string;
//   message: string;
//   type: 'success' | 'error' | 'warning' | 'info';
//   duration?: number;
// }

// const useToast = () => {
//   const [toasts, setToasts] = useState<Toast[]>([]);

//   const addToast = useCallback((message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', duration: number = 5000) => {
//     const id = Math.random().toString(36).substring(2, 9);
//     const newToast: Toast = { id, message, type, duration };
    
//     setToasts(prev => [...prev, newToast]);

//     if (duration > 0) {
//       setTimeout(() => {
//         removeToast(id);
//       }, duration);
//     }
//   }, []);

//   const removeToast = useCallback((id: string) => {
//     setToasts(prev => prev.filter(toast => toast.id !== id));
//   }, []);

//   const ToastContainer = () => (
//     <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm w-full">
//       {toasts.map((toast) => (
//         <div
//           key={toast.id}
//           className={`p-4 rounded-xl shadow-lg border-l-4 transform transition-all duration-300 ease-in-out ${
//             toast.type === 'success' 
//               ? 'bg-green-50 border-green-500 text-green-800' 
//               : toast.type === 'error'
//               ? 'bg-red-50 border-red-500 text-red-800'
//               : toast.type === 'warning'
//               ? 'bg-yellow-50 border-yellow-500 text-yellow-800'
//               : 'bg-blue-50 border-blue-500 text-blue-800'
//           }`}
//         >
//           <div className="flex items-start space-x-3">
//             <div className={`flex-shrink-0 mt-0.5 ${
//               toast.type === 'success' 
//                 ? 'text-green-500' 
//                 : toast.type === 'error'
//                 ? 'text-red-500'
//                 : toast.type === 'warning'
//                 ? 'text-yellow-500'
//                 : 'text-blue-500'
//             }`}>
//               {toast.type === 'success' && <FaCheckCircle className="text-lg" />}
//               {toast.type === 'error' && <FaExclamationTriangle className="text-lg" />}
//               {toast.type === 'warning' && <FaExclamationTriangle className="text-lg" />}
//               {toast.type === 'info' && <FaInfoCircle className="text-lg" />}
//             </div>
//             <div className="flex-1">
//               <p className="text-sm font-medium">{toast.message}</p>
//             </div>
//             <button
//               onClick={() => removeToast(toast.id)}
//               className={`flex-shrink-0 ml-2 hover:bg-opacity-20 hover:bg-black rounded-full p-1 transition-colors ${
//                 toast.type === 'success' 
//                   ? 'text-green-500 hover:text-green-700' 
//                   : toast.type === 'error'
//                   ? 'text-red-500 hover:text-red-700'
//                   : toast.type === 'warning'
//                   ? 'text-yellow-500 hover:text-yellow-700'
//                   : 'text-blue-500 hover:text-blue-700'
//               }`}
//             >
//               <FaTimes className="text-sm" />
//             </button>
//           </div>
//         </div>
//       ))}
//     </div>
//   );

//   return { addToast, removeToast, ToastContainer };
// };
// FIM DO BLOCO A SER REMOVIDO

// ADICIONAR IMPORTS DO TOAST GLOBAL
import useToast from '@/hooks/useToast';
import Toast from '@/components/ui/Toast';


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
    // CORREÇÃO: Usar o hook useToast global
    const { addToast, toasts, removeToast } = useToast();

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
                        addToast('Células carregadas com sucesso', 'success');
                    }
                }
            } else {
                setUserRole(null);
            }

            const data = await listarReunioes();
            setReunioes(data);
            addToast('Reuniões carregadas com sucesso', 'success');
        } catch (e: any) {
            console.error("Erro ao buscar reuniões ou opções:", e);
            setError(e.message || "Erro ao carregar reuniões ou opções.");
            addToast(`Erro ao carregar reuniões: ${e.message || 'Erro desconhecido.'}`, 'error');
        } finally {
            setLoading(false);
        }
    }, [addToast]); // addToast é uma dependência estável do hook global

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
            const newReuniaoId = await duplicarReuniao(reuniaoId);
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
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
            <div className="max-w-7xl mx-auto">
                {/* Header com gradiente verde */}
                <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl shadow-xl p-8 mb-8 text-white">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-6 lg:space-y-0">
                        <div>
                            <h1 className="text-3xl lg:text-4xl font-bold mb-2">
                                {userRole === 'admin' ? 'Todas as Reuniões' : 'Minhas Reuniões'}
                            </h1>
                            <p className="text-green-100 text-lg">Gerencie as reuniões da célula de forma eficiente</p>
                        </div>
                        
                        {userRole !== 'admin' && ( 
                            <Link 
                                href="/reunioes/novo" 
                                className="bg-white text-green-700 py-3 px-8 rounded-xl hover:bg-green-50 transition-all duration-200 flex items-center space-x-3 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                            >
                                <FaFileUpload className="text-lg" />
                                <span>Nova Reunião</span>
                            </Link>
                        )}
                    </div>
                </div>

                {/* Filtros em Card */}
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {userRole === 'admin' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <FaUsers className="inline mr-2 text-gray-500" />
                                    Filtrar por Célula
                                </label>
                                <select
                                    value={selectedCelulaId}
                                    onChange={(e) => setSelectedCelulaId(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white transition-all duration-200"
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
                                <FaSearch className="inline mr-2 text-gray-500" />
                                Pesquisar por Tema
                            </label>
                            <input
                                type="text"
                                placeholder="Digite o tema..."
                                value={searchTermTema}
                                onChange={(e) => setSearchTermTema(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white transition-all duration-200"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <FaUsers className="inline mr-2 text-gray-500" />
                                Pesquisar Ministrador
                            </label>
                            <input
                                type="text"
                                placeholder="Digite o nome..."
                                value={searchTermMinistrador}
                                onChange={(e) => setSearchTermMinistrador(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white transition-all duration-200"
                            />
                        </div>

                        <div className="flex items-end">
                            <button
                                onClick={() => {
                                    setSelectedCelulaId('');
                                    setSearchTermTema('');
                                    setSearchTermMinistrador('');
                                }}
                                className="w-full bg-gradient-to-r from-gray-600 to-gray-700 text-white py-3 px-6 rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                            >
                                Limpar Filtros
                            </button>
                        </div>
                    </div>
                </div>

                {/* Conteúdo Principal */}
                {filteredReunioes.length === 0 && !searchTermTema && !searchTermMinistrador && !selectedCelulaId ? ( 
                    <div className="bg-white rounded-2xl shadow-lg p-12 text-center border-2 border-dashed border-gray-300">
                        <div className="max-w-md mx-auto">
                            <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <FaUsers className="text-3xl text-green-600" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-800 mb-3">
                                {userRole === 'admin' ? 'Nenhuma reunião encontrada' : 'Nenhuma reunião em sua célula'}
                            </h3>
                            <p className="text-gray-600 mb-8 text-lg">
                                {userRole !== 'admin' ? 'Comece registrando a primeira reunião da sua célula!' : 'As reuniões aparecerão aqui quando forem registradas pelas células.'}
                            </p>
                            {userRole !== 'admin' && (
                                <Link 
                                    href="/reunioes/novo" 
                                    className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-4 rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 font-semibold text-lg inline-flex items-center space-x-3 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                                >
                                    <FaFileUpload className="text-xl" />
                                    <span>Registrar Primeira Reunião</span>
                                </Link>
                            )}
                        </div>
                    </div>
                ) : filteredReunioes.length === 0 && (searchTermTema || searchTermMinistrador || selectedCelulaId) ? ( 
                    <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-2xl shadow-lg p-12 text-center border border-yellow-200">
                        <div className="max-w-md mx-auto">
                            <div className="w-20 h-20 bg-gradient-to-br from-yellow-100 to-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <FaEye className="text-3xl text-yellow-600" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-800 mb-3">Nenhuma reunião encontrada</h3>
                            <p className="text-gray-600 mb-4">Não encontramos reuniões com os filtros aplicados.</p>
                            <p className="text-gray-500 text-sm">Tente ajustar os critérios de pesquisa ou limpar os filtros</p>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                                    <tr>
                                        <th scope="col" className="py-5 px-6 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">Data</th>
                                        {userRole === 'admin' && (<th scope="col" className="py-5 px-6 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">Célula</th>)}
                                        <th scope="col" className="py-5 px-6 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">Tema / Palavra</th>
                                        <th scope="col" className="py-5 px-6 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">Ministrador 1</th>
                                        <th scope="col" className="py-5 px-6 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">Ministrador 2</th>
                                        <th scope="col" className="py-5 px-6 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">Resp. Kids</th>
                                        <th scope="col" className="py-5 px-6 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">Material</th>
                                        <th scope="col" className="py-5 px-6 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredReunioes.map((reuniao) => (
                                        <tr key={reuniao.id} className="hover:bg-gray-50 transition-all duration-200 group">
                                            <td className="py-5 px-6 whitespace-nowrap border-r border-gray-100">
                                                <span className="font-semibold text-gray-900 text-sm">{formatDateForDisplay(reuniao.data_reuniao)}</span>
                                            </td>
                                            {userRole === 'admin' && ( 
                                                <td className="py-5 px-6 whitespace-nowrap border-r border-gray-100">
                                                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-200">
                                                        {reuniao.celula_nome || 'N/A'}
                                                    </span>
                                                </td>
                                            )}
                                            <td className="py-5 px-6 border-r border-gray-100">
                                                <div className="max-w-xs">
                                                    <span className="text-gray-900 font-medium text-sm line-clamp-2 group-hover:text-green-700 transition-colors duration-200">{reuniao.tema}</span>
                                                </div>
                                            </td>
                                            <td className="py-5 px-6 whitespace-nowrap border-r border-gray-100">
                                                <span className="text-gray-700 text-sm">{reuniao.ministrador_principal_nome || 'N/A'}</span>
                                            </td>
                                            <td className="py-5 px-6 whitespace-nowrap border-r border-gray-100">
                                                <span className="text-gray-700 text-sm">{reuniao.ministrador_secundario_nome || 'N/A'}</span>
                                            </td>
                                            <td className="py-5 px-6 whitespace-nowrap border-r border-gray-100">
                                                <span className="text-gray-700 text-sm">{reuniao.responsavel_kids_nome || 'N/A'}</span>
                                            </td>
                                            <td className="py-5 px-6 whitespace-nowrap border-r border-gray-100">
                                                {reuniao.caminho_pdf ? (
                                                    <a 
                                                        href={reuniao.caminho_pdf} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer" 
                                                        className="inline-flex items-center space-x-2 text-green-600 hover:text-green-800 hover:underline font-medium text-sm transition-all duration-200 group"
                                                    >
                                                        <FaEye className="text-sm group-hover:scale-110 transition-transform duration-200" />
                                                        <span>Ver PDF</span>
                                                    </a>
                                                ) : (
                                                    <span className="text-gray-400 italic text-sm">Nenhum</span>
                                                )}
                                            </td>
                                            <td className="py-5 px-6 whitespace-nowrap">
                                                <div className="flex items-center justify-start space-x-2">
                                                    <Link 
                                                        href={`/reunioes/resumo/${reuniao.id}`} 
                                                        className="inline-flex items-center space-x-1 p-2.5 text-gray-600 hover:text-green-700 hover:bg-green-50 rounded-xl transition-all duration-200 group"
                                                        title="Ver Resumo"
                                                    >
                                                        <FaEye className="text-sm group-hover:scale-110 transition-transform duration-200" />
                                                    </Link>
                                                    
                                                    {userRole !== 'admin' && (
                                                        <>
                                                            <Link 
                                                                href={`/reunioes/editar/${reuniao.id}`} 
                                                                className="inline-flex items-center space-x-1 p-2.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-xl transition-all duration-200 group"
                                                                title="Editar Reunião"
                                                            >
                                                                <FaEdit className="text-sm group-hover:scale-110 transition-transform duration-200" />
                                                            </Link>
                                                            
                                                            <Link 
                                                                href={`/reunioes/presenca/${reuniao.id}`} 
                                                                className="inline-flex items-center space-x-1 p-2.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-xl transition-all duration-200 group"
                                                                title="Gerenciar Presença"
                                                            >
                                                                <FaUsers className="text-sm group-hover:scale-110 transition-transform duration-200" />
                                                            </Link>
                                                            
                                                            <button
                                                                onClick={() => handleDuplicarReuniao(reuniao.id, reuniao.data_reuniao)}
                                                                className="inline-flex items-center space-x-1 p-2.5 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
                                                                title="Duplicar Reunião"
                                                                disabled={submitting}
                                                            >
                                                                <FaCopy className="text-sm group-hover:scale-110 transition-transform duration-200" />
                                                            </button>
                                                            
                                                            <button 
                                                                onClick={() => handleDelete(reuniao.id, reuniao.data_reuniao)}
                                                                className="inline-flex items-center space-x-1 p-2.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
                                                                title="Excluir Reunião"
                                                                disabled={submitting}
                                                            >
                                                                <FaTrash className="text-sm group-hover:scale-110 transition-transform duration-200" />
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

            {/* Container de Toasts global */}
            {/* CORREÇÃO: Renderizar o ToastContainer do hook global */}
            <div className="fixed top-4 right-4 z-50 w-80 space-y-2">
                {toasts.map((toast) => (
                    <Toast
                        key={toast.id}
                        message={toast.message}
                        type={toast.type}
                        onClose={() => removeToast(toast.id)}
                        duration={toast.duration}
                    />
                ))}
            </div>
            {/* FIM CORREÇÃO */}
        </div>
    );
}