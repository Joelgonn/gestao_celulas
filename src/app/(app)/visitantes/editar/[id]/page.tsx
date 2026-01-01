'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { getVisitante, atualizarVisitante } from '@/lib/data';
import { VisitanteEditFormData } from '@/lib/types';
import { normalizePhoneNumber, formatDateForInput, formatPhoneNumberDisplay } from '@/utils/formatters';
import useToast from '@/hooks/useToast';
import LoadingSpinner from '@/components/LoadingSpinner';

import { 
    FaUser, 
    FaPhone, 
    FaCalendarAlt, 
    FaMapMarkerAlt, 
    FaComment, 
    FaClock, 
    FaSave, 
    FaArrowLeft,
    FaUserEdit,
    FaSearchLocation,
    FaSpinner,
    FaTimes,
    FaPen,
    FaCheckCircle,
    FaChevronDown,
    FaUserTag
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

const CustomSelectSheet = ({ label, value, onChange, options, icon, placeholder = "Selecione..." }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);
    const selectedName = options.find((o: any) => o.id === value)?.nome || null;

    useEffect(() => {
        const handleClick = (e: MouseEvent) => { if (modalRef.current && !modalRef.current.contains(e.target as Node)) setIsOpen(false); };
        if (isOpen) document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [isOpen]);

    return (
        <div className="space-y-1">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2">
                {label}
            </label>
            <button type="button" onClick={() => setIsOpen(true)}
                className="w-full px-4 py-4 border-2 border-gray-100 rounded-2xl flex items-center justify-between bg-gray-50 transition-all hover:border-emerald-200 focus:ring-4 focus:ring-emerald-500/10 outline-none">
                <div className="flex items-center gap-3">
                    <span className="text-emerald-500">{icon}</span>
                    <span className={`text-sm font-bold truncate ${selectedName ? 'text-gray-900' : 'text-gray-400'}`}>{selectedName || placeholder}</span>
                </div>
                <FaChevronDown className="text-gray-300 text-xs ml-2" />
            </button>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
                    <div ref={modalRef} className="w-full sm:max-w-md bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col max-h-[85vh] animate-in slide-in-from-bottom duration-300">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 rounded-t-[2.5rem]">
                            <h3 className="font-black text-gray-800 uppercase tracking-tighter">{label}</h3>
                            <button onClick={() => setIsOpen(false)} className="p-3 bg-gray-200 text-gray-600 rounded-2xl active:scale-90 transition-transform"><FaTimes /></button>
                        </div>
                        <div className="overflow-y-auto p-4 space-y-2 flex-1 pb-10 sm:pb-4">
                            {options.map((option: any) => (
                                <button key={option.id} type="button" onClick={() => { onChange(option.id); setIsOpen(false); }}
                                    className={`w-full text-left px-5 py-4 rounded-2xl flex items-center justify-between transition-all ${value === option.id ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-700 hover:bg-gray-100'}`}>
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

const InputField = ({ label, name, value, onChange, onBlur, error, type = 'text', required = false, icon: Icon, placeholder, isLoading }: any) => {
    const isTextarea = type === 'textarea';
    return (
        <div className="space-y-1">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <div className="relative group">
                {Icon && <Icon className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${error ? "text-red-500" : "text-gray-400 group-focus-within:text-emerald-500"}`} />}
                {isTextarea ? (
                    <textarea name={name} value={value || ''} onChange={onChange} onBlur={onBlur} rows={4} placeholder={placeholder} 
                        className={`w-full px-5 py-4 text-sm font-bold text-gray-700 bg-gray-50 border-2 rounded-2xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all ${error ? 'border-red-300' : 'border-gray-100 focus:border-emerald-500'}`} />
                ) : (
                    <div className="relative">
                        <input type={type} name={name} value={value || ''} onChange={onChange} onBlur={onBlur} required={required} placeholder={placeholder}
                            className={`w-full pl-11 pr-11 py-4 text-sm font-bold text-gray-700 bg-gray-50 border-2 rounded-2xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all ${error ? 'border-red-300' : 'border-gray-100 focus:border-emerald-500'}`} />
                        {isLoading && <FaSpinner className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-emerald-600" />}
                    </div>
                )}
            </div>
        </div>
    );
};

// ============================================================================
//                       PÁGINA PRINCIPAL
// ============================================================================

export default function EditVisitantePage() {
    const params = useParams();
    const visitanteId = params.id as string;
    
    const [formData, setFormData] = useState<any>({
        nome: '', telefone: '', data_primeira_visita: '', data_nascimento: null, endereco: null, data_ultimo_contato: null, observacoes: null, status_conversao: 'Em Contato',
    });
    
    const [cepInput, setCepInput] = useState('');
    const [cepLoading, setCepLoading] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const router = useRouter();
    const { addToast, ToastContainer } = useToast();

    useEffect(() => {
        const fetchVisitante = async () => {
            if (!visitanteId) return;
            setLoading(true);
            try {
                const data = await getVisitante(visitanteId); 
                if (data) {
                    setFormData({
                        nome: data.nome || '',
                        telefone: formatPhoneNumberDisplay(data.telefone) || '',
                        data_primeira_visita: formatDateForInput(data.data_primeira_visita),
                        data_nascimento: data.data_nascimento ? formatDateForInput(data.data_nascimento) : null,
                        endereco: data.endereco || null,
                        data_ultimo_contato: data.data_ultimo_contato ? formatDateForInput(data.data_ultimo_contato) : null,
                        observacoes: data.observacoes || null,
                        status_conversao: data.status_conversao || 'Em Contato',
                    });
                }
            } catch (e) {
                addToast('Erro ao carregar dados.', 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchVisitante();
    }, [visitanteId, addToast]); 

    const handleChange = (e: any) => {
        const { name, value } = e.target;
        let val = value;
        if (name === 'telefone') val = formatPhoneNumberDisplay(normalizePhoneNumber(value));
        setFormData((prev: any) => ({ ...prev, [name]: val }));
    };

    const handleNameBlur = (e: any) => {
        setFormData((prev: any) => ({ ...prev, nome: formatNameTitleCase(e.target.value) }));
    };

    const handleCepBlur = async () => {
        const cleanCep = cepInput.replace(/\D/g, '');
        if (cleanCep.length === 8) {
            setCepLoading(true);
            try {
                const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
                const data = await res.json();
                if (!data.erro) {
                    const fullAddress = `${data.logradouro}, , ${data.bairro} - ${data.localidade}/${data.uf}`;
                    setFormData((p: any) => ({ ...p, endereco: fullAddress }));
                }
            } catch (err) { console.error(err); } finally { setCepLoading(false); }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await atualizarVisitante({ ...formData, telefone: normalizePhoneNumber(formData.telefone) || null }, visitanteId);
            addToast('Visitante atualizado com sucesso!', 'success');
            setTimeout(() => router.push('/visitantes'), 1500);
        } catch (e) {
            addToast('Erro ao atualizar.', 'error');
            setSubmitting(false);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><LoadingSpinner /></div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-12 font-sans">
            <ToastContainer />

            {/* Header Emerald */}
            <div className="bg-gradient-to-br from-emerald-600 to-green-700 pt-8 pb-24 px-4 sm:px-8 shadow-lg">
                <div className="max-w-3xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-5">
                        <Link href="/visitantes" className="bg-white/20 p-3 rounded-2xl text-white hover:bg-white/30 transition-all active:scale-90 backdrop-blur-md border border-white/10">
                            <FaArrowLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                                <FaUserEdit /> Editar Visitante
                            </h1>
                            <p className="text-emerald-100 text-sm font-medium opacity-80 uppercase tracking-widest">Atualização Cadastral</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 sm:px-8 -mt-12">
                <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden">
                    <div className="p-8 sm:p-10 space-y-10">
                        
                        <form onSubmit={handleSubmit} className="space-y-8">
                            {/* Dados Básicos */}
                            <section className="space-y-6">
                                <h2 className="text-lg font-black text-gray-800 flex items-center gap-2 border-b border-gray-50 pb-4">
                                    <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl"><FaUser size={16}/></div>
                                    Dados do Visitante
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <InputField label="Nome Completo" name="nome" value={formData.nome} onChange={handleChange} onBlur={handleNameBlur} required icon={FaPen} />
                                    <InputField label="Telefone / WhatsApp" name="telefone" value={formData.telefone} onChange={handleChange} icon={FaPhone} placeholder="(00) 00000-0000" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <InputField label="Data da 1ª Visita" name="data_primeira_visita" value={formData.data_primeira_visita} onChange={handleChange} type="date" required icon={FaCalendarAlt} />
                                    <InputField label="Data de Nascimento" name="data_nascimento" value={formData.data_nascimento} onChange={handleChange} type="date" icon={FaCalendarAlt} />
                                </div>
                                <CustomSelectSheet label="Status do Acompanhamento" icon={<FaUserTag />} value={formData.status_conversao} onChange={(v:any) => setFormData((p:any) => ({ ...p, status_conversao: v }))} options={[{ id: 'Em Contato', nome: 'Em Contato' }, { id: 'Consolidando', nome: 'Consolidando' }, { id: 'Convertido', nome: 'Convertido' }, { id: 'Afastado', nome: 'Afastado' }]} />
                            </section>

                            {/* Endereço */}
                            <section className="space-y-6">
                                <h2 className="text-lg font-black text-gray-800 flex items-center gap-2 border-b border-gray-50 pb-4">
                                    <div className="p-2 bg-blue-100 text-blue-600 rounded-xl"><FaSearchLocation size={16}/></div>
                                    Localização
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                    <div className="md:col-span-1">
                                        <InputField label="CEP p/ Busca" name="cep" value={cepInput} onChange={(e:any)=>setCepInput(e.target.value)} onBlur={handleCepBlur} icon={FaSearchLocation} placeholder="00000-000" isLoading={cepLoading} />
                                    </div>
                                    <div className="md:col-span-3">
                                        <InputField label="Endereço" name="endereco" value={formData.endereco} onChange={handleChange} icon={FaMapMarkerAlt} placeholder="Rua, número, bairro..." />
                                    </div>
                                </div>
                            </section>

                            {/* Acompanhamento */}
                            <section className="space-y-6">
                                <h2 className="text-lg font-black text-gray-800 flex items-center gap-2 border-b border-gray-50 pb-4">
                                    <div className="p-2 bg-orange-100 text-orange-600 rounded-xl"><FaClock size={16}/></div>
                                    Acompanhamento
                                </h2>
                                <InputField label="Data do Último Contato" name="data_ultimo_contato" value={formData.data_ultimo_contato} onChange={handleChange} type="date" icon={FaClock} />
                                <InputField label="Observações e Anotações" name="observacoes" value={formData.observacoes} onChange={handleChange} type="textarea" icon={FaComment} placeholder="Como foi o último contato? Algum pedido de oração?" />
                            </section>

                            <div className="flex flex-col-reverse sm:flex-row justify-end gap-4 pt-8 border-t border-gray-100">
                                <Link href="/visitantes" className="px-8 py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-all text-center">Cancelar</Link>
                                <button type="submit" disabled={submitting} className="px-10 py-5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-2xl font-black text-lg shadow-lg shadow-emerald-200 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-3 cursor-pointer uppercase">
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