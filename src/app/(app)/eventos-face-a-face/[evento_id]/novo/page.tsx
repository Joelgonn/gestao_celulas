// src/app/(app)/eventos-face-a-face/[evento_id]/novo/page.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
    getEventoFaceAFace,
    listarMembrosDaCelulaDoLider,
    criarInscricaoFaceAFace,
    getMembro
} from '@/lib/data';
import {
    EventoFaceAFace,
    InscricaoFaceAFaceFormData,
    InscricaoFaceAFaceEstadoCivil,
    InscricaoFaceAFaceTamanhoCamiseta,
    InscricaoFaceAFaceTipoParticipacao,
    MembroNomeTelefoneId
} from '@/lib/types';
import { 
    formatDateForInput, 
    formatPhoneNumberDisplay, 
    normalizePhoneNumber
} from '@/utils/formatters';
import useToast from '@/hooks/useToast';
import LoadingSpinner from '@/components/LoadingSpinner';

import {
    FaArrowLeft,
    FaUserPlus,
    FaCalendarAlt,
    FaMoneyBillWave,
    FaMapMarkerAlt,
    FaInfoCircle,
    FaUsers,
    FaSave,
    FaChevronDown,
    FaCheckCircle,
    FaTimes,
    FaPhone,
    FaIdCard,
    FaBirthdayCake,
    FaTransgender,
    FaRing,
    FaTshirt,
    FaChurch,
    FaBed,
    FaUtensils,
    FaWheelchair,
    FaPills,
    FaHeart,
    FaSearch,
    FaUser
} from 'react-icons/fa';

// --- Reutiliza CustomSelectSheet ---
interface CustomSelectSheetProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: { id: string; nome: string }[];
    icon: React.ReactNode;
    placeholder?: string;
    searchable?: boolean;
    required?: boolean;
    error?: string | null;
}

const CustomSelectSheet = ({ 
    label, 
    value, 
    onChange, 
    options, 
    icon, 
    placeholder = "Selecione...",
    searchable = false,
    required = false,
    error
}: CustomSelectSheetProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const modalRef = useRef<HTMLDivElement>(null);

    const selectedName = options.find(o => o.id === value)?.nome || null;

    const filteredOptions = options.filter(option => 
        option.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

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
                className={`w-full pl-3 pr-3 py-3 border rounded-xl flex items-center justify-between focus:outline-none focus:ring-2 transition-all duration-200 bg-white ${
                    error
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50'
                        : 'border-gray-300 focus:ring-teal-500 focus:border-teal-500'
                }`}
            >
                <span className={`text-base truncate ${selectedName ? 'text-gray-900' : 'text-gray-400'}`}>
                    {selectedName || placeholder}
                </span>
                <FaChevronDown className="text-gray-400 text-xs ml-2" />
            </button>
            {error && (
                <p className="text-red-600 text-sm flex items-center space-x-1">
                    <FaTimes className="w-3 h-3" />
                    <span>{error}</span>
                </p>
            )}

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
                    <div 
                        ref={modalRef}
                        className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[600px] animate-in slide-in-from-bottom duration-300"
                    >
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50 rounded-t-2xl">
                            <h3 className="font-bold text-gray-800 text-lg">{label}</h3>
                            <button onClick={() => setIsOpen(false)} className="p-2 bg-gray-200 rounded-full text-gray-600 hover:bg-gray-300 transition-colors">
                                <FaTimes />
                            </button>
                        </div>

                        {true /* searchable */ && ( // Sempre com busca
                            <div className="p-4 border-b border-gray-100 bg-white sticky top-0 z-10">
                                <div className="relative">
                                    <FaSearch className="absolute left-3 top-3.5 text-gray-400" />
                                    <input 
                                        type="text" 
                                        placeholder="Buscar..." 
                                        autoFocus
                                        className="w-full pl-10 pr-4 py-3 bg-gray-100 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all text-base"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="overflow-y-auto p-2 space-y-1 flex-1">
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map((option) => {
                                    const isSelected = value === option.id;
                                    return (
                                        <button
                                            key={option.id}
                                            type="button"
                                            onClick={() => { onChange(option.id); setIsOpen(false); setSearchTerm(''); }}
                                            className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-colors ${isSelected ? 'bg-teal-50 text-teal-700 font-bold' : 'text-gray-700 hover:bg-gray-50'}`}
                                        >
                                            <span className="text-base">{option.nome}</span>
                                            {isSelected && <FaCheckCircle className="text-teal-500 text-lg" />}
                                        </button>
                                    );
                                })
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    Nenhum item encontrado.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
// --- FIM CustomSelectSheet ---

// --- InputField reutilizável ---
interface InputFieldProps {
    label: string;
    name: keyof InscricaoFaceAFaceFormData;
    value: string | number | null | boolean; // Pode ser string, number, null ou boolean
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    onBlur?: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    error?: string | null;
    type?: string;
    required?: boolean;
    icon?: any;
    placeholder?: string;
    maxLength?: number;
    rows?: number;
    disabled?: boolean;
    readOnly?: boolean;
    options?: { id: string; nome: string }[]; // Para checkbox/radio groups se precisar
    toggle?: boolean; // Para switch de toggle
}

const InputField = ({ label, name, value, onChange, onBlur, error, type = 'text', required = false, icon: Icon, placeholder, maxLength, rows, disabled = false, readOnly = false, toggle }: InputFieldProps) => {
    const isTextarea = type === 'textarea';
    const isCheckbox = type === 'checkbox';
    const isNumber = type === 'number';

    if (toggle) {
        const booleanValue = !!value; // Garante que é booleano
        return (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {Icon && <Icon className={booleanValue ? "w-5 h-5 text-teal-600" : "w-5 h-5 text-gray-400"} />}
                    <label htmlFor={name} className="text-sm font-semibold text-gray-700">
                        {label} {required && <span className="text-red-500">*</span>}
                    </label>
                </div>
                <label htmlFor={name} className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        id={name}
                        name={name}
                        checked={booleanValue}
                        onChange={onChange}
                        className="sr-only peer"
                        disabled={disabled}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-teal-600"></div>
                </label>
                {error && (
                    <p className="text-red-600 text-sm flex items-center space-x-1 mt-1">
                        <FaTimes className="w-3 h-3" /> <span>{error}</span>
                    </p>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-1">
            <label htmlFor={name} className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                {Icon && <Icon className={error ? "text-red-500" : "text-teal-500"} />} 
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <div className="relative">
                {isTextarea ? (
                    <textarea
                        id={name}
                        name={name}
                        value={(value as string) || ''}
                        onChange={onChange}
                        onBlur={onBlur}
                        rows={rows}
                        placeholder={placeholder}
                        maxLength={maxLength}
                        disabled={disabled}
                        readOnly={readOnly}
                        className={`w-full px-4 py-3 text-base border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 resize-none ${
                            error ? 'border-red-300 focus:ring-red-500 bg-red-50' : 'border-gray-300 focus:ring-teal-500'
                        } ${disabled || readOnly ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
                    />
                ) : (
                    <input
                        type={type}
                        id={name}
                        name={name}
                        value={isCheckbox ? (value as boolean) ? 'on' : '' : (value || '').toString()} // Checkbox value logic
                        checked={isCheckbox ? (value as boolean) : undefined}
                        onChange={isCheckbox ? (e) => onChange({ ...e, target: { ...e.target, value: e.target.checked } as any }) : onChange}
                        onBlur={onBlur}
                        required={required}
                        placeholder={placeholder}
                        maxLength={maxLength}
                        disabled={disabled}
                        readOnly={readOnly}
                        step={isNumber ? "0.01" : undefined} // Para números decimais se precisar
                        className={`w-full px-4 py-3 text-base border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 ${
                            error ? 'border-red-300 focus:ring-red-500 bg-red-50' : 'border-gray-300 focus:ring-teal-500'
                        } ${disabled || readOnly ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'} ${isCheckbox ? 'h-5 w-5' : ''}`}
                    />
                )}
            </div>
            {error && (
                <p className="text-red-600 text-sm flex items-center space-x-1">
                    <FaTimes className="w-3 h-3" /> <span>{error}</span>
                </p>
            )}
        </div>
    );
};
// --- FIM InputField ---


export default function NovaInscricaoFaceAFacePage() {
    const params = useParams();
    const eventoId = params.evento_id as string;

    const [evento, setEvento] = useState<EventoFaceAFace | null>(null);
    const [membrosCelula, setMembrosCelula] = useState<MembroNomeTelefoneId[]>([]);
    const [selectedMembroId, setSelectedMembroId] = useState<string | null>(null); // Para o dropdown de membros

    const [formData, setFormData] = useState<InscricaoFaceAFaceFormData>({
        evento_id: eventoId,
        membro_id: null,
        nome_completo_participante: '',
        cpf: null,
        idade: null,
        rg: null,
        contato_pessoal: '',
        contato_emergencia: '',
        endereco_completo: null,
        bairro: null,
        cidade: null,
        estado_civil: null,
        nome_esposo: null,
        tamanho_camiseta: null,
        eh_membro_ib_apascentar: true,
        celula_id: null,
        lider_celula_nome: null,
        pertence_outra_igreja: false,
        nome_outra_igreja: null,
        dificuldade_dormir_beliche: false,
        restricao_alimentar: false,
        deficiencia_fisica_mental: false,
        toma_medicamento_controlado: false,
        descricao_sonhos: '',
        tipo_participacao: 'Encontrista',
        data_nascimento: null,
        // Campos que NÃO estão omitidos na interface, mas que o líder não preenche, inicializados como null
        admin_observacao_pagamento: null
    });

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    const router = useRouter();
    const { addToast, ToastContainer } = useToast();

    // Opções para Selects
    const estadoCivilOptions: { id: InscricaoFaceAFaceEstadoCivil; nome: string }[] = [
        { id: 'SOLTEIRA', nome: 'Solteira' },
        { id: 'CASADA', nome: 'Casada' },
        { id: 'DIVORCIADA', nome: 'Divorciada' },
        { id: 'VIÚVA', nome: 'Viúva' },
        { id: 'UNIÃO ESTÁVEL', nome: 'União Estável' },
    ];
    const tamanhoCamisetaOptions: { id: InscricaoFaceAFaceTamanhoCamiseta; nome: string }[] = [
        { id: 'PP', nome: 'PP' }, { id: 'P', nome: 'P' }, { id: 'M', nome: 'M' }, 
        { id: 'G', nome: 'G' }, { id: 'GG', nome: 'GG' }, { id: 'G1', nome: 'G1' },
        { id: 'G2', nome: 'G2' }, { id: 'G3', nome: 'G3' }, { id: 'G4', nome: 'G4' }, 
        { id: 'G5', nome: 'G5' }
    ];
    const tipoParticipacaoOptions: { id: InscricaoFaceAFaceTipoParticipacao; nome: string }[] = [
        { id: 'Encontrista', nome: 'Encontrista' },
        { id: 'Encontreiro', nome: 'Encontreiro' },
    ];


    // Fetch de dados iniciais (evento e membros da célula)
    useEffect(() => {
        async function loadInitialData() {
            setLoading(true);
            try {
                // Fetch Evento
                const eventData = await getEventoFaceAFace(eventoId);
                if (!eventData) {
                    addToast('Evento não encontrado ou não está ativo.', 'error');
                    router.replace('/eventos-face-a-face');
                    return;
                }
                setEvento(eventData);

                // Fetch Membros da Célula
                const membersData = await listarMembrosDaCelulaDoLider();
                setMembrosCelula(membersData);

                // Preencher o tipo de participação com base no tipo do evento
                setFormData(prev => ({
                    ...prev,
                    tipo_participacao: eventData.tipo === 'Mulheres' ? 'Encontrista' : 'Encontreiro'
                }));

            } catch (e: any) {
                console.error("Erro ao carregar dados iniciais:", e);
                addToast(`Erro ao carregar dados do formulário: ${e.message}`, 'error');
                router.replace('/eventos-face-a-face'); // Voltar para a lista de eventos
            } finally {
                setLoading(false);
            }
        }
        if (eventoId) {
            loadInitialData();
        }
    }, [eventoId, router, addToast]);

    // Pré-preenchimento de dados do membro selecionado
    useEffect(() => {
        async function fetchMembroDetails(id: string) {
            if (!id) return; // 'Novo Participante' tem id vazio
            const membro = await getMembro(id); // Buscar detalhes completos do membro
            if (membro) {
                setFormData(prev => ({
                    ...prev,
                    membro_id: membro.id,
                    nome_completo_participante: membro.nome,
                    contato_pessoal: membro.telefone ? formatPhoneNumberDisplay(membro.telefone) : '', 
                    data_nascimento: membro.data_nascimento ? formatDateForInput(membro.data_nascimento) : null,
                    idade: membro.data_nascimento ? calculateAge(membro.data_nascimento) : null, 
                    endereco_completo: membro.endereco,
                    celula_id: membro.celula_id,
                    lider_celula_nome: membro.celula_nome ?? null, 
                    eh_membro_ib_apascentar: true,
                    pertence_outra_igreja: false, 
                    nome_outra_igreja: null,
                }));
            } else {
                setFormData(prev => ({
                    ...prev,
                    membro_id: null,
                    nome_completo_participante: '',
                    contato_pessoal: '',
                    data_nascimento: null, 
                    idade: null,           
                    endereco_completo: null,
                    celula_id: null,
                    lider_celula_nome: null,
                    eh_membro_ib_apascentar: false,
                    pertence_outra_igreja: false,
                    nome_outra_igreja: null,
                }));
            }
        }

        if (selectedMembroId && selectedMembroId !== '') { // Se um membro foi realmente selecionado
            fetchMembroDetails(selectedMembroId);
        } else {
            // Se 'Novo Participante' foi selecionado ou nada, resetar campos relacionados a membro
            setFormData(prev => ({
                ...prev,
                membro_id: null,
                nome_completo_participante: '',
                contato_pessoal: '',
                data_nascimento: null, 
                idade: null,           
                endereco_completo: null,
                celula_id: null,
                lider_celula_nome: null,
                eh_membro_ib_apascentar: false, 
                pertence_outra_igreja: false,
                nome_outra_igreja: null,
            }));
        }
    }, [selectedMembroId, addToast]); // getMembro é importado, não precisa na dependência

    // Função auxiliar para calcular idade
    const calculateAge = (dateString: string | null): number | null => {
        if (!dateString) return null;
        const today = new Date();
        const birthDate = new Date(dateString);
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };


    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked; // Correção: Separa o checked
        
        let newValue: any = value;

        if (type === 'checkbox') {
            newValue = checked;
        } else if (type === 'number') {
            newValue = parseFloat(value);
            if (isNaN(newValue)) newValue = null;
        } else if (name === 'contato_pessoal' || name === 'contato_emergencia') {
            // Primeiro normaliza, depois formata para exibição
            newValue = formatPhoneNumberDisplay(normalizePhoneNumber(value)); 
        } else if (value === '') {
            newValue = null;
        }

        setFormData(prev => ({
            ...prev,
            [name]: newValue
        }));

        if (!touched[name]) setTouched(prev => ({ ...prev, [name]: true }));
    }, [touched]);

    const handleSelectChange = useCallback((name: keyof InscricaoFaceAFaceFormData, value: string | boolean) => {
        setFormData(prev => ({ ...prev, [name]: value }));
        if (!touched[name]) setTouched(prev => ({ ...prev, [name]: true }));
    }, [touched]);

    const handleMembroSelectChange = useCallback((id: string) => {
        setSelectedMembroId(id);
    }, []);

    const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name } = e.target;
        if (!touched[name]) setTouched(prev => ({ ...prev, [name]: true }));
    }, [touched]);

    const getFieldError = (fieldName: keyof InscricaoFaceAFaceFormData): string | null => {
        if (!touched[fieldName]) return null;
        const value = formData[fieldName];

        switch (fieldName) {
            // Correção: .trim() seguro com (value as string)
            case 'nome_completo_participante': return !value || !(value as string).trim() ? 'Nome completo é obrigatório.' : null;
            case 'contato_pessoal': return !value || normalizePhoneNumber(String(value)).length < 10 ? 'Contato pessoal inválido (mín. 10 dígitos).' : null;
            case 'contato_emergencia': return !value || normalizePhoneNumber(String(value)).length < 10 ? 'Contato de emergência inválido (mín. 10 dígitos).' : null;
            case 'cpf': 
                if (value && normalizePhoneNumber(String(value)).length !== 11) return 'CPF inválido (11 dígitos).';
                return null;
            case 'idade': 
                if (value === null || (value as number) < 13 || (value as number) > 99) return 'Idade deve ser entre 13 e 99 anos.';
                return null;
            case 'data_nascimento':
                if (value && isNaN(new Date(value as string).getTime())) return 'Data de nascimento inválida.';
                return null;
            case 'descricao_sonhos': return !value || !(value as string).trim() ? 'Descrição dos sonhos é obrigatória.' : null;
            case 'estado_civil': return !value ? 'Estado civil é obrigatório.' : null;
            case 'tamanho_camiseta': return !value ? 'Tamanho da camiseta é obrigatório.' : null;
            case 'tipo_participacao': return !value ? 'Tipo de participação é obrigatório.' : null;
            case 'nome_esposo':
                if (formData.estado_civil === 'CASADA' && (!value || !(value as string).trim())) {
                    return 'Nome do esposo é obrigatório para casadas.';
                }
                return null;
            case 'nome_outra_igreja':
                if (formData.pertence_outra_igreja && (!value || !(value as string).trim())) {
                    return 'Nome da outra igreja é obrigatório.';
                }
                return null;
            default: return null;
        }
    };

    const hasErrors = useCallback((): boolean => {
        const fieldsToValidate: (keyof InscricaoFaceAFaceFormData)[] = [
            'nome_completo_participante', 'contato_pessoal', 'contato_emergencia', 
            'descricao_sonhos', 'estado_civil', 'tamanho_camiseta', 'tipo_participacao', 
            'idade', 'data_nascimento' 
        ];

        for (const field of fieldsToValidate) {
            if (getFieldError(field)) return true;
        }

        if (formData.estado_civil === 'CASADA' && (!formData.nome_esposo || !String(formData.nome_esposo).trim())) return true;
        if (formData.pertence_outra_igreja && (!formData.nome_outra_igreja || !String(formData.nome_outra_igreja).trim())) return true;
        
        if (formData.cpf && normalizePhoneNumber(String(formData.cpf)).length !== 11) return true;
        if (formData.idade !== null && (formData.idade < 13 || formData.idade > 99)) return true;
        if (formData.data_nascimento && isNaN(new Date(formData.data_nascimento).getTime())) return true;

        return false;
    }, [formData, getFieldError]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const allTouched = Object.keys(formData).reduce((acc, key) => {
            acc[key as keyof InscricaoFaceAFaceFormData] = true;
            return acc;
        }, {} as Record<string, boolean>);
        setTouched(allTouched);

        if (hasErrors()) {
            addToast('Por favor, corrija os erros no formulário.', 'error');
            return;
        }

        setSubmitting(true);
        try {
            const dataToSubmit = {
                ...formData,
                contato_pessoal: normalizePhoneNumber(formData.contato_pessoal as string),
                contato_emergencia: normalizePhoneNumber(formData.contato_emergencia as string),
                cpf: formData.cpf ? normalizePhoneNumber(String(formData.cpf)) : null,
            };

            const inscricaoId = await criarInscricaoFaceAFace(dataToSubmit);
            addToast('Inscrição criada com sucesso! O pagamento ainda está pendente.', 'success', 5000); 
            setTimeout(() => {
                router.push(`/eventos-face-a-face`); 
            }, 1500);
        } catch (e: any) {
            console.error("Erro ao criar inscrição:", e);
            addToast(`Falha ao criar inscrição: ${e.message}`, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <LoadingSpinner />
            </div>
        );
    }

    if (!evento) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-700">
                <p>Erro: Evento não carregado ou não encontrado.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-12 sm:py-8 px-2 sm:px-6 lg:px-8">
            <ToastContainer />

            <div className="max-w-4xl mx-auto mt-4 sm:mt-0">
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                    
                    {/* Header Responsivo */}
                    <div className="bg-gradient-to-r from-teal-600 to-cyan-600 px-4 py-6 sm:px-6 sm:py-8">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2 sm:gap-3">
                                    <FaUserPlus className="w-6 h-6 sm:w-8 sm:h-8" />
                                    Inscrever Membro para {evento.nome_evento}
                                </h1>
                                <p className="text-teal-100 mt-1 text-sm sm:text-base">
                                    Preencha os dados do participante
                                </p>
                            </div>
                            
                            <Link
                                href={`/eventos-face-a-face`}
                                className="inline-flex justify-center items-center px-4 py-3 sm:py-2 bg-white/20 hover:bg-white/30 active:bg-white/40 text-white rounded-lg transition-colors backdrop-blur-sm border border-white/30 text-sm font-medium w-full sm:w-auto"
                            >
                                <FaArrowLeft className="w-3 h-3 mr-2" />
                                <span>Voltar para Eventos</span>
                            </Link>
                        </div>
                    </div>

                    {/* Formulário */}
                    <div className="p-4 sm:p-8">
                        <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
                            
                            {/* Selecionar Membro da Célula */}
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-4">
                                <h2 className="text-lg font-bold text-blue-800 flex items-center gap-2">
                                    <FaUsers /> Selecione um Membro da Sua Célula (Opcional)
                                </h2>
                                <p className="text-sm text-blue-700">
                                    Se o participante já é membro da sua célula, selecione-o para pré-preencher alguns dados. Caso contrário, preencha manualmente.
                                </p>
                                <CustomSelectSheet
                                    label="Membro da Célula"
                                    icon={<FaUser />}
                                    value={selectedMembroId || ''}
                                    onChange={handleMembroSelectChange}
                                    options={[{ id: '', nome: 'Novo Participante' }, ...membrosCelula.map(m => ({ id: m.id, nome: m.nome }))]}
                                    placeholder="Selecione um membro ou 'Novo Participante'"
                                    searchable
                                />
                            </div>

                            {/* Dados Pessoais do Participante */}
                            <div className="space-y-4 pt-4 border-t border-gray-100">
                                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><FaUser /> Dados do Participante</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                    <InputField
                                        label="Nome Completo do Participante"
                                        name="nome_completo_participante"
                                        // Correção: Garante que nunca seja undefined
                                        value={formData.nome_completo_participante ?? ''}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        error={getFieldError('nome_completo_participante')}
                                        required
                                        icon={FaUser}
                                        placeholder="Nome completo"
                                        readOnly={!!selectedMembroId} // Apenas leitura se for membro selecionado
                                        disabled={!!selectedMembroId}
                                    />
                                    <InputField
                                        label="Idade"
                                        name="idade"
                                        // Correção: Garante que nunca seja undefined
                                        value={formData.idade ?? null}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        error={getFieldError('idade')}
                                        type="number"
                                        required
                                        icon={FaBirthdayCake}
                                        placeholder="Idade (mín. 13)"
                                        readOnly={!!selectedMembroId && !!formData.data_nascimento} // Se data nasc. foi preenchida, idade é lida
                                        disabled={!!selectedMembroId && !!formData.data_nascimento}
                                    />
                                    <InputField
                                        label="Data de Nascimento (Opcional)" // <-- NOVO CAMPO
                                        name="data_nascimento"
                                        value={formData.data_nascimento ?? ''}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        error={getFieldError('data_nascimento')}
                                        type="date"
                                        icon={FaCalendarAlt}
                                        readOnly={!!selectedMembroId} // Apenas leitura se for membro selecionado
                                        disabled={!!selectedMembroId}
                                    />
                                    <InputField
                                        label="CPF (Opcional)"
                                        name="cpf"
                                        value={formData.cpf ?? ''}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        error={getFieldError('cpf')}
                                        icon={FaIdCard}
                                        placeholder="Somente números"
                                        maxLength={11}
                                    />
                                    <InputField
                                        label="RG (Opcional)"
                                        name="rg"
                                        value={formData.rg ?? ''}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        error={getFieldError('rg')}
                                        icon={FaIdCard}
                                        placeholder="Número do RG"
                                    />
                                    <InputField
                                        label="Contato Pessoal"
                                        name="contato_pessoal"
                                        value={formData.contato_pessoal ?? ''}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        error={getFieldError('contato_pessoal')}
                                        required
                                        icon={FaPhone}
                                        placeholder="(XX) XXXXX-XXXX"
                                        maxLength={15} // (XX) XXXXX-XXXX
                                        readOnly={!!selectedMembroId} // Apenas leitura se for membro selecionado
                                        disabled={!!selectedMembroId}
                                    />
                                    <InputField
                                        label="Contato de Emergência"
                                        name="contato_emergencia"
                                        value={formData.contato_emergencia ?? ''}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        error={getFieldError('contato_emergencia')}
                                        required
                                        icon={FaPhone}
                                        placeholder="(XX) XXXXX-XXXX"
                                        maxLength={15}
                                    />
                                    <InputField
                                        label="Endereço Completo (Opcional)"
                                        name="endereco_completo"
                                        value={formData.endereco_completo ?? ''}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        icon={FaMapMarkerAlt}
                                        placeholder="Rua, número, complemento"
                                        readOnly={!!selectedMembroId} // Apenas leitura se for membro selecionado
                                        disabled={!!selectedMembroId}
                                    />
                                    <InputField
                                        label="Bairro (Opcional)"
                                        name="bairro"
                                        value={formData.bairro ?? ''}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        icon={FaMapMarkerAlt}
                                        placeholder="Bairro"
                                    />
                                    <InputField
                                        label="Cidade (Opcional)"
                                        name="cidade"
                                        value={formData.cidade ?? ''}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        icon={FaMapMarkerAlt}
                                        placeholder="Cidade"
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                    <CustomSelectSheet
                                        label="Estado Civil"
                                        icon={<FaRing />}
                                        value={formData.estado_civil ?? ''}
                                        onChange={(val) => handleSelectChange('estado_civil', val)}
                                        options={estadoCivilOptions.map(o => ({ id: o.id, nome: o.nome }))}
                                        required
                                        placeholder="Selecione"
                                        error={getFieldError('estado_civil')}
                                    />
                                    {formData.estado_civil === 'CASADA' && (
                                        <InputField
                                            label="Nome do Esposo"
                                            name="nome_esposo"
                                            value={formData.nome_esposo ?? ''}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                            error={getFieldError('nome_esposo')}
                                            required={formData.estado_civil === 'CASADA'}
                                            icon={FaUser}
                                            placeholder="Nome completo do esposo"
                                        />
                                    )}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                    <CustomSelectSheet
                                        label="Tamanho da Camiseta"
                                        icon={<FaTshirt />}
                                        value={formData.tamanho_camiseta ?? ''}
                                        onChange={(val) => handleSelectChange('tamanho_camiseta', val)}
                                        options={tamanhoCamisetaOptions.map(o => ({ id: o.id, nome: o.nome }))}
                                        required
                                        placeholder="Selecione"
                                        error={getFieldError('tamanho_camiseta')}
                                    />
                                    <CustomSelectSheet
                                        label="Tipo de Participação"
                                        icon={<FaTransgender />}
                                        value={formData.tipo_participacao ?? ''}
                                        onChange={(val) => handleSelectChange('tipo_participacao', val as InscricaoFaceAFaceTipoParticipacao)}
                                        options={tipoParticipacaoOptions.map(o => ({ id: o.id, nome: o.nome }))}
                                        required
                                        placeholder="Encontrista ou Encontreiro"
                                    />
                                </div>
                            </div>

                            {/* Informações da Igreja */}
                            <div className="space-y-4 pt-4 border-t border-gray-100">
                                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><FaChurch /> Informações da Igreja</h2>
                                <InputField
                                    label="É membro da Igreja Batista Apascentar?"
                                    name="eh_membro_ib_apascentar"
                                    value={formData.eh_membro_ib_apascentar ?? false}
                                    onChange={(e) => {
                                        handleChange(e);
                                        // Limpa campos de "outra igreja" se for membro da Apascentar
                                        if ((e.target as HTMLInputElement).checked) { // Cast para HTMLInputElement
                                            setFormData(prev => ({ ...prev, pertence_outra_igreja: false, nome_outra_igreja: null }));
                                        }
                                    }}
                                    type="checkbox"
                                    toggle
                                    icon={FaCheckCircle}
                                    readOnly={!!selectedMembroId} // Apenas leitura se for membro selecionado
                                    disabled={!!selectedMembroId}
                                />
                                {formData.eh_membro_ib_apascentar && (
                                     <div className="flex items-center gap-2 text-sm text-gray-600 pl-2 py-1">
                                         <FaInfoCircle className="text-blue-500" /> Célula: {formData.lider_celula_nome || 'N/A'}
                                     </div>
                                )}

                                {!formData.eh_membro_ib_apascentar && (
                                    <>
                                        <InputField
                                            label="Pertence a outra igreja?"
                                            name="pertence_outra_igreja"
                                            value={formData.pertence_outra_igreja ?? false}
                                            onChange={(e) => {
                                                handleChange(e);
                                                // Limpa nome da outra igreja se desmarcar
                                                if (!(e.target as HTMLInputElement).checked) { // Cast para HTMLInputElement
                                                    setFormData(prev => ({ ...prev, nome_outra_igreja: null }));
                                                }
                                            }}
                                            type="checkbox"
                                            toggle
                                            icon={FaChurch}
                                        />
                                        {formData.pertence_outra_igreja && (
                                            <InputField
                                                label="Nome da Outra Igreja"
                                                name="nome_outra_igreja"
                                                value={formData.nome_outra_igreja ?? ''}
                                                onChange={handleChange}
                                                onBlur={handleBlur}
                                                error={getFieldError('nome_outra_igreja')}
                                                required={formData.pertence_outra_igreja}
                                                icon={FaChurch}
                                                placeholder="Nome da igreja"
                                            />
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Informações de Saúde e Outras */}
                            <div className="space-y-4 pt-4 border-t border-gray-100">
                                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><FaInfoCircle /> Informações Adicionais (Saúde/Outros)</h2>
                                <InputField
                                    label="Tem dificuldade para dormir em beliche?"
                                    name="dificuldade_dormir_beliche"
                                    value={formData.dificuldade_dormir_beliche ?? false}
                                    onChange={handleChange}
                                    type="checkbox"
                                    toggle
                                    icon={FaBed}
                                />
                                <InputField
                                    label="Possui alguma restrição alimentar?"
                                    name="restricao_alimentar"
                                    value={formData.restricao_alimentar ?? false}
                                    onChange={handleChange}
                                    type="checkbox"
                                    toggle
                                    icon={FaUtensils}
                                />
                                <InputField
                                    label="Possui alguma deficiência física ou mental?"
                                    name="deficiencia_fisica_mental"
                                    value={formData.deficiencia_fisica_mental ?? false}
                                    onChange={handleChange}
                                    type="checkbox"
                                    toggle
                                    icon={FaWheelchair}
                                />
                                <InputField
                                    label="Toma algum medicamento controlado?"
                                    name="toma_medicamento_controlado"
                                    value={formData.toma_medicamento_controlado ?? false}
                                    onChange={handleChange}
                                    type="checkbox"
                                    toggle
                                    icon={FaPills}
                                />
                                <InputField
                                    label="Qual a descrição dos seus sonhos com Deus?"
                                    name="descricao_sonhos"
                                    value={formData.descricao_sonhos ?? ''}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    error={getFieldError('descricao_sonhos')}
                                    type="textarea"
                                    rows={5}
                                    required
                                    icon={FaHeart}
                                    placeholder="Descreva seus sonhos e expectativas para o evento e sua vida com Deus."
                                />
                            </div>

                            {/* Botão Submit */}
                            <div className="flex flex-col sm:flex-row justify-end items-center gap-4 pt-6 border-t border-gray-200">
                                <Link
                                    href={`/eventos-face-a-face`}
                                    className="flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200 font-medium w-full sm:w-auto"
                                >
                                    <FaArrowLeft />
                                    <span>Cancelar</span>
                                </Link>
                                <button
                                    type="submit"
                                    disabled={submitting || loading || hasErrors()}
                                    className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl hover:from-teal-700 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-lg hover:shadow-xl w-full sm:w-auto"
                                >
                                    {submitting ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            <span>Inscritório...</span>
                                        </>
                                    ) : (
                                        <>
                                            <FaSave />
                                            <span>Confirmar Inscrição</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}