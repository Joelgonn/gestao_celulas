// src/app/(app)/visitantes/novo/page.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { adicionarVisitante, listarCelulasParaAdmin } from '@/lib/data';
import { CelulaOption, NovoVisitanteFormData } from '@/lib/types';
import { normalizePhoneNumber } from '@/utils/formatters';
import useToast from '@/hooks/useToast';
import LoadingSpinner from '@/components/LoadingSpinner';

import {
    FaUserPlus,
    FaPhone,
    FaCalendar,
    FaMapMarkerAlt,
    FaComments,
    FaArrowLeft,
    FaSave,
    FaTimes,
    FaClock,
    FaChevronDown,
    FaCheckCircle,
    FaSearch
} from 'react-icons/fa';

// --- COMPONENTE CUSTOMIZADO DE SELEÇÃO (BOTTOM SHEET) ---
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
        <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                {icon} {label} {required && <span className="text-red-500">*</span>}
            </label>
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className={`w-full pl-3 pr-3 py-3 border rounded-xl flex items-center justify-between focus:outline-none focus:ring-2 transition-all duration-200 bg-white ${
                    error
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50'
                        : 'border-gray-300 focus:ring-emerald-500 focus:border-emerald-500'
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
                                        className="w-full pl-10 pr-4 py-3 bg-gray-100 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-base"
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
                                            className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-colors ${isSelected ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-gray-700 hover:bg-gray-50'}`}
                                        >
                                            <span className="text-base">{option.nome}</span>
                                            {isSelected && <FaCheckCircle className="text-emerald-500 text-lg" />}
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

// --- COMPONENTE DE INPUT CORRIGIDO (MOVIDO PARA FORA) ---
interface InputFieldProps {
    label: string;
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    error?: string | null;
    type?: string;
    required?: boolean;
    icon?: any;
    placeholder?: string;
    maxLength?: number;
    rows?: number;
}

const InputField = ({ 
    label, 
    name, 
    value, 
    onChange, 
    onBlur, 
    error, 
    type = 'text', 
    required = false, 
    icon: Icon, 
    placeholder, 
    maxLength, 
    rows 
}: InputFieldProps) => {
    const isTextarea = type === 'textarea';

    return (
        <div className="space-y-2">
            <label htmlFor={name} className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                {Icon && <Icon className={error ? "text-red-500" : "text-emerald-500"} />} 
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <div className="relative">
                {isTextarea ? (
                    <textarea
                        id={name}
                        name={name}
                        value={value}
                        onChange={onChange}
                        onBlur={onBlur}
                        rows={rows}
                        placeholder={placeholder}
                        className={`w-full px-4 py-3 text-base border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 resize-none ${
                            error ? 'border-red-300 focus:ring-red-500 bg-red-50' : 'border-gray-300 focus:ring-emerald-500'
                        }`}
                    />
                ) : (
                    <input
                        type={type}
                        id={name}
                        name={name}
                        value={value}
                        onChange={onChange}
                        onBlur={onBlur}
                        required={required}
                        placeholder={placeholder}
                        maxLength={maxLength}
                        className={`w-full px-4 py-3 text-base border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 ${
                            error ? 'border-red-300 focus:ring-red-500 bg-red-50' : 'border-gray-300 focus:ring-emerald-500'
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


export default function NovoVisitantePage() {
    const [formData, setFormData] = useState<NovoVisitanteFormData>({
        nome: '',
        telefone: null,
        data_primeira_visita: new Date().toISOString().split('T')[0],
        data_nascimento: null,
        endereco: null,
        data_ultimo_contato: null,
        observacoes: null,
        celula_id: '',
    });

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [celulasOptions, setCelulasOptions] = useState<CelulaOption[]>([]);

    const router = useRouter();
    const { addToast, ToastContainer } = useToast();

    useEffect(() => {
        const fetchDependencies = async () => {
            setLoading(true);
            try {
                const cells = await listarCelulasParaAdmin();
                setCelulasOptions(cells);

                if (cells.length === 1) {
                    setFormData(prev => ({ ...prev, celula_id: cells[0].id }));
                }
            } catch (e: any) {
                console.error("Erro fetch:", e);
                addToast(e.message || 'Erro ao carregar dados', 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchDependencies();
    }, [addToast]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'telefone' ? normalizePhoneNumber(value) : (value === '' ? null : value)
        }));
        if (!touched[name]) setTouched(prev => ({ ...prev, [name]: true }));
    }, [touched]);

    const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name } = e.target;
        if (!touched[name]) setTouched(prev => ({ ...prev, [name]: true }));
    }, [touched]);

    const handleSelectChange = useCallback((name: string, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));
        if (!touched[name]) setTouched(prev => ({ ...prev, [name]: true }));
    }, [touched]);

    const getFieldError = (fieldName: keyof NovoVisitanteFormData): string | null => {
        if (!touched[fieldName]) return null;
        const value = formData[fieldName];
        switch (fieldName) {
            case 'nome': return !value || !value.trim() ? 'Nome é obrigatório' : null;
            case 'telefone': return value && (value.length < 10 || value.length > 11) ? 'Telefone inválido' : null;
            case 'data_primeira_visita': return !value ? 'Data obrigatória' : null;
            case 'celula_id': return !value ? 'Célula obrigatória' : null;
            default: return null;
        }
    };

    const hasErrors = (): boolean => {
        return !formData.nome.trim() ||
               !!(formData.telefone && (formData.telefone.length < 10 || formData.telefone.length > 11)) ||
               !formData.data_primeira_visita ||
               !formData.celula_id;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const allTouched = Object.keys(formData).reduce((acc, key) => {
            acc[key as keyof NovoVisitanteFormData] = true;
            return acc;
        }, {} as Record<string, boolean>);
        setTouched(allTouched);

        if (hasErrors()) {
            addToast('Corrija os erros no formulário', 'error');
            return;
        }

        setSubmitting(true);
        try {
            await adicionarVisitante({
                ...formData,
                nome: formData.nome.trim(),
                telefone: normalizePhoneNumber(formData.telefone) || null,
            });
            addToast('Visitante adicionado!', 'success', 3000);
            setTimeout(() => router.push('/visitantes'), 1500);
        } catch (e: any) {
            console.error("Erro submit:", e);
            if (e.code === '23505') addToast('Visitante já existe nesta célula', 'error');
            else addToast(`Erro: ${e.message}`, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-12 sm:py-8 px-2 sm:px-6 lg:px-8">
            <ToastContainer />

            <div className="max-w-2xl mx-auto mt-4 sm:mt-0">
                <div className="bg-gradient-to-r from-emerald-600 to-green-500 rounded-xl sm:rounded-2xl shadow-lg p-6 mb-6 text-white">
                    <div className="flex items-center gap-4">
                        <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                            <FaUserPlus className="text-2xl" />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold">Novo Visitante</h1>
                            <p className="text-emerald-100 text-sm mt-1">Cadastre um novo visitante</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl sm:rounded-2xl shadow-md border border-gray-200 overflow-hidden">
                    {loading ? (
                        <div className="py-12 flex justify-center">
                            <LoadingSpinner />
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="p-5 sm:p-8 space-y-6">
                            
                            {/* Nome */}
                            <InputField 
                                label="Nome Completo" 
                                name="nome" 
                                value={formData.nome}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                error={getFieldError('nome')}
                                required 
                                icon={FaUserPlus} 
                                placeholder="Ex: Maria Souza" 
                            />

                            {/* Telefone */}
                            <InputField 
                                label="Telefone" 
                                name="telefone" 
                                value={formData.telefone || ''}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                error={getFieldError('telefone')}
                                icon={FaPhone} 
                                placeholder="(XX) XXXXX-XXXX" 
                                maxLength={11} 
                            />

                            {/* Datas */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <InputField 
                                    label="Data da 1ª Visita" 
                                    name="data_primeira_visita" 
                                    value={formData.data_primeira_visita}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    error={getFieldError('data_primeira_visita')}
                                    type="date" 
                                    required 
                                    icon={FaCalendar} 
                                />
                                <InputField 
                                    label="Data de Nascimento" 
                                    name="data_nascimento" 
                                    value={formData.data_nascimento || ''}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    type="date" 
                                    icon={FaCalendar} 
                                />
                            </div>

                            {/* Célula (Admin) - Usando CustomSelectSheet */}
                            {celulasOptions.length > 1 && (
                                <CustomSelectSheet
                                    label="Célula"
                                    icon={<FaMapMarkerAlt className="text-emerald-500" />}
                                    value={formData.celula_id}
                                    onChange={(val) => handleSelectChange('celula_id', val)}
                                    options={celulasOptions}
                                    required
                                    placeholder="Selecione a Célula"
                                    searchable
                                    error={getFieldError('celula_id')}
                                />
                            )}
                            
                            {/* Campo oculto se for líder (célula única) */}
                            {celulasOptions.length === 1 && (
                                <input type="hidden" name="celula_id" value={formData.celula_id} />
                            )}

                            {/* Endereço */}
                            <InputField 
                                label="Endereço" 
                                name="endereco" 
                                value={formData.endereco || ''}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                icon={FaMapMarkerAlt} 
                                placeholder="Rua, número, bairro..." 
                            />

                            {/* Último Contato */}
                            <InputField 
                                label="Data Último Contato" 
                                name="data_ultimo_contato" 
                                value={formData.data_ultimo_contato || ''}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                type="date" 
                                icon={FaClock} 
                            />

                            {/* Observações */}
                            <InputField 
                                label="Observações" 
                                name="observacoes" 
                                value={formData.observacoes || ''}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                type="textarea" 
                                icon={FaComments} 
                                placeholder="Detalhes importantes..." 
                                rows={4} 
                            />

                            {/* Botões */}
                            <div className="flex flex-col-reverse sm:flex-row justify-between items-center gap-4 pt-6 border-t border-gray-100">
                                <Link
                                    href="/visitantes"
                                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                                >
                                    <FaArrowLeft /> Cancelar
                                </Link>

                                <button
                                    type="submit"
                                    disabled={submitting || hasErrors()}
                                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-emerald-600 to-green-500 text-white rounded-xl hover:from-emerald-700 hover:to-green-600 disabled:opacity-70 disabled:cursor-not-allowed transition-all font-bold shadow-md active:scale-95"
                                >
                                    {submitting ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            <span>Salvando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <FaSave /> Salvar Visitante
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </div>

                <div className="mt-6 bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3 text-sm text-blue-800">
                    <FaComments className="mt-1 flex-shrink-0" />
                    <div>
                        <p className="font-bold mb-1">Dicas:</p>
                        <ul className="list-disc list-inside space-y-1 text-blue-700">
                            <li>Preencha o nome completo para identificação.</li>
                            <li>Use DDD no telefone (10 ou 11 dígitos).</li>
                            <li>Registre observações para facilitar o acompanhamento.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}