// src/app/(app)/profile/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
// Importa funções de data.ts
import {
    getUserProfile,
    updateUserProfileData,
    updateUserPassword,
} from '@/lib/data';
// Importa a interface Profile de types.ts
import { Profile } from '@/lib/types'; // <--- CORREÇÃO AQUI: Importar Profile de types.ts

import { normalizePhoneNumber, formatPhoneNumberDisplay, formatDateForDisplay } from '@/utils/formatters';
import LoadingSpinner from '@/components/LoadingSpinner';
import { 
  FaUser, 
  FaEnvelope, 
  FaUsers, 
  FaCalendarAlt, 
  FaPhone, 
  FaLock, 
  FaCheckCircle, 
  FaExclamationTriangle, 
  FaInfoCircle, 
  FaTimes,
  FaEdit,
  FaKey,
  FaArrowLeft
} from 'react-icons/fa';

// --- REFATORAÇÃO: TOASTS ---
// CORREÇÃO: Vamos importar o useToast E o ToastComponent de UI
import useToast from '@/hooks/useToast';
import Toast from '@/components/ui/Toast'; // Importar o componente Toast UI diretamente
// --- FIM REFATORAÇÃO TOASTS ---


export default function ProfilePage() {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');

    // Estados para o formulário de edição do perfil
    const [formData, setFormData] = useState({
        nome_completo: '',
        telefone: '',
    });

    // Estados para o formulário de troca de senha
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const router = useRouter();
    // CORREÇÃO AQUI: Chamar o hook useToast e obter 'toasts', 'addToast', 'removeToast'.
    // O ToastContainer NÃO é retornado por este useToast do hooks/.
    // A renderização do ToastContainer será feita manualmente no JSX, como nas outras páginas.
    const { toasts, addToast, removeToast } = useToast();


    const fetchUserProfile = useCallback(async () => {
        setLoading(true);
        try {
            const userProfileData = await getUserProfile();
            if (userProfileData) {
                setProfile(userProfileData);
                setFormData({
                    nome_completo: userProfileData.nome_completo || '',
                    telefone: normalizePhoneNumber(userProfileData.telefone),
                });
                // CORREÇÃO: Adicionando toast ao carregar perfil.
                addToast('Perfil carregado com sucesso', 'success', 3000);
            } else {
                addToast("Perfil não encontrado ou acesso negado.", 'error');
            }
        } catch (err: any) {
            console.error("Erro ao carregar perfil:", err);
            addToast(err.message || "Falha ao carregar dados do perfil.", 'error');
        } finally {
            setLoading(false);
        }
    }, [addToast]); // `addToast` é uma dependência estável do hook `useToast`

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
        setSubmitting(true);

        if (!profile) {
            addToast("Nenhum perfil para atualizar.", 'error');
            setSubmitting(false);
            return;
        }
        if (!formData.nome_completo.trim()) {
            addToast("O campo 'Nome Completo' é obrigatório.", 'error');
            setSubmitting(false);
            return;
        }
        const normalizedPhone = normalizePhoneNumber(formData.telefone);
        if (normalizedPhone && (normalizedPhone.length < 10 || normalizedPhone.length > 11)) {
            addToast("Telefone inválido. Deve ter 10 ou 11 dígitos ou estar vazio.", 'error');
            setSubmitting(false);
            return;
        }

        try {
            await updateUserProfileData(profile.id, {
                nome_completo: formData.nome_completo.trim(),
                telefone: normalizedPhone || null,
            });
            addToast("Perfil atualizado com sucesso!", 'success');
            // Re-fetch para atualizar os dados exibidos no perfil e na sidebar
            fetchUserProfile();
        } catch (err: any) {
            console.error("Erro ao atualizar perfil:", err);
            addToast(err.message || "Falha ao atualizar perfil.", 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        if (newPassword.length < 6) {
            addToast("A senha deve ter no mínimo 6 caracteres.", 'error');
            setSubmitting(false);
            return;
        }
        if (newPassword !== confirmPassword) {
            addToast("As senhas não coincidem.", 'error');
            setSubmitting(false);
            return;
        }

        try {
            const { success, message } = await updateUserPassword(newPassword);
            if (success) {
                addToast(message, 'success');
                setNewPassword('');
                setConfirmPassword('');
                setActiveTab('profile'); // Volta para a aba de perfil após sucesso
            } else {
                addToast(message, 'error');
            }
        } catch (err: any) {
            console.error("Erro ao trocar senha:", err);
            addToast(err.message || "Falha ao trocar senha.", 'error');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                <LoadingSpinner />
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FaExclamationTriangle className="text-2xl text-red-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-red-600 mb-2">Perfil não encontrado</h2>
                    <p className="text-gray-600 mb-6">Não foi possível carregar os dados do seu perfil.</p>
                    <button
                        onClick={fetchUserProfile}
                        className="bg-gradient-to-r from-red-600 to-orange-600 text-white py-3 px-6 rounded-xl hover:from-red-700 hover:to-orange-700 transition-all duration-200 font-medium"
                    >
                        Tentar Novamente
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
            <div className="max-w-4xl mx-auto">
                {/* Header com gradiente */}
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl shadow-xl p-8 mb-8 text-white">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-6 lg:space-y-0">
                        <div className="flex items-center space-x-4">
                            <Link 
                                href="/dashboard" 
                                className="bg-white bg-opacity-20 p-3 rounded-xl hover:bg-opacity-30 transition-all duration-200"
                            >
                                <FaArrowLeft className="text-lg" />
                            </Link>
                            <div>
                                <h1 className="text-3xl lg:text-4xl font-bold mb-2">Meu Perfil</h1>
                                <p className="text-purple-100 text-lg">Gerencie suas informações pessoais e segurança</p>
                            </div>
                        </div>
                        
                        <div className="bg-white bg-opacity-20 rounded-xl p-4">
                            <div className="flex items-center space-x-3">
                                <div className="w-12 h-12 bg-white bg-opacity-30 rounded-full flex items-center justify-center">
                                    <FaUser className="text-xl" />
                                </div>
                                <div>
                                    <p className="font-semibold">{profile.nome_completo || 'Usuário'}</p>
                                    <p className="text-purple-100 text-sm">{profile.role === 'admin' ? 'Administrador' : 'Líder'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Sidebar de Navegação */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-8">
                            <h2 className="text-lg font-semibold text-gray-800 mb-4">Navegação</h2>
                            <nav className="space-y-2">
                                <button
                                    onClick={() => setActiveTab('profile')}
                                    className={`w-full flex items-center space-x-3 p-3 rounded-xl transition-all duration-200 ${
                                        activeTab === 'profile' 
                                            ? 'bg-gradient-to-r from-purple-50 to-indigo-50 text-purple-700 border border-purple-200' 
                                            : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                                >
                                    <FaUser className={`text-lg ${activeTab === 'profile' ? 'text-purple-600' : 'text-gray-400'}`} />
                                    <span className="font-medium">Informações Pessoais</span>
                                </button>
                                <button
                                    onClick={() => setActiveTab('password')}
                                    className={`w-full flex items-center space-x-3 p-3 rounded-xl transition-all duration-200 ${
                                        activeTab === 'password' 
                                            ? 'bg-gradient-to-r from-purple-50 to-indigo-50 text-purple-700 border border-purple-200' 
                                            : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                                >
                                    <FaLock className={`text-lg ${activeTab === 'password' ? 'text-purple-600' : 'text-gray-400'}`} />
                                    <span className="font-medium">Alterar Senha</span>
                                </button>
                            </nav>

                            {/* Informações da Célula */}
                            <div className="mt-8 pt-6 border-t border-gray-200">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3">Célula Vinculada</h3>
                                <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-xl">
                                    <FaUsers className="text-blue-600 text-lg" />
                                    <div>
                                        <p className="font-medium text-blue-800">{profile.celula_nome || 'Nenhuma célula'}</p>
                                        {profile.celula_id === null && profile.role === 'líder' && (
                                            <Link 
                                                href="/activate-account" 
                                                className="text-orange-600 hover:text-orange-700 text-sm font-medium underline mt-1 inline-block"
                                            >
                                                Ativar minha célula
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Conteúdo Principal */}
                    <div className="lg:col-span-2">
                        {activeTab === 'profile' ? (
                            <div className="bg-white rounded-2xl shadow-lg p-8">
                                <div className="flex items-center space-x-3 mb-6">
                                    <div className="w-10 h-10 bg-gradient-to-r from-purple-100 to-indigo-100 rounded-full flex items-center justify-center">
                                        <FaUser className="text-purple-600 text-lg" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-gray-800">Informações Pessoais</h2>
                                </div>

                                {/* Informações do Perfil */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4">
                                        <div className="flex items-center space-x-3 mb-2">
                                            <FaEnvelope className="text-gray-500 text-lg" />
                                            <span className="text-sm font-medium text-gray-700">Email</span>
                                        </div>
                                        <p className="text-gray-900 font-semibold">{profile.email}</p>
                                    </div>
                                    
                                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4">
                                        <div className="flex items-center space-x-3 mb-2">
                                            <FaUsers className="text-gray-500 text-lg" />
                                            <span className="text-sm font-medium text-gray-700">Função</span>
                                        </div>
                                        <p className="text-gray-900 font-semibold">
                                            {profile.role === 'admin' ? 'Administrador' : 'Líder'}
                                        </p>
                                    </div>
                                    
                                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4">
                                        <div className="flex items-center space-x-3 mb-2">
                                            <FaCalendarAlt className="text-gray-500 text-lg" />
                                            <span className="text-sm font-medium text-gray-700">Membro desde</span>
                                        </div>
                                        <p className="text-gray-900 font-semibold">{formatDateForDisplay(profile.created_at)}</p>
                                    </div>
                                </div>

                                {/* Formulário de Edição */}
                                <form onSubmit={handleUpdateProfile} className="space-y-6">
                                    <div>
                                        <label htmlFor="nome_completo" className="block text-sm font-semibold text-gray-700 mb-2">
                                            Nome Completo *
                                        </label>
                                        <input
                                            type="text"
                                            id="nome_completo"
                                            name="nome_completo"
                                            value={formData.nome_completo}
                                            onChange={handleFormChange}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white transition-all duration-200"
                                            required
                                            disabled={submitting}
                                            placeholder="Digite seu nome completo"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label htmlFor="telefone" className="block text-sm font-semibold text-gray-700 mb-2">
                                            <div className="flex items-center space-x-2">
                                                <FaPhone className="text-gray-500" />
                                                <span>Telefone</span>
                                            </div>
                                        </label>
                                        <input
                                            type="text"
                                            id="telefone"
                                            name="telefone"
                                            value={formData.telefone}
                                            onChange={handleFormChange}
                                            placeholder="(XX) XXXXX-XXXX"
                                            maxLength={11}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white transition-all duration-200"
                                            disabled={submitting}
                                        />
                                        <p className="text-xs text-gray-500 mt-2">Apenas números, com DDD (10 ou 11 dígitos)</p>
                                    </div>
                                    
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-4 px-6 rounded-xl hover:from-purple-700 hover:to-indigo-700 disabled:from-purple-400 disabled:to-indigo-400 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
                                    >
                                        <div className="flex items-center justify-center space-x-2">
                                            {submitting ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                    <span>Atualizando...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <FaEdit className="text-lg" />
                                                    <span>Atualizar Perfil</span>
                                                </>
                                            )}
                                        </div>
                                    </button>
                                </form>
                            </div>
                        ) : (
                            <div className="bg-white rounded-2xl shadow-lg p-8">
                                <div className="flex items-center space-x-3 mb-6">
                                    <div className="w-10 h-10 bg-gradient-to-r from-purple-100 to-indigo-100 rounded-full flex items-center justify-center">
                                        <FaLock className="text-purple-600 text-lg" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-gray-800">Alterar Senha</h2>
                                </div>

                                <form onSubmit={handleChangePassword} className="space-y-6">
                                    <div>
                                        <label htmlFor="newPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                                            Nova Senha *
                                        </label>
                                        <input
                                            type="password"
                                            id="newPassword"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white transition-all duration-200"
                                            required
                                            disabled={submitting}
                                            placeholder="Digite a nova senha"
                                            minLength={6}
                                        />
                                        <p className="text-xs text-gray-500 mt-2">Mínimo de 6 caracteres</p>
                                    </div>
                                    
                                    <div>
                                        <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                                            Confirmar Nova Senha *
                                        </label>
                                        <input
                                            type="password"
                                            id="confirmPassword"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white transition-all duration-200"
                                            required
                                            disabled={submitting}
                                            placeholder="Confirme a nova senha"
                                            minLength={6}
                                        />
                                    </div>
                                    
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 px-6 rounded-xl hover:from-green-700 hover:to-emerald-700 disabled:from-green-400 disabled:to-emerald-400 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
                                    >
                                        <div className="flex items-center justify-center space-x-2">
                                            {submitting ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                    <span>Alterando...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <FaKey className="text-lg" />
                                                    <span>Alterar Senha</span>
                                                </>
                                            )}
                                        </div>
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Container de Toasts */}
            <div className="fixed top-4 right-4 z-50 w-80 space-y-2"> {/* CORREÇÃO: Adicionar o container manualmente aqui */}
                {toasts.map((toast) => (
                    <Toast
                        key={toast.id}
                        message={toast.message}
                        type={toast.type}
                        onClose={() => removeToast(toast.id)}
                        duration={toast.duration}
                    />
                ))}
            </div>
        </div>
    );
}