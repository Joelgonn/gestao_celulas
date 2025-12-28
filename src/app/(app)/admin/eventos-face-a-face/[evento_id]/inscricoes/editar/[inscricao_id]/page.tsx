'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
    getInscricaoFaceAFace, // Função ADMIN
    atualizarInscricaoFaceAFaceAdmin, // Função ADMIN
} from '@/lib/data';
import {
    InscricaoFaceAFace,
    InscricaoFaceAFaceStatus,
    InscricaoFaceAFaceEstadoCivil,
    InscricaoFaceAFaceTamanhoCamiseta,
    InscricaoFaceAFaceTipoParticipacao
} from '@/lib/types';
import { formatDateForDisplay, formatPhoneNumberDisplay, normalizePhoneNumber, formatDateForInput } from '@/utils/formatters';
import useToast from '@/hooks/useToast';
import LoadingSpinner from '@/components/LoadingSpinner';

import {
    FaArrowLeft, FaEdit, FaSave, FaUser, FaIdCard, FaBirthdayCake, FaPhone, FaMapMarkerAlt, 
    FaRing, FaTshirt, FaTransgender, FaChurch, FaBed, FaUtensils, FaWheelchair, FaPills, 
    FaHeart, FaMoneyBillWave, FaCheckCircle, FaTimesCircle, FaInfoCircle, FaFileAlt, 
    FaEye, FaUpload, FaTimes, FaChevronDown, FaSearch, FaCalendarAlt
} from 'react-icons/fa';

// ============================================================================
//                       COMPONENTES VISUAIS (TEMA ADMIN - ROXO)
// ============================================================================

// 1. BirthDateSelect
const BirthDateSelect = ({ value, onChange, required, disabled, error }: any) => {
    const [day, setDay] = useState('');
    const [month, setMonth] = useState('');
    const [year, setYear] = useState('');

    useEffect(() => {
        if (value) {
            const [y, m, d] = value.split('-');
            setYear(y); setMonth(m); setDay(d);
        }
    }, [value]);

    const handlePartChange = (type: 'day' | 'month' | 'year', val: string) => {
        let newD = type === 'day' ? val : day;
        let newM = type === 'month' ? val : month;
        let newY = type === 'year' ? val : year;

        if (type === 'day') setDay(val);
        if (type === 'month') setMonth(val);
        if (type === 'year') setYear(val);

        if (newD && newM && newY) {
            onChange({ target: { name: 'data_nascimento', value: `${newY}-${newM}-${newD}` } });
        } else {
            onChange({ target: { name: 'data_nascimento', value: '' } });
        }
    };

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 90 }, (_, i) => currentYear - i);
    const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, '0'));
    const months = [
        { val: '01', label: 'Jan' }, { val: '02', label: 'Fev' }, { val: '03', label: 'Mar' },
        { val: '04', label: 'Abr' }, { val: '05', label: 'Mai' }, { val: '06', label: 'Jun' },
        { val: '07', label: 'Jul' }, { val: '08', label: 'Ago' }, { val: '09', label: 'Set' },
        { val: '10', label: 'Out' }, { val: '11', label: 'Nov' }, { val: '12', label: 'Dez' }
    ];

    const baseSelectClass = `w-full px-2 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 appearance-none bg-white text-gray-900 ${
        error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-purple-500'
    } ${disabled ? 'bg-gray-100 cursor-not-allowed text-gray-500' : ''}`;

    return (
        <div className="space-y-1">
            <label className="block text-sm font-bold text-gray-800 flex items-center gap-2">
                <FaBirthdayCake className={error ? "text-red-600" : "text-purple-600"} /> 
                Data de Nascimento {required && <span className="text-red-600">*</span>}
            </label>
            <div className="grid grid-cols-3 gap-2">
                <div className="relative">
                    <select value={day} onChange={(e) => handlePartChange('day', e.target.value)} disabled={disabled} className={baseSelectClass}>
                        <option value="">Dia</option>
                        {days.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    {!disabled && <FaChevronDown className="absolute right-2 top-4 text-gray-500 text-xs pointer-events-none" />}
                </div>
                <div className="relative">
                    <select value={month} onChange={(e) => handlePartChange('month', e.target.value)} disabled={disabled} className={baseSelectClass}>
                        <option value="">Mês</option>
                        {months.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
                    </select>
                    {!disabled && <FaChevronDown className="absolute right-2 top-4 text-gray-500 text-xs pointer-events-none" />}
                </div>
                <div className="relative">
                    <select value={year} onChange={(e) => handlePartChange('year', e.target.value)} disabled={disabled} className={baseSelectClass}>
                        <option value="">Ano</option>
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    {!disabled && <FaChevronDown className="absolute right-2 top-4 text-gray-500 text-xs pointer-events-none" />}
                </div>
            </div>
            {error && <p className="text-red-600 text-sm flex items-center space-x-1"><FaTimes className="w-3 h-3" /> <span>{error}</span></p>}
        </div>
    );
};

// 2. CustomSelectSheet
interface CustomSelectSheetProps {
    label: string; value: string; onChange: (value: string) => void; options: { id: string; nome: string }[];
    icon: React.ReactNode; placeholder?: string; searchable?: boolean; required?: boolean; error?: string | null; disabled?: boolean;
}
const CustomSelectSheet = ({ label, value, onChange, options, icon, placeholder = "Selecione...", searchable = false, required = false, error, disabled = false }: CustomSelectSheetProps) => {
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
            <button type="button" onClick={() => !disabled && setIsOpen(true)} disabled={disabled}
                className={`w-full pl-3 pr-3 py-3 border rounded-xl flex items-center justify-between focus:outline-none focus:ring-2 transition-all duration-200 bg-white text-gray-900 ${disabled ? 'bg-gray-100 cursor-not-allowed text-gray-500' : ''} ${error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-purple-500'}`}>
                <span className={`text-base truncate ${selectedName ? 'text-gray-900' : 'text-gray-400'}`}>{selectedName || placeholder}</span>
                {!disabled && <FaChevronDown className="text-gray-500 text-xs ml-2" />}
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
                                    <input type="text" placeholder="Buscar..." autoFocus className="w-full pl-10 pr-4 py-3 bg-gray-100 text-gray-900 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 transition-all text-base" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                                </div>
                            </div>
                        )}
                        <div className="overflow-y-auto p-2 space-y-1 flex-1">
                            {filteredOptions.length > 0 ? (filteredOptions.map((option) => {
                                const isSelected = value === option.id;
                                return (
                                    <button key={option.id} type="button" onClick={() => { onChange(option.id); setIsOpen(false); setSearchTerm(''); }} className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-colors ${isSelected ? 'bg-purple-50 text-purple-800 font-bold' : 'text-gray-900 hover:bg-gray-100'}`}>
                                        <span className="text-base">{option.nome}</span>
                                        {isSelected && <FaCheckCircle className="text-purple-600 text-lg" />}
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

// 3. InputField (COM TOGGLE E CONTRASTE)
interface InputFieldProps {
    label: string; name: keyof InscricaoFaceAFace; value: string | number | null | boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    onBlur?: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    error?: string | null; type?: string; required?: boolean; icon?: any; placeholder?: string;
    maxLength?: number; rows?: number; disabled?: boolean; readOnly?: boolean; toggle?: boolean;
}
const InputField = ({ label, name, value, onChange, onBlur, error, type = 'text', required = false, icon: Icon, placeholder, maxLength, rows, disabled = false, readOnly = false, toggle }: InputFieldProps) => {
    const isTextarea = type === 'textarea';
    const isCheckbox = type === 'checkbox';
    
    // MODO TOGGLE
    if (toggle) {
        const booleanValue = !!value;
        return (
            <div className="bg-white rounded-xl p-4 border border-gray-300 flex items-center justify-between transition-all hover:border-purple-300 shadow-sm">
                <div className="flex items-center gap-3 pr-2">
                    {Icon && <Icon className={booleanValue ? "w-5 h-5 text-purple-700" : "w-5 h-5 text-gray-500"} />}
                    <label htmlFor={name} className="text-sm font-bold text-gray-900 cursor-pointer select-none">
                        {label} {required && <span className="text-red-600">*</span>}
                    </label>
                </div>
                <label htmlFor={name} className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" id={name} name={name} checked={booleanValue} onChange={onChange} className="sr-only peer" disabled={disabled} />
                    {/* Cor roxa para o Admin */}
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
                {error && <p className="text-red-600 text-sm flex items-center space-x-1 mt-1"><FaTimes className="w-3 h-3" /> <span>{error}</span></p>}
            </div>
        );
    }

    // MODO INPUT
    return (
        <div className="space-y-1">
            <label htmlFor={name} className="block text-sm font-bold text-gray-800 flex items-center gap-2">
                {Icon && <Icon className={error ? "text-red-600" : "text-purple-600"} />} 
                {label} {required && <span className="text-red-600">*</span>}
            </label>
            <div className="relative">
                {isTextarea ? (
                    <textarea id={name} name={name} value={(value as string) || ''} onChange={onChange} onBlur={onBlur} rows={rows} placeholder={placeholder} maxLength={maxLength} disabled={disabled} readOnly={readOnly}
                        className={`w-full px-4 py-3 text-base text-gray-900 bg-white border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 resize-none ${error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-purple-500'} ${disabled || readOnly ? 'bg-gray-100 cursor-not-allowed text-gray-600' : ''}`} />
                ) : (
                    <input type={type} id={name} name={name} value={isCheckbox ? (value as boolean) ? 'on' : '' : (value || '').toString()} checked={isCheckbox ? (value as boolean) : undefined}
                        onChange={isCheckbox ? (e) => onChange({ ...e, target: { ...e.target, value: e.target.checked } as any }) : onChange} onBlur={onBlur} required={required} placeholder={placeholder} maxLength={maxLength} disabled={disabled} readOnly={readOnly}
                        className={`w-full px-4 py-3 text-base text-gray-900 bg-white border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 ${error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-purple-500'} ${disabled || readOnly ? 'bg-gray-100 cursor-not-allowed text-gray-600' : ''} ${isCheckbox ? 'h-5 w-5' : ''}`} />
                )}
            </div>
            {error && <p className="text-red-600 text-sm flex items-center space-x-1"><FaTimes className="w-3 h-3" /> <span>{error}</span></p>}
        </div>
    );
};

// ============================================================================
//                       PÁGINA PRINCIPAL DO ADMIN
// ============================================================================

export default function AdminEditarInscricaoPage() {
    const params = useParams();
    const eventoId = params.evento_id as string;
    const inscricaoId = params.inscricao_id as string;

    const [inscricaoOriginal, setInscricaoOriginal] = useState<InscricaoFaceAFace | null>(null);
    const [formData, setFormData] = useState<Partial<InscricaoFaceAFace>>({}); 
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    const router = useRouter();
    const { addToast, ToastContainer } = useToast();

    // Opções
    const estadoCivilOptions = [{id:'SOLTEIRA',nome:'Solteira'},{id:'CASADA',nome:'Casada'},{id:'DIVORCIADA',nome:'Divorciada'},{id:'VIÚVA',nome:'Viúva'},{id:'UNIÃO ESTÁVEL',nome:'União Estável'}];
    const tamanhoCamisetaOptions = ['PP','P','M','G','GG','G1','G2','G3','G4','G5'].map(t=>({id:t,nome:t}));
    const tipoParticipacaoOptions = [{id:'Encontrista',nome:'Encontrista'},{id:'Encontreiro',nome:'Encontreiro'}];
    const statusPagamentoOptions = [
        { id: 'PENDENTE', nome: 'Pendente' },
        { id: 'AGUARDANDO_CONFIRMACAO_ENTRADA', nome: 'Aguardando Conf. Entrada' },
        { id: 'ENTRADA_CONFIRMADA', nome: 'Entrada Confirmada' },
        { id: 'AGUARDANDO_CONFIRMACAO_RESTANTE', nome: 'Aguardando Conf. Restante' },
        { id: 'PAGO_TOTAL', nome: 'Pago Total' },
        { id: 'CANCELADO', nome: 'Cancelado' },
    ];

    // Carregar Dados
    const fetchInscricaoDetails = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getInscricaoFaceAFace(inscricaoId);
            if (!data) {
                addToast('Inscrição não encontrada ou acesso negado.', 'error');
                router.replace(`/admin/eventos-face-a-face/${eventoId}/inscricoes`);
                return;
            }
            setInscricaoOriginal(data);
            setFormData({
                ...data,
                contato_pessoal: formatPhoneNumberDisplay(data.contato_pessoal),
                contato_emergencia: formatPhoneNumberDisplay(data.contato_emergencia),
                data_nascimento: data.data_nascimento ? formatDateForInput(data.data_nascimento) : null,
            });
        } catch (e: any) {
            console.error("Erro:", e);
            addToast(`Falha: ${e.message}`, 'error');
        } finally { setLoading(false); }
    }, [inscricaoId, eventoId, router, addToast]);

    useEffect(() => { if (inscricaoId && eventoId) fetchInscricaoDetails(); }, [inscricaoId, eventoId, fetchInscricaoDetails]);

    // Handlers
    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        let newValue: any = value;
        if (type === 'checkbox') newValue = checked;
        else if (name === 'contato_pessoal' || name === 'contato_emergencia') newValue = formatPhoneNumberDisplay(normalizePhoneNumber(value));
        else if (type === 'number') newValue = value === '' ? null : parseFloat(value);
        
        setFormData(prev => ({ ...prev, [name]: newValue }));
        if (!touched[name]) setTouched(prev => ({ ...prev, [name]: true }));
    }, [touched]);

    const handleSelectChange = useCallback((name: keyof InscricaoFaceAFace, value: string | boolean) => {
        setFormData(prev => ({ ...prev, [name]: value }));
        if (!touched[name]) setTouched(prev => ({ ...prev, [name]: true }));
    }, [touched]);

    const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name } = e.target;
        if (!touched[name]) setTouched(prev => ({ ...prev, [name]: true }));
    }, [touched]);

    // Validação
    const getFieldError = (fieldName: keyof InscricaoFaceAFace): string | null => {
        if (!touched[fieldName]) return null;
        const value = formData[fieldName];
        if (fieldName === 'nome_completo_participante' && !value) return 'Nome obrigatório.';
        if ((fieldName === 'contato_pessoal' || fieldName === 'contato_emergencia') && (!value || normalizePhoneNumber(String(value)).length < 10)) return 'Mín. 10 dígitos.';
        if (fieldName === 'status_pagamento' && !value) return 'Status obrigatório.';
        // ... outras validações conforme necessidade
        return null;
    };

    const hasErrors = useCallback((): boolean => {
        const criticalFields: (keyof InscricaoFaceAFace)[] = ['nome_completo_participante', 'contato_pessoal', 'status_pagamento'];
        return criticalFields.some(field => getFieldError(field) !== null);
    }, [formData, getFieldError]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setTouched(Object.keys(formData).reduce((acc, key) => ({ ...acc, [key]: true }), {}));
        if (hasErrors()) return addToast('Corrija os erros.', 'error');

        setSubmitting(true);
        try {
            const dataToUpdate = {
                ...formData,
                contato_pessoal: normalizePhoneNumber(formData.contato_pessoal as string),
                contato_emergencia: normalizePhoneNumber(formData.contato_emergencia as string),
                cpf: formData.cpf ? normalizePhoneNumber(String(formData.cpf)) : null,
            };
            await atualizarInscricaoFaceAFaceAdmin(inscricaoId, dataToUpdate);
            addToast('Inscrição atualizada!', 'success');
            await fetchInscricaoDetails();
        } catch (e: any) {
            addToast(`Erro: ${e.message}`, 'error');
        } finally { setSubmitting(false); }
    };

    if (loading || !inscricaoOriginal) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><LoadingSpinner /></div>;
    const inscricao = inscricaoOriginal;

    return (
        <div className="min-h-screen bg-gray-50 pb-12 sm:py-8 px-2 sm:px-6 lg:px-8">
            <ToastContainer />
            <div className="max-w-4xl mx-auto mt-4 sm:mt-0">
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                    
                    {/* Header Admin (Roxo) */}
                    <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-6 sm:px-6 sm:py-8">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <h1 className="text-2xl font-bold text-white flex items-center gap-2"><FaEdit /> Admin: Editar Inscrição</h1>
                                <p className="text-purple-100 text-sm mt-1">{inscricao.nome_completo_participante}</p>
                            </div>
                            <Link href={`/admin/eventos-face-a-face/${eventoId}/inscricoes`} className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm flex items-center gap-2 backdrop-blur-sm border border-white/30"><FaArrowLeft /> Voltar</Link>
                        </div>
                    </div>

                    <div className="p-4 sm:p-8">
                        <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
                            
                            {/* GESTÃO FINANCEIRA (ADMIN) */}
                            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-4">
                                <h2 className="text-lg font-bold text-purple-800 flex items-center gap-2"><FaMoneyBillWave /> Financeiro & Status</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <CustomSelectSheet label="Status Pagamento" icon={<FaMoneyBillWave />} value={formData.status_pagamento || ''} onChange={(val) => handleSelectChange('status_pagamento', val as InscricaoFaceAFaceStatus)} options={statusPagamentoOptions.map(o => ({id:o.id, nome:o.nome}))} required />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <p className="text-sm font-bold text-gray-700">Comprovante Entrada</p>
                                        {inscricao.caminho_comprovante_entrada ? <a href={inscricao.caminho_comprovante_entrada} target="_blank" className="text-purple-600 underline text-sm flex items-center gap-1"><FaEye/> Ver Comprovante</a> : <span className="text-gray-400 text-sm">Não enviado</span>}
                                        <InputField label="Confirmar Entrada?" name="admin_confirmou_entrada" value={formData.admin_confirmou_entrada ?? false} onChange={handleChange} type="checkbox" toggle icon={FaCheckCircle} />
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-sm font-bold text-gray-700">Comprovante Restante</p>
                                        {inscricao.caminho_comprovante_restante ? <a href={inscricao.caminho_comprovante_restante} target="_blank" className="text-purple-600 underline text-sm flex items-center gap-1"><FaEye/> Ver Comprovante</a> : <span className="text-gray-400 text-sm">Não enviado</span>}
                                        <InputField label="Confirmar Restante?" name="admin_confirmou_restante" value={formData.admin_confirmou_restante ?? false} onChange={handleChange} type="checkbox" toggle icon={FaCheckCircle} />
                                    </div>
                                </div>
                                <InputField label="Obs. Pagamento" name="admin_observacao_pagamento" value={formData.admin_observacao_pagamento ?? ''} onChange={handleChange} type="textarea" rows={2} icon={FaInfoCircle} />
                            </div>

                            {/* DADOS DO PARTICIPANTE */}
                            <div className="space-y-4 pt-4 border-t border-gray-100">
                                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><FaUser /> Dados do Participante</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <InputField label="Nome Completo" name="nome_completo_participante" value={formData.nome_completo_participante ?? ''} onChange={handleChange} required icon={FaUser} />
                                    <BirthDateSelect value={formData.data_nascimento} onChange={handleChange} />
                                    <InputField label="Idade" name="idade" value={formData.idade ?? ''} onChange={handleChange} type="number" required icon={FaBirthdayCake} />
                                    <InputField label="CPF" name="cpf" value={formData.cpf ?? ''} onChange={handleChange} icon={FaIdCard} maxLength={14} />
                                    <InputField label="RG" name="rg" value={formData.rg ?? ''} onChange={handleChange} icon={FaIdCard} />
                                    <InputField label="Celular" name="contato_pessoal" value={formData.contato_pessoal ?? ''} onChange={handleChange} required icon={FaPhone} />
                                    <InputField label="Emergência" name="contato_emergencia" value={formData.contato_emergencia ?? ''} onChange={handleChange} required icon={FaPhone} />
                                </div>
                                <InputField label="Endereço" name="endereco_completo" value={formData.endereco_completo ?? ''} onChange={handleChange} icon={FaMapMarkerAlt} />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <CustomSelectSheet label="Estado Civil" icon={<FaRing />} value={formData.estado_civil || ''} onChange={(val) => handleSelectChange('estado_civil', val)} options={estadoCivilOptions} required />
                                    {formData.estado_civil === 'CASADA' && <InputField label="Nome Esposo" name="nome_esposo" value={formData.nome_esposo ?? ''} onChange={handleChange} required icon={FaUser} />}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <CustomSelectSheet label="Camiseta" icon={<FaTshirt />} value={formData.tamanho_camiseta || ''} onChange={(val) => handleSelectChange('tamanho_camiseta', val)} options={tamanhoCamisetaOptions} required />
                                    <CustomSelectSheet label="Papel" icon={<FaTransgender />} value={formData.tipo_participacao || ''} onChange={(val) => handleSelectChange('tipo_participacao', val)} options={tipoParticipacaoOptions} required />
                                </div>
                            </div>

                            {/* SAÚDE E IGREJA */}
                            <div className="space-y-4 pt-4 border-t border-gray-100">
                                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><FaChurch /> Detalhes Adicionais</h2>
                                <InputField label="Membro IBA?" name="eh_membro_ib_apascentar" value={formData.eh_membro_ib_apascentar ?? false} onChange={handleChange} type="checkbox" toggle icon={FaChurch} />
                                {!formData.eh_membro_ib_apascentar && (
                                    <>
                                        <InputField label="Outra Igreja?" name="pertence_outra_igreja" value={formData.pertence_outra_igreja ?? false} onChange={handleChange} type="checkbox" toggle icon={FaChurch} />
                                        {formData.pertence_outra_igreja && <InputField label="Qual?" name="nome_outra_igreja" value={formData.nome_outra_igreja ?? ''} onChange={handleChange} required />}
                                    </>
                                )}
                                <InputField label="Dificuldade Beliche?" name="dificuldade_dormir_beliche" value={formData.dificuldade_dormir_beliche ?? false} onChange={handleChange} type="checkbox" toggle icon={FaBed} />
                                <InputField label="Restrição Alimentar?" name="restricao_alimentar" value={formData.restricao_alimentar ?? false} onChange={handleChange} type="checkbox" toggle icon={FaUtensils} />
                                <InputField label="Deficiência?" name="deficiencia_fisica_mental" value={formData.deficiencia_fisica_mental ?? false} onChange={handleChange} type="checkbox" toggle icon={FaWheelchair} />
                                <InputField label="Remédio Controlado?" name="toma_medicamento_controlado" value={formData.toma_medicamento_controlado ?? false} onChange={handleChange} type="checkbox" toggle icon={FaPills} />
                                <InputField label="Sonhos com Deus" name="descricao_sonhos" value={formData.descricao_sonhos ?? ''} onChange={handleChange} type="textarea" required icon={FaHeart} />
                            </div>

                            {/* BOTÕES */}
                            <div className="flex flex-col-reverse sm:flex-row justify-end gap-4 pt-6 border-t border-gray-200">
                                <Link href={`/admin/eventos-face-a-face/${eventoId}/inscricoes`} className="px-6 py-4 sm:py-3 border-2 border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 text-center">Cancelar</Link>
                                <button type="submit" disabled={submitting || loading} className="px-6 py-4 sm:py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 shadow-md flex items-center justify-center gap-2">
                                    {submitting ? 'Salvando...' : <><FaSave /> Salvar (Admin)</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}