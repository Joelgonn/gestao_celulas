// src/app/(app)/visitantes/page.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/utils/supabase/client'; 
import Link from 'next/link';
import { FaPhone, FaWhatsapp, FaPlus, FaEdit, FaTrash, FaUserPlus, FaUsers, FaSearch, FaFilter, FaCalendarAlt, FaComment } from 'react-icons/fa';
import { listarVisitantes, excluirVisitante, listarCelulasParaAdmin, CelulaOption, Visitante } from '@/lib/data'; 
import { formatPhoneNumberDisplay, formatDateForDisplay } from '@/utils/formatters'; 

// Componente Toast moderno
interface ToastProps {
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    onClose: () => void;
    duration?: number;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose, duration = 5000 }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, duration);
        return () => clearTimeout(timer);
    }, [onClose, duration]);

    const getIcon = () => {
        switch (type) {
            case 'success':
                return (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                );
            case 'error':
                return (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                );
            case 'warning':
                return (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                );
            case 'info':
                return (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                );
        }
    };

    const getStyles = () => {
        const base = "flex items-center p-4 mb-2 rounded-lg shadow-lg transform transition-all duration-300 ease-in-out animate-slide-in";
        switch (type) {
            case 'success':
                return `${base} bg-green-50 border border-green-200 text-green-800`;
            case 'error':
                return `${base} bg-red-50 border border-red-200 text-red-800`;
            case 'warning':
                return `${base} bg-yellow-50 border border-yellow-200 text-yellow-800`;
            case 'info':
                return `${base} bg-blue-50 border border-blue-200 text-blue-800`;
        }
    };

    return (
        <div className={getStyles()}>
            <div className={`inline-flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg ${type === 'success' ? 'bg-green-100 text-green-500' : type === 'error' ? 'bg-red-100 text-red-500' : type === 'warning' ? 'bg-yellow-100 text-yellow-500' : 'bg-blue-100 text-blue-500'}`}>
                {getIcon()}
            </div>
            <div className="ml-3 text-sm font-medium">{message}</div>
            <button
                type="button"
                className="ml-auto -mx-1.5 -my-1.5 rounded-lg p-1.5 inline-flex h-8 w-8 hover:bg-gray-100 transition-colors duration-200"
                onClick={onClose}
            >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            </button>
        </div>
    );
};

// Hook para gerenciar toasts
const useToast = () => {
    const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: 'success' | 'error' | 'warning' | 'info' }>>([]);

    const addToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
    };

    const removeToast = (id: number) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    };

    return { toasts, addToast, removeToast };
};

// Componente de Loading com spinner animado
const LoadingSpinner: React.FC = () => (
    <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
);

export default function VisitantesPage() {
    const [visitantes, setVisitantes] = useState<Visitante[]>([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<'admin' | 'líder' | null>(null);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [celulasOptions, setCelulasOptions] = useState<CelulaOption[]>([]);
    const [selectedCelulaId, setSelectedCelulaId] = useState<string>('');
    const [minDaysSinceLastContact, setMinDaysSinceLastContact] = useState<string>('');

    const [submitting, setSubmitting] = useState(false);

    // Usar o hook de toast
    const { toasts, addToast, removeToast } = useToast();

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
                if (profileError || !profile) {
                    console.error("Erro ao buscar perfil do usuário:", profileError);
                    setUserRole(null);
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

            const data = await listarVisitantes(
                selectedCelulaId === "" ? null : selectedCelulaId,
                null,
                minDaysSinceLastContact === "" ? null : parseInt(minDaysSinceLastContact)
            );
            setVisitantes(data);
            addToast('Dados carregados com sucesso!', 'success');
        } catch (e: any) {
            console.error("Erro ao buscar visitantes ou células:", e);
            addToast(`Erro ao carregar dados: ${e.message || 'Erro desconhecido.'}`, 'error');
        } finally {
            setLoading(false);
        }
    }, [selectedCelulaId, minDaysSinceLastContact, addToast]);

    useEffect(() => {
        fetchVisitantesAndCelulas();
    }, [fetchVisitantesAndCelulas]);

    const handleDelete = async (visitanteId: string, nome: string) => {
        if (!confirm(`Tem certeza que deseja remover o visitante ${nome}? Esta ação é irreversível.`)) {
            return;
        }
        setSubmitting(true);
        try {
            await excluirVisitante(visitanteId);
            setVisitantes(visitantes.filter(v => v.id !== visitanteId));
            addToast(`${nome} removido com sucesso!`, 'success');
        } catch (e: any) {
            console.error("Erro ao excluir visitante:", e);
            addToast(`Falha ao excluir ${nome}: ${e.message || "Erro desconhecido."}`, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const filteredVisitantes = useMemo(() => {
        if (!searchTerm) {
            return visitantes;
        }
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        return visitantes.filter(visitante => 
            visitante.nome.toLowerCase().includes(lowerCaseSearchTerm) ||
            (visitante.telefone && visitante.telefone.toLowerCase().includes(lowerCaseSearchTerm)) ||
            (userRole === 'admin' && visitante.celula_nome && visitante.celula_nome.toLowerCase().includes(lowerCaseSearchTerm))
        );
    }, [visitantes, searchTerm, userRole]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-8">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="bg-white rounded-xl shadow-lg p-8">
                        <div className="animate-pulse">
                            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
                            <div className="space-y-4">
                                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                            </div>
                        </div>
                        <LoadingSpinner />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-8">
            {/* Container de Toasts */}
            <div className="fixed top-4 right-4 z-50 w-80 space-y-2">
                {toasts.map((toast) => (
                    <Toast
                        key={toast.id}
                        message={toast.message}
                        type={toast.type}
                        onClose={() => removeToast(toast.id)}
                    />
                ))}
            </div>

            <div className="max-w-7xl mx-auto px-4">
                {/* Header com Gradiente */}
                <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl shadow-xl p-8 mb-8 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold mb-2">
                                {userRole === 'admin' ? 'Todos os Visitantes' : 'Meus Visitantes'}
                            </h1>
                            <div className="flex items-center space-x-4 text-green-100">
                                <div className="flex items-center space-x-2">
                                    <FaUsers className="w-5 h-5" />
                                    <span>{filteredVisitantes.length} visitante(s) encontrado(s)</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                    </svg>
                                    <span>Gerencie os visitantes da célula</span>
                                </div>
                            </div>
                        </div>
                        {userRole === 'admin' && (
                            <div className="bg-green-400 text-green-900 px-4 py-2 rounded-full font-semibold">
                                Administrador
                            </div>
                        )}
                    </div>
                </div>

                {/* Filtros e Ações */}
                <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
                        {/* Pesquisa */}
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <FaSearch className="text-gray-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="Pesquisar nome ou telefone..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                            />
                        </div>

                        {/* Filtro de Célula (Admin) */}
                        {userRole === 'admin' && (
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FaFilter className="text-gray-400" />
                                </div>
                                <select
                                    value={selectedCelulaId}
                                    onChange={(e) => setSelectedCelulaId(e.target.value)}
                                    className="pl-10 w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                                >
                                    <option value="">Todas as Células</option>
                                    {celulasOptions.map(celula => (
                                        <option key={celula.id} value={celula.id}>{celula.nome}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        
                        {/* Filtro de Dias sem Contato */}
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <FaCalendarAlt className="text-gray-400" />
                            </div>
                            <input
                                type="number"
                                placeholder="Sem contato há (dias)"
                                value={minDaysSinceLastContact}
                                onChange={(e) => setMinDaysSinceLastContact(e.target.value)}
                                className="pl-10 w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200"
                                min="0"
                            />
                        </div>

                        {/* Botão Novo Visitante */}
                        <div className="flex items-center">
                            {userRole !== 'admin' && ( 
                                <Link 
                                    href="/visitantes/novo" 
                                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 px-6 rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-300 flex items-center space-x-2 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-1 justify-center"
                                >
                                    <FaPlus className="text-sm" />
                                    <span>Novo Visitante</span>
                                </Link>
                            )}
                        </div>
                    </div>
                </div>

                {/* Lista de Visitantes */}
                {filteredVisitantes.length === 0 && !searchTerm && !selectedCelulaId && minDaysSinceLastContact === "" ? ( 
                    <div className="text-center p-12 bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-dashed border-gray-300 rounded-2xl">
                        <div className="max-w-md mx-auto">
                            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FaUsers className="text-2xl text-indigo-600" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-700 mb-2">
                                {userRole === 'admin' ? 'Nenhum visitante encontrado' : 'Nenhum visitante em sua célula'}
                            </h3>
                            <p className="text-gray-500 mb-6">
                                {userRole !== 'admin' ? 'Adicione o primeiro visitante da sua célula!' : 'Os visitantes aparecerão aqui quando forem cadastrados.'}
                            </p>
                            {userRole !== 'admin' && (
                                <Link 
                                    href="/visitantes/novo" 
                                    className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-6 py-3 rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition-all duration-300 font-medium inline-flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                                >
                                    <FaPlus />
                                    <span>Adicionar Primeiro Visitante</span>
                                </Link>
                            )}
                        </div>
                    </div>
                ) : filteredVisitantes.length === 0 && (searchTerm || selectedCelulaId || minDaysSinceLastContact !== "") ? ( 
                    <div className="text-center p-12 bg-yellow-50 border border-yellow-200 rounded-2xl">
                        <div className="max-w-md mx-auto">
                            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FaUsers className="text-2xl text-yellow-600" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-700 mb-2">Nenhum visitante encontrado</h3>
                            <p className="text-gray-500">Tente ajustar os filtros de pesquisa</p>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-200">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                                    <tr>
                                        <th scope="col" className="py-4 px-6 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">Nome</th>
                                        {userRole === 'admin' && (<th scope="col" className="py-4 px-6 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">Célula</th>)}
                                        <th scope="col" className="py-4 px-6 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">Telefone</th>
                                        <th scope="col" className="py-4 px-6 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">1ª Visita</th>
                                        <th scope="col" className="py-4 px-6 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">Últ. Contato</th>
                                        <th scope="col" className="py-4 px-6 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">Observações</th>
                                        <th scope="col" className="py-4 px-6 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredVisitantes.map((visitante) => (
                                        <tr key={visitante.id} className="hover:bg-gray-50 transition-colors duration-150">
                                            <td className="py-4 px-6 whitespace-nowrap border-r border-gray-100">
                                                <span className="font-medium text-gray-900">{visitante.nome}</span>
                                            </td>
                                            {userRole === 'admin' && ( 
                                                <td className="py-4 px-6 whitespace-nowrap border-r border-gray-100">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                        {visitante.celula_nome || 'N/A'}
                                                    </span>
                                                </td>
                                            )}
                                            <td className="py-4 px-6 whitespace-nowrap border-r border-gray-100">
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-gray-700">{formatPhoneNumberDisplay(visitante.telefone)}</span>
                                                    {visitante.telefone && (userRole === 'líder' || (userRole === 'admin' && selectedCelulaId)) && (
                                                        <div className="flex space-x-1">
                                                            <a 
                                                                href={`tel:${visitante.telefone}`} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer" 
                                                                className="text-blue-500 hover:text-blue-700 p-1 rounded hover:bg-blue-50 transition-colors"
                                                                title="Ligar"
                                                            >
                                                                <FaPhone className="text-sm" />
                                                            </a>
                                                            <a 
                                                                href={`https://wa.me/${visitante.telefone}`} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer" 
                                                                className="text-green-500 hover:text-green-700 p-1 rounded hover:bg-green-50 transition-colors"
                                                                title="WhatsApp"
                                                            >
                                                                <FaWhatsapp className="text-sm" />
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 whitespace-nowrap border-r border-gray-100">
                                                <span className="text-gray-700">{formatDateForDisplay(visitante.data_primeira_visita)}</span>
                                            </td>
                                            <td className="py-4 px-6 whitespace-nowrap border-r border-gray-100">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${visitante.data_ultimo_contato ? 'bg-green-100 text-green-800 border-green-200' : 'bg-orange-100 text-orange-800 border-orange-200'}`}>
                                                    {formatDateForDisplay(visitante.data_ultimo_contato) || 'Nunca'}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 border-r border-gray-100">
                                                <div className="max-w-xs">
                                                    <div className="flex items-start space-x-2">
                                                        <FaComment className="text-gray-400 mt-0.5 flex-shrink-0" />
                                                        <span 
                                                            className="text-sm text-gray-600 line-clamp-2" 
                                                            title={visitante.observacoes || undefined}
                                                        >
                                                            {visitante.observacoes || 'Nenhuma observação'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 whitespace-nowrap">
                                                <div className="flex items-center justify-start space-x-2">
                                                    <Link 
                                                        href={`/visitantes/editar/${visitante.id}`} 
                                                        className="inline-flex items-center space-x-1 p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                                                        title="Editar Visitante"
                                                    >
                                                        <FaEdit className="text-sm" />
                                                    </Link>
                                                    <button 
                                                        onClick={() => handleDelete(visitante.id, visitante.nome)}
                                                        className="inline-flex items-center space-x-1 p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        title="Excluir Visitante"
                                                        disabled={submitting}
                                                    >
                                                        <FaTrash className="text-sm" />
                                                    </button>
                                                    <Link 
                                                        href={`/visitantes/converter/${visitante.id}`} 
                                                        className="inline-flex items-center space-x-1 p-2 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors duration-200"
                                                        title="Converter em Membro"
                                                    >
                                                        <FaUserPlus className="text-sm" />
                                                    </Link>
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

            {/* Estilos de animação */}
            <style jsx>{`
                @keyframes slide-in {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                .animate-slide-in {
                    animation: slide-in 0.3s ease-out;
                }
            `}</style>
        </div>
    );
}