// src/app/(app)/visitantes/converter/[id]/page.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { getVisitante, converterVisitanteEmMembro } from '@/lib/data';
import { Visitante, Membro } from '@/lib/types';
import { normalizePhoneNumber, formatDateForInput } from '@/utils/formatters';
import useToast from '@/hooks/useToast';
import LoadingSpinner from '@/components/LoadingSpinner';

import {
    FaUserPlus,
    FaPhone,
    FaMapMarkerAlt,
    FaCalendarAlt,
    FaUserTag,
    FaArrowLeft,
    FaCheckCircle,
    FaInfoCircle,
    FaChevronDown,
    FaTimes
} from 'react-icons/fa';

// --- COMPONENTE CUSTOMIZADO DE SELEÇÃO (BOTTOM SHEET) ---
interface CustomSelectSheetProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: { id: string; nome: string }[];
    icon: React.ReactNode;
}

const CustomSelectSheet = ({ label, value, onChange, options, icon }: CustomSelectSheetProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);

    const selectedName = options.find(o => o.id === value)?.nome || value;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = 'unset';
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    return (
        <div className="space-y-1">
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                {icon} {label}
            </label>
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg flex items-center justify-between focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow outline-none text-left"
            >
                <span className="text-base text-gray-900">{selectedName}</span>
                <FaChevronDown className="text-gray-400 text-xs ml-2" />
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
                    <div 
                        ref={modalRef}
                        className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[600px] animate-in slide-in-from-bottom duration-300"
                    >
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50 rounded-t-2xl">
                            <h3 className="font-bold text-gray-800 text-lg">{label}</h3>
                            <button onClick={() => setIsOpen(false)} className="p-2 bg-gray-200 rounded-full text-gray-600 hover:bg-gray-300 transition-colors">
                                <FaTimes />
                            </button>
                        </div>
                        <div className="overflow-y-auto p-2 space-y-1 flex-1">
                            {options.map((option) => {
                                const isSelected = value === option.id;
                                return (
                                    <button
                                        key={option.id}
                                        type="button"
                                        onClick={() => { onChange(option.id); setIsOpen(false); }}
                                        className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-colors ${isSelected ? 'bg-orange-50 text-orange-700 font-bold' : 'text-gray-700 hover:bg-gray-50'}`}
                                    >
                                        <span className="text-base">{option.nome}</span>
                                        {isSelected && <FaCheckCircle className="text-orange-500 text-lg" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
// --- FIM COMPONENTE CUSTOMIZADO ---


interface MembroConversionFormData {
    nome: string;
    telefone: string | null;
    data_ingresso: string;
    data_nascimento: string | null;
    endereco: string | null;
    status: Membro['status'];
    celula_id: string;
}

export default function ConverterVisitantePage() {
    const params = useParams();
    const visitanteId = params.id as string;

    const [formData, setFormData] = useState<MembroConversionFormData>({
        nome: '',
        telefone: null,
        data_ingresso: formatDateForInput(new Date().toISOString()),
        data_nascimento: null,
        endereco: null,
        status: 'Ativo',
        celula_id: '',
    });

    const { addToast, ToastContainer } = useToast();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const fetchVisitanteData = async () => {
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
                    data_ingresso: formatDateForInput(new Date().toISOString()),
                    data_nascimento: data.data_nascimento || null,
                    endereco: data.endereco || null,
                    status: 'Ativo',
                    celula_id: data.celula_id,
                });

                // addToast('Dados carregados.', 'success');
            } catch (e: any) {
                console.error("Erro fetch:", e);
                addToast('Erro ao carregar visitante', 'error');
                setTimeout(() => router.replace('/visitantes'), 2000);
            } finally {
                setLoading(false);
            }
        };

        if (visitanteId) {
            fetchVisitanteData();
        }
    }, [visitanteId, router, addToast]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'telefone' ? normalizePhoneNumber(value) : (value === '' ? null : value)
        }));
    }, []);

    const handleSelectChange = useCallback((name: string, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        if (!formData.nome.trim()) {
            addToast('Nome é obrigatório', 'error');
            setSubmitting(false);
            return;
        }
        if (!formData.data_ingresso) {
            addToast('Data de ingresso é obrigatória', 'error');
            setSubmitting(false);
            return;
        }
        if (!formData.celula_id) {
            addToast('Célula não identificada.', 'error');
            setSubmitting(false);
            return;
        }

        try {
            const { success, message } = await converterVisitanteEmMembro(visitanteId, {
                ...formData,
                telefone: normalizePhoneNumber(formData.telefone) || null,
            });

            if (success) {
                addToast('Visitante convertido com sucesso!', 'success', 4000);
                setTimeout(() => router.push('/membros'), 2000);
            } else {
                addToast(message || 'Erro na conversão', 'error');
            }
        } catch (e: any) {
            console.error("Erro submit:", e);
            addToast('Erro inesperado', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const statusOptions = [
        { id: 'Ativo', nome: 'Ativo' },
        { id: 'Inativo', nome: 'Inativo' },
        { id: 'Em transição', nome: 'Em transição' },
    ];

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <LoadingSpinner />
                <p className="mt-4 text-gray-500 font-medium animate-pulse">Carregando dados...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-12 sm:py-8 px-2 sm:px-6 lg:px-8">
            <ToastContainer />

            <div className="max-w-2xl mx-auto mt-4 sm:mt-0">
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                    
                    {/* Header Responsivo */}
                    <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-6 sm:px-6 sm:py-8">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2 sm:gap-3">
                                    <FaUserPlus className="w-6 h-6 sm:w-8 sm:h-8" />
                                    Converter Visitante
                                </h1>
                                <p className="text-orange-100 mt-1 text-sm sm:text-base">
                                    Transforme este visitante em membro
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
                            
                            {/* Info Box */}
                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 sm:p-5">
                                <h3 className="text-blue-800 font-bold flex items-center gap-2 mb-2 text-sm sm:text-base">
                                    <FaInfoCircle /> Revisão de Dados
                                </h3>
                                <p className="text-blue-700 text-xs sm:text-sm">
                                    Confirme os dados abaixo para efetivar o cadastro como membro.
                                </p>
                            </div>

                            {/* Nome */}
                            <div className="space-y-1">
                                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                    <FaUserPlus className="text-orange-500" /> Nome Completo *
                                </label>
                                <input
                                    type="text"
                                    name="nome"
                                    value={formData.nome}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-3 text-base bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                                />
                            </div>

                            {/* Telefone */}
                            <div className="space-y-1">
                                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                    <FaPhone className="text-orange-500" /> Telefone
                                </label>
                                <input
                                    type="tel"
                                    name="telefone"
                                    value={formData.telefone || ''}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 text-base bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                                    placeholder="(XX) XXXXX-XXXX"
                                />
                            </div>

                            {/* Endereço */}
                            <div className="space-y-1">
                                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                    <FaMapMarkerAlt className="text-orange-500" /> Endereço
                                </label>
                                <input
                                    type="text"
                                    name="endereco"
                                    value={formData.endereco || ''}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 text-base bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                                />
                            </div>

                            {/* Datas */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                <div className="space-y-1">
                                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                        <FaCalendarAlt className="text-orange-500" /> Data Ingresso *
                                    </label>
                                    <input
                                        type="date"
                                        name="data_ingresso"
                                        value={formData.data_ingresso}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-3 text-base bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                        <FaCalendarAlt className="text-orange-500" /> Data Nascimento
                                    </label>
                                    <input
                                        type="date"
                                        name="data_nascimento"
                                        value={formData.data_nascimento || ''}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 text-base bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            {/* Status - Select Customizado */}
                            <CustomSelectSheet
                                label="Status *"
                                icon={<FaUserTag className="text-orange-500" />}
                                value={formData.status}
                                onChange={(val) => handleSelectChange('status', val)}
                                options={statusOptions}
                            />

                            {/* Botão Submit */}
                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white py-4 px-6 rounded-xl font-bold hover:from-orange-600 hover:to-amber-600 disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2 text-lg"
                            >
                                {submitting ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Convertendo...
                                    </>
                                ) : (
                                    <>
                                        <FaCheckCircle /> Confirmar Conversão
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