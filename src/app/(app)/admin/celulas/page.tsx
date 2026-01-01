'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
    FaPlus, 
    FaEdit, 
    FaTrash, 
    FaKey, 
    FaUsers, 
    FaHome, 
    FaSpinner, 
    FaArrowLeft,
    FaSave,
    FaTimes,
    FaExclamationTriangle,
    FaCopy,
    FaMapMarkerAlt,
    FaUserCog,
    FaCheckCircle
} from 'react-icons/fa';

import useToast from '@/hooks/useToast';
import ConfirmationModal from '@/components/ui/ConfirmationModal';

import { 
    fetchCelulasAdmin, 
    createCelulaAdmin, 
    updateCelulaAdmin, 
    deleteCelulaAdmin, 
    Celula 
} from '@/app/api/admin/celulas/actions'; 

import { createChaveAtivacaoAdmin, listChavesAtivacaoAdmin } from '@/app/api/admin/chaves-ativacao/actions'; 
import { ChaveAtivacao } from '@/lib/types'; 

import LoadingSpinner from '@/components/LoadingSpinner';

export default function AdminCelulasPage() {
    const [celulas, setCelulas] = useState<Celula[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [newCelulaName, setNewCelulaName] = useState('');
    const [newCelulaLider, setNewCelulaLider] = useState('');
    const [newCelulaEndereco, setNewCelulaEndereco] = useState('');

    const [editingCelulaId, setEditingCelulaId] = useState<string | null>(null);
    const [editingCelulaName, setEditingCelulaName] = useState('');
    const [editingCelulaLider, setEditingCelulaLider] = useState('');
    const [editingCelulaEndereco, setEditingCelulaEndereco] = useState('');

    const [submitting, setSubmitting] = useState(false);
    const [chavesAtivacao, setChavesAtivacao] = useState<ChaveAtivacao[]>([]);
    const [loadingChaves, setLoadingChaves] = useState(false);
    
    const [userRole, setUserRole] = useState<'admin' | 'líder' | null>(null);

    // Estados para o Modal de Confirmação
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

    const router = useRouter();
    const { addToast, ToastContainer } = useToast();

    useEffect(() => {
        async function fetchUserRole() {
            const { supabase } = await import('@/utils/supabase/client');
            const { data: { user }, error } = await supabase.auth.getUser();
            if (user && !error) {
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();
                if (!profileError && profile) {
                    setUserRole(profile.role as 'admin' | 'líder');
                }
            }
        }
        fetchUserRole();
    }, []);

    const loadCelulas = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchCelulasAdmin();
            setCelulas(data);
        } catch (err: any) {
            console.error("Erro ao carregar células (Admin):", err);
            setError(err.message || "Falha ao carregar células.");
            addToast(`Erro ao carregar células: ${err.message || 'Erro desconhecido.'}`, 'error');
            if (err.message.includes('Não autorizado')) {
                router.push('/dashboard');
            }
        } finally {
            setLoading(false);
        }
    }, [router, addToast]); 

    const loadChavesAtivacao = useCallback(async () => {
        setLoadingChaves(true);
        setError(null);
        try {
            const data = await listChavesAtivacaoAdmin();
            setChavesAtivacao(data);
        } catch (err: any) {
            console.error("Erro ao carregar chaves de ativação (Admin):", err);
            addToast(`Erro ao carregar chaves: ${err.message || 'Erro desconhecido.'}`, 'error');
        } finally {
            setLoadingChaves(false);
        }
    }, [addToast]);

    useEffect(() => {
        loadCelulas();
        loadChavesAtivacao();
    }, [loadCelulas, loadChavesAtivacao]);

    const handleCreateCelula = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        try {
            if (!newCelulaName.trim() || !newCelulaLider.trim()) {
                throw new Error("Preencha os campos obrigatórios.");
            }

            await createCelulaAdmin(
                newCelulaName.trim(),
                newCelulaLider.trim(),
                newCelulaEndereco.trim() || null
            );

            setNewCelulaName('');
            setNewCelulaLider('');
            setNewCelulaEndereco('');
            await loadCelulas();
            await loadChavesAtivacao(); 
            addToast('Célula e chave de ativação criadas com sucesso!', 'success');
        } catch (err: any) {
            addToast(`Erro ao criar célula: ${err.message}`, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleEditClick = (celula: Celula) => {
        setEditingCelulaId(celula.id);
        setEditingCelulaName(celula.nome);
        setEditingCelulaLider(celula.lider_principal || '');
        setEditingCelulaEndereco(celula.endereco || '');
    };

    const handleUpdateCelula = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (!editingCelulaId || !editingCelulaName.trim() || !editingCelulaLider.trim()) {
                throw new Error("Dados inválidos para atualização.");
            }
            await updateCelulaAdmin(
                editingCelulaId,
                editingCelulaName.trim(),
                editingCelulaLider.trim(),
                editingCelulaEndereco.trim() || null
            );
            setEditingCelulaId(null);
            await loadCelulas();
            addToast('Célula atualizada com sucesso!', 'success');
        } catch (err: any) {
            addToast(`Erro ao atualizar célula: ${err.message}`, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    // --- REFACOTRING: Delete with Modal ---
    const confirmDelete = (celulaId: string, celulaName: string) => {
        setModalConfig({
            isOpen: true,
            title: 'Excluir Célula',
            message: `Tem certeza que deseja excluir a célula "${celulaName}"? Esta ação é irreversível e pode causar perda de dados de membros e reuniões vinculadas.`,
            variant: 'danger',
            onConfirm: async () => {
                setModalConfig(prev => ({ ...prev, isOpen: false }));
                setSubmitting(true);
                try {
                    await deleteCelulaAdmin(celulaId);
                    await loadCelulas();
                    await loadChavesAtivacao(); 
                    addToast(`Célula "${celulaName}" excluída com sucesso!`, 'success');
                } catch (err: any) {
                    addToast(`Erro ao excluir: ${err.message}`, 'error');
                } finally {
                    setSubmitting(false);
                }
            }
        });
    };

    // --- REFACOTRING: Generate Key with Modal ---
    const confirmGenerateKey = (celulaId: string, celulaName: string) => {
        setModalConfig({
            isOpen: true,
            title: 'Nova Chave de Acesso',
            message: `Deseja gerar um novo código de ativação para a célula "${celulaName}"? O código anterior continuará válido se não tiver sido usado.`,
            variant: 'info',
            onConfirm: async () => {
                setModalConfig(prev => ({ ...prev, isOpen: false }));
                setSubmitting(true);
                try {
                    const newKey = await createChaveAtivacaoAdmin(celulaId);
                    await loadChavesAtivacao(); 
                    addToast(`Novo código gerado: ${newKey.chave}`, 'success');
                } catch (err: any) {
                    addToast(`Erro ao gerar código: ${err.message}`, 'error');
                } finally {
                    setSubmitting(false);
                }
            }
        });
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        addToast('Código copiado!', 'success');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4 sm:p-6 lg:p-8 font-sans">
            <ToastContainer />
            
            {/* Componente de Confirmação Profissional */}
            <ConfirmationModal 
                isOpen={modalConfig.isOpen}
                title={modalConfig.title}
                message={modalConfig.message}
                variant={modalConfig.variant}
                onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
                onConfirm={modalConfig.onConfirm}
                loading={submitting}
            />

            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-600 to-green-500 rounded-3xl shadow-xl p-6 mb-8 text-white border border-white/20">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-center space-x-4">
                            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
                                <FaHome size={24} />
                            </div>
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Gerenciar Células</h1>
                                <p className="text-emerald-50 text-sm opacity-90">Controle administrativo de grupos e acessos</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {userRole === 'admin' && (
                                <Link 
                                    href="/admin/users"
                                    className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
                                >
                                    <FaUserCog /> <span>Usuários</span>
                                </Link>
                            )}
                            <Link 
                                href="/dashboard"
                                className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
                            >
                                <FaArrowLeft /> <span>Dashboard</span>
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Coluna da Esquerda: Formulário */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 sticky top-24">
                            <h2 className="text-xl font-bold mb-6 text-gray-800 flex items-center gap-3">
                                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
                                    <FaPlus size={16} />
                                </div>
                                Nova Célula
                            </h2>
                            <form onSubmit={handleCreateCelula} className="space-y-5">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Nome da Célula</label>
                                    <input
                                        type="text"
                                        value={newCelulaName}
                                        onChange={(e) => setNewCelulaName(e.target.value)}
                                        placeholder="Ex: Célula Esperança"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Líder Responsável</label>
                                    <input
                                        type="text"
                                        value={newCelulaLider}
                                        onChange={(e) => setNewCelulaLider(e.target.value)}
                                        placeholder="Nome completo"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Endereço</label>
                                    <textarea
                                        value={newCelulaEndereco}
                                        onChange={(e) => setNewCelulaEndereco(e.target.value)}
                                        placeholder="Onde a célula se reúne?"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all h-24 resize-none"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                                >
                                    {submitting ? <FaSpinner className="animate-spin" /> : <FaPlus />}
                                    Criar Célula
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Coluna da Direita: Listagem e Chaves */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Células */}
                        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6">
                            <h2 className="text-xl font-bold mb-6 text-gray-800 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                                        <FaUsers size={16} />
                                    </div>
                                    Células Ativas
                                </div>
                                <span className="text-xs bg-gray-100 text-gray-500 px-3 py-1 rounded-full font-mono uppercase tracking-tighter">
                                    Total: {celulas.length}
                                </span>
                            </h2>
                            
                            <div className="grid gap-4">
                                {celulas.map((celula) => (
                                    <div key={celula.id} className="group border border-gray-100 bg-gray-50/30 rounded-2xl p-5 hover:bg-white hover:shadow-xl hover:border-emerald-100 transition-all duration-300">
                                        {editingCelulaId === celula.id ? (
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <input
                                                        type="text"
                                                        value={editingCelulaName}
                                                        onChange={(e) => setEditingCelulaName(e.target.value)}
                                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={editingCelulaLider}
                                                        onChange={(e) => setEditingCelulaLider(e.target.value)}
                                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                                                    />
                                                </div>
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={handleUpdateCelula} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold flex items-center gap-2">
                                                        <FaSave /> Salvar
                                                    </button>
                                                    <button onClick={() => setEditingCelulaId(null)} className="px-4 py-2 bg-gray-200 text-gray-600 rounded-xl text-sm font-bold">
                                                        Cancelar
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                <div className="space-y-1">
                                                    <h3 className="font-bold text-gray-900 text-lg">{celula.nome}</h3>
                                                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                                                        <span className="flex items-center gap-1.5"><FaUserCog className="text-gray-400" /> {celula.lider_principal}</span>
                                                        {celula.endereco && <span className="flex items-center gap-1.5"><FaMapMarkerAlt className="text-gray-400" /> {celula.endereco}</span>}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => handleEditClick(celula)} className="p-2.5 text-blue-500 hover:bg-blue-50 rounded-xl transition-colors" title="Editar">
                                                        <FaEdit size={18} />
                                                    </button>
                                                    <button onClick={() => confirmGenerateKey(celula.id, celula.nome)} className="p-2.5 text-purple-500 hover:bg-purple-50 rounded-xl transition-colors" title="Gerar Código">
                                                        <FaKey size={18} />
                                                    </button>
                                                    <button onClick={() => confirmDelete(celula.id, celula.nome)} className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-colors" title="Excluir">
                                                        <FaTrash size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Chaves de Ativação */}
                        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6">
                            <h2 className="text-xl font-bold mb-6 text-gray-800 flex items-center gap-3">
                                <div className="p-2 bg-purple-100 text-purple-600 rounded-xl">
                                    <FaKey size={16} />
                                </div>
                                Códigos de Ativação
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {chavesAtivacao.map((chave) => {
                                    const celula = celulas.find(c => c.id === chave.celula_id);
                                    return (
                                        <div key={chave.chave} className={`p-4 rounded-2xl border transition-all ${chave.usada ? 'bg-gray-50 border-gray-200 grayscale opacity-60' : 'bg-white border-purple-100 shadow-sm hover:shadow-md'}`}>
                                            <div className="flex justify-between items-center mb-3">
                                                <p className="text-xs font-black text-gray-400 uppercase tracking-tighter truncate max-w-[150px]">
                                                    {celula?.nome || 'Célula Excluída'}
                                                </p>
                                                {chave.usada ? (
                                                    <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1 uppercase bg-gray-200 px-2 py-0.5 rounded-full">Usado</span>
                                                ) : (
                                                    <span className="text-[10px] font-bold text-green-600 flex items-center gap-1 uppercase bg-green-100 px-2 py-0.5 rounded-full">Disponível</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-100 group">
                                                <code className="flex-1 font-mono font-bold text-purple-700 text-sm tracking-widest">{chave.chave}</code>
                                                {!chave.usada && (
                                                    <button 
                                                        onClick={() => copyToClipboard(chave.chave)}
                                                        className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                                                    >
                                                        <FaCopy size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}