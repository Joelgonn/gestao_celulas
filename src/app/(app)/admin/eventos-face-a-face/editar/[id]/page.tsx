'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
    getEventoFaceAFace,
    atualizarEventoFaceAFace,
} from '@/lib/data';
import {
    EventoFaceAFaceFormData,
    EventoFaceAFaceTipo,
} from '@/lib/types';
import { formatDateForInput } from '@/utils/formatters';
import useToast from '@/hooks/useToast';
import LoadingSpinner from '@/components/LoadingSpinner';

import {
    FaEdit, FaArrowLeft, FaCalendarAlt, FaMoneyBillWave, FaMapMarkerAlt, 
    FaInfoCircle, FaUsers, FaSave, FaToggleOn, FaToggleOff, FaChevronDown, 
    FaSearch, FaCheckCircle, FaTimes
} from 'react-icons/fa';

// --- COMPONENTES VISUAIS (TEMA LARANJA) ---

// 1. CustomSelectSheet (Ajustado para Laranja)
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

// 2. InputField (Ajustado para Laranja e Contraste)
interface InputFieldProps {
    label: string; name: keyof EventoFaceAFaceFormData; value: string | number | null; 
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    onBlur?: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    error?: string | null; type?: string; required?: boolean; icon?: any; placeholder?: string; maxLength?: number; rows?: number;
}
const InputField = ({ label, name, value, onChange, onBlur, error, type = 'text', required = false, icon: Icon, placeholder, maxLength, rows }: InputFieldProps) => {
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
                    <input type={type} id={name} name={name} value={(value || '').toString()} onChange={onChange} onBlur={onBlur} required={required} placeholder={placeholder} maxLength={maxLength}
                        className={`w-full px-4 py-3 text-base text-gray-900 bg-white border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 ${error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-orange-500'}`} />
                )}
            </div>
            {error && <p className="text-red-600 text-sm flex items-center space-x-1"><FaTimes className="w-3 h-3" /> <span>{error}</span></p>}
        </div>
    );
};

// ============================================================================
//                       PÁGINA DE EDIÇÃO
// ============================================================================

export default function EditarEventoFaceAFacePage() {
    const params = useParams();
    const eventoId = params.id as string;

    const [formData, setFormData] = useState<EventoFaceAFaceFormData>({
        nome_evento: '', tipo: 'Mulheres', data_inicio: '', data_fim: '', data_pre_encontro: null,
        local_evento: '', valor_total: 0, valor_entrada: 0, data_limite_entrada: '',
        informacoes_adicionais: null, chave_pix_admin: null, ativa_para_inscricao: false,
    });
    
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    const router = useRouter();
    const { addToast, ToastContainer } = useToast();

    // Opções
    const tipoEventoOptions = [{ id: 'Mulheres', nome: 'Mulheres' }, { id: 'Homens', nome: 'Homens' }];

    useEffect(() => {
        const fetchEvento = async () => {
            setLoading(true);
            try {
                const data = await getEventoFaceAFace(eventoId);
                if (!data) { addToast('Evento não encontrado.', 'error'); setTimeout(() => router.replace('/admin/eventos-face-a-face'), 2000); return; }
                setFormData({
                    nome_evento: data.nome_evento, tipo: data.tipo,
                    data_inicio: formatDateForInput(data.data_inicio), data_fim: formatDateForInput(data.data_fim),
                    data_pre_encontro: data.data_pre_encontro ? formatDateForInput(data.data_pre_encontro) : null,
                    local_evento: data.local_evento, valor_total: data.valor_total, valor_entrada: data.valor_entrada,
                    data_limite_entrada: formatDateForInput(data.data_limite_entrada),
                    informacoes_adicionais: data.informacoes_adicionais, chave_pix_admin: data.chave_pix_admin,
                    ativa_para_inscricao: data.ativa_para_inscricao,
                });
            } catch (e: any) { addToast(`Erro: ${e.message}`, 'error'); setTimeout(() => router.replace('/admin/eventos-face-a-face'), 2000); } finally { setLoading(false); }
        };
        if (eventoId) fetchEvento();
    }, [eventoId, router, addToast]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) : (value === '' ? null : value) }));
        if (!touched[name]) setTouched(prev => ({ ...prev, [name]: true }));
    }, [touched]);

    const handleSelectChange = useCallback((name: string, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value as EventoFaceAFaceTipo }));
        if (!touched[name]) setTouched(prev => ({ ...prev, [name]: true }));
    }, [touched]);

    const handleToggleChange = useCallback(() => {
        setFormData(prev => ({ ...prev, ativa_para_inscricao: !prev.ativa_para_inscricao }));
        if (!touched.ativa_para_inscricao) setTouched(prev => ({ ...prev, ativa_para_inscricao: true }));
    }, [touched]);

    const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name } = e.target;
        if (!touched[name]) setTouched(prev => ({ ...prev, [name]: true }));
    }, [touched]);

    const getFieldError = (fieldName: keyof EventoFaceAFaceFormData): string | null => {
        if (!touched[fieldName]) return null;
        const value = formData[fieldName];
        if (fieldName === 'nome_evento' && (!value || !(value as string).trim())) return 'Nome obrigatório.';
        if (fieldName === 'data_inicio' && !value) return 'Obrigatório.';
        if (fieldName === 'data_fim' && !value) return 'Obrigatório.';
        if (fieldName === 'local_evento' && (!value || !(value as string).trim())) return 'Obrigatório.';
        if ((fieldName === 'valor_total' || fieldName === 'valor_entrada') && (value === null || (value as number) <= 0)) return 'Deve ser > 0.';
        if (fieldName === 'data_limite_entrada' && !value) return 'Obrigatório.';
        return null;
    };

    const hasErrors = useCallback(() => {
        const fields = ['nome_evento', 'data_inicio', 'data_fim', 'local_evento', 'valor_total', 'valor_entrada', 'data_limite_entrada'] as (keyof EventoFaceAFaceFormData)[];
        return fields.some(f => getFieldError(f) !== null);
    }, [formData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setTouched(Object.keys(formData).reduce((acc, key) => ({ ...acc, [key]: true }), {}));
        if (hasErrors()) return addToast('Corrija os erros.', 'error');
        setSubmitting(true);
        try {
            await atualizarEventoFaceAFace(eventoId, formData);
            addToast('Evento atualizado!', 'success');
            setTimeout(() => router.push('/admin/eventos-face-a-face'), 1500);
        } catch (e: any) { addToast(`Erro: ${e.message}`, 'error'); } finally { setSubmitting(false); }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><LoadingSpinner /></div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-12 sm:py-8 px-2 sm:px-6 lg:px-8">
            <ToastContainer />
            <div className="max-w-4xl mx-auto mt-4 sm:mt-0">
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                    
                    {/* Header Laranja (Admin Eventos) */}
                    <div className="bg-gradient-to-r from-orange-600 to-amber-600 px-4 py-6 sm:px-6 sm:py-8">
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div>
                                <h1 className="text-2xl font-bold text-white flex items-center gap-2"><FaEdit /> Editar Evento</h1>
                                <p className="text-orange-100 text-sm mt-1">Detalhes e Configurações</p>
                            </div>
                            <Link href="/admin/eventos-face-a-face" className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm flex items-center gap-2 backdrop-blur-sm border border-white/30"><FaArrowLeft /> Voltar</Link>
                        </div>
                    </div>

                    <div className="p-4 sm:p-8">
                        <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <InputField label="Nome do Evento" name="nome_evento" value={formData.nome_evento} onChange={handleChange} onBlur={handleBlur} error={getFieldError('nome_evento')} required icon={FaCalendarAlt} placeholder="Ex: Face a Face 2025" />
                                <CustomSelectSheet label="Tipo" icon={<FaUsers />} value={formData.tipo} onChange={(val) => handleSelectChange('tipo', val)} options={tipoEventoOptions.map(t => ({ id: t.id, nome: t.nome }))} required placeholder="Selecione..." error={getFieldError('tipo')} />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <InputField label="Início" name="data_inicio" value={formData.data_inicio} onChange={handleChange} onBlur={handleBlur} error={getFieldError('data_inicio')} type="date" required icon={FaCalendarAlt} />
                                <InputField label="Fim" name="data_fim" value={formData.data_fim} onChange={handleChange} onBlur={handleBlur} error={getFieldError('data_fim')} type="date" required icon={FaCalendarAlt} />
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <InputField label="Pré-Encontro (Opcional)" name="data_pre_encontro" value={formData.data_pre_encontro} onChange={handleChange} onBlur={handleBlur} error={getFieldError('data_pre_encontro')} type="date" icon={FaCalendarAlt} />
                                <InputField label="Local" name="local_evento" value={formData.local_evento} onChange={handleChange} onBlur={handleBlur} error={getFieldError('local_evento')} required icon={FaMapMarkerAlt} placeholder="Local do evento" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <InputField label="Valor Total" name="valor_total" value={formData.valor_total} onChange={handleChange} onBlur={handleBlur} error={getFieldError('valor_total')} type="number" required icon={FaMoneyBillWave} placeholder="0.00" />
                                <InputField label="Valor Entrada" name="valor_entrada" value={formData.valor_entrada} onChange={handleChange} onBlur={handleBlur} error={getFieldError('valor_entrada')} type="number" required icon={FaMoneyBillWave} placeholder="0.00" />
                                <InputField label="Limite Entrada" name="data_limite_entrada" value={formData.data_limite_entrada} onChange={handleChange} onBlur={handleBlur} error={getFieldError('data_limite_entrada')} type="date" required icon={FaCalendarAlt} />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <InputField label="Chave PIX Admin" name="chave_pix_admin" value={formData.chave_pix_admin} onChange={handleChange} onBlur={handleBlur} icon={FaMoneyBillWave} placeholder="CPF/Email/Aleatória" />
                                <InputField label="Info Adicional" name="informacoes_adicionais" value={formData.informacoes_adicionais} onChange={handleChange} onBlur={handleBlur} type="textarea" rows={4} icon={FaInfoCircle} placeholder="Instruções para os inscritos..." />
                            </div>

                            {/* Status de Ativação (Toggle) */}
                            <div className="bg-white rounded-xl p-4 border border-gray-300 flex items-center justify-between shadow-sm">
                                <div className="flex items-center gap-2">
                                    {formData.ativa_para_inscricao ? <FaToggleOn className="w-6 h-6 text-green-600" /> : <FaToggleOff className="w-6 h-6 text-gray-400" />}
                                    <label htmlFor="ativa_para_inscricao" className="text-sm font-bold text-gray-900 cursor-pointer">Inscrições Abertas?</label>
                                </div>
                                <label htmlFor="ativa_para_inscricao" className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" id="ativa_para_inscricao" name="ativa_para_inscricao" checked={formData.ativa_para_inscricao} onChange={handleToggleChange} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                                </label>
                            </div>

                            {/* Botões */}
                            <div className="flex flex-col-reverse sm:flex-row justify-end gap-4 pt-6 border-t border-gray-200">
                                <Link href="/admin/eventos-face-a-face" className="px-6 py-4 sm:py-3 border-2 border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 text-center">Cancelar</Link>
                                <button type="submit" disabled={submitting || hasErrors()} className="px-6 py-4 sm:py-3 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 shadow-md flex items-center justify-center gap-2">
                                    {submitting ? 'Salvando...' : <><FaSave /> Salvar Alterações</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}