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
    FaClock
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
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-2">
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
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
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
    label: string; name: keyof EventoFaceAFaceFormData; value: string | number | null | boolean; 
    onChange: (e: any) => void; onBlur?: (e: any) => void;
    error?: string | null; type?: string; required?: boolean; icon?: any; placeholder?: string; maxLength?: number; rows?: number; toggle?: boolean;
}
const InputField = ({ label, name, value, onChange, onBlur, error, type = 'text', required = false, icon: Icon, placeholder, maxLength, rows, toggle }: InputFieldProps) => {
    if (toggle) {
        const booleanValue = !!value;
        return (
            <div className={`p-6 rounded-[1.5rem] border-2 flex items-center justify-between transition-all ${booleanValue ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${booleanValue ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-400'}`}>
                        {Icon ? <Icon size={24} /> : (booleanValue ? <FaToggleOn size={24} /> : <FaToggleOff size={24} />)}
                    </div>
                    <div>
                        <p className="text-sm font-black text-gray-900 uppercase tracking-tighter">{label}</p>
                        <p className="text-xs text-gray-500 font-medium">Define se o evento aceita inscrições externas</p>
                    </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" name={name} checked={booleanValue} onChange={onChange} className="sr-only peer" />
                    <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-5 after:w-6 after:transition-all peer-checked:bg-green-600"></div>
                </label>
            </div>
        );
    }

    const isTextarea = type === 'textarea';
    return (
        <div className="space-y-1">
            <label htmlFor={name} className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-2">
                {label} {required && <span className="text-red-600">*</span>}
            </label>
            <div className="relative group">
                {Icon && <Icon className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${error ? "text-red-500" : "text-gray-400 group-focus-within:text-orange-500"}`} />}
                {isTextarea ? (
                    <textarea id={name} name={name} value={(value as string) || ''} onChange={onChange} onBlur={onBlur} rows={rows} placeholder={placeholder} 
                        className={`w-full pl-11 pr-4 py-4 text-sm font-bold text-gray-700 bg-gray-50 border-2 rounded-2xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-orange-500/10 transition-all duration-200 resize-none ${error ? 'border-red-300' : 'border-gray-100 focus:border-orange-500'}`} />
                ) : (
                    <input type={type} id={name} name={name} value={(value || '').toString()} onChange={onChange} onBlur={onBlur} required={required} placeholder={placeholder} maxLength={maxLength}
                        className={`w-full pl-11 pr-4 py-4 text-sm font-bold text-gray-700 bg-gray-50 border-2 rounded-2xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-orange-500/10 transition-all duration-200 ${error ? 'border-red-300' : 'border-gray-100 focus:border-orange-500'}`} />
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
    const [formData, setFormData] = useState<EventoFaceAFaceFormData>({
        nome_evento: '', tipo: 'Mulheres',
        data_inicio: formatDateForInput(new Date().toISOString()),
        data_fim: formatDateForInput(new Date().toISOString()),
        data_pre_encontro: null, local_evento: '', valor_total: 0, valor_entrada: 0,
        data_limite_entrada: formatDateForInput(new Date().toISOString()),
        informacoes_adicionais: null, chave_pix_admin: null, ativa_para_inscricao: false,
    });

    const [submitting, setSubmitting] = useState(false);
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    const router = useRouter();
    const { addToast, ToastContainer } = useToast();

    const tipoEventoOptions = [{ id: 'Mulheres', nome: 'Mulheres' }, { id: 'Homens', nome: 'Homens' }];

    const handleChange = useCallback((e: any) => {
        const { name, value, type, checked } = e.target;
        const val = type === 'checkbox' ? checked : (type === 'number' ? parseFloat(value) : (value === '' ? null : value));
        setFormData(prev => ({ ...prev, [name]: val }));
        setTouched(prev => ({ ...prev, [name]: true }));
    }, [touched]);

    const handleSelectChange = useCallback((name: string, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value as EventoFaceAFaceTipo }));
        setTouched(prev => ({ ...prev, [name]: true }));
    }, [touched]);

    const getFieldError = (fieldName: keyof EventoFaceAFaceFormData): string | null => {
        if (!touched[fieldName]) return null;
        const value = formData[fieldName];
        if (fieldName === 'nome_evento' && (!value || !(value as string).trim())) return 'Nome obrigatório.';
        if (fieldName === 'local_evento' && (!value || !(value as string).trim())) return 'Local obrigatório.';
        if ((fieldName === 'valor_total' || fieldName === 'valor_entrada') && (value === null || (value as number) < 0)) return 'Valor inválido.';
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const eventoId = await criarEventoFaceAFace(formData);
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
                            
                            <section className="space-y-6">
                                <h2 className="text-lg font-black text-gray-800 flex items-center gap-2 border-b border-gray-50 pb-4">
                                    <div className="p-2 bg-orange-100 text-orange-600 rounded-xl"><FaCalendarAlt size={16}/></div>
                                    Informações Básicas
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <InputField label="Nome do Evento" name="nome_evento" value={formData.nome_evento} onChange={handleChange} required icon={FaPen} placeholder="Ex: Face a Face 2025" error={getFieldError('nome_evento')} />
                                    <CustomSelectSheet label="Tipo do Encontro" icon={<FaUsers />} value={formData.tipo} onChange={(val) => handleSelectChange('tipo', val)} options={tipoEventoOptions} required />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <InputField label="Data de Início" name="data_inicio" value={formData.data_inicio} onChange={handleChange} type="date" required icon={FaCalendarAlt} />
                                    <InputField label="Data de Fim" name="data_fim" value={formData.data_fim} onChange={handleChange} type="date" required icon={FaCalendarAlt} />
                                    <InputField label="Pré-Encontro" name="data_pre_encontro" value={formData.data_pre_encontro} onChange={handleChange} type="date" icon={FaClock} />
                                </div>
                                <InputField label="Local do Evento" name="local_evento" value={formData.local_evento} onChange={handleChange} required icon={FaMapMarkerAlt} placeholder="Endereço ou local" />
                            </section>

                            <section className="space-y-6">
                                <h2 className="text-lg font-black text-gray-800 flex items-center gap-2 border-b border-gray-50 pb-4">
                                    <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl"><FaMoneyBillWave size={16}/></div>
                                    Valores e Prazos
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <InputField label="Investimento Total" name="valor_total" value={formData.valor_total} onChange={handleChange} type="number" required icon={FaMoneyBillWave} />
                                    <InputField label="Valor da Entrada" name="valor_entrada" value={formData.valor_entrada} onChange={handleChange} type="number" required icon={FaMoneyBillWave} />
                                    <InputField label="Limite p/ Inscrição" name="data_limite_entrada" value={formData.data_limite_entrada} onChange={handleChange} type="date" required icon={FaCalendarAlt} />
                                </div>
                                <InputField label="Chave PIX Admin" name="chave_pix_admin" value={formData.chave_pix_admin} onChange={handleChange} icon={FaMoneyBillWave} placeholder="Chave para recebimento" />
                            </section>

                            <section className="space-y-6">
                                <h2 className="text-lg font-black text-gray-800 flex items-center gap-2 border-b border-gray-50 pb-4">
                                    <div className="p-2 bg-blue-100 text-blue-600 rounded-xl"><FaInfoCircle size={16}/></div>
                                    Detalhes Adicionais
                                </h2>
                                <InputField label="Orientações aos Candidatos" name="informacoes_adicionais" value={formData.informacoes_adicionais} onChange={handleChange} type="textarea" rows={4} placeholder="O que o candidato precisa saber?" />

                                <InputField 
                                    label="Inscrições Já Abertas?" 
                                    name="ativa_para_inscricao" 
                                    value={formData.ativa_para_inscricao} 
                                    onChange={handleChange} 
                                    type="checkbox" 
                                    toggle 
                                />
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