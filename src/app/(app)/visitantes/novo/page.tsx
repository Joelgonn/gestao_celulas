// src/app/(app)/visitantes/novo/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { adicionarVisitante } from '@/lib/data';
import { normalizePhoneNumber } from '@/utils/formatters';
import { useToastStore } from '@/lib/toast';
import { 
    FaUserPlus, 
    FaPhone, 
    FaCalendar, 
    FaMapMarkerAlt, 
    FaComments,
    FaArrowLeft,
    FaSave,
    FaTimes
} from 'react-icons/fa';

interface NovoVisitanteFormData { 
    nome: string;
    telefone: string;
    data_primeira_visita: string;
    endereco: string;
    data_ultimo_contato: string; 
    observacoes: string;
}

export default function NovoVisitantePage() {
    const [formData, setFormData] = useState<NovoVisitanteFormData>({
        nome: '',
        telefone: '',
        data_primeira_visita: new Date().toISOString().split('T')[0],
        endereco: '',
        data_ultimo_contato: '', 
        observacoes: '' 
    });
    
    const [loading, setLoading] = useState(false);
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const router = useRouter();
    const { addToast } = useToastStore();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        
        if (name === 'telefone') {
            setFormData({ ...formData, [name]: normalizePhoneNumber(value) });
        } else {
            setFormData({ ...formData, [name]: value });
        }
        
        // Marca o campo como tocado
        if (!touched[name]) {
            setTouched({ ...touched, [name]: true });
        }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name } = e.target;
        if (!touched[name]) {
            setTouched({ ...touched, [name]: true });
        }
    };

    const getFieldError = (fieldName: keyof NovoVisitanteFormData): string | null => {
        if (!touched[fieldName]) return null;
        
        const value = formData[fieldName];
        
        switch (fieldName) {
            case 'nome':
                return !value.trim() ? 'Nome é obrigatório' : null;
            case 'telefone':
                if (value && (value.length < 10 || value.length > 11)) {
                    return 'Telefone deve ter 10 ou 11 dígitos';
                }
                return null;
            case 'data_primeira_visita':
                return !value ? 'Data da primeira visita é obrigatória' : null;
            default:
                return null;
        }
    };

    const hasErrors = () => {
        return !formData.nome.trim() || 
               (formData.telefone && (formData.telefone.length < 10 || formData.telefone.length > 11));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Marca todos os campos como tocados para mostrar erros
        const allTouched = Object.keys(formData).reduce((acc, key) => {
            acc[key] = true;
            return acc;
        }, {} as Record<string, boolean>);
        setTouched(allTouched);

        // Validação
        if (hasErrors()) {
            addToast('Por favor, corrija os erros no formulário', 'error');
            return;
        }

        setLoading(true);

        try {
            await adicionarVisitante({
                nome: formData.nome.trim(),
                telefone: formData.telefone || null,
                data_primeira_visita: formData.data_primeira_visita,
                endereco: formData.endereco || null,
                data_ultimo_contato: formData.data_ultimo_contato || null, 
                observacoes: formData.observacoes || null, 
            });
            
            addToast('Visitante adicionado com sucesso!', 'success');
            
            // Redireciona após um pequeno atraso para o toast ser visível
            setTimeout(() => {
                router.push('/visitantes');
            }, 1500);
            
        } catch (e: any) {
            console.error("Erro ao adicionar visitante:", e);
            if (e.code === '23505') { 
                addToast('Já existe um visitante com este nome na sua célula', 'error');
            } else {
                addToast(`Falha ao adicionar: ${e.message}`, 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    const InputField = ({ 
        label, 
        name, 
        type = 'text', 
        required = false, 
        icon: Icon,
        placeholder,
        maxLength,
        rows
    }: {
        label: string;
        name: keyof NovoVisitanteFormData;
        type?: string;
        required?: boolean;
        icon?: any;
        placeholder?: string;
        maxLength?: number;
        rows?: number;
    }) => {
        const error = getFieldError(name);
        const isTextarea = type === 'textarea';
        
        return (
            <div className="space-y-2">
                <label htmlFor={name} className="block text-sm font-medium text-gray-700">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
                
                <div className="relative">
                    {Icon && (
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                            <Icon className="w-4 h-4" />
                        </div>
                    )}
                    
                    {isTextarea ? (
                        <textarea
                            id={name}
                            name={name}
                            value={formData[name] as string}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            rows={rows}
                            placeholder={placeholder}
                            className={`w-full pl-${Icon ? '10' : '3'} pr-3 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 ${
                                error 
                                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50' 
                                    : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 hover:border-gray-400'
                            }`}
                        />
                    ) : (
                        <input
                            type={type}
                            id={name}
                            name={name}
                            value={formData[name] as string}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            required={required}
                            placeholder={placeholder}
                            maxLength={maxLength}
                            className={`w-full pl-${Icon ? '10' : '3'} pr-3 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 ${
                                error 
                                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50' 
                                    : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 hover:border-gray-400'
                            }`}
                        />
                    )}
                </div>
                
                {error && (
                    <p className="text-red-600 text-sm flex items-center space-x-1">
                        <FaTimes className="w-3 h-3" />
                        <span>{error}</span>
                    </p>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-600 to-green-500 rounded-2xl shadow-xl p-6 mb-8 text-white">
                    <div className="flex items-center space-x-4">
                        <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                            <FaUserPlus className="text-2xl" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold">Adicionar Novo Visitante</h1>
                            <p className="text-emerald-100 mt-2">Cadastre um novo visitante na célula</p>
                        </div>
                    </div>
                </div>

                {/* Form Card */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        {/* Campos do Formulário */}
                        <div className="grid grid-cols-1 gap-6">
                            <InputField
                                label="Nome Completo"
                                name="nome"
                                required={true}
                                icon={FaUserPlus}
                                placeholder="Digite o nome completo do visitante"
                            />

                            <InputField
                                label="Telefone"
                                name="telefone"
                                icon={FaPhone}
                                placeholder="(XX) XXXXX-XXXX"
                                maxLength={11}
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <InputField
                                    label="Data da 1ª Visita"
                                    name="data_primeira_visita"
                                    type="date"
                                    required={true}
                                    icon={FaCalendar}
                                />

                                <InputField
                                    label="Data Último Contato"
                                    name="data_ultimo_contato"
                                    type="date"
                                    icon={FaCalendar}
                                />
                            </div>

                            <InputField
                                label="Endereço"
                                name="endereco"
                                icon={FaMapMarkerAlt}
                                placeholder="Digite o endereço completo"
                            />

                            <InputField
                                label="Observações"
                                name="observacoes"
                                type="textarea"
                                icon={FaComments}
                                placeholder="Adicione observações sobre o visitante..."
                                rows={4}
                            />
                        </div>

                        {/* Ações do Formulário */}
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-gray-200">
                            <div className="text-sm text-gray-500">
                                Campos marcados com <span className="text-red-500">*</span> são obrigatórios
                            </div>
                            
                            <div className="flex space-x-3 w-full sm:w-auto">
                                <Link 
                                    href="/visitantes" 
                                    className="flex items-center justify-center space-x-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200 font-medium w-full sm:w-auto"
                                >
                                    <FaArrowLeft className="w-4 h-4" />
                                    <span>Voltar</span>
                                </Link>
                                
                                <button 
                                    type="submit" 
                                    disabled={loading || hasErrors()}
                                    className="flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-500 text-white rounded-xl hover:from-emerald-700 hover:to-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-lg hover:shadow-xl w-full sm:w-auto"
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            <span>Adicionando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <FaSave className="w-4 h-4" />
                                            <span>Adicionar Visitante</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Informações Adicionais */}
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-2xl p-4">
                    <div className="flex items-start space-x-3">
                        <div className="bg-blue-100 p-2 rounded-lg">
                            <FaComments className="text-blue-600 w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-blue-800">Dicas para cadastro</h3>
                            <ul className="text-sm text-blue-600 mt-1 space-y-1">
                                <li>• Preencha o nome completo para facilitar a identificação</li>
                                <li>• O telefone deve incluir DDD (10 ou 11 dígitos)</li>
                                <li>• Registre observações importantes sobre o visitante</li>
                                <li>• Mantenha a data do último contato atualizada</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}