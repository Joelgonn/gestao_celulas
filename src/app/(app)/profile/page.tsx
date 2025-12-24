// src/app/(app)/profile/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getUserProfile, updateUserProfileData, updateUserPassword } from '@/lib/data';
import { Profile } from '@/lib/types';
import { normalizePhoneNumber, formatDateForDisplay } from '@/utils/formatters';
import LoadingSpinner from '@/components/LoadingSpinner';
import {
  FaUser,
  FaEnvelope,
  FaUsers,
  FaCalendarAlt,
  FaPhone,
  FaLock,
  FaExclamationTriangle,
  FaEdit,
  FaKey,
  FaArrowLeft,
  FaSave,
  FaSpinner
} from 'react-icons/fa';

import useToast from '@/hooks/useToast';

export default function ProfilePage() {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');

    // Formulário de perfil
    const [formData, setFormData] = useState({
        nome_completo: '', 
        telefone: '',      
    });

    // Formulário de senha
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const router = useRouter();
    const { addToast, ToastContainer } = useToast();

    const fetchUserProfile = useCallback(async () => {
        setLoading(true);
        try {
            const userProfileData = await getUserProfile();
            if (userProfileData) {
                setProfile(userProfileData);
                setFormData({
                    nome_completo: userProfileData.nome_completo || '', 
                    telefone: normalizePhoneNumber(userProfileData.telefone) || '', 
                });
                // addToast('Perfil carregado', 'success'); // Opcional
            } else {
                addToast("Perfil não encontrado.", 'error');
            }
        } catch (err: any) {
            console.error("Erro ao carregar perfil:", err);
            addToast("Falha ao carregar perfil.", 'error');
        } finally {
            setLoading(false);
        }
    }, [addToast]);

    useEffect(() => {
        fetchUserProfile();
    }, [fetchUserProfile]);

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if (name === 'telefone') {
            setFormData(prev => ({ ...prev, [name]: normalizePhoneNumber(value) }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile) return;
        setSubmitting(true);

        if (!formData.nome_completo.trim()) {
            addToast("Nome é obrigatório.", 'error');
            setSubmitting(false);
            return;
        }

        try {
            await updateUserProfileData(profile.id, {
                nome_completo: formData.nome_completo.trim(),
                telefone: formData.telefone || null, 
            });
            addToast("Perfil atualizado!", 'success');
            fetchUserProfile(); 
        } catch (err: any) {
            console.error("Erro update:", err);
            addToast("Erro ao atualizar perfil.", 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        if (newPassword.length < 6) {
            addToast("Senha deve ter min. 6 caracteres.", 'error');
            setSubmitting(false);
            return;
        }
        if (newPassword !== confirmPassword) {
            addToast("Senhas não conferem.", 'error');
            setSubmitting(false);
            return;
        }

        try {
            const { success, message } = await updateUserPassword(newPassword);
            if (success) {
                addToast("Senha alterada com sucesso!", 'success');
                setNewPassword('');
                setConfirmPassword('');
                setActiveTab('profile'); 
            } else {
                addToast(message, 'error');
            }
        } catch (err: any) {
            console.error("Erro senha:", err);
            addToast("Erro ao trocar senha.", 'error');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <LoadingSpinner />
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FaExclamationTriangle className="text-2xl text-red-500" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Perfil não encontrado</h2>
                    <button
                        onClick={fetchUserProfile}
                        className="mt-4 w-full bg-red-600 text-white py-3 rounded-xl hover:bg-red-700 font-medium"
                    >
                        Tentar Novamente
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <ToastContainer />

            {/* Header Responsivo */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 shadow-lg px-4 py-6 sm:px-8 pb-16">
                <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="bg-white/20 p-3 rounded-xl text-white hover:bg-white/30 transition-colors">
                            <FaArrowLeft />
                        </Link>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-white">Meu Perfil</h1>
                            <p className="text-purple-100 text-sm">Gerencie seus dados</p>
                        </div>
                    </div>
                    
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 flex items-center gap-3 border border-white/20">
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white">
                            <FaUser />
                        </div>
                        <div className="text-white">
                            <p className="font-bold text-sm leading-tight">{profile.nome_completo || 'Usuário'}</p>
                            <p className="text-xs text-purple-200 uppercase font-bold tracking-wide">
                                {profile.role === 'admin' ? 'Administrador' : 'Líder'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 -mt-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Sidebar Navigation */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-white rounded-2xl shadow-md p-4 space-y-2">
                        <button
                            onClick={() => setActiveTab('profile')}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all font-medium text-sm ${
                                activeTab === 'profile'
                                    ? 'bg-purple-50 text-purple-700 ring-1 ring-purple-200'
                                    : 'text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            <FaUser className={activeTab === 'profile' ? 'text-purple-600' : 'text-gray-400'} />
                            Dados Pessoais
                        </button>
                        <button
                            onClick={() => setActiveTab('password')}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all font-medium text-sm ${
                                activeTab === 'password'
                                    ? 'bg-purple-50 text-purple-700 ring-1 ring-purple-200'
                                    : 'text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            <FaLock className={activeTab === 'password' ? 'text-purple-600' : 'text-gray-400'} />
                            Segurança
                        </button>
                    </div>

                    {/* Info Célula */}
                    <div className="bg-white rounded-2xl shadow-md p-5 border-l-4 border-blue-500">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Célula Vinculada</h3>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                <FaUsers />
                            </div>
                            <div>
                                <p className="font-bold text-gray-800">{profile.celula_nome || 'Nenhuma'}</p>
                                {profile.celula_id === null && profile.role === 'líder' && (
                                    <Link href="/activate-account" className="text-xs text-orange-600 underline font-medium">
                                        Ativar agora
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Conteúdo Principal */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-2xl shadow-md p-6 sm:p-8">
                        
                        {activeTab === 'profile' ? (
                            <>
                                <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                    <FaUser className="text-purple-500" /> Informações
                                </h2>

                                {/* Read-only Info Cards */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        <div className="flex items-center gap-2 text-gray-500 mb-1">
                                            <FaEnvelope className="text-xs" /> <span className="text-xs font-bold uppercase">Email</span>
                                        </div>
                                        <p className="font-medium text-gray-900 truncate">{profile.email}</p>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        <div className="flex items-center gap-2 text-gray-500 mb-1">
                                            <FaCalendarAlt className="text-xs" /> <span className="text-xs font-bold uppercase">Membro Desde</span>
                                        </div>
                                        <p className="font-medium text-gray-900">{formatDateForDisplay(profile.created_at)}</p>
                                    </div>
                                </div>

                                <form onSubmit={handleUpdateProfile} className="space-y-6">
                                    <div className="space-y-1">
                                        <label htmlFor="nome_completo" className="text-sm font-semibold text-gray-700">Nome Completo</label>
                                        <input
                                            type="text"
                                            id="nome_completo"
                                            name="nome_completo"
                                            value={formData.nome_completo}
                                            onChange={handleFormChange}
                                            className="w-full px-4 py-3 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                                            required
                                            disabled={submitting}
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label htmlFor="telefone" className="text-sm font-semibold text-gray-700">Telefone</label>
                                        <input
                                            type="tel"
                                            id="telefone"
                                            name="telefone"
                                            value={formData.telefone || ''}
                                            onChange={handleFormChange}
                                            placeholder="(XX) XXXXX-XXXX"
                                            maxLength={11}
                                            className="w-full px-4 py-3 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                                            disabled={submitting}
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="w-full bg-purple-600 text-white py-4 rounded-xl font-bold hover:bg-purple-700 transition-all shadow-lg active:scale-[0.98] disabled:opacity-70 disabled:scale-100 flex items-center justify-center gap-2"
                                    >
                                        {submitting ? <FaSpinner className="animate-spin" /> : <FaSave />}
                                        Salvar Alterações
                                    </button>
                                </form>
                            </>
                        ) : (
                            <>
                                <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                    <FaKey className="text-purple-500" /> Alterar Senha
                                </h2>

                                <form onSubmit={handleChangePassword} className="space-y-6">
                                    <div className="space-y-1">
                                        <label htmlFor="newPassword" className="text-sm font-semibold text-gray-700">Nova Senha</label>
                                        <input
                                            type="password"
                                            id="newPassword"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="w-full px-4 py-3 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                                            required
                                            disabled={submitting}
                                            minLength={6}
                                        />
                                        <p className="text-xs text-gray-500">Mínimo de 6 caracteres</p>
                                    </div>

                                    <div className="space-y-1">
                                        <label htmlFor="confirmPassword" className="text-sm font-semibold text-gray-700">Confirmar Senha</label>
                                        <input
                                            type="password"
                                            id="confirmPassword"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="w-full px-4 py-3 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                                            required
                                            disabled={submitting}
                                            minLength={6}
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="w-full bg-purple-600 text-white py-4 rounded-xl font-bold hover:bg-purple-700 transition-all shadow-lg active:scale-[0.98] disabled:opacity-70 disabled:scale-100 flex items-center justify-center gap-2"
                                    >
                                        {submitting ? <FaSpinner className="animate-spin" /> : <FaLock />}
                                        Atualizar Senha
                                    </button>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}