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
    FaUserPlus, FaPhone, FaCalendar, FaMapMarkerAlt, FaComments, FaArrowLeft,
    FaSave, FaTimes, FaClock, FaChevronDown, FaCheckCircle, FaSearch, 
    FaSearchLocation, FaSpinner // <-- Adicionados
} from 'react-icons/fa';

// ============================================================================
//                       COMPONENTES VISUAIS (TEMA EMERALD)
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
    const selectedName = options.find(o => o.id === value)?.nome || null;
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
                className={`w-full pl-3 pr-3 py-3 border rounded-xl flex items-center justify-between focus:outline-none focus:ring-2 transition-all duration-200 bg-white text-gray-900 ${error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-emerald-500'}`}>
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
                                    <input type="text" placeholder="Buscar..." autoFocus className="w-full pl-10 pr-4 py-3 bg-gray-100 text-gray-900 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-all text-base" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                                </div>
                            </div>
                        )}
                        <div className="overflow-y-auto p-2 space-y-1 flex-1">
                            {filteredOptions.length > 0 ? (filteredOptions.map((option) => {
                                const isSelected = value === option.id;
                                return (
                                    <button key={option.id} type="button" onClick={() => { onChange(option.id); setIsOpen(false); setSearchTerm(''); }} className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-colors ${isSelected ? 'bg-emerald-50 text-emerald-800 font-bold' : 'text-gray-900 hover:bg-gray-100'}`}>
                                        <span className="text-base">{option.nome}</span>
                                        {isSelected && <FaCheckCircle className="text-emerald-600 text-lg" />}
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

// 2. InputField (Emerald + Contraste + Loading CEP)
interface InputFieldProps {
    label: string; name: string; value: string | number | null; 
    onChange: (e: any) => void; onBlur?: (e: any) => void;
    error?: string | null; type?: string; required?: boolean; icon?: any; placeholder?: string; maxLength?: number; rows?: number;
    isLoading?: boolean; // Novo prop para o CEP
}
const InputField = ({ label, name, value, onChange, onBlur, error, type = 'text', required = false, icon: Icon, placeholder, maxLength, rows, isLoading }: InputFieldProps) => {
    const isTextarea = type === 'textarea';
    return (
        <div className="space-y-1">
            <label htmlFor={name} className="block text-sm font-bold text-gray-800 flex items-center gap-2">
                {Icon && <Icon className={error ? "text-red-600" : "text-emerald-600"} />} 
                {label} {required && <span className="text-red-600">*</span>}
            </label>
            <div className="relative">
                {isTextarea ? (
                    <textarea id={name} name={name} value={(value as string) || ''} onChange={onChange} onBlur={onBlur} rows={rows} placeholder={placeholder} 
                        className={`w-full px-4 py-3 text-base text-gray-900 bg-white border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 resize-none ${error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-emerald-500'}`} />
                ) : (
                    <>
                        <input type={type} id={name} name={name} value={(value || '').toString()} onChange={onChange} onBlur={onBlur} required={required} placeholder={placeholder} maxLength={maxLength}
                            className={`w-full px-4 py-3 text-base text-gray-900 bg-white border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 ${error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-emerald-500'}`} />
                        {isLoading && (
                            <div className="absolute right-3 top-3">
                                <FaSpinner className="animate-spin text-emerald-600" />
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
//                       PÁGINA NOVO VISITANTE
// ============================================================================

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

    // Estados do CEP
    const [cepInput, setCepInput] = useState('');
    const [cepLoading, setCepLoading] = useState(false);

    const router = useRouter();
    const { addToast, ToastContainer } = useToast();

    useEffect(() => {
        const fetchDependencies = async () => {
            setLoading(true);
            try {
                const cells = await listarCelulasParaAdmin();
                setCelulasOptions(cells);
                if (cells.length === 1) setFormData(prev => ({ ...prev, celula_id: cells[0].id }));
            } catch (e: any) { addToast(e.message || 'Erro ao carregar dados', 'error'); } finally { setLoading(false); }
        };
        fetchDependencies();
    }, [addToast]);

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

    // --- LÓGICA DE CEP ---
    const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
                    // Constrói o endereço completo para o campo único do visitante
                    const fullAddress = `${data.logradouro}, , ${data.bairro} - ${data.localidade}/${data.uf}`;
                    setFormData(prev => ({ ...prev, endereco: fullAddress }));
                }
            } catch (error) {
                console.error("Erro ao buscar CEP:", error);
                // Não bloqueia o usuário, ele pode digitar manualmente
            } finally {
                setCepLoading(false);
            }
        }
    };

    const getFieldError = (fieldName: keyof NovoVisitanteFormData): string | null => {
        if (!touched[fieldName]) return null;
        const value = formData[fieldName];
        switch (fieldName) {
            case 'nome': return !value || !(value as string).trim() ? 'Nome obrigatório.' : null;
            case 'telefone': return value && ((value as string).length < 10 || (value as string).length > 11) ? 'Telefone inválido.' : null;
            case 'data_primeira_visita': return !value ? 'Data obrigatória.' : null;
            case 'celula_id': return !value ? 'Célula obrigatória.' : null;
            default: return null;
        }
    };

    const hasErrors = () => {
        const fields = ['nome', 'telefone', 'data_primeira_visita', 'celula_id'] as (keyof NovoVisitanteFormData)[];
        return fields.some(f => getFieldError(f) !== null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const allTouched = Object.keys(formData).reduce((acc, key) => { acc[key as keyof NovoVisitanteFormData] = true; return acc; }, {} as Record<string, boolean>);
        setTouched(allTouched);

        if (hasErrors()) { addToast('Corrija os erros.', 'error'); return; }

        setSubmitting(true);
        try {
            await adicionarVisitante({ ...formData, nome: formData.nome.trim(), telefone: normalizePhoneNumber(formData.telefone) || null });
            addToast('Visitante adicionado!', 'success', 3000);
            setTimeout(() => router.push('/visitantes'), 1500);
        } catch (e: any) {
            console.error("Erro submit:", e);
            if (e.code === '23505') addToast('Visitante já existe.', 'error');
            else addToast(`Erro: ${e.message}`, 'error');
        } finally { setSubmitting(false); }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-12 sm:py-8 px-2 sm:px-6 lg:px-8">
            <ToastContainer />

            <div className="max-w-2xl mx-auto mt-4 sm:mt-0">
                <div className="bg-gradient-to-r from-emerald-600 to-green-500 rounded-xl sm:rounded-2xl shadow-lg p-6 mb-6 text-white">
                    <div className="flex items-center gap-4">
                        <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm"><FaUserPlus className="text-2xl" /></div>
                        <div><h1 className="text-2xl sm:text-3xl font-bold">Novo Visitante</h1><p className="text-emerald-100 text-sm mt-1">Cadastre um novo visitante</p></div>
                    </div>
                </div>

                <div className="bg-white rounded-xl sm:rounded-2xl shadow-md border border-gray-200 overflow-hidden">
                    {loading ? <div className="py-12 flex justify-center"><LoadingSpinner /></div> : (
                        <form onSubmit={handleSubmit} className="p-5 sm:p-8 space-y-6">
                            
                            <InputField label="Nome Completo" name="nome" value={formData.nome} onChange={handleChange} onBlur={handleBlur} error={getFieldError('nome')} required icon={FaUserPlus} placeholder="Ex: Maria Souza" />
                            <InputField label="Telefone" name="telefone" value={formData.telefone || ''} onChange={handleChange} onBlur={handleBlur} error={getFieldError('telefone')} icon={FaPhone} placeholder="(XX) XXXXX-XXXX" maxLength={15} />
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <InputField label="Data da 1ª Visita" name="data_primeira_visita" value={formData.data_primeira_visita} onChange={handleChange} onBlur={handleBlur} error={getFieldError('data_primeira_visita')} type="date" required icon={FaCalendar} />
                                <InputField label="Data de Nascimento" name="data_nascimento" value={formData.data_nascimento || ''} onChange={handleChange} onBlur={handleBlur} type="date" icon={FaCalendar} />
                            </div>

                            {celulasOptions.length > 1 && <CustomSelectSheet label="Célula" icon={<FaMapMarkerAlt className="text-emerald-600" />} value={formData.celula_id} onChange={(val) => handleSelectChange('celula_id', val)} options={celulasOptions} required placeholder="Selecione a Célula" searchable error={getFieldError('celula_id')} />}
                            {celulasOptions.length === 1 && <input type="hidden" name="celula_id" value={formData.celula_id} />}

                            {/* BLOCO DE ENDEREÇO COM CEP (MODIFICADO) */}
                            <div className="space-y-4 pt-2 border-t border-gray-100 animate-in fade-in">
                                <div className="space-y-1">
                                    <InputField 
                                        label="CEP (Preenchimento Automático)" 
                                        name="cep" 
                                        value={cepInput} 
                                        onChange={handleCepChange} 
                                        onBlur={handleCepBlur} 
                                        icon={FaSearchLocation} 
                                        placeholder="00000-000" 
                                        isLoading={cepLoading}
                                    />
                                </div>
                                <InputField 
                                    label="Endereço Completo" 
                                    name="endereco" 
                                    value={formData.endereco || ''} 
                                    onChange={handleChange} 
                                    onBlur={handleBlur} 
                                    icon={FaMapMarkerAlt} 
                                    placeholder="Rua, número, bairro..." 
                                />
                            </div>

                            <InputField label="Data Último Contato" name="data_ultimo_contato" value={formData.data_ultimo_contato || ''} onChange={handleChange} onBlur={handleBlur} type="date" icon={FaClock} />
                            <InputField label="Observações" name="observacoes" value={formData.observacoes || ''} onChange={handleChange} onBlur={handleBlur} type="textarea" icon={FaComments} placeholder="Detalhes importantes..." rows={4} />

                            <div className="flex flex-col-reverse sm:flex-row justify-between items-center gap-4 pt-6 border-t border-gray-100">
                                <Link href="/visitantes" className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"><FaArrowLeft /> Cancelar</Link>
                                <button type="submit" disabled={submitting || hasErrors()} className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-emerald-600 to-green-500 text-white rounded-xl hover:from-emerald-700 hover:to-green-600 disabled:opacity-70 disabled:cursor-not-allowed transition-all font-bold shadow-md active:scale-95">
                                    {submitting ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>Salvando...</span></> : <><FaSave /> Salvar Visitante</>}
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
                            <li>Digite o CEP para preencher o endereço automaticamente.</li>
                            <li>Preencha o nome completo.</li>
                            <li>Registre observações.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}