// src/app/(app)/membros/editar/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Membro, atualizarMembro, getMembro } from '@/lib/data';
import { normalizePhoneNumber } from '@/utils/formatters';

// --- REFATORAÇÃO: TOASTS ---
// Vamos usar o sistema de toasts que já refatoramos para ser global/reutilizável.
// Removeremos a implementação local de Toast e usaremos o hook `useToast`.
import useToast from '@/hooks/useToast';
import Toast from '@/components/ui/Toast';
// --- FIM REFATORAÇÃO TOASTS ---

interface FormData {
  nome: string;
  telefone: string;
  data_nascimento: string;
  endereco: string;
  // --- CORREÇÃO APLICADA AQUI ---
  // Adicionar as propriedades que estavam faltando
  data_ingresso: string;
  status: 'Ativo' | 'Inativo' | 'Em transição';
  // --- FIM CORREÇÃO ---
}

export default function EditMembroPage() {
    const params = useParams();
    const membroId = params.id as string;
    const [formData, setFormData] = useState<FormData>({
        nome: '',
        telefone: '',
        data_nascimento: '',
        endereco: '',
        // --- CORREÇÃO APLICADA AQUI ---
        // Valores iniciais para as novas propriedades
        data_ingresso: '',
        status: 'Ativo', // Ou o status padrão que você preferir
        // --- FIM CORREÇÃO ---
    });
    // --- REFATORAÇÃO: TOASTS ---
    // Substituir o estado local de toasts pelo hook global
    const { toasts, addToast, removeToast } = useToast();
    // --- FIM REFATORAÇÃO TOASTS ---

    const [loading, setLoading] = useState(false);
    const router = useRouter();

    // --- REFATORAÇÃO: TOASTS ---
    // A função addToast local foi removida, agora usamos a do hook.
    // --- FIM REFATORAÇÃO TOASTS ---

    useEffect(() => {
        const fetchMembro = async () => {
            if (!membroId) return;
            try {
                const membro = await getMembro(membroId);
                if (membro) {
                    setFormData({
                        nome: membro.nome || '',
                        telefone: membro.telefone || '',
                        data_nascimento: membro.data_nascimento || '',
                        endereco: membro.endereco || '',
                        // --- CORREÇÃO APLICADA AQUI ---
                        // Popular as novas propriedades ao carregar o membro
                        data_ingresso: membro.data_ingresso || '',
                        status: membro.status || 'Ativo', // Garantir um valor padrão
                        // --- FIM CORREÇÃO ---
                    });
                } else {
                    addToast('Membro não encontrado.', 'error'); // Usando o addToast do hook
                    router.push('/membros');
                }
            } catch (error: any) {
                addToast(`Erro ao carregar membro: ${error.message}`, 'error'); // Usando o addToast do hook
            }
        };
        fetchMembro();
    }, [membroId, router, addToast]); // Adicionar addToast às dependências do useEffect

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { // Pode ser HTMLSelectElement para o status
        const { name, value } = e.target;
        if (name === 'telefone') {
            setFormData(prev => ({ ...prev, [name]: normalizePhoneNumber(value) }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await atualizarMembro(membroId, {
                nome: formData.nome,
                telefone: formData.telefone,
                data_nascimento: formData.data_nascimento,
                endereco: formData.endereco,
                // --- CORREÇÃO APLICADA AQUI ---
                // Incluir as propriedades obrigatórias na chamada da função
                data_ingresso: formData.data_ingresso,
                status: formData.status,
                // --- FIM CORREÇÃO ---
            });
            addToast('Membro atualizado com sucesso!', 'success'); // Usando o addToast do hook
            setTimeout(() => router.push('/membros'), 2000);
        } catch (error: any) {
            addToast(`Erro ao atualizar: ${error.message}`, 'error'); // Usando o addToast do hook
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            {/* --- REFATORAÇÃO: TOASTS --- */}
            {/* Renderizar os toasts globais */}
            <div className="fixed top-4 right-4 z-50 w-80 space-y-2">
                {toasts.map((toast) => (
                    <Toast
                        key={toast.id}
                        message={toast.message}
                        type={toast.type}
                        onClose={() => removeToast(toast.id)}
                    />
                ))}
            </div>
            {/* --- FIM REFATORAÇÃO TOASTS --- */}

            <div className="max-w-md w-full space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Editar Membro
                    </h2>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <label htmlFor="nome" className="sr-only">Nome</label>
                            <input id="nome" name="nome" type="text" required value={formData.nome} onChange={handleChange} className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm" placeholder="Nome Completo"/>
                        </div>
                        <div>
                            <label htmlFor="telefone" className="sr-only">Telefone</label>
                            <input id="telefone" name="telefone" type="tel" value={formData.telefone} onChange={handleChange} className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm" placeholder="Telefone"/>
                        </div>
                        <div>
                            <label htmlFor="data_nascimento" className="sr-only">Data de Nascimento</label>
                            <input id="data_nascimento" name="data_nascimento" type="date" value={formData.data_nascimento} onChange={handleChange} className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm" placeholder="Data de Nascimento"/>
                        </div>
                         <div>
                            <label htmlFor="endereco" className="sr-only">Endereço</label>
                            <input id="endereco" name="endereco" type="text" value={formData.endereco} onChange={handleChange} className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm" placeholder="Endereço"/>
                        </div>
                        {/* --- CORREÇÃO APLICADA AQUI --- */}
                        {/* Novos campos para data_ingresso e status */}
                        <div>
                            <label htmlFor="data_ingresso" className="sr-only">Data de Ingresso</label>
                            <input id="data_ingresso" name="data_ingresso" type="date" required value={formData.data_ingresso} onChange={handleChange} className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm" placeholder="Data de Ingresso"/>
                        </div>
                        <div>
                            <label htmlFor="status" className="sr-only">Status</label>
                            <select id="status" name="status" required value={formData.status} onChange={handleChange} className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm">
                                <option value="Ativo">Ativo</option>
                                <option value="Inativo">Inativo</option>
                                <option value="Em transição">Em transição</option>
                            </select>
                        </div>
                        {/* --- FIM CORREÇÃO --- */}
                    </div>
                    <div>
                        <button type="submit" disabled={loading} className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                            {loading ? 'Atualizando...' : 'Atualizar Membro'}
                        </button>
                    </div>
                </form>
                <div className="text-sm text-center">
                    <Link href="/membros" className="font-medium text-indigo-600 hover:text-indigo-500">
                        Cancelar
                    </Link>
                </div>
            </div>
        </div>
    );
}