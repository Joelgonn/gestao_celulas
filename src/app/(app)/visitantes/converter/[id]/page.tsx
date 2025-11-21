// src/app/(app)/visitantes/converter/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
// Importa funções de data.ts
import {
    getVisitante,
    converterVisitanteEmMembro,
} from '@/lib/data';
// Importa interfaces de types.ts <--- CORREÇÃO AQUI
import {
    Visitante, // Importar Visitante para tipagem
    Membro,    // Importar Membro para tipagem de status
} from '@/lib/types';

import { normalizePhoneNumber, formatDateForInput } from '@/utils/formatters';

// --- REFATORAÇÃO: TOASTS ---
import useToast from '@/hooks/useToast';
import Toast from '@/components/ui/Toast';
import LoadingSpinner from '@/components/LoadingSpinner'; // Para o loading inicial
// --- FIM REFATORAÇÃO TOASTS ---

// --- CORREÇÃO: Interface MembroConversionFormData atualizada e correta ---
// Renomeada para evitar confusão com MembroFormData de reuniões,
// e omitindo 'id', 'created_at', 'celula_nome' (que não são passados no formulário)
interface MembroConversionFormData extends Omit<Membro, 'id' | 'created_at' | 'celula_nome'> {
    // 'celula_id' e 'status' agora fazem parte de Membro, mas vamos garantir que são preenchidos
    // e o `celula_id` é essencial.
}
// --- FIM CORREÇÃO ---

export default function ConverterVisitantePage() {
    const params = useParams();
    const visitanteId = params.id as string;
    
    const [formData, setFormData] = useState<MembroConversionFormData>({
        nome: '',
        telefone: null,
        data_ingresso: formatDateForInput(new Date().toISOString()), // Data padrão de ingresso
        data_nascimento: null,
        endereco: null,
        status: 'Ativo', // Status padrão para novo membro
        celula_id: '', // Será preenchido do visitante original
    });
    
    // --- REFATORAÇÃO: TOASTS ---
    const { toasts, addToast, removeToast } = useToast();
    // --- FIM REFATORAÇÃO TOASTS ---

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const fetchVisitanteData = async () => {
            setLoading(true);
            try {
                const data = await getVisitante(visitanteId);

                if (!data) {
                    addToast('O visitante solicitado não existe ou você não tem permissão para acessá-lo', 'error'); // Usando addToast do hook
                    setTimeout(() => router.replace('/visitantes'), 2000);
                    return;
                }

                setFormData({
                    nome: data.nome || '',
                    telefone: normalizePhoneNumber(data.telefone) || null,
                    data_ingresso: formatDateForInput(new Date().toISOString()), // Manter como data atual para o membro
                    data_nascimento: data.data_nascimento || null, // Usar a data de nascimento do visitante
                    endereco: data.endereco || null,
                    status: 'Ativo', // Status padrão para o novo membro
                    celula_id: data.celula_id, // Usar a celula_id do visitante original
                });

                addToast('Informações do visitante carregadas para conversão', 'success', 3000); // Usando addToast do hook

            } catch (e: any) {
                console.error("Erro ao buscar visitante para conversão:", e);
                addToast(e.message || 'Erro desconhecido ao carregar dados do visitante', 'error'); // Usando addToast do hook
                setTimeout(() => router.replace('/visitantes'), 2000);
            } finally {
                setLoading(false);
            }
        };

        if (visitanteId) {
            fetchVisitanteData();
        }
    }, [visitanteId, router, addToast]); // Adicionar addToast às dependências

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => { // Adicionar HTMLSelectElement
        const { name, value } = e.target;
        if (name === 'telefone') {
            setFormData(prev => ({ ...prev, [name]: normalizePhoneNumber(value) }));
        } else {
            // CORREÇÃO: Lidar com campos que podem ser nulos corretamente (string vazia vira null)
            setFormData(prev => ({ ...prev, [name]: value === '' ? null : value })); 
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        // Validações
        if (!formData.nome.trim()) {
            addToast('O campo "Nome Completo" é obrigatório', 'error'); // Usando addToast do hook
            setSubmitting(false);
            return;
        }
        if (!formData.data_ingresso) {
            addToast('O campo "Data de Ingresso" é obrigatório', 'error'); // Usando addToast do hook
            setSubmitting(false);
            return;
        }
        if (!formData.celula_id) { // Adicionar validação para celula_id
            addToast('O ID da célula não está disponível para conversão.', 'error');
            setSubmitting(false);
            return;
        }

        const normalizedPhone = normalizePhoneNumber(formData.telefone);
        if (normalizedPhone && (normalizedPhone.length < 10 || normalizedPhone.length > 11)) {
            addToast('O número de telefone deve ter 10 ou 11 dígitos (incluindo DDD).', 'error'); // Usando addToast do hook
            setSubmitting(false);
            return;
        }

        try {
            // Inverter a ordem dos argumentos e incluir celula_id e status
            const { success, message } = await converterVisitanteEmMembro(visitanteId, { // Primeiro o visitanteId
                nome: formData.nome,
                telefone: normalizedPhone || null,
                data_ingresso: formData.data_ingresso,
                data_nascimento: formData.data_nascimento || null,
                endereco: formData.endereco || null,
                status: formData.status, // Incluir status
                celula_id: formData.celula_id, // Incluir celula_id
            });
            // --- FIM CORREÇÃO ---

            if (success) {
                addToast('Visitante convertido em membro com sucesso!', 'success', 4000); // Usando addToast do hook

                // Redirecionar após mostrar o toast
                setTimeout(() => {
                    router.push('/membros');
                }, 2000);
            } else {
                addToast(message || 'Erro desconhecido ao converter visitante', 'error'); // Usando addToast do hook
            }
        } catch (e: any) {
            console.error("Erro na conversão de visitante:", e);
            addToast(e.message || 'Erro desconhecido durante a conversão', 'error'); // Usando addToast do hook
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <LoadingSpinner text="Carregando dados do visitante..." />; // Ajusta o fullScreen para false se o container já o gerencia
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

            {/* Conteúdo Principal */}
            <div className="max-w-2xl mx-auto">
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
                    {/* Header com Gradiente */}
                    <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-8">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                    </svg>
                                    Converter Visitante
                                </h1>
                                <p className="text-orange-100 mt-2">Transforme este visitante em um membro da célula</p>
                            </div>
                            <Link 
                                href="/visitantes"
                                className="inline-flex items-center px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all duration-200 backdrop-blur-sm border border-white/30"
                            >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                Voltar
                            </Link>
                        </div>
                    </div>

                    {/* Formulário */}
                    <div className="p-6 sm:p-8">
                        {loading ? (
                            <LoadingSpinner text="Carregando dados do visitante..." /> // Usar LoadingSpinner global
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Informações Básicas */}
                                <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                                    <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Informações do Visitante
                                    </h3>
                                    <p className="text-sm text-blue-700">
                                        Os dados abaixo foram preenchidos automaticamente a partir do cadastro do visitante. 
                                        Você pode ajustá-los conforme necessário para o cadastro como membro.
                                    </p>
                                </div>

                                {/* Campo Nome */}
                                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                    <label htmlFor="nome" className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                        <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                        Nome Completo *
                                    </label>
                                    <input 
                                        type="text" 
                                        id="nome" 
                                        name="nome" 
                                        value={formData.nome} 
                                        onChange={handleChange} 
                                        required 
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200"
                                        placeholder="Nome completo do novo membro"
                                    />
                                </div>

                                {/* Campo Telefone */}
                                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                    <label htmlFor="telefone" className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                        <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                        </svg>
                                        Telefone
                                    </label>
                                    <input 
                                        type="text" 
                                        id="telefone" 
                                        name="telefone" 
                                        value={formData.telefone || ''} 
                                        onChange={handleChange} 
                                        placeholder="(XX) XXXXX-XXXX" 
                                        maxLength={11} 
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200"
                                    />
                                </div>

                                {/* Endereço */}
                                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                    <label htmlFor="endereco" className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                        <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        Endereço
                                    </label>
                                    <input 
                                        type="text" 
                                        id="endereco" 
                                        name="endereco" 
                                        value={formData.endereco || ''} 
                                        onChange={handleChange} 
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200"
                                        placeholder="Endereço completo do novo membro"
                                    />
                                </div>

                                {/* Datas */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Data Ingresso */}
                                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                        <label htmlFor="data_ingresso" className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                            <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            Data de Ingresso *
                                        </label>
                                        <input 
                                            type="date" 
                                            id="data_ingresso" 
                                            name="data_ingresso" 
                                            value={formData.data_ingresso} 
                                            onChange={handleChange} 
                                            required 
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200"
                                        />
                                    </div>

                                    {/* Data Nascimento */}
                                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                        <label htmlFor="data_nascimento" className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                            <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            Data de Nascimento
                                        </label>
                                        <input 
                                            type="date" 
                                            id="data_nascimento" 
                                            name="data_nascimento" 
                                            value={formData.data_nascimento || ''} 
                                            onChange={handleChange} 
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200"
                                        />
                                    </div>
                                </div>

                                {/* Campo Status */}
                                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                    <label htmlFor="status" className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                        <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.279A8.958 8.958 0 0112 3a8.998 8.998 0 017.708 4.717m-1.956 0h.001M12 21a9 9 0 01-8.618-4.279m1.956 0h-.001" />
                                        </svg>
                                        Status *
                                    </label>
                                    <select 
                                        id="status" 
                                        name="status" 
                                        value={formData.status} 
                                        onChange={handleChange} 
                                        required 
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 bg-white"
                                    >
                                        <option value="Ativo">Ativo</option>
                                        <option value="Inativo">Inativo</option>
                                        <option value="Em transição">Em transição</option>
                                    </select>
                                </div>

                                {/* Botão Submit */}
                                <button 
                                    type="submit" 
                                    disabled={submitting}
                                    className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white py-4 px-6 rounded-xl font-semibold hover:from-orange-600 hover:to-amber-600 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 flex items-center justify-center gap-2"
                                >
                                    {submitting ? (
                                        <>
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                            Convertendo...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                            </svg>
                                            Converter em Membro
                                        </>
                                    )}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}