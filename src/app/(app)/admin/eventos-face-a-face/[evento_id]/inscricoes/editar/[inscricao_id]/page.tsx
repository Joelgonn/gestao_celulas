'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
    getInscricaoFaceAFace, 
    atualizarInscricaoFaceAFaceAdmin,
} from '@/lib/data';
import {
    InscricaoFaceAFace,
    InscricaoFaceAFaceStatus,
} from '@/lib/types';
import { formatDateForDisplay, formatPhoneNumberDisplay, normalizePhoneNumber, formatDateForInput } from '@/utils/formatters';
import useToast from '@/hooks/useToast';
import LoadingSpinner from '@/components/LoadingSpinner';

import {
    FaArrowLeft, FaEdit, FaSave, FaUser, FaIdCard, FaBirthdayCake, FaPhone, FaMapMarkerAlt, 
    FaRing, FaTshirt, FaTransgender, FaChurch, FaBed, FaUtensils, FaWheelchair, FaPills, 
    FaHeart, FaMoneyBillWave, FaCheckCircle, FaInfoCircle, FaEye, FaTimes, FaChevronDown, 
    FaSearch, FaSpinner, FaPen, FaCalendarAlt, FaToggleOn, FaToggleOff,
    FaUsers, // Adicionado para corrigir o erro de build
    FaFileAlt
} from 'react-icons/fa';

// --- FUNÇÕES AUXILIARES ---
const formatNameTitleCase = (name: string) => {
    if (!name) return '';
    const exceptions = ['da', 'de', 'do', 'das', 'dos', 'e'];
    return name.toLowerCase().split(' ').map((word, index) => {
        if (index > 0 && exceptions.includes(word)) return word;
        return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
};

// --- COMPONENTES REFINADOS ---

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
        if (newD && newM && newY) {
            onChange({ target: { name: 'data_nascimento', value: `${newY}-${newM}-${newD}` } });
        }
    };

    const years = Array.from({ length: 90 }, (_, i) => new Date().getFullYear() - i);
    const months = [{v:'01',l:'Jan'},{v:'02',l:'Fev'},{v:'03',l:'Mar'},{v:'04',l:'Abr'},{v:'05',l:'Mai'},{v:'06',l:'Jun'},{v:'07',l:'Jul'},{v:'08',l:'Ago'},{v:'09',l:'Set'},{v:'10',l:'Out'},{v:'11',l:'Nov'},{v:'12',l:'Dez'}];
    const baseClass = `w-full px-3 py-4 border-2 rounded-2xl focus:outline-none focus:ring-4 focus:ring-purple-500/10 transition-all appearance-none bg-gray-50 text-sm font-bold text-gray-700 ${error ? 'border-red-300' : 'border-gray-100 focus:border-purple-500'}`;

    return (
        <div className="space-y-1">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 flex items-center gap-2">
                <FaBirthdayCake className="text-purple-500" /> Data de Nascimento {required && <span className="text-red-500">*</span>}
            </label>
            <div className="grid grid-cols-3 gap-2">
                <select value={day} onChange={e => handlePartChange('day', e.target.value)} disabled={disabled} className={baseClass}>
                    <option value="">Dia</option>
                    {Array.from({length:31}, (_,i)=> (i+1).toString().padStart(2,'0')).map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select value={month} onChange={e => handlePartChange('month', e.target.value)} disabled={disabled} className={baseClass}>
                    <option value="">Mês</option>
                    {months.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
                </select>
                <select value={year} onChange={e => handlePartChange('year', e.target.value)} disabled={disabled} className={baseClass}>
                    <option value="">Ano</option>
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
            </div>
        </div>
    );
};

const CustomSelectSheet = ({ label, value, onChange, options, icon, placeholder = "Selecione...", searchable = false, required = false, error }: any) => {
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
            <button type="button" onClick={() => setIsOpen(true)}
                className={`w-full px-4 py-4 border-2 rounded-2xl flex items-center justify-between bg-gray-50 transition-all ${error ? 'border-red-300' : 'border-gray-100 focus:border-purple-500'}`}>
                <div className="flex items-center gap-3 truncate">
                    <span className="text-purple-500">{icon}</span>
                    <span className={`text-sm font-bold truncate ${selectedName ? 'text-gray-900' : 'text-gray-400'}`}>{selectedName || placeholder}</span>
                </div>
                <FaChevronDown className="text-gray-300 text-xs ml-2" />
            </button>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
                    <div ref={modalRef} className="w-full sm:max-w-md bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col max-h-[85vh] animate-in slide-in-from-bottom duration-300">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 rounded-t-[2.5rem]">
                            <h3 className="font-black text-gray-800 uppercase tracking-tighter">{label}</h3>
                            <button onClick={() => setIsOpen(false)} className="p-3 bg-gray-200 text-gray-600 rounded-2xl active:scale-90"><FaTimes /></button>
                        </div>
                        <div className="overflow-y-auto p-4 space-y-2 flex-1 pb-10 sm:pb-4">
                            {filtered.map((option: any) => (
                                <button key={option.id} type="button" onClick={() => { onChange(option.id); setIsOpen(false); }} className={`w-full text-left px-5 py-4 rounded-2xl flex items-center justify-between transition-all ${value === option.id ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-700 hover:bg-gray-100'}`}>
                                    <span className="text-sm font-bold">{option.nome}</span>
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

const InputField = ({ label, name, value, onChange, error, type = 'text', required = false, icon: Icon, placeholder, toggle }: any) => {
    if (toggle) {
        const booleanValue = !!value;
        return (
            <div className={`p-5 rounded-2xl border-2 flex items-center justify-between transition-all ${booleanValue ? 'bg-purple-50 border-purple-200' : 'bg-gray-50 border-gray-100'}`}>
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${booleanValue ? 'bg-purple-100 text-purple-600' : 'bg-gray-200 text-gray-400'}`}>
                        {Icon && <Icon size={20} />}
                    </div>
                    <p className="text-xs font-black text-gray-900 uppercase tracking-tighter">{label}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" name={name} checked={booleanValue} onChange={onChange} className="sr-only peer" />
                    <div className="w-12 h-6 bg-gray-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
            </div>
        );
    }

    return (
        <div className="space-y-1">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2">
                {label} {required && <span className="text-red-600">*</span>}
            </label>
            <div className="relative group">
                {Icon && <Icon className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${error ? "text-red-500" : "text-gray-400 group-focus-within:text-purple-500"}`} />}
                {type === 'textarea' ? (
                    <textarea name={name} value={value || ''} onChange={onChange} rows={3} placeholder={placeholder} 
                        className={`w-full px-5 py-4 text-sm font-bold text-gray-700 bg-gray-50 border-2 rounded-2xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-purple-500/10 transition-all ${error ? 'border-red-300' : 'border-gray-100 focus:border-purple-500'}`} />
                ) : (
                    <input type={type} name={name} value={value || ''} onChange={onChange} required={required} placeholder={placeholder}
                        className={`w-full pl-11 pr-4 py-4 text-sm font-bold text-gray-700 bg-gray-50 border-2 rounded-2xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-purple-500/10 transition-all ${error ? 'border-red-300' : 'border-gray-100 focus:border-purple-500'}`} />
                )}
            </div>
            {error && <p className="text-red-500 text-[10px] font-bold uppercase tracking-tighter ml-1 mt-1">{error}</p>}
        </div>
    );
};

// ============================================================================
//                       PÁGINA PRINCIPAL (ADMIN)
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

    const fetchInscricao = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getInscricaoFaceAFace(inscricaoId);
            if (!data) throw new Error("Não encontrado");
            setInscricaoOriginal(data);
            setFormData({
                ...data,
                contato_pessoal: formatPhoneNumberDisplay(data.contato_pessoal),
                contato_emergencia: formatPhoneNumberDisplay(data.contato_emergencia),
                data_nascimento: data.data_nascimento ? formatDateForInput(data.data_nascimento) : null,
            });
        } catch (e) {
            router.replace(`/admin/eventos-face-a-face/${eventoId}/inscricoes`);
        } finally { setLoading(false); }
    }, [inscricaoId, eventoId, router]);

    useEffect(() => { fetchInscricao(); }, [fetchInscricao]);

    const handleChange = (e: any) => {
        const { name, value, type, checked } = e.target;
        let val = type === 'checkbox' ? checked : value;
        if (name === 'contato_pessoal' || name === 'contato_emergencia') val = formatPhoneNumberDisplay(normalizePhoneNumber(value));
        setFormData(prev => ({ ...prev, [name]: val }));
        setTouched(prev => ({ ...prev, [name]: true }));
    };

    const handleSelectChange = (name: keyof InscricaoFaceAFace, value: any) => {
        setFormData(prev => ({ ...prev, [name]: value }));
        setTouched(prev => ({ ...prev, [name]: true }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await atualizarInscricaoFaceAFaceAdmin(inscricaoId, {
                ...formData,
                contato_pessoal: normalizePhoneNumber(String(formData.contato_pessoal)),
                contato_emergencia: normalizePhoneNumber(String(formData.contato_emergencia)),
            });
            addToast('Registro atualizado!', 'success');
            fetchInscricao();
        } catch (e: any) { addToast(e.message, 'error'); } finally { setSubmitting(false); }
    };

    if (loading || !inscricaoOriginal) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><LoadingSpinner /></div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-12 font-sans">
            <ToastContainer />
            
            <div className="bg-gradient-to-br from-purple-600 to-indigo-700 pt-8 pb-24 px-4 sm:px-8 shadow-lg">
                <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-5">
                        <Link href={`/admin/eventos-face-a-face/${eventoId}/inscricoes`} className="bg-white/20 p-3 rounded-2xl text-white hover:bg-white/30 transition-all active:scale-90 backdrop-blur-md border border-white/10">
                            <FaArrowLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">Admin: Editar Inscrição</h1>
                            <p className="text-purple-100 text-sm font-medium opacity-80 uppercase tracking-widest">{inscricaoOriginal.nome_completo_participante}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-8 -mt-12">
                <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden">
                    <div className="p-8 sm:p-10 space-y-10">
                        
                        {/* Bloco Admin: Financeiro */}
                        <section className="space-y-6 bg-indigo-50 p-6 rounded-[2rem] border border-indigo-100">
                            <h2 className="text-lg font-black text-indigo-900 flex items-center gap-3 mb-4">
                                <FaMoneyBillWave /> Gestão Financeira
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <CustomSelectSheet label="Status de Pagamento" icon={<FaMoneyBillWave />} value={formData.status_pagamento} onChange={(v:any) => handleSelectChange('status_pagamento', v)} options={[{id:'PENDENTE',nome:'Pendente'},{id:'ENTRADA_CONFIRMADA',nome:'Entrada Confirmada'},{id:'PAGO_TOTAL',nome:'Pago Total'},{id:'CANCELADO',nome:'Cancelado'}]} />
                                <InputField label="Obs. Pagamento" name="admin_observacao_pagamento" value={formData.admin_observacao_pagamento} onChange={handleChange} icon={FaInfoCircle} />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                                <InputField label="Confirmar Entrada" name="admin_confirmou_entrada" value={formData.admin_confirmou_entrada} onChange={handleChange} toggle icon={FaCheckCircle} />
                                <InputField label="Confirmar Quitação" name="admin_confirmou_restante" value={formData.admin_confirmou_restante} onChange={handleChange} toggle icon={FaCheckCircle} />
                            </div>
                        </section>

                        <form onSubmit={handleSubmit} className="space-y-10">
                            {/* Bloco 1: Dados do Participante */}
                            <section className="space-y-6">
                                <h2 className="text-lg font-black text-gray-800 flex items-center gap-2 border-b border-gray-50 pb-4">
                                    <div className="p-2 bg-purple-100 text-purple-600 rounded-xl"><FaUser size={16}/></div>
                                    Dados do Participante
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <InputField label="Nome Completo" name="nome_completo_participante" value={formData.nome_completo_participante} onChange={handleChange} required icon={FaPen} />
                                    <BirthDateSelect value={formData.data_nascimento} onChange={handleChange} />
                                    <InputField label="Idade" name="idade" value={formData.idade} onChange={handleChange} type="number" required icon={FaBirthdayCake} />
                                    <InputField label="CPF" name="cpf" value={formData.cpf} onChange={handleChange} icon={FaIdCard} />
                                    <InputField label="Celular" name="contato_pessoal" value={formData.contato_pessoal} onChange={handleChange} required icon={FaPhone} />
                                    <InputField label="Emergência" name="contato_emergencia" value={formData.contato_emergencia} onChange={handleChange} required icon={FaPhone} />
                                </div>
                            </section>

                            {/* Bloco 2: Saúde e Perfil */}
                            <section className="space-y-6">
                                <h2 className="text-lg font-black text-gray-800 flex items-center gap-2 border-b border-gray-50 pb-4">
                                    <div className="p-2 bg-pink-100 text-pink-600 rounded-xl"><FaUsers size={16}/></div>
                                    Perfil e Saúde
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <CustomSelectSheet label="Estado Civil" icon={<FaRing />} value={formData.estado_civil} onChange={(v:any) => handleSelectChange('estado_civil', v)} options={[{id:'SOLTEIRA',nome:'Solteira'},{id:'CASADA',nome:'Casada'},{id:'DIVORCIADA',nome:'Divorciada'},{id:'VIÚVA',nome:'Viúva'},{id:'UNIÃO ESTÁVEL',nome:'União Estável'}]} />
                                    <CustomSelectSheet label="Tamanho Camiseta" icon={<FaTshirt />} value={formData.tamanho_camiseta} onChange={(v:any) => handleSelectChange('tamanho_camiseta', v)} options={['PP','P','M','G','GG','G1','G2','G3'].map(t=>({id:t,nome:t}))} />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <InputField label="Membro IBA?" name="eh_membro_ib_apascentar" value={formData.eh_membro_ib_apascentar} onChange={handleChange} toggle icon={FaChurch} />
                                    <InputField label="Dificuldade Beliche?" name="dificuldade_dormir_beliche" value={formData.dificuldade_dormir_beliche} onChange={handleChange} toggle icon={FaBed} />
                                    <InputField label="Restrição Alimentar?" name="restricao_alimentar" value={formData.restricao_alimentar} onChange={handleChange} toggle icon={FaUtensils} />
                                    <InputField label="Usa Remédios?" name="toma_medicamento_controlado" value={formData.toma_medicamento_controlado} onChange={handleChange} toggle icon={FaPills} />
                                </div>
                            </section>

                            <div className="flex flex-col-reverse sm:flex-row justify-end gap-4 pt-8 border-t border-gray-50">
                                <Link href={`/admin/eventos-face-a-face/${eventoId}/inscricoes`} className="px-8 py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-all text-center">Cancelar</Link>
                                <button type="submit" disabled={submitting} className="px-10 py-5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl font-black text-lg shadow-lg shadow-purple-200 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-3 cursor-pointer uppercase">
                                    {submitting ? <FaSpinner className="animate-spin" /> : <FaSave />} Salvar Alterações (Admin)
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}