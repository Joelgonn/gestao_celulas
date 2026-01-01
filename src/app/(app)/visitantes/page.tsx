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
    FaClock,
    FaChevronDown,
    FaArrowLeft,
    FaCheckCircle,
    FaArrowRight
} from 'react-icons/fa';

import { listarVisitantes, excluirVisitante, listarCelulasParaAdmin } from '@/lib/data';
import { CelulaOption, Visitante } from '@/lib/types';
import { formatPhoneNumberDisplay, formatDateForDisplay } from '@/utils/formatters';
import useToast from '@/hooks/useToast';
import LoadingSpinner from '@/components/LoadingSpinner';
import ConfirmationModal from '@/components/ui/ConfirmationModal';

export default function VisitantesPage() {
    const [visitantes, setVisitantes] = useState<Visitante[]>([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<'admin' | 'líder' | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [celulasOptions, setCelulasOptions] = useState<CelulaOption[]>([]);
    const [selectedCelulaId, setSelectedCelulaId] = useState<string>('');
    const [minDaysSinceLastContact, setMinDaysSinceLastContact] = useState<string>('');

    const [submitting, setSubmitting] = useState(false);

    // Estado para o Modal de Confirmação
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; visitorId: string; name: string }>({
        isOpen: false,
        visitorId: '',
        name: ''
    });

    const { addToast, ToastContainer } = useToast();

    const fetchVisitantesAndCelulas = useCallback(async () => {
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
                    if (profile.role === 'admin') {
                        const celulasData = await listarCelulasParaAdmin();
                        setCelulasOptions(celulasData);
                    }
                }
            }

            const data = await listarVisitantes(
                selectedCelulaId === "" ? null : selectedCelulaId,
                null,
                minDaysSinceLastContact === "" ? null : parseInt(minDaysSinceLastContact)
            );
            setVisitantes(data);
            
        } catch (e) {
            addToast('Erro ao carregar dados', 'error');
        } finally {
            setLoading(false);
        }
    }, [selectedCelulaId, minDaysSinceLastContact, addToast]); 

    useEffect(() => {
        fetchVisitantesAndCelulas();
    }, [fetchVisitantesAndCelulas]);

    const confirmDelete = (id: string, nome: string) => {
        setDeleteModal({ isOpen: true, visitorId: id, name: nome });
    };

    const executeDelete = async () => {
        setSubmitting(true);
        try {
            await excluirVisitante(deleteModal.visitorId);
            setVisitantes(prev => prev.filter(v => v.id !== deleteModal.visitorId));
            addToast(`Visitante removido com sucesso!`, 'success');
        } catch (e) {
            addToast('Falha ao excluir visitante', 'error');
        } finally {
            setSubmitting(false);
            setDeleteModal({ isOpen: false, visitorId: '', name: '' });
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

    if (loading && visitantes.length === 0) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><LoadingSpinner /></div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-20 font-sans">
            <ToastContainer />

            <ConfirmationModal 
                isOpen={deleteModal.isOpen}
                title="Excluir Visitante?"
                message={`Deseja realmente remover ${deleteModal.name}? Esta ação não pode ser revertida.`}
                variant="danger"
                onConfirm={executeDelete}
                onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
                loading={submitting}
            />

            {/* Header Emerald */}
            <div className="bg-gradient-to-br from-emerald-600 to-green-700 shadow-lg px-4 pt-8 pb-20 sm:px-8 border-b border-green-500/20">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                            <FaUsers size={28} /> {userRole === 'admin' ? 'Gestão de Visitantes' : 'Meus Visitantes'}
                        </h1>
                        <p className="text-emerald-100 text-sm font-bold opacity-80 uppercase tracking-widest mt-1">
                            {filteredVisitantes.length} Encontrados
                        </p>
                    </div>
                    
                    <div className="flex gap-3 w-full md:w-auto">
                        {userRole !== 'admin' && (
                            <Link href="/visitantes/novo" className="flex-1 md:flex-none bg-white text-emerald-700 py-3.5 px-6 rounded-2xl font-black text-sm shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all">
                                <FaPlus /> Novo Visitante
                            </Link>
                        )}
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
                <div className="bg-white rounded-3xl shadow-xl p-5 mb-8 border border-gray-100 flex flex-col gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        
                        <div className="relative group flex-1">
                            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Nome ou telefone..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium text-sm"
                            />
                        </div>

                        {userRole === 'admin' && (
                            <div className="relative group">
                                <FaFilter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <select
                                    value={selectedCelulaId}
                                    onChange={(e) => setSelectedCelulaId(e.target.value)}
                                    className="w-full pl-11 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-sm text-gray-600 appearance-none cursor-pointer"
                                >
                                    <option value="">Todas as Células</option>
                                    {celulasOptions.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                                </select>
                                <FaChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none size-3" />
                            </div>
                        )}

                        <div className="relative group">
                            <FaClock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="number"
                                placeholder="Mínimo de dias sem contato"
                                value={minDaysSinceLastContact}
                                onChange={(e) => setMinDaysSinceLastContact(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all font-bold text-sm text-gray-600"
                                min="0"
                            />
                        </div>
                    </div>
                </div>

                {/* Listagem em Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {filteredVisitantes.map((v) => (
                        <div key={v.id} className="bg-white rounded-[2rem] shadow-lg border border-gray-100 p-6 flex flex-col hover:shadow-2xl transition-all duration-300 group">
                            
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                                <div className="flex items-center gap-5 min-w-0 flex-1">
                                    <div className={`w-16 h-16 rounded-2xl shrink-0 flex items-center justify-center text-2xl font-black shadow-inner transform -rotate-3 group-hover:rotate-0 transition-transform bg-orange-100 text-orange-600`}>
                                        {v.nome.charAt(0)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="text-xl font-black text-gray-900 truncate group-hover:text-emerald-600 transition-colors" title={v.nome}>
                                            {v.nome}
                                        </h3>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border ${v.data_ultimo_contato ? 'bg-green-50 text-green-700 border-green-100' : 'bg-orange-50 text-orange-700 border-orange-100'}`}>
                                                {v.data_ultimo_contato ? `Último contato: ${formatDateForDisplay(v.data_ultimo_contato)}` : 'Sem contato recente'}
                                            </span>
                                            {v.celula_nome && (
                                                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border bg-blue-50 text-blue-600 border-blue-100">
                                                    {v.celula_nome}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <Link 
                                    href={`/visitantes/converter/${v.id}`} 
                                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 py-3 rounded-xl font-bold text-xs hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 active:scale-95"
                                >
                                    <FaUserPlus size={14} /> <span className="sm:hidden lg:inline">Converter</span>
                                </Link>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 rounded-3xl p-4 mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white rounded-xl shadow-sm text-emerald-600"><FaCalendarAlt size={14}/></div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-black text-gray-400 uppercase truncate">Primeira Visita</p>
                                        <p className="text-sm font-bold text-gray-700">{formatDateForDisplay(v.data_primeira_visita)}</p>
                                    </div>
                                </div>
                                {v.observacoes && (
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white rounded-xl shadow-sm text-blue-600"><FaComment size={14}/></div>
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-black text-gray-400 uppercase truncate">Observação</p>
                                            <p className="text-sm font-bold text-gray-700 truncate" title={v.observacoes}>{v.observacoes}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-3 shrink-0 border-t border-gray-50 pt-4 mt-auto">
                                {v.telefone && (
                                    <>
                                        <a 
                                            href={`https://wa.me/${v.telefone.replace(/\D/g, '')}`} 
                                            target="_blank" 
                                            className="p-4 bg-green-50 text-green-600 rounded-2xl hover:bg-green-100 transition-all active:scale-90"
                                        >
                                            <FaWhatsapp size={20} />
                                        </a>
                                        <a 
                                            href={`tel:${v.telefone}`} 
                                            className="p-4 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-100 transition-all active:scale-90"
                                        >
                                            <FaPhone size={18} />
                                        </a>
                                    </>
                                )}
                                <div className="flex-1" />
                                <Link 
                                    href={`/visitantes/editar/${v.id}`}
                                    className="p-4 bg-gray-100 text-gray-500 rounded-2xl hover:bg-gray-200 transition-all active:scale-90"
                                >
                                    <FaEdit size={20} />
                                </Link>
                                <button 
                                    onClick={() => confirmDelete(v.id, v.nome)}
                                    disabled={submitting}
                                    className="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition-all active:scale-90 cursor-pointer"
                                >
                                    <FaTrash size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {filteredVisitantes.length === 0 && (
                    <div className="text-center py-20 bg-white rounded-[3rem] shadow-inner border border-dashed border-gray-200">
                        <FaUsers size={48} className="mx-auto text-gray-200 mb-4" />
                        <h3 className="text-lg font-bold text-gray-400 tracking-tight">Nenhum visitante encontrado</h3>
                        <button onClick={() => { setSearchTerm(''); setSelectedCelulaId(''); setMinDaysSinceLastContact(''); }} className="mt-4 text-emerald-600 font-bold hover:underline cursor-pointer">Limpar filtros</button>
                    </div>
                )}
            </div>
        </div>
    );
}