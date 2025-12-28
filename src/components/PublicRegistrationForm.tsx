'use client';

import { useState, useEffect, useRef } from 'react';
import { processarInscricaoPublica } from '@/lib/data';
import { InscricaoFaceAFaceTipoParticipacao } from '@/lib/types';
import { formatPhoneNumberDisplay, normalizePhoneNumber } from '@/utils/formatters';
import { 
    FaUser, FaIdCard, FaBirthdayCake, FaPhone, FaMapMarkerAlt, FaRing, FaTshirt, 
    FaTransgender, FaChurch, FaBed, FaUtensils, FaWheelchair, FaPills, FaHeart, 
    FaCheckCircle, FaExclamationTriangle, FaSpinner, FaHandsHelping, FaCalendarAlt,
    FaChevronDown, FaTimes, FaSearch, FaInfoCircle
} from 'react-icons/fa';

// ============================================================================
//                       COMPONENTES VISUAIS (ESTILO APP)
// ============================================================================

// --- 1. CustomSelectSheet (Menu estilo Mobile) ---
interface CustomSelectSheetProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: { id: string; nome: string }[];
    icon: React.ReactNode;
    placeholder?: string;
    searchable?: boolean;
    required?: boolean;
}

const CustomSelectSheet = ({ 
    label, value, onChange, options, icon, placeholder = "Selecione...", searchable = false, required = false
}: CustomSelectSheetProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const modalRef = useRef<HTMLDivElement>(null);

    const selectedName = options.find(o => o.id === value)?.nome || null;
    const filteredOptions = options.filter(option => 
        option.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );

    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = 'unset';
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    return (
        <div className="space-y-1">
            <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                {icon} {label} {required && <span className="text-red-500">*</span>}
            </label>
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="w-full pl-3 pr-3 py-3 border border-gray-300 rounded-xl flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white transition-all duration-200"
            >
                <span className={`text-base truncate ${selectedName ? 'text-gray-900' : 'text-gray-400'}`}>
                    {selectedName || placeholder}
                </span>
                <FaChevronDown className="text-gray-400 text-xs ml-2" />
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
                    <div ref={modalRef} className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[600px] animate-in slide-in-from-bottom duration-300">
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50 rounded-t-2xl">
                            <h3 className="font-bold text-gray-800 text-lg">{label}</h3>
                            <button onClick={() => setIsOpen(false)} className="p-2 bg-gray-200 rounded-full text-gray-600 hover:bg-gray-300 transition-colors">
                                <FaTimes />
                            </button>
                        </div>
                        {searchable && (
                            <div className="p-4 border-b border-gray-100 bg-white sticky top-0 z-10">
                                <div className="relative">
                                    <FaSearch className="absolute left-3 top-3.5 text-gray-400" />
                                    <input type="text" placeholder="Buscar..." autoFocus className="w-full pl-10 pr-4 py-3 bg-gray-100 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 transition-all text-base" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                                </div>
                            </div>
                        )}
                        <div className="overflow-y-auto p-2 space-y-1 flex-1">
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map((option) => {
                                    const isSelected = value === option.id;
                                    return (
                                        <button key={option.id} type="button" onClick={() => { onChange(option.id); setIsOpen(false); setSearchTerm(''); }} className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-colors ${isSelected ? 'bg-purple-50 text-purple-700 font-bold' : 'text-gray-700 hover:bg-gray-50'}`}>
                                            <span className="text-base">{option.nome}</span>
                                            {isSelected && <FaCheckCircle className="text-purple-500 text-lg" />}
                                        </button>
                                    );
                                })
                            ) : (
                                <div className="text-center py-8 text-gray-500">Nenhum item encontrado.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- 2. InputField com Toggle (Estilo iOS) ---
const InputField = ({ label, name, value, onChange, type = 'text', required = false, icon: Icon, placeholder, maxLength, toggle }: any) => {
    // Modo Toggle (Switch)
    if (toggle) {
        const booleanValue = !!value;
        return (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 flex items-center justify-between transition-all hover:border-purple-200">
                <div className="flex items-center gap-3 pr-4">
                    {Icon && <div className={`p-2 rounded-full ${booleanValue ? 'bg-purple-100 text-purple-600' : 'bg-gray-200 text-gray-500'}`}><Icon /></div>}
                    <label htmlFor={name} className="text-sm font-semibold text-gray-700 cursor-pointer select-none">
                        {label} {required && <span className="text-red-500">*</span>}
                    </label>
                </div>
                <label htmlFor={name} className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" id={name} name={name} checked={booleanValue} onChange={onChange} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
            </div>
        );
    }

    // Modo Textarea
    if (type === 'textarea') {
        return (
            <div className="space-y-1">
                <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                    {Icon && <Icon className="text-purple-600" />} {label} {required && <span className="text-red-500">*</span>}
                </label>
                <textarea name={name} value={value || ''} onChange={onChange} required={required} placeholder={placeholder} maxLength={maxLength} rows={4} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all" />
            </div>
        );
    }

    // Modo Input Padrão
    return (
        <div className="space-y-1">
            <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                {Icon && <Icon className="text-purple-600" />} {label} {required && <span className="text-red-500">*</span>}
            </label>
            <input type={type} name={name} value={value || ''} onChange={onChange} required={required} placeholder={placeholder} maxLength={maxLength} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all" />
        </div>
    );
};

// --- 3. RadioCard (Seleção de Papel) ---
const RadioCard = ({ label, description, name, value, currentSelection, onChange, icon: Icon }: any) => {
    const isSelected = value === currentSelection;
    return (
        <label className={`cursor-pointer border-2 p-4 rounded-xl transition-all ${isSelected ? 'border-purple-600 bg-purple-50 shadow-md' : 'border-gray-200 hover:border-purple-300 bg-white'}`}>
            <input type="radio" name={name} value={value} checked={isSelected} onChange={onChange} className="hidden" />
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-full ${isSelected ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700'}`}><Icon size={20} /></div>
                <div>
                    <p className="font-bold text-gray-800">{label}</p>
                    <p className="text-sm text-gray-600">{description}</p>
                </div>
            </div>
        </label>
    );
};

// --- 4. BirthDateSelect (Seletor Inteligente de Data) ---
const BirthDateSelect = ({ value, onChange, required }: any) => {
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
        { val: '01', label: 'Janeiro' }, { val: '02', label: 'Fevereiro' }, { val: '03', label: 'Março' },
        { val: '04', label: 'Abril' }, { val: '05', label: 'Maio' }, { val: '06', label: 'Junho' },
        { val: '07', label: 'Julho' }, { val: '08', label: 'Agosto' }, { val: '09', label: 'Setembro' },
        { val: '10', label: 'Outubro' }, { val: '11', label: 'Novembro' }, { val: '12', label: 'Dezembro' }
    ];

    return (
        <div className="space-y-1">
            <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                <FaBirthdayCake className="text-purple-600" /> Data de Nascimento {required && <span className="text-red-500">*</span>}
            </label>
            <div className="grid grid-cols-3 gap-2">
                <div className="relative">
                    <select value={day} onChange={(e) => handlePartChange('day', e.target.value)} className="w-full px-2 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 bg-white appearance-none" required={required} >
                        <option value="">Dia</option>
                        {days.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <FaChevronDown className="absolute right-3 top-4 text-gray-400 text-xs pointer-events-none" />
                </div>
                <div className="relative">
                    <select value={month} onChange={(e) => handlePartChange('month', e.target.value)} className="w-full px-2 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 bg-white appearance-none" required={required} >
                        <option value="">Mês</option>
                        {months.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
                    </select>
                    <FaChevronDown className="absolute right-3 top-4 text-gray-400 text-xs pointer-events-none" />
                </div>
                <div className="relative">
                    <select value={year} onChange={(e) => handlePartChange('year', e.target.value)} className="w-full px-2 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 bg-white appearance-none" required={required} >
                        <option value="">Ano</option>
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <FaChevronDown className="absolute right-3 top-4 text-gray-400 text-xs pointer-events-none" />
                </div>
            </div>
        </div>
    );
};

// ============================================================================
//                       FORMULÁRIO PRINCIPAL
// ============================================================================

interface Props {
    token: string;
    eventoTipo: 'Mulheres' | 'Homens';
    onSuccess: () => void;
    initialName?: string | null;
}

export default function PublicRegistrationForm({ token, eventoTipo, onSuccess, initialName }: Props) {
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [showConfirmationModal, setShowConfirmationModal] = useState(false);
    
    const participantRole: InscricaoFaceAFaceTipoParticipacao = 'Encontrista';
    const serviceRole: InscricaoFaceAFaceTipoParticipacao = 'Encontreiro';

    const [formData, setFormData] = useState<any>({
        nome_completo_participante: initialName || '',
        cpf: '',
        rg: '',
        data_nascimento: '',
        idade: null,
        contato_pessoal: '',
        contato_emergencia: '',
        endereco_completo: '',
        bairro: '',
        cidade: '',
        estado_civil: '',
        nome_esposo: '',
        tamanho_camiseta: '',
        tipo_participacao: participantRole,
        eh_membro_ib_apascentar: false,
        pertence_outra_igreja: false,
        nome_outra_igreja: '',
        dificuldade_dormir_beliche: false,
        restricao_alimentar: false,
        deficiencia_fisica_mental: false,
        toma_medicamento_controlado: false,
        descricao_sonhos: ''
    });

    useEffect(() => {
        if (formData.data_nascimento && formData.data_nascimento.length === 10) {
            const birthDate = new Date(formData.data_nascimento);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
            if (age >= 0 && age < 120) setFormData((prev: any) => ({ ...prev, idade: age }));
        }
    }, [formData.data_nascimento]);

    const handleChange = (e: any) => {
        const { name, value, type, checked } = e.target;
        // Lógica para Toggle e Checkbox padrão
        const val = type === 'checkbox' ? checked : value;
        
        let finalVal = val;
        if (name === 'contato_pessoal' || name === 'contato_emergencia') {
            finalVal = formatPhoneNumberDisplay(normalizePhoneNumber(val));
        }
        if (name === 'idade') {
            finalVal = val ? parseInt(val, 10) : null;
        }
        
        setFormData((prev: any) => ({ ...prev, [name]: finalVal }));
    };

    const handleSelectChange = (name: string, value: string) => {
        setFormData((prev: any) => ({ ...prev, [name]: value }));
    };

    const processSubmission = async () => {
        setLoading(true);
        setShowConfirmationModal(false);
        const dataToSend = {
            ...formData,
            contato_pessoal: normalizePhoneNumber(formData.contato_pessoal),
            contato_emergencia: normalizePhoneNumber(formData.contato_emergencia),
            cpf: normalizePhoneNumber(formData.cpf),
            rg: formData.rg
        };
        try {
            const result = await processarInscricaoPublica(token, dataToSend);
            if (result.success) onSuccess();
            else setErrorMsg(result.message || 'Erro ao processar inscrição.');
        } catch (err: any) {
            setErrorMsg('Erro de conexão. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        if (formData.tipo_participacao === serviceRole) {
            setShowConfirmationModal(true);
            return;
        }
        await processSubmission();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {errorMsg && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 text-red-700 text-sm mb-6 rounded-r">
                    <p className="font-bold">Atenção:</p>
                    <p>{errorMsg}</p>
                </div>
            )}

            {/* SEÇÃO 1: DADOS PESSOAIS */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
                <h3 className="text-lg font-bold text-gray-800 border-b pb-2">Seus Dados</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField label="Nome Completo" name="nome_completo_participante" value={formData.nome_completo_participante} onChange={handleChange} required icon={FaUser} />
                    
                    <BirthDateSelect value={formData.data_nascimento} onChange={handleChange} required />
                    
                    <InputField label="Idade (Automático)" name="idade" value={formData.idade || ''} onChange={handleChange} type="number" required icon={FaBirthdayCake} placeholder="Calculada automaticamente" />
                    
                    <InputField label="CPF" name="cpf" value={formData.cpf} onChange={handleChange} maxLength={14} icon={FaIdCard} />
                    <InputField label="RG" name="rg" value={formData.rg} onChange={handleChange} icon={FaIdCard} />
                    <InputField label="Celular (WhatsApp)" name="contato_pessoal" value={formData.contato_pessoal} onChange={handleChange} required maxLength={15} icon={FaPhone} />
                    <InputField label="Contato de Emergência" name="contato_emergencia" value={formData.contato_emergencia} onChange={handleChange} required maxLength={15} icon={FaPhone} />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <InputField label="Endereço Completo" name="endereco_completo" value={formData.endereco_completo} onChange={handleChange} icon={FaMapMarkerAlt} />
                    <InputField label="Bairro" name="bairro" value={formData.bairro} onChange={handleChange} icon={FaMapMarkerAlt} />
                    <InputField label="Cidade" name="cidade" value={formData.cidade} onChange={handleChange} icon={FaMapMarkerAlt} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <CustomSelectSheet 
                        label="Estado Civil" 
                        value={formData.estado_civil} 
                        onChange={(val) => handleSelectChange('estado_civil', val)} 
                        icon={<FaRing className="text-purple-600" />}
                        required
                        options={[{id: 'SOLTEIRA', nome: 'Solteiro(a)'}, {id: 'CASADA', nome: 'Casado(a)'}, {id: 'DIVORCIADA', nome: 'Divorciado(a)'}, {id: 'VIÚVA', nome: 'Viúvo(a)'}, {id: 'UNIÃO ESTÁVEL', nome: 'União Estável'}]} 
                    />
                    
                    {formData.estado_civil === 'CASADA' && (
                        <InputField label="Nome do Cônjuge" name="nome_esposo" value={formData.nome_esposo} onChange={handleChange} required icon={FaUser} />
                    )}

                    <CustomSelectSheet 
                        label="Tamanho da Camiseta" 
                        value={formData.tamanho_camiseta} 
                        onChange={(val) => handleSelectChange('tamanho_camiseta', val)} 
                        icon={<FaTshirt className="text-purple-600" />}
                        required
                        options={['PP','P','M','G','GG','G1','G2','G3'].map(t => ({id: t, nome: t}))} 
                    />
                </div>
                
                <h4 className="text-md font-bold text-gray-800 pt-4 flex items-center gap-2">
                    <FaTransgender className="text-purple-600" /> 
                    Qual será o seu Papel no Evento? <span className="text-red-500">*</span>
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <RadioCard label={participantRole} description="Vou participar do evento e receber o ensino." name="tipo_participacao" value={participantRole} currentSelection={formData.tipo_participacao} onChange={handleChange} icon={FaUser} />
                    <RadioCard label={serviceRole} description="Sou da equipe de serviço e vou servir no evento." name="tipo_participacao" value={serviceRole} currentSelection={formData.tipo_participacao} onChange={handleChange} icon={FaHandsHelping} />
                </div>
            </div>

            {/* SEÇÃO 2: INFO IGREJA & SAÚDE */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
                <h3 className="text-lg font-bold text-gray-800 border-b pb-2">Informações da Igreja</h3>
                
                <div className="space-y-3">
                    <InputField 
                        label="É membro da Igreja Batista Apascentar?" 
                        name="eh_membro_ib_apascentar" 
                        value={formData.eh_membro_ib_apascentar} 
                        onChange={handleChange} 
                        type="checkbox" 
                        toggle 
                        icon={FaChurch} 
                    />
                    
                    {!formData.eh_membro_ib_apascentar && (
                        <>
                            <InputField 
                                label="Pertence a outra igreja?" 
                                name="pertence_outra_igreja" 
                                value={formData.pertence_outra_igreja} 
                                onChange={handleChange} 
                                type="checkbox" 
                                toggle 
                                icon={FaChurch} 
                            />
                            {formData.pertence_outra_igreja && (
                                <div className="animate-in fade-in slide-in-from-top-2">
                                    <InputField label="Nome da Igreja" name="nome_outra_igreja" value={formData.nome_outra_igreja} onChange={handleChange} required icon={FaChurch} />
                                </div>
                            )}
                        </>
                    )}
                </div>

                <h3 className="text-lg font-bold text-gray-800 border-b pb-2 pt-4">Saúde e Acomodação</h3>
                <div className="space-y-3">
                    <InputField label="Tem dificuldade para dormir em beliche?" name="dificuldade_dormir_beliche" value={formData.dificuldade_dormir_beliche} onChange={handleChange} type="checkbox" toggle icon={FaBed} />
                    <InputField label="Possui alguma restrição alimentar?" name="restricao_alimentar" value={formData.restricao_alimentar} onChange={handleChange} type="checkbox" toggle icon={FaUtensils} />
                    <InputField label="Possui alguma deficiência física ou mental?" name="deficiencia_fisica_mental" value={formData.deficiencia_fisica_mental} onChange={handleChange} type="checkbox" toggle icon={FaWheelchair} />
                    <InputField label="Toma algum medicamento controlado?" name="toma_medicamento_controlado" value={formData.toma_medicamento_controlado} onChange={handleChange} type="checkbox" toggle icon={FaPills} />
                </div>

                <div className="pt-4">
                    <InputField type="textarea" label="Descreva seus sonhos com Deus" name="descricao_sonhos" value={formData.descricao_sonhos} onChange={handleChange} required icon={FaHeart} placeholder="Quais são suas expectativas para este evento?" />
                </div>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg">
                {loading ? <><FaSpinner className="animate-spin" /> Processando...</> : <><FaCheckCircle /> Confirmar Inscrição</>}
            </button>

            {/* Modal de Confirmação para Equipe */}
            {showConfirmationModal && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4 text-center">
                        <FaExclamationTriangle className="text-yellow-500 text-5xl mx-auto" />
                        <h3 className="text-xl font-bold text-gray-800">Confirmação de {serviceRole}</h3>
                        <p className="text-gray-600">Você selecionou a opção de **Servir ({serviceRole})**. Esta opção é apenas para membros da equipe.</p>
                        <p className="font-semibold text-sm text-gray-800">Você confirma que faz parte da equipe de serviço para este evento?</p>
                        <div className="flex justify-center gap-4 pt-4">
                            <button type="button" onClick={() => setShowConfirmationModal(false)} className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition" disabled={loading}>Voltar e Corrigir</button>
                            <button type="button" onClick={processSubmission} className="px-4 py-2 text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition flex items-center gap-2" disabled={loading}>{loading ? <FaSpinner className="animate-spin" /> : <FaCheckCircle />} Sim, Sou da Equipe</button>
                        </div>
                    </div>
                </div>
            )}
        </form>
    );
}