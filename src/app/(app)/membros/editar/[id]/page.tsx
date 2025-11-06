// src/app/(app)/membros/editar/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Membro, atualizarMembro, getMembro } from '@/lib/data';
import { normalizePhoneNumber } from '@/utils/formatters';

// Sistema de Toasts
interface Toast {
    id: string;
    type: 'success' | 'error';
    message: string;
}

interface FormData {
  nome: string;
  telefone: string;
  data_nascimento: string;
  endereco: string;
}

export default function EditMembroPage() {
    const params = useParams();
    const membroId = params.id as string;
    const [formData, setFormData] = useState<FormData>({
        nome: '',
        telefone: '',
        data_nascimento: '',
        endereco: '',
    });
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const addToast = (toast: Omit<Toast, 'id'>) => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts(prev => [...prev, { ...toast, id }]);
    };

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
                    });
                } else {
                    addToast({ type: 'error', message: 'Membro não encontrado.' });
                    router.push('/membros');
                }
            } catch (error: any) {
                addToast({ type: 'error', message: `Erro ao carregar membro: ${error.message}` });
            }
        };
        fetchMembro();
    }, [membroId, router]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
            });
            addToast({ type: 'success', message: 'Membro atualizado com sucesso!' });
            setTimeout(() => router.push('/membros'), 2000);
        } catch (error: any) {
            addToast({ type: 'error', message: `Erro ao atualizar: ${error.message}` });
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
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
                            <input id="endereco" name="endereco" type="text" value={formData.endereco} onChange={handleChange} className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm" placeholder="Endereço"/>
                        </div>
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