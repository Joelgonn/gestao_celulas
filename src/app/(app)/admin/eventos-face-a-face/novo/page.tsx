'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
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
    FaChevronDown,
    FaCheckCircle,
    FaTimes,
    FaSearch,
    FaToggleOn,
    FaToggleOff,
    FaSpinner,
    FaPen,
    FaClock,
    FaHandHoldingHeart
} from 'react-icons/fa';

// --- COMPONENTES VISUAIS REFINADOS ---

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
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <button type="button" onClick={() => setIsOpen(true)}
                className={`w-full px-4 py-4 border-2 rounded-2xl flex items-center justify-between focus:outline-none focus:ring-4 focus:ring-orange-500/10 transition-all duration-200 bg-gray-50 text-gray-900 group ${error ? 'border-red-300' : 'border-gray-100 focus:border-orange-500'}`}>
                <div className="flex items-center gap-3">
                    <span className="text-gray-400 group-hover:text-orange-500 transition-colors">{icon}</span>
                    <span className={`text-sm font-bold truncate ${selectedName ? 'text-gray-900' : 'text-gray-400'}`}>{selectedName || placeholder}</span>
                </div>
                <FaChevronDown className="text-gray-300 text-xs ml-2" />
            </button>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200 p-0 sm:p-4">
                    <div ref={modalRef} className="w-full sm:max-w-md bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col max-h-[85vh] animate-in slide-in-from-bottom duration-300">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 rounded-t-[2.5rem]">
                            <h3 className="font-black text-gray-800 text-lg uppercase tracking-tighter">{label}</h3>
                            <button onClick={() => setIsOpen(false)} className="p-3 bg-gray-200 rounded-2xl text-gray-600 hover:bg-gray-300 transition-all"><FaTimes /></button>
                        </div>
                        {searchable && (
                            <div className="p-4 border-b border-gray-100 bg-white sticky top-0 z-10">
                                <div className="relative">
                                    <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input type="text" placeholder="Buscar..." autoFocus className="w-full pl-11 pr-4 py-4 bg-gray-100 border-transparent rounded-2xl focus:bg-white focus:ring-4 focus:ring-orange-500/10 transition-all text-sm font-bold" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                                </div>
                            </div>
                        )}
                        <div className="overflow-y-auto p-4 space-y-2 flex-1 pb-10 sm:pb-4">
                            {filteredOptions.length > 0 ? (filteredOptions.map((option) => (
                                <button key={option.id} type="button" onClick={() => { onChange(option.id); setIsOpen(false); setSearchTerm(''); }} 
                                    className={`w-full text-left px-5 py-4 rounded-2xl flex items-center justify-between transition-all ${value === option.id ? 'bg-orange-600 text-white shadow-lg shadow-orange-200' : 'text-gray-700 hover:bg-gray-100'}`}>
                                    <span className="text-sm font-bold">{option.nome}</span>
                                    {value === option.id && <FaCheckCircle className="text-white" />}
                                </button>
                            ))) : (<div className="text-center py-12 text-gray-400 font-bold italic">Nenhum item encontrado.</div>)}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

interface InputFieldProps {
    label: string; name: string; value: string | number | null | boolean; 
    onChange: (e: any) => void; onBlur?: (e: any) => void;
    error?: string | null; type?: string; required?: boolean; icon?: any; placeholder?: string; maxLength?: number; rows?: number; toggle?: boolean; disabled?: boolean;
}
const InputField = ({ label, name, value, onChange, onBlur, error, type = 'text', required = false, icon: Icon, placeholder, maxLength, rows, toggle, disabled }: InputFieldProps) => {
    if (toggle) {
        const booleanValue = !!value;
        return (
            <div 
                onClick={() => !disabled && onChange({ target: { name, type: 'checkbox', checked: !booleanValue } })}
                className={`p-5 rounded-2xl border-2 flex items-center justify-between transition-all cursor-pointer ${booleanValue ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-sm'}`}
            >
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl transition-colors ${booleanValue ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-400'}`}>
                        {Icon ? <Icon size={20} /> : (booleanValue ? <FaToggleOn size={20} /> : <FaToggleOff size={20} />)}
                    </div>
                    <div>
                        <p className="text-xs font-black text-gray-900 uppercase tracking-tighter">{label}</p>
                        <p className="text-[10px] text-gray-500 font-bold mt-0.5">{booleanValue ? 'Ativado' : 'Desativado'}</p>
                    </div>
                </div>
                <div className={`w-10 h-5 bg-gray-300 rounded-full relative transition-colors ${booleanValue ? 'bg-green-500' : ''}`}>
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-transform ${booleanValue ? 'left-6' : 'left-1'}`}></div>
                </div>
            </div>
        );
    }

    const isTextarea = type === 'textarea';
    return (
        <div className="space-y-1">
            <label htmlFor={name} className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2">
                {label} {required && <span className="text-red-600">*</span>}
            </label>
            <div className="relative group">
                {Icon && <Icon className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${error ? "text-red-500" : "text-gray-400 group-focus-within:text-orange-500"}`} />}
                {isTextarea ? (
                    <textarea id={name} name={name} value={(value as string) || ''} onChange={onChange} onBlur={onBlur} rows={rows} placeholder={placeholder} disabled={disabled}
                        className={`w-full pl-11 pr-4 py-4 text-sm font-bold text-gray-700 bg-gray-50 border-2 rounded-2xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-orange-500/10 transition-all duration-200 resize-none ${error ? 'border-red-300' : 'border-gray-100 focus:border-orange-500'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`} />
                ) : (
                    <input type={type} id={name} name={name} value={(value || '').toString()} onChange={onChange} onBlur={onBlur} required={required} placeholder={placeholder} maxLength={maxLength} disabled={disabled}
                        className={`w-full pl-11 pr-4 py-4 text-sm font-bold text-gray-700 bg-gray-50 border-2 rounded-2xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-orange-500/10 transition-all duration-200 ${error ? 'border-red-300' : 'border-gray-100 focus:border-orange-500'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`} />
                )}
            </div>
            {error && <p className="text-red-500 text-[10px] font-bold uppercase tracking-tighter ml-1 mt-1">{error}</p>}
        </div>
    );
};

// ============================================================================
//                       PÁGINA PRINCIPAL
// ============================================================================

export default function NovoEventoFaceAFacePage() {
    const [formData, setFormData] = useState<any>({
        nome_evento: '', 
        tipo: 'Mulheres',
        data_inicio: formatDateForInput(new Date().toISOString()),
        data_fim: formatDateForInput(new Date().toISOString()),
        data_pre_encontro: null, 
        local_evento: '', 
        valor_total: 0, 
        valor_entrada: 0,
        data_limite_entrada: formatDateForInput(new Date().toISOString()),
        informacoes_adicionais: null, 
        chave_pix_admin: null, 
        ativa_para_inscricao: false,
        
        // NOVO CAMPO LOCAL
        eh_gratuito: false 
    });

    const [submitting, setSubmitting] = useState(false);
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    const router = useRouter();
    const { addToast, ToastContainer } = useToast();

    // NOVAS OPÇÕES DE TIPO
    const tipoEventoOptions = [
        { id: 'Mulheres', nome: 'Mulheres' }, 
        { id: 'Homens', nome: 'Homens' },
        { id: 'Crianças', nome: 'Crianças' },
        { id: 'Misto', nome: 'Misto / Aberto' }
    ];

    const handleChange = useCallback((e: any) => {
        const { name, value, type, checked } = e.target;
        let val = type === 'checkbox' ? checked : (type === 'number' ? parseFloat(value) : (value === '' ? null : value));
        
        // Lógica de Gratuidade
        if (name === 'eh_gratuito') {
            if (checked) {
                // Se marcou gratuito, zera valores
                setFormData((prev: any) => ({ ...prev, [name]: checked, valor_total: 0, valor_entrada: 0, chave_pix_admin: null }));
            } else {
                setFormData((prev: any) => ({ ...prev, [name]: checked }));
            }
        } else {
            setFormData((prev: any) => ({ ...prev, [name]: val }));
        }
        
        setTouched((prev: any) => ({ ...prev, [name]: true }));
    }, []);

    const handleSelectChange = useCallback((name: string, value: string) => {
        setFormData((prev: any) => ({ ...prev, [name]: value as EventoFaceAFaceTipo }));
        setTouched((prev: any) => ({ ...prev, [name]: true }));
    }, []);

    const getFieldError = (fieldName: keyof EventoFaceAFaceFormData): string | null => {
        if (!touched[fieldName]) return null;
        const value = formData[fieldName];
        if (fieldName === 'nome_evento' && (!value || !(value as string).trim())) return 'Nome obrigatório.';
        if (fieldName === 'local_evento' && (!value || !(value as string).trim())) return 'Local obrigatório.';
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            // Remove o campo auxiliar 'eh_gratuito' antes de enviar, se sua API não aceitar
            // Mas se a lógica de 'valor_total: 0' já resolve no backend, tá ótimo.
            const { eh_gratuito, ...payload } = formData;
            
            const eventoId = await criarEventoFaceAFace(payload);
            addToast('Edição criada com sucesso!', 'success');
            router.refresh();
            setTimeout(() => router.push(`/admin/eventos-face-a-face/editar/${eventoId}`), 1500);
        } catch (e: any) { addToast(`Erro: ${e.message}`, 'error'); } finally { setSubmitting(false); }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-12 font-sans">
            <ToastContainer />
            
            <div className="bg-gradient-to-br from-orange-600 to-amber-600 pt-8 pb-24 px-4 sm:px-8 shadow-lg">
                <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-5">
                        <Link href="/admin/eventos-face-a-face" className="bg-white/20 p-3 rounded-2xl text-white hover:bg-white/30 transition-all active:scale-90 backdrop-blur-md border border-white/10">
                            <FaArrowLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                                <FaPlus /> Nova Edição
                            </h1>
                            <p className="text-orange-100 text-sm font-medium opacity-80 uppercase tracking-widest">Cadastro de Evento</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-8 -mt-12">
                <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden">
                    <div className="p-8 sm:p-10">
                        <form onSubmit={handleSubmit} className="space-y-10">
                            
                            {/* Bloco 1: Básico */}
                            <section className="space-y-6">
                                <h2 className="text-lg font-black text-gray-800 flex items-center gap-2 border-b border-gray-50 pb-4">
                                    <div className="p-2 bg-orange-100 text-orange-600 rounded-xl"><FaCalendarAlt size={16}/></div>
                                    Informações Básicas
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <InputField label="Nome do Evento" name="nome_evento" value={formData.nome_evento} onChange={handleChange} required icon={FaPen} placeholder="Ex: Acampamento Kids 2025" error={getFieldError('nome_evento')} />
                                    <CustomSelectSheet label="Público Alvo" icon={<FaUsers />} value={formData.tipo} onChange={(val) => handleSelectChange('tipo', val)} options={tipoEventoOptions} required />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <InputField label="Data de Início" name="data_inicio" value={formData.data_inicio} onChange={handleChange} type="date" required icon={FaCalendarAlt} />
                                    <InputField label="Data de Fim" name="data_fim" value={formData.data_fim} onChange={handleChange} type="date" required icon={FaCalendarAlt} />
                                    <InputField label="Pré-Encontro" name="data_pre_encontro" value={formData.data_pre_encontro} onChange={handleChange} type="date" icon={FaClock} />
                                </div>
                                <InputField label="Local do Evento" name="local_evento" value={formData.local_evento} onChange={handleChange} required icon={FaMapMarkerAlt} placeholder="Endereço ou local" />
                            </section>

                            {/* Bloco 2: Financeiro */}
                            <section className="space-y-6">
                                <div className="flex items-center justify-between border-b border-gray-50 pb-4">
                                    <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
                                        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl"><FaMoneyBillWave size={16}/></div>
                                        Valores e Prazos
                                    </h2>
                                    
                                    {/* Toggle de Gratuidade */}
                                    <div className="w-48">
                                        <InputField 
                                            label="Evento Gratuito?" 
                                            name="eh_gratuito" 
                                            value={formData.eh_gratuito} 
                                            onChange={handleChange} 
                                            type="checkbox" 
                                            toggle 
                                            icon={FaHandHoldingHeart}
                                        />
                                    </div>
                                </div>

                                {!formData.eh_gratuito && (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-4 duration-300">
                                        <InputField label="Investimento Total" name="valor_total" value={formData.valor_total} onChange={handleChange} type="number" required icon={FaMoneyBillWave} />
                                        <InputField label="Valor da Entrada" name="valor_entrada" value={formData.valor_entrada} onChange={handleChange} type="number" required icon={FaMoneyBillWave} />
                                        <InputField label="Chave PIX Admin" name="chave_pix_admin" value={formData.chave_pix_admin} onChange={handleChange} icon={FaMoneyBillWave} placeholder="Email, CPF ou Aleatória" />
                                    </div>
                                )}
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <InputField label="Limite p/ Inscrição" name="data_limite_entrada" value={formData.data_limite_entrada} onChange={handleChange} type="date" required icon={FaCalendarAlt} />
                                </div>
                            </section>

                            {/* Bloco 3: Extras */}
                            <section className="space-y-6">
                                <h2 className="text-lg font-black text-gray-800 flex items-center gap-2 border-b border-gray-50 pb-4">
                                    <div className="p-2 bg-blue-100 text-blue-600 rounded-xl"><FaInfoCircle size={16}/></div>
                                    Detalhes Adicionais
                                </h2>
                                <InputField label="Orientações aos Candidatos" name="informacoes_adicionais" value={formData.informacoes_adicionais} onChange={handleChange} type="textarea" rows={4} placeholder="O que levar? Horário de saída? Regras?" />

                                <div className="max-w-md">
                                    <InputField 
                                        label="Inscrições Abertas?" 
                                        name="ativa_para_inscricao" 
                                        value={formData.ativa_para_inscricao} 
                                        onChange={handleChange} 
                                        type="checkbox" 
                                        toggle 
                                    />
                                </div>
                            </section>

                            <div className="flex flex-col-reverse sm:flex-row justify-end gap-4 pt-6 border-t border-gray-50">
                                <Link href="/admin/eventos-face-a-face" className="px-8 py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-all text-center">Cancelar</Link>
                                <button type="submit" disabled={submitting} className="px-8 py-4 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-2xl font-black text-lg shadow-lg shadow-orange-200 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-3 cursor-pointer">
                                    {submitting ? <FaSpinner className="animate-spin" /> : <FaSave />} Criar Edição
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}