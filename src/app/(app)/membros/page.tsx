// src/app/(app)/membros/page.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react'; 
import { supabase } from '@/utils/supabase/client'; 
import Link from 'next/link';
import { 
    FaPhone, 
    FaWhatsapp, 
    FaPlus, 
    FaUserCog, 
    FaFileImport, 
    FaFileExport, 
    FaSpinner, 
    FaEdit, 
    FaTrash, 
    FaSearch, 
    FaFilter, 
    FaUsers,
    FaBirthdayCake,
    FaCalendarAlt,
    FaUser
} from 'react-icons/fa'; 

import { 
    listarMembros, 
    excluirMembro, 
    listarCelulasParaAdmin, 
    exportarMembrosCSV 
} from '@/lib/data'; 

import { Membro, CelulaOption } from '@/lib/types'; 
import { formatPhoneNumberDisplay, formatDateForDisplay } from '@/utils/formatters'; 
import useToast from '@/hooks/useToast'; 
import LoadingSpinner from '@/components/LoadingSpinner'; 

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

    const { addToast, ToastContainer } = useToast();

    useEffect(() => {
        async function fetchInitialUserRole() {
            setLoading(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', user.id)
                        .single();
                    if (profile) {
                        setUserRole(profile.role as 'admin' | 'líder');
                    }
                }
            } catch (e: any) {
                console.error("Erro perfil:", e);
                addToast('Erro ao carregar perfil', 'error');
            }
        }
        fetchInitialUserRole();
    }, [addToast]);

    const loadAllData = useCallback(async () => { 
        if (userRole === null) return;

        setLoading(true);
        try {
            if (userRole === 'admin') {
                const celulasData = await listarCelulasParaAdmin();
                setCelulasOptions(celulasData);
            }

            let celulaIdForMembrosFetch = userRole === 'admin' && selectedCelulaId !== "" ? selectedCelulaId : null;

            const membrosData = await listarMembros(
                celulaIdForMembrosFetch, 
                searchTerm, 
                selectedBirthdayMonth === "" ? null : parseInt(selectedBirthdayMonth), 
                selectedStatusFilter 
            );
            setMembros(membrosData);
            // addToast('Membros carregados', 'success'); // Opcional
        } catch (e: any) {
            console.error("Erro membros:", e);
            addToast('Erro ao carregar membros', 'error'); 
        } finally {
            setLoading(false);
        }
    }, [userRole, selectedCelulaId, searchTerm, selectedBirthdayMonth, selectedStatusFilter, addToast]); 

    useEffect(() => {
        loadAllData();
    }, [loadAllData]);

    const handleDelete = async (membroId: string, nome: string) => {
        if (!confirm(`Remover ${nome}? Ação irreversível.`)) return;
        setSubmitting(true); 
        try {
            await excluirMembro(membroId);
            setMembros(prev => prev.filter(m => m.id !== membroId)); 
            addToast('Membro removido', 'success'); 
        } catch (e: any) {
            console.error("Erro delete:", e);
            addToast('Erro ao remover membro', 'error'); 
        } finally {
            setSubmitting(false); 
        }
    };

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
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `membros_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            addToast("CSV exportado!", 'success'); 
        } catch (e: any) {
            console.error("Erro CSV:", e);
            addToast('Erro ao exportar CSV', 'error'); 
        } finally {
            setExporting(false); 
        }
    };

    const months = Array.from({ length: 12 }, (_, i) => ({
        value: (i + 1).toString(), 
        label: new Date(0, i).toLocaleString('pt-BR', { month: 'long' }), 
    }));

    const getStatusBadgeColor = (status: Membro['status']) => {
        switch (status) {
            case 'Ativo': return 'bg-green-100 text-green-800';
            case 'Inativo': return 'bg-red-100 text-red-800';
            case 'Em transição': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading && !membros.length) {
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
                            <FaUsers /> {userRole === 'admin' ? 'Todos os Membros' : 'Minha Célula'}
                        </h1>
                        <p className="text-green-100 text-sm mt-1 flex items-center gap-2">
                            <span>{membros.length} cadastrados</span>
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2 w-full md:w-auto">
                        {userRole === 'admin' ? (
                            <Link href="/admin/users" className="bg-white/20 hover:bg-white/30 text-white py-2 px-4 rounded-xl backdrop-blur-sm text-sm font-medium flex items-center gap-2">
                                <FaUserCog /> Perfis
                            </Link>
                        ) : ( 
                            <>
                                <Link href="/membros/novo" className="bg-white text-green-700 hover:bg-green-50 py-2 px-4 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm">
                                    <FaPlus /> Novo
                                </Link>
                                {userRole === 'líder' && (
                                    <Link href="/membros/importar" className="bg-white/20 hover:bg-white/30 text-white py-2 px-4 rounded-xl backdrop-blur-sm text-sm font-medium flex items-center gap-2">
                                        <FaFileImport /> Importar
                                    </Link>
                                )}
                            </>
                        )}
                        <button
                            onClick={handleExportCSV}
                            disabled={exporting || !membros.length} 
                            className="bg-white/20 hover:bg-white/30 text-white py-2 px-4 rounded-xl backdrop-blur-sm text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                        >
                            {exporting ? <FaSpinner className="animate-spin" /> : <FaFileExport />}
                            <span className="hidden sm:inline">CSV</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
                
                {/* Filtros Mobile-Friendly */}
                <div className="bg-white rounded-xl shadow-md p-4 mb-6 border border-gray-100">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="relative">
                            <FaSearch className="absolute left-3 top-3.5 text-gray-400 text-sm" />
                            <input
                                type="text"
                                placeholder="Buscar nome/tel..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 w-full border border-gray-300 rounded-lg py-2.5 text-base focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            />
                        </div>

                        {userRole === 'admin' && (
                            <div className="relative">
                                <FaFilter className="absolute left-3 top-3.5 text-gray-400 text-sm" />
                                <select
                                    value={selectedCelulaId}
                                    onChange={(e) => setSelectedCelulaId(e.target.value)}
                                    className="pl-9 w-full border border-gray-300 rounded-lg py-2.5 text-base bg-white focus:ring-2 focus:ring-green-500"
                                >
                                    <option value="">Todas Células</option>
                                    {celulasOptions.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                                </select>
                            </div>
                        )}
                        
                        <div className="relative">
                            <FaBirthdayCake className="absolute left-3 top-3.5 text-gray-400 text-sm" />
                            <select
                                value={selectedBirthdayMonth}
                                onChange={(e) => setSelectedBirthdayMonth(e.target.value)}
                                className="pl-9 w-full border border-gray-300 rounded-lg py-2.5 text-base bg-white focus:ring-2 focus:ring-green-500"
                            >
                                <option value="">Aniversários</option>
                                {months.map(m => ( 
                                    <option key={m.value} value={m.value}>{m.label}</option>
                                ))}
                            </select>
                        </div>

                        <select
                            value={selectedStatusFilter}
                            onChange={(e) => setSelectedStatusFilter(e.target.value as any)}
                            className="w-full border border-gray-300 rounded-lg py-2.5 text-base px-3 bg-white focus:ring-2 focus:ring-green-500"
                        >
                            <option value="all">Status: Todos</option>
                            <option value="Ativo">Ativo</option>
                            <option value="Inativo">Inativo</option>
                            <option value="Em transição">Em transição</option>
                        </select>
                    </div>
                </div>

                {/* Empty State */}
                {!membros.length && (
                    <div className="text-center p-12 bg-white border-2 border-dashed border-gray-200 rounded-2xl">
                        <FaUsers className="text-4xl text-gray-300 mx-auto mb-3" />
                        <h3 className="text-lg font-semibold text-gray-700">Nenhum membro encontrado</h3>
                        <p className="text-gray-500 text-sm mb-6">Tente ajustar os filtros ou adicione um novo.</p>
                        {userRole !== 'admin' && (
                            <Link href="/membros/novo" className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700 inline-flex items-center gap-2">
                                <FaPlus /> Adicionar Membro
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
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {membros.map((membro) => (
                                    <tr key={membro.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{membro.nome}</div>
                                            <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                                <FaCalendarAlt className="text-gray-400" /> 
                                                Entrou: {formatDateForDisplay(membro.data_ingresso)}
                                            </div>
                                        </td>
                                        {userRole === 'admin' && ( 
                                            <td className="px-6 py-4">
                                                <span className="inline-flex px-2 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                                                    {membro.celula_nome || '-'}
                                                </span>
                                            </td>
                                        )}
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {formatPhoneNumberDisplay(membro.telefone)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(membro.status)}`}>
                                                {membro.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                {membro.telefone && (
                                                    <a href={`https://wa.me/${membro.telefone.replace(/\D/g, '')}`} target="_blank" className="p-2 text-green-600 bg-green-50 rounded-lg hover:bg-green-100">
                                                        <FaWhatsapp />
                                                    </a>
                                                )}
                                                <Link href={`/membros/editar/${membro.id}`} className="p-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100">
                                                    <FaEdit />
                                                </Link>
                                                <button onClick={() => handleDelete(membro.id, membro.nome)} disabled={submitting} className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100">
                                                    <FaTrash />
                                                </button>
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
                    {membros.map((membro) => (
                        <div key={membro.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col gap-4">
                            
                            <div className="flex justify-between items-start">
                                <div className="flex items-start gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${membro.status === 'Ativo' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                                        {membro.nome.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-lg leading-tight">{membro.nome}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${getStatusBadgeColor(membro.status)}`}>
                                                {membro.status}
                                            </span>
                                            {userRole === 'admin' && membro.celula_nome && (
                                                <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                                                    {membro.celula_nome}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-sm text-gray-600 border-t border-gray-100 pt-3">
                                <div className="flex items-center gap-2">
                                    <FaCalendarAlt className="text-gray-400" />
                                    <span>Entrada: {formatDateForDisplay(membro.data_ingresso)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <FaBirthdayCake className="text-pink-400" />
                                    <span>Nasc: {formatDateForDisplay(membro.data_nascimento)}</span>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-1">
                                {membro.telefone ? (
                                    <>
                                        <a href={`https://wa.me/${membro.telefone.replace(/\D/g, '')}`} target="_blank" className="flex-1 bg-green-50 text-green-700 py-2.5 rounded-lg flex items-center justify-center gap-2 font-medium text-sm hover:bg-green-100">
                                            <FaWhatsapp size={16} /> WhatsApp
                                        </a>
                                        <a href={`tel:${membro.telefone}`} className="w-12 bg-gray-50 text-gray-600 rounded-lg flex items-center justify-center hover:bg-gray-100">
                                            <FaPhone size={14} />
                                        </a>
                                    </>
                                ) : (
                                    <div className="flex-1 bg-gray-50 text-gray-400 py-2.5 rounded-lg text-center text-sm italic">Sem contato</div>
                                )}
                                
                                <Link href={`/membros/editar/${membro.id}`} className="w-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center hover:bg-blue-100">
                                    <FaEdit size={16} />
                                </Link>
                                
                                <button onClick={() => handleDelete(membro.id, membro.nome)} disabled={submitting} className="w-12 bg-red-50 text-red-600 rounded-lg flex items-center justify-center hover:bg-red-100">
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