// src/app/(app)/visitantes/editar/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
    getVisitante,
    atualizarVisitante,
    Visitante
} from '@/lib/data';
import { normalizePhoneNumber, formatDateForInput } from '@/utils/formatters';

// --- REFATORAÇÃO: TOASTS ---
import useToast from '@/hooks/useToast';
import Toast from '@/components/ui/Toast';
import LoadingSpinner from '@/components/ui/LoadingSpinner'; // Para o loading inicial
// --- FIM REFATORAÇÃO TOASTS ---

// --- CORREÇÃO: Adicionar data_nascimento à interface VisitanteFormData ---
interface VisitanteFormData {
    nome: string;
    telefone: string | null; // Pode ser null
    data_primeira_visita: string;
    data_nascimento: string | null; // Adicionado: data de nascimento
    endereco: string | null; // Pode ser null
    data_ultimo_contato: string | null; // Pode ser null
    observacoes: string | null; // Pode ser null
}
// --- FIM CORREÇÃO ---

export default function EditVisitantePage() {
    const params = useParams();
    const visitanteId = params.id as string;
    
    const [formData, setFormData] = useState<VisitanteFormData>({
        nome: '',
        telefone: null,
        data_primeira_visita: '',
        data_nascimento: null, // Inicializar
        endereco: null,
        data_ultimo_contato: null,
        observacoes: null
    });
    
    // --- REFATORAÇÃO: TOASTS ---
    const { toasts, addToast, removeToast } = useToast();
    // --- FIM REFATORAÇÃO TOASTS ---

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const fetchVisitante = async () => {
            setLoading(true);
            try {
                // CORREÇÃO: getVisitante agora retorna com data_nascimento
                const data = await getVisitante(visitanteId); 

                if (!data) {
                    addToast('O visitante solicitado não existe ou você não tem permissão para acessá-lo', 'error');
                    setLoading(false);
                    setTimeout(() => router.replace('/visitantes'), 2000);
                    return;
                }

                setFormData({
                    nome: data.nome || '',
                    telefone: normalizePhoneNumber(data.telefone) || null,
                    data_primeira_visita: formatDateForInput(data.data_primeira_visita),
                    data_nascimento: data.data_nascimento ? formatDateForInput(data.data_nascimento) : null, // Preencher data_nascimento
                    endereco: data.endereco || null,
                    data_ultimo_contato: data.data_ultimo_contato ? formatDateForInput(data.data_ultimo_contato) : null,
                    observacoes: data.observacoes || null
                });

                addToast('Informações do visitante carregadas com sucesso', 'success', 3000);

            } catch (e: any) {
                console.error("Erro ao buscar visitante:", e);
                addToast(e.message || 'Erro desconhecido ao carregar dados do visitante', 'error');
            } finally {
                setLoading(false);
            }
        };

        if (visitanteId) {
            fetchVisitante();
        }
    }, [visitanteId, router, addToast]); // Adicionar addToast às dependências

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (name === 'telefone') {
            setFormData(prev => ({ ...prev, [name]: normalizePhoneNumber(value) }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value === '' ? null : value })); // Lidar com campos que podem ser nulos
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        // Validações
        if (!formData.nome.trim()) {
            addToast('O campo "Nome Completo" é obrigatório', 'error');
            setSubmitting(false);
            return;
        }

        const normalizedPhone = normalizePhoneNumber(formData.telefone);
        if (normalizedPhone && (normalizedPhone.length < 10 || normalizedPhone.length > 11)) {
            addToast('O número de telefone deve ter 10 ou 11 dígitos (incluindo DDD)', 'error');
            setSubmitting(false);
            return;
        }

        try {
            await atualizarVisitante({
                nome: formData.nome,
                telefone: normalizedPhone || null,
                data_primeira_visita: formData.data_primeira_visita,
                data_nascimento: formData.data_nascimento, // Incluir data_nascimento
                endereco: formData.endereco || null,
                data_ultimo_contato: formData.data_ultimo_contato || null,
                observacoes: formData.observacoes || null,
            }, visitanteId);

            addToast('Visitante atualizado com sucesso', 'success', 3000);

            // Redirecionar após mostrar o toast
            setTimeout(() => {
                router.push('/visitantes');
            }, 2000);

        } catch (e: any) {
            console.error("Erro ao atualizar visitante:", e);
            addToast(e.message || 'Erro desconhecido ao atualizar visitante', 'error');
        } finally {
            setSubmitting(false);
        }
    };

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
                    <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-8">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    Editar Visitante
                                </h1>
                                <p className="text-purple-100 mt-2">Atualize as informações do visitante</p>
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
                            <LoadingSpinner text="Carregando dados do visitante..." />
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Campo Nome */}
                                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                    <label htmlFor="nome" className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                        <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                                        placeholder="Digite o nome completo"
                                    />
                                </div>

                                {/* Campo Telefone */}
                                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                    <label htmlFor="telefone" className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                        <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                                    />
                                </div>

                                {/* Endereço */}
                                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                    <label htmlFor="endereco" className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                        <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                                        placeholder="Digite o endereço completo"
                                    />
                                </div>

                                {/* Datas */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Data Primeira Visita */}
                                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                        <label htmlFor="data_primeira_visita" className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                            <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            Data da 1ª Visita *
                                        </label>
                                        <input 
                                            type="date" 
                                            id="data_primeira_visita" 
                                            name="data_primeira_visita" 
                                            value={formData.data_primeira_visita} 
                                            onChange={handleChange} 
                                            required 
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                                        />
                                    </div>

                                    {/* Data de Nascimento */}
                                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                        <label htmlFor="data_nascimento" className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                            <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            Data de Nascimento
                                        </label>
                                        <input 
                                            type="date" 
                                            id="data_nascimento" 
                                            name="data_nascimento" 
                                            value={formData.data_nascimento || ''} // Handle null
                                            onChange={handleChange} 
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                                        />
                                    </div>
                                </div>

                                {/* Data Último Contato */}
                                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                    <label htmlFor="data_ultimo_contato" className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                        <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        Data Último Contato
                                    </label>
                                    <input 
                                        type="date" 
                                        id="data_ultimo_contato" 
                                        name="data_ultimo_contato" 
                                        value={formData.data_ultimo_contato || ''} // Handle null
                                        onChange={handleChange} 
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                                    />
                                </div>

                                {/* Observações */}
                                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                    <label htmlFor="observacoes" className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                        <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        Observações
                                    </label>
                                    <textarea
                                        id="observacoes"
                                        name="observacoes"
                                        value={formData.observacoes || ''} // Handle null
                                        onChange={handleChange}
                                        rows={4}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 resize-none"
                                        placeholder="Adicione observações sobre o visitante..."
                                    />
                                </div>

                                {/* Botão Submit */}
                                <button 
                                    type="submit" 
                                    disabled={submitting}
                                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 px-6 rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 flex items-center justify-center gap-2"
                                >
                                    {submitting ? (
                                        <>
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                            Atualizando...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            Atualizar Visitante
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