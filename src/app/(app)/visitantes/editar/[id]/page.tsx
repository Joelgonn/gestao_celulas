// src/app/(app)/visitantes/editar/[id]/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { getVisitante, atualizarVisitante } from '@/lib/data';
import { VisitanteEditFormData } from '@/lib/types';
import { normalizePhoneNumber, formatDateForInput } from '@/utils/formatters';
import useToast from '@/hooks/useToast';
import LoadingSpinner from '@/components/LoadingSpinner';

import { 
    FaUser, 
    FaPhone, 
    FaCalendarAlt, 
    FaMapMarkerAlt, 
    FaComment, 
    FaClock, 
    FaSave, 
    FaArrowLeft,
    FaUserEdit
} from 'react-icons/fa';

export default function EditVisitantePage() {
    const params = useParams();
    const visitanteId = params.id as string;
    
    const [formData, setFormData] = useState<VisitanteEditFormData>({
        nome: '',
        telefone: null,
        data_primeira_visita: '',
        data_nascimento: null, 
        endereco: null,
        data_ultimo_contato: null,
        observacoes: null,
        status_conversao: 'Em Contato',
    });
    
    const { addToast, ToastContainer } = useToast();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const fetchVisitante = async () => {
            setLoading(true);
            try {
                const data = await getVisitante(visitanteId); 

                if (!data) {
                    addToast('Visitante não encontrado.', 'error');
                    setTimeout(() => router.replace('/visitantes'), 2000);
                    return;
                }

                setFormData({
                    nome: data.nome || '',
                    telefone: normalizePhoneNumber(data.telefone) || null,
                    data_primeira_visita: formatDateForInput(data.data_primeira_visita),
                    data_nascimento: data.data_nascimento ? formatDateForInput(data.data_nascimento) : null,
                    endereco: data.endereco || null,
                    data_ultimo_contato: data.data_ultimo_contato ? formatDateForInput(data.data_ultimo_contato) : null,
                    observacoes: data.observacoes || null,
                    status_conversao: data.status_conversao || 'Em Contato',
                });

            } catch (e: any) {
                console.error("Erro fetch:", e);
                addToast('Erro ao carregar dados', 'error');
            } finally {
                setLoading(false);
            }
        };

        if (visitanteId) {
            fetchVisitante();
        }
    }, [visitanteId, router, addToast]); 

    // Otimização com useCallback
    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (name === 'telefone') {
            setFormData(prev => ({ ...prev, [name]: normalizePhoneNumber(value) }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value === '' ? null : value })); 
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        if (!formData.nome.trim()) {
            addToast('Nome é obrigatório', 'error');
            setSubmitting(false);
            return;
        }

        const normalizedPhone = normalizePhoneNumber(formData.telefone);
        if (normalizedPhone && (normalizedPhone.length < 10 || normalizedPhone.length > 11)) {
            addToast('Telefone inválido', 'error');
            setSubmitting(false);
            return;
        }

        try {
            await atualizarVisitante({
                ...formData,
                telefone: normalizedPhone || null,
            }, visitanteId);

            addToast('Visitante atualizado!', 'success', 3000);
            setTimeout(() => router.push('/visitantes'), 1500);

        } catch (e: any) {
            console.error("Erro update:", e);
            addToast('Erro ao atualizar', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-12 sm:py-8 px-2 sm:px-6 lg:px-8">
            <ToastContainer />

            <div className="max-w-2xl mx-auto mt-4 sm:mt-0">
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                    
                    {/* Header Responsivo */}
                    <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-6 sm:px-6 sm:py-8">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2 sm:gap-3">
                                    <FaUserEdit className="w-6 h-6 sm:w-8 sm:h-8" />
                                    Editar Visitante
                                </h1>
                                <p className="text-purple-100 mt-1 text-sm sm:text-base">
                                    Atualize as informações do visitante
                                </p>
                            </div>
                            <Link
                                href="/visitantes"
                                className="inline-flex justify-center items-center px-4 py-3 sm:py-2 bg-white/20 hover:bg-white/30 active:bg-white/40 text-white rounded-lg transition-colors backdrop-blur-sm border border-white/30 text-sm font-medium w-full sm:w-auto"
                            >
                                <FaArrowLeft className="w-3 h-3 mr-2" />
                                Voltar
                            </Link>
                        </div>
                    </div>

                    {/* Formulário */}
                    <div className="p-4 sm:p-8">
                        <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
                            
                            {/* Nome */}
                            <div className="space-y-1">
                                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                    <FaUser className="text-purple-500" /> Nome Completo *
                                </label>
                                <input
                                    type="text"
                                    name="nome"
                                    value={formData.nome}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-3 text-base bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all placeholder:text-gray-400"
                                    placeholder="Nome do visitante"
                                />
                            </div>

                            {/* Telefone */}
                            <div className="space-y-1">
                                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                    <FaPhone className="text-purple-500" /> Telefone
                                </label>
                                <input
                                    type="tel"
                                    name="telefone"
                                    value={formData.telefone || ''}
                                    onChange={handleChange}
                                    placeholder="(XX) XXXXX-XXXX"
                                    maxLength={11}
                                    className="w-full px-4 py-3 text-base bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all placeholder:text-gray-400"
                                />
                            </div>

                            {/* Endereço */}
                            <div className="space-y-1">
                                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                    <FaMapMarkerAlt className="text-purple-500" /> Endereço
                                </label>
                                <input
                                    type="text"
                                    name="endereco"
                                    value={formData.endereco || ''}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 text-base bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all placeholder:text-gray-400"
                                    placeholder="Endereço completo"
                                />
                            </div>

                            {/* Datas */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                <div className="space-y-1">
                                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                        <FaCalendarAlt className="text-purple-500" /> Data 1ª Visita *
                                    </label>
                                    <input
                                        type="date"
                                        name="data_primeira_visita"
                                        value={formData.data_primeira_visita}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-3 text-base bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                        <FaCalendarAlt className="text-purple-500" /> Data Nascimento
                                    </label>
                                    <input
                                        type="date"
                                        name="data_nascimento"
                                        value={formData.data_nascimento || ''}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 text-base bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            {/* Último Contato */}
                            <div className="space-y-1">
                                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                    <FaClock className="text-purple-500" /> Data Último Contato
                                </label>
                                <input
                                    type="date"
                                    name="data_ultimo_contato"
                                    value={formData.data_ultimo_contato || ''}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 text-base bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                                />
                            </div>

                            {/* Observações */}
                            <div className="space-y-1">
                                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                    <FaComment className="text-purple-500" /> Observações
                                </label>
                                <textarea
                                    name="observacoes"
                                    value={formData.observacoes || ''}
                                    onChange={handleChange}
                                    rows={4}
                                    className="w-full px-4 py-3 text-base bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all resize-none placeholder:text-gray-400"
                                    placeholder="Anotações sobre o visitante..."
                                />
                            </div>

                            {/* Botão Submit */}
                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 px-6 rounded-xl font-bold hover:from-purple-700 hover:to-pink-700 disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2 text-lg"
                            >
                                {submitting ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Atualizando...
                                    </>
                                ) : (
                                    <>
                                        <FaSave /> Salvar Alterações
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}