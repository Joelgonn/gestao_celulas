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
} from '@/lib/types';
import { formatPhoneNumberDisplay, normalizePhoneNumber, formatDateForInput } from '@/utils/formatters';
import useToast from '@/hooks/useToast';
import LoadingSpinner from '@/components/LoadingSpinner';

import {
    FaArrowLeft, FaSave, FaUser, FaBirthdayCake, FaPhone, FaMapMarkerAlt, 
    FaRing, FaTshirt, FaTransgender, FaChurch, FaBed, FaUtensils, FaWheelchair, FaPills, 
    FaHeart, FaMoneyBillWave, FaCheckCircle, FaFileAlt, 
    FaEye, FaUpload, FaTimes, FaChevronDown, FaSearch, FaIdCard, FaCity, FaMap, FaPen, FaSpinner, FaCloudUploadAlt, FaEdit
} from 'react-icons/fa';

// --- COMPONENTES VISUAIS (ESTILO NOVA INSCRIÇÃO) ---

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

        // Atualiza estado local
        if (type === 'day') setDay(val);
        if (type === 'month') setMonth(val);
        if (type === 'year') setYear(val);

        // Atualiza pai se todos preenchidos
        if ((type === 'day' ? val : day) && (type === 'month' ? val : month) && (type === 'year' ? val : year)) {
             // Recalcula variáveis locais para garantir envio correto
             const finalD = type === 'day' ? val : day;
             const finalM = type === 'month' ? val : month;
             const finalY = type === 'year' ? val : year;
             onChange({ target: { name: 'data_nascimento', value: `${finalY}-${finalM}-${finalD}` } });
        }
    };

    const baseClass = `w-full px-3 py-4 border-2 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all appearance-none bg-gray-50 text-sm font-bold text-gray-700 ${error ? 'border-red-300' : 'border-gray-100 focus:border-emerald-500'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`;

    return (
        <div className="space-y-1">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 flex items-center gap-2">
                <FaBirthdayCake className="text-emerald-500" /> Nascimento {required && <span className="text-red-500">*</span>}
            </label>
            <div className="grid grid-cols-3 gap-2">
                <select value={day} onChange={e => handlePartChange('day', e.target.value)} disabled={disabled} className={baseClass}>
                    <option value="">Dia</option>
                    {Array.from({length:31}, (_,i)=> (i+1).toString().padStart(2,'0')).map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select value={month} onChange={e => handlePartChange('month', e.target.value)} disabled={disabled} className={baseClass}>
                    <option value="">Mês</option>
                    {['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select value={year} onChange={e => handlePartChange('year', e.target.value)} disabled={disabled} className={baseClass}>
                    <option value="">Ano</option>
                    {Array.from({length:90}, (_,i)=> (new Date().getFullYear() - i)).map(y => <option key={y} value={y}>{y}</option>)}
                </select>
            </div>
        </div>
    );
};

const CustomSelectSheet = ({ label, value, onChange, options, icon, placeholder = "Selecione...", searchable = false, required = false, error, disabled = false }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const modalRef = useRef<HTMLDivElement>(null);
    const selectedName = options.find((o: any) => o.id === value)?.nome || null;
    const filtered = options.filter((o: any) => o.nome.toLowerCase().includes(searchTerm.toLowerCase()));

    useEffect(() => {
        const handleClick = (e: MouseEvent) => { if (modalRef.current && !modalRef.current.contains(e.target as Node)) setIsOpen(false); };
        if (isOpen) document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [isOpen]);

    return (
        <div className="space-y-1">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <button type="button" onClick={() => !disabled && setIsOpen(true)} className={`w-full px-4 py-4 border-2 rounded-2xl flex items-center justify-between bg-gray-50 transition-all ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-emerald-200'} ${error ? 'border-red-300' : 'border-gray-100'}`}>
                <div className="flex items-center gap-3 truncate">
                    <span className="text-emerald-500">{icon}</span>
                    <span className={`text-sm font-bold truncate ${selectedName ? 'text-gray-900' : 'text-gray-400'}`}>{selectedName || placeholder}</span>
                </div>
                <FaChevronDown className="text-gray-300 text-xs ml-2" />
            </button>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
                    <div ref={modalRef} className="w-full sm:max-w-md bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col max-h-[85vh] animate-in slide-in-from-bottom duration-300">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <h3 className="font-black text-gray-800 uppercase tracking-tighter">{label}</h3>
                            <button onClick={() => setIsOpen(false)} className="p-3 bg-gray-200 text-gray-600 rounded-2xl active:scale-90"><FaTimes /></button>
                        </div>
                        {searchable && (
                            <div className="p-4 border-b border-gray-100">
                                <div className="relative">
                                    <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input type="text" placeholder="Buscar..." autoFocus className="w-full pl-11 pr-4 py-4 bg-gray-100 border-transparent rounded-2xl focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all text-sm font-bold" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                                </div>
                            </div>
                        )}
                        <div className="overflow-y-auto p-4 space-y-2 flex-1 pb-10 sm:pb-4">
                            {filtered.map((option: any) => (
                                <button key={option.id} type="button" onClick={() => { onChange(option.id); setIsOpen(false); setSearchTerm(''); }} className={`w-full text-left px-5 py-4 rounded-2xl flex items-center justify-between transition-all ${value === option.id ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-700 hover:bg-gray-100'}`}>
                                    <span className="text-sm font-bold truncate">{option.nome}</span>
                                    {value === option.id && <FaCheckCircle className="text-white" />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const InputField = ({ label, name, value, onChange, onBlur, error, type = 'text', required = false, icon: Icon, placeholder, maxLength, rows, disabled = false, readOnly = false, toggle, isLoading }: any) => {
    if (toggle) {
        const booleanValue = !!value;
        return (
            <div className={`p-5 rounded-2xl border-2 flex items-center justify-between transition-all cursor-pointer hover:shadow-sm ${booleanValue ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-100'}`} onClick={() => !disabled && onChange({ target: { name, type: 'checkbox', checked: !booleanValue } })}>
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl transition-colors ${booleanValue ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-200 text-gray-400'}`}>
                        {Icon && <Icon size={20} />}
                    </div>
                    <p className="text-xs font-black text-gray-900 uppercase tracking-tighter select-none">{label}</p>
                </div>
                <div className={`w-12 h-6 rounded-full relative transition-colors ${booleanValue ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${booleanValue ? 'left-7' : 'left-1'}`}></div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-1">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <div className="relative group">
                {Icon && <Icon className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${error ? "text-red-500" : "text-gray-400 group-focus-within:text-emerald-500"}`} />}
                {type === 'textarea' ? (
                    <textarea name={name} value={value || ''} onChange={onChange} onBlur={onBlur} rows={rows} placeholder={placeholder} disabled={disabled} readOnly={readOnly}
                        className={`w-full px-5 py-4 text-sm font-bold text-gray-700 bg-gray-50 border-2 rounded-2xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all ${error ? 'border-red-300' : 'border-gray-100 focus:border-emerald-500'} ${disabled ? 'opacity-50' : ''}`} />
                ) : (
                    <input type={type} name={name} value={value || ''} onChange={onChange} onBlur={onBlur} required={required} placeholder={placeholder} maxLength={maxLength} disabled={disabled} readOnly={readOnly}
                        className={`w-full pl-11 pr-11 py-4 text-sm font-bold text-gray-700 bg-gray-50 border-2 rounded-2xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all ${error ? 'border-red-300' : 'border-gray-100 focus:border-emerald-500'} ${disabled ? 'opacity-50' : ''}`} />
                )}
                {isLoading && <FaSpinner className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-emerald-600" />}
            </div>
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
    
    const [fileEntrada, setFileEntrada] = useState<File | null>(null);
    const [uploadingEntrada, setUploadingEntrada] = useState(false);
    const [fileRestante, setFileRestante] = useState<File | null>(null);
    const [uploadingRestante, setUploadingRestante] = useState(false);

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
                eh_membro_ib_apascentar: data.eh_membro_ib_apascentar || false,
                pertence_outra_igreja: data.pertence_outra_igreja || false,
                toma_medicamento_controlado: data.toma_medicamento_controlado || false,
                deficiencia_fisica_mental: data.deficiencia_fisica_mental || false,
                dificuldade_dormir_beliche: data.dificuldade_dormir_beliche || false,
                restricao_alimentar: data.restricao_alimentar || false,
            });
        } catch (e: any) { addToast(`Falha: ${e.message}`, 'error'); } finally { setLoading(false); }
    }, [inscricaoId, eventoId, router, addToast]);

    useEffect(() => { if (inscricaoId && eventoId) fetchInscricaoDetails(); }, [inscricaoId, eventoId, fetchInscricaoDetails]);

    const handleChange = (e: any) => {
        const { name, value, type, checked } = e.target;
        let newValue = type === 'checkbox' ? checked : value;
        if (name === 'contato_pessoal' || name === 'contato_emergencia') {
            newValue = formatPhoneNumberDisplay(normalizePhoneNumber(value));
        }
        
        if (name === 'eh_membro_ib_apascentar' && checked) setFormData(prev => ({ ...prev, [name]: newValue, pertence_outra_igreja: false, nome_outra_igreja: null }));
        else if (name === 'pertence_outra_igreja' && !checked) setFormData(prev => ({ ...prev, [name]: newValue, nome_outra_igreja: null }));
        else setFormData(prev => ({ ...prev, [name]: newValue }));
        
        setTouched(prev => ({ ...prev, [name]: true }));
    };

    const handleSelectChange = (name: string, value: any) => {
        setFormData(prev => ({ ...prev, [name]: value }));
        if (name === 'estado_civil' && value !== 'CASADA') setFormData(prev => ({ ...prev, nome_esposo: null }));
        setTouched(prev => ({ ...prev, [name]: true }));
    };

    const getFieldError = (fieldName: string): string | null => {
        if (!touched[fieldName]) return null;
        const value = formData[fieldName as keyof InscricaoFaceAFace];
        if (fieldName === 'nome_completo_participante' && !value) return 'Obrigatório.';
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await atualizarInscricaoFaceAFaceLider(inscricaoId, { 
                ...formData, 
                contato_pessoal: normalizePhoneNumber(String(formData.contato_pessoal)), 
                contato_emergencia: normalizePhoneNumber(String(formData.contato_emergencia)),
                cpf: normalizePhoneNumber(String(formData.cpf))
            });
            addToast('Dados salvos com sucesso!', 'success');
            await fetchInscricaoDetails();
        } catch (e: any) { addToast(`Erro: ${e.message}`, 'error'); } finally { setSubmitting(false); }
    };

    const handleFileUpload = async (tipo: 'entrada' | 'restante') => {
        const file = tipo === 'entrada' ? fileEntrada : fileRestante;
        if (!file) return addToast('Selecione um arquivo.', 'warning');
        if (tipo === 'entrada') setUploadingEntrada(true); else setUploadingRestante(true);
        try {
            await uploadComprovanteFaceAFace(inscricaoId, tipo, file);
            addToast('Comprovante enviado!', 'success');
            if (tipo === 'entrada') setFileEntrada(null); else setFileRestante(null);
            await fetchInscricaoDetails();
        } catch (e: any) { addToast(`Erro upload: ${e.message}`, 'error'); } finally { setUploadingEntrada(false); setUploadingRestante(false); }
    };

    if (loading || !inscricaoOriginal) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><LoadingSpinner /></div>;
    
    const inscricao = inscricaoOriginal;
    const isComprovanteEntradaUploadable = ['PENDENTE', 'AGUARDANDO_CONFIRMACAO_ENTRADA'].includes(inscricao.status_pagamento);
    const isComprovanteRestanteUploadable = ['ENTRADA_CONFIRMADA', 'AGUARDANDO_CONFIRMACAO_RESTANTE'].includes(inscricao.status_pagamento);

    return (
        <div className="min-h-screen bg-gray-50 pb-12 font-sans">
            <ToastContainer />
            
            {/* HERO HEADER */}
            <div className="bg-gradient-to-br from-emerald-600 to-green-700 pt-8 pb-24 px-4 sm:px-8 shadow-lg">
                <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-5">
                        <Link href={`/eventos-face-a-face/${eventoId}/minhas-inscricoes`} className="bg-white/20 p-3 rounded-2xl text-white hover:bg-white/30 transition-all active:scale-90 backdrop-blur-md border border-white/10">
                            <FaArrowLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3"><FaEdit /> Editar Inscrição</h1>
                            <p className="text-emerald-100 text-sm font-medium opacity-80 uppercase tracking-widest">Atualizar Dados e Pagamentos</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-8 -mt-12">
                <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden">
                    <div className="p-8 sm:p-10 space-y-10">
                        
                        {/* SEÇÃO PAGAMENTO CARDS */}
                        <section className="space-y-6">
                            <h2 className="text-lg font-black text-gray-800 flex items-center gap-2 border-b border-gray-50 pb-4">
                                <div className="p-2 bg-blue-100 text-blue-600 rounded-xl"><FaMoneyBillWave size={16} /></div> 
                                Pagamentos & Comprovantes
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* CARD ENTRADA */}
                                <div className={`p-6 rounded-3xl border-2 flex flex-col justify-between transition-all ${isComprovanteEntradaUploadable ? 'border-dashed border-gray-200 bg-gray-50' : 'border-solid border-emerald-100 bg-emerald-50/50'}`}>
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide">Sinal / Entrada</h3>
                                        {inscricao.caminho_comprovante_entrada && (
                                            <a href={inscricao.caminho_comprovante_entrada} target="_blank" className="text-blue-600 text-xs font-black hover:underline flex items-center gap-1"><FaEye /> Visualizar</a>
                                        )}
                                    </div>
                                    {isComprovanteEntradaUploadable ? (
                                        <div className="space-y-3">
                                            <input type="file" ref={inputEntradaRef} onChange={(e) => setFileEntrada(e.target.files?.[0] || null)} className="hidden" accept="image/*,application/pdf" />
                                            <button type="button" onClick={() => inputEntradaRef.current?.click()} className="w-full py-4 px-4 bg-white border-2 border-dashed border-gray-300 rounded-2xl text-gray-500 text-sm font-bold flex flex-col items-center gap-2 hover:border-emerald-300 hover:text-emerald-600 transition-all">
                                                {fileEntrada ? <FaCheckCircle className="text-emerald-500 text-2xl" /> : <FaCloudUploadAlt className="text-2xl" />}
                                                {fileEntrada ? fileEntrada.name : "Toque para selecionar"}
                                            </button>
                                            <button onClick={() => handleFileUpload('entrada')} disabled={uploadingEntrada || !fileEntrada} className="w-full bg-emerald-600 text-white py-3 rounded-2xl font-black text-sm shadow-lg shadow-emerald-200 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50">
                                                {uploadingEntrada ? <FaSpinner className="animate-spin mx-auto"/> : "Enviar Comprovante"}
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="p-4 bg-white rounded-2xl border border-emerald-100 flex items-center gap-3 text-emerald-700 font-bold text-sm">
                                            <FaCheckCircle className="text-emerald-500" /> Enviado com sucesso
                                        </div>
                                    )}
                                </div>

                                {/* CARD RESTANTE */}
                                <div className={`p-6 rounded-3xl border-2 flex flex-col justify-between transition-all ${isComprovanteRestanteUploadable ? 'border-dashed border-gray-200 bg-gray-50' : 'border-solid border-purple-100 bg-purple-50/50'}`}>
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide">Quitação / Restante</h3>
                                        {inscricao.caminho_comprovante_restante && (
                                            <a href={inscricao.caminho_comprovante_restante} target="_blank" className="text-blue-600 text-xs font-black hover:underline flex items-center gap-1"><FaEye /> Visualizar</a>
                                        )}
                                    </div>
                                    {isComprovanteRestanteUploadable ? (
                                        <div className="space-y-3">
                                            <input type="file" ref={inputRestanteRef} onChange={(e) => setFileRestante(e.target.files?.[0] || null)} className="hidden" accept="image/*,application/pdf" />
                                            <button type="button" onClick={() => inputRestanteRef.current?.click()} className="w-full py-4 px-4 bg-white border-2 border-dashed border-gray-300 rounded-2xl text-gray-500 text-sm font-bold flex flex-col items-center gap-2 hover:border-purple-300 hover:text-purple-600 transition-all">
                                                {fileRestante ? <FaCheckCircle className="text-purple-500 text-2xl" /> : <FaCloudUploadAlt className="text-2xl" />}
                                                {fileRestante ? fileRestante.name : "Toque para selecionar"}
                                            </button>
                                            <button onClick={() => handleFileUpload('restante')} disabled={uploadingRestante || !fileRestante} className="w-full bg-purple-600 text-white py-3 rounded-2xl font-black text-sm shadow-lg shadow-purple-200 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50">
                                                {uploadingRestante ? <FaSpinner className="animate-spin mx-auto"/> : "Enviar Quitação"}
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="p-4 bg-white rounded-2xl border border-gray-200 flex items-center justify-center text-gray-400 font-bold text-xs uppercase tracking-wide">
                                            {inscricao.status_pagamento === 'PAGO_TOTAL' ? <span className="text-purple-600 flex items-center gap-2"><FaCheckCircle/> Totalmente Pago</span> : "Aguardando..."}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>

                        <form onSubmit={handleSubmit} className="space-y-10">
                            
                            {/* DADOS PESSOAIS */}
                            <section className="space-y-6">
                                <h2 className="text-lg font-black text-gray-800 flex items-center gap-2 border-b border-gray-50 pb-4">
                                    <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl"><FaUser size={16} /></div> Dados Pessoais
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <InputField label="Nome Completo" name="nome_completo_participante" value={formData.nome_completo_participante} onChange={handleChange} required icon={FaPen} disabled={!!inscricao.membro_id} />
                                    <BirthDateSelect value={formData.data_nascimento} onChange={handleChange} required disabled={!!inscricao.membro_id} />
                                    <InputField label="Idade" name="idade" value={formData.idade} onChange={handleChange} type="number" required icon={FaBirthdayCake} disabled={!!inscricao.membro_id} />
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <InputField label="CPF" name="cpf" value={formData.cpf} onChange={handleChange} icon={FaIdCard} disabled={!!inscricao.membro_id} />
                                        <InputField label="RG" name="rg" value={formData.rg} onChange={handleChange} icon={FaIdCard} disabled={!!inscricao.membro_id} />
                                    </div>

                                    <InputField label="Celular" name="contato_pessoal" value={formData.contato_pessoal} onChange={handleChange} required icon={FaPhone} disabled={!!inscricao.membro_id} />
                                    <InputField label="Emergência" name="contato_emergencia" value={formData.contato_emergencia} onChange={handleChange} required icon={FaPhone} />
                                </div>
                            </section>

                            {/* ENDEREÇO */}
                            <section className="space-y-6">
                                <h2 className="text-lg font-black text-gray-800 flex items-center gap-2 border-b border-gray-50 pb-4">
                                    <div className="p-2 bg-blue-100 text-blue-600 rounded-xl"><FaMapMarkerAlt size={16} /></div> Localização
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="md:col-span-3">
                                        <InputField label="Endereço Completo" name="endereco_completo" value={formData.endereco_completo} onChange={handleChange} icon={FaMapMarkerAlt} disabled={!!inscricao.membro_id} />
                                    </div>
                                    <InputField label="Bairro" name="bairro" value={formData.bairro} onChange={handleChange} icon={FaMap} disabled={!!inscricao.membro_id} />
                                    <div className="md:col-span-2">
                                        <InputField label="Cidade" name="cidade" value={formData.cidade} onChange={handleChange} icon={FaCity} disabled={!!inscricao.membro_id} />
                                    </div>
                                </div>
                            </section>

                            {/* PERFIL */}
                            <section className="space-y-6">
                                <h2 className="text-lg font-black text-gray-800 flex items-center gap-2 border-b border-gray-50 pb-4">
                                    <div className="p-2 bg-purple-100 text-purple-600 rounded-xl"><FaTshirt size={16} /></div> Perfil
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <CustomSelectSheet label="Estado Civil" icon={<FaRing />} value={formData.estado_civil} onChange={(val:any) => handleSelectChange('estado_civil', val)} options={[{id:'SOLTEIRA',nome:'Solteira'},{id:'CASADA',nome:'Casada'},{id:'DIVORCIADA',nome:'Divorciada'},{id:'VIÚVA',nome:'Viúva'},{id:'UNIÃO ESTÁVEL',nome:'União Estável'}]} required disabled={!!inscricao.membro_id} />
                                    {formData.estado_civil === 'CASADA' && (
                                        <InputField label="Nome do Cônjuge" name="nome_esposo" value={formData.nome_esposo} onChange={handleChange} icon={FaUser} disabled={!!inscricao.membro_id} />
                                    )}
                                    <CustomSelectSheet label="Camiseta" icon={<FaTshirt />} value={formData.tamanho_camiseta} onChange={(val:any) => handleSelectChange('tamanho_camiseta', val)} options={['PP','P','M','G','GG','G1','G2','G3'].map(t=>({id:t,nome:t}))} required />
                                    <CustomSelectSheet label="Papel no Encontro" icon={<FaTransgender />} value={formData.tipo_participacao} onChange={(val:any) => handleSelectChange('tipo_participacao', val)} options={[{id:'Encontrista',nome:'Encontrista'},{id:'Encontreiro',nome:'Encontreiro'}]} required />
                                </div>
                            </section>

                            {/* IGREJA E SAÚDE */}
                            <section className="space-y-6">
                                <h2 className="text-lg font-black text-gray-800 flex items-center gap-2 border-b border-gray-50 pb-4">
                                    <div className="p-2 bg-orange-100 text-orange-600 rounded-xl"><FaHeart size={16} /></div> Igreja & Saúde
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <InputField label="Membro da IBA?" name="eh_membro_ib_apascentar" value={formData.eh_membro_ib_apascentar} onChange={handleChange} toggle icon={FaChurch} disabled={!!inscricao.membro_id} />
                                    {!formData.eh_membro_ib_apascentar && (
                                        <>
                                            <InputField label="Outra Igreja?" name="pertence_outra_igreja" value={formData.pertence_outra_igreja} onChange={handleChange} toggle icon={FaChurch} />
                                            {formData.pertence_outra_igreja && (
                                                <div className="sm:col-span-2">
                                                    <InputField label="Qual Igreja?" name="nome_outra_igreja" value={formData.nome_outra_igreja} onChange={handleChange} icon={FaChurch} />
                                                </div>
                                            )}
                                        </>
                                    )}
                                    <InputField label="Remédio Controlado?" name="toma_medicamento_controlado" value={formData.toma_medicamento_controlado} onChange={handleChange} toggle icon={FaPills} />
                                    <InputField label="Dificuldade Beliche?" name="dificuldade_dormir_beliche" value={formData.dificuldade_dormir_beliche} onChange={handleChange} toggle icon={FaBed} />
                                    <InputField label="Restrição Alimentar?" name="restricao_alimentar" value={formData.restricao_alimentar} onChange={handleChange} toggle icon={FaUtensils} />
                                    <InputField label="Deficiência Física?" name="deficiencia_fisica_mental" value={formData.deficiencia_fisica_mental} onChange={handleChange} toggle icon={FaWheelchair} />
                                </div>
                                <InputField label="Expectativas para o Encontro" name="descricao_sonhos" value={formData.descricao_sonhos} onChange={handleChange} type="textarea" rows={4} icon={FaHeart} />
                            </section>

                            {/* BOTOES FINAIS */}
                            <div className="flex flex-col-reverse sm:flex-row justify-end gap-4 pt-8 border-t border-gray-100">
                                <Link href={`/eventos-face-a-face/${eventoId}/minhas-inscricoes`} className="px-8 py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-all text-center">Cancelar</Link>
                                <button type="submit" disabled={submitting} className="px-10 py-5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-2xl font-black text-lg shadow-lg shadow-emerald-200 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-3 cursor-pointer uppercase tracking-tighter">
                                    {submitting ? <FaSpinner className="animate-spin" /> : <FaSave />} Salvar Alterações
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}