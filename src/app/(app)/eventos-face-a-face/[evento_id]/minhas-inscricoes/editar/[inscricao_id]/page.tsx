'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
    getInscricaoFaceAFaceParaLider, // Função específica para o líder
    atualizarInscricaoFaceAFaceLider, // Função específica para o líder
    uploadComprovanteFaceAFace,     // Função para upload de comprovantes
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
    FaArrowLeft,
    FaEdit,
    FaSave,
    FaUser,
    FaIdCard,
    FaBirthdayCake,
    FaPhone,
    FaMapMarkerAlt,
    FaRing,
    FaTshirt,
    FaTransgender,
    FaChurch,
    FaBed,
    FaUtensils,
    FaWheelchair,
    FaPills,
    FaHeart,
    FaMoneyBillWave,
    FaCheckCircle,
    FaTimesCircle,
    FaInfoCircle,
    FaFileAlt, // Para comprovante
    FaEye,     // Para visualizar comprovante
    FaUpload,  // Para botão de upload
    FaTimes,   // Para CustomSelectSheet
    FaChevronDown, // Para CustomSelectSheet
    FaSearch,   // Para CustomSelectSheet
    FaCalendarAlt // Para o campo data_nascimento
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
    disabled?: boolean; // Adicionado para desabilitar se o campo não puder ser editado
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
    error,
    disabled = false
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
                onClick={() => !disabled && setIsOpen(true)} // Desabilita clique se disabled
                className={`w-full pl-3 pr-3 py-3 border rounded-xl flex items-center justify-between focus:outline-none focus:ring-2 transition-all duration-200 ${
                    disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
                } ${
                    error
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50'
                        : 'border-gray-300 focus:ring-green-500 focus:border-green-500'
                }`}
                disabled={disabled}
            >
                <span className={`text-base truncate ${selectedName ? 'text-gray-900' : 'text-gray-400'}`}>
                    {selectedName || placeholder}
                </span>
                {!disabled && <FaChevronDown className="text-gray-400 text-xs ml-2" />}
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

                        {searchable && (
                            <div className="p-4 border-b border-gray-100 bg-white sticky top-0 z-10">
                                <div className="relative">
                                    <FaSearch className="absolute left-3 top-3.5 text-gray-400" />
                                    <input 
                                        type="text" 
                                        placeholder="Buscar..." 
                                        autoFocus
                                        className="w-full pl-10 pr-4 py-3 bg-gray-100 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all text-base"
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
                                            className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-colors ${isSelected ? 'bg-green-50 text-green-700 font-bold' : 'text-gray-700 hover:bg-gray-50'}`}
                                        >
                                            <span className="text-base">{option.nome}</span>
                                            {isSelected && <FaCheckCircle className="text-green-500 text-lg" />}
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

// --- InputField reutilizável (copiado de outras páginas e adaptado) ---
interface InputFieldProps {
    label: string;
    name: keyof InscricaoFaceAFace;
    value: string | number | null | boolean;
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
    toggle?: boolean;
}

const InputField = ({ label, name, value, onChange, onBlur, error, type = 'text', required = false, icon: Icon, placeholder, maxLength, rows, disabled = false, readOnly = false, toggle }: InputFieldProps) => {
    const isTextarea = type === 'textarea';
    const isCheckbox = type === 'checkbox';
    const isNumber = type === 'number';

    if (toggle) {
        const booleanValue = !!value;
        return (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {Icon && <Icon className={booleanValue ? "w-5 h-5 text-green-600" : "w-5 h-5 text-gray-400"} />}
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
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
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
                {Icon && <Icon className={error ? "text-red-500" : "text-green-500"} />} 
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
                            error ? 'border-red-300 focus:ring-red-500 bg-red-50' : 'border-gray-300 focus:ring-green-500'
                        } ${disabled || readOnly ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
                    />
                ) : (
                    <input
                        type={type}
                        id={name}
                        name={name}
                        value={isCheckbox ? (value as boolean) ? 'on' : '' : (value || '').toString()}
                        checked={isCheckbox ? (value as boolean) : undefined}
                        onChange={isCheckbox ? (e) => onChange({ ...e, target: { ...e.target, value: e.target.checked } as any }) : onChange}
                        onBlur={onBlur}
                        required={required}
                        placeholder={placeholder}
                        maxLength={maxLength}
                        disabled={disabled}
                        readOnly={readOnly}
                        step={isNumber ? "0.01" : undefined}
                        className={`w-full px-4 py-3 text-base border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 ${
                            error ? 'border-red-300 focus:ring-red-500 bg-red-50' : 'border-gray-300 focus:ring-green-500'
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

export default function LiderEditarInscricaoPage() {
    const params = useParams();
    const eventoId = params.evento_id as string;
    const inscricaoId = params.inscricao_id as string;

    const [inscricaoOriginal, setInscricaoOriginal] = useState<InscricaoFaceAFace | null>(null);
    // Usamos InscricaoFaceAFace para o formData aqui para facilitar, já que o líder edita apenas um subconjunto
    // e os outros campos serão passados para a função de atualização.
    const [formData, setFormData] = useState<Partial<InscricaoFaceAFace>>({}); 
    
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    // Estados para uploads de comprovantes
    const [fileEntrada, setFileEntrada] = useState<File | null>(null);
    const [uploadingEntrada, setUploadingEntrada] = useState(false);
    const [fileRestante, setFileRestante] = useState<File | null>(null);
    const [uploadingRestante, setUploadingRestante] = useState(false);

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

    // Fetch da inscrição ao carregar a página
    const fetchInscricaoDetails = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getInscricaoFaceAFaceParaLider(inscricaoId); // Função específica para o líder
            if (!data) {
                addToast('Inscrição não encontrada ou você não tem permissão.', 'error');
                router.replace(`/eventos-face-a-face/${eventoId}/minhas-inscricoes`);
                return;
            }
            setInscricaoOriginal(data);
            setFormData({
                nome_completo_participante: data.nome_completo_participante,
                cpf: data.cpf,
                idade: data.idade,
                rg: data.rg,
                contato_pessoal: formatPhoneNumberDisplay(data.contato_pessoal),
                contato_emergencia: formatPhoneNumberDisplay(data.contato_emergencia),
                endereco_completo: data.endereco_completo,
                bairro: data.bairro,
                cidade: data.cidade,
                estado_civil: data.estado_civil,
                nome_esposo: data.nome_esposo,
                tamanho_camiseta: data.tamanho_camiseta,
                eh_membro_ib_apascentar: data.eh_membro_ib_apascentar,
                pertence_outra_igreja: data.pertence_outra_igreja,
                nome_outra_igreja: data.nome_outra_igreja,
                dificuldade_dormir_beliche: data.dificuldade_dormir_beliche,
                restricao_alimentar: data.restricao_alimentar,
                deficiencia_fisica_mental: data.deficiencia_fisica_mental,
                toma_medicamento_controlado: data.toma_medicamento_controlado,
                descricao_sonhos: data.descricao_sonhos,
                tipo_participacao: data.tipo_participacao,
                data_nascimento: data.data_nascimento ? formatDateForInput(data.data_nascimento) : null,
            });
        } catch (e: any) {
            console.error("Erro ao carregar detalhes da inscrição:", e);
            addToast(`Falha ao carregar inscrição: ${e.message}`, 'error');
            router.replace(`/eventos-face-a-face/${eventoId}/minhas-inscricoes`);
        } finally {
            setLoading(false);
        }
    }, [inscricaoId, eventoId, router, addToast]);

    useEffect(() => {
        if (inscricaoId && eventoId) {
            fetchInscricaoDetails();
        }
    }, [inscricaoId, eventoId, fetchInscricaoDetails]);


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

    const handleSelectChange = useCallback((name: keyof InscricaoFaceAFace, value: string | boolean) => {
        setFormData(prev => ({ ...prev, [name]: value }));
        if (!touched[name]) setTouched(prev => ({ ...prev, [name]: true }));
    }, [touched]);

    const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name } = e.target;
        if (!touched[name]) setTouched(prev => ({ ...prev, [name]: true }));
    }, [touched]);

    // Validações (adaptadas para campos editáveis pelo líder)
    const getFieldError = (fieldName: keyof InscricaoFaceAFace): string | null => {
        // Apenas valida campos que o líder pode editar
        if (!touched[fieldName]) return null;
        const value = formData[fieldName];

        switch (fieldName) {
            case 'nome_completo_participante': return !value || !String(value).trim() ? 'Nome completo é obrigatório.' : null;
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
            case 'descricao_sonhos': return !value || !String(value).trim() ? 'Descrição dos sonhos é obrigatória.' : null;
            case 'estado_civil': return !value ? 'Estado civil é obrigatório.' : null;
            case 'tamanho_camiseta': return !value ? 'Tamanho da camiseta é obrigatório.' : null;
            case 'tipo_participacao': return !value ? 'Tipo de participação é obrigatório.' : null;
            case 'nome_esposo':
                // Correção: .trim() seguro
                if (formData.estado_civil === 'CASADA' && (!value || !String(value).trim())) {
                    return 'Nome do esposo é obrigatório para casadas.';
                }
                return null;
            case 'nome_outra_igreja':
                // Correção: .trim() seguro
                if (formData.pertence_outra_igreja && (!value || !String(value).trim())) {
                    return 'Nome da outra igreja é obrigatório.';
                }
                return null;
            default: return null;
        }
    };

    const hasErrors = useCallback((): boolean => {
        // Validações apenas para campos que o líder PODE editar
        const editableFields: (keyof InscricaoFaceAFace)[] = [
            'nome_completo_participante', 'contato_pessoal', 'contato_emergencia', 
            'descricao_sonhos', 'estado_civil', 'tamanho_camiseta', 'tipo_participacao', 
            'idade', 'data_nascimento', 'endereco_completo', 'bairro', 'cidade', 'rg', 'cpf',
            'nome_esposo', 'nome_outra_igreja', 'eh_membro_ib_apascentar', 'pertence_outra_igreja',
            'dificuldade_dormir_beliche', 'restricao_alimentar', 'deficiencia_fisica_mental', 'toma_medicamento_controlado'
        ];

        for (const field of editableFields) {
            // Só valida se o campo foi tocado ou é crítico
            // A validação de `required` está no `InputField`, mas um fallback aqui é bom.
            const error = getFieldError(field);
            if (error) return true;
        }
        return false;
    }, [formData, getFieldError, touched]);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const allTouched = Object.keys(formData).reduce((acc, key) => {
            acc[key as keyof InscricaoFaceAFace] = true;
            return acc;
        }, {} as Record<string, boolean>);
        setTouched(allTouched);

        if (hasErrors()) {
            addToast('Por favor, corrija os erros no formulário.', 'error');
            return;
        }

        setSubmitting(true);
        try {
            // Prepara os dados para envio, normalizando telefones/CPFs
            const dataToUpdate = {
                ...formData,
                contato_pessoal: normalizePhoneNumber(formData.contato_pessoal as string),
                contato_emergencia: normalizePhoneNumber(formData.contato_emergencia as string),
                cpf: formData.cpf ? normalizePhoneNumber(String(formData.cpf)) : null,
                // data_nascimento já está no formData e será incluída
            };

            await atualizarInscricaoFaceAFaceLider(inscricaoId, dataToUpdate);
            addToast('Inscrição atualizada com sucesso!', 'success', 3000);
            await fetchInscricaoDetails(); // Recarregar os detalhes para mostrar o estado atualizado (ex: se o líder mudou algo que afete a exibição)

        } catch (e: any) {
            console.error("Erro ao atualizar inscrição:", e);
            addToast(`Falha ao atualizar inscrição: ${e.message}`, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleFileUpload = async (file: File | null, tipo: 'entrada' | 'restante') => {
        if (!file) {
            addToast('Por favor, selecione um arquivo para upload.', 'warning');
            return;
        }

        if (tipo === 'entrada') setUploadingEntrada(true);
        else setUploadingRestante(true);

        try {
            const fileUrl = await uploadComprovanteFaceAFace(inscricaoId, tipo, file);
            addToast(`Comprovante de ${tipo} enviado com sucesso! Aguardando confirmação do Admin.`, 'success', 5000);
            await fetchInscricaoDetails(); // Recarregar para mostrar o novo status/URL do comprovante
        } catch (e: any) {
            console.error(`Erro ao fazer upload do comprovante de ${tipo}:`, e);
            addToast(`Falha no upload do comprovante de ${tipo}: ${e.message}`, 'error');
        } finally {
            if (tipo === 'entrada') setUploadingEntrada(false);
            else setUploadingRestante(false);
            // Limpa o input de arquivo
            if (tipo === 'entrada') {
                const inputElement = document.getElementById(`file-entrada-${inscricao.id}`) as HTMLInputElement;
                if (inputElement) inputElement.value = ''; // Limpa o valor do input file
                setFileEntrada(null);
            } else {
                const inputElement = document.getElementById(`file-restante-${inscricao.id}`) as HTMLInputElement;
                if (inputElement) inputElement.value = ''; // Limpa o valor do input file
                setFileRestante(null);
            }
        }
    };


    if (loading || !inscricaoOriginal) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <LoadingSpinner />
            </div>
        );
    }

    const inscricao = inscricaoOriginal; 

    const getStatusBadge = (status: InscricaoFaceAFaceStatus) => {
        switch (status) {
            case 'PENDENTE': return 'bg-yellow-100 text-yellow-800';
            case 'AGUARDANDO_CONFIRMACAO_ENTRADA': return 'bg-orange-100 text-orange-800';
            case 'ENTRADA_CONFIRMADA': return 'bg-blue-100 text-blue-800';
            case 'AGUARDANDO_CONFIRMACAO_RESTANTE': return 'bg-purple-100 text-purple-800';
            case 'PAGO_TOTAL': return 'bg-green-100 text-green-800';
            case 'CANCELADO': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };
    const getStatusText = (status: InscricaoFaceAFaceStatus) => {
        const options = [
            { id: 'PENDENTE', nome: 'Pendente' },
            { id: 'AGUARDANDO_CONFIRMACAO_ENTRADA', nome: 'Aguardando Conf. Entrada' },
            { id: 'ENTRADA_CONFIRMADA', nome: 'Entrada Confirmada' },
            { id: 'AGUARDANDO_CONFIRMACAO_RESTANTE', nome: 'Aguardando Conf. Restante' },
            { id: 'PAGO_TOTAL', nome: 'Pago Total' },
            { id: 'CANCELADO', nome: 'Cancelado' },
        ];
        const option = options.find(o => o.id === status);
        return option ? option.nome : status;
    };

    const isComprovanteEntradaUploadable = inscricao.status_pagamento === 'PENDENTE' || inscricao.status_pagamento === 'AGUARDANDO_CONFIRMACAO_ENTRADA';
    const isComprovanteRestanteUploadable = inscricao.status_pagamento === 'ENTRADA_CONFIRMADA' || inscricao.status_pagamento === 'AGUARDANDO_CONFIRMACAO_RESTANTE';

    // Correção: Usando 'as any' para propriedades que podem não estar na interface base mas vêm do Join
    const pixKey = (inscricao as any).chave_pix_admin_evento;
    const valueToPay = (inscricao as any).valor_total_evento;
    const entryValue = (inscricao as any).valor_entrada_evento;

    return (
        <div className="min-h-screen bg-gray-50 pb-12 sm:py-8 px-2 sm:px-6 lg:px-8">
            <ToastContainer />

            <div className="max-w-4xl mx-auto mt-4 sm:mt-0">
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                    
                    {/* Header Responsivo */}
                    <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-6 sm:px-6 sm:py-8">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2 sm:gap-3">
                                    <FaEdit className="w-6 h-6 sm:w-8 sm:h-8" />
                                    Editar Inscrição: {inscricao.nome_completo_participante}
                                </h1>
                                <p className="text-green-100 mt-1 text-sm sm:text-base">
                                    Evento: {inscricao.evento_nome}
                                </p>
                            </div>
                            
                            <Link
                                href={`/eventos-face-a-face/${eventoId}/minhas-inscricoes`}
                                className="inline-flex justify-center items-center px-4 py-3 sm:py-2 bg-white/20 hover:bg-white/30 active:bg-white/40 text-white rounded-lg transition-colors backdrop-blur-sm border border-white/30 text-sm font-medium w-full sm:w-auto"
                            >
                                <FaArrowLeft className="w-3 h-3 mr-2" />
                                <span>Voltar para Minhas Inscrições</span>
                            </Link>
                        </div>
                    </div>

                    {/* Formulário de Detalhes e Edição */}
                    <div className="p-4 sm:p-8">
                        <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
                            
                            {/* Seção: Status de Pagamento Atual e Valores */}
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 space-y-3">
                                <h2 className="text-lg font-bold text-blue-800 flex items-center gap-2">
                                    <FaMoneyBillWave /> Status Atual do Pagamento
                                </h2>
                                <p className="text-sm text-gray-700 flex items-center gap-2">
                                    Status: <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusBadge(inscricao.status_pagamento)}`}>
                                        {getStatusText(inscricao.status_pagamento)}
                                    </span>
                                </p>
                                <p className="text-sm text-gray-700">
                                    Valor Total do Evento: <span className="font-semibold">R$ {valueToPay?.toFixed(2).replace('.', ',') || '0,00'}</span>
                                </p>
                                <p className="text-sm text-gray-700">
                                    Valor da Entrada: <span className="font-semibold">R$ {entryValue?.toFixed(2).replace('.', ',') || '0,00'}</span>
                                </p>
                                {pixKey && (
                                    <div className="text-sm text-gray-700 flex items-center gap-2">
                                        <FaMoneyBillWave className="text-blue-600" /> Chave PIX para Pagamento: <span className="font-semibold break-all">{pixKey}</span>
                                    </div>
                                )}
                                {(inscricao as any).data_limite_entrada_evento && (
                                    <div className="text-sm text-gray-700 flex items-center gap-2">
                                        <FaCalendarAlt className="text-blue-600" /> Data Limite para Entrada: <span className="font-semibold">{formatDateForDisplay((inscricao as any).data_limite_entrada_evento)}</span>
                                    </div>
                                )}
                            </div>

                            {/* Seção: Upload de Comprovantes */}
                            <div className="space-y-4 pt-4 border-t border-gray-100">
                                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><FaUpload /> Enviar Comprovantes</h2>
                                <p className="text-sm text-gray-600">
                                    Anexe os comprovantes de pagamento (Entrada ou Restante) nos formatos JPG, PNG ou PDF (máx. 2MB).
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                    {/* Comprovante de Entrada */}
                                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
                                        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                                            <FaFileAlt /> Comprovante de Entrada
                                        </h3>
                                        {inscricao.caminho_comprovante_entrada ? (
                                            <div className="flex items-center gap-2 text-sm">
                                                <a 
                                                    href={inscricao.caminho_comprovante_entrada} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200"
                                                >
                                                    <FaEye className="mr-2" /> Visualizar
                                                </a>
                                                <span className="text-xs text-gray-500">
                                                    (Envio: {inscricao.data_upload_entrada ? formatDateForDisplay(inscricao.data_upload_entrada) : 'N/A'})
                                                </span>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-500">Nenhum comprovante de entrada enviado.</p>
                                        )}
                                        <input
                                            type="file"
                                            id={`file-entrada-${inscricao.id}`} // Adicionado ID para limpar o input
                                            accept="image/jpeg,image/png,application/pdf"
                                            onChange={(e) => setFileEntrada(e.target.files ? e.target.files[0] : null)}
                                            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 cursor-pointer"
                                            disabled={uploadingEntrada || !isComprovanteEntradaUploadable}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleFileUpload(fileEntrada, 'entrada')}
                                            disabled={!fileEntrada || uploadingEntrada || !isComprovanteEntradaUploadable}
                                            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-70 disabled:cursor-not-allowed transition-all font-medium shadow-md"
                                        >
                                            {uploadingEntrada ? (
                                                <>
                                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                    <span>Enviando...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <FaUpload />
                                                    <span>Enviar Entrada</span>
                                                </>
                                            )}
                                        </button>
                                        {!isComprovanteEntradaUploadable && <p className="text-xs text-red-500 mt-2">Status atual não permite envio de comprovante de entrada.</p>}
                                    </div>

                                    {/* Comprovante de Restante */}
                                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
                                        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                                            <FaFileAlt /> Comprovante de Restante
                                        </h3>
                                        {inscricao.caminho_comprovante_restante ? (
                                            <div className="flex items-center gap-2 text-sm">
                                                <a 
                                                    href={inscricao.caminho_comprovante_restante} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200"
                                                >
                                                    <FaEye className="mr-2" /> Visualizar
                                                </a>
                                                <span className="text-xs text-gray-500">
                                                    (Envio: {inscricao.data_upload_restante ? formatDateForDisplay(inscricao.data_upload_restante) : 'N/A'})
                                                </span>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-500">Nenhum comprovante de restante enviado.</p>
                                        )}
                                        <input
                                            type="file"
                                            id={`file-restante-${inscricao.id}`} // Adicionado ID para limpar o input
                                            accept="image/jpeg,image/png,application/pdf"
                                            onChange={(e) => setFileRestante(e.target.files ? e.target.files[0] : null)}
                                            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 cursor-pointer"
                                            disabled={uploadingRestante || !isComprovanteRestanteUploadable}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleFileUpload(fileRestante, 'restante')}
                                            disabled={!fileRestante || uploadingRestante || !isComprovanteRestanteUploadable}
                                            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-70 disabled:cursor-not-allowed transition-all font-medium shadow-md"
                                        >
                                            {uploadingRestante ? (
                                                <>
                                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                    <span>Enviando...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <FaUpload />
                                                    <span>Enviar Restante</span>
                                                </>
                                            )}
                                        </button>
                                        {!isComprovanteRestanteUploadable && <p className="text-xs text-red-500 mt-2">Status atual não permite envio de comprovante de restante.</p>}
                                    </div>
                                </div>
                            </div>


                            {/* Seção: Dados Pessoais do Participante (Editáveis pelo Líder) */}
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
                                        disabled={!!inscricao.membro_id} // Desabilita se for membro existente
                                        readOnly={!!inscricao.membro_id}
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
                                        disabled={!!inscricao.membro_id && !!formData.data_nascimento}
                                        readOnly={!!inscricao.membro_id && !!formData.data_nascimento}
                                    />
                                    <InputField
                                        label="Data de Nascimento (Opcional)"
                                        name="data_nascimento"
                                        value={formData.data_nascimento ?? ''}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        error={getFieldError('data_nascimento')}
                                        type="date"
                                        icon={FaCalendarAlt}
                                        disabled={!!inscricao.membro_id}
                                        readOnly={!!inscricao.membro_id}
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
                                        maxLength={15}
                                        disabled={!!inscricao.membro_id}
                                        readOnly={!!inscricao.membro_id}
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
                                        disabled={!!inscricao.membro_id}
                                        readOnly={!!inscricao.membro_id}
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
                                        disabled={!!inscricao.membro_id} // Desabilita se for membro existente
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
                                    onChange={handleChange}
                                    type="checkbox"
                                    toggle
                                    icon={FaCheckCircle}
                                    disabled={!!inscricao.membro_id} // Desabilita se for membro existente
                                    readOnly={!!inscricao.membro_id}
                                />
                                {formData.eh_membro_ib_apascentar && (
                                     <div className="flex items-center gap-2 text-sm text-gray-600 pl-2 py-1">
                                         <FaInfoCircle className="text-blue-500" /> Célula do Participante: {inscricao.celula_participante_nome || 'Não informada'}
                                     </div>
                                )}

                                {!formData.eh_membro_ib_apascentar && (
                                    <>
                                        <InputField
                                            label="Pertence a outra igreja?"
                                            name="pertence_outra_igreja"
                                            value={formData.pertence_outra_igreja ?? false}
                                            onChange={handleChange}
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

                            {/* Informações da Célula e Líder (Apenas Leitura) */}
                            <div className="bg-gray-100 rounded-xl p-4 border border-gray-200 space-y-2 text-sm text-gray-700">
                                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><FaInfoCircle /> Informações de Inscrição</h2>
                                <p>
                                    <span className="font-semibold">Inscrito por (ID):</span> {inscricao.inscrito_por_perfil_id}
                                </p>
                                <p>
                                    <span className="font-semibold">Célula do Líder (Inscrição):</span> {inscricao.celula_inscricao_nome || 'N/A'}
                                </p>
                                <p>
                                    <span className="font-semibold">Data da Inscrição:</span> {formatDateForDisplay(inscricao.created_at)}
                                </p>
                                <p>
                                    <span className="font-semibold">Última Atualização:</span> {formatDateForDisplay(inscricao.updated_at)}
                                </p>
                            </div>


                            {/* Botão Salvar Edições */}
                            <div className="flex flex-col sm:flex-row justify-end items-center gap-4 pt-6 border-t border-gray-200">
                                <Link
                                    href={`/eventos-face-a-face/${eventoId}/minhas-inscricoes`}
                                    className="flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200 font-medium w-full sm:w-auto"
                                >
                                    <FaArrowLeft />
                                    <span>Cancelar</span>
                                </Link>
                                <button
                                    type="submit"
                                    disabled={submitting || loading || hasErrors() || uploadingEntrada || uploadingRestante}
                                    className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-lg hover:shadow-xl w-full sm:w-auto"
                                >
                                    {submitting ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            <span>Salvando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <FaSave />
                                            <span>Salvar Alterações</span>
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