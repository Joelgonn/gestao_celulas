// src/app/(app)/membros/page.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react'; 
import { supabase } from '@/utils/supabase/client'; 
import Link from 'next/link';
import { FaPhone, FaWhatsapp, FaPlus, FaUserCog, FaFileImport, FaFileExport, FaSpinner, FaEdit, FaTrash, FaSearch, FaFilter, FaUsers } from 'react-icons/fa'; 
import { Membro, listarMembros, excluirMembro, listarCelulasParaAdmin, CelulaOption, exportarMembrosCSV } from '@/lib/data'; 
import { formatPhoneNumberDisplay, formatDateForDisplay } from '@/utils/formatters'; 

// --- REFATORAÇÃO: TOASTS & LOADING SPINNER ---
// Agora importamos o useToast do hook global
import useToast from '@/hooks/useToast';
// Importamos o componente Toast e LoadingSpinner do diretório de componentes,
// presumindo que você tenha um src/components/ui/Toast.tsx e um src/components/LoadingSpinner.tsx
import Toast from '@/components/ui/Toast'; 
import LoadingSpinner from '@/components/LoadingSpinner'; // Assumimos que existe um LoadingSpinner global

export default function MembrosPage() {
    const [membros, setMembros] = useState<Membro[]>([]); 
    const [loading, setLoading] = useState(true); 
    const [userRole, setUserRole] = useState<'admin' | 'líder' | null>(null); 
    
    const [searchTerm, setSearchTerm] = useState(''); 
    const [celulasOptions, setCelulasOptions] = useState<CelulaOption[]>([]); 
    const [selectedCelulaId, setSelectedCelulaId] = useState<string>(''); 
    const [selectedBirthdayMonth, setSelectedBirthdayMonth] = useState<string>(''); 
    const [selectedStatusFilter, setSelectedStatusFilter] = useState<Membro['status'] | 'all'>('all'); 

    const [submitting, setSubmitting] = useState(false); 
    const [exporting, setExporting] = useState(false); 

    // Usar o hook de toast global
    const { toasts, addToast, removeToast } = useToast();

    // Funções de fetch encapsuladas em useCallback
    const fetchMembrosAndCelulas = useCallback(async () => { 
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

            const data = await listarMembros(
                selectedCelulaId === "" ? null : selectedCelulaId, 
                null, 
                selectedBirthdayMonth === "" ? null : parseInt(selectedBirthdayMonth), 
                selectedStatusFilter 
            );
            setMembros(data);
            addToast('Dados carregados com sucesso!', 'success');
        } catch (e: any) {
            console.error("Erro ao buscar membros ou células:", e);
            addToast('Erro ao carregar dados: ' + (e.message || 'Erro desconhecido.'), 'error'); 
        } finally {
            setLoading(false);
        }
    // CORREÇÃO: addToast NÃO É MAIS UMA DEPENDÊNCIA VARIÁVEL, REMOVER DAQUI.
    }, [selectedCelulaId, selectedBirthdayMonth, selectedStatusFilter]); // Removido addToast

    // O useEffect agora só roda quando fetchMembrosAndCelulas muda, o que só acontece
    // quando as dependências REAIS (filtros) mudam.
    useEffect(() => {
        fetchMembrosAndCelulas();
    }, [fetchMembrosAndCelulas]); 

    const handleDelete = async (membroId: string, nome: string) => {
        if (!confirm('Tem certeza que deseja remover ' + nome + '? Esta ação é irreversível.')) {
            return; 
        }
        setSubmitting(true); 
        try {
            await excluirMembro(membroId);
            setMembros(membros.filter(m => m.id !== membroId)); 
            addToast(nome + ' removido com sucesso!', 'success'); 
        } catch (e: any) {
            console.error("Erro ao excluir membro:", e);
            addToast('Falha ao excluir ' + nome + ': ' + (e.message || "Erro desconhecido."), 'error'); 
        } finally {
            setSubmitting(false); 
        }
    };

    const filteredMembros = useMemo(() => {
        if (!searchTerm) {
            return membros; 
        }
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        return membros.filter(membro => 
            membro.nome.toLowerCase().includes(lowerCaseSearchTerm) ||
            (membro.telefone && membro.telefone.toLowerCase().includes(lowerCaseSearchTerm)) ||
            (userRole === 'admin' && membro.celula_nome && membro.celula_nome.toLowerCase().includes(lowerCaseSearchTerm))
        );
    }, [membros, searchTerm, userRole]); 

    const handleExportCSV = async () => {
        setExporting(true); 
        try {
            const csv = await exportarMembrosCSV(
                selectedCelulaId === "" ? null : selectedCelulaId, 
                searchTerm, 
                selectedBirthdayMonth === "" ? null : parseInt(selectedBirthdayMonth), 
                selectedStatusFilter 
            );
            
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            if (link.download !== undefined) { 
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', 'membros_' + new Date().toISOString().split('T')[0] + '.csv');
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url); 
                addToast("Arquivo CSV exportado com sucesso!", 'success'); 
            } else {
                addToast("Seu navegador não suporta download automático.", 'warning');
            }
        } catch (e: any) {
            console.error("Erro ao exportar CSV:", e);
            addToast('Erro ao exportar CSV: ' + (e.message || "Erro desconhecido."), 'error'); 
        } finally {
            setExporting(false); 
        }
    };

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
                        <LoadingSpinner /> {/* Usa o LoadingSpinner global */}
                    </div>
                </div>
            </div>
        );
    }

    const months = Array.from({ length: 12 }, (_, i) => ({
        value: (i + 1).toString(), 
        label: new Date(0, i).toLocaleString('pt-BR', { month: 'long' }), 
    }));

    const getStatusBadge = (status: Membro['status']) => {
        const statusColors = {
            'Ativo': 'bg-green-100 text-green-800 border-green-200',
            'Inativo': 'bg-red-100 text-red-800 border-red-200',
            'Em transição': 'bg-yellow-100 text-yellow-800 border-yellow-200'
        };
        
        return statusColors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
    };

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
                                {userRole === 'admin' ? 'Todos os Membros' : 'Meus Membros'}
                            </h1>
                            <div className="flex items-center space-x-4 text-green-100">
                                <div className="flex items-center space-x-2">
                                    <FaUsers className="w-5 h-5" />
                                    <span>{filteredMembros.length} membro(s) encontrado(s)</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                    </svg>
                                    <span>Gerencie os membros da célula</span>
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
                        
                        {/* Filtro de Mês de Aniversário */}
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <select
                                value={selectedBirthdayMonth}
                                onChange={(e) => setSelectedBirthdayMonth(e.target.value)}
                                className="pl-10 w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-white"
                            >
                                <option value="">Aniversário (Mês)</option>
                                {months.map(month => ( 
                                    <option key={month.value} value={month.value}>
                                        {month.label.charAt(0).toUpperCase() + month.label.slice(1)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Filtro de Status */}
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <select
                                value={selectedStatusFilter}
                                onChange={(e) => setSelectedStatusFilter(e.target.value as Membro['status'] | 'all')}
                                className="pl-10 w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 bg-white"
                            >
                                <option value="all">Todos os Status</option>
                                <option value="Ativo">Ativo</option>
                                <option value="Inativo">Inativo</option>
                                <option value="Em transição">Em transição</option>
                            </select>
                        </div>
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex flex-wrap gap-3">
                        {userRole === 'admin' ? (
                            <Link 
                                href="/admin/users" 
                                className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 px-6 rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center space-x-2 font-medium"
                            >
                                <FaUserCog /> 
                                <span>Gerenciar Perfis</span>
                            </Link>
                        ) : ( 
                            <Link 
                                href="/membros/novo" 
                                className="bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 px-6 rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center space-x-2 font-medium"
                            >
                                <FaPlus /> 
                                <span>Novo Membro</span>
                            </Link>
                        )}
                        
                        {userRole === 'líder' && (
                            <Link 
                                href="/membros/importar" 
                                className="bg-gradient-to-r from-orange-500 to-amber-500 text-white py-3 px-6 rounded-xl hover:from-orange-600 hover:to-amber-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center space-x-2 font-medium"
                            >
                                <FaFileImport /> 
                                <span>Importar</span>
                            </Link>
                        )}

                        <button
                            onClick={handleExportCSV}
                            disabled={exporting || (filteredMembros.length === 0 && !searchTerm && !selectedCelulaId && selectedBirthdayMonth === "" && selectedStatusFilter === "all")}
                            className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 px-6 rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all duration-300 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:transform-none disabled:hover:shadow-lg flex items-center space-x-2 font-medium"
                        >
                            {exporting ? (
                                <>
                                    <FaSpinner className="animate-spin" /> 
                                    <span>Exportando...</span>
                                </>
                            ) : (
                                <>
                                    <FaFileExport /> 
                                    <span>Exportar CSV</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Lista de Membros */}
                {filteredMembros.length === 0 && !searchTerm && !selectedCelulaId && selectedBirthdayMonth === "" && selectedStatusFilter === "all" ? ( 
                    <div className="text-center p-12 bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-dashed border-gray-300 rounded-2xl">
                        <div className="max-w-md mx-auto">
                            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FaUsers className="text-2xl text-indigo-600" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-700 mb-2">
                                {userRole === 'admin' ? 'Nenhum membro encontrado' : 'Nenhum membro em sua célula'}
                            </h3>
                            <p className="text-gray-500 mb-6">
                                {userRole !== 'admin' ? 'Adicione o primeiro membro da sua célula!' : 'Os membros aparecerão aqui quando forem cadastrados.'}
                            </p>
                            {userRole !== 'admin' && (
                                <Link 
                                    href="/membros/novo" 
                                    className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-6 py-3 rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition-all duration-300 font-medium inline-flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                                >
                                    <FaPlus />
                                    <span>Adicionar Primeiro Membro</span>
                                </Link>
                            )}
                        </div>
                    </div>
                ) : filteredMembros.length === 0 && (searchTerm || selectedCelulaId || selectedBirthdayMonth !== "" || selectedStatusFilter !== "all") ? ( 
                    <div className="text-center p-12 bg-yellow-50 border border-yellow-200 rounded-2xl">
                        <div className="max-w-md mx-auto">
                            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FaUsers className="text-2xl text-yellow-600" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-700 mb-2">Nenhum membro encontrado</h3>
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
                                        <th scope="col" className="py-4 px-6 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">Ingresso</th>
                                        <th scope="col" className="py-4 px-6 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">Nascimento</th>
                                        <th scope="col" className="py-4 px-6 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">Status</th>
                                        <th scope="col" className="py-4 px-6 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredMembros.map((membro) => (
                                        <tr key={membro.id} className="hover:bg-gray-50 transition-colors duration-150">
                                            <td className="py-4 px-6 whitespace-nowrap border-r border-gray-100">
                                                <span className="font-medium text-gray-900">{membro.nome}</span>
                                            </td>
                                            {userRole === 'admin' && ( 
                                                <td className="py-4 px-6 whitespace-nowrap border-r border-gray-100">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                        {membro.celula_nome || 'N/A'}
                                                    </span>
                                                </td>
                                            )}
                                            <td className="py-4 px-6 whitespace-nowrap border-r border-gray-100">
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-gray-700">{formatPhoneNumberDisplay(membro.telefone)}</span>
                                                    {membro.telefone && (userRole === 'líder' || (userRole === 'admin' && selectedCelulaId)) && (
                                                        <div className="flex space-x-1">
                                                            <a href={'tel:' + membro.telefone} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 p-1 rounded hover:bg-blue-50 transition-colors">
                                                                <FaPhone className="text-sm" />
                                                            </a>
                                                            <a href={'https://wa.me/' + membro.telefone} target="_blank" rel="noopener noreferrer" className="text-green-500 hover:text-green-700 p-1 rounded hover:bg-green-50 transition-colors">
                                                                <FaWhatsapp className="text-sm" />
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 whitespace-nowrap border-r border-gray-100">
                                                <span className="text-gray-700">{formatDateForDisplay(membro.data_ingresso)}</span>
                                            </td>
                                            <td className="py-4 px-6 whitespace-nowrap border-r border-gray-100">
                                                <span className="text-gray-700">{formatDateForDisplay(membro.data_nascimento)}</span>
                                            </td>
                                            <td className="py-4 px-6 whitespace-nowrap border-r border-gray-100">
                                                <span className={'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ' + getStatusBadge(membro.status)}>
                                                    {membro.status || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 whitespace-nowrap">
                                                <div className="flex items-center justify-start space-x-2">
                                                    <Link 
                                                        href={'/membros/editar/' + membro.id}
                                                        className="inline-flex items-center space-x-1 p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                                                        title="Editar Membro"
                                                    >
                                                        <FaEdit className="text-sm" />
                                                    </Link>
                                                    <button 
                                                        onClick={() => handleDelete(membro.id, membro.nome)}
                                                        className="inline-flex items-center space-x-1 p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        title="Excluir Membro"
                                                        disabled={submitting} 
                                                    >
                                                        <FaTrash className="text-sm" />
                                                    </button>
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

// TESTE DE MUDANÇA