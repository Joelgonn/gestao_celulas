'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';
import { activateAccountWithKey } from '@/lib/auth_actions';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function ActivateAccountPage() {
    const [key, setKey] = useState('');
    const [loading, setLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        async function checkUserSession() {
            // CORREÇÃO: getSession retorna { data: { session } } e o user está dentro da session
            const { data: { session }, error } = await supabase.auth.getSession();
            const user = session?.user;

            if (error || !user) {
                router.replace('/login');
                return;
            }
            
            setUserEmail(user.email ?? null);

            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('celula_id, role')
                .eq('id', user.id)
                .single();

            if (profileError) {
                console.warn("ActivateAccountPage: Perfil ainda não encontrado ou erro.", profileError);
            } else if (profile) {
                if (profile.role === 'admin' || profile.celula_id !== null) {
                    window.location.href = '/dashboard';
                    return;
                }
            }
        }
        checkUserSession();
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setStatusMessage(null);

        if (!key.trim()) {
            setStatusMessage("Por favor, insira a chave de ativação.");
            setLoading(false);
            return;
        }

        try {
            const result = await activateAccountWithKey(key.trim());

            if (result.success) {
                setStatusMessage("Conta ativada com sucesso! Redirecionando...");
                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 1500);
            } else {
                setStatusMessage(`Erro: ${result.message}`);
                setLoading(false);
            }
        } catch (error: any) {
            console.error("ActivateAccountPage: Erro ao ativar conta:", error);
            setStatusMessage(`Erro inesperado: ${error.message}`);
            setLoading(false);
        }
    };

    if (!userEmail) {
        return <LoadingSpinner fullScreen text="Verificando conta..." />;
    }

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4">
            <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-xl text-center">
                <h2 className="text-2xl font-bold mb-4 text-gray-800">Ativar Sua Conta</h2>
                <p className="text-gray-600 mb-6">
                    Bem-vindo(a), <span className="font-semibold">{userEmail}</span>! Para começar a usar o sistema, por favor, insira a chave de ativação fornecida pelo seu administrador.
                </p>

                {statusMessage && (
                    <div className={`p-3 mb-4 rounded ${statusMessage.startsWith('Erro') || statusMessage.startsWith('Erro inesperado') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {statusMessage}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="activationKey" className="sr-only">Chave de Ativação</label>
                        <input
                            id="activationKey"
                            type="text"
                            placeholder="Insira sua chave de ativação"
                            value={key}
                            onChange={(e) => setKey(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-center text-lg"
                            required
                            disabled={loading}
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors"
                        disabled={loading}
                    >
                        {loading ? 'Ativando e Configurando...' : 'Ativar Conta'}
                    </button>
                </form>

                <p className="mt-6 text-sm text-gray-500">
                    Não tem uma chave de ativação? Contate seu administrador.
                </p>
            </div>
        </div>
    );
}