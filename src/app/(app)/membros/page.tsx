'use client';

import { useState, useEffect, useCallback } from 'react'; 
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
    FaChevronDown,
    FaCheckCircle
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
import ConfirmationModal from '@/components/ui/ConfirmationModal';

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

    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; memberId: string; name: string }>({
        isOpen: false,
        memberId: '',
        name: ''
    });

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
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        fetchInitialUserRole();
    }, []);

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
        } catch (e) {
            addToast('Erro ao carregar membros', 'error'); 
        } finally {
            setLoading(false);
        }
    }, [userRole, selectedCelulaId, searchTerm, selectedBirthdayMonth, selectedStatusFilter, addToast]); 

    useEffect(() => { loadAllData(); }, [loadAllData]);

    const confirmDelete = (id: string, nome: string) => {
        setDeleteModal({ isOpen: true, memberId: id, name: nome });
    };

    const executeDelete = async () => {
        setSubmitting(true);
        try {
            await excluirMembro(deleteModal.memberId);
            setMembros(prev => prev.filter(m => m.id !== deleteModal.memberId)); 
            addToast('Membro removido!', 'success'); 
        } catch (e) {
            addToast('Erro ao remover', 'error'); 
        } finally {
            setSubmitting(false); 
            setDeleteModal({ isOpen: false, memberId: '', name: '' });
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
            addToast("CSV Exportado!", 'success'); 
        } catch (e) {
            addToast('Erro na exportação', 'error'); 
        } finally {
            setExporting(false); 
        }
    };

    const months = Array.from({ length: 12 }, (_, i) => ({
        value: (i + 1).toString(), 
        label: new Date(0, i).toLocaleString('pt-BR', { month: 'long' }), 
    }));

    const getStatusColor = (status: Membro['status']) => {
        switch (status) {
            case 'Ativo': return 'bg-green-50 text-green-700 border-green-100';
            case 'Inativo': return 'bg-red-50 text-red-700 border-red-100';
            case 'Em transição': return 'bg-amber-50 text-amber-700 border-amber-100';
            default: return 'bg-gray-50 text-gray-700 border-gray-100';
        }
    };

    if (loading && !membros.length) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><LoadingSpinner /></div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-20 font-sans">
            <ToastContainer /> 
            
            <ConfirmationModal 
                isOpen={deleteModal.isOpen}
                title="Excluir Membro?"
                message={`Tem certeza que deseja remover ${deleteModal.name}?`}
                variant="danger"
                onConfirm={executeDelete}
                onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
                loading={submitting}
            />

            <div className="bg-gradient-to-br from-emerald-600 to-green-700 shadow-lg px-4 pt-8 pb-20 sm:px-8 border-b border-green-500/20">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                            <FaUsers size={28} /> {userRole === 'admin' ? 'Gestão de Membros' : 'Membros da Célula'}
                        </h1>
                        <p className="text-emerald-100 text-sm font-bold opacity-80 uppercase tracking-widest mt-1">
                            {membros.length} Registrados
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3 w-full md:w-auto">
                        <Link href="/membros/novo" className="flex-1 md:flex-none bg-white text-emerald-700 py-3 px-6 rounded-2xl font-black text-sm shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all">
                            <FaPlus /> Novo Membro
                        </Link>
                        <button
                            onClick={handleExportCSV}
                            disabled={exporting || !membros.length} 
                            className="bg-white/10 hover:bg-white/20 text-white p-3.5 rounded-2xl transition-all backdrop-blur-md border border-white/10 disabled:opacity-50 cursor-pointer"
                        >
                            {exporting ? <FaSpinner className="animate-spin" /> : <FaFileExport size={20} />}
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-8 -mt-10">
                
                <div className="bg-white rounded-3xl shadow-xl p-5 mb-8 border border-gray-100 flex flex-col gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="relative group">
                            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500" />
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
                                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-sm text-gray-600 appearance-none cursor-pointer"
                                >
                                    <option value="">Todas as Células</option>
                                    {celulasOptions.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                                </select>
                                <FaChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none size-3" />
                            </div>
                        )}
                        
                        <div className="relative group">
                            <FaBirthdayCake className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <select
                                value={selectedBirthdayMonth}
                                onChange={(e) => setSelectedBirthdayMonth(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-sm text-gray-600 appearance-none cursor-pointer"
                            >
                                <option value="">Mês de Aniversário</option>
                                {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                            </select>
                            <FaChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none size-3" />
                        </div>

                        <div className="relative group">
                            <FaCheckCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <select
                                value={selectedStatusFilter}
                                onChange={(e) => setSelectedStatusFilter(e.target.value as any)}
                                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-sm text-gray-600 appearance-none cursor-pointer"
                            >
                                <option value="all">Todos os Status</option>
                                <option value="Ativo">Ativo</option>
                                <option value="Inativo">Inativo</option>
                                <option value="Em transição">Em transição</option>
                            </select>
                            <FaChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none size-3" />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {membros.map((membro) => (
                        <div key={membro.id} className="bg-white rounded-[2rem] shadow-lg border border-gray-100 p-6 flex flex-col sm:flex-row justify-between items-center gap-6 hover:shadow-2xl transition-all duration-300 group">
                            
                            {/* Area da Esquerda: Avatar e Texto (Adicionado min-w-0 para permitir truncamento) */}
                            <div className="flex items-center gap-5 w-full sm:w-auto min-w-0 flex-1">
                                <div className={`w-16 h-16 rounded-2xl shrink-0 flex items-center justify-center text-2xl font-black shadow-inner transform -rotate-3 group-hover:rotate-0 transition-transform ${
                                    membro.status === 'Ativo' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'
                                }`}>
                                    {membro.nome.charAt(0)}
                                </div>
                                
                                {/* Container do Texto (min-w-0 é essencial para o truncate funcionar no Flexbox) */}
                                <div className="min-w-0 flex-1">
                                    <h3 
                                        className="text-xl font-black text-gray-900 truncate group-hover:text-emerald-600 transition-colors" 
                                        title={membro.nome}
                                    >
                                        {membro.nome}
                                    </h3>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border ${getStatusColor(membro.status)}`}>
                                            {membro.status}
                                        </span>
                                        {membro.celula_nome && (
                                            <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border bg-blue-50 text-blue-600 border-blue-100 truncate max-w-[120px]">
                                                {membro.celula_nome}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Area da Direita: Ações (Adicionado shrink-0 para impedir que os ícones saiam do card) */}
                            <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto justify-center sm:justify-end border-t sm:border-t-0 pt-4 sm:pt-0">
                                {membro.telefone && (
                                    <a 
                                        href={`https://wa.me/${membro.telefone.replace(/\D/g, '')}`} 
                                        target="_blank" 
                                        className="p-4 bg-green-50 text-green-600 rounded-2xl hover:bg-green-100 transition-all active:scale-90"
                                    >
                                        <FaWhatsapp size={20} />
                                    </a>
                                )}
                                <Link 
                                    href={`/membros/editar/${membro.id}`}
                                    className="p-4 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-100 transition-all active:scale-90"
                                >
                                    <FaEdit size={20} />
                                </Link>
                                <button 
                                    onClick={() => confirmDelete(membro.id, membro.nome)}
                                    disabled={submitting}
                                    className="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition-all active:scale-90 cursor-pointer"
                                >
                                    <FaTrash size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {!membros.length && (
                    <div className="text-center py-20 bg-white rounded-[3rem] shadow-inner border border-dashed border-gray-200">
                        <FaUsers size={48} className="mx-auto text-gray-200 mb-4" />
                        <h3 className="text-lg font-bold text-gray-400 tracking-tight">Nenhum membro encontrado com estes filtros</h3>
                        <button onClick={() => { setSearchTerm(''); setSelectedStatusFilter('all'); }} className="mt-4 text-emerald-600 font-bold hover:underline cursor-pointer">Limpar filtros</button>
                    </div>
                )}
            </div>
        </div>
    );
}