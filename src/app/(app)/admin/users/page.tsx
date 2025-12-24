// src/app/(app)/admin/users/page.tsx
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
    FaUserTag
} from 'react-icons/fa';
import useToast from '@/hooks/useToast';
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

    const router = useRouter();
    const { addToast, removeToast, ToastContainer } = useToast();

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
            addToast(`Erro ao carregar usuários: ${err.message || 'Erro desconhecido.'}`, 'error');
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
        setError(null);
        try {
            if (!editingUserId) {
                throw new Error("ID de usuário para edição inválido.");
            }
            await updateUserProfile(editingUserId, {
                role: editingUserRole,
                celula_id: editingUserCelulaId || null,
            });
            setEditingUserId(null);
            await loadData();
            addToast('Perfil de usuário atualizado com sucesso!', 'success');
        } catch (err: any) {
            console.error("Erro ao atualizar perfil (Admin):", err);
            setError(err.message || "Falha ao atualizar perfil.");
            addToast(`Erro ao atualizar usuário: ${err.message || 'Erro desconhecido.'}`, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSendMagicLink = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        try {
            const result = await sendMagicLinkToUser(newUserEmail);
            if (result.success) {
                addToast(result.message, 'success');
                setNewUserEmail('');
            } else {
                setError(result.message);
                addToast(result.message, 'error');
            }
        } catch (err: any) {
            console.error("Erro ao enviar link mágico (Admin):", err);
            setError(err.message || "Falha ao enviar link mágico.");
            addToast(`Erro ao enviar link: ${err.message || 'Erro desconhecido.'}`, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteUser = async (userId: string, userEmail: string | null) => {
        if (!confirm(`Tem certeza que deseja excluir o usuário "${userEmail || userId}"? Esta ação é irreversível e removerá o perfil e o acesso.`)) {
            return;
        }
        setSubmitting(true);
        setError(null);
        try {
            await deleteUserAndProfile(userId);
            await loadData();
            addToast('Usuário excluído com sucesso!', 'success');
        } catch (err: any) {
            console.error("Erro ao excluir usuário (Admin):", err);
            setError(err.message || "Falha ao excluir usuário.");
            addToast(`Erro ao excluir usuário: ${err.message || 'Erro desconhecido.'}`, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const getRoleBadge = (role: string) => {
        const roleColors = {
            'admin': 'bg-purple-100 text-purple-800 border-purple-200',
            'líder': 'bg-blue-100 text-blue-800 border-blue-200',
        };
        
        return roleColors[role as keyof typeof roleColors] || 'bg-gray-100 text-gray-800 border-gray-200';
    };

    const getCelulaBadge = (celulaNome: string | null) => {
        if (!celulaNome) return 'bg-gray-100 text-gray-600 border-gray-200';
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4 sm:p-6 lg:p-8">
            {/* Renderiza o ToastContainer do hook global */}
            <ToastContainer />

            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-600 to-green-500 rounded-2xl shadow-xl p-6 mb-8 text-white">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                        <div className="flex items-center space-x-4">
                            <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                                <FaUsers className="text-2xl" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold">Gerenciar Usuários</h1>
                                <p className="text-emerald-100 mt-2">Administre os perfis de usuários do sistema</p>
                            </div>
                        </div>
                        <Link 
                            href="/dashboard"
                            className="flex items-center space-x-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-2.5 rounded-xl text-white font-medium transition-all duration-200"
                        >
                            <FaArrowLeft className="text-sm" />
                            <span>Voltar ao Dashboard</span>
                        </Link>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
                        <div className="flex items-center space-x-3">
                            <FaExclamationTriangle className="text-red-500 text-xl flex-shrink-0" />
                            <div>
                                <h3 className="text-red-800 font-medium">Erro</h3>
                                <p className="text-red-600 text-sm mt-1">{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Seção para Enviar Link Mágico */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-8">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center space-x-2">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                            <FaEnvelope className="text-indigo-600" />
                        </div>
                        <span>Convidar Novo Líder / Reenviar Link</span>
                    </h2>
                    <form onSubmit={handleSendMagicLink} className="space-y-4">
                        <div className="flex flex-col sm:flex-row gap-4"> {/* sm:flex-row para alinhamento em telas maiores */}
                            <div className="flex-1">
                                <input
                                    type="email"
                                    placeholder="Email do novo líder ou existente"
                                    value={newUserEmail}
                                    onChange={(e) => setNewUserEmail(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 hover:border-gray-400"
                                    required
                                    disabled={submitting}
                                />
                            </div>
                            <button
                                type="submit"
                                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-6 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 disabled:from-indigo-400 disabled:to-purple-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2 font-medium shadow-lg hover:shadow-lg w-full sm:w-auto"
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <>
                                        <FaSpinner className="animate-spin" />
                                        <span>Enviando...</span>
                                    </>
                                ) : (
                                    <>
                                        <FaEnvelope />
                                        <span>Enviar Link Mágico</span>
                                    </>
                                )}
                            </button>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                            <p className="text-sm text-blue-700 flex items-start space-x-2">
                                <svg className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/>
                                </svg>
                                <span>
                                    Enviar um link de login (link mágico) para o email especificado. Se o usuário não existir, uma conta será criada.
                                    O usuário precisará ativar a conta com uma chave de ativação posteriormente.
                                </span>
                            </p>
                        </div>
                    </form>
                </div>

                {/* Lista de Perfis de Usuários */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold text-gray-800 flex items-center space-x-2">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <FaUsers className="text-blue-600" />
                            </div>
                            <span>Perfis Existentes</span>
                        </h2>
                        <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                            {userProfiles.length} {userProfiles.length === 1 ? 'usuário' : 'usuários'}
                        </div>
                    </div>
                    
                    {userProfiles.length === 0 ? (
                        <div className="text-center p-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                            <FaUsers className="text-4xl text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500 text-lg">Nenhum perfil de usuário encontrado</p>
                            <p className="text-gray-400 text-sm mt-2">Convide o primeiro usuário usando o formulário acima</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {userProfiles.map((profile) => (
                                <div key={profile.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all duration-200">
                                    {editingUserId === profile.id ? (
                                        <form onSubmit={handleUpdateUser} className="space-y-4">
                                            <div className="flex items-center space-x-3 mb-4">
                                                <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full flex items-center justify-center text-white font-semibold">
                                                    {profile.email?.charAt(0).toUpperCase() || 'U'}
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-gray-900">{profile.email}</h3>
                                                    <p className="text-sm text-gray-500">Editando perfil...</p>
                                                </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6"> {/* Ajuste de espaçamento para mobile */}
                                                <div className="space-y-2">
                                                    <label className="block text-sm font-medium text-gray-700 flex items-center space-x-2">
                                                        <FaUserTag className="text-gray-400 text-sm" />
                                                        <span>Função</span>
                                                    </label>
                                                    <select
                                                        value={editingUserRole}
                                                        onChange={(e) => setEditingUserRole(e.target.value as 'admin' | 'líder')}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                                                        disabled={submitting}
                                                    >
                                                        <option value="líder">Líder</option>
                                                        <option value="admin">Administrador</option>
                                                    </select>
                                                </div>
                                                
                                                <div className="space-y-2">
                                                    <label className="block text-sm font-medium text-gray-700 flex items-center space-x-2">
                                                        <FaUserCog className="text-gray-400 text-sm" />
                                                        <span>Célula</span>
                                                    </label>
                                                    <select
                                                        value={editingUserCelulaId || ''}
                                                        onChange={(e) => setEditingUserCelulaId(e.target.value || null)}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                                                        disabled={submitting}
                                                    >
                                                        <option value="">Nenhuma Célula</option>
                                                        {celulasOptions.map((celula) => (
                                                            <option key={celula.id} value={celula.id}>{celula.nome}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                            
                                            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 justify-end pt-4 border-t border-gray-200"> {/* Ajuste de responsividade aqui */}
                                                <button
                                                    type="submit"
                                                    className="flex items-center space-x-2 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 w-full sm:w-auto justify-center"
                                                    disabled={submitting}
                                                >
                                                    <FaSave className="text-sm" />
                                                    <span>{submitting ? 'Salvando...' : 'Salvar Alterações'}</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setEditingUserId(null)}
                                                    className="bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors disabled:bg-gray-400 w-full sm:w-auto justify-center"
                                                    disabled={submitting}
                                                >
                                                    <FaTimes className="text-sm" />
                                                    <span>Cancelar</span>
                                                </button>
                                            </div>
                                        </form>
                                    ) : (
                                        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0"> {/* Layout responsivo da linha do usuário */}
                                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-x-4"> {/* Informações do usuário em grid responsivo */}
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                                                        {profile.email?.charAt(0).toUpperCase() || 'U'}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-semibold text-gray-900 truncate">{profile.email}</h3>
                                                        <p className="text-xs text-gray-500 truncate">ID: {profile.id.substring(0, 8)}...</p>
                                                    </div>
                                                </div>
                                                
                                                <div className="sm:col-span-1"> {/* Role */}
                                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getRoleBadge(profile.role || '')}`}>
                                                        {profile.role === 'admin' ? <FaUserCog className="mr-1" /> : <FaUserTag className="mr-1" />}
                                                        {profile.role || 'N/A'}
                                                    </span>
                                                </div>
                                                
                                                <div className="sm:col-span-1"> {/* Célula */}
                                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getCelulaBadge(profile.celula_nome ?? null)}`} >
                                                        {profile.celula_nome || 'Nenhuma célula'}
                                                    </span>
                                                </div>
                                                
                                                <div className="space-y-1 sm:col-span-2 lg:col-span-1"> {/* Datas */}
                                                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                                                        <FaCalendarAlt className="text-gray-400" />
                                                        <span>Último login: {formatDateForDisplay(profile.last_sign_in_at) || 'Nunca'}</span>
                                                    </div>
                                                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                                                        <FaCalendarAlt className="text-gray-400" />
                                                        <span>Criado: {formatDateForDisplay(profile.created_at)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="flex flex-wrap gap-2 justify-end mt-4 md:mt-0"> {/* Botões de ação do usuário responsivos */}
                                                <button
                                                    onClick={() => handleEditClick(profile)}
                                                    className="inline-flex items-center space-x-2 p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                                                    title="Editar Usuário"
                                                    disabled={submitting}
                                                >
                                                    <FaUserEdit className="text-sm" />
                                                    <span className="text-sm hidden sm:inline">Editar</span> {/* Texto visível em sm: e acima */}
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteUser(profile.id, profile.email)}
                                                    className="inline-flex items-center space-x-2 p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors duration-200"
                                                    title="Excluir Usuário"
                                                    disabled={submitting}
                                                >
                                                    <FaTrash className="text-sm" />
                                                    <span className="text-sm hidden sm:inline">Excluir</span> {/* Texto visível em sm: e acima */}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Informações Adicionais */}
                <div className="mt-6 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl p-4">
                    <div className="flex items-start space-x-3">
                        <div className="bg-purple-100 p-2 rounded-lg">
                            <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/>
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-purple-800">Sobre os perfis de usuário</h3>
                            <ul className="text-sm text-purple-600 mt-1 space-y-1">
                                <li>• <strong>Administradores</strong> têm acesso completo a todas as células e funcionalidades do sistema</li>
                                <li>• <strong>Líderes</strong> têm acesso apenas à sua célula atribuída</li>
                                <li>• Usuários sem célula atribuída não podem acessar dados específicos de células</li>
                                <li>• Links mágicos expiram após 24 horas e são de uso único</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}