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

    // Função para verificar se o usuário já foi ativado por fora
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

        // Se o perfil já tiver celula_id ou for admin, ele não deveria estar aqui
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
            setStatusMessage({ type: 'error', text: "Por favor, insira a chave de ativação." });
            return;
        }

        setLoading(true);
        setStatusMessage(null);

        try {
            const result = await activateAccountWithKey(cleanKey);

            if (result.success) {
                setStatusMessage({ type: 'success', text: "Conta ativada com sucesso! Configurando seu acesso..." });
                
                // IMPORTANTE: router.refresh() força o Next.js a invalidar o cache dos layouts
                // Isso faz com que o AuthLayout perceba que agora o usuário tem uma célula.
                router.refresh();
                
                setTimeout(() => {
                    // Usamos replace para o dashboard
                    router.replace('/dashboard');
                }, 1500);
            } else {
                setStatusMessage({ type: 'error', text: result.message });
                setLoading(false);
            }
        } catch (error: any) {
            console.error("ActivateAccountPage error:", error);
            setStatusMessage({ type: 'error', text: "Erro inesperado ao processar ativação." });
            setLoading(false);
        }
    };

    if (checking) {
        return <LoadingSpinner fullScreen text="Verificando sua conta..." />;
    }

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4 font-sans">
            <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-gray-800">Ativar Conta</h2>
                    <p className="text-gray-500 mt-2 text-sm text-pretty">
                        Olá, <span className="font-bold text-orange-600">{userEmail}</span>. 
                        Insira abaixo a chave de ativação para vincular sua conta à sua célula.
                    </p>
                </div>

                {statusMessage && (
                    <div className={`p-4 mb-6 rounded-xl text-sm font-medium animate-in fade-in slide-in-from-top-2 ${
                        statusMessage.type === 'error' 
                        ? 'bg-red-50 text-red-700 border border-red-100' 
                        : 'bg-green-50 text-green-700 border border-green-100'
                    }`}>
                        {statusMessage.text}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label htmlFor="activationKey" className="block text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">
                            Chave de Ativação
                        </label>
                        <input
                            id="activationKey"
                            type="text"
                            placeholder="Ex: XXXX-XXXX-XXXX"
                            value={key}
                            onChange={(e) => setKey(e.target.value)}
                            className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-center text-xl font-mono uppercase placeholder:text-gray-300"
                            required
                            disabled={loading}
                            autoFocus
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full py-4 px-6 border border-transparent rounded-xl shadow-lg text-lg font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-all"
                        disabled={loading}
                    >
                        {loading ? (
                            <div className="flex items-center justify-center gap-2">
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                <span>Configurando...</span>
                            </div>
                        ) : 'Confirmar Ativação'}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-gray-100 text-center text-xs text-gray-400">
                    <p>Precisa de ajuda? Peça a chave para o administrador do sistema.</p>
                </div>
            </div>
        </div>
    );
}