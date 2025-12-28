'use client';

import { useState, useEffect, useRef } from 'react';
import { processarInscricaoPublica } from '@/lib/data';
import { InscricaoFaceAFaceTipoParticipacao } from '@/lib/types';
import { formatPhoneNumberDisplay, normalizePhoneNumber } from '@/utils/formatters';
import { 
    FaUser, FaIdCard, FaBirthdayCake, FaPhone, FaMapMarkerAlt, FaRing, FaTshirt, 
    FaTransgender, FaChurch, FaBed, FaUtensils, FaWheelchair, FaPills, FaHeart, 
    FaCheckCircle, FaExclamationTriangle, FaSpinner, FaHandsHelping, FaCalendarAlt,
    FaChevronDown, FaTimes, FaSearch
} from 'react-icons/fa';

// ============================================================================
//                       COMPONENTES VISUAIS (PADRONIZADOS)
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
                <FaBirthdayCake className="text-purple-600" /> 
                Data de Nascimento {required && <span className="text-red-600">*</span>}
            </label>
            <div className="grid grid-cols-3 gap-2">
                <div className="relative">
                    <select value={day} onChange={(e) => handlePartChange('day', e.target.value)} disabled={disabled} className={baseSelectClass} required={required}>
                        <option value="">Dia</option>
                        {days.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    {!disabled && <FaChevronDown className="absolute right-2 top-4 text-gray-500 text-xs pointer-events-none" />}
                </div>
                <div className="relative">
                    <select value={month} onChange={(e) => handlePartChange('month', e.target.value)} disabled={disabled} className={baseSelectClass} required={required}>
                        <option value="">Mês</option>
                        {months.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
                    </select>
                    {!disabled && <FaChevronDown className="absolute right-2 top-4 text-gray-500 text-xs pointer-events-none" />}
                </div>
                <div className="relative">
                    <select value={year} onChange={(e) => handlePartChange('year', e.target.value)} disabled={disabled} className={baseSelectClass} required={required}>
                        <option value="">Ano</option>
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    {!disabled && <FaChevronDown className="absolute right-2 top-4 text-gray-500 text-xs pointer-events-none" />}
                </div>
            </div>
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

// 3. InputField (COM TOGGLE E ALTO CONTRASTE)
interface InputFieldProps {
    label: string; name: string; value: string | number | null | boolean;
    onChange: (e: any) => void;
    error?: string | null; type?: string; required?: boolean; icon?: any; placeholder?: string;
    maxLength?: number; rows?: number; disabled?: boolean; readOnly?: boolean; toggle?: boolean;
}
const InputField = ({ label, name, value, onChange, error, type = 'text', required = false, icon: Icon, placeholder, maxLength, rows, disabled = false, readOnly = false, toggle }: InputFieldProps) => {
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
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
            </div>
        );
    }

    // MODO INPUT / TEXTAREA
    return (
        <div className="space-y-1">
            <label htmlFor={name} className="block text-sm font-bold text-gray-800 flex items-center gap-2">
                {Icon && <Icon className={error ? "text-red-600" : "text-purple-600"} />} 
                {label} {required && <span className="text-red-600">*</span>}
            </label>
            <div className="relative">
                {isTextarea ? (
                    <textarea 
                        id={name} name={name} value={(value as string) || ''} onChange={onChange} rows={rows} placeholder={placeholder} maxLength={maxLength} disabled={disabled} readOnly={readOnly}
                        className={`w-full px-4 py-3 text-base text-gray-900 bg-white border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 resize-none ${error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-purple-500'} ${disabled || readOnly ? 'bg-gray-100 cursor-not-allowed text-gray-600' : ''}`} 
                    />
                ) : (
                    <input 
                        type={type} id={name} name={name} value={isCheckbox ? (value as boolean) ? 'on' : '' : (value || '').toString()} checked={isCheckbox ? (value as boolean) : undefined}
                        onChange={onChange} required={required} placeholder={placeholder} maxLength={maxLength} disabled={disabled} readOnly={readOnly}
                        className={`w-full px-4 py-3 text-base text-gray-900 bg-white border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 ${error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-purple-500'} ${disabled || readOnly ? 'bg-gray-100 cursor-not-allowed text-gray-600' : ''} ${isCheckbox ? 'h-5 w-5' : ''}`} 
                    />
                )}
            </div>
        </div>
    );
};

// 4. RadioCard (Melhorado o contraste)
const RadioCard = ({ label, description, name, value, currentSelection, onChange, icon: Icon }: any) => {
    const isSelected = value === currentSelection;
    return (
        <label className={`cursor-pointer border-2 p-4 rounded-xl transition-all ${isSelected ? 'border-purple-600 bg-purple-50 shadow-md' : 'border-gray-200 hover:border-purple-300 bg-white'}`}>
            <input type="radio" name={name} value={value} checked={isSelected} onChange={onChange} className="hidden" />
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-full ${isSelected ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700'}`}><Icon size={20} /></div>
                <div>
                    <p className={`font-bold ${isSelected ? 'text-purple-900' : 'text-gray-900'}`}>{label}</p>
                    <p className="text-sm text-gray-600">{description}</p>
                </div>
            </div>
        </label>
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