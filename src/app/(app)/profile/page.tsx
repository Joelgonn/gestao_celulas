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
  FaSpinner,
  FaEye,
  FaEyeSlash,
  FaChevronRight,
  FaShieldAlt,
  FaCheckCircle // Adicionado aqui para corrigir o erro de build
} from 'react-icons/fa';

import useToast from '@/hooks/useToast';

export default function ProfilePage() {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');

    const [formData, setFormData] = useState({ nome_completo: '', telefone: '' });
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false); 
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
            }
        } catch (err) {
            addToast("Falha ao carregar perfil.", 'error');
        } finally {
            setLoading(false);
        }
    }, [addToast]);

    useEffect(() => { fetchUserProfile(); }, [fetchUserProfile]);

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ 
            ...prev, 
            [name]: name === 'telefone' ? normalizePhoneNumber(value) : value 
        }));
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile || !formData.nome_completo.trim()) return;
        setSubmitting(true);
        try {
            await updateUserProfileData(profile.id, {
                nome_completo: formData.nome_completo.trim(),
                telefone: formData.telefone || null, 
            });
            addToast("Perfil atualizado com sucesso!", 'success');
            fetchUserProfile(); 
        } catch (err) {
            addToast("Erro ao atualizar perfil.", 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword.length < 6) return addToast("Mínimo de 6 caracteres.", 'error');
        if (newPassword !== confirmPassword) return addToast("Senhas não conferem.", 'error');
        
        setSubmitting(true);
        try {
            const { success, message } = await updateUserPassword(newPassword);
            if (success) {
                addToast("Senha alterada!", 'success');
                setNewPassword(''); setConfirmPassword('');
                setActiveTab('profile'); 
            } else {
                addToast(message, 'error');
            }
        } catch (err) {
            addToast("Erro ao trocar senha.", 'error');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><LoadingSpinner /></div>;

    if (!profile) return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
            <div className="bg-white rounded-[2rem] shadow-xl p-10 max-w-sm w-full text-center border border-gray-100">
                <FaExclamationTriangle className="text-4xl text-amber-500 mx-auto mb-4" />
                <h2 className="text-xl font-black text-gray-800 mb-6">Perfil não encontrado</h2>
                <button onClick={fetchUserProfile} className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold">Tentar Novamente</button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 pb-20 font-sans">
            <ToastContainer />

            {/* Header Indigo */}
            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 shadow-lg px-4 pt-8 pb-24 sm:px-8 border-b border-indigo-500/20">
                <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-5">
                        <Link href="/dashboard" className="bg-white/20 p-3 rounded-2xl text-white hover:bg-white/30 transition-all active:scale-90 backdrop-blur-md border border-white/10">
                            <FaArrowLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-black text-white tracking-tight">Meu Perfil</h1>
                            <p className="text-indigo-100 text-sm font-medium opacity-80 uppercase tracking-widest">Configurações de Conta</p>
                        </div>
                    </div>
                    
                    <div className="px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-white text-[10px] font-black uppercase tracking-widest">
                        {profile.role === 'admin' ? 'Administrador' : 'Líder de Célula'}
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 sm:px-8 -mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Menu Lateral */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-[2.5rem] shadow-xl p-4 border border-gray-100">
                        <nav className="space-y-2">
                            <button
                                onClick={() => setActiveTab('profile')}
                                className={`w-full flex items-center justify-between p-4 rounded-[1.5rem] transition-all font-bold text-sm ${
                                    activeTab === 'profile'
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                                        : 'text-gray-500 hover:bg-gray-50'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <FaUser size={16} /> Dados Pessoais
                                </div>
                                <FaChevronRight size={10} className={activeTab === 'profile' ? 'opacity-100' : 'opacity-0'} />
                            </button>
                            <button
                                onClick={() => setActiveTab('password')}
                                className={`w-full flex items-center justify-between p-4 rounded-[1.5rem] transition-all font-bold text-sm ${
                                    activeTab === 'password'
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                                        : 'text-gray-500 hover:bg-gray-50'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <FaShieldAlt size={16} /> Segurança
                                </div>
                                <FaChevronRight size={10} className={activeTab === 'password' ? 'opacity-100' : 'opacity-0'} />
                            </button>
                        </nav>
                    </div>

                    {/* Card Célula */}
                    <div className="bg-indigo-900 rounded-[2.5rem] shadow-xl p-8 text-white relative overflow-hidden group">
                        <FaUsers size={120} className="absolute -bottom-4 -right-4 opacity-10 transform group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Minha Unidade</span>
                        <h3 className="text-xl font-black mt-1 mb-4">{profile.celula_nome || 'Aguardando Célula'}</h3>
                        {profile.celula_id ? (
                            <div className="flex items-center gap-2 text-xs text-emerald-400 font-bold">
                                <FaCheckCircle /> Célula Vinculada
                            </div>
                        ) : (
                            <Link href="/activate-account" className="inline-block bg-orange-500 text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-orange-600 transition-colors uppercase">
                                Ativar Agora
                            </Link>
                        )}
                    </div>
                </div>

                {/* Área de Edição */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 p-8 sm:p-10">
                        
                        {activeTab === 'profile' ? (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Informações Pessoais</h2>
                                    <p className="text-gray-400 text-sm mt-1 font-medium">Mantenha seus dados de contato atualizados.</p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="bg-gray-50 p-5 rounded-3xl border border-gray-100">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">E-mail Principal</label>
                                        <div className="flex items-center gap-2 text-gray-900 font-bold text-sm truncate">
                                            <FaEnvelope className="text-indigo-400" /> {profile.email}
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 p-5 rounded-3xl border border-gray-100">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Data de Ingresso</label>
                                        <div className="flex items-center gap-2 text-gray-900 font-bold text-sm">
                                            <FaCalendarAlt className="text-indigo-400" /> {formatDateForDisplay(profile.created_at)}
                                        </div>
                                    </div>
                                </div>

                                <form onSubmit={handleUpdateProfile} className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Nome Completo</label>
                                        <input type="text" name="nome_completo" value={formData.nome_completo} onChange={handleFormChange} className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-gray-700" required disabled={submitting} />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Telefone / WhatsApp</label>
                                        <input type="tel" name="telefone" value={formData.telefone} onChange={handleFormChange} placeholder="(00) 00000-0000" maxLength={11} className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-gray-700" disabled={submitting} />
                                    </div>

                                    <button type="submit" disabled={submitting} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-5 rounded-2xl font-black text-lg shadow-lg shadow-indigo-200 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-3 cursor-pointer">
                                        {submitting ? <FaSpinner className="animate-spin" /> : <FaSave />} Salvar Alterações
                                    </button>
                                </form>
                            </div>
                        ) : (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Segurança</h2>
                                    <p className="text-gray-400 text-sm mt-1 font-medium">Recomendamos trocar sua senha periodicamente.</p>
                                </div>

                                <form onSubmit={handleChangePassword} className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Nova Senha</label>
                                        <div className="relative group">
                                            <input type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-gray-700 pr-14" required disabled={submitting} minLength={6} />
                                            <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 transition-colors cursor-pointer"><FaEye size={20} /></button>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Confirmar Senha</label>
                                        <div className="relative group">
                                            <input type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-gray-700 pr-14" required disabled={submitting} minLength={6} />
                                            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 transition-colors cursor-pointer"><FaEye size={20} /></button>
                                        </div>
                                    </div>

                                    <button type="submit" disabled={submitting} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-5 rounded-2xl font-black text-lg shadow-lg shadow-indigo-200 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-3 cursor-pointer">
                                        {submitting ? <FaSpinner className="animate-spin" /> : <FaKey />} Atualizar Senha
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}