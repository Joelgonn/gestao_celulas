'use client';

import { useState } from 'react';
import { processarInscricaoPublica } from '@/lib/data';
import { InscricaoFaceAFaceEstadoCivil, InscricaoFaceAFaceTamanhoCamiseta, InscricaoFaceAFaceTipoParticipacao } from '@/lib/types';
import { formatPhoneNumberDisplay, normalizePhoneNumber } from '@/utils/formatters';
import { 
    FaUser, FaIdCard, FaBirthdayCake, FaPhone, FaMapMarkerAlt, FaRing, FaTshirt, 
    FaTransgender, FaChurch, FaBed, FaUtensils, FaWheelchair, FaPills, FaHeart, 
    FaCheckCircle, FaExclamationTriangle, FaSpinner, FaHandsHelping 
} from 'react-icons/fa';

// Componentes internos simplificados para este form
const InputField = ({ label, name, value, onChange, type = 'text', required = false, icon: Icon, placeholder, maxLength }: any) => (
    <div className="space-y-1">
        <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
            {Icon && <Icon className="text-purple-600" />} {label} {required && <span className="text-red-500">*</span>}
        </label>
        {type === 'textarea' ? (
            <textarea name={name} value={value || ''} onChange={onChange} required={required} placeholder={placeholder} maxLength={maxLength} rows={4} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all" />
        ) : type === 'checkbox' ? (
            <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                <input type="checkbox" name={name} checked={!!value} onChange={onChange} className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500" />
                <span className="text-sm text-gray-700">{placeholder || label}</span>
            </div>
        ) : (
            <input type={type} name={name} value={value || ''} onChange={onChange} required={required} placeholder={placeholder} maxLength={maxLength} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all" />
        )}
    </div>
);

const SelectField = ({ label, name, value, onChange, options, icon: Icon, required }: any) => (
    <div className="space-y-1">
        <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
            {Icon && <Icon className="text-purple-600" />} {label} {required && <span className="text-red-500">*</span>}
        </label>
        <select name={name} value={value || ''} onChange={onChange} required={required} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white">
            <option value="">Selecione...</option>
            {options.map((o: any) => <option key={o.id} value={o.id}>{o.nome}</option>)}
        </select>
    </div>
);

const RadioCard = ({ label, description, name, value, currentSelection, onChange, icon: Icon }: any) => {
    const isSelected = value === currentSelection;
    return (
        <label 
            className={`cursor-pointer border-2 p-4 rounded-xl transition-all ${
                isSelected 
                    ? 'border-purple-600 bg-purple-50 shadow-md' 
                    : 'border-gray-200 hover:border-purple-300 bg-white'
            }`}
        >
            <input
                type="radio"
                name={name}
                value={value}
                checked={isSelected}
                onChange={onChange}
                className="hidden"
            />
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-full ${isSelected ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
                    <Icon size={20} />
                </div>
                <div>
                    <p className="font-bold text-gray-800">{label}</p>
                    <p className="text-sm text-gray-600">{description}</p>
                </div>
            </div>
        </label>
    );
};

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
        tipo_participacao: participantRole, // Participante é sempre o padrão
        eh_membro_ib_apascentar: false,
        pertence_outra_igreja: false,
        nome_outra_igreja: '',
        dificuldade_dormir_beliche: false,
        restricao_alimentar: false,
        deficiencia_fisica_mental: false,
        toma_medicamento_controlado: false,
        descricao_sonhos: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
        
        let finalVal: string | boolean | number | null = val;

        if (name === 'contato_pessoal' || name === 'contato_emergencia') {
            finalVal = formatPhoneNumberDisplay(normalizePhoneNumber(val as string));
        }

        if (name === 'idade') {
            const idadeValue = val ? parseInt(val as string, 10) : null;
            setFormData((prev: any) => ({ ...prev, [name]: idadeValue }));
            return;
        }
        
        setFormData((prev: any) => ({ ...prev, [name]: finalVal }));
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
            if (result.success) {
                onSuccess();
            } else {
                setErrorMsg(result.message || 'Erro ao processar inscrição.');
            }
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

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
                <h3 className="text-lg font-bold text-gray-800 border-b pb-2">Seus Dados</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField label="Nome Completo" name="nome_completo_participante" value={formData.nome_completo_participante} onChange={handleChange} required icon={FaUser} />
                    <InputField label="Idade" name="idade" value={formData.idade || ''} onChange={handleChange} type="number" required icon={FaBirthdayCake} />
                    <InputField label="Data de Nascimento" name="data_nascimento" value={formData.data_nascimento} onChange={handleChange} type="date" required icon={FaBirthdayCake} />
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
                    <SelectField 
                        label="Estado Civil" 
                        name="estado_civil" 
                        value={formData.estado_civil} 
                        onChange={handleChange} 
                        required 
                        icon={FaRing}
                        options={[{id: 'SOLTEIRA', nome: 'Solteiro(a)'}, {id: 'CASADA', nome: 'Casado(a)'}, {id: 'DIVORCIADA', nome: 'Divorciado(a)'}, {id: 'VIÚVA', nome: 'Viúvo(a)'}, {id: 'UNIÃO ESTÁVEL', nome: 'União Estável'}]} 
                    />
                    {formData.estado_civil === 'CASADA' && (
                        <InputField label="Nome do Cônjuge" name="nome_esposo" value={formData.nome_esposo} onChange={handleChange} required icon={FaUser} />
                    )}
                    <SelectField 
                        label="Tamanho da Camiseta" 
                        name="tamanho_camiseta" 
                        value={formData.tamanho_camiseta} 
                        onChange={handleChange} 
                        required 
                        icon={FaTshirt}
                        options={['PP','P','M','G','GG','G1','G2','G3'].map(t => ({id: t, nome: t}))} 
                    />
                </div>
                
                <h4 className="text-md font-bold text-gray-800 pt-4 flex items-center gap-2">
                    <FaTransgender className="text-purple-600" /> 
                    Qual será o seu Papel no Evento? <span className="text-red-500">*</span>
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <RadioCard
                        label={participantRole}
                        description="Vou participar do evento e receber o ensino."
                        name="tipo_participacao"
                        value={participantRole}
                        currentSelection={formData.tipo_participacao}
                        onChange={handleChange}
                        icon={FaUser}
                    />
                    <RadioCard
                        label={serviceRole}
                        description="Sou da equipe de serviço e vou servir no evento."
                        name="tipo_participacao"
                        value={serviceRole}
                        currentSelection={formData.tipo_participacao}
                        onChange={handleChange}
                        icon={FaHandsHelping}
                    />
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
                <h3 className="text-lg font-bold text-gray-800 border-b pb-2">Informações Adicionais</h3>
                
                <div className="space-y-3">
                    <InputField type="checkbox" label="Sou membro da Igreja Batista Apascentar" name="eh_membro_ib_apascentar" value={formData.eh_membro_ib_apascentar} onChange={handleChange} placeholder="Sim, sou membro" icon={FaChurch} />
                    {!formData.eh_membro_ib_apascentar && (
                        <>
                            <InputField type="checkbox" label="Pertence a outra igreja?" name="pertence_outra_igreja" value={formData.pertence_outra_igreja} onChange={handleChange} placeholder="Sim, pertenço" icon={FaChurch} />
                            {formData.pertence_outra_igreja && (
                                <InputField label="Nome da Igreja" name="nome_outra_igreja" value={formData.nome_outra_igreja} onChange={handleChange} required />
                            )}
                        </>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
                    <InputField type="checkbox" label="Saúde" placeholder="Tenho restrição alimentar" name="restricao_alimentar" value={formData.restricao_alimentar} onChange={handleChange} icon={FaUtensils} />
                    <InputField type="checkbox" label="Saúde" placeholder="Tomo remédio controlado" name="toma_medicamento_controlado" value={formData.toma_medicamento_controlado} onChange={handleChange} icon={FaPills} />
                    <InputField type="checkbox" label="Saúde" placeholder="Deficiência física/mental" name="deficiencia_fisica_mental" value={formData.deficiencia_fisica_mental} onChange={handleChange} icon={FaWheelchair} />
                    <InputField type="checkbox" label="Acomodação" placeholder="Dificuldade com beliche" name="dificuldade_dormir_beliche" value={formData.dificuldade_dormir_beliche} onChange={handleChange} icon={FaBed} />
                </div>

                <InputField 
                    type="textarea" 
                    label="Descreva seus sonhos com Deus" 
                    name="descricao_sonhos" 
                    value={formData.descricao_sonhos} 
                    onChange={handleChange} 
                    required 
                    icon={FaHeart}
                    placeholder="Quais são suas expectativas para este evento?"
                />
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
            >
                {loading ? <><FaSpinner className="animate-spin" /> Processando...</> : <><FaCheckCircle /> Confirmar Inscrição</>}
            </button>

            {showConfirmationModal && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4 text-center">
                        <FaExclamationTriangle className="text-yellow-500 text-5xl mx-auto" />
                        <h3 className="text-xl font-bold text-gray-800">Confirmação de {serviceRole}</h3>
                        <p className="text-gray-600">
                            Você selecionou a opção de **Servir ({serviceRole})**. 
                            Esta opção é apenas para membros da equipe.
                        </p>
                        <p className="font-semibold text-sm text-gray-800">
                             Você confirma que faz parte da equipe de serviço para este evento?
                        </p>
                        <div className="flex justify-center gap-4 pt-4">
                            <button
                                type="button"
                                onClick={() => setShowConfirmationModal(false)}
                                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
                                disabled={loading}
                            >
                                Voltar e Corrigir
                            </button>
                            <button
                                type="button"
                                onClick={processSubmission}
                                className="px-4 py-2 text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition flex items-center gap-2"
                                disabled={loading}
                            >
                                {loading ? <FaSpinner className="animate-spin" /> : <FaCheckCircle />}
                                Sim, Sou da Equipe
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </form>
    );
}