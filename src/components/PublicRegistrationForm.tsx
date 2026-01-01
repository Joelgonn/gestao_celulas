'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { processarInscricaoPublica } from '@/lib/data';
import { InscricaoFaceAFaceTipoParticipacao } from '@/lib/types';
import { formatPhoneNumberDisplay, normalizePhoneNumber } from '@/utils/formatters';
import { 
    FaUser, FaIdCard, FaBirthdayCake, FaPhone, FaMapMarkerAlt, FaRing, FaTshirt, 
    FaTransgender, FaChurch, FaBed, FaUtensils, FaWheelchair, FaPills, FaHeart, 
    FaCheckCircle, FaExclamationTriangle, FaSpinner, FaHandsHelping, FaCalendarAlt,
    FaChevronDown, FaTimes, FaSearch, FaSearchLocation, FaPen, FaMapMarkedAlt, 
    FaBriefcaseMedical, FaArrowRight, FaClipboardCheck
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

    const baseClass = `w-full px-3 py-4 border-2 rounded-2xl focus:outline-none focus:ring-4 focus:ring-purple-500/10 transition-all appearance-none bg-gray-50 text-sm font-bold text-gray-700 ${error ? 'border-red-300' : 'border-gray-100 focus:border-purple-500'}`;

    return (
        <div className="space-y-1">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 flex items-center gap-2">
                <FaBirthdayCake className="text-purple-500" /> Data de Nascimento {required && <span className="text-red-500">*</span>}
            </label>
            <div className="grid grid-cols-3 gap-2">
                <select value={day} onChange={e => handlePartChange('day', e.target.value)} className={baseClass}>
                    <option value="">Dia</option>
                    {Array.from({length:31}, (_,i)=> (i+1).toString().padStart(2,'0')).map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select value={month} onChange={e => handlePartChange('month', e.target.value)} className={baseClass}>
                    <option value="">Mês</option>
                    {['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select value={year} onChange={e => handlePartChange('year', e.target.value)} className={baseClass}>
                    <option value="">Ano</option>
                    {Array.from({length:90}, (_,i)=> (new Date().getFullYear() - i)).map(y => <option key={y} value={y}>{y}</option>)}
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
                        {searchable && (
                            <div className="p-4 border-b border-gray-100 bg-white sticky top-0 z-10">
                                <div className="relative">
                                    <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input type="text" placeholder="Buscar..." autoFocus className="w-full pl-11 pr-4 py-4 bg-gray-100 border-transparent rounded-2xl focus:bg-white focus:ring-4 focus:ring-purple-500/10 transition-all text-sm font-bold" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                                </div>
                            </div>
                        )}
                        <div className="overflow-y-auto p-4 space-y-2 flex-1 pb-10 sm:pb-4">
                            {filtered.map((option: any) => (
                                <button key={option.id} type="button" onClick={() => { onChange(option.id); setIsOpen(false); setSearchTerm(''); }} className={`w-full text-left px-5 py-4 rounded-2xl flex items-center justify-between transition-all ${value === option.id ? 'bg-purple-600 text-white shadow-lg shadow-purple-200' : 'text-gray-700 hover:bg-gray-100'}`}>
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

const InputField = ({ label, name, value, onChange, onBlur, error, type = 'text', required = false, icon: Icon, placeholder, maxLength, rows, toggle, isLoading }: any) => {
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
                    <div className="w-12 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
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
                    <textarea name={name} value={value || ''} onChange={onChange} onBlur={onBlur} rows={rows} placeholder={placeholder} 
                        className={`w-full px-5 py-4 text-sm font-bold text-gray-700 bg-gray-50 border-2 rounded-2xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-purple-500/10 transition-all ${error ? 'border-red-300' : 'border-gray-100 focus:border-purple-500'}`} />
                ) : (
                    <div className="relative">
                        <input type={type} name={name} value={value || ''} onChange={onChange} onBlur={onBlur} required={required} placeholder={placeholder} maxLength={maxLength}
                            className={`w-full pl-11 pr-11 py-4 text-sm font-bold text-gray-700 bg-gray-50 border-2 rounded-2xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-purple-500/10 transition-all ${error ? 'border-red-300' : 'border-gray-100 focus:border-purple-500'}`} />
                        {isLoading && <FaSpinner className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-purple-600" />}
                    </div>
                )}
            </div>
        </div>
    );
};

// Card de Seleção de Papel
const RoleCard = ({ label, description, icon: Icon, isSelected, onClick }: any) => (
    <button type="button" onClick={onClick} className={`w-full p-6 rounded-[2rem] border-2 text-left transition-all group ${isSelected ? 'bg-purple-600 border-purple-600 shadow-xl shadow-purple-100' : 'bg-gray-50 border-gray-100 hover:border-purple-200'}`}>
        <div className="flex items-center gap-5">
            <div className={`p-4 rounded-2xl transition-colors ${isSelected ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-500 group-hover:bg-purple-100 group-hover:text-purple-600'}`}>
                <Icon size={24} />
            </div>
            <div>
                <p className={`font-black uppercase tracking-tighter ${isSelected ? 'text-white' : 'text-gray-900'}`}>{label}</p>
                <p className={`text-xs mt-1 leading-relaxed ${isSelected ? 'text-purple-100' : 'text-gray-500'}`}>{description}</p>
            </div>
            {isSelected && <FaCheckCircle className="ml-auto text-white" size={24} />}
        </div>
    </button>
);

// ============================================================================
//                       PÁGINA PRINCIPAL
// ============================================================================

export default function PublicRegistrationForm({ token, onSuccess, initialName }: Props) {
    const [loading, setLoading] = useState(false);
    const [cepLoading, setCepLoading] = useState(false); 
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [showConfirmationModal, setShowConfirmationModal] = useState(false);
    const [cepInput, setCepInput] = useState('');

    const [formData, setFormData] = useState<any>({
        nome_completo_participante: initialName || '',
        cpf: '', rg: '', data_nascimento: '', idade: null, contato_pessoal: '', contato_emergencia: '',
        endereco_completo: '', bairro: '', cidade: '', estado_civil: '', nome_esposo: '',
        tamanho_camiseta: '', tipo_participacao: 'Encontrista', eh_membro_ib_apascentar: false,
        pertence_outra_igreja: false, nome_outra_igreja: '', dificuldade_dormir_beliche: false,
        restricao_alimentar: false, deficiencia_fisica_mental: false, toma_medicamento_controlado: false,
        descricao_sonhos: ''
    });

    useEffect(() => {
        if (formData.data_nascimento?.length === 10) {
            const birth = new Date(formData.data_nascimento);
            const today = new Date();
            let age = today.getFullYear() - birth.getFullYear();
            const m = today.getMonth() - birth.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
            if (age >= 0 && age < 120) setFormData((prev: any) => ({ ...prev, idade: age }));
        }
    }, [formData.data_nascimento]);

    const handleChange = (e: any) => {
        const { name, value, type, checked } = e.target;
        let val = type === 'checkbox' ? checked : value;
        if (name === 'contato_pessoal' || name === 'contato_emergencia') val = formatPhoneNumberDisplay(normalizePhoneNumber(val));
        setFormData((prev: any) => ({ ...prev, [name]: val }));
    };

    const handleSelectChange = (name: string, value: any) => {
        setFormData((prev: any) => ({ ...prev, [name]: value }));
    };

    const handleCepBlur = async () => {
        const cleanCep = cepInput.replace(/\D/g, '');
        if (cleanCep.length === 8) {
            setCepLoading(true);
            try {
                const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
                const data = await res.json();
                if (!data.erro) setFormData((p: any) => ({ ...p, endereco_completo: `${data.logradouro}, `, bairro: data.bairro, cidade: data.localidade }));
            } catch (err) { console.error(err); } finally { setCepLoading(false); }
        }
    };

    const processSubmission = async () => {
        setLoading(true);
        setShowConfirmationModal(false);
        try {
            const res = await processarInscricaoPublica(token, { ...formData, cpf: normalizePhoneNumber(formData.cpf), contato_pessoal: normalizePhoneNumber(formData.contato_pessoal) });
            if (res.success) onSuccess(); else setErrorMsg(res.message || 'Erro inesperado.');
        } catch (err) { setErrorMsg('Falha na conexão.'); } finally { setLoading(false); }
    };

    const handleSubmit = (e: any) => {
        e.preventDefault();
        if (formData.tipo_participacao === 'Encontreiro') setShowConfirmationModal(true); else processSubmission();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-10 animate-in fade-in duration-700">
            {errorMsg && (
                <div className="bg-red-50 border-l-8 border-red-500 p-5 rounded-2xl flex items-center gap-4 text-red-700 font-bold animate-bounce">
                    <FaExclamationTriangle size={24} /> <p>{errorMsg}</p>
                </div>
            )}

            {/* SEÇÃO 1: PESSOAL */}
            <div className="bg-white p-8 sm:p-10 rounded-[3rem] shadow-xl border border-gray-100 space-y-10">
                <h3 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                    <div className="p-2 bg-purple-100 text-purple-600 rounded-xl"><FaUser size={18}/></div>
                    Seus Dados
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <InputField label="Nome Completo" name="nome_completo_participante" value={formData.nome_completo_participante} onChange={handleChange} onBlur={(e:any)=>setFormData((p:any)=>({...p, nome_completo_participante: formatNameTitleCase(e.target.value)}))} required icon={FaPen} placeholder="Como consta no RG" />
                    <BirthDateSelect value={formData.data_nascimento} onChange={handleChange} required />
                    <InputField label="Idade" name="idade" value={formData.idade || ''} onChange={handleChange} type="number" required icon={FaBirthdayCake} placeholder="Cálculo automático" />
                    <div className="grid grid-cols-2 gap-4">
                        <InputField label="CPF" name="cpf" value={formData.cpf} onChange={handleChange} icon={FaIdCard} placeholder="000.000..." />
                        <InputField label="RG" name="rg" value={formData.rg} onChange={handleChange} icon={FaIdCard} placeholder="Apenas números" />
                    </div>
                    <InputField label="Celular (WhatsApp)" name="contato_pessoal" value={formData.contato_pessoal} onChange={handleChange} required icon={FaPhone} placeholder="(00) 00000-0000" />
                    <InputField label="Contato de Emergência" name="contato_emergencia" value={formData.contato_emergencia} onChange={handleChange} required icon={FaPhone} placeholder="Nome e Telefone de parente" />
                </div>

                <div className="space-y-6">
                    <h3 className="text-lg font-black text-gray-800 flex items-center gap-3">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-xl"><FaSearchLocation size={16}/></div> Localização
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <InputField label="CEP p/ Busca" name="cep" value={cepInput} onChange={(e:any)=>setCepInput(e.target.value)} onBlur={handleCepBlur} icon={FaSearchLocation} placeholder="00000-000" isLoading={cepLoading} />
                        <div className="md:col-span-2">
                            <InputField label="Endereço / Número" name="endereco_completo" value={formData.endereco_completo} onChange={handleChange} required icon={FaMapMarkerAlt} />
                        </div>
                        <InputField label="Bairro" name="bairro" value={formData.bairro} onChange={handleChange} required icon={FaMapMarkerAlt} />
                        <InputField label="Cidade" name="cidade" value={formData.cidade} onChange={handleChange} required icon={FaMapMarkerAlt} />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <CustomSelectSheet label="Estado Civil" value={formData.estado_civil} onChange={(v:any)=>handleSelectChange('estado_civil', v)} icon={<FaRing/>} options={[{id:'SOLTEIRA',nome:'Solteiro(a)'},{id:'CASADA',nome:'Casado(a)'},{id:'DIVORCIADA',nome:'Divorciado(a)'},{id:'VIÚVA',nome:'Viúvo(a)'},{id:'UNIÃO ESTÁVEL',nome:'União Estável'}]} required />
                    <CustomSelectSheet label="Tamanho Camiseta" value={formData.tamanho_camiseta} onChange={(v:any)=>handleSelectChange('tamanho_camiseta', v)} icon={<FaTshirt/>} options={['PP','P','M','G','GG','G1','G2','G3'].map(t=>({id:t,nome:t}))} required />
                </div>
                
                <div className="space-y-4">
                    <label className="text-sm font-black text-gray-400 uppercase tracking-widest ml-1">Qual seu papel neste encontro?</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <RoleCard label="Encontrista" description="Vou participar do encontro para aprender e ser ministrado." icon={FaUser} isSelected={formData.tipo_participacao === 'Encontrista'} onClick={()=>handleSelectChange('tipo_participacao', 'Encontrista')} />
                        <RoleCard label="Encontreiro" description="Sou membro da equipe e vou servir durante o evento." icon={FaHandsHelping} isSelected={formData.tipo_participacao === 'Encontreiro'} onClick={()=>handleSelectChange('tipo_participacao', 'Encontreiro')} />
                    </div>
                </div>
            </div>

            {/* SEÇÃO 2: IGREJA E SAÚDE */}
            <div className="bg-white p-8 sm:p-10 rounded-[3rem] shadow-xl border border-gray-100 space-y-10">
                <h3 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                    <div className="p-2 bg-orange-100 text-orange-600 rounded-xl"><FaBriefcaseMedical size={18}/></div>
                    Igreja e Saúde
                </h3>
                
                <div className="space-y-4">
                    <InputField label="É membro da Igreja Apascentar?" name="eh_membro_ib_apascentar" value={formData.eh_membro_ib_apascentar} onChange={handleChange} toggle icon={FaChurch} />
                    {!formData.eh_membro_ib_apascentar && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in zoom-in-95">
                            <InputField label="Pertence a outra igreja?" name="pertence_outra_igreja" value={formData.pertence_outra_igreja} onChange={handleChange} toggle icon={FaChurch} />
                            {formData.pertence_outra_igreja && <InputField label="Nome da Igreja" name="nome_outra_igreja" value={formData.nome_outra_igreja} onChange={handleChange} required icon={FaPen} />}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InputField label="Dificuldade com Beliche?" name="dificuldade_dormir_beliche" value={formData.dificuldade_dormir_beliche} onChange={handleChange} toggle icon={FaBed} />
                    <InputField label="Restrição Alimentar?" name="restricao_alimentar" value={formData.restricao_alimentar} onChange={handleChange} toggle icon={FaUtensils} />
                    <InputField label="Alguma Deficiência?" name="deficiencia_fisica_mental" value={formData.deficiencia_fisica_mental} onChange={handleChange} toggle icon={FaWheelchair} />
                    <InputField label="Usa Remédio Controlado?" name="toma_medicamento_controlado" value={formData.toma_medicamento_controlado} onChange={handleChange} toggle icon={FaPills} />
                </div>

                <InputField type="textarea" label="Seus Sonhos e Expectativas" name="descricao_sonhos" value={formData.descricao_sonhos} onChange={handleChange} required icon={FaHeart} placeholder="O que você espera que Deus faça na sua vida nesses dias?" rows={4} />
            </div>

            <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-purple-600 to-indigo-700 text-white font-black py-6 rounded-[2rem] shadow-2xl shadow-purple-200 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 flex items-center justify-center gap-3 text-xl uppercase tracking-tighter">
                {loading ? <FaSpinner className="animate-spin" /> : <><FaClipboardCheck /> Finalizar minha Inscrição</>}
            </button>

            {/* Modal de Confirmação de Equipe */}
            {showConfirmationModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[110] p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm p-10 text-center space-y-6 border-t-8 border-amber-500">
                        <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-3xl flex items-center justify-center mx-auto transform rotate-3"><FaExclamationTriangle size={40} /></div>
                        <h3 className="text-2xl font-black text-gray-900 tracking-tight leading-none">Você é da Equipe?</h3>
                        <p className="text-gray-500 text-sm leading-relaxed">Você selecionou a opção <strong>Encontreiro (Serviço)</strong>. Confirma que faz parte da equipe organizacional deste evento?</p>
                        <div className="flex flex-col gap-3">
                            <button type="button" onClick={processSubmission} className="w-full py-4 bg-purple-600 text-white rounded-2xl font-black shadow-lg shadow-purple-100 transition-all active:scale-95 flex items-center justify-center gap-2">SIM, SOU DA EQUIPE</button>
                            <button type="button" onClick={()=>setShowConfirmationModal(false)} className="w-full py-4 bg-gray-100 text-gray-500 rounded-2xl font-bold transition-all active:scale-95">NÃO, QUERO CORRIGIR</button>
                        </div>
                    </div>
                </div>
            )}
        </form>
    );
}

interface Props {
    token: string;
    eventoTipo: 'Mulheres' | 'Homens';
    onSuccess: () => void;
    initialName?: string | null;
}