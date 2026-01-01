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
} from '@/lib/types';
import { formatPhoneNumberDisplay, normalizePhoneNumber, formatDateForInput } from '@/utils/formatters';
import useToast from '@/hooks/useToast';
import LoadingSpinner from '@/components/LoadingSpinner';

import {
    FaArrowLeft, FaEdit, FaSave, FaUser, FaBirthdayCake, FaPhone, FaMapMarkerAlt, 
    FaRing, FaTshirt, FaTransgender, FaChurch, FaBed, FaUtensils, FaWheelchair, FaPills, 
    FaHeart, FaMoneyBillWave, FaCheckCircle, FaFileAlt, 
    FaEye, FaUpload, FaTimes, FaChevronDown, FaSearch, FaIdCard
} from 'react-icons/fa';

// --- COMPONENTES AUXILIARES ---

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
        error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-green-500'
    } ${disabled ? 'bg-gray-100 cursor-not-allowed text-gray-500' : ''}`;

    return (
        <div className="space-y-1">
            <label className="block text-sm font-bold text-gray-800 flex items-center gap-2">
                <FaBirthdayCake className={error ? "text-red-600" : "text-green-600"} /> 
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
        </div>
    );
};

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
                className={`w-full pl-3 pr-3 py-3 border rounded-xl flex items-center justify-between focus:outline-none focus:ring-2 transition-all duration-200 bg-white text-gray-900 ${disabled ? 'bg-gray-100 cursor-not-allowed text-gray-500' : ''} ${error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-green-500'}`}>
                <span className={`text-base truncate ${selectedName ? 'text-gray-900' : 'text-gray-400'}`}>{selectedName || placeholder}</span>
                {!disabled && <FaChevronDown className="text-gray-500 text-xs ml-2" />}
            </button>
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
                                    <input type="text" placeholder="Buscar..." autoFocus className="w-full pl-10 pr-4 py-3 bg-gray-100 text-gray-900 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-green-500 transition-all text-base" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                                </div>
                            </div>
                        )}
                        <div className="overflow-y-auto p-2 space-y-1 flex-1">
                            {filteredOptions.length > 0 ? (filteredOptions.map((option) => {
                                const isSelected = value === option.id;
                                return (
                                    <button key={option.id} type="button" onClick={() => { onChange(option.id); setIsOpen(false); setSearchTerm(''); }} className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-colors ${isSelected ? 'bg-green-50 text-green-800 font-bold' : 'text-gray-900 hover:bg-gray-100'}`}>
                                        <span className="text-base">{option.nome}</span>
                                        {isSelected && <FaCheckCircle className="text-green-600 text-lg" />}
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

interface InputFieldProps {
    label: string; name: string; value: string | number | null | boolean;
    onChange: (e: any) => void; onBlur?: (e: any) => void;
    error?: string | null; type?: string; required?: boolean; icon?: any; placeholder?: string;
    maxLength?: number; rows?: number; disabled?: boolean; readOnly?: boolean; toggle?: boolean;
}
const InputField = ({ label, name, value, onChange, onBlur, error, type = 'text', required = false, icon: Icon, placeholder, maxLength, rows, disabled = false, readOnly = false, toggle }: InputFieldProps) => {
    if (toggle) {
        const booleanValue = !!value;
        return (
            <div className="bg-white rounded-xl p-4 border border-gray-300 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3 pr-2">
                    {Icon && <Icon className={booleanValue ? "w-5 h-5 text-green-700" : "w-5 h-5 text-gray-500"} />}
                    <label htmlFor={name} className="text-sm font-bold text-gray-900 cursor-pointer">{label}</label>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" id={name} name={name} checked={booleanValue} onChange={onChange} className="sr-only peer" disabled={disabled} />
                    <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-green-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all border-gray-300"></div>
                </label>
            </div>
        );
    }

    return (
        <div className="space-y-1">
            <label htmlFor={name} className="block text-sm font-bold text-gray-800 flex items-center gap-2">
                {Icon && <Icon className={error ? "text-red-600" : "text-green-600"} />} 
                {label} {required && <span className="text-red-600">*</span>}
            </label>
            {type === 'textarea' ? (
                <textarea id={name} name={name} value={(value as string) || ''} onChange={onChange} onBlur={onBlur} rows={rows} placeholder={placeholder} maxLength={maxLength} disabled={disabled} readOnly={readOnly}
                    className={`w-full px-4 py-3 text-base text-gray-900 bg-white border rounded-xl focus:outline-none focus:ring-2 transition-all ${error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-green-500'} ${disabled || readOnly ? 'bg-gray-100' : ''}`} />
            ) : (
                <input type={type} id={name} name={name} value={(value || '').toString()} onChange={onChange} onBlur={onBlur} required={required} placeholder={placeholder} maxLength={maxLength} disabled={disabled} readOnly={readOnly}
                    className={`w-full px-4 py-3 text-base text-gray-900 bg-white border rounded-xl focus:outline-none focus:ring-2 transition-all ${error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-green-500'} ${disabled || readOnly ? 'bg-gray-100' : ''}`} />
            )}
            {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
        </div>
    );
};

// ============================================================================
//                       PÁGINA PRINCIPAL
// ============================================================================

export default function LiderEditarInscricaoPage() {
    const params = useParams();
    const eventoId = params.evento_id as string;
    const inscricaoId = params.inscricao_id as string;
    const [inscricaoOriginal, setInscricaoOriginal] = useState<InscricaoFaceAFace | null>(null);
    const [formData, setFormData] = useState<Partial<InscricaoFaceAFace>>({}); 
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    
    // Estados de Upload
    const [fileEntrada, setFileEntrada] = useState<File | null>(null);
    const [uploadingEntrada, setUploadingEntrada] = useState(false);
    const [fileRestante, setFileRestante] = useState<File | null>(null);
    const [uploadingRestante, setUploadingRestante] = useState(false);

    // Refs para os inputs de arquivo (Melhoria para Mobile)
    const inputEntradaRef = useRef<HTMLInputElement>(null);
    const inputRestanteRef = useRef<HTMLInputElement>(null);

    const router = useRouter();
    const { addToast, ToastContainer } = useToast();

    const fetchInscricaoDetails = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getInscricaoFaceAFaceParaLider(inscricaoId);
            if (!data) {
                addToast('Inscrição não encontrada.', 'error');
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

    const handleChange = (e: any) => {
        const { name, value, type, checked } = e.target;
        let newValue = type === 'checkbox' ? checked : value;
        if (name === 'contato_pessoal' || name === 'contato_emergencia') {
            newValue = formatPhoneNumberDisplay(normalizePhoneNumber(value));
        }
        setFormData(prev => ({ ...prev, [name]: newValue }));
        setTouched(prev => ({ ...prev, [name]: true }));
    };

    const handleSelectChange = (name: string, value: any) => {
        setFormData(prev => ({ ...prev, [name]: value }));
        setTouched(prev => ({ ...prev, [name]: true }));
    };

    const getFieldError = (fieldName: string): string | null => {
        if (!touched[fieldName]) return null;
        const value = formData[fieldName as keyof InscricaoFaceAFace];
        if (fieldName === 'nome_completo_participante' && !value) return 'Nome obrigatório.';
        if (['contato_pessoal', 'contato_emergencia'].includes(fieldName) && (!value || normalizePhoneNumber(String(value)).length < 10)) return 'Mín. 10 dígitos.';
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await atualizarInscricaoFaceAFaceLider(inscricaoId, { 
                ...formData, 
                contato_pessoal: normalizePhoneNumber(String(formData.contato_pessoal)), 
                contato_emergencia: normalizePhoneNumber(String(formData.contato_emergencia)) 
            });
            addToast('Dados salvos com sucesso!', 'success');
            await fetchInscricaoDetails();
        } catch (e: any) { 
            addToast(`Erro: ${e.message}`, 'error'); 
        } finally { 
            setSubmitting(false); 
        }
    };

    // --- LOGICA DE UPLOAD REFORÇADA PARA MOBILE ---
    const handleFileUpload = async (tipo: 'entrada' | 'restante') => {
        const file = tipo === 'entrada' ? fileEntrada : fileRestante;
        if (!file) return addToast('Selecione um arquivo primeiro.', 'warning');

        if (tipo === 'entrada') setUploadingEntrada(true); 
        else setUploadingRestante(true);

        try {
            await uploadComprovanteFaceAFace(inscricaoId, tipo, file);
            addToast('Comprovante enviado com sucesso!', 'success');
            
            // Limpa o estado do arquivo local
            if (tipo === 'entrada') setFileEntrada(null);
            else setFileRestante(null);

            await fetchInscricaoDetails();
        } catch (e: any) { 
            addToast(`Erro no upload: ${e.message}`, 'error'); 
        } finally {
            setUploadingEntrada(false); 
            setUploadingRestante(false);
        }
    };

    if (loading || !inscricaoOriginal) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><LoadingSpinner /></div>;
    
    const inscricao = inscricaoOriginal;
    const isComprovanteEntradaUploadable = ['PENDENTE', 'AGUARDANDO_CONFIRMACAO_ENTRADA'].includes(inscricao.status_pagamento);
    const isComprovanteRestanteUploadable = ['ENTRADA_CONFIRMADA', 'AGUARDANDO_CONFIRMACAO_RESTANTE'].includes(inscricao.status_pagamento);

    return (
        <div className="min-h-screen bg-gray-50 pb-12 sm:py-8 px-2 sm:px-6 lg:px-8 font-sans">
            <ToastContainer />
            <div className="max-w-4xl mx-auto mt-4 sm:mt-0">
                <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                    
                    {/* Header */}
                    <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-8 text-white">
                        <div className="flex justify-between items-center">
                            <h1 className="text-2xl font-bold flex items-center gap-3"><FaEdit /> Editar Inscrição</h1>
                            <Link href={`/eventos-face-a-face/${eventoId}/minhas-inscricoes`} className="bg-white/20 p-2 rounded-lg hover:bg-white/30 transition-colors">
                                <FaArrowLeft />
                            </Link>
                        </div>
                    </div>

                    <div className="p-4 sm:p-8 space-y-10">
                        
                        {/* SEÇÃO DE PAGAMENTO E UPLOAD REFEITA PARA MOBILE */}
                        <section className="space-y-6">
                            <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                                <div className="p-2 bg-blue-100 text-blue-600 rounded-xl"><FaMoneyBillWave size={20} /></div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">Pagamento e Comprovantes</h2>
                                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Status: {inscricao.status_pagamento.replace(/_/g, ' ')}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* CARD UPLOAD ENTRADA */}
                                <div className={`p-5 rounded-2xl border-2 transition-all ${isComprovanteEntradaUploadable ? 'border-dashed border-gray-200 bg-gray-50/50' : 'border-solid border-green-100 bg-green-50/30'}`}>
                                    <div className="flex justify-between items-start mb-4">
                                        <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm"><FaFileAlt className="text-blue-500" /> Sinal / Entrada</h3>
                                        {inscricao.caminho_comprovante_entrada && (
                                            <a href={inscricao.caminho_comprovante_entrada} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-xs font-bold hover:underline flex items-center gap-1">
                                                <FaEye /> Ver atual
                                            </a>
                                        )}
                                    </div>

                                    {isComprovanteEntradaUploadable ? (
                                        <div className="space-y-3">
                                            {/* Input Escondido mas acessível por Ref */}
                                            <input 
                                                type="file" 
                                                ref={inputEntradaRef} 
                                                onChange={(e) => setFileEntrada(e.target.files?.[0] || null)} 
                                                className="hidden" 
                                                accept="image/*,application/pdf"
                                            />
                                            {/* Botão de Seleção Grande */}
                                            <button 
                                                type="button" 
                                                onClick={() => inputEntradaRef.current?.click()}
                                                className="w-full py-4 px-4 border-2 border-dashed border-blue-200 rounded-xl text-blue-600 text-sm font-medium flex flex-col items-center gap-2 hover:bg-blue-50 transition-colors"
                                            >
                                                {fileEntrada ? <FaCheckCircle className="text-green-500" /> : <FaUpload />}
                                                {fileEntrada ? fileEntrada.name : "Selecionar Comprovante"}
                                            </button>
                                            {/* Botão de Envio */}
                                            <button 
                                                type="button" 
                                                onClick={() => handleFileUpload('entrada')} 
                                                disabled={uploadingEntrada || !fileEntrada} 
                                                className="w-full bg-green-600 text-white py-3 rounded-xl font-bold shadow-md hover:bg-green-700 disabled:opacity-50 disabled:bg-gray-300 transition-all flex items-center justify-center gap-2"
                                            >
                                                {uploadingEntrada ? <LoadingSpinner size="sm" color="white" /> : "Fazer Upload do Sinal"}
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="py-4 text-center text-green-700 text-xs font-bold bg-green-100/50 rounded-xl flex items-center justify-center gap-2">
                                            <FaCheckCircle /> Comprovante de entrada processado
                                        </div>
                                    )}
                                </div>

                                {/* CARD UPLOAD RESTANTE */}
                                <div className={`p-5 rounded-2xl border-2 transition-all ${isComprovanteRestanteUploadable ? 'border-dashed border-gray-200 bg-gray-50/50' : 'border-solid border-green-100 bg-green-50/30'}`}>
                                    <div className="flex justify-between items-start mb-4">
                                        <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm"><FaFileAlt className="text-purple-500" /> Quitação / Restante</h3>
                                        {inscricao.caminho_comprovante_restante && (
                                            <a href={inscricao.caminho_comprovante_restante} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-xs font-bold hover:underline flex items-center gap-1">
                                                <FaEye /> Ver atual
                                            </a>
                                        )}
                                    </div>

                                    {isComprovanteRestanteUploadable ? (
                                        <div className="space-y-3">
                                            <input 
                                                type="file" 
                                                ref={inputRestanteRef} 
                                                onChange={(e) => setFileRestante(e.target.files?.[0] || null)} 
                                                className="hidden" 
                                                accept="image/*,application/pdf"
                                            />
                                            <button 
                                                type="button" 
                                                onClick={() => inputRestanteRef.current?.click()}
                                                className="w-full py-4 px-4 border-2 border-dashed border-purple-200 rounded-xl text-purple-600 text-sm font-medium flex flex-col items-center gap-2 hover:bg-purple-50 transition-colors"
                                            >
                                                {fileRestante ? <FaCheckCircle className="text-green-500" /> : <FaUpload />}
                                                {fileRestante ? fileRestante.name : "Selecionar Comprovante"}
                                            </button>
                                            <button 
                                                type="button" 
                                                onClick={() => handleFileUpload('restante')} 
                                                disabled={uploadingRestante || !fileRestante} 
                                                className="w-full bg-green-600 text-white py-3 rounded-xl font-bold shadow-md hover:bg-green-700 disabled:opacity-50 disabled:bg-gray-300 transition-all flex items-center justify-center gap-2"
                                            >
                                                {uploadingRestante ? <LoadingSpinner size="sm" color="white" /> : "Fazer Upload da Quitação"}
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="py-4 text-center text-gray-400 text-xs font-bold bg-gray-100 rounded-xl flex items-center justify-center gap-2">
                                            {inscricao.status_pagamento === 'PAGO_TOTAL' ? <><FaCheckCircle className="text-green-600"/> Pago Total</> : "Aguarde confirmação do sinal"}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>

                        <form onSubmit={handleSubmit} className="space-y-10">
                            {/* DADOS PESSOAIS */}
                            <section className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                                    <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl"><FaUser size={20} /></div>
                                    <h2 className="text-lg font-bold text-gray-800">Dados do Participante</h2>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <InputField label="Nome Completo" name="nome_completo_participante" value={formData.nome_completo_participante ?? ''} onChange={handleChange} error={getFieldError('nome_completo_participante')} required icon={FaUser} disabled={!!inscricao.membro_id} readOnly={!!inscricao.membro_id} />
                                    <BirthDateSelect value={formData.data_nascimento} onChange={handleChange} required disabled={!!inscricao.membro_id} />
                                    <InputField label="Idade" name="idade" value={formData.idade ?? ''} onChange={handleChange} type="number" required icon={FaBirthdayCake} disabled={!!inscricao.membro_id} readOnly={!!inscricao.membro_id} />
                                    <InputField label="CPF" name="cpf" value={formData.cpf ?? ''} onChange={handleChange} icon={FaIdCard} maxLength={14} />
                                    <InputField label="Celular" name="contato_pessoal" value={formData.contato_pessoal ?? ''} onChange={handleChange} required icon={FaPhone} disabled={!!inscricao.membro_id} />
                                    <InputField label="Emergência" name="contato_emergencia" value={formData.contato_emergencia ?? ''} onChange={handleChange} required icon={FaPhone} />
                                </div>
                                <InputField label="Endereço Residencial" name="endereco_completo" value={formData.endereco_completo ?? ''} onChange={handleChange} icon={FaMapMarkerAlt} disabled={!!inscricao.membro_id} />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <CustomSelectSheet label="Estado Civil" icon={<FaRing />} value={formData.estado_civil ?? ''} onChange={(val) => handleSelectChange('estado_civil', val)} options={[{id:'SOLTEIRA',nome:'Solteira'},{id:'CASADA',nome:'Casada'},{id:'DIVORCIADA',nome:'Divorciada'},{id:'VIÚVA',nome:'Viúva'},{id:'UNIÃO ESTÁVEL',nome:'União Estável'}]} required disabled={!!inscricao.membro_id} />
                                    <CustomSelectSheet label="Camiseta" icon={<FaTshirt />} value={formData.tamanho_camiseta ?? ''} onChange={(val) => handleSelectChange('tamanho_camiseta', val)} options={['PP','P','M','G','GG','G1','G2','G3'].map(t=>({id:t,nome:t}))} required />
                                </div>
                            </section>

                            {/* IGREJA E SAÚDE */}
                            <section className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                                    <div className="p-2 bg-orange-100 text-orange-600 rounded-xl"><FaChurch size={20} /></div>
                                    <h2 className="text-lg font-bold text-gray-800">Igreja & Saúde</h2>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <InputField label="Membro da Igreja Apascentar?" name="eh_membro_ib_apascentar" value={formData.eh_membro_ib_apascentar ?? false} onChange={handleChange} type="checkbox" toggle icon={FaChurch} disabled={!!inscricao.membro_id} />
                                    <InputField label="Dificuldade com Beliche?" name="dificuldade_dormir_beliche" value={formData.dificuldade_dormir_beliche ?? false} onChange={handleChange} type="checkbox" toggle icon={FaBed} />
                                    <InputField label="Possui Restrição Alimentar?" name="restricao_alimentar" value={formData.restricao_alimentar ?? false} onChange={handleChange} type="checkbox" toggle icon={FaUtensils} />
                                    <InputField label="Deficiência Física ou Mental?" name="deficiencia_fisica_mental" value={formData.deficiencia_fisica_mental ?? false} onChange={handleChange} type="checkbox" toggle icon={FaWheelchair} />
                                </div>
                                <InputField label="O que você espera de Deus no Face a Face?" name="descricao_sonhos" value={formData.descricao_sonhos ?? ''} onChange={handleChange} type="textarea" rows={4} required icon={FaHeart} placeholder="Conte um pouco sobre suas expectativas..." />
                            </section>

                            {/* AÇÕES FINAIS */}
                            <div className="flex flex-col-reverse sm:flex-row justify-end gap-4 pt-8 border-t border-gray-100">
                                <Link 
                                    href={`/eventos-face-a-face/${eventoId}/minhas-inscricoes`} 
                                    className="px-8 py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-all text-center"
                                >
                                    Cancelar
                                </Link>
                                <button 
                                    type="submit" 
                                    disabled={submitting} 
                                    className="px-8 py-4 bg-green-600 text-white rounded-2xl font-bold shadow-lg shadow-green-600/20 hover:bg-green-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    {submitting ? <LoadingSpinner size="sm" color="white" /> : <><FaSave /> Salvar Alterações</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}