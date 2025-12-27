// src/app/(app)/admin/eventos-face-a-face/novo/page.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    criarEventoFaceAFace,
} from '@/lib/data';
import {
    EventoFaceAFaceFormData,
    EventoFaceAFaceTipo,
} from '@/lib/types';
import { formatDateForInput } from '@/utils/formatters';
import useToast from '@/hooks/useToast';
import LoadingSpinner from '@/components/LoadingSpinner';

import {
    FaPlus,
    FaArrowLeft,
    FaCalendarAlt,
    FaMoneyBillWave,
    FaMapMarkerAlt,
    FaInfoCircle,
    FaUsers,
    FaSave,
    FaChevronDown, // <-- Adicionado para o CustomSelectSheet
    FaCheckCircle, // <-- Adicionado para o CustomSelectSheet
    FaTimes,       // <-- Adicionado para o CustomSelectSheet e InputField
    FaCalendarCheck, // <-- ÍCONE IMPORTADO AQUI!
    FaSearch
} from 'react-icons/fa';

// --- Reutiliza CustomSelectSheet (assumindo que está em components/ui/CustomSelectSheet.tsx ou similar) ---
// Se não estiver, cole o CustomSelectSheet aqui ou ajuste o import.
interface CustomSelectSheetProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: { id: string; nome: string }[];
    icon: React.ReactNode;
    placeholder?: string;
    searchable?: boolean;
    required?: boolean;
    error?: string | null;
}

const CustomSelectSheet = ({ 
    label, 
    value, 
    onChange, 
    options, 
    icon, 
    placeholder = "Selecione...",
    searchable = false,
    required = false,
    error
}: CustomSelectSheetProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const modalRef = useRef<HTMLDivElement>(null);

    const selectedName = options.find(o => o.id === value)?.nome || null;

    const filteredOptions = options.filter(option => 
        option.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
            <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                {icon} {label} {required && <span className="text-red-500">*</span>}
            </label>
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className={`w-full pl-3 pr-3 py-3 border rounded-xl flex items-center justify-between focus:outline-none focus:ring-2 transition-all duration-200 bg-white ${
                    error
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50'
                        : 'border-gray-300 focus:ring-orange-500 focus:border-orange-500'
                }`}
            >
                <span className={`text-base truncate ${selectedName ? 'text-gray-900' : 'text-gray-400'}`}>
                    {selectedName || placeholder}
                </span>
                <FaChevronDown className="text-gray-400 text-xs ml-2" />
            </button>
            {error && (
                <p className="text-red-600 text-sm flex items-center space-x-1">
                    <FaTimes className="w-3 h-3" />
                    <span>{error}</span>
                </p>
            )}

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

                        {searchable && (
                            <div className="p-4 border-b border-gray-100 bg-white sticky top-0 z-10">
                                <div className="relative">
                                    <FaSearch className="absolute left-3 top-3.5 text-gray-400" />
                                    <input 
                                        type="text" 
                                        placeholder="Buscar..." 
                                        autoFocus
                                        className="w-full pl-10 pr-4 py-3 bg-gray-100 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all text-base"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="overflow-y-auto p-2 space-y-1 flex-1">
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map((option) => {
                                    const isSelected = value === option.id;
                                    return (
                                        <button
                                            key={option.id}
                                            type="button"
                                            onClick={() => { onChange(option.id); setIsOpen(false); setSearchTerm(''); }}
                                            className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-colors ${isSelected ? 'bg-orange-50 text-orange-700 font-bold' : 'text-gray-700 hover:bg-gray-50'}`}
                                        >
                                            <span className="text-base">{option.nome}</span>
                                            {isSelected && <FaCheckCircle className="text-orange-500 text-lg" />}
                                        </button>
                                    );
                                })
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    Nenhum item encontrado.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
// --- FIM CustomSelectSheet ---


// --- InputField reutilizável (copiado e adaptado da página de novo visitante) ---
interface InputFieldProps {
    label: string;
    name: keyof EventoFaceAFaceFormData;
    value: string | number | null; // Pode ser string ou number
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    onBlur?: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    error?: string | null;
    type?: string;
    required?: boolean;
    icon?: any;
    placeholder?: string;
    maxLength?: number;
    rows?: number;
}

const InputField = ({ label, name, value, onChange, onBlur, error, type = 'text', required = false, icon: Icon, placeholder, maxLength, rows }: InputFieldProps) => {
    const isTextarea = type === 'textarea';

    return (
        <div className="space-y-1">
            <label htmlFor={name} className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                {Icon && <Icon className={error ? "text-red-500" : "text-orange-500"} />} 
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <div className="relative">
                {isTextarea ? (
                    <textarea
                        id={name}
                        name={name}
                        value={(value as string) || ''}
                        onChange={onChange}
                        onBlur={onBlur}
                        rows={rows}
                        placeholder={placeholder}
                        className={`w-full px-4 py-3 text-base border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 resize-none ${
                            error ? 'border-red-300 focus:ring-red-500 bg-red-50' : 'border-gray-300 focus:ring-orange-500'
                        }`}
                    />
                ) : (
                    <input
                        type={type}
                        id={name}
                        name={name}
                        value={(value || '').toString()} // Garante que number seja string para o input
                        onChange={onChange}
                        onBlur={onBlur}
                        required={required}
                        placeholder={placeholder}
                        maxLength={maxLength}
                        className={`w-full px-4 py-3 text-base border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 ${
                            error ? 'border-red-300 focus:ring-red-500 bg-red-50' : 'border-gray-300 focus:ring-orange-500'
                        }`}
                    />
                )}
            </div>
            {error && (
                <p className="text-red-600 text-sm flex items-center space-x-1">
                    <FaTimes className="w-3 h-3" /> <span>{error}</span>
                </p>
            )}
        </div>
    );
};
// --- FIM InputField ---

export default function NovoEventoFaceAFacePage() {
    const [formData, setFormData] = useState<EventoFaceAFaceFormData>({
        nome_evento: '',
        tipo: 'Mulheres', // Default
        data_inicio: formatDateForInput(new Date().toISOString()),
        data_fim: formatDateForInput(new Date().toISOString()),
        data_pre_encontro: null,
        local_evento: '',
        valor_total: 0,
        valor_entrada: 0,
        data_limite_entrada: formatDateForInput(new Date().toISOString()),
        informacoes_adicionais: null,
        chave_pix_admin: null,
        ativa_para_inscricao: false, // Por padrão, desativado na criação
    });

    const [submitting, setSubmitting] = useState(false);
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    const router = useRouter();
    const { addToast, ToastContainer } = useToast();

    // Opções para o seletor de Tipo de Evento
    const tipoEventoOptions: { id: EventoFaceAFaceTipo; nome: string }[] = [
        { id: 'Mulheres', nome: 'Mulheres' },
        { id: 'Homens', nome: 'Homens' },
    ];

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? parseFloat(value) : (value === '' ? null : value)
        }));
        if (!touched[name]) setTouched(prev => ({ ...prev, [name]: true }));
    }, [touched]);

    const handleSelectChange = useCallback((name: string, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value as EventoFaceAFaceTipo }));
        if (!touched[name]) setTouched(prev => ({ ...prev, [name]: true }));
    }, [touched]);

    const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name } = e.target;
        if (!touched[name]) setTouched(prev => ({ ...prev, [name]: true }));
    }, [touched]);

    const getFieldError = (fieldName: keyof EventoFaceAFaceFormData): string | null => {
        if (!touched[fieldName]) return null;
        const value = formData[fieldName];

        switch (fieldName) {
            case 'nome_evento': return !value || !(value as string).trim() ? 'Nome do evento é obrigatório.' : null;
            case 'tipo': return !value ? 'Tipo do evento é obrigatório.' : null;
            case 'data_inicio': return !value ? 'Data de início é obrigatória.' : null;
            case 'data_fim': return !value ? 'Data de fim é obrigatória.' : null;
            case 'local_evento': return !value || !(value as string).trim() ? 'Local do evento é obrigatório.' : null;
            case 'valor_total': return value === null || (value as number) <= 0 ? 'Valor total deve ser maior que zero.' : null;
            case 'valor_entrada': return value === null || (value as number) <= 0 ? 'Valor de entrada deve ser maior que zero.' : null;
            case 'data_limite_entrada': return !value ? 'Data limite da entrada é obrigatória.' : null;
            case 'data_pre_encontro':
                if (value && formData.data_inicio && new Date(value as string) >= new Date(formData.data_inicio)) {
                    return 'Pré-encontro deve ser antes da data de início do evento.';
                }
                return null;
            case 'data_fim':
                if (value && formData.data_inicio && new Date(value as string) < new Date(formData.data_inicio)) {
                    return 'Data de fim deve ser igual ou depois da data de início.';
                }
                return null;
            default: return null;
        }
    };

    const hasErrors = useCallback((): boolean => {
        // Validações obrigatórias
        if (!formData.nome_evento.trim()) return true;
        if (!formData.tipo) return true;
        if (!formData.data_inicio) return true;
        if (!formData.data_fim) return true;
        if (!formData.local_evento.trim()) return true;
        if (formData.valor_total === null || formData.valor_total <= 0) return true;
        if (formData.valor_entrada === null || formData.valor_entrada <= 0) return true;
        if (!formData.data_limite_entrada) return true;

        // Validações de data
        if (formData.data_fim && formData.data_inicio && new Date(formData.data_fim) < new Date(formData.data_inicio)) return true;
        if (formData.data_pre_encontro && formData.data_inicio && new Date(formData.data_pre_encontro) >= new Date(formData.data_inicio)) return true;
        
        return false;
    }, [formData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Marcar todos os campos como "touched" para exibir todos os erros
        const allTouched = Object.keys(formData).reduce((acc, key) => {
            acc[key as keyof EventoFaceAFaceFormData] = true;
            return acc;
        }, {} as Record<string, boolean>);
        setTouched(allTouched);

        if (hasErrors()) {
            addToast('Por favor, corrija os erros no formulário.', 'error');
            return;
        }

        setSubmitting(true);
        try {
            const eventoId = await criarEventoFaceAFace(formData);
            addToast('Evento criado com sucesso! Lembre-se de ativá-lo para que as inscrições apareçam para os líderes.', 'success', 5000);
            setTimeout(() => {
                router.push(`/admin/eventos-face-a-face/editar/${eventoId}`); // Redireciona para a edição para ativar
            }, 1500);
        } catch (e: any) {
            console.error("Erro ao criar evento:", e);
            addToast(`Falha ao criar evento: ${e.message}`, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-12 sm:py-8 px-2 sm:px-6 lg:px-8">
            <ToastContainer />

            <div className="max-w-4xl mx-auto mt-4 sm:mt-0">
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                    
                    {/* Header Responsivo */}
                    <div className="bg-gradient-to-r from-orange-600 to-amber-600 px-4 py-6 sm:px-6 sm:py-8">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2 sm:gap-3">
                                    <FaPlus className="w-6 h-6 sm:w-8 sm:h-8" />
                                    Nova Edição Face a Face
                                </h1>
                                <p className="text-orange-100 mt-1 text-sm sm:text-base">
                                    Crie uma nova edição do evento (Mulheres/Homens)
                                </p>
                            </div>
                            
                            <Link
                                href="/admin/eventos-face-a-face"
                                className="inline-flex justify-center items-center px-4 py-3 sm:py-2 bg-white/20 hover:bg-white/30 active:bg-white/40 text-white rounded-lg transition-colors backdrop-blur-sm border border-white/30 text-sm font-medium w-full sm:w-auto"
                            >
                                <FaArrowLeft className="w-3 h-3 mr-2" />
                                <span>Voltar</span>
                            </Link>
                        </div>
                    </div>

                    {/* Formulário */}
                    <div className="p-4 sm:p-8">
                        <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
                            
                            {/* Nome e Tipo do Evento */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                <InputField
                                    label="Nome do Evento"
                                    name="nome_evento"
                                    value={formData.nome_evento}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    error={getFieldError('nome_evento')}
                                    required
                                    icon={FaCalendarCheck} // Usando FaCalendarCheck
                                    placeholder="Ex: Encontro de Mulheres Face a Face 2025"
                                />
                                <CustomSelectSheet
                                    label="Tipo do Evento"
                                    icon={<FaUsers />}
                                    value={formData.tipo}
                                    onChange={(val) => handleSelectChange('tipo', val)}
                                    options={tipoEventoOptions.map(t => ({ id: t.id, nome: t.nome }))}
                                    required
                                    placeholder="Selecione o tipo (Mulheres/Homens)"
                                    error={getFieldError('tipo')}
                                />
                            </div>

                            {/* Datas do Evento */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                <InputField
                                    label="Data de Início"
                                    name="data_inicio"
                                    value={formData.data_inicio}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    error={getFieldError('data_inicio')}
                                    type="date"
                                    required
                                    icon={FaCalendarAlt}
                                />
                                <InputField
                                    label="Data de Fim"
                                    name="data_fim"
                                    value={formData.data_fim}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    error={getFieldError('data_fim')}
                                    type="date"
                                    required
                                    icon={FaCalendarAlt}
                                />
                            </div>
                            
                            {/* Pré-Encontro e Local */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                <InputField
                                    label="Data do Pré-Encontro (Opcional)"
                                    name="data_pre_encontro"
                                    value={formData.data_pre_encontro}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    error={getFieldError('data_pre_encontro')}
                                    type="date"
                                    icon={FaCalendarAlt}
                                />
                                <InputField
                                    label="Local do Evento"
                                    name="local_evento"
                                    value={formData.local_evento}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    error={getFieldError('local_evento')}
                                    required
                                    icon={FaMapMarkerAlt}
                                    placeholder="Ex: Igreja Batista Apascentar"
                                />
                            </div>

                            {/* Valores e Data Limite Entrada */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                <InputField
                                    label="Valor Total"
                                    name="valor_total"
                                    value={formData.valor_total}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    error={getFieldError('valor_total')}
                                    type="number"
                                    required
                                    icon={FaMoneyBillWave}
                                    placeholder="Ex: 350.00"
                                />
                                <InputField
                                    label="Valor da Entrada"
                                    name="valor_entrada"
                                    value={formData.valor_entrada}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    error={getFieldError('valor_entrada')}
                                    type="number"
                                    required
                                    icon={FaMoneyBillWave}
                                    placeholder="Ex: 150.00"
                                />
                                <InputField
                                    label="Data Limite para Entrada"
                                    name="data_limite_entrada"
                                    value={formData.data_limite_entrada}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    error={getFieldError('data_limite_entrada')}
                                    type="date"
                                    required
                                    icon={FaCalendarAlt}
                                />
                            </div>

                            {/* Informações Adicionais e Chave PIX */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                <InputField
                                    label="Chave PIX Admin (Opcional)"
                                    name="chave_pix_admin"
                                    value={formData.chave_pix_admin}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    icon={FaMoneyBillWave}
                                    placeholder="Ex: email@apascentar.com ou CPF"
                                />
                                <InputField
                                    label="Informações Adicionais"
                                    name="informacoes_adicionais"
                                    value={formData.informacoes_adicionais}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    type="textarea"
                                    rows={4}
                                    icon={FaInfoCircle}
                                    placeholder="Ex: Regras, o que levar, etc."
                                />
                            </div>

                            {/* Botão Submit */}
                            <div className="flex flex-col sm:flex-row justify-end items-center gap-4 pt-6 border-t border-gray-200">
                                <Link
                                    href="/admin/eventos-face-a-face"
                                    className="flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200 font-medium w-full sm:w-auto"
                                >
                                    <FaArrowLeft />
                                    <span>Cancelar</span>
                                </Link>
                                <button
                                    type="submit"
                                    disabled={submitting || hasErrors()}
                                    className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl hover:from-orange-700 hover:to-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-lg hover:shadow-xl w-full sm:w-auto"
                                >
                                    {submitting ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            <span>Criando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <FaSave />
                                            <span>Criar Edição do Evento</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}