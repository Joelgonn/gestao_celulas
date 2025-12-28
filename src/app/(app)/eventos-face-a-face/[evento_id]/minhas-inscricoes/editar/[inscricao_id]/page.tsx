'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
    getInscricaoFaceAFaceParaLider,
    atualizarInscricaoFaceAFaceLider,
    uploadComprovanteFaceAFace,
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

// --- COMPONENTES VISUAIS AUXILIARES ---

// 1. BirthDateSelect (Adaptado para o Painel do Líder)
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

        // Simula o evento de change para o formulário pai
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

    const baseSelectClass = `w-full px-2 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 appearance-none ${
        error ? 'border-red-300 focus:ring-red-500 bg-red-50' : 'border-gray-300 focus:ring-green-500'
    } ${disabled ? 'bg-gray-100 cursor-not-allowed text-gray-500' : 'bg-white'}`;

    return (
        <div className="space-y-1">
            <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                <FaBirthdayCake className={error ? "text-red-500" : "text-green-500"} /> 
                Data de Nascimento {required && <span className="text-red-500">*</span>}
            </label>
            <div className="grid grid-cols-3 gap-2">
                <div className="relative">
                    <select value={day} onChange={(e) => handlePartChange('day', e.target.value)} disabled={disabled} className={baseSelectClass}>
                        <option value="">Dia</option>
                        {days.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    {!disabled && <FaChevronDown className="absolute right-2 top-4 text-gray-400 text-xs pointer-events-none" />}
                </div>
                <div className="relative">
                    <select value={month} onChange={(e) => handlePartChange('month', e.target.value)} disabled={disabled} className={baseSelectClass}>
                        <option value="">Mês</option>
                        {months.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
                    </select>
                    {!disabled && <FaChevronDown className="absolute right-2 top-4 text-gray-400 text-xs pointer-events-none" />}
                </div>
                <div className="relative">
                    <select value={year} onChange={(e) => handlePartChange('year', e.target.value)} disabled={disabled} className={baseSelectClass}>
                        <option value="">Ano</option>
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    {!disabled && <FaChevronDown className="absolute right-2 top-4 text-gray-400 text-xs pointer-events-none" />}
                </div>
            </div>
            {error && <p className="text-red-600 text-sm flex items-center space-x-1"><FaTimes className="w-3 h-3" /> <span>{error}</span></p>}
        </div>
    );
};

// 2. CustomSelectSheet (Manteve igual)
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
            <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                {icon} {label} {required && <span className="text-red-500">*</span>}
            </label>
            <button type="button" onClick={() => !disabled && setIsOpen(true)} disabled={disabled}
                className={`w-full pl-3 pr-3 py-3 border rounded-xl flex items-center justify-between focus:outline-none focus:ring-2 transition-all duration-200 ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'} ${error ? 'border-red-300 focus:ring-red-500 bg-red-50' : 'border-gray-300 focus:ring-green-500'}`}>
                <span className={`text-base truncate ${selectedName ? 'text-gray-900' : 'text-gray-400'}`}>{selectedName || placeholder}</span>
                {!disabled && <FaChevronDown className="text-gray-400 text-xs ml-2" />}
            </button>
            {error && <p className="text-red-600 text-sm flex items-center space-x-1"><FaTimes className="w-3 h-3" /><span>{error}</span></p>}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
                    <div ref={modalRef} className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[600px] animate-in slide-in-from-bottom duration-300">
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50 rounded-t-2xl">
                            <h3 className="font-bold text-gray-800 text-lg">{label}</h3>
                            <button onClick={() => setIsOpen(false)} className="p-2 bg-gray-200 rounded-full text-gray-600 hover:bg-gray-300 transition-colors"><FaTimes /></button>
                        </div>
                        {searchable && (
                            <div className="p-4 border-b border-gray-100 bg-white sticky top-0 z-10">
                                <div className="relative">
                                    <FaSearch className="absolute left-3 top-3.5 text-gray-400" />
                                    <input type="text" placeholder="Buscar..." autoFocus className="w-full pl-10 pr-4 py-3 bg-gray-100 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-green-500 transition-all text-base" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                                </div>
                            </div>
                        )}
                        <div className="overflow-y-auto p-2 space-y-1 flex-1">
                            {filteredOptions.length > 0 ? (filteredOptions.map((option) => {
                                const isSelected = value === option.id;
                                return (
                                    <button key={option.id} type="button" onClick={() => { onChange(option.id); setIsOpen(false); setSearchTerm(''); }} className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-colors ${isSelected ? 'bg-green-50 text-green-700 font-bold' : 'text-gray-700 hover:bg-gray-50'}`}>
                                        <span className="text-base">{option.nome}</span>
                                        {isSelected && <FaCheckCircle className="text-green-500 text-lg" />}
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

// 3. InputField (Com suporte a Toggle - Manteve igual)
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
    
    if (toggle) {
        const booleanValue = !!value;
        return (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {Icon && <Icon className={booleanValue ? "w-5 h-5 text-green-600" : "w-5 h-5 text-gray-400"} />}
                    <label htmlFor={name} className="text-sm font-semibold text-gray-700">{label} {required && <span className="text-red-500">*</span>}</label>
                </div>
                <label htmlFor={name} className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" id={name} name={name} checked={booleanValue} onChange={onChange} className="sr-only peer" disabled={disabled} />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
                {error && <p className="text-red-600 text-sm flex items-center space-x-1 mt-1"><FaTimes className="w-3 h-3" /> <span>{error}</span></p>}
            </div>
        );
    }
    return (
        <div className="space-y-1">
            <label htmlFor={name} className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                {Icon && <Icon className={error ? "text-red-500" : "text-green-500"} />} {label} {required && <span className="text-red-500">*</span>}
            </label>
            <div className="relative">
                {isTextarea ? (
                    <textarea id={name} name={name} value={(value as string) || ''} onChange={onChange} onBlur={onBlur} rows={rows} placeholder={placeholder} maxLength={maxLength} disabled={disabled} readOnly={readOnly}
                        className={`w-full px-4 py-3 text-base border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 resize-none ${error ? 'border-red-300 focus:ring-red-500 bg-red-50' : 'border-gray-300 focus:ring-green-500'} ${disabled || readOnly ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`} />
                ) : (
                    <input type={type} id={name} name={name} value={isCheckbox ? (value as boolean) ? 'on' : '' : (value || '').toString()} checked={isCheckbox ? (value as boolean) : undefined}
                        onChange={isCheckbox ? (e) => onChange({ ...e, target: { ...e.target, value: e.target.checked } as any }) : onChange} onBlur={onBlur} required={required} placeholder={placeholder} maxLength={maxLength} disabled={disabled} readOnly={readOnly}
                        className={`w-full px-4 py-3 text-base border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 ${error ? 'border-red-300 focus:ring-red-500 bg-red-50' : 'border-gray-300 focus:ring-green-500'} ${disabled || readOnly ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'} ${isCheckbox ? 'h-5 w-5' : ''}`} />
                )}
            </div>
            {error && <p className="text-red-600 text-sm flex items-center space-x-1"><FaTimes className="w-3 h-3" /> <span>{error}</span></p>}
        </div>
    );
};

export default function LiderEditarInscricaoPage() {
    const params = useParams();
    const eventoId = params.evento_id as string;
    const inscricaoId = params.inscricao_id as string;
    const [inscricaoOriginal, setInscricaoOriginal] = useState<InscricaoFaceAFace | null>(null);
    const [formData, setFormData] = useState<Partial<InscricaoFaceAFace>>({}); 
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [fileEntrada, setFileEntrada] = useState<File | null>(null);
    const [uploadingEntrada, setUploadingEntrada] = useState(false);
    const [fileRestante, setFileRestante] = useState<File | null>(null);
    const [uploadingRestante, setUploadingRestante] = useState(false);
    const router = useRouter();
    const { addToast, ToastContainer } = useToast();

    // Cálculo automático de idade quando a data muda
    useEffect(() => {
        if (formData.data_nascimento && formData.data_nascimento.length === 10) {
            const birthDate = new Date(formData.data_nascimento);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
            if (age >= 0 && age < 120 && !inscricaoOriginal?.membro_id) { // Só atualiza se não for membro (membros têm idade fixa/vêm do DB)
                setFormData(prev => ({ ...prev, idade: age }));
            }
        }
    }, [formData.data_nascimento, inscricaoOriginal?.membro_id]);

    const fetchInscricaoDetails = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getInscricaoFaceAFaceParaLider(inscricaoId);
            if (!data) {
                addToast('Inscrição não encontrada ou permissão negada.', 'error');
                router.replace(`/eventos-face-a-face/${eventoId}/minhas-inscricoes`);
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
            addToast(`Falha: ${e.message}`, 'error');
        } finally { setLoading(false); }
    }, [inscricaoId, eventoId, router, addToast]);

    useEffect(() => { if (inscricaoId && eventoId) fetchInscricaoDetails(); }, [inscricaoId, eventoId, fetchInscricaoDetails]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { name: string, value: any } }) => {
        const { name, value } = e.target;
        const type = (e.target as HTMLInputElement).type;
        const checked = (e.target as HTMLInputElement).checked;
        
        let newValue: any = value;
        if (type === 'checkbox') newValue = checked;
        else if (name === 'contato_pessoal' || name === 'contato_emergencia') newValue = formatPhoneNumberDisplay(normalizePhoneNumber(value));
        
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

    const getFieldError = (fieldName: keyof InscricaoFaceAFace): string | null => {
        if (!touched[fieldName]) return null;
        const value = formData[fieldName];
        if (fieldName === 'nome_completo_participante' && !value) return 'Nome obrigatório.';
        if ((fieldName === 'contato_pessoal' || fieldName === 'contato_emergencia') && (!value || normalizePhoneNumber(String(value)).length < 10)) return 'Mín. 10 dígitos.';
        if (fieldName === 'estado_civil' && !value) return 'Obrigatório.';
        if (fieldName === 'tamanho_camiseta' && !value) return 'Obrigatório.';
        if (fieldName === 'tipo_participacao' && !value) return 'Obrigatório.';
        if (fieldName === 'nome_esposo' && formData.estado_civil === 'CASADA' && !value) return 'Obrigatório.';
        if (fieldName === 'nome_outra_igreja' && formData.pertence_outra_igreja && !value) return 'Obrigatório.';
        return null;
    };

    const hasErrors = useCallback(() => {
        const fields: (keyof InscricaoFaceAFace)[] = ['nome_completo_participante', 'contato_pessoal', 'estado_civil', 'tamanho_camiseta', 'tipo_participacao'];
        return fields.some(f => getFieldError(f) !== null);
    }, [formData, touched]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setTouched(Object.keys(formData).reduce((acc, key) => ({ ...acc, [key]: true }), {}));
        if (hasErrors()) return addToast('Corrija os erros.', 'error');
        setSubmitting(true);
        try {
            await atualizarInscricaoFaceAFaceLider(inscricaoId, { ...formData, contato_pessoal: normalizePhoneNumber(String(formData.contato_pessoal)), contato_emergencia: normalizePhoneNumber(String(formData.contato_emergencia)) });
            addToast('Atualizado!', 'success');
            await fetchInscricaoDetails();
        } catch (e: any) { addToast(`Erro: ${e.message}`, 'error'); } finally { setSubmitting(false); }
    };

    const handleFileUpload = async (file: File | null, tipo: 'entrada' | 'restante') => {
        if (!file) return addToast('Selecione um arquivo.', 'warning');
        if (tipo === 'entrada') setUploadingEntrada(true); else setUploadingRestante(true);
        try {
            await uploadComprovanteFaceAFace(inscricaoId, tipo, file);
            addToast('Enviado com sucesso!', 'success');
            await fetchInscricaoDetails();
        } catch (e: any) { addToast(`Erro: ${e.message}`, 'error'); } finally {
            if (tipo === 'entrada') { setUploadingEntrada(false); setFileEntrada(null); } else { setUploadingRestante(false); setFileRestante(null); }
        }
    };

    if (loading || !inscricaoOriginal) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><LoadingSpinner /></div>;
    const inscricao = inscricaoOriginal;
    const isComprovanteEntradaUploadable = inscricao.status_pagamento === 'PENDENTE' || inscricao.status_pagamento === 'AGUARDANDO_CONFIRMACAO_ENTRADA';
    const isComprovanteRestanteUploadable = inscricao.status_pagamento === 'ENTRADA_CONFIRMADA' || inscricao.status_pagamento === 'AGUARDANDO_CONFIRMACAO_RESTANTE';

    return (
        <div className="min-h-screen bg-gray-50 pb-12 sm:py-8 px-2 sm:px-6 lg:px-8">
            <ToastContainer />
            <div className="max-w-4xl mx-auto mt-4 sm:mt-0">
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                    <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-6 sm:px-6 sm:py-8">
                        <div className="flex justify-between items-center"><h1 className="text-2xl font-bold text-white flex gap-2"><FaEdit /> Editar Inscrição</h1></div>
                    </div>
                    <div className="p-4 sm:p-8">
                        <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
                            
                            {/* STATUS PAGAMENTO & UPLOAD (Manteve igual, resumido aqui) */}
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                <h2 className="text-lg font-bold text-blue-800 flex items-center gap-2"><FaMoneyBillWave /> Status: {inscricao.status_pagamento.replace(/_/g, ' ')}</h2>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Uploads simplificados */}
                                <div className="bg-gray-50 p-4 rounded-xl border">
                                    <h3 className="font-bold flex gap-2"><FaFileAlt/> Comprovante Entrada</h3>
                                    {inscricao.caminho_comprovante_entrada && <a href={inscricao.caminho_comprovante_entrada} target="_blank" className="text-blue-600 text-sm underline">Ver Enviado</a>}
                                    <input type="file" onChange={(e) => setFileEntrada(e.target.files?.[0] || null)} disabled={!isComprovanteEntradaUploadable} className="w-full mt-2 text-sm" />
                                    <button type="button" onClick={() => handleFileUpload(fileEntrada, 'entrada')} disabled={uploadingEntrada || !fileEntrada} className="mt-2 w-full bg-green-600 text-white py-2 rounded-lg">{uploadingEntrada ? 'Enviando...' : 'Enviar'}</button>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-xl border">
                                    <h3 className="font-bold flex gap-2"><FaFileAlt/> Comprovante Restante</h3>
                                    {inscricao.caminho_comprovante_restante && <a href={inscricao.caminho_comprovante_restante} target="_blank" className="text-blue-600 text-sm underline">Ver Enviado</a>}
                                    <input type="file" onChange={(e) => setFileRestante(e.target.files?.[0] || null)} disabled={!isComprovanteRestanteUploadable} className="w-full mt-2 text-sm" />
                                    <button type="button" onClick={() => handleFileUpload(fileRestante, 'restante')} disabled={uploadingRestante || !fileRestante} className="mt-2 w-full bg-green-600 text-white py-2 rounded-lg">{uploadingRestante ? 'Enviando...' : 'Enviar'}</button>
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-gray-100">
                                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><FaUser /> Dados do Participante</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <InputField label="Nome Completo" name="nome_completo_participante" value={formData.nome_completo_participante ?? ''} onChange={handleChange} onBlur={handleBlur} error={getFieldError('nome_completo_participante')} required icon={FaUser} disabled={!!inscricao.membro_id} readOnly={!!inscricao.membro_id} />
                                    
                                    {/* AQUI ESTÁ A MUDANÇA: BirthDateSelect */}
                                    <BirthDateSelect 
                                        value={formData.data_nascimento} 
                                        onChange={handleChange} 
                                        required 
                                        disabled={!!inscricao.membro_id} 
                                        error={getFieldError('data_nascimento')} 
                                    />

                                    <InputField label="Idade" name="idade" value={formData.idade ?? ''} onChange={handleChange} onBlur={handleBlur} error={getFieldError('idade')} type="number" required icon={FaBirthdayCake} disabled={!!inscricao.membro_id} readOnly={!!inscricao.membro_id} />
                                    <InputField label="CPF" name="cpf" value={formData.cpf ?? ''} onChange={handleChange} onBlur={handleBlur} error={getFieldError('cpf')} icon={FaIdCard} maxLength={14} />
                                    <InputField label="RG" name="rg" value={formData.rg ?? ''} onChange={handleChange} onBlur={handleBlur} icon={FaIdCard} />
                                    <InputField label="Celular" name="contato_pessoal" value={formData.contato_pessoal ?? ''} onChange={handleChange} onBlur={handleBlur} error={getFieldError('contato_pessoal')} required icon={FaPhone} disabled={!!inscricao.membro_id} readOnly={!!inscricao.membro_id} />
                                    <InputField label="Emergência" name="contato_emergencia" value={formData.contato_emergencia ?? ''} onChange={handleChange} onBlur={handleBlur} error={getFieldError('contato_emergencia')} required icon={FaPhone} />
                                </div>
                                
                                <InputField label="Endereço" name="endereco_completo" value={formData.endereco_completo ?? ''} onChange={handleChange} icon={FaMapMarkerAlt} disabled={!!inscricao.membro_id} readOnly={!!inscricao.membro_id} />
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <CustomSelectSheet label="Estado Civil" icon={<FaRing />} value={formData.estado_civil ?? ''} onChange={(val) => handleSelectChange('estado_civil', val)} options={[{id:'SOLTEIRA',nome:'Solteira'},{id:'CASADA',nome:'Casada'},{id:'DIVORCIADA',nome:'Divorciada'},{id:'VIÚVA',nome:'Viúva'},{id:'UNIÃO ESTÁVEL',nome:'União Estável'}]} required disabled={!!inscricao.membro_id} />
                                    {formData.estado_civil === 'CASADA' && <InputField label="Nome Esposo" name="nome_esposo" value={formData.nome_esposo ?? ''} onChange={handleChange} required icon={FaUser} />}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <CustomSelectSheet label="Camiseta" icon={<FaTshirt />} value={formData.tamanho_camiseta ?? ''} onChange={(val) => handleSelectChange('tamanho_camiseta', val)} options={['PP','P','M','G','GG','G1','G2','G3'].map(t=>({id:t,nome:t}))} required />
                                    <CustomSelectSheet label="Papel" icon={<FaTransgender />} value={formData.tipo_participacao ?? ''} onChange={(val) => handleSelectChange('tipo_participacao', val)} options={[{id:'Encontrista',nome:'Encontrista'},{id:'Encontreiro',nome:'Encontreiro'}]} required />
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-gray-100">
                                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><FaChurch /> Igreja & Saúde</h2>
                                <InputField label="Membro IBA?" name="eh_membro_ib_apascentar" value={formData.eh_membro_ib_apascentar ?? false} onChange={handleChange} type="checkbox" toggle icon={FaChurch} disabled={!!inscricao.membro_id} />
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

                            <div className="flex justify-end gap-4 pt-6">
                                <Link href={`/eventos-face-a-face/${eventoId}/minhas-inscricoes`} className="px-6 py-3 border rounded-xl">Cancelar</Link>
                                <button type="submit" disabled={submitting || loading} className="px-6 py-3 bg-green-600 text-white rounded-xl font-bold">{submitting ? 'Salvando...' : 'Salvar Alterações'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}