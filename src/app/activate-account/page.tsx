// src/app/activate-account/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';
import { activateAccountWithKey } from '@/lib/auth_actions'; // Importa a Server Action de ativação
import LoadingSpinner from '@/components/LoadingSpinner'; // Importa o spinner de carregamento

export default function ActivateAccountPage() {
    const [key, setKey] = useState(''); // Estado para a chave de ativação
    const [loading, setLoading] = useState(false); // Estado de loading para a operação de ativação
    const [statusMessage, setStatusMessage] = useState<string | null>(null); // Estado para exibir mensagens ao usuário
    const [userEmail, setUserEmail] = useState<string | null>(null); // Estado para exibir o email do usuário logado
    const router = useRouter();

    // Efeito para verificar a sessão do usuário e o estado do perfil
    useEffect(() => {
        async function checkUserSession() {
            const { data: { user }, error } = await supabase.auth.getUser(); // Obtém o usuário logado

            if (error || !user) {
                // Se não houver usuário logado, redireciona para a página de login
                router.replace('/login');
                return;
            }
            setUserEmail(user.email); // Define o email do usuário para exibição

            // Verifica o perfil do usuário para saber se a conta já foi ativada (tem celula_id)
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('celula_id, role') // Busca celula_id e role
                .eq('id', user.id)
                .single();

            if (profileError) {
                // Erro ao buscar perfil (pode ser esperado se for um novo usuário sem perfil ainda)
                console.error("ActivateAccountPage: Erro ao buscar perfil:", profileError);
            } else if (profile && profile.celula_id !== null) {
                // Se o perfil já existe e tem um celula_id, significa que a conta já foi ativada.
                // Redireciona para o dashboard.
                router.replace('/dashboard');
            }
            // Se o perfil não existe ou celula_id é null, o usuário permanece nesta página para ativar.
        }
        checkUserSession(); // Executa a verificação ao montar o componente
    }, [router]); // Dependência: router para poder redirecionar

    // Handler para submeter o formulário com a chave de ativação
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true); // Ativa o estado de loading
        setStatusMessage(null); // Limpa mensagens anteriores

        // Validação simples da chave
        if (!key.trim()) {
            setStatusMessage("Por favor, insira a chave de ativação.");
            setLoading(false);
            return;
        }

        try {
            // Chama a Server Action para ativar a conta
            const result = await activateAccountWithKey(key.trim());

            if (result.success) {
                setStatusMessage("Conta ativada com sucesso! Redirecionando...");
                // Pequeno delay para que o usuário veja a mensagem de sucesso antes do redirecionamento
                setTimeout(() => {
                    router.replace('/dashboard');
                }, 1500);
            } else {
                // Exibe a mensagem de erro retornada pela Server Action
                setStatusMessage(`Erro: ${result.message}`);
            }
        } catch (error: any) {
            console.error("ActivateAccountPage: Erro ao ativar conta:", error);
            setStatusMessage(`Erro inesperado: ${error.message}`); // Mensagem genérica em caso de erro inesperado
        } finally {
            setLoading(false); // Desativa o loading ao finalizar a operação
        }
    };

    // Se o email do usuário ainda não foi carregado, mostra o spinner.
    // Isso acontece enquanto a verificação da sessão está em andamento.
    if (!userEmail) {
        return <LoadingSpinner />;
    }

    // Renderiza o formulário de ativação
    return (
        <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4">
            <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-xl text-center">
                <h2 className="text-2xl font-bold mb-4 text-gray-800">Ativar Sua Conta</h2>
                <p className="text-gray-600 mb-6">
                    Bem-vindo(a), <span className="font-semibold">{userEmail}</span>! Para começar a usar o sistema, por favor, insira a chave de ativação fornecida pelo seu administrador.
                </p>

                {/* Exibe mensagens de status (sucesso/erro) */}
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
                            disabled={loading} // Desabilita o input enquanto carrega
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
                        disabled={loading} // Desabilita o botão enquanto carrega
                    >
                        {loading ? 'Ativando...' : 'Ativar Conta'} {/* Texto do botão muda com o estado de loading */}
                    </button>
                </form>

                <p className="mt-6 text-sm text-gray-500">
                    Não tem uma chave de ativação? Contate seu administrador.
                </p>
            </div>
        </div>
    );
}