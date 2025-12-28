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
    FaUserPlus, FaPhone, FaMapMarkerAlt, FaCalendarAlt, FaUserTag, FaArrowLeft,
    FaCheckCircle, FaInfoCircle, FaChevronDown, FaTimes, FaSearch, FaSearchLocation,
    FaSpinner
} from 'react-icons/fa';

// ============================================================================
//                       COMPONENTES VISUAIS (PADRONIZADOS)
// ============================================================================

// 1. CustomSelectSheet
interface CustomSelectSheetProps {
    label: string; value: string; onChange: (value: string) => void; options: { id: string; nome: string }[];
    icon: React.ReactNode; placeholder?: string; searchable?: boolean; required?: boolean; error?: string | null;
}
const CustomSelectSheet = ({ label, value, onChange, options, icon, placeholder = "Selecione...", searchable = false, required = false, error }: CustomSelectSheetProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const modalRef = useRef<HTMLDivElement>(null);
    const selectedName = options.find(o => o.id === value)?.nome || value;
    const filteredOptions = options.filter(option => option.nome.toLowerCase().includes(searchTerm.toLowerCase()));

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => { if (modalRef.current && !modalRef.current.contains(event.target as Node)) setIsOpen(false); };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    return (
        <div className="space-y-1">
            <label className="block text-sm font-bold text-gray-800 flex items-center gap-2">
                {icon} {label} {required && <span className="text-red-600">*</span>}
            </label>
            <button type="button" onClick={() => setIsOpen(true)}
                className={`w-full pl-3 pr-3 py-3 border rounded-xl flex items-center justify-between focus:outline-none focus:ring-2 transition-all duration-200 bg-white text-gray-900 ${error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-orange-500'}`}>
                <span className={`text-base truncate ${selectedName ? 'text-gray-900' : 'text-gray-400'}`}>{selectedName || placeholder}</span>
                <FaChevronDown className="text-gray-500 text-xs ml-2" />
            </button>
            {error && <p className="text-red-600 text-sm flex items-center space-x-1"><FaTimes className="w-3 h-3" /><span>{error}</span></p>}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
                    <div ref={modalRef} className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[600px] animate-in slide-in-from-bottom duration-300">
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50 rounded-t-2xl">
                            <h3 className="font-bold text-gray-900 text-lg">{label}</h3>
                            <button onClick={() => setIsOpen(false)} className="p-2 bg-gray-200 rounded-full text-gray-600 hover:bg-gray-300 transition-colors"><FaTimes /></button>
                        </div>
                        {searchable && (
                            <div className="p-4 border-b border-gray-100 bg-white sticky top-0 z-10">
                                <div className="relative">
                                    <FaSearch className="absolute left-3 top-3.5 text-gray-400" />
                                    <input type="text" placeholder="Buscar..." autoFocus className="w-full pl-10 pr-4 py-3 bg-gray-100 text-gray-900 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500 transition-all text-base" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                                </div>
                            </div>
                        )}
                        <div className="overflow-y-auto p-2 space-y-1 flex-1">
                            {filteredOptions.length > 0 ? (filteredOptions.map((option) => {
                                const isSelected = value === option.id;
                                return (
                                    <button key={option.id} type="button" onClick={() => { onChange(option.id); setIsOpen(false); setSearchTerm(''); }} className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-colors ${isSelected ? 'bg-orange-50 text-orange-800 font-bold' : 'text-gray-900 hover:bg-gray-100'}`}>
                                        <span className="text-base">{option.nome}</span>
                                        {isSelected && <FaCheckCircle className="text-orange-600 text-lg" />}
                                    </button>
                                );
                            })) : (<div className="text-center py-8 text-gray-500">Nenhum item encontrado.</div>)}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// 2. InputField
interface InputFieldProps {
    label: string; name: string; value: string | number | null; 
    onChange: (e: any) => void; onBlur?: (e: any) => void;
    error?: string | null; type?: string; required?: boolean; icon?: any; placeholder?: string; maxLength?: number; rows?: number;
    isLoading?: boolean;
}
const InputField = ({ label, name, value, onChange, onBlur, error, type = 'text', required = false, icon: Icon, placeholder, maxLength, rows, isLoading }: InputFieldProps) => {
    const isTextarea = type === 'textarea';
    return (
        <div className="space-y-1">
            <label htmlFor={name} className="block text-sm font-bold text-gray-800 flex items-center gap-2">
                {Icon && <Icon className={error ? "text-red-600" : "text-orange-600"} />} 
                {label} {required && <span className="text-red-600">*</span>}
            </label>
            <div className="relative">
                {isTextarea ? (
                    <textarea id={name} name={name} value={(value as string) || ''} onChange={onChange} onBlur={onBlur} rows={rows} placeholder={placeholder} 
                        className={`w-full px-4 py-3 text-base text-gray-900 bg-white border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 resize-none ${error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-orange-500'}`} />
                ) : (
                    <>
                        <input type={type} id={name} name={name} value={(value || '').toString()} onChange={onChange} onBlur={onBlur} required={required} placeholder={placeholder} maxLength={maxLength}
                            className={`w-full px-4 py-3 text-base text-gray-900 bg-white border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 ${error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-orange-500'}`} />
                        {isLoading && (
                            <div className="absolute right-3 top-3">
                                <FaSpinner className="animate-spin text-orange-600" />
                            </div>
                        )}
                    </>
                )}
            </div>
            {error && <p className="text-red-600 text-sm flex items-center space-x-1"><FaTimes className="w-3 h-3" /> <span>{error}</span></p>}
        </div>
    );
};

// ============================================================================
//                       PÁGINA PRINCIPAL
// ============================================================================

interface MembroConversionFormData {
    nome: string; telefone: string | null; data_ingresso: string; data_nascimento: string | null; endereco: string | null; status: Membro['status']; celula_id: string;
}

export default function ConverterVisitantePage() {
    const params = useParams();
    const visitanteId = params.id as string;

    const [formData, setFormData] = useState<MembroConversionFormData>({
        nome: '', telefone: null, data_ingresso: formatDateForInput(new Date().toISOString()), data_nascimento: null, endereco: null, status: 'Ativo', celula_id: '',
    });

    const [cepInput, setCepInput] = useState('');
    const [cepLoading, setCepLoading] = useState(false);

    const { addToast, ToastContainer } = useToast();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const router = useRouter();

    useEffect(() => {
        const fetchVisitanteData = async () => {
            setLoading(true);
            try {
                const data = await getVisitante(visitanteId);
                if (!data) { addToast('Visitante não encontrado.', 'error'); setTimeout(() => router.replace('/visitantes'), 2000); return; }
                setFormData({
                    nome: data.nome || '',
                    telefone: normalizePhoneNumber(data.telefone) || null,
                    data_ingresso: formatDateForInput(new Date().toISOString()),
                    data_nascimento: data.data_nascimento || null,
                    endereco: data.endereco || null,
                    status: 'Ativo',
                    celula_id: data.celula_id,
                });
            } catch (e: any) { console.error("Erro fetch:", e); addToast('Erro ao carregar visitante', 'error'); setTimeout(() => router.replace('/visitantes'), 2000); } finally { setLoading(false); }
        };
        if (visitanteId) fetchVisitanteData();
    }, [visitanteId, router, addToast]);

    const handleChange = useCallback((e: any) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'telefone' ? normalizePhoneNumber(value) : value }));
        if (!touched[name]) setTouched(prev => ({ ...prev, [name]: true }));
    }, [touched]);

    const handleSelectChange = useCallback((name: string, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));
        if (!touched[name]) setTouched(prev => ({ ...prev, [name]: true }));
    }, [touched]);

    const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name } = e.target;
        if (!touched[name]) setTouched(prev => ({ ...prev, [name]: true }));
    }, [touched]);

    // CEP LOGIC
    const handleCepChange = (e: any) => {
        let val = e.target.value.replace(/\D/g, '');
        if (val.length > 8) val = val.slice(0, 8);
        if (val.length > 5) val = val.replace(/^(\d{5})(\d)/, '$1-$2');
        setCepInput(val);
    };

    const handleCepBlur = async () => {
        const cleanCep = cepInput.replace(/\D/g, '');
        if (cleanCep.length === 8) {
            setCepLoading(true);
            try {
                const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
                const data = await response.json();
                if (!data.erro) {
                    const fullAddress = `${data.logradouro}, , ${data.bairro} - ${data.localidade}/${data.uf}`;
                    setFormData(prev => ({ ...prev, endereco: fullAddress }));
                }
            } catch (error) { console.error("Erro CEP:", error); } finally { setCepLoading(false); }
        }
    };

    const getFieldError = (fieldName: keyof MembroConversionFormData): string | null => {
        if (!touched[fieldName]) return null;
        const value = formData[fieldName];
        switch (fieldName) {
            case 'nome': return !value || !(value as string).trim() ? 'Nome obrigatório.' : null;
            case 'data_ingresso': return !value ? 'Data obrigatória.' : null;
            default: return null;
        }
    };

    const hasErrors = () => {
        return !formData.nome.trim() || !formData.data_ingresso || !formData.celula_id;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setTouched(Object.keys(formData).reduce((acc, key) => { acc[key as keyof MembroConversionFormData] = true; return acc; }, {} as Record<string, boolean>));
        
        if (hasErrors()) { addToast('Verifique os campos obrigatórios', 'error'); return; }

        setSubmitting(true);
        try {
            const { success, message } = await converterVisitanteEmMembro(visitanteId, { ...formData, telefone: normalizePhoneNumber(formData.telefone) || null });
            if (success) { addToast('Visitante convertido com sucesso!', 'success', 4000); setTimeout(() => router.push('/membros'), 2000); } 
            else { addToast(message || 'Erro na conversão', 'error'); }
        } catch (e: any) { console.error("Erro submit:", e); addToast('Erro inesperado', 'error'); } finally { setSubmitting(false); }
    };

    const statusOptions = [{ id: 'Ativo', nome: 'Ativo' }, { id: 'Inativo', nome: 'Inativo' }, { id: 'Em transição', nome: 'Em transição' }];

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><LoadingSpinner /></div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-12 sm:py-8 px-2 sm:px-6 lg:px-8">
            <ToastContainer />

            <div className="max-w-2xl mx-auto mt-4 sm:mt-0">
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                    
                    {/* Header */}
                    <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-6 sm:px-6 sm:py-8">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2 sm:gap-3"><FaUserPlus /> Converter Visitante</h1>
                                <p className="text-orange-100 mt-1 text-sm sm:text-base">Transforme este visitante em membro</p>
                            </div>
                            <Link href="/visitantes" className="inline-flex justify-center items-center px-4 py-3 sm:py-2 bg-white/20 hover:bg-white/30 active:bg-white/40 text-white rounded-lg transition-colors backdrop-blur-sm border border-white/30 text-sm font-medium w-full sm:w-auto"><FaArrowLeft className="w-3 h-3 mr-2" /> Voltar</Link>
                        </div>
                    </div>

                    <div className="p-4 sm:p-8">
                        <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
                            
                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 sm:p-5 flex gap-3">
                                <FaInfoCircle className="text-blue-700 mt-1" />
                                <div>
                                    <h3 className="text-blue-800 font-bold text-sm sm:text-base">Revisão de Dados</h3>
                                    <p className="text-blue-700 text-xs sm:text-sm">Confirme e complete os dados abaixo para efetivar o cadastro como membro.</p>
                                </div>
                            </div>

                            <InputField label="Nome Completo" name="nome" value={formData.nome} onChange={handleChange} onBlur={handleBlur} error={getFieldError('nome')} required icon={FaUserPlus} />
                            <InputField label="Telefone" name="telefone" value={formData.telefone || ''} onChange={handleChange} onBlur={handleBlur} icon={FaPhone} placeholder="(XX) XXXXX-XXXX" maxLength={15} />

                            {/* BLOCO CEP */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in">
                                <div className="md:col-span-1">
                                    <InputField label="CEP (Busca)" name="cep" value={cepInput} onChange={handleCepChange} onBlur={handleCepBlur} icon={FaSearchLocation} placeholder="00000-000" isLoading={cepLoading} />
                                </div>
                                <div className="md:col-span-2">
                                    <InputField label="Endereço" name="endereco" value={formData.endereco || ''} onChange={handleChange} onBlur={handleBlur} icon={FaMapMarkerAlt} placeholder="Rua, número, bairro..." />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                <InputField label="Data Ingresso" name="data_ingresso" value={formData.data_ingresso} onChange={handleChange} onBlur={handleBlur} error={getFieldError('data_ingresso')} type="date" required icon={FaCalendarAlt} />
                                <InputField label="Data Nascimento" name="data_nascimento" value={formData.data_nascimento || ''} onChange={handleChange} onBlur={handleBlur} type="date" icon={FaCalendarAlt} />
                            </div>

                            <CustomSelectSheet label="Status" icon={<FaUserTag />} value={formData.status} onChange={(val) => handleSelectChange('status', val)} options={statusOptions} required />

                            <button type="submit" disabled={submitting} className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white py-4 px-6 rounded-xl font-bold hover:from-orange-600 hover:to-amber-600 disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2 text-lg">
                                {submitting ? <><FaSpinner className="animate-spin" /> Convertendo...</> : <><FaCheckCircle /> Confirmar Conversão</>}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}