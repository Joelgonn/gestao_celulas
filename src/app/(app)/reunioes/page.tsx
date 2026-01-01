'use client';

import { useState, useEffect, useMemo, useCallback } from 'react'; 
import { supabase } from '@/utils/supabase/client'; 
import Link from 'next/link';
import { 
  FaEye, 
  FaCopy, 
  FaEdit, 
  FaTrash, 
  FaUsers, 
  FaSearch,
  FaCalendarAlt,
  FaChild,
  FaFilePdf,
  FaChevronDown,
  FaArrowLeft,
  FaSync,
  FaBookOpen,
  FaUserCheck,
  FaPlus,
  FaFilter // Adicionado para corrigir o erro de build
} from 'react-icons/fa';

import {
    listarReunioes,
    excluirReuniao,
    listarCelulasParaAdmin, 
    duplicarReuniao,
} from '@/lib/data'; 

import { 
    ReuniaoComNomes,    
    CelulaOption,       
} from '@/lib/types';

import { formatDateForDisplay } from '@/utils/formatters'; 
import LoadingSpinner from '@/components/LoadingSpinner'; 
import useToast from '@/hooks/useToast';
import ConfirmationModal from '@/components/ui/ConfirmationModal';

export default function ReunioesPage() {
    const [reunioes, setReunioes] = useState<ReuniaoComNomes[]>([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<'admin' | 'líder' | null>(null);
    
    const [celulasOptions, setCelulasOptions] = useState<CelulaOption[]>([]);
    const [selectedCelulaId, setSelectedCelulaId] = useState<string>('');
    const [searchTermTema, setSearchTermTema] = useState('');
    const [searchTermMinistrador, setSearchTermMinistrador] = useState('');

    const [submitting, setSubmitting] = useState(false);

    // Estado para o Modal de Confirmação Único
    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        variant: 'danger' | 'warning' | 'info';
        onConfirm: () => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        variant: 'info',
        onConfirm: () => {},
    });

    const { addToast, ToastContainer } = useToast();

    const fetchReunioesAndOptions = useCallback(async () => { 
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

            const data = await listarReunioes();
            setReunioes(data);
        } catch (e: any) {
            addToast(`Erro ao carregar dados: ${e.message}`, 'error');
        } finally {
            setLoading(false);
        }
    }, [addToast]);

    useEffect(() => { fetchReunioesAndOptions(); }, [fetchReunioesAndOptions]);

    const confirmDelete = (reuniaoId: string, dataReuniao: string) => {
        setModalConfig({
            isOpen: true,
            title: 'Excluir Reunião?',
            message: `Tem certeza que deseja apagar o registro de reunião do dia ${formatDateForDisplay(dataReuniao)}? Esta ação não pode ser desfeita.`,
            variant: 'danger',
            onConfirm: async () => {
                setModalConfig(prev => ({ ...prev, isOpen: false }));
                setSubmitting(true);
                try {
                    await excluirReuniao(reuniaoId);
                    setReunioes(prev => prev.filter(r => r.id !== reuniaoId));
                    addToast('Reunião removida com sucesso!', 'success');
                } catch (e: any) {
                    addToast(`Erro ao excluir: ${e.message}`, 'error');
                } finally { setSubmitting(false); }
            }
        });
    };

    const confirmDuplicate = (reuniaoId: string, dataReuniao: string) => {
        setModalConfig({
            isOpen: true,
            title: 'Duplicar Reunião?',
            message: `Deseja criar uma nova reunião para HOJE com o mesmo tema e ministrantes da reunião de ${formatDateForDisplay(dataReuniao)}?`,
            variant: 'info',
            onConfirm: async () => {
                setModalConfig(prev => ({ ...prev, isOpen: false }));
                setSubmitting(true);
                try {
                    await duplicarReuniao(reuniaoId);
                    await fetchReunioesAndOptions();
                    addToast('Reunião duplicada para hoje!', 'success');
                } catch (e: any) {
                    addToast(`Erro ao duplicar: ${e.message}`, 'error');
                } finally { setSubmitting(false); }
            }
        });
    };

    const filteredReunioes = useMemo(() => {
        let current = reunioes;
        if (selectedCelulaId) current = current.filter(r => r.celula_id === selectedCelulaId);
        if (searchTermTema) {
            const term = searchTermTema.toLowerCase();
            current = current.filter(r => r.tema.toLowerCase().includes(term));
        }
        if (searchTermMinistrador) {
            const term = searchTermMinistrador.toLowerCase();
            current = current.filter(r => 
                (r.ministrador_principal_nome?.toLowerCase().includes(term)) ||
                (r.ministrador_secundario_nome?.toLowerCase().includes(term))
            );
        }
        return current;
    }, [reunioes, selectedCelulaId, searchTermTema, searchTermMinistrador]);

    if (loading && !reunioes.length) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><LoadingSpinner /></div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-20 font-sans">
            <ToastContainer />

            <ConfirmationModal 
                isOpen={modalConfig.isOpen}
                title={modalConfig.title}
                message={modalConfig.message}
                variant={modalConfig.variant}
                onConfirm={modalConfig.onConfirm}
                onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
                loading={submitting}
            />

            {/* Header Emerald */}
            <div className="bg-gradient-to-br from-emerald-600 to-green-700 shadow-lg px-4 pt-8 pb-20 sm:px-8 border-b border-green-500/20">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md border border-white/10 text-white">
                            <FaCalendarAlt size={24} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-white tracking-tight">Histórico de Reuniões</h1>
                            <p className="text-emerald-100 text-sm font-bold opacity-80 uppercase tracking-widest">Acompanhamento de Células</p>
                        </div>
                    </div>
                    
                    <div className="flex gap-3 w-full md:w-auto">
                        {userRole !== 'admin' && (
                            <Link href="/reunioes/novo" className="flex-1 md:flex-none bg-white text-emerald-700 py-3.5 px-8 rounded-2xl font-black text-sm shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all">
                                <FaPlus /> Nova Reunião
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        
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
                            <FaBookOpen className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Buscar por tema..."
                                value={searchTermTema}
                                onChange={(e) => setSearchTermTema(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium text-sm"
                            />
                        </div>

                        <div className="relative group">
                            <FaUserCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Buscar por ministrante..."
                                value={searchTermMinistrador}
                                onChange={(e) => setSearchTermMinistrador(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium text-sm"
                            />
                        </div>
                        
                        <button 
                            onClick={() => { setSelectedCelulaId(''); setSearchTermTema(''); setSearchTermMinistrador(''); }}
                            className="bg-gray-100 text-gray-500 p-4 rounded-2xl hover:bg-gray-200 transition-all active:scale-95 flex items-center justify-center font-bold text-xs uppercase tracking-widest cursor-pointer"
                        >
                            <FaSync className="mr-2" /> Limpar
                        </button>
                    </div>
                </div>

                {/* Listagem em Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {filteredReunioes.map((reuniao) => (
                        <div key={reuniao.id} className="bg-white rounded-[2rem] shadow-lg border border-gray-100 p-6 flex flex-col hover:shadow-2xl transition-all duration-300 group">
                            
                            <div className="flex justify-between items-start gap-4 mb-6">
                                <div className="min-w-0 flex-1">
                                    <div className="flex gap-2 mb-2">
                                        <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border border-emerald-100 flex items-center gap-1.5">
                                            <FaCalendarAlt size={10}/> {formatDateForDisplay(reuniao.data_reuniao)}
                                        </span>
                                        {reuniao.celula_nome && (
                                            <span className="bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border border-blue-100">
                                                {reuniao.celula_nome}
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="text-xl font-black text-gray-900 truncate group-hover:text-emerald-600 transition-colors" title={reuniao.tema}>
                                        {reuniao.tema}
                                    </h3>
                                </div>
                                {reuniao.caminho_pdf && (
                                    <a 
                                        href={reuniao.caminho_pdf} 
                                        target="_blank" 
                                        className="p-3 bg-red-50 text-red-600 rounded-2xl hover:bg-red-100 transition-all shadow-sm"
                                        title="Ver Material PDF"
                                    >
                                        <FaFilePdf size={20} />
                                    </a>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-3xl p-4 mb-6">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Ministrador</p>
                                    <p className="text-sm font-bold text-gray-700 truncate">{reuniao.ministrador_principal_nome}</p>
                                </div>
                                <div className="space-y-1 border-l border-gray-200 pl-4">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Apoio Kids</p>
                                    <p className="text-sm font-bold text-gray-700 truncate flex items-center gap-1.5">
                                        {reuniao.responsavel_kids_nome ? (
                                            <><FaChild className="text-purple-500"/> {reuniao.responsavel_kids_nome}</>
                                        ) : 'Não informado'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0 border-t border-gray-50 pt-4 mt-auto">
                                <Link 
                                    href={`/reunioes/resumo/${reuniao.id}`}
                                    className="p-4 bg-gray-100 text-gray-500 rounded-2xl hover:bg-gray-200 transition-all active:scale-90"
                                    title="Ver Resumo"
                                >
                                    <FaEye size={20} />
                                </Link>
                                
                                {userRole !== 'admin' ? (
                                    <>
                                        <Link 
                                            href={`/reunioes/presenca/${reuniao.id}`}
                                            className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95"
                                        >
                                            <FaUsers size={16} /> Presença
                                        </Link>
                                        <Link 
                                            href={`/reunioes/editar/${reuniao.id}`}
                                            className="p-4 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-100 transition-all active:scale-90"
                                            title="Editar"
                                        >
                                            <FaEdit size={20} />
                                        </Link>
                                        <button 
                                            onClick={() => confirmDuplicate(reuniao.id, reuniao.data_reuniao)}
                                            className="p-4 bg-purple-50 text-purple-600 rounded-2xl hover:bg-purple-100 transition-all active:scale-90 cursor-pointer"
                                            title="Duplicar Reunião"
                                        >
                                            <FaCopy size={18} />
                                        </button>
                                        <button 
                                            onClick={() => confirmDelete(reuniao.id, reuniao.data_reuniao)}
                                            className="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition-all active:scale-90 cursor-pointer"
                                            title="Excluir"
                                        >
                                            <FaTrash size={18} />
                                        </button>
                                    </>
                                ) : (
                                    <div className="flex-1 bg-gray-50 rounded-2xl py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-center border border-dashed border-gray-200">
                                        Modo Visualização
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {filteredReunioes.length === 0 && (
                    <div className="text-center py-20 bg-white rounded-[3rem] shadow-inner border border-dashed border-gray-200">
                        <FaCalendarAlt size={48} className="mx-auto text-gray-200 mb-4" />
                        <h3 className="text-lg font-bold text-gray-400 tracking-tight">Nenhuma reunião encontrada</h3>
                        <button onClick={() => { setSelectedCelulaId(''); setSearchTermTema(''); setSearchTermMinistrador(''); }} className="mt-4 text-emerald-600 font-bold hover:underline cursor-pointer">Limpar filtros</button>
                    </div>
                )}
            </div>
        </div>
    );
}