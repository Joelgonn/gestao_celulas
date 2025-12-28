'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { getVisitante, atualizarVisitante } from '@/lib/data';
import { VisitanteEditFormData } from '@/lib/types';
import { normalizePhoneNumber, formatDateForInput } from '@/utils/formatters';
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
    FaTimes
} from 'react-icons/fa';

// --- COMPONENTE INPUT FIELD PADRONIZADO (TEMA ROXO) ---
interface InputFieldProps {
    label: string; name: string; value: string | number | null; 
    onChange: (e: any) => void; onBlur?: (e: any) => void;
    error?: string | null; type?: string; required?: boolean; icon?: any; placeholder?: string; maxLength?: number; rows?: number;
    isLoading?: boolean;
}
const InputField = ({ label, name, value, onChange, onBlur, error, type = 'text', required = false, icon: Icon, placeholder, maxLength, rows, isLoading }: InputFieldProps) => {
    const isTextarea = type === 'textarea';
    return (
        <div className="space-y-1">
            <label htmlFor={name} className="block text-sm font-bold text-gray-800 flex items-center gap-2">
                {Icon && <Icon className={error ? "text-red-600" : "text-purple-600"} />} 
                {label} {required && <span className="text-red-600">*</span>}
            </label>
            <div className="relative">
                {isTextarea ? (
                    <textarea id={name} name={name} value={(value as string) || ''} onChange={onChange} onBlur={onBlur} rows={rows} placeholder={placeholder} 
                        className={`w-full px-4 py-3 text-base text-gray-900 bg-white border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 resize-none ${error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-purple-500'}`} />
                ) : (
                    <>
                        <input type={type} id={name} name={name} value={(value || '').toString()} onChange={onChange} onBlur={onBlur} required={required} placeholder={placeholder} maxLength={maxLength}
                            className={`w-full px-4 py-3 text-base text-gray-900 bg-white border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 ${error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-purple-500'}`} />
                        {isLoading && (
                            <div className="absolute right-3 top-3">
                                <FaSpinner className="animate-spin text-purple-600" />
                            </div>
                        )}
                    </>
                )}
            </div>
            {error && <p className="text-red-600 text-sm flex items-center space-x-1"><FaTimes className="w-3 h-3" /> <span>{error}</span></p>}
        </div>
    );
};

// ============================================================================
//                       PÁGINA PRINCIPAL
// ============================================================================

export default function EditVisitantePage() {
    const params = useParams();
    const visitanteId = params.id as string;
    
    const [formData, setFormData] = useState<VisitanteEditFormData>({
        nome: '', telefone: null, data_primeira_visita: '', data_nascimento: null, endereco: null, data_ultimo_contato: null, observacoes: null, status_conversao: 'Em Contato',
    });
    
    // CEP
    const [cepInput, setCepInput] = useState('');
    const [cepLoading, setCepLoading] = useState(false);

    const { addToast, ToastContainer } = useToast();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const router = useRouter();

    useEffect(() => {
        const fetchVisitante = async () => {
            setLoading(true);
            try {
                const data = await getVisitante(visitanteId); 
                if (!data) { addToast('Visitante não encontrado.', 'error'); setTimeout(() => router.replace('/visitantes'), 2000); return; }
                setFormData({
                    nome: data.nome || '',
                    telefone: normalizePhoneNumber(data.telefone) || null,
                    data_primeira_visita: formatDateForInput(data.data_primeira_visita),
                    data_nascimento: data.data_nascimento ? formatDateForInput(data.data_nascimento) : null,
                    endereco: data.endereco || null,
                    data_ultimo_contato: data.data_ultimo_contato ? formatDateForInput(data.data_ultimo_contato) : null,
                    observacoes: data.observacoes || null,
                    status_conversao: data.status_conversao || 'Em Contato',
                });
            } catch (e: any) { console.error("Erro fetch:", e); addToast('Erro ao carregar dados', 'error'); } finally { setLoading(false); }
        };
        if (visitanteId) fetchVisitante();
    }, [visitanteId, router, addToast]); 

    const handleChange = useCallback((e: any) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'telefone' ? normalizePhoneNumber(value) : value }));
        if (!touched[name]) setTouched(prev => ({ ...prev, [name]: true }));
    }, [touched]);

    const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name } = e.target;
        if (!touched[name]) setTouched(prev => ({ ...prev, [name]: true }));
    }, [touched]);

    // LÓGICA CEP
    const handleCepChange = (e: any) => {
        let val = e.target.value.replace(/\D/g, '');
        if (val.length > 8) val = val.slice(0, 8);
        if (val.length > 5) val = val.replace(/^(\d{5})(\d)/, '$1-$2');
        setCepInput(val);
    };

    const handleCepBlur = async () => {
        const cleanCep = cepInput.replace(/\D/g, '');
        if (cleanCep.length === 8) {
            setCepLoading(true);
            try {
                const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
                const data = await response.json();
                if (!data.erro) {
                    const fullAddress = `${data.logradouro}, , ${data.bairro} - ${data.localidade}/${data.uf}`;
                    setFormData(prev => ({ ...prev, endereco: fullAddress }));
                }
            } catch (error) { console.error("Erro CEP:", error); } finally { setCepLoading(false); }
        }
    };

    const getFieldError = (fieldName: keyof VisitanteEditFormData): string | null => {
        if (!touched[fieldName]) return null;
        const value = formData[fieldName];
        if (fieldName === 'nome' && (!value || !(value as string).trim())) return 'Nome obrigatório.';
        if (fieldName === 'telefone' && value && ((value as string).length < 10 || (value as string).length > 11)) return 'Telefone inválido.';
        return null;
    };

    const hasErrors = () => {
        if (!formData.nome.trim()) return true;
        const phone = normalizePhoneNumber(formData.telefone);
        if (phone && (phone.length < 10 || phone.length > 11)) return true;
        return false;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setTouched(Object.keys(formData).reduce((acc, key) => { acc[key as keyof VisitanteEditFormData] = true; return acc; }, {} as Record<string, boolean>));
        
        if (hasErrors()) { addToast('Verifique os erros.', 'error'); return; }

        setSubmitting(true);
        try {
            await atualizarVisitante({ ...formData, telefone: normalizePhoneNumber(formData.telefone) || null }, visitanteId);
            addToast('Visitante atualizado!', 'success', 3000);
            setTimeout(() => router.push('/visitantes'), 1500);
        } catch (e: any) { console.error("Erro update:", e); addToast('Erro ao atualizar', 'error'); } finally { setSubmitting(false); }
    };

    if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><LoadingSpinner /></div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-12 sm:py-8 px-2 sm:px-6 lg:px-8">
            <ToastContainer />

            <div className="max-w-2xl mx-auto mt-4 sm:mt-0">
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                    
                    {/* Header Roxo */}
                    <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-6 sm:px-6 sm:py-8">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2 sm:gap-3">
                                    <FaUserEdit className="w-6 h-6 sm:w-8 sm:h-8" /> Editar Visitante
                                </h1>
                                <p className="text-purple-100 mt-1 text-sm sm:text-base">Atualize as informações</p>
                            </div>
                            <Link href="/visitantes" className="inline-flex justify-center items-center px-4 py-3 sm:py-2 bg-white/20 hover:bg-white/30 active:bg-white/40 text-white rounded-lg transition-colors backdrop-blur-sm border border-white/30 text-sm font-medium w-full sm:w-auto"><FaArrowLeft className="w-3 h-3 mr-2" /> Voltar</Link>
                        </div>
                    </div>

                    <div className="p-4 sm:p-8">
                        <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
                            
                            <InputField label="Nome Completo" name="nome" value={formData.nome} onChange={handleChange} onBlur={handleBlur} error={getFieldError('nome')} required icon={FaUser} />
                            <InputField label="Telefone" name="telefone" value={formData.telefone || ''} onChange={handleChange} onBlur={handleBlur} error={getFieldError('telefone')} icon={FaPhone} placeholder="(XX) XXXXX-XXXX" maxLength={15} />

                            {/* BLOCO CEP */}
                            <div className="space-y-4 pt-2 border-t border-gray-100 animate-in fade-in">
                                <div className="space-y-1">
                                    <InputField label="Atualizar Endereço via CEP" name="cep" value={cepInput} onChange={handleCepChange} onBlur={handleCepBlur} icon={FaSearchLocation} placeholder="Digite para buscar..." isLoading={cepLoading} />
                                </div>
                                <InputField label="Endereço" name="endereco" value={formData.endereco || ''} onChange={handleChange} onBlur={handleBlur} icon={FaMapMarkerAlt} placeholder="Rua, número, bairro..." />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <InputField label="Data 1ª Visita" name="data_primeira_visita" value={formData.data_primeira_visita} onChange={handleChange} onBlur={handleBlur} type="date" required icon={FaCalendarAlt} />
                                <InputField label="Data Nascimento" name="data_nascimento" value={formData.data_nascimento || ''} onChange={handleChange} onBlur={handleBlur} type="date" icon={FaCalendarAlt} />
                            </div>

                            <InputField label="Data Último Contato" name="data_ultimo_contato" value={formData.data_ultimo_contato || ''} onChange={handleChange} onBlur={handleBlur} type="date" icon={FaClock} />
                            <InputField label="Observações" name="observacoes" value={formData.observacoes || ''} onChange={handleChange} onBlur={handleBlur} type="textarea" icon={FaComment} placeholder="Anotações..." rows={4} />

                            <div className="flex flex-col-reverse sm:flex-row justify-end gap-4 pt-6 border-t border-gray-200">
                                <Link href="/visitantes" className="px-6 py-4 sm:py-3 border-2 border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 text-center">Cancelar</Link>
                                <button type="submit" disabled={submitting} className="px-6 py-4 sm:py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 shadow-md flex items-center justify-center gap-2">
                                    {submitting ? <><FaSpinner className="animate-spin" /> Salvando...</> : <><FaSave /> Salvar Alterações</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}