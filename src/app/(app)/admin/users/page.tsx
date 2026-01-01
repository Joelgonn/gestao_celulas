'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
    FaUserEdit, 
    FaTrash, 
    FaEnvelope, 
    FaSpinner, 
    FaUserCog, 
    FaUsers, 
    FaArrowLeft,
    FaSave,
    FaTimes,
    FaExclamationTriangle,
    FaCalendarAlt,
    FaUserTag,
    FaInfoCircle
} from 'react-icons/fa';
import useToast from '@/hooks/useToast';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import {
    listAllProfiles,
    updateUserProfile,
    sendMagicLinkToUser,
    deleteUserAndProfile,
    UserProfile,
} from '@/app/api/admin/users/actions';
import { listarCelulasParaAdmin } from '@/lib/data';
import { CelulaOption } from '@/lib/types'; 
import { formatDateForDisplay } from '@/utils/formatters'; 

import LoadingSpinner from '@/components/LoadingSpinner';

export default function AdminUsersPage() {
    const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
    const [celulasOptions, setCelulasOptions] = useState<CelulaOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [editingUserRole, setEditingUserRole] = useState<'admin' | 'líder'>('líder');
    const [editingUserCelulaId, setEditingUserCelulaId] = useState<string | null>(null);

    const [newUserEmail, setNewUserEmail] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Estado para o Modal de Confirmação
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

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [profilesData, celulasData] = await Promise.all([
                listAllProfiles(),
                listarCelulasParaAdmin(),
            ]);
            setUserProfiles(profilesData);
            setCelulasOptions(celulasData);
        } catch (err: any) {
            console.error("Erro ao carregar dados de usuários (Admin):", err);
            setError(err.message || "Falha ao carregar dados de usuários.");
            addToast(`Erro ao carregar usuários: ${err.message}`, 'error');
            if (err.message.includes('Não autorizado')) {
                router.push('/dashboard');
            }
        } finally {
            setLoading(false);
        }
    }, [router, addToast]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleEditClick = (profile: UserProfile) => {
        setEditingUserId(profile.id);
        setEditingUserRole(profile.role || 'líder');
        setEditingUserCelulaId(profile.celula_id || '');
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (!editingUserId) throw new Error("ID inválido.");
            await updateUserProfile(editingUserId, {
                role: editingUserRole,
                celula_id: editingUserCelulaId || null,
            });
            setEditingUserId(null);
            await loadData();
            addToast('Perfil atualizado com sucesso!', 'success');
        } catch (err: any) {
            addToast(`Erro ao atualizar: ${err.message}`, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSendMagicLink = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const result = await sendMagicLinkToUser(newUserEmail);
            if (result.success) {
                addToast(result.message, 'success');
                setNewUserEmail('');
            } else {
                addToast(result.message, 'error');
            }
        } catch (err: any) {
            addToast(`Erro ao enviar link: ${err.message}`, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    // --- MODAL DE EXCLUSÃO ---
    const confirmDeleteUser = (userId: string, userEmail: string | null) => {
        setModalConfig({
            isOpen: true,
            title: 'Excluir Usuário',
            message: `Tem certeza que deseja excluir o acesso de "${userEmail || 'este usuário'}"? Esta ação removerá permanentemente o perfil e o acesso ao sistema.`,
            variant: 'danger',
            onConfirm: async () => {
                setModalConfig(prev => ({ ...prev, isOpen: false }));
                setSubmitting(true);
                try {
                    await deleteUserAndProfile(userId);
                    await loadData();
                    addToast('Usuário removido com sucesso.', 'success');
                } catch (err: any) {
                    addToast(`Erro ao excluir: ${err.message}`, 'error');
                } finally {
                    setSubmitting(false);
                }
            }
        });
    };

    const getRoleBadge = (role: string) => {
        return role === 'admin' 
            ? 'bg-purple-100 text-purple-700 border-purple-200' 
            : 'bg-blue-100 text-blue-700 border-blue-200';
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
                                <FaUsers size={24} />
                            </div>
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Gerenciar Usuários</h1>
                                <p className="text-emerald-50 text-sm opacity-90">Controle de acessos e permissões de liderança</p>
                            </div>
                        </div>
                        <Link 
                            href="/dashboard"
                            className="bg-white/10 hover:bg-white/20 px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2"
                        >
                            <FaArrowLeft /> <span>Dashboard</span>
                        </Link>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Convidar Usuário */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 sticky top-24">
                            <h2 className="text-xl font-bold mb-6 text-gray-800 flex items-center gap-3">
                                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                                    <FaEnvelope size={16} />
                                </div>
                                Convidar Líder
                            </h2>
                            <form onSubmit={handleSendMagicLink} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">E-mail de Acesso</label>
                                    <input
                                        type="email"
                                        placeholder="exemplo@email.com"
                                        value={newUserEmail}
                                        onChange={(e) => setNewUserEmail(e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                                        required
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                                >
                                    {submitting ? <FaSpinner className="animate-spin" /> : <FaEnvelope />}
                                    Enviar Convite
                                </button>
                                <div className="bg-blue-50 rounded-2xl p-4 flex gap-3">
                                    <FaInfoCircle className="text-blue-500 mt-1 flex-shrink-0" />
                                    <p className="text-xs text-blue-700 leading-relaxed">
                                        O link de acesso será enviado para o e-mail informado. Novos usuários precisarão de um código de ativação no primeiro acesso.
                                    </p>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* Listagem */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6">
                            <h2 className="text-xl font-bold mb-6 text-gray-800 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                                        <FaUserCog size={16} />
                                    </div>
                                    Perfis Ativos
                                </div>
                                <span className="text-xs bg-gray-100 text-gray-500 px-3 py-1 rounded-full font-mono">Total: {userProfiles.length}</span>
                            </h2>

                            <div className="space-y-4">
                                {userProfiles.map((profile) => (
                                    <div key={profile.id} className="group border border-gray-100 bg-gray-50/30 rounded-2xl p-5 hover:bg-white hover:shadow-xl transition-all duration-300">
                                        {editingUserId === profile.id ? (
                                            <div className="space-y-4 animate-in fade-in duration-300">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Nível de Acesso</label>
                                                        <select
                                                            value={editingUserRole}
                                                            onChange={(e) => setEditingUserRole(e.target.value as 'admin' | 'líder')}
                                                            className="w-full px-4 py-2 border border-blue-100 bg-blue-50/30 rounded-xl outline-none focus:border-blue-500 transition-all"
                                                        >
                                                            <option value="líder">Líder</option>
                                                            <option value="admin">Administrador</option>
                                                        </select>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Célula Responsável</label>
                                                        <select
                                                            value={editingUserCelulaId || ''}
                                                            onChange={(e) => setEditingUserCelulaId(e.target.value || null)}
                                                            className="w-full px-4 py-2 border border-blue-100 bg-blue-50/30 rounded-xl outline-none focus:border-blue-500 transition-all"
                                                        >
                                                            <option value="">Nenhuma Célula</option>
                                                            {celulasOptions.map((celula) => (
                                                                <option key={celula.id} value={celula.id}>{celula.nome}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                                <div className="flex justify-end gap-2 pt-2">
                                                    <button onClick={handleUpdateUser} disabled={submitting} className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-blue-700 transition-all">
                                                        {submitting ? <FaSpinner className="animate-spin" /> : <FaSave />} Salvar
                                                    </button>
                                                    <button onClick={() => setEditingUserId(null)} className="px-5 py-2 bg-gray-200 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-300">Cancelar</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-gradient-to-tr from-emerald-500 to-green-400 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-inner">
                                                        {profile.email?.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h3 className="font-bold text-gray-900 truncate">{profile.email}</h3>
                                                        <div className="flex flex-wrap gap-2 mt-1">
                                                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${getRoleBadge(profile.role || '')}`}>
                                                                {profile.role}
                                                            </span>
                                                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border bg-emerald-50 text-emerald-700 border-emerald-100">
                                                                {profile.celula_nome || 'Sem Célula'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3 self-end md:self-center">
                                                    <div className="hidden lg:block text-right mr-4 border-r border-gray-100 pr-4">
                                                        <p className="text-[10px] text-gray-400 uppercase font-black tracking-tighter">Último Acesso</p>
                                                        <p className="text-xs text-gray-600 font-medium">{formatDateForDisplay(profile.last_sign_in_at) || 'Nunca'}</p>
                                                    </div>
                                                    <button onClick={() => handleEditClick(profile)} className="p-2.5 text-blue-500 hover:bg-blue-50 rounded-xl transition-colors">
                                                        <FaUserEdit size={20} />
                                                    </button>
                                                    <button onClick={() => confirmDeleteUser(profile.id, profile.email)} className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                                                        <FaTrash size={20} />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}