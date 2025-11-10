// src/app/(app)/membros/novo/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    adicionarMembro,
    listarCelulasParaAdmin, // Para que admins possam selecionar a célula
    listarMembros,
    Membro,
    CelulaOption // Tipo para as opções de célula
} from '@/lib/data';
import { normalizePhoneNumber } from '@/utils/formatters';

// --- REFATORAÇÃO: TOASTS ---
import useToast from '@/hooks/useToast';
import Toast from '@/components/ui/Toast';
import LoadingSpinner from '@/components/ui/LoadingSpinner'; // Para o loading inicial
// --- FIM REFATORAÇÃO TOASTS ---

// --- CORREÇÃO: Adicionar celula_id e status à interface FormData ---
interface FormData {
    nome: string;
    telefone: string | null;
    data_ingresso: string;
    data_nascimento: string | null;
    endereco: string | null;
    status: Membro['status']; // Usar o tipo do Membro
    celula_id: string; // celula_id é obrigatório para adicionar um membro
}
// --- FIM CORREÇÃO ---

export default function NewMembroPage() {
    const [formData, setFormData] = useState<FormData>({
        nome: '',
        telefone: null,
        data_ingresso: '',
        data_nascimento: null,
        endereco: null,
        status: 'Ativo', // Status padrão
        celula_id: '', // Será preenchido por admin ou contexto do líder
    });
    const [celulasOptions, setCelulasOptions] = useState<CelulaOption[]>([]); // Para admins selecionarem a célula
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    
    // --- REFATORAÇÃO: TOASTS ---
    const { toasts, addToast, removeToast } = useToast();
    // --- FIM REFATORAÇÃO TOASTS ---

    const router = useRouter();

    useEffect(() => {
        const fetchDependencies = async () => {
            setLoading(true);
            try {
                // Tenta listar células para admin. Se não for admin, retornará vazio.
                const cells = await listarCelulasParaAdmin();
                setCelulasOptions(cells);

                // Se houver apenas uma célula (ou o líder tiver apenas sua própria célula por padrão), 
                // pré-selecionar o celula_id
                if (cells.length === 1) {
                    setFormData(prev => ({ ...prev, celula_id: cells[0].id }));
                }

                addToast('Listas de membros e células carregadas.', 'success', 3000);
            } catch (e: any) {
                console.error("Erro ao carregar dependências para novo membro:", e);
                addToast(e.message || 'Erro ao carregar dados iniciais', 'error');
                // Em caso de erro crítico, pode-se redirecionar
                // setTimeout(() => router.replace('/membros'), 3000); 
            } finally {
                setLoading(false);
            }
        };
        fetchDependencies();
    }, [addToast]); // Adicionar addToast às dependências

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ 
            ...prev, 
            [name]: name === 'telefone' ? normalizePhoneNumber(value) : (value === '' ? null : value) 
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        // Validações
        if (!formData.nome.trim()) {
            addToast('O campo "Nome Completo" é obrigatório.', 'error');
            setSubmitting(false);
            return;
        }
        if (!formData.data_ingresso.trim()) {
            addToast('O campo "Data de Ingresso" é obrigatório.', 'error');
            setSubmitting(false);
            return;
        }
        if (!formData.celula_id) {
            addToast('O campo "Célula" é obrigatório.', 'error');
            setSubmitting(false);
            return;
        }

        // --- CORREÇÃO: Formatar o objeto para a função adicionarMembro ---
        const newMembroDataForAction: Omit<Membro, 'id' | 'created_at' | 'celula_nome'> = {
            nome: formData.nome,
            telefone: formData.telefone,
            data_ingresso: formData.data_ingresso,
            data_nascimento: formData.data_nascimento,
            endereco: formData.endereco,
            status: formData.status,
            celula_id: formData.celula_id, // Incluir celula_id aqui
        };
        // --- FIM CORREÇÃO ---

        try {
            await adicionarMembro(newMembroDataForAction);

            addToast('Membro adicionado com sucesso!', 'success', 3000);
            setTimeout(() => {
                router.push('/membros');
            }, 2000);

        } catch (error: any) {
            console.error("Erro ao adicionar membro:", error);
            addToast(`Falha ao adicionar membro: ${error.message || "Erro desconhecido"}`, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <LoadingSpinner text="Carregando dados para novo membro..." fullScreen={true} />;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6 lg:px-8">
            {/* Container de Toasts global */}
            <div className="fixed top-4 right-4 z-50 w-80 space-y-2">
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

            <div className="max-w-md w-full mx-auto">
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200 p-6 sm:p-8">
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-extrabold text-gray-900 mb-2">
                            Novo Membro
                        </h2>
                        <p className="text-gray-600">Preencha os detalhes para adicionar um novo membro à célula.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="rounded-md shadow-sm -space-y-px">
                            {/* Nome Completo */}
                            <div>
                                <label htmlFor="nome" className="sr-only">Nome Completo</label>
                                <input
                                    id="nome"
                                    name="nome"
                                    type="text"
                                    required
                                    value={formData.nome}
                                    onChange={handleChange}
                                    className="appearance-none rounded-t-md relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    placeholder="Nome Completo"
                                />
                            </div>

                            {/* Telefone */}
                            <div>
                                <label htmlFor="telefone" className="sr-only">Telefone</label>
                                <input
                                    id="telefone"
                                    name="telefone"
                                    type="tel"
                                    value={formData.telefone || ''} // Handle null for input
                                    onChange={handleChange}
                                    className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    placeholder="Telefone (ex: 99 99999-9999)"
                                />
                            </div>

                            {/* Data de Ingresso */}
                            <div>
                                <label htmlFor="data_ingresso" className="sr-only">Data de Ingresso</label>
                                <input
                                    id="data_ingresso"
                                    name="data_ingresso"
                                    type="date"
                                    required
                                    value={formData.data_ingresso}
                                    onChange={handleChange}
                                    className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    placeholder="Data de Ingresso"
                                />
                            </div>

                            {/* Data de Nascimento */}
                            <div>
                                <label htmlFor="data_nascimento" className="sr-only">Data de Nascimento</label>
                                <input
                                    id="data_nascimento"
                                    name="data_nascimento"
                                    type="date"
                                    value={formData.data_nascimento || ''} // Handle null for input
                                    onChange={handleChange}
                                    className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    placeholder="Data de Nascimento"
                                />
                            </div>

                            {/* Endereço */}
                            <div>
                                <label htmlFor="endereco" className="sr-only">Endereço</label>
                                <input
                                    id="endereco"
                                    name="endereco"
                                    type="text"
                                    value={formData.endereco || ''} // Handle null for input
                                    onChange={handleChange}
                                    className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    placeholder="Endereço"
                                />
                            </div>

                            {/* Status */}
                            <div>
                                <label htmlFor="status" className="sr-only">Status</label>
                                <select
                                    id="status"
                                    name="status"
                                    required
                                    value={formData.status}
                                    onChange={handleChange}
                                    className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                >
                                    <option value="Ativo">Ativo</option>
                                    <option value="Inativo">Inativo</option>
                                    <option value="Em transição">Em transição</option>
                                </select>
                            </div>

                            {/* Seleção de Célula (apenas para admins) */}
                            {celulasOptions.length > 1 && ( // Mostra o seletor se houver mais de uma opção (sugere que é admin)
                                <div>
                                    <label htmlFor="celula_id" className="sr-only">Célula</label>
                                    <select
                                        id="celula_id"
                                        name="celula_id"
                                        required
                                        value={formData.celula_id}
                                        onChange={handleChange}
                                        className="appearance-none rounded-b-md relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    >
                                        <option value="">-- Selecione a Célula --</option>
                                        {celulasOptions.map(celula => (
                                            <option key={celula.id} value={celula.id}>{celula.nome}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={submitting || loading}
                                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submitting ? 'Adicionando...' : 'Adicionar Membro'}
                            </button>
                        </div>
                    </form>
                    <div className="text-sm text-center mt-4">
                        <Link href="/membros" className="font-medium text-indigo-600 hover:text-indigo-500">
                            Cancelar
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}