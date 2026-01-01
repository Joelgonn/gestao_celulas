'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';
import { activateAccountWithKey } from '@/lib/auth_actions';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function ActivateAccountPage() {
    const [key, setKey] = useState('');
    const [loading, setLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [checking, setChecking] = useState(true);
    const router = useRouter();

    const checkStatus = useCallback(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;

        if (!user) {
            router.replace('/login');
            return;
        }
        
        setUserEmail(user.email ?? null);

        const { data: profile } = await supabase
            .from('profiles')
            .select('celula_id, role')
            .eq('id', user.id)
            .single();

        if (profile) {
            if (profile.role === 'admin' || (profile.role === 'líder' && profile.celula_id !== null)) {
                router.replace('/dashboard');
                return;
            }
        }
        setChecking(false);
    }, [router]);

    useEffect(() => {
        checkStatus();
    }, [checkStatus]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanKey = key.trim();

        if (!cleanKey) {
            setStatusMessage({ type: 'error', text: "Por favor, digite o código de acesso." });
            return;
        }

        setLoading(true);
        setStatusMessage(null);

        try {
            const result = await activateAccountWithKey(cleanKey);

            if (result.success) {
                setStatusMessage({ type: 'success', text: "Acesso liberado! Preparando seu painel..." });
                router.refresh();
                setTimeout(() => {
                    router.replace('/dashboard');
                }, 1500);
            } else {
                setStatusMessage({ type: 'error', text: result.message });
                setLoading(false);
            }
        } catch (error: any) {
            console.error("ActivateAccountPage error:", error);
            setStatusMessage({ type: 'error', text: "Ocorreu um erro ao validar o código." });
            setLoading(false);
        }
    };

    if (checking) {
        return <LoadingSpinner fullScreen text="Verificando sua conta..." />;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col justify-center items-center p-4 font-sans">
            <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-2xl border border-white">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Quase lá!</h2>
                    <p className="text-gray-500 mt-3 text-sm leading-relaxed">
                        Olá, <span className="font-semibold text-orange-600">{userEmail}</span>. 
                        Informe o <strong>código de acesso</strong> enviado pela sua liderança para ativar seu painel.
                    </p>
                </div>

                {statusMessage && (
                    <div className={`p-4 mb-6 rounded-2xl text-sm font-medium animate-in fade-in slide-in-from-top-2 ${
                        statusMessage.type === 'error' 
                        ? 'bg-red-50 text-red-700 border border-red-100' 
                        : 'bg-green-50 text-green-700 border border-green-100'
                    }`}>
                        {statusMessage.text}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label htmlFor="activationKey" className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">
                            Código de Acesso
                        </label>
                        <input
                            id="activationKey"
                            type="text"
                            placeholder="Digite seu código"
                            value={key}
                            onChange={(e) => setKey(e.target.value)}
                            className="w-full px-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all text-center text-2xl font-mono tracking-widest uppercase placeholder:text-gray-300 placeholder:font-sans placeholder:text-sm"
                            required
                            disabled={loading}
                            autoFocus
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full py-4 px-6 rounded-2xl shadow-lg shadow-orange-600/20 text-lg font-bold text-white bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-orange-500/30 disabled:from-gray-300 disabled:to-gray-400 disabled:shadow-none disabled:cursor-not-allowed transition-all"
                        disabled={loading}
                    >
                        {loading ? (
                            <div className="flex items-center justify-center gap-2">
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                <span>Validando acesso...</span>
                            </div>
                        ) : 'Concluir e Acessar Painel'}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-gray-50 text-center">
                    <p className="text-xs text-gray-400">
                        Não possui um código? <br/> 
                        Solicite ao administrador do sistema <strong>Apascentar</strong>.
                    </p>
                </div>
            </div>
        </div>
    );
}